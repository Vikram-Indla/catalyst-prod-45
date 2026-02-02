-- ==============================================
-- Task¹⁰ (AQD) FULL CLEANUP MIGRATION
-- Drop all aqd_* tables and related objects
-- ==============================================

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS aqd_lists_full CASCADE;
DROP VIEW IF EXISTS aqd_weeks_full CASCADE;
DROP VIEW IF EXISTS aqd_items_full CASCADE;

-- Drop tables in dependency order (child tables first)
DROP TABLE IF EXISTS aqd_ai_suggestions CASCADE;
DROP TABLE IF EXISTS aqd_checklists CASCADE;
DROP TABLE IF EXISTS aqd_activity CASCADE;
DROP TABLE IF EXISTS aqd_item_notes CASCADE;
DROP TABLE IF EXISTS aqd_item_labels CASCADE;
DROP TABLE IF EXISTS aqd_item_history CASCADE;
DROP TABLE IF EXISTS aqd_items CASCADE;
DROP TABLE IF EXISTS aqd_labels CASCADE;
DROP TABLE IF EXISTS aqd_weeks CASCADE;
DROP TABLE IF EXISTS aqd_lists CASCADE;

-- Drop any remaining RPC functions
DROP FUNCTION IF EXISTS aqd_reorder_item(uuid, uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS aqd_checkout_week(uuid, uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS aqd_create_week_for_list(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_or_create_aqd_week(uuid) CASCADE;