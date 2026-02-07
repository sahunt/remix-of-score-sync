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
      chart_analysis: {
        Row: {
          air: number | null
          artist: string | null
          bpm: number | null
          brackets: number | null
          chaos: number | null
          chart_id: number | null
          chart_length: number | null
          created_at: string | null
          crossovers: number | null
          difficulty_level: number
          difficulty_name: string
          doublesteps: number | null
          down_footswitches: number | null
          eamuse_id: string | null
          footswitches: number | null
          freeze_count: number | null
          full_crossovers: number | null
          half_crossovers: number | null
          holds: number | null
          id: string
          jacks: number | null
          jumps: number | null
          mean_nps: number | null
          median_nps: number | null
          min_nps: number | null
          mines: number | null
          music_length: number | null
          notes: number | null
          peak_nps: number | null
          rolls: number | null
          sideswitches: number | null
          song_id: number
          stdev_nps: number | null
          stop_count: number | null
          stream: number | null
          taps_and_holds: number | null
          title: string | null
          up_footswitches: number | null
          voltage: number | null
        }
        Insert: {
          air?: number | null
          artist?: string | null
          bpm?: number | null
          brackets?: number | null
          chaos?: number | null
          chart_id?: number | null
          chart_length?: number | null
          created_at?: string | null
          crossovers?: number | null
          difficulty_level: number
          difficulty_name: string
          doublesteps?: number | null
          down_footswitches?: number | null
          eamuse_id?: string | null
          footswitches?: number | null
          freeze_count?: number | null
          full_crossovers?: number | null
          half_crossovers?: number | null
          holds?: number | null
          id?: string
          jacks?: number | null
          jumps?: number | null
          mean_nps?: number | null
          median_nps?: number | null
          min_nps?: number | null
          mines?: number | null
          music_length?: number | null
          notes?: number | null
          peak_nps?: number | null
          rolls?: number | null
          sideswitches?: number | null
          song_id: number
          stdev_nps?: number | null
          stop_count?: number | null
          stream?: number | null
          taps_and_holds?: number | null
          title?: string | null
          up_footswitches?: number | null
          voltage?: number | null
        }
        Update: {
          air?: number | null
          artist?: string | null
          bpm?: number | null
          brackets?: number | null
          chaos?: number | null
          chart_id?: number | null
          chart_length?: number | null
          created_at?: string | null
          crossovers?: number | null
          difficulty_level?: number
          difficulty_name?: string
          doublesteps?: number | null
          down_footswitches?: number | null
          eamuse_id?: string | null
          footswitches?: number | null
          freeze_count?: number | null
          full_crossovers?: number | null
          half_crossovers?: number | null
          holds?: number | null
          id?: string
          jacks?: number | null
          jumps?: number | null
          mean_nps?: number | null
          median_nps?: number | null
          min_nps?: number | null
          mines?: number | null
          music_length?: number | null
          notes?: number | null
          peak_nps?: number | null
          rolls?: number | null
          sideswitches?: number | null
          song_id?: number
          stdev_nps?: number | null
          stop_count?: number | null
          stream?: number | null
          taps_and_holds?: number | null
          title?: string | null
          up_footswitches?: number | null
          voltage?: number | null
        }
        Relationships: []
      }
      edi_feedback: {
        Row: {
          conversation_context: Json | null
          created_at: string | null
          expected_response: string | null
          id: string
          message_content: string
          rating: string
          user_id: string
          user_prompt: string
        }
        Insert: {
          conversation_context?: Json | null
          created_at?: string | null
          expected_response?: string | null
          id?: string
          message_content: string
          rating: string
          user_id: string
          user_prompt: string
        }
        Update: {
          conversation_context?: Json | null
          created_at?: string | null
          expected_response?: string | null
          id?: string
          message_content?: string
          rating?: string
          user_id?: string
          user_prompt?: string
        }
        Relationships: []
      }
      edi_usage_log: {
        Row: {
          active_skills: string[] | null
          cached_tokens: number
          created_at: string | null
          estimated_cost_usd: number | null
          id: string
          input_tokens: number | null
          model: string
          output_tokens: number | null
          query_preview: string | null
          request_type: string | null
          response_time_ms: number | null
          tool_rounds: number | null
          tools_called: string[] | null
          total_tokens: number
          user_id: string
        }
        Insert: {
          active_skills?: string[] | null
          cached_tokens?: number
          created_at?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          model?: string
          output_tokens?: number | null
          query_preview?: string | null
          request_type?: string | null
          response_time_ms?: number | null
          tool_rounds?: number | null
          tools_called?: string[] | null
          total_tokens?: number
          user_id: string
        }
        Update: {
          active_skills?: string[] | null
          cached_tokens?: number
          created_at?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          model?: string
          output_tokens?: number | null
          query_preview?: string | null
          request_type?: string | null
          response_time_ms?: number | null
          tool_rounds?: number | null
          tools_called?: string[] | null
          total_tokens?: number
          user_id?: string
        }
        Relationships: []
      }
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
          id: number
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
          id?: number
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
      player_level_stats: {
        Row: {
          aaa_count: number | null
          aaa_rate: number | null
          avg_score: number | null
          charts_pfc: number | null
          charts_played: number | null
          clear_count: number | null
          clear_rate: number | null
          difficulty_level: number
          fail_count: number | null
          fc_count: number | null
          fc_rate: number | null
          gfc_count: number | null
          life4_count: number | null
          mastery_tier: string | null
          mfc_count: number | null
          pfc_count: number | null
          pfc_rate: number | null
          played: number | null
          score_variance: number | null
          total_charts_available: number | null
          user_id: string
        }
        Insert: {
          aaa_count?: number | null
          aaa_rate?: number | null
          avg_score?: number | null
          charts_pfc?: number | null
          charts_played?: number | null
          clear_count?: number | null
          clear_rate?: number | null
          difficulty_level: number
          fail_count?: number | null
          fc_count?: number | null
          fc_rate?: number | null
          gfc_count?: number | null
          life4_count?: number | null
          mastery_tier?: string | null
          mfc_count?: number | null
          pfc_count?: number | null
          pfc_rate?: number | null
          played?: number | null
          score_variance?: number | null
          total_charts_available?: number | null
          user_id: string
        }
        Update: {
          aaa_count?: number | null
          aaa_rate?: number | null
          avg_score?: number | null
          charts_pfc?: number | null
          charts_played?: number | null
          clear_count?: number | null
          clear_rate?: number | null
          difficulty_level?: number
          fail_count?: number | null
          fc_count?: number | null
          fc_rate?: number | null
          gfc_count?: number | null
          life4_count?: number | null
          mastery_tier?: string | null
          mfc_count?: number | null
          pfc_count?: number | null
          pfc_rate?: number | null
          played?: number | null
          score_variance?: number | null
          total_charts_available?: number | null
          user_id?: string
        }
        Relationships: []
      }
      player_summary: {
        Row: {
          aaa_count: number | null
          clear_ceiling: number | null
          clear_count: number | null
          comfort_zone_high: number | null
          comfort_zone_low: number | null
          fail_count: number | null
          fc_ceiling: number | null
          fc_count: number | null
          gfc_count: number | null
          last_score_date: string | null
          level_12_plus_plays: number | null
          life4_count: number | null
          mfc_ceiling: number | null
          mfc_count: number | null
          pfc_ceiling: number | null
          pfc_count: number | null
          player_stage: string | null
          proficiencies: Json | null
          scores_last_30_days: number | null
          total_plays: number | null
          total_scores: number | null
          unique_songs: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aaa_count?: number | null
          clear_ceiling?: number | null
          clear_count?: number | null
          comfort_zone_high?: number | null
          comfort_zone_low?: number | null
          fail_count?: number | null
          fc_ceiling?: number | null
          fc_count?: number | null
          gfc_count?: number | null
          last_score_date?: string | null
          level_12_plus_plays?: number | null
          life4_count?: number | null
          mfc_ceiling?: number | null
          mfc_count?: number | null
          pfc_ceiling?: number | null
          pfc_count?: number | null
          player_stage?: string | null
          proficiencies?: Json | null
          scores_last_30_days?: number | null
          total_plays?: number | null
          total_scores?: number | null
          unique_songs?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aaa_count?: number | null
          clear_ceiling?: number | null
          clear_count?: number | null
          comfort_zone_high?: number | null
          comfort_zone_low?: number | null
          fail_count?: number | null
          fc_ceiling?: number | null
          fc_count?: number | null
          gfc_count?: number | null
          last_score_date?: string | null
          level_12_plus_plays?: number | null
          life4_count?: number | null
          mfc_ceiling?: number | null
          mfc_count?: number | null
          pfc_ceiling?: number | null
          pfc_count?: number | null
          player_stage?: string | null
          proficiencies?: Json | null
          scores_last_30_days?: number | null
          total_plays?: number | null
          total_scores?: number | null
          unique_songs?: number | null
          updated_at?: string | null
          user_id?: string
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
          has_access: boolean | null
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
          has_access?: boolean | null
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
          has_access?: boolean | null
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
            foreignKeyName: "user_scores_musicdb_id_fkey"
            columns: ["musicdb_id"]
            isOneToOne: false
            referencedRelation: "song_recommendation_pool"
            referencedColumns: ["musicdb_id"]
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
      song_recommendation_pool: {
        Row: {
          artist: string | null
          bpm: number | null
          crossovers: number | null
          difficulty_level: number | null
          difficulty_name: string | null
          eamuse_id: string | null
          era: number | null
          footswitches: number | null
          full_crossovers: number | null
          has_pattern_data: boolean | null
          jacks: number | null
          mines: number | null
          musicdb_id: number | null
          notes: number | null
          peak_nps: number | null
          sanbai_rating: number | null
          song_id: number | null
          stop_count: number | null
          stream: number | null
          title: string | null
        }
        Relationships: []
      }
      user_current_month_usage: {
        Row: {
          request_count: number | null
          total_cost_usd: number | null
          total_input_tokens: number | null
          total_output_tokens: number | null
          total_tokens: number | null
          user_id: string | null
        }
        Relationships: []
      }
      user_daily_usage: {
        Row: {
          request_count: number | null
          total_cached_tokens: number | null
          total_cost_usd: number | null
          total_input_tokens: number | null
          total_output_tokens: number | null
          total_tokens: number | null
          usage_date: string | null
          user_id: string | null
        }
        Relationships: []
      }
      user_monthly_usage: {
        Row: {
          request_count: number | null
          total_cached_tokens: number | null
          total_cost_usd: number | null
          total_input_tokens: number | null
          total_output_tokens: number | null
          total_tokens: number | null
          usage_month: string | null
          user_id: string | null
        }
        Relationships: []
      }
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
      calc_proficiency: {
        Args: {
          p_high_threshold: number
          p_low_threshold: number
          p_metric: string
          p_pfc_ceiling: number
          p_user_id: string
        }
        Returns: Json
      }
      calc_speed_proficiency: {
        Args: { p_pfc_ceiling: number; p_user_id: string }
        Returns: Json
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
      check_user_ai_quota: {
        Args: {
          p_daily_request_limit?: number
          p_monthly_token_limit?: number
          p_user_id: string
        }
        Returns: {
          daily_requests_remaining: number
          daily_requests_used: number
          monthly_tokens_remaining: number
          monthly_tokens_used: number
          within_daily_limit: boolean
          within_monthly_limit: boolean
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
      refresh_player_summary: {
        Args: { p_user_id: string }
        Returns: undefined
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
