// Harness aislado: el componente y los hooks reales, sin Auth ni base real.
import {staffFixture} from "./staff.mjs";
import {SesionPanelCtx} from "../../src/lib/panel-sesion";
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AgendaScreen } from "../../src/components/booking/admin/AgendaScreen";
import "../../src/styles.css";

window.sessionStorage.setItem("sol-mai-staff-token", "synthetic-test-token");
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
// Permite simular el refetch que llega cuando otra empleada cierra.
window.addEventListener("test:refresh-agenda", () => {
  void client.invalidateQueries({ queryKey: ["admin", "agenda"] });
});
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <SesionPanelCtx.Provider value={{identidad:staffFixture(),cargando:false,cerrar:()=>{}}}>
      <AgendaScreen range="hoy" fecha="2026-11-12" />
    </SesionPanelCtx.Provider>
  </QueryClientProvider>,
);
