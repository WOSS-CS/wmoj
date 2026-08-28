'use client';

import { useRef, useState, type MouseEvent } from 'react';
import Pagination from '@/components/Pagination';
import { TableBodySkeleton } from '@/components/TableBodySkeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { usePaginatedNavigation } from '@/hooks/usePaginatedNavigation';
import { SubmissionDetailModal } from '@/components/SubmissionDetailModal';
import { useViewCode } from '@/hooks/useViewCode';
import { toast } from '@/components/ui/Toast';
import { displayLanguage } from '@/lib/languages';
import type { SubmissionRow, SubmissionStats } from './page';
import { formatSubmittedAt } from '@/utils/formatDate';

interface Props {
  initialSubmissions: SubmissionRow[];
  totalPages: number;
  currentPage: number;
  currentProblemSearch: string;
  currentUserSearch: string;
  /** Exact-id deep-link filters (from "My Submissions" links). */
  currentProblemId: string;
  currentUserId: string;
  currentStatusFilter: 'all' | 'passed' | 'failed';
  stats: SubmissionStats;
  /** The statistics counts could not be computed; the chart is hidden. */
  statsError?: boolean;
  /** A free-text filter matched too many rows to query safely. */
  filterTooBroad?: boolean;
  fetchError?: string;
}

const PAGE_SIZE = 20;

// ─── Relative time ────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Submission detail (own-code modal) ────────────────────────────────────────

/**
 * The modal subtitle's date. Built from the LIST ROW, so it renders while the
 * detail request is still in flight.
 */
// ─── Pie Chart ────────────────────────────────────────────────────────────────

const PIE_SLICES = [
  { key: 'passed' as const,        label: 'Passed',        color: '#16a34a' },
  { key: 'failed' as const,        label: 'Failed',        color: '#dc2626' },
  { key: 'timeout' as const,       label: 'Timeout',       color: '#ca8a04' },
  { key: 'compile_error' as const, label: 'Compile Error', color: '#7c3aed' },
];

