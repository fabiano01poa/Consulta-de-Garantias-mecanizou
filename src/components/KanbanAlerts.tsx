import React, { useState, useMemo } from 'react';
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
  Boxes
} from 'lucide-react';
import { StockItem } from '../types';
import { getDaysFromDate } from '../utils/dateUtils';
import { TimelineBar } from './TimelineBar';

interface KanbanAlertsProps {
  items: StockItem[];
  onSelectItem: (item: StockItem) => void;
}

type KanbanFlow = 'enviadas' | 'recebidas';

interface AgeGroup {
  id: '0-30' | '30-60' | '60-90' | '90+';
  title: string;
  subTitle: string;
  minDays: number;
  maxDays: number;
  headerBg: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
  iconColor: string;
}

const AGE_GROUPS: AgeGroup[] = [
  {
    id: '0-30',
    title: '0 a 30 dias',
    subTitle: 'Dentro do prazo normal',
    minDays: 0,
    maxDays: 30,
    headerBg: 'bg-emerald-950/70',
    borderColor: 'border-emerald-800/80',
    textColor: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-700/60',
    iconColor: 'text-emerald-400'
  },
  {
    id: '30-60',
    title: '30 a 60 dias',
    subTitle: 'Requer atenção',
    minDays: 31,
    maxDays: 60,
    headerBg: 'bg-amber-950/70',
    borderColor: 'border-amber-800/80',
    textColor: 'text-amber-300',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-700/60',
    iconColor: 'text-amber-400'
  },
  {
    id: '60-90',
    title: '60 a 90 dias',
    subTitle: 'Item atrasado',
    minDays: 61,
    maxDays: 90,
    headerBg: 'bg-rose-950/80',
    borderColor: 'border-rose-800/80',
    textColor: 'text-rose-300',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-700/60',
    iconColor: 'text-rose-400'
  },
  {
    id: '90+',
    title: 'Acima de 90 dias',
    subTitle: 'Nível crítico',
    minDays: 91,
    maxDays: Infinity,
    headerBg: 'bg-red-950/90',
    borderColor: 'border-red-800/90',
    textColor: 'text-red-200',
    badgeBg: 'bg-red-600/30 text-red-200 border-red-700',
    iconColor: 'text-red-400'
  }
];

