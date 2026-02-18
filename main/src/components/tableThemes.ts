export type HeaderVariant = 'green' | 'blue' | 'red' | 'emerald' | 'gray' | 'purple';

type TableTheme = {
  headerRow: string;
  headerCell: string;
  rowHover: string;
  zebra: string;
  border: string;
};

const base: Omit<TableTheme, 'headerRow' | 'headerCell'> = {
  rowHover: 'hover:bg-surface-2 transition-colors duration-200',
  zebra: '',
  border: 'border-b border-border',
};

// Spec: Header: Uppercase, smaller font size, text color #6B7280 (Gray 500).
// We will enforce this via DataTable component classes, but the theme provides the bg?
// Spec says "Header: Uppercase... text color...".
// I will override the headerCell color in all variants to be GRAY-500, or keep variants for optional coloring?
// Spec implies uniformity: "Remove Grid Lines... Header... text color #6B7280".
// I'll make the header background transparent or subtle.

const sharedHeader = "uppercase text-xs font-medium tracking-wider text-text-muted";

export const tableThemeByVariant: Record<HeaderVariant, TableTheme> = {
  green: {
    headerRow: 'bg-surface-1',
    headerCell: sharedHeader,
    ...base,
  },
  emerald: {
    headerRow: 'bg-surface-1',
    headerCell: sharedHeader,
    ...base,
  },
  blue: {
    headerRow: 'bg-surface-1',
    headerCell: sharedHeader,
    ...base,
  },
  red: {
    headerRow: 'bg-surface-1',
    headerCell: sharedHeader,
    ...base,
  },
  gray: {
    headerRow: 'bg-surface-1',
    headerCell: sharedHeader,
    ...base,
  },
  purple: {
    headerRow: 'bg-surface-1',
    headerCell: sharedHeader,
    ...base,
  },
};

export function getTableTheme(variant: HeaderVariant | undefined): TableTheme {
  if (!variant) return tableThemeByVariant.gray;
  return tableThemeByVariant[variant] || tableThemeByVariant.gray;
}


