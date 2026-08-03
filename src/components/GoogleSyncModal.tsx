import React, { useState } from 'react';
import { X, Check, Copy, Link, Database, Sparkles, CheckCircle2, AlertCircle, Play } from 'lucide-react';

interface GoogleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhookUrl: string;
  onSaveWebhookUrl: (url: string) => void;
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen,
  onClose,
  webhookUrl,
  onSaveWebhookUrl
}) => {
  const [inputUrl, setInputUrl] = useState<string>(webhookUrl || '');
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; message?: string } | null>(null);

  if (!isOpen) return null;

  const scriptCode = `// COPIE ESTE CÓDIGO NO SEU GOOGLE APPS SCRIPT
// Planilha -> Extensões -> Apps Script

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var values = sheet.getDataRange().getValues();
    if (values.length === 0) return reply({ error: "Planilha vazia" });

    // Localizar índices de colunas no cabeçalho
    var headers = values[0].map(function(h) {
      return String(h).toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
    });

    var idCol = headers.findIndex(function(h) { return h.includes("id stock") || h.includes("idstock") || h === "id"; });
    var statusCol = headers.findIndex(function(h) { return h.includes("status devolu") || h.includes("status_devolucao"); });
    var obsNfCol = headers.findIndex(function(h) { return h.includes("obs nota fiscal") || h.includes("obs nf"); });
    var obsGeraisCol = headers.findIndex(function(h) { return h.includes("observac") && h.includes("gerai"); });
    var interacaoCol = headers.findIndex(function(h) { return h.includes("ultima interac") || h.includes("ultima_interacao") || h.includes("ultima interacao"); });

    if (idCol === -1) {
      return reply({ error: "Coluna ID STOCK não encontrada no cabeçalho" });
    }

    var updates = Array.isArray(data) ? data : [data];
    var updatedCount = 0;

    updates.forEach(function(item) {
      var targetId = String(item.idStock || "").trim();
      if (!targetId) return;

      for (var i = 1; i < values.length; i++) {
        var rowId = String(values[i][idCol]).trim();
        if (rowId === targetId) {
          if (statusCol !== -1 && item.statusDevolucao !== undefined) {
            sheet.getRange(i + 1, statusCol + 1).setValue(item.statusDevolucao);
          }
          if (obsNfCol !== -1 && item.obsNotaFiscal !== undefined) {
            sheet.getRange(i + 1, obsNfCol + 1).setValue(item.obsNotaFiscal);
          }
          if (obsGeraisCol !== -1 && item.observacoesGerais !== undefined) {
            sheet.getRange(i + 1, obsGeraisCol + 1).setValue(item.observacoesGerais);
          }
          if (interacaoCol !== -1 && item.ultimaInteracao !== undefined) {
            sheet.getRange(i + 1, interacaoCol + 1).setValue(item.ultimaInteracao);
          }
          updatedCount++;
          break;
        }
      }
    });

    return reply({ success: true, updatedCount: updatedCount });
  } catch (err) {
    return reply({ error: err.toString() });
  }
}

function reply(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const copyScriptToClipboard = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleSave = () => {
    onSaveWebhookUrl(inputUrl.trim());
    onClose();
  };

  const handleTestConnection = async () => {
    if (!inputUrl.trim()) {
      setTestStatus({ loading: false, success: false, message: 'Insira a URL do Webhook primeiro.' });
      return;
    }

    setTestStatus({ loading: true });
    try {
      const res = await fetch('/api/update-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ idStock: 'STK-TEST', statusDevolucao: 'Garantia: Validar' }],
          webhookUrl: inputUrl.trim()
        })
      });

      const json = await res.json();
      if (json.syncedToSheet || json.success) {
        setTestStatus({
          loading: false,
          success: true,
          message: json.message || 'Conexão testada com sucesso!'
        });
      } else {
        setTestStatus({
          loading: false,
          success: false,
          message: json.message || 'Erro ao conectar. Verifique as permissões da implantação.'
        });
      }
    } catch (err: any) {
      setTestStatus({
        loading: false,
        success: false,
        message: 'Erro ao enviar requisição para o servidor.'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 space-y-6 shadow-2xl animate-fadeIn my-8 text-slate-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-800">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Vincular Edição na Planilha Google</h3>
              <p className="text-xs text-slate-400">
                Grave edições do Status Devolução, Obs Nota Fiscal e Observações Gerais em tempo real
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Webhook URL */}
        <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
            URL do Webhook do Google Apps Script
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500 font-mono"
            />
            <button
              onClick={handleTestConnection}
              disabled={testStatus?.loading}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center space-x-1.5 whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>{testStatus?.loading ? 'Testando...' : 'Testar'}</span>
            </button>
          </div>

          {testStatus && (
            <div className={`mt-2 p-2.5 rounded-lg text-xs font-medium flex items-center space-x-2 ${
              testStatus.success ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'
            }`}>
              {testStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{testStatus.message}</span>
            </div>
          )}
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Como criar o script em 1 minuto na sua Planilha Google:
          </h4>

          <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 font-sans leading-relaxed">
            <li>Abra sua **Planilha Google** e vá em **Extensões › Apps Script**.</li>
            <li>Ao lado de **Arquivos**, clique no **+ (Adicionar arquivo › Script)** para criar um novo arquivo (ex: `webhook.gs`), ou cole ao final de um arquivo existente **sem apagar os seus scripts já salvos**.</li>
            <li>Cole o código fornecido abaixo.</li>
            <li>Clique no botão azul **Implantar › Nova implantação**.</li>
            <li>Em *Selecione o tipo*, escolha **App da Web**.</li>
            <li>Em *Quem pode acessar*, selecione **Qualquer pessoa** (Anyone) e clique em **Implantar**.</li>
            <li>Copie a **URL do App da Web** gerada e cole no campo acima!</li>
          </ol>
        </div>

        {/* Copy Script Code Block */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Código do Apps Script (Pronto para copiar)
            </span>
            <button
              onClick={copyScriptToClipboard}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition-all"
            >
              {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedScript ? 'Copiado!' : 'Copiar Código'}</span>
            </button>
          </div>

          <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48 scrollbar-thin">
            {scriptCode}
          </pre>
        </div>

        {/* Modal Action Footer */}
        <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {webhookUrl ? '🟢 Webhook configurado e ativo' : '⚪ Webhook não configurado (salvamento local ativo)'}
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Fechar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg"
            >
              Salvar Configuração
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
