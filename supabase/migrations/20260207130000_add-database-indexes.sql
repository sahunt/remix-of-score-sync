-- ============================================================================
-- Add missing database indexes and clean up obsolete ones
-- ============================================================================

-- 1. chart_analysis: JOIN from musicdb in refresh_player_summary
-- Pattern: ca.song_id = m.song_id AND UPPER(ca.difficulty_name) = UPPER(m.difficulty_name)
CREATE INDEX IF NOT EXISTS idx_chart_analysis_song_lookup
ON public.chart_analysis (song_id, UPPER(difficulty_name));

-- 2. chart_analysis: song_id lookups in getSongsByCriteria (WHERE song_id IN (...))
CREATE INDEX IF NOT EXISTS idx_chart_analysis_song_id
ON public.chart_analysis (song_id);

-- 3. user_goals: getUserGoals ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_user_goals_user_created
ON public.user_goals (user_id, created_at DESC);

-- ============================================================================
-- CLEANUP: Remove indexes referencing dropped columns
-- ============================================================================
-- These reference user_scores.difficulty_level and user_scores.playstyle,
-- both dropped in migration 20260201211958

DROP INDEX IF EXISTS public.idx_user_scores_level_filter;
DROP INDEX IF EXISTS public.idx_user_scores_halo_stats;
DROP INDEX IF EXISTS public.idx_user_scores_level_timestamp;
