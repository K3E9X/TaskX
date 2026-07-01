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
          actor_id: string
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_announcements: {
        Row: {
          active: boolean
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
          author_id: string
          created_at: string
          id: string
          note: string
          target_user_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          note: string
          target_user_id: string
        }
        Update: {
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
          created_at: string
          id: string
          ip: string
          reason: string | null
        }
        Insert: {
          blocked_by: string
          created_at?: string
          id?: string
          ip: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string
          created_at?: string
          id?: string
          ip?: string
          reason?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string
        }
        Relationships: []
      }
      daily_activity: {
        Row: {
          created_at: string
          day: string
          feed_read: number
          id: string
          notes_edited: number
          todos_done: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day?: string
          feed_read?: number
          id?: string
          notes_edited?: number
          todos_done?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          feed_read?: number
          id?: string
          notes_edited?: number
          todos_done?: number
          updated_at?: string
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
          affected_cpes: string[]
          created_at: string
          cve_id: string | null
          epss_percentile: number | null
          epss_score: number | null
          external_id: string | null
          has_poc: boolean
          id: string
          is_auto: boolean
          is_kev: boolean
          poc_urls: string[]
          published_at: string
          read: boolean
          severity: Database["public"]["Enums"]["feed_severity"]
          source: Database["public"]["Enums"]["feed_source"]
          starred: boolean
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          affected_cpes?: string[]
          created_at?: string
          cve_id?: string | null
          epss_percentile?: number | null
          epss_score?: number | null
          external_id?: string | null
          has_poc?: boolean
          id?: string
          is_auto?: boolean
          is_kev?: boolean
          poc_urls?: string[]
          published_at?: string
          read?: boolean
          severity?: Database["public"]["Enums"]["feed_severity"]
          source?: Database["public"]["Enums"]["feed_source"]
          starred?: boolean
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          affected_cpes?: string[]
          created_at?: string
          cve_id?: string | null
          epss_percentile?: number | null
          epss_score?: number | null
          external_id?: string | null
          has_poc?: boolean
          id?: string
          is_auto?: boolean
          is_kev?: boolean
          poc_urls?: string[]
          published_at?: string
          read?: boolean
          severity?: Database["public"]["Enums"]["feed_severity"]
          source?: Database["public"]["Enums"]["feed_source"]
          starred?: boolean
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
          kind: string
          link_url: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          link_url?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          link_url?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nuclei_cve_index: {
        Row: {
          added_at: string
          cve_id: string
        }
        Insert: {
          added_at?: string
          cve_id: string
        }
        Update: {
          added_at?: string
          cve_id?: string
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
          avatar_url: string | null
          created_at: string
          dashboard_widgets: string[]
          display_name: string
          first_name: string
          id: string
          last_name: string
          onboarded: boolean
          profile_type: Database["public"]["Enums"]["profile_type"] | null
          stack_tags: string[] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          dashboard_widgets?: string[]
          display_name?: string
          first_name?: string
          id: string
          last_name?: string
          onboarded?: boolean
          profile_type?: Database["public"]["Enums"]["profile_type"] | null
          stack_tags?: string[] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          dashboard_widgets?: string[]
          display_name?: string
          first_name?: string
          id?: string
          last_name?: string
          onboarded?: boolean
          profile_type?: Database["public"]["Enums"]["profile_type"] | null
          stack_tags?: string[] | null
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
      snippets: {
        Row: {
          command: string
          created_at: string
          description: string | null
          favorite: boolean
          id: string
          language: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          command?: string
          created_at?: string
          description?: string | null
          favorite?: boolean
          id?: string
          language?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          command?: string
          created_at?: string
          description?: string | null
          favorite?: boolean
          id?: string
          language?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          last_completed_at: string | null
          priority: Database["public"]["Enums"]["todo_priority"]
          recurrence: string | null
          recurrence_interval: number | null
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
          last_completed_at?: string | null
          priority?: Database["public"]["Enums"]["todo_priority"]
          recurrence?: string | null
          recurrence_interval?: number | null
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
          last_completed_at?: string | null
          priority?: Database["public"]["Enums"]["todo_priority"]
          recurrence?: string | null
          recurrence_interval?: number | null
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
      user_stack_items: {
        Row: {
          cpe_prefix: string
          created_at: string
          id: string
          label: string | null
          product: string
          user_id: string
          vendor: string
          version: string | null
        }
        Insert: {
          cpe_prefix: string
          created_at?: string
          id?: string
          label?: string | null
          product: string
          user_id: string
          vendor: string
          version?: string | null
        }
        Update: {
          cpe_prefix?: string
          created_at?: string
          id?: string
          label?: string | null
          product?: string
          user_id?: string
          vendor?: string
          version?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_cron_hook_secret: { Args: never; Returns: string }
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
      get_current_streak: { Args: never; Returns: number }
      get_engagement_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
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
      profile_type: "pentester" | "soc" | "ciso" | "architect" | "forensic"
      project_status: "draft" | "active" | "on_hold" | "done"
      risk_level: "low" | "medium" | "high" | "critical"
      routine_frequency: "daily" | "weekly"
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
      profile_type: ["pentester", "soc", "ciso", "architect", "forensic"],
      project_status: ["draft", "active", "on_hold", "done"],
      risk_level: ["low", "medium", "high", "critical"],
      routine_frequency: ["daily", "weekly"],
      todo_priority: ["low", "med", "high", "urgent"],
      todo_status: ["todo", "doing", "done"],
    },
  },
} as const
