export type HeaderVariant = 'green' | 'blue' | 'red' | 'emerald' | 'gray' | 'purple';

type TableTheme = {
  headerRow: string;
  headerCell: string;
  rowHover: string;
  zebra: string;
  border: string;
};

const sharedHeader = "uppercase text-xs font-medium tracking-wider text-text-muted";

const defaultTheme: TableTheme = {
  headerRow: 'bg-surface-1',
  headerCell: sharedHeader,
  rowHover: 'hover:bg-surface-2',
  zebra: '',
  border: 'border-b border-border',
};

// All variants share the same theme. The type is kept for API compatibility.
export const tableThemeByVariant: Record<HeaderVariant, TableTheme> = {
  green: defaultTheme,
  emerald: defaultTheme,
  blue: defaultTheme,
  red: defaultTheme,
  gray: defaultTheme,
  purple: defaultTheme,
};

export function getTableTheme(variant: HeaderVariant | undefined): TableTheme {
  return defaultTheme;
}
