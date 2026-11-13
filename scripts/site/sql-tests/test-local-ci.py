"""Offline only: no subprocess, network or database."""
import contextlib,io,importlib.util,pathlib,unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('runner',pathlib.Path(__file__).with_name('run-local-ci.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Guards(unittest.TestCase):
 def env(self): return dict(SOLMAI_DISPOSABLE_LOCAL_SQL='yes',PGHOST='127.0.0.1',PGPORT='54322',PGDATABASE='postgres',PGUSER='postgres')
 def test_valid_numeric_loopback(self):
  for host in ('127.0.0.1','::1'):
   e=self.env();e['PGHOST']=host;self.assertEqual(m.connection_env(e)['PGHOST'],host)
 def test_remote_and_ambiguous(self):
  for host in ('localhost','127.0.0.1,example.com','127.1','/tmp','db.project.supabase.co','127.0.0.1.example.com','postgresql://postgres@127.0.0.1/db',''):
   e=self.env();e['PGHOST']=host
   with self.assertRaises(ValueError):m.connection_env(e)
 def test_optin_and_port(self):
  for key,value in [('SOLMAI_DISPOSABLE_LOCAL_SQL',''),('PGPORT','54322,5432'),('PGPORT','65536'),('PGPORT','22'),('PGDATABASE','production'),('PGUSER','service_role')]:
   e=self.env();e[key]=value
   with self.assertRaises(ValueError):m.connection_env(e)
 def test_environment_cannot_override_target(self):
  e=self.env();e.update(PGHOSTADDR='8.8.8.8',PGSERVICE='prod',PGSERVICEFILE='/secret',PGOPTIONS='unsafe',PGSSLMODE='require',PGPASSFILE='/secret',DATABASE_URL='secret',PGPASSWORD='synthetic')
  result=m.connection_env(e)
  for key in ('PGHOSTADDR','PGSERVICE','PGSERVICEFILE','DATABASE_URL'):self.assertNotIn(key,result)
  self.assertEqual(result['PGPASSFILE'],'/dev/null');self.assertEqual(result['PGPASSWORD'],'synthetic')
 def test_integer_parser(self):
  self.assertEqual(m.scalar_int(['123']),123)
  for value in ([],['1','2'],['bad'],['1; DROP'],['-1']):
   with self.assertRaises(ValueError):m.scalar_int(value)
 def test_barrier_checks_exact_backend_pair(self):
  class Fake:
   def sql(self,sql):self.query=sql;return ['t']
  observer=Fake();waiter=type('P',(),{'pid':123})();holder=type('P',(),{'pid':456})()
  m.blocked(observer,waiter,holder)
  self.assertEqual(observer.query,'SELECT 456=ANY(pg_blocking_pids(123));')
 def test_main_reuses_site_provisioned_owner_before_draft(self):
  class FakeSession:
   def __init__(self, env):self.queries=[]
   def sql(self,sql):self.queries.append(sql);return []
   def close(self):pass
  fake=FakeSession({})
  with patch.dict(m.os.environ,self.env(),clear=True), patch.object(m,'Session',return_value=fake), patch.object(m,'scenario'), contextlib.redirect_stdout(io.StringIO()):m.main()
  provision=[i for i,q in enumerate(fake.queries) if "select public.provision_initial_owner('site-owner@example.invalid'" in q]
  self.assertEqual(len(provision),1)
  validation=next(i for i,q in enumerate(fake.queries) if 'site_owner_fixture_required' in q)
  draft=next(i for i,q in enumerate(fake.queries) if 'SET sol_mai.apply_team_scope' in q)
  self.assertLess(provision[0],validation);self.assertLess(validation,draft)
  self.assertFalse(any(q.startswith('INSERT INTO public.staff_members') for q in fake.queries))
  self.assertTrue(any('supabase_local_contract_required' in q for q in fake.queries))
if __name__=='__main__':unittest.main()
