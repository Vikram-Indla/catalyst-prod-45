
-- Drop all Requirement Assist tables (in dependency order)
DROP TABLE IF EXISTS ra_analytics_daily CASCADE;
DROP TABLE IF EXISTS ra_audit_log CASCADE;
DROP TABLE IF EXISTS ra_compliance_rules CASCADE;
DROP TABLE IF EXISTS ra_generated_items CASCADE;
DROP TABLE IF EXISTS ra_glossary_terms CASCADE;
DROP TABLE IF EXISTS ra_ai_settings CASCADE;
DROP TABLE IF EXISTS ra_templates CASCADE;
DROP TABLE IF EXISTS ra_generations CASCADE;
DROP TABLE IF EXISTS ra_user_roles CASCADE;

-- Drop RA functions
DROP FUNCTION IF EXISTS has_ra_role(ra_user_role) CASCADE;
DROP FUNCTION IF EXISTS has_ra_role_any(ra_user_role[]) CASCADE;
DROP FUNCTION IF EXISTS get_ra_user_role() CASCADE;

-- Drop RA enums
DROP TYPE IF EXISTS ra_generation_status CASCADE;
DROP TYPE IF EXISTS ra_item_type CASCADE;
DROP TYPE IF EXISTS ra_template_type CASCADE;
DROP TYPE IF EXISTS ra_user_role CASCADE;
DROP TYPE IF EXISTS ra_compliance_framework CASCADE;
