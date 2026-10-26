import express from "express";
import path from "path";
import crypto from "crypto";
import zlib from "zlib";
import { createServer as createViteServer } from "vite";
import Papa from "papaparse";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

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
    protocolo: "PROT-88401",
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
  },
  {
    idStock: "STK-2001",
    cliente: "Mecânica Rápida",
    descricao: "FILTRO DE OLEO MOTOR Wega",
    codigo: "WO-200",
    marca: "WEGA",
    quantEstoque: "20",
    fornecedor: "Auto Peças Brasil Ltda",
    novoFornecedorFilial: "Filial Sul - Curitiba",
    statusDevolucao: "A negociar",
    obsNotaFiscal: "Devolução em análise comercial.",
    observacoesGerais: "Cliente solicitou devolução por divergência no pedido.",
    localidade: "Estoque Geral",
    dataRecebimento: "14/07/2026",
    dataSaida: "22/07/2026",
    valorUnitario: "R$ 35,00",
    valorTotal: "R$ 700,00",
    dataCompra: "10/06/2026",
    nfOrigem: "NF-66102"
  },
  {
    idStock: "STK-2002",
    cliente: "Oficina do João",
    descricao: "DISCO DE FREIO TRASEIRO",
    codigo: "HF-32B",
    marca: "HIPERFREIOS",
    quantEstoque: "4",
    fornecedor: "Distribuidora Velox",
    novoFornecedorFilial: "Matriz - São Paulo",
    statusDevolucao: "Aprovado",
    obsNotaFiscal: "Aprovado para emissão de nota de crédito.",
    observacoesGerais: "Devolução aceita conforme políticas da empresa.",
    localidade: "Estoque Geral",
    dataRecebimento: "18/07/2026",
    dataSaida: "26/07/2026",
    valorUnitario: "R$ 130,00",
    valorTotal: "R$ 520,00",
    dataCompra: "12/06/2026",
    nfOrigem: "NF-77301"
  },
  {
    idStock: "STK-2003",
    cliente: "Auto Peças Lider",
    descricao: "RADIADOR DE AGUA ALUMÍNIO",
    codigo: "RD-9011",
    marca: "VISCONDE",
    quantEstoque: "2",
    fornecedor: "Comercial Peças Express",
    novoFornecedorFilial: "Filial SP - Campinas",
    statusDevolucao: "Em negociação",
    obsNotaFiscal: "Proposta de abatimento enviada ao fornecedor.",
    observacoesGerais: "Aguardando retorno do compras sobre lote negociado.",
    localidade: "Estoque Geral",
    dataRecebimento: "08/07/2026",
    dataSaida: "18/07/2026",
    valorUnitario: "R$ 450,00",
    valorTotal: "R$ 900,00",
    dataCompra: "01/05/2026",
    nfOrigem: "NF-88120"
  },
  {
    idStock: "STK-2004",
    cliente: "Car Service SP",
    descricao: "SAPATA DE FREIO COM LONA",
    codigo: "SP-402",
    marca: "FRAS-LE",
    quantEstoque: "10",
    fornecedor: "Distribuidora Velox",
    novoFornecedorFilial: "Filial RJ - Duque de Caxias",
    statusDevolucao: "Emitir NF",
    obsNotaFiscal: "Solicitado emissão de NF de devolução.",
    observacoesGerais: "Autorização de devolução nº 4410 gerada.",
    localidade: "Estoque Geral",
    dataRecebimento: "02/07/2026",
    dataSaida: "12/07/2026",
    valorUnitario: "R$ 75,00",
    valorTotal: "R$ 750,00",
    dataCompra: "15/05/2026",
    nfOrigem: "NF-99201"
  },
  {
    idStock: "STK-2005",
    cliente: "Retífica Central",
    descricao: "CABECOTE MOTOR COMPLETE 1.6 16V",
    codigo: "CB-1600",
    marca: "TAKAO",
    quantEstoque: "1",
    fornecedor: "Auto Peças Brasil Ltda",
    novoFornecedorFilial: "Filial MG - Belo Horizonte",
    statusDevolucao: "Passivo em analise",
    obsNotaFiscal: "Passivo em análise técnica pela gerência.",
    observacoesGerais: "Análise técnica interna de viabilidade financeira.",
    localidade: "Estoque Geral",
    dataRecebimento: "22/06/2026",
    dataSaida: "05/07/2026",
    valorUnitario: "R$ 2.400,00",
    valorTotal: "R$ 2.400,00",
    dataCompra: "10/04/2026",
    nfOrigem: "NF-11204"
  },
  {
    idStock: "STK-2006",
    cliente: "Garagem 500",
    descricao: "BATERIA AUTOMOTIVA 60AH",
    codigo: "BT-60A",
    marca: "HELIAR",
    quantEstoque: "3",
    fornecedor: "Bosch do Brasil Ltda",
    novoFornecedorFilial: "Filial SP - Campinas",
    statusDevolucao: "Recusado",
    obsNotaFiscal: "Devolução recusada por avaria mecânica no casco.",
    observacoesGerais: "Item com avaria externa decorrente de mau uso.",
    localidade: "Estoque Geral",
    dataRecebimento: "05/06/2026",
    dataSaida: "15/06/2026",
    valorUnitario: "R$ 380,00",
    valorTotal: "R$ 1.140,00",
    dataCompra: "01/03/2026",
    nfOrigem: "NF-33019"
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

function buildHeaderKeyMap(keys: string[]) {
  const findKey = (...names: string[]) => {
    // 1st PASS: Exact match ignoring case and accents
    for (const name of names) {
      const cleanN = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const exactKey = keys.find(k => {
        const cleanK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        return cleanK === cleanN;
      });
      if (exactKey) return exactKey;
    }

    // 2nd PASS: Column header contains candidate name
    for (const name of names) {
      const cleanN = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (cleanN.length < 3) continue;
      const containsKey = keys.find(k => {
        const cleanK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        return cleanK.includes(cleanN);
      });
      if (containsKey) return containsKey;
    }

    // 3rd PASS: Target name contains column header
    for (const name of names) {
      const cleanN = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const fallbackKey = keys.find(k => {
        const cleanK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        return cleanK.length >= 5 && cleanN.includes(cleanK);
      });
      if (fallbackKey) return fallbackKey;
    }

    return null;
  };

  return {
    protocolo: findKey("Protocolo", "PROTOCOLO", "Num Protocolo", "Número Protocolo", "Nº Protocolo", "Prot", "COD PROTOCOLO"),
    idStock: findKey("ID STOCK", "ID_STOCK", "IDSTOCK", "STOCK", "ID"),
    cliente: findKey("Cliente", "CLIENTE", "Nome Cliente", "Razão Social", "Oficina", "Mecanica", "Mecânica"),
    descricao: findKey("Descrição", "DESCRICAO", "Descrição do Item", "Nome da Peça", "Item", "Desc", "Produto"),
    codigo: findKey("Código", "CODIGO", "Código da Peça", "Cod", "Ref", "Codigo Fabrica"),
    marca: findKey("Marca", "MARCA", "Fabricante"),
    quantEstoque: findKey("Quant. em Estoque", "Quant em Estoque", "Quantidade em Estoque", "Quant", "Estoque", "Qtd"),
    fornecedor: findKey("Fornecedor", "FORNECEDOR", "Forn"),
    novoFornecedorFilial: findKey("Novo Fornecedor/Filial", "Novo Fornecedor", "Filial", "Novo Fornecedor / Filial"),
    fornecedorOriginal: findKey("Fornecedor Original", "FORNECEDOR ORIGINAL", "Forn Original", "Fornecedor_Original", "Fornecedor Original do Item"),
    statusDevolucao: findKey("Status Devolução", "Status Devolucao", "Status_Devolucao", "Status da Devolução", "Status de Devolução", "Status Devolucao Peça", "Status Devolucao Item", "Status Garantia", "Status Processo", "Status"),
    obsNotaFiscal: findKey("Obs Nota Fiscal", "Obs NF", "Observação Nota Fiscal", "Observação NF", "Nota Fiscal", "Obs_NF"),
    observacoesGerais: findKey("Observações gerais do item", "Observações Gerais", "Obs Gerais", "Observação", "Obs", "Observacoes"),
    motivo: findKey("Motivo de garantia", "Motivo de Garantia", "Motivo da garantia", "Motivo da Garantia", "Motivo Garantia", "Motivo", "Motivo Troca", "Defeito", "Problema Relatado", "Causa", "Motivo do retorno"),
    obsStatusDevolucao: findKey("Observação do status de devolução", "Observacao do status de devolucao", "Observação status de devolução", "Observação do status", "Obs do status de devolução", "Obs Status Devolução", "Obs status devolucao", "Obs Status"),
    localidade: findKey("Localidade", "LOCALIDADE", "Localizacao", "Localização", "Local"),
    dataRecebimento: findKey("Data_Recebimento", "Data Recebimento", "DataRecebimento", "Data de Recebimento", "Data Rec", "Recebimento"),
    dataSaida: findKey("Data_saida", "Data Saida", "Data_Saida", "Data de Saida", "Data Env", "Data Envio", "Envio"),
    dataIncidencia: findKey("Data de incidência", "Data de Incidencia", "Data de incidencia", "Data Incidencia", "Data_Incidencia", "Incidência", "Incidencia"),
    notaFiscalSaida: findKey("Nota Fiscal de Saída", "Nota Fiscal de Saida", "Nota fiscal de saída", "NF de Saída", "NF de Saida", "NF Saida", "NF_Saida", "Nota Fiscal Saida"),
    dataUltimaAlteracao: findKey("Data Última Alteração", "Data Ultima Alteração", "Data Ultima Alteracao", "Data_Ultima_Alteracao", "Data Alteracao", "Ultima Alteracao", "Data Modificacao", "Data Modificação"),
    ultimaInteracao: findKey("Última Interação", "Ultima Interacao", "Última Interaçao", "UltimaInteracao", "Última Alteração/Interação", "Ultima alteração", "Ultima Interação"),
    valorUnitario: findKey("Valor Unitário", "Valor Unitario", "Valor_Unitario", "Valor Unit", "Preço Unitário", "Preço Unitario", "Val Unit"),
    valorTotal: findKey("Valor total em estoque", "Valor Total em Estoque", "Valor Total", "Valor_Total", "Total em Estoque", "Valor Total Estoque", "Total"),
    dataCompra: findKey("Data compra", "Data Compra", "Data_Compra", "Data da Compra", "Data de Compra", "Data_compra", "Data Nota"),
    nfOrigem: findKey("NF Origem", "NF_Origem", "Nota Fiscal Origem", "NF Entrada", "Nota Fiscal de Origem", "NF_Entrada", "NF Compra"),
    dataSolicitacao: findKey("Data Solicitação", "Data Solicitacao", "Data_Solicitacao", "Data Solicitacao Devolucao"),
    urgenteKey: findKey("Urgente", "URGENTE", "Prioridade", "Urgência")
  };
}

function normalizeRow(row: any, headerMap?: ReturnType<typeof buildHeaderKeyMap>) {
  if (!headerMap) {
    const keys = Object.keys(row);
    headerMap = buildHeaderKeyMap(keys);
  }

  const getVal = (keyName: keyof typeof headerMap) => {
    const k = headerMap[keyName];
    if (k && row[k] !== undefined && row[k] !== null) {
      return String(row[k]).trim();
    }
    return "";
  };

  const statusDev = getVal("statusDevolucao");
  const urgVal = getVal("urgenteKey");

  return {
    protocolo: getVal("protocolo"),
    idStock: getVal("idStock"),
    cliente: getVal("cliente"),
    descricao: getVal("descricao"),
    codigo: getVal("codigo"),
    marca: getVal("marca"),
    quantEstoque: getVal("quantEstoque"),
    fornecedor: getVal("fornecedor"),
    novoFornecedorFilial: getVal("novoFornecedorFilial"),
    fornecedorOriginal: getVal("fornecedorOriginal"),
    statusDevolucao: statusDev,
    obsNotaFiscal: getVal("obsNotaFiscal"),
    observacoesGerais: getVal("observacoesGerais"),
    motivo: getVal("motivo") || getVal("observacoesGerais"),
    obsStatusDevolucao: getVal("obsStatusDevolucao"),
    localidade: getVal("localidade"),
    dataRecebimento: getVal("dataRecebimento"),
    dataSaida: getVal("dataSaida"),
    dataIncidencia: getVal("dataIncidencia"),
    notaFiscalSaida: getVal("notaFiscalSaida"),
    dataUltimaAlteracao: getVal("dataUltimaAlteracao"),
    ultimaInteracao: getVal("ultimaInteracao"),
    valorUnitario: getVal("valorUnitario"),
    valorTotal: getVal("valorTotal"),
    dataCompra: getVal("dataCompra"),
    nfOrigem: getVal("nfOrigem"),
    dataSolicitacao: getVal("dataSolicitacao"),
    urgente: Boolean(
      urgVal.toLowerCase().includes("sim") ||
      urgVal.toLowerCase().includes("urg") ||
      statusDev.toLowerCase().includes("urgente")
    )
  };
}

// Cache interface and storage to prevent Google Sheets 429 (Rate Exceeded) errors
interface SheetCacheEntry {
  totalFound: number;
  availableLocalidades: string[];
  allRows: any[];
  timestamp: number;
}
const sheetCache = new Map<string, SheetCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
const isFetchingMap = new Map<string, boolean>();

async function fetchAndParseGoogleSheet(sheetId: string, gid: string): Promise<SheetCacheEntry | null> {
  const timestamp = Date.now();
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}&_t=${timestamp}`;
  const pubUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/pub?output=csv&gid=${gid}&_t=${timestamp}`;
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}&_t=${timestamp}`;

  console.log(`[Google Sheets Fetch] Fetching ID: ${sheetId}, GID: ${gid}`);

  const urlsToTry = [gvizUrl, pubUrl, exportUrl];

  for (const url of urlsToTry) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(25000)
      });

      if (!response.ok) {
        console.warn(`[Google Sheets Fetch] ${url} returned status ${response.status}`);
        continue;
      }

      const csvText = await response.text();
      if (!csvText || csvText.trim().length === 0 || csvText.includes("<!DOCTYPE html>")) {
        console.warn(`[Google Sheets Fetch] ${url} returned HTML or empty content`);
        continue;
      }

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
        const firstRowKeys = parsed.meta?.fields || Object.keys(parsed.data[0] || {});
        const headerMap = buildHeaderKeyMap(firstRowKeys);

        let allParsedRows = parsed.data.map((rawRow: any, idx: number) => {
          const norm = normalizeRow(rawRow, headerMap);
          return {
            ...norm,
            sheetRowNumber: headerRowIndex + 2 + idx
          };
        }).filter(r => r.idStock || r.cliente || r.descricao || r.statusDevolucao);

        if (allParsedRows.length > 0) {
          allParsedRows = allParsedRows.map(r => ({
            ...r,
            statusDevolucao: canonicalizeWarrantyStatus(r.statusDevolucao)
          }));

          const totalFound = allParsedRows.length;
          const uniqueLocalidades = Array.from(
            new Set(allParsedRows.map(r => r.localidade?.trim()).filter(Boolean))
          ).sort();

          const cacheEntry: SheetCacheEntry = {
            totalFound,
            availableLocalidades: uniqueLocalidades,
            allRows: allParsedRows,
            timestamp: Date.now()
          };

          const cacheKey = `${sheetId}_${gid}`;
          sheetCache.set(cacheKey, cacheEntry);
          console.log(`[Google Sheets Cache] Successfully updated cache for ${cacheKey} (${totalFound} rows from ${url})`);
          return cacheEntry;
        }
      }
    } catch (fetchErr: any) {
      console.warn(`[Google Sheets Fetch] Error fetching ${url}: ${fetchErr.message}`);
    }
  }

  return null;
}

// Endpoint to fetch Google Sheet CSV data
// Cloud Run (AI Studio) recusa respostas acima de 32 MB; a planilha inteira em JSON passa de 50 MB.
// Compacta com gzip quando o navegador aceita (sempre, na prática): fica em torno de 10% do tamanho.
function sendLargeJson(req: express.Request, res: express.Response, body: unknown) {
  const json = JSON.stringify(body);
  res.setHeader("Vary", "Accept-Encoding");
  if (!/\bgzip\b/.test(String(req.headers["accept-encoding"] || ""))) {
    return res.type("application/json").send(json);
  }
  const gz = zlib.gzipSync(json, { level: 6 });
  res.setHeader("Content-Encoding", "gzip");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.send(gz);
}

app.get("/api/sheet-data", async (req, res) => {
  const customUrl = req.query.url as string;
  const forceRefresh = req.query.force === 'true' || req.query.noCache === 'true';
  let sheetId = DEFAULT_SHEET_ID;
  let gid = DEFAULT_GID;

  if (customUrl) {
    const extracted = extractSheetIdAndGid(customUrl);
    sheetId = extracted.sheetId;
    gid = extracted.gid;
  }

  const cacheKey = `${sheetId}_${gid}`;
  const existingCache = sheetCache.get(cacheKey);

  if (forceRefresh) {
    sheetCache.delete(cacheKey);
  }

  const targetLocalidade = (req.query.localidade as string)?.trim().toLowerCase();
  const cachedEntry = sheetCache.get(cacheKey);

  // Helper to construct response from row dataset
  const buildSuccessResponse = (allRows: any[], totalFound: number, uniqueLocalidades: string[], isCached: boolean, noticeMsg?: string) => {
    let filtered = allRows;
    if (targetLocalidade && targetLocalidade !== 'all' && targetLocalidade !== 'todas') {
      filtered = allRows.filter(r => r.localidade?.toLowerCase().includes(targetLocalidade));
    }
    return sendLargeJson(req, res, {
      success: true,
      source: isCached ? "google_sheets_cached" : "google_sheets",
      message: noticeMsg,
      totalRows: totalFound,
      filteredRowsCount: filtered.length,
      availableLocalidades: uniqueLocalidades,
      sheetId,
      gid,
      data: filtered
    });
  };

  // If force refreshing, try fetching fresh data. If it times out or fails, fallback to existing cache if available.
  if (forceRefresh) {
    isFetchingMap.set(cacheKey, true);
    const freshCache = await fetchAndParseGoogleSheet(sheetId, gid).finally(() => {
      isFetchingMap.set(cacheKey, false);
    });

    if (freshCache) {
      return buildSuccessResponse(freshCache.allRows, freshCache.totalFound, freshCache.availableLocalidades, false);
    } else if (existingCache) {
      console.warn("Force refresh failed or timed out. Falling back to existing cached entry.");
      return buildSuccessResponse(
        existingCache.allRows,
        existingCache.totalFound,
        existingCache.availableLocalidades,
        true,
        "Aviso: Não foi possível atualizar do Google Sheets no momento (tempo limite esgotado). Exibindo dados em cache."
      );
    }
  }

  // 1. If cache is fresh (< 5 mins), return immediately
  if (cachedEntry && (Date.now() - cachedEntry.timestamp) < CACHE_TTL_MS) {
    return buildSuccessResponse(cachedEntry.allRows, cachedEntry.totalFound, cachedEntry.availableLocalidades, true);
  }

  // 2. If stale cache exists, return stale cache immediately and trigger async background refresh
  if (cachedEntry) {
    if (!isFetchingMap.get(cacheKey)) {
      isFetchingMap.set(cacheKey, true);
      fetchAndParseGoogleSheet(sheetId, gid).finally(() => {
        isFetchingMap.set(cacheKey, false);
      });
    }
    return buildSuccessResponse(cachedEntry.allRows, cachedEntry.totalFound, cachedEntry.availableLocalidades, true);
  }

  // 3. Cold start: No cache available yet. Perform fetch synchronously.
  isFetchingMap.set(cacheKey, true);
  const freshCache = await fetchAndParseGoogleSheet(sheetId, gid).finally(() => {
    isFetchingMap.set(cacheKey, false);
  });

  if (freshCache) {
    return buildSuccessResponse(freshCache.allRows, freshCache.totalFound, freshCache.availableLocalidades, false);
  }

  if (existingCache) {
    console.warn("Fetch failed, falling back to existing cache.");
    return buildSuccessResponse(
      existingCache.allRows,
      existingCache.totalFound,
      existingCache.availableLocalidades,
      true,
      "Aviso: Conexão com Google Sheets indisponível no momento. Exibindo dados salvos em cache."
    );
  }

  // Fallback to sample data if cold start fetch fails
  const sampleDataWithRows = SAMPLE_DATA.map((item: any, idx) => ({
    ...item,
    sheetRowNumber: item.sheetRowNumber || (idx + 2)
  }));

  console.warn("Could not parse rows from fetched CSV or sheet is private. Returning fallback data.");
  return res.json({
    success: true,
    source: "fallback_sample",
    message: "Planilha online requer permissão ou está indisponível. Exibindo dados de demonstração predefinidos.",
    totalRows: sampleDataWithRows.length,
    data: sampleDataWithRows
  });
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

    // Update in-memory sample dataset and cache entries for items
    for (const item of updatedItems) {
      const idx = SAMPLE_DATA.findIndex(s => s.idStock && s.idStock === item.idStock);
      if (idx !== -1) {
        SAMPLE_DATA[idx] = {
          ...SAMPLE_DATA[idx],
          ...item
        };
      }
      for (const [cacheKey, entry] of sheetCache.entries()) {
        const rowIdx = entry.allRows.findIndex(r => r.idStock && r.idStock === item.idStock);
        if (rowIdx !== -1) {
          entry.allRows[rowIdx] = {
            ...entry.allRows[rowIdx],
            ...item
          };
        }
      }
    }

    // A URL dos Secrets (GOOGLE_SHEETS_WEBHOOK_URL) sempre vence; a URL guardada no navegador só vale sem secret.
    // Antes, uma URL antiga salva em algum navegador era usada no lugar da correta ("Nao autorizado").
    const targetWebhook = (process.env.GOOGLE_SHEETS_WEBHOOK_URL || "").trim() || webhookUrl;
    let syncedToSheet = false;
    let webhookMessage = "";

    if (targetWebhook && targetWebhook.trim().startsWith("http")) {
      try {
        const webhookRes = await fetch(targetWebhook.trim(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedItems),
          redirect: 'follow'
        });

        const respText = await webhookRes.text();
        let respJson: any = {};
        const isHtml = respText.trim().startsWith("<!DOCTYPE html>") || respText.includes("<html");
        try {
          respJson = JSON.parse(respText);
        } catch {
          respJson = { raw: respText };
        }

        const notFound: string[] = Array.isArray(respJson.notFound) ? respJson.notFound : [];
        if (!isHtml && respJson.success !== false && !respJson.error && (respJson.success || respJson.updatedCount !== undefined)) {
          syncedToSheet = notFound.length === 0;
          webhookMessage = notFound.length === 0
            ? "Alterações gravadas na planilha."
            : `Gravado em parte. NÃO encontrados na planilha: ${notFound.join(", ")}.`;
        } else {
          const reason = isHtml ? "O Google Apps Script retornou uma página HTML/Login (verifique se 'Quem tem acesso' está como 'Qualquer pessoa')." : (respJson.error || respJson.raw || `Status ${webhookRes.status}`);
          webhookMessage = `Alteração NÃO gravada na planilha: ${reason}`;
        }
      } catch (err: any) {
        console.error("Erro ao enviar para Google Apps Script Webhook:", err.message);
        webhookMessage = `Alteração NÃO gravada: não foi possível conectar ao Webhook da planilha (${err.message}).`;
      }
    } else {
      webhookMessage = "Alteração NÃO gravada: a gravação na planilha não está configurada (GOOGLE_SHEETS_WEBHOOK_URL).";
    }

    return res.json({
      success: syncedToSheet,
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
// ---------------------------------------------------------------------------
// Brother label printing: form rows -> CSV in memory -> Google Drive file.
// A local watcher (Google Drive for Desktop + script on the printer PC) only
// reacts to a NEW file appearing, so we always trash the old file with the same
// name and create a brand-new one. Never update the content of an existing file.
// ---------------------------------------------------------------------------

// Same columns/order as the CSVs the printer-side watcher already consumes.
const BROTHER_CSV_HEADER = ["ID", "CODIGO", "DESCRICAO ITEM", "Qtd.", "MARCA", "FORNECEDOR", "Qtd. IMPRESSA"];
// watcher.js only prints files with one of these exact names (normal / avulsa).
const BROTHER_DEFAULT_FILENAME = "impressao-etiquetas-qrcode - etiquetas-avulsa-brother.csv";
// Supplier labels (Fornecedor / Filial / Volume) use the other name, so batches never trash each other.
const BROTHER_FORNECEDOR_FILENAME = "impressao-etiquetas-qrcode - etiquetas-brother.csv";
// Gap between trashing the old file and creating the new one, so Drive for Desktop
// sees a delete followed by a new file (chokidar folds a fast unlink+add into "change").
const BROTHER_TRASH_TO_CREATE_DELAY_MS = 2000;

interface BrotherLabelRow {
  id?: string;
  codigo?: string;
  marca?: string;
  descricao?: string;
  qtd?: string | number;
  fornecedor?: string;
  qtdImpressa?: string;
}

function csvField(value: unknown): string {
  const s = value === undefined || value === null ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildBrotherCsv(rows: BrotherLabelRow[]): string {
  const lines = [BROTHER_CSV_HEADER.join(",")];
  for (const r of rows) {
    const qtdNum = parseInt(String(r.qtd ?? "").trim(), 10);
    const qtd = Number.isFinite(qtdNum) && qtdNum > 0 ? qtdNum : 1;
    lines.push([
      csvField((r.id ?? "").toString().trim()),
      csvField((r.codigo ?? "").toString().trim()),
      csvField((r.descricao ?? "").toString().trim()),
      String(qtd),
      csvField((r.marca ?? "").toString().trim()),
      csvField((r.fornecedor ?? "").toString().trim()),
      csvField((r.qtdImpressa ?? "").toString().trim())
    ].join(","));
  }
  // CRLF everywhere, including a trailing CRLF after the last data row
  return lines.join("\r\n") + "\r\n";
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getDriveAccessToken(): Promise<string> {
  const clientEmail = (process.env.GOOGLE_CLIENT_EMAIL || "").trim();
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  if (!clientEmail || !privateKey) {
    throw new Error("Credenciais da Service Account não configuradas (GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY).");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const signature = base64url(crypto.createSign("RSA-SHA256").update(`${header}.${claim}`).sign(privateKey));

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${signature}`
    })
  });
  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.access_token) {
    throw new Error(`Falha ao autenticar a Service Account: ${data.error_description || data.error || resp.status}`);
  }
  return data.access_token;
}

