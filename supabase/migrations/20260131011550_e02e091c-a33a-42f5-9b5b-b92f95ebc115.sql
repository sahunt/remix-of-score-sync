-- Add score_floor column to user_goals for average score mode progress visualization
-- This stores the user's lowest matching score at goal creation time as a fixed floor
ALTER TABLE public.user_goals 
ADD COLUMN score_floor integer DEFAULT NULL;