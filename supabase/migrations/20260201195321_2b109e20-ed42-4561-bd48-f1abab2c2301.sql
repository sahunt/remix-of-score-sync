-- Create a function to calculate goal progress server-side
-- This eliminates multiple client-side queries per goal

CREATE OR REPLACE FUNCTION public.calculate_goal_progress(
  p_user_id UUID,
  p_level_values INTEGER[] DEFAULT NULL,
  p_level_operator TEXT DEFAULT 'is',
  p_difficulty_values TEXT[] DEFAULT NULL,
  p_difficulty_operator TEXT DEFAULT 'is',
  p_target_type TEXT DEFAULT 'lamp',
  p_target_value TEXT DEFAULT 'clear'
)
RETURNS TABLE(
  completed_count BIGINT,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_target_halo_hierarchy TEXT[] := ARRAY['mfc', 'pfc', 'gfc', 'fc', 'life4', 'clear'];
  v_target_grade_hierarchy TEXT[] := ARRAY['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'E'];
  v_target_index INTEGER;
BEGIN
  -- Get total matching charts from musicdb
  SELECT COUNT(*)::BIGINT INTO total_count
  FROM public.musicdb m
  WHERE m.playstyle = 'SP'
    AND m.deleted = false
    AND m.difficulty_level IS NOT NULL
    -- Apply level filter
    AND (
      p_level_values IS NULL 
      OR array_length(p_level_values, 1) IS NULL
      OR (
        CASE p_level_operator
          WHEN 'is' THEN m.difficulty_level = ANY(p_level_values)
          WHEN 'is_not' THEN NOT (m.difficulty_level = ANY(p_level_values))
          WHEN 'is_between' THEN m.difficulty_level BETWEEN 
            LEAST(p_level_values[1], p_level_values[2]) 
            AND GREATEST(p_level_values[1], p_level_values[2])
          ELSE true
        END
      )
    )
    -- Apply difficulty filter
    AND (
      p_difficulty_values IS NULL
      OR array_length(p_difficulty_values, 1) IS NULL
      OR (
        CASE p_difficulty_operator
          WHEN 'is' THEN UPPER(m.difficulty_name) = ANY(p_difficulty_values)
          WHEN 'is_not' THEN NOT (UPPER(m.difficulty_name) = ANY(p_difficulty_values))
          ELSE true
        END
      )
    );

  -- Count completed scores based on target type
  CASE p_target_type
    WHEN 'lamp' THEN
      -- Find position in lamp hierarchy (lower = better)
      v_target_index := array_position(v_target_halo_hierarchy, LOWER(p_target_value));
      
      SELECT COUNT(DISTINCT us.musicdb_id)::BIGINT INTO completed_count
      FROM public.user_scores us
      JOIN public.musicdb m ON us.musicdb_id = m.id
      WHERE us.user_id = p_user_id
        AND us.playstyle = 'SP'
        AND m.deleted = false
        -- Apply level filter
        AND (
          p_level_values IS NULL 
          OR array_length(p_level_values, 1) IS NULL
          OR (
            CASE p_level_operator
              WHEN 'is' THEN us.difficulty_level = ANY(p_level_values)
              WHEN 'is_not' THEN NOT (us.difficulty_level = ANY(p_level_values))
              WHEN 'is_between' THEN us.difficulty_level BETWEEN 
                LEAST(p_level_values[1], p_level_values[2]) 
                AND GREATEST(p_level_values[1], p_level_values[2])
              ELSE true
            END
          )
        )
        -- Apply difficulty filter
        AND (
          p_difficulty_values IS NULL
          OR array_length(p_difficulty_values, 1) IS NULL
          OR (
            CASE p_difficulty_operator
              WHEN 'is' THEN UPPER(us.difficulty_name) = ANY(p_difficulty_values)
              WHEN 'is_not' THEN NOT (UPPER(us.difficulty_name) = ANY(p_difficulty_values))
              ELSE true
            END
          )
        )
        -- Check if lamp meets or exceeds target
        AND (
          v_target_index IS NULL 
          OR array_position(v_target_halo_hierarchy, LOWER(us.halo)) <= v_target_index
        );

    WHEN 'grade' THEN
      v_target_index := array_position(v_target_grade_hierarchy, UPPER(p_target_value));
      
      SELECT COUNT(DISTINCT us.musicdb_id)::BIGINT INTO completed_count
      FROM public.user_scores us
      JOIN public.musicdb m ON us.musicdb_id = m.id
      WHERE us.user_id = p_user_id
        AND us.playstyle = 'SP'
        AND m.deleted = false
        AND (
          p_level_values IS NULL 
          OR array_length(p_level_values, 1) IS NULL
          OR (
            CASE p_level_operator
              WHEN 'is' THEN us.difficulty_level = ANY(p_level_values)
              WHEN 'is_not' THEN NOT (us.difficulty_level = ANY(p_level_values))
              WHEN 'is_between' THEN us.difficulty_level BETWEEN 
                LEAST(p_level_values[1], p_level_values[2]) 
                AND GREATEST(p_level_values[1], p_level_values[2])
              ELSE true
            END
          )
        )
        AND (
          p_difficulty_values IS NULL
          OR array_length(p_difficulty_values, 1) IS NULL
          OR (
            CASE p_difficulty_operator
              WHEN 'is' THEN UPPER(us.difficulty_name) = ANY(p_difficulty_values)
              WHEN 'is_not' THEN NOT (UPPER(us.difficulty_name) = ANY(p_difficulty_values))
              ELSE true
            END
          )
        )
        AND (
          v_target_index IS NULL 
          OR array_position(v_target_grade_hierarchy, UPPER(us.rank)) <= v_target_index
        );

    WHEN 'flare' THEN
      SELECT COUNT(DISTINCT us.musicdb_id)::BIGINT INTO completed_count
      FROM public.user_scores us
      JOIN public.musicdb m ON us.musicdb_id = m.id
      WHERE us.user_id = p_user_id
        AND us.playstyle = 'SP'
        AND m.deleted = false
        AND (
          p_level_values IS NULL 
          OR array_length(p_level_values, 1) IS NULL
          OR (
            CASE p_level_operator
              WHEN 'is' THEN us.difficulty_level = ANY(p_level_values)
              WHEN 'is_not' THEN NOT (us.difficulty_level = ANY(p_level_values))
              WHEN 'is_between' THEN us.difficulty_level BETWEEN 
                LEAST(p_level_values[1], p_level_values[2]) 
                AND GREATEST(p_level_values[1], p_level_values[2])
              ELSE true
            END
          )
        )
        AND (
          p_difficulty_values IS NULL
          OR array_length(p_difficulty_values, 1) IS NULL
          OR (
            CASE p_difficulty_operator
              WHEN 'is' THEN UPPER(us.difficulty_name) = ANY(p_difficulty_values)
              WHEN 'is_not' THEN NOT (UPPER(us.difficulty_name) = ANY(p_difficulty_values))
              ELSE true
            END
          )
        )
        AND us.flare >= (CASE WHEN LOWER(p_target_value) = 'ex' THEN 10 ELSE p_target_value::INTEGER END);

    WHEN 'score' THEN
      SELECT COUNT(DISTINCT us.musicdb_id)::BIGINT INTO completed_count
      FROM public.user_scores us
      JOIN public.musicdb m ON us.musicdb_id = m.id
      WHERE us.user_id = p_user_id
        AND us.playstyle = 'SP'
        AND m.deleted = false
        AND (
          p_level_values IS NULL 
          OR array_length(p_level_values, 1) IS NULL
          OR (
            CASE p_level_operator
              WHEN 'is' THEN us.difficulty_level = ANY(p_level_values)
              WHEN 'is_not' THEN NOT (us.difficulty_level = ANY(p_level_values))
              WHEN 'is_between' THEN us.difficulty_level BETWEEN 
                LEAST(p_level_values[1], p_level_values[2]) 
                AND GREATEST(p_level_values[1], p_level_values[2])
              ELSE true
            END
          )
        )
        AND (
          p_difficulty_values IS NULL
          OR array_length(p_difficulty_values, 1) IS NULL
          OR (
            CASE p_difficulty_operator
              WHEN 'is' THEN UPPER(us.difficulty_name) = ANY(p_difficulty_values)
              WHEN 'is_not' THEN NOT (UPPER(us.difficulty_name) = ANY(p_difficulty_values))
              ELSE true
            END
          )
        )
        AND us.score >= p_target_value::INTEGER;

    ELSE
      completed_count := 0;
  END CASE;

  RETURN QUERY SELECT completed_count, total_count;
END;
$$;