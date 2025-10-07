export interface Activity {
  id: string;
  type: 'submission' | 'contest_join';
  action: string;
  item: string;
  itemId: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info';
}