function PieChart({ stats }: { stats: SubmissionStats }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  // The tooltip is absolutely positioned against this wrapper, so it has to be
  // measured against this wrapper too. Measuring the 160px <svg> instead left
  // the tooltip offset by half the difference between the two widths.
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const cx = 80;
  const cy = 80;
  const r = 68;
  const total = stats.total;

  let cumAngle = -Math.PI / 2;
  const slices = total === 0 ? [] : PIE_SLICES.filter((s) => stats[s.key] > 0).map((s) => {
    const fraction = stats[s.key] / total;
    const startAngle = cumAngle;
    const endAngle = cumAngle + fraction * 2 * Math.PI;
    cumAngle = endAngle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = fraction > 0.5 ? 1 : 0;

    const d =
      fraction >= 0.9999
        ? `M ${cx},${cy - r} A ${r},${r} 0 1,1 ${cx - 0.001},${cy - r} Z`
        : `M ${cx},${cy} L ${x1},${y1} A ${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`;

    return { ...s, d, count: stats[s.key] };
  });

  if (total === 0) {
    return <p className="text-sm text-text-muted text-center py-4">No submissions yet.</p>;
  }

  const trackTooltip = (e: MouseEvent<SVGPathElement>) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div ref={wrapperRef} className="relative flex flex-col items-center gap-3">
      <svg width={160} height={160} viewBox="0 0 160 160" className="overflow-visible">
        {slices.map((slice) => (
          <path
            key={slice.key}
            d={slice.d}
            fill={slice.color}
            stroke="white"
            strokeWidth={1.5}
            className="cursor-pointer transition-opacity"
            style={{ opacity: hovered && hovered !== slice.key ? 0.5 : 1 }}
            onMouseEnter={(e) => {
              setHovered(slice.key);
              trackTooltip(e);
            }}
            onMouseMove={trackTooltip}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>

      {hovered && (() => {
        const slice = slices.find((s) => s.key === hovered);
        if (!slice) return null;
        return (
          <div
            className="absolute pointer-events-none z-20 bg-foreground text-background text-xs font-medium px-2 py-1 rounded-md shadow-lg whitespace-nowrap"
            style={{ left: tooltipPos.x + 10, top: tooltipPos.y - 28, transform: 'translateX(-50%)' }}
          >
            {slice.label}: {slice.count}
          </div>
        );
      })()}

      <div className="w-full space-y-1">
        {slices.map((slice) => (
          <div key={slice.key} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="text-text-muted">{slice.label}</span>
            </div>
            <span className="font-mono text-foreground">{slice.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SubmissionsClient({
  initialSubmissions,
  totalPages,
  currentPage,
  currentProblemSearch,
  currentUserSearch,
  currentProblemId,
  currentUserId,
  currentStatusFilter,
  stats,
  statsError,
  filterTooBroad,
  fetchError,
}: Props) {
  const { user, session } = useAuth();
  const [selectedRow, setSelectedRow] = useState<SubmissionRow | null>(null);

  const { selected, loading: viewCodeLoading, open: openViewCode, close: closeViewCode } = useViewCode({
    buildUrl: (id) => `/api/user/submissions/${id}`,
    getToken: () => session?.access_token,
  });

  const handleCloseViewCode = () => { closeViewCode(); setSelectedRow(null); };

  // The id filters arrive from deep links and have no input of their own, so
  // they ride along on every page flip and filter change like the text ones.
  const idParams = {
    problem_id: currentProblemId || undefined,
    user_id: currentUserId || undefined,
  };

  const { displayPage, isLoading, handlePageChange, handleFilterChange, buildHref, startTransition } = usePaginatedNavigation({
    currentPage,
    totalPages,
    currentParams: {
      ...idParams,
      problem: currentProblemSearch || undefined,
      user: currentUserSearch || undefined,
      status: currentStatusFilter !== 'all' ? currentStatusFilter : undefined,
    },
  });

  const problemSearch = useDebouncedSearch({
    param: 'problem',
    initialValue: currentProblemSearch,
    preserveParams: { ...idParams, user: currentUserSearch || undefined, status: currentStatusFilter !== 'all' ? currentStatusFilter : undefined },
    startTransition,
  });

  const userSearch = useDebouncedSearch({
    param: 'user',
    initialValue: currentUserSearch,
    preserveParams: { ...idParams, problem: currentProblemSearch || undefined, status: currentStatusFilter !== 'all' ? currentStatusFilter : undefined },
    startTransition,
  });

  const handleStatusChange = (value: 'all' | 'passed' | 'failed') => handleFilterChange({ status: value !== 'all' ? value : undefined });

  // The "View Code" button only renders on the caller's own rows, so a missing
  // token here means the session lapsed between render and click — say so,
  // rather than letting it surface as a bare 401 from the route.
  const openSubmission = (sub: SubmissionRow) => {
    if (!session?.access_token) {
      toast.error('Error', 'You must be signed in to view your code.');
      return;
    }
    setSelectedRow(sub);
    openViewCode(sub.id);
  };

  const inputClass =
    'w-full h-9 px-3 rounded-md bg-surface-2 border border-border text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Submissions</h1>
      </div>

      {fetchError && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4">
          <p className="text-sm text-error">{fetchError}</p>
        </div>
      )}

      {filterTooBroad && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <p className="text-sm text-warning">
            That filter matches too many problems or users to search. Type a few more characters to narrow it down.
          </p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Main Table ───────────────────────────────────────────────── */}
        <div className="flex-[3] min-w-0">
          <div className="glass-panel overflow-hidden">
            {/* Pagination row */}
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                buildHref={buildHref}
                displayPage={displayPage}
                loading={isLoading}
                onPageChange={handlePageChange}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left border-collapse whitespace-nowrap">
                <thead className="sticky top-0 z-10 bg-surface-2">
                  <tr>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-text-muted w-20 text-center">
                      Result
                    </th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-text-muted">
                      Submission
                    </th>
                    <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-text-muted text-right whitespace-nowrap">
                      Language
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <TableBodySkeleton rows={PAGE_SIZE} columns={3} columnWidths={['12%', '55%', '25%']} />
                  ) : initialSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-text-muted text-sm">
                        No submissions match your filters.
                      </td>
                    </tr>
                  ) : (
                    initialSubmissions.map((sub) => {
                      const allPassed = sub.passed === sub.total && sub.total > 0;
                      const somePassed = sub.passed > 0 && !allPassed;

                      const scoreColorClass = allPassed
                        ? 'bg-success/10 text-success border border-success/20'
                        : somePassed
                        ? 'bg-warning/10 text-warning border border-warning/20'
                        : 'bg-error/10 text-error border border-error/20';

                      const isOwn = !!user && sub.user_id === user.id;
                      const isViewingCode = viewCodeLoading && selectedRow?.id === sub.id;

                      return (
                        <tr key={sub.id} className="hover:bg-surface-2 transition-colors">
                          <td className="px-3 py-3 align-middle">
                            <div className={`rounded-md px-2 py-1.5 text-center ${scoreColorClass}`}>
                              <div className="text-xs font-mono font-semibold leading-tight">
                                {sub.passed}/{sub.total}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <div className="text-sm font-medium text-foreground leading-tight">
                              {sub.problem_name}
                            </div>
                            <div className="text-xs text-text-muted mt-0.5">
                              <span>{sub.username}</span>
                              <span className="mx-1.5">·</span>
                              <span>{formatRelativeTime(sub.created_at)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle text-right whitespace-nowrap">
                            <div className="flex flex-col items-end gap-1.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface-2 text-text-muted border border-border whitespace-nowrap">
                                {displayLanguage(sub.language)}
                              </span>
                              {isOwn && (
                                <button
                                  type="button"
                                  onClick={() => openSubmission(sub)}
                                  disabled={isViewingCode}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 disabled:opacity-60 whitespace-nowrap"
                                >
                                  {isViewingCode ? (
                                    <>
                                      <svg className="animate-spin" width={12} height={12} viewBox="0 0 14 14" fill="none">
                                        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
                                        <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                      </svg>
                                      Loading…
                                    </>
                                  ) : (
                                    'View Code'
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Filter card */}
          <div className="glass-panel p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Filter Submissions</h3>

            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Problem</label>
              <input
                value={problemSearch.value}
                onChange={(e) => problemSearch.onChange(e.target.value)}
                placeholder="Search problems..."
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Username</label>
              <input
                value={userSearch.value}
                onChange={(e) => userSearch.onChange(e.target.value)}
                placeholder="Search users..."
                className={inputClass}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Status</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex rounded-md overflow-hidden border border-border text-xs font-medium">
                  {(['all', 'passed', 'failed'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={`flex-1 py-1.5 capitalize transition-colors ${
                        currentStatusFilter === s
                          ? 'bg-brand-primary text-white'
                          : 'bg-surface-2 text-text-muted hover:text-foreground hover:bg-surface-3'
                      }`}
                    >
                      {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Statistics card */}
          <div className="glass-panel p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Statistics</h3>
            {statsError ? (
              <p className="text-sm text-text-muted text-center py-4">Statistics are unavailable right now.</p>
            ) : (
              <>
                <PieChart stats={stats} />
                <p className="text-xs text-text-muted text-center font-mono">
                  Total: {stats.total}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* View Code — only opens for the current user's own submissions. */}
      <SubmissionDetailModal
        submission={selected}
        loading={viewCodeLoading}
        subtitle={selectedRow ? `${selectedRow.problem_name} • ${formatSubmittedAt(selectedRow.created_at)}` : 'Loading…'}
        onClose={handleCloseViewCode}
      />
    </div>
  );
}
