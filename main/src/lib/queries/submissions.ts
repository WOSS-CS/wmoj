import { PROBLEM_NAME_COLUMNS } from '@/lib/queries/problems';
import { USER_PUBLIC_COLUMNS, USER_STAFF_COLUMNS } from '@/lib/queries/users';
import type { AssertColumns, Checked } from './columns';
import type { AppSupabaseClient, Row } from '@/types/supabase';

/**
 * The `submissions` column sets and the two projections every submission
 * surface shares.
 *
 * The seven-column public list was spelled four different ways across three
 * API routes and six `page.tsx` files, and each of those pages then re-derived
 * the same three things from the row: the `summary?.verdict === 'CE'` flag, the
 * `total > 0 ? `${passed}/${total}` : '—'` score, and an id → name map built
 * from a `.in()` lookup. They are one function each now.
 *
 * The column strings are `const`, so they keep their literal type and the typed
 * client still checks every name in them; the `ColumnChecks` tuple at the foot
 * of the file proves each one still matches its `Pick`.
 */

/**
 * Everything a submission LIST or the public half of a detail view needs.
 *
 * `code` and `results` are deliberately absent — `code` is not a column here at
 * all (it moved to `submission_private`), and `results` is a per-row copy of
 * the whole test set that no list renders. `SubmissionDetailModal` fetches both
 * on demand through `lib/submissionDetail.ts`.
 */
export const SUBMISSION_PUBLIC_COLUMNS =
  'id, problem_id, user_id, language, summary, status, created_at';

/** The owner-and-staff-only half, on `public.submission_private`. */
export const SUBMISSION_PRIVATE_COLUMNS = 'code, results_full, compile_error';

/** One row of {@link SUBMISSION_PUBLIC_COLUMNS}. */
export type SubmissionPublicRow = Pick<
  Row<'submissions'>,
  'id' | 'problem_id' | 'user_id' | 'language' | 'summary' | 'status' | 'created_at'
>;

/** One row of {@link SUBMISSION_PRIVATE_COLUMNS}. */
export type SubmissionPrivateRow = Pick<
  Row<'submission_private'>,
  'code' | 'results_full' | 'compile_error'
>;

/** The three counts and the two derived display values every list row wants. */
export interface SubmissionSummaryView {
  total: number;
  passed: number;
  failed: number;
  /** `${passed}/${total}`, or '—' when nothing ran (a compile error, or an empty test set). */
  score: string;
  /** `summary.verdict === 'CE'`. There is no `verdict` COLUMN — only this JSON key. */
  isCompileError: boolean;
}

/**
 * A count out of the untyped `summary` JSON.
 *
 * `Number(undefined)` is `NaN` and `NaN` renders as the string "NaN", so a
 * malformed value reads as zero rather than leaking into the UI. Historical
 * rows do store the counts as strings, which is why this coerces at all.
 */
function toCount(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Pure. Read `submissions.summary` (a `jsonb` column, so its shape is a runtime
 * fact) into the counts and labels a list row renders.
 *
 * `passed` is NOT clamped to `total`: the page shows what was stored, and a row
 * where they disagree is a judging defect worth seeing rather than hiding.
 */
export function summarizeSubmission(summary: unknown): SubmissionSummaryView {
  const record =
    summary && typeof summary === 'object' && !Array.isArray(summary)
      ? (summary as Record<string, unknown>)
      : null;

  const total = toCount(record?.total);
  const passed = toCount(record?.passed);
  const failed = toCount(record?.failed);

  return {
    total,
    passed,
    failed,
    score: total > 0 ? `${passed}/${total}` : '—',
    isCompileError: record?.verdict === 'CE',
  };
}

/** A display name for one submitter. `email` is null unless the scope is `'staff'`. */
export interface SubmissionUserName {
  username: string;
  email: string | null;
}

/**
 * The id → name enrichment for ONE PAGE of submission rows.
 *
 * `submissions.user_id` and `.problem_id` carry no foreign keys, so the names
 * cannot be embedded and have to be looked up. The ids come from the rows that
 * were actually fetched and nothing widens them — enriching beyond the current
 * page is how a paginated list quietly starts reading the whole table.
 *
 * `scope` is the column list, and it is a privacy boundary, not a convenience:
 * `'public'` selects `username` only because `users.email` is REVOKED from
 * `anon`, and `/submissions` renders for signed-out visitors. Naming `email` in
 * an anonymous query fails the whole request, so it is never named there.
 *
 * A failed lookup is logged and answered with an empty map — the caller's
 * `?? 'Unknown User'` fallback then applies, which is the same thing a genuinely
 * missing row produces. Neither half is allowed to take the page down.
 */
export async function resolveSubmissionNames(
  supabase: AppSupabaseClient,
  rows: ReadonlyArray<{ user_id: string; problem_id: string }>,
  scope: 'public' | 'staff',
): Promise<{ users: Map<string, SubmissionUserName>; problems: Map<string, string> }> {
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  const problemIds = [...new Set(rows.map((r) => r.problem_id).filter(Boolean))];

  const [userResult, problemResult] = await Promise.all([
    fetchUserNames(supabase, userIds, scope),
    fetchProblemNames(supabase, problemIds),
  ]);

  if (userResult.error) {
    console.error('[resolveSubmissionNames] users lookup failed:', userResult.error);
  }
  if (problemResult.error) {
    console.error('[resolveSubmissionNames] problems lookup failed:', problemResult.error);
  }

  return { users: userResult.names, problems: problemResult.names };
}

/**
 * The two column lists are spelled in separate branches rather than in one
 * ternary because a conditional expression over two `.select()` builders
 * collapses to the narrower row type — `email` would silently be typed away
 * and read as `undefined` at runtime.
 */
async function fetchUserNames(
  supabase: AppSupabaseClient,
  userIds: string[],
  scope: 'public' | 'staff',
): Promise<{ names: Map<string, SubmissionUserName>; error: unknown }> {
  const names = new Map<string, SubmissionUserName>();
  if (userIds.length === 0) return { names, error: null };

  if (scope === 'staff') {
    const { data, error } = await supabase.from('users').select(USER_STAFF_COLUMNS).in('id', userIds);
    for (const u of data ?? []) names.set(u.id, { username: u.username, email: u.email });
    return { names, error };
  }

  const { data, error } = await supabase.from('users').select(USER_PUBLIC_COLUMNS).in('id', userIds);
  for (const u of data ?? []) names.set(u.id, { username: u.username, email: null });
  return { names, error };
}

async function fetchProblemNames(
  supabase: AppSupabaseClient,
  problemIds: string[],
): Promise<{ names: Map<string, string>; error: unknown }> {
  const names = new Map<string, string>();
  if (problemIds.length === 0) return { names, error: null };

  const { data, error } = await supabase.from('problems').select(PROBLEM_NAME_COLUMNS).in('id', problemIds);
  for (const p of data ?? []) names.set(p.id, p.name);
  return { names, error };
}

/**
 * Compile-time proof that each column string above names exactly the keys of
 * its row type. Adding a column to one and forgetting the other is a build
 * error here rather than a row type that quietly disagrees with the row
 * fetched. Exported only so it counts as used; nothing imports it.
 *
 * Embedded lists are absent on purpose — an embed has no `Pick` to check.
 */
export type ColumnChecks = [
  Checked<AssertColumns<typeof SUBMISSION_PUBLIC_COLUMNS, SubmissionPublicRow>>,
  Checked<AssertColumns<typeof SUBMISSION_PRIVATE_COLUMNS, SubmissionPrivateRow>>,
];
