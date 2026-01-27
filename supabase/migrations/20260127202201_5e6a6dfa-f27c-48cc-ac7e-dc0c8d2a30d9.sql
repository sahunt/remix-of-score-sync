-- Create user_filters table for saved filters
CREATE TABLE public.user_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rules JSONB NOT NULL DEFAULT '[]',
  match_mode TEXT NOT NULL DEFAULT 'all' 
    CHECK (match_mode IN ('all', 'any')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_filters ENABLE ROW LEVEL SECURITY;

-- Users can only access their own filters
CREATE POLICY "Users can view own filters"
  ON public.user_filters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own filters"
  ON public.user_filters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own filters"
  ON public.user_filters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own filters"
  ON public.user_filters FOR DELETE
  USING (auth.uid() = user_id);