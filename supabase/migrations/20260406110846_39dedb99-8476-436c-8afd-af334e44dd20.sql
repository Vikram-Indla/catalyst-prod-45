
-- ═══════════════════════════════════════════════════════════
-- Comment Notification Trigger — covers comments, tm_comments,
-- incident_comments, ph_idea_comments
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.catalyst_comment_notify_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor         UUID;
  v_entity_id     UUID;
  v_entity_type   TEXT;
  v_entity_key    TEXT;
  v_entity_title  TEXT;
  v_hub_source    TEXT;
  v_icon_type     TEXT;
  v_comment_preview TEXT;
  v_assignee_id   UUID;
  v_status        TEXT;
BEGIN
  -- Only fire on INSERT
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  CASE TG_TABLE_NAME

    -- ── Generic comments (stories, epics, OKRs) ──
    WHEN 'comments' THEN
      v_actor := COALESCE(NEW.user_id, auth.uid());
      v_entity_id := NEW.entity_id;
      v_comment_preview := LEFT(NEW.content, 120);

      CASE NEW.entity_type
        WHEN 'story' THEN
          SELECT COALESCE(s.story_key, s.id::TEXT), COALESCE(s.title, s.name, 'Story'),
                 COALESCE(s.assignee_id, s.owner_id), COALESCE(s.status, 'unknown')
            INTO v_entity_key, v_entity_title, v_assignee_id, v_status
            FROM stories s WHERE s.id = NEW.entity_id;
          v_entity_type := 'story'; v_hub_source := 'ProjectHub'; v_icon_type := 'story';

        WHEN 'epic' THEN
          SELECT COALESCE(e.epic_key, e.id::TEXT), COALESCE(e.name, 'Epic'),
                 COALESCE(e.assignee_id, e.owner_id), COALESCE(e.status, 'unknown')
            INTO v_entity_key, v_entity_title, v_assignee_id, v_status
            FROM epics e WHERE e.id = NEW.entity_id;
          v_entity_type := 'epic'; v_hub_source := 'ProjectHub'; v_icon_type := 'epic';

        WHEN 'objective' THEN
          SELECT COALESCE(o.objective_key, o.id::TEXT), COALESCE(o.title, 'Objective'),
                 o.owner_id, COALESCE(o.status, 'unknown')
            INTO v_entity_key, v_entity_title, v_assignee_id, v_status
            FROM objectives o WHERE o.id = NEW.entity_id;
          v_entity_type := 'objective'; v_hub_source := 'StrategyHub'; v_icon_type := 'objective';

        WHEN 'initiative' THEN
          SELECT COALESCE(i.initiative_key, i.id::TEXT), COALESCE(i.name, 'Initiative'),
                 i.owner_id, COALESCE(i.status, 'unknown')
            INTO v_entity_key, v_entity_title, v_assignee_id, v_status
            FROM initiatives i WHERE i.id = NEW.entity_id;
          v_entity_type := 'initiative'; v_hub_source := 'StrategyHub'; v_icon_type := 'initiative';

        ELSE
          -- Unknown entity type, skip
          RETURN NEW;
      END CASE;

    -- ── TestHub comments (test cases, defects, plans) ──
    WHEN 'tm_comments' THEN
      v_actor := COALESCE(NEW.author_id, auth.uid());
      v_entity_id := NEW.entity_id;
      v_comment_preview := LEFT(NEW.content, 120);

      CASE NEW.entity_type
        WHEN 'test_case' THEN
          SELECT COALESCE(tc.case_key, tc.id::TEXT), COALESCE(tc.title, 'Test Case'),
                 tc.assigned_to, COALESCE(tc.status, 'unknown')
            INTO v_entity_key, v_entity_title, v_assignee_id, v_status
            FROM tm_test_cases tc WHERE tc.id = NEW.entity_id;
          v_entity_type := 'test_case'; v_hub_source := 'TestHub'; v_icon_type := 'bug';

        WHEN 'defect' THEN
          SELECT COALESCE(d.defect_key, d.id::TEXT), COALESCE(d.title, 'Defect'),
                 d.assignee_id, COALESCE(d.status, 'unknown')
            INTO v_entity_key, v_entity_title, v_assignee_id, v_status
            FROM tm_defects d WHERE d.id = NEW.entity_id;
          v_entity_type := 'defect'; v_hub_source := 'TestHub'; v_icon_type := 'bug';

        WHEN 'test_plan' THEN
          SELECT COALESCE(tp.plan_key, tp.id::TEXT), COALESCE(tp.name, 'Test Plan'),
                 tp.owner_id, COALESCE(tp.status, 'unknown')
            INTO v_entity_key, v_entity_title, v_assignee_id, v_status
            FROM tm_test_plans tp WHERE tp.id = NEW.entity_id;
          v_entity_type := 'test_plan'; v_hub_source := 'TestHub'; v_icon_type := 'test_plan';

        ELSE
          RETURN NEW;
      END CASE;

    -- ── Incident comments ──
    WHEN 'incident_comments' THEN
      v_actor := COALESCE(NEW.author_id, auth.uid());
      v_entity_id := NEW.incident_id;
      v_comment_preview := LEFT(NEW.content, 120);

      SELECT COALESCE(inc.incident_key, inc.id::TEXT), COALESCE(inc.title, 'Incident'),
             inc.assignee_id, COALESCE(inc.status, 'unknown')
        INTO v_entity_key, v_entity_title, v_assignee_id, v_status
        FROM incidents inc WHERE inc.id = NEW.incident_id;
      v_entity_type := 'incident'; v_hub_source := 'IncidentHub'; v_icon_type := 'incident';

    -- ── Ideation comments ──
    WHEN 'ph_idea_comments' THEN
      v_actor := COALESCE(NEW.user_id, auth.uid());
      v_entity_id := NEW.idea_id;
      v_comment_preview := LEFT(NEW.content, 120);

      SELECT COALESCE(idea.idea_key, idea.id::TEXT), COALESCE(idea.title, 'Idea'),
             idea.author_id, COALESCE(idea.status, 'unknown')
        INTO v_entity_key, v_entity_title, v_assignee_id, v_status
        FROM ph_ideas idea WHERE idea.id = NEW.idea_id;
      v_entity_type := 'idea'; v_hub_source := 'ProductHub'; v_icon_type := 'improvement';

    ELSE
      RETURN NEW;
  END CASE;

  -- ── Notify the assignee/owner that someone commented ──
  IF v_assignee_id IS NOT NULL
     AND v_assignee_id IS DISTINCT FROM v_actor
  THEN
    INSERT INTO notifications (
      recipient_user_id, actor_user_id, notification_type,
      entity_id, entity_type, entity_key, entity_title,
      hub_source, icon_type, status, status_type,
      metadata, tab
    ) VALUES (
      v_assignee_id, v_actor, 'commented_on_work_item',
      v_entity_id, v_entity_type, v_entity_key, v_entity_title,
      v_hub_source, v_icon_type,
      v_status,
      CASE v_status
        WHEN 'done' THEN 'green'
        WHEN 'in_progress' THEN 'blue'
        WHEN 'in_review' THEN 'blue'
        ELSE 'gray'
      END,
      jsonb_build_object('comment_preview', v_comment_preview, 'comment_id', NEW.id::TEXT),
      'direct'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ── Attach triggers to comment tables ──

CREATE TRIGGER trg_comment_notify_comments
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.catalyst_comment_notify_trigger();

CREATE TRIGGER trg_comment_notify_tm_comments
  AFTER INSERT ON public.tm_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.catalyst_comment_notify_trigger();

CREATE TRIGGER trg_comment_notify_incident_comments
  AFTER INSERT ON public.incident_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.catalyst_comment_notify_trigger();

CREATE TRIGGER trg_comment_notify_ph_idea_comments
  AFTER INSERT ON public.ph_idea_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.catalyst_comment_notify_trigger();
