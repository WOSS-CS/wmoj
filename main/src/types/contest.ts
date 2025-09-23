export interface Contest {
  id: string;
  name: string;
  description: string | null;
  length: number;
  created_at: string | null;
  updated_at: string | null;
  is_active: boolean;
}


