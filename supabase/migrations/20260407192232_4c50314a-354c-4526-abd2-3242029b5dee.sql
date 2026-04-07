-- F-11: FK on tm_test_plans.release_id → releases(id)
-- ON DELETE SET NULL — deleting a release unlinks plans, does not delete them

ALTER TABLE tm_test_plans
  ADD CONSTRAINT fk_tm_test_plans_release_id
  FOREIGN KEY (release_id)
  REFERENCES releases(id)
  ON DELETE SET NULL;