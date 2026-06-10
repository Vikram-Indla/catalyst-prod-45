-- =====================================================================
-- User Status Table — Emoji + Message per User
-- =====================================================================
-- Stores custom user status: emoji + message (max 50 chars).
-- Includes optional expiration for temporary statuses (away/lunch).
-- RLS: users can read all statuses; users can update/delete only their own.
-- Realtime: Supabase LISTEN/NOTIFY broadcasts on INSERT/UPDATE.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.ph_user_status (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL DEFAULT '🟢',  -- Emoji picker value
  message text NOT NULL DEFAULT '',   -- Max 50 chars enforced at app layer
  expires_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS: SELECT all (users need to see status of everyone)
-- UPDATE/DELETE only own record
CREATE POLICY "Users can read all status records" ON public.ph_user_status
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own status" ON public.ph_user_status
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own status" ON public.ph_user_status
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- INSERT policy: can only create status for themselves
CREATE POLICY "Users can insert their own status" ON public.ph_user_status
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Index on user_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_ph_user_status_user_id ON public.ph_user_status(user_id);

-- Index on expires_at for cleaning up expired statuses
CREATE INDEX IF NOT EXISTS idx_ph_user_status_expires_at ON public.ph_user_status(expires_at)
  WHERE expires_at IS NOT NULL;

-- Trigger to update updated_at on any change
CREATE OR REPLACE FUNCTION public.fn_user_status_update_timestamp()
  RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_user_status_timestamp
  BEFORE UPDATE ON public.ph_user_status
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_user_status_update_timestamp();

-- RPC: upsert status (used by app to set custom status)
CREATE OR REPLACE FUNCTION public.user_status_upsert(
  p_emoji text DEFAULT '🟢',
  p_message text DEFAULT '',
  p_expires_at timestamp with time zone DEFAULT NULL
)
  RETURNS public.ph_user_status
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  me uuid := auth.uid();
  result public.ph_user_status;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.ph_user_status (user_id, emoji, message, expires_at)
       VALUES (me, p_emoji, p_message, p_expires_at)
       ON CONFLICT (user_id) DO UPDATE
       SET emoji = EXCLUDED.emoji,
           message = EXCLUDED.message,
           expires_at = EXCLUDED.expires_at,
           updated_at = now()
       RETURNING * INTO result;

  RETURN result;
END;
$$;

-- RPC: clear status (remove emoji + message, keep record for history)
CREATE OR REPLACE FUNCTION public.user_status_clear()
  RETURNS public.ph_user_status
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  me uuid := auth.uid();
  result public.ph_user_status;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.ph_user_status
     SET emoji = '🟢',
         message = '',
         expires_at = NULL,
         updated_at = now()
   WHERE user_id = me
   RETURNING * INTO result;

  RETURN result;
END;
$$;

-- Realtime: enable INSERT/UPDATE/DELETE notifications on status changes
ALTER TABLE public.ph_user_status REPLICA IDENTITY FULL;
