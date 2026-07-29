import React from 'react';
import { Search, User, Hash, X, Filter, Sparkles } from 'lucide-react';
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
}) => {
  const isFiltered = filters.idStock !== '' || filters.cliente !== '' || filters.searchTerm !== '';

  return (
    <div className="bg-slate-900/80 rounded-2xl p-4 sm:p-5 border border-slate-800/90 shadow-xl backdrop-blur-sm mb-6">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Filtros de Pesquisa
          </h2>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <span className="text-slate-400">
            Exibindo <strong className="text-indigo-400 font-bold">{itemsCount}</strong> de {totalItems} registros
          </span>
          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center text-xs font-medium text-slate-400 hover:text-indigo-400 transition-colors bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700/60"
            >
              <X className="w-3 h-3 mr-1" /> Limpar Filtros
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* ID STOCK Filter */}
        <div className="relative">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center">
              <Hash className="w-3.5 h-3.5 mr-1 text-indigo-400" /> ID STOCK
            </span>
            {filters.idStock && (
              <button
                onClick={() => onFilterChange({ idStock: '' })}
                className="text-[10px] text-slate-500 hover:text-slate-300"
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
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all outline-none"
            />
            {filters.idStock && (
              <button
                onClick={() => onFilterChange({ idStock: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* Quick ID Badges */}
          {stockIds.length > 0 && !filters.idStock && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] text-slate-500 self-center">Sugestões:</span>
              {stockIds.slice(0, 4).map((id, idx) => (
                <button
                  key={`id-sug-${id}-${idx}`}
                  onClick={() => onSelectItemById(id)}
                  className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700/60 transition-colors"
                >
                  {id}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cliente Filter - Searchable & Auto-filtering as you type */}
        <div className="relative">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center">
              <User className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Cliente / Mecânica
            </span>
            {filters.cliente && (
              <button
                onClick={() => onFilterChange({ cliente: '' })}
                className="text-[10px] text-slate-500 hover:text-slate-300"
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
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all outline-none"
            />
            {filters.cliente ? (
              <button
                onClick={() => onFilterChange({ cliente: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
            )}
          </div>

          {/* Dynamic matching suggestions dropdown if user typed something */}
          {filters.cliente.trim() !== '' && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-slate-800 text-xs">
              {clients
                .filter(c => c.toLowerCase().includes(filters.cliente.toLowerCase()))
                .slice(0, 8)
                .map((client, idx) => (
                  <button
                    key={`client-sug-${client}-${idx}`}
                    type="button"
                    onClick={() => onFilterChange({ cliente: client })}
                    className="w-full text-left px-3.5 py-2 text-slate-200 hover:bg-indigo-900/40 hover:text-white transition-colors flex items-center justify-between"
                  >
                    <span>{client}</span>
                    {filters.cliente.toLowerCase() === client.toLowerCase() && (
                      <span className="text-[10px] text-indigo-400 font-bold uppercase">Selecionado</span>
                    )}
                  </button>
                ))}
              {clients.filter(c => c.toLowerCase().includes(filters.cliente.toLowerCase())).length === 0 && (
                <div className="px-3.5 py-2 text-slate-500 italic">
                  Filtrando por termo digitado...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Global Search Filter */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
            <Search className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Busca Abrangente
          </label>
          <div className="relative">
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
              placeholder="Buscar por descrição, código, marca..."
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all outline-none"
            />
            {filters.searchTerm ? (
              <button
                onClick={() => onFilterChange({ searchTerm: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
