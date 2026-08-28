import { validateSlug } from '@/utils/validation';

/**
 * Shared request validation for the four problem write handlers
 * (`api/{admin,manager}/problems/create` and `api/{admin,manager}/problems/[id]`).
 *
 * The admin and manager copies of this logic were byte-identical apart from which
 * auth helper the route called, so it lives here once. The *deliberate* deltas
 * between the two trees stay in the routes where they are visible:
 *
 *   - admin creations land pending (`is_active: false`) — the route sets it;
 *   - only managers may flip `is_active` on an edit — `allowIsActive` below;
 *   - `created_by` ownership scoping is admin-only — the route's `.eq()`.
 *
 * Every message here is the message the routes already returned. This is an
 * extraction, not a redesign of the error surface.
 */

/** A rejection carrying the status the handler should return. */
export interface ProblemValidationError {
  error: string;
  status: number;
}

/**
 * The `problems` columns a create request supplies. `is_active` and `created_by`
 * are the caller's to add — they are exactly where the two trees differ.
 */
export interface ProblemMetadata {
  id: string;
  name: unknown;
  content: unknown;
  time_limit: number;
  memory_limit: number;
  points: number;
}

/** The `problem_tests` columns a create request supplies, already normalised. */
export interface ProblemTestData {
  input: unknown[];
  output: unknown[];
  checker: string | null;
  generator_file: string | null;
}

/** A validated create request, split by the table each half is written to. */
export interface ProblemCreateFields {
  problem: ProblemMetadata;
  tests: ProblemTestData;
}

/**
 * The create body as it arrives. `id` is declared `string` because that is what
 * `validateSlug` has always been handed; everything else stays `unknown` so the
 * checks below are the only thing that narrows it.
 */
export interface ProblemCreateBody {
  id: string;
  name?: unknown;
  content?: unknown;
  input?: unknown;
  output?: unknown;
  timeLimit?: unknown;
  memoryLimit?: unknown;
  points?: unknown;
  generator_file?: unknown;
  checker?: unknown;
}

/** `generator_file` / `checker`: absent, null, or a string. Anything else is a 400. */
function readOptionalSource(
  value: unknown,
  field: string
): ProblemValidationError | { value: string | null } {
  if (value === undefined || value === null) return { value: null };
  if (typeof value !== 'string') return { error: `${field} must be a string`, status: 400 };
  return { value };
}

/**
 * `timeLimit` / `memoryLimit`: absent falls back to the column default, and every
 * other non-positive-number value is a 400 — including `null` and `NaN`, which is
 * why the fallback cannot be spelled `value || fallback`.
 */
function readOptionalPositiveNumber(
  value: unknown,
  label: string,
  fallback: number
): ProblemValidationError | { value: number } {
  if (value === undefined) return { value: fallback };
  if (typeof value !== 'number' || isNaN(value) || value <= 0) {
    return { error: `${label} must be a positive number`, status: 400 };
  }
  return { value };
}

/**
 * Validates a problem-create body. The check order is load-bearing: it is the
 * order the routes used, and it decides which of the ten 400s a malformed request
 * gets back. Callers must authenticate *before* calling this — these messages
 * describe the whole request schema and are not for anonymous callers.
 */
export function validateProblemCreate(
  body: ProblemCreateBody
): ProblemValidationError | ProblemCreateFields {
  const { id, name, content, input, output, timeLimit, memoryLimit, points } = body;

  const slugError = validateSlug(id, 'Problem');
  if (slugError) return { error: slugError, status: 400 };

  const generatorFile = readOptionalSource(body.generator_file, 'generator_file');
  if ('error' in generatorFile) return generatorFile;

  const checker = readOptionalSource(body.checker, 'checker');
  if ('error' in checker) return checker;

  // A blank checker is stored as NULL so "no checker" has exactly one
  // representation — the submit route omits the field from the judge
  // payload on NULL/empty, falling back to exact output comparison.
  const checkerSource =
    checker.value !== null && checker.value.trim().length > 0 ? checker.value : null;

  if (!name || !content || !input || !output) {
    return { error: 'Name, content, input, and output are required', status: 400 };
  }

  // Validate that input and output are arrays
  if (!Array.isArray(input) || !Array.isArray(output)) {
    return { error: 'Input and output must be arrays', status: 400 };
  }

  // Validate that input and output arrays have the same length
  if (input.length !== output.length) {
    return { error: 'Input and output arrays must have the same length', status: 400 };
  }

  // Validate that input and output arrays are not empty
  if (input.length === 0) {
    return { error: 'At least one test case is required', status: 400 };
  }

  // Validate time limit and memory limit
  const timeLimitValue = readOptionalPositiveNumber(timeLimit, 'Time limit', 5000);
  if ('error' in timeLimitValue) return timeLimitValue;

  const memoryLimitValue = readOptionalPositiveNumber(memoryLimit, 'Memory limit', 256);
  if ('error' in memoryLimitValue) return memoryLimitValue;

  if (typeof points !== 'number' || !Number.isInteger(points) || points < 1) {
    return { error: 'Points must be a positive integer', status: 400 };
  }

  return {
    problem: {
      id,
      name,
      content,
      time_limit: timeLimitValue.value,
      memory_limit: memoryLimitValue.value,
      points,
    },
    tests: {
      input,
      output,
      checker: checkerSource,
      generator_file: generatorFile.value,
    },
  };
}

