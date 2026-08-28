'use client';

import { SubmissionCodeBlock } from '@/components/SubmissionCodeBlock';
import { VerdictBadge, aggregateVerdict, caseVerdict } from '@/components/VerdictBadge';
import { Modal } from '@/components/ui/Modal';
import { displayLanguage } from '@/lib/languages';
import type { TestResult } from '@/types/judge';
import type { SubmissionDetail } from '@/types/submission';

/**
 * The one submission-detail view, for staff and students alike.
 *
 * There were six hand-rolled copies in three flavours and they did not agree:
 *
 *  - Three ("status-style": both dashboards and the user-detail page) printed
 *    `compileError ? "Compile Error" : isAccepted ? "Accepted" : "Failed"`, so
 *    TLE, MLE, RE and IE all read **"Failed"**; rendered a colourless per-case
 *    pill that bypassed `VERDICT_STYLES`; and CSS-uppercased the raw language
 *    code, showing **`CPP17`**.
 *  - Two ("verdict-style": the problem-submissions pages) used
 *    `aggregateVerdict` correctly but rendered an unguarded "Test Case Results"
 *    heading over an empty list for every compile error.
 *  - NONE of the five staff copies rendered the compile-error MESSAGE. The API
 *    had always sent it; they all treated `compileError` as a boolean. Only the
 *    owner's own `/submissions` view showed the text.
 *
 * This is their union with every divergence resolved to the correct behaviour,
 * so a submission reads the same on all six surfaces. Being on `ui/Modal.tsx`
 * also gives all six `role="dialog"`, a focus trap and Escape, which none of
 * them had.
 *
 * `IE` surfacing on staff screens is the point, not a regression: a per-case
 * `IE` means a custom checker could not answer, which is a broken problem
 * rather than a wrong answer.
 */
interface Props {
  /** The fetched detail, or null while the request is in flight. */
  submission: SubmissionDetail | null;
  /** True while the GET is in flight. Open = `loading || submission !== null`. */
  loading: boolean;
  /**
   * Built from the LIST ROW by the caller, so it can render before the detail
   * arrives — that is the whole reason it is a prop rather than derived here.
   */
  subtitle: string;
  onClose: () => void;
}

export function SubmissionDetailModal({ submission, loading, subtitle, onClose }: Props) {
  return (
    <Modal
      open={loading || submission !== null}
      onClose={onClose}
      title="Submission Details"
      description={subtitle}
      className="max-w-4xl"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-md bg-surface-2 hover:bg-surface-3 text-sm font-medium text-foreground"
        >
          Close
        </button>
      }
    >
      {submission ? (
        <SubmissionDetailBody submission={submission} />
      ) : (
        <div className="flex items-center justify-center py-12" role="status" aria-busy="true">
          <svg className="animate-spin text-brand-primary" width={28} height={28} viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
            <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="sr-only">Loading submission…</span>
        </div>
      )}
    </Modal>
  );
}

function SubmissionDetailBody({ submission }: { submission: SubmissionDetail }) {
  const { results, summary, compileError } = submission;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-2 p-3 rounded-md border border-border">
          <div className="text-text-muted text-xs uppercase tracking-wider">Verdict</div>
          <div className="mt-1">
            <VerdictBadge verdict={aggregateVerdict(results, compileError)} />
          </div>
        </div>
        <div className="bg-surface-2 p-3 rounded-md border border-border">
          <div className="text-text-muted text-xs uppercase tracking-wider">Score</div>
          <div className="text-sm font-semibold text-foreground mt-1 font-mono">
            {summary.passed}/{summary.total}
          </div>
        </div>
        <div className="bg-surface-2 p-3 rounded-md border border-border">
          <div className="text-text-muted text-xs uppercase tracking-wider">Language</div>
          <div className="text-sm font-semibold text-foreground mt-1">{displayLanguage(submission.language)}</div>
        </div>
      </div>

      {/* The only explanation a compile error has: there are no test-case
          results to fall back on, so without this the modal showed a bare 0/0
          and nothing else. */}
      {compileError && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-1.5">Compile Error</h3>
          <pre className="p-2 rounded bg-surface-1 text-error overflow-x-auto border border-border text-xs whitespace-pre-wrap">
            {compileError}
          </pre>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-foreground mb-1.5">Source Code</h3>
        <div className="rounded-md overflow-hidden border border-border text-sm">
          <SubmissionCodeBlock language={submission.language} code={submission.code} />
        </div>
      </div>

      {results.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-1.5">Test Case Results</h3>
          <div className="space-y-1.5">
            {results.map((r, i) => (
              <TestCaseRow key={i} result={r} caseNumber={i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TestCaseRow({ result: r, caseNumber }: { result: TestResult; caseNumber: number }) {
  return (
    <div className={`p-2.5 rounded-md border ${r.passed ? 'bg-success/5 border-success/20' : 'bg-error/5 border-error/20'}`}>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <VerdictBadge verdict={caseVerdict(r)} />
          <span className="text-sm font-medium text-foreground">Case #{caseNumber}</span>
        </div>
        <span className="text-xs text-text-muted font-mono flex items-center gap-2">
          {typeof r.timeMs === 'number' && <span>{r.timeMs}ms</span>}
          {typeof r.memKb === 'number' && <span>{Math.round(r.memKb / 1024)}MB</span>}
          <span>Exit: {r.exitCode ?? 'N/A'}</span>
        </span>
      </div>
      {r.checkerMessage && (
        <div className="mt-1 text-xs font-mono">
          <div className="text-text-muted mb-0.5">Checker:</div>
          <pre className="bg-surface-1 p-1.5 rounded overflow-x-auto text-foreground border border-border whitespace-pre-wrap">{r.checkerMessage}</pre>
        </div>
      )}
      {!r.passed && (r.expected || r.received) && (
        <div className="grid grid-cols-2 gap-2 mt-1 text-xs font-mono">
          <div>
            <div className="text-text-muted mb-0.5">Expected:</div>
            <pre className="bg-surface-1 p-1.5 rounded overflow-x-auto text-text-muted border border-border">{r.expected}</pre>
          </div>
          <div>
            <div className="text-text-muted mb-0.5">Received:</div>
            <pre className="bg-surface-1 p-1.5 rounded overflow-x-auto text-error border border-border">{r.received}</pre>
          </div>
          {r.stderr && (
            <div className="col-span-2">
              <div className="text-text-muted mb-0.5">Stderr:</div>
              <pre className="bg-surface-1 p-1.5 rounded overflow-x-auto text-warning border border-border">{r.stderr}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
