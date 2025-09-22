export interface Problem {
  id: string;
  name: string;
  content: string;
  contest: string | null;
  input: string[];
  output: string[];
  created_at: string;
  updated_at: string;
}

export interface Contest {
  id: string;
  name: string;
  description: string | null;
  length: number;
  created_at: string;
  updated_at: string;
}
