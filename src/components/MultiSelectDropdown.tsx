import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search, Filter } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  count?: number;
  badge?: string;
  highlight?: boolean;
}

interface MultiSelectDropdownProps {
  label: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  allOptionLabel?: string;
  allSelectedLabel?: string;
  totalCount?: number;
  helperTag?: string;
  subtitle?: string;
  badgeColor?: 'emerald' | 'indigo' | 'slate' | 'amber';
  theme?: 'dark' | 'light';
  isDark?: boolean;
  className?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Selecionar...',
  allOptionLabel = 'Todos',
  allSelectedLabel,
  totalCount,
  helperTag,
  subtitle,
  badgeColor = 'emerald',
  theme,
  isDark: isDarkProp,
  className = ''
}) => {
  const isDark = isDarkProp !== undefined ? isDarkProp : theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter options by search term
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const term = search.toLowerCase().trim();
    return options.filter(opt =>
      opt.label.toLowerCase().includes(term) ||
      opt.value.toLowerCase().includes(term)
    );
  }, [options, search]);

  const isAllSelected = selectedValues.length === 0;

  const handleToggle = (val: string) => {
    if (selectedValues.includes(val)) {
      const next = selectedValues.filter(v => v !== val);
      onChange(next);
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    onChange([]);
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange([]);
  };

  const defaultAllLabel = allSelectedLabel || allOptionLabel;

  // Compute trigger label
  const triggerLabel = useMemo(() => {
    if (selectedValues.length === 0) {
      return totalCount !== undefined ? `${defaultAllLabel} (${totalCount})` : defaultAllLabel;
    }
    if (selectedValues.length === 1) {
      const found = options.find(o => o.value === selectedValues[0]);
      return found ? found.label : selectedValues[0];
    }
    return `${selectedValues.length} selecionados`;
  }, [selectedValues, options, defaultAllLabel, totalCount]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <label className={`block text-[10px] font-bold uppercase mb-1 flex items-center justify-between ${
        isDark ? 'text-slate-400' : 'text-slate-600'
      }`}>
        <span className="truncate">{label}</span>
        {(subtitle || helperTag) && (
          <span className={`text-[9px] font-normal ${
            badgeColor === 'indigo'
              ? isDark ? 'text-indigo-400' : 'text-indigo-600'
              : isDark ? 'text-emerald-400' : 'text-emerald-600'
          }`}>
            {subtitle || helperTag}
          </span>
        )}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border text-xs rounded-xl px-3 py-2 flex items-center justify-between transition-all outline-none font-semibold ${
          isOpen
            ? 'border-emerald-500 ring-2 ring-emerald-500/20'
            : isDark ? 'border-slate-800 hover:border-slate-700' : 'border-slate-300 hover:border-slate-400'
        } ${
          isDark ? 'bg-slate-950 text-slate-200' : 'bg-white text-slate-800'
        }`}
      >
        <div className="flex items-center space-x-1.5 min-w-0 flex-1 pr-2">
          {selectedValues.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
              badgeColor === 'indigo'
                ? isDark ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                : isDark ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              {selectedValues.length}
            </span>
          )}
          <span className="truncate font-semibold text-left">
            {triggerLabel}
          </span>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          {selectedValues.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className={`p-0.5 rounded ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'}`}
              title="Limpar seleção"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border shadow-2xl overflow-hidden flex flex-col max-h-80 animate-fadeIn ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-200 shadow-slate-950/80' : 'bg-white border-slate-200 text-slate-800 shadow-xl'
        }`}>
          {/* Search Header */}
          <div className={`p-2.5 border-b flex items-center space-x-2 ${
            isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Buscar opções..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full bg-transparent text-xs outline-none ${
                isDark ? 'text-slate-100 placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
              }`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Action Toolbar */}
          <div className={`px-3 py-2 border-b flex items-center justify-between text-[11px] font-medium ${
            isDark ? 'bg-slate-950/50 border-slate-800/80 text-slate-400' : 'bg-slate-50/50 border-slate-100 text-slate-600'
          }`}>
            <button
              type="button"
              onClick={handleSelectAll}
              className={`hover:text-emerald-500 transition-colors font-bold flex items-center space-x-1 ${
                isAllSelected ? 'text-emerald-500' : ''
              }`}
            >
              <span>✓ Marcar todos ({options.length})</span>
            </button>
            {selectedValues.length > 0 ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-slate-400 hover:text-red-400 transition-colors font-medium"
              >
                Ver todos (Limpar)
              </button>
            ) : (
              <span className="text-slate-500 text-[10px]">Todos selecionados</span>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto divide-y divide-slate-800/20 p-1.5 flex-1 max-h-52">
            {/* "All" Option */}
            {!search && (
              <div
                onClick={handleSelectAll}
                className={`px-2.5 py-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors ${
                  isAllSelected
                    ? isDark ? 'bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-800/50' : 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                    : isDark ? 'hover:bg-slate-800/60 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    isAllSelected
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-300 bg-white'
                  }`}>
                    {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="truncate">{allOptionLabel} {totalCount !== undefined ? `(${totalCount})` : ''}</span>
                </div>
                {totalCount !== undefined && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {totalCount} itens
                  </span>
                )}
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Nenhuma opção encontrada
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <div
                    key={`opt-${opt.value}`}
                    onClick={() => handleToggle(opt.value)}
                    className={`px-2.5 py-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? isDark ? 'bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-800/50' : 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                        : isDark ? 'hover:bg-slate-800/60 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate min-w-0 pr-2">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="truncate">{opt.label}</span>
                    </div>
                    {opt.count !== undefined && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                        isSelected
                          ? isDark ? 'bg-emerald-900/60 text-emerald-200' : 'bg-emerald-200 text-emerald-900'
                          : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {opt.count} itens
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Footer with Concluído button */}
          <div className={`p-2.5 border-t flex items-center justify-between text-xs ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {selectedValues.length === 0 ? 'Exibindo todos' : `${selectedValues.length} selecionados`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                isDark
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              Concluído
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
