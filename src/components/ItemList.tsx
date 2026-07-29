import React from 'react';
import { Package, ChevronRight, Eye, Calendar, Clock, Boxes, User, Tag } from 'lucide-react';
import { StockItem } from '../types';
import { calculateDaysSinceDeparture, getDaysFromDate } from '../utils/dateUtils';
import { TimelineBar } from './TimelineBar';

interface ResultsTableProps {
  items: StockItem[];
  selectedItem: StockItem | null;
  onSelectItem: (item: StockItem) => void;
}

export const ItemList: React.FC<ResultsTableProps> = ({
  items,
  selectedItem,
  onSelectItem,
}) => {
  if (items.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center my-6">
        <Package className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <h3 className="text-base font-semibold text-slate-300">
          Nenhum item encontrado
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Tente ajustar os filtros de ID STOCK, Cliente ou termo de pesquisa acima.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl mb-8 backdrop-blur-sm">
      {/* Table Header Controls */}
      <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <Boxes className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Tabela de Consulta de Itens em Linha ({items.length})
          </h3>
        </div>
        <span className="text-[11px] text-indigo-400 font-medium bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-800/60 flex items-center">
          <Eye className="w-3.5 h-3.5 mr-1 text-indigo-300" />
          Clique em qualquer linha para abrir a ficha completa com todas as colunas
        </span>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[950px]">
          <thead>
            <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-4">ID STOCK</th>
              <th className="py-3.5 px-4">Cliente</th>
              <th className="py-3.5 px-4">Descrição do Item</th>
              <th className="py-3.5 px-4">Qtd.</th>
              <th className="py-3.5 px-4">Data Recebimento</th>
              <th className="py-3.5 px-4">Data Saída</th>
              <th className="py-3.5 px-4">Linha do Tempo (0 - 90+d)</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {items.map((item, idx) => {
              const daysInfo = calculateDaysSinceDeparture(item.dataSaida);
              const daysVal = getDaysFromDate(item.dataSaida) ?? getDaysFromDate(item.dataRecebimento);
              const isSelected = selectedItem?.idStock === item.idStock;

              return (
                <tr
                  key={`${item.idStock}-${idx}`}
                  onClick={() => onSelectItem(item)}
                  className={`group cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-indigo-950/50 border-l-4 border-indigo-500' 
                      : 'hover:bg-slate-800/60'
                  }`}
                >
                  {/* ID STOCK */}
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-400 whitespace-nowrap">
                    {item.idStock || '—'}
                  </td>

                  {/* Cliente */}
                  <td className="py-3.5 px-4 font-semibold text-slate-200 max-w-[160px] truncate">
                    {item.cliente || '—'}
                  </td>

                  {/* Descrição & Marca */}
                  <td className="py-3.5 px-4 max-w-[260px]">
                    <div className="font-bold text-slate-100 uppercase truncate">
                      {item.descricao || '—'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {item.marca} {item.codigo ? `(${item.codigo})` : ''}
                    </div>
                  </td>

                  {/* Quant. Estoque */}
                  <td className="py-3.5 px-4 font-bold text-slate-200 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono">
                      {item.quantEstoque || '0'}
                    </span>
                  </td>

                  {/* Data Recebimento */}
                  <td className="py-3.5 px-4 text-slate-300 font-medium whitespace-nowrap">
                    {item.dataRecebimento ? (
                      <span className="text-emerald-300 font-medium flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                        {item.dataRecebimento}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  {/* Data Saída */}
                  <td className="py-3.5 px-4 text-slate-300 font-medium whitespace-nowrap">
                    {item.dataSaida ? (
                      <span className="text-blue-300 font-medium flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-blue-400" />
                        {item.dataSaida}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  {/* Linha do Tempo (0 - 30 - 60 - 90+) */}
                  <td className="py-3.5 px-4 whitespace-nowrap min-w-[170px]">
                    <div className="space-y-1">
                      <TimelineBar days={daysVal} compact={true} />
                      <div className="text-[10px] text-slate-400 flex items-center">
                        <Clock className="w-2.5 h-2.5 mr-1 text-slate-400" />
                        {daysInfo.formattedText}
                      </div>
                    </div>
                  </td>

                  {/* Status Devolução */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="inline-block px-2.5 py-1 text-[11px] font-bold uppercase rounded bg-indigo-950 text-indigo-300 border border-indigo-800/80">
                      {item.statusDevolucao || 'Pendente'}
                    </span>
                  </td>

                  {/* Action Button */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectItem(item);
                      }}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 group-hover:bg-indigo-500 text-white shadow-md transition-all active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
