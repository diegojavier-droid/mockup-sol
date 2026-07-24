-- Sandbox maintenance role — read-only grants + role membership.
--
-- PORTABLE: sandbox_exec belongs to the Lovable tooling environment, NOT to
-- the Sol Mai product domain. Guarded so environments where the role does
-- not exist (clean-room, CI, staging, production) apply this as a no-op.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    RAISE NOTICE 'sandbox_exec role not present — skipping tooling grants.';
    RETURN;
  END IF;

  GRANT SELECT ON public.categories                              TO sandbox_exec;
  GRANT SELECT ON public.services                                TO sandbox_exec;
  GRANT SELECT ON public.extras                                  TO sandbox_exec;
  GRANT SELECT ON public.personalization_fields                  TO sandbox_exec;
  GRANT SELECT ON public.personalization_options                 TO sandbox_exec;
  GRANT SELECT ON public.service_personalization_rules           TO sandbox_exec;
  GRANT SELECT ON public.service_personalization_option_modifiers TO sandbox_exec;
  GRANT SELECT ON public.business_hours                          TO sandbox_exec;
  GRANT SELECT ON public.staff_members                           TO sandbox_exec;
  GRANT SELECT ON public.staff_specialties                       TO sandbox_exec;

  EXECUTE 'GRANT anon          TO sandbox_exec';
  EXECUTE 'GRANT authenticated TO sandbox_exec';
END
$$;