async function driveRequest(token: string, url: string, init: RequestInit = {}): Promise<any> {
  const resp = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) }
  });
  const text = await resp.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch (_) {}
  if (!resp.ok) {
    throw new Error(`Google Drive ${resp.status}: ${data?.error?.message || text.slice(0, 200)}`);
  }
  return data;
}

// Trash every file with the fixed name in the folder, then create a new one from scratch.
async function replaceDriveFileAsNew(folderId: string, fileName: string, content: string) {
  const token = await getDriveAccessToken();
  const DRIVE = "https://www.googleapis.com/drive/v3/files";
  const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

  const escapedName = fileName.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const q = `name = '${escapedName}' and '${folderId}' in parents and trashed = false`;
  const listParams = new URLSearchParams({
    q,
    fields: "files(id,name)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    pageSize: "100"
  });
  const existing = await driveRequest(token, `${DRIVE}?${listParams}`);
  const toTrash: { id: string }[] = existing?.files || [];

  for (const f of toTrash) {
    await driveRequest(token, `${DRIVE}/${f.id}?supportsAllDrives=true`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trashed: true })
    });
  }

  if (toTrash.length > 0) {
    await new Promise(resolve => setTimeout(resolve, BROTHER_TRASH_TO_CREATE_DELAY_MS));
  }

  const boundary = `brother-${Date.now()}`;
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify({ name: fileName, parents: [folderId], mimeType: "text/csv" }) + `\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/csv; charset=UTF-8\r\n\r\n` +
    content + `\r\n` +
    `--${boundary}--`;

  const created = await driveRequest(token, `${UPLOAD}?uploadType=multipart&supportsAllDrives=true&fields=id,name`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body
  });

  return { fileId: created?.id as string, trashedCount: toTrash.length };
}

