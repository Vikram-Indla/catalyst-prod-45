-- ════════════════════════════════════════════════════════════════════════
-- RELEASE OPERATIONS — Notify-on-status-change (Phase 16)
-- PROPOSE ONLY — apply with explicit per-migration OK.
--
-- On a status change of a release or change, fan out a `notifications` row to
-- every user on that item's rh_notify_subscribers list. (Caty-chat delivery is
-- a separate follow-up — it requires writing into the chat tables.)
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.rh_notify_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item_type   TEXT;
  v_entity_key  TEXT;
  v_entity_title TEXT;
  v_icon        TEXT;
  v_actor       UUID := auth.uid();
  v_sub         RECORD;
BEGIN
  -- Only fire on an actual status change.
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'rh_releases' THEN
    v_item_type := 'release';
    v_entity_key := NEW.name;
    v_entity_title := NEW.name;
    v_icon := 'release';
  ELSE
    v_item_type := 'change';
    v_entity_key := NEW.chg_number;
    v_entity_title := NEW.title;
    v_icon := 'change';
  END IF;

  FOR v_sub IN
    SELECT user_id FROM public.rh_notify_subscribers
    WHERE item_type = v_item_type AND item_id = NEW.id
  LOOP
    INSERT INTO public.notifications (
      recipient_user_id, actor_user_id,
      entity_type, entity_id, entity_key, entity_title, entity_icon_type,
      notification_type, status, status_type, tab, hub_source,
      is_dismissed, entity_deleted, metadata
    ) VALUES (
      v_sub.user_id, v_actor,
      v_item_type, NEW.id::text, v_entity_key, v_entity_title, v_icon,
      'status_change', 'unread', 'info', 'all', 'release-ops',
      false, false,
      jsonb_build_object('from_status', OLD.status, 'to_status', NEW.status)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rh_releases_notify_status ON rh_releases;
CREATE TRIGGER rh_releases_notify_status
  AFTER UPDATE OF status ON rh_releases
  FOR EACH ROW EXECUTE FUNCTION public.rh_notify_on_status_change();

DROP TRIGGER IF EXISTS rh_changes_notify_status ON rh_changes;
CREATE TRIGGER rh_changes_notify_status
  AFTER UPDATE OF status ON rh_changes
  FOR EACH ROW EXECUTE FUNCTION public.rh_notify_on_status_change();

-- On change creation, notify subscribers that the change was created. (Approver
-- + notify rows are inserted by the create modal right after the change row, so
-- this statement-level trigger may run before subscribers exist — kept simple:
-- creation notification is emitted from the app layer instead. This file only
-- ships the status-change fan-out, which is the spec's core requirement.)

-- ════════════════════════════════════════════════════════════════════════
-- END
-- ════════════════════════════════════════════════════════════════════════
