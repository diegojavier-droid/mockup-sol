import type { ApiQuote } from "@/lib/api/catalog-types";

/**
 * El precio que ve la clienta sale del servidor, y de ningún otro lado.
 *
 * Antes lo calculaba el navegador con una matriz de modificadores escrita
 * a mano y una tasa de seña constante en el código, mientras el precio
 * que se cobraba lo calculaba el servidor. Coincidían por casualidad. El
 * día que Sol cambie un precio desde el panel dejan de coincidir, y la
 * clienta vería uno mientras el sistema cobra otro.
 *
 * Por eso acá no hay ningún cálculo: se formatea lo que dijo el servidor.
 * Si el servidor todavía no contestó se devuelve `null`, y la pantalla
 * muestra que está calculando. **Un precio provisorio calculado acá sería
 * exactamente el problema que esto viene a resolver.**
 */
export interface PriceView {
  /** Ya formateado, con «Desde» cuando el precio es un piso. */
  price: string;
  depositPrice: string;
  remainingPrice: string;
  depositRatePct: number;
  durationLabel: string;
  isEstimate: boolean;
}

export function formatPesos(amount: number): string {
  return `$${amount.toLocaleString("es-AR")}`;
}

export function priceViewFromQuote(quote: ApiQuote | null | undefined): PriceView | null {
  if (!quote) return null;

  const desde = quote.priceDisplayMode === "from" || quote.isEstimate;

  return {
    price: `${desde ? "Desde " : ""}${formatPesos(quote.estimatedMinAmount)}`,
    depositPrice: formatPesos(quote.depositAmount),
    remainingPrice: formatPesos(quote.remainingAmount),
    depositRatePct: quote.depositRatePct,
    durationLabel: `${quote.durationShownMin} min`,
    isEstimate: quote.isEstimate,
  };
}
