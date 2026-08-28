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
-- The expected values below are generated from a clean `supabase db reset`, so they describe what
-- the MIGRATION HISTORY produces. A local reset currently reports count_ok AND md5_ok true on all
-- eight rows.
--
-- KNOWN production differences, both explained, neither a local failure:
--
--   1. `functions` md5 differs (count matches at 14). SIX bodies differ, and they differ for two
--      different reasons. Five drifted in production in ways that do not change behaviour —
--      keyword case, a stray space, one SQL comment, plus `::text` casts the repo added to
--      join_contest/leave_contest, which are dead code with no caller in main/src. There the
--      migrations are correct and production is the side that drifted.
--      The sixth is `top_submitted_problems`, and it is the other way round: production stores a
--      267-character body against the migration's 991 because the apply path strips `--` comments.
--      Signature, STABLE, SECURITY INVOKER, search_path, ACL and the COMMENT all match, so there is
--      no functional or security difference — but it cannot be made to converge by re-applying,
--      since re-applying strips the comments again. It is a permanent, benign digest mismatch.
--
--   2. ⚠️ TEMPORARY — REMOVE THIS ITEM ONCE PRODUCTION CATCHES UP.
--      `20260827203300_remove_user_is_active.sql` is deliberately NOT YET APPLIED to production. It
--      must be applied only AFTER the app deploy that stops reading `users.is_active`: the
--      currently-deployed build tests `is_active !== true`, and `undefined !== true` is TRUE, so
--      applying it first force-signs-out every user to /auth/login?disabled=1.
--      Until it is applied, production reports `columns = 99` (vs 98), `policies = 65` (vs 64),
--      `grants = 282` (vs 273) and different column/policy/grant digests. Every one of those deltas
--      is exactly that migration: one column, one dropped DELETE policy plus three rewritten INSERT
--      policies, and nine revoked table privileges on `users`.
--
-- After a schema change, update the expected values below in the same PR as the migration.

with expected(k, n, d) as (values
  ('columns',      98, 'c6db0181eff27c8dcfc5eeaf1e7a0c27'),
  ('policies',     64, '786b46a0bc53f0a19572caf6f6d468f4'),
  ('functions',    14, 'c1064df3f23aefead2e8204c1f02a077'),
  ('triggers',     10, 'fb14cea26ce078f409af7c7189feb5ad'),
  ('indexes',      46, 'd12c1a0bdb158da06de3bf5bf9fdfb22'),
  ('constraints',  49, 'e9515ed5807694e45584db4624cb04ee'),
  ('grants',      273, '90a2e475b6e22f34d9f0c9edc56dfe22'),
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
