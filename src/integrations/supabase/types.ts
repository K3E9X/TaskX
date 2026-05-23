export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string
          created_at: string
          details: Json
          id: string
          target_email: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id: string
          created_at?: string
          details?: Json
          id?: string
          target_email?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string
          created_at?: string
          details?: Json
          id?: string
          target_email?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_announcements: {
        Row: {
          active: boolean
          author_email: string | null
          author_id: string
          created_at: string
          expires_at: string | null
          id: string
          level: string
          message: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          author_email?: string | null
          author_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          level?: string
          message: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          author_email?: string | null
          author_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          level?: string
          message?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_user_notes: {
        Row: {
          author_email: string | null
          author_id: string
          created_at: string
          id: string
          note: string
          target_user_id: string
        }
        Insert: {
          author_email?: string | null
          author_id: string
          created_at?: string
          id?: string
          note: string
          target_user_id: string
        }
        Update: {
          author_email?: string | null
          author_id?: string
          created_at?: string
          id?: string
          note?: string
          target_user_id?: string
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          blocked_by: string
          blocked_by_email: string | null
          created_at: string
          id: string
          ip: string
          reason: string | null
        }
        Insert: {
          blocked_by: string
          blocked_by_email?: string | null
          created_at?: string
          id?: string
          ip: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string
          blocked_by_email?: string | null
          created_at?: string
          id?: string
          ip?: string
          reason?: string | null
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          tags: string[]
          title: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          tags?: string[]
          title: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          tags?: string[]
          title?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      diagrams: {
        Row: {
          created_at: string
          description: string | null
          diagram_type: Database["public"]["Enums"]["diagram_type"]
          id: string
          source: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          diagram_type?: Database["public"]["Enums"]["diagram_type"]
          id?: string
          source?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          diagram_type?: Database["public"]["Enums"]["diagram_type"]
          id?: string
          source?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          key: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      feed_items: {
        Row: {
          created_at: string
          external_id: string | null
          id: string
          is_auto: boolean
          published_at: string
          read: boolean
          severity: Database["public"]["Enums"]["feed_severity"]
          source: Database["public"]["Enums"]["feed_source"]
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          id?: string
          is_auto?: boolean
          published_at?: string
          read?: boolean
          severity?: Database["public"]["Enums"]["feed_severity"]
          source?: Database["public"]["Enums"]["feed_source"]
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          id?: string
          is_auto?: boolean
          published_at?: string
          read?: boolean
          severity?: Database["public"]["Enums"]["feed_severity"]
          source?: Database["public"]["Enums"]["feed_source"]
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          action_items: string | null
          agenda: string | null
          attendees: string[]
          created_at: string
          decisions: string | null
          id: string
          meeting_date: string
          notes: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_items?: string | null
          agenda?: string | null
          attendees?: string[]
          created_at?: string
          decisions?: string | null
          id?: string
          meeting_date?: string
          notes?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_items?: string | null
          agenda?: string | null
          attendees?: string[]
          created_at?: string
          decisions?: string | null
          id?: string
          meeting_date?: string
          notes?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string
          created_at: string
          id: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          browser: string | null
          country: string | null
          created_at: string
          id: string
          ip: string | null
          os: string | null
          path: string
          referrer: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          os?: string | null
          path: string
          referrer?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          os?: string | null
          path?: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auto_tip_enabled: boolean
          avatar_url: string | null
          created_at: string
          display_name: string
          first_name: string
          id: string
          last_name: string
          team_role: Database["public"]["Enums"]["team_role"]
          updated_at: string
        }
        Insert: {
          auto_tip_enabled?: boolean
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          first_name?: string
          id: string
          last_name?: string
          team_role?: Database["public"]["Enums"]["team_role"]
          updated_at?: string
        }
        Update: {
          auto_tip_enabled?: boolean
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          first_name?: string
          id?: string
          last_name?: string
          team_role?: Database["public"]["Enums"]["team_role"]
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          compliance: string[]
          created_at: string
          data_classification: string | null
          description: string | null
          id: string
          name: string
          risk_level: Database["public"]["Enums"]["risk_level"]
          security_controls: string | null
          status: Database["public"]["Enums"]["project_status"]
          threat_model: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          compliance?: string[]
          created_at?: string
          data_classification?: string | null
          description?: string | null
          id?: string
          name: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          security_controls?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          threat_model?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          compliance?: string[]
          created_at?: string
          data_classification?: string | null
          description?: string | null
          id?: string
          name?: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          security_controls?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          threat_model?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      routine_runs: {
        Row: {
          completed_steps: Json
          created_at: string
          id: string
          routine_id: string
          run_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_steps?: Json
          created_at?: string
          id?: string
          routine_id: string
          run_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_steps?: Json
          created_at?: string
          id?: string
          routine_id?: string
          run_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_runs_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          description: string | null
          frequency: Database["public"]["Enums"]["routine_frequency"]
          id: string
          name: string
          steps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["routine_frequency"]
          id?: string
          name: string
          steps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["routine_frequency"]
          id?: string
          name?: string
          steps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rss_sources: {
        Row: {
          created_at: string
          default_severity: Database["public"]["Enums"]["feed_severity"]
          enabled: boolean
          id: string
          last_fetched_at: string | null
          name: string
          source_type: Database["public"]["Enums"]["feed_source"]
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_severity?: Database["public"]["Enums"]["feed_severity"]
          enabled?: boolean
          id?: string
          last_fetched_at?: string | null
          name: string
          source_type?: Database["public"]["Enums"]["feed_source"]
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_severity?: Database["public"]["Enums"]["feed_severity"]
          enabled?: boolean
          id?: string
          last_fetched_at?: string | null
          name?: string
          source_type?: Database["public"]["Enums"]["feed_source"]
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      tips: {
        Row: {
          category: string
          command: string | null
          created_at: string
          explanation: string | null
          favorite: boolean
          id: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          command?: string | null
          created_at?: string
          explanation?: string | null
          favorite?: boolean
          id?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          command?: string | null
          created_at?: string
          explanation?: string | null
          favorite?: boolean
          id?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          priority: Database["public"]["Enums"]["todo_priority"]
          status: Database["public"]["Enums"]["todo_status"]
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["todo_priority"]
          status?: Database["public"]["Enums"]["todo_status"]
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["todo_priority"]
          status?: Database["public"]["Enums"]["todo_status"]
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_cron_recent_runs: {
        Args: never
        Returns: {
          end_time: string
          jobname: string
          return_message: string
          start_time: string
          status: string
        }[]
      }
      get_engagement_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member"
      diagram_type:
        | "flowchart"
        | "sequence"
        | "erd"
        | "architecture"
        | "state"
        | "other"
      feed_severity: "info" | "low" | "medium" | "high" | "critical"
      feed_source: "cve" | "cti" | "x" | "rss" | "other"
      project_status: "draft" | "active" | "on_hold" | "done"
      risk_level: "low" | "medium" | "high" | "critical"
      routine_frequency: "daily" | "weekly"
      team_role: "architect" | "pentester" | "forensic" | "analyst"
      todo_priority: "low" | "med" | "high" | "urgent"
      todo_status: "todo" | "doing" | "done"
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
  public: {
    Enums: {
      app_role: ["admin", "member"],
      diagram_type: [
        "flowchart",
        "sequence",
        "erd",
        "architecture",
        "state",
        "other",
      ],
      feed_severity: ["info", "low", "medium", "high", "critical"],
      feed_source: ["cve", "cti", "x", "rss", "other"],
      project_status: ["draft", "active", "on_hold", "done"],
      risk_level: ["low", "medium", "high", "critical"],
      routine_frequency: ["daily", "weekly"],
      team_role: ["architect", "pentester", "forensic", "analyst"],
      todo_priority: ["low", "med", "high", "urgent"],
      todo_status: ["todo", "doing", "done"],
    },
  },
} as const
