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
  CheckCircle2
} from 'lucide-react';
import { StockItem, HistoryEntry } from '../types';
import { calculateDaysSinceDeparture, calculateDaysInStock, getDaysFromDate } from '../utils/dateUtils';
import { OFFICIAL_WARRANTY_STATUSES, isFinalizedStatus, isItemUrgent } from '../utils/statusUtils';
import { TimelineBar } from './TimelineBar';

interface DetailCardProps {
  item: StockItem;
  itemIndex?: number;
  totalMatching?: number;
  onNextItem?: () => void;
  onPrevItem?: () => void;
  onClose?: () => void;
  onUpdateItem?: (updatedItem: StockItem) => void;
}

export const DetailCard: React.FC<DetailCardProps> = ({
  item,
  itemIndex,
  totalMatching,
  onNextItem,
  onPrevItem,
  onClose,
  onUpdateItem
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  // Local edit form state
  const [editStatus, setEditStatus] = useState<string>(item.statusDevolucao || 'Garantia: Validar');
  const [editObs, setEditObs] = useState<string>(item.observacoesGerais || '');
  const [editObsNf, setEditObsNf] = useState<string>(item.obsNotaFiscal || '');
  const [editNfSaida, setEditNfSaida] = useState<string>(item.notaFiscalSaida || '');
  const [editUrgent, setEditUrgent] = useState<boolean>(isItemUrgent(item));
  const [editUltimaInteracao, setEditUltimaInteracao] = useState<string>(item.ultimaInteracao || '');
  const [editNota, setEditNota] = useState<string>(''); // Nueva nota / comentario de interacción

  React.useEffect(() => {
    setEditStatus(item.statusDevolucao || 'Garantia: Validar');
    setEditObs(item.observacoesGerais || '');
    setEditObsNf(item.obsNotaFiscal || '');
    setEditNfSaida(item.notaFiscalSaida || '');
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
      changes.push(`Status alterado de "${item.statusDevolucao || 'N/A'}" para "${editStatus}"`);
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
      detalhe: editNota.trim() || editObs || editObsNf || undefined
    };

    const updatedItem: StockItem = {
      ...item,
      statusDevolucao: editStatus,
      observacoesGerais: editObs,
      obsNotaFiscal: editObsNf,
      notaFiscalSaida: editNfSaida,
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
    <div className="bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all text-slate-100">
      {/* Top Header Card Title & Controls */}
      <div className="bg-[#0f172a] border-b border-slate-800/90 px-4 sm:px-6 py-3.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span>Ficha Completa do Item</span>
              <span className="text-indigo-400 font-mono font-bold">({item.idStock})</span>
              {isUrgent && (
                <span className="bg-red-950 text-red-300 border border-red-700 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <Flame className="w-3 h-3 text-red-400" /> URGENTE
                </span>
              )}
              {isFinalized && (
                <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> FINALIZADO
                </span>
              )}
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-100 uppercase truncate max-w-md">
              {item.descricao || 'Sem descrição'}
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Quick Urgency Toggle Button */}
          <button
            onClick={handleToggleUrgent}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-sm ${
              isUrgent 
                ? 'bg-red-900/80 hover:bg-red-800 text-red-100 border-red-600' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Marcar / Desmarcar como Urgente"
          >
            <Flame className={`w-3.5 h-3.5 ${isUrgent ? 'text-red-300 fill-red-400' : 'text-slate-400'}`} />
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
            <div className="flex items-center space-x-2 text-xs text-slate-400 pl-2 border-l border-slate-800">
              <span>Item {(itemIndex ?? 0) + 1} de {totalMatching}</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={onPrevItem}
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700/60 transition-colors"
                  title="Anterior"
                >
                  ‹
                </button>
                <button
                  onClick={onNextItem}
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700/60 transition-colors"
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
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
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
          <form onSubmit={handleSaveInteraction} className="bg-indigo-950/60 border border-indigo-800/80 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-indigo-900/80 pb-3">
              <div className="flex items-center space-x-2 text-indigo-300">
                <Edit3 className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Painel de Atualização e Interação do Item
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                A data da última alteração será atualizada automaticamente
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Change Status */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                  Status da Devolução
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-indigo-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-medium"
                >
                  {OFFICIAL_WARRANTY_STATUSES.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Nota Fiscal de Saída */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                  Nota Fiscal de Saída
                </label>
                <input
                  type="text"
                  value={editNfSaida}
                  onChange={(e) => setEditNfSaida(e.target.value)}
                  placeholder="Ex: NF-e 10923..."
                  className="w-full bg-slate-900 border border-indigo-800 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                />
              </div>

              {/* Urgência Check */}
              <div className="flex items-end pb-1">
                <label className="flex items-center space-x-2.5 cursor-pointer bg-slate-900 px-3.5 py-2 rounded-xl border border-indigo-800/80 w-full">
                  <input
                    type="checkbox"
                    checked={editUrgent}
                    onChange={(e) => setEditUrgent(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-slate-950 border-slate-700"
                  />
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    <Flame className={`w-3.5 h-3.5 ${editUrgent ? 'text-red-400 fill-red-400' : 'text-slate-400'}`} />
                    Marcar como Urgente
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Obs Nota Fiscal */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                  Obs Nota Fiscal
                </label>
                <textarea
                  rows={2}
                  value={editObsNf}
                  onChange={(e) => setEditObsNf(e.target.value)}
                  placeholder="Anotações referentes à nota fiscal de origem ou envio..."
                  className="w-full bg-slate-900 border border-indigo-800 text-slate-100 text-xs rounded-xl p-3 outline-none font-sans"
                />
              </div>

              {/* Observações Gerais */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1">
                  Observações Gerais do Item / Motivo
                </label>
                <textarea
                  rows={2}
                  value={editObs}
                  onChange={(e) => setEditObs(e.target.value)}
                  placeholder="Descreva o motivo, laudo do fabricante ou observações gerais..."
                  className="w-full bg-slate-900 border border-indigo-800 text-slate-100 text-xs rounded-xl p-3 outline-none font-sans"
                />
              </div>
            </div>

            {/* Adicionar Nova Nota / Interação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-indigo-300 mb-1">
                  Campo "Última Interação" (Será enviado para a planilha)
                </label>
                <input
                  type="text"
                  value={editUltimaInteracao}
                  onChange={(e) => setEditUltimaInteracao(e.target.value)}
                  placeholder="Ex: 31/07 - registro feito no campo obs..."
                  className="w-full bg-slate-900 border border-indigo-800/90 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-indigo-300 mb-1">
                  Nova Interação / Comentário para o Histórico (opcional)
                </label>
                <input
                  type="text"
                  value={editNota}
                  onChange={(e) => setEditNota(e.target.value)}
                  placeholder="Ex: Ligado para a fábrica cobrando laudo, previsão para 02/08..."
                  className="w-full bg-slate-900 border border-indigo-800/90 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
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
        
        {/* Banner 1: Purple Alert Box matching screenshot */}
        <div className="bg-[#2a133d]/70 border border-purple-800/70 rounded-xl p-4 flex items-start space-x-3.5 shadow-lg">
          <div className="p-2 bg-purple-900/60 rounded-lg text-purple-300 mt-0.5">
            <RefreshCw className="w-5 h-5 text-purple-300" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-purple-200 tracking-wide flex items-center gap-2">
              <span>{isExchange ? 'Cliente deseja TROCAR a peça' : `Status Devolução: ${item.statusDevolucao || 'Em Processamento'}`}</span>
              {isFinalized && (
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-bold">
                  Contagem de Dias Parada
                </span>
              )}
            </h3>
            <p className="text-xs text-purple-300/80 mt-1 leading-relaxed">
              {isExchange
                ? 'Esta solicitação é uma troca. O estorno será liberado assim que a solicitação for aprovada.'
                : `Processo registrado sob o status "${item.statusDevolucao}". Verifique as observações do item abaixo.`}
            </p>
          </div>
        </div>

        {/* Banner 2: Blue Alert Box matching screenshot */}
        <div className="bg-[#0f2847]/70 border border-blue-800/70 rounded-xl p-4 flex items-start space-x-3.5 shadow-lg">
          <div className="p-2 bg-blue-900/60 rounded-lg text-blue-300 mt-0.5">
            <AlertCircle className="w-5 h-5 text-blue-300" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-blue-200 tracking-wide">
              {item.obsNotaFiscal ? 'Atenção Observação Nota Fiscal' : 'Informações da Nota Fiscal e Pagamento'}
            </h3>
            <p className="text-xs text-blue-300/80 mt-1 leading-relaxed">
              {item.obsNotaFiscal || 'Verifique se a fatura já foi paga. Normalmente não é necessário reembolso para boletos não pagos.'}
            </p>
          </div>
        </div>

        {/* Grid of Key Information Fields matching screenshot layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8 pt-2">
          
          {/* Field 1: PROTOCOLO / ID STOCK */}
          <div className="space-y-1">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center">
              <Tag className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> ID STOCK / PROTOCOLO
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold text-slate-100 tracking-wide font-mono">
                {item.idStock || '—'}
              </span>
              <button
                onClick={() => copyToClipboard(item.idStock, 'idStock')}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title="Copiar ID STOCK"
              >
                {copiedField === 'idStock' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Field 2: CLIENTE */}
          <div className="space-y-1">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center">
              <User className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> CLIENTE / MECÂNICA
            </div>
            <div className="text-base font-bold text-slate-100">
              {item.cliente || '—'}
            </div>
          </div>

          {/* Field 3: STATUS DEVOLUÇÃO */}
          <div className="space-y-1">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> STATUS DEVOLUÇÃO
            </div>
            <div>
              <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                isFinalized 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
              }`}>
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                {item.statusDevolucao || 'Pendente'}
              </span>
            </div>
          </div>

          {/* NEW Field: NOTA FISCAL DE SAÍDA */}
          <div className="space-y-1 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center">
              <FileText className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> NOTA FISCAL DE SAÍDA
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-300 font-mono">
                {item.notaFiscalSaida || item.obsNotaFiscal?.match(/NF[-e\s]*\d+/i)?.[0] || 'Não cadastrada'}
              </span>
              {item.notaFiscalSaida && (
                <button
                  onClick={() => copyToClipboard(item.notaFiscalSaida || '', 'nfSaida')}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                  title="Copiar NF Saída"
                >
                  {copiedField === 'nfSaida' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* NEW Field: DATA ÚLTIMA ALTERAÇÃO */}
          <div className="space-y-1 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> DATA ÚLTIMA ALTERAÇÃO
            </div>
            <div className="text-sm font-bold text-indigo-300 font-mono">
              {item.dataUltimaAlteracao || 'Sem alterações registradas'}
            </div>
          </div>

          {/* NEW Field: ÚLTIMA INTERAÇÃO */}
          <div className="space-y-1 bg-indigo-950/40 p-3 rounded-xl border border-indigo-800/80 md:col-span-2 lg:col-span-3">
            <div className="text-[11px] font-bold tracking-wider text-indigo-300 uppercase flex items-center justify-between">
              <span className="flex items-center">
                <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> ÚLTIMA INTERAÇÃO (REGISTRADO NA PLANILHA)
              </span>
              {item.dataUltimaAlteracao && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {item.dataUltimaAlteracao}
                </span>
              )}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-indigo-100 bg-slate-950/80 p-2.5 rounded-lg border border-indigo-900/60 font-mono leading-relaxed">
              {item.ultimaInteracao || 'Nenhuma interação registrada até o momento.'}
            </div>
          </div>

          {/* Field: MARCAR URGÊNCIA STATUS */}
          <div className="space-y-1 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center">
              <Flame className="w-3.5 h-3.5 mr-1.5 text-red-400" /> PRIORIDADE DO ATENDIMENTO
            </div>
            <div className="text-sm font-bold">
              {isUrgent ? (
                <span className="text-red-400 flex items-center gap-1 font-bold">
                  🔥 Item Urgente
                </span>
              ) : (
                <span className="text-slate-400 font-normal">Normal</span>
              )}
            </div>
          </div>

          {/* Field 4: DESCRIÇÃO / NOME DA PEÇA */}
          <div className="space-y-1 md:col-span-2">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center">
              <Package className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> NOME DA PEÇA / DESCRIÇÃO
            </div>
            <div className="text-base font-bold text-slate-100 uppercase tracking-tight">
              {item.descricao || '—'}
            </div>
          </div>

          {/* Field 5: MARCA & CÓDIGO */}
          <div className="space-y-1">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center">
              <Tag className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> MARCA - CÓDIGO DE FÁBRICA
            </div>
            <div className="text-base font-bold text-slate-100 uppercase">
              {item.marca ? `${item.marca} - ` : ''}{item.codigo || '—'}
            </div>
          </div>

          {/* Field 6: QUANT. EM ESTOQUE */}
          <div className="space-y-1">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center">
              <Boxes className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> QUANT. EM ESTOQUE
            </div>
            <div className="text-base font-bold text-slate-100 flex items-center">
              <span>{item.quantEstoque || '0'} {parseInt(item.quantEstoque) === 1 ? 'unidade' : 'unidades'}</span>
              <span className="ml-2.5 px-2 py-0.5 text-xs bg-indigo-950 text-indigo-300 rounded border border-indigo-800/80 font-normal">
                Em estoque
              </span>
            </div>
          </div>

          {/* Field 7: FORNECEDOR */}
          <div className="space-y-1">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center">
              <Truck className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> FORNECEDOR
            </div>
            <div className="text-sm font-semibold text-slate-200">
              {item.fornecedor || '—'}
            </div>
          </div>

          {/* Field 8: NOVO FORNECEDOR / FILIAL */}
          <div className="space-y-1">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center">
              <Building2 className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> NOVO FORNECEDOR / FILIAL
            </div>
            <div className="text-sm font-semibold text-slate-200">
              {item.novoFornecedorFilial || '—'}
            </div>
          </div>

          {/* Field 9: DATA RECEBIMENTO */}
          <div className="space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> DATA RECEBIMENTO
            </div>
            <div className="text-sm font-bold text-emerald-300">
              {item.dataRecebimento || 'Não informada'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {stockDaysInfo.formattedText}
            </div>
          </div>

          {/* Field 10: DATA SAÍDA */}
          <div className="space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-400" /> DATA SAÍDA
            </div>
            <div className="text-sm font-bold text-blue-300">
              {item.dataSaida || 'Não informada'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {daysInfo.formattedText}
            </div>
          </div>

          {/* Field 11: DATA DE INCIDÊNCIA (COLUNA Q) */}
          <div className="space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-purple-400" /> DATA DE INCIDÊNCIA
            </div>
            <div className="text-sm font-bold text-purple-300 font-mono">
              {item.dataIncidencia || 'Não informada'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {item.dataIncidencia ? `Registrado em ${item.dataIncidencia}` : 'Sem data de incidência'}
            </div>
          </div>

          {/* Field 11: LOCALIDADE */}
          <div className="space-y-1 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center">
              <Building2 className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> LOCALIDADE
            </div>
            <div className="text-sm font-bold text-indigo-300">
              {item.localidade || 'Mecanizou - Garantia'}
            </div>
          </div>

          {/* Field 12: LINHA DO TEMPO NO ESTOQUE (0 - 30 - 60 - 90+) */}
          <div className="md:col-span-2 lg:col-span-3">
            <TimelineBar
              days={daysInStockVal}
              label={isFinalized ? "Linha do Tempo em Estoque (Processo Concluído - Parado)" : "Linha do Tempo em Estoque (0 - 30 - 60 - 90+ dias)"}
            />
          </div>

          {/* Field 13: LINHA DO TEMPO DESDE O ENVIO (0 - 30 - 60 - 90+) */}
          <div className="md:col-span-2 lg:col-span-3">
            <TimelineBar
              days={daysSinceDepartureVal}
              label={isFinalized ? "Linha do Tempo de Envio / Saída (Processo Concluído - Parado)" : "Linha do Tempo de Envio / Saída (0 - 30 - 60 - 90+ dias)"}
            />
          </div>

          {/* Field 14: OBS NOTA FISCAL */}
          <div className="space-y-1 md:col-span-2 lg:col-span-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center">
              <FileText className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> OBS NOTA FISCAL
            </div>
            <div className="text-sm text-slate-200 font-medium">
              {item.obsNotaFiscal || 'Nenhuma observação de Nota Fiscal cadastrada.'}
            </div>
          </div>

          {/* Field 15: OBSERVAÇÕES GERAIS DO ITEM */}
          <div className="space-y-1 md:col-span-2 lg:col-span-3 border-t border-slate-800/80 pt-4">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center justify-between">
              <span className="flex items-center">
                <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> OBSERVAÇÕES GERAIS DO ITEM / DESCRIÇÃO DO MOTIVO
              </span>
              {item.dataUltimaAlteracao && (
                <span className="text-[10px] text-indigo-300 font-mono">
                  Última alteração em: {item.dataUltimaAlteracao}
                </span>
              )}
            </div>
            <div className="text-sm text-slate-200 leading-relaxed font-mono bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/90 text-slate-300">
              {item.observacoesGerais || 'Sem observações gerais registradas para este item.'}
            </div>
          </div>

          {/* NEW SECTION: LINHA DO TEMPO DE INTERAÇÕES E HISTÓRICO */}
          <div className="space-y-3 md:col-span-2 lg:col-span-3 border-t border-slate-800/80 pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Linha do Tempo de Interações / Histórico de Alterações
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                {(item.historicoAlteracoes?.length || 0)} registros de interação
              </span>
            </div>

            {(!item.historicoAlteracoes || item.historicoAlteracoes.length === 0) ? (
              <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
                <span>Nenhuma alteração manual registrada nesta ficha até o momento.</span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-indigo-400 hover:text-indigo-300 font-bold underline text-[11px]"
                >
                  Adicionar primeira interação
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                {item.historicoAlteracoes.map((hist, hIdx) => (
                  <div 
                    key={`hist-${hIdx}`}
                    className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex items-start space-x-3 text-xs"
                  >
                    <div className="p-1.5 bg-indigo-950 text-indigo-400 rounded-lg border border-indigo-800/60 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="font-bold text-slate-200">{hist.acao}</span>
                        <span className="text-[10px] text-indigo-300 font-mono bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                          {hist.data}
                        </span>
                      </div>
                      {hist.detalhe && (
                        <p className="text-[11px] text-slate-400 mt-1 font-mono leading-relaxed bg-slate-900/60 p-2 rounded border border-slate-800">
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


