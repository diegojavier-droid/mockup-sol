# Native offline PostgreSQL replay; never connects to a server or reads credentials.
# Usage: python this.py /absolute/path/to/postgres/bin /new/empty/evidence-directory
import pathlib,subprocess,re,sys
repo=pathlib.Path(__file__).resolve().parents[3]
bindir=pathlib.Path(sys.argv[1]).resolve();root=pathlib.Path(sys.argv[2]).resolve()
if root.exists(): raise SystemExit('Evidence directory must not exist; refusing existing cluster')
root.mkdir(parents=True)
subprocess.run([str(bindir/'initdb'),'-D',str(root/'data'),'--no-locale','--encoding=UTF8','--auth-local=trust','--auth-host=reject'],check=True,capture_output=True)
def run(name,sql):
 sql='\n'.join(x if x.strip() else ' ' for x in sql.splitlines())+'\n'
 p=subprocess.run([str(bindir/'postgres'),'--single','-j','-D',str(root/'data'),'postgres'],input=sql,text=True,capture_output=True)
 out=p.stdout+p.stderr;(root/(name+'.log')).write_text(out)
 if p.returncode != 0 or re.search(r'\b(ERROR|FATAL|PANIC):',out):
  print(name,'FAILED',out[-3500:]);raise SystemExit(1)
 if name=='acceptance' and 'attention_acceptance_pass' not in out: raise SystemExit('Missing acceptance success sentinel')
 print(name,'OK')
# Standalone mode does not advance the OID allocator to FirstNormalObjectId
# as a postmaster does. Consume ordinary disposable sequence OIDs until normal;
# otherwise PostgreSQL treats application tables as catalog objects for RLS.
run('normal-object-oids', "DO $$ DECLARE n oid; BEGIN LOOP CREATE SEQUENCE public.offline_oid_calibration; SELECT 'public.offline_oid_calibration'::regclass::oid INTO n; DROP SEQUENCE public.offline_oid_calibration; EXIT WHEN n>=16384; END LOOP; END $$;")
run('bootstrap', '''CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid primary key); GRANT USAGE ON SCHEMA public,extensions TO anon,authenticated,service_role;''')
for f in sorted((repo/'supabase/migrations').glob('*.sql')):run('canonical-'+f.stem,'BEGIN;\n'+f.read_text()+'\nCOMMIT;')
run('fictional-owner',"INSERT INTO public.staff_members(slug,display_name,email,role,is_active) VALUES ('site-owner','Propietaria ficticia','site-owner@example.invalid','owner',true);")
for f in sorted((repo/'supabase/site-migrations').glob('*.sql')):run('site-'+f.stem,'BEGIN;\n'+f.read_text()+'\nCOMMIT;')
draft=(repo/'supabase/site-migrations/drafts/team-scope-attention.sql').read_text()
for name,prefix in [('negative-unset',''),('negative-wrong',"SET sol_mai.target_project_ref='wrong'; SET sol_mai.apply_team_scope='yes';")]:
 p=subprocess.run([str(bindir/'postgres'),'--single','-j','-D',str(root/'data'),'postgres'],input=prefix+'\n'+draft.replace('\n\n','\n \n'),text=True,capture_output=True)
 out=p.stdout+p.stderr;(root/(name+'.log')).write_text(out)
 assert p.returncode == 0, (name, p.returncode, out[-1000:])
 assert 'isolated_team_scope_target_required' in out,name
 print(name,'EXPECTED REJECTION')
run('guard-rollback',"DO $$ BEGIN IF to_regclass('public.booking_attention') IS NOT NULL OR EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='roles' AND column_name='agenda_scope') THEN RAISE EXCEPTION 'guard rollback failed'; END IF; END $$;")
run('draft-applied',"SET sol_mai.target_project_ref='ijzpmwwjuvsgcsbcbzav'; SET sol_mai.apply_team_scope='yes';\n"+draft)
run('acceptance',"SET sol_mai.test_attention='yes';\n"+(repo/'scripts/site/sql-tests/team-scope-attention.sql').read_text())
run('post-rollback',"DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.booking_attention) OR EXISTS(SELECT 1 FROM public.bookings) OR EXISTS(SELECT 1 FROM public.customers) OR EXISTS(SELECT 1 FROM public.payments) OR EXISTS(SELECT 1 FROM auth.users) OR has_table_privilege('anon','public.booking_attention','SELECT,INSERT') OR has_table_privilege('authenticated','public.booking_attention','SELECT,INSERT') OR (SELECT count(*) FROM public.staff_members)<>1 OR (SELECT value FROM public.business_settings WHERE key='refund_window_hours') <> '24'::jsonb THEN RAISE EXCEPTION 'rollback or side effects failed'; END IF; END $$;")
