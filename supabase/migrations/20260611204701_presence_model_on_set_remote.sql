-- Presence model rework: available/busy/offline -> on_set/remote/away/on_leave.
-- Only user_presence.state uses presence_state (other presence tables are text).
-- The view v_user_effective_status depends on the column, so it is dropped and
-- recreated around the type change (with its 'offline' fallback -> 'away').
--
-- Mapping: available -> on_set, busy -> on_set, offline -> away.
--          away / on_leave carry over unchanged. 'remote' is new (set by the app).

DROP VIEW IF EXISTS public.v_user_effective_status;

ALTER TABLE public.user_presence ALTER COLUMN state DROP DEFAULT;
ALTER TABLE public.user_presence ALTER COLUMN state TYPE text USING state::text;

UPDATE public.user_presence SET state = 'on_set' WHERE state IN ('available', 'busy');
UPDATE public.user_presence SET state = 'away'   WHERE state = 'offline';

DROP TYPE public.presence_state;
CREATE TYPE public.presence_state AS ENUM ('on_set', 'remote', 'away', 'on_leave');

ALTER TABLE public.user_presence
  ALTER COLUMN state TYPE public.presence_state USING state::public.presence_state;
ALTER TABLE public.user_presence
  ALTER COLUMN state SET DEFAULT 'away'::public.presence_state;

-- Recreate the effective-status view; stale/missing presence is now 'away'.
CREATE VIEW public.v_user_effective_status AS
  SELECT pr.id AS user_id,
    pr.full_name,
    pr.avatar_url,
    COALESCE(up.last_seen_at, now() - '1 year'::interval) AS last_seen_at,
    CASE
      WHEN av.id IS NOT NULL THEN 'on_leave'::text
      ELSE COALESCE(up.state::text, 'away'::text)
    END AS effective_state,
    av.kind AS leave_kind,
    av.ends_at AS leave_ends_at,
    (av.ends_at + '1 day'::interval)::date AS back_on,
    av.backup_user_id
  FROM profiles pr
    LEFT JOIN user_presence up ON up.user_id = pr.id
    LEFT JOIN LATERAL (
      SELECT ua.id, ua.user_id, ua.kind, ua.starts_at, ua.ends_at, ua.note,
             ua.backup_user_id, ua.created_at
      FROM user_availability ua
      WHERE ua.user_id = pr.id AND ua.starts_at <= now() AND ua.ends_at >= now()
      ORDER BY ua.starts_at DESC
      LIMIT 1
    ) av ON true;

-- Stale presence now resolves to 'away' (offline removed).
CREATE OR REPLACE FUNCTION public.clean_stale_presence()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  UPDATE user_presence
  SET state = 'away', updated_at = now()
  WHERE last_seen_at < now() - interval '5 minute'
    AND state <> 'away'
    AND (manual_until IS NULL OR manual_until < now());
$$;
