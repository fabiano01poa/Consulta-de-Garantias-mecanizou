import React, { useState, useMemo, useEffect } from 'react';
import { 
  Handshake, 
  RotateCcw,
  Download, 
  Search, 
  Filter, 
  X, 
  Building2, 
  Calendar, 
  DollarSign, 
  Package, 
  Tag, 
  FileSpreadsheet,
  ChevronRight,
  Flame,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Check
} from 'lucide-react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StockItem } from '../types';
import { MultiSelectDropdown, MultiSelectOption } from './MultiSelectDropdown';
import { 
  isItemUrgent, 
  OFFICIAL_WARRANTY_STATUSES, 
  OFFICIAL_DEVOLUCAO_STATUSES, 
  OFFICIAL_OBS_STATUS_OPTIONS, 
  getAllObsStatusOptions,
  isWarrantyItem, 
  isDevolucaoItem, 
  matchesStatusFilter, 
  cleanNotaFiscal 
} from '../utils/statusUtils';
import { isDateInRange } from '../utils/dateUtils';
import { matchItemSupplier, matchItemFilial, getAvailableSuppliers, getAvailableFiliais, isAutomaticSupplierItem } from '../utils/supplierUtils';

interface NegociarViewProps {
  items: StockItem[];
  onSelectItem: (item: StockItem, contextList?: StockItem[]) => void;
  onBatchUpdateStatus?: (updatedItems: StockItem[]) => void;
  mode?: 'garantias' | 'devolucoes';
  theme?: 'dark' | 'light';
}

export function getItemTotalValue(item: StockItem): { rawNum: number; formatted: string } {
  // 1. Check item.valorTotal
  if (item.valorTotal && item.valorTotal.trim()) {
    const clean = item.valorTotal.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    const parsed = parseFloat(clean);
    if (!isNaN(parsed) && parsed > 0) {
      return {
        rawNum: parsed,
        formatted: parsed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      };
    }
  }

  // 2. Check item.valorUnitario * quantEstoque
  if (item.valorUnitario && item.valorUnitario.trim()) {
    const cleanUnit = item.valorUnitario.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
    const unitPrice = parseFloat(cleanUnit);
    if (!isNaN(unitPrice) && unitPrice > 0) {
      const qtyNum = parseInt(item.quantEstoque || '1', 10) || 1;
      const total = unitPrice * qtyNum;
      return {
        rawNum: total,
        formatted: total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      };
    }
  }

  return {
    rawNum: 0,
    formatted: 'R$ 0,00'
  };
}

