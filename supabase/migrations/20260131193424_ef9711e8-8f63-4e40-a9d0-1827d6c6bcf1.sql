-- 1. Create song_bias table for master bias values
CREATE TABLE public.song_bias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id BIGINT NOT NULL UNIQUE,
  eamuse_id TEXT,
  bias_ms NUMERIC(6,2) NOT NULL,
  confidence SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index on eamuse_id for faster lookups during import
CREATE INDEX idx_song_bias_eamuse_id ON public.song_bias(eamuse_id);

-- Enable RLS but allow all authenticated users to read
ALTER TABLE public.song_bias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read song_bias"
  ON public.song_bias
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Create user_song_offsets table for user overrides
CREATE TABLE public.user_song_offsets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  song_id BIGINT NOT NULL,
  custom_bias_ms NUMERIC(6,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, song_id)
);

-- Enable RLS
ALTER TABLE public.user_song_offsets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own offsets"
  ON public.user_song_offsets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own offsets"
  ON public.user_song_offsets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own offsets"
  ON public.user_song_offsets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own offsets"
  ON public.user_song_offsets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Add reference_song_id to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN reference_song_id BIGINT;

-- 4. Create triggers for updated_at on new tables
CREATE TRIGGER update_song_bias_updated_at
  BEFORE UPDATE ON public.song_bias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_song_offsets_updated_at
  BEFORE UPDATE ON public.user_song_offsets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();