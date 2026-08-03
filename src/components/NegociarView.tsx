import React, { useState, useMemo, useEffect } from 'react';
import { 
  Handshake, 
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
  FileText
} from 'lucide-react';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StockItem } from '../types';
import { isItemUrgent, OFFICIAL_WARRANTY_STATUSES } from '../utils/statusUtils';
import { isDateInRange } from '../utils/dateUtils';

interface NegociarViewProps {
  items: StockItem[];
  onSelectItem: (item: StockItem) => void;
  onBatchUpdateStatus?: (updatedItems: StockItem[]) => void;
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

export const NegociarView: React.FC<NegociarViewProps> = ({ items, onSelectItem, onBatchUpdateStatus }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedFornecedor, setSelectedFornecedor] = useState<string>('all');
  const [selectedNovoFornecedor, setSelectedNovoFornecedor] = useState<string>('all');
  
  // Date Filtering State
  const [dateType, setDateType] = useState<'dataIncidencia' | 'dataSaida' | 'dataRecebimento' | 'dataCompra' | 'dataSolicitacao'>('dataIncidencia');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  const [apenasUrgentes, setApenasUrgentes] = useState<boolean>(false);

  // Selection & Bulk Action State
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [targetStatus, setTargetStatus] = useState<string>('Garantia: Em negociação');
  const [updateStatus, setUpdateStatus] = useState<boolean>(true);
  
  const [bulkObsNf, setBulkObsNf] = useState<string>('');
  const [updateObsNf, setUpdateObsNf] = useState<boolean>(false);

  const [bulkObsGerais, setBulkObsGerais] = useState<string>('');
  const [updateObsGerais, setUpdateObsGerais] = useState<boolean>(false);

  const [bulkSuccessBanner, setBulkSuccessBanner] = useState<string | null>(null);

  // 1. Status List from all items + Official Warranty Statuses
  const statusList = useMemo(() => {
    const set = new Set<string>();
    OFFICIAL_WARRANTY_STATUSES.forEach(st => set.add(st));
    items.forEach(i => {
      if (i.statusDevolucao && i.statusDevolucao.trim()) {
        set.add(i.statusDevolucao.trim());
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // 2. Filter items by Status & Urgencia for Cascading Supplier options
  const itemsAfterStatus = useMemo(() => {
    return items.filter(item => {
      if (selectedStatus === 'urgente') {
        if (!isItemUrgent(item)) return false;
      } else if (selectedStatus !== 'all' && (item.statusDevolucao?.trim() || '') !== selectedStatus) {
        return false;
      }
      if (apenasUrgentes && !isItemUrgent(item)) return false;
      return true;
    });
  }, [items, selectedStatus, apenasUrgentes]);

  // Available Fornecedores based on selected Status
  const availableFornecedores = useMemo(() => {
    const set = new Set<string>();
    itemsAfterStatus.forEach(i => {
      if (i.fornecedor && i.fornecedor.trim()) {
        set.add(i.fornecedor.trim());
      }
    });
    return Array.from(set).sort();
  }, [itemsAfterStatus]);

  // Auto-reset selectedFornecedor if no longer valid for the selected status
  useEffect(() => {
    if (selectedFornecedor !== 'all' && !availableFornecedores.includes(selectedFornecedor)) {
      setSelectedFornecedor('all');
    }
  }, [availableFornecedores, selectedFornecedor]);

  // 3. Filter items by Status AND Supplier for Cascading Filial options
  const itemsAfterFornecedor = useMemo(() => {
    return itemsAfterStatus.filter(item => {
      if (selectedFornecedor !== 'all' && (item.fornecedor?.trim() || '') !== selectedFornecedor) {
        return false;
      }
      return true;
    });
  }, [itemsAfterStatus, selectedFornecedor]);

  // Available Filiais based on selected Status AND selected Fornecedor
  const availableNovosFornecedores = useMemo(() => {
    const set = new Set<string>();
    itemsAfterFornecedor.forEach(i => {
      if (i.novoFornecedorFilial && i.novoFornecedorFilial.trim()) {
        set.add(i.novoFornecedorFilial.trim());
      }
    });
    return Array.from(set).sort();
  }, [itemsAfterFornecedor]);

  // Auto-reset selectedNovoFornecedor if no longer valid for the selected supplier
  useEffect(() => {
    if (selectedNovoFornecedor !== 'all' && !availableNovosFornecedores.includes(selectedNovoFornecedor)) {
      setSelectedNovoFornecedor('all');
    }
  }, [availableNovosFornecedores, selectedNovoFornecedor]);

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
      // Filter Novo Fornecedor / Filial
      if (selectedNovoFornecedor !== 'all' && (item.novoFornecedorFilial?.trim() || '') !== selectedNovoFornecedor) {
        return false;
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
        const text = `
          ${item.idStock} 
          ${item.descricao} 
          ${item.codigo} 
          ${item.marca} 
          ${item.cliente} 
          ${item.fornecedor} 
          ${item.novoFornecedorFilial} 
          ${item.statusDevolucao} 
          ${item.nfOrigem} 
          ${item.obsNotaFiscal} 
          ${item.notaFiscalSaida}
        `.toLowerCase();
        if (!text.includes(term)) return false;
      }

      return true;
    });
  }, [itemsAfterFornecedor, selectedNovoFornecedor, dateType, startDate, endDate, searchTerm]);

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

  const hasActiveFilters = selectedStatus !== 'all' || 
                           selectedFornecedor !== 'all' || 
                           selectedNovoFornecedor !== 'all' || 
                           startDate !== '' || 
                           endDate !== '' || 
                           apenasUrgentes || 
                           searchTerm !== '';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedFornecedor('all');
    setSelectedNovoFornecedor('all');
    setStartDate('');
    setEndDate('');
    setApenasUrgentes(false);
  };

