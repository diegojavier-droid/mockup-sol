import { QueryClient } from "@tanstack/react-query";
/** Un cache por generación de sesión, nunca compartido entre empleadas. */
export function createPanelQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}
export function clearPanelQueryClient(client: QueryClient): void {
  // Cancelar evita que un fetch tardío rellene el cache retirado. El cliente
  // HTTP además aborta y descarta por generación, incluidas mutaciones.
  void client.cancelQueries();
  client.clear();
}
