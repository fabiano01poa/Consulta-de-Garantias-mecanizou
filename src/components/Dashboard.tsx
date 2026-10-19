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
import { isItemUrgent, OFFICIAL_WARRANTY_STATUSES } from '../utils/statusUtils';
import { parseDateString, isDateInRange, calculateDaysSinceDeparture, calculateDaysInStock, getDaysFromDate } from '../utils/dateUtils';
import { TimelineBar } from './TimelineBar';

interface DashboardProps {
  items: StockItem[];
  onSelectItem: (item: StockItem) => void;
  theme?: 'dark' | 'light';
}

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6'];

export const Dashboard: React.FC<DashboardProps> = ({ items, onSelectItem, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  // Base date field toggle: 'dataSaida' | 'dataRecebimento' | 'dataIncidencia'
  const [dateField, setDateField] = useState<'dataSaida' | 'dataRecebimento' | 'dataIncidencia'>('dataIncidencia');
  
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

  // 1. Filter items by date range using selected dateField (dataSaida, dataRecebimento or dataIncidencia)
  const dateFilteredItems = useMemo(() => {
    return items.filter(item => {
      const dateVal = 
        dateField === 'dataSaida' 
          ? item.dataSaida 
          : dateField === 'dataRecebimento' 
          ? item.dataRecebimento 
          : item.dataIncidencia;
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

  // Unique list of all statuses present in items + official warranty statuses
  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    OFFICIAL_WARRANTY_STATUSES.forEach(st => set.add(st));
    items.forEach(i => {
      if (i.statusDevolucao && i.statusDevolucao.trim()) {
        set.add(i.statusDevolucao.trim());
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // 3. Top Most Delayed Items (filtered by status & date range, ordered by oldest first)
  const top20Delayed = useMemo(() => {
    let list = dateFilteredItems;

    // Filter by selected status or urgent
    if (selectedStatusFilter === 'urgente') {
      list = list.filter(item => isItemUrgent(item));
    } else if (selectedStatusFilter !== 'all') {
      list = list.filter(item => (item.statusDevolucao?.trim() || '') === selectedStatusFilter);
    }

    return list
      .map(item => {
        const departureDays = getDaysFromDate(item.dataSaida);
        const stockDays = getDaysFromDate(item.dataRecebimento);
        const purchaseDays = getDaysFromDate(item.dataCompra);
        const requestDays = getDaysFromDate(item.dataSolicitacao);

        const primaryDays = Math.max(
          departureDays ?? -999,
          stockDays ?? -999,
          purchaseDays ?? -999,
          requestDays ?? -999
        );
        
        return {
          item,
          days: primaryDays < -900 ? 0 : primaryDays,
          departureDays,
          stockDays,
          daysDepartureInfo: calculateDaysSinceDeparture(item.dataSaida),
          daysStockInfo: calculateDaysInStock(item.dataRecebimento)
        };
      })
      .sort((a, b) => b.days - a.days)
      .slice(0, 50);
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
      <div className={`rounded-2xl p-5 sm:p-6 border shadow-xl backdrop-blur-sm transition-colors ${
        isDark 
          ? 'bg-slate-900/90 border-slate-800' 
          : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b ${
          isDark ? 'border-slate-800/80' : 'border-slate-100'
        }`}>
          <div>
            <div className="flex items-center space-x-2 text-indigo-500 font-bold uppercase text-xs tracking-wider mb-1">
              <BarChart3 className="w-4 h-4" />
              <span>Painel Geral de Devoluções & Estoque</span>
            </div>
            <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              Dashboard de Status e Indicadores
            </h2>
            <p className={`text-xs mt-0.5 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Análise comparativa filtrada por data de incidência, recebimento ou saída
            </p>
          </div>

          {/* Date Base Toggle Button */}
          <div className={`p-1 rounded-xl border flex flex-wrap items-center gap-1 self-start lg:self-auto ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <span className={`text-[11px] font-semibold px-2 uppercase ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>Filtrar por:</span>
            <button
              onClick={() => setDateField('dataIncidencia')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateField === 'dataIncidencia'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Data de Incidência
            </button>
            <button
              onClick={() => setDateField('dataRecebimento')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateField === 'dataRecebimento'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Data de Recebimento
            </button>
            <button
              onClick={() => setDateField('dataSaida')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dateField === 'dataSaida'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Data de Saída (Envio)
            </button>
          </div>
        </div>

        {/* Date Inputs & Quick Presets */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-5 grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1 flex items-center ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <Calendar className="w-3.5 h-3.5 mr-1 text-indigo-500" /> Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs outline-none transition-all ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 focus:border-indigo-500 text-slate-100'
                    : 'bg-slate-50 border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800'
                }`}
              />
            </div>
            <div>
              <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1 flex items-center ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <Calendar className="w-3.5 h-3.5 mr-1 text-indigo-500" /> Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 text-xs outline-none transition-all ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 focus:border-indigo-500 text-slate-100'
                    : 'bg-slate-50 border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-800'
                }`}
              />
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="md:col-span-7 flex flex-wrap items-center gap-1.5">
            <span className={`text-[11px] font-semibold mr-1 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>Atalhos:</span>
            <button
              onClick={() => setQuickRange('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                !startDate && !endDate
                  ? isDark
                    ? 'bg-indigo-950 text-indigo-300 border-indigo-700'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold'
                  : isDark
                    ? 'bg-slate-800 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              Todas as Datas
            </button>
            <button
              onClick={() => setQuickRange('this_month')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => setQuickRange('last_30')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              Últimos 30 dias
            </button>
            <button
              onClick={() => setQuickRange('last_90')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              Últimos 90 dias
            </button>
            <button
              onClick={() => setQuickRange('this_year')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              Este Ano
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards per Status Devolução */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <ShieldCheck className="w-4 h-4 mr-2 text-indigo-500" />
            Contagem de Itens por Status Devolução ({dateFilteredItems.length} itens no período)
          </h3>
          <span className="text-xs text-slate-500">
            Base: <strong className={isDark ? 'text-slate-300' : 'text-slate-800'}>
              {dateField === 'dataIncidencia' 
                ? 'Data de Incidência' 
                : dateField === 'dataRecebimento' 
                ? 'Data de Recebimento' 
                : 'Data de Saída'}
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {statusSummary.map((st, idx) => (
            <div
              key={`${st.status}-${idx}`}
              className={`border rounded-xl p-3.5 transition-all shadow-sm group ${
                isDark
                  ? 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/50'
                  : 'bg-white border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div className={`text-[11px] font-semibold uppercase truncate mb-1 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {st.status}
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`text-2xl font-black transition-colors ${
                  isDark ? 'text-white group-hover:text-indigo-400' : 'text-slate-900 group-hover:text-indigo-600'
                }`}>
                  {st.count}
                </span>
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${
                  isDark
                    ? 'text-indigo-400 bg-indigo-950 border-indigo-900'
                    : 'text-indigo-700 bg-indigo-50 border-indigo-200'
                }`}>
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
        <div className={`lg:col-span-8 border rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className={`flex items-center justify-between mb-4 pb-3 border-b ${
            isDark ? 'border-slate-800' : 'border-slate-100'
          }`}>
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}>
                <BarChart3 className="w-4 h-4 mr-2 text-indigo-500" />
                Gráfico de Distribuição dos Status
              </h3>
              <p className={`text-xs mt-0.5 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Representação visual dos itens no período selecionado
              </p>
            </div>
            <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border ${
              isDark
                ? 'text-indigo-400 bg-indigo-950/80 border-indigo-800'
                : 'text-indigo-700 bg-indigo-50 border-indigo-200'
            }`}>
              {dateFilteredItems.length} Itens Totais
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#f1f5f9"} vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke={isDark ? "#94a3b8" : "#64748b"} 
                    fontSize={11} 
                    tickLine={false} 
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                      borderColor: isDark ? '#334155' : '#e2e8f0', 
                      borderRadius: '0.75rem', 
                      color: isDark ? '#f8fafc' : '#0f172a', 
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">Nenhum registro encontrado para este filtro de data.</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution Pie/List Breakdown */}
        <div className={`lg:col-span-4 border rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className={`flex items-center justify-between mb-4 pb-3 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <h3 className={`text-sm font-bold uppercase tracking-wider flex items-center ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}>
                <TrendingUp className="w-4 h-4 mr-2 text-indigo-500" />
                Proporção por Status
              </h3>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {statusSummary.map((st, idx) => (
                <div key={`${st.status}-${idx}`} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className={`truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{st.status}</span>
                    <span className={`font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{st.count} ({st.percentage}%)</span>
                  </div>
                  <div className={`w-full h-2 rounded-full overflow-hidden border ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}>
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

          <div className={`mt-4 pt-3 border-t text-[11px] flex items-center justify-between ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-600'
          }`}>
            <span>Filtro de data ativo</span>
            <span className="text-indigo-500 font-bold">{dateFilteredItems.length} devoluções</span>
          </div>
        </div>
      </div>

      {/* Two Columns: 20 Items Most Delayed & Ranking of Mecânicas (Equalized size) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Table 1: Top Most Delayed Items with Timeline and Status Filter */}
        <div className={`lg:col-span-6 border rounded-2xl p-5 shadow-2xl flex flex-col justify-between transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <div className="flex items-center space-x-2">
                <div className={`p-1.5 rounded-lg border ${
                  isDark ? 'bg-amber-950 text-amber-400 border-amber-800' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    Itens Mais Antigos / Atrasados
                  </h3>
                  <p className={`text-xs mt-0.5 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
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
                  className={`border text-xs rounded-xl px-2.5 py-1.5 outline-none font-semibold transition-all ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 focus:border-indigo-500 text-slate-200'
                      : 'bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-800'
                  }`}
                >
                  <option value="all">Todos os Status ({dateFilteredItems.length})</option>
                  <option value="urgente">🔥 Apenas Urgentes</option>
                  {availableStatuses.map((st, idx) => (
                    <option key={`opt-st-${st}-${idx}`} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {top20Delayed.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/80 mb-2" />
                <p className="text-xs">Nenhum item encontrado com o filtro selecionado.</p>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto overflow-x-auto pr-1 custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`border-b text-[10px] font-bold uppercase sticky top-0 z-10 ${
                      isDark ? 'border-slate-800 text-slate-400 bg-slate-900' : 'border-slate-200 text-slate-600 bg-slate-50'
                    }`}>
                      <th className="py-2.5 px-2">Protocolo</th>
                      <th className="py-2.5 px-2">ID STOCK</th>
                      <th className="py-2.5 px-2">Cliente / Peça</th>
                      <th className="py-2.5 px-2">Dias</th>
                      <th className="py-2.5 px-2">Status</th>
                      <th className="py-2.5 px-2 text-right">Ver</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                    {top20Delayed.map(({ item, days }, idx) => (
                      <tr 
                        key={`${item.idStock || 'item'}-${idx}`} 
                        onClick={() => onSelectItem(item)}
                        className={`cursor-pointer transition-colors group ${
                          isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className={`py-2.5 px-2 font-mono font-bold whitespace-nowrap ${
                          isDark ? 'text-amber-400' : 'text-amber-700'
                        }`}>
                          {item.protocolo || '—'}
                        </td>
                        <td className={`py-2.5 px-2 font-mono font-bold whitespace-nowrap ${
                          isDark ? 'text-indigo-400' : 'text-indigo-600'
                        }`}>
                          {item.idStock}
                        </td>
                        <td className="py-2.5 px-2 max-w-[130px]">
                          <div className={`font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{item.cliente}</div>
                          <div className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.descricao}</div>
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap">
                          <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded border ${
                            days > 90 
                              ? isDark ? 'bg-red-950 text-red-300 border-red-800' : 'bg-red-50 text-red-800 border-red-200'
                              : days > 60 
                              ? isDark ? 'bg-rose-950 text-rose-300 border-rose-800' : 'bg-rose-50 text-rose-800 border-rose-200'
                              : days > 30 
                              ? isDark ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-800 border-amber-200'
                              : isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}>
                            {days} dias
                          </span>
                        </td>
                        <td className="py-2.5 px-2 whitespace-nowrap max-w-[120px]">
                          <span className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold truncate rounded border ${
                            isDark ? 'bg-indigo-950 text-indigo-300 border-indigo-800/80' : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          }`}>
                            {item.statusDevolucao || 'Pendente'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right whitespace-nowrap">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectItem(item);
                            }}
                            className={`p-1 rounded transition-colors ${
                              isDark ? 'text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                            }`}
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
        <div className={`lg:col-span-6 border rounded-2xl p-5 shadow-2xl flex flex-col justify-between transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className={`flex items-center justify-between mb-4 pb-3 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <div className="flex items-center space-x-2">
                <div className={`p-1.5 rounded-lg border ${
                  isDark ? 'bg-indigo-950 text-indigo-400 border-indigo-800' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    Mecânicas com Mais Devoluções
                  </h3>
                  <p className={`text-xs mt-0.5 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Ranking filtrado por {dateField === 'dataSaida' ? 'Data de Saída' : 'Data de Recebimento'}
                  </p>
                </div>
              </div>
            </div>

            {topClients.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <p className="text-xs">Nenhuma mecânica registrada com devoluções no período.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {topClients.map((client, rank) => (
                  <div 
                    key={`${client.cliente || 'client'}-${rank}`}
                    className={`p-3 border rounded-xl transition-all flex items-center justify-between gap-3 ${
                      isDark 
                        ? 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700' 
                        : 'bg-slate-50/80 border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        rank === 0 
                          ? 'bg-amber-500 text-slate-950' 
                          : rank === 1 
                          ? 'bg-slate-300 text-slate-950' 
                          : rank === 2 
                          ? 'bg-amber-700 text-white' 
                          : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
                      }`}>
                        #{rank + 1}
                      </span>
                      <div className="min-w-0">
                        <div className={`text-xs font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                          {client.cliente}
                        </div>
                        <div className={`w-28 sm:w-40 h-1.5 rounded-full overflow-hidden mt-1 border ${
                          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200 border-slate-300'
                        }`}>
                          <div 
                            className="bg-indigo-500 h-full rounded-full" 
                            style={{ width: `${client.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-sm font-bold font-mono ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
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
        <div className={`lg:col-span-6 border rounded-2xl p-5 shadow-2xl flex flex-col justify-between transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className={`flex items-center justify-between mb-4 pb-3 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <div className="flex items-center space-x-2">
                <div className={`p-1.5 rounded-lg border ${
                  isDark ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    Top 10 Códigos Mais Recebidos (Garantia)
                  </h3>
                  <p className={`text-xs mt-0.5 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Códigos/Peças com maior frequência de garantia no período
                  </p>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${
                isDark ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                Top 10
              </span>
            </div>

            {top10Codes.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <p className="text-xs">Nenhum código registrado no período selecionado.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {top10Codes.map((item, rank) => (
                  <div 
                    key={`${item.code}-${rank}`}
                    className={`p-3 border rounded-xl transition-all flex items-center justify-between gap-3 ${
                      isDark 
                        ? 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700' 
                        : 'bg-slate-50/80 border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        rank === 0 
                          ? 'bg-emerald-500 text-slate-950' 
                          : rank === 1 
                          ? 'bg-emerald-600 text-white' 
                          : rank === 2 
                          ? 'bg-emerald-700 text-white' 
                          : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
                      }`}>
                        #{rank + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                            isDark ? 'text-emerald-300 bg-emerald-950/80 border-emerald-800/80' : 'text-emerald-800 bg-emerald-100/70 border-emerald-200'
                          }`}>
                            {item.code}
                          </span>
                          <span className={`text-[10px] font-medium truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {item.brand}
                          </span>
                        </div>
                        <div className={`text-xs font-semibold truncate mt-1 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                          {item.sampleDesc}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-sm font-bold font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
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
        <div className={`lg:col-span-6 border rounded-2xl p-5 shadow-2xl flex flex-col justify-between transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <div className={`flex items-center justify-between mb-4 pb-3 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <div className="flex items-center space-x-2">
                <div className={`p-1.5 rounded-lg border ${
                  isDark ? 'bg-indigo-950 text-indigo-400 border-indigo-800' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    Top 20 Marcas Mais Recebidas (Garantia)
                  </h3>
                  <p className={`text-xs mt-0.5 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Fabricantes / Marcas com maior volume de peças em garantia
                  </p>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${
                isDark ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80' : 'bg-indigo-50 text-indigo-800 border-indigo-200'
              }`}>
                Top 20
              </span>
            </div>

            {top20Brands.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <p className="text-xs">Nenhum marca registrada no período selecionado.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {top20Brands.map((brandItem, rank) => (
                  <div 
                    key={`${brandItem.brand}-${rank}`}
                    className={`p-3 border rounded-xl transition-all flex items-center justify-between gap-3 ${
                      isDark 
                        ? 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700' 
                        : 'bg-slate-50/80 border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        rank === 0 
                          ? 'bg-amber-500 text-slate-950' 
                          : rank === 1 
                          ? 'bg-slate-300 text-slate-950' 
                          : rank === 2 
                          ? 'bg-amber-700 text-white' 
                          : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
                      }`}>
                        #{rank + 1}
                      </span>
                      <div className="min-w-0">
                        <div className={`text-xs font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                          {brandItem.brand}
                        </div>
                        <div className={`w-28 sm:w-40 h-1.5 rounded-full overflow-hidden mt-1 border ${
                          isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200 border-slate-300'
                        }`}>
                          <div 
                            className="bg-indigo-500 h-full rounded-full" 
                            style={{ width: `${brandItem.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-sm font-bold font-mono ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
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
