/**
 * Normalización de teléfono a E.164 (Argentina por defecto).
 *
 * El teléfono es la identidad de la clienta en el CRM: sin normalizar,
 * "342 555-1234" y "+5493425551234" serían dos personas distintas — el
 * problema que ya tiene la planilla de caja (talia / tali).
 */

const AR_COUNTRY = "54";

export function normalizePhoneAr(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const hadPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (hadPlus) {
    return /^[1-9]\d{6,14}$/.test(digits) ? `+${digits}` : null;
  }

  // 00 como prefijo internacional
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
    return /^[1-9]\d{6,14}$/.test(digits) ? `+${digits}` : null;
  }

  if (digits.startsWith(AR_COUNTRY) && digits.length >= 12) {
    // ya trae país; garantizamos el 9 de móvil
    const rest = digits.slice(2);
    const withMobile = rest.startsWith("9") ? rest : `9${rest}`;
    return `+${AR_COUNTRY}${withMobile}`;
  }

  // Formato local: 0342 15 555 1234 → se descartan 0 inicial y 15
  let local = digits.replace(/^0/, "");
  local = local.replace(/^(\d{2,4})15(\d{6,8})$/, "$1$2");
  if (local.length < 8 || local.length > 12) return null;

  return `+${AR_COUNTRY}9${local}`;
}
