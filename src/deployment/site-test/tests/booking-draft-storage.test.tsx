import { afterEach, describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { BookingConfirmation } from '@/components/booking/summary/BookingConfirmation';
import { loadBookingDraft,saveBookingDraft,clearBookingDraft,type BookingDraftState } from "@/lib/booking-draft-storage";
const original=Object.getOwnPropertyDescriptor(globalThis,'window');
afterEach(()=>{if(original)Object.defineProperty(globalThis,'window',original);else Reflect.deleteProperty(globalThis,'window');});
describe('Site isolated draft and recovery',()=>{
 test('Site never persists or restores contact, context, payment marker or token',()=>{
  let accessed=0;
  Object.defineProperty(globalThis,'window',{configurable:true,value:{get sessionStorage(){accessed++;throw Error('disabled');}}});
  saveBookingDraft({paymentPending:false,customer:{firstName:'private'},personalization:{alergias:'private'}} as unknown as BookingDraftState);
  saveBookingDraft({paymentPending:true} as BookingDraftState);
  clearBookingDraft();
  expect(loadBookingDraft()).toBeNull();expect(accessed).toBe(0);
 });
 test('missing legacy reference never invents confirmation, payment or $0',()=>{
  const html=renderToStaticMarkup(<BookingConfirmation booking={null} onClose={()=>{}}/>);
  expect(html).toContain('No encontramos esa reserva');expect(html).not.toContain('Ver agenda');expect(html).toContain('Volver al inicio');
  for(const forbidden of ['$0','Pagar la seña','Ya pagué','mailto:','wa.me'])expect(html).not.toContain(forbidden);
 });
});
