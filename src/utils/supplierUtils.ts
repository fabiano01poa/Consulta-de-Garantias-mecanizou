import { StockItem } from '../types';

export function normalizeSupplierStr(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function cleanAlphaNumeric(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export const AUTOMATIC_SUPPLIERS = [
  "AMAZONAS - FIAT IPIRANGA",
  "Castelhano - Cangaíba",
  "CASTRO PEÇAS - MATRIZ",
  "CJR AUTO - MATRIZ",
  "COPBOR - MATRIZ",
  "COBRA - GUARULHOS",
  "COBRA - ITAQUAQUECETUBA",
  "COBRA - MATRIZ",
  "COBRA - OSASCO",
  "COBRA - SANTO AMARO",
  "COBRA - SAO BERNARDO",
  "Diauto - SBC",
  "DLAMP DISTRIBUIDORA - BELENZINHO",
  "GALPAO PEÇAS",
  "GALPAO PEÇAS - MATRIZ",
  "HORIZONTE AUTO PEÇAS - MATRIZ",
  "JAPANPARTS - MATRIZ",
  "JOSECAR",
  "JOSECAR - AGUA FRIA",
  "JOSECAR - BUTANTA",
  "JOSECAR - FREGUESIA DO Ó",
  "JOSECAR - JABAQUARA",
  "JOSECAR - LAPA",
  "JOSECAR - OSASCO",
  "JOSECAR - REGENTE FEIJO",
  "JOSECAR - TATUAPE",
  "Mello Auto Peças - Mello Auto Peças",
  "MERCADOCAR",
  "MERCADOCAR - ARICANDUVA",
  "MERCADOCAR - BARRA FUNDA - LINHA LEVE",
  "MERCADOCAR - BARRA FUNDA - LINHA PESADA",
  "MERCADOCAR - GUARULHOS",
  "MERCADOCAR - GUARULHOS CENTRO",
  "MERCADOCAR - MARECHAL TITO",
  "MERCADOCAR - MATRIZ",
  "MERCADOCAR - OSASCO",
  "MERCADOCAR - PIMENTAS",
  "MERCADOCAR - SANTO AMARO",
  "MERCADOCAR - SANTO ANDRE",
  "MOTORFORT - VILA MARIA",
  "MOTORSHARP - JARDIM PRUDENCIA",
  "PontoCom Auto Peças - Ponto.Com",
  "PontoCom Auto Peças - Leves e Pesados",
  "RENOVA ECOPECAS - MATRIZ",
  "RR Parts - MATRIZ",
  "SK MOBILITY",
  "SK MOBILITY - MATRIZ",
  "SK MOBILITY - VILA MARIA (GM)",
  "SK MOBILITY - ZONA OESTE",
  "SK MOBILITY - ZONA OESTE ( ESTOQUE GM)",
  "SKY AUTOMOTIVE - BOM RETIRO",
  "SKY AUTOMOTIVE - GUARULHOS",
  "UNIFRANCE RENAULT - NISSAN OSASCO",
  "VETTER DISTRIBUIDORA - MATRIZ",
  "VW SORANA - VW CASA VERDE",
  "ZAFRA AUTO PEÇAS - MATRIZ"
];

const AUTOMATIC_TARGETS_CLEAN = AUTOMATIC_SUPPLIERS.map(s => cleanAlphaNumeric(s));

export function isAutomaticSupplierItem(item: StockItem): boolean {
  const f = item.fornecedor || '';
  const fil = item.novoFornecedorFilial || '';
  const orig = item.fornecedorOriginal || '';
  const obsG = item.observacoesGerais || '';
  const obsNf = item.obsNotaFiscal || '';

  const cleanF = cleanAlphaNumeric(f);
  const cleanFil = cleanAlphaNumeric(fil);
  const cleanCombined = cleanAlphaNumeric(`${f} ${fil}`);
  const cleanOrig = cleanAlphaNumeric(orig);
  const cleanObsG = cleanAlphaNumeric(obsG);
  const cleanObsNf = cleanAlphaNumeric(obsNf);

  for (let idx = 0; idx < AUTOMATIC_TARGETS_CLEAN.length; idx++) {
    const target = AUTOMATIC_TARGETS_CLEAN[idx];
    if (!target) continue;

    if (
      cleanCombined.includes(target) ||
      cleanFil.includes(target) ||
      cleanOrig.includes(target) ||
      cleanF === target ||
      cleanObsG.includes(target) ||
      cleanObsNf.includes(target)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a given item belongs to the selected supplier.
 * Checks across:
 * 1. item.fornecedor
 * 2. item.fornecedorOriginal
 * 3. item.novoFornecedorFilial
 * 4. item.observacoesGerais
 * 5. item.obsNotaFiscal
 */
export function matchItemSupplier(item: StockItem, selectedSupplier: string): boolean {
  if (!selectedSupplier || selectedSupplier === 'all') return true;
  const target = normalizeSupplierStr(selectedSupplier);
  if (!target) return true;

  const fields = [
    item.fornecedor,
    item.fornecedorOriginal,
    item.novoFornecedorFilial,
    item.observacoesGerais,
    item.obsNotaFiscal
  ];

  return fields.some(field => {
    if (!field) return false;
    const norm = normalizeSupplierStr(field);
    return norm.includes(target);
  });
}

/**
 * Checks if a given item belongs to the selected filial/branch.
 * Checks across:
 * 1. item.novoFornecedorFilial
 * 2. item.fornecedorOriginal
 * 3. item.observacoesGerais
 * 4. item.obsNotaFiscal
 * 5. item.fornecedor
 */
export function matchItemFilial(item: StockItem, selectedFilial: string): boolean {
  if (!selectedFilial || selectedFilial === 'all') return true;
  const target = normalizeSupplierStr(selectedFilial);
  if (!target) return true;

  const fields = [
    item.novoFornecedorFilial,
    item.fornecedorOriginal,
    item.observacoesGerais,
    item.obsNotaFiscal,
    item.fornecedor
  ];

  return fields.some(field => {
    if (!field) return false;
    const norm = normalizeSupplierStr(field);
    return norm.includes(target);
  });
}

/**
 * Extracts a list of unique supplier options from items,
 * taking into account item.fornecedor, item.fornecedorOriginal, item.novoFornecedorFilial,
 * and item.observacoesGerais.
 */
export function getAvailableSuppliers(items: StockItem[]): string[] {
  const supplierSet = new Set<string>();

  // Primary pass: collect from item.fornecedor
  items.forEach(i => {
    if (i.fornecedor && i.fornecedor.trim()) {
      supplierSet.add(i.fornecedor.trim());
    }
  });

  // Secondary pass: parse supplier names from fornecedorOriginal or observacoesGerais if present
  items.forEach(i => {
    const orig = i.fornecedorOriginal?.trim();
    if (orig) {
      // e.g., "COMPEL ZONA LESTE -703332-01/07/quarta-feira" -> extract "COMPEL ZONA LESTE" or "COMPEL"
      const cleanBeforeNumbers = orig.split(/[-–\/0-9]/)[0].trim();
      if (cleanBeforeNumbers) {
        const words = cleanBeforeNumbers.split(/\s+/);
        if (words.length > 0) {
          const firstWord = words[0].toUpperCase();
          if (firstWord.length >= 3 && !["ITEM", "DEVOLUCAO", "NOTA", "FISCAL", "SEM", "VER"].includes(firstWord)) {
            // Check if any existing supplier matches or if we add firstWord
            const existing = Array.from(supplierSet).find(s => 
              normalizeSupplierStr(cleanBeforeNumbers).includes(normalizeSupplierStr(s)) ||
              normalizeSupplierStr(s).includes(normalizeSupplierStr(firstWord))
            );
            if (!existing) {
              supplierSet.add(firstWord);
            }
          }
        }
      }
    }
  });

  return Array.from(supplierSet);
}

/**
 * Extracts available filiais for a selected supplier from items.
 */
export function getAvailableFiliais(items: StockItem[], selectedSupplier: string): string[] {
  const filialSet = new Set<string>();

  const matching = items.filter(i => matchItemSupplier(i, selectedSupplier));

  matching.forEach(i => {
    // 1. From novoFornecedorFilial
    if (i.novoFornecedorFilial && i.novoFornecedorFilial.trim()) {
      filialSet.add(i.novoFornecedorFilial.trim());
    }

    // 2. From fornecedorOriginal
    if (i.fornecedorOriginal && i.fornecedorOriginal.trim()) {
      const orig = i.fornecedorOriginal.trim();
      const clean = orig.split(/[-–\/0-9]/)[0].trim();
      if (clean) {
        const normClean = normalizeSupplierStr(clean);
        const normSupp = normalizeSupplierStr(selectedSupplier);
        if (selectedSupplier !== 'all' && normClean.includes(normSupp)) {
          const remaining = clean.replace(new RegExp(selectedSupplier, 'gi'), '').trim();
          if (remaining.length >= 2) {
            filialSet.add(remaining);
          }
        }
        filialSet.add(clean);
      }
    }
  });

  return Array.from(filialSet);
}
