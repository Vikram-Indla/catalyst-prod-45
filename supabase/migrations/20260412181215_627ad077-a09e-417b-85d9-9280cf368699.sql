
CREATE OR REPLACE FUNCTION public.fn_guard_execution_on_active_cycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_cycle_status text;
BEGIN
  SELECT tc.status INTO v_cycle_status
  FROM public.tm_cycle_scope cs
  JOIN public.tm_test_cycles tc ON tc.id = cs.cycle_id
  WHERE cs.id = NEW.cycle_scope_id;

  IF v_cycle_status IS NULL THEN
    RAISE EXCEPTION 'Cycle scope not found for id %', NEW.cycle_scope_id;
  END IF;

  IF v_cycle_status NOT IN ('active') THEN
    RAISE EXCEPTION 'Cannot add execution: parent cycle is not active (status: %)', v_cycle_status;
  END IF;

  RETURN NEW;
END;
$$;
