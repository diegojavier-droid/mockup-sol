"""Prepared only. Native multi-session CI on disposable loopback Supabase, before Auth."""
import hashlib, os, pathlib, queue, re, subprocess, threading, time, uuid

ROOT = pathlib.Path(__file__).resolve().parents[3]
PHASE = 'initialization'
# Only exact, non-interpolated exception literals in our checked-in acceptance
# can produce a diagnostic ID. Never forward the database message itself.
ACCEPTANCE_FILE = ROOT/'scripts/site/sql-tests/team-scope-attention.sql'
ASSERTION_IDS = {}
for number, source_line in enumerate(ACCEPTANCE_FILE.read_text().splitlines(), 1):
    for literal in re.findall(r"raise exception '([^']*)'", source_line, re.IGNORECASE):
        if re.fullmatch(r'[A-Za-z0-9 _-]+', literal):
            ASSERTION_IDS[literal] = 'acceptance_line_'+str(number)


class SafeFailure(RuntimeError):
    def __init__(self, code='unknown', assertion=None):
        self.phase = PHASE
        self.assertion = assertion if assertion in ASSERTION_IDS.values() else 'unclassified'
        self.code = code if re.fullmatch(r'[0-9A-Z]{5}|process_exit|timeout|unknown', code) else 'unknown'

def phase(label):
    global PHASE
    PHASE=label
    print('stage '+label, flush=True)

def sqlstate_only(line):
    match=re.search(r'\b(?:ERROR|FATAL|PANIC):\s+([0-9A-Z]{5})(?:[:\s]|$)', line)
    return match.group(1) if match else None

def assertion_id_only(line):
    match=re.search(r'\bERROR:\s+P0001:\s+([^\r\n]*)', line)
    return ASSERTION_IDS.get(match.group(1)) if match else None

def connection_env(source):
    # No URLs, hostnames, sockets, service files, alternate hosts, or remote fallbacks.
    if source.get('SOLMAI_DISPOSABLE_LOCAL_SQL') != 'yes':
        raise ValueError('explicit disposable local opt-in required')
    if source.get('PGHOST') not in ('127.0.0.1', '::1'):
        raise ValueError('numeric loopback PGHOST required')
    port = source.get('PGPORT', '')
    if not re.fullmatch(r'[0-9]{1,5}', port) or not 1024 <= int(port) <= 65535:
        raise ValueError('explicit unprivileged port required')
    if source.get('PGDATABASE') != 'postgres' or source.get('PGUSER') != 'postgres':
        raise ValueError('disposable postgres database/fixture owner required')
    env = {k: source[k] for k in ('PATH', 'HOME', 'LANG', 'SYSTEMROOT') if k in source}
    env.update(PGHOST=source['PGHOST'], PGPORT=port, PGDATABASE='postgres', PGUSER='postgres',
               PGCONNECT_TIMEOUT='5', PGSSLMODE='disable', PGPASSFILE='/dev/null',
               PGOPTIONS='-c statement_timeout=15000 -c lock_timeout=10000')
    if source.get('PGPASSWORD'): env['PGPASSWORD'] = source['PGPASSWORD']
    return env

def scalar_int(lines):
    if len(lines) != 1 or not re.fullmatch(r'[0-9]+', lines[0]):
        raise ValueError('unexpected integer response')
    return int(lines[0])

