-- Temporarily drop the upload_id foreign key constraint to allow import
ALTER TABLE public.user_scores DROP CONSTRAINT IF EXISTS user_scores_upload_id_fkey;