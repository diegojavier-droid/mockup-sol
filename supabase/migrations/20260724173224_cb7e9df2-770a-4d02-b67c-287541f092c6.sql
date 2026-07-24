
-- Restore read-only access for the maintenance role. This is NOT a bootstrap
-- write grant — it mirrors what an ordinary logged-in operator would see and
-- is required to run health/audit queries. Writes remain revoked.
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

-- Allow the maintenance role to `SET ROLE anon | authenticated` for RLS
-- verification from psql. Neither of those roles grants write access, so
-- this remains least-privilege.
GRANT anon           TO sandbox_exec;
GRANT authenticated  TO sandbox_exec;
