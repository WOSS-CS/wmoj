-- Schema parity check for the local Supabase stack.
--
-- Run it after `supabase db reset` to prove your local database is the same SHAPE as
-- production. It counts and hashes every column, RLS policy, function, trigger, index,
-- constraint, Data API grant and storage bucket, then compares against the values
-- recorded from production (project usltyqkrptaaktnmjeyf, Postgres 17).
--
--   docker exec -i supabase_db_wmoj-app psql -U postgres -d postgres \
--     -f - < supabase/schema-fingerprint.sql
--
-- `count_ok` is the hard signal: false means a migration did not apply and you should
-- re-run `supabase db reset`. `md5_ok` is advisory, because a different Postgres or
-- Supabase version can render a default or an index definition slightly differently.
--
-- KNOWN: `functions` reports md5_ok = false with a matching count. Five function bodies
-- differ from production in ways that do not change behaviour (keyword case, a stray
-- space, one SQL comment) plus `::text` casts that the repo added to join_contest and
-- leave_contest, which are dead code with no caller in main/src. Production is the one
-- that drifted; the migrations are correct.
--
-- After a schema change, update the expected values below in the same PR as the migration.

with expected(k, n, d) as (values
  ('columns',      96, 'd55489f32b83d77697541b59a5fccc35'),
  ('policies',     65, '76e1fbb7b787998e3e977c4e341a582d'),
  ('functions',    13, '2a32a1440f0aba581a3881612563bbb5'),
  ('triggers',     10, 'fb14cea26ce078f409af7c7189feb5ad'),
  ('indexes',      44, '8e25fcfa779dd5b4c0eff87f2bd31033'),
  ('constraints',  47, 'c842db34ddb8e1d32c666ae79cc15ae2'),
  ('grants',      281, '92a4f214581f2e91e1e0f24e759ed0a1'),
  ('buckets',       2, 'cb85db38e41795c393bb4fafd45d840c')
), cols as (
  select string_agg(format('%s.%s %s %s %s', table_name, column_name, data_type, is_nullable, coalesce(column_default,'-')), E'\n' order by table_name, column_name) t, count(*) n
  from information_schema.columns where table_schema='public'
), pol as (
  select string_agg(format('%s|%s|%s|%s|%s', c.relname, p.polname, p.polcmd, coalesce(pg_get_expr(p.polqual,p.polrelid),'-'), coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'-')), E'\n' order by c.relname, p.polname) t, count(*) n
  from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','storage')
), fn as (
  select string_agg(format('%s(%s)|%s|%s|%s', p.proname, pg_get_function_identity_arguments(p.oid), p.prosecdef, p.provolatile, md5(p.prosrc)), E'\n' order by p.proname, pg_get_function_identity_arguments(p.oid)) t, count(*) n
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
), trg as (
  select string_agg(format('%s.%s|%s', c.relname, t.tgname, pg_get_triggerdef(t.oid)), E'\n' order by c.relname, t.tgname) t, count(*) n
  from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal
), idx as (
  select string_agg(indexdef, E'\n' order by indexname) t, count(*) n from pg_indexes where schemaname='public'
), con as (
  select string_agg(format('%s|%s|%s', c.conrelid::regclass, c.conname, pg_get_constraintdef(c.oid)), E'\n' order by c.conrelid::regclass::text, c.conname) t, count(*) n
  from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public'
), grt as (
  select string_agg(format('%s|%s|%s', grantee, table_name, privilege_type), E'\n' order by grantee, table_name, privilege_type) t, count(*) n
  from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','service_role')
), buk as (
  select string_agg(format('%s|%s|%s|%s', id, public, file_size_limit, array_to_string(allowed_mime_types,',')), E'\n' order by id) t, count(*) n from storage.buckets
), actual(k, n, d) as (
            select 'columns',     n, md5(t) from cols
  union all select 'policies',    n, md5(t) from pol
  union all select 'functions',   n, md5(t) from fn
  union all select 'triggers',    n, md5(t) from trg
  union all select 'indexes',     n, md5(t) from idx
  union all select 'constraints', n, md5(t) from con
  union all select 'grants',      n, md5(t) from grt
  union all select 'buckets',     n, md5(t) from buk
)
select
  e.k                             as category,
  a.n                             as count,
  e.n                             as expected_count,
  a.n = e.n                       as count_ok,
  a.d                             as md5,
  a.d = e.d                       as md5_ok
from expected e join actual a using (k)
order by e.k;
