export function staffFixture(overrides = {}) {
  return { staffId:'11111111-1111-4111-8111-111111111111',email:'fixture@example.invalid',displayName:'Ejemplo',role:'owner',roleName:'Administradora',agendaScope:'all',attentionEnabled:false,permisos:{calendario:'full',finanzas:'full',configuracion:'full'},...overrides };
}
