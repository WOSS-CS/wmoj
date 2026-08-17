'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';

interface PaginationProps {
  /** The authoritative server-rendered current page (1-indexed). */
  currentPage: number;
  totalPages: number;
  /**
   * Builds the href for a page. Always required — used for the <Link href>,
   * which provides no-JS navigation and correct hover/copy-link/middle-click behavior.
   */
  buildHref: (page: number) => string;
  /**
   * Optional click handler. When provided, clicking a page link calls this
   * instead of performing default <Link> navigation (we preventDefault).
   * The parent uses this to drive optimistic page update + router.push
   * via the usePaginatedNavigation hook.
   *
   * If omitted, the paginator behaves exactly as it did before (pure <Link>).
   */
  onPageChange?: (page: number) => void;
  /**
   * The page to visually highlight. Defaults to `currentPage`.
   * When using usePaginatedNavigation, pass `displayPage` here so the
   * highlight jumps immediately on click, before the server responds.
   */
  displayPage?: number;
  /**
   * When true, the paginator dims slightly and shows a small spinner on the
   * right. Paginator stays clickable (user can click again to redirect navigation).
   */
  loading?: boolean;
}

function getPageWindow(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const show = new Set<number>([
    1, 2,
    Math.max(1, current - 1), current, Math.min(total, current + 1),
    total - 1, total,
  ]);

  const sorted = [...show].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);

  const result: (number | '...')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('...');
    }
    result.push(sorted[i]);
  }
  return result;
}

export default function Pagination({
  currentPage,
  totalPages,
  buildHref,
  onPageChange,
  displayPage,
  loading = false,
}: PaginationProps) {
  const effectivePage = displayPage ?? currentPage;

  if (totalPages <= 1) return null;

  const pages = getPageWindow(effectivePage, totalPages);

  const base =
    'h-8 min-w-[32px] px-2 flex items-center justify-center text-sm font-medium ' +
    'bg-surface-2 text-text-muted border-r border-border last:border-r-0 transition-colors';

  const handleClick = (e: MouseEvent<HTMLAnchorElement>, page: number) => {
    if (!onPageChange) return; // let the <Link> navigate naturally
    // Don't intercept modified clicks — let the browser open in new tab/window.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onPageChange(page);
  };

  const renderPrev = () => {
    const prev = effectivePage - 1;
    if (effectivePage <= 1) {
      return <span className={`${base} opacity-40 cursor-not-allowed select-none`}>«</span>;
    }
    return (
      <Link
        href={buildHref(prev)}
        onClick={(e) => handleClick(e, prev)}
        className={`${base} hover:bg-surface-3`}
      >
        «
      </Link>
    );
  };

  const renderNext = () => {
    const next = effectivePage + 1;
    if (effectivePage >= totalPages) {
      return <span className={`${base} opacity-40 cursor-not-allowed select-none`}>»</span>;
    }
    return (
      <Link
        href={buildHref(next)}
        onClick={(e) => handleClick(e, next)}
        className={`${base} hover:bg-surface-3`}
      >
        »
      </Link>
    );
  };

  return (
    <div
      className={`inline-flex items-center rounded-md overflow-hidden border border-border ${
        loading ? 'opacity-60' : ''
      }`}
    >
      {renderPrev()}
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className={`${base} cursor-default select-none`}>
            …
          </span>
        ) : p === effectivePage ? (
          <span key={p} className={`${base} bg-brand-primary text-white pointer-events-none select-none`}>
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            onClick={(e) => handleClick(e, p)}
            className={`${base} hover:bg-surface-3`}
          >
            {p}
          </Link>
        )
      )}
      {renderNext()}
      {loading && (
        <span className="flex items-center pl-2 ml-1 border-l border-border">
          <svg
            className="animate-spin text-brand-primary"
            width={14}
            height={14}
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
            <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      )}
    </div>
  );
}