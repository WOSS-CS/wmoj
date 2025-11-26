export interface Problem {
  id: string;
  name: string;
  content: string;
  contest: string | null;
  input: string[];
  output: string[];
  created_at: string;
  updated_at: string;
  is_active?: boolean; // optional until ensured in all selects
  time_limit?: number; // Time limit in milliseconds
  memory_limit?: number; // Memory limit in MB
}

export interface Contest {
  id: string;
  name: string;
  description: string | null;
  length: number;
  created_at: string;
  updated_at: string;
}
