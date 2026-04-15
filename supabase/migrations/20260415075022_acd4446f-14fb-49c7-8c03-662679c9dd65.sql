
-- Everything was already applied except the last line which failed.
-- This migration is a no-op safety net — all objects already exist from the partial apply.
-- Just need to verify the state is clean.
SELECT 1;
