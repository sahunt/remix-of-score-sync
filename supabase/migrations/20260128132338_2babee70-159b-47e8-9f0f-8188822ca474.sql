
-- Step 1: Delete duplicate scores, keeping only the best one for each user+chart combination
-- "Best" is determined by: highest score, then highest halo rank, then highest flare, then highest rank/grade
WITH ranked_scores AS (
  SELECT 
    id,
    user_id,
    musicdb_id,
    score,
    halo,
    flare,
    rank,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, musicdb_id
      ORDER BY 
        score DESC NULLS LAST,
        CASE LOWER(halo)
          WHEN 'mfc' THEN 6
          WHEN 'pfc' THEN 5
          WHEN 'gfc' THEN 4
          WHEN 'fc' THEN 3
          WHEN 'life4' THEN 2
          WHEN 'clear' THEN 1
          ELSE 0
        END DESC,
        flare DESC NULLS LAST,
        CASE UPPER(rank)
          WHEN 'AAA' THEN 16
          WHEN 'AA+' THEN 15
          WHEN 'AA' THEN 14
          WHEN 'AA-' THEN 13
          WHEN 'A+' THEN 12
          WHEN 'A' THEN 11
          WHEN 'A-' THEN 10
          WHEN 'B+' THEN 9
          WHEN 'B' THEN 8
          WHEN 'B-' THEN 7
          WHEN 'C+' THEN 6
          WHEN 'C' THEN 5
          WHEN 'C-' THEN 4
          WHEN 'D+' THEN 3
          WHEN 'D' THEN 2
          WHEN 'E' THEN 1
          ELSE 0
        END DESC,
        created_at DESC
    ) AS rn
  FROM user_scores
  WHERE musicdb_id IS NOT NULL
)
DELETE FROM user_scores
WHERE id IN (
  SELECT id FROM ranked_scores WHERE rn > 1
);

-- Step 2: Add unique constraint to prevent future duplicates
-- Each user can only have ONE score per chart (identified by musicdb_id)
CREATE UNIQUE INDEX IF NOT EXISTS user_scores_user_chart_unique 
ON user_scores (user_id, musicdb_id) 
WHERE musicdb_id IS NOT NULL;
