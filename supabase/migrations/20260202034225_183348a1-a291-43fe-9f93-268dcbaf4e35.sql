-- Pre-Scale Foundation Migration
-- Adds indexes and constraints to ensure data integrity at scale

-- 1. Add covering index for stats aggregation (MFC/PFC/AAA counts)
-- This prevents full table scans when calculating user statistics
CREATE INDEX IF NOT EXISTS idx_user_scores_stats_covering 
ON public.user_scores (user_id, musicdb_id, halo, rank, score);

-- 2. Add partial index for SP playstyle (excludes DP charts from index)
-- All current queries filter by SP, making this highly effective
CREATE INDEX IF NOT EXISTS idx_musicdb_sp_charts 
ON public.musicdb (id, difficulty_level, deleted)
WHERE playstyle = 'SP';

-- 3. Add default timestamp for new scores (prevents future NULL timestamps)
ALTER TABLE public.user_scores 
ALTER COLUMN timestamp SET DEFAULT now();

-- 4. Add NOT NULL constraint to musicdb_id (orphan scores verified as 0)
-- This enforces referential integrity at the database level
ALTER TABLE public.user_scores 
ALTER COLUMN musicdb_id SET NOT NULL;