-- Add mines column to chart_analysis table
ALTER TABLE public.chart_analysis
ADD COLUMN IF NOT EXISTS mines integer DEFAULT NULL;