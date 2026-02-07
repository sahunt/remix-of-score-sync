-- Phase 2: refresh_player_summary() and helper functions
-- Recomputes player_summary and player_level_stats from raw user_scores.
-- Must produce EXACTLY the same numbers as the TypeScript functions in edi-chat/index.ts.
--
-- IMPORTANT: user_scores does NOT have difficulty_level (it was dropped in migration
-- 20260201211958). All level lookups go through musicdb via musicdb_id join.

-- ================================================================
-- Helper: calc_proficiency()
-- Replicates calculateProficiency() from edi-chat/index.ts
-- Must be created BEFORE refresh_player_summary which calls it.
-- ================================================================

CREATE OR REPLACE FUNCTION public.calc_proficiency(
  p_user_id uuid,
  p_pfc_ceiling integer,
  p_metric text,       -- 'crossovers', 'footswitches', 'jacks', 'notes'
  p_high_threshold integer,
  p_low_threshold integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_high numeric;
  v_avg_low numeric;
  v_high_variance numeric;
  v_diff numeric;
  v_score integer;
  v_consistency integer;
  v_high_count integer;
  v_low_count integer;
BEGIN
  -- TS logic:
  -- 1. Filter chartAnalysis to pfcCeiling ±1 (difficulty_level from musicdb)
  -- 2. Split into high-skill (metric >= high_threshold) and low-skill (metric < low_threshold)
  --    In JS, null coerces to 0 for comparisons, so charts without pattern data
  --    have metric=0 which is < low_threshold (they go into low-skill bucket).
  -- 3. For each chart, look up user's scores and take max
  -- 4. Compute avg of max scores for each group
  -- 5. Compare: score = clamp(1-10, round(5 + diff/10000))
  --            consistency = clamp(1-10, round(10 - highVariance/5000))

  -- Uses LEFT JOIN chart_analysis to match TS behavior for charts without pattern data
  WITH high_skill_scores AS (
    SELECT max(us.score) as max_score
    FROM public.user_scores us
    INNER JOIN public.musicdb m ON m.id = us.musicdb_id
    LEFT JOIN public.chart_analysis ca
      ON m.song_id = ca.song_id AND UPPER(m.difficulty_name) = UPPER(ca.difficulty_name)
    WHERE us.user_id = p_user_id
      AND us.score IS NOT NULL
      AND m.difficulty_level >= p_pfc_ceiling - 1
      AND m.difficulty_level <= p_pfc_ceiling + 1
      AND CASE
        WHEN p_metric = 'crossovers' THEN coalesce(ca.crossovers, 0) >= p_high_threshold
        WHEN p_metric = 'footswitches' THEN coalesce(ca.footswitches, 0) >= p_high_threshold
        WHEN p_metric = 'jacks' THEN coalesce(ca.jacks, 0) >= p_high_threshold
        WHEN p_metric = 'notes' THEN coalesce(ca.notes, 0) >= p_high_threshold
        ELSE false
      END
    GROUP BY m.song_id, m.difficulty_name
  ),
  low_skill_scores AS (
    SELECT max(us.score) as max_score
    FROM public.user_scores us
    INNER JOIN public.musicdb m ON m.id = us.musicdb_id
    LEFT JOIN public.chart_analysis ca
      ON m.song_id = ca.song_id AND UPPER(m.difficulty_name) = UPPER(ca.difficulty_name)
    WHERE us.user_id = p_user_id
      AND us.score IS NOT NULL
      AND m.difficulty_level >= p_pfc_ceiling - 1
      AND m.difficulty_level <= p_pfc_ceiling + 1
      AND CASE
        WHEN p_metric = 'crossovers' THEN coalesce(ca.crossovers, 0) < p_low_threshold
        WHEN p_metric = 'footswitches' THEN coalesce(ca.footswitches, 0) < p_low_threshold
        WHEN p_metric = 'jacks' THEN coalesce(ca.jacks, 0) < p_low_threshold
        WHEN p_metric = 'notes' THEN coalesce(ca.notes, 0) < p_low_threshold
        ELSE false
      END
    GROUP BY m.song_id, m.difficulty_name
  )
  SELECT
    (SELECT count(*) FROM high_skill_scores),
    (SELECT count(*) FROM low_skill_scores),
    (SELECT avg(max_score) FROM high_skill_scores),
    (SELECT avg(max_score) FROM low_skill_scores),
    -- Population stddev of high scores (matching TS: sqrt(sum(sq_diff)/N))
    (SELECT
      CASE WHEN count(*) < 2 THEN 0
      ELSE sqrt(sum(power(max_score - sub_avg.a, 2)) / count(*))
      END
     FROM high_skill_scores,
     (SELECT avg(max_score) as a FROM high_skill_scores) sub_avg
    )
  INTO v_high_count, v_low_count, v_avg_high, v_avg_low, v_high_variance;

  -- If insufficient data, return default 5/5 (matching TS behavior)
  IF v_high_count = 0 OR v_low_count = 0 THEN
    RETURN jsonb_build_object('score', 5, 'consistency', 5);
  END IF;

  -- consistency = min(10, max(1, round(10 - highVariance / 5000)))
  v_consistency := least(10, greatest(1, round(10 - v_high_variance / 5000)));

  -- score = min(10, max(1, round(5 + diff / 10000)))
  v_diff := v_avg_high - v_avg_low;
  v_score := least(10, greatest(1, round(5 + v_diff / 10000)));

  RETURN jsonb_build_object('score', v_score, 'consistency', v_consistency);
END;
$$;

-- ================================================================
-- Helper: calc_speed_proficiency()
-- Replicates calculateSpeedProficiency() from edi-chat/index.ts
-- BPM >= 180 (fast) vs BPM < 160 (slow)
-- ================================================================

CREATE OR REPLACE FUNCTION public.calc_speed_proficiency(
  p_user_id uuid,
  p_pfc_ceiling integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_fast numeric;
  v_avg_slow numeric;
  v_fast_variance numeric;
  v_diff numeric;
  v_score integer;
  v_consistency integer;
  v_fast_count integer;
  v_slow_count integer;
BEGIN
  WITH fast_scores AS (
    SELECT max(us.score) as max_score
    FROM public.user_scores us
    INNER JOIN public.musicdb m ON m.id = us.musicdb_id
    LEFT JOIN public.chart_analysis ca
      ON m.song_id = ca.song_id AND UPPER(m.difficulty_name) = UPPER(ca.difficulty_name)
    WHERE us.user_id = p_user_id
      AND us.score IS NOT NULL
      AND m.difficulty_level >= p_pfc_ceiling - 1
      AND m.difficulty_level <= p_pfc_ceiling + 1
      AND ca.bpm IS NOT NULL AND ca.bpm >= 180
    GROUP BY m.song_id, m.difficulty_name
  ),
  slow_scores AS (
    SELECT max(us.score) as max_score
    FROM public.user_scores us
    INNER JOIN public.musicdb m ON m.id = us.musicdb_id
    LEFT JOIN public.chart_analysis ca
      ON m.song_id = ca.song_id AND UPPER(m.difficulty_name) = UPPER(ca.difficulty_name)
    WHERE us.user_id = p_user_id
      AND us.score IS NOT NULL
      AND m.difficulty_level >= p_pfc_ceiling - 1
      AND m.difficulty_level <= p_pfc_ceiling + 1
      AND ca.bpm IS NOT NULL AND ca.bpm < 160
    GROUP BY m.song_id, m.difficulty_name
  )
  SELECT
    (SELECT count(*) FROM fast_scores),
    (SELECT count(*) FROM slow_scores),
    (SELECT avg(max_score) FROM fast_scores),
    (SELECT avg(max_score) FROM slow_scores),
    (SELECT
      CASE WHEN count(*) < 2 THEN 0
      ELSE sqrt(sum(power(max_score - sub_avg.a, 2)) / count(*))
      END
     FROM fast_scores,
     (SELECT avg(max_score) as a FROM fast_scores) sub_avg
    )
  INTO v_fast_count, v_slow_count, v_avg_fast, v_avg_slow, v_fast_variance;

  IF v_fast_count = 0 OR v_slow_count = 0 THEN
    RETURN jsonb_build_object('score', 5, 'consistency', 5);
  END IF;

  v_consistency := least(10, greatest(1, round(10 - v_fast_variance / 5000)));
  v_diff := v_avg_fast - v_avg_slow;
  v_score := least(10, greatest(1, round(5 + v_diff / 10000)));

  RETURN jsonb_build_object('score', v_score, 'consistency', v_consistency);
END;
$$;

-- ================================================================
-- Main: refresh_player_summary()
-- Called after score imports to recompute all pre-computed data.
--
-- NOTE: user_scores does NOT have difficulty_level — it was dropped.
-- All level lookups join musicdb via us.musicdb_id = m.id.
-- ================================================================

CREATE OR REPLACE FUNCTION public.refresh_player_summary(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_scores integer := 0;
  v_mfc_count integer := 0;
  v_pfc_count integer := 0;
  v_gfc_count integer := 0;
  v_fc_count integer := 0;
  v_life4_count integer := 0;
  v_clear_count integer := 0;
  v_fail_count integer := 0;
  v_aaa_count integer := 0;
  v_total_plays integer := 0;
  v_level_12_plus_plays integer := 0;
  v_clear_ceiling integer := 12;
  v_fc_ceiling integer := 12;
  v_pfc_ceiling integer := 12;
  v_player_stage text := 'developing';
  v_comfort_ceiling integer := 12;
  v_proficiencies jsonb := '{}';
  v_last_score_date date;
  v_scores_last_30 integer := 0;
  v_lv17_pfc_rate numeric;
  v_prof_crossovers jsonb;
  v_prof_footswitches jsonb;
  v_prof_stamina jsonb;
  v_prof_speed jsonb;
  v_prof_jacks jsonb;
BEGIN
  -- ================================================================
  -- STEP 1: calculateTotalStats() equivalent
  -- Counts halos by EXACT match (not cumulative), across ALL levels.
  -- Must join musicdb for difficulty_level.
  -- ================================================================

  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE lower(us.halo) = 'mfc')::integer,
    count(*) FILTER (WHERE lower(us.halo) = 'pfc')::integer,
    count(*) FILTER (WHERE lower(us.halo) = 'gfc')::integer,
    count(*) FILTER (WHERE lower(us.halo) = 'fc')::integer,
    count(*) FILTER (WHERE lower(us.halo) = 'life4')::integer,
    count(*) FILTER (WHERE lower(us.halo) NOT IN ('fail', 'none', '') AND us.halo IS NOT NULL)::integer,
    count(*) FILTER (WHERE lower(us.halo) = 'fail')::integer,
    count(*) FILTER (WHERE upper(us.rank) = 'AAA')::integer,
    count(*) FILTER (WHERE m.difficulty_level >= 12)::integer
  INTO
    v_total_scores, v_mfc_count, v_pfc_count, v_gfc_count, v_fc_count,
    v_life4_count, v_clear_count, v_fail_count, v_aaa_count, v_level_12_plus_plays
  FROM public.user_scores us
  INNER JOIN public.musicdb m ON m.id = us.musicdb_id
  WHERE us.user_id = p_user_id;

  v_total_plays := v_total_scores;

  -- Recency stats
  SELECT max(us.created_at)::date INTO v_last_score_date
  FROM public.user_scores us WHERE us.user_id = p_user_id;

  SELECT count(*)::integer INTO v_scores_last_30
  FROM public.user_scores us
  WHERE us.user_id = p_user_id AND us.created_at >= (now() - interval '30 days');

  -- ================================================================
  -- STEP 2: calculateLevelMastery() + calculateLevelHaloStats()
  -- Populates player_level_stats from raw scores.
  -- All difficulty_level comes from musicdb join.
  -- ================================================================

  DELETE FROM public.player_level_stats WHERE user_id = p_user_id;

  INSERT INTO public.player_level_stats (
    user_id, difficulty_level, played, avg_score, score_variance,
    clear_rate, fc_rate, pfc_rate, aaa_rate,
    mfc_count, pfc_count, gfc_count, fc_count, life4_count, clear_count, fail_count, aaa_count,
    mastery_tier, total_charts_available, charts_played, charts_pfc
  )
  SELECT
    p_user_id,
    ld.difficulty_level, ld.played, ld.avg_score, ld.score_variance,
    ld.clear_rate, ld.fc_rate, ld.pfc_rate, ld.aaa_rate,
    ld.mfc_cnt, ld.pfc_cnt, ld.gfc_cnt, ld.fc_cnt,
    ld.life4_cnt, ld.clear_cnt, ld.fail_cnt, ld.aaa_cnt,
    CASE
      WHEN ld.pfc_rate >= 0.20 AND ld.aaa_rate >= 0.60 AND ld.score_variance < 150000 THEN 'crushing'
      WHEN ld.pfc_rate >= 0.10 OR ld.aaa_rate >= 0.50 THEN 'solid'
      WHEN ld.fc_rate >= 0.10 AND ld.aaa_rate >= 0.20 THEN 'pushing'
      WHEN ld.clear_rate >= 0.30 THEN 'survival'
      ELSE 'untouched'
    END,
    coalesce(cat.catalog_count, 0),
    ld.played,
    ld.pfc_cnt + ld.mfc_cnt
  FROM (
    SELECT
      m.difficulty_level,
      count(*)::integer as played,
      round(avg(us.score))::integer as avg_score,
      -- Population stddev (TS: sqrt(sum(sq_diff)/N), returns 0 for <2 scores)
      round(
        CASE WHEN count(*) < 2 THEN 0
        ELSE sqrt(sum(power(us.score - sub.level_avg, 2)) / count(*))
        END
      )::integer as score_variance,
      -- Exact halo counts
      count(*) FILTER (WHERE lower(us.halo) = 'mfc')::integer as mfc_cnt,
      count(*) FILTER (WHERE lower(us.halo) = 'pfc')::integer as pfc_cnt,
      count(*) FILTER (WHERE lower(us.halo) = 'gfc')::integer as gfc_cnt,
      count(*) FILTER (WHERE lower(us.halo) = 'fc')::integer as fc_cnt,
      count(*) FILTER (WHERE lower(us.halo) = 'life4')::integer as life4_cnt,
      count(*) FILTER (WHERE lower(us.halo) = 'clear')::integer as clear_cnt,
      count(*) FILTER (WHERE lower(us.halo) = 'fail')::integer as fail_cnt,
      count(*) FILTER (WHERE upper(us.rank) = 'AAA')::integer as aaa_cnt,
      -- Rates (TS calculateLevelMastery logic)
      count(*) FILTER (WHERE lower(us.halo) NOT IN ('fail', 'none', '')
                        AND us.halo IS NOT NULL)::numeric / count(*)::numeric as clear_rate,
      count(*) FILTER (WHERE lower(us.halo) IN ('fc', 'gfc', 'pfc', 'mfc'))::numeric
        / count(*)::numeric as fc_rate,
      count(*) FILTER (WHERE lower(us.halo) IN ('pfc', 'mfc'))::numeric
        / count(*)::numeric as pfc_rate,
      count(*) FILTER (WHERE upper(us.rank) = 'AAA')::numeric / count(*)::numeric as aaa_rate
    FROM public.user_scores us
    INNER JOIN public.musicdb m ON m.id = us.musicdb_id
    INNER JOIN (
      -- subquery for per-level average (needed for variance calc)
      SELECT m2.difficulty_level, avg(us2.score) as level_avg
      FROM public.user_scores us2
      INNER JOIN public.musicdb m2 ON m2.id = us2.musicdb_id
      WHERE us2.user_id = p_user_id AND us2.score IS NOT NULL
      GROUP BY m2.difficulty_level
    ) sub ON m.difficulty_level = sub.difficulty_level
    WHERE us.user_id = p_user_id AND us.score IS NOT NULL
    GROUP BY m.difficulty_level
  ) ld
  LEFT JOIN (
    SELECT difficulty_level, count(*)::integer as catalog_count
    FROM public.musicdb
    WHERE playstyle = 'SP' AND deleted = false
    GROUP BY difficulty_level
  ) cat ON cat.difficulty_level = ld.difficulty_level;

  -- Insert catalog-only rows (levels with no user scores)
  INSERT INTO public.player_level_stats (
    user_id, difficulty_level, played, total_charts_available, mastery_tier
  )
  SELECT p_user_id, m.difficulty_level, 0, count(*)::integer, 'untouched'
  FROM public.musicdb m
  WHERE m.playstyle = 'SP' AND m.deleted = false
    AND NOT EXISTS (
      SELECT 1 FROM public.player_level_stats pls
      WHERE pls.user_id = p_user_id AND pls.difficulty_level = m.difficulty_level
    )
  GROUP BY m.difficulty_level;

  -- ================================================================
  -- STEP 3: buildPlayerProfile() ceilings
  -- ================================================================

  SELECT coalesce(max(pls.difficulty_level), 12) INTO v_clear_ceiling
  FROM public.player_level_stats pls
  WHERE pls.user_id = p_user_id AND pls.difficulty_level >= 12
    AND pls.clear_rate > 0.3 AND pls.played >= 3;

  SELECT coalesce(max(pls.difficulty_level), 12) INTO v_fc_ceiling
  FROM public.player_level_stats pls
  WHERE pls.user_id = p_user_id AND pls.difficulty_level >= 12
    AND (pls.fc_count + pls.gfc_count + pls.pfc_count + pls.mfc_count) >= 3;

  SELECT coalesce(max(pls.difficulty_level), 12) INTO v_pfc_ceiling
  FROM public.player_level_stats pls
  WHERE pls.user_id = p_user_id AND pls.difficulty_level >= 12
    AND (pls.pfc_count + pls.mfc_count) >= 3;

  -- Player stage (TS logic):
  IF v_pfc_ceiling >= 18 THEN
    v_player_stage := 'elite';
  ELSE
    SELECT pls.pfc_rate INTO v_lv17_pfc_rate
    FROM public.player_level_stats pls
    WHERE pls.user_id = p_user_id AND pls.difficulty_level = 17;

    IF v_lv17_pfc_rate IS NOT NULL AND v_lv17_pfc_rate > 0.3 AND v_pfc_ceiling >= 17 THEN
      v_player_stage := 'elite';
    ELSIF v_pfc_ceiling >= 16 OR v_fc_ceiling >= 17 THEN
      v_player_stage := 'advanced';
    ELSIF v_pfc_ceiling >= 14 OR v_clear_ceiling >= 16 THEN
      v_player_stage := 'intermediate';
    ELSE
      v_player_stage := 'developing';
    END IF;
  END IF;

  -- Comfort ceiling: highest level with crushing/solid mastery
  SELECT coalesce(max(pls.difficulty_level), 12) INTO v_comfort_ceiling
  FROM public.player_level_stats pls
  WHERE pls.user_id = p_user_id AND pls.difficulty_level >= 12
    AND pls.mastery_tier IN ('crushing', 'solid');

  -- ================================================================
  -- STEP 4: Proficiencies (calls helper functions)
  -- ================================================================

  SELECT public.calc_proficiency(p_user_id, v_pfc_ceiling, 'crossovers', 15, 5) INTO v_prof_crossovers;
  SELECT public.calc_proficiency(p_user_id, v_pfc_ceiling, 'footswitches', 10, 3) INTO v_prof_footswitches;
  SELECT public.calc_proficiency(p_user_id, v_pfc_ceiling, 'notes', 400, 200) INTO v_prof_stamina;
  SELECT public.calc_speed_proficiency(p_user_id, v_pfc_ceiling) INTO v_prof_speed;
  SELECT public.calc_proficiency(p_user_id, v_pfc_ceiling, 'jacks', 20, 5) INTO v_prof_jacks;

  v_proficiencies := jsonb_build_object(
    'crossovers', v_prof_crossovers,
    'footswitches', v_prof_footswitches,
    'stamina', v_prof_stamina,
    'speed', v_prof_speed,
    'jacks', v_prof_jacks
  );

  -- ================================================================
  -- STEP 5: Upsert player_summary
  -- ================================================================

  INSERT INTO public.player_summary (
    user_id, updated_at,
    total_scores, unique_songs,
    mfc_count, pfc_count, gfc_count, fc_count, life4_count, clear_count, fail_count, aaa_count,
    player_stage, clear_ceiling, fc_ceiling, pfc_ceiling, mfc_ceiling,
    comfort_zone_low, comfort_zone_high,
    total_plays, level_12_plus_plays,
    proficiencies,
    last_score_date, scores_last_30_days
  )
  VALUES (
    p_user_id, now(),
    v_total_scores, v_total_scores,
    v_mfc_count, v_pfc_count, v_gfc_count, v_fc_count, v_life4_count, v_clear_count, v_fail_count, v_aaa_count,
    v_player_stage, v_clear_ceiling, v_fc_ceiling, v_pfc_ceiling, 12,
    v_comfort_ceiling, v_comfort_ceiling,
    v_total_plays, v_level_12_plus_plays,
    v_proficiencies,
    v_last_score_date, v_scores_last_30
  )
  ON CONFLICT (user_id) DO UPDATE SET
    updated_at = now(),
    total_scores = EXCLUDED.total_scores,
    unique_songs = EXCLUDED.unique_songs,
    mfc_count = EXCLUDED.mfc_count,
    pfc_count = EXCLUDED.pfc_count,
    gfc_count = EXCLUDED.gfc_count,
    fc_count = EXCLUDED.fc_count,
    life4_count = EXCLUDED.life4_count,
    clear_count = EXCLUDED.clear_count,
    fail_count = EXCLUDED.fail_count,
    aaa_count = EXCLUDED.aaa_count,
    player_stage = EXCLUDED.player_stage,
    clear_ceiling = EXCLUDED.clear_ceiling,
    fc_ceiling = EXCLUDED.fc_ceiling,
    pfc_ceiling = EXCLUDED.pfc_ceiling,
    mfc_ceiling = EXCLUDED.mfc_ceiling,
    comfort_zone_low = EXCLUDED.comfort_zone_low,
    comfort_zone_high = EXCLUDED.comfort_zone_high,
    total_plays = EXCLUDED.total_plays,
    level_12_plus_plays = EXCLUDED.level_12_plus_plays,
    proficiencies = EXCLUDED.proficiencies,
    last_score_date = EXCLUDED.last_score_date,
    scores_last_30_days = EXCLUDED.scores_last_30_days;

END;
$$;
