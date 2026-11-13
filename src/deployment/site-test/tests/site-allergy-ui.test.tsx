import {describe,test,expect} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {CatalogProvider} from "@/lib/catalog-context";
import {PersonalizationStep} from '@/components/booking/steps/PersonalizationStep';
import {ReviewStep} from '@/components/booking/steps/ReviewStep';
import type {SummaryData} from '@/components/booking/SummaryPanel';
function render(node:React.ReactNode) {
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
 client.setQueryData(['catalog','categories'],[{slug:'maquillaje',name:'Maquillaje'}]);
 client.setQueryData(['catalog','services'],[]);client.setQueryData(['catalog','extras'],[]);
 client.setQueryData(['catalog','personalization'],[{slug:'alergias',categorySlug:'maquillaje',label:'Alergias',isRequired:false,fieldRole:'context',fieldType:'single_choice',decision:'contextual',options:[{slug:'no',label:'No'},{slug:'si-leves',label:'Sí, leves'},{slug:'si-importantes',label:'Sí, importantes'}]}]);
 const html=renderToStaticMarkup(<QueryClientProvider client={client}><CatalogProvider>{node}</CatalogProvider></QueryClientProvider>);client.clear();return html;
}
describe('alergias: conversación al llegar, escenario opcional',()=>{
 test('muestra opciones claras y un comentario opcional limitado sin carteles repetidos',()=>{
  const html=render(<PersonalizationStep category="maquillaje" personal={{alergias:'Sí, leves'}} additionalComments="" onChangeAdditionalComments={()=>{}} onChooseOption={()=>{}}/>);
  expect(html).toContain('>Alergias</legend>');expect(html).not.toContain('Alergias (opcional)');expect(html).toContain('Sí, leves');expect(html).toContain('Sí, importantes');expect(html).not.toContain('Prefiero omitirlo');expect(html).toContain('conversar al llegar');
  expect(html).toContain('clienta de ejemplo');
  expect(html.match(/<textarea/g)).toHaveLength(1);expect(html).toContain('maxLength="500"');expect(html).toContain('Comentario para Sol (opcional)');expect(html).not.toContain('<input');expect(html).not.toContain('¿Tenés alergias?');
 });
 test('inicia sin respuesta, no selecciona No por defecto',()=>{
  const html=render(<PersonalizationStep category="maquillaje" personal={{}} additionalComments="" onChangeAdditionalComments={()=>{}} onChooseOption={()=>{}}/>);
  expect(html).not.toContain('aria-pressed="true"');expect(html).toContain('aria-pressed="false"');expect(html).not.toContain('Prefiero omitirlo');
 });
 test('revisión conserva la selección para conversar, no diagnóstico ni precio',()=>{
  const html=render(<ReviewStep customer={{firstName:'Clienta de prueba',whatsapp:'',email:''}} data={{category:'maquillaje',service:null,extras:[],personalization:{},additionalComments:'Ejemplo ficticio: conversar <antes>',date:null,time:null} as SummaryData} personal={{alergias:'Sí, importantes'}} error={null} onConfirm={()=>{}}/>);
  expect(html).toContain('Comentario para Sol');expect(html).toContain('conversar &lt;antes&gt;');expect(html).toContain('Alergias:');expect(html).toContain('Sí, importantes');expect(html).toContain('antes del servicio');expect(html).toContain('Confirmar mi turno');expect(html).not.toContain('Guardar turno ficticio');
 });
});
