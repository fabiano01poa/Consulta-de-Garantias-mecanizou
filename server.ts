import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Papa from "papaparse";

const app = express();
const PORT = 3000;

app.use(express.json());

// Default spreadsheet URL provided by user
const DEFAULT_SHEET_ID = "1daGWs2SPXQsN9YLJBggtyX0Wdqpv2kgBcB4mOUrhe7M";
const DEFAULT_GID = "1870385864";

// Official warranty statuses
const OFFICIAL_WARRANTY_STATUSES = [
  "Garantia: A negociar",
  "Garantia: Enviado ao Fabricante",
  "Garantia: Validar",
  "Garantia Aprovada - Fabricante",
  "Garantia: Em negociação",
  "Garantia: Emitir NF",
  "Garantia: Não negociado",
  "Garantia Negada - Fabricante",
  "Garantia: Enviado ao Fabricante Urgente"
];

function normalizeStatusStr(s?: string): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeWarrantyStatus(rawStatus?: string): string {
  if (!rawStatus || !rawStatus.trim()) return "";
  return rawStatus.trim();
}

function isAllowedWarrantyStatus(statusStr?: string): boolean {
  if (!statusStr || !statusStr.trim()) return false;
  const clean = normalizeStatusStr(statusStr);
  if (!clean) return false;

  // Must contain "garantia"
  if (clean.includes("garantia")) return true;

  return false;
}

