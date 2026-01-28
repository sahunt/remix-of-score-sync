-- Add unique constraint for upsert operations on user_scores
-- This allows the edge function to use ON CONFLICT (user_id, musicdb_id)
ALTER TABLE public.user_scores
ADD CONSTRAINT user_scores_user_id_musicdb_id_unique 
UNIQUE (user_id, musicdb_id);