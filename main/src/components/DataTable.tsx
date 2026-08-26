'use client';

import type { ReactNode } from 'react';
import { getTableTheme, type HeaderVariant } from './tableThemes';

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  className?: string;
  render?: (row: Row) => ReactNode;
  /**
   * @deprecated No longer renders a control, and no longer sorts.
   *
   * Every table in this app is server-paginated (`page.tsx` fetches one
   * `.range()` of rows), so a client-side sort could only ever reorder the ~20
   * rows of the *current page* while presenting itself as a global ordering:
   * "Points ↓" on `/problems` surfaced the hardest problem on page 1, not the
   * hardest problem. Paginating then silently re-applied it to the next page.
   *
   * Sorting belongs in the URL — `?sort=…&dir=…` read by `page.tsx` and applied
   * with `.order()` alongside `.range()`, exactly as `app/users/page.tsx`
   * already does. Until that lands across the paginated routes, no control is
   * shown at all, because no control is strictly better than one that lies.
   *
   * The field is kept (as a no-op) so the existing call sites keep compiling;
   * delete it from the columns when the URL-param sort lands.
   */
  sortable?: boolean;
  /** @deprecated Unused — see `sortable`. */
  sortAccessor?: (row: Row) => string | number | boolean | null | undefined;
};

export type DataTableProps<Row extends object> = {
  columns: Array<DataTableColumn<Row>>;
  rows: Row[];
  rowKey?: (row: Row, index: number) => string;
  emptyState?: ReactNode;
  headerVariant?: HeaderVariant;
  className?: string;
  stickyHeader?: boolean;
  /**
   * When true, the <tbody> renders shimmer skeleton rows instead of `rows`.
   * Use this for server-paginated tables while a new page is loading from the server.
   * The paginator (rendered by the parent via <Pagination>) should also get loading=true.
   */
  loading?: boolean;
  /**
   * How many skeleton rows to show when loading=true. Defaults to 8.
   */
  skeletonRowCount?: number;
  /** Accessible name for the table. Strongly recommended when a page has more than one. */
  ariaLabel?: string;
};

export function DataTable<Row extends object>(props: DataTableProps<Row>) {
  const {
    columns, rows, rowKey, emptyState,
    headerVariant = 'gray', className = '', stickyHeader = true,
    loading = false,
    skeletonRowCount,
    ariaLabel,
  } = props;

  const theme = getTableTheme(headerVariant);
  const skelCount = skeletonRowCount ?? 8;

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        {/* whitespace-nowrap (inherited by every th/td) makes cell text expand
            the column instead of wrapping; the overflow-x-auto wrapper scrolls
            when content is wider than the container. Columns that should wrap
            (e.g. descriptions) re-assert whitespace-normal on their own cell. */}
        <table
          aria-label={ariaLabel}
          aria-busy={loading || undefined}
          className="min-w-full text-left border-collapse whitespace-nowrap"
        >
          <thead className={`${stickyHeader ? 'sticky top-0 z-10' : ''} ${theme.headerRow}`}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-2.5 ${theme.headerCell} ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: skelCount }).map((_, rowIdx) => (
                <tr key={`skel-${rowIdx}`} aria-hidden="true" className="group">
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 align-middle text-sm ${col.className || ''}`}
                    >
                      <div
                        className="h-4 rounded loading-shimmer"
                        style={{ width: colIdx === 0 ? '60%' : '40%' }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-text-muted text-sm">
                  {emptyState || <p>No data found.</p>}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const key = rowKey
                  ? rowKey(row, index)
                  : (() => {
                    const rec = row as unknown as Record<string, unknown>;
                    const val = rec.id;
                    return val != null ? String(val) : String(index);
                  })();
                return (
                  <tr key={key} className={`${theme.rowHover} group`}>
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 align-middle text-sm text-foreground ${col.className || ''}`}>
                        {col.render ? col.render(row) : ((row as unknown as Record<string, unknown>)[col.key] as ReactNode)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
