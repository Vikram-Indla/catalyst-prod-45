-- Allow planner tasks (stored in public.stories) to link to any Catalyst work item
-- while keeping backward compatibility with feature_id.

ALTER TABLE public.stories
  ALTER COLUMN feature_id DROP NOT NULL;

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS linked_work_item_id uuid,
  ADD COLUMN IF NOT EXISTS linked_work_item_type text;

-- Basic type validation (immutable check constraint is OK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stories_linked_work_item_type_chk'
  ) THEN
    ALTER TABLE public.stories
      ADD CONSTRAINT stories_linked_work_item_type_chk
      CHECK (
        linked_work_item_type IS NULL
        OR linked_work_item_type IN ('story', 'feature', 'epic', 'business_request')
      );
  END IF;
END $$;

-- Validate that the referenced work item exists (polymorphic integrity)
CREATE OR REPLACE FUNCTION public.validate_story_linked_work_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If nothing linked, allow.
  IF NEW.linked_work_item_id IS NULL OR NEW.linked_work_item_type IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.linked_work_item_type = 'feature' THEN
    IF NOT EXISTS (SELECT 1 FROM public.features f WHERE f.id = NEW.linked_work_item_id) THEN
      RAISE EXCEPTION 'linked feature does not exist: %', NEW.linked_work_item_id;
    END IF;
  ELSIF NEW.linked_work_item_type = 'epic' THEN
    IF NOT EXISTS (SELECT 1 FROM public.epics e WHERE e.id = NEW.linked_work_item_id) THEN
      RAISE EXCEPTION 'linked epic does not exist: %', NEW.linked_work_item_id;
    END IF;
  ELSIF NEW.linked_work_item_type = 'story' THEN
    IF NOT EXISTS (SELECT 1 FROM public.stories s WHERE s.id = NEW.linked_work_item_id) THEN
      RAISE EXCEPTION 'linked story does not exist: %', NEW.linked_work_item_id;
    END IF;
  ELSIF NEW.linked_work_item_type = 'business_request' THEN
    IF NOT EXISTS (SELECT 1 FROM public.business_requests br WHERE br.id = NEW.linked_work_item_id) THEN
      RAISE EXCEPTION 'linked business request does not exist: %', NEW.linked_work_item_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'invalid linked_work_item_type: %', NEW.linked_work_item_type;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_validate_story_linked_work_item'
  ) THEN
    CREATE TRIGGER trg_validate_story_linked_work_item
    BEFORE INSERT OR UPDATE OF linked_work_item_id, linked_work_item_type
    ON public.stories
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_story_linked_work_item();
  END IF;
END $$;

-- Helpful index for filtering/reporting
CREATE INDEX IF NOT EXISTS idx_stories_linked_work_item
  ON public.stories (linked_work_item_type, linked_work_item_id);