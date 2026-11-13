# PREPARED, NOT EXECUTED. PostgreSQL isolationtester format.
# Only disposable local PostgreSQL with canonical + isolated draft schema.
# Runner must verify loopback target and set sol_mai.test_attention=yes.
setup {
  DO $$ BEGIN
    IF current_setting('sol_mai.test_attention',true) IS DISTINCT FROM 'yes'
       OR EXISTS(SELECT 1 FROM auth.users) THEN RAISE EXCEPTION 'local_attention_fixture_required'; END IF;
  END $$;
  INSERT INTO public.roles(slug,name) VALUES ('qa-attention-isolation','Ficticia concurrencia');
  INSERT INTO public.role_permissions(role_slug,module,level) VALUES ('qa-attention-isolation','calendario','full');
  INSERT INTO public.staff_members(id,slug,display_name,email,role) VALUES
    ('a1111111-1111-4111-8111-111111111111','qa-attention-isolation-a','Ficticia A','isolation-a@example.invalid','qa-attention-isolation'),
    ('b2222222-2222-4222-8222-222222222222','qa-attention-isolation-b','Ficticia B','isolation-b@example.invalid','qa-attention-isolation');
  INSERT INTO public.customers(id,first_name,phone_e164,email)
    VALUES ('c3333333-3333-4333-8333-333333333333','Ficticia aislamiento','+19999998101','isolation-c@example.invalid');
  INSERT INTO public.bookings(id,customer_id,area_id,starts_at,ends_at,shown_duration_min,status,source,price_display_mode,price_estimated_min,deposit_rate_applied,deposit_amount,staff_id)
    SELECT 'd4444444-4444-4444-8444-444444444444','c3333333-3333-4333-8333-333333333333',id,now()+interval '10 days',now()+interval '10 days 30 minutes',30,'confirmed','manual','fixed',1000,0,0,'a1111111-1111-4111-8111-111111111111' FROM public.areas ORDER BY id LIMIT 1;
}
teardown {
  DELETE FROM public.booking_attention WHERE booking_id='d4444444-4444-4444-8444-444444444444';
  DELETE FROM public.audit_log WHERE entity_id='d4444444-4444-4444-8444-444444444444';
  DELETE FROM public.bookings WHERE id='d4444444-4444-4444-8444-444444444444';
  DELETE FROM public.customers WHERE id='c3333333-3333-4333-8333-333333333333';
  DELETE FROM public.staff_members WHERE id IN ('a1111111-1111-4111-8111-111111111111','b2222222-2222-4222-8222-222222222222');
  DELETE FROM public.roles WHERE slug='qa-attention-isolation';
}
session s1
step s1_begin { BEGIN; }
step s1_start { SELECT public.record_booking_attention('d4444444-4444-4444-8444-444444444444','start','a1111111-1111-4111-8111-111111111111')->>'booking_id' AS started; }
step s1_reassign { UPDATE public.bookings SET staff_id='b2222222-2222-4222-8222-222222222222' WHERE id='d4444444-4444-4444-8444-444444444444'; }
step s1_deactivate { UPDATE public.staff_members SET is_active=false WHERE id='a1111111-1111-4111-8111-111111111111'; }
step s1_downgrade { UPDATE public.role_permissions SET level='view' WHERE role_slug='qa-attention-isolation' AND module='calendario'; }
step s1_commit { COMMIT; }
session s2
step s2_start { SELECT public.record_booking_attention('d4444444-4444-4444-8444-444444444444','start','a1111111-1111-4111-8111-111111111111')->>'booking_id' AS started; }
step s2_reassign { UPDATE public.bookings SET staff_id='b2222222-2222-4222-8222-222222222222' WHERE id='d4444444-4444-4444-8444-444444444444'; }
step s2_finish_a { SELECT public.record_booking_attention('d4444444-4444-4444-8444-444444444444','finish','a1111111-1111-4111-8111-111111111111')->>'booking_id' AS finished; }
step s2_finish_b { SELECT public.record_booking_attention('d4444444-4444-4444-8444-444444444444','finish','b2222222-2222-4222-8222-222222222222')->>'booking_id' AS finished; }
step s2_one_start { DO $$ BEGIN IF (SELECT count(*) FROM public.booking_attention WHERE booking_id='d4444444-4444-4444-8444-444444444444')<>1 OR (SELECT count(*) FROM public.audit_log WHERE entity_id='d4444444-4444-4444-8444-444444444444' AND action='booking_attention_started')<>1 THEN RAISE EXCEPTION 'duplicate start'; END IF; END $$; }
step s2_no_start { DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.booking_attention WHERE booking_id='d4444444-4444-4444-8444-444444444444') THEN RAISE EXCEPTION 'unauthorized attention created'; END IF; END $$; }
step s2_two_events { DO $$ BEGIN IF (SELECT count(*) FROM public.audit_log WHERE entity_id='d4444444-4444-4444-8444-444444444444' AND action IN ('booking_attention_started','booking_attention_finished'))<>2 THEN RAISE EXCEPTION 'wrong event count'; END IF; END $$; }
permutation s1_begin s1_start s2_start s1_commit s2_one_start
permutation s1_begin s1_reassign s2_start s1_commit s2_no_start
permutation s1_begin s1_deactivate s2_start s1_commit s2_no_start
permutation s1_begin s1_downgrade s2_start s1_commit s2_no_start
permutation s1_begin s1_start s2_reassign s1_commit s2_finish_a s2_finish_b s2_two_events
