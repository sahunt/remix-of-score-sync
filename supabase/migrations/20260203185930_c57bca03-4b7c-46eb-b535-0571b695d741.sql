-- Fix remaining chart_analysis columns that need to accept decimals
ALTER TABLE public.chart_analysis 
  ALTER COLUMN freeze_count TYPE NUMERIC USING freeze_count::NUMERIC;