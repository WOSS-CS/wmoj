/**
 * The verdict kit: one palette, one badge, one aggregation rule.
 *
 * `VERDICT_STYLES`, `VerdictBadge` and `aggregateVerdict` were declared three
 * times each — in `ProblemSubmissionsClient`, `ManagerProblemSubmissionsClient`
 * and `SubmitClient` — and the palettes had already diverged. See the palette
 * note below for which one survived and why.
 *
 * NOT marked `'use client'`, deliberately. Nothing here uses a hook, an event
 * handler or a browser API, so it does not need its own client boundary: the
 * three client components that import it pull it into their bundle anyway.
 * Leaving the directive off also keeps `aggregateVerdict`, a pure function,
 * callable from server code.
 */

import type { TestResult, Verdict } from '@/types/judge';

/**
 * Per-verdict badge styling, built from the app's design tokens.
 *
 * ── Why these and not the other two copies ──────────────────────────────────
 * This app is light-only (`<html className="light">`, `ThemeContext` frozen to
 * `{theme:'light'}`), and the badges render as `bg-x/10 text-x` over a white or
 * near-white surface. The two staff copies used raw Tailwind ramp colours
 * calibrated for a DARK surface, and failed WCAG AA badly on this one — text
 * contrast measured against the /10 tint composited over `--surface-1`
 * (#ffffff):
 *
 *     MLE  `bg-purple-500/10 text-purple-400`  →  2.34:1   (needs 4.5:1)
 *     RE   `bg-red-900/20 text-red-400`        →  1.91:1   (needs 4.5:1)
 *
 * The tokens below clear AA on all three light surfaces the badge sits on
 * (#ffffff, #fafafa, #f4f4f5); the worst case in the whole map is WA/RE at
 * 4.99:1 on `--surface-2`. These badges are `text-xs`, so the large-text 3:1
 * exemption does not apply to any of them.
 *
 * WA and RE deliberately share `--color-error`: the verdict string, not the
 * hue, is what distinguishes them, and there is no second AA-safe red token.
 * MLE uses `--color-accent` (#7e22ce), the token that exists precisely so a
 * purple does not have to be hand-rolled off the Tailwind ramp.
 */
export const VERDICT_STYLES: Record<Verdict, string> = {
  AC: 'bg-success/10 text-success border border-success/20',
  WA: 'bg-error/10 text-error border border-error/20',
  TLE: 'bg-warning/10 text-warning border border-warning/20',
  MLE: 'bg-accent/10 text-accent border border-accent/20',
  RE: 'bg-error/10 text-error border border-error/20',
  CE: 'bg-surface-2 text-text-muted border border-border',
  IE: 'bg-surface-3 text-foreground border border-border',
};

/** The one verdict pill. `className` last, per the repo's component convention. */
export function VerdictBadge({
  verdict,
  className = '',
}: {
  verdict: Verdict;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold ${VERDICT_STYLES[verdict] ?? VERDICT_STYLES.IE} ${className}`}
      title={verdict}
    >
      {verdict}
    </span>
  );
}

/**
 * The only fields the aggregation reads. Typed structurally rather than as
 * `TestResult` so the five-key `PublicTestResult` — which carries all three —
 * is accepted too.
 */
type VerdictSource = Pick<TestResult, 'verdict' | 'passed' | 'timedOut'>;

/**
 * The per-submission verdict: `CE` if it never compiled, else the worst per-case
 * verdict, else `AC`.
 *
 * 'IE' FIRST, ahead of the student's own failures. A per-case 'IE' means a custom checker could
 * not answer for that case — a problem-configuration fault, never the student's. It was missing
 * from this array entirely, so an all-'IE' submission fell through to the loop below and reported
 * 'WA': a correct solution told it was wrong, with the real fault invisible in all three views.
 *
 * Note this is deliberately NOT the judge's own deriveVerdict order (TLE > MLE > RE > IE > WA).
 * That order is precedence WITHIN one case, where 'IE' is only reachable once the program has
 * already run cleanly. This array is precedence ACROSS cases, a different question — and
 * custom-checkers/SKILL.md is explicit that a broken problem must stay visible, which ranking
 * 'IE' below 'RE' would defeat whenever any other case also failed.
 */
export function aggregateVerdict(
  results: readonly VerdictSource[] | null | undefined,
  /** A flag, not the message: the diagnostic text is private and never reaches a list row. */
  isCompileError?: boolean | string | null,
): Verdict {
  if (isCompileError) return 'CE';
  if (!results || results.length === 0) return 'IE';
  const rank: Verdict[] = ['IE', 'TLE', 'MLE', 'RE', 'WA'];
  for (const v of rank) {
    if (results.some((r) => r.verdict === v)) return v;
  }
  // Fall back to derived verdicts for rows without an explicit verdict field
  // (should not happen for new judge traffic, but keeps the UI robust — these
  // arrays arrive as untyped JSON and are cast, not validated).
  for (const r of results) {
    if (!r.passed) {
      if (r.verdict === 'IE') return 'IE';
      if (r.timedOut) return 'TLE';
      return 'WA';
    }
  }
  return 'AC';
}

/**
 * The verdict to show for ONE case: the judge's own, or derived from
 * pass/fail + `timedOut` for a legacy row that predates the field.
 *
 * Duplicated verbatim in `ProblemSubmissionsClient` and `SubmitClient` before.
 */
export function caseVerdict(r: VerdictSource): Verdict {
  if (r.verdict) return r.verdict;
  if (r.passed) return 'AC';
  return r.timedOut ? 'TLE' : 'WA';
}
