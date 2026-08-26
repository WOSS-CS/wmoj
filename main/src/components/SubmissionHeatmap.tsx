'use client';

import { useState, useMemo } from 'react';

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
}

interface SubmissionHeatmapProps {
  data: HeatmapDay[];
  accountCreatedAt: string;
}

const CELL_SIZE = 12;
const CELL_GAP = 2;
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getIntensity(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

const INTENSITY_COLORS = [
  'var(--surface-2)',
  'rgba(5, 150, 105, 0.2)',
  'rgba(5, 150, 105, 0.4)',
  'rgba(5, 150, 105, 0.65)',
  'rgba(5, 150, 105, 1)',
];

// Every date helper here works in UTC end to end, and must keep doing so.
//
// `new Date('YYYY-MM-DDT00:00:00')` with no offset is parsed as LOCAL time per ES2015+, but
// `toISOString()` reads back in UTC. At any non-negative UTC offset, local midnight of day N+1 is
// still day N in UTC, so `addDays(d, 1)` returned `d` unchanged — and since that call is the week
// loop's only advance step, the loop never terminated and grew `weeks` until the tab OOM'd. This is
// a public page; it only ever worked because the school sits at UTC-4/-5. The server (Vercel, UTC)
// renders correct HTML, so the hang appears on hydration.
//
// The submission rows are also bucketed by UTC day server-side, so a UTC calendar here is what makes
// the tooltip label agree with the bucket it came from.

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00Z');
  // 0 = Monday, 6 = Sunday
  return (d.getUTCDay() + 6) % 7;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function getDateRange(selectedYear: string | null): { start: string; end: string } {
  if (selectedYear === null) {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    const start = addDays(end, -364);
    return { start, end };
  }
  return {
    start: `${selectedYear}-01-01`,
    end: `${selectedYear}-12-31`,
  };
}

export function SubmissionHeatmap({ data, accountCreatedAt }: SubmissionHeatmapProps) {
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const accountYear = new Date(accountCreatedAt).getFullYear();
  const currentYear = new Date().getFullYear();
  const yearOptions: string[] = [];
  for (let y = currentYear; y >= accountYear; y--) {
    yearOptions.push(String(y));
  }

  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data) {
      map.set(d.date, (map.get(d.date) || 0) + d.count);
    }
    return map;
  }, [data]);

  const { start, end } = getDateRange(selectedYear);

  const { weeks, monthMarkers, totalSubmissions } = useMemo(() => {
    // Align start to Monday
    const startDow = getDayOfWeek(start);
    const alignedStart = addDays(start, -startDow);

    const weeks: { date: string; count: number }[][] = [];
    let currentWeek: { date: string; count: number }[] = [];
    let total = 0;
    let currentDate = alignedStart;
    const endDate = end;
    const monthMarkers: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;

    while (currentDate <= endDate || currentWeek.length > 0) {
      if (currentDate > endDate && currentWeek.length < 7) {
        // Pad last week
        while (currentWeek.length < 7) {
          currentWeek.push({ date: '', count: 0 });
        }
        weeks.push(currentWeek);
        break;
      }

      const count = countMap.get(currentDate) || 0;
      const inRange = currentDate >= start && currentDate <= endDate;
      if (inRange) total += count;

      currentWeek.push({
        date: inRange ? currentDate : '',
        count: inRange ? count : 0,
      });

      // Track month transitions
      if (inRange) {
        const month = new Date(currentDate + 'T00:00:00Z').getUTCMonth();
        if (month !== lastMonth) {
          monthMarkers.push({ weekIndex: weeks.length, label: MONTH_LABELS[month] });
          lastMonth = month;
        }
      }

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      // Structural backstop: never spin if the cursor fails to advance for any reason. The loop's
      // only exit conditions both require `currentDate > endDate`, so a non-advancing cursor is an
      // infinite loop inside a useMemo with no error boundary above it.
      const nextDate = addDays(currentDate, 1);
      if (nextDate === currentDate) break;
      currentDate = nextDate;
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', count: 0 });
      }
      weeks.push(currentWeek);
    }

    return { weeks, monthMarkers, totalSubmissions: total };
  }, [start, end, countMap]);

  const labelText = selectedYear
    ? `${totalSubmissions} submissions in ${selectedYear}`
    : `${totalSubmissions} submissions in the last year`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">{labelText}</p>
        <select
          value={selectedYear ?? ''}
          onChange={(e) => setSelectedYear(e.target.value || null)}
          className="h-8 px-2 rounded-md bg-surface-1 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
        >
          <option value="">Last 365 days</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="glass-panel p-4 overflow-x-auto relative">
        {/* Month labels */}
        <div className="flex" style={{ marginLeft: 32 }}>
          {monthMarkers.map((m, i) => {
            const nextPos = i < monthMarkers.length - 1 ? monthMarkers[i + 1].weekIndex : weeks.length;
            const span = nextPos - m.weekIndex;
            return (
              <div
                key={`${m.label}-${m.weekIndex}`}
                className="text-xs text-text-muted"
                style={{ width: span * (CELL_SIZE + CELL_GAP), flexShrink: 0 }}
              >
                {span >= 2 ? m.label : ''}
              </div>
            );
          })}
        </div>

        {/* Grid */}
        <div className="flex gap-0 mt-1">
          {/* Day labels */}
          <div className="flex flex-col flex-shrink-0" style={{ width: 28 }}>
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="text-xs text-text-muted flex items-center"
                style={{ height: CELL_SIZE + CELL_GAP }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Week columns */}
          <div className="flex" style={{ gap: CELL_GAP }}>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: CELL_GAP }}>
                {week.map((day, di) => (
                  <div
                    key={di}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      borderRadius: 2,
                      backgroundColor: day.date
                        ? INTENSITY_COLORS[getIntensity(day.count)]
                        : 'transparent',
                      cursor: day.date ? 'pointer' : 'default',
                    }}
                    onMouseEnter={(e) => {
                      if (!day.date) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const parent = e.currentTarget.closest('.relative')?.getBoundingClientRect();
                      if (parent) {
                        setTooltip({
                          x: rect.left - parent.left + rect.width / 2,
                          y: rect.top - parent.top - 8,
                          text: `${day.count} submission${day.count !== 1 ? 's' : ''} on ${formatDate(day.date)}`,
                        });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-foreground text-background text-xs px-2 py-1 rounded-md whitespace-nowrap"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translate(-50%, -100%)',
              zIndex: 10,
            }}
          >
            {tooltip.text}
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 mt-3">
          <span className="text-xs text-text-muted mr-1">Less</span>
          {INTENSITY_COLORS.map((color, i) => (
            <div
              key={i}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                borderRadius: 2,
                backgroundColor: color,
              }}
            />
          ))}
          <span className="text-xs text-text-muted ml-1">More</span>
        </div>
      </div>
    </div>
  );
}