  // Batch Status & Notes Change Handler
  const handleApplyBulkStatus = () => {
    if (selectedItems.length === 0) return;
    if (!updateStatus && !updateObsNf && !updateObsGerais) return;

    const nowStr = new Date().toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
    const todayShort = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const changes: string[] = [];
    if (updateStatus && targetStatus) changes.push(`Status: "${targetStatus}"`);
    if (updateObsNf) changes.push(`Obs NF alterada`);
    if (updateObsGerais) changes.push(`Obs gerais alteradas`);

    const interacaoSummary = `${todayShort} - ${changes.join(' | ')} em lote`;

    const updatedBatch = selectedItems.map(item => {
      const updated = { ...item, dataUltimaAlteracao: nowStr, ultimaInteracao: interacaoSummary };
      if (updateStatus && targetStatus) {
        updated.statusDevolucao = targetStatus;
      }
      if (updateObsNf) {
        updated.obsNotaFiscal = bulkObsNf;
      }
      if (updateObsGerais) {
        updated.observacoesGerais = bulkObsGerais;
      }
      return updated;
    });

    if (onBatchUpdateStatus) {
      onBatchUpdateStatus(updatedBatch);
    }

    const appliedFields: string[] = [];
    if (updateStatus) appliedFields.push('Status Devolução');
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
    if (selectedFornecedor && selectedFornecedor !== 'all') {
      supplierName = selectedFornecedor;
    } else if (itemsToExport.length > 0) {
      const firstForn = itemsToExport[0].fornecedor?.trim();
      if (firstForn && itemsToExport.every(item => (item.fornecedor?.trim() || '') === firstForn)) {
        supplierName = firstForn;
      }
    }

    // Determine Filial
    let branchName = '';
    if (selectedNovoFornecedor && selectedNovoFornecedor !== 'all') {
      branchName = selectedNovoFornecedor;
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

    parts.push(extension === 'pdf' ? 'Relatorio_Garantias' : 'Negociacao_Garantias');

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
        'Status Devolução': item.statusDevolucao || '',
        'Valor total em estoque': valInfo.formatted,
        'Data compra': item.dataCompra || '',
        'NF Origem': item.nfOrigem || '',
        'Obs Nota Fiscal': item.obsNotaFiscal || item.observacoesGerais || ''
      };
    });

    // Convert to CSV using PapaParse with ';' delimiter (standard for Excel in PT/BR locale)
    const csvString = Papa.unparse(dataToExport, {
      delimiter: ';'
    });

    // Add UTF-8 BOM so Microsoft Excel renders Portuguese characters correctly
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
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

    // Document Header Title
    doc.setFontSize(15);
    doc.setTextColor(16, 185, 129); // Emerald accent
    doc.text(selectedItems.length > 0 ? 'Relatório de Itens Selecionados (Garantias e Devoluções)' : 'Relatório de Negociação de Garantias e Devoluções', 14, 15);

    const exportTotalVal = itemsToExport.reduce((acc, item) => acc + getItemTotalValue(item).rawNum, 0);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const dateStr = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Gerado em: ${dateStr} | Total de Itens: ${itemsToExport.length} | Valor Total: ${exportTotalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, 21);

    // Active Filters Summary
    const filterSummary: string[] = [];
    if (selectedItems.length > 0) filterSummary.push(`Exportando apenas os ${selectedItems.length} itens marcados`);
    if (selectedStatus !== 'all') filterSummary.push(`Status: ${selectedStatus}`);
    if (selectedFornecedor !== 'all') filterSummary.push(`Fornecedor: ${selectedFornecedor}`);
    if (selectedNovoFornecedor !== 'all') filterSummary.push(`Filial: ${selectedNovoFornecedor}`);
    if (startDate || endDate) filterSummary.push(`Período (${dateType}): ${startDate || 'Início'} até ${endDate || 'Hoje'}`);
    if (apenasUrgentes) filterSummary.push('Apenas Urgentes: Sim');
    if (searchTerm) filterSummary.push(`Busca: "${searchTerm}"`);

    let startTableY = 25;
    if (filterSummary.length > 0) {
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Filtros: ${filterSummary.join(' | ')}`, 14, 26);
      startTableY = 30;
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
        item.statusDevolucao || '—',
        valInfo.formatted,
        item.dataCompra || '—',
        item.nfOrigem || '—',
        item.obsNotaFiscal || item.observacoesGerais || '—'
      ];
    });

    autoTable(doc, {
      startY: startTableY,
      head: [[
        'ID STOCK', 'Descrição', 'Código', 'Marca', 'Qtd', 
        'Fornecedor', 'Status', 'Valor Total', 'Data Compra', 'NF Origem', 'Observações'
      ]],
      body: tableData,
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [15, 23, 42], textColor: [241, 245, 249], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 18 },
        1: { cellWidth: 42 },
        2: { cellWidth: 18 },
        3: { cellWidth: 15 },
        4: { halign: 'center', cellWidth: 10 },
        5: { cellWidth: 28 },
        6: { cellWidth: 30 },
        7: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
        8: { cellWidth: 20 },
        9: { cellWidth: 20 },
        10: { cellWidth: 44 }
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
      <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800/90 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Handshake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Painel de Negociação de Garantias
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Filtros encadeados (Status &rarr; Fornecedor &rarr; Filial) e exportação em Excel ou PDF.
              </p>
            </div>
          </div>

          {/* Export Buttons & Bulk Action */}
          <div className="flex items-center space-x-2.5 self-end md:self-auto flex-wrap">
            {selectedItems.length > 0 && (
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all duration-150 active:scale-95 shadow-lg shadow-indigo-950/40 animate-pulse"
                title="Alterar o status de todos os itens selecionados em massa"
              >
                <Tag className="w-4 h-4 mr-1.5" />
                <span>Trocar Status ({selectedItems.length})</span>
              </button>
            )}

            <button
              onClick={handleExportExcel}
              disabled={filteredItems.length === 0}
              className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all duration-150 active:scale-95 shadow-lg shadow-emerald-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar planilha para Excel (CSV / UTF-8)"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              <span>
                {selectedItems.length > 0 ? `Baixar Excel (${selectedItems.length})` : 'Baixar Excel'}
              </span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={filteredItems.length === 0}
              className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition-all duration-150 active:scale-95 shadow-lg shadow-red-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar relatório formatado em PDF"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              <span>
                {selectedItems.length > 0 ? `Baixar PDF (${selectedItems.length})` : 'Baixar PDF'}
              </span>
            </button>
          </div>
        </div>

        {bulkSuccessBanner && (
          <div className="mt-4 p-3 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 font-bold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{bulkSuccessBanner}</span>
            </div>
            <button onClick={() => setBulkSuccessBanner(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters Controls Grid */}
        <div className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Filter className="w-4 h-4 text-emerald-400" />
              <span>Filtros Encadeados para Negociação</span>
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700/60"
              >
                <X className="w-3.5 h-3.5 mr-1" /> Limpar Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Filter 1: Status */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                1. Status da Devolução
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none font-semibold"
              >
                <option value="all">Todos os Status ({statusList.length})</option>
                <option value="urgente">🔥 Apenas Urgentes</option>
                {statusList.map((st, idx) => (
                  <option key={`neg-st-${st}-${idx}`} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Filter 2: Fornecedor (Cascading: based on selected Status) */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center justify-between">
                <span>2. Fornecedor</span>
                {selectedStatus !== 'all' && (
                  <span className="text-[9px] text-emerald-400 font-normal">Filtrado p/ Status</span>
                )}
              </label>
              <select
                value={selectedFornecedor}
                onChange={(e) => setSelectedFornecedor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none font-semibold"
              >
                <option value="all">Todos os Fornecedores ({availableFornecedores.length})</option>
                {availableFornecedores.map((f, idx) => (
                  <option key={`forn-${f}-${idx}`} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Filter 3: Novo Fornecedor / Filial (Cascading: based on selected Status AND Fornecedor) */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center justify-between">
                <span>3. Novo Fornecedor / Filial</span>
                {selectedFornecedor !== 'all' && (
                  <span className="text-[9px] text-indigo-400 font-normal">Filtrado p/ Fornecedor</span>
                )}
              </label>
              <select
                value={selectedNovoFornecedor}
                onChange={(e) => setSelectedNovoFornecedor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none font-semibold"
              >
                <option value="all">Todas as Filiais ({availableNovosFornecedores.length})</option>
                {availableNovosFornecedores.map((ff, idx) => (
                  <option key={`nforn-${ff}-${idx}`} value={ff}>{ff}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Filter Section (Enhanced with Date Field Selector & Quick Ranges) */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Filtro de Período por Tipo de Data</span>
              </div>

              {/* Quick Preset Date Buttons */}
              <div className="flex items-center space-x-1 text-[11px] flex-wrap">
                <button
                  type="button"
                  onClick={() => setQuickRange('all')}
                  className={`px-2.5 py-1 rounded-lg border transition-colors ${
                    !startDate && !endDate ? 'bg-emerald-950 text-emerald-300 border-emerald-800 font-bold' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Tudo
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('this_month')}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 transition-colors"
                >
                  Este Mês
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('last_30')}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 transition-colors"
                >
                  Últimos 30d
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('last_90')}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 transition-colors"
                >
                  Últimos 90d
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('this_year')}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 transition-colors"
                >
                  Este Ano
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Date Type Selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Filtrar por Campo de Data
                </label>
                <select
                  value={dateType}
                  onChange={(e) => setDateType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none font-semibold"
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
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none font-mono"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Data Final
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Search Row & Urgentes Toggle */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
            <div className="md:col-span-10 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por ID Stock, Peça, Código, Marca, NF Origem, Observações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => setApenasUrgentes(!apenasUrgentes)}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  apenasUrgentes 
                    ? 'bg-red-950 text-red-300 border-red-700 shadow-md' 
                    : 'bg-slate-950 hover:bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${apenasUrgentes ? 'text-red-400 fill-red-400' : 'text-slate-500'}`} />
                <span>{apenasUrgentes ? 'Apenas Urgentes' : 'Filtro Urgentes'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Summary for Negotiation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80 flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Itens Filtrados</div>
            <div className="text-xl font-bold text-white font-mono">{filteredItems.length} unidades</div>
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80 flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Valor Total em Negociação</div>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              {totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80 flex items-center space-x-3.5">
          <div className="p-3 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Fornecedores Filtrados</div>
            <div className="text-xl font-bold text-purple-300 font-mono">
              {new Set(filteredItems.map(i => i.fornecedor).filter(Boolean)).size} parceiros
            </div>
          </div>
        </div>
      </div>

      {/* Table Preview of Negotiable Items */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800/90 shadow-2xl overflow-hidden">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Colunas da Tabela de Negociação</span>
            {selectedItems.length > 0 && (
              <span className="ml-2 text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700 font-bold">
                {selectedItems.length} selecionado{selectedItems.length > 1 ? 's' : ''} ({selectedTotalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition-all"
            >
              {isAllFilteredSelected ? 'Desmarcar Todos' : `Marcar Todos (${filteredItems.length})`}
            </button>
            {selectedItems.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedKeys(new Set())}
                className="text-xs px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-medium border border-slate-800 transition-all"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Package className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
            <p className="text-sm font-semibold">Nenhum item encontrado com os filtros selecionados.</p>
            <p className="text-xs text-slate-600">Tente limpar ou alterar os filtros acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse min-w-[1150px]">
              <thead className="bg-slate-950/90 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
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
                  <th className="p-3 text-right">Valor Total em Estoque</th>
                  <th className="p-3">Data Compra</th>
                  <th className="p-3">NF Origem</th>
                  <th className="p-3">Obs Nota Fiscal</th>
                  <th className="p-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredItems.map((item, idx) => {
                  const valInfo = getItemTotalValue(item);
                  const key = getItemKey(item, idx);
                  const isRowSelected = selectedKeys.has(key);

                  return (
                    <tr
                      key={`neg-row-${item.idStock || idx}-${idx}`}
                      onClick={() => onSelectItem(item)}
                      className={`cursor-pointer transition-colors group ${
                        isRowSelected 
                          ? 'bg-emerald-950/30 text-emerald-100 border-l-4 border-l-emerald-500' 
                          : 'hover:bg-slate-800/60'
                      }`}
                    >
                      <td className="p-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={() => toggleSelectItem(key)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-mono font-bold text-indigo-400 whitespace-nowrap">
                        {item.idStock}
                      </td>
                      <td className="p-3 font-semibold text-slate-100 max-w-[220px] truncate" title={item.descricao}>
                        {item.descricao || '—'}
                      </td>
                      <td className="p-3 font-mono text-slate-300 whitespace-nowrap">
                        {item.codigo || '—'}
                      </td>
                      <td className="p-3 font-medium text-slate-300 whitespace-nowrap">
                        {item.marca || '—'}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-200">
                        {item.quantEstoque || '1'}
                      </td>
                      <td className="p-3 text-slate-300 max-w-[150px] truncate" title={item.fornecedor}>
                        {item.fornecedor || '—'}
                      </td>
                      <td className="p-3 text-indigo-300 max-w-[150px] truncate" title={item.novoFornecedorFilial}>
                        {item.novoFornecedorFilial || '—'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {valInfo.formatted}
                      </td>
                      <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                        {item.dataCompra || '—'}
                      </td>
                      <td className="p-3 font-mono text-amber-300 whitespace-nowrap">
                        {item.nfOrigem || '—'}
                      </td>
                      <td className="p-3 text-slate-400 max-w-[180px] truncate" title={item.obsNotaFiscal || item.observacoesGerais}>
                        {item.obsNotaFiscal || item.observacoesGerais || '—'}
                      </td>
                      <td className="p-3 text-center">
                        <button className="p-1.5 text-slate-500 group-hover:text-white transition-colors bg-slate-950 rounded-lg border border-slate-800">
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
      </div>

      {/* Bulk Status & Notes Update Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-2xl animate-fadeIn text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Editar Itens Selecionados em Massa</h3>
              </div>
              <button 
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-indigo-950/60 border border-indigo-500/30 rounded-xl space-y-1">
              <div className="text-xs font-bold text-indigo-300">
                {selectedItems.length} {selectedItems.length === 1 ? 'item selecionado' : 'itens selecionados'}
              </div>
              <div className="text-xs text-indigo-200 font-mono">
                Valor Total acumulado: {selectedTotalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>

            <div className="space-y-4">
              {/* Option 1: Update Status Devolução */}
              <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Alterar Status Devolução
                  </span>
                </label>
                {updateStatus && (
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 text-xs text-slate-100 rounded-xl p-2.5 outline-none font-medium mt-1"
                  >
                    {OFFICIAL_WARRANTY_STATUSES.map(st => (
                      <option key={`bulk-opt-${st}`} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Option 2: Update Obs Nota Fiscal */}
              <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateObsNf}
                    onChange={(e) => setUpdateObsNf(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Atualizar "Obs Nota Fiscal"
                  </span>
                </label>
                {updateObsNf && (
                  <textarea
                    rows={2}
                    value={bulkObsNf}
                    onChange={(e) => setBulkObsNf(e.target.value)}
                    placeholder="Digite a observação da nota fiscal para aplicar a todos os selecionados..."
                    className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 text-xs text-slate-100 rounded-xl p-2.5 outline-none font-sans mt-1"
                  />
                )}
              </div>

              {/* Option 3: Update Observações Gerais */}
              <div className="space-y-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateObsGerais}
                    onChange={(e) => setUpdateObsGerais(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Atualizar "Observações gerais do item"
                  </span>
                </label>
                {updateObsGerais && (
                  <textarea
                    rows={2}
                    value={bulkObsGerais}
                    onChange={(e) => setBulkObsGerais(e.target.value)}
                    placeholder="Digite as observações gerais/motivo para aplicar a todos os selecionados..."
                    className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 text-xs text-slate-100 rounded-xl p-2.5 outline-none font-sans mt-1"
                  />
                )}
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyBulkStatus}
                disabled={!updateStatus && !updateObsNf && !updateObsGerais}
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
