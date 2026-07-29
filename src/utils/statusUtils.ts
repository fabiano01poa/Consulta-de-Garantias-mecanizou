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

export function normalizeStatusStr(s?: string): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAllowedWarrantyStatus(statusStr?: string): boolean {
  if (!statusStr || !statusStr.trim()) return false;
  const cleanInput = normalizeStatusStr(statusStr);
  if (!cleanInput) return false;

  return OFFICIAL_WARRANTY_STATUSES.some(official => {
    const cleanOfficial = normalizeStatusStr(official);
    return cleanInput === cleanOfficial || cleanInput.includes(cleanOfficial) || cleanOfficial.includes(cleanInput);
  });
}
