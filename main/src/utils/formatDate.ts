/**
 * The one way a submission's timestamp is written for a person — the "Date"
 * columns of the staff submission lists, the tooltips on the dashboards, and
 * the subtitle of `SubmissionDetailModal` on all six surfaces that open it.
 *
 * Six local copies under three names (`formatDate`, `formatModalDate`,
 * `formatSubmittedAt`) had drifted: the two problem-submissions pages used
 * bare `toLocaleString()` ("8/28/2026, 12:59:26 PM") while the other four
 * wrote "Aug 28, 2026, 12:59 PM", so the same modal showed the same moment
 * two ways depending on which page opened it.
 *
 * Renders in the viewer's own time zone, which is what a browser should do;
 * `'—'` for a missing value so a column never shows "Invalid Date".
 */
export function formatSubmittedAt(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
