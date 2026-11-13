import {expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {CatalogProvider} from './catalog-context';
import {ReviewStep} from '../components/booking/steps/ReviewStep';
import type {SummaryData} from '../components/booking/SummaryPanel';
function render(isConfirming:boolean,error:string|null=null){
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
 for(const key of ['categories','services','extras','personalization'])client.setQueryData(['catalog',key],[]);
 const html=renderToStaticMarkup(<QueryClientProvider client={client}><CatalogProvider><ReviewStep customer={{firstName:'Ejemplo',email:'ejemplo@example.invalid',whatsapp:'+5493425550101'}} data={{category:'maquillaje',service:null,extras:[],personalization:{},additionalComments:'',date:null,time:null} as SummaryData} personal={{}} error={error} onConfirm={()=>{}} isConfirming={isConfirming}/></CatalogProvider></QueryClientProvider>);
 client.clear();return html;
}
test('confirmation is disabled and visibly busy while pending, then available on failure for retry',()=>{
 const pending=render(true);
 expect(pending).toContain('disabled=""');expect(pending).toContain('aria-busy="true"');expect(pending).toContain('animate-spin');expect(pending).toContain('Confirmar mi turno');
 const failed=render(false,'No se pudo guardar.');
 expect(failed).not.toContain('disabled=""');expect(failed).toContain('aria-busy="false"');expect(failed).not.toContain('animate-spin');expect(failed).toContain('No se pudo guardar.');
});
test('wizard forwards mutation pending state to shared review',()=>{
 const source=readFileSync(new URL('../components/booking/BookingWizard.tsx',import.meta.url),'utf8');
 expect(source).toMatch(/<ReviewStep[\s\S]*?isConfirming=\{wizard\.isConfirming\}[\s\S]*?\/>/);
});
