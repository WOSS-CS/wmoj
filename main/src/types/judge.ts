/**
 * The judge's per-case result shape, and the redacted subset that is safe to
 * publish.
 *
 * This file is the SINGLE definition. `TestResult` was previously declared
 * seven times and `Verdict` three times across the client components, with the
 * declarations already drifting (`exitCode` was `number` in two of them and
 * `number | null` in five — nullable is correct, it is what the judge emits for
 * a process killed by a signal).
 *
 * ── The direction that matters ──────────────────────────────────────────────
 * The CANONICAL type is the FULL judge shape, mirroring
 * `wmoj-judge/src/types.ts`. Every UI consumer renders the full shape: the
 * owner's own submit page, and the five staff surfaces that view a submission.
 *
 * {@link PublicTestResult} — the five-key redacted shape — is the NARROW
 * VARIANT. It is used in exactly two places: the write path that populates
 * `public.submissions.results`, and anything reading that public column. It is
 * not the base type and nothing should widen towards it.
 */

/** Ranked worst-first by `aggregateVerdict`. `IE` is a broken problem, not a wrong answer. */
export type Verdict = 'AC' | 'WA' | 'TLE' | 'MLE' | 'RE' | 'CE' | 'IE';

/**
 * One test case, as the judge reports it and as `submission_private.results_full`
 * stores it.
 *
 * `timeMs`/`cpuMs`/`memKb`/`truncated`/`checkerMessage` are optional because
 * rows written before those fields existed genuinely lack them — all 82
 * historical submissions carry exactly the nine required keys below. They are
 * required in the judge's own type because the judge always emits them now.
 */
export interface TestResult {
  index: number;
  passed: boolean;
  verdict: Verdict;
  timedOut: boolean;
  /** `null` when the process was killed by a signal rather than exiting. */
  exitCode: number | null;
  /** PRIVATE — this is a slice of the answer key. Never send it to a public surface. */
  expected: string;
  /** PRIVATE — the submitter's program output. */
  received: string;
  /** PRIVATE. */
  stdout: string;
  /** PRIVATE. */
  stderr: string;
  timeMs?: number;
  cpuMs?: number;
  memKb?: number;
  /** The retained streams above are a prefix; the program outran the sandbox cap. */
  truncated?: boolean;
  /**
   * PRIVATE, and the reason the redaction below is an allowlist. This is a
   * custom checker's own stderr, which routinely quotes the expected output
   * verbatim ("expected '42', found '17'").
   */
  checkerMessage?: string;
}

/**
 * The only per-case fields that may appear on the world-readable
 * `public.submissions.results` column.
 *
 * Everything else the judge emits is private: `expected` IS the answer key,
 * `received`/`stdout`/`stderr` are the submitter's own output, and
 * `checkerMessage` quotes the expected answer. The full array lives in
 * `public.submission_private.results_full`, readable only by the submitter and
 * active staff.
 *
 * A type ALIAS, not an `interface`, and that is load-bearing: only an alias of
 * an object literal gets TypeScript's implicit index signature, which is what
 * lets a redacted array be assigned to the `jsonb` `submissions.results` column
 * (typed `Json`) without a cast. An interface here would force one back.
 */
export type PublicTestResult = {
  index: number;
  passed: boolean;
  verdict: Verdict;
  timedOut: boolean;
  exitCode: number | null;
};

/** The `summary` JSON stored on `public.submissions`. There is no `verdict` column. */
export interface SubmissionSummary {
  total?: number;
  passed?: number;
  failed?: number;
  /** Present only on a compile error; the message itself is private. */
  verdict?: Verdict;
}
