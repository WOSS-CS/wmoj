import type { SupabaseClient } from '@supabase/supabase-js';
import { getContestStatus } from '@/utils/contestStatus';

/**
 * Shared validation for the four contest write handlers
 * (`api/{admin,manager}/contests/create` and `api/{admin,manager}/contests/[id]`).
 *
 * Two jobs, both of which must happen **before the first write** — there are no
 * Server Actions and no transaction, so a rejection after a write leaves the
 * mutation half-applied:
 *
 *   1. Field validation, mirroring the live CHECK constraints
 *      (`contests_length_range`, `contests_window_paired`) so the caller gets a
 *      400 with a real message instead of a raw constraint violation.
 *   2. Contest-problem eligibility (Invariant 3), which needs only the problem
 *      ids and the target's rated flag — both available up front.
 *
 * It also owns the `contest_problems` membership diff for the two `[id]` PATCH
 * twins: `planContestProblemChanges` (everything before the first write) and
 * `applyContestProblemChanges` (the writes). Those handlers differed only by the
 * admin ownership gate, so the delta is a parameter rather than a second copy.
 */

/** Mirrors `contests_length_range` on `public.contests`. */
export const CONTEST_MIN_LENGTH = 1;
export const CONTEST_MAX_LENGTH = 1440;

export interface ContestWindow {
  starts_at: string | null;
  ends_at: string | null;
}

/** A rejection carrying the status the handler should return. */
export interface ContestValidationError {
  error: string;
  status: number;
}

function normaliseText(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

function normaliseTimestamp(value: unknown): string | null | undefined {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number.isNaN(new Date(trimmed).getTime()) ? undefined : trimmed;
}

/**
 * Validates the window pair. `contests_window_paired` requires both timestamps
 * to be set or neither, and a contest whose start is not before its end can
 * never leave `upcoming`.
 */
export function validateContestWindow({ starts_at, ends_at }: ContestWindow): string | null {
  if ((starts_at === null) !== (ends_at === null)) {
    return 'Set both a start and an end date/time, or neither';
  }
  if (starts_at !== null && ends_at !== null && new Date(starts_at) >= new Date(ends_at)) {
    return 'Start date/time must be before end date/time';
  }
  return null;
}

/** Mirrors `contests_length_range`; also rejects non-integers, which the column would truncate. */
export function validateContestLength(length: unknown): string | null {
  if (typeof length !== 'number' || !Number.isInteger(length)) {
    return 'Length must be a whole number of minutes';
  }
  if (length < CONTEST_MIN_LENGTH || length > CONTEST_MAX_LENGTH) {
    return `Length must be between ${CONTEST_MIN_LENGTH} and ${CONTEST_MAX_LENGTH} minutes`;
  }
  return null;
}

export interface ContestCreateFields {
  name: string;
  description: string;
  length: number;
  starts_at: string | null;
  ends_at: string | null;
  is_rated: boolean;
}

/**
 * Validates and normalises a create payload. Returns the trimmed values the
 * handler should insert, or the rejection to return.
 */
export function validateContestCreate(
  body: Record<string, unknown>,
): { values: ContestCreateFields } | ContestValidationError {
  const name = normaliseText(body.name);
  const description = normaliseText(body.description);

  if (!name || !description || body.length === undefined || body.length === null) {
    return { error: 'Name, description, and length are required', status: 400 };
  }

  const lengthError = validateContestLength(body.length);
  if (lengthError) return { error: lengthError, status: 400 };

  const starts_at = normaliseTimestamp(body.starts_at);
  const ends_at = normaliseTimestamp(body.ends_at);
  if (starts_at === undefined || ends_at === undefined) {
    return { error: 'Start and end date/time must be valid timestamps', status: 400 };
  }

  const windowError = validateContestWindow({ starts_at, ends_at });
  if (windowError) return { error: windowError, status: 400 };

  return {
    values: {
      name,
      description,
      length: body.length as number,
      starts_at,
      ends_at,
      is_rated: !!body.is_rated,
    },
  };
}

/**
 * Builds the `contests` UPDATE payload for a PATCH, validating every field the
 * body actually carries. Fields the body omits are left untouched — except the
 * window, which is cross-field: when either half is present the *effective*
 * pair (body over `existing`) is validated, because `contests_window_paired`
 * constrains the resulting row rather than the submitted one.
 */
export function buildContestUpdates(
  body: Record<string, unknown>,
  existing: ContestWindow,
): { updates: Record<string, unknown> } | ContestValidationError {
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = normaliseText(body.name);
    if (!name) return { error: 'Name cannot be empty', status: 400 };
    updates.name = name;
  }

  if (body.description !== undefined) {
    const description = normaliseText(body.description);
    if (!description) return { error: 'Description cannot be empty', status: 400 };
    updates.description = description;
  }

  if (body.length !== undefined) {
    const lengthError = validateContestLength(body.length);
    if (lengthError) return { error: lengthError, status: 400 };
    updates.length = body.length;
  }

  if (body.starts_at !== undefined || body.ends_at !== undefined) {
    const starts_at =
      body.starts_at !== undefined ? normaliseTimestamp(body.starts_at) : existing.starts_at;
    const ends_at =
      body.ends_at !== undefined ? normaliseTimestamp(body.ends_at) : existing.ends_at;
    if (starts_at === undefined || ends_at === undefined) {
      return { error: 'Start and end date/time must be valid timestamps', status: 400 };
    }

    const windowError = validateContestWindow({ starts_at, ends_at });
    if (windowError) return { error: windowError, status: 400 };

    if (body.starts_at !== undefined) updates.starts_at = starts_at;
    if (body.ends_at !== undefined) updates.ends_at = ends_at;
  }

  if (body.is_rated !== undefined) updates.is_rated = !!body.is_rated;

  return { updates };
}

