-- Pin `search_path` on every SECURITY DEFINER function, repair two scoring/scoring-adjacent bugs,
-- and remove functions that cannot succeed.
--
-- Why search_path: a SECURITY DEFINER function with a mutable search_path runs its body as the
-- definer while resolving unqualified names against the CALLER's path. `is_admin()` and
-- `is_manager()` are the two helpers every RLS policy in this schema depends on, so this is the
-- highest-leverage hardening available. Every body below is already fully schema-qualified;
-- `set search_path = ''` makes that a guarantee rather than a convention.
--
-- Why the recalculation change (they disagreed with each other): `recalculate_problems_solved`
-- counts DISTINCT problem_id straight from `submissions`, while `recalculate_user_points` JOINs
-- `problems` for its point total but then counts `n_solved` WITHOUT that join. `submissions` has no
-- foreign keys, so orphaned rows are possible — and today a deleted problem still inflates
-- `problems_solved` and the breadth bonus forever, while contributing nothing to the base points.
-- Both now filter orphans, so the two functions agree and the two halves of the points formula do too.
--
-- Why the comment-score change: `update_comment_score` rescores only NEW.comment_id on UPDATE. If a
-- vote row is ever re-pointed at a different comment, the OLD comment keeps the vote's contribution
-- permanently — a score that no set of votes can produce and that nothing recomputes. The trigger
-- now rescores both sides, and a companion trigger makes `comment_id` immutable so the situation
-- cannot arise in the first place (RLS cannot express "this column may not change").
--
-- Why the drops: `is_admin(uuid)` queries `admins.user_id`, which does not exist on that table — it
-- has always raised. `insert_problem` and the `join_contest`/`leave_contest` pair are unreferenced
-- (grepped across `main/src` and `.agents`) and carried PUBLIC EXECUTE.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admins where id = auth.uid() and is_active = true
  );
$$;

create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.managers where id = auth.uid() and is_active = true
  );
$$;

create or replace function public.recalculate_problems_solved(uid uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  n integer := 0;
begin
  select count(distinct s.problem_id) into n
  from public.submissions s
  where s.user_id = uid
    and s.status = 'passed'
    and exists (select 1 from public.problems p where p.id = s.problem_id);

  update public.users set problems_solved = n where id = uid;

  return n;
end;
$$;

create or replace function public.recalculate_user_points(uid uuid)
returns double precision language plpgsql security definer set search_path = '' as $$
declare
  total     double precision := 0;
  bonus     double precision := 0;
  n_solved  integer := 0;
  rec       record;
  i         integer := 0;
begin
  for rec in
    select sub.problem_points from (
      select distinct on (s.problem_id) p.points as problem_points
      from public.submissions s
      join public.problems p on p.id = s.problem_id
      where s.user_id = uid
        and s.status = 'passed'
      order by s.problem_id
    ) sub
    order by sub.problem_points desc
    limit 100
  loop
    total := total + rec.problem_points * power(0.95, i);
    i := i + 1;
  end loop;

  select count(distinct s.problem_id) into n_solved
  from public.submissions s
  where s.user_id = uid
    and s.status = 'passed'
    and exists (select 1 from public.problems p where p.id = s.problem_id);

  bonus := 150.0 * (1.0 - power(0.997, n_solved));

  update public.users set points = total + bonus where id = uid;

  return total + bonus;
end;
$$;

create or replace function public.update_comment_score()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    update public.comments
       set score = coalesce((select sum(value) from public.comment_votes where comment_id = old.comment_id), 0)
     where id = old.comment_id;
    return old;
  end if;

  -- On UPDATE, rescore BOTH sides: if the vote moved between comments, the old one is now stale.
  if tg_op = 'UPDATE' and old.comment_id is distinct from new.comment_id then
    update public.comments
       set score = coalesce((select sum(value) from public.comment_votes where comment_id = old.comment_id), 0)
     where id = old.comment_id;
  end if;

  update public.comments
     set score = coalesce((select sum(value) from public.comment_votes where comment_id = new.comment_id), 0)
   where id = new.comment_id;
  return new;
end;
$$;

-- Belt and braces: make the situation above unreachable.
create or replace function public.comment_votes_freeze_comment_id()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.comment_id is distinct from old.comment_id then
    raise exception 'comment_id is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists comment_votes_freeze_comment_id on public.comment_votes;
create trigger comment_votes_freeze_comment_id
  before update on public.comment_votes
  for each row execute function public.comment_votes_freeze_comment_id();

-- Dead code, all three unreferenced and all three holding PUBLIC EXECUTE.
drop function if exists public.is_admin(uuid);
drop function if exists public.insert_problem(text, text, jsonb, jsonb, integer, integer, text);
revoke execute on function public.join_contest(uuid)  from public, anon, authenticated;
revoke execute on function public.leave_contest(uuid) from public, anon, authenticated;
