-- Create chart_analysis table for pattern metrics
CREATE TABLE public.chart_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id BIGINT NOT NULL,
  eamuse_id TEXT,
  title TEXT,
  artist TEXT,
  bpm NUMERIC,
  music_length NUMERIC,
  chart_length NUMERIC,
  stop_count INTEGER,
  difficulty_name TEXT NOT NULL,
  difficulty_level SMALLINT NOT NULL,
  crossovers INTEGER,
  half_crossovers INTEGER,
  full_crossovers INTEGER,
  footswitches INTEGER,
  up_footswitches INTEGER,
  down_footswitches INTEGER,
  jacks INTEGER,
  brackets INTEGER,
  doublesteps INTEGER,
  sideswitches INTEGER,
  notes INTEGER,
  taps_and_holds INTEGER,
  jumps INTEGER,
  holds INTEGER,
  rolls INTEGER,
  stream INTEGER,
  voltage INTEGER,
  air INTEGER,
  freeze_count INTEGER,
  chaos INTEGER,
  peak_nps NUMERIC,
  mean_nps NUMERIC,
  median_nps NUMERIC,
  min_nps NUMERIC,
  stdev_nps NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(song_id, difficulty_name)
);

-- RLS Policy (public read for chart analysis)
ALTER TABLE public.chart_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read chart_analysis" ON public.chart_analysis FOR SELECT USING (true);

-- Create edi_feedback table for user feedback on responses
CREATE TABLE public.edi_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message_content TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  rating TEXT NOT NULL,
  expected_response TEXT,
  conversation_context JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.edi_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own feedback" ON public.edi_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own feedback" ON public.edi_feedback FOR SELECT USING (auth.uid() = user_id);