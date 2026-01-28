-- Add source_type column to user_scores for tracking score origin
ALTER TABLE public.user_scores
ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'unknown';

-- Add comment for documentation
COMMENT ON COLUMN public.user_scores.source_type IS 'Score source: phaseii, sanbai, manual, or unknown';