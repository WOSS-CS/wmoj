-- Attach `update_updated_at_column()` to the tables that carry an `updated_at` column.
--
-- Why: the function has existed since the baseline schema and is attached to NOTHING. Eight tables
-- carry `updated_at`; only `news_posts` has a trigger, and it uses its own dedicated function. So on
-- every other table `updated_at` holds the row's CREATION time forever, silently, while looking like
-- a maintained audit column — several screens display it as "last modified".
--
-- Trigger-set columns are not subject to the caller's column privileges (only the columns named in
-- the statement's SET list are), so this composes safely with the column-scoped UPDATE grants on
-- `users`, `managers` and `admins`.

create trigger users_updated_at         before update on public.users
  for each row execute function public.update_updated_at_column();

create trigger problems_updated_at      before update on public.problems
  for each row execute function public.update_updated_at_column();

create trigger contests_updated_at      before update on public.contests
  for each row execute function public.update_updated_at_column();

create trigger comments_updated_at      before update on public.comments
  for each row execute function public.update_updated_at_column();

create trigger managers_updated_at      before update on public.managers
  for each row execute function public.update_updated_at_column();

create trigger admins_updated_at        before update on public.admins
  for each row execute function public.update_updated_at_column();

create trigger problem_tests_updated_at before update on public.problem_tests
  for each row execute function public.update_updated_at_column();
