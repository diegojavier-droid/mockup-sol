-- REVIEW ONLY. Not installed, not a runnable migration in this branch.
-- Requires confirmation of hosted auth.sessions semantics and clean-room tests.
-- Caller MUST already have verified the bearer token with getUser and must bind
-- p_user_id to that verified user, p_session_id to the same verified token.
-- This is a read-only check; it does not log anyone out or delete sessions.
begin;
create or replace function public.is_staff_auth_session_live(
  p_user_id uuid,
  p_session_id uuid
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.sessions as s
    where s.id = p_session_id
      and s.user_id = p_user_id
      and (s.not_after is null or s.not_after > now())
  );
$$;
revoke all on function public.is_staff_auth_session_live(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.is_staff_auth_session_live(uuid, uuid)
  to service_role;
commit;
