import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { Filters } from './components/Filters';
import { DetailCard } from './components/DetailCard';
import { ItemList } from './components/ItemList';
import { SheetModal } from './components/SheetModal';
import { GoogleSyncModal } from './components/GoogleSyncModal';
import { Dashboard } from './components/Dashboard';
import { KanbanAlerts } from './components/KanbanAlerts';
import { NegociarView } from './components/NegociarView';
import { StockItem, FilterState } from './types';
import { isAllowedWarrantyStatus, isItemUrgent } from './utils/statusUtils';
import { getItemPrimaryTimestamp } from './utils/dateUtils';
import { AlertTriangle, Sparkles, RefreshCw, Layers } from 'lucide-react';

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1daGWs2SPXQsN9YLJBggtyX0Wdqpv2kgBcB4mOUrhe7M/edit?gid=1870385864#gid=1870385864";

export default function App() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [source, setSource] = useState<'google_sheets' | 'fallback_sample' | 'custom_csv'>('google_sheets');
  const [statusMessage, setStatusMessage] = useState<string | undefined>();
  const [sheetUrl, setSheetUrl] = useState<string>(DEFAULT_SHEET_URL);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return localStorage.getItem('gs_webhook_url') || '';
  });
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  const [activeView, setActiveView] = useState<'consulta' | 'dash' | 'alertas' | 'negociar'>('consulta');
  const [selectedLocalidade, setSelectedLocalidade] = useState<string>('todas');
  const [availableLocalidades, setAvailableLocalidades] = useState<string[]>([]);
  const [totalSheetRows, setTotalSheetRows] = useState<number>(0);

  const [filters, setFilters] = useState<FilterState>({
    idStock: '',
    cliente: '',
    searchTerm: ''
  });

  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [detailModalItem, setDetailModalItem] = useState<StockItem | null>(null);

  // Fetch data from server
  const fetchSheetData = async (urlToFetch?: string, locToFetch?: string) => {
    setIsLoading(true);
    setStatusMessage(undefined);

    try {
      const targetUrl = urlToFetch || sheetUrl;
      const targetLoc = locToFetch !== undefined ? locToFetch : selectedLocalidade;
      const res = await fetch(`/api/sheet-data?url=${encodeURIComponent(targetUrl)}&localidade=${encodeURIComponent(targetLoc)}`);
      
      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        console.warn('Servidor retornou resposta não-JSON ou erro. Utilizando dados de contingência.');
        setStatusMessage('Não foi possível conectar ao servidor da planilha online no momento. Exibindo dados locais.');
        return;
      }

      const json = await res.json();

      if (json.data && Array.isArray(json.data)) {
        setItems(json.data);
        setSource(json.source || 'google_sheets');
        if (json.totalRows) setTotalSheetRows(json.totalRows);
        if (json.availableLocalidades) setAvailableLocalidades(json.availableLocalidades);

        if (json.message) {
          setStatusMessage(json.message);
        }
        if (json.data.length > 0) {
          setSelectedItem(json.data[0]);
        } else {
          setSelectedItem(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch sheet data:', error);
      setStatusMessage('Erro ao comunicar com o servidor. Exibindo dados locais.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSheetData();
  }, [selectedLocalidade]);

  // Get list of unique clients for filter dropdown
  const clients = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.cliente && i.cliente.trim()) {
        set.add(i.cliente.trim());
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // Get list of stock IDs for suggestions
  const stockIds = useMemo(() => {
    return items.map(i => i.idStock).filter(Boolean);
  }, [items]);

  // Filter items based on user inputs
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Filter by ID STOCK
      if (filters.idStock && filters.idStock.trim()) {
        const cleanFilter = filters.idStock.toLowerCase().trim();
        const cleanId = item.idStock.toLowerCase().trim();
        if (!cleanId.includes(cleanFilter)) {
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
        const combinedText = `
          ${item.idStock} 
          ${item.cliente} 
          ${item.descricao} 
          ${item.codigo} 
          ${item.marca} 
          ${item.fornecedor} 
          ${item.novoFornecedorFilial} 
          ${item.statusDevolucao} 
          ${item.observacoesGerais}
          ${item.notaFiscalSaida || ''}
        `.toLowerCase();

        if (!combinedText.includes(term)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => getItemPrimaryTimestamp(b) - getItemPrimaryTimestamp(a));
  }, [items, filters]);

  // Sync selectedItem with active search results safely
  useEffect(() => {
    if (filteredItems.length > 0) {
      const stillInList = filteredItems.find(i => i.idStock === selectedItem?.idStock);
      if (stillInList) {
        if (selectedItem !== stillInList) {
          setSelectedItem(stillInList);
        }
      } else {
        if (selectedItem !== filteredItems[0]) {
          setSelectedItem(filteredItems[0]);
        }
      }
    } else {
      if (selectedItem !== null) {
        setSelectedItem(null);
      }
    }
  }, [filteredItems, selectedItem]);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleSaveWebhookUrl = (url: string) => {
    setWebhookUrl(url);
    localStorage.setItem('gs_webhook_url', url);
  };

  const syncItemsToServer = async (itemsToSync: StockItem[]) => {
    try {
      await fetch('/api/update-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsToSync,
          webhookUrl: webhookUrl || undefined
        })
      });
    } catch (err) {
      console.error('Failed to sync items to server:', err);
    }
  };

  const handleUpdateItem = (updatedItem: StockItem) => {
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

  // Find index of current selected item inside filtered results for next/prev buttons
  const selectedIndex = useMemo(() => {
    if (!selectedItem) return 0;
    const idx = filteredItems.findIndex(i => i.idStock === selectedItem.idStock);
    return idx >= 0 ? idx : 0;
  }, [filteredItems, selectedItem]);

  const handleNextItem = () => {
    if (filteredItems.length === 0) return;
    const nextIdx = (selectedIndex + 1) % filteredItems.length;
    setSelectedItem(filteredItems[nextIdx]);
  };

  const handlePrevItem = () => {
    if (filteredItems.length === 0) return;
    const prevIdx = (selectedIndex - 1 + filteredItems.length) % filteredItems.length;
    setSelectedItem(filteredItems[prevIdx]);
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Header Bar */}
      <Header
        onSync={() => fetchSheetData()}
        isLoading={isLoading}
        source={source}
        message={statusMessage}
        totalItems={items.length}
        onOpenSheetModal={() => setIsModalOpen(true)}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        hasWebhookConfigured={!!webhookUrl}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Active Warranty Status Filter Banner */}
        <div className="bg-indigo-950/40 border border-indigo-800/60 rounded-xl p-3 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-200">
          <div className="flex items-center space-x-2.5 flex-wrap">
            <span className="p-1.5 bg-indigo-900/80 rounded-lg text-indigo-400 font-bold flex-shrink-0">🛡️</span>
            <span className="font-medium text-slate-300">
              Leitura de Status de Garantia Ativa
            </span>
            <span className="text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
              {totalSheetRows > 0 ? `${totalSheetRows.toLocaleString('pt-BR')} itens de garantia identificados` : `${items.length} itens de garantia`}
            </span>

            <div className="flex items-center space-x-1.5 ml-2">
              <span className="text-slate-400 font-medium">Localidade:</span>
              <select
                value={selectedLocalidade}
                onChange={(e) => setSelectedLocalidade(e.target.value)}
                className="bg-indigo-950 border border-indigo-700/80 rounded-lg px-2.5 py-1 text-xs text-white font-bold focus:ring-1 focus:ring-indigo-400 outline-none cursor-pointer"
              >
                <option value="todas">Todas as Localidades ({totalSheetRows > 0 ? totalSheetRows.toLocaleString('pt-BR') : items.length} itens)</option>
                {availableLocalidades.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {selectedLocalidade !== 'todas' && (
              <button
                onClick={() => setSelectedLocalidade('todas')}
                className="text-[11px] text-indigo-400 hover:text-white underline font-semibold transition-colors"
              >
                Ver Todas as Localidades
              </button>
            )}
            <span className="text-[11px] text-indigo-300/80 bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-700/50 hidden sm:inline">
              Filtro por Coluna Status Devolução
            </span>
          </div>
        </div>

        {/* Status Alert Banner if in Fallback or Notice */}
        {statusMessage && (
          <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3.5 mb-6 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="underline hover:text-white ml-2 flex-shrink-0 font-semibold"
            >
              Configurar Planilha
            </button>
          </div>
        )}

        {/* View Switch: Dashboard vs Alertas vs Negociar vs Consulta */}
        {activeView === 'dash' ? (
          <Dashboard
            items={items}
            onSelectItem={(item) => {
              setSelectedItem(item);
              setDetailModalItem(item);
            }}
          />
        ) : activeView === 'alertas' ? (
          <KanbanAlerts
            items={items}
            onSelectItem={(item) => {
              setSelectedItem(item);
              setDetailModalItem(item);
            }}
          />
        ) : activeView === 'negociar' ? (
          <NegociarView
            items={items}
            onSelectItem={(item) => {
              setSelectedItem(item);
              setDetailModalItem(item);
            }}
            onBatchUpdateStatus={handleBatchUpdateStatus}
          />
        ) : (
          <>
            {/* Stats Summary Bar */}
            <StatsOverview items={items} />

            {/* Search & Filter Controls */}
            <Filters
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              clients={clients}
              stockIds={stockIds}
              itemsCount={filteredItems.length}
              totalItems={items.length}
              allItems={items}
              onSelectItemById={handleSelectById}
            />

            {/* Loading Spinner */}
            {isLoading ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center my-8">
                <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-300">
                  Carregando dados da planilha Google Sheets...
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Buscando e organizando colunas de estoque e devoluções.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Row-by-Row Query Results Table */}
                <ItemList
                  items={filteredItems}
                  selectedItem={selectedItem}
                  onSelectItem={(item) => {
                    setSelectedItem(item);
                    setDetailModalItem(item);
                  }}
                />

                {/* Inline Selected Item Card (if user prefers inline viewing) */}
                {selectedItem && !detailModalItem && (
                  <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
                        <Sparkles className="w-4 h-4 mr-2 text-indigo-400" />
                        Ficha Detalhada do Item Selecionado
                      </h3>
                      <span className="text-xs text-slate-500">
                        ID: <strong className="text-indigo-400">{selectedItem.idStock}</strong>
                      </span>
                    </div>
                    <DetailCard
                      item={selectedItem}
                      itemIndex={selectedIndex}
                      totalMatching={filteredItems.length}
                      onNextItem={handleNextItem}
                      onPrevItem={handlePrevItem}
                      onUpdateItem={handleUpdateItem}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Pop-up Modal for Full Item Details */}
      {detailModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-5xl my-8 max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl custom-scrollbar">
            <DetailCard
              item={detailModalItem}
              itemIndex={selectedIndex}
              totalMatching={filteredItems.length}
              onNextItem={() => {
                if (filteredItems.length === 0) return;
                const nextIdx = (selectedIndex + 1) % filteredItems.length;
                setSelectedItem(filteredItems[nextIdx]);
                setDetailModalItem(filteredItems[nextIdx]);
              }}
              onPrevItem={() => {
                if (filteredItems.length === 0) return;
                const prevIdx = (selectedIndex - 1 + filteredItems.length) % filteredItems.length;
                setSelectedItem(filteredItems[prevIdx]);
                setDetailModalItem(filteredItems[prevIdx]);
              }}
              onClose={() => setDetailModalItem(null)}
              onUpdateItem={handleUpdateItem}
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

      {/* Sheet Management Modal */}
      <SheetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUrl={sheetUrl}
        onSyncCustomUrl={(url) => {
          setSheetUrl(url);
          fetchSheetData(url);
        }}
        onLoadCustomData={handleLoadCustomData}
        isLoading={isLoading}
      />
    </div>
  );
}
