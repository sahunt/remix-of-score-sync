-- Create song-jackets bucket for public jacket images
INSERT INTO storage.buckets (id, name, public)
VALUES ('song-jackets', 'song-jackets', true);

-- Allow public read access for song jackets
CREATE POLICY "Public read access for song jackets"
ON storage.objects FOR SELECT
USING (bucket_id = 'song-jackets');

-- Allow service role uploads (for edge function extraction)
CREATE POLICY "Service role can upload jackets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'song-jackets');