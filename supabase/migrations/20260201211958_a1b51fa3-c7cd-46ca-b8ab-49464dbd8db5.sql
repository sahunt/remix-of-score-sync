-- Drop redundant static metadata columns from user_scores
-- These fields should always come from musicdb via the musicdb_id relation (SINGLE SOURCE OF TRUTH)
-- Keeping chart_id and song_id as they can serve as reference/lookup fields

ALTER TABLE public.user_scores DROP COLUMN IF EXISTS difficulty_level;
ALTER TABLE public.user_scores DROP COLUMN IF EXISTS difficulty_name;
ALTER TABLE public.user_scores DROP COLUMN IF EXISTS playstyle;