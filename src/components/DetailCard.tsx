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
  X
} from 'lucide-react';
import { StockItem } from '../types';
import { calculateDaysSinceDeparture, calculateDaysInStock, getDaysFromDate } from '../utils/dateUtils';
import { TimelineBar } from './TimelineBar';

interface DetailCardProps {
  item: StockItem;
  itemIndex?: number;
  totalMatching?: number;
  onNextItem?: () => void;
  onPrevItem?: () => void;
  onClose?: () => void;
}

export const DetailCard: React.FC<DetailCardProps> = ({
  item,
  itemIndex,
  totalMatching,
  onNextItem,
  onPrevItem,
  onClose
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const daysInfo = calculateDaysSinceDeparture(item.dataSaida);
  const stockDaysInfo = calculateDaysInStock(item.dataRecebimento);
  const daysInStockVal = getDaysFromDate(item.dataRecebimento);
  const daysSinceDepartureVal = getDaysFromDate(item.dataSaida);

  // Determine banner badge colors & message based on status
  const isExchange = item.statusDevolucao?.toLowerCase().includes('troca') || 
                     item.observacoesGerais?.toLowerCase().includes('troca');
  
  return (
    <div className="bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all text-slate-100">
      {/* Top Header Card Title & Controls */}
      <div className="bg-[#0f172a] border-b border-slate-800/90 px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span>Ficha Completa do Item</span>
              <span className="text-indigo-400 font-mono font-bold">({item.idStock})</span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-100 uppercase truncate max-w-md">
              {item.descricao || 'Sem descrição'}
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Counter controls if multiple items matched */}
          {totalMatching && totalMatching > 1 && (
            <div className="flex items-center space-x-2 text-xs text-slate-400">
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
        
        {/* Banner 1: Purple Alert Box matching screenshot */}
        <div className="bg-[#2a133d]/70 border border-purple-800/70 rounded-xl p-4 flex items-start space-x-3.5 shadow-lg">
          <div className="p-2 bg-purple-900/60 rounded-lg text-purple-300 mt-0.5">
            <RefreshCw className="w-5 h-5 text-purple-300" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-purple-200 tracking-wide">
              {isExchange ? 'Cliente deseja TROCAR a peça' : `Status Devolução: ${item.statusDevolucao || 'Em Processamento'}`}
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
              <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-800">
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                {item.statusDevolucao || 'Pendente'}
              </span>
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
              label="Linha do Tempo em Estoque (0 - 30 - 60 - 90+ dias)"
            />
          </div>

          {/* Field 13: LINHA DO TEMPO DESDE O ENVIO (0 - 30 - 60 - 90+) */}
          <div className="md:col-span-2 lg:col-span-3">
            <TimelineBar
              days={daysSinceDepartureVal}
              label="Linha do Tempo de Envio / Saída (0 - 30 - 60 - 90+ dias)"
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

          {/* Field 13: OBSERVAÇÕES GERAIS DO ITEM */}
          <div className="space-y-1 md:col-span-2 lg:col-span-3 border-t border-slate-800/80 pt-4">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center">
              <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> OBSERVAÇÕES GERAIS DO ITEM / DESCRIÇÃO DO MOTIVO
            </div>
            <div className="text-sm text-slate-200 leading-relaxed font-mono bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/90 text-slate-300">
              {item.observacoesGerais || 'Sem observações gerais registradas para este item.'}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

