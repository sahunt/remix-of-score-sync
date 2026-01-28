-- Add new columns for full musicdb catalog support
ALTER TABLE public.musicdb 
ADD COLUMN IF NOT EXISTS series smallint,
ADD COLUMN IF NOT EXISTS eventno smallint,
ADD COLUMN IF NOT EXISTS title_yomi text,
ADD COLUMN IF NOT EXISTS name_romanized text,
ADD COLUMN IF NOT EXISTS sanbai_song_id text,
ADD COLUMN IF NOT EXISTS basename text;

-- Create unique constraint for UPSERT operations (drop if exists first to avoid errors)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'musicdb_unique_chart'
  ) THEN
    ALTER TABLE public.musicdb 
    ADD CONSTRAINT musicdb_unique_chart 
    UNIQUE (song_id, playstyle, difficulty_name);
  END IF;
END $$;

-- Index for Sanbai lookups
CREATE INDEX IF NOT EXISTS idx_musicdb_sanbai_id 
ON public.musicdb(sanbai_song_id) WHERE sanbai_song_id IS NOT NULL;

-- Index for name-based matching
CREATE INDEX IF NOT EXISTS idx_musicdb_name_match 
ON public.musicdb(name, playstyle, difficulty_name);