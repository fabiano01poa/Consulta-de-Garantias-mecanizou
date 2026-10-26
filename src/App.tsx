import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { StatsOverview } from './components/StatsOverview';
import { Filters } from './components/Filters';
import { DetailCard } from './components/DetailCard';
import { ItemList } from './components/ItemList';
import { SheetModal } from './components/SheetModal';
import { GoogleSyncModal } from './components/GoogleSyncModal';
import { DocumentationModal } from './components/DocumentationModal';
import { BrotherLabelModal } from './components/BrotherLabelModal';
import { SupplierLabelModal } from './components/SupplierLabelModal';
import { Dashboard } from './components/Dashboard';
import { KanbanAlerts } from './components/KanbanAlerts';
import { NegociarView } from './components/NegociarView';
import { StockItem, FilterState } from './types';
import { isAllowedWarrantyStatus, isWarrantyItem, isDevolucaoItem, isItemUrgent } from './utils/statusUtils';
import { getItemPrimaryTimestamp } from './utils/dateUtils';
import { fetchSheetDirectlyFromClient } from './utils/clientSheetFetcher';
import { AlertTriangle, Sparkles, RefreshCw, Layers, Menu, ShieldCheck, Moon, Sun, Printer, Truck } from 'lucide-react';

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1daGWs2SPXQsN9YLJBggtyX0Wdqpv2kgBcB4mOUrhe7M/edit?gid=1870385864#gid=1870385864";