class Session:
    def __init__(self, env):
        self.p = subprocess.Popen(['psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, env=env)
        self.q = queue.Queue()
        self.error_codes=[]
        self.assertion_ids=[]
        def errors():
            for line in self.p.stderr:
                code=sqlstate_only(line)
                if code: self.error_codes.append(code)
                assertion=assertion_id_only(line)
                if assertion: self.assertion_ids.append(assertion)
        self.errthread=threading.Thread(target=errors,daemon=True)
        self.errthread.start()
        def read():
            for line in self.p.stdout: self.q.put(line.rstrip('\n'))
            self.q.put(None)
        threading.Thread(target=read, daemon=True).start()
        self.pid = scalar_int(self.sql('SELECT pg_backend_pid();'))
    def send(self, sql):
        token = 'done_' + uuid.uuid4().hex
        self.p.stdin.write(sql + "\nSELECT '" + token + "';\n")
        self.p.stdin.flush()
        return token
    def wait(self, token, seconds=20):
        end=time.monotonic()+seconds; out=[]
        while True:
            try: line=self.q.get(timeout=max(0.001,end-time.monotonic()))
            except queue.Empty: raise SafeFailure('timeout')
            if line is None:
                self.errthread.join(timeout=.5)
                raise SafeFailure(self.error_codes[-1] if self.error_codes else 'process_exit', self.assertion_ids[-1] if self.assertion_ids else None)
            if line == token: return out
            out.append(line)
    def sql(self, sql): return self.wait(self.send(sql))
    def close(self):
        if self.p.poll() is None:
            self.p.terminate()
            try: self.p.wait(timeout=5)
            except subprocess.TimeoutExpired: self.p.kill(); self.p.wait()

def blocked(observer, waiter, holder):
    deadline=time.monotonic()+5
    while time.monotonic()<deadline:
        if observer.sql(f'SELECT {holder.pid}=ANY(pg_blocking_pids({waiter.pid}));') == ['t']:
            return
        if waiter.p.poll() is not None: raise RuntimeError('waiter exited before barrier')
        time.sleep(.025)
    raise RuntimeError('expected database lock barrier absent')

def assert_sql(expr, message='assertion_failed'):
    return f"DO $$ BEGIN IF NOT ({expr}) THEN RAISE EXCEPTION '{message}'; END IF; END $$;"

def expected_call(call, state):
    return f"DO $$ BEGIN BEGIN PERFORM {call}; RAISE EXCEPTION 'expected rejection absent'; EXCEPTION WHEN SQLSTATE '{state}' THEN NULL; END; END $$;"

def fixture_role(run):
    if not re.fullmatch(r'[0-9a-f]{32}', run): raise ValueError('run UUID hex required')
    # Canonical roles.slug permits at most31 characters. Retain112 random bits;
    # UUID primary keys still identify every fixture and cleanup is exact.
    return 'qa-'+run[:28]

def scenario(env, observer, kind):
    run=uuid.uuid4().hex; role=fixture_role(run)
    a,b,c,booking=[str(uuid.uuid4()) for _ in range(4)]
    call=lambda action, actor: f"public.record_booking_attention('{booking}','{action}','{actor}')"
    setup=f"""BEGIN;
    INSERT INTO public.roles(slug,name) VALUES('{role}','Ficticia CI');
    INSERT INTO public.role_permissions(role_slug,module,level) VALUES('{role}','calendario','full');
    INSERT INTO public.staff_members(id,slug,display_name,email,role) VALUES
    ('{a}','{run}-a','Ficticia A','{run}-a@example.invalid','{role}'),
    ('{b}','{run}-b','Ficticia B','{run}-b@example.invalid','{role}');
    INSERT INTO public.customers(id,first_name,phone_e164,email) VALUES('{c}','Ficticia CI','+19999998101','{run}@example.invalid');
    INSERT INTO public.bookings(id,customer_id,area_id,starts_at,ends_at,shown_duration_min,status,source,price_display_mode,price_estimated_min,deposit_rate_applied,deposit_amount,staff_id)
    SELECT '{booking}','{c}',id,now()+interval '10 days',now()+interval '10 days 30 minutes',30,'confirmed','manual','fixed',1000,0,0,'{a}' FROM public.areas ORDER BY id LIMIT 1;
    {assert_sql(f"EXISTS(SELECT 1 FROM public.bookings WHERE id='{booking}')")}
    COMMIT;"""
    phase(kind+'.setup')
    observer.sql(setup)
    first=second=None
    try:
        phase(kind+'.sessions')
        first=Session(env);second=Session(env)
        first.sql('BEGIN;')
        if kind in ('double_start','reassign_then_finish'):
            initial_result=first.sql('SET LOCAL ROLE service_role; SELECT '+call('start',a)+';')
        elif kind=='reassignment': first.sql(f"UPDATE public.bookings SET staff_id='{b}' WHERE id='{booking}';")
        elif kind=='deactivation': first.sql(f"UPDATE public.staff_members SET is_active=false WHERE id='{a}';")
        elif kind=='downgrade': first.sql(f"UPDATE public.role_permissions SET level='view' WHERE role_slug='{role}' AND module='calendario';")
        if kind=='reassign_then_finish': pending=second.send(f"UPDATE public.bookings SET staff_id='{b}' WHERE id='{booking}';")
        else:
            sql='SELECT '+call('start',a)+';' if kind=='double_start' else expected_call(call('start',a),'PT404' if kind=='reassignment' else 'PT403')
            pending=second.send('SET ROLE service_role; '+sql)
        phase(kind+'.blocking_barrier')
        blocked(observer,second,first)
        phase(kind+'.commit_and_result')
        first.sql('COMMIT;');result=second.wait(pending)
        if kind=='double_start' and result!=initial_result: raise RuntimeError('double start changed result')
        if kind=='reassign_then_finish':
            second.sql('SET ROLE service_role; '+expected_call(call('finish',a),'PT404')+' SELECT '+call('finish',b)+';')
        count=2 if kind=='reassign_then_finish' else (1 if kind=='double_start' else 0)
        observer.sql(assert_sql(f"(SELECT count(*) FROM public.audit_log WHERE entity_id='{booking}' AND action IN ('booking_attention_started','booking_attention_finished'))={count}"))
        observer.sql(assert_sql(f"(SELECT count(*) FROM public.booking_attention WHERE booking_id='{booking}')={int(count>0)}"))
        if count==2: observer.sql(assert_sql(f"EXISTS(SELECT 1 FROM public.booking_attention WHERE booking_id='{booking}' AND finished_by='{b}' AND finished_at>=started_at)"))
    finally:
        if first: first.close()
        if second: second.close()
        phase(kind+'.cleanup')
        observer.sql(f"""BEGIN;
        DELETE FROM public.booking_attention WHERE booking_id='{booking}';
        DELETE FROM public.audit_log WHERE entity_id IN ('{booking}','{a}','{b}','{c}');
        DELETE FROM public.bookings WHERE id='{booking}';
        DELETE FROM public.customers WHERE id='{c}';
        DELETE FROM public.staff_members WHERE id IN ('{a}','{b}');
        DELETE FROM public.role_permissions WHERE role_slug='{role}';
        DELETE FROM public.roles WHERE slug='{role}'; COMMIT;""")
        observer.sql(assert_sql(f"NOT EXISTS(SELECT 1 FROM public.booking_attention WHERE booking_id='{booking}') AND NOT EXISTS(SELECT 1 FROM public.audit_log WHERE entity_id IN ('{booking}','{a}','{b}','{c}')) AND NOT EXISTS(SELECT 1 FROM public.role_permissions WHERE role_slug='{role}') AND NOT EXISTS(SELECT 1 FROM public.bookings WHERE id='{booking}') AND NOT EXISTS(SELECT 1 FROM public.staff_members WHERE id IN ('{a}','{b}')) AND NOT EXISTS(SELECT 1 FROM public.customers WHERE id='{c}') AND NOT EXISTS(SELECT 1 FROM public.roles WHERE slug='{role}')"))
    print(kind+' PASS')

def main():
    phase('connection_guard')
    env=connection_env(os.environ); observer=Session(env)
    try:
        observer.sql(assert_sql("inet_server_addr() IS NOT NULL AND current_database()='postgres' AND current_user='postgres'",'local_fixture_connection_required'))
        observer.sql(assert_sql("NOT EXISTS(SELECT 1 FROM auth.users) AND NOT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public')",'empty_before_auth_required'))
        observer.sql(assert_sql("to_regclass('auth.users') IS NOT NULL AND (SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role'))=3 AND EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role' AND rolbypassrls) AND EXISTS(SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pgcrypto' AND n.nspname='extensions')", 'supabase_local_contract_required'))
        for folder in ('supabase/migrations','supabase/site-migrations'):
            for f in sorted((ROOT/folder).glob('*.sql')):
                phase('migration.'+f.stem)
                content=f.read_bytes()
                observer.sql('BEGIN;\n'+content.decode()+'\nCOMMIT;')
                print('applied '+str(f.relative_to(ROOT))+' sha256='+hashlib.sha256(content).hexdigest())
        phase('site_owner_check')
        # Site migration provisions the sole fixture owner; never insert it twice.
        observer.sql(assert_sql("(SELECT count(*) FROM public.staff_members)=1 AND EXISTS(SELECT 1 FROM public.staff_members WHERE email='site-owner@example.invalid' AND role='owner' AND is_active AND deleted_at IS NULL)", 'site_owner_fixture_required'))
        phase('draft_application')
        draft=ROOT/'supabase/site-migrations/drafts/team-scope-attention.sql'
        observer.sql("SET sol_mai.target_project_ref='ijzpmwwjuvsgcsbcbzav'; SET sol_mai.apply_team_scope='yes';\n"+draft.read_text())
        print('applied '+str(draft.relative_to(ROOT))+' sha256='+hashlib.sha256(draft.read_bytes()).hexdigest())
        phase('sql_acceptance')
        observer.sql("SET sol_mai.test_attention='yes';\n"+(ROOT/'scripts/site/sql-tests/team-scope-attention.sql').read_text())
        for kind in ('double_start','reassignment','deactivation','downgrade','reassign_then_finish'): scenario(env,observer,kind)
        observer.sql(assert_sql("NOT EXISTS(SELECT 1 FROM auth.users) AND NOT EXISTS(SELECT 1 FROM public.payments) AND NOT EXISTS(SELECT 1 FROM public.bookings) AND NOT EXISTS(SELECT 1 FROM public.customers) AND (SELECT count(*) FROM public.staff_members)=1 AND (SELECT value FROM public.business_settings WHERE key='refund_window_hours')='24'::jsonb"))
        observer.sql("NOTIFY pgrst, 'reload schema';")
        print('SQL before Auth PASS')
    finally: observer.close()

if __name__=='__main__':
    try: main()
    except Exception as error:
        code=error.code if isinstance(error,SafeFailure) else 'unknown'
        failed_phase=error.phase if isinstance(error,SafeFailure) else PHASE
        assertion=error.assertion if isinstance(error,SafeFailure) else 'unclassified'
        raise SystemExit('Local SQL CI failed at '+failed_phase+'; SQLSTATE/category='+code+'; assertion='+assertion+'; contents suppressed')
