-- Add portfolio_ask_date column to strategic_themes for independent date tracking
ALTER TABLE public.strategic_themes 
ADD COLUMN portfolio_ask_date date;