import React, { useState, useEffect, useMemo } from 'react';
import { 
  Kanban, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Filter, 
  ArrowUpRight, 
  PackageCheck, 
  Truck, 
  Building2, 
  Eye, 
  Tag, 
  ChevronRight,
  Boxes,
  Flame,
  FileText
} from 'lucide-react';
import { StockItem } from '../types';
import { getDaysFromDate } from '../utils/dateUtils';
import { isFinalizedStatus, isItemUrgent, cleanNotaFiscal } from '../utils/statusUtils';
import { TimelineBar } from './TimelineBar';

interface KanbanAlertsProps {
  items: StockItem[];
  onSelectItem: (item: StockItem) => void;
  theme?: 'dark' | 'light';
}

type KanbanFlow = 'enviadas' | 'recebidas' | 'incidencia';

interface AgeGroup {
  id: '0-30' | '30-60' | '60-90' | '90+' | 'finalizados';
  title: string;
  subTitle: string;
  minDays: number;
  maxDays: number;
  headerBgDark: string;
  headerBgLight: string;
  borderColorDark: string;
  borderColorLight: string;
  textColorDark: string;
  textColorLight: string;
  badgeBgDark: string;
  badgeBgLight: string;
  iconColorDark: string;
  iconColorLight: string;
}

const AGE_GROUPS: AgeGroup[] = [
  {
    id: '0-30',
    title: '0 a 30 dias',
    subTitle: 'Dentro do prazo normal',
    minDays: 0,
    maxDays: 30,
    headerBgDark: 'bg-emerald-950/70',
    headerBgLight: 'bg-emerald-50',
    borderColorDark: 'border-emerald-800/80',
    borderColorLight: 'border-emerald-200',
    textColorDark: 'text-emerald-300',
    textColorLight: 'text-emerald-800',
    badgeBgDark: 'bg-emerald-500/20 text-emerald-300 border-emerald-700/60',
    badgeBgLight: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    iconColorDark: 'text-emerald-400',
    iconColorLight: 'text-emerald-600'
  },
  {
    id: '30-60',
    title: '30 a 60 dias',
    subTitle: 'Requer atenção',
    minDays: 31,
    maxDays: 60,
    headerBgDark: 'bg-amber-950/70',
    headerBgLight: 'bg-amber-50',
    borderColorDark: 'border-amber-800/80',
    borderColorLight: 'border-amber-200',
    textColorDark: 'text-amber-300',
    textColorLight: 'text-amber-800',
    badgeBgDark: 'bg-amber-500/20 text-amber-300 border-amber-700/60',
    badgeBgLight: 'bg-amber-100 text-amber-800 border-amber-300',
    iconColorDark: 'text-amber-400',
    iconColorLight: 'text-amber-600'
  },
  {
    id: '60-90',
    title: '60 a 90 dias',
    subTitle: 'Item atrasado',
    minDays: 61,
    maxDays: 90,
    headerBgDark: 'bg-rose-950/80',
    headerBgLight: 'bg-rose-50',
    borderColorDark: 'border-rose-800/80',
    borderColorLight: 'border-rose-200',
    textColorDark: 'text-rose-300',
    textColorLight: 'text-rose-800',
    badgeBgDark: 'bg-rose-500/20 text-rose-300 border-rose-700/60',
    badgeBgLight: 'bg-rose-100 text-rose-800 border-rose-300',
    iconColorDark: 'text-rose-400',
    iconColorLight: 'text-rose-600'
  },
  {
    id: '90+',
    title: 'Acima de 90 dias',
    subTitle: 'Nível crítico',
    minDays: 91,
    maxDays: Infinity,
    headerBgDark: 'bg-red-950/90',
    headerBgLight: 'bg-red-50',
    borderColorDark: 'border-red-800/90',
    borderColorLight: 'border-red-200',
    textColorDark: 'text-red-200',
    textColorLight: 'text-red-800',
    badgeBgDark: 'bg-red-600/30 text-red-200 border-red-700',
    badgeBgLight: 'bg-red-100 text-red-800 border-red-300',
    iconColorDark: 'text-red-400',
    iconColorLight: 'text-red-600'
  },
  {
    id: 'finalizados',
    title: 'Finalizados',
    subTitle: 'Tempo Parado (0d)',
    minDays: 0,
    maxDays: 0,
    headerBgDark: 'bg-blue-950/90',
    headerBgLight: 'bg-blue-50',
    borderColorDark: 'border-blue-800/90',
    borderColorLight: 'border-blue-200',
    textColorDark: 'text-blue-200',
    textColorLight: 'text-blue-800',
    badgeBgDark: 'bg-blue-600/30 text-blue-200 border-blue-700',
    badgeBgLight: 'bg-blue-100 text-blue-800 border-blue-300',
    iconColorDark: 'text-blue-400',
    iconColorLight: 'text-blue-600'
  }
];

