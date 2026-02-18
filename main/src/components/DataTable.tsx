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
};

type SortState<Row> = {
  key: string | null;
  direction: 'asc' | 'desc';
  column?: DataTableColumn<Row> | null;
};

export function DataTable<Row extends object>(props: DataTableProps<Row>) {
  const {
    columns,
    rows,
    rowKey,
    emptyState,
    headerVariant = 'gray',
    className = '',
    stickyHeader = true,
  } = props;

  const [sort, setSort] = useState<SortState<Row>>({
    key: null,
    direction: 'asc',
    column: null,
  });

  const theme = getTableTheme(headerVariant);

  const sortedRows = useMemo(() => {
    if (!sort.key || !sort.column) return rows;
    const accessor =
      sort.column.sortAccessor ||
      ((row: Row): SortValue => {
        const rec = row as unknown as Record<string, unknown>;
        const raw = rec[sort.key as string] as unknown;
        if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean' || raw == null) {
          return raw as SortValue;
        }
        return String(raw);
      });
    const list = [...rows];
    list.sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av == null && bv == null) return 0;
      if (av == null) return sort.direction === 'asc' ? -1 : 1;
      if (bv == null) return sort.direction === 'asc' ? 1 : -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sort.direction === 'asc' ? av - bv : bv - av;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      if (as < bs) return sort.direction === 'asc' ? -1 : 1;
      if (as > bs) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [rows, sort]);

  const onSort = (col: DataTableColumn<Row>) => {
    if (!col.sortable) return;
    setSort((prev) => {
      if (prev.key === col.key) {
        return { key: col.key, direction: prev.direction === 'asc' ? 'desc' : 'asc', column: col };
      }
      return { key: col.key, direction: 'asc', column: col };
    });
  };

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full text-left border-collapse">
        <thead className={`${stickyHeader ? 'sticky top-0 z-10' : ''} ${theme.headerRow}`}>
          <tr>
            {columns.map((col) => {
              const isSorted = sort.key === col.key;
              return (
                <th
                  key={col.key}
                  className={`px-6 py-4 ${theme.headerCell} ${col.className || ''} ${col.sortable ? 'cursor-pointer select-none group' : ''}`}
                  onClick={() => onSort(col)}
                >
                  <div className="flex items-center gap-2">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className={`transition-opacity ${isSorted ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
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
          {sortedRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-text-muted">
                {emptyState || (
                  <div className="flex flex-col items-center justify-center">
                    <p>No data found.</p>
                  </div>
                )}
              </td>
            </tr>
          ) : (
            sortedRows.map((row, index) => {
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
                    <td key={col.key} className={`px-6 py-4 align-middle text-sm text-foreground ${col.className || ''}`}>
                      {col.render
                        ? col.render(row)
                        : ((row as unknown as Record<string, unknown>)[col.key] as ReactNode)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;


