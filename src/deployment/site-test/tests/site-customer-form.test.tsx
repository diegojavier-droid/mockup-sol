import {describe,test,expect} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {CustomerDataStep} from '@/components/booking/steps/CustomerDataStep';
describe('datos ficticios editables',()=>{
 test('nombre, teléfono y email muestran lo ingresado, no contactos fijos',()=>{
  const html=renderToStaticMarkup(<CustomerDataStep customer={{firstName:'Eva Ejemplo',whatsapp:'+5493425550193',email:'eva@example.invalid'}} errors={{}} isRecognized={false} acceptedTerms={false} showTermsRequired={false} onChangeCustomerField={()=>{}} onChangeAcceptedTerms={()=>{}}/>);
  for(const value of ['Eva Ejemplo','+5493425550193','eva@example.invalid'])expect(html).toContain(value);
  expect(html.match(/<input/g)).toHaveLength(4);expect(html).not.toContain('readOnly');expect(html).not.toContain('disabled');
  expect(html).toContain('datos ficticios');expect(html).toContain('href="/privacidad"');expect(html).toContain('El teléfono y el email son obligatorios');expect(html).toContain('maxLength="80"');expect(html).toContain('maxLength="30"');expect(html).toContain('maxLength="160"');
 });
 test('muestra errores y no inventa aceptación',()=>{
  const html=renderToStaticMarkup(<CustomerDataStep customer={{firstName:'',whatsapp:'',email:''}} errors={{email:'Ingresá un email válido.'}} isRecognized={false} acceptedTerms={false} showTermsRequired={true} onChangeCustomerField={()=>{}} onChangeAcceptedTerms={()=>{}}/>);
  expect(html).toContain('Ingresá un email válido.');expect(html).toContain('Marcá la casilla');expect(html).not.toContain('checked=""');
 });
});
