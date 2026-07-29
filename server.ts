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

function isAllowedWarrantyStatus(statusStr?: string): boolean {
  if (!statusStr || !statusStr.trim()) return false;
  const cleanInput = normalizeStatusStr(statusStr);
  if (!cleanInput) return false;

  return OFFICIAL_WARRANTY_STATUSES.some(official => {
    const cleanOfficial = normalizeStatusStr(official);
    return cleanInput === cleanOfficial || cleanInput.includes(cleanOfficial) || cleanOfficial.includes(cleanInput);
  });
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
    dataSaida: "20/07/2026"
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
    dataSaida: "15/07/2026"
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
    dataSaida: "25/07/2026"
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
    observacoesGerais: "Item aplicado em teste e devolvido. Caixa original preservada.",
    localidade: "Mecanizou - Garantia",
    dataRecebimento: "01/07/2026",
    dataSaida: "10/07/2026"
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
    dataSaida: "28/07/2026"
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
    dataSaida: "02/07/2026"
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
    dataSaida: "22/06/2026"
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
    dataSaida: "10/05/2026"
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
    obsNotaFiscal: "Sem acordo comercil no momento.",
    observacoesGerais: "Falta laudo técnico do instalador.",
    localidade: "Estoque Geral",
    dataRecebimento: "10/04/2026",
    dataSaida: "18/04/2026"
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
    dataSaida: getVal("Data_saida", "Data Saida", "Data_Saida", "Data de Saida", "Data Env", "Data Envio", "Envio")
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
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true
      });

      if (parsed.data && parsed.data.length > 0) {
        let rows = parsed.data.map(normalizeRow).filter(r => r.idStock || r.cliente || r.descricao);
        
        // Filter specifically by Status Devolução matching official Warranty Statuses (disregarding Localidade column)
        const filteredByWarrantyStatus = rows.filter(r => isAllowedWarrantyStatus(r.statusDevolucao));
        if (filteredByWarrantyStatus.length > 0) {
          rows = filteredByWarrantyStatus;
        }

        if (rows.length > 0) {
          return res.json({
            success: true,
            source: "google_sheets",
            totalRows: rows.length,
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
