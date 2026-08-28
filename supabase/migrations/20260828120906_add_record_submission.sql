-- One transaction for the two halves of a submission.
--
-- `public.submissions` (world-readable, redacted) and `public.submission_private` (owner+staff) were
-- written by two separate calls — the second through the service role because the private table has
-- no INSERT policy — with a hand-rolled compensating delete when the second failed. The pair now
-- lands atomically here, so "public row exists, private row does not" cannot happen and the
-- compensation code is gone, not moved.
--
-- SECURITY DEFINER because the private table deliberately has no write policy. The function pins
-- user_id to auth.uid(), the same predicate `submissions_insert_own` enforces, so nothing an
-- authenticated caller could not already write becomes writable. Redaction of the PUBLIC payload is
-- the caller's job (main/src/lib/submissionRedaction.ts) and MUST happen before this is called: this
-- function stores p_results / p_summary exactly as given.

create or replace function public.record_submission(
  p_problem_id    text,
  p_language      text,
  p_results       jsonb,   -- REDACTED per-case array (allowlist: verdict, passed, index, timedOut, exitCode)
  p_summary       jsonb,   -- REDACTED summary (total, passed, failed, verdict)
  p_code          text,
  p_results_full  jsonb,   -- the judge's full array, verbatim
  p_compile_error text     -- null unless the submission failed to compile
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user    uuid := auth.uid();
  v_id      uuid;
  v_created timestamptz;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.submissions (problem_id, user_id, language, results, summary)
  values (p_problem_id, v_user, p_language, p_results, p_summary)
  returning submissions.id, submissions.created_at into v_id, v_created;

  -- Same created_at as the parent: the private row mirrors, never restamps.
  insert into public.submission_private (submission_id, user_id, code, results_full, compile_error, created_at)
  values (v_id, v_user, p_code, p_results_full, nullif(p_compile_error, ''), coalesce(v_created, now()));

  return v_id;
end;
$$;

revoke execute on function public.record_submission(text, text, jsonb, jsonb, text, jsonb, text) from public, anon;
grant  execute on function public.record_submission(text, text, jsonb, jsonb, text, jsonb, text) to authenticated;

comment on table public.submission_private is
  'The private half of a submission: source code, the FULL per-case judge output (including '
  '`expected`, `received`, `stdout`, `stderr`) and compiler diagnostics. Readable only by the '
  'submitting user and by active staff. The public `public.submissions` row keeps a redacted '
  '`results` array. Written only by record_submission(), atomically with its parent row.';
