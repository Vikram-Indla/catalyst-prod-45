-- Update the check function to allow linking to non-archived themes
CREATE OR REPLACE FUNCTION check_theme_is_active(p_theme_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status text;
BEGIN
  IF p_theme_id IS NULL THEN
    RETURN true; -- Allow null theme_id (unlinking)
  END IF;
  
  SELECT status INTO v_status
  FROM public.strategic_themes
  WHERE id = p_theme_id;
  
  IF v_status IS NULL THEN
    RETURN true; -- Theme not found, let FK handle it
  END IF;
  
  -- Allow any status except 'archived' (was previously only 'active')
  RETURN v_status != 'archived';
END;
$$ LANGUAGE plpgsql;

-- Update validation triggers to have clearer error messages
CREATE OR REPLACE FUNCTION validate_epic_theme_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.theme_id IS NOT NULL AND (OLD IS NULL OR OLD.theme_id IS DISTINCT FROM NEW.theme_id) THEN
    IF NOT check_theme_is_active(NEW.theme_id) THEN
      RAISE EXCEPTION 'Cannot link epic to theme: theme is archived';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_objective_theme_link()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.theme_id IS NOT NULL AND (OLD IS NULL OR OLD.theme_id IS DISTINCT FROM NEW.theme_id) THEN
    IF NOT check_theme_is_active(NEW.theme_id) THEN
      RAISE EXCEPTION 'Cannot link objective to theme: theme is archived';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;