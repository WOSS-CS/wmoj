export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          bio: string | null
          avatar_url: string | null
          github_username: string | null
          website_url: string | null
          location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          github_username?: string | null
          website_url?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          bio?: string | null
          avatar_url?: string | null
          github_username?: string | null
          website_url?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      problems: {
        Row: {
          id: string
          title: string
          slug: string
          description: string
          difficulty: "Easy" | "Medium" | "Hard"
          tags: string[]
          input_format: string | null
          output_format: string | null
          constraints: string | null
          sample_input: string | null
          sample_output: string | null
          explanation: string | null
          time_limit: number
          memory_limit: number
          created_by: string | null
          user_id: string | null
          created_at: string
          updated_at: string
          is_active: boolean
          is_public: boolean
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description: string
          difficulty: "Easy" | "Medium" | "Hard"
          tags?: string[]
          input_format?: string | null
          output_format?: string | null
          constraints?: string | null
          sample_input?: string | null
          sample_output?: string | null
          explanation?: string | null
          time_limit?: number
          memory_limit?: number
          created_by?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
          is_active?: boolean
          is_public?: boolean
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string
          difficulty?: "Easy" | "Medium" | "Hard"
          tags?: string[]
          input_format?: string | null
          output_format?: string | null
          constraints?: string | null
          sample_input?: string | null
          sample_output?: string | null
          explanation?: string | null
          time_limit?: number
          memory_limit?: number
          created_by?: string | null
          user_id?: string | null
          created_at?: string
          updated_at?: string
          is_active?: boolean
          is_public?: boolean
        }
      }
      contests: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          start_time: string
          end_time: string
          registration_start: string | null
          registration_end: string | null
          max_participants: number | null
          is_public: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          start_time: string
          end_time: string
          registration_start?: string | null
          registration_end?: string | null
          max_participants?: number | null
          is_public?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          start_time?: string
          end_time?: string
          registration_start?: string | null
          registration_end?: string | null
          max_participants?: number | null
          is_public?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      contest_problems: {
        Row: {
          id: string
          contest_id: string
          problem_id: string
          points: number
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          contest_id: string
          problem_id: string
          points?: number
          order_index: number
          created_at?: string
        }
        Update: {
          id?: string
          contest_id?: string
          problem_id?: string
          points?: number
          order_index?: number
          created_at?: string
        }
      }
      contest_registrations: {
        Row: {
          id: string
          contest_id: string
          user_id: string
          registered_at: string
        }
        Insert: {
          id?: string
          contest_id: string
          user_id: string
          registered_at?: string
        }
        Update: {
          id?: string
          contest_id?: string
          user_id?: string
          registered_at?: string
        }
      }
      submissions: {
        Row: {
          id: string
          problem_id: string
          contest_id: string | null
          user_id: string
          language: string
          code: string
          status:
            | "pending"
            | "running"
            | "accepted"
            | "wrong_answer"
            | "time_limit_exceeded"
            | "memory_limit_exceeded"
            | "runtime_error"
            | "compilation_error"
          runtime: number | null
          memory_used: number | null
          score: number
          test_cases_passed: number
          total_test_cases: number
          error_message: string | null
          submitted_at: string
        }
        Insert: {
          id?: string
          problem_id: string
          contest_id?: string | null
          user_id: string
          language: string
          code: string
          status?:
            | "pending"
            | "running"
            | "accepted"
            | "wrong_answer"
            | "time_limit_exceeded"
            | "memory_limit_exceeded"
            | "runtime_error"
            | "compilation_error"
          runtime?: number | null
          memory_used?: number | null
          score?: number
          test_cases_passed?: number
          total_test_cases?: number
          error_message?: string | null
          submitted_at?: string
        }
        Update: {
          id?: string
          problem_id?: string
          contest_id?: string | null
          user_id?: string
          language?: string
          code?: string
          status?:
            | "pending"
            | "running"
            | "accepted"
            | "wrong_answer"
            | "time_limit_exceeded"
            | "memory_limit_exceeded"
            | "runtime_error"
            | "compilation_error"
          runtime?: number | null
          memory_used?: number | null
          score?: number
          test_cases_passed?: number
          total_test_cases?: number
          error_message?: string | null
          submitted_at?: string
        }
      }
      user_problem_stats: {
        Row: {
          id: string
          user_id: string
          problem_id: string
          status: "not_attempted" | "attempted" | "solved"
          best_submission_id: string | null
          attempts: number
          first_solved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          problem_id: string
          status?: "not_attempted" | "attempted" | "solved"
          best_submission_id?: string | null
          attempts?: number
          first_solved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          problem_id?: string
          status?: "not_attempted" | "attempted" | "solved"
          best_submission_id?: string | null
          attempts?: number
          first_solved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      test_cases: {
        Row: {
          id: string
          problem_id: string
          input: string
          expected_output: string
          is_sample: boolean
          points: number
          time_limit: number | null
          memory_limit: number | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          problem_id: string
          input: string
          expected_output: string
          is_sample?: boolean
          points?: number
          time_limit?: number | null
          memory_limit?: number | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          problem_id?: string
          input?: string
          expected_output?: string
          is_sample?: boolean
          points?: number
          time_limit?: number | null
          memory_limit?: number | null
          order_index?: number
          created_at?: string
        }
      }
      supported_languages: {
        Row: {
          id: string
          name: string
          judge0_id: number | null
          display_name: string
          file_extension: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          judge0_id?: number | null
          display_name: string
          file_extension: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          judge0_id?: number | null
          display_name?: string
          file_extension?: string
          is_active?: boolean
          created_at?: string
        }
      }
      learning_resources: {
        Row: {
          id: string
          title: string
          slug: string
          description: string
          content: string
          category: "tutorial" | "algorithm" | "data_structure" | "concept"
          difficulty: "Beginner" | "Intermediate" | "Advanced"
          tags: string[]
          estimated_time: number
          prerequisites: string[]
          created_by: string | null
          created_at: string
          updated_at: string
          is_published: boolean
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description: string
          content: string
          category: "tutorial" | "algorithm" | "data_structure" | "concept"
          difficulty?: "Beginner" | "Intermediate" | "Advanced"
          tags?: string[]
          estimated_time?: number
          prerequisites?: string[]
          created_by?: string | null
          created_at?: string
          updated_at?: string
          is_published?: boolean
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string
          content?: string
          category?: "tutorial" | "algorithm" | "data_structure" | "concept"
          difficulty?: "Beginner" | "Intermediate" | "Advanced"
          tags?: string[]
          estimated_time?: number
          prerequisites?: string[]
          created_by?: string | null
          created_at?: string
          updated_at?: string
          is_published?: boolean
        }
      }
      user_learning_progress: {
        Row: {
          id: string
          user_id: string
          resource_id: string
          status: "not_started" | "in_progress" | "completed"
          progress_percentage: number
          time_spent: number
          started_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          resource_id: string
          status?: "not_started" | "in_progress" | "completed"
          progress_percentage?: number
          time_spent?: number
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          resource_id?: string
          status?: "not_started" | "in_progress" | "completed"
          progress_percentage?: number
          time_spent?: number
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      calendar_events: {
        Row: {
          id: string
          title: string
          description: string | null
          event_type: "contest" | "workshop" | "deadline" | "announcement" | "other"
          start_time: string
          end_time: string | null
          location: string | null
          is_public: boolean
          created_by: string
          contest_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          event_type: "contest" | "workshop" | "deadline" | "announcement" | "other"
          start_time: string
          end_time?: string | null
          location?: string | null
          is_public?: boolean
          created_by: string
          contest_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          event_type?: "contest" | "workshop" | "deadline" | "announcement" | "other"
          start_time?: string
          end_time?: string | null
          location?: string | null
          is_public?: boolean
          created_by?: string
          contest_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      event_registrations: {
        Row: {
          id: string
          event_id: string
          user_id: string
          registration_status: "registered" | "waitlisted" | "cancelled"
          registered_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          registration_status?: "registered" | "waitlisted" | "cancelled"
          registered_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          registration_status?: "registered" | "waitlisted" | "cancelled"
          registered_at?: string
          notes?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
