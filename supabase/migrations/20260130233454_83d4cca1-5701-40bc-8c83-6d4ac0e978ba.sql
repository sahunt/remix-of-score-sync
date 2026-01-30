-- Add composite index for efficient level-based filtering
-- This dramatically speeds up queries like "show me all Level 14 scores"
CREATE INDEX IF NOT EXISTS idx_user_scores_level_filter 
ON public.user_scores (user_id, playstyle, difficulty_level);