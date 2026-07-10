-- CAT-STRATA-CLOSEOUT-20260710-001 · W3a — in-app notifications engine (DB layer)
--
-- STRATA had zero notification layer: pending approvals, assigned decisions/actions,
-- opened blockers and benefit-validation requests alerted no one. This migration adds
-- the data + emission spine; the admin section and the bell/inbox surface come in W3b.
--
-- Design:
--   strata_notification_rules — admin-governed on/off switch per event type (envelope
--     columns for parity with the other governed config; toggled via an admin RPC,
--     seeded 'approved' + enabled).
--   strata_notifications — per-user inbox rows; a user reads/updates only their own.
--   strata_notify(...) — SECURITY DEFINER emit helper; no-ops when the event's rule is
--     disabled and de-dups against an existing UNREAD row for the same user+event+entity.
--   Emission points: entity AFTER-triggers (decisions, actions, dependencies,
--     benefit_values) + one augmentation of strata_submit_record (covers all 12 governed
--     config tables' draft→pending_approval in a single place, fanned out to approvers).
-- In-app channel only (email/Slack are out of scope, per Plan Lock).

-- ── Tables ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.strata_notification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  audience text NOT NULL,            -- 'role:strategy_office' | 'owner' | 'validator' (documentary)
  channel text NOT NULL DEFAULT 'in_app' CHECK (channel = 'in_app'),
  enabled boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('draft','pending_approval','approved','retired','superseded')),
  effective_from timestamptz DEFAULT now(),
  effective_to timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  change_reason text,
  supersedes_id uuid REFERENCES public.strata_notification_rules(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.strata_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  entity_table text,
  entity_id uuid,
  title text NOT NULL,
  body text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS strata_notifications_user_unread_idx
  ON public.strata_notifications (user_id, read_at, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.strata_notification_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS strata_notification_rules_select ON public.strata_notification_rules;
CREATE POLICY strata_notification_rules_select ON public.strata_notification_rules FOR SELECT
  USING (public.current_user_is_approved());
-- No client write policy: rules change only via strata_set_notification_rule (admin RPC).

ALTER TABLE public.strata_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS strata_notifications_own_select ON public.strata_notifications;
CREATE POLICY strata_notifications_own_select ON public.strata_notifications FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS strata_notifications_own_update ON public.strata_notifications;
CREATE POLICY strata_notifications_own_update ON public.strata_notifications FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- No client INSERT policy: rows are created only by the SECURITY DEFINER emit helper.

-- ── Emit helper ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.strata_notify(
  p_user uuid, p_event_type text, p_entity_table text, p_entity_id uuid,
  p_title text, p_body text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_user IS NULL THEN RETURN; END IF;
  -- Respect the admin on/off switch (missing rule = silent, fail-safe).
  IF NOT EXISTS (
    SELECT 1 FROM public.strata_notification_rules
    WHERE event_type = p_event_type AND enabled AND status = 'approved'
  ) THEN
    RETURN;
  END IF;
  -- De-dup: never stack a second UNREAD row for the same user+event+entity.
  IF EXISTS (
    SELECT 1 FROM public.strata_notifications
    WHERE user_id = p_user AND event_type = p_event_type
      AND entity_id IS NOT DISTINCT FROM p_entity_id AND read_at IS NULL
  ) THEN
    RETURN;
  END IF;
  INSERT INTO public.strata_notifications (user_id, event_type, entity_table, entity_id, title, body)
  VALUES (p_user, p_event_type, p_entity_table, p_entity_id, p_title, p_body);
END;
$$;

-- ── Entity triggers ───────────────────────────────────────────────────────────
-- Decisions: notify the owner on assignment (insert or owner change).
CREATE OR REPLACE FUNCTION public.strata_tg_notify_decision() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.owner_id IS DISTINCT FROM OLD.owner_id)
     AND NEW.owner_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000') THEN
    PERFORM public.strata_notify(
      NEW.owner_id, 'decision_assigned', 'strata_decisions', NEW.id,
      format('You own decision %s', NEW.decision_key),
      NEW.title);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS strata_notify_decision ON public.strata_decisions;
CREATE TRIGGER strata_notify_decision AFTER INSERT OR UPDATE OF owner_id ON public.strata_decisions
  FOR EACH ROW EXECUTE FUNCTION public.strata_tg_notify_decision();

-- Actions: notify owner on assignment; flag overdue on write (this slice — no scheduler).
CREATE OR REPLACE FUNCTION public.strata_tg_notify_action() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL
     AND NEW.owner_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000') THEN
    IF TG_OP = 'INSERT' OR NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      PERFORM public.strata_notify(
        NEW.owner_id, 'action_assigned', 'strata_actions', NEW.id,
        format('Action %s assigned to you', NEW.action_key), NEW.title);
    END IF;
    IF NEW.due_date IS NOT NULL AND NEW.due_date < current_date
       AND NEW.status IN ('open','in_progress') THEN
      PERFORM public.strata_notify(
        NEW.owner_id, 'action_overdue', 'strata_actions', NEW.id,
        format('Action %s is overdue', NEW.action_key),
        format('Due %s', to_char(NEW.due_date, 'DD Mon YYYY')));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS strata_notify_action ON public.strata_actions;
CREATE TRIGGER strata_notify_action AFTER INSERT OR UPDATE ON public.strata_actions
  FOR EACH ROW EXECUTE FUNCTION public.strata_tg_notify_action();

-- Dependencies: notify the owner when a blocker opens / stays blocking.
CREATE OR REPLACE FUNCTION public.strata_tg_notify_blocker() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_blocker AND NEW.status IN ('open','at_risk','blocked') AND NEW.owner_id IS NOT NULL
     AND (TG_OP = 'INSERT'
          OR OLD.is_blocker IS DISTINCT FROM NEW.is_blocker
          OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.strata_notify(
      NEW.owner_id, 'blocker_opened', 'strata_dependencies', NEW.id,
      format('Blocker: %s', COALESCE(NEW.name, 'dependency')),
      NEW.impact);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS strata_notify_blocker ON public.strata_dependencies;
CREATE TRIGGER strata_notify_blocker AFTER INSERT OR UPDATE ON public.strata_dependencies
  FOR EACH ROW EXECUTE FUNCTION public.strata_tg_notify_blocker();

-- Benefit values: notify the benefit's validator when a value is submitted for validation.
CREATE OR REPLACE FUNCTION public.strata_tg_notify_benefit_value() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_validator uuid; v_name text;
BEGIN
  IF NEW.validation_status = 'pending' THEN
    SELECT validator_id, name INTO v_validator, v_name FROM public.strata_benefits WHERE id = NEW.benefit_id;
    IF v_validator IS NOT NULL
       AND v_validator <> COALESCE(NEW.submitted_by, '00000000-0000-0000-0000-000000000000') THEN
      PERFORM public.strata_notify(
        v_validator, 'benefit_validation_requested', 'strata_benefit_values', NEW.id,
        format('Validate %s value', labelize_noop(NEW.value_kind)),
        COALESCE(v_name, 'benefit'));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS strata_notify_benefit_value ON public.strata_benefit_values;
CREATE TRIGGER strata_notify_benefit_value AFTER INSERT OR UPDATE OF validation_status ON public.strata_benefit_values
  FOR EACH ROW EXECUTE FUNCTION public.strata_tg_notify_benefit_value();

-- Tiny inline labelizer so the trigger has no UI dependency (value_kind → Title Case).
CREATE OR REPLACE FUNCTION public.labelize_noop(p text) RETURNS text
  LANGUAGE sql IMMUTABLE AS $$ SELECT initcap(replace(COALESCE(p,''), '_', ' ')) $$;

-- ── Config approval fan-out: augment strata_submit_record (verbatim + notify) ──
CREATE OR REPLACE FUNCTION public.strata_submit_record(p_table text, p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur_status text; cur_creator uuid;
BEGIN
  IF NOT (p_table = ANY (public.strata_governed_tables())) THEN
    RAISE EXCEPTION 'strata_submit_record: % is not a governed table', p_table;
  END IF;
  EXECUTE format('SELECT status, created_by FROM public.%I WHERE id = $1', p_table)
    INTO cur_status, cur_creator USING p_id;
  IF cur_status IS NULL THEN RAISE EXCEPTION 'record not found'; END IF;
  IF cur_status <> 'draft' THEN RAISE EXCEPTION 'only draft records can be submitted (current: %)', cur_status; END IF;
  IF cur_creator IS DISTINCT FROM auth.uid() AND NOT public.strata_is_admin() THEN
    RAISE EXCEPTION 'only the creator (or an admin) may submit a draft';
  END IF;
  EXECUTE format('UPDATE public.%I SET status = ''pending_approval'', updated_at = now() WHERE id = $1', p_table) USING p_id;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES (p_table, p_id, 'RPC:submit_record', auth.uid(), 'draft → pending_approval');
  -- W3a: alert approvers (strategy_office) that a config change awaits review.
  PERFORM public.strata_notify(
    ra.user_id, 'config_pending_approval', p_table, p_id,
    'Config change awaiting approval',
    format('A %s record is pending approval.', replace(p_table, 'strata_', '')))
  FROM public.strata_role_assignments ra
  WHERE ra.role = 'strategy_office' AND ra.user_id <> auth.uid();
END;
$$;

-- ── Read-state RPCs ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.strata_mark_notification_read(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.strata_notifications SET read_at = now()
  WHERE id = p_id AND user_id = auth.uid() AND read_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_mark_all_notifications_read()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.strata_notifications SET read_at = now()
  WHERE user_id = auth.uid() AND read_at IS NULL;
END;
$$;

-- ── Admin rule toggle ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.strata_set_notification_rule(p_event_type text, p_enabled boolean, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.strata_is_admin() THEN
    RAISE EXCEPTION 'changing notification rules requires an admin role';
  END IF;
  UPDATE public.strata_notification_rules
     SET enabled = p_enabled, change_reason = COALESCE(p_reason, change_reason), updated_at = now()
   WHERE event_type = p_event_type;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown notification event type: %', p_event_type; END IF;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_notification_rules', NULL, 'RPC:set_notification_rule', auth.uid(),
          format('%s → %s', p_event_type, CASE WHEN p_enabled THEN 'enabled' ELSE 'disabled' END));
END;
$$;

-- ── Seed the rule set (idempotent) ────────────────────────────────────────────
INSERT INTO public.strata_notification_rules (event_type, label, description, audience, approved_at)
VALUES
  ('config_pending_approval', 'Config change awaiting approval', 'A governed config record moved to pending approval.', 'role:strategy_office', now()),
  ('decision_assigned', 'Decision assigned', 'You were set as the owner of a governance decision.', 'owner', now()),
  ('action_assigned', 'Action assigned', 'You were set as the owner of an action.', 'owner', now()),
  ('action_overdue', 'Action overdue', 'An action you own passed its due date while still open.', 'owner', now()),
  ('blocker_opened', 'Blocker opened', 'A blocking dependency you own opened or is still blocking.', 'owner', now()),
  ('benefit_validation_requested', 'Benefit validation requested', 'A benefit value was submitted for your validation.', 'validator', now())
ON CONFLICT (event_type) DO NOTHING;

GRANT SELECT ON public.strata_notification_rules TO authenticated;
GRANT SELECT, UPDATE ON public.strata_notifications TO authenticated;