export default function App() {
  const [items, setItems] = useState<StockItem[]>([]);

  // Etiquetas Brother: itens marcados na Consulta (mesmo fluxo da plataforma de devoluções)
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(new Set());
  const [isBrotherModalOpen, setIsBrotherModalOpen] = useState<boolean>(false);
  const [isSupplierLabelModalOpen, setIsSupplierLabelModalOpen] = useState<boolean>(false);

  const handleToggleLabelSelect = (idStock: string) => {
    if (!idStock) return;
    setSelectedLabelIds(prev => {
      const next = new Set(prev);
      if (next.has(idStock)) next.delete(idStock);
      else next.add(idStock);
      return next;
    });
  };

  const handleToggleSelectAllPage = (ids: string[], select: boolean) => {
    setSelectedLabelIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => (select ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const selectedLabelItems = useMemo(
    () => items.filter(i => selectedLabelIds.has(i.idStock)),
    [items, selectedLabelIds]
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [source, setSource] = useState<'google_sheets' | 'fallback_sample' | 'custom_csv'>('google_sheets');
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('app_sheet_url') || DEFAULT_SHEET_URL;
    } catch {
      return DEFAULT_SHEET_URL;
    }
  });
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return localStorage.getItem('gs_webhook_url') || '';
  });
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);

  const [activeView, setActiveView] = useState<'consulta' | 'dash' | 'alertas' | 'garantias'>('consulta');
  const [selectedLocalidade, setSelectedLocalidade] = useState<string>('todas');
  const [availableLocalidades, setAvailableLocalidades] = useState<string[]>([]);
  const [totalSheetRows, setTotalSheetRows] = useState<number>(0);

  // Theme state ('dark' | 'light')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('app_theme') as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const handleToggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('app_theme', next);
      } catch {}
      return next;
    });
  };

  // Marca <html> com o tema do app para as variantes dark: do Tailwind (modais de etiqueta)
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }, [theme]);

  // Sidebar responsive states
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const [filters, setFilters] = useState<FilterState>({
    idStock: '',
    cliente: '',
    searchTerm: ''
  });

  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [detailModalItem, setDetailModalItem] = useState<StockItem | null>(null);
  const [detailModalContextList, setDetailModalContextList] = useState<StockItem[] | null>(null);

  const handleOpenDetailModal = (item: StockItem, contextList?: StockItem[]) => {
    setSelectedItem(item);
    setDetailModalItem(item);
    setDetailModalContextList(contextList || null);
  };

  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Persistent storage for user edits (e.g. Urgência toggles, manual status changes, obs)
  const [itemOverrides, setItemOverrides] = useState<Record<string, Partial<StockItem>>>(() => {
    try {
      const saved = localStorage.getItem('local_stock_item_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Keep ref up to date to prevent closure stale state during background sync intervals
  const itemOverridesRef = useRef(itemOverrides);
  useEffect(() => {
    itemOverridesRef.current = itemOverrides;
  }, [itemOverrides]);

  const updateItemOverrides = (itemsToSave: StockItem[]) => {
    setItemOverrides(prev => {
      const updated = { ...prev };
      itemsToSave.forEach(i => {
        if (i.idStock) {
          updated[i.idStock] = {
            ...(updated[i.idStock] || {}),
            urgente: i.urgente,
            statusDevolucao: i.statusDevolucao,
            observacoesGerais: i.observacoesGerais,
            obsNotaFiscal: i.obsNotaFiscal,
            notaFiscalSaida: i.notaFiscalSaida,
            ultimaInteracao: i.ultimaInteracao,
            dataUltimaAlteracao: i.dataUltimaAlteracao,
            historicoAlteracoes: i.historicoAlteracoes
          };
        }
      });
      try {
        localStorage.setItem('local_stock_item_overrides', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save item overrides to localStorage:', err);
      }
      return updated;
    });
  };

  // Fetch data from server or direct client fallback
  const fetchSheetData = async (urlToFetch?: string, locToFetch?: string, isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
      setStatusMessage(undefined);
    }

    const targetUrl = urlToFetch || sheetUrl;
    const targetLoc = locToFetch !== undefined ? locToFetch : selectedLocalidade;

    const applyMergedItems = (rawRows: StockItem[], src: 'google_sheets' | 'fallback_sample' | 'custom_csv', totalRows?: number, localidades?: string[], msg?: string) => {
      if (!isBackground) {
        try {
          localStorage.removeItem('local_stock_item_overrides');
        } catch {}
        setItemOverrides({});
      }

      let activeOverrides = itemOverridesRef.current;
      if (!isBackground) {
        activeOverrides = {};
      } else {
        try {
          const rawLocal = localStorage.getItem('local_stock_item_overrides');
          if (rawLocal) {
            activeOverrides = { ...activeOverrides, ...JSON.parse(rawLocal) };
          }
        } catch {}
      }

      const mergedData = rawRows.map((rawItem: StockItem) => {
        const override = rawItem.idStock ? activeOverrides[rawItem.idStock] : undefined;
        const isUrgentLocal = override?.urgente !== undefined ? override.urgente : (rawItem.urgente || isItemUrgent(rawItem));
        return {
          ...rawItem,
          urgente: isUrgentLocal
        };
      });

      setItems(mergedData);
      setSource(src);
      if (totalRows) setTotalSheetRows(totalRows);
      if (localidades && localidades.length > 0) setAvailableLocalidades(localidades);
      setLastSyncedAt(new Date());

      if (msg && !isBackground) {
        setStatusMessage(msg);
      } else if (!isBackground) {
        setStatusMessage(undefined);
      }

      setSelectedItem(prev => {
        if (!prev) return mergedData.length > 0 ? mergedData[0] : null;
        const updated = mergedData.find((i: StockItem) => i.idStock === prev.idStock);
        return updated || prev;
      });
    };

    let fetchSuccess = false;

    // 1. Try server endpoint first (force=true when manual refresh to bypass cache and reflect live spreadsheet)
    try {
      const forceParam = !isBackground ? 'true' : 'false';
      const res = await fetch(`/api/sheet-data?url=${encodeURIComponent(targetUrl)}&localidade=${encodeURIComponent(targetLoc)}&force=${forceParam}`);
      const contentType = res.headers.get("content-type");

      if (res.ok && contentType && contentType.includes("application/json")) {
        const json = await res.json();

        if (json.data && Array.isArray(json.data) && json.data.length > 0 && json.source !== 'fallback_sample') {
          applyMergedItems(json.data, json.source || 'google_sheets', json.totalRows, json.availableLocalidades, json.message);
          fetchSuccess = true;
        }
      }
    } catch (error) {
      console.warn('Server endpoint /api/sheet-data failed, attempting direct browser client fetch...', error);
    }

    // 2. Direct browser fetch fallback if server endpoint failed or returned sample data
    if (!fetchSuccess) {
      try {
        const clientFetchResult = await fetchSheetDirectlyFromClient(targetUrl);
        if (clientFetchResult && clientFetchResult.rows && clientFetchResult.rows.length > 0) {
          let rowsToUse = clientFetchResult.rows;
          if (targetLoc && targetLoc !== 'todas' && targetLoc !== 'all') {
            rowsToUse = clientFetchResult.rows.filter(r => r.localidade?.toLowerCase().includes(targetLoc.toLowerCase()));
          }
          applyMergedItems(
            rowsToUse,
            'google_sheets',
            clientFetchResult.totalRows,
            clientFetchResult.availableLocalidades,
            undefined
          );
          fetchSuccess = true;
        }
      } catch (clientErr) {
        console.warn('Direct browser client fetch failed:', clientErr);
      }
    }

    // 3. Final fallback if both server & client direct fetch failed
    if (!fetchSuccess && !isBackground) {
      setStatusMessage('Não foi possível conectar ao servidor da planilha online no momento. Exibindo dados locais.');
    }

    if (!isBackground) {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSheetData();
  }, [selectedLocalidade]);

  // Background Auto-Sync Timer: Updates every 15 minutes (900,000 ms) without freezing UI or overwriting local edits
  useEffect(() => {
    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
    const interval = setInterval(() => {
      fetchSheetData(undefined, undefined, true);
    }, FIFTEEN_MINUTES_MS);

    return () => clearInterval(interval);
  }, [sheetUrl, selectedLocalidade]);

  // Line threshold start filter state (default 1 or saved in localStorage)
  const [startRow, setStartRow] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('app_start_row');
      return saved ? parseInt(saved, 10) || 1 : 1;
    } catch {
      return 1;
    }
  });

  const handleStartRowChange = (val: number) => {
    const num = isNaN(val) ? 1 : Math.max(1, val);
    setStartRow(num);
    try {
      localStorage.setItem('app_start_row', num.toString());
    } catch {}
  };

  // Base rows filtered by start row threshold
  const rowsFromStart = useMemo(() => {
    if (startRow <= 1) return items;
    return items.filter((item, idx) => {
      if (item.sheetRowNumber !== undefined && item.sheetRowNumber !== null) {
        return item.sheetRowNumber >= startRow;
      }
      return (idx + 2) >= startRow;
    });
  }, [items, startRow]);

  // Auto-correct startRow if it exceeds total items loaded and causes 0 items to be displayed
  useEffect(() => {
    if (items.length > 0 && startRow > items.length && rowsFromStart.length === 0) {
      console.warn(`startRow (${startRow}) exceeds total items (${items.length}). Auto-resetting startRow to 1.`);
      handleStartRowChange(1);
    }
  }, [items.length, startRow, rowsFromStart.length]);

  // Filter exclusively for Garantias items from rowsFromStart
  const warrantyItems = useMemo(() => {
    return rowsFromStart.filter(i => isWarrantyItem(i));
  }, [rowsFromStart]);

  // Get list of unique clients for filter dropdown (from warrantyItems)
  const clients = useMemo(() => {
    const set = new Set<string>();
    warrantyItems.forEach(i => {
      if (i.cliente && i.cliente.trim()) {
        set.add(i.cliente.trim());
      }
    });
    return Array.from(set).sort();
  }, [warrantyItems]);

  // Get list of stock IDs for suggestions (from warrantyItems)
  const stockIds = useMemo(() => {
    return warrantyItems.map(i => i.idStock).filter(Boolean);
  }, [warrantyItems]);

  // Filter items based on user inputs (operating on warrantyItems)
  const filteredItems = useMemo(() => {
    return warrantyItems.filter(item => {
      // Filter by ID STOCK / PROTOCOLO
      if (filters.idStock && filters.idStock.trim()) {
        const cleanFilter = filters.idStock.toLowerCase().trim();
        const cleanId = (item.idStock || '').toLowerCase().trim();
        const cleanProtocolo = (item.protocolo || '').toLowerCase().trim();
        if (!cleanId.includes(cleanFilter) && !cleanProtocolo.includes(cleanFilter)) {
          return false;
        }
      }

      // Filter by Cliente
      if (filters.cliente && filters.cliente.trim()) {
        if (item.cliente.trim() !== filters.cliente.trim()) {
          return false;
        }
      }

      // Filter by Urgentes toggle
      if (filters.apenasUrgentes) {
        if (!item.urgente && !item.statusDevolucao?.toLowerCase().includes('urgente')) {
          return false;
        }
      }

      // Filter by Search Term (Descrição, Código, Marca, Fornecedor, etc)
      if (filters.searchTerm && filters.searchTerm.trim()) {
        const term = filters.searchTerm.toLowerCase().trim();
        const matches =
          (item.protocolo && item.protocolo.toLowerCase().includes(term)) ||
          (item.idStock && item.idStock.toLowerCase().includes(term)) ||
          (item.cliente && item.cliente.toLowerCase().includes(term)) ||
          (item.descricao && item.descricao.toLowerCase().includes(term)) ||
          (item.codigo && item.codigo.toLowerCase().includes(term)) ||
          (item.marca && item.marca.toLowerCase().includes(term)) ||
          (item.fornecedor && item.fornecedor.toLowerCase().includes(term)) ||
          (item.novoFornecedorFilial && item.novoFornecedorFilial.toLowerCase().includes(term)) ||
          (item.statusDevolucao && item.statusDevolucao.toLowerCase().includes(term)) ||
          (item.observacoesGerais && item.observacoesGerais.toLowerCase().includes(term)) ||
          (item.notaFiscalSaida && item.notaFiscalSaida.toLowerCase().includes(term));

        if (!matches) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => getItemPrimaryTimestamp(b) - getItemPrimaryTimestamp(a));
  }, [warrantyItems, filters]);

  // Sync selectedItem with active search results safely
  useEffect(() => {
    if (filteredItems.length > 0) {
      const selectedId = selectedItem?.idStock;
      const stillInList = selectedId ? filteredItems.find(i => i.idStock === selectedId) : undefined;
      if (stillInList) {
        if (selectedItem?.idStock !== stillInList.idStock) {
          setSelectedItem(stillInList);
        }
      } else {
        setSelectedItem(filteredItems[0]);
      }
    } else {
      setSelectedItem(null);
    }
  }, [filteredItems]);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleSaveWebhookUrl = (url: string) => {
    setWebhookUrl(url);
    localStorage.setItem('gs_webhook_url', url);
  };

  const syncItemsToServer = async (itemsToSync: StockItem[]) => {
    let result: { success?: boolean; message?: string } = {};
    try {
      const res = await fetch('/api/update-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsToSync,
          webhookUrl: webhookUrl || undefined
        })
      });
      result = await res.json();
    } catch (err) {
      console.error('Failed to sync items to server:', err);
      result = { success: false, message: 'Alteração NÃO gravada: sem conexão com o servidor.' };
    }
    if (result.message) {
      // Falha fica visível por mais tempo: a alteração só existe neste navegador até a próxima sincronização
      setStatusMessage(result.message);
      setTimeout(() => setStatusMessage(undefined), result.success ? 7000 : 30000);
    }
  };

  const handleUpdateItem = (updatedItem: StockItem) => {
    updateItemOverrides([updatedItem]);
    setItems(prev => prev.map(i => i.idStock === updatedItem.idStock ? updatedItem : i));
    if (selectedItem?.idStock === updatedItem.idStock) {
      setSelectedItem(updatedItem);
    }
    if (detailModalItem?.idStock === updatedItem.idStock) {
      setDetailModalItem(updatedItem);
    }
    syncItemsToServer([updatedItem]);
  };

  const handleBatchUpdateStatus = (updatedBatch: StockItem[]) => {
    updateItemOverrides(updatedBatch);
    const updatedMap = new Map(updatedBatch.map(i => [i.idStock, i]));
    setItems(prev => prev.map(i => updatedMap.get(i.idStock) || i));
    syncItemsToServer(updatedBatch);
  };

  const handleResetFilters = () => {
    setFilters({
      idStock: '',
      cliente: '',
      searchTerm: '',
      apenasUrgentes: false
    });
  };

  const handleSelectById = (idStock: string) => {
    setFilters(prev => ({ ...prev, idStock }));
  };

  const handleLoadCustomData = (data: StockItem[]) => {
    setItems(data);
    setSource('custom_csv');
    setStatusMessage(`Arquivo CSV carregado com sucesso (${data.length} registros).`);
    if (data.length > 0) {
      setSelectedItem(data[0]);
    }
  };

  // Active context list for DetailCard modal (supports supplier selection, table filter, or global list)
  const activeNavContextList = useMemo(() => {
    if (detailModalContextList && detailModalContextList.length > 0) {
      return detailModalContextList;
    }
    return filteredItems;
  }, [detailModalContextList, filteredItems]);

  // Find index of current selected item inside active context list for next/prev buttons
  const selectedIndex = useMemo(() => {
    if (!detailModalItem) return 0;
    const idx = activeNavContextList.findIndex(
      i => (i.idStock === detailModalItem.idStock && i.protocolo === detailModalItem.protocolo)
    );
    return idx >= 0 ? idx : 0;
  }, [activeNavContextList, detailModalItem]);

  const handleNextItem = () => {
    if (activeNavContextList.length === 0) return;
    const nextIdx = (selectedIndex + 1) % activeNavContextList.length;
    const nextItem = activeNavContextList[nextIdx];
    setSelectedItem(nextItem);
    if (detailModalItem) {
      setDetailModalItem(nextItem);
    }
  };

  const handlePrevItem = () => {
    if (activeNavContextList.length === 0) return;
    const prevIdx = (selectedIndex - 1 + activeNavContextList.length) % activeNavContextList.length;
    const prevItem = activeNavContextList[prevIdx];
    setSelectedItem(prevItem);
    if (detailModalItem) {
      setDetailModalItem(prevItem);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen font-sans antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-200 ${
      isDark ? 'bg-[#0a0f1d] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Side Navigation Menu */}
      <Sidebar
        activeView={activeView}
        onViewChange={(view) => setActiveView(view)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onSync={() => fetchSheetData()}
        isLoading={isLoading}
        source={source}
        message={statusMessage}
        totalItems={items.length}
        lastSyncedAt={lastSyncedAt}
        onOpenSheetModal={() => setIsModalOpen(true)}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenDocModal={() => setIsDocModalOpen(true)}
        hasWebhookConfigured={!!webhookUrl}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed(prev => !prev)}
      />

      {/* Main Content Area - padded to leave room for sidebar on md/lg screens */}
      <div className={`transition-all duration-300 ${
        isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64 lg:pl-72'
      }`}>
        {/* Mobile Header Bar with Hamburger Button */}
        <header className={`md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b backdrop-blur-md ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className={`p-2 rounded-xl border ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}
              title="Abrir Menu Lateral"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
              <span className="font-bold text-sm tracking-tight">Mecanizou Garantias</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleTheme}
              className={`p-2 rounded-xl border transition-all ${
                isDark ? 'bg-slate-900 border-slate-800 text-amber-400' : 'bg-slate-100 border-slate-200 text-indigo-600'
              }`}
              title={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => fetchSheetData()}
              disabled={isLoading}
              className={`p-2 rounded-xl border text-indigo-500 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
              title="Sincronizar"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          
          {/* Active Warranty & Sheet Reading Banner (Starts at the top of the main area) */}
          <div className={`rounded-xl p-3.5 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md border ${
            isDark 
              ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-200' 
              : 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
          }`}>
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              <span className={`p-1.5 rounded-lg font-bold flex-shrink-0 ${
                isDark ? 'bg-indigo-900/80 text-indigo-400' : 'bg-indigo-200 text-indigo-700'
              }`}>📍</span>
              <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Leitura de Garantias:
              </span>
              <span className={`font-semibold px-2.5 py-1 rounded-lg border ${
                isDark 
                  ? 'text-emerald-400 bg-emerald-950/80 border-emerald-800/60' 
                  : 'text-emerald-800 bg-emerald-100 border-emerald-300'
              }`}>
                {warrantyItems.length.toLocaleString('pt-BR')} garantias exibidas {startRow > 1 ? `(a partir da linha ${startRow.toLocaleString('pt-BR')})` : ''} de {items.length.toLocaleString('pt-BR')} registros na planilha
              </span>

              {/* Line Threshold Filter Control */}
              <div className={`flex items-center space-x-2 border rounded-lg px-2.5 py-1 ${
                isDark ? 'bg-slate-950 border-indigo-700/80' : 'bg-white border-indigo-300'
              }`}>
                <label className={`font-bold text-xs whitespace-nowrap flex items-center gap-1 ${
                  isDark ? 'text-indigo-300' : 'text-indigo-700'
                }`}>
                  <span>A partir da linha:</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={startRow || ''}
                  onChange={(e) => handleStartRowChange(parseInt(e.target.value, 10))}
                  placeholder="Ex: 25000"
                  className={`w-24 border rounded px-2 py-0.5 font-mono text-xs font-bold focus:ring-1 focus:ring-indigo-400 outline-none text-center ${
                    isDark ? 'bg-slate-900 border-indigo-500/60 text-white' : 'bg-slate-50 border-indigo-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center space-x-1.5 ml-1">
                <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Localidade:</span>
                <select
                  value={selectedLocalidade}
                  onChange={(e) => setSelectedLocalidade(e.target.value)}
                  className={`border rounded-lg px-2.5 py-1 text-xs font-bold focus:ring-1 focus:ring-indigo-400 outline-none cursor-pointer ${
                    isDark ? 'bg-indigo-950 border-indigo-700/80 text-white' : 'bg-white border-indigo-300 text-slate-800'
                  }`}
                >
                  <option value="todas">Todas as Localidades ({warrantyItems.length.toLocaleString('pt-BR')} garantias)</option>
                  {availableLocalidades.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {startRow > 1 && (
                <button
                  onClick={() => handleStartRowChange(1)}
                  className={`text-[11px] underline font-semibold transition-colors px-2 py-1 rounded border ${
                    isDark 
                      ? 'text-indigo-400 hover:text-white bg-indigo-950/80 border-indigo-800' 
                      : 'text-indigo-600 hover:text-indigo-900 bg-white border-indigo-200'
                  }`}
                >
                  Resetar para Linha 1
                </button>
              )}
              {selectedLocalidade !== 'todas' && (
                <button
                  onClick={() => setSelectedLocalidade('todas')}
                  className={`text-[11px] underline font-semibold transition-colors ${
                    isDark ? 'text-indigo-400 hover:text-white' : 'text-indigo-600 hover:text-indigo-900'
                  }`}
                >
                  Ver Todas as Localidades
                </button>
              )}
            </div>
          </div>

          {/* Warning Banner if startRow is filtering out all items */}
          {startRow > 1 && warrantyItems.length === 0 && (
            <div className={`rounded-xl p-4 mb-6 flex items-center justify-between gap-4 shadow-lg border ${
              isDark 
                ? 'bg-amber-950/60 border-amber-800/80 text-amber-200' 
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <div>
                  <p className={`font-semibold text-sm ${isDark ? 'text-amber-100' : 'text-amber-900'}`}>
                    Linha inicial configurada para {startRow.toLocaleString('pt-BR')}
                  </p>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-amber-300/90' : 'text-amber-700'}`}>
                    Nenhuma garantia foi encontrada a partir da linha {startRow.toLocaleString('pt-BR')}. Clique no botão ao lado para voltar a exibir a partir da linha 1.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleStartRowChange(1)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-md transition-all whitespace-nowrap"
              >
                Exibir desde a Linha 1
              </button>
            </div>
          )}

          {/* Status Alert Banner if in Fallback or Notice */}
          {statusMessage && (
            <div className={`rounded-xl p-3.5 mb-6 flex items-center justify-between text-xs border ${
              isDark 
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-200' 
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>{statusMessage}</span>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="underline hover:opacity-80 ml-2 flex-shrink-0 font-semibold"
              >
                Configurar Planilha
              </button>
            </div>
          )}

          {/* View Switch: Dashboard vs Alertas vs Garantias vs Consulta */}
          {activeView === 'dash' ? (
            <Dashboard
              items={warrantyItems}
              onSelectItem={(item) => handleOpenDetailModal(item, warrantyItems)}
              theme={theme}
            />
          ) : activeView === 'alertas' ? (
            <KanbanAlerts
              items={warrantyItems}
              onSelectItem={(item) => handleOpenDetailModal(item, warrantyItems)}
              theme={theme}
            />
          ) : activeView === 'garantias' ? (
            <NegociarView
              mode="garantias"
              items={warrantyItems}
              onSelectItem={(item, contextList) => handleOpenDetailModal(item, contextList)}
              onBatchUpdateStatus={handleBatchUpdateStatus}
              theme={theme}
            />
          ) : (
            <>
              {/* Stats Summary Bar */}
              <StatsOverview items={warrantyItems} theme={theme} />

              {/* Search & Filter Controls */}
              <Filters
                filters={filters}
                onFilterChange={handleFilterChange}
                onResetFilters={handleResetFilters}
                clients={clients}
                stockIds={stockIds}
                itemsCount={filteredItems.length}
                totalItems={warrantyItems.length}
                allItems={warrantyItems}
                onSelectItemById={handleSelectById}
                theme={theme}
              />

              {/* Loading Spinner */}
              {isLoading ? (
                <div className={`rounded-2xl p-12 text-center my-8 border ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-3" />
                  <p className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Carregando dados da planilha Google Sheets...
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    Buscando e organizando colunas de estoque e devoluções.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="space-y-4">
                    {/* Etiquetas: selecione itens na tabela ou digite direto no formulário */}
                    <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                      <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {selectedLabelIds.size > 0
                          ? `${selectedLabelIds.size} ${selectedLabelIds.size === 1 ? 'item selecionado' : 'itens selecionados'} para impressão`
                          : 'Selecione itens abaixo ou digite as etiquetas direto no formulário'}
                      </span>
                      <div className="flex items-center gap-2">
                        {selectedLabelIds.size > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedLabelIds(new Set())}
                            className={`text-xs font-semibold ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Limpar seleção
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsBrotherModalOpen(true)}
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2 transition-all cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Etiquetas {selectedLabelIds.size > 0 ? `(${selectedLabelIds.size})` : ''}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsSupplierLabelModalOpen(true)}
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2 transition-all cursor-pointer"
                        >
                          <Truck className="w-4 h-4" />
                          <span>Etiq Fornecedor</span>
                        </button>
                      </div>
                    </div>

                    {/* Row-by-Row Query Results Table */}
                    <ItemList
                      items={filteredItems}
                      selectedItem={selectedItem}
                      onSelectItem={(item) => handleOpenDetailModal(item, filteredItems)}
                      theme={theme}
                      selectedLabelIds={selectedLabelIds}
                      onToggleLabelSelect={handleToggleLabelSelect}
                      onToggleSelectAllPage={handleToggleSelectAllPage}
                    />
                  </div>

                  {/* Inline Selected Item Card (if user prefers inline viewing) */}
                  {selectedItem && !detailModalItem && (
                    <div>
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center ${
                          isDark ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          <Sparkles className="w-4 h-4 mr-2 text-indigo-500" />
                          Ficha Detalhada do Item Selecionado
                        </h3>
                        <span className="text-xs text-slate-500">
                          ID: <strong className="text-indigo-500">{selectedItem.idStock}</strong>
                        </span>
                      </div>
                      <DetailCard
                        item={selectedItem}
                        itemIndex={selectedIndex}
                        totalMatching={activeNavContextList.length}
                        onNextItem={handleNextItem}
                        onPrevItem={handlePrevItem}
                        onUpdateItem={handleUpdateItem}
                        theme={theme}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Pop-up Modal for Full Item Details */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-5xl my-8 max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl custom-scrollbar">
            <DetailCard
              item={detailModalItem}
              itemIndex={selectedIndex}
              totalMatching={activeNavContextList.length}
              onNextItem={handleNextItem}
              onPrevItem={handlePrevItem}
              onClose={() => {
                setDetailModalItem(null);
                setDetailModalContextList(null);
              }}
              onUpdateItem={handleUpdateItem}
              theme={theme}
            />
          </div>
        </div>
      )}

      {/* Google Sheets Sync Modal */}
      <GoogleSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        webhookUrl={webhookUrl}
        onSaveWebhookUrl={handleSaveWebhookUrl}
      />

      {/* Etiquetas Brother (avulsas a partir dos itens selecionados) */}
      <BrotherLabelModal
        isOpen={isBrotherModalOpen}
        onClose={() => setIsBrotherModalOpen(false)}
        selectedItems={selectedLabelItems}
        onPrinted={() => setSelectedLabelIds(new Set())}
        theme={theme}
      />

      {/* Etiquetas de Fornecedor (volumes) */}
      <SupplierLabelModal
        isOpen={isSupplierLabelModalOpen}
        onClose={() => setIsSupplierLabelModalOpen(false)}
        items={items}
        theme={theme}
      />

      {/* System Documentation & Manual PDF Modal */}
      <DocumentationModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
      />

      {/* Sheet Management Modal */}
      <SheetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUrl={sheetUrl}
        onSyncCustomUrl={(url) => {
          setSheetUrl(url);
          try {
            localStorage.setItem('app_sheet_url', url);
          } catch {}
          fetchSheetData(url);
        }}
        onLoadCustomData={handleLoadCustomData}
        isLoading={isLoading}
      />
    </div>
  );
}
