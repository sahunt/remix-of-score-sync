-- Add era column to musicdb
ALTER TABLE musicdb ADD COLUMN era SMALLINT;

-- Create bulk update function for era values
CREATE OR REPLACE FUNCTION bulk_update_era(updates JSONB)
RETURNS TABLE(updated_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE musicdb m
  SET era = (u->>'era')::SMALLINT
  FROM jsonb_array_elements(updates) AS u
  WHERE m.eamuse_id = (u->>'eamuse_id');
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN QUERY SELECT updated_count;
END;
$$;