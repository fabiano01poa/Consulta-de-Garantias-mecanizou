export const OFFICIAL_WARRANTY_STATUSES = [
  "Garantia: A negociar",
  "Garantia: Enviado ao Fabricante",
  "Garantia: Validar",
  "Garantia: Pré emissão",
  "Garantia Aprovada - Fabricante",
  "Garantia: Em negociação",
  "Garantia: Emitir NF",
  "Garantia: Emitir Remessa",
  "Garantia: Não negociado",
  "Garantia Negada - Fabricante",
  "Garantia: Enviado ao Fabricante Urgente"
] as const;

export const OFFICIAL_DEVOLUCAO_STATUSES = [
  "A negociar",
  "Aprovado",
  "Aprovado - Validar",
  "Pré emissão",
  "Em negociação",
  "Emitir NF",
  "Não negociado",
  "Recusado"
] as const;

export const FINALIZED_WARRANTY_STATUSES = [
  "Garantia Aprovada - Fabricante",
  "Garantia: Não negociado",
  "Garantia Negada - Fabricante",
  "Recusado",
  "Não negociado",
  "Passivo Negado"
] as const;

export const OFFICIAL_OBS_STATUS_OPTIONS = [
  "Revendido antes de finalizar a negociação",
  "Embalagem",
  "Sinal de uso/aplicação",
  "Prazo",
  "Limite de devolução",
  "Item perdido",
  "Sem motivo",
  "Divergência de Lançamento",
  "Fornecedor não aceita devolução",
  "Fornecedor inativo",
  "Recebido fora do Prazo",
  "Item de alto giro",
  "Garantia não negociada",
  "Falta de componente",
  "Item comprado por encomenda",
  "Valor Log < valor peça",
  "Pedido cancelado",
  "Pediu uma peça Chegou outra/Recebimento"
] as const;

export function getAllObsStatusOptions(items?: Array<{ obsStatusDevolucao?: string }>): string[] {
  const set = new Set<string>(OFFICIAL_OBS_STATUS_OPTIONS);
  if (items && Array.isArray(items)) {
    items.forEach(i => {
      if (i.obsStatusDevolucao && i.obsStatusDevolucao.trim()) {
        set.add(i.obsStatusDevolucao.trim());
      }
    });
  }
  return Array.from(set);
}

const normalizeCache = new Map<string, string>();
const strippedCache = new Map<string, string>();

export function normalizeStatusStr(s?: string): string {
  if (!s) return "";
  let cached = normalizeCache.get(s);
  if (cached !== undefined) return cached;

  cached = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (normalizeCache.size < 5000) {
    normalizeCache.set(s, cached);
  }
  return cached;
}

export function getStrippedStatus(s?: string): string {
  if (!s) return "";
  let cached = strippedCache.get(s);
  if (cached !== undefined) return cached;

  const clean = normalizeStatusStr(s);
  cached = clean.startsWith("garantia:") ? clean.slice(9).trim() : clean;

  if (strippedCache.size < 5000) {
    strippedCache.set(s, cached);
  }
  return cached;
}

/**
 * Maps raw status strings from the spreadsheet to standard official warranty statuses.
 * Preserves exact distinction between "A negociar" (normal item) and "Garantia: A negociar" (warranty item).
 */
export function canonicalizeWarrantyStatus(rawStatus?: string): string {
  if (!rawStatus || !rawStatus.trim()) return "";
  return rawStatus.trim();
}

export function isAllowedWarrantyStatus(statusStr?: string): boolean {
  if (!statusStr || !statusStr.trim()) return false;
  const clean = normalizeStatusStr(statusStr);
  if (!clean) return false;

  // Includes only statuses that contain the word "garantia"
  if (clean.includes("garantia")) return true;

  return false;
}

export function isWarrantyItem(item?: { statusDevolucao?: string }): boolean {
  if (!item) return false;
  if (!item.statusDevolucao || !item.statusDevolucao.trim()) return false;
  const clean = normalizeStatusStr(item.statusDevolucao);

  // Explicit Devolução-only statuses (without Warranty prefix)
  const isExplicitDevolucaoOnly = OFFICIAL_DEVOLUCAO_STATUSES.some(st => normalizeStatusStr(st) === clean);
  if (isExplicitDevolucaoOnly) return false;

  return true;
}

export function isDevolucaoItem(item?: { statusDevolucao?: string }): boolean {
  if (!item) return false;
  if (!item.statusDevolucao || !item.statusDevolucao.trim()) return false;
  const clean = normalizeStatusStr(item.statusDevolucao);

  if (clean.includes("garantia")) return false;

  return true;
}

export function matchesStatusFilter(itemStatus?: string, filterStatus?: string): boolean {
  if (!filterStatus || filterStatus === 'all') return true;
  if (!itemStatus || !itemStatus.trim()) return false;
  if (itemStatus === filterStatus) return true;

  return getStrippedStatus(itemStatus) === getStrippedStatus(filterStatus);
}

export function isFinalizedStatus(statusStr?: string): boolean {
  if (!statusStr) return false;
  const cleanInput = normalizeStatusStr(statusStr);
  return FINALIZED_WARRANTY_STATUSES.some(official => {
    const cleanOfficial = normalizeStatusStr(official);
    return cleanInput === cleanOfficial || cleanInput.includes(cleanOfficial);
  });
}

export function cleanNotaFiscal(nfStr?: string): string {
  if (!nfStr) return '';
  return nfStr.replace(/\./g, '').trim();
}

export function isItemUrgent(item?: { urgente?: boolean; statusDevolucao?: string }): boolean {
  if (!item) return false;
  if (item.urgente === true) return true;
  if (item.statusDevolucao && normalizeStatusStr(item.statusDevolucao).includes("urgente")) return true;
  return false;
}

