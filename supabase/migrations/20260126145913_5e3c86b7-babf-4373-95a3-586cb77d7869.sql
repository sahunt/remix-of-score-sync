-- Create musicdb table (canonical master catalog of DDR songs + charts)
CREATE TABLE public.musicdb (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chart_id BIGINT,
  song_id BIGINT NOT NULL,
  name TEXT,
  artist TEXT,
  bpm_max INTEGER,
  playstyle TEXT,
  difficulty_name TEXT,
  difficulty_level SMALLINT,
  score INTEGER,
  timestamp TIMESTAMPTZ,
  username TEXT,
  rank TEXT,
  flare INTEGER,
  halo TEXT,
  judgement_offset INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Create indexes for musicdb
CREATE INDEX musicdb_song_id_idx ON public.musicdb(song_id);
CREATE INDEX musicdb_playstyle_diff_idx ON public.musicdb(playstyle, difficulty_name, difficulty_level);

-- Create uploads table for tracking file uploads
CREATE TABLE public.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'manual_upload',
  file_name TEXT NOT NULL,
  file_mime_type TEXT,
  file_size_bytes INTEGER,
  raw_storage_path TEXT,
  parse_status TEXT NOT NULL DEFAULT 'pending' CHECK (parse_status IN ('pending', 'parsed', 'failed')),
  parse_error TEXT,
  parse_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_scores table for per-user imported results
CREATE TABLE public.user_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id UUID NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  musicdb_id BIGINT REFERENCES public.musicdb(id),
  chart_id BIGINT,
  song_id BIGINT NOT NULL,
  playstyle TEXT,
  difficulty_name TEXT,
  difficulty_level SMALLINT,
  score INTEGER,
  timestamp TIMESTAMPTZ,
  username TEXT,
  rank TEXT,
  flare INTEGER,
  halo TEXT,
  judgement_offset INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX uploads_user_created_idx ON public.uploads(user_id, created_at DESC);
CREATE INDEX user_scores_user_timestamp_idx ON public.user_scores(user_id, timestamp DESC);
CREATE INDEX user_scores_user_song_idx ON public.user_scores(user_id, song_id);
CREATE INDEX user_scores_user_musicdb_idx ON public.user_scores(user_id, musicdb_id);

-- Enable RLS on all tables
ALTER TABLE public.musicdb ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;

-- RLS policy for musicdb (read-only for authenticated users)
CREATE POLICY "Authenticated users can read musicdb"
  ON public.musicdb FOR SELECT
  TO authenticated
  USING (true);

-- RLS policies for uploads table
CREATE POLICY "Users can view their own uploads"
  ON public.uploads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own uploads"
  ON public.uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uploads"
  ON public.uploads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own uploads"
  ON public.uploads FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for user_scores table
CREATE POLICY "Users can view their own scores"
  ON public.user_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scores"
  ON public.user_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scores"
  ON public.user_scores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scores"
  ON public.user_scores FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for raw uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('score-uploads', 'score-uploads', false);

-- Storage policies for score-uploads bucket
CREATE POLICY "Users can upload their own score files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'score-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own score files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'score-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own score files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'score-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);