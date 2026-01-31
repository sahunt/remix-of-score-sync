CREATE OR REPLACE FUNCTION bulk_update_romanized_titles(
  updates JSONB
)
RETURNS TABLE(updated_count INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE musicdb m
  SET name_romanized = (u->>'romanized_title')
  FROM jsonb_array_elements(updates) AS u
  WHERE m.eamuse_id = (u->>'eamuse_id');
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN QUERY SELECT updated_count;
END;
$$;