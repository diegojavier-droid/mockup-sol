export const solMaiContact = {
  whatsappDisplay: "+54 9 342 515-6726",
  whatsappNumber: "5493425156726",
  email: "solmaipeluqueria@gmail.com",
  // TODO: reemplazar por el link real de Mercado Pago de Sol Mai cuando esté disponible.
  mercadoPagoDepositUrl: "https://mpago.la/sol-mai-sena-placeholder",
} as const;

/**
 * Link de WhatsApp con el mensaje ya escrito.
 *
 * Devuelve `null` si el número no está bien configurado. Es a propósito:
 * un `wa.me` con un número inválido abre un chat con nadie, y la clienta
 * se queda creyendo que le escribió al salón. Ante la duda, que el botón
 * no aparezca —el resto de la página sigue funcionando— antes que
 * ofrecer un canal que no llega a Sol.
 */
export function whatsappLink(message: string): string | null {
  const digits = solMaiContact.whatsappNumber.replace(/\D/g, "");
  // E.164 sin el «+»: entre 8 y 15 dígitos.
  if (digits.length < 8 || digits.length > 15) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
