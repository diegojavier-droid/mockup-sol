grant insert, update, delete on
  public.categories,
  public.services,
  public.extras,
  public.personalization_fields,
  public.personalization_options,
  public.service_personalization_rules,
  public.service_personalization_option_modifiers,
  public.business_hours,
  public.staff_members,
  public.staff_specialties
to sandbox_exec;
-- Necesario para que RLS no bloquee: sandbox_exec bypass RLS solo en validación.
alter role sandbox_exec bypassrls;