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

export type DataTableProps<Row extends { [key: string]: any }> = {
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

export function DataTable<Row extends { [key: string]: any }>(props: DataTableProps<Row>) {
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
      ((row: Row) => {
        const v = row[sort.key as keyof Row] as unknown as any;
        return v;
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
    <div className={`overflow-x-auto rounded-xl border ${theme.border} ${className}`}>
      <table className="min-w-full text-left">
        <thead className={`${stickyHeader ? 'sticky top-0 z-10' : ''} ${theme.headerRow} backdrop-blur`}>
          <tr>
            {columns.map((col) => {
              const isSorted = sort.key === col.key;
              return (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-sm font-semibold ${theme.headerCell} ${col.className || ''} ${col.sortable ? 'cursor-pointer select-none' : ''}`}
                  onClick={() => onSort(col)}
                >
                  <div className="flex items-center gap-2">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-xs opacity-70">
                        {isSorted ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-gray-400">
                {emptyState || 'No data to display.'}
              </td>
            </tr>
          ) : (
            sortedRows.map((row, index) => {
              const key = rowKey ? rowKey(row, index) : (row.id ? String(row.id) : String(index));
              return (
                <tr key={key} className={`${theme.zebra} ${theme.rowHover}`}>
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 align-middle ${col.className || ''}`}>
                      {col.render ? col.render(row) : (row[col.key] as ReactNode)}
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


