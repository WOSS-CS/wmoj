-- Let anonymous visitors read `join_history`, so the public leaderboard stops disagreeing with the
-- signed-in one.
--
-- Why: `join_history`'s SELECT policy was granted to `authenticated` only, with no `anon` policy at
-- all. The leaderboard builds its participant set from that table and then applies
--     if (regularUserIds.size > 0 && !regularUserIds.has(submission.user_id)) return;
-- — a filter that DISABLES ITSELF when the set is empty. For a logged-out viewer the set is always
-- empty, so the guard always evaporates and the public board lists every user who has ever solved
-- any of those problems, ranked, as if they had competed. The same anon-blindness makes every public
-- profile report "0 contests written".
--
-- The table holds `(user_id, contest_id, joined_at, left_at, is_virtual)` and nothing more
-- sensitive than `contest_participants`, which is already anon-readable. Writes stay
-- owner-scoped — only the SELECT policy widens.
--
-- The app-side half of this (making the participant filter unconditional and checking the query's
-- error rather than silently widening) ships alongside; this policy is what lets the corrected code
-- return the same board to everyone.

drop policy if exists "Users can view all join history" on public.join_history;
create policy "Anyone can view join history" on public.join_history
  for select to anon, authenticated
  using (true);
