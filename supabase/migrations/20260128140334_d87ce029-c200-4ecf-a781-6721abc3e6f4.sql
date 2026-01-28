-- Drop the old constraint and add new one with 'processing' included
ALTER TABLE public.uploads DROP CONSTRAINT IF EXISTS uploads_parse_status_check;

ALTER TABLE public.uploads ADD CONSTRAINT uploads_parse_status_check 
CHECK (parse_status = ANY (ARRAY['pending'::text, 'processing'::text, 'parsed'::text, 'failed'::text]));