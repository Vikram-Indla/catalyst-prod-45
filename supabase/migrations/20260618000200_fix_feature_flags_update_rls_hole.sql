-- feature_flags had "Admins can update feature flags" as UPDATE USING(true) WITH CHECK(true),
-- which OR-combines with the admin ALL policy and lets any authenticated user toggle flags.
-- Also a redundant duplicate SELECT policy. Remove both.
-- Keeps: "Anyone can view feature flags" (SELECT true) + "Admins can manage feature flags" (ALL has_role).
DROP POLICY IF EXISTS "Admins can update feature flags" ON feature_flags;
DROP POLICY IF EXISTS "Authenticated users can read feature flags" ON feature_flags;