/**
 * Which of `ids` was this admin not the author of?
 *
 * The `contest_problems` write policies key on the **problem's** `created_by`,
 * not the contest's, so anything else is filtered to zero rows on DELETE and
 * rejected outright on INSERT. Checking up front turns a silent partial
 * mutation reported as success into an honest 403. Admin-side only — the
 * manager policies cover every problem.
 */
export async function findUnownedProblems(
  supabase: SupabaseClient,
  ids: string[],
  userId: string,
): Promise<{ unowned: string[] } | { error: string }> {
  if (ids.length === 0) return { unowned: [] };

  const { data, error } = await supabase
    .from('problems')
    .select('id, created_by')
    .in('id', ids);

  if (error) {
    console.error('Problem ownership lookup error:', error);
    return { error: 'Failed to verify problem ownership' };
  }

  const owned = new Set(
    (data || [])
      .filter((p: { created_by: string | null }) => p.created_by === userId)
      .map((p: { id: string }) => p.id),
  );
  return { unowned: ids.filter(pid => !owned.has(pid)) };
}

/**
 * Invariant 3, evaluated **before** any write.
 *
 * - Rule 1: a problem sitting in a *rated* contest that is ongoing or upcoming
 *   cannot be added anywhere else.
 * - Rule 2: a *rated* target contest accepts only problems that are not already
 *   in another contest.
 *
 * Membership of `contestId` itself never disqualifies a problem, which is what
 * makes this reusable for the `is_rated` false → true transition: pass the
 * union of the contest's current problems and the newly selected ones.
 *
 * Returns `null` when every id is eligible.
 */
export async function checkContestProblemEligibility(
  supabase: SupabaseClient,
  { contestId, problemIds, isRated }: { contestId: string | null; problemIds: string[]; isRated: boolean },
): Promise<ContestValidationError | null> {
  if (problemIds.length === 0) return null;

  const { data: cpRows, error: cpError } = await supabase
    .from('contest_problems')
    .select('problem_id, contest_id')
    .in('problem_id', problemIds);

  if (cpError) {
    console.error('Contest eligibility lookup error:', cpError);
    return { error: 'Failed to validate contest problems', status: 500 };
  }

  const otherContestRows = (cpRows || []).filter(r => r.contest_id !== contestId);
  if (otherContestRows.length === 0) return null;

  const contestIdsInUse = [...new Set(otherContestRows.map(r => r.contest_id))];
  const { data: contestsInUse, error: contestsError } = await supabase
    .from('contests')
    .select('id, is_active, is_rated, starts_at, ends_at')
    .in('id', contestIdsInUse);

  if (contestsError) {
    console.error('Contest eligibility contests lookup error:', contestsError);
    return { error: 'Failed to validate contest problems', status: 500 };
  }

  const ratedNonVirtualIds = new Set(
    (contestsInUse || [])
      .filter(c => {
        if (!c.is_rated) return false;
        const status = getContestStatus(c as { is_active: boolean; starts_at: string | null; ends_at: string | null });
        return status === 'ongoing' || status === 'upcoming';
      })
      .map(c => c.id),
  );

  if (otherContestRows.some(r => ratedNonVirtualIds.has(r.contest_id))) {
    return {
      error: 'Some problems are in a rated ongoing/upcoming contest and cannot be added',
      status: 400,
    };
  }

  if (isRated) {
    return {
      error: 'Rated contests can only include standalone problems not already in another contest',
      status: 400,
    };
  }

  return null;
}

/** The membership delta a PATCH implies, measured against the contest's current rows. */
export interface ContestProblemChanges {
  toAdd: string[];
  toRemove: string[];
}

/**
 * A rejection from the contest-problem pipeline. `problem_ids` is present only on
 * the ownership 403, which names the problems the caller does not own.
 */
