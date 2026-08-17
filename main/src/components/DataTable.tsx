'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getTableTheme, type HeaderVariant } from './tableThemes';

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  className?: string;
  render?: (row: Row) => ReactNode;
  sortable?: boolean;
  sortAccessor?: (row: Row) => string | number | boolean | null | undefined;
};

type SortValue = string | number | boolean | null | undefined;

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
};

type SortState<Row> = {
  key: string | null;
  direction: 'asc' | 'desc';
  column?: DataTableColumn<Row> | null;
};

export function DataTable<Row extends object>(props: DataTableProps<Row>) {
  const {
    columns, rows, rowKey, emptyState,
    headerVariant = 'gray', className = '', stickyHeader = true,
    loading = false,
    skeletonRowCount,
  } = props;

  const [sort, setSort] = useState<SortState<Row>>({ key: null, direction: 'asc', column: null });
  const theme = getTableTheme(headerVariant);

  const sortedRows = useMemo(() => {
    if (!sort.key || !sort.column) return rows;
    const accessor =
      sort.column.sortAccessor ||
      ((row: Row): SortValue => {
        const rec = row as unknown as Record<string, unknown>;
        const raw = rec[sort.key as string] as unknown;
        if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean' || raw == null) return raw as SortValue;
        return String(raw);
      });
    const list = [...rows];
    list.sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av == null && bv == null) return 0;
      if (av == null) return sort.direction === 'asc' ? -1 : 1;
      if (bv == null) return sort.direction === 'asc' ? 1 : -1;
      if (typeof av === 'number' && typeof bv === 'number') return sort.direction === 'asc' ? av - bv : bv - av;
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      if (as < bs) return sort.direction === 'asc' ? -1 : 1;
      if (as > bs) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [rows, sort]);

  const displayRows = sortedRows;

  const onSort = (col: DataTableColumn<Row>) => {
    if (!col.sortable) return;
    setSort((prev) => {
      if (prev.key === col.key) return { key: col.key, direction: prev.direction === 'asc' ? 'desc' : 'asc', column: col };
      return { key: col.key, direction: 'asc', column: col };
    });
  };

  const skelCount = skeletonRowCount ?? 8;

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        {/* whitespace-nowrap (inherited by every th/td) makes cell text expand
            the column instead of wrapping; the overflow-x-auto wrapper scrolls
            when content is wider than the container. Columns that should wrap
            (e.g. descriptions) re-assert whitespace-normal on their own cell. */}
        <table className="min-w-full text-left border-collapse whitespace-nowrap">
          <thead className={`${stickyHeader ? 'sticky top-0 z-10' : ''} ${theme.headerRow}`}>
            <tr>
              {columns.map((col) => {
                const isSorted = sort.key === col.key;
                return (
                  <th
                    key={col.key}
                    className={`px-4 py-2.5 ${theme.headerCell} ${col.className || ''} ${col.sortable ? 'cursor-pointer select-none group' : ''}`}
                    onClick={() => onSort(col)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className={isSorted ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}>
                          {isSorted ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: skelCount }).map((_, rowIdx) => (
                <tr key={`skel-${rowIdx}`} className="group">
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
            ) : displayRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-text-muted text-sm">
                  {emptyState || <p>No data found.</p>}
                </td>
              </tr>
            ) : (
              displayRows.map((row, index) => {
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