
-- ============================================================
-- Bloque 3.2.1 · Saneamiento
-- ============================================================

-- (1) Field/option relational integrity ---------------------------------------
-- personalization_options already has UNIQUE(field_id, slug); we need
-- UNIQUE(field_id, id) so it can serve as the target of a composite FK from
-- service_personalization_option_modifiers. This guarantees at the DB level
-- that (field_id, option_id) pairs are consistent with the option's own field.

ALTER TABLE public.personalization_options
  ADD CONSTRAINT personalization_options_field_option_unique
  UNIQUE (field_id, id);

ALTER TABLE public.service_personalization_option_modifiers
  DROP CONSTRAINT service_personalization_option_modifiers_option_id_fkey;

ALTER TABLE public.service_personalization_option_modifiers
  ADD CONSTRAINT spom_field_option_fk
  FOREIGN KEY (field_id, option_id)
  REFERENCES public.personalization_options (field_id, id)
  ON DELETE CASCADE;

-- (2) sandbox_exec cleanup ----------------------------------------------------
-- Remove elevated privileges granted during bootstrap. sandbox_exec should
-- behave like an ordinary least-privilege role — no BYPASSRLS, no write
-- grants on catalog tables. Guarded so migration re-runs are safe.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    EXECUTE 'ALTER ROLE sandbox_exec NOBYPASSRLS';

    REVOKE ALL ON public.categories                              FROM sandbox_exec;
    REVOKE ALL ON public.services                                FROM sandbox_exec;
    REVOKE ALL ON public.extras                                  FROM sandbox_exec;
    REVOKE ALL ON public.personalization_fields                  FROM sandbox_exec;
    REVOKE ALL ON public.personalization_options                 FROM sandbox_exec;
    REVOKE ALL ON public.service_personalization_rules           FROM sandbox_exec;
    REVOKE ALL ON public.service_personalization_option_modifiers FROM sandbox_exec;
    REVOKE ALL ON public.business_hours                          FROM sandbox_exec;
    REVOKE ALL ON public.staff_members                           FROM sandbox_exec;
    REVOKE ALL ON public.staff_specialties                       FROM sandbox_exec;
  END IF;
END
$$;
