-- Remove legacy/duplicate test_type varchar column from tm_test_cases
-- The canonical type reference is case_type_id (UUID FK to tm_case_types)
ALTER TABLE public.tm_test_cases DROP COLUMN IF EXISTS test_type;