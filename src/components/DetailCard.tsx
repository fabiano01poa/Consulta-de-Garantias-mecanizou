import React, { useState } from 'react';
import { 
  RefreshCw, 
  AlertCircle, 
  Copy, 
  Check, 
  Package, 
  User, 
  Tag, 
  Boxes, 
  Truck, 
  Building2, 
  FileText, 
  MessageSquare,
  ShieldCheck,
  History,
  Info,
  Calendar,
  Clock,
  Flame,
  X,
  Edit3,
  Save,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { StockItem, HistoryEntry } from '../types';
import { calculateDaysSinceDeparture, calculateDaysInStock, getDaysFromDate } from '../utils/dateUtils';
import { 
  OFFICIAL_WARRANTY_STATUSES, 
  OFFICIAL_OBS_STATUS_OPTIONS, 
  getAllObsStatusOptions,
  isFinalizedStatus, 
  isItemUrgent, 
  cleanNotaFiscal 
} from '../utils/statusUtils';
import { TimelineBar } from './TimelineBar';
import { UnifiedProcessTimeline } from './UnifiedProcessTimeline';
import { getItemTotalValue } from './NegociarView';

interface DetailCardProps {
  item: StockItem;
  itemIndex?: number;
  totalMatching?: number;
  onNextItem?: () => void;
  onPrevItem?: () => void;
  onClose?: () => void;
  onUpdateItem?: (updatedItem: StockItem) => void;
  theme?: 'dark' | 'light';
}

export const DetailCard: React.FC<DetailCardProps> = ({
  item,
  itemIndex,
  totalMatching,
  onNextItem,
  onPrevItem,
  onClose,
  onUpdateItem,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  // Local edit form state
  const [editStatus, setEditStatus] = useState<string>(item.statusDevolucao || 'Garantia: Validar');
  const [editObsStatusDevolucao, setEditObsStatusDevolucao] = useState<string>(item.obsStatusDevolucao || '');
  const [editObs, setEditObs] = useState<string>(item.observacoesGerais || '');
  const [editObsNf, setEditObsNf] = useState<string>(item.obsNotaFiscal || '');
  const [editNfSaida, setEditNfSaida] = useState<string>(item.notaFiscalSaida || '');
  const [editNfOrigem, setEditNfOrigem] = useState<string>(item.nfOrigem || '');
  const [editUrgent, setEditUrgent] = useState<boolean>(isItemUrgent(item));
  const [editUltimaInteracao, setEditUltimaInteracao] = useState<string>(item.ultimaInteracao || '');
  const [editNota, setEditNota] = useState<string>(''); // Nueva nota / comentario de interacción

  React.useEffect(() => {
    setEditStatus(item.statusDevolucao || 'Garantia: Validar');
    setEditObsStatusDevolucao(item.obsStatusDevolucao || '');
    setEditObs(item.observacoesGerais || '');
    setEditObsNf(item.obsNotaFiscal || '');
    setEditNfSaida(item.notaFiscalSaida || '');
    setEditNfOrigem(item.nfOrigem || '');
    setEditUrgent(isItemUrgent(item));
    setEditUltimaInteracao(item.ultimaInteracao || '');
  }, [item]);

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isFinalized = isFinalizedStatus(item.statusDevolucao);
  const isUrgent = isItemUrgent(item);

  // If finalized, days counter is stopped (0 or completed)
  const daysInfo = isFinalized 
    ? { days: 0, formattedText: 'Finalizado (0 dias em aberto)', status: 'normal' as const }
    : calculateDaysSinceDeparture(item.dataSaida);
  
  const stockDaysInfo = isFinalized 
    ? { days: 0, formattedText: 'Finalizado (0 dias em aberto)', status: 'normal' as const }
    : calculateDaysInStock(item.dataRecebimento);

  const daysInStockVal = isFinalized ? 0 : getDaysFromDate(item.dataRecebimento);
  const daysSinceDepartureVal = isFinalized ? 0 : getDaysFromDate(item.dataSaida);

  const isExchange = item.statusDevolucao?.toLowerCase().includes('troca') || 
                     item.observacoesGerais?.toLowerCase().includes('troca');

  const handleToggleUrgent = () => {
    const newUrgent = !isUrgent;
    const nowStr = new Date().toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });

    const actionText = newUrgent ? 'Item marcado como URGENTE 🔥' : 'Urgência removida do item';
    const newHistory: HistoryEntry = {
      data: nowStr,
      acao: actionText,
      detalhe: 'Alteração rápida de marcação de urgência'
    };

    let newStatus = item.statusDevolucao;
    if (!newUrgent && newStatus?.toLowerCase().includes('urgente')) {
      newStatus = 'Garantia: Validar';
    }

    const todayShort = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const interacaoText = `${todayShort} - ${actionText}`;

    const updatedItem: StockItem = {
      ...item,
      urgente: newUrgent,
      statusDevolucao: newStatus,
      dataUltimaAlteracao: nowStr,
      ultimaInteracao: interacaoText,
      historicoAlteracoes: [newHistory, ...(item.historicoAlteracoes || [])]
    };

    setEditUrgent(newUrgent);
    setEditUltimaInteracao(interacaoText);
    if (newStatus) setEditStatus(newStatus);

    if (onUpdateItem) {
      onUpdateItem(updatedItem);
    }
  };

  const handleSaveInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    const nowStr = new Date().toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
    const todayShort = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const changes: string[] = [];
    if (editStatus !== item.statusDevolucao) {
      changes.push(`Status: "${item.statusDevolucao || 'N/A'}" → "${editStatus}"`);
    }
    if (editObsStatusDevolucao !== (item.obsStatusDevolucao || '')) {
      changes.push(`Obs Status Devolução: "${editObsStatusDevolucao}"`);
    }
    if (editObs !== item.observacoesGerais) {
      changes.push(`Obs gerais alteradas`);
    }
    if (editObsNf !== (item.obsNotaFiscal || '')) {
      changes.push(`Obs NF alterada`);
    }
    if (editNfSaida !== (item.notaFiscalSaida || '')) {
      changes.push(`NF Saída: "${editNfSaida}"`);
    }
    if (editNfOrigem !== (item.nfOrigem || '')) {
      changes.push(`NF Origem: "${editNfOrigem}"`);
    }
    if (editUrgent !== isUrgent) {
      changes.push(editUrgent ? 'Marcado Urgente' : 'Desmarcado Urgente');
    }
    if (editNota.trim()) {
      changes.push(`Nota: "${editNota.trim()}"`);
    }

    const actionText = changes.length > 0 ? changes.join(' | ') : 'Interação registrada';
    
    // If user provided a custom text in editUltimaInteracao that differs from item.ultimaInteracao and isn't empty, use that, else auto-generate
    const finalInteracao = editUltimaInteracao && editUltimaInteracao !== item.ultimaInteracao 
      ? editUltimaInteracao 
      : `${todayShort} - ${actionText}`;

    const newHistory: HistoryEntry = {
      data: nowStr,
      acao: actionText,
      detalhe: editNota.trim() || editObsStatusDevolucao || editObs || editObsNf || undefined
    };

    const updatedItem: StockItem = {
      ...item,
      statusDevolucao: editStatus,
      obsStatusDevolucao: editObsStatusDevolucao,
      observacoesGerais: editObs,
      obsNotaFiscal: editObsNf,
      notaFiscalSaida: editNfSaida,
      nfOrigem: editNfOrigem,
      urgente: editUrgent,
      dataUltimaAlteracao: nowStr,
      ultimaInteracao: finalInteracao,
      historicoAlteracoes: [newHistory, ...(item.historicoAlteracoes || [])]
    };

    setEditUltimaInteracao(finalInteracao);

    if (onUpdateItem) {
      onUpdateItem(updatedItem);
    }

    setEditNota('');
    setIsEditing(false);
  };

  return (
    <div className={`border rounded-2xl shadow-2xl overflow-hidden transition-all ${
      isDark 
        ? 'bg-[#111827] border-slate-800 text-slate-100' 
        : 'bg-white border-slate-200 text-slate-800 shadow-slate-200/50'
    }`}>
      {/* Top Header Card Title & Controls */}
      <div className={`px-4 sm:px-6 py-3.5 flex items-center justify-between flex-wrap gap-2 border-b ${
        isDark ? 'bg-[#0f172a] border-slate-800/90' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg border ${
            isDark ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border-indigo-200'
          }`}>
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <span>Ficha Completa do Item</span>
              {isUrgent && (
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse border ${
                  isDark ? 'bg-red-950 text-red-300 border-red-700' : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  <Flame className="w-3 h-3 text-red-500" /> URGENTE
                </span>
              )}
              {isFinalized && (
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                  isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> FINALIZADO
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Quick Urgency Toggle Button */}
          <button
            onClick={handleToggleUrgent}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-sm ${
              isUrgent 
                ? isDark ? 'bg-red-900/80 hover:bg-red-800 text-red-100 border-red-600' : 'bg-red-100 hover:bg-red-200 text-red-800 border-red-300'
                : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
            title="Marcar / Desmarcar como Urgente"
          >
            <Flame className={`w-3.5 h-3.5 ${isUrgent ? 'text-red-500 fill-red-500' : isDark ? 'text-slate-400' : 'text-slate-500'}`} />
            {isUrgent ? 'Urgência Ativada' : 'Marcar Urgência'}
          </button>

          {/* Edit / Interaction Toggle Button */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {isEditing ? 'Cancelar Edição' : 'Registrar Interação'}
          </button>

          {/* Counter controls if multiple items matched */}
          {totalMatching && totalMatching > 1 && (
            <div className={`flex items-center space-x-2 text-xs pl-2 border-l ${
              isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
            }`}>
              <span>Item {(itemIndex ?? 0) + 1} de {totalMatching}</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={onPrevItem}
                  className={`p-1 rounded border transition-colors ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/60' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                  title="Anterior"
                >
                  ‹
                </button>
                <button
                  onClick={onNextItem}
                  className={`p-1 rounded border transition-colors ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/60' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                  title="Próximo"
                >
                  ›
                </button>
              </div>
            </div>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg border transition-colors ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-300'
              }`}
              title="Fechar Detalhes"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Interactive Editing Form Box */}
        {isEditing && (
          <form onSubmit={handleSaveInteraction} className={`border rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 animate-fadeIn ${
            isDark ? 'bg-indigo-950/60 border-indigo-800/80' : 'bg-indigo-50/50 border-indigo-200'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDark ? 'border-indigo-900/80 text-indigo-300' : 'border-indigo-200 text-indigo-900'
            }`}>
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Painel de Atualização e Interação do Item
                </h3>
              </div>
              <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                A data da última alteração será atualizada automaticamente
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Change Status */}
              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Status da Devolução
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className={`w-full text-xs rounded-xl px-3 py-2 outline-none font-medium border ${
                    isDark ? 'bg-slate-900 border-indigo-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  {OFFICIAL_WARRANTY_STATUSES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                  {editStatus && !OFFICIAL_WARRANTY_STATUSES.includes(editStatus as any) && (
                    <option value={editStatus}>{editStatus}</option>
                  )}
                </select>
              </div>

              {/* Observação do Status de Devolução Dropdown */}
              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 flex items-center justify-between ${
                  isDark ? 'text-indigo-300' : 'text-indigo-900'
                }`}>
                  <span>Obs Status Devolução</span>
                  <span className={`text-[10px] font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Lista padronizada</span>
                </label>
                {(() => {
                  const currentOptions = getAllObsStatusOptions([item]);
                  const isPreset = currentOptions.includes(editObsStatusDevolucao);
                  return (
                    <>
                      <select
                        value={isPreset ? editObsStatusDevolucao : (editObsStatusDevolucao ? '__custom__' : '')}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            if (!editObsStatusDevolucao) setEditObsStatusDevolucao('Personalizado: ');
                          } else {
                            setEditObsStatusDevolucao(e.target.value);
                          }
                        }}
                        className={`w-full text-xs rounded-xl px-3 py-2 outline-none font-medium border ${
                          isDark ? 'bg-slate-900 border-indigo-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        <option value="">-- Selecione Observação de Status --</option>
                        {currentOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                        {editObsStatusDevolucao && !currentOptions.includes(editObsStatusDevolucao) && (
                          <option value="__custom__">Personalizado: {editObsStatusDevolucao}</option>
                        )}
                        <option value="__custom__">+ Inserir Outra Observação...</option>
                      </select>
                      {(!isPreset || editObsStatusDevolucao === '__custom__') && (
                        <input
                          type="text"
                          value={editObsStatusDevolucao === '__custom__' ? '' : editObsStatusDevolucao}
                          onChange={(e) => setEditObsStatusDevolucao(e.target.value)}
                          placeholder="Digite a observação de status..."
                          className={`w-full mt-1.5 text-xs rounded-lg px-2.5 py-1.5 outline-none font-sans border ${
                            isDark ? 'bg-slate-950 border-indigo-700 text-slate-100' : 'bg-white border-indigo-300 text-slate-800'
                          }`}
                        />
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Nota Fiscal de Saída, NF Origem & Urgência */}
              <div className="space-y-2">
                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    Nota Fiscal de Saída
                  </label>
                  <input
                    type="text"
                    value={editNfSaida}
                    onChange={(e) => setEditNfSaida(e.target.value)}
                    placeholder="Ex: NF-e 10923..."
                    className={`w-full text-xs rounded-xl px-3 py-2 outline-none font-mono border ${
                      isDark ? 'bg-slate-900 border-indigo-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-bold uppercase mb-1 ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    NF Origem
                  </label>
                  <input
                    type="text"
                    value={editNfOrigem}
                    onChange={(e) => setEditNfOrigem(e.target.value)}
                    placeholder="Ex: NF-e original..."
                    className={`w-full text-xs rounded-xl px-3 py-2 outline-none font-mono border ${
                      isDark ? 'bg-slate-900 border-indigo-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className={`flex items-center space-x-2.5 cursor-pointer px-3.5 py-1.5 rounded-xl border w-full ${
                    isDark ? 'bg-slate-900 border-indigo-800/80' : 'bg-white border-slate-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={editUrgent}
                      onChange={(e) => setEditUrgent(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-slate-950 border-slate-700"
                    />
                    <span className={`text-xs font-bold flex items-center gap-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      <Flame className={`w-3.5 h-3.5 ${editUrgent ? 'text-red-500 fill-red-500' : 'text-slate-400'}`} />
                      Marcar como Urgente
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Obs Nota Fiscal */}
              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Obs Nota Fiscal
                </label>
                <textarea
                  rows={2}
                  value={editObsNf}
                  onChange={(e) => setEditObsNf(e.target.value)}
                  placeholder="Anotações referentes à nota fiscal de origem ou envio..."
                  className={`w-full text-xs rounded-xl p-3 outline-none font-sans border ${
                    isDark ? 'bg-slate-900 border-indigo-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>

              {/* Observações Gerais */}
              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Observações Gerais do Item / Motivo
                </label>
                <textarea
                  rows={2}
                  value={editObs}
                  onChange={(e) => setEditObs(e.target.value)}
                  placeholder="Descreva o motivo, laudo do fabricante ou observações gerais..."
                  className={`w-full text-xs rounded-xl p-3 outline-none font-sans border ${
                    isDark ? 'bg-slate-900 border-indigo-800 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            </div>

            {/* Adicionar Nova Nota / Interação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${
                  isDark ? 'text-indigo-300' : 'text-indigo-900'
                }`}>
                  Campo "Última Interação" (Será enviado para a planilha)
                </label>
                <input
                  type="text"
                  value={editUltimaInteracao}
                  onChange={(e) => setEditUltimaInteracao(e.target.value)}
                  placeholder="Ex: 31/07 - registro feito no campo obs..."
                  className={`w-full text-xs rounded-xl px-3 py-2 outline-none font-mono border ${
                    isDark ? 'bg-slate-900 border-indigo-800/90 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-[11px] font-bold uppercase mb-1 ${
                  isDark ? 'text-indigo-300' : 'text-indigo-900'
                }`}>
                  Nova Interação / Comentário para o Histórico (opcional)
                </label>
                <input
                  type="text"
                  value={editNota}
                  onChange={(e) => setEditNota(e.target.value)}
                  placeholder="Ex: Ligado para a fábrica cobrando laudo, previsão para 02/08..."
                  className={`w-full text-xs rounded-xl px-3 py-2 outline-none border ${
                    isDark ? 'bg-slate-900 border-indigo-800/90 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Alteração & Atualizar Data</span>
              </button>
            </div>
          </form>
        )}
        
        {/* Quick Summary Banners */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Banner 1: Status Banner */}
          <div className={`border rounded-xl p-3.5 flex items-start space-x-3 shadow-sm ${
            isDark ? 'bg-[#2a133d]/70 border-purple-800/70' : 'bg-purple-50/70 border-purple-200'
          }`}>
            <div className={`p-2 rounded-lg mt-0.5 ${
              isDark ? 'bg-purple-900/60 text-purple-300' : 'bg-purple-100 text-purple-700'
            }`}>
              <RefreshCw className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-xs sm:text-sm font-bold tracking-wide flex items-center gap-2 flex-wrap ${
                isDark ? 'text-purple-200' : 'text-purple-900'
              }`}>
                <span>{isExchange ? 'Cliente deseja TROCAR a peça' : `Status: ${item.statusDevolucao || 'Em Processamento'}`}</span>
                {isFinalized && (
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                    isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}>
                    Finalizado
                  </span>
                )}
              </h3>
              <p className={`text-[11px] mt-0.5 leading-relaxed truncate ${isDark ? 'text-purple-300/80' : 'text-purple-700'}`}>
                {item.obsStatusDevolucao || (isExchange ? 'Solicitação de troca de peça.' : 'Processo registrado.')}
              </p>
            </div>
          </div>

          {/* Banner 2: ID Stock Banner */}
          <div className={`border rounded-xl p-3.5 flex items-start space-x-3 shadow-sm ${
            isDark ? 'bg-[#0f2847]/70 border-blue-800/70' : 'bg-blue-50/70 border-blue-200'
          }`}>
            <div className={`p-2 rounded-lg mt-0.5 ${
              isDark ? 'bg-blue-900/60 text-blue-300' : 'bg-blue-100 text-blue-700'
            }`}>
              <Tag className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-xs sm:text-sm font-bold tracking-wide flex items-center justify-between ${isDark ? 'text-blue-200' : 'text-blue-900'}`}>
                <span>ID Stock: {item.idStock || '—'}</span>
                {item.idStock && (
                  <button
                    onClick={() => copyToClipboard(item.idStock, 'idStockHeader')}
                    className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                      isDark ? 'bg-blue-950 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-800 border-blue-200'
                    }`}
                  >
                    {copiedField === 'idStockHeader' ? 'Copiado!' : 'Copiar'}
                  </button>
                )}
              </h3>
              <p className={`text-[11px] mt-0.5 leading-relaxed truncate ${isDark ? 'text-blue-300/80' : 'text-blue-700'}`}>
                Identificação única do item no estoque.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. SEÇÃO: DADOS DA PEÇA (SEMPRE BEM NO INÍCIO DO CARD) */}
        {/* ========================================================================= */}
        <div className={`border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {/* Header da Seção */}
          <div className={`flex items-center justify-between border-b pb-3 ${
            isDark ? 'border-slate-800 text-slate-100' : 'border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center space-x-2.5">
              <div className={`p-1.5 rounded-lg ${
                isDark ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
              }`}>
                <Package className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider">
                1. Dados da Peça
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                isDark ? 'bg-indigo-950 text-indigo-300 border-indigo-800' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}>
                {item.quantEstoque || '1'} {parseInt(item.quantEstoque || '1') === 1 ? 'Unidade' : 'Unidades'}
              </span>
            </div>
          </div>

          {/* Grid de Dados da Peça */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Nome da Peça / Descrição (Destaque Maior) */}
            <div className={`p-3.5 rounded-xl border md:col-span-2 lg:col-span-3 ${
              isDark ? 'bg-slate-950/80 border-slate-800/90' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`text-[11px] font-semibold tracking-wider uppercase flex items-center mb-1 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <Package className="w-3.5 h-3.5 mr-1.5 text-indigo-500" /> NOME DA PEÇA / DESCRIÇÃO
              </div>
              <div className={`text-base sm:text-lg font-bold uppercase tracking-tight ${
                isDark ? 'text-slate-100' : 'text-slate-900'
              }`}>
                {item.descricao || '—'}
              </div>
            </div>

            {/* Marca & Código de Fábrica */}
            <div className={`p-3 rounded-xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`text-[11px] font-semibold tracking-wider uppercase flex items-center mb-1 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <Tag className="w-3.5 h-3.5 mr-1.5 text-indigo-500" /> MARCA - CÓDIGO DE FÁBRICA
              </div>
              <div className={`text-sm sm:text-base font-bold uppercase ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {item.marca ? `${item.marca} - ` : ''}{item.codigo || '—'}
              </div>
            </div>

            {/* ID STOCK */}
            <div className={`p-3 rounded-xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`text-[11px] font-semibold tracking-wider uppercase flex items-center justify-between mb-1 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <span className="flex items-center">
                  <Tag className="w-3.5 h-3.5 mr-1.5 text-indigo-500" /> ID STOCK
                </span>
                <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Código no Estoque</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm sm:text-base font-bold tracking-wide font-mono ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}>
                  {item.idStock || '—'}
                </span>
                {item.idStock && (
                  <button
                    onClick={() => copyToClipboard(item.idStock, 'idStock')}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
                    }`}
                    title="Copiar ID STOCK"
                  >
                    {copiedField === 'idStock' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Valor do Item (PDF de Envio / Estoque) */}
            <div className={`p-3 rounded-xl border ${
              isDark ? 'bg-emerald-950/40 border-emerald-800/80' : 'bg-emerald-50/70 border-emerald-200'
            }`}>
              <div className="text-[11px] font-bold tracking-wider text-emerald-600 uppercase flex items-center mb-1">
                <DollarSign className="w-3.5 h-3.5 mr-1 text-emerald-600" /> VALOR TOTAL EM ESTOQUE
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`text-base font-extrabold font-mono ${
                  isDark ? 'text-emerald-300' : 'text-emerald-800'
                }`}>
                  {getItemTotalValue(item).formatted}
                </span>
                {item.valorUnitario && (
                  <span className={`text-[11px] font-mono ${
                    isDark ? 'text-emerald-400/80' : 'text-emerald-700'
                  }`}>
                    Unit: {item.valorUnitario}
                  </span>
                )}
              </div>
            </div>

            {/* Quantidade em Estoque */}
            <div className={`p-3 rounded-xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`text-[11px] font-semibold tracking-wider uppercase flex items-center mb-1 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <Boxes className="w-3.5 h-3.5 mr-1.5 text-indigo-500" /> QUANT. EM ESTOQUE
              </div>
              <div className={`text-sm font-bold flex items-center ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                <span>{item.quantEstoque || '0'} {parseInt(item.quantEstoque || '0') === 1 ? 'unidade' : 'unidades'}</span>
                <span className={`ml-2 px-1.5 py-0.5 text-[10px] rounded border font-normal ${
                  isDark ? 'bg-indigo-950 text-indigo-300 border-indigo-800/80' : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                }`}>
                  Em estoque
                </span>
              </div>
            </div>

            {/* Localidade */}
            <div className={`p-3 rounded-xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`text-[11px] font-semibold tracking-wider uppercase flex items-center mb-1 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <Building2 className="w-3.5 h-3.5 mr-1.5 text-indigo-500" /> LOCALIDADE
              </div>
              <div className={`text-sm font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>
                {item.localidade || 'Mecanizou - Garantia'}
              </div>
            </div>

            {/* Obs Nota Fiscal */}
            <div className={`p-3.5 rounded-xl border md:col-span-2 lg:col-span-3 ${
              isDark ? 'bg-amber-950/20 border-amber-800/60' : 'bg-amber-50/70 border-amber-200'
            }`}>
              <div className="text-[11px] font-semibold tracking-wider text-amber-500 uppercase flex items-center justify-between mb-1">
                <span className="flex items-center font-bold">
                  <FileText className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> OBS NOTA FISCAL
                </span>
                {!isEditing && (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`text-[10px] font-bold underline flex items-center gap-1 cursor-pointer transition-colors ${
                      isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'
                    }`}
                    title="Clique para editar"
                  >
                    <Edit3 className="w-3 h-3" /> Editar no topo
                  </button>
                )}
              </div>
              <div className={`text-xs sm:text-sm font-medium leading-relaxed font-mono ${
                isDark ? 'text-amber-100' : 'text-amber-900'
              }`}>
                {item.obsNotaFiscal || 'Nenhuma observação de Nota Fiscal cadastrada.'}
              </div>
            </div>

            {/* Dados do Fornecedor (Abaixo da Obs Nota Fiscal) */}
            <div className={`p-3.5 rounded-xl border md:col-span-2 lg:col-span-3 ${
              isDark ? 'bg-purple-950/20 border-purple-800/60' : 'bg-purple-50/70 border-purple-200'
            }`}>
              <div className="text-[11px] font-semibold tracking-wider text-purple-500 uppercase flex items-center mb-2">
                <Truck className="w-3.5 h-3.5 mr-1.5 text-purple-500" /> DADOS DO FORNECEDOR
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className={`text-[10px] font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Fornecedor</div>
                  <div className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{item.fornecedor || '—'}</div>
                </div>
                <div>
                  <div className={`text-[10px] font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Novo Fornecedor / Filial</div>
                  <div className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{item.novoFornecedorFilial || '—'}</div>
                </div>
                <div>
                  <div className={`text-[10px] font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Fornecedor Original</div>
                  <div className={`text-sm font-semibold font-mono ${item.fornecedorOriginal ? (isDark ? 'text-amber-300' : 'text-amber-800') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                    {item.fornecedorOriginal || 'Não informado'}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SEÇÃO: DADOS DO CLIENTE */}
        {/* ========================================================================= */}
        <div className={`border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {/* Header da Seção */}
          <div className={`flex items-center justify-between border-b pb-3 ${
            isDark ? 'border-slate-800 text-slate-100' : 'border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center space-x-2.5">
              <div className={`p-1.5 rounded-lg ${
                isDark ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-50 text-blue-600'
              }`}>
                <User className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider">
                2. Dados do Cliente
              </h3>
            </div>
            {item.protocolo && (
              <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                isDark ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                Protocolo: {item.protocolo}
              </span>
            )}
          </div>

          {/* Grid de Dados do Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cliente / Mecânica */}
            <div className={`p-3.5 rounded-xl border md:col-span-2 ${
              isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`text-[11px] font-semibold tracking-wider uppercase flex items-center mb-1 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <User className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> CLIENTE / MECÂNICA
              </div>
              <div className={`text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {item.cliente || '—'}
              </div>
            </div>

            {/* Protocolo */}
            <div className={`p-3 rounded-xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`text-[11px] font-semibold tracking-wider uppercase flex items-center justify-between mb-1 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <span className="flex items-center">
                  <FileText className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> PROTOCOLO
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-amber-500 tracking-wide font-mono">
                  {item.protocolo || '—'}
                </span>
                {item.protocolo && (
                  <button
                    onClick={() => copyToClipboard(item.protocolo!, 'protocolo')}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
                    }`}
                    title="Copiar Protocolo"
                  >
                    {copiedField === 'protocolo' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* NF Origem & Data Compra (se houver) */}
            {item.nfOrigem && (
              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`text-[11px] font-semibold tracking-wider uppercase flex items-center mb-1 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <FileText className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> NOTA FISCAL DE ORIGEM
                </div>
                <div className={`text-sm font-bold font-mono ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
                  {cleanNotaFiscal(item.nfOrigem)}
                </div>
              </div>
            )}

            {item.dataCompra && (
              <div className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`text-[11px] font-semibold tracking-wider uppercase flex items-center mb-1 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> DATA DA COMPRA
                </div>
                <div className={`text-sm font-bold font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {item.dataCompra}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. SEÇÃO: LINHA DO TEMPO DO PROCESSO & HISTÓRICO */}
        {/* ========================================================================= */}
        <div className={`border rounded-2xl p-4 sm:p-5 shadow-sm space-y-5 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {/* Header da Seção */}
          <div className={`flex items-center justify-between border-b pb-3 ${
            isDark ? 'border-slate-800 text-slate-100' : 'border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center space-x-2.5">
              <div className={`p-1.5 rounded-lg ${
                isDark ? 'bg-indigo-600/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
              }`}>
                <History className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider">
                3. Linha do Tempo e Histórico do Processo
              </h3>
            </div>
            <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {(item.historicoAlteracoes?.length || 0)} interações registradas
            </span>
          </div>

          {/* Centralized Process Timeline Visualizer */}
          <UnifiedProcessTimeline item={item} theme={theme} />

          {/* Interações e Histórico de Alterações */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Registro Cronológico de Ações
              </h4>
            </div>

            {(!item.historicoAlteracoes || item.historicoAlteracoes.length === 0) ? (
              <div className={`rounded-xl p-4 border text-xs flex items-center justify-between ${
                isDark ? 'bg-slate-950/50 border-slate-800/60 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <span>Nenhuma alteração manual registrada nesta ficha até o momento.</span>
                <button
                  onClick={() => setIsEditing(true)}
                  className={`font-bold underline text-[11px] ${
                    isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'
                  }`}
                >
                  Adicionar primeira interação
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                {item.historicoAlteracoes.map((hist, hIdx) => (
                  <div 
                    key={`hist-${hIdx}`}
                    className={`border rounded-xl p-3 flex items-start space-x-3 text-xs ${
                      isDark ? 'bg-slate-950/80 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg border mt-0.5 ${
                      isDark ? 'bg-indigo-950 text-indigo-400 border-indigo-800/60' : 'bg-indigo-100 text-indigo-600 border-indigo-200'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{hist.acao}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          isDark ? 'text-indigo-300 bg-indigo-950/80 border-indigo-800/60' : 'text-indigo-700 bg-indigo-50 border-indigo-200'
                        }`}>
                          {hist.data}
                        </span>
                      </div>
                      {hist.detalhe && (
                        <p className={`text-[11px] mt-1 font-mono leading-relaxed p-2 rounded border ${
                          isDark ? 'text-slate-400 bg-slate-900/60 border-slate-800' : 'text-slate-600 bg-white border-slate-200'
                        }`}>
                          {hist.detalhe}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};


