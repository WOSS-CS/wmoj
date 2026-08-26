'use client';

interface TableBodySkeletonProps {
  /** Number of skeleton rows to render. Default 8. */
  rows?: number;
  /** Number of columns. Determines the number of <td> cells per row. */
  columns: number;
  /** Optional per-column width hints (e.g. ['10%','50%','20%','20%']).
   * If omitted, every cell uses a default width pattern. */
  columnWidths?: string[];
  /** className for each <td> (e.g. to match the table's padding). Default matches DataTable. */
  cellClassName?: string;
}

/**
 * Drop-in skeleton rows for hand-rolled tables during server-pagination loading.
 * Renders a fragment of <tr> elements (no wrapping <tbody>) so the caller's
 * existing <tbody className="divide-y divide-border"> stays and the skeleton
 * rows inherit the divider styling.
 *
 * Usage (submissions):
 *   <tbody className="divide-y divide-border">
 *     {isLoading ? (
 *       <TableBodySkeleton columns={3} rows={20} columnWidths={['20%','60%','20%']} />
 *     ) : initialSubmissions.length === 0 ? (
 *       <tr><td colSpan={3}>No submissions match your filters.</td></tr>
 *     ) : (
 *       initialSubmissions.map(...)
 *     )}
 *   </tbody>
 */
export function TableBodySkeleton({
  rows = 8,
  columns,
  columnWidths,
  cellClassName = 'px-4 py-3 align-middle text-sm',
}: TableBodySkeletonProps) {
  const widths =
    columnWidths ?? Array.from({ length: columns }, (_, i) => (i === 0 ? '50%' : '30%'));

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={`skel-${rowIdx}`} aria-hidden="true">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className={cellClassName}>
              <div
                className="h-4 rounded loading-shimmer"
                style={{ width: widths[colIdx] ?? '30%' }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default TableBodySkeleton;