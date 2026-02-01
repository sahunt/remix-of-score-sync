CREATE OR REPLACE FUNCTION public.get_user_stats(
  p_user_id UUID,
  p_playstyle TEXT DEFAULT 'SP',
  p_difficulty_level SMALLINT DEFAULT NULL
)
RETURNS TABLE(
  total_count BIGINT,
  mfc_count BIGINT,
  pfc_count BIGINT,
  gfc_count BIGINT,
  fc_count BIGINT,
  life4_count BIGINT,
  clear_count BIGINT,
  fail_count BIGINT,
  aaa_count BIGINT,
  avg_score BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE LOWER(us.halo) = 'mfc')::BIGINT as mfc_count,
    COUNT(*) FILTER (WHERE LOWER(us.halo) = 'pfc')::BIGINT as pfc_count,
    COUNT(*) FILTER (WHERE LOWER(us.halo) = 'gfc')::BIGINT as gfc_count,
    COUNT(*) FILTER (WHERE LOWER(us.halo) = 'fc')::BIGINT as fc_count,
    COUNT(*) FILTER (WHERE LOWER(us.halo) = 'life4')::BIGINT as life4_count,
    COUNT(*) FILTER (WHERE LOWER(us.halo) IN ('clear','life4','fc','gfc','pfc','mfc'))::BIGINT as clear_count,
    COUNT(*) FILTER (WHERE LOWER(us.halo) = 'fail')::BIGINT as fail_count,
    COUNT(*) FILTER (WHERE UPPER(us.rank) = 'AAA')::BIGINT as aaa_count,
    COALESCE((ROUND(AVG(us.score) / 10) * 10)::BIGINT, 0) as avg_score
  FROM public.user_scores us
  JOIN public.musicdb m ON us.musicdb_id = m.id
  WHERE us.user_id = p_user_id
    AND m.playstyle = p_playstyle
    AND m.deleted = false
    AND (p_difficulty_level IS NULL OR m.difficulty_level = p_difficulty_level);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;