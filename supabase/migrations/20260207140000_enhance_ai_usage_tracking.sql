-- ============================================================================
-- Enhance edi_usage_log with full token tracking, cost attribution, and views
-- The base table was created in migration 20260207120000 with minimal columns.
-- ============================================================================

-- Add missing columns to existing edi_usage_log table
ALTER TABLE public.edi_usage_log
  ADD COLUMN IF NOT EXISTS model text NOT NULL DEFAULT 'gemini-3-flash-preview',
  ADD COLUMN IF NOT EXISTS total_tokens integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cached_tokens integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_cost_usd decimal(10, 6) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS query_preview text,
  ADD COLUMN IF NOT EXISTS tools_called text[],
  ADD COLUMN IF NOT EXISTS tool_rounds integer DEFAULT 1;

-- Rename columns for consistency (prompt_tokens → input_tokens, response_tokens → output_tokens)
ALTER TABLE public.edi_usage_log
  RENAME COLUMN prompt_tokens TO input_tokens;
ALTER TABLE public.edi_usage_log
  RENAME COLUMN response_tokens TO output_tokens;

-- Set NOT NULL with defaults on renamed columns
ALTER TABLE public.edi_usage_log
  ALTER COLUMN input_tokens SET DEFAULT 0,
  ALTER COLUMN output_tokens SET DEFAULT 0;

-- Make user_id NOT NULL
ALTER TABLE public.edi_usage_log
  ALTER COLUMN user_id SET NOT NULL;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON public.edi_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON public.edi_usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON public.edi_usage_log(user_id, created_at);

-- Service role insert policy
CREATE POLICY "Service role can insert" ON public.edi_usage_log
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- AGGREGATION VIEWS
-- ============================================================================

-- Daily usage per user
CREATE OR REPLACE VIEW public.user_daily_usage AS
SELECT
  user_id,
  DATE(created_at) as usage_date,
  COUNT(*) as request_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(cached_tokens) as total_cached_tokens,
  SUM(estimated_cost_usd) as total_cost_usd
FROM public.edi_usage_log
GROUP BY user_id, DATE(created_at);

-- Monthly usage per user
CREATE OR REPLACE VIEW public.user_monthly_usage AS
SELECT
  user_id,
  DATE_TRUNC('month', created_at) as usage_month,
  COUNT(*) as request_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(cached_tokens) as total_cached_tokens,
  SUM(estimated_cost_usd) as total_cost_usd
FROM public.edi_usage_log
GROUP BY user_id, DATE_TRUNC('month', created_at);

-- Current month usage (for limit checking)
CREATE OR REPLACE VIEW public.user_current_month_usage AS
SELECT
  user_id,
  COUNT(*) as request_count,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(estimated_cost_usd) as total_cost_usd
FROM public.edi_usage_log
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY user_id;

-- ============================================================================
-- HELPER FUNCTION: Check if user is within limits
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_user_ai_quota(
  p_user_id uuid,
  p_monthly_token_limit integer DEFAULT 500000,
  p_daily_request_limit integer DEFAULT 100
)
RETURNS TABLE (
  within_monthly_limit boolean,
  within_daily_limit boolean,
  monthly_tokens_used integer,
  monthly_tokens_remaining integer,
  daily_requests_used integer,
  daily_requests_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH monthly AS (
    SELECT COALESCE(SUM(total_tokens), 0)::integer as tokens
    FROM public.edi_usage_log
    WHERE user_id = p_user_id
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
  ),
  daily AS (
    SELECT COUNT(*)::integer as requests
    FROM public.edi_usage_log
    WHERE user_id = p_user_id
      AND created_at >= CURRENT_DATE
  )
  SELECT
    (monthly.tokens < p_monthly_token_limit),
    (daily.requests < p_daily_request_limit),
    monthly.tokens,
    GREATEST(0, p_monthly_token_limit - monthly.tokens),
    daily.requests,
    GREATEST(0, p_daily_request_limit - daily.requests)
  FROM monthly, daily;
END;
$$;
