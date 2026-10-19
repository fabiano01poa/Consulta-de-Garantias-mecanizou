import React from 'react';
import { Package, Users, Repeat, Truck, ShieldAlert } from 'lucide-react';
import { StockItem } from '../types';

interface StatsOverviewProps {
  items: StockItem[];
  theme?: 'dark' | 'light';
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ items, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const totalStockItems = items.length;

  const totalStockQty = items.reduce((acc, item) => {
    const qty = parseInt(item.quantEstoque) || 0;
    return acc + qty;
  }, 0);

  const uniqueClients = new Set(items.map(i => i.cliente).filter(Boolean)).size;
  const urgentGarantias = items.filter(i => 
    i.urgente ||
    i.statusDevolucao.toLowerCase().includes('urgente') ||
    i.statusDevolucao.toLowerCase().includes('pendente') ||
    i.statusDevolucao.toLowerCase().includes('análise') ||
    i.statusDevolucao.toLowerCase().includes('analise')
  ).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
      <div className={`border rounded-xl p-3.5 sm:p-4 transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800/90' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Total Garantias
          </span>
          <Package className="w-4 h-4 text-indigo-500" />
        </div>
        <div className={`text-xl sm:text-2xl font-bold mt-1 ${
          isDark ? 'text-slate-100' : 'text-slate-900'
        }`}>
          {totalStockItems}
        </div>
        <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Garantias registradas</span>
      </div>

      <div className={`border rounded-xl p-3.5 sm:p-4 transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800/90' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Quant. Estoque
          </span>
          <Package className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
        </div>
        <div className={`text-xl sm:text-2xl font-bold mt-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
          {totalStockQty}
        </div>
        <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Unidades em processo</span>
      </div>

      <div className={`border rounded-xl p-3.5 sm:p-4 transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800/90' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Clientes
          </span>
          <Users className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
        </div>
        <div className={`text-xl sm:text-2xl font-bold mt-1 ${
          isDark ? 'text-slate-100' : 'text-slate-900'
        }`}>
          {uniqueClients}
        </div>
        <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Clientes ativos</span>
      </div>

      <div className={`border rounded-xl p-3.5 sm:p-4 transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800/90' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Urgentes / Pendentes
          </span>
          <ShieldAlert className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
        </div>
        <div className={`text-xl sm:text-2xl font-bold mt-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
          {urgentGarantias}
        </div>
        <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Atenção requerida</span>
      </div>
    </div>
  );
};
