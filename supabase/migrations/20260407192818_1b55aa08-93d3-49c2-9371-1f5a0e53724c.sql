-- F-12: UNIQUE constraint on tm_test_set_cases(test_set_id, test_case_id)
-- Prevents duplicate test case entries within the same test set

ALTER TABLE tm_test_set_cases
  ADD CONSTRAINT uq_tm_test_set_cases_set_case
  UNIQUE (test_set_id, test_case_id);