// Sample fallback dataset matching the user's spreadsheet structure and screenshot visual requirements
const SAMPLE_DATA = [
  {
    idStock: "STK-1001",
    cliente: "Brothers'car",
    descricao: "CILINDRO MESTRE FREIO C/RESERVATORIO",
    codigo: "0062CM",
    marca: "COBREQ",
    quantEstoque: "12",
    fornecedor: "Auto Peças Brasil Ltda",
    novoFornecedorFilial: "Filial Sul - Curitiba",
    statusDevolucao: "Garantia: A negociar",
    obsNotaFiscal: "Pedido pago com Boleto. Verifique se a fatura já foi paga.",
    observacoesGerais: "a peça não esta dando freio, cliente solicita troca urgente pela garantia de fabricação.",
    localidade: "Mecanizou - Garantia",
    dataRecebimento: "10/07/2026",
    dataSaida: "20/07/2026",
    valorUnitario: "R$ 180,00",
    valorTotal: "R$ 2.160,00",
    dataCompra: "01/06/2026",
    nfOrigem: "NF-8821"
  },
  {
    idStock: "STK-1002",
    cliente: "Brothers'car",
    descricao: "DISCO DE FREIO VENTILADO DIANTEIRO",
    codigo: "HF-55A",
    marca: "HIPERFREIOS",
    quantEstoque: "8",
    fornecedor: "Distribuidora Velox",
    novoFornecedorFilial: "Matriz - São Paulo",
    statusDevolucao: "Garantia Aprovada - Fabricante",
    obsNotaFiscal: "NF 48291 emitida com destaque de ICMS.",
    observacoesGerais: "Embalagem avariada no transporte. Reembolso via Cupom de Crédito liberado.",
    localidade: "Mecanizou - Garantia",
    dataRecebimento: "05/07/2026",
    dataSaida: "15/07/2026",
    valorUnitario: "R$ 145,00",
    valorTotal: "R$ 1.160,00",
    dataCompra: "15/05/2026",
    nfOrigem: "NF-48291"
  },
  {
    idStock: "STK-1003",
    cliente: "Auto Mecânica Silva",
    descricao: "AMORTECEDOR DIANTEIRO PRESSURIZADO HG",
    codigo: "GP32982",
    marca: "COFAP",
    quantEstoque: "5",
    fornecedor: "Comercial Peças Express",
    novoFornecedorFilial: "Filial SP - Campinas",
    statusDevolucao: "Garantia: Validar",
    obsNotaFiscal: "Fatura pendente de conciliação bancária.",
    observacoesGerais: "Ruído ao passar por lombadas. Encaminhado para perícia técnica da fábrica.",
    localidade: "Mecanizou - Garantia",
    dataRecebimento: "12/07/2026",
    dataSaida: "25/07/2026",
    valorUnitario: "R$ 220,00",
    valorTotal: "R$ 1.100,00",
    dataCompra: "10/06/2026",
    nfOrigem: "NF-39102"
  },
  {
    idStock: "STK-1004",
    cliente: "Auto Mecânica Silva",
    descricao: "KIT EMBREAGEM COMPLETO (DISCO/PLATO/ROLAMENTO)",
    codigo: "620308000",
    marca: "LUK",
    quantEstoque: "3",
    fornecedor: "Distribuidora Velox",
    novoFornecedorFilial: "Filial RJ - Duque de Caxias",
    statusDevolucao: "Garantia: Emitir NF",
    obsNotaFiscal: "Nota Fiscal de devolução emitida com sucesso NF-e 10923.",
    observacoesGerais: "Item applied in test and returned. Original box preserved.",
    localidade: "Mecanizou - Garantia",
    dataRecebimento: "01/07/2026",
    dataSaida: "10/07/2026",
    valorUnitario: "R$ 680,00",
    valorTotal: "R$ 2.040,00",
    dataCompra: "20/05/2026",
    nfOrigem: "NF-10923"
  },
  {
    idStock: "STK-1005",
    cliente: "Centro Automotivo Dourado",
    descricao: "JOGO DE VELAS DE IGNIÇÃO IRIDIUM",
    codigo: "BKR6EIX",
    marca: "NGK",
    quantEstoque: "24",
    fornecedor: "Importadora Ignição Pro",
    novoFornecedorFilial: "Matriz - Porto Alegre",
    statusDevolucao: "Garantia: Enviado ao Fabricante",
    obsNotaFiscal: "Aguardando envio da nota fiscal pelo cliente.",
    observacoesGerais: "Aplicação incompatível com o modelo do veículo informado pelo cliente.",
    localidade: "Mecanizou - Garantia",
    dataRecebimento: "15/07/2026",
    dataSaida: "28/07/2026",
    valorUnitario: "R$ 45,00",
    valorTotal: "R$ 1.080,00",
    dataCompra: "05/06/2026",
    nfOrigem: "NF-77401"
  },
  {
    idStock: "STK-1006",
    cliente: "Car Center Express",
    descricao: "CORREIA DENTADA SINCRONIZADA",
    codigo: "CT884",
    marca: "CONTITECH",
    quantEstoque: "15",
    fornecedor: "Auto Peças Brasil Ltda",
    novoFornecedorFilial: "Filial MG - Belo Horizonte",
    statusDevolucao: "Garantia Negada - Fabricante",
    obsNotaFiscal: "Prazo de garantia expirado (mais de 90 dias).",
    observacoesGerais: "Sem marcas de defeito de fabricação. Desgaste natural constatado.",
    localidade: "Mecanizou - Garantia",
    dataRecebimento: "20/06/2026",
    dataSaida: "02/07/2026",
    valorUnitario: "R$ 85,00",
    valorTotal: "R$ 1.275,00",
    dataCompra: "01/04/2026",
    nfOrigem: "NF-55109"
  },
  {
    idStock: "STK-1007",
    cliente: "Oficina Ponto Certo",
    descricao: "BOMBA DE COMBUSTIVEL FLEX 12V",
    codigo: "F000TE0120",
    marca: "BOSCH",
    quantEstoque: "6",
    fornecedor: "Bosch do Brasil Ltda",
    novoFornecedorFilial: "Filial SP - Campinas",
    statusDevolucao: "Garantia: Enviado ao Fabricante Urgente",
    obsNotaFiscal: "Envio emergencial por transporte expresso.",
    observacoesGerais: "Bomba travada sem vazamento.",
    localidade: "Estoque Geral",
    dataRecebimento: "18/06/2026",
    dataSaida: "22/06/2026",
    valorUnitario: "R$ 310,00",
    valorTotal: "R$ 1.860,00",
    dataCompra: "10/05/2026",
    nfOrigem: "NF-88301"
  },
  {
    idStock: "STK-1008",
    cliente: "Mecânica Precision",
    descricao: "PASTILHA DE FREIO DIANTEIRA CERAMICA",
    codigo: "N-1234",
    marca: "COBREQ",
    quantEstoque: "10",
    fornecedor: "Distribuidora Velox",
    novoFornecedorFilial: "Matriz - São Paulo",
    statusDevolucao: "Garantia: Em negociação",
    obsNotaFiscal: "Em negociação de lote com fábrica.",
    observacoesGerais: "Ruído excessivo após 100km.",
    localidade: "Estoque Geral",
    dataRecebimento: "02/05/2026",
    dataSaida: "10/05/2026",
    valorUnitario: "R$ 120,00",
    valorTotal: "R$ 1.200,00",
    dataCompra: "15/04/2026",
    nfOrigem: "NF-22390"
  },
  {
    idStock: "STK-1009",
    cliente: "Auto Center Sul",
    descricao: "TURBOCOMPRESSOR COMPLETO 2.0 DIESEL",
    codigo: "TC-9900",
    marca: "GARRETT",
    quantEstoque: "2",
    fornecedor: "Turbo Brasil Express",
    novoFornecedorFilial: "Filial PR - Curitiba",
    statusDevolucao: "Garantia: Não negociado",
    obsNotaFiscal: "Sem acordo comercial no momento.",
    observacoesGerais: "Falta laudo técnico do instalador.",
    localidade: "Estoque Geral",
    dataRecebimento: "10/04/2026",
    dataSaida: "18/04/2026",
    valorUnitario: "R$ 1.850,00",
    valorTotal: "R$ 3.700,00",
    dataCompra: "01/03/2026",
    nfOrigem: "NF-90182"
  }
];

