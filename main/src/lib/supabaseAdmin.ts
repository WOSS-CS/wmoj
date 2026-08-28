// The `server-only` poison pill. Importing this module from a `'use client'`
// file becomes a BUILD error rather than a runtime surprise — which matters
// more here than anywhere else in the app, because the client this module
// hands out bypasses RLS entirely.
import 'server-only';

import { createClient } from '@supabase/supabase-js';

import type { AppSupabaseClient, Database } from '@/types/supabase';

/**
 * Service-role Supabase client, for the one case RLS genuinely cannot express:
 * READING the answer key on behalf of someone who must not read it.
 *
 * There used to be a second — writing `public.submission_private`, which has a
 * SELECT policy and deliberately no write policy at all. That is now the
 * `record_submission()` RPC's job (SECURITY DEFINER, both halves of a
 * submission in one transaction), reached through `lib/submissionRecord.ts`
 * under the student's own token. Reading the answer key is what is left, and it
 * is the only thing this module may ever grow.
 *
 * A problem's graded data (`input`, `output`, `checker`, `generator_file`) lives
 * in `public.problem_tests`, whose only SELECT policy grants managers and active
 * admins. `api/problems/[id]/submit` runs on the *student's* token and must read
 * that data on their behalf — the student must never be able to read it
 * themselves. No policy can say "this row is readable, but only by code, never
 * by the person the code is running as", so this is the escape hatch.
 *
 * `public.problem_tests` is now the ONLY store: the legacy `problems.input`,
 * `output`, `checker` and `generator_file` columns were dropped, so there is no
 * second copy to read and no fallback to take. Every function here therefore
 * fails CLOSED — it reports "cannot grade" rather than returning a partial or
 * empty test set, because an empty test set silently grades every submission as
 * Accepted against nothing.
 *
 * Rules for anything that touches this module:
 *   - Never import it from a client component (the `server-only` import above
 *     turns that into a build failure).
 *   - Never let data it returns become a client-component prop. React serialises
 *     every prop into the RSC flight payload, so a prop *is* a publication.
 *     Shipping the answer key that way is exactly the bug this replaces.
 *   - Read the narrowest set of columns the caller actually needs.
 */

/** The env var carrying the service-role secret. Never `NEXT_PUBLIC_`-prefixed. */
const SECRET_KEY_VAR = 'SUPABASE_SECRET_KEY';

/** `undefined` = not resolved yet; `null` = resolved, key absent. */
let cachedAdmin: AppSupabaseClient | null | undefined;
let missingKeyWarned = false;

function warnMissingSecretKey(): void {
  if (missingKeyWarned) return;
  missingKeyWarned = true;
  console.error(
    `[supabaseAdmin] ${SECRET_KEY_VAR} is NOT SET. public.problem_tests is the only ` +
      `store for graded data and it is unreadable without this key, so NO SUBMISSION ` +
      `CAN BE GRADED until it is set in the deployment environment. Problem pages will ` +
      `also show an unknown test-case count. This is a deployment misconfiguration, not ` +
      `a code path — set ${SECRET_KEY_VAR} to the project's service-role secret.`,
  );
}

/**
 * The service-role client, or `null` when {@link SECRET_KEY_VAR} is not set.
 *
 * Returns `null` rather than throwing so that a missing key degrades to a clean,
 * loud 500 on the one route that needs it, instead of taking down every page
 * that happens to import this module at build time.
 *
 * Deliberately NOT exported: the "exactly one service-role client" rule is then
 * enforced by the module boundary rather than by review. Add a reader below
 * instead of handing the raw client out.
 */
function getSupabaseAdmin(): AppSupabaseClient | null {
  if (cachedAdmin !== undefined) {
    if (cachedAdmin === null) warnMissingSecretKey();
    return cachedAdmin;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env[SECRET_KEY_VAR];

  if (!url || !secret) {
    warnMissingSecretKey();
    cachedAdmin = null;
    return null;
  }

  cachedAdmin = createClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cachedAdmin;
}

/**
 * A problem's graded data. STAFF-ONLY — never selected into a client-facing
 * payload, never a client-component prop. Kept out of `types/problem.ts` on
 * purpose so a public page has nothing to reference.
 */
export interface ProblemTestData {
  input: unknown[];
  output: unknown[];
  checker: string | null;
}

/**
 * Reads the named columns of one `problem_tests` row through the service-role
 * client. `null` means "could not read" for every reason — no key, query error,
 * or no row — because every one of those is equally disqualifying for a caller
 * that is about to grade someone's submission.
 */
async function readTestColumns(
  problemId: string,
  columns: string,
): Promise<Record<string, unknown> | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from('problem_tests')
    .select(columns)
    .eq('problem_id', problemId)
    .maybeSingle();

  if (error) {
    console.error(`[supabaseAdmin] problem_tests read failed for "${problemId}":`, error);
    return null;
  }
  if (!data) {
    console.error(
      `[supabaseAdmin] problem_tests has no row for "${problemId}". The problem exists ` +
        `but has no test data, so it cannot be graded — it was created outside the ` +
        `staff API routes, or its row was deleted.`,
    );
    return null;
  }
  // PostgREST types a dynamic `select()` string as a union that includes an error
  // shape, so the widening hop through `unknown` is required, not cosmetic.
  return data as unknown as Record<string, unknown>;
}

/**
 * The full graded payload for one problem, for the judge call only.
 *
 * Call this **after** the caller has been authorized for the problem — it
 * deliberately bypasses RLS. Returns `null` when the problem cannot be graded,
 * which the caller MUST treat as a hard failure rather than as an empty test
 * set: shipping `[]` to the judge marks every submission Accepted against no
 * test cases at all.
 */
export async function readProblemTestData(problemId: string): Promise<ProblemTestData | null> {
  const row = await readTestColumns(problemId, 'input, output, checker');
  if (!row) return null;

  const { input, output } = row;

  // Fail closed on a malformed test set. The staff API routes already reject
  // these shapes on write, but `problem_tests` is also written directly by the
  // add-problem workflow, and this is the last checkpoint before the arrays
  // become someone's verdict.
  if (!Array.isArray(input) || !Array.isArray(output)) {
    console.error(`[supabaseAdmin] problem_tests row for "${problemId}" is not array-shaped.`);
    return null;
  }
  if (input.length === 0) {
    console.error(`[supabaseAdmin] problem_tests row for "${problemId}" has zero test cases.`);
    return null;
  }
  if (input.length !== output.length) {
    console.error(
      `[supabaseAdmin] problem_tests row for "${problemId}" is ragged: ` +
        `${input.length} inputs vs ${output.length} outputs.`,
    );
    return null;
  }

  return {
    input,
    output,
    checker: typeof row.checker === 'string' ? row.checker : null,
  };
}

/**
 * How many test cases a problem has — the only thing a public page is allowed to
 * learn about the test set. Returns a scalar so the arrays themselves never
 * leave the server.
 *
 * `null` means the count is genuinely unknown (no service-role key, or no row).
 * Callers render that as "unknown" rather than as `0`: a confident `0` on a
 * problem page is a lie, and it is the same reading a broken deployment would
 * produce.
 */
export async function countProblemTestCases(problemId: string): Promise<number | null> {
  const row = await readTestColumns(problemId, 'input');
  if (!row) return null;
  return Array.isArray(row.input) ? row.input.length : null;
}