export const NegociarView: React.FC<NegociarViewProps> = ({ items, onSelectItem, onBatchUpdateStatus, mode = 'garantias', theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const isDevolucaoMode = mode === 'devolucoes';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedLocalidades, setSelectedLocalidades] = useState<string[]>([]);
  const [selectedFornecedores, setSelectedFornecedores] = useState<string[]>([]);
  const [selectedNovosFornecedores, setSelectedNovosFornecedores] = useState<string[]>([]);
  
  // High-performance pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  
  // Date Filtering State
  const [dateType, setDateType] = useState<'dataIncidencia' | 'dataSaida' | 'dataRecebimento' | 'dataCompra' | 'dataSolicitacao'>('dataIncidencia');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  const [apenasUrgentes, setApenasUrgentes] = useState<boolean>(false);

  // Items are passed from App.tsx pre-filtered by start row threshold and mode
  const viewBaseItems = useMemo(() => {
    return items;
  }, [items]);

  // Dynamic canonical obs status options
  const allObsStatusOptions = useMemo(() => {
    return getAllObsStatusOptions(items);
  }, [items]);

  // Selection & Bulk Action State
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [targetStatus, setTargetStatus] = useState<string>(
    isDevolucaoMode ? 'Em negociação' : 'Garantia: Em negociação'
  );

  useEffect(() => {
    setTargetStatus(isDevolucaoMode ? 'Em negociação' : 'Garantia: Em negociação');
  }, [isDevolucaoMode]);

  const [updateStatus, setUpdateStatus] = useState<boolean>(true);
  
  const [bulkObsStatusDevolucao, setBulkObsStatusDevolucao] = useState<string>('');
  const [updateObsStatusDevolucao, setUpdateObsStatusDevolucao] = useState<boolean>(false);

  const [bulkObsNf, setBulkObsNf] = useState<string>('');
  const [updateObsNf, setUpdateObsNf] = useState<boolean>(false);

  const [bulkObsGerais, setBulkObsGerais] = useState<string>('');
  const [updateObsGerais, setUpdateObsGerais] = useState<boolean>(false);

  const [bulkSuccessBanner, setBulkSuccessBanner] = useState<string | null>(null);

  // 1. Status List from Official Statuses for current mode + any custom status in items
  const officialStatuses = isDevolucaoMode ? OFFICIAL_DEVOLUCAO_STATUSES : OFFICIAL_WARRANTY_STATUSES;

  const statusList = useMemo(() => {
    const list = Array.from(officialStatuses) as string[];
    viewBaseItems.forEach(item => {
      if (item.statusDevolucao && item.statusDevolucao.trim()) {
        const trimmed = item.statusDevolucao.trim();
        const matchesOfficial = officialStatuses.some(off => matchesStatusFilter(trimmed, off));
        if (!matchesOfficial && !list.includes(trimmed)) {
          list.push(trimmed);
        }
      }
    });

    if (isDevolucaoMode) {
      const aNegIdx = list.indexOf('A negociar');
      if (aNegIdx !== -1) {
        list.splice(aNegIdx + 1, 0, 'Automáticos');
      } else {
        list.unshift('Automáticos');
      }
    }
    return list;
  }, [officialStatuses, isDevolucaoMode, viewBaseItems]);

  // Count items per status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalUrgentes = 0;
    let totalAutomaticos = 0;

    for (let idx = 0; idx < viewBaseItems.length; idx++) {
      const i = viewBaseItems[idx];
      const isUrg = isItemUrgent(i);
      if (apenasUrgentes && !isUrg) continue;
      if (isUrg) totalUrgentes++;

      const st = i.statusDevolucao;
      if (!st) continue;

      let matchedAny = false;
      for (let sIdx = 0; sIdx < officialStatuses.length; sIdx++) {
        const official = officialStatuses[sIdx];
        if (matchesStatusFilter(st, official)) {
          counts[official] = (counts[official] || 0) + 1;
          matchedAny = true;
        }
      }

      if (!matchedAny) {
        counts[st] = (counts[st] || 0) + 1;
      }

      if (isDevolucaoMode && matchesStatusFilter(st, 'A negociar') && isAutomaticSupplierItem(i)) {
        totalAutomaticos++;
      }
    }

    if (isDevolucaoMode) {
      counts['Automáticos'] = totalAutomaticos;
    }

    return { counts, totalUrgentes };
  }, [viewBaseItems, apenasUrgentes, officialStatuses, isDevolucaoMode]);

  // 2. Filter items by Status & Urgencia for Cascading Supplier options (Multi-select)
  const itemsAfterStatus = useMemo(() => {
    return viewBaseItems.filter(item => {
      if (apenasUrgentes && !isItemUrgent(item)) return false;

      if (selectedStatuses.length > 0) {
        const matchesAny = selectedStatuses.some(st => {
          if (st === 'urgente') return isItemUrgent(item);
          if (st === 'Automáticos' && isDevolucaoMode) {
            return matchesStatusFilter(item.statusDevolucao, 'A negociar') && isAutomaticSupplierItem(item);
          }
          return matchesStatusFilter(item.statusDevolucao, st);
        });
        if (!matchesAny) return false;
      }

      return true;
    });
  }, [viewBaseItems, selectedStatuses, apenasUrgentes, isDevolucaoMode]);

  // Count items per Fornecedor based on current Status filter
  const fornecedorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const suppliers = getAvailableSuppliers(itemsAfterStatus);
    suppliers.forEach(s => { counts[s] = 0; });
    itemsAfterStatus.forEach(item => {
      suppliers.forEach(s => {
        if (matchItemSupplier(item, s)) {
          counts[s] = (counts[s] || 0) + 1;
        }
      });
    });
    return counts;
  }, [itemsAfterStatus]);

  // Available Fornecedores based on selected Status
  const availableFornecedores = useMemo(() => {
    return Object.keys(fornecedorCounts).sort((a, b) => {
      const countDiff = (fornecedorCounts[b] || 0) - (fornecedorCounts[a] || 0);
      if (countDiff !== 0) return countDiff;
      return a.localeCompare(b);
    });
  }, [fornecedorCounts]);

  // Auto-reset selectedFornecedores if invalid
  useEffect(() => {
    if (selectedFornecedores.length > 0) {
      const valid = selectedFornecedores.filter(f => availableFornecedores.includes(f));
      if (valid.length !== selectedFornecedores.length) {
        setSelectedFornecedores(valid);
      }
    }
  }, [availableFornecedores, selectedFornecedores]);

  // 3. Filter items by Status AND Supplier for Cascading Filial options (Multi-select)
  const itemsAfterFornecedor = useMemo(() => {
    return itemsAfterStatus.filter(item => {
      if (selectedFornecedores.length > 0) {
        const matchesAny = selectedFornecedores.some(s => matchItemSupplier(item, s));
        if (!matchesAny) return false;
      }
      return true;
    });
  }, [itemsAfterStatus, selectedFornecedores]);

  // Count items per Filial based on selected Status AND Fornecedor
  const filialCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const singleSupplier = selectedFornecedores.length === 1 ? selectedFornecedores[0] : 'all';
    const filiais = getAvailableFiliais(itemsAfterStatus, singleSupplier);
    filiais.forEach(f => { counts[f] = 0; });
    itemsAfterFornecedor.forEach(item => {
      filiais.forEach(f => {
        if (matchItemFilial(item, f)) {
          counts[f] = (counts[f] || 0) + 1;
        }
      });
    });
    return counts;
  }, [itemsAfterStatus, selectedFornecedores, itemsAfterFornecedor]);

  // Available Filiais based on selected Status AND selected Fornecedor
  const availableNovosFornecedores = useMemo(() => {
    return Object.keys(filialCounts).sort((a, b) => {
      const countDiff = (filialCounts[b] || 0) - (filialCounts[a] || 0);
      if (countDiff !== 0) return countDiff;
      return a.localeCompare(b);
    });
  }, [filialCounts]);

  // Auto-reset selectedNovosFornecedores if invalid
  useEffect(() => {
    if (selectedNovosFornecedores.length > 0) {
      const valid = selectedNovosFornecedores.filter(ff => availableNovosFornecedores.includes(ff));
      if (valid.length !== selectedNovosFornecedores.length) {
        setSelectedNovosFornecedores(valid);
      }
    }
  }, [availableNovosFornecedores, selectedNovosFornecedores]);

  // Multi-Select Options Data
  const statusMultiOptions: MultiSelectOption[] = useMemo(() => {
    const opts: MultiSelectOption[] = [
      {
        value: 'urgente',
        label: '🔥 Apenas Urgentes',
        count: statusCounts.totalUrgentes
      }
    ];
    statusList.forEach(st => {
      opts.push({
        value: st,
        label: st === 'Automáticos' ? '⚡ Automáticos' : st,
        count: statusCounts.counts[st] || 0
      });
    });
    return opts;
  }, [statusList, statusCounts]);

  const fornecedorMultiOptions: MultiSelectOption[] = useMemo(() => {
    return availableFornecedores.map(f => ({
      value: f,
      label: f,
      count: fornecedorCounts[f] || 0
    }));
  }, [availableFornecedores, fornecedorCounts]);

  const novoFornecedorMultiOptions: MultiSelectOption[] = useMemo(() => {
    return availableNovosFornecedores.map(ff => ({
      value: ff,
      label: ff,
      count: filialCounts[ff] || 0
    }));
  }, [availableNovosFornecedores, filialCounts]);

  // Defined Target Localidades for quick multi-select buttons (Only used in Devoluções mode)
  const targetLocalidades = useMemo(() => [
    'Mecanizou',
    'Mecanizou - Recebimento',
    'Mecanizou - Expresso',
    'Mecanizou - BH'
  ], []);

  const handleToggleLocalidade = (loc: string) => {
    setSelectedLocalidades(prev => {
      if (prev.includes(loc)) {
        return prev.filter(l => l !== loc);
      } else {
        return [...prev, loc];
      }
    });
  };

  // Count items per Localidade (calculated on current status filter items)
  const localidadeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    targetLocalidades.forEach(loc => {
      counts[loc] = 0;
    });
    itemsAfterStatus.forEach(item => {
      const iLoc = (item.localidade || '').trim().toLowerCase();
      targetLocalidades.forEach(loc => {
        const targetClean = loc.trim().toLowerCase();
        if (iLoc === targetClean || iLoc.includes(targetClean) || targetClean.includes(iLoc)) {
          counts[loc] = (counts[loc] || 0) + 1;
        }
      });
    });
    return counts;
  }, [itemsAfterStatus, targetLocalidades]);

  const availableLocalidadesList = useMemo(() => {
    const set = new Set<string>([
      "Mecanizou",
      "Mecanizou - Recebimento",
      "Mecanizou - Expresso",
      "Mecanizou - BH"
    ]);
    viewBaseItems.forEach(i => {
      if (i.localidade && i.localidade.trim()) {
        set.add(i.localidade.trim());
      }
    });
    return Array.from(set);
  }, [viewBaseItems]);

  // Helper date field picker
  const getItemDateField = (item: StockItem, field: 'dataIncidencia' | 'dataCompra' | 'dataSaida' | 'dataRecebimento' | 'dataSolicitacao'): string | undefined => {
    switch (field) {
      case 'dataIncidencia': return item.dataIncidencia;
      case 'dataSaida': return item.dataSaida;
      case 'dataRecebimento': return item.dataRecebimento;
      case 'dataCompra': return item.dataCompra;
      case 'dataSolicitacao': return item.dataSolicitacao;
      default: return item.dataIncidencia || item.dataSaida || item.dataRecebimento;
    }
  };

  // Preset Date Range Handler
  const setQuickRange = (preset: 'all' | 'this_month' | 'last_30' | 'last_90' | 'this_year') => {
    const today = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'last_30') {
      const past30 = new Date();
      past30.setDate(today.getDate() - 30);
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'last_90') {
      const past90 = new Date();
      past90.setDate(today.getDate() - 90);
      setStartDate(past90.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'this_year') {
      const firstYearDay = new Date(today.getFullYear(), 0, 1);
      setStartDate(firstYearDay.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    }
  };

  // Final Filtered Items for Display & Export
  const filteredItems = useMemo(() => {
    return itemsAfterFornecedor.filter(item => {
      // Filter Localidade (Multi-select buttons - only active in Devoluções mode)
      if (isDevolucaoMode && selectedLocalidades.length > 0) {
        const cleanLoc = (item.localidade || '').trim().toLowerCase();
        const matchesAny = selectedLocalidades.some(loc => {
          const cleanTarget = loc.trim().toLowerCase();
          return cleanLoc === cleanTarget || cleanLoc.includes(cleanTarget) || cleanTarget.includes(cleanLoc);
        });
        if (!matchesAny) return false;
      }

      // Filter Novo Fornecedor / Filial (Multi-select)
      if (selectedNovosFornecedores.length > 0) {
        const matchesAnyFilial = selectedNovosFornecedores.some(f => matchItemFilial(item, f));
        if (!matchesAnyFilial) return false;
      }

      // Filter Date Range using selected dateType
      if (startDate || endDate) {
        const dateVal = getItemDateField(item, dateType);
        if (!isDateInRange(dateVal, startDate, endDate)) {
          return false;
        }
      }

      // Filter Search Term
      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matches =
          (item.idStock && item.idStock.toLowerCase().includes(term)) ||
          (item.descricao && item.descricao.toLowerCase().includes(term)) ||
          (item.codigo && item.codigo.toLowerCase().includes(term)) ||
          (item.marca && item.marca.toLowerCase().includes(term)) ||
          (item.cliente && item.cliente.toLowerCase().includes(term)) ||
          (item.fornecedor && item.fornecedor.toLowerCase().includes(term)) ||
          (item.fornecedorOriginal && item.fornecedorOriginal.toLowerCase().includes(term)) ||
          (item.novoFornecedorFilial && item.novoFornecedorFilial.toLowerCase().includes(term)) ||
          (item.localidade && item.localidade.toLowerCase().includes(term)) ||
          (item.statusDevolucao && item.statusDevolucao.toLowerCase().includes(term)) ||
          (item.obsStatusDevolucao && item.obsStatusDevolucao.toLowerCase().includes(term)) ||
          (item.nfOrigem && item.nfOrigem.toLowerCase().includes(term)) ||
          (item.obsNotaFiscal && item.obsNotaFiscal.toLowerCase().includes(term)) ||
          (item.observacoesGerais && item.observacoesGerais.toLowerCase().includes(term)) ||
          (item.notaFiscalSaida && item.notaFiscalSaida.toLowerCase().includes(term));

        if (!matches) return false;
      }

      return true;
    });
  }, [itemsAfterFornecedor, selectedLocalidades, selectedNovosFornecedores, dateType, startDate, endDate, searchTerm]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedStatuses,
    selectedFornecedores,
    selectedNovosFornecedores,
    selectedLocalidades,
    startDate,
    endDate,
    dateType,
    searchTerm,
    apenasUrgentes,
    pageSize
  ]);

  // Paginated Items Calculation for fast UI rendering
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    if (pageSize >= 99999) return filteredItems;
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Unique item key generator for selections
  const getItemKey = (item: StockItem, idx: number): string => {
    return item.idStock ? `stk-${item.idStock}` : `idx-${item.codigo || 'item'}-${idx}`;
  };

  // Selected items subset
  const selectedItems = useMemo(() => {
    return filteredItems.filter((item, idx) => selectedKeys.has(getItemKey(item, idx)));
  }, [filteredItems, selectedKeys]);

  // Calculate totals
  const totalValor = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      const valInfo = getItemTotalValue(item);
      return acc + valInfo.rawNum;
    }, 0);
  }, [filteredItems]);

  const selectedTotalValor = useMemo(() => {
    return selectedItems.reduce((acc, item) => {
      const valInfo = getItemTotalValue(item);
      return acc + valInfo.rawNum;
    }, 0);
  }, [selectedItems]);

  // Selection Toggle Handlers
  const isAllFilteredSelected = useMemo(() => {
    if (filteredItems.length === 0) return false;
    return filteredItems.every((item, idx) => selectedKeys.has(getItemKey(item, idx)));
  }, [filteredItems, selectedKeys]);

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedKeys(new Set());
    } else {
      const nextKeys = new Set<string>();
      filteredItems.forEach((item, idx) => nextKeys.add(getItemKey(item, idx)));
      setSelectedKeys(nextKeys);
    }
  };

  const toggleSelectItem = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Items to export: strictly export selected items if any selected, otherwise all filtered
  const itemsToExport = useMemo(() => {
    if (selectedItems.length > 0) return selectedItems;
    return filteredItems;
  }, [selectedItems, filteredItems]);

  const hasActiveFilters = selectedStatuses.length > 0 || 
                           selectedLocalidades.length > 0 ||
                           selectedFornecedores.length > 0 || 
                           selectedNovosFornecedores.length > 0 || 
                           startDate !== '' || 
                           endDate !== '' || 
                           apenasUrgentes || 
                           searchTerm !== '';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedStatuses([]);
    setSelectedLocalidades([]);
    setSelectedFornecedores([]);
    setSelectedNovosFornecedores([]);
    setStartDate('');
    setEndDate('');
    setApenasUrgentes(false);
    setCurrentPage(1);
  };

  // Batch Status & Notes Change Handler
  const handleApplyBulkStatus = () => {
    if (selectedItems.length === 0) return;
    if (!updateStatus && !updateObsStatusDevolucao && !updateObsNf && !updateObsGerais) return;

    const nowStr = new Date().toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
    const todayShort = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const changes: string[] = [];
    if (updateStatus && targetStatus) changes.push(`Status: "${targetStatus}"`);
    if (updateObsStatusDevolucao && bulkObsStatusDevolucao) changes.push(`Obs Status: "${bulkObsStatusDevolucao}"`);
    if (updateObsNf) changes.push(`Obs NF alterada`);
    if (updateObsGerais) changes.push(`Obs gerais alteradas`);

    const interacaoSummary = `${todayShort} - ${changes.join(' | ')} em lote`;

    const updatedBatch = selectedItems.map(item => {
      const updated = { ...item, dataUltimaAlteracao: nowStr, ultimaInteracao: interacaoSummary };
      if (updateStatus && targetStatus) {
        updated.statusDevolucao = targetStatus;
      }
      if (updateObsStatusDevolucao && bulkObsStatusDevolucao) {
        updated.obsStatusDevolucao = bulkObsStatusDevolucao;
      }
      if (updateObsNf && bulkObsNf) {
        const existingObs = item.obsNotaFiscal || '';
        if (existingObs.trim()) {
          const needsSpace = !/[\s/\-:;.,]$/.test(bulkObsNf) && !/^\s/.test(existingObs);
          updated.obsNotaFiscal = `${bulkObsNf}${needsSpace ? ' ' : ''}${existingObs}`;
        } else {
          updated.obsNotaFiscal = bulkObsNf;
        }
      }
      if (updateObsGerais && bulkObsGerais) {
        const existingObs = item.observacoesGerais || '';
        if (existingObs.trim()) {
          const needsSpace = !/[\s/\-:;.,]$/.test(bulkObsGerais) && !/^\s/.test(existingObs);
          updated.observacoesGerais = `${bulkObsGerais}${needsSpace ? ' ' : ''}${existingObs}`;
        } else {
          updated.observacoesGerais = bulkObsGerais;
        }
      }
      return updated;
    });

    if (onBatchUpdateStatus) {
      onBatchUpdateStatus(updatedBatch);
    }

    const appliedFields: string[] = [];
    if (updateStatus) appliedFields.push('Status Devolução');
    if (updateObsStatusDevolucao) appliedFields.push('Obs Status Devolução');
    if (updateObsNf) appliedFields.push('Obs Nota Fiscal');
    if (updateObsGerais) appliedFields.push('Observações Gerais');

    setBulkSuccessBanner(`Edição em massa realizada (${appliedFields.join(', ')}) em ${selectedItems.length} itens com sucesso!`);
    setIsBulkModalOpen(false);
    setTimeout(() => setBulkSuccessBanner(null), 5000);
  };

  // Helper to generate dynamic file names containing Supplier, Branch (if filtered or unique), and Date
  const getExportFileName = (extension: 'csv' | 'pdf') => {
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10);

    // Determine Fornecedor
    let supplierName = '';
    if (selectedFornecedores.length === 1) {
      supplierName = selectedFornecedores[0];
    } else if (selectedFornecedores.length > 1) {
      supplierName = `${selectedFornecedores.length}_Fornecedores`;
    } else if (itemsToExport.length > 0) {
      const firstForn = itemsToExport[0].fornecedor?.trim();
      if (firstForn && itemsToExport.every(item => (item.fornecedor?.trim() || '') === firstForn)) {
        supplierName = firstForn;
      }
    }

    // Determine Filial
    let branchName = '';
    if (selectedNovosFornecedores.length === 1) {
      branchName = selectedNovosFornecedores[0];
    } else if (selectedNovosFornecedores.length > 1) {
      branchName = `${selectedNovosFornecedores.length}_Filiais`;
    } else if (itemsToExport.length > 0) {
      const firstBranch = itemsToExport[0].novoFornecedorFilial?.trim();
      if (firstBranch && itemsToExport.every(item => (item.novoFornecedorFilial?.trim() || '') === firstBranch)) {
        branchName = firstBranch;
      }
    }

    const sanitize = (str: string) => 
      str
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
        .replace(/[^a-zA-Z0-9_\-]/g, '_') // keep letters, numbers, _, -
        .replace(/_+/g, '_') // collapse consecutive underscores
        .replace(/^_+|_+$/g, ''); // trim leading/trailing underscores

    const parts: string[] = [];
    if (selectedItems.length > 0) {
      parts.push('Selecionados');
    }

    parts.push(extension === 'pdf' 
      ? (isDevolucaoMode ? 'Relatorio_Devolucoes' : 'Relatorio_Garantias') 
      : (isDevolucaoMode ? 'Devolucoes_Pecas' : 'Negociacao_Garantias')
    );

    if (supplierName) {
      const cleanSupplier = sanitize(supplierName);
      if (cleanSupplier) parts.push(cleanSupplier);
    }

    if (branchName) {
      const cleanBranch = sanitize(branchName);
      if (cleanBranch) parts.push(cleanBranch);
    }

    parts.push(dateStamp);

    return `${parts.join('_')}.${extension}`;
  };

  // Download Excel / CSV Handler
  const handleExportExcel = () => {
    if (itemsToExport.length === 0) return;

    // Build array of objects with requested exact headers
    const dataToExport = itemsToExport.map(item => {
      const valInfo = getItemTotalValue(item);
      return {
        'ID STOCK': item.idStock || '',
        'Descrição': item.descricao || '',
        'Código': item.codigo || '',
        'Marca': item.marca || '',
        'Quant. em Estoque': item.quantEstoque || '1',
        'Fornecedor': item.fornecedor || '',
        'Novo Fornecedor/Filial': item.novoFornecedorFilial || '',
        'Motivo de garantia': item.motivo || item.observacoesGerais || '',
        'Valor total em estoque': valInfo.formatted,
        'Data compra': item.dataCompra || '',
        'NF Origem': cleanNotaFiscal(item.nfOrigem) || '',
        'Obs Nota Fiscal': item.obsNotaFiscal || item.observacoesGerais || ''
      };
    });

    // Convert to CSV using PapaParse with ';' delimiter (standard for Excel in PT/BR locale)
    const csvString = Papa.unparse(dataToExport, {
      delimiter: ';'
    });

    // Company Header Top Row for Excel/CSV
    const companyHeader = '"MECANIZOU INTERMEDIACAO DE NEGOCIOS LTDA";"CNPJ 37.199.406/0001-55"\n\n';

    // Add UTF-8 BOM so Microsoft Excel renders Portuguese characters correctly
    const blob = new Blob(['\uFEFF' + companyHeader + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const fileName = getExportFileName('csv');
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download PDF Handler
  const handleExportPDF = () => {
    if (itemsToExport.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Company Header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('MECANIZOU INTERMEDIACAO DE NEGOCIOS LTDA | CNPJ 37.199.406/0001-55', 14, 12);

    // Document Header Title
    doc.setFontSize(14);
    doc.setTextColor(isDevolucaoMode ? 99 : 16, isDevolucaoMode ? 102 : 185, isDevolucaoMode ? 241 : 129);
    doc.text(
      selectedItems.length > 0 
        ? (isDevolucaoMode ? 'Relatório de Devoluções de Peças (Itens Selecionados)' : 'Relatório de Garantias (Itens Selecionados)')
        : (isDevolucaoMode ? 'Relatório de Devoluções de Peças' : 'Relatório de Negociação de Garantias'), 
      14, 18
    );

    const exportTotalVal = itemsToExport.reduce((acc, item) => acc + getItemTotalValue(item).rawNum, 0);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const dateStr = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Gerado em: ${dateStr} | Total de Itens: ${itemsToExport.length} | Valor Total: ${exportTotalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, 23);

    // Active Filters Summary
    const filterSummary: string[] = [];
    if (selectedItems.length > 0) filterSummary.push(`Exportando apenas os ${selectedItems.length} itens marcados`);
    if (selectedStatuses.length > 0) filterSummary.push(`Status (${selectedStatuses.length}): ${selectedStatuses.join(', ')}`);
    if (selectedFornecedores.length > 0) filterSummary.push(`Fornecedor (${selectedFornecedores.length}): ${selectedFornecedores.join(', ')}`);
    if (selectedNovosFornecedores.length > 0) filterSummary.push(`Filial (${selectedNovosFornecedores.length}): ${selectedNovosFornecedores.join(', ')}`);
    if (startDate || endDate) filterSummary.push(`Período (${dateType}): ${startDate || 'Início'} até ${endDate || 'Hoje'}`);
    if (apenasUrgentes) filterSummary.push('Apenas Urgentes: Sim');
    if (searchTerm) filterSummary.push(`Busca: "${searchTerm}"`);

    let startTableY = 27;
    if (filterSummary.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Filtros: ${filterSummary.join(' | ')}`, 14, 28);
      startTableY = 32;
    }

    // Build PDF table rows
    const tableData = itemsToExport.map(item => {
      const valInfo = getItemTotalValue(item);
      return [
        item.idStock || '—',
        item.descricao || '—',
        item.codigo || '—',
        item.marca || '—',
        item.quantEstoque || '1',
        item.fornecedor || '—',
        item.motivo || item.observacoesGerais || '—',
        valInfo.formatted,
        item.dataCompra || '—',
        cleanNotaFiscal(item.nfOrigem) || '—',
        item.obsNotaFiscal || item.observacoesGerais || '—'
      ];
    });

    autoTable(doc, {
      startY: startTableY,
      head: [[
        'ID STOCK', 'Descrição', 'Código', 'Marca', 'Qtd', 
        'Fornecedor', 'Motivo de garantia', 'Valor Total', 'Data Compra', 'NF Origem', 'Obs NF'
      ]],
      body: tableData,
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [15, 23, 42], textColor: [241, 245, 249], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 18 },
        1: { cellWidth: 48 },
        2: { cellWidth: 16 },
        3: { cellWidth: 16 },
        4: { halign: 'center', cellWidth: 9 },
        5: { cellWidth: 30 },
        6: { cellWidth: 34 },
        7: { halign: 'right', fontStyle: 'bold', cellWidth: 22 },
        8: { cellWidth: 16 },
        9: { cellWidth: 16 },
        10: { cellWidth: 24 }
      },
      didDrawPage: (data) => {
        const str = `Página ${doc.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 8);
      }
    });

    const fileName = getExportFileName('pdf');
    doc.save(fileName);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className={`rounded-2xl p-5 border shadow-xl backdrop-blur-sm ${
        isDark ? 'bg-slate-900/90 border-slate-800/90' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
          isDark ? 'border-slate-800/80' : 'border-slate-100'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-xl border ${
              isDevolucaoMode 
                ? (isDark ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border-indigo-200')
                : (isDark ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200')
            }`}>
              {isDevolucaoMode ? <RotateCcw className="w-6 h-6" /> : <Handshake className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className={`text-lg sm:text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {isDevolucaoMode ? 'Painel de Devoluções de Peças' : 'Painel de Negociação de Garantias'}
                </h1>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  isDevolucaoMode 
                    ? (isDark ? 'bg-indigo-950 text-indigo-300 border-indigo-800' : 'bg-indigo-50 text-indigo-700 border-indigo-200')
                    : (isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                }`}>
                  {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {isDevolucaoMode 
                  ? 'Gestão de devoluções (A negociar, Aprovado, Passivo, Recusado, etc.) com exportação Excel/PDF e edições em massa.'
                  : 'Filtros encadeados (Status → Fornecedor → Filial) e exportação em Excel ou PDF.'}
              </p>
            </div>
          </div>

          {/* Header Action Info */}
          <div className={`flex items-center space-x-2 text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>{itemsToExport.length} itens no relatório</span>
          </div>
        </div>

        {bulkSuccessBanner && (
          <div className={`mt-4 p-3 border rounded-xl text-xs font-bold flex items-center justify-between animate-fadeIn ${
            isDark ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <span>{bulkSuccessBanner}</span>
            </div>
            <button onClick={() => setBulkSuccessBanner(null)} className={isDark ? 'text-emerald-400 hover:text-white' : 'text-emerald-600 hover:text-slate-900'}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters Controls Grid */}
        <div className="pt-4 space-y-4">
          {/* 1. Date Filter Section (Enhanced with Date Field Selector & Quick Ranges) */}
          <div className={`p-3.5 rounded-xl border space-y-2.5 ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 ${
              isDark ? 'border-slate-800/80' : 'border-slate-200'
            }`}>
              <div className={`flex items-center space-x-2 text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <Calendar className="w-4 h-4 text-emerald-500" />
                <span>Filtro de Período por Tipo de Data</span>
              </div>

              {/* Quick Preset Date Buttons */}
              <div className="flex items-center space-x-1 text-[11px] flex-wrap">
                <button
                  type="button"
                  onClick={() => setQuickRange('all')}
                  className={`px-2.5 py-1 rounded-lg border transition-colors ${
                    !startDate && !endDate 
                      ? (isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-800 font-bold' : 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold') 
                      : (isDark ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100')
                  }`}
                >
                  Tudo
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('this_month')}
                  className={`px-2.5 py-1 rounded-lg border transition-colors ${
                    isDark ? 'bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border-slate-800' : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  Este Mês
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('last_30')}
                  className={`px-2.5 py-1 rounded-lg border transition-colors ${
                    isDark ? 'bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border-slate-800' : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  Últimos 30d
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('last_90')}
                  className={`px-2.5 py-1 rounded-lg border transition-colors ${
                    isDark ? 'bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border-slate-800' : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  Últimos 90d
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('this_year')}
                  className={`px-2.5 py-1 rounded-lg border transition-colors ${
                    isDark ? 'bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border-slate-800' : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  Este Ano
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Date Type Selector */}
              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Filtrar por Campo de Data
                </label>
                <select
                  value={dateType}
                  onChange={(e) => setDateType(e.target.value as any)}
                  className={`w-full border focus:border-emerald-500 text-xs rounded-xl px-3 py-2 outline-none font-semibold ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="dataIncidencia">⚡ Data de Incidência (Coluna Q)</option>
                  <option value="dataSaida">🚚 Data de Saída / Envio</option>
                  <option value="dataRecebimento">📦 Data de Recebimento (Estoque)</option>
                  <option value="dataCompra">📅 Data de Compra (NF Origem)</option>
                  <option value="dataSolicitacao">📝 Data de Solicitação</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full border focus:border-emerald-500 text-xs rounded-xl px-3 py-2 outline-none font-mono ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>

              {/* End Date */}
              <div>
                <label className={`block text-[10px] font-bold uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Data Final
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full border focus:border-emerald-500 text-xs rounded-xl px-3 py-2 outline-none font-mono ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* 2. Cascading Multi-Select Filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className={`flex items-center space-x-2 text-xs font-bold uppercase tracking-wider ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <Filter className="w-4 h-4 text-emerald-500" />
                <span>Filtros Encadeados para Negociação</span>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className={`inline-flex items-center text-xs font-medium transition-colors px-2.5 py-1.5 rounded-xl border ${
                    isDark 
                      ? 'text-slate-400 hover:text-emerald-400 bg-slate-800/80 border-slate-700/60' 
                      : 'text-slate-600 hover:text-emerald-600 bg-slate-100 hover:bg-slate-200 border-slate-200'
                  }`}
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Limpar Filtros
                </button>
              )}
            </div>

            {/* Localidade Multi-select Button Bar (Only shown in Devoluções mode) */}
            {isDevolucaoMode && (
              <div className={`p-3 rounded-xl border space-y-2 ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center space-x-2 text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    <span>Filtro por Localidade</span>
                    {selectedLocalidades.length > 0 && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}>
                        {selectedLocalidades.length} selecionada(s)
                      </span>
                    )}
                  </div>
                  {selectedLocalidades.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedLocalidades([])}
                      className="text-[10px] text-slate-500 hover:text-emerald-600 underline font-medium"
                    >
                      Limpar seleção (Ver todas)
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {/* Option "Todas" */}
                  <button
                    type="button"
                    onClick={() => setSelectedLocalidades([])}
                    className={`px-3 py-1.5 rounded-xl text-xs transition-all border flex items-center space-x-1.5 cursor-pointer ${
                      selectedLocalidades.length === 0
                        ? 'bg-emerald-600 text-white font-bold border-emerald-500 shadow-md'
                        : (isDark ? 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200 font-medium' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 font-medium')
                    }`}
                  >
                    <span>Todas as Localidades</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      selectedLocalidades.length === 0 
                        ? 'bg-emerald-800 text-emerald-100' 
                        : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600')
                    }`}>
                      {itemsAfterStatus.length}
                    </span>
                  </button>

                  {/* Target Localidades Toggle Buttons */}
                  {targetLocalidades.map(loc => {
                    const isSelected = selectedLocalidades.includes(loc);
                    const count = localidadeCounts[loc] || 0;
                    return (
                      <button
                        key={`loc-btn-${loc}`}
                        type="button"
                        onClick={() => handleToggleLocalidade(loc)}
                        className={`px-3 py-1.5 rounded-xl text-xs transition-all border flex items-center space-x-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white font-bold border-emerald-500 shadow-md ring-1 ring-emerald-400/40'
                            : (isDark ? 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200 font-medium' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 font-medium')
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        <span>{loc}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected 
                            ? 'bg-emerald-800 text-emerald-100' 
                            : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600')
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Filter 1: Status (Multi-Select) */}
              <MultiSelectDropdown
                label="1. Status da Devolução"
                placeholder="Selecionar status..."
                allSelectedLabel="Todos os Status"
                options={statusMultiOptions}
                selectedValues={selectedStatuses}
                onChange={setSelectedStatuses}
                isDark={isDark}
                badgeColor="emerald"
              />

              {/* Filter 2: Fornecedor (Multi-Select, Cascading) */}
              <MultiSelectDropdown
                label="2. Fornecedor"
                placeholder="Selecionar fornecedores..."
                allSelectedLabel="Todos os Fornecedores"
                options={fornecedorMultiOptions}
                selectedValues={selectedFornecedores}
                onChange={setSelectedFornecedores}
                isDark={isDark}
                badgeColor="emerald"
                subtitle={selectedStatuses.length > 0 ? `Filtrado por status (${selectedStatuses.length})` : undefined}
              />

              {/* Filter 3: Novo Fornecedor / Filial (Multi-Select, Cascading) */}
              <MultiSelectDropdown
                label="3. Novo Fornecedor / Filial"
                placeholder="Selecionar filiais..."
                allSelectedLabel="Todas as Filiais"
                options={novoFornecedorMultiOptions}
                selectedValues={selectedNovosFornecedores}
                onChange={setSelectedNovosFornecedores}
                isDark={isDark}
                badgeColor="indigo"
                subtitle={selectedFornecedores.length > 0 ? `Filtrado por fornecedor (${selectedFornecedores.length})` : undefined}
              />
            </div>
          </div>

          {/* 3. Search Row & Urgentes Toggle (Consulta) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
            <div className="md:col-span-10 relative">
              <Search className={`w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
              <input
                type="text"
                placeholder="Buscar por ID Stock, Peça, Código, Marca, NF Origem, Observações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full border focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2 text-xs outline-none ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500' 
                    : 'bg-white border-slate-300 text-slate-800 placeholder:text-slate-400'
                }`}
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => setApenasUrgentes(!apenasUrgentes)}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  apenasUrgentes 
                    ? (isDark ? 'bg-red-950 text-red-300 border-red-700 shadow-md' : 'bg-red-100 text-red-800 border-red-300 shadow-sm') 
                    : (isDark ? 'bg-slate-950 hover:bg-slate-900 text-slate-400 border-slate-800' : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300')
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${apenasUrgentes ? 'text-red-500 fill-red-500' : (isDark ? 'text-slate-500' : 'text-slate-400')}`} />
                <span>{apenasUrgentes ? 'Apenas Urgentes' : 'Filtro Urgentes'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Summary for Negotiation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border flex items-center space-x-3.5 ${
          isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`p-3 rounded-xl border ${
            isDark ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border-indigo-200'
          }`}>
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-[11px] font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Itens Filtrados</div>
            <div className={`text-xl font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{filteredItems.length} unidades</div>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex items-center space-x-3.5 ${
          isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`p-3 rounded-xl border ${
            isDark ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
          }`}>
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-[11px] font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Valor Total em Negociação</div>
            <div className={`text-xl font-bold font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border flex items-center space-x-3.5 ${
          isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`p-3 rounded-xl border ${
            isDark ? 'bg-purple-600/20 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-600 border-purple-200'
          }`}>
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-[11px] font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Fornecedores Filtrados</div>
            <div className={`text-xl font-bold font-mono ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
              {new Set(filteredItems.map(i => i.fornecedor).filter(Boolean)).size} parceiros
            </div>
          </div>
        </div>
      </div>

      {/* Table Preview of Negotiable Items */}
      <div className={`rounded-2xl border shadow-xl overflow-hidden ${
        isDark ? 'bg-slate-900/80 border-slate-800/90 shadow-2xl' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {/* Table Header with Action Buttons on Top */}
        <div className={`p-4 border-b flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 ${
          isDark ? 'bg-slate-950/90 border-slate-800/90' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className={`flex items-center space-x-2 text-xs font-bold uppercase tracking-wider flex-wrap ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}>
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Colunas da Tabela de Negociação</span>
            {selectedItems.length > 0 && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                isDark ? 'bg-indigo-950 text-indigo-300 border-indigo-700' : 'bg-indigo-100 text-indigo-800 border-indigo-300'
              }`}>
                {selectedItems.length} selecionado{selectedItems.length > 1 ? 's' : ''} ({selectedTotalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
              </span>
            )}
          </div>

          {/* Action Buttons: Trocar Status, Baixar Excel, Baixar PDF, Marcar/Desmarcar Todos */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {selectedItems.length > 0 && (
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all active:scale-95 shadow-md shadow-indigo-950/40 animate-pulse"
                title="Alterar o status de todos os itens selecionados em massa"
              >
                <Tag className="w-3.5 h-3.5 mr-1.5" />
                <span>Trocar Status ({selectedItems.length})</span>
              </button>
            )}

            <button
              onClick={handleExportExcel}
              disabled={filteredItems.length === 0}
              className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all active:scale-95 shadow-md shadow-emerald-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar planilha para Excel (CSV / UTF-8)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
              <span>
                {selectedItems.length > 0 ? `Baixar Excel (${selectedItems.length})` : 'Baixar Excel'}
              </span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={filteredItems.length === 0}
              className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all active:scale-95 shadow-md shadow-red-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar relatório formatado em PDF"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              <span>
                {selectedItems.length > 0 ? `Baixar PDF (${selectedItems.length})` : 'Baixar PDF'}
              </span>
            </button>

            <div className={`h-5 w-[1px] mx-1 hidden sm:block ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold border transition-all ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
              }`}
            >
              {isAllFilteredSelected ? 'Desmarcar Todos' : `Marcar Todos (${filteredItems.length})`}
            </button>
            {selectedItems.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedKeys(new Set())}
                className={`text-xs px-2.5 py-1.5 rounded-xl font-medium border transition-all ${
                  isDark 
                    ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 border-slate-200'
                }`}
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className={`p-12 text-center space-y-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            <Package className="w-8 h-8 mx-auto opacity-40" />
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Nenhum item encontrado com os filtros selecionados.</p>
            <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Tente limpar ou alterar os filtros acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full text-left text-xs border-collapse min-w-[1150px] ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
              <thead className={`text-[10px] font-bold uppercase tracking-wider border-b ${
                isDark ? 'bg-slate-950/90 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      className="w-4 h-4 rounded border-slate-400 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                      title={isAllFilteredSelected ? "Desmarcar todos" : "Marcar todos os itens visíveis"}
                    />
                  </th>
                  <th className="p-3">ID STOCK</th>
                  <th className="p-3">Descrição / Peça</th>
                  <th className="p-3">Código</th>
                  <th className="p-3">Marca</th>
                  <th className="p-3 text-center">Qtd Est.</th>
                  <th className="p-3">Fornecedor</th>
                  <th className="p-3">Novo Fornecedor / Filial</th>
                  <th className="p-3">Motivo de garantia</th>
                  <th className="p-3 text-right">Valor Total em Estoque</th>
                  <th className="p-3">Data Compra</th>
                  <th className="p-3">NF Origem</th>
                  <th className="p-3">Obs Nota Fiscal</th>
                  <th className="p-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {paginatedItems.map((item, idx) => {
                  const valInfo = getItemTotalValue(item);
                  const key = getItemKey(item, idx);
                  const isRowSelected = selectedKeys.has(key);
                  const navContext = selectedItems.length > 0 ? selectedItems : filteredItems;

                  return (
                    <tr
                      key={`neg-row-${item.idStock || idx}-${idx}`}
                      onClick={() => onSelectItem(item, navContext)}
                      className={`cursor-pointer transition-colors group ${
                        isRowSelected 
                          ? (isDark ? 'bg-emerald-950/30 text-emerald-100 border-l-4 border-l-emerald-500' : 'bg-emerald-50 text-emerald-900 border-l-4 border-l-emerald-500') 
                          : (isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50')
                      }`}
                    >
                      <td className="p-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={() => toggleSelectItem(key)}
                          className="w-4 h-4 rounded border-slate-400 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      <td className={`p-3 font-mono font-bold whitespace-nowrap ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        {item.idStock}
                      </td>
                      <td className={`p-3 font-semibold max-w-[220px] truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`} title={item.descricao}>
                        {item.descricao || '—'}
                      </td>
                      <td className={`p-3 font-mono whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {item.codigo || '—'}
                      </td>
                      <td className={`p-3 font-medium whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {item.marca || '—'}
                      </td>
                      <td className={`p-3 text-center font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {item.quantEstoque || '1'}
                      </td>
                      <td className={`p-3 max-w-[150px] truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`} title={item.fornecedor}>
                        {item.fornecedor || '—'}
                      </td>
                      <td className={`p-3 max-w-[150px] truncate ${isDark ? 'text-indigo-300' : 'text-indigo-600 font-medium'}`} title={item.novoFornecedorFilial}>
                        {item.novoFornecedorFilial || '—'}
                      </td>

                      <td className={`p-3 max-w-[200px] truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`} title={item.motivo || item.observacoesGerais}>
                        {item.motivo || item.observacoesGerais || '—'}
                      </td>
                      <td className={`p-3 text-right font-mono font-bold whitespace-nowrap ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {valInfo.formatted}
                      </td>
                      <td className={`p-3 font-mono whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.dataCompra || '—'}
                      </td>
                      <td className="p-3 font-mono text-amber-600 whitespace-nowrap">
                        {cleanNotaFiscal(item.nfOrigem) || '—'}
                      </td>
                      <td className={`p-3 max-w-[180px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`} title={item.obsNotaFiscal || item.observacoesGerais}>
                        {item.obsNotaFiscal || item.observacoesGerais || '—'}
                      </td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectItem(item, navContext);
                          }}
                          className={`p-1.5 transition-colors rounded-lg border ${
                            isDark 
                              ? 'text-slate-500 group-hover:text-white bg-slate-950 border-slate-800' 
                              : 'text-slate-400 group-hover:text-slate-900 bg-white border-slate-200'
                          }`}
                          title="Abrir Detalhes do Item"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredItems.length > 0 && (
          <div className={`p-3.5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            isDark ? 'bg-slate-950/90 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center space-x-3 flex-wrap gap-y-1">
              <span>
                Exibindo <span className="font-bold text-emerald-500">{pageSize >= 99999 ? 1 : (currentPage - 1) * pageSize + 1}</span> a{' '}
                <span className="font-bold text-emerald-500">{pageSize >= 99999 ? filteredItems.length : Math.min(currentPage * pageSize, filteredItems.length)}</span> de{' '}
                <span className="font-bold">{filteredItems.length}</span> itens
              </span>

              <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-700/50">
                <span className="text-[11px] text-slate-400">Por página:</span>
                {[25, 50, 100, 200, 99999].map(size => (
                  <button
                    key={`psize-${size}`}
                    type="button"
                    onClick={() => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                      pageSize === size
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : isDark
                          ? 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {size >= 99999 ? 'Todos' : size}
                  </button>
                ))}
              </div>
            </div>

            {/* Page Navigation */}
            {totalPages > 1 && (
              <div className="flex items-center space-x-1 self-end sm:self-auto">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border disabled:opacity-30 disabled:cursor-not-allowed transition-all ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Anterior
                </button>

                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={`page-btn-${pageNum}`}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all border ${
                          currentPage === pageNum
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                            : isDark
                              ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border disabled:opacity-30 disabled:cursor-not-allowed transition-all ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bulk Status & Notes Update Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl animate-fadeIn ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-indigo-500" />
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Editar Itens Selecionados em Massa</h3>
              </div>
              <button 
                onClick={() => setIsBulkModalOpen(false)}
                className={`p-1 rounded-lg transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white bg-slate-800' : 'text-slate-500 hover:text-slate-900 bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`p-3 border rounded-xl space-y-1 ${
              isDark ? 'bg-indigo-950/60 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'
            }`}>
              <div className={`text-xs font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>
                {selectedItems.length} {selectedItems.length === 1 ? 'item selecionado' : 'itens selecionados'}
              </div>
              <div className={`text-xs font-mono ${isDark ? 'text-indigo-200' : 'text-indigo-700'}`}>
                Valor Total acumulado: {selectedTotalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div className={`text-[11px] font-medium italic pt-1 border-t mt-1 ${
                isDark ? 'text-indigo-300/90 border-indigo-500/20' : 'text-indigo-600 border-indigo-200'
              }`}>
                💡 As informações digitadas em observações serão adicionadas à frente do texto já existente, preservando o histórico de cada item.
              </div>
            </div>

            <div className="space-y-4">
              {/* Option 1: Update Status Devolução */}
              <div className={`space-y-2 p-3.5 rounded-xl border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Alterar Status Devolução
                  </span>
                </label>
                {updateStatus && (
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className={`w-full border focus:border-indigo-500 text-xs rounded-xl p-2.5 outline-none font-medium mt-1 ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {(isDevolucaoMode ? OFFICIAL_DEVOLUCAO_STATUSES : OFFICIAL_WARRANTY_STATUSES).map(st => (
                      <option key={`bulk-opt-${st}`} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Option 2: Update Obs Status Devolução */}
              <div className={`space-y-2 p-3.5 rounded-xl border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateObsStatusDevolucao}
                    onChange={(e) => setUpdateObsStatusDevolucao(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Alterar Observação do status de devolução
                  </span>
                </label>
                {updateObsStatusDevolucao && (
                  <select
                    value={bulkObsStatusDevolucao}
                    onChange={(e) => setBulkObsStatusDevolucao(e.target.value)}
                    className={`w-full border focus:border-indigo-500 text-xs rounded-xl p-2.5 outline-none font-medium mt-1 ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="">Selecione uma opção...</option>
                    {allObsStatusOptions.map(opt => (
                      <option key={`bulk-obs-stat-${opt}`} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Option 3: Update Obs Nota Fiscal */}
              <div className={`space-y-2 p-3.5 rounded-xl border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateObsNf}
                    onChange={(e) => setUpdateObsNf(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Atualizar "Obs Nota Fiscal"
                  </span>
                </label>
                {updateObsNf && (
                  <textarea
                    rows={2}
                    value={bulkObsNf}
                    onChange={(e) => setBulkObsNf(e.target.value)}
                    placeholder="Digite a observação da nota fiscal para aplicar a todos os selecionados..."
                    className={`w-full border focus:border-indigo-500 text-xs rounded-xl p-2.5 outline-none font-sans mt-1 ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                )}
              </div>

              {/* Option 4: Update Observações Gerais */}
              <div className={`space-y-2 p-3.5 rounded-xl border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateObsGerais}
                    onChange={(e) => setUpdateObsGerais(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Atualizar "Observações gerais do item"
                  </span>
                </label>
                {updateObsGerais && (
                  <textarea
                    rows={2}
                    value={bulkObsGerais}
                    onChange={(e) => setBulkObsGerais(e.target.value)}
                    placeholder="Digite as observações gerais/motivo para aplicar a todos os selecionados..."
                    className={`w-full border focus:border-indigo-500 text-xs rounded-xl p-2.5 outline-none font-sans mt-1 ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                )}
              </div>
            </div>

            <div className={`border-t pt-4 flex items-center justify-end space-x-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isDark ? 'text-slate-400 hover:text-slate-200 bg-slate-800' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyBulkStatus}
                disabled={!updateStatus && !updateObsStatusDevolucao && !updateObsNf && !updateObsGerais}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-950/50 transition-all"
              >
                Aplicar Alterações a {selectedItems.length} Itens
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
