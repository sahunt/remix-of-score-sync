-- Phase 1a: player_summary table
-- Pre-computed version of what buildPlayerProfile() + calculateTotalStats() produce at runtime

CREATE TABLE public.player_summary (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamptz DEFAULT now(),

  -- From calculateTotalStats() — counts across ALL levels 1-19
  total_scores integer DEFAULT 0,
  unique_songs integer DEFAULT 0,
  mfc_count integer DEFAULT 0,
  pfc_count integer DEFAULT 0,
  gfc_count integer DEFAULT 0,
  fc_count integer DEFAULT 0,
  life4_count integer DEFAULT 0,
  clear_count integer DEFAULT 0,
  fail_count integer DEFAULT 0,
  aaa_count integer DEFAULT 0,

  -- From buildPlayerProfile()
  player_stage text DEFAULT 'developing',  -- developing/intermediate/advanced/elite
  clear_ceiling integer DEFAULT 12,
  fc_ceiling integer DEFAULT 12,
  pfc_ceiling integer DEFAULT 12,
  mfc_ceiling integer DEFAULT 12,
  comfort_zone_low integer DEFAULT 12,
  comfort_zone_high integer DEFAULT 12,
  total_plays integer DEFAULT 0,
  level_12_plus_plays integer DEFAULT 0,

  -- From calculateProficiency() — stored as jsonb
  proficiencies jsonb DEFAULT '{}',
  -- Expected shape:
  -- { crossovers: {score, consistency}, footswitches: {score, consistency},
  --   stamina: {score, consistency}, speed: {score, consistency}, jacks: {score, consistency} }

  -- Recency
  last_score_date date,
  scores_last_30_days integer DEFAULT 0
);

ALTER TABLE public.player_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own summary"
  ON public.player_summary FOR SELECT
  USING (auth.uid() = user_id);

-- Phase 1b: player_level_stats table
-- Pre-computed version of calculateLevelMastery() + calculateLevelHaloStats()

CREATE TABLE public.player_level_stats (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  difficulty_level integer,
  played integer DEFAULT 0,
  avg_score integer DEFAULT 0,
  score_variance integer DEFAULT 0,
  clear_rate numeric(5,4) DEFAULT 0,
  fc_rate numeric(5,4) DEFAULT 0,
  pfc_rate numeric(5,4) DEFAULT 0,
  aaa_rate numeric(5,4) DEFAULT 0,
  mfc_count integer DEFAULT 0,
  pfc_count integer DEFAULT 0,
  gfc_count integer DEFAULT 0,
  fc_count integer DEFAULT 0,
  life4_count integer DEFAULT 0,
  clear_count integer DEFAULT 0,
  fail_count integer DEFAULT 0,
  aaa_count integer DEFAULT 0,
  mastery_tier text DEFAULT 'untouched',  -- crushing/solid/pushing/survival/untouched
  -- Catalog context
  total_charts_available integer DEFAULT 0,
  charts_played integer DEFAULT 0,
  charts_pfc integer DEFAULT 0,
  PRIMARY KEY (user_id, difficulty_level)
);

ALTER TABLE public.player_level_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own level stats"
  ON public.player_level_stats FOR SELECT
  USING (auth.uid() = user_id);

-- Phase 1c: song_recommendation_pool view
-- Replaces the full catalog dump — used for targeted queries

CREATE OR REPLACE VIEW public.song_recommendation_pool AS
SELECT
  m.id as musicdb_id,
  m.song_id,
  m.name as title,
  m.artist,
  m.difficulty_name,
  m.difficulty_level,
  m.eamuse_id,
  m.era,
  m.sanbai_rating,
  ca.crossovers,
  ca.full_crossovers,
  ca.footswitches,
  ca.jacks,
  ca.notes,
  ca.stream,
  ca.bpm,
  ca.peak_nps,
  ca.mines,
  ca.stop_count,
  (ca.song_id IS NOT NULL) as has_pattern_data
FROM public.musicdb m
LEFT JOIN public.chart_analysis ca
  ON m.song_id = ca.song_id
  AND UPPER(m.difficulty_name) = UPPER(ca.difficulty_name)
WHERE m.playstyle = 'SP' AND m.deleted = false;

-- Phase 1d: edi_usage_log table (Phase 5 prep, but cheap to create now)

CREATE TABLE public.edi_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  request_type text,
  prompt_tokens integer,
  response_tokens integer,
  active_skills text[],
  response_time_ms integer
);

ALTER TABLE public.edi_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own logs"
  ON public.edi_usage_log FOR SELECT
  USING (auth.uid() = user_id);
