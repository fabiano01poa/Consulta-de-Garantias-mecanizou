import React from 'react';
import { StockItem } from '../types';
import { parseDateString } from '../utils/dateUtils';
import { Calendar, Boxes, Truck, ShieldCheck, Lock, Clock, CheckCircle2, Play } from 'lucide-react';

interface UnifiedProcessTimelineProps {
  item: StockItem;
  theme?: 'dark' | 'light';
}

export const UnifiedProcessTimeline: React.FC<UnifiedProcessTimelineProps> = ({ item, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const incidenciaStr = item.dataIncidencia;
  const recebimentoStr = item.dataRecebimento;
  const saidaStr = item.dataSaida;
  const statusStr = item.statusDevolucao || '';

  // Status check for locking
  const cleanStatus = statusStr.trim().toLowerCase();

  // Active (non-locked) statuses in the flow
  const isPendingOrActiveStatus = 
    cleanStatus === '' ||
    cleanStatus.includes('enviado ao fabricante') ||
    cleanStatus.includes('a negociar') ||
    cleanStatus.includes('em negociação') ||
    cleanStatus.includes('emitir nf') ||
    cleanStatus.includes('pré emissão') ||
    cleanStatus.includes('pre emissao') ||
    cleanStatus.includes('solicitar garantia') ||
    cleanStatus.includes('validar');

  // Process locks when status is explicitly defined and is NOT one of the active intermediate statuses
  const isLocked = Boolean(statusStr) && !isPendingOrActiveStatus;

  const dateIncidencia = parseDateString(incidenciaStr);
  const dateRecebimento = parseDateString(recebimentoStr);
  const dateSaida = parseDateString(saidaStr);
  const dateUltima = parseDateString(item.dataUltimaAlteracao);

  // Reference start date (defaulting to dateIncidencia, then dateRecebimento, then today)
  const startDate = dateIncidencia || dateRecebimento || dateSaida || new Date();

  // Reference end date (Today if active, or date of finalization/last change if locked)
  let endDate = new Date();
  if (isLocked) {
    if (dateUltima) {
      endDate = dateUltima;
    } else if (dateSaida) {
      endDate = dateSaida;
    } else if (dateRecebimento) {
      endDate = dateRecebimento;
    } else if (dateIncidencia) {
      endDate = dateIncidencia;
    }
  }

  // Calculate days between dates
  const calcDaysDiff = (from: Date | null, to: Date | null) => {
    if (!from || !to) return null;
    const f = new Date(from);
    const t = new Date(to);
    f.setHours(0, 0, 0, 0);
    t.setHours(0, 0, 0, 0);
    const diff = Math.floor((t.getTime() - f.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  // 1. Stage Days Calculations
  const hasRecebimento = Boolean(dateRecebimento);
  const hasSaida = Boolean(dateSaida);

  // Days at each milestone relative to start (Incidência = 0d)
  const daysIncidenciaToRecebimento = calcDaysDiff(startDate, dateRecebimento);
  const daysIncidenciaToSaida = calcDaysDiff(startDate, dateSaida);
  const totalProcessDays = calcDaysDiff(startDate, endDate) || 0;

  // Exact positions where each pin (bolinha) stops or is currently at
  // Verde (Incidência -> Recebimento):
  const greenPinDays = hasRecebimento 
    ? (daysIncidenciaToRecebimento ?? 0)
    : totalProcessDays;

  // Amarela (Recebida -> Saída):
  const yellowPinDays = hasRecebimento
    ? (hasSaida ? (daysIncidenciaToSaida ?? greenPinDays) : totalProcessDays)
    : null;

  // Laranja (Enviada -> Fabricante/Em trânsito):
  const orangePinDays = hasSaida
    ? totalProcessDays
    : null;

  // Scale mapper (0-30d = 25%, 30-60d = 50%, 60-90d = 75%, 90+d = 100%)
  const daysToPct = (days: number | null): number => {
    if (days === null) return 0;
    const d = Math.max(0, days);
    if (d <= 30) return (d / 30) * 25;
    if (d <= 60) return 25 + ((d - 30) / 30) * 25;
    if (d <= 90) return 50 + ((d - 60) / 30) * 25;
    return Math.min(100, 75 + ((d - 90) / 30) * 25);
  };

  const pctGreen = daysToPct(greenPinDays);
  const pctYellow = yellowPinDays !== null ? daysToPct(yellowPinDays) : null;
  const pctOrange = orangePinDays !== null ? daysToPct(orangePinDays) : null;
  const pctFinal = daysToPct(totalProcessDays);

  return (
    <div className={`w-full p-4 sm:p-5 rounded-2xl border shadow-xl space-y-5 transition-colors ${
      isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
    }`}>
      {/* Header Info Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b ${
        isDark ? 'border-slate-800/80' : 'border-slate-200'
      }`}>
        <div>
          <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}>
            <Clock className="w-4 h-4 text-indigo-500" />
            Linha do Tempo com Sequência de Bolinhas
          </h4>
          <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Cada bolinha anda até o evento correspondente e congela a contagem, passando para a próxima.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isLocked ? (
            <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 shadow-sm ${
              isDark ? 'bg-blue-950/90 text-blue-300 border-blue-800/80' : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}>
              <Lock className="w-3.5 h-3.5 text-blue-500" />
              <span>Trava Ativada - Processo Concluído ({totalProcessDays}d)</span>
            </div>
          ) : (
            <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 ${
              isDark ? 'bg-amber-950/80 text-amber-300 border-amber-800/80' : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>Em Andamento ({totalProcessDays} {totalProcessDays === 1 ? 'dia' : 'dias'})</span>
            </div>
          )}
        </div>
      </div>

      {/* 4 Stage Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Stage 1: Incidência (Verde) */}
        <div className={`p-3 rounded-xl border relative overflow-hidden flex flex-col justify-between ${
          isDark ? 'bg-slate-900/80 border-emerald-900/50' : 'bg-white border-emerald-200 shadow-sm'
        }`}>
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500" />
          <div className="pl-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 uppercase tracking-wide">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> 1. Incidência (Verde)
              </span>
              {hasRecebimento ? (
                <span className={`px-1.5 py-0.5 rounded text-[10px] border font-bold flex items-center gap-1 ${
                  isDark ? 'bg-emerald-950 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                }`}>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Parou em {greenPinDays}d
                </span>
              ) : (
                <span className={`px-1.5 py-0.5 rounded text-[10px] border font-bold flex items-center gap-1 ${
                  isDark ? 'bg-amber-950 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-800'
                }`}>
                  <Play className="w-3 h-3 text-amber-500 animate-pulse" /> Andando ({greenPinDays}d)
                </span>
              )}
            </div>
            <div className={`text-sm font-extrabold mt-1 font-mono ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {incidenciaStr || 'Não informada'}
            </div>
            <div className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {hasRecebimento ? `Recebido após ${greenPinDays} dias` : 'Aguardando recebimento no estoque'}
            </div>
          </div>
        </div>

        {/* Stage 2: Recebida (Amarela) */}
        <div className={`p-3 rounded-xl border relative overflow-hidden flex flex-col justify-between ${
          isDark ? 'bg-slate-900/80 border-amber-900/50' : 'bg-white border-amber-200 shadow-sm'
        }`}>
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-400" />
          <div className="pl-1">
            <div className={`flex items-center justify-between text-[11px] font-bold uppercase tracking-wide ${
              isDark ? 'text-amber-400' : 'text-amber-600'
            }`}>
              <span className="flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5" /> 2. Recebida (Amarela)
              </span>
              {hasSaida ? (
                <span className={`px-1.5 py-0.5 rounded text-[10px] border font-bold flex items-center gap-1 ${
                  isDark ? 'bg-amber-950 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-800'
                }`}>
                  <CheckCircle2 className="w-3 h-3 text-amber-500" /> Parou em {yellowPinDays}d
                </span>
              ) : hasRecebimento ? (
                <span className={`px-1.5 py-0.5 rounded text-[10px] border font-bold flex items-center gap-1 ${
                  isDark ? 'bg-amber-950 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-800'
                }`}>
                  <Play className="w-3 h-3 text-amber-500 animate-pulse" /> Andando ({yellowPinDays}d)
                </span>
              ) : (
                <span className={`px-1.5 py-0.5 rounded text-[10px] border font-bold ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}>
                  Aguardando
                </span>
              )}
            </div>
            <div className={`text-sm font-extrabold mt-1 font-mono ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {recebimentoStr || 'Pendente'}
            </div>
            <div className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {hasSaida 
                ? `Enviado ao fabricante com ${yellowPinDays}d acumulados` 
                : hasRecebimento 
                ? `Em estoque desde ${greenPinDays}d` 
                : 'Aguardando entrada no estoque'}
            </div>
          </div>
        </div>

        {/* Stage 3: Enviada (Laranja) */}
        <div className={`p-3 rounded-xl border relative overflow-hidden flex flex-col justify-between ${
          isDark ? 'bg-slate-900/80 border-orange-900/50' : 'bg-white border-orange-200 shadow-sm'
        }`}>
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-orange-500" />
          <div className="pl-1">
            <div className={`flex items-center justify-between text-[11px] font-bold uppercase tracking-wide ${
              isDark ? 'text-orange-400' : 'text-orange-600'
            }`}>
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" /> 3. Enviada (Laranja)
              </span>
              {hasSaida ? (
                isLocked ? (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] border font-bold flex items-center gap-1 ${
                    isDark ? 'bg-orange-950 border-orange-800 text-orange-300' : 'bg-orange-50 border-orange-300 text-orange-800'
                  }`}>
                    <CheckCircle2 className="w-3 h-3 text-orange-500" /> Concluído ({orangePinDays}d)
                  </span>
                ) : (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] border font-bold flex items-center gap-1 ${
                    isDark ? 'bg-orange-950 border-orange-800 text-orange-300' : 'bg-orange-50 border-orange-300 text-orange-800'
                  }`}>
                    <Play className="w-3 h-3 text-orange-500 animate-pulse" /> Em Trânsito ({orangePinDays}d)
                  </span>
                )
              ) : (
                <span className={`px-1.5 py-0.5 rounded text-[10px] border font-bold ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}>
                  Aguardando
                </span>
              )}
            </div>
            <div className={`text-sm font-extrabold mt-1 font-mono ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {saidaStr || 'Pendente'}
            </div>
            <div className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {hasSaida ? `Em trânsito/análise com fabricante` : 'Aguardando saída da loja'}
            </div>
          </div>
        </div>

        {/* Stage 4: Finalizada (Azul com Trava) */}
        <div className={`p-3 rounded-xl border relative overflow-hidden flex flex-col justify-between transition-all ${
          isLocked 
            ? isDark ? 'bg-blue-950/40 border-blue-800/80 shadow-md shadow-blue-950/30' : 'bg-blue-50/60 border-blue-300 shadow-sm'
            : isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-500" />
          <div className="pl-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-blue-500 uppercase tracking-wide">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> 4. Finalizada (Azul)
              </span>
              {isLocked ? (
                <span className={`px-1.5 py-0.5 rounded text-[10px] border font-bold flex items-center gap-1 ${
                  isDark ? 'bg-blue-900/90 border-blue-700 text-blue-200' : 'bg-blue-100 border-blue-300 text-blue-900'
                }`}>
                  <Lock className="w-3 h-3 text-blue-500" /> Travado ({totalProcessDays}d)
                </span>
              ) : (
                <span className={`px-1.5 py-0.5 rounded text-[10px] border font-bold ${
                  isDark ? 'bg-amber-950 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-800'
                }`}>
                  Aguardando Resolução
                </span>
              )}
            </div>
            <div className={`text-sm font-extrabold mt-1 font-mono truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`} title={statusStr}>
              {statusStr || 'Status em aberto'}
            </div>
            <div className="text-[11px] mt-1">
              {isLocked ? (
                <span className="text-blue-500 font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3 text-blue-500" /> Trava ativada no status final
                </span>
              ) : (
                <span className={`${isDark ? 'text-amber-400' : 'text-amber-600'} italic`}>Em andamento (Trava ao mudar status)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ORIGINAL TIMELINE BAR WITH ORIGINAL COLORS & STAGE PINS */}
      <div className="space-y-2 pt-2">
        <div className={`flex justify-between items-center text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          <span>Linha do Tempo Gradual (0 - 30 - 60 - 90+ dias)</span>
          <span className={`font-mono font-bold px-2.5 py-0.5 rounded border ${
            isDark ? 'text-indigo-300 bg-slate-900 border-slate-800' : 'text-indigo-700 bg-white border-slate-200'
          }`}>
            {totalProcessDays} {totalProcessDays === 1 ? 'dia no total' : 'dias no total'}
          </span>
        </div>

        <div className="relative pt-7 pb-2">
          {/* STAGE PINS (BOLINHAS COM AS CORES CORRESPONDENTES) */}

          {/* Bolinha Verde (1. Incidência -> Recebimento) */}
          <div 
            className="absolute top-0 transform -translate-x-1/2 z-20 flex flex-col items-center transition-all duration-300"
            style={{ left: `${pctGreen}%` }}
          >
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-black shadow-md border flex items-center gap-1 ${
              hasRecebimento 
                ? 'bg-emerald-500 border-emerald-300 text-slate-950' 
                : 'bg-emerald-400 border-emerald-200 text-slate-950 ring-2 ring-emerald-400/50 animate-pulse'
            }`}>
              <span>{greenPinDays}d</span>
              {hasRecebimento && <CheckCircle2 className="w-2.5 h-2.5 text-slate-950" />}
            </div>
            <div className="w-0.5 h-3 bg-emerald-400" />
          </div>

          {/* Bolinha Amarela (2. Recebida -> Saída) */}
          {hasRecebimento && yellowPinDays !== null && (
            <div 
              className="absolute top-0 transform -translate-x-1/2 z-21 flex flex-col items-center transition-all duration-300"
              style={{ left: `${pctYellow}%` }}
            >
              <div className={`px-2 py-0.5 rounded-full text-[10px] font-black shadow-md border flex items-center gap-1 ${
                hasSaida 
                  ? 'bg-amber-400 border-amber-200 text-slate-950' 
                  : 'bg-amber-300 border-amber-100 text-slate-950 ring-2 ring-amber-400/50 animate-pulse'
              }`}>
                <span>{yellowPinDays}d</span>
                {hasSaida && <CheckCircle2 className="w-2.5 h-2.5 text-slate-950" />}
              </div>
              <div className="w-0.5 h-3 bg-amber-300" />
            </div>
          )}

          {/* Bolinha Laranja (3. Saída / Enviada) */}
          {hasSaida && orangePinDays !== null && (
            <div 
              className="absolute top-0 transform -translate-x-1/2 z-22 flex flex-col items-center transition-all duration-300"
              style={{ left: `${pctOrange}%` }}
            >
              <div className={`px-2 py-0.5 rounded-full text-[10px] font-black shadow-md border flex items-center gap-1 ${
                isLocked 
                  ? 'bg-orange-500 border-orange-300 text-white' 
                  : 'bg-orange-400 border-orange-200 text-white ring-2 ring-orange-400/50 animate-pulse'
              }`}>
                <span>{orangePinDays}d</span>
                {isLocked && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
              </div>
              <div className="w-0.5 h-3 bg-orange-400" />
            </div>
          )}

          {/* Bolinha Azul (4. Finalizada / Trava do Processo) */}
          {isLocked && (
            <div 
              className="absolute top-0 transform -translate-x-1/2 z-25 flex flex-col items-center transition-all duration-300"
              style={{ left: `${pctFinal}%` }}
            >
              <div className="px-2.5 py-0.5 rounded-full bg-blue-600 border border-blue-300 text-white text-[10px] font-black shadow-lg flex items-center gap-1 ring-2 ring-blue-500/60">
                <Lock className="w-2.5 h-2.5 text-blue-200" />
                <span>Trava: {totalProcessDays}d</span>
              </div>
              <div className="w-0.5 h-3 bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.9)]" />
            </div>
          )}

          {/* ORIGINAL SEGMENTED BAR (Green, Yellow, Pink/Red, Dark Red) */}
          <div className={`w-full h-3.5 rounded-full overflow-hidden border flex relative shadow-inner ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            {/* 0 - 30: Verde */}
            <div 
              className="w-1/4 h-full bg-emerald-500 hover:brightness-110 transition-all border-r border-slate-950/50 flex items-center justify-center text-[9px] font-bold text-slate-950" 
              title="0 a 30 dias: Verde"
            >
              0-30
            </div>
            {/* 30 - 60: Amarelo */}
            <div 
              className="w-1/4 h-full bg-amber-400 hover:brightness-110 transition-all border-r border-slate-950/50 flex items-center justify-center text-[9px] font-bold text-slate-950" 
              title="30 a 60 dias: Amarelo"
            >
              30-60
            </div>
            {/* 60 - 90: Vermelho Claro */}
            <div 
              className="w-1/4 h-full bg-rose-500 hover:brightness-110 transition-all border-r border-slate-950/50 flex items-center justify-center text-[9px] font-bold text-white" 
              title="60 a 90 dias: Vermelho Claro"
            >
              60-90
            </div>
            {/* +90: Vermelho Escuro */}
            <div 
              className="w-1/4 h-full bg-red-900 hover:brightness-110 transition-all flex items-center justify-center text-[9px] font-bold text-red-200" 
              title="Acima de 90 dias: Vermelho Escuro"
            >
              +90
            </div>

            {/* Current Active Pin Indicator Line */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,1)] z-10 -ml-0.5 pointer-events-none"
              style={{ left: `${pctFinal}%` }}
            />
          </div>

          {/* Original Ticks & Labels */}
          <div className="flex justify-between text-[10px] font-mono mt-1 px-0.5">
            <span className="text-emerald-500 font-bold">0d (Incidência)</span>
            <span className="text-amber-500 font-bold">30d (Recebida)</span>
            <span className="text-rose-500 font-bold">60d (Enviada)</span>
            <span className="text-red-500 font-bold">90d+ (Finalizada)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
