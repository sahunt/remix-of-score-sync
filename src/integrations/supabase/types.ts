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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      musicdb: {
        Row: {
          artist: string | null
          basename: string | null
          bpm_max: number | null
          chart_id: number | null
          created_at: string | null
          deleted: boolean
          difficulty_level: number | null
          difficulty_name: string | null
          eamuse_id: string | null
          era: number | null
          eventno: number | null
          flare: number | null
          halo: string | null
          id: number
          judgement_offset: number | null
          name: string | null
          name_romanized: string | null
          playstyle: string | null
          rank: string | null
          sanbai_rating: number | null
          score: number | null
          series: number | null
          song_id: number
          timestamp: string | null
          title_yomi: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          artist?: string | null
          basename?: string | null
          bpm_max?: number | null
          chart_id?: number | null
          created_at?: string | null
          deleted?: boolean
          difficulty_level?: number | null
          difficulty_name?: string | null
          eamuse_id?: string | null
          era?: number | null
          eventno?: number | null
          flare?: number | null
          halo?: string | null
          id?: never
          judgement_offset?: number | null
          name?: string | null
          name_romanized?: string | null
          playstyle?: string | null
          rank?: string | null
          sanbai_rating?: number | null
          score?: number | null
          series?: number | null
          song_id: number
          timestamp?: string | null
          title_yomi?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          artist?: string | null
          basename?: string | null
          bpm_max?: number | null
          chart_id?: number | null
          created_at?: string | null
          deleted?: boolean
          difficulty_level?: number | null
          difficulty_name?: string | null
          eamuse_id?: string | null
          era?: number | null
          eventno?: number | null
          flare?: number | null
          halo?: string | null
          id?: never
          judgement_offset?: number | null
          name?: string | null
          name_romanized?: string | null
          playstyle?: string | null
          rank?: string | null
          sanbai_rating?: number | null
          score?: number | null
          series?: number | null
          song_id?: number
          timestamp?: string | null
          title_yomi?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      song_bias: {
        Row: {
          bias_ms: number
          confidence: number | null
          created_at: string
          eamuse_id: string | null
          id: string
          song_id: number
          updated_at: string
        }
        Insert: {
          bias_ms: number
          confidence?: number | null
          created_at?: string
          eamuse_id?: string | null
          id?: string
          song_id: number
          updated_at?: string
        }
        Update: {
          bias_ms?: number
          confidence?: number | null
          created_at?: string
          eamuse_id?: string | null
          id?: string
          song_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      uploads: {
        Row: {
          created_at: string
          file_mime_type: string | null
          file_name: string
          file_size_bytes: number | null
          id: string
          parse_error: string | null
          parse_status: string
          parse_summary: Json | null
          raw_storage_path: string | null
          source_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_mime_type?: string | null
          file_name: string
          file_size_bytes?: number | null
          id?: string
          parse_error?: string | null
          parse_status?: string
          parse_summary?: Json | null
          raw_storage_path?: string | null
          source_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_mime_type?: string | null
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          parse_error?: string | null
          parse_status?: string
          parse_summary?: Json | null
          raw_storage_path?: string | null
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_filters: {
        Row: {
          created_at: string
          id: string
          match_mode: string
          name: string
          rules: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_mode?: string
          name: string
          rules?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_mode?: string
          name?: string
          rules?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_goals: {
        Row: {
          created_at: string
          criteria_match_mode: string
          criteria_rules: Json
          goal_count: number | null
          goal_mode: string
          id: string
          name: string
          score_floor: number | null
          score_mode: string
          target_type: string
          target_value: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          criteria_match_mode?: string
          criteria_rules?: Json
          goal_count?: number | null
          goal_mode?: string
          id?: string
          name: string
          score_floor?: number | null
          score_mode?: string
          target_type: string
          target_value: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          criteria_match_mode?: string
          criteria_rules?: Json
          goal_count?: number | null
          goal_mode?: string
          id?: string
          name?: string
          score_floor?: number | null
          score_mode?: string
          target_type?: string
          target_value?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          ddr_username: string | null
          display_name: string | null
          id: string
          reference_song_id: number | null
          twelve_ms_mode: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ddr_username?: string | null
          display_name?: string | null
          id?: string
          reference_song_id?: number | null
          twelve_ms_mode?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ddr_username?: string | null
          display_name?: string | null
          id?: string
          reference_song_id?: number | null
          twelve_ms_mode?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_scores: {
        Row: {
          chart_id: number | null
          created_at: string
          flare: number | null
          halo: string | null
          id: string
          judgement_offset: number | null
          musicdb_id: number
          rank: string | null
          score: number | null
          song_id: number
          source_type: string
          timestamp: string | null
          upload_id: string
          user_id: string
          username: string | null
        }
        Insert: {
          chart_id?: number | null
          created_at?: string
          flare?: number | null
          halo?: string | null
          id?: string
          judgement_offset?: number | null
          musicdb_id: number
          rank?: string | null
          score?: number | null
          song_id: number
          source_type?: string
          timestamp?: string | null
          upload_id: string
          user_id: string
          username?: string | null
        }
        Update: {
          chart_id?: number | null
          created_at?: string
          flare?: number | null
          halo?: string | null
          id?: string
          judgement_offset?: number | null
          musicdb_id?: number
          rank?: string | null
          score?: number | null
          song_id?: number
          source_type?: string
          timestamp?: string | null
          upload_id?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_scores_musicdb_id_fkey"
            columns: ["musicdb_id"]
            isOneToOne: false
            referencedRelation: "musicdb"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_scores_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_song_offsets: {
        Row: {
          created_at: string
          custom_bias_ms: number
          id: string
          song_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_bias_ms: number
          id?: string
          song_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_bias_ms?: number
          id?: string
          song_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bulk_update_era: {
        Args: { updates: Json }
        Returns: {
          updated_count: number
        }[]
      }
      bulk_update_romanized_titles: {
        Args: { updates: Json }
        Returns: {
          updated_count: number
        }[]
      }
      calculate_goal_progress: {
        Args: {
          p_difficulty_operator?: string
          p_difficulty_values?: string[]
          p_level_operator?: string
          p_level_values?: number[]
          p_target_type?: string
          p_target_value?: string
          p_user_id: string
        }
        Returns: {
          average_score: number
          completed_count: number
          total_count: number
        }[]
      }
      get_user_stats: {
        Args: {
          p_difficulty_level?: number
          p_playstyle?: string
          p_user_id: string
        }
        Returns: {
          aaa_count: number
          avg_score: number
          clear_count: number
          fail_count: number
          fc_count: number
          gfc_count: number
          life4_count: number
          mfc_count: number
          pfc_count: number
          total_count: number
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
  public: {
    Enums: {},
  },
} as const
