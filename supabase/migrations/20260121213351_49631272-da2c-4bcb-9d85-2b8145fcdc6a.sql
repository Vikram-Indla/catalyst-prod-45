
-- Make provisioning trigger function run with elevated privileges so it can insert default rows
-- without being blocked by RLS policies.
CREATE OR REPLACE FUNCTION public.on_space_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Ensure RLS does not block provisioning inserts inside this function
    PERFORM set_config('row_security', 'off', true);

    -- Add creator as administrator first
    IF NEW.created_by IS NOT NULL THEN
        INSERT INTO public.space_members (space_id, user_id, role, added_by)
        VALUES (NEW.id, NEW.created_by, 'administrator', NEW.created_by)
        ON CONFLICT (space_id, user_id) DO NOTHING;
    END IF;

    -- Create default features
    INSERT INTO public.space_features (space_id)
    VALUES (NEW.id)
    ON CONFLICT (space_id) DO NOTHING;

    -- Create default permissions
    PERFORM public.create_default_space_permissions(NEW.id);

    RETURN NEW;
END;
$$;

-- Reduce surface area: trigger functions should not be callable by regular users
REVOKE ALL ON FUNCTION public.on_space_created() FROM PUBLIC;
