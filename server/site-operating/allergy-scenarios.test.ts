import {SITE_TERMS_VERSION as TERMS_VERSION} from './contract';
import {describe,it,expect} from 'bun:test';
import {FIXTURE,ORIGIN,parseOperation,type Operation,TEST_ALLERGY_OPTIONS} from './contract';
import {operatingGateway} from './gateway';
import {canonicalOperationBody,filterTestPersonalization,validateTestAnswers} from './backend';
import type {PersonalizationFieldDTO} from '../src/lib/catalog/dto';
const base={serviceSlug:'corte-fem',startsAt:'2026-12-01T12:00:00Z',customer:FIXTURE,testCustomerScenario:true,consent:{termsVersion:TERMS_VERSION}};
const op=(body:unknown):Operation=>({method:'POST',path:'/api/v1/bookings',operationId:'d17ba69b-28d0-426e-a201-9df8fb8bc477',body});
const field:PersonalizationFieldDTO={slug:'alergias',categorySlug:'peluqueria',label:'Alergias',fieldType:'single_choice',fieldRole:'context',decision:'contextual',isRequired:false,options:TEST_ALLERGY_OPTIONS.map(slug=>({slug,label:slug,value:slug,durationDeltaMinutes:0,priceFixedAmount:0,pricePercentage:0}))};
describe('synthetic allergy scenarios only',()=>{
 it('accepts exactly known answers after explicit scenario opt-in and booking consent',()=>{
  for(const answer of TEST_ALLERGY_OPTIONS){
   const body={...base,testAllergyScenario:true,personalization:{alergias:answer}};
   expect(parseOperation(op(body)).body).toEqual(body);
   expect(parseOperation(op({...base,testAllergyScenario:true,services:[{serviceSlug:'corte-fem',personalization:{alergias:answer}}]}))).toBeDefined();
  }
  expect(parseOperation(op(base))).toBeDefined();
 });
 it('rejects missing marker, false marker, unknown answers, other context and missing consent before ANY egress',async()=>{
  const {consent,...unconsented}=base;
  const cases=[
   {...base,personalization:{alergias:'no'}},
   {...base,testAllergyScenario:false,personalization:{alergias:'si-leves'}},
   {...base,services:[{serviceSlug:'corte-fem',personalization:{alergias:'si-importantes'}}]},
   {...base,testAllergyScenario:true,personalization:{alergias:'free-text'}},
   {...base,testAllergyScenario:true,personalization:{alergias:'si-leves',enfermedad:'private'}},
   {...base,testAllergyScenario:true,services:[{serviceSlug:'corte-fem',personalization:{alergias:'private'}}]},
   {...unconsented,testAllergyScenario:true,personalization:{alergias:'no'}},
   {...unconsented,testAllergyScenario:true,services:[{serviceSlug:'corte-fem',personalization:{alergias:'no'}}]},
  ];
  let calls=0;
  const transport=(async()=>{calls++;return Response.json({});}) as unknown as typeof fetch;
  for(const body of cases){
   expect(()=>parseOperation(op(body))).toThrow();
   const request=new Request(ORIGIN+'/api/v1/bookings',{method:'POST',headers:{origin:ORIGIN,'Content-Type':'application/json','oai-authenticated-user-id':'test-owner','X-Idempotency-Key':op(body).operationId!},body:JSON.stringify(body)});
   const response=await operatingGateway(request,{SITE_TEST_OWNER_SUB:'test-owner',SITE_TEST_SIGNING_PRIVATE_JWK:'must-never-be-used'},transport);
   expect(response.status).toBe(400);
  }
  expect(calls).toBe(0);
 });
 it('rejects allergy answers and marker in quotes, availability and internal bookings',()=>{
  for(const answer of TEST_ALLERGY_OPTIONS){
   for(const path of ['/api/v1/quote','/api/v1/availability','/api/v1/admin/bookings']){
    const body=path.endsWith('/availability')?{service:'corte-fem',personalization:{alergias:answer}}:path.endsWith('/quote')?{serviceSlug:'corte-fem',personalization:{alergias:answer}}:{...base,personalization:{alergias:answer}};
    for(const marker of [{},{testAllergyScenario:true}])expect(()=>parseOperation({...op({...body,...marker}),path,...(path.endsWith('/bookings')?{}:{operationId:undefined})})).toThrow();
   }
   expect(()=>parseOperation({method:'POST',path:'/api/v1/quote',body:{services:[{serviceSlug:'corte-fem',personalization:{alergias:answer}}]}})).toThrow();
  }
 });
 it('restores only known contextual allergy field/options from catalogue, never other text or context',()=>{
  const other={...field,slug:'diagnostico',fieldType:'text' as const};
  const unsafeOption={...field.options[0],slug:'free-text'};
  const result=filterTestPersonalization([{...field,isRequired:true,options:[...field.options,unsafeOption]},other],true);
  expect(result).toEqual([field]);
  expect(filterTestPersonalization([{...field,fieldRole:'modifier',decision:'operational'}],true)).toEqual([]);
  expect(filterTestPersonalization([{...field,decision:'not_applicable'}],true)).toEqual([]);
 });
 it('canonical validation still requires service-specific contextual field and matching known option',()=>{
  const operation=parseOperation(op({...base,testAllergyScenario:true,personalization:{alergias:'si-leves'}}));
  expect(()=>validateTestAnswers(operation,[field],{alergias:'si-leves'})).not.toThrow();
  for(const fields of [[],[{...field,decision:'not_applicable' as const}],[{...field,fieldRole:'modifier' as const}], [{...field,options:[]}]] )expect(()=>validateTestAnswers(operation,fields,{alergias:'si-leves'})).toThrow();
  expect(()=>validateTestAnswers({...operation,path:'/api/v1/admin/bookings'},[field],{alergias:'si-leves'})).toThrow();
  expect(()=>validateTestAnswers(operation,[field],{alergias:'unknown'})).toThrow();
 });
 it('removes only metadata marker and preserves canonical answer for consent-backed persistence',()=>{
  const body={...base,testAllergyScenario:true,services:[{serviceSlug:'corte-fem',personalization:{alergias:'si-importantes'}}]};
  const operation=parseOperation(op(body));
  const forwarded=canonicalOperationBody(operation) as Record<string,unknown>;
  expect(forwarded).not.toHaveProperty('testAllergyScenario');
  expect(forwarded.services).toEqual(body.services);
  expect(forwarded.consent).toEqual(base.consent);
  expect(operation.body).toHaveProperty('testAllergyScenario',true);
 });
});
