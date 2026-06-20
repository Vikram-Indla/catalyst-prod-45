-- Allow ph_projects.created_by to be null so user-delete can clear ownership
-- before auth.admin.deleteUser. Previously NOT NULL caused the pre-flight null-out
-- in the user-delete edge function to fail with a constraint violation.
ALTER TABLE ph_projects ALTER COLUMN created_by DROP NOT NULL;
