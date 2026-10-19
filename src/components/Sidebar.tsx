import React from 'react';
import { 
  ShieldCheck, 
  Search, 
  BarChart2, 
  Kanban, 
  Handshake, 
  RotateCcw, 
  RefreshCw, 
  Sun, 
  Moon, 
  Layers, 
  FileSpreadsheet, 
  BookOpen, 
  SlidersHorizontal, 
  CheckCircle2, 
  AlertTriangle, 
  Upload, 
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeView: 'consulta' | 'dash' | 'alertas' | 'garantias';
  onViewChange: (view: 'consulta' | 'dash' | 'alertas' | 'garantias') => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onSync: () => void;
  isLoading: boolean;
  source: 'google_sheets' | 'fallback_sample' | 'custom_csv';
  message?: string;
  totalItems: number;
  lastSyncedAt?: Date | null;
  onOpenSheetModal: () => void;
  onOpenSyncModal?: () => void;
  onOpenDocModal?: () => void;
  hasWebhookConfigured?: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  theme,
  onToggleTheme,
  onSync,
  isLoading,
  source,
  message,
  totalItems,
  lastSyncedAt,
  onOpenSheetModal,
  onOpenSyncModal,
  onOpenDocModal,
  hasWebhookConfigured,
  isMobileOpen,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapsed
}) => {
  const isDark = theme === 'dark';

  const navItems = [
    {
      id: 'consulta' as const,
      label: 'Consulta de Peças',
      shortLabel: 'Consulta',
      icon: Search,
      badge: totalItems > 0 ? `${totalItems}` : undefined,
      description: 'Filtros, busca e fichas detalhadas'
    },
    {
      id: 'dash' as const,
      label: 'Dashboard Analítico',
      shortLabel: 'Dashboard',
      icon: BarChart2,
      description: 'Gráficos, KPIs e indicadores'
    },
    {
      id: 'alertas' as const,
      label: 'Alertas & Prazos (Kanban)',
      shortLabel: 'Alertas',
      icon: Kanban,
      description: 'Fluxo visual e peças paradas'
    },
    {
      id: 'garantias' as const,
      label: 'Painel de Garantias',
      shortLabel: 'Garantias',
      icon: Handshake,
      description: 'Negociação, troca em massa e relatórios'
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-fadeIn"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out border-r ${
          isDark 
            ? 'bg-slate-900/95 border-slate-800 text-slate-100' 
            : 'bg-white border-slate-200 text-slate-800 shadow-xl'
        } ${
          isMobileOpen 
            ? 'translate-x-0 w-72' 
            : '-translate-x-full md:translate-x-0 ' + (isCollapsed ? 'md:w-20' : 'md:w-64 lg:w-72')
        }`}
      >
        {/* Header / Brand Area */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl text-white shadow-lg shadow-indigo-900/30 flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="min-w-0">
                <h1 className={`text-base font-bold tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Mecanizou
                </h1>
                <p className={`text-[11px] font-medium truncate ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  Gestão de Garantias
                </p>
              </div>
            )}
          </div>

          {/* Close on Mobile / Collapse on Desktop */}
          <div className="flex items-center space-x-1">
            <button
              onClick={onCloseMobile}
              className={`p-1.5 rounded-lg md:hidden ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>

            {onToggleCollapsed && (
              <button
                onClick={onToggleCollapsed}
                className={`hidden md:flex p-1.5 rounded-lg transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Sync & Connection Status Box */}
        {(!isCollapsed || isMobileOpen) && (
          <div className={`p-4 border-b ${isDark ? 'border-slate-800/80 bg-slate-900/40' : 'border-slate-100 bg-slate-50/50'}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center space-x-1.5 text-xs font-semibold truncate">
                {source === 'google_sheets' ? (
                  <span className="flex items-center text-emerald-500 font-bold">
                    <CheckCircle2 className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">Google Sheets</span>
                  </span>
                ) : source === 'custom_csv' ? (
                  <span className="flex items-center text-blue-500 font-bold">
                    <Upload className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">CSV Personalizado</span>
                  </span>
                ) : (
                  <span className="flex items-center text-amber-500 font-bold" title={message}>
                    <AlertTriangle className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">Modo Amostra</span>
                  </span>
                )}
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
              }`}>
                {totalItems} {totalItems === 1 ? 'item' : 'itens'}
              </span>
            </div>

            {lastSyncedAt && (
              <div className={`text-[10px] mb-3 flex items-center justify-between font-mono ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <span>Atualizado às:</span>
                <span className="font-bold">{lastSyncedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}

            <button
              onClick={onSync}
              disabled={isLoading}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 shadow-md ${
                isLoading 
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed opacity-75' 
                  : isDark 
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/50 active:scale-98' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 active:scale-98'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
            </button>
          </div>
        )}

        {/* Main Navigation Menu */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {(!isCollapsed || isMobileOpen) && (
            <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Navegação Principal
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id);
                  if (isMobileOpen) onCloseMobile();
                }}
                className={`w-full flex items-center rounded-xl font-bold transition-all ${
                  isCollapsed && !isMobileOpen
                    ? 'justify-center p-3'
                    : 'justify-between px-3.5 py-3 text-xs'
                } ${
                  isActive
                    ? isDark
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/60 ring-1 ring-white/10'
                      : 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : isDark
                      ? 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title={item.label}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                  {(!isCollapsed || isMobileOpen) && (
                    <div className="text-left truncate">
                      <div className="truncate font-semibold">{item.label}</div>
                    </div>
                  )}
                </div>

                {(!isCollapsed || isMobileOpen) && item.badge && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ml-2 ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : isDark 
                        ? 'bg-slate-800 text-slate-300 border border-slate-700' 
                        : 'bg-slate-200 text-slate-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Tools / Integrations Section */}
          {(!isCollapsed || isMobileOpen) && (
            <div className={`px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Ferramentas & Integração
            </div>
          )}

          {onOpenSyncModal && (
            <button
              onClick={() => {
                onOpenSyncModal();
                if (isMobileOpen) onCloseMobile();
              }}
              className={`w-full flex items-center rounded-xl transition-all ${
                isCollapsed && !isMobileOpen ? 'justify-center p-3' : 'justify-start space-x-3 px-3.5 py-2.5 text-xs'
              } ${
                hasWebhookConfigured
                  ? isDark ? 'text-emerald-400 hover:bg-emerald-950/30' : 'text-emerald-700 hover:bg-emerald-50'
                  : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Gravação Ativa / Webhook"
            >
              <div className="relative">
                <Layers className="w-4 h-4 flex-shrink-0" />
                {hasWebhookConfigured && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                )}
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <span className="font-medium truncate">
                  {hasWebhookConfigured ? 'Gravação Ativa (Conectado)' : 'Gravação Ativa (Webhook)'}
                </span>
              )}
            </button>
          )}

          {onOpenDocModal && (
            <button
              onClick={() => {
                onOpenDocModal();
                if (isMobileOpen) onCloseMobile();
              }}
              className={`w-full flex items-center rounded-xl transition-all ${
                isCollapsed && !isMobileOpen ? 'justify-center p-3' : 'justify-start space-x-3 px-3.5 py-2.5 text-xs'
              } ${
                isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Guia & Manual do Sistema"
            >
              <BookOpen className="w-4 h-4 flex-shrink-0" />
              {(!isCollapsed || isMobileOpen) && (
                <span className="font-medium truncate">Guia & Manual</span>
              )}
            </button>
          )}

          <a
            href="https://docs.google.com/spreadsheets/d/1daGWs2SPXQsN9YLJBggtyX0Wdqpv2kgBcB4mOUrhe7M/edit#gid=1870385864"
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full flex items-center rounded-xl transition-all ${
              isCollapsed && !isMobileOpen ? 'justify-center p-3' : 'justify-start space-x-3 px-3.5 py-2.5 text-xs'
            } ${
              isDark ? 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60' : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-100'
            }`}
            title="Abrir Planilha Original no Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4 flex-shrink-0 text-emerald-500" />
            {(!isCollapsed || isMobileOpen) && (
              <span className="font-medium truncate">Planilha Google Sheets</span>
            )}
          </a>

          <button
            onClick={() => {
              onOpenSheetModal();
              if (isMobileOpen) onCloseMobile();
            }}
            className={`w-full flex items-center rounded-xl transition-all ${
              isCollapsed && !isMobileOpen ? 'justify-center p-3' : 'justify-start space-x-3 px-3.5 py-2.5 text-xs'
            } ${
              isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Configurar URL ou Carregar CSV"
          >
            <SlidersHorizontal className="w-4 h-4 flex-shrink-0" />
            {(!isCollapsed || isMobileOpen) && (
              <span className="font-medium truncate">Configurações da Fonte</span>
            )}
          </button>
        </div>

        {/* Bottom Area: Theme Switcher & System Info */}
        <div className={`p-3.5 border-t space-y-2 ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50'
        }`}>
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all ${
              isDark 
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800' 
                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-sm'
            }`}
            title={isDark ? "Mudar para Tema Claro" : "Mudar para Tema Escuro"}
          >
            <div className="flex items-center space-x-2.5 text-xs font-bold">
              {isDark ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
              {(!isCollapsed || isMobileOpen) && (
                <span>{isDark ? 'Modo Escuro' : 'Modo Claro'}</span>
              )}
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                isDark ? 'bg-indigo-950 text-indigo-300' : 'bg-amber-100 text-amber-800'
              }`}>
                {isDark ? 'Escuro' : 'Claro'}
              </span>
            )}
          </button>

          {(!isCollapsed || isMobileOpen) && (
            <div className="text-center pt-1">
              <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                v2.6 • Mecanizou Operações
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
