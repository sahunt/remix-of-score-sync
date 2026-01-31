-- Add sanbai_rating column to musicdb table
ALTER TABLE public.musicdb 
ADD COLUMN sanbai_rating DECIMAL(5,2);

COMMENT ON COLUMN public.musicdb.sanbai_rating IS 
  'Difficulty rating from Sanbai website, ranges from 1.00 to 19.70';