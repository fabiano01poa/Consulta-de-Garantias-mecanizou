import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  BarChart3, 
  AlertTriangle, 
  TrendingUp, 
  User, 
  Clock, 
  ShieldCheck, 
  Package, 
  Eye, 
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Boxes,
  Tag,
  Award
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';
import { StockItem } from '../types';
import { parseDateString, isDateInRange, calculateDaysSinceDeparture, calculateDaysInStock, getDaysFromDate } from '../utils/dateUtils';
import { TimelineBar } from './TimelineBar';

interface DashboardProps {
  items: StockItem[];
  onSelectItem: (item: StockItem) => void;
}

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6'];

export const Dashboard: React.FC<DashboardProps> = ({ items, onSelectItem }) => {
  // Base date field toggle: 'dataSaida' | 'dataRecebimento'
  const [dateField, setDateField] = useState<'dataSaida' | 'dataRecebimento'>('dataSaida');
  
  // Date range state (YYYY-MM-DD for standard html date inputs)
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Preset Date Helper
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

  // 1. Filter items by date range using selected dateField (dataSaida or dataRecebimento)
  const dateFilteredItems = useMemo(() => {
    return items.filter(item => {
      const dateVal = dateField === 'dataSaida' ? item.dataSaida : item.dataRecebimento;
      return isDateInRange(dateVal, startDate, endDate);
    });
  }, [items, dateField, startDate, endDate]);

  // 2. Group by Status Devolução
  const statusSummary = useMemo(() => {
    const map: Record<string, number> = {};
    dateFilteredItems.forEach(item => {
      const st = item.statusDevolucao?.trim() || 'Não Definido';
      map[st] = (map[st] || 0) + 1;
    });

    return Object.entries(map)
      .map(([status, count]) => ({
        status,
        count,
        percentage: dateFilteredItems.length > 0 
          ? ((count / dateFilteredItems.length) * 100).toFixed(1) 
          : '0'
      }))
      .sort((a, b) => b.count - a.count);
  }, [dateFilteredItems]);

  // Chart data
  const chartData = useMemo(() => {
    return statusSummary.map((item, index) => ({
      name: item.status,
      value: item.count,
      color: COLORS[index % COLORS.length]
    }));
  }, [statusSummary]);

  // Unique list of statuses present in current date-filtered items
  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    dateFilteredItems.forEach(i => {
      if (i.statusDevolucao) set.add(i.statusDevolucao.trim());
    });
    return Array.from(set).sort();
  }, [dateFilteredItems]);

  // 3. Top Most Delayed Items (filtered by status & date range, ordered by oldest first)
  const top20Delayed = useMemo(() => {
    let list = dateFilteredItems;

    // Filter by selected status if specific status selected
    if (selectedStatusFilter !== 'all') {
      list = list.filter(item => (item.statusDevolucao?.trim() || '') === selectedStatusFilter);
    }

    return list
      .map(item => {
        const departureDays = getDaysFromDate(item.dataSaida);
        const stockDays = getDaysFromDate(item.dataRecebimento);
        const primaryDays = dateField === 'dataSaida' ? (departureDays ?? stockDays ?? 0) : (stockDays ?? departureDays ?? 0);
        
        return {
          item,
          days: primaryDays,
          departureDays,
          stockDays,
          daysDepartureInfo: calculateDaysSinceDeparture(item.dataSaida),
          daysStockInfo: calculateDaysInStock(item.dataRecebimento)
        };
      })
      .sort((a, b) => b.days - a.days)
      .slice(0, 25);
  }, [dateFilteredItems, selectedStatusFilter, dateField]);

  // 4. Ranking of Mecânicas / Clientes with most devoluções based on date filter
  const topClients = useMemo(() => {
    const map: Record<string, { count: number; items: StockItem[] }> = {};
    dateFilteredItems.forEach(item => {
      const clientName = item.cliente?.trim() || 'Cliente Não Informado';
      if (!map[clientName]) {
        map[clientName] = { count: 0, items: [] };
      }
      map[clientName].count += 1;
      map[clientName].items.push(item);
    });

    const total = dateFilteredItems.length;

    return Object.entries(map)
      .map(([cliente, data]) => ({
        cliente,
        count: data.count,
        percentage: total > 0 ? ((data.count / total) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15); // Top 15 mecanicas
  }, [dateFilteredItems]);

  // 5. Top 10 Códigos / Peças mais recebidos em Garantia
  const top10Codes = useMemo(() => {
    const map: Record<string, { code: string; sampleDesc: string; brand: string; count: number; totalQty: number }> = {};
    dateFilteredItems.forEach(item => {
      const codeKey = (item.codigo?.trim() || item.descricao?.trim() || 'Sem Código').toUpperCase();
      if (!map[codeKey]) {
        map[codeKey] = {
          code: item.codigo?.trim() || 'S/ CÓDIGO',
          sampleDesc: item.descricao?.trim() || 'Descrição Não Informada',
          brand: item.marca?.trim() || '—',
          count: 0,
          totalQty: 0
        };
      }
      const qty = parseInt(item.quantEstoque || '1', 10);
      map[codeKey].count += 1;
      map[codeKey].totalQty += isNaN(qty) || qty <= 0 ? 1 : qty;
    });

    const total = dateFilteredItems.length;

    return Object.values(map)
      .map(entry => ({
        ...entry,
        percentage: total > 0 ? ((entry.count / total) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [dateFilteredItems]);

  // 6. Top 20 Marcas mais recebidas de Garantia
  const top20Brands = useMemo(() => {
    const map: Record<string, { brand: string; count: number; totalQty: number }> = {};
    dateFilteredItems.forEach(item => {
      const brandKey = item.marca?.trim() || 'Marca Não Informada';
      if (!map[brandKey]) {
        map[brandKey] = {
          brand: brandKey,
          count: 0,
          totalQty: 0
        };
      }
      const qty = parseInt(item.quantEstoque || '1', 10);
      map[brandKey].count += 1;
      map[brandKey].totalQty += isNaN(qty) || qty <= 0 ? 1 : qty;
    });

    const total = dateFilteredItems.length;

    return Object.values(map)
      .map(entry => ({
        ...entry,
        percentage: total > 0 ? ((entry.count / total) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [dateFilteredItems]);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Top Header & Date Filter Panel */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 font-bold uppercase text-xs tracking-wider mb-1">
              <BarChart3 className="w-4 h-4" />
              <span>Painel Geral de Devoluções & Estoque</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Dashboard de Status e Indicadores
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Análise comparativa filtrada por data de envio ou recebimento
            </p>
          </div>

          {/* Date Base Toggle Button */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1 self-start lg:self-auto">
            <span className="text-[11px] text-slate-400 font-semibold px-2 uppercase">Filtrar por:</span>
            <button
              onClick={() => setDateField('dataSaida')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateField === 'dataSaida'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Data de Saída (Envio)
            </button>
            <button
              onClick={() => setDateField('dataRecebimento')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateField === 'dataRecebimento'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Data de Recebimento
            </button>
          </div>
        </div>

        {/* Date Inputs & Quick Presets */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-5 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none"
              />
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="md:col-span-7 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-semibold mr-1">Atalhos:</span>
            <button
              onClick={() => setQuickRange('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                !startDate && !endDate
                  ? 'bg-indigo-950 text-indigo-300 border-indigo-700'
                  : 'bg-slate-800 text-slate-300 border-slate-700/80 hover:bg-slate-700'
              }`}
            >
              Todas as Datas
            </button>
            <button
              onClick={() => setQuickRange('this_month')}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/80 hover:bg-slate-700 transition-colors"
            >
              Este Mês
            </button>
            <button
              onClick={() => setQuickRange('last_30')}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/80 hover:bg-slate-700 transition-colors"
            >
              Últimos 30 dias
            </button>
            <button
              onClick={() => setQuickRange('last_90')}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/80 hover:bg-slate-700 transition-colors"
            >
              Últimos 90 dias
            </button>
            <button
              onClick={() => setQuickRange('this_year')}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/80 hover:bg-slate-700 transition-colors"
            >
              Este Ano
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards per Status Devolução */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
            <ShieldCheck className="w-4 h-4 mr-2 text-indigo-400" />
            Contagem de Itens por Status Devolução ({dateFilteredItems.length} itens no período)
          </h3>
          <span className="text-xs text-slate-500">
            Base: <strong className="text-slate-300">{dateField === 'dataSaida' ? 'Data de Saída' : 'Data de Recebimento'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {statusSummary.map((st, idx) => (
            <div
              key={`${st.status}-${idx}`}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 hover:border-indigo-500/50 transition-all shadow-md group"
            >
              <div className="text-[11px] text-slate-400 font-semibold uppercase truncate mb-1">
                {st.status}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors">
                  {st.count}
                </span>
                <span className="text-[11px] font-bold text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-900">
                  {st.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Visuals Row: Chart & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recharts Bar Chart showing Status Distribution */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center">
                <BarChart3 className="w-4 h-4 mr-2 text-indigo-400" />
                Gráfico de Distribuição dos Status
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Representação visual dos itens no período selecionado
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-md border border-indigo-800">
              {dateFilteredItems.length} Itens Totais
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#f8fafc', fontSize: '12px' }}
                    cursor={{ fill: '#1e293b' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <AlertTriangle className="w-8 h-8 mb-2 text-slate-600" />
                <p className="text-xs">Nenhum registro encontrado para este filtro de data.</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution Pie/List Breakdown */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-indigo-400" />
                Proporção por Status
              </h3>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {statusSummary.map((st, idx) => (
                <div key={`${st.status}-${idx}`} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300 truncate">{st.status}</span>
                    <span className="text-slate-400 font-mono">{st.count} ({st.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${st.percentage}%`, 
                        backgroundColor: COLORS[idx % COLORS.length] 
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Filtro de data ativo</span>
            <span className="text-indigo-400 font-bold">{dateFilteredItems.length} devoluções</span>
          </div>
        </div>
      </div>

      {/* Two Columns: 20 Items Most Delayed & Ranking of Mecânicas (Equalized size) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Table 1: Top Most Delayed Items with Timeline and Status Filter */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-amber-950 text-amber-400 rounded-lg border border-amber-800">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Itens Mais Antigos / Atrasados
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Calculado por (Hoje - {dateField === 'dataSaida' ? 'Data Saída' : 'Data Recebimento'})
                  </p>
                </div>
              </div>

              {/* Status Filter Selector */}
              <div className="flex items-center space-x-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 focus:border-indigo-500 text-xs text-slate-200 rounded-xl px-2.5 py-1.5 outline-none font-semibold"
                >
                  <option value="all">Todos os Status ({dateFilteredItems.length})</option>
                  {availableStatuses.map((st, idx) => (
                    <option key={`opt-st-${st}-${idx}`} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {top20Delayed.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/80 mb-2" />
                <p className="text-xs">Nenhum item encontrado com o filtro selecionado.</p>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto overflow-x-auto pr-1 custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] font-bold uppercase text-slate-400 sticky top-0 bg-slate-900 z-10">
                      <th className="py-2.5 px-2">ID STOCK</th>
                      <th className="py-2.5 px-2">Cliente / Peça</th>
                      <th className="py-2.5 px-2">Dias</th>
                      <th className="py-2.5 px-2">Status</th>
                      <th className="py-2.5 px-2 text-right">Ver</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {top20Delayed.map(({ item, days }, idx) => (
                      <tr 
                        key={`${item.idStock || 'item'}-${idx}`} 
                        onClick={() => onSelectItem(item)}
                        className="hover:bg-slate-800/60 cursor-pointer transition-colors group"
                      >
                        <td className="py-2.5 px-2 font-mono font-bold text-indigo-400 whitespace-nowrap">
                          {item.idStock}
                        </td>
                        <td className="py-2.5 px-2 max-w-[130px]">
                          <div className="font-semibold text-slate-200 truncate">{item.cliente}</div>
                          <div className="text-[10px] text-slate-400 truncate">{item.descricao}</div>
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap">
                          <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded ${
                            days > 90 
                              ? 'bg-red-950 text-red-300 border border-red-800' 
                              : days > 60 
                              ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                              : days > 30 
                              ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}>
                            {days} dias
                          </span>
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap max-w-[120px]">
                          <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold truncate rounded bg-indigo-950 text-indigo-300 border border-indigo-800/80">
                            {item.statusDevolucao || 'Pendente'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right whitespace-nowrap">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectItem(item);
                            }}
                            className="p-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                            title="Ver Ficha"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Table 2: Ranking of Mecânicas / Clientes with most devoluções */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-950 text-indigo-400 rounded-lg border border-indigo-800">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Mecânicas com Mais Devoluções
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ranking filtrado por {dateField === 'dataSaida' ? 'Data de Saída' : 'Data de Recebimento'}
                  </p>
                </div>
              </div>
            </div>

            {topClients.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <p className="text-xs">Nenhuma mecânica registrada com devoluções no período.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {topClients.map((client, rank) => (
                  <div 
                    key={`${client.cliente || 'client'}-${rank}`}
                    className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        rank === 0 
                          ? 'bg-amber-500 text-slate-950' 
                          : rank === 1 
                          ? 'bg-slate-300 text-slate-950' 
                          : rank === 2 
                          ? 'bg-amber-700 text-white' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        #{rank + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 truncate">
                          {client.cliente}
                        </div>
                        <div className="w-28 sm:w-40 bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-800">
                          <div 
                            className="bg-indigo-500 h-full rounded-full" 
                            style={{ width: `${client.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-indigo-400 font-mono">
                        {client.count} {client.count === 1 ? 'devolução' : 'devoluções'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {client.percentage}% do total
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Row 3: Top 10 Códigos em Garantia & Top 20 Marcas em Garantia */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Table 3: Top 10 Códigos mais recebidos em Garantia */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-800">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Top 10 Códigos Mais Recebidos (Garantia)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Códigos/Peças com maior frequência de garantia no período
                  </p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 bg-emerald-950/80 text-emerald-300 rounded-full border border-emerald-800/80 font-semibold">
                Top 10
              </span>
            </div>

            {top10Codes.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <p className="text-xs">Nenhum código registrado no período selecionado.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {top10Codes.map((item, rank) => (
                  <div 
                    key={`${item.code}-${rank}`}
                    className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        rank === 0 
                          ? 'bg-emerald-500 text-slate-950' 
                          : rank === 1 
                          ? 'bg-emerald-600 text-white' 
                          : rank === 2 
                          ? 'bg-emerald-700 text-white' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        #{rank + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
                            {item.code}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium truncate">
                            {item.brand}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-200 truncate mt-1">
                          {item.sampleDesc}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-emerald-400 font-mono">
                        {item.count} {item.count === 1 ? 'item' : 'itens'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Qtd total: {item.totalQty} | {item.percentage}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table 4: Top 20 Marcas mais recebidas de Garantia */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-950 text-indigo-400 rounded-lg border border-indigo-800">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Top 20 Marcas Mais Recebidas (Garantia)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Fabricantes / Marcas com maior volume de peças em garantia
                  </p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 bg-indigo-950/80 text-indigo-300 rounded-full border border-indigo-800/80 font-semibold">
                Top 20
              </span>
            </div>

            {top20Brands.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <p className="text-xs">Nenhuma marca registrada no período selecionado.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {top20Brands.map((brandItem, rank) => (
                  <div 
                    key={`${brandItem.brand}-${rank}`}
                    className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        rank === 0 
                          ? 'bg-amber-500 text-slate-950' 
                          : rank === 1 
                          ? 'bg-slate-300 text-slate-950' 
                          : rank === 2 
                          ? 'bg-amber-700 text-white' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        #{rank + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 truncate">
                          {brandItem.brand}
                        </div>
                        <div className="w-28 sm:w-40 bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-800">
                          <div 
                            className="bg-indigo-500 h-full rounded-full" 
                            style={{ width: `${brandItem.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-indigo-400 font-mono">
                        {brandItem.count} {brandItem.count === 1 ? 'peça' : 'peças'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {brandItem.percentage}% do volume total
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