export interface ContestProblemError extends ContestValidationError {
  problem_ids?: string[];
}

/**
 * Everything a `contests/[id]` PATCH must settle **before its first write**:
 * read the current membership, diff the submitted list against it, and validate
 * the result.
 *
 * `ownerId` is the one admin/manager delta. Pass the admin's id to run the
 * ownership gate — the `contest_problems` write policies key on the *problem's*
 * `created_by`, so an unowned id is rejected on INSERT and silently filtered to
 * zero rows on DELETE. Omit it for managers, whose policies cover every problem.
 *
 * `wasRated` is the contest's stored flag and `isRated` the flag it will have
 * after this PATCH: flipping false → true must re-validate the problems already
 * attached, not just the new ones, or Invariant 3 is bypassable by ticking
 * "Rated" without touching the problem list.
 */
export async function planContestProblemChanges(
  supabase: SupabaseClient,
  {
    contestId,
    problemIds,
    isRated,
    wasRated,
    ownerId,
  }: {
    contestId: string;
    problemIds: string[];
    isRated: boolean;
    wasRated: boolean;
    ownerId?: string;
  },
): Promise<{ changes: ContestProblemChanges } | ContestProblemError> {
  const { data: current, error: currentError } = await supabase
    .from('contest_problems')
    .select('problem_id')
    .eq('contest_id', contestId);
  if (currentError) {
    console.error('Fetch contest problems error:', currentError);
    return { error: 'Failed to load contest problems', status: 500 };
  }

  const currentIds = (current || []).map((r: { problem_id: string }) => r.problem_id);
  const currentSet = new Set(currentIds);

  const toRemove = currentIds.filter((pid: string) => !problemIds.includes(pid));
  const toAdd = problemIds.filter(pid => !currentSet.has(pid));

  if (ownerId !== undefined) {
    const ownership = await findUnownedProblems(supabase, [...new Set([...toAdd, ...toRemove])], ownerId);
    if ('error' in ownership) return { error: ownership.error, status: 500 };
    if (ownership.unowned.length > 0) {
      return {
        error: 'You can only add or remove problems you created',
        problem_ids: ownership.unowned,
        status: 403,
      };
    }
  }

  const becameRated = isRated && !wasRated;
  const idsToValidate = becameRated ? [...new Set([...currentIds, ...toAdd])] : toAdd;

  const eligibility = await checkContestProblemEligibility(supabase, {
    contestId,
    problemIds: idsToValidate,
    isRated,
  });
  if (eligibility) return eligibility;

  return { changes: { toAdd, toRemove } };
}

/**
 * Applies a planned membership diff. Returns `null` when both writes landed in
 * full, or the rejection to return.
 *
 * Both writes are row-counted, because neither reports a partial application on
 * its own. RLS **filters** a DELETE rather than raising, so a removal the admin
 * policy rejects comes back `{ data: [], error: null }` — checking only `.error`
 * reports success for a removal that did not happen. (An INSERT the policy
 * rejects does raise `42501`, but the count is cheap and the two paths should
 * fail the same way.) `contest_problems` is world-readable, so the `.select()`
 * returns exactly the rows written — never a short count from a read filter.
 *
 * Authorisation has already succeeded upstream by the time this runs, so a short
 * write is a failed dependent write — **500**, not the 404 used where the write
 * *is* the authorisation check.
 */
export async function applyContestProblemChanges(
  supabase: SupabaseClient,
  contestId: string,
  { toAdd, toRemove }: ContestProblemChanges,
): Promise<ContestValidationError | null> {
  if (toRemove.length > 0) {
    const { data: removed, error: removeError } = await supabase
      .from('contest_problems')
      .delete()
      .eq('contest_id', contestId)
      .in('problem_id', toRemove)
      .select('problem_id');
    if (removeError) {
      console.error('Remove contest problems error:', removeError);
      return { error: 'Failed to update contest problems', status: 500 };
    }
    if ((removed || []).length !== toRemove.length) {
      console.error(
        `Remove contest problems removed ${(removed || []).length} of ${toRemove.length} rows from contest ${contestId}`,
      );
      return { error: 'Failed to update contest problems', status: 500 };
    }
  }

  if (toAdd.length > 0) {
    const rows = toAdd.map(problem_id => ({ contest_id: contestId, problem_id }));
    const { data: inserted, error: addError } = await supabase
      .from('contest_problems')
      .insert(rows)
      .select('problem_id');
    if (addError) {
      console.error('Problem assignment error:', addError);
      return { error: 'Failed to update contest problems', status: 500 };
    }
    if ((inserted || []).length !== rows.length) {
      console.error(
        `Problem assignment inserted ${(inserted || []).length} of ${rows.length} rows into contest ${contestId}`,
      );
      return { error: 'Failed to update contest problems', status: 500 };
    }
  }

  return null;
}
