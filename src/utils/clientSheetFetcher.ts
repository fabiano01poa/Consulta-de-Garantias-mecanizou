import Papa from 'papaparse';
import { StockItem } from '../types';

export function extractSheetIdAndGid(urlStr: string): { sheetId: string; gid: string } {
  let sheetId = "1daGWs2SPXQsN9YLJBggtyX0Wdqpv2kgBcB4mOUrhe7M";
  let gid = "1870385864";

  if (!urlStr) return { sheetId, gid };

  const idMatch = urlStr.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (idMatch && idMatch[1]) {
    sheetId = idMatch[1];
  }

  const gidMatch = urlStr.match(/[?&]gid=([0-9]+)/);
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

function normalizeRow(row: any, headerMap?: ReturnType<typeof buildHeaderKeyMap>): StockItem {
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

export async function fetchSheetDirectlyFromClient(sheetUrl: string): Promise<{
  rows: StockItem[];
  totalRows: number;
  availableLocalidades: string[];
} | null> {
  try {
    const { sheetId, gid } = extractSheetIdAndGid(sheetUrl);
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
    const pubUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/pub?output=csv&gid=${gid}`;

    const urlsToTry = [gvizUrl, pubUrl];

    for (const url of urlsToTry) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;

        const csvText = await response.text();
        if (!csvText || csvText.trim().length === 0 || csvText.includes("<!DOCTYPE html>")) {
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
          const firstRowKeys = parsed.meta?.fields || Object.keys((parsed.data[0] as any) || {});
          const headerMap = buildHeaderKeyMap(firstRowKeys);

          const allParsedRows: StockItem[] = (parsed.data as any[])
            .map((rawRow: any, idx: number) => {
              const norm = normalizeRow(rawRow, headerMap);
              return {
                ...norm,
                sheetRowNumber: headerRowIndex + 2 + idx
              };
            })
            .filter(r => r.idStock || r.cliente || r.descricao || r.statusDevolucao);

          if (allParsedRows.length > 0) {
            const availableLocalidades = Array.from(
              new Set(allParsedRows.map(r => r.localidade?.trim()).filter(Boolean) as string[])
            ).sort();

            return {
              rows: allParsedRows,
              totalRows: allParsedRows.length,
              availableLocalidades
            };
          }
        }
      } catch (err) {
        console.warn(`[Client Direct Fetch] Failed fetching ${url}:`, err);
      }
    }
  } catch (err) {
    console.error('[Client Direct Fetch] Unexpected error:', err);
  }

  return null;
}
