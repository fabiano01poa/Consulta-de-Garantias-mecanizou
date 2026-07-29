import React from 'react';
import { Package, Users, Repeat, Truck, ShieldAlert } from 'lucide-react';
import { StockItem } from '../types';

interface StatsOverviewProps {
  items: StockItem[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ items }) => {
  const totalStockItems = items.length;

  const totalStockQty = items.reduce((acc, item) => {
    const qty = parseInt(item.quantEstoque) || 0;
    return acc + qty;
  }, 0);

  const uniqueClients = new Set(items.map(i => i.cliente).filter(Boolean)).size;
  const pendingReturns = items.filter(i => 
    i.statusDevolucao.toLowerCase().includes('troca') || 
    i.statusDevolucao.toLowerCase().includes('pendente') ||
    i.statusDevolucao.toLowerCase().includes('solicitad')
  ).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5 sm:p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total de Itens
          </span>
          <Package className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-100 mt-1">
          {totalStockItems}
        </div>
        <span className="text-[10px] text-slate-500">Cadastrados na planilha</span>
      </div>

      <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5 sm:p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Quant. Estoque
          </span>
          <Package className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">
          {totalStockQty}
        </div>
        <span className="text-[10px] text-slate-500">Unidades disponíveis</span>
      </div>

      <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5 sm:p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Clientes
          </span>
          <Users className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-100 mt-1">
          {uniqueClients}
        </div>
        <span className="text-[10px] text-slate-500">Clientes ativos</span>
      </div>

      <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5 sm:p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Devoluções/Trocas
          </span>
          <Repeat className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-purple-400 mt-1">
          {pendingReturns}
        </div>
        <span className="text-[10px] text-slate-500">Solicitações registradas</span>
      </div>
    </div>
  );
};
