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
          difficulty_level: number | null
          difficulty_name: string | null
          eventno: number | null
          flare: number | null
          halo: string | null
          id: number
          judgement_offset: number | null
          name: string | null
          name_romanized: string | null
          playstyle: string | null
          rank: string | null
          sanbai_song_id: string | null
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
          difficulty_level?: number | null
          difficulty_name?: string | null
          eventno?: number | null
          flare?: number | null
          halo?: string | null
          id?: never
          judgement_offset?: number | null
          name?: string | null
          name_romanized?: string | null
          playstyle?: string | null
          rank?: string | null
          sanbai_song_id?: string | null
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
          difficulty_level?: number | null
          difficulty_name?: string | null
          eventno?: number | null
          flare?: number | null
          halo?: string | null
          id?: never
          judgement_offset?: number | null
          name?: string | null
          name_romanized?: string | null
          playstyle?: string | null
          rank?: string | null
          sanbai_song_id?: string | null
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
          target_type?: string
          target_value?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_scores: {
        Row: {
          chart_id: number | null
          created_at: string
          difficulty_level: number | null
          difficulty_name: string | null
          flare: number | null
          halo: string | null
          id: string
          judgement_offset: number | null
          musicdb_id: number | null
          playstyle: string | null
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
          difficulty_level?: number | null
          difficulty_name?: string | null
          flare?: number | null
          halo?: string | null
          id?: string
          judgement_offset?: number | null
          musicdb_id?: number | null
          playstyle?: string | null
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
          difficulty_level?: number | null
          difficulty_name?: string | null
          flare?: number | null
          halo?: string | null
          id?: string
          judgement_offset?: number | null
          musicdb_id?: number | null
          playstyle?: string | null
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
