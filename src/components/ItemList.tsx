import React, { useState, useEffect } from 'react';
import { Package, ChevronRight, Eye, Calendar, Clock, Boxes, User, Tag, ChevronLeft, Flame } from 'lucide-react';
import { StockItem } from '../types';
import { calculateDaysSinceDeparture, getDaysFromDate } from '../utils/dateUtils';
import { isItemUrgent } from '../utils/statusUtils';
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
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Reset to page 1 if items list length changes
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

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

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, items.length);
  const currentItems = items.slice(startIndex, endIndex);

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl mb-8 backdrop-blur-sm">
      {/* Table Header Controls & Pagination Summary */}
      <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-2">
          <Boxes className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Tabela de Consulta ({items.length} itens no total)
          </h3>
        </div>

        <div className="flex items-center space-x-3 flex-wrap gap-2">
          <div className="flex items-center space-x-1 text-xs text-slate-400">
            <span>Exibir:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 outline-none font-medium"
            >
              <option value={20}>20 por pág.</option>
              <option value={50}>50 por pág.</option>
              <option value={100}>100 por pág.</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-mono">
              {startIndex + 1}-{endIndex} de {items.length}
            </span>
            <div className="flex items-center space-x-1">
              <button
                disabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg border border-slate-700/60 transition-colors"
                title="Página Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-300 font-bold px-1.5">
                {validCurrentPage} / {totalPages}
              </span>
              <button
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg border border-slate-700/60 transition-colors"
                title="Próxima Página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
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
            {currentItems.map((item, idx) => {
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
                    <div className="flex items-center space-x-1.5">
                      <span>{item.idStock || '—'}</span>
                      {isItemUrgent(item) && (
                        <span className="bg-red-950 text-red-300 border border-red-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse" title="Item Urgente">
                          <Flame className="w-3 h-3 text-red-400 fill-red-400" /> URGENTE
                        </span>
                      )}
                    </div>
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

      {/* Bottom Footer Pagination Bar */}
      <div className="px-5 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-400">
        <div>
          Mostrando <span className="font-bold text-slate-200">{startIndex + 1}</span> a <span className="font-bold text-slate-200">{endIndex}</span> de <span className="font-bold text-slate-200">{items.length}</span> registros
        </div>
        <div className="flex items-center space-x-2">
          <button
            disabled={validCurrentPage <= 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg border border-slate-700/60 font-semibold transition-colors flex items-center"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
          </button>
          <span className="font-bold text-slate-300 px-2">
            {validCurrentPage} / {totalPages}
          </span>
          <button
            disabled={validCurrentPage >= totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg border border-slate-700/60 font-semibold transition-colors flex items-center"
          >
            Próximo <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
