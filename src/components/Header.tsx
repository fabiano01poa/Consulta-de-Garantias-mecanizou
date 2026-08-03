import React from 'react';
import { RefreshCw, FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, Layers, Search, BarChart2, Kanban, Handshake } from 'lucide-react';

interface HeaderProps {
  onSync: () => void;
  isLoading: boolean;
  source: 'google_sheets' | 'fallback_sample' | 'custom_csv';
  message?: string;
  totalItems: number;
  onOpenSheetModal: () => void;
  onOpenSyncModal?: () => void;
  hasWebhookConfigured?: boolean;
  activeView: 'consulta' | 'dash' | 'alertas' | 'negociar';
  onViewChange: (view: 'consulta' | 'dash' | 'alertas' | 'negociar') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSync,
  isLoading,
  source,
  message,
  totalItems,
  onOpenSheetModal,
  onOpenSyncModal,
  hasWebhookConfigured,
  activeView,
  onViewChange
}) => {
  return (
    <header className="bg-slate-900/90 border-b border-slate-800/80 sticky top-0 z-30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Title & Badge */}
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl text-white shadow-lg shadow-indigo-900/30 ring-1 ring-white/10">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Consulta de Estoque & Devoluções
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60 font-medium">
                  {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                {source === 'google_sheets' ? (
                  <span className="flex items-center text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Google Sheets Conectado
                  </span>
                ) : source === 'custom_csv' ? (
                  <span className="flex items-center text-blue-400 font-medium">
                    <Upload className="w-3.5 h-3.5 mr-1" /> CSV Personalizado
                  </span>
                ) : (
                  <span className="flex items-center text-amber-400 font-medium" title={message}>
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Modo Amostra
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center Navigation Tabs: Consulta vs Dash vs Alertas */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner self-start md:self-auto">
            <button
              onClick={() => onViewChange('consulta')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === 'consulta'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Consulta</span>
            </button>
            <button
              onClick={() => onViewChange('dash')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === 'dash'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Dash</span>
            </button>
            <button
              onClick={() => onViewChange('alertas')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === 'alertas'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Alertas Kanban</span>
            </button>
            <button
              onClick={() => onViewChange('negociar')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeView === 'negociar'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Handshake className="w-3.5 h-3.5" />
              <span>Negociar</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3 self-end md:self-auto flex-wrap gap-y-1">
            <button
              onClick={onSync}
              disabled={isLoading}
              className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 transition-all duration-150 disabled:opacity-50 active:scale-95 shadow-sm"
              title="Sincronizar com a planilha online"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 text-indigo-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>

            {onOpenSyncModal && (
              <button
                onClick={onOpenSyncModal}
                className={`inline-flex items-center px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-150 active:scale-95 border shadow-sm ${
                  hasWebhookConfigured
                    ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-700'
                    : 'bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border-indigo-700'
                }`}
                title="Configurar vinculo com a Planilha Google para salvar edições diretamente no Google Sheets"
              >
                <CheckCircle2 className={`w-4 h-4 mr-1.5 ${hasWebhookConfigured ? 'text-emerald-400' : 'text-indigo-400'}`} />
                <span>{hasWebhookConfigured ? 'Gravação Ativa' : 'Vincular Gravação'}</span>
              </button>
            )}

            <button
              onClick={onOpenSheetModal}
              className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-all duration-150 active:scale-95 shadow-md shadow-indigo-950/40"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5" />
              <span>Planilha</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
