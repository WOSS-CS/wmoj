export interface Problem {
  id: string;
  name: string;
  content: string;
  input: string[];
  output: string[];
  created_at: string;
  updated_at: string;
  is_active?: boolean; // optional until ensured in all selects
  time_limit?: number; // Time limit in milliseconds
  memory_limit?: number; // Memory limit in MB
  // Optional C++ source for a custom checker. Null/absent means the judge
  // grades by exact output comparison. Staff-only — never selected into
  // client-facing payloads.
  checker?: string | null;
  points: number;
}

export interface Contest {
  id: string;
  name: string;
  description: string | null;
  length: number;
  created_at: string;
  updated_at: string;
}