function extractSheetIdAndGid(urlStr: string) {
  let sheetId = DEFAULT_SHEET_ID;
  let gid = DEFAULT_GID;

  const idMatch = urlStr.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (idMatch && idMatch[1]) {
    sheetId = idMatch[1];
  }

  const gidMatch = urlStr.match(/[#&?]gid=([0-9]+)/);
  if (gidMatch && gidMatch[1]) {
    gid = gidMatch[1];
  }

  return { sheetId, gid };
}

function normalizeRow(row: any) {
  const keys = Object.keys(row);

  const getVal = (...names: string[]) => {
    // 1st PASS: Exact match ignoring case and accents
    for (const name of names) {
      const cleanN = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const exactKey = keys.find(k => {
        const cleanK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        return cleanK === cleanN;
      });
      if (exactKey && row[exactKey] !== undefined && row[exactKey] !== null && String(row[exactKey]).trim() !== '') {
        return String(row[exactKey]).trim();
      }
    }

    // 2nd PASS: Column header contains the target candidate name (e.g., column 'Status Devolução do Item' contains 'status devolucao')
    for (const name of names) {
      const cleanN = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (cleanN.length < 3) continue;
      const containsKey = keys.find(k => {
        const cleanK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        return cleanK.includes(cleanN);
      });
      if (containsKey && row[containsKey] !== undefined && row[containsKey] !== null && String(row[containsKey]).trim() !== '') {
        return String(row[containsKey]).trim();
      }
    }

    // 3rd PASS: Target name contains column header (only for specific column headers >= 5 chars)
    for (const name of names) {
      const cleanN = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const fallbackKey = keys.find(k => {
        const cleanK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        return cleanK.length >= 5 && cleanN.includes(cleanK);
      });
      if (fallbackKey && row[fallbackKey] !== undefined && row[fallbackKey] !== null && String(row[fallbackKey]).trim() !== '') {
        return String(row[fallbackKey]).trim();
      }
    }

    return "";
  };

  return {
    idStock: getVal("ID STOCK", "ID_STOCK", "IDSTOCK", "STOCK", "ID"),
    cliente: getVal("Cliente", "CLIENTE", "Nome Cliente", "Razão Social", "Oficina", "Mecanica", "Mecânica"),
    descricao: getVal("Descrição", "DESCRICAO", "Descrição do Item", "Nome da Peça", "Item", "Desc", "Produto"),
    codigo: getVal("Código", "CODIGO", "Código da Peça", "Cod", "Ref", "Codigo Fabrica"),
    marca: getVal("Marca", "MARCA", "Fabricante"),
    quantEstoque: getVal("Quant. em Estoque", "Quant em Estoque", "Quantidade em Estoque", "Quant", "Estoque", "Qtd"),
    fornecedor: getVal("Fornecedor", "FORNECEDOR", "Forn"),
    novoFornecedorFilial: getVal("Novo Fornecedor/Filial", "Novo Fornecedor", "Filial", "Novo Fornecedor / Filial"),
    statusDevolucao: getVal("Status Devolução", "Status Devolucao", "Status_Devolucao", "Status da Devolução", "Status de Devolução", "Status Devolucao Peça", "Status Devolucao Item", "Status Garantia", "Status Processo", "Status"),
    obsNotaFiscal: getVal("Obs Nota Fiscal", "Obs NF", "Observação Nota Fiscal", "Observação NF", "Nota Fiscal", "Obs_NF"),
    observacoesGerais: getVal("Observações gerais do item", "Observações Gerais", "Obs Gerais", "Observação", "Obs", "Motivo", "Observacoes"),
    localidade: getVal("Localidade", "LOCALIDADE", "Localizacao", "Localização", "Local"),
    dataRecebimento: getVal("Data_Recebimento", "Data Recebimento", "DataRecebimento", "Data de Recebimento", "Data Rec", "Recebimento"),
    dataSaida: getVal("Data_saida", "Data Saida", "Data_Saida", "Data de Saida", "Data Env", "Data Envio", "Envio"),
    dataIncidencia: getVal("Data de incidência", "Data de Incidencia", "Data de incidencia", "Data Incidencia", "Data_Incidencia", "Incidência", "Incidencia"),
    notaFiscalSaida: getVal("Nota Fiscal de Saída", "Nota Fiscal de Saida", "Nota fiscal de saída", "NF de Saída", "NF de Saida", "NF Saida", "NF_Saida", "Nota Fiscal Saida"),
    dataUltimaAlteracao: getVal("Data Última Alteração", "Data Ultima Alteração", "Data Ultima Alteracao", "Data_Ultima_Alteracao", "Data Alteracao", "Ultima Alteracao", "Data Modificacao", "Data Modificação"),
    ultimaInteracao: getVal("Última Interação", "Ultima Interacao", "Última Interaçao", "UltimaInteracao", "Última Alteração/Interação", "Ultima alteração", "Ultima Interação"),
    valorUnitario: getVal("Valor Unitário", "Valor Unitario", "Valor_Unitario", "Valor Unit", "Preço Unitário", "Preço Unitario", "Val Unit"),
    valorTotal: getVal("Valor total em estoque", "Valor Total em Estoque", "Valor Total", "Valor_Total", "Total em Estoque", "Valor Total Estoque", "Total"),
    dataCompra: getVal("Data compra", "Data Compra", "Data_Compra", "Data da Compra", "Data de Compra", "Data_compra", "Data Nota"),
    nfOrigem: getVal("NF Origem", "NF_Origem", "Nota Fiscal Origem", "NF Entrada", "Nota Fiscal de Origem", "NF_Entrada", "NF Compra"),
    dataSolicitacao: getVal("Data Solicitação", "Data Solicitacao", "Data_Solicitacao", "Data Solicitacao Devolucao")
  };
}

// Endpoint to fetch Google Sheet CSV data
app.get("/api/sheet-data", async (req, res) => {
  const customUrl = req.query.url as string;
  let sheetId = DEFAULT_SHEET_ID;
  let gid = DEFAULT_GID;

  if (customUrl) {
    const extracted = extractSheetIdAndGid(customUrl);
    sheetId = extracted.sheetId;
    gid = extracted.gid;
  }

  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const pubUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/pub?output=csv&gid=${gid}`;
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

  console.log(`Attempting to fetch Google Sheet ID: ${sheetId}, GID: ${gid}`);

  try {
    let csvText = "";
    // Primary attempt: gviz API (does not require export permissions for public sheets)
    let response = await fetch(gvizUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!response.ok) {
      // Secondary attempt: pubUrl
      response = await fetch(pubUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
    }

    if (!response.ok) {
      // Tertiary attempt: exportUrl
      response = await fetch(exportUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
    }

    if (response.ok) {
      csvText = await response.text();
    }

    if (csvText && csvText.trim().length > 0 && !csvText.includes("<!DOCTYPE html>")) {
      // Smart header detection: check if header row is not on row 1
      let rawLines = csvText.split(/\r?\n/);
      let headerRowIndex = 0;

      for (let i = 0; i < Math.min(rawLines.length, 15); i++) {
        const line = rawLines[i].toLowerCase();
        if (
          line.includes("status devolu") || 
          line.includes("status_devolucao") || 
          line.includes("id stock") || 
          line.includes("id_stock") ||
          line.includes("descricao") ||
          line.includes("descrição")
        ) {
          headerRowIndex = i;
          break;
        }
      }

      const cleanCsvText = headerRowIndex > 0 ? rawLines.slice(headerRowIndex).join("\n") : csvText;

      const parsed = Papa.parse(cleanCsvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim()
      });

      if (parsed.data && parsed.data.length > 0) {
        let allParsedRows = parsed.data.map(normalizeRow).filter(r => r.idStock || r.cliente || r.descricao || r.statusDevolucao);
        
        // Filter specifically by Status Devolução matching official warranty statuses
        const warrantyRows = allParsedRows.filter(r => isAllowedWarrantyStatus(r.statusDevolucao));
        let rows = warrantyRows.length > 0 ? warrantyRows : allParsedRows;

        if (rows.length > 0) {
          // Standardize statusDevolucao values
          rows = rows.map(r => ({
            ...r,
            statusDevolucao: canonicalizeWarrantyStatus(r.statusDevolucao)
          }));

          const totalFound = rows.length;

          // Extract unique localidades across all warranty rows
          const uniqueLocalidades = Array.from(
            new Set(rows.map(r => r.localidade?.trim()).filter(Boolean))
          ).sort();

          // Check if localidade filter was explicitly requested in query
          const targetLocalidade = (req.query.localidade as string)?.trim().toLowerCase();
          if (targetLocalidade && targetLocalidade !== 'all' && targetLocalidade !== 'todas') {
            rows = rows.filter(r => r.localidade?.toLowerCase().includes(targetLocalidade));
          }

          return res.json({
            success: true,
            source: "google_sheets",
            totalRows: totalFound,
            filteredRowsCount: rows.length,
            availableLocalidades: uniqueLocalidades,
            sheetId,
            gid,
            data: rows
          });
        }
      }
    }

    console.warn("Could not parse rows from fetched CSV or sheet is private. Returning fallback data.");
    return res.json({
      success: true,
      source: "fallback_sample",
      message: "Planilha online requer permissão ou está indisponível. Exibindo dados de demonstração predefinidos.",
      totalRows: SAMPLE_DATA.length,
      data: SAMPLE_DATA
    });

  } catch (error: any) {
    console.error("Error fetching sheet:", error.message);
    return res.json({
      success: true,
      source: "fallback_sample",
      message: "Não foi possível conectar à planilha online. Exibindo dados de amostra.",
      totalRows: SAMPLE_DATA.length,
      data: SAMPLE_DATA
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Endpoint to receive item updates (Status Devolução, Obs Nota Fiscal, Observações Gerais)
// and sync with Google Apps Script Webhook if configured
app.post("/api/update-items", async (req, res) => {
  try {
    const { items: updatedItems, webhookUrl } = req.body;

    if (!Array.isArray(updatedItems) || updatedItems.length === 0) {
      return res.status(400).json({ success: false, message: "Nenhum item enviado para atualização." });
    }

    // Update in-memory sample dataset for items that exist in SAMPLE_DATA
    for (const item of updatedItems) {
      const idx = SAMPLE_DATA.findIndex(s => s.idStock && s.idStock === item.idStock);
      if (idx !== -1) {
        SAMPLE_DATA[idx] = {
          ...SAMPLE_DATA[idx],
          ...item
        };
      }
    }

    const targetWebhook = webhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    let syncedToSheet = false;
    let webhookMessage = "";

    if (targetWebhook && targetWebhook.trim().startsWith("http")) {
      try {
        const webhookRes = await fetch(targetWebhook.trim(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedItems)
        });

        if (webhookRes.ok) {
          syncedToSheet = true;
          webhookMessage = "Alterações enviadas e gravadas com sucesso na sua Planilha Google!";
        } else {
          webhookMessage = `O Webhook da planilha respondeu com status ${webhookRes.status}. As alterações foram salvas localmente.`;
        }
      } catch (err: any) {
        console.error("Erro ao enviar para Google Apps Script Webhook:", err.message);
        webhookMessage = "Não foi possível conectar ao Webhook do Google Sheets. As alterações foram salvas no sistema.";
      }
    } else {
      webhookMessage = "Alterações salvas localmente no sistema. Para gravar em tempo real na sua planilha Google, configure a URL do Webhook do Google Apps Script.";
    }

    return res.json({
      success: true,
      updatedCount: updatedItems.length,
      syncedToSheet,
      message: webhookMessage
    });

  } catch (error: any) {
    console.error("Error in /api/update-items:", error);
    return res.status(500).json({ success: false, message: "Erro interno ao atualizar itens." });
  }
});

// API 404 handler - ensure /api/* requests never fall through to Vite SPA HTML
app.use("/api/*", (req, res) => {
  res.status(404).json({ success: false, message: "Rota da API não encontrada." });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
