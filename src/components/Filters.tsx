import React from 'react';
import { Search, User, Hash, X, Filter, Sparkles, Flame } from 'lucide-react';
import { FilterState, StockItem } from '../types';

interface FiltersProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  clients: string[];
  stockIds: string[];
  itemsCount: number;
  totalItems: number;
  allItems: StockItem[];
  onSelectItemById: (idStock: string) => void;
  theme?: 'dark' | 'light';
}

export const Filters: React.FC<FiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  clients,
  stockIds,
  itemsCount,
  totalItems,
  onSelectItemById,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const isFiltered = filters.idStock !== '' || filters.cliente !== '' || filters.searchTerm !== '' || !!filters.apenasUrgentes;

  return (
    <div className={`rounded-2xl p-4 sm:p-5 border shadow-xl backdrop-blur-sm mb-6 transition-colors ${
      isDark ? 'bg-slate-900/80 border-slate-800/90' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div className={`flex items-center justify-between pb-3 mb-4 border-b flex-wrap gap-2 ${
        isDark ? 'border-slate-800/80' : 'border-slate-100'
      }`}>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-indigo-500" />
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}>
            Filtros de Pesquisa
          </h2>
        </div>
        <div className="flex items-center space-x-2.5 text-xs">
          {/* Urgent Toggle Button */}
          <button
            onClick={() => onFilterChange({ apenasUrgentes: !filters.apenasUrgentes })}
            className={`inline-flex items-center text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
              filters.apenasUrgentes
                ? isDark ? 'bg-red-950 text-red-300 border-red-700 shadow-lg shadow-red-950/50' : 'bg-red-50 text-red-700 border-red-300 shadow-sm'
                : isDark ? 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 mr-1.5 ${filters.apenasUrgentes ? 'text-red-500 fill-red-500' : 'text-slate-400'}`} />
            {filters.apenasUrgentes ? 'Exibindo Apenas Urgentes' : 'Filtro: Urgentes'}
          </button>

          <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'} hidden sm:inline`}>
            Exibindo <strong className="text-indigo-500 font-bold">{itemsCount}</strong> de {totalItems}
          </span>

          {isFiltered && (
            <button
              onClick={onResetFilters}
              className={`inline-flex items-center text-xs font-medium transition-colors px-2.5 py-1.5 rounded-xl border ${
                isDark 
                  ? 'text-slate-400 hover:text-indigo-400 bg-slate-800/80 hover:bg-slate-800 border-slate-700/60' 
                  : 'text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 border-slate-200'
              }`}
            >
              <X className="w-3 h-3 mr-1" /> Limpar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* ID STOCK Filter */}
        <div className="relative">
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center justify-between ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <span className="flex items-center">
              <Hash className="w-3.5 h-3.5 mr-1 text-indigo-500" /> ID STOCK
            </span>
            {filters.idStock && (
              <button
                onClick={() => onFilterChange({ idStock: '' })}
                className="text-[10px] text-slate-400 hover:text-slate-600"
              >
                Limpar
              </button>
            )}
          </label>
          <div className="relative">
            <input
              type="text"
              value={filters.idStock}
              onChange={(e) => onFilterChange({ idStock: e.target.value })}
              placeholder="Digite o ID STOCK (ex: STK-1001)..."
              className={`w-full border rounded-xl px-3.5 py-2.5 text-sm transition-all outline-none ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800 focus:border-indigo-500 text-slate-100 placeholder-slate-500'
                  : 'bg-slate-50 border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-900 placeholder-slate-400'
              }`}
            />
            {filters.idStock && (
              <button
                onClick={() => onFilterChange({ idStock: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* Quick ID Badges */}
          {stockIds.length > 0 && !filters.idStock && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400 self-center">Sugestões:</span>
              {stockIds.slice(0, 4).map((id, idx) => (
                <button
                  key={`id-sug-${id}-${idx}`}
                  onClick={() => onSelectItemById(id)}
                  className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cliente Filter - Searchable & Auto-filtering as you type */}
        <div className="relative">
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center justify-between ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <span className="flex items-center">
              <User className="w-3.5 h-3.5 mr-1 text-indigo-500" /> Cliente / Mecânica
            </span>
            {filters.cliente && (
              <button
                onClick={() => onFilterChange({ cliente: '' })}
                className="text-[10px] text-slate-400 hover:text-slate-600"
              >
                Limpar
              </button>
            )}
          </label>
          <div className="relative">
            <input
              type="text"
              value={filters.cliente}
              onChange={(e) => onFilterChange({ cliente: e.target.value })}
              placeholder="Digite o nome do cliente..."
              className={`w-full border rounded-xl px-3.5 py-2.5 text-sm transition-all outline-none ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800 focus:border-indigo-500 text-slate-100 placeholder-slate-500'
                  : 'bg-slate-50 border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-900 placeholder-slate-400'
              }`}
            />
            {filters.cliente ? (
              <button
                onClick={() => onFilterChange({ cliente: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            )}
          </div>

          {/* Dynamic matching suggestions dropdown if user typed something */}
          {filters.cliente.trim() !== '' && (
            <div className={`absolute z-20 left-0 right-0 mt-1 border rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y text-xs ${
              isDark ? 'bg-slate-900 border-slate-700/80 divide-slate-800' : 'bg-white border-slate-200 divide-slate-100'
            }`}>
              {clients
                .filter(c => c.toLowerCase().includes(filters.cliente.toLowerCase()))
                .slice(0, 8)
                .map((client, idx) => (
                  <button
                    key={`client-sug-${client}-${idx}`}
                    type="button"
                    onClick={() => onFilterChange({ cliente: client })}
                    className={`w-full text-left px-3.5 py-2 transition-colors flex items-center justify-between ${
                      isDark 
                        ? 'text-slate-200 hover:bg-indigo-900/40 hover:text-white' 
                        : 'text-slate-800 hover:bg-indigo-50 hover:text-indigo-900'
                    }`}
                  >
                    <span>{client}</span>
                    {filters.cliente.toLowerCase() === client.toLowerCase() && (
                      <span className="text-[10px] text-indigo-500 font-bold uppercase">Selecionado</span>
                    )}
                  </button>
                ))}
              {clients.filter(c => c.toLowerCase().includes(filters.cliente.toLowerCase())).length === 0 && (
                <div className="px-3.5 py-2 text-slate-400 italic">
                  Filtrando por termo digitado...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Global Search Filter */}
        <div>
          <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <Search className="w-3.5 h-3.5 mr-1 text-indigo-500" /> Busca Abrangente
          </label>
          <div className="relative">
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
              placeholder="Buscar por descrição, código, marca..."
              className={`w-full border rounded-xl px-3.5 py-2.5 text-sm transition-all outline-none ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800 focus:border-indigo-500 text-slate-100 placeholder-slate-500'
                  : 'bg-slate-50 border-slate-200 focus:border-indigo-500 focus:bg-white text-slate-900 placeholder-slate-400'
              }`}
            />
            {filters.searchTerm ? (
              <button
                onClick={() => onFilterChange({ searchTerm: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