export const KanbanAlerts: React.FC<KanbanAlertsProps> = ({ items, onSelectItem }) => {
  const [flow, setFlow] = useState<KanbanFlow>('enviadas');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

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

  // Process items and add calculated days based on active flow
  const processedItems = useMemo(() => {
    return items
      .map(item => {
        const dateStr = flow === 'enviadas' ? item.dataSaida : item.dataRecebimento;
        const days = getDaysFromDate(dateStr);
        return {
          item,
          days,
          dateStr
        };
      })
      .filter(({ item, days }) => {
        // Filter out items without valid days
        if (days === null || isNaN(days) || days < 0) return false;

        // Apply status filter
        if (selectedStatus !== 'all' && (item.statusDevolucao?.trim() || '') !== selectedStatus) {
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
            ${item.statusDevolucao}
          `.toLowerCase();
          if (!text.includes(term)) return false;
        }

        return true;
      });
  }, [items, flow, selectedStatus, searchTerm]);

  // Group items into the 4 age columns
  const columns = useMemo(() => {
    const map: Record<string, typeof processedItems> = {
      '0-30': [],
      '30-60': [],
      '60-90': [],
      '90+': []
    };

    processedItems.forEach(entry => {
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 font-bold uppercase text-xs tracking-wider mb-1">
              <Kanban className="w-4 h-4" />
              <span>Gestão de Prazos & Alertas Kanban</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Quadro de Acompanhamento por Prazos
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Organização automática de itens por faixas de idade (0, 30, 60, 90+ dias)
            </p>
          </div>

          {/* Flow Selector Tabs */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1 self-start md:self-auto">
            <button
              onClick={() => setFlow('enviadas')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                flow === 'enviadas'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Enviadas / Saída (Hoje - Data Saída)</span>
            </button>
            <button
              onClick={() => setFlow('recebidas')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                flow === 'recebidas'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              <span>Recebidas em Estoque (Hoje - Data Recebimento)</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-7 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar no Kanban por ID Stock, Cliente, Código, Peça ou Marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500"
            />
          </div>

          <div className="md:col-span-5 flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-slate-200 rounded-xl px-3 py-2 outline-none font-semibold"
            >
              <option value="all">Filtrar por Status ({items.length} itens)</option>
              {statusList.map((st, idx) => (
                <option key={`kanban-st-${st}-${idx}`} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Grid Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {AGE_GROUPS.map(group => {
          const groupItems = columns[group.id] || [];
          const groupPercentage = totalValid > 0 ? ((groupItems.length / totalValid) * 100).toFixed(0) : '0';

          return (
            <div 
              key={group.id}
              className="bg-slate-900/80 border border-slate-800/80 rounded-2xl flex flex-col max-h-[800px] shadow-xl overflow-hidden"
            >
              {/* Column Header */}
              <div className={`p-4 border-b ${group.headerBg} ${group.borderColor} flex items-center justify-between`}>
                <div className="flex items-center space-x-2">
                  <Clock className={`w-4 h-4 ${group.iconColor}`} />
                  <div>
                    <h3 className={`text-sm font-black tracking-tight ${group.textColor}`}>
                      {group.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {group.subTitle}
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${group.badgeBg}`}>
                  {groupItems.length}
                </span>
              </div>

              {/* Column Body Cards List */}
              <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar min-h-[250px]">
                {groupItems.length === 0 ? (
                  <div className="py-12 text-center text-slate-600 border border-dashed border-slate-800/80 rounded-xl">
                    <CheckCircle2 className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <p className="text-xs font-semibold">Nenhum item nesta faixa</p>
                  </div>
                ) : (
                  groupItems.map(({ item, days, dateStr }, cardIdx) => (
                    <div
                      key={`${item.idStock || 'card'}-${cardIdx}`}
                      onClick={() => onSelectItem(item)}
                      className="bg-slate-950 hover:bg-slate-900/90 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-3.5 shadow-md cursor-pointer transition-all hover:scale-[1.01] group space-y-2.5"
                    >
                      {/* Top Row: ID Stock & Days Badge */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-indigo-400 text-xs bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/80">
                          {item.idStock}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${group.badgeBg}`}>
                          {days} {days === 1 ? 'dia' : 'dias'}
                        </span>
                      </div>

                      {/* Cliente */}
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center">
                          <Building2 className="w-3 h-3 mr-1 text-slate-400" /> Cliente / Oficina
                        </div>
                        <div className="text-xs font-bold text-slate-100 truncate mt-0.5">
                          {item.cliente || 'Não Informado'}
                        </div>
                      </div>

                      {/* Description & Code */}
                      <div>
                        <div className="text-xs font-semibold text-slate-300 line-clamp-2">
                          {item.descricao || 'Peça sem descrição'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                          <span>Cód: <strong className="text-slate-200">{item.codigo || '—'}</strong></span>
                          <span>Marca: <strong className="text-slate-200">{item.marca || '—'}</strong></span>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-900 text-indigo-300 rounded border border-slate-800 max-w-[170px] truncate">
                          {item.statusDevolucao || 'Pendente'}
                        </span>
                        <button 
                          className="p-1 text-slate-500 group-hover:text-white transition-colors"
                          title="Abrir Ficha"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Timeline Bar Mini */}
                      <TimelineBar days={days} compact={true} />
                    </div>
                  ))
                )}
              </div>

              {/* Column Footer */}
              <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between items-center font-medium">
                <span>Total nesta faixa</span>
                <span className="font-bold text-slate-200 font-mono">
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
