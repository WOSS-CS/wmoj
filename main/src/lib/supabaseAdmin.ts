// The `server-only` poison pill. Importing this module from a `'use client'`
// file becomes a BUILD error rather than a runtime surprise — which matters
// more here than anywhere else in the app, because the client this module
// hands out bypasses RLS entirely.
import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client, for the one case RLS genuinely cannot express.
 *
 * A problem's graded data (`input`, `output`, `checker`, `generator_file`) lives
 * in `public.problem_tests`, whose only SELECT policy grants managers and active
 * admins. `api/problems/[id]/submit` runs on the *student's* token and must read
 * that data on their behalf — the student must never be able to read it
 * themselves. No policy can say "this row is readable, but only by code, never
 * by the person the code is running as", so this is the escape hatch.
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
let cachedAdmin: SupabaseClient | null | undefined;
let missingKeyWarned = false;

function warnMissingSecretKey(): void {
  if (missingKeyWarned) return;
  missingKeyWarned = true;
  console.warn(
    `[supabaseAdmin] ${SECRET_KEY_VAR} is NOT SET. Falling back to the caller-scoped ` +
      `read of problems.input/output/checker for every submission. This is the documented ` +
      `transition path and adds no exposure — those columns are still world-readable — but ` +
      `the secure read of public.problem_tests stays switched off until ${SECRET_KEY_VAR} ` +
      `is set in the deployment environment.`,
  );
}

/**
 * The service-role client, or `null` when {@link SECRET_KEY_VAR} is not set.
 *
 * Returning `null` rather than throwing is deliberate: the key is not yet
 * present in every deployment environment, and a hard requirement would break
 * every submission the moment this ships. Callers must handle `null` by falling
 * back to the still-readable legacy columns — see {@link readProblemTestData}.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
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

  cachedAdmin = createClient(url, secret, {
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
 * ⚠️ TRANSITION MECHANISM, NOT A PERMANENT DESIGN.
 *
 * Reads graded columns for one problem from `public.problem_tests` via the
 * service-role client when {@link SECRET_KEY_VAR} is set, and otherwise from the
 * legacy `public.problems` columns using the caller's own client.
 *
 * The fallback adds no exposure: `problems.input/output/checker/generator_file`
 * are world-readable today regardless of this code, and dropping them is a
 * deliberately separate later migration. It exists so that setting
 * {@link SECRET_KEY_VAR} in the deployment environment switches the secure path
 * on by itself, with no code change and no window where submissions break.
 *
 * EXPIRY CONDITION: delete the fallback — and make a missing
 * {@link SECRET_KEY_VAR} a hard error — as soon as the key is set everywhere the
 * app runs. It MUST be gone before the migration that drops those four columns
 * from `problems`, at which point the fallback silently grades against `'[]'`.
 *
 * `columns` must always include `input`: it is the freshness check that decides
 * whether the `problem_tests` row is usable. A missing row (a problem created by
 * a writer that has not been repointed yet) or an empty test set falls back to
 * `problems`, which is still the authoritative source until it is dropped.
 */
async function readTestColumns(
  fallbackClient: SupabaseClient,
  problemId: string,
  columns: string,
): Promise<Record<string, unknown> | null> {
  const admin = getSupabaseAdmin();

  if (admin) {
    const { data, error } = await admin
      .from('problem_tests')
      .select(columns)
      .eq('problem_id', problemId)
      .maybeSingle();

    const row = data as Record<string, unknown> | null;
    const input = row?.input;

    if (error) {
      console.error(`[supabaseAdmin] problem_tests read failed for "${problemId}":`, error);
    } else if (Array.isArray(input) && input.length > 0) {
      return row;
    } else {
      console.warn(
        `[supabaseAdmin] problem_tests has no usable row for "${problemId}"; ` +
          `falling back to the legacy problems columns.`,
      );
    }
  }

  const { data, error } = await fallbackClient
    .from('problems')
    .select(columns)
    .eq('id', problemId)
    .maybeSingle();

  if (error) {
    console.error(`[supabaseAdmin] legacy problems test-data read failed for "${problemId}":`, error);
    return null;
  }
  return (data as Record<string, unknown> | null) ?? null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * The full graded payload for one problem, for the judge call only.
 *
 * Call this **after** the caller has been authorized for the problem — it
 * deliberately bypasses RLS when the service-role key is present.
 * Returns `null` only when the read itself failed.
 */
export async function readProblemTestData(
  fallbackClient: SupabaseClient,
  problemId: string,
): Promise<ProblemTestData | null> {
  const row = await readTestColumns(fallbackClient, problemId, 'input, output, checker');
  if (!row) return null;

  return {
    input: asArray(row.input),
    output: asArray(row.output),
    checker: typeof row.checker === 'string' ? row.checker : null,
  };
}

/**
 * How many test cases a problem has — the only thing a public page is allowed to
 * learn about the test set. Returns a scalar so the arrays themselves never
 * leave the server.
 */
export async function countProblemTestCases(
  fallbackClient: SupabaseClient,
  problemId: string,
): Promise<number> {
  const row = await readTestColumns(fallbackClient, problemId, 'input');
  return asArray(row?.input).length;
}
