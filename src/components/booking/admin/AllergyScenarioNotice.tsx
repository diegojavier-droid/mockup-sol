import type { AgendaEntry } from "@/lib/api/admin-hooks";
const labels = {no:"No", "si-leves":"Sí, leves", "si-importantes":"Sí, importantes"};
export function AllergyScenarioNotice({scenarios}: {scenarios: AgendaEntry["allergyScenarios"]}) {
  const valid = (scenarios ?? []).filter(item => item && Object.hasOwn(labels, item.answer));
  if (!valid.length) return null;
  return <section aria-label="Alergias" className="mt-3 rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950">
    <h3 className="font-medium">Alergias</h3>
    <ul>{valid.map((item,index) => <li key={index}>{item.serviceName}: {labels[item.answer]}</li>)}</ul>
    <p>Conversar con la clienta al llegar, antes del servicio. No es diagnóstico.</p>
  </section>;
}