/** The PATCH body as it arrives. Every field is optional; a PATCH names only what changes. */
export interface ProblemPatchBody {
  name?: unknown;
  content?: unknown;
  points?: unknown;
  is_active?: unknown;
  time_limit?: unknown;
  memory_limit?: unknown;
  input?: unknown;
  output?: unknown;
  generator_file?: unknown;
  checker?: unknown;
}

/**
 * A validated edit, split by table. `updates` goes to `problems`, `testUpdates`
 * to `problem_tests`; the two are written by different statements and must never
 * be merged.
 */
export interface ProblemUpdateFields {
  updates: Record<string, unknown>;
  testUpdates: Record<string, unknown>;
  touchesTestData: boolean;
}

/**
 * Builds the two update objects for a problem edit.
 *
 * `allowIsActive` is the manager/admin delta: only managers flip `is_active`, so
 * the admin route ignores the field entirely rather than validating it away.
 */
export function buildProblemUpdate(
  body: ProblemPatchBody,
  { allowIsActive }: { allowIsActive: boolean }
): ProblemValidationError | ProblemUpdateFields {
  const { name, content, points, time_limit, memory_limit, input, output, generator_file, checker } =
    body;
  const updates: Record<string, unknown> = {};
  // Graded data lives in `problem_tests`, metadata in `problems`. These two
  // objects are written to different tables and must never be merged.
  const testUpdates: Record<string, unknown> = {};

  if (name !== undefined) updates.name = name;
  if (content !== undefined) updates.content = content;
  if (points !== undefined) {
    if (typeof points !== 'number' || !Number.isInteger(points) || points < 1) {
      return { error: 'Points must be a positive integer', status: 400 };
    }
    updates.points = points;
  }
  if (allowIsActive && body.is_active !== undefined) updates.is_active = !!body.is_active;
  if (time_limit !== undefined) {
    if (typeof time_limit !== 'number' || isNaN(time_limit) || time_limit <= 0) {
      return { error: 'Time limit must be a positive number', status: 400 };
    }
    updates.time_limit = time_limit;
  }
  if (memory_limit !== undefined) {
    if (typeof memory_limit !== 'number' || isNaN(memory_limit) || memory_limit <= 0) {
      return { error: 'Memory limit must be a positive number', status: 400 };
    }
    updates.memory_limit = memory_limit;
  }
  if (input !== undefined && output !== undefined) {
    if (!Array.isArray(input) || !Array.isArray(output)) {
      return { error: 'Input and output must be arrays', status: 400 };
    }
    if (input.length === 0 || output.length === 0) {
      return { error: 'Input and output arrays must not be empty', status: 400 };
    }
    if (input.length !== output.length) {
      return { error: 'Input and output arrays must have equal length', status: 400 };
    }
    testUpdates.input = input;
    testUpdates.output = output;
  }
  if (generator_file !== undefined) {
    if (input === undefined || output === undefined) {
      return {
        error: 'generator_file can only be updated together with input/output',
        status: 400,
      };
    }
    if (generator_file !== null && typeof generator_file !== 'string') {
      return { error: 'generator_file must be a string', status: 400 };
    }
    testUpdates.generator_file = generator_file;
  }
  // Unlike generator_file, the checker is independent of the stored test data,
  // so it can be updated on its own. Blank clears it back to NULL, which
  // restores exact output comparison.
  if (checker !== undefined) {
    if (checker !== null && typeof checker !== 'string') {
      return { error: 'checker must be a string', status: 400 };
    }
    testUpdates.checker = typeof checker === 'string' && checker.trim().length > 0 ? checker : null;
  }

  const touchesTestData = Object.keys(testUpdates).length > 0;
  if (Object.keys(updates).length === 0 && !touchesTestData) {
    return { error: 'No valid fields to update', status: 400 };
  }
  // A test-data-only edit — a checker change, say — still has to run the UPDATE
  // on `problems`: that statement carries the scoping that turns a target this
  // caller may not touch into a 404, and it is what stamps `updated_at`. Give it
  // a column to write when nothing else in the request changed.
  if (Object.keys(updates).length === 0) {
    updates.updated_at = new Date().toISOString();
  }

  return { updates, testUpdates, touchesTestData };
}
