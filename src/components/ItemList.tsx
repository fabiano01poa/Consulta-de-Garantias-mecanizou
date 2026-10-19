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
  theme?: 'dark' | 'light';
}

export const ItemList: React.FC<ResultsTableProps> = ({
  items,
  selectedItem,
  onSelectItem,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Reset to page 1 if items list length changes
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className={`border rounded-2xl p-8 text-center my-6 ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <Package className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-50" />
        <h3 className={`text-base font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
          Nenhum item encontrado
        </h3>
        <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
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
    <div className={`border rounded-2xl overflow-hidden shadow-2xl mb-8 backdrop-blur-sm transition-colors ${
      isDark ? 'bg-slate-900/90 border-slate-800/90' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      {/* Table Header Controls & Pagination Summary */}
      <div className={`px-5 py-4 border-b flex items-center justify-between flex-wrap gap-3 ${
        isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center space-x-2">
          <Boxes className="w-4 h-4 text-indigo-500" />
          <h3 className={`text-xs font-bold uppercase tracking-wider ${
            isDark ? 'text-slate-300' : 'text-slate-800'
          }`}>
            Tabela de Consulta ({items.length} itens no total)
          </h3>
        </div>

        <div className="flex items-center space-x-3 flex-wrap gap-2">
          <div className={`flex items-center space-x-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <span>Exibir:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className={`border text-xs rounded-lg px-2 py-1 outline-none font-medium ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <option value={20}>20 por pág.</option>
              <option value={50}>50 por pág.</option>
              <option value={100}>100 por pág.</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {startIndex + 1}-{endIndex} de {items.length}
            </span>
            <div className="flex items-center space-x-1">
              <button
                disabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className={`p-1 disabled:opacity-40 rounded-lg border transition-colors ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/60'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="Página Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className={`text-xs font-bold px-1.5 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                {validCurrentPage} / {totalPages}
              </span>
              <button
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className={`p-1 disabled:opacity-40 rounded-lg border transition-colors ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/60'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
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
            <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
              isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-100/70 border-slate-200 text-slate-600'
            }`}>
              <th className="py-3.5 px-4">Protocolo</th>
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
          <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
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
                      ? isDark ? 'bg-indigo-950/50 border-l-4 border-indigo-500' : 'bg-indigo-50/70 border-l-4 border-indigo-500'
                      : isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* PROTOCOLO */}
                  <td className={`py-3.5 px-4 font-mono font-bold whitespace-nowrap ${
                    isDark ? 'text-amber-400' : 'text-amber-700'
                  }`}>
                    {item.protocolo || '—'}
                  </td>

                  {/* ID STOCK */}
                  <td className={`py-3.5 px-4 font-mono font-bold whitespace-nowrap ${
                    isDark ? 'text-indigo-400' : 'text-indigo-600'
                  }`}>
                    <div className="flex items-center space-x-1.5">
                      <span>{item.idStock || '—'}</span>
                      {isItemUrgent(item) && (
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border flex items-center gap-0.5 animate-pulse ${
                          isDark ? 'bg-red-950 text-red-300 border-red-700' : 'bg-red-50 text-red-700 border-red-300'
                        }`} title="Item Urgente">
                          <Flame className="w-3 h-3 text-red-500 fill-red-500" /> URGENTE
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Cliente */}
                  <td className={`py-3.5 px-4 font-semibold max-w-[160px] truncate ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}>
                    {item.cliente || '—'}
                  </td>

                  {/* Descrição & Marca */}
                  <td className="py-3.5 px-4 max-w-[260px]">
                    <div className={`font-bold uppercase truncate ${
                      isDark ? 'text-slate-100' : 'text-slate-900'
                    }`}>
                      {item.descricao || '—'}
                    </div>
                    <div className={`text-[11px] truncate mt-0.5 ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {item.marca} {item.codigo ? `(${item.codigo})` : ''}
                    </div>
                  </td>

                  {/* Quant. Estoque */}
                  <td className="py-3.5 px-4 font-bold whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded border font-mono ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-800'
                    }`}>
                      {item.quantEstoque || '0'}
                    </span>
                  </td>

                  {/* Data Recebimento */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {item.dataRecebimento ? (
                      <span className={`font-medium flex items-center ${
                        isDark ? 'text-emerald-300' : 'text-emerald-700'
                      }`}>
                        <Calendar className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                        {item.dataRecebimento}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Data Saída */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {item.dataSaida ? (
                      <span className={`font-medium flex items-center ${
                        isDark ? 'text-blue-300' : 'text-blue-700'
                      }`}>
                        <Calendar className="w-3.5 h-3.5 mr-1 text-blue-500" />
                        {item.dataSaida}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Linha do Tempo (0 - 30 - 60 - 90+) */}
                  <td className="py-3.5 px-4 whitespace-nowrap min-w-[170px]">
                    <div className="space-y-1">
                      <TimelineBar days={daysVal} compact={true} />
                      <div className={`text-[10px] flex items-center ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        <Clock className="w-2.5 h-2.5 mr-1 text-slate-400" />
                        {daysInfo.formattedText}
                      </div>
                    </div>
                  </td>

                  {/* Status Devolução */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className={`inline-block px-2.5 py-1 text-[11px] font-bold uppercase rounded border ${
                      isDark ? 'bg-indigo-950 text-indigo-300 border-indigo-800/80' : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    }`}>
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
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all active:scale-95"
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
      <div className={`px-5 py-3.5 border-t flex items-center justify-between flex-wrap gap-2 text-xs ${
        isDark ? 'bg-slate-950/90 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}>
        <div>
          Mostrando <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{startIndex + 1}</span> a <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{endIndex}</span> de <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{items.length}</span> registros
        </div>
        <div className="flex items-center space-x-2">
          <button
            disabled={validCurrentPage <= 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className={`px-3 py-1.5 disabled:opacity-40 rounded-lg border font-semibold transition-colors flex items-center ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/60'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
          </button>
          <span className={`font-bold px-2 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
            {validCurrentPage} / {totalPages}
          </span>
          <button
            disabled={validCurrentPage >= totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className={`px-3 py-1.5 disabled:opacity-40 rounded-lg border font-semibold transition-colors flex items-center ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/60'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            Próximo <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
