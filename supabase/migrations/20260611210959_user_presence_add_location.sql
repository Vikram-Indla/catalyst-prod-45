-- Optional coarse location (e.g. "Dubai, UAE · GMT+4") shown for remote users.
-- Captured client-side via the Geolocation API + reverse geocode when a user
-- sets their presence to 'remote'. Null for non-remote / undisclosed.
ALTER TABLE public.user_presence ADD COLUMN IF NOT EXISTS location text;
