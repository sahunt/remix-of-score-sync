-- Rename sanbai_song_id to eamuse_id in musicdb table
ALTER TABLE public.musicdb 
RENAME COLUMN sanbai_song_id TO eamuse_id;

-- Update the index name to match the new column name
DROP INDEX IF EXISTS idx_musicdb_sanbai_id;

CREATE INDEX idx_musicdb_eamuse_id 
ON public.musicdb(eamuse_id) WHERE eamuse_id IS NOT NULL;