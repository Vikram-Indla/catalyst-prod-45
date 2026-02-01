-- Drop all AQD Module database objects

-- First, drop views (they depend on tables)
DROP VIEW IF EXISTS public.aqd_carryover_items CASCADE;
DROP VIEW IF EXISTS public.aqd_week_performance CASCADE;
DROP VIEW IF EXISTS public.aqd_items_full CASCADE;
DROP VIEW IF EXISTS public.aqd_lists_summary CASCADE;

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS public.aqd_item_labels CASCADE;
DROP TABLE IF EXISTS public.aqd_item_notes CASCADE;
DROP TABLE IF EXISTS public.aqd_item_history CASCADE;
DROP TABLE IF EXISTS public.aqd_labels CASCADE;
DROP TABLE IF EXISTS public.aqd_items CASCADE;
DROP TABLE IF EXISTS public.aqd_weeks CASCADE;
DROP TABLE IF EXISTS public.aqd_lists CASCADE;