app.post("/api/export-brother", async (req, res) => {
  const folderId = (process.env.BROTHER_DRIVE_FOLDER_ID || "").trim();
  const fileName = req.body?.mode === "fornecedor"
    ? BROTHER_FORNECEDOR_FILENAME
    : (process.env.BROTHER_CSV_FILENAME || BROTHER_DEFAULT_FILENAME).trim();
  if (!folderId) {
    return res.status(500).json({
      success: false,
      message: "Impressão Brother não configurada no servidor (BROTHER_DRIVE_FOLDER_ID)."
    });
  }

  const rawRows: BrotherLabelRow[] = Array.isArray(req.body?.rows) ? req.body.rows : [];
  const rows = rawRows.filter(r =>
    [r?.codigo, r?.marca, r?.descricao].some(v => String(v ?? "").trim() !== "")
  );
  if (rows.length === 0) {
    return res.status(400).json({ success: false, message: "Nenhuma linha preenchida para impressão." });
  }

  try {
    const csv = buildBrotherCsv(rows);
    const { fileId, trashedCount } = await replaceDriveFileAsNew(folderId, fileName, csv);
    return res.json({
      success: true,
      message: `CSV com ${rows.length} ${rows.length === 1 ? "linha" : "linhas"} enviado para a pasta Brother no Google Drive.`,
      fileId,
      trashedCount
    });
  } catch (err: any) {
    console.error("[export-brother]", err);
    return res.status(500).json({ success: false, message: `Falha ao enviar CSV para o Google Drive: ${err.message}` });
  }
});

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

export default app;
