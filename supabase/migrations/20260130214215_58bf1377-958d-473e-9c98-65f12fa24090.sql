-- Add deleted column to musicdb table
-- Default is FALSE so all existing rows (active songs) will be marked as not deleted
ALTER TABLE public.musicdb 
ADD COLUMN deleted boolean NOT NULL DEFAULT FALSE;