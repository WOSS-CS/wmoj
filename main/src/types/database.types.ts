export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          is_active?: boolean | null
          last_login?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      comment_votes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
          value: number
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
          value: number
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "comment_votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          parent_id: string | null
          problem_id: string
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          parent_id?: string | null
          problem_id: string
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          problem_id?: string
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_participants: {
        Row: {
          contest_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          contest_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          contest_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_participants_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_problems: {
        Row: {
          contest_id: string
          created_at: string
          problem_id: string
        }
        Insert: {
          contest_id: string
          created_at?: string
          problem_id: string
        }
        Update: {
          contest_id?: string
          created_at?: string
          problem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_problems_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_problems_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          is_rated: boolean
          length: number
          name: string
          starts_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id: string
          is_active?: boolean
          is_rated?: boolean
          length: number
          name: string
          starts_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          is_rated?: boolean
          length?: number
          name?: string
          starts_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      countdown_timers: {
        Row: {
          contest_id: string
          duration_minutes: number
          id: string
          is_active: boolean | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          contest_id: string
          duration_minutes: number
          id?: string
          is_active?: boolean | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          contest_id?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "countdown_timers_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      join_history: {
        Row: {
          contest_id: string
          id: string
          is_virtual: boolean
          joined_at: string | null
          left_at: string | null
          user_id: string
        }
        Insert: {
          contest_id: string
          id?: string
          is_virtual?: boolean
          joined_at?: string | null
          left_at?: string | null
          user_id: string
        }
        Update: {
          contest_id?: string
          id?: string
          is_virtual?: boolean
          joined_at?: string | null
          left_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_history_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      managers: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          is_active?: boolean | null
          last_login?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      news_posts: {
        Row: {
          content: string
          date_posted: string
          id: string
          title: string
          uid: string
          updated_at: string | null
        }
        Insert: {
          content: string
          date_posted?: string
          id?: string
          title: string
          uid: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          date_posted?: string
          id?: string
          title?: string
          uid?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_posts_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_tests: {
        Row: {
          checker: string | null
          generator_file: string | null
          input: Json
          output: Json
          problem_id: string
          updated_at: string
        }
        Insert: {
          checker?: string | null
          generator_file?: string | null
          input?: Json
          output?: Json
          problem_id: string
          updated_at?: string
        }
        Update: {
          checker?: string | null
          generator_file?: string | null
          input?: Json
          output?: Json
          problem_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "problem_tests_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: true
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      problems: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          memory_limit: number
          name: string
          points: number
          time_limit: number
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id: string
          is_active?: boolean | null
          memory_limit?: number
          name: string
          points: number
          time_limit?: number
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          memory_limit?: number
          name?: string
          points?: number
          time_limit?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      submission_private: {
        Row: {
          code: string | null
          compile_error: string | null
          created_at: string
          results_full: Json | null
          submission_id: string
          user_id: string
        }
        Insert: {
          code?: string | null
          compile_error?: string | null
          created_at: string
          results_full?: Json | null
          submission_id: string
          user_id: string
        }
        Update: {
          code?: string | null
          compile_error?: string | null
          created_at?: string
          results_full?: Json | null
          submission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_private_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          created_at: string | null
          id: string
          language: string
          problem_id: string
          results: Json | null
          status: string | null
          summary: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          language: string
          problem_id: string
          results?: Json | null
          status?: string | null
          summary?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          language?: string
          problem_id?: string
          results?: Json | null
          status?: string | null
          summary?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          about_me: string | null
          created_at: string | null
          email: string
          id: string
          last_login: string | null
          points: number
          problems_solved: number
          profile_data: Json | null
          updated_at: string | null
          username: string
        }
        Insert: {
          about_me?: string | null
          created_at?: string | null
          email: string
          id: string
          last_login?: string | null
          points?: number
          problems_solved?: number
          profile_data?: Json | null
          updated_at?: string | null
          username: string
        }
        Update: {
          about_me?: string | null
          created_at?: string | null
          email?: string
          id?: string
          last_login?: string | null
          points?: number
          problems_solved?: number
          profile_data?: Json | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_email_registered: { Args: { p_email: string }; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      is_username_taken: { Args: { p_username: string }; Returns: boolean }
      join_contest: { Args: { p_contest_id: string }; Returns: undefined }
      leave_contest: { Args: { p_contest_id: string }; Returns: undefined }
      recalc_user_stats: { Args: { target: string }; Returns: undefined }
      recalculate_problems_solved: { Args: { uid: string }; Returns: number }
      recalculate_user_points: { Args: { uid: string }; Returns: number }
      record_submission: {
        Args: {
          p_code: string
          p_compile_error: string
          p_language: string
          p_problem_id: string
          p_results: Json
          p_results_full: Json
          p_summary: Json
        }
        Returns: string
      }
      sweep_expired_participation: { Args: never; Returns: number }
      top_submitted_problems: {
        Args: { limit_count?: number }
        Returns: {
          problem_id: string
          submission_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

