-- Allow inserting explicit IDs into musicdb (needed for data migration)
ALTER TABLE public.musicdb ALTER COLUMN id DROP IDENTITY IF EXISTS;

-- Drop the existing sequence-based default and allow explicit values
ALTER TABLE public.musicdb ALTER COLUMN id DROP DEFAULT;