// Harness aislado: el componente y los hooks reales, sin Auth ni base real.
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AgendaScreen } from "../../src/components/booking/admin/AgendaScreen";
import "../../src/styles.css";

window.sessionStorage.setItem("sol-mai-staff-token", "synthetic-test-token");
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <AgendaScreen range="hoy" fecha="2026-11-12" />
  </QueryClientProvider>,
);
