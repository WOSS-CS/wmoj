export type HeaderVariant = 'green' | 'blue' | 'red' | 'emerald' | 'gray' | 'purple';

type TableTheme = {
  headerRow: string;
  headerCell: string;
  rowHover: string;
  zebra: string;
  border: string;
};

const base: Omit<TableTheme, 'headerRow' | 'headerCell'> = {
  rowHover: 'hover:bg-white/10',
  zebra: 'odd:bg-white/5',
  border: 'border-white/10',
};

export const tableThemeByVariant: Record<HeaderVariant, TableTheme> = {
  green: {
    headerRow: 'bg-green-950/40',
    headerCell: 'text-green-300',
    ...base,
  },
  emerald: {
    headerRow: 'bg-emerald-950/40',
    headerCell: 'text-emerald-300',
    ...base,
  },
  blue: {
    headerRow: 'bg-blue-950/40',
    headerCell: 'text-blue-300',
    ...base,
  },
  red: {
    headerRow: 'bg-red-950/40',
    headerCell: 'text-red-300',
    ...base,
  },
  gray: {
    headerRow: 'bg-gray-900/60',
    headerCell: 'text-gray-300',
    ...base,
  },
  purple: {
    headerRow: 'bg-purple-950/40',
    headerCell: 'text-purple-300',
    ...base,
  },
};

export function getTableTheme(variant: HeaderVariant | undefined): TableTheme {
  if (!variant) return tableThemeByVariant.gray;
  return tableThemeByVariant[variant] || tableThemeByVariant.gray;
}