export const KanbanAlerts: React.FC<KanbanAlertsProps> = ({ items, onSelectItem, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const [flow, setFlow] = useState<KanbanFlow>('enviadas');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedFornecedor, setSelectedFornecedor] = useState<string>('all');
  const [selectedNovoFornecedor, setSelectedNovoFornecedor] = useState<string>('all');
  const [apenasUrgentes, setApenasUrgentes] = useState<boolean>(false);
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({
    '0-30': 25,
    '30-60': 25,
    '60-90': 25,
    '90+': 25,
    'finalizados': 25
  });

  // List of unique statuses for dropdown
  const statusList = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.statusDevolucao && i.statusDevolucao.trim()) {
        set.add(i.statusDevolucao.trim());
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // Count items per status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalUrgentes = 0;
    items.forEach(i => {
      if (apenasUrgentes && !isItemUrgent(i)) return;
      const st = i.statusDevolucao?.trim();
      if (st) {
        counts[st] = (counts[st] || 0) + 1;
      }
      if (isItemUrgent(i)) totalUrgentes++;
    });
    return { counts, totalUrgentes };
  }, [items, apenasUrgentes]);

  // Filter items by Status & Urgencia for Cascading Supplier options
  const itemsAfterStatus = useMemo(() => {
    return items.filter(item => {
      if (apenasUrgentes && !isItemUrgent(item)) return false;
      if (selectedStatus === 'urgente') return isItemUrgent(item);
      if (selectedStatus !== 'all' && (item.statusDevolucao?.trim() || '') !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [items, selectedStatus, apenasUrgentes]);

  // Count items per Fornecedor based on current Status filter
  const fornecedorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    itemsAfterStatus.forEach(i => {
      const f = i.fornecedor?.trim();
      if (f) {
        counts[f] = (counts[f] || 0) + 1;
      }
    });
    return counts;
  }, [itemsAfterStatus]);

  // Available Fornecedores based on selected Status (sorted by item count descending, then name)
  const availableFornecedores = useMemo(() => {
    const set = new Set<string>();
    itemsAfterStatus.forEach(i => {
      if (i.fornecedor && i.fornecedor.trim()) {
        set.add(i.fornecedor.trim());
      }
    });
    return Array.from(set).sort((a, b) => {
      const countDiff = (fornecedorCounts[b] || 0) - (fornecedorCounts[a] || 0);
      if (countDiff !== 0) return countDiff;
      return a.localeCompare(b);
    });
  }, [itemsAfterStatus, fornecedorCounts]);

  // Auto-reset selectedFornecedor if no longer valid for the selected status
  useEffect(() => {
    if (selectedFornecedor !== 'all' && !availableFornecedores.includes(selectedFornecedor)) {
      setSelectedFornecedor('all');
    }
  }, [availableFornecedores, selectedFornecedor]);

  // Filter items after Fornecedor selection
  const itemsAfterFornecedor = useMemo(() => {
    return itemsAfterStatus.filter(item => {
      if (selectedFornecedor !== 'all' && (item.fornecedor?.trim() || '') !== selectedFornecedor) {
        return false;
      }
      return true;
    });
  }, [itemsAfterStatus, selectedFornecedor]);

  // Count items per Filial based on selected Status AND Fornecedor
  const filialCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    itemsAfterFornecedor.forEach(i => {
      const ff = i.novoFornecedorFilial?.trim();
      if (ff) {
        counts[ff] = (counts[ff] || 0) + 1;
      }
    });
    return counts;
  }, [itemsAfterFornecedor]);

  // Available Filiais based on selected Status AND selected Fornecedor
  const availableNovosFornecedores = useMemo(() => {
    const set = new Set<string>();
    itemsAfterFornecedor.forEach(i => {
      if (i.novoFornecedorFilial && i.novoFornecedorFilial.trim()) {
        set.add(i.novoFornecedorFilial.trim());
      }
    });
    return Array.from(set).sort((a, b) => {
      const countDiff = (filialCounts[b] || 0) - (filialCounts[a] || 0);
      if (countDiff !== 0) return countDiff;
      return a.localeCompare(b);
    });
  }, [itemsAfterFornecedor, filialCounts]);

  // Auto-reset selectedNovoFornecedor if no longer valid
  useEffect(() => {
    if (selectedNovoFornecedor !== 'all' && !availableNovosFornecedores.includes(selectedNovoFornecedor)) {
      setSelectedNovoFornecedor('all');
    }
  }, [availableNovosFornecedores, selectedNovoFornecedor]);

  // Process items and add calculated days based on active flow and finalized status
  const processedItems = useMemo(() => {
    return items
      .map(item => {
        const isFinal = isFinalizedStatus(item.statusDevolucao);
        const dateStr = flow === 'enviadas' ? item.dataSaida : flow === 'recebidas' ? item.dataRecebimento : item.dataIncidencia;
        const rawDays = getDaysFromDate(dateStr);
        // If status is finalized, count stops at 0
        const days = isFinal ? 0 : rawDays;
        return {
          item,
          days,
          dateStr,
          isFinal
        };
      })
      .filter(({ item, days, isFinal }) => {
        // Filter out items without valid days unless finalized
        if (!isFinal && (days === null || isNaN(days) || days < 0)) return false;

        // Apply status filter
        if (selectedStatus === 'urgente') {
          if (!isItemUrgent(item)) return false;
        } else if (selectedStatus !== 'all' && (item.statusDevolucao?.trim() || '') !== selectedStatus) {
          return false;
        }

        // Apply fornecedor filter
        if (selectedFornecedor !== 'all' && (item.fornecedor?.trim() || '') !== selectedFornecedor) {
          return false;
        }

        // Apply filial filter
        if (selectedNovoFornecedor !== 'all' && (item.novoFornecedorFilial?.trim() || '') !== selectedNovoFornecedor) {
          return false;
        }

        // Apply urgent toggle filter
        if (apenasUrgentes && !isItemUrgent(item)) {
          return false;
        }

        // Apply search term
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          const text = `
            ${item.idStock} 
            ${item.cliente} 
            ${item.descricao} 
            ${item.codigo} 
            ${item.marca} 
            ${item.fornecedor || ''}
            ${item.novoFornecedorFilial || ''}
            ${item.statusDevolucao}
            ${item.notaFiscalSaida || ''}
          `.toLowerCase();
          if (!text.includes(term)) return false;
        }

        return true;
      });
  }, [items, flow, selectedStatus, selectedFornecedor, selectedNovoFornecedor, apenasUrgentes, searchTerm]);

  // Group items into the 5 columns
  const columns = useMemo(() => {
    const map: Record<string, typeof processedItems> = {
      '0-30': [],
      '30-60': [],
      '60-90': [],
      '90+': [],
      'finalizados': []
    };

    processedItems.forEach(entry => {
      if (entry.isFinal) {
        map['finalizados'].push(entry);
        return;
      }

      const d = entry.days ?? 0;
      if (d <= 30) {
        map['0-30'].push(entry);
      } else if (d <= 60) {
        map['30-60'].push(entry);
      } else if (d <= 90) {
        map['60-90'].push(entry);
      } else {
        map['90+'].push(entry);
      }
    });

    // Sort items within each column by highest days first (most delayed first)
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => (b.days ?? 0) - (a.days ?? 0));
    });

    return map;
  }, [processedItems]);

  const totalValid = processedItems.length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner & Flow Selection */}
      <div className={`rounded-2xl p-5 border shadow-xl backdrop-blur-sm transition-colors ${
        isDark 
          ? 'bg-slate-900/90 border-slate-800' 
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div>
            <div className="flex items-center space-x-2 text-indigo-500 font-bold uppercase text-xs tracking-wider mb-1">
              <Kanban className="w-4 h-4" />
              <span>Gestão de Prazos & Alertas Kanban</span>
            </div>
            <h2 className={`text-xl font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              Quadro de Acompanhamento por Prazos
            </h2>
            <p className={`text-xs mt-0.5 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Organização automática de itens por faixas de idade (0, 30, 60, 90+ dias e Finalizados)
            </p>
          </div>

          {/* Flow Selector Tabs */}
          <div className={`p-1 rounded-xl border flex items-center space-x-1 self-start md:self-auto flex-wrap gap-1 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setFlow('enviadas')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                flow === 'enviadas'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Enviadas / Saída (Data Saída)</span>
            </button>
            <button
              onClick={() => setFlow('recebidas')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                flow === 'recebidas'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              <span>Recebidas em Estoque (Data Recebimento)</span>
            </button>
            <button
              onClick={() => setFlow('incidencia')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                flow === 'incidencia'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-purple-400" />
              <span>Data de Incidência (Coluna Q)</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="pt-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-9 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar no Kanban por ID Stock, Cliente, Código, Peça, Marca, Fornecedor ou NF Saída..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full border rounded-xl pl-10 pr-4 py-2 text-xs outline-none transition-all ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 focus:border-indigo-500 text-slate-200 placeholder:text-slate-500'
                    : 'bg-slate-50 border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800 placeholder:text-slate-400'
                }`}
              />
            </div>

            <div className="md:col-span-3">
              <button
                onClick={() => setApenasUrgentes(!apenasUrgentes)}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  apenasUrgentes 
                    ? isDark 
                      ? 'bg-red-950 text-red-300 border-red-700 shadow-md' 
                      : 'bg-red-50 text-red-700 border-red-300 shadow-sm'
                    : isDark 
                      ? 'bg-slate-950 hover:bg-slate-900 text-slate-400 border-slate-800' 
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${apenasUrgentes ? 'text-red-500 fill-red-500' : 'text-slate-400'}`} />
                <span>{apenasUrgentes ? 'Urgentes Ativo' : 'Apenas Urgentes'}</span>
              </button>
            </div>
          </div>

          {/* 3 Cascading Select Filters: Status, Fornecedor, Filial */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Status Filter */}
            <div className="space-y-1">
              <label className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <Tag className="w-3 h-3 text-indigo-500" /> Status do Item
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={`w-full border text-xs rounded-xl px-3 py-2 outline-none font-semibold transition-all ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 focus:border-indigo-500 text-slate-200'
                    : 'bg-slate-50 border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800'
                }`}
              >
                <option value="all">Todos os Status ({items.length} itens)</option>
                <option value="urgente">🔥 Apenas Urgentes ({statusCounts.totalUrgentes} itens)</option>
                {statusList.map((st, idx) => {
                  const count = statusCounts.counts[st] || 0;
                  return (
                    <option key={`kanban-st-${st}-${idx}`} value={st}>
                      {st} ({count} {count === 1 ? 'item' : 'itens'})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Fornecedor Filter */}
            <div className="space-y-1">
              <label className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <Building2 className="w-3 h-3 text-indigo-500" /> Fornecedor
              </label>
              <select
                value={selectedFornecedor}
                onChange={(e) => setSelectedFornecedor(e.target.value)}
                className={`w-full border text-xs rounded-xl px-3 py-2 outline-none font-semibold transition-all ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 focus:border-indigo-500 text-slate-200'
                    : 'bg-slate-50 border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800'
                }`}
              >
                <option value="all">Todos os Fornecedores ({itemsAfterStatus.length} itens)</option>
                {availableFornecedores.map((f, idx) => {
                  const count = fornecedorCounts[f] || 0;
                  return (
                    <option key={`kanban-forn-${f}-${idx}`} value={f}>
                      {f} ({count} {count === 1 ? 'item' : 'itens'})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Filial / Novo Fornecedor Filter */}
            <div className="space-y-1">
              <label className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <Building2 className="w-3 h-3 text-indigo-500" /> Filial (Novo Fornecedor)
              </label>
              <select
                value={selectedNovoFornecedor}
                onChange={(e) => setSelectedNovoFornecedor(e.target.value)}
                className={`w-full border text-xs rounded-xl px-3 py-2 outline-none font-semibold transition-all ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 focus:border-indigo-500 text-slate-200'
                    : 'bg-slate-50 border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800'
                }`}
              >
                <option value="all">Todas as Filiais ({itemsAfterFornecedor.length} itens)</option>
                {availableNovosFornecedores.map((ff, idx) => {
                  const count = filialCounts[ff] || 0;
                  return (
                    <option key={`kanban-nforn-${ff}-${idx}`} value={ff}>
                      {ff} ({count} {count === 1 ? 'item' : 'itens'})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Grid Columns (5 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 items-start">
        {AGE_GROUPS.map(group => {
          const groupItems = columns[group.id] || [];
          const groupPercentage = totalValid > 0 ? ((groupItems.length / totalValid) * 100).toFixed(0) : '0';

          const colHeaderBg = isDark ? group.headerBgDark : group.headerBgLight;
          const colBorder = isDark ? group.borderColorDark : group.borderColorLight;
          const colTextColor = isDark ? group.textColorDark : group.textColorLight;
          const colBadgeBg = isDark ? group.badgeBgDark : group.badgeBgLight;
          const colIconColor = isDark ? group.iconColorDark : group.iconColorLight;

          return (
            <div 
              key={group.id}
              className={`rounded-2xl flex flex-col max-h-[820px] shadow-xl overflow-hidden border transition-colors ${
                isDark 
                  ? 'bg-slate-900/80 border-slate-800/80' 
                  : 'bg-slate-50/90 border-slate-200/90 shadow-sm'
              }`}
            >
              {/* Column Header */}
              <div className={`p-3.5 border-b ${colHeaderBg} ${colBorder} flex items-center justify-between`}>
                <div className="flex items-center space-x-2">
                  <Clock className={`w-4 h-4 ${colIconColor}`} />
                  <div>
                    <h3 className={`text-xs font-black tracking-tight ${colTextColor}`}>
                      {group.title}
                    </h3>
                    <p className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {group.subTitle}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-black border ${colBadgeBg}`}>
                  {groupItems.length}
                </span>
              </div>

              {/* Column Body Cards List */}
              <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1 custom-scrollbar min-h-[250px]">
                {groupItems.length === 0 ? (
                  <div className={`py-12 text-center border border-dashed rounded-xl ${
                    isDark ? 'text-slate-600 border-slate-800/80' : 'text-slate-400 border-slate-300'
                  }`}>
                    <CheckCircle2 className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <p className="text-xs font-semibold">Nenhum item nesta faixa</p>
                  </div>
                ) : (
                  <>
                    {groupItems.slice(0, visibleCounts[group.id] || 25).map(({ item, days, isFinal }, cardIdx) => {
                      const urgent = isItemUrgent(item);
                      return (
                        <div
                          key={`${item.idStock || 'card'}-${cardIdx}`}
                          onClick={() => onSelectItem(item)}
                          className={`rounded-xl p-3 shadow-sm cursor-pointer transition-all hover:scale-[1.01] group space-y-2 border ${
                            isDark
                              ? urgent
                                ? 'bg-slate-950 border-red-800/90 shadow-red-950/20 hover:bg-slate-900/90'
                                : isFinal
                                  ? 'bg-slate-950 border-blue-900/60 hover:bg-slate-900/90'
                                  : 'bg-slate-950 border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/90'
                              : urgent
                                ? 'bg-white border-red-300 shadow-red-100 hover:border-red-400 hover:bg-red-50/20'
                                : isFinal
                                  ? 'bg-white border-blue-200 hover:border-blue-300 hover:bg-blue-50/20'
                                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                          }`}
                        >
                          {/* Top Row: ID Stock & Days Badge */}
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <div className="flex items-center space-x-1">
                              <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${
                                isDark
                                  ? 'bg-indigo-950/80 text-indigo-400 border-indigo-800/80'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`}>
                                {item.idStock}
                              </span>
                              {urgent && (
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 border ${
                                  isDark
                                    ? 'bg-red-950 text-red-300 border-red-700'
                                    : 'bg-red-100 text-red-800 border-red-300'
                                }`}>
                                  <Flame className="w-2.5 h-2.5 fill-red-500 text-red-500" /> URGENTE
                                </span>
                              )}
                            </div>
                            
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isFinal 
                                ? isDark ? 'bg-blue-950 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-800 border-blue-300'
                                : colBadgeBg
                            }`}>
                              {isFinal ? 'Parado (0d)' : `${days} ${days === 1 ? 'dia' : 'dias'}`}
                            </span>
                          </div>

                          {/* Cliente */}
                          <div>
                            <div className={`text-[10px] uppercase font-bold flex items-center ${
                              isDark ? 'text-slate-500' : 'text-slate-500'
                            }`}>
                              <Building2 className={`w-3 h-3 mr-1 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} /> Cliente / Oficina
                            </div>
                            <div className={`text-xs font-bold truncate mt-0.5 ${
                              isDark ? 'text-slate-100' : 'text-slate-900'
                            }`}>
                              {item.cliente || 'Não Informado'}
                            </div>
                          </div>

                          {/* Description & Code */}
                          <div>
                            <div className={`text-xs font-semibold line-clamp-2 ${
                              isDark ? 'text-slate-300' : 'text-slate-700'
                            }`}>
                              {item.descricao || 'Peça sem descrição'}
                            </div>
                            <div className={`text-[11px] font-mono mt-0.5 flex items-center gap-2 flex-wrap ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              <span>Cód: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{item.codigo || '—'}</strong></span>
                              <span>Marca: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{item.marca || '—'}</strong></span>
                            </div>
                          </div>

                          {/* NF de Saída if available */}
                          {item.notaFiscalSaida && (
                            <div className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                              isDark
                                ? 'text-amber-300 bg-amber-950/40 border-amber-900/60'
                                : 'text-amber-800 bg-amber-50 border-amber-200'
                            }`}>
                              <FileText className="w-3 h-3 text-amber-500" /> NF Saída: {cleanNotaFiscal(item.notaFiscalSaida)}
                            </div>
                          )}

                          {/* Status Tag */}
                          <div className={`flex items-center justify-between pt-1 border-t ${
                            isDark ? 'border-slate-900' : 'border-slate-100'
                          }`}>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border max-w-[140px] truncate ${
                              isFinal 
                                ? isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : isDark ? 'bg-slate-900 text-indigo-300 border-slate-800' : 'bg-slate-100 text-indigo-800 border-slate-200'
                            }`}>
                              {item.statusDevolucao || 'Pendente'}
                            </span>
                            <button 
                              className={`p-1 transition-colors ${
                                isDark ? 'text-slate-500 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-800'
                              }`}
                              title="Abrir Ficha"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Timeline Bar Mini */}
                          <TimelineBar days={days} compact={true} theme={theme} />
                        </div>
                      );
                    })}

                    {groupItems.length > (visibleCounts[group.id] || 25) && (
                      <button
                        onClick={() => {
                          setVisibleCounts(prev => ({
                            ...prev,
                            [group.id]: (prev[group.id] || 25) + 25
                          }));
                        }}
                        className={`w-full py-2 border rounded-xl text-xs font-bold transition-colors shadow-sm ${
                          isDark
                            ? 'bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border-indigo-800/80'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        Mais +25 (Restam {groupItems.length - (visibleCounts[group.id] || 25)})
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Column Footer */}
              <div className={`p-2.5 border-t text-[10px] flex justify-between items-center font-medium ${
                isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-100/90 border-slate-200 text-slate-600'
              }`}>
                <span>Total na coluna</span>
                <span className={`font-bold font-mono ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                  {groupItems.length} ({groupPercentage}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

