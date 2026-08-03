export const OFFICIAL_WARRANTY_STATUSES = [
  "Garantia: A negociar",
  "Garantia: Enviado ao Fabricante",
  "Garantia: Validar",
  "Garantia Aprovada - Fabricante",
  "Garantia: Em negociação",
  "Garantia: Emitir NF",
  "Garantia: Não negociado",
  "Garantia Negada - Fabricante",
  "Garantia: Enviado ao Fabricante Urgente"
] as const;

export const FINALIZED_WARRANTY_STATUSES = [
  "Garantia Aprovada - Fabricante",
  "Garantia: Não negociado",
  "Garantia Negada - Fabricante"
] as const;

export function normalizeStatusStr(s?: string): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
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

export function isFinalizedStatus(statusStr?: string): boolean {
  if (!statusStr) return false;
  const cleanInput = normalizeStatusStr(statusStr);
  return FINALIZED_WARRANTY_STATUSES.some(official => {
    const cleanOfficial = normalizeStatusStr(official);
    return cleanInput === cleanOfficial || cleanInput.includes(cleanOfficial);
  });
}

export function isItemUrgent(item?: { urgente?: boolean; statusDevolucao?: string }): boolean {
  if (!item) return false;
  if (item.urgente === true) return true;
  if (item.statusDevolucao && normalizeStatusStr(item.statusDevolucao).includes("urgente")) return true;
  return false;
}

