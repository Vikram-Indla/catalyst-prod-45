-- Add story linkage to test cases.
-- Story-scoped test cases render inline in the story detail view. The linked
-- story key is a plain TEXT (matches ph_issues.issue_key / catalyst_issues.issue_key)
-- so both Jira-synced and Catalyst-native stories can host tests without a
-- separate join table.

ALTER TABLE public.tm_test_cases
  ADD COLUMN IF NOT EXISTS linked_story_key TEXT;

COMMENT ON COLUMN public.tm_test_cases.linked_story_key IS
  'Issue key of the story this test case covers (matches ph_issues.issue_key or catalyst_issues.issue_key). Nullable — legacy folder-scoped cases have no story link.';

CREATE INDEX IF NOT EXISTS idx_tm_test_cases_linked_story_key
  ON public.tm_test_cases(linked_story_key)
  WHERE linked_story_key IS NOT NULL;
