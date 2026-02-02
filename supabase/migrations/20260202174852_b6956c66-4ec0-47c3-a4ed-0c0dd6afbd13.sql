-- Drop the user_id foreign key constraint to allow import of historical scores
ALTER TABLE public.user_scores DROP CONSTRAINT IF EXISTS user_scores_user_id_fkey;