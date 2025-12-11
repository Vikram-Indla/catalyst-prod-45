CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: alignment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.alignment_type AS ENUM (
    'direct',
    'inherited'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'program_manager',
    'team_lead',
    'user'
);


--
-- Name: auth_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.auth_method AS ENUM (
    'token',
    'oauth'
);


--
-- Name: board_scope_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.board_scope_type AS ENUM (
    'portfolio',
    'program',
    'team'
);


--
-- Name: board_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.board_type AS ENUM (
    'portfolio_kanban',
    'program_board',
    'sprint_board'
);


--
-- Name: br_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.br_status AS ENUM (
    'proposed',
    'analyzing',
    'approved',
    'in_progress',
    'done',
    'cancelled'
);


--
-- Name: confidence_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.confidence_level AS ENUM (
    'high',
    'med',
    'low'
);


--
-- Name: dependency_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dependency_status AS ENUM (
    'open',
    'in_progress',
    'done',
    'pending_commit',
    'negotiation',
    'committed',
    'delivered',
    'no_work_done',
    'rejected'
);


--
-- Name: dependency_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dependency_type AS ENUM (
    'sequential',
    'concurrent',
    'program',
    'external'
);


--
-- Name: epic_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.epic_state AS ENUM (
    'not_started',
    'in_progress',
    'accepted'
);


--
-- Name: epic_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.epic_status AS ENUM (
    'proposed',
    'analyzing',
    'approved',
    'in_progress',
    'done',
    'cancelled'
);


--
-- Name: feature_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.feature_status AS ENUM (
    'funnel',
    'analyzing',
    'backlog',
    'implementing',
    'done'
);


--
-- Name: field_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.field_type AS ENUM (
    'text',
    'number',
    'date',
    'select',
    'multi_select',
    'boolean'
);


--
-- Name: health_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.health_status AS ENUM (
    'green',
    'yellow',
    'red'
);


--
-- Name: initiative_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.initiative_status AS ENUM (
    'proposed',
    'active',
    'done',
    'cancelled'
);


--
-- Name: integration_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.integration_type AS ENUM (
    'slack',
    'github',
    'gitlab',
    'jira',
    'teams',
    'webhook'
);


--
-- Name: metric_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.metric_type AS ENUM (
    'count',
    'currency',
    'percentage',
    'decimal_score',
    'nps'
);


--
-- Name: objective_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.objective_category AS ENUM (
    'critical_path',
    'stretch_goal'
);


--
-- Name: objective_health; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.objective_health AS ENUM (
    'good',
    'fair',
    'poor',
    'at_risk'
);


--
-- Name: objective_scope_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.objective_scope_type AS ENUM (
    'company',
    'portfolio',
    'program'
);


--
-- Name: objective_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.objective_status AS ENUM (
    'pending',
    'in_progress',
    'on_track',
    'at_risk',
    'off_track',
    'paused',
    'completed',
    'canceled',
    'missed'
);


--
-- Name: objective_tier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.objective_tier AS ENUM (
    'portfolio',
    'program',
    'team'
);


--
-- Name: objective_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.objective_type AS ENUM (
    'feature_finisher',
    'non_code',
    'incremental_delivery',
    'event'
);


--
-- Name: permission_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.permission_action AS ENUM (
    'view',
    'create',
    'edit',
    'delete',
    'link',
    'move',
    'configure'
);


--
-- Name: permission_scope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.permission_scope AS ENUM (
    'global',
    'portfolio',
    'program',
    'team'
);


--
-- Name: pi_state; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pi_state AS ENUM (
    'planned',
    'active',
    'closed'
);


--
-- Name: portfolio_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.portfolio_status AS ENUM (
    'active',
    'archived'
);


--
-- Name: program_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.program_status AS ENUM (
    'active',
    'archived'
);


--
-- Name: release_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.release_status AS ENUM (
    'planned',
    'ready',
    'shipped'
);


--
-- Name: release_vehicle_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.release_vehicle_type AS ENUM (
    'program',
    'team',
    'portfolio'
);


--
-- Name: risk_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.risk_level AS ENUM (
    'low',
    'med',
    'high'
);


--
-- Name: roam_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.roam_status AS ENUM (
    'resolved',
    'owned',
    'accepted',
    'mitigated'
);


--
-- Name: room_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.room_type AS ENUM (
    'portfolio',
    'program',
    'team',
    'strategy',
    'epic',
    'feature',
    'objective',
    'roadmap',
    'product'
);


--
-- Name: skill_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.skill_category AS ENUM (
    'technical',
    'cloud_infrastructure',
    'data_analytics',
    'security',
    'leadership',
    'soft_skills',
    'domain_knowledge',
    'methodology'
);


--
-- Name: skill_proficiency_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.skill_proficiency_level AS ENUM (
    'awareness',
    'beginner',
    'intermediate',
    'advanced',
    'expert'
);


--
-- Name: story_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.story_status AS ENUM (
    'todo',
    'in_progress',
    'done'
);


--
-- Name: subtask_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subtask_status AS ENUM (
    'todo',
    'in_progress',
    'done'
);


--
-- Name: team_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.team_status AS ENUM (
    'active',
    'archived'
);


--
-- Name: team_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.team_type AS ENUM (
    'AGILE',
    'KANBAN',
    'COP',
    'PROGRAM',
    'PORTFOLIO',
    'SOLUTION',
    'PROCESS_FLOW'
);


--
-- Name: test_case_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.test_case_status AS ENUM (
    'draft',
    'approved',
    'deprecated',
    'under_review',
    'published'
);


--
-- Name: test_cycle_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.test_cycle_status AS ENUM (
    'planned',
    'in_progress',
    'completed',
    'cancelled'
);


--
-- Name: test_execution_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.test_execution_status AS ENUM (
    'not_run',
    'passed',
    'failed',
    'blocked',
    'skipped'
);


--
-- Name: test_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.test_priority AS ENUM (
    'critical',
    'high',
    'medium',
    'low'
);


--
-- Name: test_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.test_status AS ENUM (
    'never_tested',
    'success',
    'fail'
);


--
-- Name: test_step_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.test_step_status AS ENUM (
    'passed',
    'failed',
    'blocked',
    'skipped'
);


--
-- Name: test_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.test_type AS ENUM (
    'manual',
    'automated',
    'bdd'
);


--
-- Name: theme_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.theme_status AS ENUM (
    'proposed',
    'active',
    'done',
    'cancelled'
);


--
-- Name: track_by_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.track_by_type AS ENUM (
    'POINTS',
    'HOURS'
);


--
-- Name: work_item_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_item_type_enum AS ENUM (
    'epic',
    'feature',
    'story',
    'task',
    'defect'
);


--
-- Name: assign_default_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_default_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Assign 'user' role to new users by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;


--
-- Name: auto_archive_active_snapshot(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_archive_active_snapshot() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'ACTIVE' AND (OLD IS NULL OR OLD.status IS NULL OR OLD.status != 'ACTIVE') THEN
    UPDATE public.strategy_snapshots
    SET status = 'ARCHIVED', 
        archived_at = now(),
        updated_at = now()
    WHERE status = 'ACTIVE' 
      AND id != NEW.id;
    NEW.active_since := now();
  END IF;
  
  IF NEW.status = 'ARCHIVED' AND (OLD IS NULL OR OLD.status IS NULL OR OLD.status != 'ARCHIVED') THEN
    NEW.archived_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: auto_update_risk_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_update_risk_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- When resolution_method changes to 'Resolved', set status to 'Closed'
  IF NEW.resolution_method = 'Resolved' AND (OLD.resolution_method IS NULL OR OLD.resolution_method != 'Resolved') THEN
    NEW.status = 'Closed';
  END IF;
  
  -- When resolution_method changes from 'Resolved' to anything else, set status to 'Open'
  IF OLD.resolution_method = 'Resolved' AND NEW.resolution_method != 'Resolved' THEN
    NEW.status = 'Open';
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: bulk_assign_roles(uuid[], public.app_role, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bulk_assign_roles(_user_ids uuid[], _role public.app_role, _notes text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Only admins can bulk assign roles
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can bulk assign roles';
  END IF;

  -- Assign role to each user
  FOREACH _user_id IN ARRAY _user_ids
  LOOP
    -- Insert role if not exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Log the change with notes
    INSERT INTO public.user_role_history (user_id, role, action, changed_by, notes)
    VALUES (_user_id, _role, 'assigned', auth.uid(), _notes);
  END LOOP;
END;
$$;


--
-- Name: bulk_remove_roles(uuid[], public.app_role, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bulk_remove_roles(_user_ids uuid[], _role public.app_role, _notes text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _user_id uuid;
BEGIN
  -- Only admins can bulk remove roles
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can bulk remove roles';
  END IF;

  -- Remove role from each user
  FOREACH _user_id IN ARRAY _user_ids
  LOOP
    -- Delete role
    DELETE FROM public.user_roles
    WHERE user_id = _user_id AND role = _role;
    
    -- Log the change with notes
    INSERT INTO public.user_role_history (user_id, role, action, changed_by, notes)
    VALUES (_user_id, _role, 'removed', auth.uid(), _notes);
  END LOOP;
END;
$$;


--
-- Name: calculate_epic_process_time(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_epic_process_time() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Calculate cycle time when exiting a step
  IF NEW.exited_at IS NOT NULL AND OLD.exited_at IS NULL THEN
    NEW.cycle_time_hours := EXTRACT(EPOCH FROM (NEW.exited_at - NEW.entered_at)) / 3600;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: calculate_epic_wsjf(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_epic_wsjf() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Calculate WSJF score: (BV + TC + RR/OE) / JS
  IF NEW.business_value IS NOT NULL 
     AND NEW.time_value IS NOT NULL 
     AND NEW.rroe_value IS NOT NULL 
     AND NEW.job_size IS NOT NULL 
     AND NEW.job_size > 0 THEN
    NEW.wsjf_score := ROUND(
      (NEW.business_value + NEW.time_value + NEW.rroe_value)::NUMERIC / NEW.job_size::NUMERIC, 
      2
    );
  ELSE
    NEW.wsjf_score := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: calculate_feature_wsjf(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_feature_wsjf() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Calculate WSJF score: (BV + TC + RR) / JS
  -- Only calculate if all components are present and job_size > 0
  IF NEW.business_value IS NOT NULL 
     AND NEW.time_criticality IS NOT NULL 
     AND NEW.risk_reduction IS NOT NULL 
     AND NEW.job_size IS NOT NULL 
     AND NEW.job_size > 0 THEN
    NEW.wsjf_score := ROUND(
      (NEW.business_value + NEW.time_criticality + NEW.risk_reduction)::NUMERIC / NEW.job_size::NUMERIC, 
      2
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: calculate_objective_score(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_objective_score(objective_uuid uuid) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
  total_score DECIMAL;
  kr_count INTEGER;
  has_scored BOOLEAN;
  override_score DECIMAL;
BEGIN
  SELECT score_override INTO override_score FROM objectives WHERE id = objective_uuid;
  IF override_score IS NOT NULL THEN RETURN override_score; END IF;
  
  SELECT 
    SUM(CASE 
      WHEN goal_value != COALESCE(baseline_value, 0) AND current_value IS NOT NULL THEN
        GREATEST(0, LEAST(1, 
          (current_value - COALESCE(baseline_value, 0)) / 
          NULLIF(goal_value - COALESCE(baseline_value, 0), 0)
        ))
      ELSE 0
    END),
    COUNT(*),
    BOOL_OR(current_value IS NOT NULL)
  INTO total_score, kr_count, has_scored
  FROM key_results WHERE objective_id = objective_uuid;
  
  IF kr_count = 0 OR NOT has_scored THEN RETURN NULL; END IF;
  RETURN ROUND(total_score / kr_count, 2);
END;
$$;


--
-- Name: check_permission(uuid, text, public.permission_action, public.permission_scope, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_permission(_user_id uuid, _entity_type text, _action public.permission_action, _scope_type public.permission_scope DEFAULT 'global'::public.permission_scope, _scope_id uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  -- Check if user has admin role (full access)
  SELECT CASE
    WHEN has_role(_user_id, 'admin') THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.permission_grants pg ON pg.role_id IN (
        SELECT id FROM public.permission_roles pr
        WHERE pr.name = (
          SELECT role::text FROM public.user_roles WHERE user_id = _user_id LIMIT 1
        )
      )
      WHERE ur.user_id = _user_id
        AND pg.entity_type = _entity_type
        AND pg.action = _action
        AND pg.scope_type = _scope_type
        AND (pg.scope_id IS NULL OR pg.scope_id = _scope_id)
        AND pg.allowed = true
    )
  END;
$$;


--
-- Name: clean_stale_presence(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clean_stale_presence() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM work_item_presence 
  WHERE last_seen_at < NOW() - INTERVAL '2 minutes';
END;
$$;


--
-- Name: cleanup_user_data(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_user_data() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Reassign or nullify owner_id and assignee_id fields
  UPDATE public.strategic_themes SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.initiatives SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.epics SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.features SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.stories SET assignee_id = NULL WHERE assignee_id = OLD.id;
  UPDATE public.stories SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.subtasks SET assignee_id = NULL WHERE assignee_id = OLD.id;
  UPDATE public.risks SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.portfolios SET owner_id = NULL WHERE owner_id = OLD.id;
  UPDATE public.programs SET rte_id = NULL WHERE rte_id = OLD.id;
  UPDATE public.objectives SET owner_id = NULL WHERE owner_id = OLD.id;
  
  RETURN OLD;
END;
$$;


--
-- Name: create_adhoc_cycle(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_adhoc_cycle() RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  adhoc_cycle_id UUID;
BEGIN
  -- Check if Adhoc cycle already exists
  SELECT id INTO adhoc_cycle_id
  FROM test_cycles
  WHERE is_adhoc = true
  LIMIT 1;

  -- If not, create it
  IF adhoc_cycle_id IS NULL THEN
    INSERT INTO test_cycles (
      name,
      description,
      status,
      is_adhoc,
      created_by,
      created_at
    ) VALUES (
      'Adhoc Cycle',
      'Default cycle for unplanned testing. Created automatically.',
      'active',
      true,
      auth.uid(),
      NOW()
    )
    RETURNING id INTO adhoc_cycle_id;
  END IF;

  RETURN adhoc_cycle_id;
END;
$$;


--
-- Name: create_kb_document_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_kb_document_version() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  latest_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) INTO latest_version
  FROM kb_document_versions
  WHERE document_id = NEW.id;
  
  INSERT INTO kb_document_versions (
    document_id, version_number, title, content, content_text, change_summary, created_by
  ) VALUES (
    NEW.id, latest_version + 1, NEW.title, NEW.content, NEW.content_text, 'Auto-saved', NEW.updated_by
  );
  
  RETURN NEW;
END;
$$;


--
-- Name: create_notification(uuid, text, text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_notification(p_user_id uuid, p_title text, p_message text, p_type text DEFAULT 'info'::text, p_entity_type text DEFAULT NULL::text, p_entity_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    entity_type,
    entity_id
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_entity_type,
    p_entity_id
  );
END;
$$;


--
-- Name: create_user_notification_preferences(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_user_notification_preferences() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: extract_kb_tiptap_text(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.extract_kb_tiptap_text(content jsonb) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
  result TEXT := '';
  node JSONB;
BEGIN
  FOR node IN SELECT jsonb_array_elements(content->'content')
  LOOP
    IF node->>'type' = 'text' THEN
      result := result || ' ' || (node->>'text');
    ELSIF node->'content' IS NOT NULL THEN
      result := result || ' ' || extract_kb_tiptap_text(node);
    END IF;
  END LOOP;
  RETURN trim(result);
END;
$$;


--
-- Name: generate_business_request_key(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_business_request_key() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
  max_num INTEGER;
  new_num INTEGER;
BEGIN
  -- Find the highest existing MIM number
  SELECT COALESCE(MAX(
    CASE 
      WHEN request_key ~ '^MIM-[0-9]+$' 
      THEN CAST(SUBSTRING(request_key FROM 5) AS INTEGER)
      ELSE 0
    END
  ), 0) INTO max_num
  FROM business_requests;
  
  -- Increment by 1
  new_num := max_num + 1;
  
  -- Format as MIM-XXX (3 digits, zero-padded)
  NEW.request_key := 'MIM-' || LPAD(new_num::TEXT, 3, '0');
  
  RETURN NEW;
END;
$_$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'program_manager' THEN 2
    WHEN 'team_lead' THEN 3
    WHEN 'user' THEN 4
  END
  LIMIT 1
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;


--
-- Name: log_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_activity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only log if there's an authenticated user
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Insert activity log
  INSERT INTO public.activity_logs (
    entity_type,
    entity_id,
    action,
    actor_id,
    before_json,
    after_json
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );

  RETURN NEW;
END;
$$;


--
-- Name: log_dependency_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_dependency_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.dependency_audit_log (dependency_id, changed_by, action, notes)
    VALUES (NEW.id, auth.uid(), 'created', 'Dependency created');
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.dependency_audit_log (dependency_id, changed_by, action, field_changed, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'status_changed', 'status', OLD.status::text, NEW.status::text);
    END IF;
    -- Log commitment
    IF OLD.committed_by_date IS NULL AND NEW.committed_by_date IS NOT NULL THEN
      INSERT INTO public.dependency_audit_log (dependency_id, changed_by, action, notes)
      VALUES (NEW.id, auth.uid(), 'committed', 'Dependency committed to date: ' || NEW.committed_by_date::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: log_role_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_role_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_role_history (user_id, role, action, changed_by)
    VALUES (NEW.user_id, NEW.role, 'assigned', auth.uid());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.user_role_history (user_id, role, action, changed_by)
    VALUES (OLD.user_id, OLD.role, 'removed', auth.uid());
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: notify_risk_escalation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_risk_escalation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Notify owner when risk impact or probability increases
  IF NEW.owner_id IS NOT NULL AND (
    (NEW.impact > OLD.impact) OR 
    (NEW.probability > OLD.probability)
  ) THEN
    PERFORM public.create_notification(
      NEW.owner_id,
      'Risk Escalated',
      'Risk "' || NEW.name || '" has been escalated',
      'alert',
      'risks',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: notify_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Notify assignee when status changes to 'done'
  IF NEW.status = 'done' AND OLD.status != 'done' AND NEW.assignee_id IS NOT NULL THEN
    PERFORM public.create_notification(
      NEW.assignee_id,
      'Work Item Completed',
      'Your ' || TG_TABLE_NAME || ' "' || NEW.name || '" has been marked as done',
      'status_change',
      TG_TABLE_NAME,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: notify_story_assignment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_story_assignment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Notify when story is assigned to a user
  IF NEW.assignee_id IS NOT NULL AND (OLD.assignee_id IS NULL OR OLD.assignee_id != NEW.assignee_id) THEN
    PERFORM public.create_notification(
      NEW.assignee_id,
      'Story Assigned',
      'You have been assigned to story: ' || NEW.name,
      'assignment',
      'stories',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: notify_subtask_assignment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_subtask_assignment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Notify when subtask is assigned to a user
  IF NEW.assignee_id IS NOT NULL AND (OLD.assignee_id IS NULL OR OLD.assignee_id != NEW.assignee_id) THEN
    PERFORM public.create_notification(
      NEW.assignee_id,
      'Subtask Assigned',
      'You have been assigned to subtask: ' || NEW.name,
      'assignment',
      'subtasks',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: sync_feature_program_from_epic(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_feature_program_from_epic() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- If program_epic_inherited is true and epic_id is set, copy program from epic
  IF NEW.program_epic_inherited = true AND NEW.epic_id IS NOT NULL THEN
    SELECT primary_program_id INTO NEW.program_id
    FROM epics
    WHERE id = NEW.epic_id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: track_epic_process_step_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_epic_process_step_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.process_step_id IS DISTINCT FROM NEW.process_step_id) THEN
    IF OLD.process_step_id IS NOT NULL THEN
      UPDATE epic_process_history
      SET exited_at = NOW()
      WHERE epic_id = NEW.id
        AND process_step_id = OLD.process_step_id
        AND exited_at IS NULL;
    END IF;
    
    IF NEW.process_step_id IS NOT NULL THEN
      INSERT INTO epic_process_history (epic_id, process_step_id, entered_at)
      VALUES (NEW.id, NEW.process_step_id, NOW());
      
      NEW.process_step_entered_at := NOW();
    END IF;
  END IF;
  
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.process_step_id IS NULL AND NEW.process_step_id IS NOT NULL)) THEN
    IF NEW.process_flow_entered_at IS NULL THEN
      NEW.process_flow_entered_at := NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: track_room_access(uuid, public.room_type, uuid, text, text, text, text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_room_access(p_user_id uuid, p_room_type public.room_type, p_room_id uuid, p_room_name text, p_room_subtitle text, p_room_path text, p_pi_label text DEFAULT NULL::text, p_page_key text DEFAULT 'room'::text, p_timebox_type text DEFAULT NULL::text, p_timebox_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_entry_count integer;
  v_oldest_id uuid;
BEGIN
  -- UPSERT at room level (one entry per room, not per page)
  INSERT INTO recent_activity (
    user_id, room_type, room_id, room_name, room_subtitle, room_path, 
    pi_label, page_key, timebox_type, timebox_id, last_accessed_at, access_count
  )
  VALUES (
    p_user_id, p_room_type, p_room_id, p_room_name, p_room_subtitle, p_room_path, 
    p_pi_label, p_page_key, p_timebox_type, p_timebox_id, NOW(), 1
  )
  ON CONFLICT (user_id, room_type, room_id)
  DO UPDATE SET
    last_accessed_at = NOW(),
    access_count = recent_activity.access_count + 1,
    room_name = EXCLUDED.room_name,
    room_subtitle = EXCLUDED.room_subtitle,  -- Update to show last visited page
    room_path = EXCLUDED.room_path,          -- Update to latest path
    page_key = EXCLUDED.page_key,            -- Update page key
    pi_label = EXCLUDED.pi_label,
    timebox_type = EXCLUDED.timebox_type,
    timebox_id = EXCLUDED.timebox_id;

  -- Prune to keep only 12 most recent entries per user
  SELECT COUNT(*) INTO v_entry_count
  FROM recent_activity
  WHERE user_id = p_user_id;

  IF v_entry_count > 12 THEN
    -- Delete oldest entries beyond 12
    DELETE FROM recent_activity
    WHERE id IN (
      SELECT id FROM recent_activity
      WHERE user_id = p_user_id
      ORDER BY last_accessed_at ASC
      LIMIT (v_entry_count - 12)
    );
  END IF;
END;
$$;


--
-- Name: update_external_entities_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_external_entities_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_feature_progress(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_feature_progress() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE features SET
    updated_at = NOW()
  WHERE id = COALESCE(NEW.feature_id, OLD.feature_id);
  RETURN NEW;
END;
$$;


--
-- Name: update_idea_attachment_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_idea_attachment_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ideas SET attachment_count = attachment_count + 1 WHERE id = NEW.idea_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ideas SET attachment_count = GREATEST(0, attachment_count - 1) WHERE id = OLD.idea_id;
    RETURN OLD;
  END IF;
END;
$$;


--
-- Name: update_idea_comment_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_idea_comment_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ideas SET comment_count = comment_count + 1 WHERE id = NEW.idea_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ideas SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.idea_id;
    RETURN OLD;
  END IF;
END;
$$;


--
-- Name: update_idea_vote_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_idea_vote_counts() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.ideas
    SET 
      for_votes = (SELECT COUNT(*) FROM public.ideation_votes WHERE idea_id = NEW.idea_id AND vote_type = 'For'),
      against_votes = (SELECT COUNT(*) FROM public.ideation_votes WHERE idea_id = NEW.idea_id AND vote_type = 'Against'),
      token_votes = (SELECT COALESCE(SUM(token_count), 0) FROM public.ideation_votes WHERE idea_id = NEW.idea_id AND vote_type = 'Token'),
      vote_score = (
        SELECT COALESCE(SUM(CASE 
          WHEN vote_type = 'For' THEN 1 
          WHEN vote_type = 'Against' THEN -1 
          WHEN vote_type = 'Token' THEN token_count 
          ELSE 0 
        END), 0)
        FROM public.ideation_votes WHERE idea_id = NEW.idea_id
      )
    WHERE id = NEW.idea_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ideas
    SET 
      for_votes = (SELECT COUNT(*) FROM public.ideation_votes WHERE idea_id = OLD.idea_id AND vote_type = 'For'),
      against_votes = (SELECT COUNT(*) FROM public.ideation_votes WHERE idea_id = OLD.idea_id AND vote_type = 'Against'),
      token_votes = (SELECT COALESCE(SUM(token_count), 0) FROM public.ideation_votes WHERE idea_id = OLD.idea_id AND vote_type = 'Token'),
      vote_score = (
        SELECT COALESCE(SUM(CASE 
          WHEN vote_type = 'For' THEN 1 
          WHEN vote_type = 'Against' THEN -1 
          WHEN vote_type = 'Token' THEN token_count 
          ELSE 0 
        END), 0)
        FROM public.ideation_votes WHERE idea_id = OLD.idea_id
      )
    WHERE id = OLD.idea_id;
    RETURN OLD;
  END IF;
END;
$$;


--
-- Name: update_industry_preferences_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_industry_preferences_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_kanban_boards_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_kanban_boards_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_kb_content_text(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_kb_content_text() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.content_text := extract_kb_tiptap_text(NEW.content);
  RETURN NEW;
END;
$$;


--
-- Name: update_kb_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_kb_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_kr_on_checkin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_kr_on_checkin() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE key_results 
  SET current_value = NEW.value, updated_at = NOW()
  WHERE id = NEW.key_result_id;
  RETURN NEW;
END;
$$;


--
-- Name: update_kr_work_contributions_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_kr_work_contributions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_modules_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_modules_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_notification_preferences_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_notification_preferences_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_notification_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_notification_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_objective_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_objective_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN 
  NEW.updated_at = NOW(); 
  RETURN NEW; 
END;
$$;


--
-- Name: update_risks_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_risks_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_shared_step_usage_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_shared_step_usage_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shared_test_steps 
    SET usage_count = usage_count + 1 
    WHERE id = NEW.shared_step_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE shared_test_steps 
    SET usage_count = GREATEST(0, usage_count - 1)
    WHERE id = OLD.shared_step_id;
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: update_team_members_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_team_members_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_team_metrics_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_team_metrics_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_test_data_parameters_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_test_data_parameters_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_test_data_rows_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_test_data_rows_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_test_notification_preferences_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_test_notification_preferences_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_test_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_test_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_user_epic_backlog_preferences_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_epic_backlog_preferences_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: user_in_portfolio(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_in_portfolio(_user_id uuid, _portfolio_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    has_role(_user_id, 'admin') OR
    EXISTS (
      SELECT 1 FROM public.portfolio_members
      WHERE user_id = _user_id AND portfolio_id = _portfolio_id
    ) OR
    EXISTS (
      SELECT 1 FROM public.program_members pm
      JOIN public.programs p ON p.id = pm.program_id
      WHERE pm.user_id = _user_id AND p.portfolio_id = _portfolio_id
    ) OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      JOIN public.programs p ON p.id = t.program_id
      WHERE tm.user_id = _user_id AND p.portfolio_id = _portfolio_id
    );
$$;


--
-- Name: user_in_program(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_in_program(_user_id uuid, _program_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    has_role(_user_id, 'admin') OR
    EXISTS (
      SELECT 1 FROM public.program_members
      WHERE user_id = _user_id AND program_id = _program_id
    ) OR
    EXISTS (
      SELECT 1 FROM public.team_members tm
      JOIN public.teams t ON t.id = tm.team_id
      WHERE tm.user_id = _user_id AND t.program_id = _program_id
    );
$$;


--
-- Name: user_in_team(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_in_team(_user_id uuid, _team_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    has_role(_user_id, 'admin') OR
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = _user_id AND team_id = _team_id
    );
$$;


SET default_table_access_method = heap;

--
-- Name: active_package; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.active_package (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    package_code text,
    is_custom boolean DEFAULT false,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    actor_id uuid,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    action text NOT NULL,
    before_json jsonb,
    after_json jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: anchor_sprints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.anchor_sprints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    program_increment_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: announcement_dismissals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcement_dismissals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    announcement_id uuid NOT NULL,
    user_id uuid NOT NULL,
    dismissed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    target_audience text DEFAULT 'all'::text NOT NULL,
    target_roles text[],
    target_team_ids uuid[],
    is_dismissible boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    CONSTRAINT announcements_target_audience_check CHECK ((target_audience = ANY (ARRAY['all'::text, 'roles'::text, 'teams'::text]))),
    CONSTRAINT announcements_type_check CHECK ((type = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])))
);


--
-- Name: attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_id uuid NOT NULL,
    entity_type text NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size bigint NOT NULL,
    mime_type text NOT NULL,
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: board_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.board_configs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    scope_type public.board_scope_type NOT NULL,
    scope_id uuid,
    board_type public.board_type NOT NULL,
    columns_json jsonb NOT NULL,
    swimlane_rule jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: business_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: business_request_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_request_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_request_id uuid NOT NULL,
    actor_id uuid,
    actor_name text,
    action text NOT NULL,
    field_changed text,
    old_value text,
    new_value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: business_request_discussions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_request_discussions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_request_id uuid NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: business_request_key_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.business_request_key_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: business_request_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_request_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_request_id uuid NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    link_type text DEFAULT 'documentation'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    kind text DEFAULT 'external'::text,
    file_name text,
    file_path text,
    file_size bigint,
    mime_type text,
    uploaded_by uuid,
    linked_item_id uuid,
    linked_item_type text,
    linked_item_source text,
    added_by_name text
);


--
-- Name: business_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    platform text,
    complexity text,
    urgency text,
    track text,
    requestor text,
    business_justification text,
    start_date date,
    end_date date,
    process_step text DEFAULT 'new_demand'::text,
    health text DEFAULT 'green'::text,
    dependencies text,
    risk_rating text,
    portfolio_comments text,
    delivery_platform text,
    delivery_track text,
    proposed_solution text,
    estimated_effort text,
    estimated_cost numeric(15,2),
    integration_required boolean DEFAULT false,
    integration_systems text[],
    technical_validator text,
    estimation_notes text,
    estimation_dependencies text,
    estimation_risk_rating text,
    estimated_cost_sar numeric(15,2),
    approval_inputs text,
    portfolio_decision text,
    approver_name text,
    approval_date date,
    approval_decision text,
    approved_budget_ceiling numeric(15,2),
    approval_remarks text,
    functional_spec_link text,
    acceptance_criteria text,
    jira_epic_link text,
    environment_dependency text,
    readiness_checklist jsonb DEFAULT '{"environment_ready": false, "resources_allocated": false, "test_cases_prepared": false, "requirements_documented": false, "technical_design_approved": false}'::jsonb,
    implementation_owner text,
    impl_start_date date,
    impl_target_end_date date,
    key_risks_remarks text,
    outcome_summary text,
    qa_remarks text,
    support_owner text,
    support_remarks text,
    resolution_category text,
    implementation_outcome text,
    on_hold_reason text,
    expected_resume_date date,
    on_hold_comment text,
    request_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    rank integer,
    rank_override_justification text,
    planned_quarter text,
    business_score integer DEFAULT 0,
    executive_urgency integer DEFAULT 0,
    business_value integer DEFAULT 0,
    complexity_score integer DEFAULT 0,
    is_force_ranked boolean DEFAULT false,
    force_ranked_by text,
    force_ranked_at timestamp with time zone,
    deleted_at timestamp with time zone,
    department text,
    business_owner text,
    assignee text,
    funding_status text DEFAULT 'Not Budgeted'::text,
    budget_year text,
    budget_type text[],
    approved_budget_sar numeric(15,2),
    current_year_budget_sar numeric(15,2),
    budget_owner_name text,
    project_manager_user_id uuid,
    planned_external_spend_sar numeric(15,2),
    internal_effort_cost_sar numeric(15,2),
    contract_type text,
    primary_vendor_name text,
    po_numbers text[],
    contract_start_date date,
    contract_end_date date,
    delivery_model text,
    capacity_status text DEFAULT 'Not Assessed'::text,
    internal_effort_pct integer DEFAULT 0,
    vendor_effort_pct integer DEFAULT 0,
    funding_assumptions text,
    capacity_risks text
);


--
-- Name: capacity_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capacity_allocations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    team_id uuid NOT NULL,
    iteration_id uuid NOT NULL,
    capacity_points numeric DEFAULT 0,
    locked_baseline boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    actual_capacity_points numeric DEFAULT 0,
    velocity_baseline numeric,
    load_factor numeric DEFAULT 1.0
);


--
-- Name: capacity_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capacity_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pi_id uuid NOT NULL,
    program_id uuid,
    team_id uuid,
    available_capacity numeric DEFAULT 0 NOT NULL,
    unit text DEFAULT 'points'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT capacity_plans_scope_check CHECK ((((program_id IS NOT NULL) AND (team_id IS NULL)) OR ((program_id IS NULL) AND (team_id IS NOT NULL)))),
    CONSTRAINT capacity_plans_unit_check CHECK ((unit = ANY (ARRAY['points'::text, 'team_weeks'::text, 'member_weeks'::text])))
);


--
-- Name: certifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_member_id uuid NOT NULL,
    skill_id uuid,
    name character varying(255) NOT NULL,
    issuing_organization character varying(255),
    credential_id character varying(255),
    issue_date date,
    expiry_date date,
    credential_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: comment_mentions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment_mentions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comment_id uuid NOT NULL,
    mentioned_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    notification_sent boolean DEFAULT false
);


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_id uuid NOT NULL,
    entity_type text NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: custom_field_defs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_field_defs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    entity_type text NOT NULL,
    name text NOT NULL,
    field_type public.field_type NOT NULL,
    required boolean DEFAULT false,
    options_json jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    description text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    default_value jsonb,
    validation_rules jsonb,
    placeholder text
);


--
-- Name: custom_field_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_field_values (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    custom_field_def_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    value_json jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: demand_field_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.demand_field_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_line_id uuid,
    field_key text NOT NULL,
    label text NOT NULL,
    tab_key text NOT NULL,
    section_key text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    rules_json jsonb,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: demand_section_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.demand_section_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_line_id uuid,
    tab_key text NOT NULL,
    section_key text NOT NULL,
    name text NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    collapsed_by_default boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: demand_tab_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.demand_tab_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_line_id uuid,
    tab_key text NOT NULL,
    display_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dependencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dependencies (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    from_feature_id uuid NOT NULL,
    to_feature_id uuid NOT NULL,
    type public.dependency_type DEFAULT 'sequential'::public.dependency_type,
    status public.dependency_status DEFAULT 'open'::public.dependency_status,
    risk_level public.risk_level DEFAULT 'low'::public.risk_level,
    due_iteration_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    criticality_score numeric DEFAULT 0,
    resolution_plan text,
    blocked_days integer DEFAULT 0,
    dependency_level text,
    requesting_team_id uuid,
    requesting_program_id uuid,
    depends_on_team_id uuid,
    depends_on_program_id uuid,
    external_entity_id uuid,
    owner_id uuid,
    pi_id uuid,
    needed_by_sprint_id uuid,
    needed_by_date date,
    committed_by_sprint_id uuid,
    committed_by_date date,
    description text,
    blocked_requestor boolean DEFAULT false,
    blocked_respondent boolean DEFAULT false,
    blocked_reason_requestor text,
    blocked_reason_respondent text,
    no_work_required boolean DEFAULT false,
    rejection_reason text,
    notify_on_commit boolean DEFAULT true,
    notify_on_delivery boolean DEFAULT true,
    subscribed_users uuid[],
    related_stories_count integer DEFAULT 0,
    delivered_at timestamp with time zone,
    rank_order integer,
    CONSTRAINT dependencies_check CHECK ((from_feature_id <> to_feature_id)),
    CONSTRAINT dependencies_dependency_level_check CHECK ((dependency_level = ANY (ARRAY['team'::text, 'program'::text, 'external'::text])))
);


--
-- Name: dependency_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dependency_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dependency_id uuid NOT NULL,
    changed_by uuid,
    action text NOT NULL,
    field_changed text,
    old_value text,
    new_value text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: dependency_negotiations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dependency_negotiations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dependency_id uuid NOT NULL,
    proposed_by uuid,
    proposed_date date,
    proposed_sprint_id uuid,
    counter_proposal boolean DEFAULT false,
    notes text,
    status text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT dependency_negotiations_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'accepted'::text, 'rejected'::text, 'superseded'::text])))
);


--
-- Name: discussion_mentions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discussion_mentions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    discussion_id uuid NOT NULL,
    mentioned_user_id uuid,
    mentioned_team_id uuid,
    notification_sent boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT discussion_mentions_check CHECK (((mentioned_user_id IS NOT NULL) OR (mentioned_team_id IS NOT NULL)))
);


--
-- Name: discussions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discussions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: drawer_tab_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drawer_tab_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_line_id uuid,
    tab_key text NOT NULL,
    display_name text NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: epic_acceptance_criteria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epic_acceptance_criteria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    epic_id uuid NOT NULL,
    description text NOT NULL,
    is_met boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: epic_benefits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epic_benefits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    epic_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    metric text,
    target_value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: epic_custom_columns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epic_custom_columns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    column_id text NOT NULL,
    label text NOT NULL,
    color text DEFAULT '#6B7280'::text NOT NULL,
    "position" integer NOT NULL,
    wip_limit integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: epic_design_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epic_design_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    epic_id uuid NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    type text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT epic_design_items_type_check CHECK ((type = ANY (ARRAY['link'::text, 'file'::text])))
);


--
-- Name: epic_intake_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epic_intake_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    epic_id uuid,
    field_id text,
    value text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: epic_label_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epic_label_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    epic_id uuid NOT NULL,
    label_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: epic_labels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epic_labels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    color text DEFAULT 'gray'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: epic_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epic_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    epic_id uuid NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    link_type text DEFAULT 'documentation'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: epic_pi_forecasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epic_pi_forecasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    epic_id uuid NOT NULL,
    pi_id uuid NOT NULL,
    estimate numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: epic_process_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epic_process_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    epic_id uuid NOT NULL,
    process_step_id uuid,
    entered_at timestamp with time zone DEFAULT now() NOT NULL,
    exited_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    cycle_time_hours numeric,
    lead_time_hours numeric
);


--
-- Name: epic_program_increments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epic_program_increments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    epic_id uuid NOT NULL,
    pi_id uuid NOT NULL,
    pi_rank integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: epic_programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epic_programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    epic_id uuid NOT NULL,
    program_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: epic_report_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epic_report_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    report_type text NOT NULL,
    filters_json jsonb,
    columns_json jsonb,
    is_scheduled boolean DEFAULT false,
    schedule_cron text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: epic_roi_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epic_roi_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    epic_id uuid,
    cost_score integer,
    profit_potential_score integer,
    time_to_market_score integer,
    development_risks_score integer,
    value_score numeric(5,2) GENERATED ALWAYS AS ((((((COALESCE(cost_score, 0) + COALESCE(profit_potential_score, 0)) + COALESCE(time_to_market_score, 0)) + COALESCE(development_risks_score, 0)))::numeric / (4)::numeric)) STORED,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT epic_roi_scores_cost_score_check CHECK ((cost_score = ANY (ARRAY[0, 33, 66, 100]))),
    CONSTRAINT epic_roi_scores_development_risks_score_check CHECK ((development_risks_score = ANY (ARRAY[0, 33, 66, 100]))),
    CONSTRAINT epic_roi_scores_profit_potential_score_check CHECK ((profit_potential_score = ANY (ARRAY[0, 33, 66, 100]))),
    CONSTRAINT epic_roi_scores_time_to_market_score_check CHECK ((time_to_market_score = ANY (ARRAY[0, 33, 66, 100])))
);


--
-- Name: epic_scorecard_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epic_scorecard_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    epic_id uuid,
    question_id uuid,
    selected_answer_id uuid,
    score numeric(5,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: epic_spend; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epic_spend (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    epic_id uuid,
    budget numeric(15,2) DEFAULT 0,
    forecasted_spend numeric(15,2) DEFAULT 0,
    estimated_spend numeric(15,2) DEFAULT 0,
    accepted_spend numeric(15,2) DEFAULT 0,
    business_impact text,
    risk_appetite text,
    it_risk text,
    failure_impact text,
    failure_probability text,
    discount_rate numeric(5,2),
    initial_investment numeric(15,2),
    efficiency_dividend numeric(15,2),
    revenue_assurance numeric(15,2),
    return_on_investment numeric(15,2),
    work_code text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    funding_stage text DEFAULT 'Not Defined'::text
);


--
-- Name: epic_value_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epic_value_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    epic_id uuid NOT NULL,
    business_value integer DEFAULT 0 NOT NULL,
    time_criticality integer DEFAULT 0 NOT NULL,
    risk_reduction integer DEFAULT 0 NOT NULL,
    estimated_revenue numeric(15,2) DEFAULT 0,
    cost_savings numeric(15,2) DEFAULT 0,
    customer_satisfaction_impact integer DEFAULT 0,
    market_share_impact integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT epic_value_metrics_business_value_check CHECK (((business_value >= 0) AND (business_value <= 100))),
    CONSTRAINT epic_value_metrics_customer_satisfaction_impact_check CHECK (((customer_satisfaction_impact >= 0) AND (customer_satisfaction_impact <= 100))),
    CONSTRAINT epic_value_metrics_market_share_impact_check CHECK (((market_share_impact >= 0) AND (market_share_impact <= 100))),
    CONSTRAINT epic_value_metrics_risk_reduction_check CHECK (((risk_reduction >= 0) AND (risk_reduction <= 100))),
    CONSTRAINT epic_value_metrics_time_criticality_check CHECK (((time_criticality >= 0) AND (time_criticality <= 100)))
);


--
-- Name: epic_wsjf; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epic_wsjf (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    epic_id uuid,
    pi_id uuid,
    business_value integer,
    time_value integer,
    rroe_value integer,
    job_size integer,
    wsjf_score numeric(10,4) GENERATED ALWAYS AS (
CASE
    WHEN ((job_size > 0) AND (business_value IS NOT NULL) AND (time_value IS NOT NULL) AND (rroe_value IS NOT NULL)) THEN ((((business_value + time_value) + rroe_value))::numeric / (job_size)::numeric)
    ELSE NULL::numeric
END) STORED,
    global_rank integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT epic_wsjf_business_value_check CHECK ((business_value = ANY (ARRAY[0, 1, 2, 3, 5, 8, 13, 20, 40, 100]))),
    CONSTRAINT epic_wsjf_job_size_check CHECK ((job_size = ANY (ARRAY[0, 1, 2, 3, 5, 8, 13, 20, 40, 100]))),
    CONSTRAINT epic_wsjf_rroe_value_check CHECK ((rroe_value = ANY (ARRAY[0, 1, 2, 3, 5, 8, 13, 20, 40, 100]))),
    CONSTRAINT epic_wsjf_time_value_check CHECK ((time_value = ANY (ARRAY[0, 1, 2, 3, 5, 8, 13, 20, 40, 100])))
);


--
-- Name: epics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.epics (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    theme_id uuid,
    name text NOT NULL,
    description text,
    owner_id uuid,
    status public.epic_status DEFAULT 'proposed'::public.epic_status,
    estimate numeric,
    start_date date,
    end_date date,
    health public.health_status DEFAULT 'green'::public.health_status,
    primary_program_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    epic_key text,
    global_rank integer DEFAULT 0,
    portfolio_rank integer DEFAULT 0,
    program_rank integer DEFAULT 0,
    mvp boolean DEFAULT false,
    tags text[] DEFAULT '{}'::text[],
    process_step_id uuid,
    points_estimate numeric,
    portfolio_id uuid,
    deleted_at timestamp with time zone,
    parked_at timestamp with time zone,
    state public.epic_state DEFAULT 'not_started'::public.epic_state,
    process_step_entered_at timestamp with time zone,
    process_flow_entered_at timestamp with time zone,
    epic_type text,
    portfolio_ask_date date,
    initiation_date date,
    target_completion_date date,
    date_locked boolean DEFAULT false,
    date_lock_history jsonb DEFAULT '[]'::jsonb,
    capitalized boolean DEFAULT false,
    estimation_system text DEFAULT 'wsjf'::text,
    strategic_value_score integer,
    effort_swag integer,
    strategic_driver text,
    ability_to_execute text,
    quadrant text,
    investment_type text,
    customers text[],
    report_color text DEFAULT '#3b82f6'::text,
    estimate_method text DEFAULT 'manual'::text,
    estimate_confidence numeric,
    last_estimate_calculation timestamp with time zone,
    owner_name text,
    success_criteria text,
    approvers text,
    future_state text,
    CONSTRAINT epics_effort_swag_check CHECK (((effort_swag >= 1) AND (effort_swag <= 100))),
    CONSTRAINT epics_strategic_value_score_check CHECK (((strategic_value_score >= 1) AND (strategic_value_score <= 100)))
);


--
-- Name: estimation_conversions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estimation_conversions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_item_type text NOT NULL,
    tshirt_size text NOT NULL,
    member_weeks numeric NOT NULL,
    sort_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT estimation_conversions_work_item_type_check CHECK ((work_item_type = ANY (ARRAY['epic'::text, 'feature'::text])))
);


--
-- Name: external_entities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_entities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    entity_type text,
    description text,
    proxy_owner_id uuid,
    contact_info jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    flag_key text NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: feature_pi_objective_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_pi_objective_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feature_id uuid NOT NULL,
    pi_objective_id uuid NOT NULL,
    contribution_pct numeric DEFAULT 100,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: feature_scheduling_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_scheduling_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feature_id uuid NOT NULL,
    user_id uuid,
    start_sprint_id uuid,
    end_sprint_id uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.features (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    epic_id uuid NOT NULL,
    program_id uuid NOT NULL,
    pi_id uuid,
    iteration_id uuid,
    name text NOT NULL,
    description text,
    owner_id uuid,
    status public.feature_status DEFAULT 'funnel'::public.feature_status,
    estimate_points numeric,
    wsjf_score numeric DEFAULT 0,
    progress_pct numeric DEFAULT 0,
    health public.health_status DEFAULT 'green'::public.health_status,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    planned_start_date date,
    planned_end_date date,
    actual_start_date date,
    actual_end_date date,
    business_value integer,
    time_criticality integer,
    risk_reduction integer,
    job_size integer,
    blocked boolean DEFAULT false,
    blocked_reason text,
    acceptance_criteria text,
    notes text,
    team_id uuid,
    rank_within_epic integer DEFAULT 0,
    team_target_completion_sprint_id uuid,
    is_orphan_on_board boolean DEFAULT false,
    orphan_board_teams text[] DEFAULT '{}'::text[],
    display_id text,
    deleted_at timestamp with time zone,
    parked_at timestamp with time zone,
    global_rank integer,
    estimation_method text DEFAULT 'points'::text,
    budget numeric DEFAULT 0,
    work_code text,
    capitalized boolean DEFAULT false,
    expected_revenue_growth numeric DEFAULT 0,
    expected_cost_savings numeric DEFAULT 0,
    original_minutes integer DEFAULT 0,
    remaining_minutes integer DEFAULT 0,
    spent_minutes integer DEFAULT 0,
    program_epic_inherited boolean DEFAULT true,
    CONSTRAINT features_business_value_check CHECK (((business_value >= 0) AND (business_value <= 100))),
    CONSTRAINT features_job_size_check CHECK (((job_size >= 0) AND (job_size <= 100))),
    CONSTRAINT features_progress_pct_check CHECK (((progress_pct >= (0)::numeric) AND (progress_pct <= (100)::numeric))),
    CONSTRAINT features_risk_reduction_check CHECK (((risk_reduction >= 0) AND (risk_reduction <= 100))),
    CONSTRAINT features_time_criticality_check CHECK (((time_criticality >= 0) AND (time_criticality <= 100)))
);


--
-- Name: forecast_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forecast_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_item_id uuid NOT NULL,
    work_item_type text NOT NULL,
    pi_id uuid NOT NULL,
    program_id uuid,
    team_id uuid,
    estimate numeric DEFAULT 0 NOT NULL,
    unit text DEFAULT 'points'::text NOT NULL,
    in_scope boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    CONSTRAINT forecast_entries_scope_check CHECK ((((program_id IS NULL) AND (team_id IS NULL)) OR ((program_id IS NOT NULL) AND (team_id IS NULL)) OR ((program_id IS NULL) AND (team_id IS NOT NULL)))),
    CONSTRAINT forecast_entries_unit_check CHECK ((unit = ANY (ARRAY['points'::text, 'team_weeks'::text, 'member_weeks'::text]))),
    CONSTRAINT forecast_entries_work_item_type_check CHECK ((work_item_type = ANY (ARRAY['epic'::text, 'capability'::text, 'feature'::text])))
);


--
-- Name: goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    snapshot_id uuid NOT NULL,
    level text NOT NULL,
    title text NOT NULL,
    description text,
    owner_user_id uuid,
    status text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT goals_level_check CHECK ((level = ANY (ARRAY['mission'::text, 'vision'::text, 'value'::text, 'north_star'::text, 'long_term_goal'::text, 'long_term_strategy'::text, 'yearly_goal'::text, 'strategic_goal'::text, 'portfolio'::text, 'program'::text, 'team'::text])))
);


--
-- Name: hierarchy_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hierarchy_configs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    level_key text NOT NULL,
    enabled boolean DEFAULT true,
    display_name text NOT NULL,
    sort_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: idea_group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.idea_group_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT idea_group_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'contributor'::text])))
);


--
-- Name: idea_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.idea_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(50) DEFAULT 'Enhancement'::character varying NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    make_states_public boolean DEFAULT false NOT NULL,
    allow_voting boolean DEFAULT true NOT NULL,
    voting_type character varying(20) DEFAULT 'ForAgainst'::character varying NOT NULL,
    max_votes_per_idea integer,
    total_user_tokens integer DEFAULT 10 NOT NULL,
    approve_external_users boolean DEFAULT false NOT NULL,
    external_link character varying(500),
    form_id uuid,
    product_id uuid,
    admin_user_ids uuid[] DEFAULT '{}'::uuid[],
    contributor_user_ids uuid[] DEFAULT '{}'::uuid[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT idea_groups_category_check CHECK (((category)::text = ANY ((ARRAY['Enhancement'::character varying, 'Question'::character varying, 'Ticket'::character varying])::text[]))),
    CONSTRAINT idea_groups_voting_type_check CHECK (((voting_type)::text = ANY ((ARRAY['ForAgainst'::character varying, 'Token'::character varying])::text[])))
);


--
-- Name: ideas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ideas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    idea_group_id uuid NOT NULL,
    title character varying(1000) NOT NULL,
    description text NOT NULL,
    status character varying(50) DEFAULT 'New'::character varying NOT NULL,
    t_shirt_size character varying(10),
    is_public boolean DEFAULT true NOT NULL,
    owner_id uuid,
    created_by_id uuid,
    product_id uuid,
    customer_id uuid,
    work_item_id uuid,
    work_item_type character varying(20),
    vote_score integer DEFAULT 0 NOT NULL,
    for_votes integer DEFAULT 0 NOT NULL,
    against_votes integer DEFAULT 0 NOT NULL,
    token_votes integer DEFAULT 0 NOT NULL,
    comment_count integer DEFAULT 0 NOT NULL,
    attachment_count integer DEFAULT 0 NOT NULL,
    custom_fields jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ideas_status_check CHECK (((status)::text = ANY ((ARRAY['New'::character varying, 'Open'::character varying, 'Planned'::character varying, 'Completed'::character varying, 'Shelved'::character varying])::text[]))),
    CONSTRAINT ideas_t_shirt_size_check CHECK (((t_shirt_size)::text = ANY ((ARRAY['XS'::character varying, 'S'::character varying, 'M'::character varying, 'L'::character varying, 'XL'::character varying])::text[]))),
    CONSTRAINT ideas_work_item_type_check CHECK (((work_item_type)::text = ANY ((ARRAY['Epic'::character varying, 'Feature'::character varying, 'Story'::character varying])::text[])))
);


--
-- Name: ideation_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ideation_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    idea_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    file_type character varying(50) NOT NULL,
    file_size integer NOT NULL,
    file_url text NOT NULL,
    uploaded_by_id uuid NOT NULL,
    is_external boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ideation_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ideation_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    idea_id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_external boolean DEFAULT false NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ideation_external_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ideation_external_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    password_hash text NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    is_approved boolean DEFAULT false NOT NULL,
    registered_group_ids uuid[] DEFAULT '{}'::uuid[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone
);


--
-- Name: ideation_form_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ideation_form_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    form_id uuid NOT NULL,
    label character varying(255) NOT NULL,
    field_type character varying(50) NOT NULL,
    options jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    is_external boolean DEFAULT false NOT NULL,
    help_text text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ideation_form_fields_field_type_check CHECK (((field_type)::text = ANY ((ARRAY['textbox'::character varying, 'opentext'::character varying, 'dropdown'::character varying])::text[])))
);


--
-- Name: ideation_forms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ideation_forms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ideation_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ideation_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    idea_id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_external boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ideation_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ideation_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    idea_id uuid NOT NULL,
    user_id uuid NOT NULL,
    vote_type character varying(20) NOT NULL,
    token_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ideation_votes_vote_type_check CHECK (((vote_type)::text = ANY ((ARRAY['For'::character varying, 'Against'::character varying, 'Token'::character varying])::text[])))
);


--
-- Name: import_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_name character varying(255) NOT NULL,
    file_type character varying(20) NOT NULL,
    total_records integer DEFAULT 0 NOT NULL,
    imported_records integer DEFAULT 0 NOT NULL,
    failed_records integer DEFAULT 0 NOT NULL,
    imported_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT import_history_file_type_check CHECK (((file_type)::text = ANY ((ARRAY['csv'::character varying, 'excel'::character varying])::text[])))
);


--
-- Name: initiatives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.initiatives (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    theme_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    owner_id uuid,
    status public.initiative_status DEFAULT 'proposed'::public.initiative_status,
    wsjf_score numeric DEFAULT 0,
    benefit_score numeric DEFAULT 0,
    target_pi_ids jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: intake_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intake_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    intake_set_id uuid,
    field_name text NOT NULL,
    field_type text DEFAULT 'text'::text,
    "position" integer NOT NULL,
    options text[],
    max_length integer DEFAULT 500,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: intake_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intake_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    portfolio_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: integration_connectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_connectors (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    type public.integration_type NOT NULL,
    endpoint text,
    auth_method public.auth_method,
    auth_config_json jsonb,
    enabled boolean DEFAULT false,
    last_test_status public.test_status DEFAULT 'never_tested'::public.test_status,
    last_test_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: iterations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.iterations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    pi_id uuid NOT NULL,
    team_id uuid,
    name text NOT NULL,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    short_name text,
    goal text,
    sync_date timestamp with time zone
);


--
-- Name: jira_auth_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jira_auth_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connection_id uuid NOT NULL,
    auth_data jsonb NOT NULL,
    refresh_token text,
    token_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: jira_board_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jira_board_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connection_id uuid NOT NULL,
    jira_board_id text NOT NULL,
    jira_board_name text NOT NULL,
    jira_project_key text NOT NULL,
    catalyst_team_id uuid,
    is_active boolean DEFAULT true,
    sync_enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: jira_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jira_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    jira_url text NOT NULL,
    instance_type text NOT NULL,
    auth_method text NOT NULL,
    is_active boolean DEFAULT true,
    last_sync_at timestamp with time zone,
    last_test_status text,
    last_test_message text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sync_settings jsonb DEFAULT '{"sync_comments": true, "sync_direction": "bidirectional", "sync_work_logs": false, "sync_attachments": true, "auto_sync_enabled": false, "conflict_resolution": "jira_wins", "sync_interval_minutes": 15}'::jsonb,
    CONSTRAINT jira_connections_auth_method_check CHECK ((auth_method = ANY (ARRAY['oauth1'::text, 'pat'::text, 'api_token'::text]))),
    CONSTRAINT jira_connections_instance_type_check CHECK ((instance_type = ANY (ARRAY['cloud'::text, 'server'::text, 'data_center'::text]))),
    CONSTRAINT jira_connections_last_test_status_check CHECK ((last_test_status = ANY (ARRAY['success'::text, 'failed'::text, 'pending'::text])))
);


--
-- Name: jira_field_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jira_field_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connection_id uuid NOT NULL,
    catalyst_entity text NOT NULL,
    catalyst_field text NOT NULL,
    jira_field text NOT NULL,
    jira_field_type text,
    sync_direction text DEFAULT 'bidirectional'::text,
    transformation_rules jsonb,
    is_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT jira_field_mappings_sync_direction_check CHECK ((sync_direction = ANY (ARRAY['catalyst_to_jira'::text, 'jira_to_catalyst'::text, 'bidirectional'::text])))
);


--
-- Name: jira_project_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jira_project_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connection_id uuid NOT NULL,
    jira_project_id text NOT NULL,
    jira_project_key text NOT NULL,
    jira_project_name text NOT NULL,
    catalyst_program_id uuid,
    is_active boolean DEFAULT true,
    sync_enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: jira_sync_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jira_sync_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connection_id uuid NOT NULL,
    sync_type text NOT NULL,
    entity_type text,
    status text NOT NULL,
    items_processed integer DEFAULT 0,
    items_created integer DEFAULT 0,
    items_updated integer DEFAULT 0,
    items_failed integer DEFAULT 0,
    error_details jsonb,
    started_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT jira_sync_logs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'success'::text, 'failed'::text, 'partial'::text]))),
    CONSTRAINT jira_sync_logs_sync_type_check CHECK ((sync_type = ANY (ARRAY['full'::text, 'incremental'::text, 'manual'::text])))
);


--
-- Name: jira_work_item_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jira_work_item_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connection_id uuid NOT NULL,
    catalyst_entity_type text NOT NULL,
    catalyst_entity_id uuid NOT NULL,
    jira_issue_id text NOT NULL,
    jira_issue_key text NOT NULL,
    jira_issue_type text NOT NULL,
    last_synced_at timestamp with time zone,
    sync_status text,
    conflict_details jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT jira_work_item_links_sync_status_check CHECK ((sync_status = ANY (ARRAY['synced'::text, 'pending'::text, 'conflict'::text, 'error'::text])))
);


--
-- Name: kanban_board_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kanban_board_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    board_id uuid,
    user_id uuid,
    role character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT kanban_board_users_role_check CHECK (((role)::text = ANY ((ARRAY['Admin'::character varying, 'Edit Boards'::character varying, 'Manage Cards'::character varying, 'View Cards'::character varying])::text[])))
);


--
-- Name: kanban_boards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kanban_boards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    team_id uuid,
    program_id uuid,
    portfolio_id uuid,
    card_types jsonb DEFAULT '["Epic", "Feature", "Story"]'::jsonb,
    settings jsonb DEFAULT '{"showTags": true, "showTeam": false, "macroView": false, "smallCards": false, "mapColumnStates": true, "showExitCriteria": false}'::jsonb,
    allow_overloading boolean DEFAULT false,
    allow_state_mapping boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: kanban_card_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kanban_card_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    card_id uuid,
    from_column_id uuid,
    to_column_id uuid,
    moved_by uuid,
    moved_at timestamp with time zone DEFAULT now(),
    wip_override_reason text
);


--
-- Name: kanban_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kanban_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    board_id uuid,
    column_id uuid,
    swim_lane_id uuid,
    work_item_type character varying(50) NOT NULL,
    work_item_id uuid NOT NULL,
    sort_order integer DEFAULT 0,
    card_type character varying(50) DEFAULT 'Default'::character varying,
    color character varying(50),
    is_blocked boolean DEFAULT false,
    added_at timestamp with time zone DEFAULT now()
);


--
-- Name: kanban_columns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kanban_columns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    board_id uuid,
    name character varying(100) NOT NULL,
    column_type character varying(50) NOT NULL,
    wip_limit integer,
    exit_criteria text,
    sort_order integer DEFAULT 0,
    state_mappings jsonb DEFAULT '[]'::jsonb,
    parent_column_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT kanban_columns_column_type_check CHECK (((column_type)::text = ANY ((ARRAY['Not Started'::character varying, 'In Progress'::character varying, 'Completed'::character varying, 'Accepted'::character varying])::text[])))
);


--
-- Name: kanban_swim_lanes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kanban_swim_lanes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    board_id uuid,
    name character varying(100) NOT NULL,
    wip_limit integer,
    sort_order integer DEFAULT 0,
    is_collapsed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: kb_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id uuid NOT NULL,
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kb_doc_spaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_doc_spaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kb_document_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_document_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    filename text NOT NULL,
    file_path text NOT NULL,
    file_size bigint NOT NULL,
    mime_type text NOT NULL,
    uploaded_by uuid NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kb_document_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_document_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    parent_comment_id uuid,
    content text NOT NULL,
    author_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved boolean DEFAULT false
);


--
-- Name: kb_document_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_document_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kb_document_jira_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_document_jira_issues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    work_item_id text NOT NULL,
    work_item_type text NOT NULL,
    work_item_title text NOT NULL,
    work_item_status text NOT NULL,
    work_item_assignee text,
    cached_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kb_document_labels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_document_labels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    label text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kb_document_page_properties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_document_page_properties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    property_key text NOT NULL,
    property_value text NOT NULL,
    property_type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kb_document_page_properties_property_type_check CHECK ((property_type = ANY (ARRAY['text'::text, 'user'::text, 'date'::text, 'status'::text, 'dropdown'::text])))
);


--
-- Name: kb_document_restrictions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_document_restrictions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    restriction_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kb_document_restrictions_entity_type_check CHECK ((entity_type = ANY (ARRAY['user'::text, 'group'::text]))),
    CONSTRAINT kb_document_restrictions_restriction_type_check CHECK ((restriction_type = ANY (ARRAY['view'::text, 'edit'::text])))
);


--
-- Name: kb_document_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_document_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    version_number integer NOT NULL,
    title text NOT NULL,
    content jsonb NOT NULL,
    content_text text,
    change_summary text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kb_document_watchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_document_watchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kb_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    space_id uuid,
    title text NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    content_text text,
    parent_id uuid,
    linked_work_item_id text,
    linked_work_item_type text,
    created_by uuid NOT NULL,
    updated_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone,
    search_vector tsvector GENERATED ALWAYS AS ((setweight(to_tsvector('english'::regconfig, COALESCE(title, ''::text)), 'A'::"char") || setweight(to_tsvector('english'::regconfig, COALESCE(content_text, ''::text)), 'B'::"char"))) STORED,
    CONSTRAINT kb_documents_linked_work_item_type_check CHECK ((linked_work_item_type = ANY (ARRAY['epic'::text, 'feature'::text, 'story'::text, 'subtask'::text, 'bug'::text, 'business_request'::text])))
);


--
-- Name: kb_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kb_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    key text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: key_result_checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.key_result_checkins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key_result_id uuid,
    checked_in_at timestamp with time zone DEFAULT now() NOT NULL,
    value numeric NOT NULL,
    note_richtext text,
    created_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: key_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.key_results (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    objective_id uuid NOT NULL,
    name text NOT NULL,
    target_value numeric,
    current_value numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: key_results_v2; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.key_results_v2 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    objective_id uuid,
    summary text NOT NULL,
    metric_type text NOT NULL,
    current_value numeric DEFAULT 0,
    goal_value numeric NOT NULL,
    baseline_value numeric DEFAULT 0,
    owner_user_id uuid,
    due_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    target_value numeric,
    start_date date,
    end_date date,
    score numeric(3,2),
    status text DEFAULT 'pending'::text,
    owner_id uuid,
    score_config jsonb DEFAULT '{}'::jsonb,
    last_checkin_at timestamp with time zone,
    direction text DEFAULT 'increase'::text,
    update_frequency text DEFAULT 'weekly'::text,
    last_update_date timestamp with time zone,
    is_manual_override_allowed boolean DEFAULT true,
    override_value numeric,
    override_reason text,
    locked boolean DEFAULT false,
    health text DEFAULT 'grey'::text,
    progress numeric DEFAULT 0,
    CONSTRAINT key_results_v2_metric_type_check CHECK ((metric_type = ANY (ARRAY['percentage'::text, 'count'::text, 'cost_currency'::text, 'nps'::text, 'score'::text])))
);


--
-- Name: kr_work_contributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kr_work_contributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key_result_id uuid NOT NULL,
    work_item_id uuid NOT NULL,
    work_item_type text NOT NULL,
    contribution_percent numeric NOT NULL,
    calculated_progress numeric DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT kr_work_contributions_contribution_percent_check CHECK (((contribution_percent > (0)::numeric) AND (contribution_percent <= (100)::numeric))),
    CONSTRAINT kr_work_contributions_work_item_type_check CHECK ((work_item_type = ANY (ARRAY['epic'::text, 'feature'::text, 'story'::text])))
);


--
-- Name: milestone_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestone_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    portfolio_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_item_id uuid,
    title text NOT NULL,
    description text,
    start_date date,
    due_date date NOT NULL,
    state text DEFAULT 'not_started'::text,
    category text DEFAULT 'general'::text,
    milestone_type text DEFAULT 'target_completion'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    epic_id uuid,
    category_id uuid,
    completed_date date,
    business_request_id uuid
);


--
-- Name: module_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    is_default_enabled boolean DEFAULT false,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text,
    type text DEFAULT 'info'::text NOT NULL,
    entity_type text,
    entity_id uuid,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: objective_capability_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objective_capability_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    objective_id uuid NOT NULL,
    capability_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: objective_contributors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objective_contributors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    objective_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: objective_dependencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objective_dependencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    objective_id uuid,
    label text NOT NULL,
    state text DEFAULT 'NC'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT objective_dependencies_state_check CHECK ((state = ANY (ARRAY['NC'::text, 'C'::text, 'D'::text, 'B'::text])))
);


--
-- Name: objective_epic_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objective_epic_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    objective_id uuid,
    epic_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: objective_feature_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objective_feature_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    objective_id uuid NOT NULL,
    feature_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: objective_impediments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objective_impediments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    objective_id uuid,
    label text NOT NULL,
    status text DEFAULT 'open'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT objective_impediments_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text])))
);


--
-- Name: objective_initiative_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objective_initiative_links (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    objective_id uuid NOT NULL,
    initiative_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: objective_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objective_levels (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    scope_type public.objective_scope_type NOT NULL,
    scope_id uuid,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: objective_linked_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objective_linked_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    objective_id uuid NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    link_type text DEFAULT 'external'::text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: objective_program_increments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objective_program_increments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    objective_id uuid NOT NULL,
    program_increment_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: objective_risks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objective_risks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    objective_id uuid,
    label text NOT NULL,
    roam_state text DEFAULT 'R'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT objective_risks_roam_state_check CHECK ((roam_state = ANY (ARRAY['R'::text, 'O'::text, 'A'::text, 'M'::text])))
);


--
-- Name: objective_theme_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objective_theme_links (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    objective_id uuid NOT NULL,
    theme_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: objective_work_item_alignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objective_work_item_alignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    objective_id uuid NOT NULL,
    work_item_id uuid NOT NULL,
    work_item_type public.work_item_type_enum NOT NULL,
    alignment_type public.alignment_type DEFAULT 'direct'::public.alignment_type,
    created_at timestamp with time zone DEFAULT now(),
    created_by_user_id uuid
);


--
-- Name: objective_work_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objective_work_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    objective_id uuid NOT NULL,
    work_item_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: objectives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.objectives (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    objective_level_id uuid,
    name text NOT NULL,
    owner_id uuid,
    start_date date,
    end_date date,
    progress_pct numeric DEFAULT 0,
    confidence public.confidence_level DEFAULT 'med'::public.confidence_level,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    snapshot_id uuid,
    parent_goal_id uuid,
    level text DEFAULT 'portfolio'::text,
    parent_objective_id uuid,
    program_increment_ids jsonb DEFAULT '[]'::jsonb,
    anchor_sprint_id uuid,
    blocked boolean DEFAULT false,
    confidence_score numeric,
    goal_id uuid,
    summary text,
    description text,
    tier text,
    portfolio_id uuid,
    program_id uuid,
    team_id uuid,
    parent_key_result_id uuid,
    due_date date,
    target_anchor_sprint_id uuid,
    contributors uuid[] DEFAULT '{}'::uuid[],
    score numeric(3,2),
    confidence_note text,
    confidence_updated_at timestamp with time zone,
    work_progress numeric(3,2) DEFAULT 0,
    key_result_progress numeric(3,2) DEFAULT 0,
    objective_type text,
    theme_id uuid,
    tags text[] DEFAULT '{}'::text[],
    created_by uuid,
    updated_by uuid,
    category public.objective_category,
    type public.objective_type,
    health public.objective_health,
    status public.objective_status DEFAULT 'pending'::public.objective_status,
    planned_value integer,
    delivered_value integer,
    is_blocked boolean DEFAULT false,
    notes text,
    visibility text DEFAULT 'org-wide'::text,
    overall_progress numeric DEFAULT 0,
    is_v2 boolean DEFAULT false,
    CONSTRAINT objectives_confidence_score_check CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric))),
    CONSTRAINT objectives_delivered_value_check CHECK (((delivered_value >= 0) AND (delivered_value <= 100))),
    CONSTRAINT objectives_level_check CHECK ((level = ANY (ARRAY['strategic_goal'::text, 'portfolio'::text, 'program'::text, 'team'::text]))),
    CONSTRAINT objectives_planned_value_check CHECK (((planned_value >= 0) AND (planned_value <= 100))),
    CONSTRAINT objectives_progress_pct_check CHECK (((progress_pct >= (0)::numeric) AND (progress_pct <= (100)::numeric))),
    CONSTRAINT objectives_tier_check CHECK ((tier = ANY (ARRAY['portfolio'::text, 'program'::text, 'team'::text])))
);


--
-- Name: org_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_code text NOT NULL,
    is_enabled boolean DEFAULT true,
    enabled_by uuid,
    enabled_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: package_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.package_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    package_code text NOT NULL,
    module_code text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: permission_grants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permission_grants (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    role_id uuid NOT NULL,
    scope_type public.permission_scope NOT NULL,
    scope_id uuid,
    entity_type text NOT NULL,
    action public.permission_action NOT NULL,
    allowed boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: permission_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permission_roles (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: pi_objectives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pi_objectives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pi_id uuid NOT NULL,
    program_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    committed boolean DEFAULT true NOT NULL,
    stretch boolean DEFAULT false NOT NULL,
    planned_bv integer DEFAULT 0,
    actual_bv integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: portfolio_estimation_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_estimation_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portfolio_id uuid,
    estimation_system text DEFAULT 'points'::text NOT NULL,
    display_weeks_in text DEFAULT 'member_weeks'::text,
    member_weeks_per_point numeric DEFAULT 0.2,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT portfolio_estimation_settings_display_weeks_in_check CHECK ((display_weeks_in = ANY (ARRAY['member_weeks'::text, 'team_weeks'::text]))),
    CONSTRAINT portfolio_estimation_settings_estimation_system_check CHECK ((estimation_system = ANY (ARRAY['tshirt'::text, 'points'::text, 'weeks'::text])))
);


--
-- Name: portfolio_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portfolio_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: portfolios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolios (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    owner_id uuid,
    status public.portfolio_status DEFAULT 'active'::public.portfolio_status,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: predictability_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.predictability_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pi_id uuid NOT NULL,
    program_id uuid NOT NULL,
    planned_bv integer DEFAULT 0,
    actual_bv integer DEFAULT 0,
    planned_features integer DEFAULT 0,
    completed_features integer DEFAULT 0,
    predictability_score numeric,
    commitment_reliability numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: process_flows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.process_flows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: process_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.process_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    process_flow_id uuid NOT NULL,
    name text NOT NULL,
    sort_order integer NOT NULL,
    exit_criteria text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    wip_limit integer,
    wip_limit_enabled boolean DEFAULT false
);


--
-- Name: product_role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    permission_group text NOT NULL,
    permission_level text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT product_role_permissions_permission_level_check CHECK ((permission_level = ANY (ARRAY['Full'::text, 'View only'::text, 'Own only'::text, 'None'::text])))
);


--
-- Name: product_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    scope text DEFAULT 'Product'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_status_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_status_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    status_key text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    color text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_status_configs_category_check CHECK ((category = ANY (ARRAY['todo'::text, 'inprogress'::text, 'done'::text, 'other'::text])))
);


--
-- Name: product_view_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_view_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_line_id uuid,
    view_type text NOT NULL,
    column_key text NOT NULL,
    display_name text NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    is_default_sort boolean DEFAULT false NOT NULL,
    sort_direction text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_view_configs_sort_direction_check CHECK ((sort_direction = ANY (ARRAY['asc'::text, 'desc'::text]))),
    CONSTRAINT product_view_configs_view_type_check CHECK ((view_type = ANY (ARRAY['list'::text, 'kanban'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    avatar_url text,
    role text DEFAULT 'user'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'Active'::text NOT NULL,
    last_login timestamp with time zone,
    must_change_password boolean DEFAULT false NOT NULL,
    CONSTRAINT profiles_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Inactive'::text, 'Pending'::text])))
);


--
-- Name: program_increments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_increments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    portfolio_id uuid NOT NULL,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    state public.pi_state DEFAULT 'planned'::public.pi_state,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: program_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: program_spend_per_point; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_spend_per_point (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid,
    sprint_start_date date NOT NULL,
    sprint_end_date date NOT NULL,
    spend_per_point numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: program_team_rankings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_team_rankings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid NOT NULL,
    team_id uuid NOT NULL,
    rank_order integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    portfolio_id uuid NOT NULL,
    name text NOT NULL,
    rte_id uuid,
    status public.program_status DEFAULT 'active'::public.program_status,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: recent_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recent_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    room_type public.room_type NOT NULL,
    room_id uuid NOT NULL,
    room_name text NOT NULL,
    room_subtitle text,
    room_path text NOT NULL,
    pi_label text,
    last_accessed_at timestamp with time zone DEFAULT now() NOT NULL,
    access_count integer DEFAULT 1 NOT NULL,
    page_key text DEFAULT 'room'::text NOT NULL,
    timebox_type text,
    timebox_id uuid
);


--
-- Name: release_feature_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.release_feature_links (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    release_id uuid NOT NULL,
    feature_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: release_story_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.release_story_links (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    release_id uuid NOT NULL,
    story_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: release_vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.release_vehicles (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    program_id uuid,
    portfolio_id uuid,
    name text NOT NULL,
    type public.release_vehicle_type NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: releases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.releases (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    release_vehicle_id uuid NOT NULL,
    name text NOT NULL,
    target_date date,
    status public.release_status DEFAULT 'planned'::public.release_status,
    readiness_pct numeric DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT releases_readiness_pct_check CHECK (((readiness_pct >= (0)::numeric) AND (readiness_pct <= (100)::numeric)))
);


--
-- Name: report_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    report_type text NOT NULL,
    config_json jsonb,
    enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: risks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    risk_number integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'Open'::text NOT NULL,
    occurrence text,
    impact text,
    critical_path text,
    program_id uuid,
    program_increment_id uuid,
    owner_id uuid,
    relationship text NOT NULL,
    related_item_id uuid,
    resolution_method text DEFAULT 'Owned'::text NOT NULL,
    target_resolution_date date,
    notify text,
    consequence text,
    contingency text,
    mitigation text,
    resolution_status text,
    tags text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    business_request_id uuid,
    CONSTRAINT check_mitigation_required CHECK (((resolution_method <> 'Mitigated'::text) OR ((mitigation IS NOT NULL) AND (mitigation <> ''::text)))),
    CONSTRAINT check_resolution_status_required CHECK (((resolution_method <> 'Resolved'::text) OR ((resolution_status IS NOT NULL) AND (resolution_status <> ''::text)))),
    CONSTRAINT risks_consequence_check CHECK ((length(consequence) <= 2000)),
    CONSTRAINT risks_context_check CHECK (((program_id IS NOT NULL) OR (business_request_id IS NOT NULL))),
    CONSTRAINT risks_contingency_check CHECK ((length(contingency) <= 2000)),
    CONSTRAINT risks_critical_path_check CHECK ((critical_path = ANY (ARRAY['Yes'::text, 'No'::text]))),
    CONSTRAINT risks_description_check CHECK ((length(description) <= 400000)),
    CONSTRAINT risks_impact_check CHECK ((impact = ANY (ARRAY['Low'::text, 'Medium'::text, 'High'::text, 'Critical'::text]))),
    CONSTRAINT risks_mitigation_check CHECK ((length(mitigation) <= 2000)),
    CONSTRAINT risks_notify_check CHECK ((length(notify) <= 2000)),
    CONSTRAINT risks_occurrence_check CHECK ((occurrence = ANY (ARRAY['Low'::text, 'Medium'::text, 'High'::text, 'Critical'::text]))),
    CONSTRAINT risks_relationship_check CHECK ((relationship = ANY (ARRAY['Theme'::text, 'Epic'::text, 'Capability'::text, 'Feature'::text, 'Program Increment'::text]))),
    CONSTRAINT risks_resolution_method_check CHECK ((resolution_method = ANY (ARRAY['Resolved'::text, 'Owned'::text, 'Accepted'::text, 'Mitigated'::text]))),
    CONSTRAINT risks_resolution_status_check CHECK ((length(resolution_status) <= 2000)),
    CONSTRAINT risks_status_check CHECK ((status = ANY (ARRAY['Open'::text, 'Closed'::text]))),
    CONSTRAINT risks_tags_check CHECK ((length(tags) <= 2000)),
    CONSTRAINT risks_title_check CHECK ((length(title) <= 100))
);


--
-- Name: risks_risk_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.risks_risk_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: risks_risk_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.risks_risk_number_seq OWNED BY public.risks.risk_number;


--
-- Name: roadmap_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roadmap_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_increment_id uuid NOT NULL,
    work_item_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    has_milestone_flag boolean DEFAULT false NOT NULL,
    has_star_marker boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: saved_filters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_filters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    query text,
    type text DEFAULT 'all'::text,
    status text DEFAULT 'all'::text,
    is_starred boolean DEFAULT false,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scheduled_emails; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    message text NOT NULL,
    frequency text NOT NULL,
    send_day integer NOT NULL,
    send_time time without time zone NOT NULL,
    recipient_filter jsonb,
    notify_roles text[],
    notify_emails text[],
    is_active boolean DEFAULT true NOT NULL,
    last_sent timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL,
    CONSTRAINT scheduled_emails_frequency_check CHECK ((frequency = ANY (ARRAY['weekly'::text, 'monthly'::text])))
);


--
-- Name: scorecard_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scorecard_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    question_id uuid,
    answer_text text NOT NULL,
    percentage integer NOT NULL,
    "position" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT scorecard_answers_percentage_check CHECK (((percentage >= 0) AND (percentage <= 100)))
);


--
-- Name: scorecard_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scorecard_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scorecard_id uuid,
    question text NOT NULL,
    max_points integer DEFAULT 100 NOT NULL,
    "position" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: scorecards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scorecards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    portfolio_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: shared_service_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shared_service_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shared_service_id uuid NOT NULL,
    team_id uuid NOT NULL,
    iteration_id uuid NOT NULL,
    allocated_points numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: shared_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shared_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    portfolio_id uuid,
    capacity_points numeric DEFAULT 0,
    allocation_type text DEFAULT 'percentage'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT shared_services_allocation_type_check CHECK ((allocation_type = ANY (ARRAY['percentage'::text, 'points'::text])))
);


--
-- Name: shared_test_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shared_test_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    expected_result text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    usage_count integer DEFAULT 0,
    CONSTRAINT title_not_empty CHECK (((title)::text <> ''::text))
);


--
-- Name: skill_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skill_requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    skill_id uuid NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    required_proficiency public.skill_proficiency_level DEFAULT 'intermediate'::public.skill_proficiency_level NOT NULL,
    required_count integer DEFAULT 1,
    priority character varying(20) DEFAULT 'medium'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    name_ar character varying(255),
    description text,
    category public.skill_category DEFAULT 'technical'::public.skill_category NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: snapshot_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.snapshot_configurations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    snapshot_id uuid NOT NULL,
    quarters text[] DEFAULT '{}'::text[] NOT NULL,
    themes text[] DEFAULT '{}'::text[] NOT NULL,
    org_structures text[] DEFAULT '{}'::text[],
    products text[] DEFAULT '{}'::text[],
    members uuid[] DEFAULT '{}'::uuid[],
    notify_on_activation boolean DEFAULT true,
    notify_on_changes boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: snapshot_strategy_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.snapshot_strategy_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    snapshot_id uuid NOT NULL,
    mission_ids uuid[] DEFAULT '{}'::uuid[],
    vision_ids uuid[] DEFAULT '{}'::uuid[],
    value_ids uuid[] DEFAULT '{}'::uuid[],
    goal_ids uuid[] DEFAULT '{}'::uuid[],
    theme_ids uuid[] DEFAULT '{}'::uuid[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    epic_ids uuid[] DEFAULT '{}'::uuid[]
);


--
-- Name: starred_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.starred_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    room_type public.room_type NOT NULL,
    room_id uuid NOT NULL,
    room_name text NOT NULL,
    room_subtitle text,
    room_path text NOT NULL,
    pi_label text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stories (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    feature_id uuid NOT NULL,
    team_id uuid,
    sprint_id uuid,
    name text NOT NULL,
    description text,
    acceptance_criteria text,
    assignee_id uuid,
    status public.story_status DEFAULT 'todo'::public.story_status,
    estimate_points numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    points_loe numeric,
    accepted_at timestamp with time zone,
    story_key text,
    title text NOT NULL,
    owner_id uuid,
    state text DEFAULT 'backlog'::text,
    story_points integer,
    priority text DEFAULT 'medium'::text,
    blocked boolean DEFAULT false,
    blocked_reason text,
    tags text[],
    rank_order integer,
    progress_pct integer DEFAULT 0,
    health text DEFAULT 'green'::text,
    deleted_at timestamp with time zone,
    parked_at timestamp with time zone,
    original_minutes integer DEFAULT 0,
    remaining_minutes integer DEFAULT 0,
    spent_minutes integer DEFAULT 0
);


--
-- Name: story_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: story_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_story_id uuid NOT NULL,
    to_story_id uuid,
    link_type text NOT NULL,
    external_url text,
    external_title text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    CONSTRAINT story_links_link_type_check CHECK ((link_type = ANY (ARRAY['blocks'::text, 'blocked_by'::text, 'relates_to'::text, 'duplicates'::text, 'duplicated_by'::text, 'parent_feature'::text])))
);


--
-- Name: strategic_goal_key_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strategic_goal_key_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    strategic_goal_id uuid NOT NULL,
    name character varying(500) NOT NULL,
    measurement_type character varying(50) NOT NULL,
    baseline_value numeric(15,2) DEFAULT 0,
    target_value numeric(15,2) NOT NULL,
    current_value numeric(15,2) DEFAULT 0,
    score numeric(3,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: strategic_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strategic_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    snapshot_id uuid,
    title text NOT NULL,
    description text,
    health_status text DEFAULT 'green'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tier character varying(50),
    parent_goal_id uuid,
    complete_percent numeric(5,2) DEFAULT 0,
    score numeric(3,2),
    owner_id uuid,
    status character varying(50) DEFAULT 'not_started'::character varying,
    CONSTRAINT strategic_goals_health_status_check CHECK ((health_status = ANY (ARRAY['green'::text, 'yellow'::text, 'red'::text, 'na'::text])))
);


--
-- Name: strategic_themes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strategic_themes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    owner_id uuid,
    status public.theme_status DEFAULT 'proposed'::public.theme_status,
    color_tag text,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    snapshot_id uuid NOT NULL
);


--
-- Name: strategy_missions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strategy_missions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid,
    title text NOT NULL,
    statement text,
    owner_id uuid,
    status text DEFAULT 'ACTIVE'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT strategy_missions_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'DRAFT'::text, 'ARCHIVED'::text])))
);


--
-- Name: strategy_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strategy_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    mission text,
    vision text,
    "values" jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    start_date date,
    end_date date,
    status text DEFAULT 'DRAFT'::text,
    total_funding numeric,
    created_by uuid,
    active_since timestamp with time zone,
    archived_at timestamp with time zone,
    enterprise_id uuid
);


--
-- Name: strategy_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strategy_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid,
    title text NOT NULL,
    statement text,
    owner_id uuid,
    status text DEFAULT 'ACTIVE'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT strategy_values_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'DRAFT'::text, 'ARCHIVED'::text])))
);


--
-- Name: strategy_visions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.strategy_visions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    enterprise_id uuid,
    title text NOT NULL,
    statement text,
    owner_id uuid,
    status text DEFAULT 'ACTIVE'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT strategy_visions_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'DRAFT'::text, 'ARCHIVED'::text])))
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscriptions_entity_type_check CHECK ((entity_type = ANY (ARRAY['themes'::text, 'epics'::text, 'capabilities'::text, 'features'::text, 'stories'::text, 'tasks'::text, 'defects'::text, 'dependencies'::text, 'risks'::text, 'sprints'::text, 'goals'::text, 'success_criteria'::text, 'ideas'::text])))
);


--
-- Name: subtasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subtasks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    story_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    assignee_id uuid,
    status public.subtask_status DEFAULT 'todo'::public.subtask_status,
    original_estimate_hours numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: team_member_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_member_skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_member_id uuid NOT NULL,
    skill_id uuid NOT NULL,
    proficiency_level public.skill_proficiency_level DEFAULT 'beginner'::public.skill_proficiency_level NOT NULL,
    years_experience numeric(4,1),
    is_primary_skill boolean DEFAULT false,
    self_assessed boolean DEFAULT true,
    manager_verified boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    role text,
    allocation_percentage integer DEFAULT 100,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT team_members_allocation_percentage_check CHECK (((allocation_percentage >= 1) AND (allocation_percentage <= 100)))
);


--
-- Name: team_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    iteration_id uuid,
    metric_date date NOT NULL,
    planned_velocity numeric,
    actual_velocity numeric,
    story_points_committed numeric,
    story_points_completed numeric,
    throughput numeric,
    cycle_time_avg numeric,
    wip_count integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: team_point_systems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_point_systems (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid,
    point_system text DEFAULT 'fibonacci'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT team_point_systems_point_system_check CHECK ((point_system = ANY (ARRAY['fibonacci'::text, 'power_of_2'::text])))
);


--
-- Name: team_spend_per_sprint; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_spend_per_sprint (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid,
    sprint_id uuid,
    team_spend numeric NOT NULL,
    points_accepted integer DEFAULT 0 NOT NULL,
    spend_per_point numeric GENERATED ALWAYS AS (
CASE
    WHEN (points_accepted > 0) THEN (team_spend / (points_accepted)::numeric)
    ELSE (0)::numeric
END) STORED,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: team_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    program_id uuid,
    name text NOT NULL,
    velocity_baseline numeric DEFAULT 0,
    status public.team_status DEFAULT 'active'::public.team_status,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    short_name text,
    team_type public.team_type DEFAULT 'AGILE'::public.team_type,
    sprint_prefix text,
    description text,
    parent_portfolio_id uuid,
    parent_program_id uuid,
    parent_solution_id uuid,
    region_id uuid,
    track_by public.track_by_type DEFAULT 'POINTS'::public.track_by_type,
    burn_hours numeric,
    allow_task_deletion boolean DEFAULT false,
    is_active boolean DEFAULT true,
    kanban_throughput numeric,
    kanban_auto_populate_estimate boolean DEFAULT false,
    kanban_wip_limit integer,
    created_by uuid,
    CONSTRAINT chk_short_name_length CHECK (((short_name IS NULL) OR (length(short_name) <= 5)))
);


--
-- Name: test_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    activity_type character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid NOT NULL,
    entity_title character varying(500),
    description text,
    created_at timestamp without time zone DEFAULT now(),
    program_id uuid
);


--
-- Name: test_case_bulk_operations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_case_bulk_operations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operation_type character varying(50) NOT NULL,
    case_ids uuid[] NOT NULL,
    operation_data jsonb,
    executed_by uuid,
    executed_at timestamp without time zone DEFAULT now(),
    status character varying(50) DEFAULT 'completed'::character varying,
    success_count integer DEFAULT 0,
    failure_count integer DEFAULT 0,
    error_messages text[]
);


--
-- Name: test_case_datasets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_case_datasets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    dataset_name character varying(255) NOT NULL,
    parameter_values jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: test_case_parameters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_case_parameters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    parameter_name character varying(100) NOT NULL,
    parameter_type character varying(50) DEFAULT 'string'::character varying,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: test_case_priorities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_case_priorities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid,
    name text NOT NULL,
    color text DEFAULT '#6b7280'::text,
    display_order integer DEFAULT 0 NOT NULL,
    is_default boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: test_case_shared_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_case_shared_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_case_id uuid NOT NULL,
    shared_step_id uuid NOT NULL,
    step_order integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: test_case_statuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_case_statuses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid,
    name text NOT NULL,
    viewable_by_owner_only boolean DEFAULT false,
    eligible_for_cycle_set boolean DEFAULT true,
    eligible_for_linked_step boolean DEFAULT true,
    display_order integer DEFAULT 0 NOT NULL,
    is_default boolean DEFAULT false,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: test_case_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_case_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    case_version integer DEFAULT 1,
    step_number integer NOT NULL,
    step_type character varying(50) DEFAULT 'action'::character varying,
    description text NOT NULL,
    expected_result text,
    test_data text,
    attachment_urls text[],
    is_bdd boolean DEFAULT false,
    bdd_keyword character varying(50),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: test_case_version_changes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_case_version_changes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    from_version integer,
    to_version integer NOT NULL,
    field_name character varying(100) NOT NULL,
    old_value text,
    new_value text,
    change_type character varying(50),
    changed_by uuid,
    changed_at timestamp without time zone DEFAULT now()
);


--
-- Name: test_case_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_case_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    version integer NOT NULL,
    title text NOT NULL,
    objective text,
    preconditions text,
    change_summary text,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    status character varying(50),
    priority character varying(50),
    owner_id uuid,
    folder_id uuid,
    component character varying(255),
    release character varying(255),
    labels text[],
    snapshot_data jsonb
);


--
-- Name: test_case_work_item_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_case_work_item_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    work_item_id uuid NOT NULL,
    work_item_type character varying(50),
    linked_at timestamp without time zone DEFAULT now(),
    linked_by uuid
);


--
-- Name: test_case_work_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_case_work_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_case_id uuid NOT NULL,
    work_item_id uuid NOT NULL,
    work_item_type character varying(50) NOT NULL,
    link_type character varying(50) DEFAULT 'covers'::character varying,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT test_case_work_items_link_type_check CHECK (((link_type)::text = ANY ((ARRAY['covers'::character varying, 'tests'::character varying, 'validates'::character varying, 'reproduces'::character varying])::text[]))),
    CONSTRAINT test_case_work_items_work_item_type_check CHECK (((work_item_type)::text = ANY ((ARRAY['story'::character varying, 'feature'::character varying, 'defect'::character varying, 'epic'::character varying, 'task'::character varying])::text[])))
);


--
-- Name: test_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(500) NOT NULL,
    description text,
    preconditions text,
    expected_result text,
    test_type public.test_type DEFAULT 'manual'::public.test_type NOT NULL,
    priority public.test_priority DEFAULT 'medium'::public.test_priority NOT NULL,
    status public.test_case_status DEFAULT 'draft'::public.test_case_status NOT NULL,
    folder_id uuid,
    linked_work_item_type character varying(50),
    linked_work_item_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    program_id uuid,
    objective text,
    component character varying(255),
    release character varying(255),
    estimated_effort integer,
    automation_status character varying(50) DEFAULT 'manual'::character varying,
    automation_owner_id uuid,
    automation_key character varying(255),
    case_type character varying(50) DEFAULT 'functional'::character varying,
    version integer DEFAULT 1,
    labels text[],
    owner_id uuid,
    is_archived boolean DEFAULT false,
    archived_at timestamp without time zone,
    archived_by uuid,
    deleted_at timestamp without time zone,
    deleted_by uuid,
    CONSTRAINT check_linked_work_item CHECK ((((linked_work_item_type IS NULL) AND (linked_work_item_id IS NULL)) OR ((linked_work_item_type IS NOT NULL) AND (linked_work_item_id IS NOT NULL))))
);


--
-- Name: test_cycle_case_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_cycle_case_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cycle_id uuid NOT NULL,
    case_id uuid NOT NULL,
    assigned_to uuid,
    sort_order integer DEFAULT 0,
    milestone character varying(100),
    estimated_effort integer DEFAULT 0,
    assigned_at timestamp with time zone DEFAULT now(),
    assigned_by uuid
);


--
-- Name: test_cycle_dependencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_cycle_dependencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cycle_id uuid NOT NULL,
    predecessor_case_id uuid NOT NULL,
    successor_case_id uuid NOT NULL,
    dependency_type character varying(50) DEFAULT 'finish_to_start'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: test_cycle_executions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_cycle_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cycle_id uuid NOT NULL,
    case_id uuid NOT NULL,
    case_version integer DEFAULT 1,
    assigned_to uuid,
    status character varying(50) DEFAULT 'not_executed'::character varying,
    executed_at timestamp without time zone,
    executed_by uuid,
    effort_minutes integer,
    comments text,
    created_at timestamp without time zone DEFAULT now(),
    overall_status_override boolean DEFAULT false,
    manual_status character varying(50),
    effort_estimated integer,
    effort_actual integer,
    timer_start_at timestamp without time zone,
    timer_paused_at timestamp without time zone,
    timer_accumulated_seconds integer DEFAULT 0,
    evidence_count integer DEFAULT 0
);


--
-- Name: test_cycle_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_cycle_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    project_id uuid,
    is_global boolean DEFAULT false,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: test_cycles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_cycles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    objective text,
    folder_id uuid,
    program_id uuid,
    owner_id uuid,
    status character varying(50) DEFAULT 'not_started'::character varying,
    start_date date,
    end_date date,
    environment character varying(255),
    is_adhoc boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp without time zone DEFAULT now(),
    build_version character varying(100),
    scope_locked boolean DEFAULT false,
    scope_locked_at timestamp with time zone,
    scope_locked_by uuid,
    auto_close_on_completion boolean DEFAULT false,
    email_notifications boolean DEFAULT true,
    archived boolean DEFAULT false,
    archived_at timestamp with time zone,
    archived_by uuid,
    archive_reason character varying(255),
    sync_with_set boolean DEFAULT false,
    source_set_id uuid,
    template_id uuid,
    custom_fields jsonb DEFAULT '{}'::jsonb
);


--
-- Name: test_dashboard_gadgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_dashboard_gadgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dashboard_id uuid,
    gadget_type character varying(100) NOT NULL,
    "position" jsonb DEFAULT '{"h": 2, "w": 2, "x": 0, "y": 0}'::jsonb NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: test_dashboard_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_dashboard_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dashboard_id uuid,
    shared_with_user_id uuid,
    can_edit boolean DEFAULT false,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: test_dashboard_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_dashboard_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category character varying(100),
    layout jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_system boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: test_dashboards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_dashboards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    user_id uuid,
    program_id uuid,
    layout jsonb DEFAULT '{"columns": 12}'::jsonb NOT NULL,
    is_default boolean DEFAULT false,
    visibility character varying(50) DEFAULT 'private'::character varying,
    template_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: test_data_parameters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_data_parameters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_case_id uuid NOT NULL,
    parameter_name character varying(255) NOT NULL,
    parameter_type character varying(50) DEFAULT 'string'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: test_data_rows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_data_rows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_case_id uuid NOT NULL,
    row_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: test_datasets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_datasets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cycle_id uuid,
    name character varying(255) NOT NULL,
    parameters jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: test_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_evidence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    execution_step_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    file_type character varying(50) NOT NULL,
    file_path text NOT NULL,
    file_size bigint NOT NULL,
    mime_type character varying(100) NOT NULL,
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT test_evidence_file_type_check CHECK (((file_type)::text = ANY ((ARRAY['image'::character varying, 'video'::character varying, 'document'::character varying, 'log'::character varying])::text[])))
);


--
-- Name: test_execution_defects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_execution_defects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    execution_id uuid NOT NULL,
    defect_work_item_id uuid NOT NULL,
    linked_at timestamp without time zone DEFAULT now(),
    linked_by uuid
);


--
-- Name: test_execution_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_execution_evidence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    execution_id uuid NOT NULL,
    step_order integer,
    file_name character varying(255) NOT NULL,
    file_url character varying(500) NOT NULL,
    file_type character varying(50),
    file_size_bytes integer,
    uploaded_at timestamp without time zone DEFAULT now(),
    uploaded_by uuid
);


--
-- Name: test_execution_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_execution_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cycle_id uuid,
    run_number integer NOT NULL,
    run_name character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    copied_from_run_id uuid
);


--
-- Name: test_execution_step_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_execution_step_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    execution_id uuid NOT NULL,
    step_order integer NOT NULL,
    step_description text NOT NULL,
    expected_result text,
    status character varying(50) DEFAULT 'not_executed'::character varying NOT NULL,
    actual_result text,
    comments text,
    executed_at timestamp without time zone DEFAULT now(),
    CONSTRAINT check_step_status CHECK (((status)::text = ANY ((ARRAY['not_executed'::character varying, 'passed'::character varying, 'failed'::character varying, 'blocked'::character varying, 'skipped'::character varying])::text[])))
);


--
-- Name: test_execution_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_execution_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_execution_id uuid NOT NULL,
    test_step_id uuid NOT NULL,
    status public.test_step_status NOT NULL,
    actual_result text,
    screenshot_url text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: test_executions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_case_id uuid NOT NULL,
    test_cycle_id uuid NOT NULL,
    executed_by uuid NOT NULL,
    execution_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status public.test_execution_status DEFAULT 'not_run'::public.test_execution_status NOT NULL,
    actual_result text,
    defect_id uuid,
    execution_time_seconds integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    program_id uuid,
    CONSTRAINT check_execution_time_positive CHECK (((execution_time_seconds IS NULL) OR (execution_time_seconds >= 0)))
);


--
-- Name: test_field_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_field_configurations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid,
    entity_type text NOT NULL,
    field_name text NOT NULL,
    field_label text NOT NULL,
    is_enabled boolean DEFAULT true,
    is_required boolean DEFAULT false,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT test_field_configurations_entity_type_check CHECK ((entity_type = ANY (ARRAY['case'::text, 'set'::text, 'cycle'::text, 'run'::text])))
);


--
-- Name: test_folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    parent_folder_id uuid,
    team_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    program_id uuid,
    entity_type character varying(50),
    sort_order integer DEFAULT 0,
    is_system boolean DEFAULT false,
    CONSTRAINT test_folders_entity_type_check CHECK (((entity_type)::text = ANY ((ARRAY['test_cases'::character varying, 'test_sets'::character varying, 'test_cycles'::character varying])::text[])))
);


--
-- Name: test_notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    notify_on_test_failure boolean DEFAULT true,
    notify_on_cycle_complete boolean DEFAULT true,
    daily_test_summary boolean DEFAULT false,
    weekly_test_report boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    email_notifications_enabled boolean DEFAULT true,
    notify_tagged_in_comment boolean DEFAULT true,
    notify_same_comment_edited boolean DEFAULT false,
    notify_case_assigned_cycle boolean DEFAULT true,
    notify_automation_owner_assigned boolean DEFAULT true,
    notify_run_step_assigned boolean DEFAULT true,
    notify_step_updated_as_owner boolean DEFAULT false
);


--
-- Name: test_report_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_report_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_type character varying(100) NOT NULL,
    program_id uuid NOT NULL,
    config jsonb NOT NULL,
    schedule_cron character varying(100) NOT NULL,
    recipients text[],
    format character varying(50) DEFAULT 'pdf'::character varying,
    is_active boolean DEFAULT true,
    last_run_at timestamp without time zone,
    next_run_at timestamp without time zone,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: test_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_type character varying(100) NOT NULL,
    program_id uuid NOT NULL,
    config jsonb NOT NULL,
    generated_at timestamp without time zone DEFAULT now(),
    generated_by uuid,
    file_url character varying(500),
    share_token character varying(100),
    share_expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: test_run_statuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_run_statuses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    program_id uuid,
    name text NOT NULL,
    highlight_color text DEFAULT '#6b7280'::text,
    status_type text NOT NULL,
    execution_completed boolean DEFAULT false,
    display_order integer DEFAULT 0 NOT NULL,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT test_run_statuses_status_type_check CHECK ((status_type = ANY (ARRAY['NOT_RUN'::text, 'IN_PROGRESS'::text, 'PASSED'::text, 'FAILED'::text, 'BLOCKED'::text])))
);


--
-- Name: test_set_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_set_cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    set_id uuid NOT NULL,
    case_id uuid NOT NULL,
    case_version integer DEFAULT 1,
    sort_order integer DEFAULT 0,
    added_at timestamp without time zone DEFAULT now(),
    added_by uuid
);


--
-- Name: test_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    objective text,
    folder_id uuid,
    program_id uuid NOT NULL,
    owner_id uuid,
    status character varying(50) DEFAULT 'active'::character varying,
    version integer DEFAULT 1,
    parent_version_id uuid,
    created_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: test_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_case_id uuid NOT NULL,
    step_order integer NOT NULL,
    action text NOT NULL,
    expected_result text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_shared boolean DEFAULT false,
    library_step_id uuid,
    CONSTRAINT check_step_order_positive CHECK ((step_order > 0))
);


--
-- Name: theme_epic_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.theme_epic_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    theme_id uuid NOT NULL,
    epic_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_app_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_app_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    default_project_id uuid,
    default_folder_view character varying(50) DEFAULT 'expanded'::character varying,
    table_rows_per_page integer DEFAULT 25,
    table_default_sort character varying(50) DEFAULT 'newest_first'::character varying,
    table_show_row_numbers boolean DEFAULT false,
    table_sticky_headers boolean DEFAULT true,
    table_zebra_striping boolean DEFAULT true,
    date_format character varying(50) DEFAULT 'MM/DD/YYYY'::character varying,
    time_format character varying(50) DEFAULT '12-hour'::character varying,
    time_zone character varying(100) DEFAULT 'UTC'::character varying,
    grid_default_columns jsonb DEFAULT '["testers"]'::jsonb,
    grid_cell_size character varying(50) DEFAULT 'medium'::character varying,
    grid_show_evidence boolean DEFAULT true,
    grid_show_defects boolean DEFAULT true,
    grid_highlight_failed boolean DEFAULT true,
    auto_save_enabled boolean DEFAULT true,
    auto_save_interval integer DEFAULT 60,
    warn_unsaved boolean DEFAULT true,
    keyboard_shortcuts_enabled boolean DEFAULT true,
    language character varying(10) DEFAULT 'en-US'::character varying,
    high_contrast boolean DEFAULT false,
    screen_reader_optimized boolean DEFAULT false,
    focus_indicators character varying(50) DEFAULT 'normal'::character varying,
    keyboard_navigation character varying(50) DEFAULT 'normal'::character varying,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_email_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_email_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    digest_mode character varying(50) DEFAULT 'immediate'::character varying,
    digest_time time without time zone DEFAULT '09:00:00'::time without time zone,
    digest_day character varying(20),
    email_template character varying(50) DEFAULT 'html'::character varying,
    include_logo boolean DEFAULT true,
    include_summary boolean DEFAULT true,
    include_links boolean DEFAULT true,
    signature text,
    quiet_hours_enabled boolean DEFAULT false,
    quiet_hours_start time without time zone DEFAULT '22:00:00'::time without time zone,
    quiet_hours_end time without time zone DEFAULT '08:00:00'::time without time zone,
    dnd_enabled boolean DEFAULT false,
    dnd_start_date date,
    dnd_end_date date,
    dnd_auto_reply text,
    max_emails_per_day integer DEFAULT 20,
    limit_action character varying(50) DEFAULT 'stop'::character varying,
    unsubscribed_all boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_epic_backlog_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_epic_backlog_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    selected_columns_main jsonb DEFAULT '[]'::jsonb,
    selected_columns_small jsonb DEFAULT '[]'::jsonb,
    last_view text DEFAULT 'list'::text,
    last_kanban_subview text DEFAULT 'state'::text,
    labels_display text DEFAULT 'program'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_forecast_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_forecast_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    visible_columns jsonb DEFAULT '["theme", "owner", "pi_estimate", "program_estimate", "team_estimate", "capacity_needed"]'::jsonb NOT NULL,
    filters jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_industry_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_industry_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    column_order text[] DEFAULT ARRAY['request_key'::text, 'rank'::text, 'title'::text, 'process_step'::text, 'business_score'::text, 'planned_quarter'::text, 'end_date'::text, 'ageing'::text],
    column_visibility jsonb DEFAULT '{"rank": true, "title": true, "ageing": true, "end_date": true, "request_key": true, "process_step": true, "business_score": true, "planned_quarter": true}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email_notifications_enabled boolean DEFAULT true NOT NULL,
    in_app_notifications_enabled boolean DEFAULT true NOT NULL,
    mention_notifications_enabled boolean DEFAULT true NOT NULL,
    subscription_notifications_enabled boolean DEFAULT true NOT NULL,
    workflow_notifications_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email_frequency text DEFAULT 'immediate'::text NOT NULL,
    notify_work_item_assigned boolean DEFAULT true NOT NULL,
    notify_work_item_state_change boolean DEFAULT true NOT NULL,
    notify_comments boolean DEFAULT true NOT NULL,
    notify_mentions boolean DEFAULT true NOT NULL,
    notify_subscriptions boolean DEFAULT true NOT NULL,
    notify_dependencies boolean DEFAULT true NOT NULL,
    notify_objectives boolean DEFAULT true NOT NULL,
    CONSTRAINT user_notification_preferences_email_frequency_check CHECK ((email_frequency = ANY (ARRAY['immediate'::text, 'daily'::text, 'weekly'::text])))
);


--
-- Name: user_notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notification_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    email_notifications_enabled boolean DEFAULT true,
    mention_notifications jsonb DEFAULT '{"enabled": true, "frequency": "immediate", "include_context": true}'::jsonb,
    assignment_notifications jsonb DEFAULT '{"cases": true, "cycles": true, "enabled": true, "frequency": "immediate", "threshold": 0, "executions": true}'::jsonb,
    automation_notifications jsonb DEFAULT '{"enabled": true, "frequency": "immediate", "threshold": 1, "first_only": true, "include_logs": true}'::jsonb,
    defect_notifications jsonb DEFAULT '{"enabled": true, "executions": true, "created_cases": true, "followed_cases": true, "priority_filter": "all"}'::jsonb,
    cycle_notifications jsonb DEFAULT '{"closed": true, "enabled": true, "started": true, "scope_changes": true}'::jsonb,
    report_notifications jsonb DEFAULT '{"failed": true, "format": "attachment", "enabled": true, "scheduled": true, "subscriptions": true}'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    type character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    link character varying(500),
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone
);


--
-- Name: user_permission_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_permission_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    permission_group text NOT NULL,
    override_value text NOT NULL,
    module text DEFAULT 'Product'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_permission_overrides_override_value_check CHECK ((override_value = ANY (ARRAY['Inherited'::text, 'Allow'::text, 'Deny'::text])))
);


--
-- Name: user_product_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_product_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    business_lines text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_role_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_role_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    action text NOT NULL,
    changed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    CONSTRAINT user_role_history_action_check CHECK ((action = ANY (ARRAY['assigned'::text, 'removed'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_theme_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_theme_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    theme_mode character varying(50) DEFAULT 'light'::character varying,
    accent_color character varying(7) DEFAULT '#c69c6d'::character varying,
    font_size character varying(50) DEFAULT 'medium'::character varying,
    density character varying(50) DEFAULT 'comfortable'::character varying,
    sidebar_default character varying(50) DEFAULT 'expanded'::character varying,
    sidebar_auto_collapse boolean DEFAULT false,
    sidebar_width character varying(50) DEFAULT 'medium'::character varying,
    animations_enabled boolean DEFAULT true,
    animation_speed character varying(50) DEFAULT 'normal'::character varying,
    reduce_motion boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: value_stream_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.value_stream_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portfolio_id uuid NOT NULL,
    metric_date date NOT NULL,
    lead_time_days numeric,
    cycle_time_days numeric,
    throughput integer,
    wip_count integer,
    flow_efficiency numeric,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: work_item_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_item_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_item_id uuid NOT NULL,
    work_item_type text NOT NULL,
    program_id uuid,
    team_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT work_item_assignments_check CHECK (((program_id IS NOT NULL) OR (team_id IS NOT NULL))),
    CONSTRAINT work_item_assignments_work_item_type_check CHECK ((work_item_type = ANY (ARRAY['epic'::text, 'capability'::text, 'feature'::text])))
);


--
-- Name: work_item_forecast_ranks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_item_forecast_ranks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_item_id uuid NOT NULL,
    work_item_type text NOT NULL,
    pi_id uuid NOT NULL,
    rank integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: work_item_key_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_item_key_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_item_id uuid NOT NULL,
    work_item_type text NOT NULL,
    old_key text NOT NULL,
    new_key text NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by uuid,
    reason text,
    CONSTRAINT work_item_key_history_work_item_type_check CHECK ((work_item_type = ANY (ARRAY['epic'::text, 'feature'::text, 'story'::text, 'defect'::text, 'task'::text, 'subtask'::text, 'demand'::text])))
);


--
-- Name: work_item_label_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_item_label_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: work_item_labels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_item_labels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    color text DEFAULT 'blue'::text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: work_item_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_item_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_work_item_id uuid NOT NULL,
    from_work_item_type text NOT NULL,
    to_work_item_id uuid NOT NULL,
    to_work_item_type text NOT NULL,
    link_type text DEFAULT 'predecessor'::text,
    program_id uuid,
    pi_id uuid,
    description text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT work_item_links_from_work_item_type_check CHECK ((from_work_item_type = ANY (ARRAY['epic'::text, 'feature'::text, 'story'::text, 'task'::text]))),
    CONSTRAINT work_item_links_link_type_check CHECK ((link_type = ANY (ARRAY['predecessor'::text, 'successor'::text, 'related'::text, 'blocks'::text, 'blocked_by'::text]))),
    CONSTRAINT work_item_links_to_work_item_type_check CHECK ((to_work_item_type = ANY (ARRAY['epic'::text, 'feature'::text, 'story'::text, 'task'::text])))
);


--
-- Name: work_item_presence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_item_presence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_item_type text NOT NULL,
    work_item_id uuid NOT NULL,
    user_id uuid NOT NULL,
    user_email text,
    user_name text,
    status text DEFAULT 'viewing'::text NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: work_item_rankings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_item_rankings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_item_id uuid NOT NULL,
    work_item_type text NOT NULL,
    context_type text NOT NULL,
    context_id uuid,
    pi_id uuid,
    rank integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT work_item_rankings_context_type_check CHECK ((context_type = ANY (ARRAY['global'::text, 'portfolio'::text, 'program'::text, 'team'::text]))),
    CONSTRAINT work_item_rankings_rank_check CHECK ((rank > 0)),
    CONSTRAINT work_item_rankings_work_item_type_check CHECK ((work_item_type = ANY (ARRAY['epic'::text, 'capability'::text, 'feature'::text, 'story'::text, 'theme'::text])))
);


--
-- Name: work_item_time_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_item_time_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_item_id uuid NOT NULL,
    work_item_type text NOT NULL,
    minutes_logged integer DEFAULT 0 NOT NULL,
    work_date date DEFAULT CURRENT_DATE NOT NULL,
    description text,
    logged_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT work_item_time_logs_work_item_type_check CHECK ((work_item_type = ANY (ARRAY['story'::text, 'feature'::text, 'epic'::text, 'task'::text])))
);


--
-- Name: work_item_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_item_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_item_id uuid NOT NULL,
    work_item_type text NOT NULL,
    release_id uuid NOT NULL,
    link_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    CONSTRAINT work_item_versions_link_type_check CHECK ((link_type = ANY (ARRAY['fix'::text, 'affects'::text]))),
    CONSTRAINT work_item_versions_work_item_type_check CHECK ((work_item_type = ANY (ARRAY['epic'::text, 'feature'::text, 'story'::text, 'defect'::text, 'task'::text, 'subtask'::text])))
);


--
-- Name: work_item_watchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_item_watchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    work_item_type text NOT NULL,
    work_item_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workflow_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    entity_type text NOT NULL,
    trigger_event text NOT NULL,
    state_value text,
    program_increment_id uuid,
    notify_roles text[],
    notify_emails text[],
    is_active boolean DEFAULT true NOT NULL,
    architecture_review_required boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    CONSTRAINT workflow_rules_trigger_event_check CHECK ((trigger_event = ANY (ARRAY['created'::text, 'updated'::text, 'deleted'::text, 'state_changed'::text])))
);


--
-- Name: risks risk_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risks ALTER COLUMN risk_number SET DEFAULT nextval('public.risks_risk_number_seq'::regclass);


--
-- Name: active_package active_package_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_package
    ADD CONSTRAINT active_package_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: anchor_sprints anchor_sprints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anchor_sprints
    ADD CONSTRAINT anchor_sprints_pkey PRIMARY KEY (id);


--
-- Name: announcement_dismissals announcement_dismissals_announcement_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_dismissals
    ADD CONSTRAINT announcement_dismissals_announcement_id_user_id_key UNIQUE (announcement_id, user_id);


--
-- Name: announcement_dismissals announcement_dismissals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_dismissals
    ADD CONSTRAINT announcement_dismissals_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: board_configs board_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.board_configs
    ADD CONSTRAINT board_configs_pkey PRIMARY KEY (id);


--
-- Name: business_lines business_lines_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_lines
    ADD CONSTRAINT business_lines_key_key UNIQUE (key);


--
-- Name: business_lines business_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_lines
    ADD CONSTRAINT business_lines_pkey PRIMARY KEY (id);


--
-- Name: business_request_audit_logs business_request_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_request_audit_logs
    ADD CONSTRAINT business_request_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: business_request_discussions business_request_discussions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_request_discussions
    ADD CONSTRAINT business_request_discussions_pkey PRIMARY KEY (id);


--
-- Name: business_request_links business_request_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_request_links
    ADD CONSTRAINT business_request_links_pkey PRIMARY KEY (id);


--
-- Name: business_requests business_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_requests
    ADD CONSTRAINT business_requests_pkey PRIMARY KEY (id);


--
-- Name: business_requests business_requests_request_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_requests
    ADD CONSTRAINT business_requests_request_key_key UNIQUE (request_key);


--
-- Name: capacity_allocations capacity_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity_allocations
    ADD CONSTRAINT capacity_allocations_pkey PRIMARY KEY (id);


--
-- Name: capacity_allocations capacity_allocations_team_id_iteration_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity_allocations
    ADD CONSTRAINT capacity_allocations_team_id_iteration_id_key UNIQUE (team_id, iteration_id);


--
-- Name: capacity_plans capacity_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity_plans
    ADD CONSTRAINT capacity_plans_pkey PRIMARY KEY (id);


--
-- Name: certifications certifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certifications
    ADD CONSTRAINT certifications_pkey PRIMARY KEY (id);


--
-- Name: comment_mentions comment_mentions_comment_id_mentioned_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_mentions
    ADD CONSTRAINT comment_mentions_comment_id_mentioned_user_id_key UNIQUE (comment_id, mentioned_user_id);


--
-- Name: comment_mentions comment_mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_mentions
    ADD CONSTRAINT comment_mentions_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: custom_field_defs custom_field_defs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_field_defs
    ADD CONSTRAINT custom_field_defs_pkey PRIMARY KEY (id);


--
-- Name: custom_field_values custom_field_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_field_values
    ADD CONSTRAINT custom_field_values_pkey PRIMARY KEY (id);


--
-- Name: demand_field_configs demand_field_configs_business_line_id_field_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_field_configs
    ADD CONSTRAINT demand_field_configs_business_line_id_field_key_key UNIQUE (business_line_id, field_key);


--
-- Name: demand_field_configs demand_field_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_field_configs
    ADD CONSTRAINT demand_field_configs_pkey PRIMARY KEY (id);


--
-- Name: demand_section_configs demand_section_configs_business_line_id_tab_key_section_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_section_configs
    ADD CONSTRAINT demand_section_configs_business_line_id_tab_key_section_key_key UNIQUE (business_line_id, tab_key, section_key);


--
-- Name: demand_section_configs demand_section_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_section_configs
    ADD CONSTRAINT demand_section_configs_pkey PRIMARY KEY (id);


--
-- Name: demand_tab_configs demand_tab_configs_business_line_id_tab_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_tab_configs
    ADD CONSTRAINT demand_tab_configs_business_line_id_tab_key_key UNIQUE (business_line_id, tab_key);


--
-- Name: demand_tab_configs demand_tab_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_tab_configs
    ADD CONSTRAINT demand_tab_configs_pkey PRIMARY KEY (id);


--
-- Name: dependencies dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependencies
    ADD CONSTRAINT dependencies_pkey PRIMARY KEY (id);


--
-- Name: dependency_audit_log dependency_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependency_audit_log
    ADD CONSTRAINT dependency_audit_log_pkey PRIMARY KEY (id);


--
-- Name: dependency_negotiations dependency_negotiations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependency_negotiations
    ADD CONSTRAINT dependency_negotiations_pkey PRIMARY KEY (id);


--
-- Name: discussion_mentions discussion_mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_mentions
    ADD CONSTRAINT discussion_mentions_pkey PRIMARY KEY (id);


--
-- Name: discussions discussions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_pkey PRIMARY KEY (id);


--
-- Name: drawer_tab_configs drawer_tab_configs_business_line_id_tab_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drawer_tab_configs
    ADD CONSTRAINT drawer_tab_configs_business_line_id_tab_key_key UNIQUE (business_line_id, tab_key);


--
-- Name: drawer_tab_configs drawer_tab_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drawer_tab_configs
    ADD CONSTRAINT drawer_tab_configs_pkey PRIMARY KEY (id);


--
-- Name: epic_acceptance_criteria epic_acceptance_criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_acceptance_criteria
    ADD CONSTRAINT epic_acceptance_criteria_pkey PRIMARY KEY (id);


--
-- Name: epic_benefits epic_benefits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_benefits
    ADD CONSTRAINT epic_benefits_pkey PRIMARY KEY (id);


--
-- Name: epic_custom_columns epic_custom_columns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_custom_columns
    ADD CONSTRAINT epic_custom_columns_pkey PRIMARY KEY (id);


--
-- Name: epic_custom_columns epic_custom_columns_user_id_column_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_custom_columns
    ADD CONSTRAINT epic_custom_columns_user_id_column_id_key UNIQUE (user_id, column_id);


--
-- Name: epic_design_items epic_design_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_design_items
    ADD CONSTRAINT epic_design_items_pkey PRIMARY KEY (id);


--
-- Name: epic_intake_responses epic_intake_responses_epic_field_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_intake_responses
    ADD CONSTRAINT epic_intake_responses_epic_field_unique UNIQUE (epic_id, field_id);


--
-- Name: epic_intake_responses epic_intake_responses_epic_id_field_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_intake_responses
    ADD CONSTRAINT epic_intake_responses_epic_id_field_id_key UNIQUE (epic_id, field_id);


--
-- Name: epic_intake_responses epic_intake_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_intake_responses
    ADD CONSTRAINT epic_intake_responses_pkey PRIMARY KEY (id);


--
-- Name: epic_label_assignments epic_label_assignments_epic_id_label_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_label_assignments
    ADD CONSTRAINT epic_label_assignments_epic_id_label_id_key UNIQUE (epic_id, label_id);


--
-- Name: epic_label_assignments epic_label_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_label_assignments
    ADD CONSTRAINT epic_label_assignments_pkey PRIMARY KEY (id);


--
-- Name: epic_labels epic_labels_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_labels
    ADD CONSTRAINT epic_labels_name_key UNIQUE (name);


--
-- Name: epic_labels epic_labels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_labels
    ADD CONSTRAINT epic_labels_pkey PRIMARY KEY (id);


--
-- Name: epic_links epic_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_links
    ADD CONSTRAINT epic_links_pkey PRIMARY KEY (id);


--
-- Name: epic_pi_forecasts epic_pi_forecasts_epic_id_pi_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_pi_forecasts
    ADD CONSTRAINT epic_pi_forecasts_epic_id_pi_id_key UNIQUE (epic_id, pi_id);


--
-- Name: epic_pi_forecasts epic_pi_forecasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_pi_forecasts
    ADD CONSTRAINT epic_pi_forecasts_pkey PRIMARY KEY (id);


--
-- Name: epic_process_history epic_process_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_process_history
    ADD CONSTRAINT epic_process_history_pkey PRIMARY KEY (id);


--
-- Name: epic_program_increments epic_program_increments_epic_id_pi_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_program_increments
    ADD CONSTRAINT epic_program_increments_epic_id_pi_id_key UNIQUE (epic_id, pi_id);


--
-- Name: epic_program_increments epic_program_increments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_program_increments
    ADD CONSTRAINT epic_program_increments_pkey PRIMARY KEY (id);


--
-- Name: epic_programs epic_programs_epic_id_program_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_programs
    ADD CONSTRAINT epic_programs_epic_id_program_id_key UNIQUE (epic_id, program_id);


--
-- Name: epic_programs epic_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_programs
    ADD CONSTRAINT epic_programs_pkey PRIMARY KEY (id);


--
-- Name: epic_report_templates epic_report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_report_templates
    ADD CONSTRAINT epic_report_templates_pkey PRIMARY KEY (id);


--
-- Name: epic_roi_scores epic_roi_scores_epic_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_roi_scores
    ADD CONSTRAINT epic_roi_scores_epic_id_key UNIQUE (epic_id);


--
-- Name: epic_roi_scores epic_roi_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_roi_scores
    ADD CONSTRAINT epic_roi_scores_pkey PRIMARY KEY (id);


--
-- Name: epic_scorecard_responses epic_scorecard_responses_epic_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_scorecard_responses
    ADD CONSTRAINT epic_scorecard_responses_epic_id_question_id_key UNIQUE (epic_id, question_id);


--
-- Name: epic_scorecard_responses epic_scorecard_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_scorecard_responses
    ADD CONSTRAINT epic_scorecard_responses_pkey PRIMARY KEY (id);


--
-- Name: epic_spend epic_spend_epic_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_spend
    ADD CONSTRAINT epic_spend_epic_id_key UNIQUE (epic_id);


--
-- Name: epic_spend epic_spend_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_spend
    ADD CONSTRAINT epic_spend_pkey PRIMARY KEY (id);


--
-- Name: epic_value_metrics epic_value_metrics_epic_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_value_metrics
    ADD CONSTRAINT epic_value_metrics_epic_id_key UNIQUE (epic_id);


--
-- Name: epic_value_metrics epic_value_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_value_metrics
    ADD CONSTRAINT epic_value_metrics_pkey PRIMARY KEY (id);


--
-- Name: epic_wsjf epic_wsjf_epic_id_pi_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_wsjf
    ADD CONSTRAINT epic_wsjf_epic_id_pi_id_key UNIQUE (epic_id, pi_id);


--
-- Name: epic_wsjf epic_wsjf_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_wsjf
    ADD CONSTRAINT epic_wsjf_pkey PRIMARY KEY (id);


--
-- Name: epics epics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epics
    ADD CONSTRAINT epics_pkey PRIMARY KEY (id);


--
-- Name: estimation_conversions estimation_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimation_conversions
    ADD CONSTRAINT estimation_conversions_pkey PRIMARY KEY (id);


--
-- Name: estimation_conversions estimation_conversions_work_item_type_tshirt_size_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimation_conversions
    ADD CONSTRAINT estimation_conversions_work_item_type_tshirt_size_key UNIQUE (work_item_type, tshirt_size);


--
-- Name: external_entities external_entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_entities
    ADD CONSTRAINT external_entities_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_flag_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_flag_key_key UNIQUE (flag_key);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: feature_pi_objective_links feature_pi_objective_links_feature_id_pi_objective_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_pi_objective_links
    ADD CONSTRAINT feature_pi_objective_links_feature_id_pi_objective_id_key UNIQUE (feature_id, pi_objective_id);


--
-- Name: feature_pi_objective_links feature_pi_objective_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_pi_objective_links
    ADD CONSTRAINT feature_pi_objective_links_pkey PRIMARY KEY (id);


--
-- Name: feature_scheduling_history feature_scheduling_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_scheduling_history
    ADD CONSTRAINT feature_scheduling_history_pkey PRIMARY KEY (id);


--
-- Name: features features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.features
    ADD CONSTRAINT features_pkey PRIMARY KEY (id);


--
-- Name: forecast_entries forecast_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_entries
    ADD CONSTRAINT forecast_entries_pkey PRIMARY KEY (id);


--
-- Name: forecast_entries forecast_entries_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_entries
    ADD CONSTRAINT forecast_entries_unique UNIQUE (work_item_id, work_item_type, pi_id, program_id, team_id);


--
-- Name: goals goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_pkey PRIMARY KEY (id);


--
-- Name: hierarchy_configs hierarchy_configs_level_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hierarchy_configs
    ADD CONSTRAINT hierarchy_configs_level_key_key UNIQUE (level_key);


--
-- Name: hierarchy_configs hierarchy_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hierarchy_configs
    ADD CONSTRAINT hierarchy_configs_pkey PRIMARY KEY (id);


--
-- Name: idea_group_members idea_group_members_group_id_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idea_group_members
    ADD CONSTRAINT idea_group_members_group_id_user_id_role_key UNIQUE (group_id, user_id, role);


--
-- Name: idea_group_members idea_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idea_group_members
    ADD CONSTRAINT idea_group_members_pkey PRIMARY KEY (id);


--
-- Name: idea_groups idea_groups_external_link_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idea_groups
    ADD CONSTRAINT idea_groups_external_link_key UNIQUE (external_link);


--
-- Name: idea_groups idea_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idea_groups
    ADD CONSTRAINT idea_groups_pkey PRIMARY KEY (id);


--
-- Name: ideas ideas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideas
    ADD CONSTRAINT ideas_pkey PRIMARY KEY (id);


--
-- Name: ideation_attachments ideation_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideation_attachments
    ADD CONSTRAINT ideation_attachments_pkey PRIMARY KEY (id);


--
-- Name: ideation_comments ideation_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideation_comments
    ADD CONSTRAINT ideation_comments_pkey PRIMARY KEY (id);


--
-- Name: ideation_external_users ideation_external_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideation_external_users
    ADD CONSTRAINT ideation_external_users_email_key UNIQUE (email);


--
-- Name: ideation_external_users ideation_external_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideation_external_users
    ADD CONSTRAINT ideation_external_users_pkey PRIMARY KEY (id);


--
-- Name: ideation_form_fields ideation_form_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideation_form_fields
    ADD CONSTRAINT ideation_form_fields_pkey PRIMARY KEY (id);


--
-- Name: ideation_forms ideation_forms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideation_forms
    ADD CONSTRAINT ideation_forms_pkey PRIMARY KEY (id);


--
-- Name: ideation_subscriptions ideation_subscriptions_idea_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideation_subscriptions
    ADD CONSTRAINT ideation_subscriptions_idea_id_user_id_key UNIQUE (idea_id, user_id);


--
-- Name: ideation_subscriptions ideation_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideation_subscriptions
    ADD CONSTRAINT ideation_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: ideation_votes ideation_votes_idea_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideation_votes
    ADD CONSTRAINT ideation_votes_idea_id_user_id_key UNIQUE (idea_id, user_id);


--
-- Name: ideation_votes ideation_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideation_votes
    ADD CONSTRAINT ideation_votes_pkey PRIMARY KEY (id);


--
-- Name: import_history import_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_history
    ADD CONSTRAINT import_history_pkey PRIMARY KEY (id);


--
-- Name: initiatives initiatives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.initiatives
    ADD CONSTRAINT initiatives_pkey PRIMARY KEY (id);


--
-- Name: intake_fields intake_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_fields
    ADD CONSTRAINT intake_fields_pkey PRIMARY KEY (id);


--
-- Name: intake_sets intake_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_sets
    ADD CONSTRAINT intake_sets_pkey PRIMARY KEY (id);


--
-- Name: integration_connectors integration_connectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_connectors
    ADD CONSTRAINT integration_connectors_pkey PRIMARY KEY (id);


--
-- Name: iterations iterations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iterations
    ADD CONSTRAINT iterations_pkey PRIMARY KEY (id);


--
-- Name: jira_auth_credentials jira_auth_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jira_auth_credentials
    ADD CONSTRAINT jira_auth_credentials_pkey PRIMARY KEY (id);


--
-- Name: jira_board_mappings jira_board_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jira_board_mappings
    ADD CONSTRAINT jira_board_mappings_pkey PRIMARY KEY (id);


--
-- Name: jira_connections jira_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jira_connections
    ADD CONSTRAINT jira_connections_pkey PRIMARY KEY (id);


--
-- Name: jira_field_mappings jira_field_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jira_field_mappings
    ADD CONSTRAINT jira_field_mappings_pkey PRIMARY KEY (id);


--
-- Name: jira_project_mappings jira_project_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jira_project_mappings
    ADD CONSTRAINT jira_project_mappings_pkey PRIMARY KEY (id);


--
-- Name: jira_sync_logs jira_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jira_sync_logs
    ADD CONSTRAINT jira_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: jira_work_item_links jira_work_item_links_connection_id_catalyst_entity_type_cat_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jira_work_item_links
    ADD CONSTRAINT jira_work_item_links_connection_id_catalyst_entity_type_cat_key UNIQUE (connection_id, catalyst_entity_type, catalyst_entity_id);


--
-- Name: jira_work_item_links jira_work_item_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jira_work_item_links
    ADD CONSTRAINT jira_work_item_links_pkey PRIMARY KEY (id);


--
-- Name: kanban_board_users kanban_board_users_board_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_board_users
    ADD CONSTRAINT kanban_board_users_board_id_user_id_key UNIQUE (board_id, user_id);


--
-- Name: kanban_board_users kanban_board_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_board_users
    ADD CONSTRAINT kanban_board_users_pkey PRIMARY KEY (id);


--
-- Name: kanban_boards kanban_boards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_boards
    ADD CONSTRAINT kanban_boards_pkey PRIMARY KEY (id);


--
-- Name: kanban_card_history kanban_card_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_card_history
    ADD CONSTRAINT kanban_card_history_pkey PRIMARY KEY (id);


--
-- Name: kanban_cards kanban_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_cards
    ADD CONSTRAINT kanban_cards_pkey PRIMARY KEY (id);


--
-- Name: kanban_columns kanban_columns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_columns
    ADD CONSTRAINT kanban_columns_pkey PRIMARY KEY (id);


--
-- Name: kanban_swim_lanes kanban_swim_lanes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_swim_lanes
    ADD CONSTRAINT kanban_swim_lanes_pkey PRIMARY KEY (id);


--
-- Name: kb_audit_log kb_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_audit_log
    ADD CONSTRAINT kb_audit_log_pkey PRIMARY KEY (id);


--
-- Name: kb_doc_spaces kb_doc_spaces_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_doc_spaces
    ADD CONSTRAINT kb_doc_spaces_pkey PRIMARY KEY (id);


--
-- Name: kb_doc_spaces kb_doc_spaces_project_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_doc_spaces
    ADD CONSTRAINT kb_doc_spaces_project_id_key UNIQUE (project_id);


--
-- Name: kb_document_attachments kb_document_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_attachments
    ADD CONSTRAINT kb_document_attachments_pkey PRIMARY KEY (id);


--
-- Name: kb_document_comments kb_document_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_comments
    ADD CONSTRAINT kb_document_comments_pkey PRIMARY KEY (id);


--
-- Name: kb_document_favorites kb_document_favorites_document_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_favorites
    ADD CONSTRAINT kb_document_favorites_document_id_user_id_key UNIQUE (document_id, user_id);


--
-- Name: kb_document_favorites kb_document_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_favorites
    ADD CONSTRAINT kb_document_favorites_pkey PRIMARY KEY (id);


--
-- Name: kb_document_jira_issues kb_document_jira_issues_document_id_work_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_jira_issues
    ADD CONSTRAINT kb_document_jira_issues_document_id_work_item_id_key UNIQUE (document_id, work_item_id);


--
-- Name: kb_document_jira_issues kb_document_jira_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_jira_issues
    ADD CONSTRAINT kb_document_jira_issues_pkey PRIMARY KEY (id);


--
-- Name: kb_document_labels kb_document_labels_document_id_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_labels
    ADD CONSTRAINT kb_document_labels_document_id_label_key UNIQUE (document_id, label);


--
-- Name: kb_document_labels kb_document_labels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_labels
    ADD CONSTRAINT kb_document_labels_pkey PRIMARY KEY (id);


--
-- Name: kb_document_page_properties kb_document_page_properties_document_id_property_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_page_properties
    ADD CONSTRAINT kb_document_page_properties_document_id_property_key_key UNIQUE (document_id, property_key);


--
-- Name: kb_document_page_properties kb_document_page_properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_page_properties
    ADD CONSTRAINT kb_document_page_properties_pkey PRIMARY KEY (id);


--
-- Name: kb_document_restrictions kb_document_restrictions_document_id_restriction_type_entit_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_restrictions
    ADD CONSTRAINT kb_document_restrictions_document_id_restriction_type_entit_key UNIQUE (document_id, restriction_type, entity_type, entity_id);


--
-- Name: kb_document_restrictions kb_document_restrictions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_restrictions
    ADD CONSTRAINT kb_document_restrictions_pkey PRIMARY KEY (id);


--
-- Name: kb_document_versions kb_document_versions_document_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_versions
    ADD CONSTRAINT kb_document_versions_document_id_version_number_key UNIQUE (document_id, version_number);


--
-- Name: kb_document_versions kb_document_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_versions
    ADD CONSTRAINT kb_document_versions_pkey PRIMARY KEY (id);


--
-- Name: kb_document_watchers kb_document_watchers_document_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_watchers
    ADD CONSTRAINT kb_document_watchers_document_id_user_id_key UNIQUE (document_id, user_id);


--
-- Name: kb_document_watchers kb_document_watchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_watchers
    ADD CONSTRAINT kb_document_watchers_pkey PRIMARY KEY (id);


--
-- Name: kb_documents kb_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_documents
    ADD CONSTRAINT kb_documents_pkey PRIMARY KEY (id);


--
-- Name: kb_projects kb_projects_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_projects
    ADD CONSTRAINT kb_projects_key_key UNIQUE (key);


--
-- Name: kb_projects kb_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_projects
    ADD CONSTRAINT kb_projects_pkey PRIMARY KEY (id);


--
-- Name: key_result_checkins key_result_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_result_checkins
    ADD CONSTRAINT key_result_checkins_pkey PRIMARY KEY (id);


--
-- Name: key_results key_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_results
    ADD CONSTRAINT key_results_pkey PRIMARY KEY (id);


--
-- Name: key_results_v2 key_results_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_results_v2
    ADD CONSTRAINT key_results_v2_pkey PRIMARY KEY (id);


--
-- Name: kr_work_contributions kr_work_contributions_key_result_id_work_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kr_work_contributions
    ADD CONSTRAINT kr_work_contributions_key_result_id_work_item_id_key UNIQUE (key_result_id, work_item_id);


--
-- Name: kr_work_contributions kr_work_contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kr_work_contributions
    ADD CONSTRAINT kr_work_contributions_pkey PRIMARY KEY (id);


--
-- Name: milestone_categories milestone_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_categories
    ADD CONSTRAINT milestone_categories_pkey PRIMARY KEY (id);


--
-- Name: milestones milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_pkey PRIMARY KEY (id);


--
-- Name: module_packages module_packages_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_packages
    ADD CONSTRAINT module_packages_code_key UNIQUE (code);


--
-- Name: module_packages module_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_packages
    ADD CONSTRAINT module_packages_pkey PRIMARY KEY (id);


--
-- Name: modules modules_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_code_key UNIQUE (code);


--
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: objective_capability_links objective_capability_links_objective_id_capability_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_capability_links
    ADD CONSTRAINT objective_capability_links_objective_id_capability_id_key UNIQUE (objective_id, capability_id);


--
-- Name: objective_capability_links objective_capability_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_capability_links
    ADD CONSTRAINT objective_capability_links_pkey PRIMARY KEY (id);


--
-- Name: objective_contributors objective_contributors_objective_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_contributors
    ADD CONSTRAINT objective_contributors_objective_id_user_id_key UNIQUE (objective_id, user_id);


--
-- Name: objective_contributors objective_contributors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_contributors
    ADD CONSTRAINT objective_contributors_pkey PRIMARY KEY (id);


--
-- Name: objective_dependencies objective_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_dependencies
    ADD CONSTRAINT objective_dependencies_pkey PRIMARY KEY (id);


--
-- Name: objective_epic_links objective_epic_links_objective_id_epic_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_epic_links
    ADD CONSTRAINT objective_epic_links_objective_id_epic_id_key UNIQUE (objective_id, epic_id);


--
-- Name: objective_epic_links objective_epic_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_epic_links
    ADD CONSTRAINT objective_epic_links_pkey PRIMARY KEY (id);


--
-- Name: objective_feature_links objective_feature_links_objective_id_feature_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_feature_links
    ADD CONSTRAINT objective_feature_links_objective_id_feature_id_key UNIQUE (objective_id, feature_id);


--
-- Name: objective_feature_links objective_feature_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_feature_links
    ADD CONSTRAINT objective_feature_links_pkey PRIMARY KEY (id);


--
-- Name: objective_impediments objective_impediments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_impediments
    ADD CONSTRAINT objective_impediments_pkey PRIMARY KEY (id);


--
-- Name: objective_initiative_links objective_initiative_links_objective_id_initiative_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_initiative_links
    ADD CONSTRAINT objective_initiative_links_objective_id_initiative_id_key UNIQUE (objective_id, initiative_id);


--
-- Name: objective_initiative_links objective_initiative_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_initiative_links
    ADD CONSTRAINT objective_initiative_links_pkey PRIMARY KEY (id);


--
-- Name: objective_levels objective_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_levels
    ADD CONSTRAINT objective_levels_pkey PRIMARY KEY (id);


--
-- Name: objective_linked_items objective_linked_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_linked_items
    ADD CONSTRAINT objective_linked_items_pkey PRIMARY KEY (id);


--
-- Name: objective_program_increments objective_program_increments_objective_id_program_increment_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_program_increments
    ADD CONSTRAINT objective_program_increments_objective_id_program_increment_key UNIQUE (objective_id, program_increment_id);


--
-- Name: objective_program_increments objective_program_increments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_program_increments
    ADD CONSTRAINT objective_program_increments_pkey PRIMARY KEY (id);


--
-- Name: objective_risks objective_risks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_risks
    ADD CONSTRAINT objective_risks_pkey PRIMARY KEY (id);


--
-- Name: objective_theme_links objective_theme_links_objective_id_theme_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_theme_links
    ADD CONSTRAINT objective_theme_links_objective_id_theme_id_key UNIQUE (objective_id, theme_id);


--
-- Name: objective_theme_links objective_theme_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_theme_links
    ADD CONSTRAINT objective_theme_links_pkey PRIMARY KEY (id);


--
-- Name: objective_work_item_alignments objective_work_item_alignment_objective_id_work_item_id_wor_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_work_item_alignments
    ADD CONSTRAINT objective_work_item_alignment_objective_id_work_item_id_wor_key UNIQUE (objective_id, work_item_id, work_item_type);


--
-- Name: objective_work_item_alignments objective_work_item_alignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_work_item_alignments
    ADD CONSTRAINT objective_work_item_alignments_pkey PRIMARY KEY (id);


--
-- Name: objective_work_items objective_work_items_objective_id_work_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_work_items
    ADD CONSTRAINT objective_work_items_objective_id_work_item_id_key UNIQUE (objective_id, work_item_id);


--
-- Name: objective_work_items objective_work_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_work_items
    ADD CONSTRAINT objective_work_items_pkey PRIMARY KEY (id);


--
-- Name: objectives objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT objectives_pkey PRIMARY KEY (id);


--
-- Name: org_modules org_modules_module_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_modules
    ADD CONSTRAINT org_modules_module_code_key UNIQUE (module_code);


--
-- Name: org_modules org_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_modules
    ADD CONSTRAINT org_modules_pkey PRIMARY KEY (id);


--
-- Name: package_modules package_modules_package_code_module_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_modules
    ADD CONSTRAINT package_modules_package_code_module_code_key UNIQUE (package_code, module_code);


--
-- Name: package_modules package_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_modules
    ADD CONSTRAINT package_modules_pkey PRIMARY KEY (id);


--
-- Name: permission_grants permission_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_grants
    ADD CONSTRAINT permission_grants_pkey PRIMARY KEY (id);


--
-- Name: permission_roles permission_roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_roles
    ADD CONSTRAINT permission_roles_name_key UNIQUE (name);


--
-- Name: permission_roles permission_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_roles
    ADD CONSTRAINT permission_roles_pkey PRIMARY KEY (id);


--
-- Name: pi_objectives pi_objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pi_objectives
    ADD CONSTRAINT pi_objectives_pkey PRIMARY KEY (id);


--
-- Name: portfolio_estimation_settings portfolio_estimation_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_estimation_settings
    ADD CONSTRAINT portfolio_estimation_settings_pkey PRIMARY KEY (id);


--
-- Name: portfolio_estimation_settings portfolio_estimation_settings_portfolio_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_estimation_settings
    ADD CONSTRAINT portfolio_estimation_settings_portfolio_id_key UNIQUE (portfolio_id);


--
-- Name: portfolio_members portfolio_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_members
    ADD CONSTRAINT portfolio_members_pkey PRIMARY KEY (id);


--
-- Name: portfolio_members portfolio_members_portfolio_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_members
    ADD CONSTRAINT portfolio_members_portfolio_id_user_id_key UNIQUE (portfolio_id, user_id);


--
-- Name: portfolios portfolios_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_name_key UNIQUE (name);


--
-- Name: portfolios portfolios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_pkey PRIMARY KEY (id);


--
-- Name: predictability_metrics predictability_metrics_pi_id_program_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictability_metrics
    ADD CONSTRAINT predictability_metrics_pi_id_program_id_key UNIQUE (pi_id, program_id);


--
-- Name: predictability_metrics predictability_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictability_metrics
    ADD CONSTRAINT predictability_metrics_pkey PRIMARY KEY (id);


--
-- Name: process_flows process_flows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_flows
    ADD CONSTRAINT process_flows_pkey PRIMARY KEY (id);


--
-- Name: process_steps process_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_steps
    ADD CONSTRAINT process_steps_pkey PRIMARY KEY (id);


--
-- Name: product_role_permissions product_role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_role_permissions
    ADD CONSTRAINT product_role_permissions_pkey PRIMARY KEY (id);


--
-- Name: product_role_permissions product_role_permissions_role_id_permission_group_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_role_permissions
    ADD CONSTRAINT product_role_permissions_role_id_permission_group_key UNIQUE (role_id, permission_group);


--
-- Name: product_roles product_roles_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_roles
    ADD CONSTRAINT product_roles_code_key UNIQUE (code);


--
-- Name: product_roles product_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_roles
    ADD CONSTRAINT product_roles_pkey PRIMARY KEY (id);


--
-- Name: product_status_configs product_status_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_status_configs
    ADD CONSTRAINT product_status_configs_pkey PRIMARY KEY (id);


--
-- Name: product_status_configs product_status_configs_status_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_status_configs
    ADD CONSTRAINT product_status_configs_status_key_key UNIQUE (status_key);


--
-- Name: product_view_configs product_view_configs_business_line_id_view_type_column_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_view_configs
    ADD CONSTRAINT product_view_configs_business_line_id_view_type_column_key_key UNIQUE (business_line_id, view_type, column_key);


--
-- Name: product_view_configs product_view_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_view_configs
    ADD CONSTRAINT product_view_configs_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: program_increments program_increments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_increments
    ADD CONSTRAINT program_increments_pkey PRIMARY KEY (id);


--
-- Name: program_increments program_increments_portfolio_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_increments
    ADD CONSTRAINT program_increments_portfolio_id_name_key UNIQUE (portfolio_id, name);


--
-- Name: program_members program_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_members
    ADD CONSTRAINT program_members_pkey PRIMARY KEY (id);


--
-- Name: program_members program_members_program_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_members
    ADD CONSTRAINT program_members_program_id_user_id_key UNIQUE (program_id, user_id);


--
-- Name: program_spend_per_point program_spend_per_point_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_spend_per_point
    ADD CONSTRAINT program_spend_per_point_pkey PRIMARY KEY (id);


--
-- Name: program_spend_per_point program_spend_per_point_program_id_sprint_start_date_sprint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_spend_per_point
    ADD CONSTRAINT program_spend_per_point_program_id_sprint_start_date_sprint_key UNIQUE (program_id, sprint_start_date, sprint_end_date);


--
-- Name: program_team_rankings program_team_rankings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_team_rankings
    ADD CONSTRAINT program_team_rankings_pkey PRIMARY KEY (id);


--
-- Name: program_team_rankings program_team_rankings_program_id_team_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_team_rankings
    ADD CONSTRAINT program_team_rankings_program_id_team_id_key UNIQUE (program_id, team_id);


--
-- Name: programs programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_pkey PRIMARY KEY (id);


--
-- Name: programs programs_portfolio_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_portfolio_id_name_key UNIQUE (portfolio_id, name);


--
-- Name: recent_activity recent_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recent_activity
    ADD CONSTRAINT recent_activity_pkey PRIMARY KEY (id);


--
-- Name: recent_activity recent_activity_user_place_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recent_activity
    ADD CONSTRAINT recent_activity_user_place_key UNIQUE (user_id, room_type, room_id, page_key);


--
-- Name: recent_activity recent_activity_user_room_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recent_activity
    ADD CONSTRAINT recent_activity_user_room_unique UNIQUE (user_id, room_type, room_id);


--
-- Name: release_feature_links release_feature_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_feature_links
    ADD CONSTRAINT release_feature_links_pkey PRIMARY KEY (id);


--
-- Name: release_feature_links release_feature_links_release_id_feature_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_feature_links
    ADD CONSTRAINT release_feature_links_release_id_feature_id_key UNIQUE (release_id, feature_id);


--
-- Name: release_story_links release_story_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_story_links
    ADD CONSTRAINT release_story_links_pkey PRIMARY KEY (id);


--
-- Name: release_story_links release_story_links_release_id_story_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_story_links
    ADD CONSTRAINT release_story_links_release_id_story_id_key UNIQUE (release_id, story_id);


--
-- Name: release_vehicles release_vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_vehicles
    ADD CONSTRAINT release_vehicles_pkey PRIMARY KEY (id);


--
-- Name: releases releases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.releases
    ADD CONSTRAINT releases_pkey PRIMARY KEY (id);


--
-- Name: report_definitions report_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_definitions
    ADD CONSTRAINT report_definitions_pkey PRIMARY KEY (id);


--
-- Name: risks risks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_pkey PRIMARY KEY (id);


--
-- Name: risks risks_risk_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_risk_number_key UNIQUE (risk_number);


--
-- Name: roadmap_items roadmap_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_items
    ADD CONSTRAINT roadmap_items_pkey PRIMARY KEY (id);


--
-- Name: saved_filters saved_filters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_filters
    ADD CONSTRAINT saved_filters_pkey PRIMARY KEY (id);


--
-- Name: scheduled_emails scheduled_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_emails
    ADD CONSTRAINT scheduled_emails_pkey PRIMARY KEY (id);


--
-- Name: scorecard_answers scorecard_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scorecard_answers
    ADD CONSTRAINT scorecard_answers_pkey PRIMARY KEY (id);


--
-- Name: scorecard_questions scorecard_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scorecard_questions
    ADD CONSTRAINT scorecard_questions_pkey PRIMARY KEY (id);


--
-- Name: scorecards scorecards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scorecards
    ADD CONSTRAINT scorecards_pkey PRIMARY KEY (id);


--
-- Name: shared_service_allocations shared_service_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_service_allocations
    ADD CONSTRAINT shared_service_allocations_pkey PRIMARY KEY (id);


--
-- Name: shared_service_allocations shared_service_allocations_shared_service_id_team_id_iterat_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_service_allocations
    ADD CONSTRAINT shared_service_allocations_shared_service_id_team_id_iterat_key UNIQUE (shared_service_id, team_id, iteration_id);


--
-- Name: shared_services shared_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_services
    ADD CONSTRAINT shared_services_pkey PRIMARY KEY (id);


--
-- Name: shared_test_steps shared_test_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_test_steps
    ADD CONSTRAINT shared_test_steps_pkey PRIMARY KEY (id);


--
-- Name: skill_requirements skill_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_requirements
    ADD CONSTRAINT skill_requirements_pkey PRIMARY KEY (id);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: snapshot_configurations snapshot_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshot_configurations
    ADD CONSTRAINT snapshot_configurations_pkey PRIMARY KEY (id);


--
-- Name: snapshot_configurations snapshot_configurations_snapshot_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshot_configurations
    ADD CONSTRAINT snapshot_configurations_snapshot_id_key UNIQUE (snapshot_id);


--
-- Name: snapshot_strategy_links snapshot_strategy_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshot_strategy_links
    ADD CONSTRAINT snapshot_strategy_links_pkey PRIMARY KEY (id);


--
-- Name: snapshot_strategy_links snapshot_strategy_links_snapshot_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshot_strategy_links
    ADD CONSTRAINT snapshot_strategy_links_snapshot_id_key UNIQUE (snapshot_id);


--
-- Name: starred_items starred_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.starred_items
    ADD CONSTRAINT starred_items_pkey PRIMARY KEY (id);


--
-- Name: stories stories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_pkey PRIMARY KEY (id);


--
-- Name: stories stories_story_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_story_key_key UNIQUE (story_key);


--
-- Name: story_comments story_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_comments
    ADD CONSTRAINT story_comments_pkey PRIMARY KEY (id);


--
-- Name: story_links story_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_links
    ADD CONSTRAINT story_links_pkey PRIMARY KEY (id);


--
-- Name: strategic_goal_key_results strategic_goal_key_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategic_goal_key_results
    ADD CONSTRAINT strategic_goal_key_results_pkey PRIMARY KEY (id);


--
-- Name: strategic_goals strategic_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategic_goals
    ADD CONSTRAINT strategic_goals_pkey PRIMARY KEY (id);


--
-- Name: strategic_themes strategic_themes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategic_themes
    ADD CONSTRAINT strategic_themes_pkey PRIMARY KEY (id);


--
-- Name: strategy_missions strategy_missions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategy_missions
    ADD CONSTRAINT strategy_missions_pkey PRIMARY KEY (id);


--
-- Name: strategy_snapshots strategy_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategy_snapshots
    ADD CONSTRAINT strategy_snapshots_pkey PRIMARY KEY (id);


--
-- Name: strategy_values strategy_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategy_values
    ADD CONSTRAINT strategy_values_pkey PRIMARY KEY (id);


--
-- Name: strategy_visions strategy_visions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategy_visions
    ADD CONSTRAINT strategy_visions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_user_id_entity_type_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_entity_type_entity_id_key UNIQUE (user_id, entity_type, entity_id);


--
-- Name: subtasks subtasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subtasks
    ADD CONSTRAINT subtasks_pkey PRIMARY KEY (id);


--
-- Name: team_member_skills team_member_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_member_skills
    ADD CONSTRAINT team_member_skills_pkey PRIMARY KEY (id);


--
-- Name: team_member_skills team_member_skills_team_member_id_skill_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_member_skills
    ADD CONSTRAINT team_member_skills_team_member_id_skill_id_key UNIQUE (team_member_id, skill_id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_team_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_user_id_key UNIQUE (team_id, user_id);


--
-- Name: team_metrics team_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_metrics
    ADD CONSTRAINT team_metrics_pkey PRIMARY KEY (id);


--
-- Name: team_point_systems team_point_systems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_point_systems
    ADD CONSTRAINT team_point_systems_pkey PRIMARY KEY (id);


--
-- Name: team_point_systems team_point_systems_team_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_point_systems
    ADD CONSTRAINT team_point_systems_team_id_key UNIQUE (team_id);


--
-- Name: team_spend_per_sprint team_spend_per_sprint_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_spend_per_sprint
    ADD CONSTRAINT team_spend_per_sprint_pkey PRIMARY KEY (id);


--
-- Name: team_spend_per_sprint team_spend_per_sprint_team_id_sprint_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_spend_per_sprint
    ADD CONSTRAINT team_spend_per_sprint_team_id_sprint_id_key UNIQUE (team_id, sprint_id);


--
-- Name: team_subscriptions team_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_subscriptions
    ADD CONSTRAINT team_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: teams teams_program_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_program_id_name_key UNIQUE (program_id, name);


--
-- Name: test_activity_log test_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_activity_log
    ADD CONSTRAINT test_activity_log_pkey PRIMARY KEY (id);


--
-- Name: test_case_bulk_operations test_case_bulk_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_bulk_operations
    ADD CONSTRAINT test_case_bulk_operations_pkey PRIMARY KEY (id);


--
-- Name: test_case_datasets test_case_datasets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_datasets
    ADD CONSTRAINT test_case_datasets_pkey PRIMARY KEY (id);


--
-- Name: test_case_parameters test_case_parameters_case_id_parameter_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_parameters
    ADD CONSTRAINT test_case_parameters_case_id_parameter_name_key UNIQUE (case_id, parameter_name);


--
-- Name: test_case_parameters test_case_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_parameters
    ADD CONSTRAINT test_case_parameters_pkey PRIMARY KEY (id);


--
-- Name: test_case_priorities test_case_priorities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_priorities
    ADD CONSTRAINT test_case_priorities_pkey PRIMARY KEY (id);


--
-- Name: test_case_shared_steps test_case_shared_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_shared_steps
    ADD CONSTRAINT test_case_shared_steps_pkey PRIMARY KEY (id);


--
-- Name: test_case_statuses test_case_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_statuses
    ADD CONSTRAINT test_case_statuses_pkey PRIMARY KEY (id);


--
-- Name: test_case_steps test_case_steps_case_id_case_version_step_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_steps
    ADD CONSTRAINT test_case_steps_case_id_case_version_step_number_key UNIQUE (case_id, case_version, step_number);


--
-- Name: test_case_steps test_case_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_steps
    ADD CONSTRAINT test_case_steps_pkey PRIMARY KEY (id);


--
-- Name: test_case_version_changes test_case_version_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_version_changes
    ADD CONSTRAINT test_case_version_changes_pkey PRIMARY KEY (id);


--
-- Name: test_case_versions test_case_versions_case_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_versions
    ADD CONSTRAINT test_case_versions_case_id_version_key UNIQUE (case_id, version);


--
-- Name: test_case_versions test_case_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_versions
    ADD CONSTRAINT test_case_versions_pkey PRIMARY KEY (id);


--
-- Name: test_case_work_item_links test_case_work_item_links_case_id_work_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_work_item_links
    ADD CONSTRAINT test_case_work_item_links_case_id_work_item_id_key UNIQUE (case_id, work_item_id);


--
-- Name: test_case_work_item_links test_case_work_item_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_work_item_links
    ADD CONSTRAINT test_case_work_item_links_pkey PRIMARY KEY (id);


--
-- Name: test_case_work_items test_case_work_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_work_items
    ADD CONSTRAINT test_case_work_items_pkey PRIMARY KEY (id);


--
-- Name: test_case_work_items test_case_work_items_test_case_id_work_item_id_work_item_ty_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_work_items
    ADD CONSTRAINT test_case_work_items_test_case_id_work_item_id_work_item_ty_key UNIQUE (test_case_id, work_item_id, work_item_type);


--
-- Name: test_cases test_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cases
    ADD CONSTRAINT test_cases_pkey PRIMARY KEY (id);


--
-- Name: test_cycle_case_assignments test_cycle_case_assignments_cycle_id_case_id_assigned_to_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cycle_case_assignments
    ADD CONSTRAINT test_cycle_case_assignments_cycle_id_case_id_assigned_to_key UNIQUE (cycle_id, case_id, assigned_to);


--
-- Name: test_cycle_case_assignments test_cycle_case_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cycle_case_assignments
    ADD CONSTRAINT test_cycle_case_assignments_pkey PRIMARY KEY (id);


--
-- Name: test_cycle_dependencies test_cycle_dependencies_cycle_id_predecessor_case_id_succes_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cycle_dependencies
    ADD CONSTRAINT test_cycle_dependencies_cycle_id_predecessor_case_id_succes_key UNIQUE (cycle_id, predecessor_case_id, successor_case_id);


--
-- Name: test_cycle_dependencies test_cycle_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cycle_dependencies
    ADD CONSTRAINT test_cycle_dependencies_pkey PRIMARY KEY (id);


--
-- Name: test_cycle_executions test_cycle_executions_cycle_id_case_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cycle_executions
    ADD CONSTRAINT test_cycle_executions_cycle_id_case_id_key UNIQUE (cycle_id, case_id);


--
-- Name: test_cycle_executions test_cycle_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cycle_executions
    ADD CONSTRAINT test_cycle_executions_pkey PRIMARY KEY (id);


--
-- Name: test_cycle_templates test_cycle_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cycle_templates
    ADD CONSTRAINT test_cycle_templates_pkey PRIMARY KEY (id);


--
-- Name: test_cycles test_cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cycles
    ADD CONSTRAINT test_cycles_pkey PRIMARY KEY (id);


--
-- Name: test_cycles test_cycles_program_id_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cycles
    ADD CONSTRAINT test_cycles_program_id_key_key UNIQUE (program_id, key);


--
-- Name: test_dashboard_gadgets test_dashboard_gadgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_dashboard_gadgets
    ADD CONSTRAINT test_dashboard_gadgets_pkey PRIMARY KEY (id);


--
-- Name: test_dashboard_shares test_dashboard_shares_dashboard_id_shared_with_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_dashboard_shares
    ADD CONSTRAINT test_dashboard_shares_dashboard_id_shared_with_user_id_key UNIQUE (dashboard_id, shared_with_user_id);


--
-- Name: test_dashboard_shares test_dashboard_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_dashboard_shares
    ADD CONSTRAINT test_dashboard_shares_pkey PRIMARY KEY (id);


--
-- Name: test_dashboard_templates test_dashboard_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_dashboard_templates
    ADD CONSTRAINT test_dashboard_templates_pkey PRIMARY KEY (id);


--
-- Name: test_dashboards test_dashboards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_dashboards
    ADD CONSTRAINT test_dashboards_pkey PRIMARY KEY (id);


--
-- Name: test_data_parameters test_data_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_data_parameters
    ADD CONSTRAINT test_data_parameters_pkey PRIMARY KEY (id);


--
-- Name: test_data_rows test_data_rows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_data_rows
    ADD CONSTRAINT test_data_rows_pkey PRIMARY KEY (id);


--
-- Name: test_datasets test_datasets_cycle_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_datasets
    ADD CONSTRAINT test_datasets_cycle_id_name_key UNIQUE (cycle_id, name);


--
-- Name: test_datasets test_datasets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_datasets
    ADD CONSTRAINT test_datasets_pkey PRIMARY KEY (id);


--
-- Name: test_evidence test_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_evidence
    ADD CONSTRAINT test_evidence_pkey PRIMARY KEY (id);


--
-- Name: test_execution_defects test_execution_defects_execution_id_defect_work_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_execution_defects
    ADD CONSTRAINT test_execution_defects_execution_id_defect_work_item_id_key UNIQUE (execution_id, defect_work_item_id);


--
-- Name: test_execution_defects test_execution_defects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_execution_defects
    ADD CONSTRAINT test_execution_defects_pkey PRIMARY KEY (id);


--
-- Name: test_execution_evidence test_execution_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_execution_evidence
    ADD CONSTRAINT test_execution_evidence_pkey PRIMARY KEY (id);


--
-- Name: test_execution_runs test_execution_runs_cycle_id_run_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_execution_runs
    ADD CONSTRAINT test_execution_runs_cycle_id_run_number_key UNIQUE (cycle_id, run_number);


--
-- Name: test_execution_runs test_execution_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_execution_runs
    ADD CONSTRAINT test_execution_runs_pkey PRIMARY KEY (id);


--
-- Name: test_execution_step_results test_execution_step_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_execution_step_results
    ADD CONSTRAINT test_execution_step_results_pkey PRIMARY KEY (id);


--
-- Name: test_execution_steps test_execution_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_execution_steps
    ADD CONSTRAINT test_execution_steps_pkey PRIMARY KEY (id);


--
-- Name: test_executions test_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_executions
    ADD CONSTRAINT test_executions_pkey PRIMARY KEY (id);


--
-- Name: test_field_configurations test_field_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_field_configurations
    ADD CONSTRAINT test_field_configurations_pkey PRIMARY KEY (id);


--
-- Name: test_field_configurations test_field_configurations_program_id_entity_type_field_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_field_configurations
    ADD CONSTRAINT test_field_configurations_program_id_entity_type_field_name_key UNIQUE (program_id, entity_type, field_name);


--
-- Name: test_folders test_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_folders
    ADD CONSTRAINT test_folders_pkey PRIMARY KEY (id);


--
-- Name: test_notification_preferences test_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_notification_preferences
    ADD CONSTRAINT test_notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: test_notification_preferences test_notification_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_notification_preferences
    ADD CONSTRAINT test_notification_preferences_user_id_key UNIQUE (user_id);


--
-- Name: test_report_schedules test_report_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_report_schedules
    ADD CONSTRAINT test_report_schedules_pkey PRIMARY KEY (id);


--
-- Name: test_reports test_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_reports
    ADD CONSTRAINT test_reports_pkey PRIMARY KEY (id);


--
-- Name: test_run_statuses test_run_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_run_statuses
    ADD CONSTRAINT test_run_statuses_pkey PRIMARY KEY (id);


--
-- Name: test_set_cases test_set_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_set_cases
    ADD CONSTRAINT test_set_cases_pkey PRIMARY KEY (id);


--
-- Name: test_set_cases test_set_cases_set_id_case_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_set_cases
    ADD CONSTRAINT test_set_cases_set_id_case_id_key UNIQUE (set_id, case_id);


--
-- Name: test_sets test_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_sets
    ADD CONSTRAINT test_sets_pkey PRIMARY KEY (id);


--
-- Name: test_steps test_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_steps
    ADD CONSTRAINT test_steps_pkey PRIMARY KEY (id);


--
-- Name: theme_epic_links theme_epic_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_epic_links
    ADD CONSTRAINT theme_epic_links_pkey PRIMARY KEY (id);


--
-- Name: theme_epic_links theme_epic_links_theme_id_epic_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_epic_links
    ADD CONSTRAINT theme_epic_links_theme_id_epic_id_key UNIQUE (theme_id, epic_id);


--
-- Name: test_data_parameters unique_parameter_per_test; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_data_parameters
    ADD CONSTRAINT unique_parameter_per_test UNIQUE (test_case_id, parameter_name);


--
-- Name: team_subscriptions unique_team_subscription; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_subscriptions
    ADD CONSTRAINT unique_team_subscription UNIQUE (team_id, user_id);


--
-- Name: test_case_shared_steps unique_test_case_shared_step_order; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_shared_steps
    ADD CONSTRAINT unique_test_case_shared_step_order UNIQUE (test_case_id, shared_step_id, step_order);


--
-- Name: user_app_preferences user_app_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_app_preferences
    ADD CONSTRAINT user_app_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_app_preferences user_app_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_app_preferences
    ADD CONSTRAINT user_app_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_email_preferences user_email_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_email_preferences
    ADD CONSTRAINT user_email_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_email_preferences user_email_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_email_preferences
    ADD CONSTRAINT user_email_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_epic_backlog_preferences user_epic_backlog_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_epic_backlog_preferences
    ADD CONSTRAINT user_epic_backlog_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_epic_backlog_preferences user_epic_backlog_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_epic_backlog_preferences
    ADD CONSTRAINT user_epic_backlog_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_forecast_preferences user_forecast_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_forecast_preferences
    ADD CONSTRAINT user_forecast_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_forecast_preferences user_forecast_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_forecast_preferences
    ADD CONSTRAINT user_forecast_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_industry_preferences user_industry_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_industry_preferences
    ADD CONSTRAINT user_industry_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_industry_preferences user_industry_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_industry_preferences
    ADD CONSTRAINT user_industry_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_notification_preferences user_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_notification_preferences user_notification_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_notification_settings user_notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_pkey PRIMARY KEY (id);


--
-- Name: user_notification_settings user_notification_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_settings
    ADD CONSTRAINT user_notification_settings_user_id_key UNIQUE (user_id);


--
-- Name: user_notifications user_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_pkey PRIMARY KEY (id);


--
-- Name: user_permission_overrides user_permission_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permission_overrides
    ADD CONSTRAINT user_permission_overrides_pkey PRIMARY KEY (id);


--
-- Name: user_permission_overrides user_permission_overrides_user_id_permission_group_module_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permission_overrides
    ADD CONSTRAINT user_permission_overrides_user_id_permission_group_module_key UNIQUE (user_id, permission_group, module);


--
-- Name: user_product_roles user_product_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_product_roles
    ADD CONSTRAINT user_product_roles_pkey PRIMARY KEY (id);


--
-- Name: user_product_roles user_product_roles_user_role_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_product_roles
    ADD CONSTRAINT user_product_roles_user_role_unique UNIQUE (user_id, role_id);


--
-- Name: user_role_history user_role_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_role_history
    ADD CONSTRAINT user_role_history_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_theme_preferences user_theme_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_theme_preferences
    ADD CONSTRAINT user_theme_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_theme_preferences user_theme_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_theme_preferences
    ADD CONSTRAINT user_theme_preferences_user_id_key UNIQUE (user_id);


--
-- Name: value_stream_metrics value_stream_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.value_stream_metrics
    ADD CONSTRAINT value_stream_metrics_pkey PRIMARY KEY (id);


--
-- Name: value_stream_metrics value_stream_metrics_portfolio_id_metric_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.value_stream_metrics
    ADD CONSTRAINT value_stream_metrics_portfolio_id_metric_date_key UNIQUE (portfolio_id, metric_date);


--
-- Name: work_item_assignments work_item_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_assignments
    ADD CONSTRAINT work_item_assignments_pkey PRIMARY KEY (id);


--
-- Name: work_item_forecast_ranks work_item_forecast_ranks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_forecast_ranks
    ADD CONSTRAINT work_item_forecast_ranks_pkey PRIMARY KEY (id);


--
-- Name: work_item_forecast_ranks work_item_forecast_ranks_work_item_id_work_item_type_pi_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_forecast_ranks
    ADD CONSTRAINT work_item_forecast_ranks_work_item_id_work_item_type_pi_id_key UNIQUE (work_item_id, work_item_type, pi_id);


--
-- Name: work_item_key_history work_item_key_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_key_history
    ADD CONSTRAINT work_item_key_history_pkey PRIMARY KEY (id);


--
-- Name: work_item_label_assignments work_item_label_assignments_label_id_entity_type_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_label_assignments
    ADD CONSTRAINT work_item_label_assignments_label_id_entity_type_entity_id_key UNIQUE (label_id, entity_type, entity_id);


--
-- Name: work_item_label_assignments work_item_label_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_label_assignments
    ADD CONSTRAINT work_item_label_assignments_pkey PRIMARY KEY (id);


--
-- Name: work_item_labels work_item_labels_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_labels
    ADD CONSTRAINT work_item_labels_name_key UNIQUE (name);


--
-- Name: work_item_labels work_item_labels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_labels
    ADD CONSTRAINT work_item_labels_pkey PRIMARY KEY (id);


--
-- Name: work_item_links work_item_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_links
    ADD CONSTRAINT work_item_links_pkey PRIMARY KEY (id);


--
-- Name: work_item_presence work_item_presence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_presence
    ADD CONSTRAINT work_item_presence_pkey PRIMARY KEY (id);


--
-- Name: work_item_rankings work_item_rankings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_rankings
    ADD CONSTRAINT work_item_rankings_pkey PRIMARY KEY (id);


--
-- Name: work_item_time_logs work_item_time_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_time_logs
    ADD CONSTRAINT work_item_time_logs_pkey PRIMARY KEY (id);


--
-- Name: work_item_versions work_item_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_versions
    ADD CONSTRAINT work_item_versions_pkey PRIMARY KEY (id);


--
-- Name: work_item_versions work_item_versions_work_item_id_work_item_type_release_id_l_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_versions
    ADD CONSTRAINT work_item_versions_work_item_id_work_item_type_release_id_l_key UNIQUE (work_item_id, work_item_type, release_id, link_type);


--
-- Name: work_item_watchers work_item_watchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_watchers
    ADD CONSTRAINT work_item_watchers_pkey PRIMARY KEY (id);


--
-- Name: work_item_watchers work_item_watchers_work_item_type_work_item_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_watchers
    ADD CONSTRAINT work_item_watchers_work_item_type_work_item_id_user_id_key UNIQUE (work_item_type, work_item_id, user_id);


--
-- Name: workflow_rules workflow_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_rules
    ADD CONSTRAINT workflow_rules_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_logs_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_actor ON public.activity_logs USING btree (actor_id);


--
-- Name: idx_activity_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_entity ON public.activity_logs USING btree (entity_type, entity_id);


--
-- Name: idx_alignments_objective; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alignments_objective ON public.objective_work_item_alignments USING btree (objective_id);


--
-- Name: idx_alignments_work_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alignments_work_item ON public.objective_work_item_alignments USING btree (work_item_id, work_item_type);


--
-- Name: idx_announcements_active_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_active_dates ON public.announcements USING btree (is_active, start_date, end_date);


--
-- Name: idx_bulk_ops_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_ops_type ON public.test_case_bulk_operations USING btree (operation_type);


--
-- Name: idx_bulk_ops_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_ops_user ON public.test_case_bulk_operations USING btree (executed_by);


--
-- Name: idx_business_request_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_request_audit_logs_created_at ON public.business_request_audit_logs USING btree (created_at DESC);


--
-- Name: idx_business_request_audit_logs_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_request_audit_logs_request_id ON public.business_request_audit_logs USING btree (business_request_id);


--
-- Name: idx_business_request_discussions_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_request_discussions_request_id ON public.business_request_discussions USING btree (business_request_id);


--
-- Name: idx_business_request_links_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_request_links_kind ON public.business_request_links USING btree (kind);


--
-- Name: idx_business_request_links_linked_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_request_links_linked_item ON public.business_request_links USING btree (linked_item_id) WHERE (linked_item_id IS NOT NULL);


--
-- Name: idx_business_request_links_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_request_links_request_id ON public.business_request_links USING btree (business_request_id);


--
-- Name: idx_business_requests_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_requests_deleted_at ON public.business_requests USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_capacity_iteration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_capacity_iteration ON public.capacity_allocations USING btree (iteration_id);


--
-- Name: idx_capacity_plans_pi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_capacity_plans_pi ON public.capacity_plans USING btree (pi_id);


--
-- Name: idx_capacity_plans_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_capacity_plans_program ON public.capacity_plans USING btree (program_id);


--
-- Name: idx_capacity_plans_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_capacity_plans_team ON public.capacity_plans USING btree (team_id);


--
-- Name: idx_capacity_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_capacity_team ON public.capacity_allocations USING btree (team_id);


--
-- Name: idx_case_datasets_case; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_datasets_case ON public.test_case_datasets USING btree (case_id);


--
-- Name: idx_case_requirements; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_requirements ON public.test_case_work_item_links USING btree (case_id);


--
-- Name: idx_case_steps_case; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_steps_case ON public.test_case_steps USING btree (case_id, case_version);


--
-- Name: idx_case_versions; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_versions ON public.test_case_versions USING btree (case_id, version);


--
-- Name: idx_case_versions_case; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_versions_case ON public.test_case_versions USING btree (case_id, version DESC);


--
-- Name: idx_cases_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cases_archived ON public.test_cases USING btree (is_archived) WHERE (is_archived = true);


--
-- Name: idx_cases_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cases_deleted ON public.test_cases USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: idx_certifications_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_certifications_expiry ON public.certifications USING btree (expiry_date);


--
-- Name: idx_certifications_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_certifications_member ON public.certifications USING btree (team_member_id);


--
-- Name: idx_checkins_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkins_date ON public.key_result_checkins USING btree (checked_in_at DESC);


--
-- Name: idx_checkins_key_result; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkins_key_result ON public.key_result_checkins USING btree (key_result_id);


--
-- Name: idx_comment_mentions_comment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_mentions_comment ON public.comment_mentions USING btree (comment_id);


--
-- Name: idx_comment_mentions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_mentions_user ON public.comment_mentions USING btree (mentioned_user_id);


--
-- Name: idx_comments_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_entity ON public.comments USING btree (entity_id, entity_type);


--
-- Name: idx_comments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_user ON public.comments USING btree (user_id);


--
-- Name: idx_custom_field_defs_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_field_defs_entity_type ON public.custom_field_defs USING btree (entity_type, is_active, display_order);


--
-- Name: idx_custom_field_values_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_field_values_entity ON public.custom_field_values USING btree (entity_type, entity_id);


--
-- Name: idx_cycle_assignments_cycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cycle_assignments_cycle ON public.test_cycle_case_assignments USING btree (cycle_id);


--
-- Name: idx_cycle_assignments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cycle_assignments_user ON public.test_cycle_case_assignments USING btree (assigned_to);


--
-- Name: idx_cycle_dependencies_cycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cycle_dependencies_cycle ON public.test_cycle_dependencies USING btree (cycle_id);


--
-- Name: idx_cycle_templates_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cycle_templates_project ON public.test_cycle_templates USING btree (project_id);


--
-- Name: idx_cycles_archived; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cycles_archived ON public.test_cycles USING btree (archived);


--
-- Name: idx_cycles_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cycles_template ON public.test_cycles USING btree (template_id);


--
-- Name: idx_dashboard_gadgets; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dashboard_gadgets ON public.test_dashboard_gadgets USING btree (dashboard_id);


--
-- Name: idx_dashboards_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dashboards_user ON public.test_dashboards USING btree (user_id, is_default);


--
-- Name: idx_dashboards_visibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dashboards_visibility ON public.test_dashboards USING btree (visibility, program_id);


--
-- Name: idx_dependencies_depends_on_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dependencies_depends_on_program ON public.dependencies USING btree (depends_on_program_id);


--
-- Name: idx_dependencies_depends_on_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dependencies_depends_on_team ON public.dependencies USING btree (depends_on_team_id);


--
-- Name: idx_dependencies_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dependencies_from ON public.dependencies USING btree (from_feature_id);


--
-- Name: idx_dependencies_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dependencies_level ON public.dependencies USING btree (dependency_level);


--
-- Name: idx_dependencies_pi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dependencies_pi ON public.dependencies USING btree (pi_id);


--
-- Name: idx_dependencies_requesting_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dependencies_requesting_program ON public.dependencies USING btree (requesting_program_id);


--
-- Name: idx_dependencies_requesting_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dependencies_requesting_team ON public.dependencies USING btree (requesting_team_id);


--
-- Name: idx_dependencies_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dependencies_status ON public.dependencies USING btree (status);


--
-- Name: idx_dependencies_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dependencies_to ON public.dependencies USING btree (to_feature_id);


--
-- Name: idx_dependency_audit_log_dependency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dependency_audit_log_dependency ON public.dependency_audit_log USING btree (dependency_id);


--
-- Name: idx_dependency_negotiations_dependency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dependency_negotiations_dependency ON public.dependency_negotiations USING btree (dependency_id);


--
-- Name: idx_discussion_mentions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_mentions_user ON public.discussion_mentions USING btree (mentioned_user_id);


--
-- Name: idx_discussions_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussions_entity ON public.discussions USING btree (entity_type, entity_id);


--
-- Name: idx_epic_acceptance_criteria_epic_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epic_acceptance_criteria_epic_id ON public.epic_acceptance_criteria USING btree (epic_id);


--
-- Name: idx_epic_benefits_epic_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epic_benefits_epic_id ON public.epic_benefits USING btree (epic_id);


--
-- Name: idx_epic_custom_columns_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epic_custom_columns_user_id ON public.epic_custom_columns USING btree (user_id);


--
-- Name: idx_epic_design_items_epic_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epic_design_items_epic_id ON public.epic_design_items USING btree (epic_id);


--
-- Name: idx_epic_links_epic_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epic_links_epic_id ON public.epic_links USING btree (epic_id);


--
-- Name: idx_epic_pi_forecasts_epic_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epic_pi_forecasts_epic_id ON public.epic_pi_forecasts USING btree (epic_id);


--
-- Name: idx_epic_pi_forecasts_pi_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epic_pi_forecasts_pi_id ON public.epic_pi_forecasts USING btree (pi_id);


--
-- Name: idx_epic_value_metrics_epic_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epic_value_metrics_epic_id ON public.epic_value_metrics USING btree (epic_id);


--
-- Name: idx_epics_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epics_deleted_at ON public.epics USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_epics_epic_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epics_epic_type ON public.epics USING btree (epic_type);


--
-- Name: idx_epics_global_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epics_global_rank ON public.epics USING btree (global_rank);


--
-- Name: idx_epics_investment_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epics_investment_type ON public.epics USING btree (investment_type);


--
-- Name: idx_epics_parked_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epics_parked_at ON public.epics USING btree (parked_at);


--
-- Name: idx_epics_portfolio_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epics_portfolio_rank ON public.epics USING btree (portfolio_id, portfolio_rank);


--
-- Name: idx_epics_process_step_entered_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epics_process_step_entered_at ON public.epics USING btree (process_step_entered_at);


--
-- Name: idx_epics_program_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epics_program_rank ON public.epics USING btree (primary_program_id, program_rank);


--
-- Name: idx_epics_quadrant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epics_quadrant ON public.epics USING btree (quadrant);


--
-- Name: idx_epics_theme; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_epics_theme ON public.epics USING btree (theme_id);


--
-- Name: idx_execution_evidence_execution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_execution_evidence_execution ON public.test_execution_evidence USING btree (execution_id);


--
-- Name: idx_execution_evidence_step; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_execution_evidence_step ON public.test_execution_evidence USING btree (execution_id, step_order);


--
-- Name: idx_execution_step_results_execution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_execution_step_results_execution ON public.test_execution_step_results USING btree (execution_id);


--
-- Name: idx_feature_flags_flag_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_flags_flag_key ON public.feature_flags USING btree (flag_key);


--
-- Name: idx_feature_pi_objective_links_feature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_pi_objective_links_feature ON public.feature_pi_objective_links USING btree (feature_id);


--
-- Name: idx_feature_pi_objective_links_objective; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_pi_objective_links_objective ON public.feature_pi_objective_links USING btree (pi_objective_id);


--
-- Name: idx_feature_scheduling_history_feature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_scheduling_history_feature ON public.feature_scheduling_history USING btree (feature_id);


--
-- Name: idx_features_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_features_deleted_at ON public.features USING btree (deleted_at);


--
-- Name: idx_features_display_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_features_display_id ON public.features USING btree (display_id);


--
-- Name: idx_features_epic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_features_epic ON public.features USING btree (epic_id);


--
-- Name: idx_features_iteration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_features_iteration ON public.features USING btree (iteration_id);


--
-- Name: idx_features_parked_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_features_parked_at ON public.features USING btree (parked_at);


--
-- Name: idx_features_pi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_features_pi ON public.features USING btree (pi_id);


--
-- Name: idx_features_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_features_program ON public.features USING btree (program_id);


--
-- Name: idx_features_rank_within_epic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_features_rank_within_epic ON public.features USING btree (epic_id, rank_within_epic);


--
-- Name: idx_features_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_features_team_id ON public.features USING btree (team_id);


--
-- Name: idx_features_team_target_completion_sprint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_features_team_target_completion_sprint ON public.features USING btree (team_target_completion_sprint_id);


--
-- Name: idx_folders_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_folders_entity_type ON public.test_folders USING btree (entity_type);


--
-- Name: idx_forecast_entries_pi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forecast_entries_pi ON public.forecast_entries USING btree (pi_id);


--
-- Name: idx_forecast_entries_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forecast_entries_program ON public.forecast_entries USING btree (program_id);


--
-- Name: idx_forecast_entries_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forecast_entries_team ON public.forecast_entries USING btree (team_id);


--
-- Name: idx_forecast_entries_work_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forecast_entries_work_item ON public.forecast_entries USING btree (work_item_id, work_item_type);


--
-- Name: idx_goals_level_snapshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goals_level_snapshot ON public.goals USING btree (level, snapshot_id);


--
-- Name: idx_idea_group_members_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_idea_group_members_group_id ON public.idea_group_members USING btree (group_id);


--
-- Name: idx_idea_group_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_idea_group_members_user_id ON public.idea_group_members USING btree (user_id);


--
-- Name: idx_ideas_idea_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ideas_idea_group_id ON public.ideas USING btree (idea_group_id);


--
-- Name: idx_ideas_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ideas_status ON public.ideas USING btree (status);


--
-- Name: idx_ideas_vote_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ideas_vote_score ON public.ideas USING btree (vote_score DESC);


--
-- Name: idx_ideation_attachments_idea_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ideation_attachments_idea_id ON public.ideation_attachments USING btree (idea_id);


--
-- Name: idx_ideation_comments_idea_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ideation_comments_idea_id ON public.ideation_comments USING btree (idea_id);


--
-- Name: idx_ideation_subscriptions_idea_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ideation_subscriptions_idea_id ON public.ideation_subscriptions USING btree (idea_id);


--
-- Name: idx_ideation_votes_idea_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ideation_votes_idea_id ON public.ideation_votes USING btree (idea_id);


--
-- Name: idx_ideation_votes_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ideation_votes_user_id ON public.ideation_votes USING btree (user_id);


--
-- Name: idx_import_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_history_created_at ON public.import_history USING btree (created_at DESC);


--
-- Name: idx_import_history_imported_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_history_imported_by ON public.import_history USING btree (imported_by);


--
-- Name: idx_initiatives_theme; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_initiatives_theme ON public.initiatives USING btree (theme_id);


--
-- Name: idx_iterations_pi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iterations_pi ON public.iterations USING btree (pi_id);


--
-- Name: idx_iterations_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iterations_team_id ON public.iterations USING btree (team_id);


--
-- Name: idx_jira_board_mappings_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jira_board_mappings_team ON public.jira_board_mappings USING btree (catalyst_team_id);


--
-- Name: idx_jira_connections_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jira_connections_active ON public.jira_connections USING btree (is_active);


--
-- Name: idx_jira_project_mappings_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jira_project_mappings_program ON public.jira_project_mappings USING btree (catalyst_program_id);


--
-- Name: idx_jira_sync_logs_connection; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jira_sync_logs_connection ON public.jira_sync_logs USING btree (connection_id, created_at DESC);


--
-- Name: idx_jira_work_item_links_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jira_work_item_links_entity ON public.jira_work_item_links USING btree (catalyst_entity_type, catalyst_entity_id);


--
-- Name: idx_jira_work_item_links_issue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jira_work_item_links_issue ON public.jira_work_item_links USING btree (jira_issue_key);


--
-- Name: idx_kanban_board_users_board; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kanban_board_users_board ON public.kanban_board_users USING btree (board_id);


--
-- Name: idx_kanban_board_users_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kanban_board_users_user ON public.kanban_board_users USING btree (user_id);


--
-- Name: idx_kanban_boards_portfolio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kanban_boards_portfolio ON public.kanban_boards USING btree (portfolio_id);


--
-- Name: idx_kanban_boards_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kanban_boards_program ON public.kanban_boards USING btree (program_id);


--
-- Name: idx_kanban_boards_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kanban_boards_team ON public.kanban_boards USING btree (team_id);


--
-- Name: idx_kanban_card_history_card; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kanban_card_history_card ON public.kanban_card_history USING btree (card_id);


--
-- Name: idx_kanban_cards_board; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kanban_cards_board ON public.kanban_cards USING btree (board_id);


--
-- Name: idx_kanban_cards_column; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kanban_cards_column ON public.kanban_cards USING btree (column_id);


--
-- Name: idx_kanban_cards_work_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kanban_cards_work_item ON public.kanban_cards USING btree (work_item_type, work_item_id);


--
-- Name: idx_kanban_columns_board; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kanban_columns_board ON public.kanban_columns USING btree (board_id);


--
-- Name: idx_kanban_columns_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kanban_columns_sort ON public.kanban_columns USING btree (board_id, sort_order);


--
-- Name: idx_kanban_swim_lanes_board; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kanban_swim_lanes_board ON public.kanban_swim_lanes USING btree (board_id);


--
-- Name: idx_kb_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_audit_log_created_at ON public.kb_audit_log USING btree (created_at DESC);


--
-- Name: idx_kb_audit_log_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_audit_log_resource ON public.kb_audit_log USING btree (resource_type, resource_id);


--
-- Name: idx_kb_audit_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_audit_log_user_id ON public.kb_audit_log USING btree (user_id);


--
-- Name: idx_kb_document_attachments_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_document_attachments_document_id ON public.kb_document_attachments USING btree (document_id);


--
-- Name: idx_kb_document_comments_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_document_comments_document_id ON public.kb_document_comments USING btree (document_id);


--
-- Name: idx_kb_document_comments_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_document_comments_parent_id ON public.kb_document_comments USING btree (parent_comment_id);


--
-- Name: idx_kb_document_labels_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_document_labels_document_id ON public.kb_document_labels USING btree (document_id);


--
-- Name: idx_kb_document_labels_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_document_labels_gin ON public.kb_document_labels USING gin (label public.gin_trgm_ops);


--
-- Name: idx_kb_document_labels_label; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_document_labels_label ON public.kb_document_labels USING btree (label);


--
-- Name: idx_kb_document_page_properties_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_document_page_properties_document_id ON public.kb_document_page_properties USING btree (document_id);


--
-- Name: idx_kb_document_page_properties_key_value; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_document_page_properties_key_value ON public.kb_document_page_properties USING btree (property_key, property_value);


--
-- Name: idx_kb_document_versions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_document_versions_created_at ON public.kb_document_versions USING btree (created_at DESC);


--
-- Name: idx_kb_document_versions_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_document_versions_document_id ON public.kb_document_versions USING btree (document_id);


--
-- Name: idx_kb_documents_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_documents_created_by ON public.kb_documents USING btree (created_by);


--
-- Name: idx_kb_documents_linked_work_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_documents_linked_work_item ON public.kb_documents USING btree (linked_work_item_id, linked_work_item_type);


--
-- Name: idx_kb_documents_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_documents_parent_id ON public.kb_documents USING btree (parent_id);


--
-- Name: idx_kb_documents_search_vector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_documents_search_vector ON public.kb_documents USING gin (search_vector);


--
-- Name: idx_kb_documents_space_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kb_documents_space_id ON public.kb_documents USING btree (space_id);


--
-- Name: idx_key_result_checkins_kr_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_key_result_checkins_kr_id ON public.key_result_checkins USING btree (key_result_id);


--
-- Name: idx_key_results_objective; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_key_results_objective ON public.key_results USING btree (objective_id);


--
-- Name: idx_kr_work_contributions_kr_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kr_work_contributions_kr_id ON public.kr_work_contributions USING btree (key_result_id);


--
-- Name: idx_kr_work_contributions_work_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kr_work_contributions_work_item ON public.kr_work_contributions USING btree (work_item_id, work_item_type);


--
-- Name: idx_milestones_business_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_milestones_business_request_id ON public.milestones USING btree (business_request_id);


--
-- Name: idx_milestones_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_milestones_due_date ON public.milestones USING btree (due_date);


--
-- Name: idx_milestones_work_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_milestones_work_item ON public.milestones USING btree (work_item_id);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (user_id, read);


--
-- Name: idx_notifications_user_id_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id_created ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: idx_objective_feature_links_obj_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objective_feature_links_obj_id ON public.objective_feature_links USING btree (objective_id);


--
-- Name: idx_objective_work_items_objective; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objective_work_items_objective ON public.objective_work_items USING btree (objective_id);


--
-- Name: idx_objective_work_items_work_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objective_work_items_work_item ON public.objective_work_items USING btree (work_item_id);


--
-- Name: idx_objectives_blocked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objectives_blocked ON public.objectives USING btree (is_blocked) WHERE (is_blocked = true);


--
-- Name: idx_objectives_is_v2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objectives_is_v2 ON public.objectives USING btree (is_v2);


--
-- Name: idx_objectives_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objectives_level ON public.objectives USING btree (objective_level_id);


--
-- Name: idx_objectives_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objectives_owner ON public.objectives USING btree (owner_id);


--
-- Name: idx_objectives_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objectives_parent ON public.objectives USING btree (parent_objective_id);


--
-- Name: idx_objectives_parent_goal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objectives_parent_goal ON public.objectives USING btree (parent_goal_id);


--
-- Name: idx_objectives_parent_objective_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objectives_parent_objective_id ON public.objectives USING btree (parent_objective_id);


--
-- Name: idx_objectives_portfolio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objectives_portfolio ON public.objectives USING btree (portfolio_id);


--
-- Name: idx_objectives_portfolio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objectives_portfolio_id ON public.objectives USING btree (portfolio_id);


--
-- Name: idx_objectives_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objectives_program ON public.objectives USING btree (program_id);


--
-- Name: idx_objectives_program_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objectives_program_id ON public.objectives USING btree (program_id);


--
-- Name: idx_objectives_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objectives_status ON public.objectives USING btree (status);


--
-- Name: idx_objectives_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objectives_team ON public.objectives USING btree (team_id);


--
-- Name: idx_objectives_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objectives_team_id ON public.objectives USING btree (team_id);


--
-- Name: idx_objectives_theme_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objectives_theme_id ON public.objectives USING btree (theme_id);


--
-- Name: idx_objectives_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_objectives_tier ON public.objectives USING btree (tier);


--
-- Name: idx_pi_objectives_pi_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pi_objectives_pi_id ON public.pi_objectives USING btree (pi_id);


--
-- Name: idx_pi_objectives_program_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pi_objectives_program_id ON public.pi_objectives USING btree (program_id);


--
-- Name: idx_pis_portfolio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pis_portfolio ON public.program_increments USING btree (portfolio_id);


--
-- Name: idx_predictability_metrics_pi; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_predictability_metrics_pi ON public.predictability_metrics USING btree (pi_id);


--
-- Name: idx_profiles_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_email ON public.profiles USING btree (email);


--
-- Name: idx_profiles_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_status ON public.profiles USING btree (status);


--
-- Name: idx_program_team_rankings_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_team_rankings_program ON public.program_team_rankings USING btree (program_id, rank_order);


--
-- Name: idx_programs_portfolio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_programs_portfolio ON public.programs USING btree (portfolio_id);


--
-- Name: idx_rankings_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rankings_context ON public.work_item_rankings USING btree (context_type, context_id, pi_id);


--
-- Name: idx_rankings_context_pi_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_rankings_context_pi_unique ON public.work_item_rankings USING btree (work_item_id, work_item_type, context_type, context_id, pi_id) WHERE ((context_id IS NOT NULL) AND (pi_id IS NOT NULL));


--
-- Name: idx_rankings_context_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_rankings_context_unique ON public.work_item_rankings USING btree (work_item_id, work_item_type, context_type, context_id) WHERE ((context_id IS NOT NULL) AND (pi_id IS NULL));


--
-- Name: idx_rankings_global_pi_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_rankings_global_pi_unique ON public.work_item_rankings USING btree (work_item_id, work_item_type, context_type, pi_id) WHERE ((context_id IS NULL) AND (pi_id IS NOT NULL));


--
-- Name: idx_rankings_global_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_rankings_global_unique ON public.work_item_rankings USING btree (work_item_id, work_item_type, context_type) WHERE ((context_id IS NULL) AND (pi_id IS NULL));


--
-- Name: idx_rankings_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rankings_rank ON public.work_item_rankings USING btree (rank);


--
-- Name: idx_rankings_work_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rankings_work_item ON public.work_item_rankings USING btree (work_item_id, work_item_type);


--
-- Name: idx_recent_activity_last_accessed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recent_activity_last_accessed ON public.recent_activity USING btree (user_id, last_accessed_at DESC);


--
-- Name: idx_recent_activity_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recent_activity_user_id ON public.recent_activity USING btree (user_id);


--
-- Name: idx_risks_business_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risks_business_request_id ON public.risks USING btree (business_request_id);


--
-- Name: idx_risks_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risks_created_at ON public.risks USING btree (created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_risks_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risks_owner_id ON public.risks USING btree (owner_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_risks_program_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risks_program_id ON public.risks USING btree (program_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_risks_program_increment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risks_program_increment_id ON public.risks USING btree (program_increment_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_risks_resolution_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risks_resolution_method ON public.risks USING btree (resolution_method) WHERE (deleted_at IS NULL);


--
-- Name: idx_risks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risks_status ON public.risks USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: idx_saved_filters_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_filters_user_id ON public.saved_filters USING btree (user_id);


--
-- Name: idx_shared_service_allocations_iteration_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shared_service_allocations_iteration_id ON public.shared_service_allocations USING btree (iteration_id);


--
-- Name: idx_shared_service_allocations_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shared_service_allocations_team_id ON public.shared_service_allocations USING btree (team_id);


--
-- Name: idx_shared_services_portfolio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shared_services_portfolio_id ON public.shared_services USING btree (portfolio_id);


--
-- Name: idx_shared_steps_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shared_steps_created_by ON public.shared_test_steps USING btree (created_by);


--
-- Name: idx_shared_steps_usage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shared_steps_usage ON public.shared_test_steps USING btree (usage_count DESC);


--
-- Name: idx_skill_requirements_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skill_requirements_entity ON public.skill_requirements USING btree (entity_type, entity_id);


--
-- Name: idx_starred_items_room; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_starred_items_room ON public.starred_items USING btree (room_type, room_id);


--
-- Name: idx_starred_items_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_starred_items_user_id ON public.starred_items USING btree (user_id);


--
-- Name: idx_stories_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_deleted_at ON public.stories USING btree (deleted_at);


--
-- Name: idx_stories_feature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_feature ON public.stories USING btree (feature_id);


--
-- Name: idx_stories_feature_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_feature_id ON public.stories USING btree (feature_id);


--
-- Name: idx_stories_sprint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_sprint ON public.stories USING btree (sprint_id);


--
-- Name: idx_stories_sprint_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_sprint_id ON public.stories USING btree (sprint_id);


--
-- Name: idx_stories_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_state ON public.stories USING btree (state);


--
-- Name: idx_stories_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_team ON public.stories USING btree (team_id);


--
-- Name: idx_stories_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_team_id ON public.stories USING btree (team_id);


--
-- Name: idx_story_comments_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_comments_story_id ON public.story_comments USING btree (story_id);


--
-- Name: idx_story_links_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_links_from ON public.story_links USING btree (from_story_id);


--
-- Name: idx_story_links_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_links_to ON public.story_links USING btree (to_story_id);


--
-- Name: idx_story_links_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_links_type ON public.story_links USING btree (link_type);


--
-- Name: idx_strategic_goals_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strategic_goals_parent ON public.strategic_goals USING btree (parent_goal_id);


--
-- Name: idx_strategic_goals_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strategic_goals_tier ON public.strategic_goals USING btree (tier);


--
-- Name: idx_strategic_themes_snapshot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_strategic_themes_snapshot_id ON public.strategic_themes USING btree (snapshot_id);


--
-- Name: idx_subscriptions_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_entity ON public.subscriptions USING btree (entity_type, entity_id);


--
-- Name: idx_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);


--
-- Name: idx_subtasks_story; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subtasks_story ON public.subtasks USING btree (story_id);


--
-- Name: idx_team_member_skills_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_member_skills_member ON public.team_member_skills USING btree (team_member_id);


--
-- Name: idx_team_member_skills_skill; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_member_skills_skill ON public.team_member_skills USING btree (skill_id);


--
-- Name: idx_team_members_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_team_id ON public.team_members USING btree (team_id);


--
-- Name: idx_team_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_members_user_id ON public.team_members USING btree (user_id);


--
-- Name: idx_team_metrics_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_metrics_date ON public.team_metrics USING btree (metric_date);


--
-- Name: idx_team_metrics_iteration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_metrics_iteration ON public.team_metrics USING btree (iteration_id);


--
-- Name: idx_team_metrics_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_metrics_team_id ON public.team_metrics USING btree (team_id);


--
-- Name: idx_team_subscriptions_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_subscriptions_team_id ON public.team_subscriptions USING btree (team_id);


--
-- Name: idx_team_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_subscriptions_user_id ON public.team_subscriptions USING btree (user_id);


--
-- Name: idx_teams_parent_portfolio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_parent_portfolio_id ON public.teams USING btree (parent_portfolio_id);


--
-- Name: idx_teams_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_program ON public.teams USING btree (program_id);


--
-- Name: idx_teams_region_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_region_id ON public.teams USING btree (region_id);


--
-- Name: idx_teams_team_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_team_type ON public.teams USING btree (team_type);


--
-- Name: idx_test_activity_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_activity_created ON public.test_activity_log USING btree (created_at DESC);


--
-- Name: idx_test_activity_log_program_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_activity_log_program_id ON public.test_activity_log USING btree (program_id);


--
-- Name: idx_test_activity_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_activity_user ON public.test_activity_log USING btree (user_id, created_at DESC);


--
-- Name: idx_test_case_shared_steps_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_case_shared_steps_order ON public.test_case_shared_steps USING btree (test_case_id, step_order);


--
-- Name: idx_test_case_shared_steps_shared_step; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_case_shared_steps_shared_step ON public.test_case_shared_steps USING btree (shared_step_id);


--
-- Name: idx_test_case_work_items_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_case_work_items_created ON public.test_case_work_items USING btree (created_at DESC);


--
-- Name: idx_test_case_work_items_test_case; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_case_work_items_test_case ON public.test_case_work_items USING btree (test_case_id);


--
-- Name: idx_test_case_work_items_work_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_case_work_items_work_item ON public.test_case_work_items USING btree (work_item_id, work_item_type);


--
-- Name: idx_test_cases_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_cases_created_by ON public.test_cases USING btree (created_by);


--
-- Name: idx_test_cases_folder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_cases_folder ON public.test_cases USING btree (folder_id);


--
-- Name: idx_test_cases_linked_work_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_cases_linked_work_item ON public.test_cases USING btree (linked_work_item_type, linked_work_item_id);


--
-- Name: idx_test_cases_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_cases_priority ON public.test_cases USING btree (priority);


--
-- Name: idx_test_cases_program_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_cases_program_id ON public.test_cases USING btree (program_id);


--
-- Name: idx_test_cases_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_cases_status ON public.test_cases USING btree (status);


--
-- Name: idx_test_cases_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_cases_type ON public.test_cases USING btree (test_type);


--
-- Name: idx_test_cycle_executions_assigned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_cycle_executions_assigned ON public.test_cycle_executions USING btree (assigned_to);


--
-- Name: idx_test_cycle_executions_cycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_cycle_executions_cycle ON public.test_cycle_executions USING btree (cycle_id);


--
-- Name: idx_test_cycle_executions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_cycle_executions_status ON public.test_cycle_executions USING btree (status);


--
-- Name: idx_test_cycles_adhoc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_cycles_adhoc ON public.test_cycles USING btree (is_adhoc);


--
-- Name: idx_test_cycles_folder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_cycles_folder ON public.test_cycles USING btree (folder_id);


--
-- Name: idx_test_cycles_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_cycles_program ON public.test_cycles USING btree (program_id);


--
-- Name: idx_test_data_parameters_test_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_data_parameters_test_case_id ON public.test_data_parameters USING btree (test_case_id);


--
-- Name: idx_test_data_rows_test_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_data_rows_test_case_id ON public.test_data_rows USING btree (test_case_id);


--
-- Name: idx_test_datasets_cycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_datasets_cycle ON public.test_datasets USING btree (cycle_id);


--
-- Name: idx_test_evidence_execution_step_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_evidence_execution_step_id ON public.test_evidence USING btree (execution_step_id);


--
-- Name: idx_test_evidence_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_evidence_uploaded_by ON public.test_evidence USING btree (uploaded_by);


--
-- Name: idx_test_execution_defects_execution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_execution_defects_execution ON public.test_execution_defects USING btree (execution_id);


--
-- Name: idx_test_execution_runs_cycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_execution_runs_cycle ON public.test_execution_runs USING btree (cycle_id);


--
-- Name: idx_test_execution_steps_execution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_execution_steps_execution ON public.test_execution_steps USING btree (test_execution_id);


--
-- Name: idx_test_execution_steps_step; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_execution_steps_step ON public.test_execution_steps USING btree (test_step_id);


--
-- Name: idx_test_executions_cycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_executions_cycle ON public.test_executions USING btree (test_cycle_id);


--
-- Name: idx_test_executions_defect; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_executions_defect ON public.test_executions USING btree (defect_id);


--
-- Name: idx_test_executions_executed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_executions_executed_by ON public.test_executions USING btree (executed_by);


--
-- Name: idx_test_executions_program_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_executions_program_id ON public.test_executions USING btree (program_id);


--
-- Name: idx_test_executions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_executions_status ON public.test_executions USING btree (status);


--
-- Name: idx_test_executions_test_case; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_executions_test_case ON public.test_executions USING btree (test_case_id);


--
-- Name: idx_test_folders_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_folders_created_by ON public.test_folders USING btree (created_by);


--
-- Name: idx_test_folders_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_folders_parent ON public.test_folders USING btree (parent_folder_id);


--
-- Name: idx_test_folders_program_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_folders_program_id ON public.test_folders USING btree (program_id);


--
-- Name: idx_test_folders_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_folders_team ON public.test_folders USING btree (team_id);


--
-- Name: idx_test_report_schedules_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_report_schedules_active ON public.test_report_schedules USING btree (is_active);


--
-- Name: idx_test_report_schedules_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_report_schedules_program ON public.test_report_schedules USING btree (program_id);


--
-- Name: idx_test_reports_generated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_reports_generated_at ON public.test_reports USING btree (generated_at);


--
-- Name: idx_test_reports_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_reports_program ON public.test_reports USING btree (program_id);


--
-- Name: idx_test_reports_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_reports_type ON public.test_reports USING btree (report_type);


--
-- Name: idx_test_set_cases_case; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_set_cases_case ON public.test_set_cases USING btree (case_id);


--
-- Name: idx_test_set_cases_set; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_set_cases_set ON public.test_set_cases USING btree (set_id);


--
-- Name: idx_test_sets_folder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_sets_folder ON public.test_sets USING btree (folder_id);


--
-- Name: idx_test_sets_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_sets_program ON public.test_sets USING btree (program_id);


--
-- Name: idx_test_sets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_sets_status ON public.test_sets USING btree (status);


--
-- Name: idx_test_steps_library_step; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_steps_library_step ON public.test_steps USING btree (library_step_id);


--
-- Name: idx_test_steps_test_case; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_steps_test_case ON public.test_steps USING btree (test_case_id, step_order);


--
-- Name: idx_theme_epic_links_epic_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_theme_epic_links_epic_id ON public.theme_epic_links USING btree (epic_id);


--
-- Name: idx_theme_epic_links_theme_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_theme_epic_links_theme_id ON public.theme_epic_links USING btree (theme_id);


--
-- Name: idx_time_logs_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_logs_date ON public.work_item_time_logs USING btree (work_date);


--
-- Name: idx_time_logs_work_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_logs_work_item ON public.work_item_time_logs USING btree (work_item_id, work_item_type);


--
-- Name: idx_user_epic_backlog_prefs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_epic_backlog_prefs_user_id ON public.user_epic_backlog_preferences USING btree (user_id);


--
-- Name: idx_user_forecast_preferences_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_forecast_preferences_user_id ON public.user_forecast_preferences USING btree (user_id);


--
-- Name: idx_user_notifications; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notifications ON public.user_notifications USING btree (user_id, is_read, created_at DESC);


--
-- Name: idx_value_stream_metrics_portfolio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_value_stream_metrics_portfolio ON public.value_stream_metrics USING btree (portfolio_id);


--
-- Name: idx_version_changes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_version_changes ON public.test_case_version_changes USING btree (case_id, to_version);


--
-- Name: idx_work_item_assignments_program; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_item_assignments_program ON public.work_item_assignments USING btree (program_id);


--
-- Name: idx_work_item_assignments_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_item_assignments_team ON public.work_item_assignments USING btree (team_id);


--
-- Name: idx_work_item_assignments_work_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_item_assignments_work_item ON public.work_item_assignments USING btree (work_item_id, work_item_type);


--
-- Name: idx_work_item_forecast_ranks_pi_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_item_forecast_ranks_pi_id ON public.work_item_forecast_ranks USING btree (pi_id);


--
-- Name: idx_work_item_forecast_ranks_work_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_item_forecast_ranks_work_item ON public.work_item_forecast_ranks USING btree (work_item_id, work_item_type);


--
-- Name: idx_work_item_key_history_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_item_key_history_item ON public.work_item_key_history USING btree (work_item_id, work_item_type);


--
-- Name: idx_work_item_key_history_new_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_item_key_history_new_key ON public.work_item_key_history USING btree (new_key);


--
-- Name: idx_work_item_key_history_old_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_item_key_history_old_key ON public.work_item_key_history USING btree (old_key);


--
-- Name: idx_work_item_label_assignments_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_item_label_assignments_entity ON public.work_item_label_assignments USING btree (entity_type, entity_id);


--
-- Name: idx_work_item_label_assignments_label; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_item_label_assignments_label ON public.work_item_label_assignments USING btree (label_id);


--
-- Name: idx_work_item_links_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_item_links_from ON public.work_item_links USING btree (from_work_item_id, from_work_item_type);


--
-- Name: idx_work_item_links_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_item_links_to ON public.work_item_links USING btree (to_work_item_id, to_work_item_type);


--
-- Name: idx_work_item_presence_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_item_presence_item ON public.work_item_presence USING btree (work_item_type, work_item_id);


--
-- Name: idx_work_item_presence_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_work_item_presence_unique ON public.work_item_presence USING btree (work_item_type, work_item_id, user_id);


--
-- Name: idx_work_item_requirements; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_item_requirements ON public.test_case_work_item_links USING btree (work_item_id);


--
-- Name: idx_work_item_versions_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_item_versions_item ON public.work_item_versions USING btree (work_item_id, work_item_type);


--
-- Name: idx_work_item_versions_release; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_item_versions_release ON public.work_item_versions USING btree (release_id);


--
-- Name: idx_work_item_versions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_item_versions_type ON public.work_item_versions USING btree (link_type);


--
-- Name: idx_work_item_watchers_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_item_watchers_item ON public.work_item_watchers USING btree (work_item_type, work_item_id);


--
-- Name: idx_work_item_watchers_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_item_watchers_user ON public.work_item_watchers USING btree (user_id);


--
-- Name: idx_workflow_rules_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_rules_entity_type ON public.workflow_rules USING btree (entity_type);


--
-- Name: risks auto_update_risk_status_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_update_risk_status_trigger BEFORE INSERT OR UPDATE OF resolution_method ON public.risks FOR EACH ROW EXECUTE FUNCTION public.auto_update_risk_status();


--
-- Name: profiles cleanup_on_profile_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER cleanup_on_profile_delete BEFORE DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.cleanup_user_data();


--
-- Name: kb_documents create_kb_document_version_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER create_kb_document_version_trigger AFTER UPDATE ON public.kb_documents FOR EACH ROW WHEN ((old.content IS DISTINCT FROM new.content)) EXECUTE FUNCTION public.create_kb_document_version();


--
-- Name: dependencies dependency_audit_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER dependency_audit_trigger AFTER INSERT OR UPDATE ON public.dependencies FOR EACH ROW EXECUTE FUNCTION public.log_dependency_changes();


--
-- Name: epics epic_process_step_tracking; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER epic_process_step_tracking BEFORE INSERT OR UPDATE OF process_step_id ON public.epics FOR EACH ROW EXECUTE FUNCTION public.track_epic_process_step_change();


--
-- Name: external_entities external_entities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER external_entities_updated_at BEFORE UPDATE ON public.external_entities FOR EACH ROW EXECUTE FUNCTION public.update_external_entities_updated_at();


--
-- Name: key_results key_results_updated_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER key_results_updated_trigger BEFORE UPDATE ON public.key_results FOR EACH ROW EXECUTE FUNCTION public.update_objective_timestamp();


--
-- Name: key_result_checkins kr_checkin_update_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER kr_checkin_update_trigger AFTER INSERT ON public.key_result_checkins FOR EACH ROW EXECUTE FUNCTION public.update_kr_on_checkin();


--
-- Name: dependencies log_dependencies_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_dependencies_activity AFTER INSERT OR DELETE OR UPDATE ON public.dependencies FOR EACH ROW EXECUTE FUNCTION public.log_activity();


--
-- Name: epics log_epics_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_epics_activity AFTER INSERT OR DELETE OR UPDATE ON public.epics FOR EACH ROW EXECUTE FUNCTION public.log_activity();


--
-- Name: features log_features_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_features_activity AFTER INSERT OR DELETE OR UPDATE ON public.features FOR EACH ROW EXECUTE FUNCTION public.log_activity();


--
-- Name: initiatives log_initiatives_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_initiatives_activity AFTER INSERT OR DELETE OR UPDATE ON public.initiatives FOR EACH ROW EXECUTE FUNCTION public.log_activity();


--
-- Name: iterations log_iterations_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_iterations_activity AFTER INSERT OR DELETE OR UPDATE ON public.iterations FOR EACH ROW EXECUTE FUNCTION public.log_activity();


--
-- Name: portfolios log_portfolios_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_portfolios_activity AFTER INSERT OR DELETE OR UPDATE ON public.portfolios FOR EACH ROW EXECUTE FUNCTION public.log_activity();


--
-- Name: program_increments log_program_increments_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_program_increments_activity AFTER INSERT OR DELETE OR UPDATE ON public.program_increments FOR EACH ROW EXECUTE FUNCTION public.log_activity();


--
-- Name: programs log_programs_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_programs_activity AFTER INSERT OR DELETE OR UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.log_activity();


--
-- Name: releases log_releases_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_releases_activity AFTER INSERT OR DELETE OR UPDATE ON public.releases FOR EACH ROW EXECUTE FUNCTION public.log_activity();


--
-- Name: stories log_stories_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_stories_activity AFTER INSERT OR DELETE OR UPDATE ON public.stories FOR EACH ROW EXECUTE FUNCTION public.log_activity();


--
-- Name: stories log_story_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_story_activity AFTER INSERT OR DELETE OR UPDATE ON public.stories FOR EACH ROW EXECUTE FUNCTION public.log_activity();


--
-- Name: strategic_themes log_strategic_themes_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_strategic_themes_activity AFTER INSERT OR DELETE OR UPDATE ON public.strategic_themes FOR EACH ROW EXECUTE FUNCTION public.log_activity();


--
-- Name: subtasks log_subtasks_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_subtasks_activity AFTER INSERT OR DELETE OR UPDATE ON public.subtasks FOR EACH ROW EXECUTE FUNCTION public.log_activity();


--
-- Name: teams log_teams_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_teams_activity AFTER INSERT OR DELETE OR UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.log_activity();


--
-- Name: user_roles log_user_role_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_user_role_changes AFTER INSERT OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.log_role_change();


--
-- Name: stories notify_on_story_assignment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_on_story_assignment AFTER INSERT OR UPDATE ON public.stories FOR EACH ROW EXECUTE FUNCTION public.notify_story_assignment();


--
-- Name: stories notify_on_story_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_on_story_status_change AFTER UPDATE ON public.stories FOR EACH ROW EXECUTE FUNCTION public.notify_status_change();


--
-- Name: subtasks notify_on_subtask_assignment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_on_subtask_assignment AFTER INSERT OR UPDATE ON public.subtasks FOR EACH ROW EXECUTE FUNCTION public.notify_subtask_assignment();


--
-- Name: subtasks notify_on_subtask_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_on_subtask_status_change AFTER UPDATE ON public.subtasks FOR EACH ROW EXECUTE FUNCTION public.notify_status_change();


--
-- Name: objectives objectives_updated_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER objectives_updated_trigger BEFORE UPDATE ON public.objectives FOR EACH ROW EXECUTE FUNCTION public.update_objective_timestamp();


--
-- Name: profiles on_profile_created_assign_role; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_profile_created_assign_role AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();


--
-- Name: business_requests set_business_request_key; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_business_request_key BEFORE INSERT ON public.business_requests FOR EACH ROW WHEN ((new.request_key IS NULL)) EXECUTE FUNCTION public.generate_business_request_key();


--
-- Name: team_members team_members_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_team_members_updated_at();


--
-- Name: team_metrics team_metrics_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER team_metrics_updated_at_trigger BEFORE UPDATE ON public.team_metrics FOR EACH ROW EXECUTE FUNCTION public.update_team_metrics_timestamp();


--
-- Name: test_data_parameters test_data_parameters_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER test_data_parameters_updated_at BEFORE UPDATE ON public.test_data_parameters FOR EACH ROW EXECUTE FUNCTION public.update_test_data_parameters_updated_at();


--
-- Name: test_data_rows test_data_rows_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER test_data_rows_updated_at BEFORE UPDATE ON public.test_data_rows FOR EACH ROW EXECUTE FUNCTION public.update_test_data_rows_updated_at();


--
-- Name: strategy_snapshots trigger_auto_archive_snapshot; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_archive_snapshot BEFORE INSERT OR UPDATE ON public.strategy_snapshots FOR EACH ROW EXECUTE FUNCTION public.auto_archive_active_snapshot();


--
-- Name: epic_process_history trigger_calculate_epic_process_time; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_calculate_epic_process_time BEFORE UPDATE ON public.epic_process_history FOR EACH ROW EXECUTE FUNCTION public.calculate_epic_process_time();


--
-- Name: epic_wsjf trigger_calculate_epic_wsjf; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_calculate_epic_wsjf BEFORE INSERT OR UPDATE ON public.epic_wsjf FOR EACH ROW EXECUTE FUNCTION public.calculate_epic_wsjf();


--
-- Name: features trigger_calculate_feature_wsjf; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_calculate_feature_wsjf BEFORE INSERT OR UPDATE OF business_value, time_criticality, risk_reduction, job_size ON public.features FOR EACH ROW EXECUTE FUNCTION public.calculate_feature_wsjf();


--
-- Name: features trigger_sync_feature_program; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_feature_program BEFORE INSERT OR UPDATE OF epic_id, program_epic_inherited ON public.features FOR EACH ROW EXECUTE FUNCTION public.sync_feature_program_from_epic();


--
-- Name: ideation_attachments trigger_update_idea_attachment_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_idea_attachment_count AFTER INSERT OR DELETE ON public.ideation_attachments FOR EACH ROW EXECUTE FUNCTION public.update_idea_attachment_count();


--
-- Name: ideation_comments trigger_update_idea_comment_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_idea_comment_count AFTER INSERT OR DELETE ON public.ideation_comments FOR EACH ROW EXECUTE FUNCTION public.update_idea_comment_count();


--
-- Name: ideation_votes trigger_update_idea_vote_counts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_idea_vote_counts AFTER INSERT OR DELETE OR UPDATE ON public.ideation_votes FOR EACH ROW EXECUTE FUNCTION public.update_idea_vote_counts();


--
-- Name: test_case_shared_steps trigger_update_shared_step_usage; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_shared_step_usage AFTER INSERT OR DELETE ON public.test_case_shared_steps FOR EACH ROW EXECUTE FUNCTION public.update_shared_step_usage_count();


--
-- Name: business_lines update_business_lines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_business_lines_updated_at BEFORE UPDATE ON public.business_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: business_requests update_business_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_business_requests_updated_at BEFORE UPDATE ON public.business_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: capacity_plans update_capacity_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_capacity_plans_updated_at BEFORE UPDATE ON public.capacity_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: comments update_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: demand_field_configs update_demand_field_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_demand_field_configs_updated_at BEFORE UPDATE ON public.demand_field_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: demand_section_configs update_demand_section_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_demand_section_configs_updated_at BEFORE UPDATE ON public.demand_section_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: demand_tab_configs update_demand_tab_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_demand_tab_configs_updated_at BEFORE UPDATE ON public.demand_tab_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discussions update_discussions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON public.discussions FOR EACH ROW EXECUTE FUNCTION public.update_notification_updated_at();


--
-- Name: drawer_tab_configs update_drawer_tab_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_drawer_tab_configs_updated_at BEFORE UPDATE ON public.drawer_tab_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: epic_benefits update_epic_benefits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_epic_benefits_updated_at BEFORE UPDATE ON public.epic_benefits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: epic_custom_columns update_epic_custom_columns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_epic_custom_columns_updated_at BEFORE UPDATE ON public.epic_custom_columns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: epic_design_items update_epic_design_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_epic_design_items_updated_at BEFORE UPDATE ON public.epic_design_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: epic_links update_epic_links_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_epic_links_updated_at BEFORE UPDATE ON public.epic_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: epic_pi_forecasts update_epic_pi_forecasts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_epic_pi_forecasts_updated_at BEFORE UPDATE ON public.epic_pi_forecasts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: epic_report_templates update_epic_report_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_epic_report_templates_updated_at BEFORE UPDATE ON public.epic_report_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: epic_value_metrics update_epic_value_metrics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_epic_value_metrics_updated_at BEFORE UPDATE ON public.epic_value_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: estimation_conversions update_estimation_conversions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_estimation_conversions_updated_at BEFORE UPDATE ON public.estimation_conversions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stories update_feature_progress_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_feature_progress_trigger AFTER INSERT OR DELETE OR UPDATE ON public.stories FOR EACH ROW EXECUTE FUNCTION public.update_feature_progress();


--
-- Name: forecast_entries update_forecast_entries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_forecast_entries_updated_at BEFORE UPDATE ON public.forecast_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: goals update_goals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: idea_groups update_idea_groups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_idea_groups_updated_at BEFORE UPDATE ON public.idea_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ideas update_ideas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ideas_updated_at BEFORE UPDATE ON public.ideas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ideation_comments update_ideation_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ideation_comments_updated_at BEFORE UPDATE ON public.ideation_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ideation_form_fields update_ideation_form_fields_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ideation_form_fields_updated_at BEFORE UPDATE ON public.ideation_form_fields FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ideation_forms update_ideation_forms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ideation_forms_updated_at BEFORE UPDATE ON public.ideation_forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_industry_preferences update_industry_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_industry_preferences_updated_at BEFORE UPDATE ON public.user_industry_preferences FOR EACH ROW EXECUTE FUNCTION public.update_industry_preferences_timestamp();


--
-- Name: kanban_boards update_kanban_boards_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_kanban_boards_timestamp BEFORE UPDATE ON public.kanban_boards FOR EACH ROW EXECUTE FUNCTION public.update_kanban_boards_updated_at();


--
-- Name: kb_doc_spaces update_kb_doc_spaces_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_kb_doc_spaces_updated_at BEFORE UPDATE ON public.kb_doc_spaces FOR EACH ROW EXECUTE FUNCTION public.update_kb_updated_at_column();


--
-- Name: kb_documents update_kb_document_content_text; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_kb_document_content_text BEFORE INSERT OR UPDATE OF content ON public.kb_documents FOR EACH ROW EXECUTE FUNCTION public.update_kb_content_text();


--
-- Name: kb_documents update_kb_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_kb_documents_updated_at BEFORE UPDATE ON public.kb_documents FOR EACH ROW EXECUTE FUNCTION public.update_kb_updated_at_column();


--
-- Name: kb_projects update_kb_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_kb_projects_updated_at BEFORE UPDATE ON public.kb_projects FOR EACH ROW EXECUTE FUNCTION public.update_kb_updated_at_column();


--
-- Name: key_results_v2 update_key_results_v2_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_key_results_v2_updated_at BEFORE UPDATE ON public.key_results_v2 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: kr_work_contributions update_kr_work_contributions_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_kr_work_contributions_timestamp BEFORE UPDATE ON public.kr_work_contributions FOR EACH ROW EXECUTE FUNCTION public.update_kr_work_contributions_updated_at();


--
-- Name: milestones update_milestones_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: modules update_modules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION public.update_modules_updated_at();


--
-- Name: user_notification_preferences update_notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.user_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_notification_preferences_updated_at();


--
-- Name: org_modules update_org_modules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_org_modules_updated_at BEFORE UPDATE ON public.org_modules FOR EACH ROW EXECUTE FUNCTION public.update_modules_updated_at();


--
-- Name: pi_objectives update_pi_objectives_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pi_objectives_updated_at BEFORE UPDATE ON public.pi_objectives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: portfolio_estimation_settings update_portfolio_estimation_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_portfolio_estimation_settings_updated_at BEFORE UPDATE ON public.portfolio_estimation_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: predictability_metrics update_predictability_metrics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_predictability_metrics_updated_at BEFORE UPDATE ON public.predictability_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_role_permissions update_product_role_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_role_permissions_updated_at BEFORE UPDATE ON public.product_role_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_roles update_product_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_roles_updated_at BEFORE UPDATE ON public.product_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_status_configs update_product_status_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_status_configs_updated_at BEFORE UPDATE ON public.product_status_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_view_configs update_product_view_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_view_configs_updated_at BEFORE UPDATE ON public.product_view_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: program_spend_per_point update_program_spend_per_point_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_program_spend_per_point_updated_at BEFORE UPDATE ON public.program_spend_per_point FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: report_definitions update_report_definitions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_report_definitions_updated_at BEFORE UPDATE ON public.report_definitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: risks update_risks_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_risks_updated_at_trigger BEFORE UPDATE ON public.risks FOR EACH ROW EXECUTE FUNCTION public.update_risks_updated_at();


--
-- Name: roadmap_items update_roadmap_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_roadmap_items_updated_at BEFORE UPDATE ON public.roadmap_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: saved_filters update_saved_filters_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_saved_filters_updated_at BEFORE UPDATE ON public.saved_filters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shared_service_allocations update_shared_service_allocations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shared_service_allocations_updated_at BEFORE UPDATE ON public.shared_service_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shared_services update_shared_services_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shared_services_updated_at BEFORE UPDATE ON public.shared_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: snapshot_strategy_links update_snapshot_strategy_links_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_snapshot_strategy_links_updated_at BEFORE UPDATE ON public.snapshot_strategy_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: story_links update_story_links_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_story_links_updated_at BEFORE UPDATE ON public.story_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: strategic_goals update_strategic_goals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_strategic_goals_updated_at BEFORE UPDATE ON public.strategic_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: strategy_missions update_strategy_missions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_strategy_missions_updated_at BEFORE UPDATE ON public.strategy_missions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: strategy_snapshots update_strategy_snapshots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_strategy_snapshots_updated_at BEFORE UPDATE ON public.strategy_snapshots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: strategy_values update_strategy_values_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_strategy_values_updated_at BEFORE UPDATE ON public.strategy_values FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: strategy_visions update_strategy_visions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_strategy_visions_updated_at BEFORE UPDATE ON public.strategy_visions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: team_point_systems update_team_point_systems_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_team_point_systems_updated_at BEFORE UPDATE ON public.team_point_systems FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: team_spend_per_sprint update_team_spend_per_sprint_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_team_spend_per_sprint_updated_at BEFORE UPDATE ON public.team_spend_per_sprint FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: test_cases update_test_cases_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_test_cases_updated_at BEFORE UPDATE ON public.test_cases FOR EACH ROW EXECUTE FUNCTION public.update_test_updated_at();


--
-- Name: test_execution_steps update_test_execution_steps_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_test_execution_steps_updated_at BEFORE UPDATE ON public.test_execution_steps FOR EACH ROW EXECUTE FUNCTION public.update_test_updated_at();


--
-- Name: test_executions update_test_executions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_test_executions_updated_at BEFORE UPDATE ON public.test_executions FOR EACH ROW EXECUTE FUNCTION public.update_test_updated_at();


--
-- Name: test_folders update_test_folders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_test_folders_updated_at BEFORE UPDATE ON public.test_folders FOR EACH ROW EXECUTE FUNCTION public.update_test_updated_at();


--
-- Name: test_notification_preferences update_test_notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_test_notification_preferences_updated_at BEFORE UPDATE ON public.test_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_test_notification_preferences_updated_at();


--
-- Name: test_steps update_test_steps_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_test_steps_updated_at BEFORE UPDATE ON public.test_steps FOR EACH ROW EXECUTE FUNCTION public.update_test_updated_at();


--
-- Name: user_epic_backlog_preferences update_user_epic_backlog_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_epic_backlog_preferences_updated_at BEFORE UPDATE ON public.user_epic_backlog_preferences FOR EACH ROW EXECUTE FUNCTION public.update_user_epic_backlog_preferences_updated_at();


--
-- Name: user_forecast_preferences update_user_forecast_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_forecast_preferences_updated_at BEFORE UPDATE ON public.user_forecast_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_notification_preferences update_user_notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_notification_preferences_updated_at BEFORE UPDATE ON public.user_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_notification_updated_at();


--
-- Name: user_permission_overrides update_user_permission_overrides_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_permission_overrides_updated_at BEFORE UPDATE ON public.user_permission_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: work_item_forecast_ranks update_work_item_forecast_ranks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_work_item_forecast_ranks_updated_at BEFORE UPDATE ON public.work_item_forecast_ranks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: work_item_rankings update_work_item_rankings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_work_item_rankings_updated_at BEFORE UPDATE ON public.work_item_rankings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workflow_rules update_workflow_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workflow_rules_updated_at BEFORE UPDATE ON public.workflow_rules FOR EACH ROW EXECUTE FUNCTION public.update_notification_updated_at();


--
-- Name: active_package active_package_package_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_package
    ADD CONSTRAINT active_package_package_code_fkey FOREIGN KEY (package_code) REFERENCES public.module_packages(code) ON DELETE SET NULL;


--
-- Name: active_package active_package_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.active_package
    ADD CONSTRAINT active_package_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: anchor_sprints anchor_sprints_program_increment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anchor_sprints
    ADD CONSTRAINT anchor_sprints_program_increment_id_fkey FOREIGN KEY (program_increment_id) REFERENCES public.program_increments(id) ON DELETE CASCADE;


--
-- Name: announcement_dismissals announcement_dismissals_announcement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_dismissals
    ADD CONSTRAINT announcement_dismissals_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE CASCADE;


--
-- Name: announcement_dismissals announcement_dismissals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_dismissals
    ADD CONSTRAINT announcement_dismissals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: announcements announcements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: business_request_audit_logs business_request_audit_logs_business_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_request_audit_logs
    ADD CONSTRAINT business_request_audit_logs_business_request_id_fkey FOREIGN KEY (business_request_id) REFERENCES public.business_requests(id) ON DELETE CASCADE;


--
-- Name: business_request_discussions business_request_discussions_business_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_request_discussions
    ADD CONSTRAINT business_request_discussions_business_request_id_fkey FOREIGN KEY (business_request_id) REFERENCES public.business_requests(id) ON DELETE CASCADE;


--
-- Name: business_request_links business_request_links_business_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_request_links
    ADD CONSTRAINT business_request_links_business_request_id_fkey FOREIGN KEY (business_request_id) REFERENCES public.business_requests(id) ON DELETE CASCADE;


--
-- Name: business_request_links business_request_links_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_request_links
    ADD CONSTRAINT business_request_links_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);


--
-- Name: capacity_allocations capacity_allocations_iteration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity_allocations
    ADD CONSTRAINT capacity_allocations_iteration_id_fkey FOREIGN KEY (iteration_id) REFERENCES public.iterations(id) ON DELETE CASCADE;


--
-- Name: capacity_allocations capacity_allocations_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity_allocations
    ADD CONSTRAINT capacity_allocations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: capacity_plans capacity_plans_pi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity_plans
    ADD CONSTRAINT capacity_plans_pi_id_fkey FOREIGN KEY (pi_id) REFERENCES public.program_increments(id) ON DELETE CASCADE;


--
-- Name: capacity_plans capacity_plans_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity_plans
    ADD CONSTRAINT capacity_plans_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: capacity_plans capacity_plans_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capacity_plans
    ADD CONSTRAINT capacity_plans_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: certifications certifications_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certifications
    ADD CONSTRAINT certifications_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE SET NULL;


--
-- Name: certifications certifications_team_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certifications
    ADD CONSTRAINT certifications_team_member_id_fkey FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE CASCADE;


--
-- Name: comment_mentions comment_mentions_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_mentions
    ADD CONSTRAINT comment_mentions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: custom_field_values custom_field_values_custom_field_def_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_field_values
    ADD CONSTRAINT custom_field_values_custom_field_def_id_fkey FOREIGN KEY (custom_field_def_id) REFERENCES public.custom_field_defs(id) ON DELETE CASCADE;


--
-- Name: demand_field_configs demand_field_configs_business_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_field_configs
    ADD CONSTRAINT demand_field_configs_business_line_id_fkey FOREIGN KEY (business_line_id) REFERENCES public.business_lines(id) ON DELETE CASCADE;


--
-- Name: demand_section_configs demand_section_configs_business_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_section_configs
    ADD CONSTRAINT demand_section_configs_business_line_id_fkey FOREIGN KEY (business_line_id) REFERENCES public.business_lines(id) ON DELETE CASCADE;


--
-- Name: demand_tab_configs demand_tab_configs_business_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_tab_configs
    ADD CONSTRAINT demand_tab_configs_business_line_id_fkey FOREIGN KEY (business_line_id) REFERENCES public.business_lines(id) ON DELETE CASCADE;


--
-- Name: dependencies dependencies_committed_by_sprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependencies
    ADD CONSTRAINT dependencies_committed_by_sprint_id_fkey FOREIGN KEY (committed_by_sprint_id) REFERENCES public.iterations(id);


--
-- Name: dependencies dependencies_depends_on_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependencies
    ADD CONSTRAINT dependencies_depends_on_program_id_fkey FOREIGN KEY (depends_on_program_id) REFERENCES public.programs(id);


--
-- Name: dependencies dependencies_depends_on_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependencies
    ADD CONSTRAINT dependencies_depends_on_team_id_fkey FOREIGN KEY (depends_on_team_id) REFERENCES public.teams(id);


--
-- Name: dependencies dependencies_due_iteration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependencies
    ADD CONSTRAINT dependencies_due_iteration_id_fkey FOREIGN KEY (due_iteration_id) REFERENCES public.iterations(id) ON DELETE SET NULL;


--
-- Name: dependencies dependencies_external_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependencies
    ADD CONSTRAINT dependencies_external_entity_id_fkey FOREIGN KEY (external_entity_id) REFERENCES public.external_entities(id);


--
-- Name: dependencies dependencies_from_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependencies
    ADD CONSTRAINT dependencies_from_feature_id_fkey FOREIGN KEY (from_feature_id) REFERENCES public.features(id) ON DELETE CASCADE;


--
-- Name: dependencies dependencies_needed_by_sprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependencies
    ADD CONSTRAINT dependencies_needed_by_sprint_id_fkey FOREIGN KEY (needed_by_sprint_id) REFERENCES public.iterations(id);


--
-- Name: dependencies dependencies_pi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependencies
    ADD CONSTRAINT dependencies_pi_id_fkey FOREIGN KEY (pi_id) REFERENCES public.program_increments(id);


--
-- Name: dependencies dependencies_requesting_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependencies
    ADD CONSTRAINT dependencies_requesting_program_id_fkey FOREIGN KEY (requesting_program_id) REFERENCES public.programs(id);


--
-- Name: dependencies dependencies_requesting_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependencies
    ADD CONSTRAINT dependencies_requesting_team_id_fkey FOREIGN KEY (requesting_team_id) REFERENCES public.teams(id);


--
-- Name: dependencies dependencies_to_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependencies
    ADD CONSTRAINT dependencies_to_feature_id_fkey FOREIGN KEY (to_feature_id) REFERENCES public.features(id) ON DELETE CASCADE;


--
-- Name: dependency_audit_log dependency_audit_log_dependency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependency_audit_log
    ADD CONSTRAINT dependency_audit_log_dependency_id_fkey FOREIGN KEY (dependency_id) REFERENCES public.dependencies(id) ON DELETE CASCADE;


--
-- Name: dependency_negotiations dependency_negotiations_dependency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependency_negotiations
    ADD CONSTRAINT dependency_negotiations_dependency_id_fkey FOREIGN KEY (dependency_id) REFERENCES public.dependencies(id) ON DELETE CASCADE;


--
-- Name: dependency_negotiations dependency_negotiations_proposed_sprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dependency_negotiations
    ADD CONSTRAINT dependency_negotiations_proposed_sprint_id_fkey FOREIGN KEY (proposed_sprint_id) REFERENCES public.iterations(id);


--
-- Name: discussion_mentions discussion_mentions_discussion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_mentions
    ADD CONSTRAINT discussion_mentions_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.discussions(id) ON DELETE CASCADE;


--
-- Name: discussion_mentions discussion_mentions_mentioned_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_mentions
    ADD CONSTRAINT discussion_mentions_mentioned_team_id_fkey FOREIGN KEY (mentioned_team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: discussion_mentions discussion_mentions_mentioned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_mentions
    ADD CONSTRAINT discussion_mentions_mentioned_user_id_fkey FOREIGN KEY (mentioned_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: discussions discussions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: drawer_tab_configs drawer_tab_configs_business_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drawer_tab_configs
    ADD CONSTRAINT drawer_tab_configs_business_line_id_fkey FOREIGN KEY (business_line_id) REFERENCES public.business_lines(id) ON DELETE CASCADE;


--
-- Name: epic_acceptance_criteria epic_acceptance_criteria_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_acceptance_criteria
    ADD CONSTRAINT epic_acceptance_criteria_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE CASCADE;


--
-- Name: epic_benefits epic_benefits_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_benefits
    ADD CONSTRAINT epic_benefits_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE CASCADE;


--
-- Name: epic_design_items epic_design_items_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_design_items
    ADD CONSTRAINT epic_design_items_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE CASCADE;


--
-- Name: epic_intake_responses epic_intake_responses_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_intake_responses
    ADD CONSTRAINT epic_intake_responses_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE CASCADE;


--
-- Name: epic_label_assignments epic_label_assignments_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_label_assignments
    ADD CONSTRAINT epic_label_assignments_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE CASCADE;


--
-- Name: epic_label_assignments epic_label_assignments_label_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_label_assignments
    ADD CONSTRAINT epic_label_assignments_label_id_fkey FOREIGN KEY (label_id) REFERENCES public.epic_labels(id) ON DELETE CASCADE;


--
-- Name: epic_labels epic_labels_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_labels
    ADD CONSTRAINT epic_labels_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: epic_links epic_links_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_links
    ADD CONSTRAINT epic_links_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE CASCADE;


--
-- Name: epic_pi_forecasts epic_pi_forecasts_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_pi_forecasts
    ADD CONSTRAINT epic_pi_forecasts_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE CASCADE;


--
-- Name: epic_pi_forecasts epic_pi_forecasts_pi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_pi_forecasts
    ADD CONSTRAINT epic_pi_forecasts_pi_id_fkey FOREIGN KEY (pi_id) REFERENCES public.program_increments(id) ON DELETE CASCADE;


--
-- Name: epic_process_history epic_process_history_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_process_history
    ADD CONSTRAINT epic_process_history_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE CASCADE;


--
-- Name: epic_process_history epic_process_history_process_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_process_history
    ADD CONSTRAINT epic_process_history_process_step_id_fkey FOREIGN KEY (process_step_id) REFERENCES public.process_steps(id) ON DELETE SET NULL;


--
-- Name: epic_program_increments epic_program_increments_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_program_increments
    ADD CONSTRAINT epic_program_increments_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE CASCADE;


--
-- Name: epic_program_increments epic_program_increments_pi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_program_increments
    ADD CONSTRAINT epic_program_increments_pi_id_fkey FOREIGN KEY (pi_id) REFERENCES public.program_increments(id) ON DELETE CASCADE;


--
-- Name: epic_programs epic_programs_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_programs
    ADD CONSTRAINT epic_programs_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE CASCADE;


--
-- Name: epic_programs epic_programs_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_programs
    ADD CONSTRAINT epic_programs_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: epic_roi_scores epic_roi_scores_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_roi_scores
    ADD CONSTRAINT epic_roi_scores_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE CASCADE;


--
-- Name: epic_scorecard_responses epic_scorecard_responses_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_scorecard_responses
    ADD CONSTRAINT epic_scorecard_responses_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE CASCADE;


--
-- Name: epic_scorecard_responses epic_scorecard_responses_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_scorecard_responses
    ADD CONSTRAINT epic_scorecard_responses_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.scorecard_questions(id) ON DELETE CASCADE;


--
-- Name: epic_scorecard_responses epic_scorecard_responses_selected_answer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_scorecard_responses
    ADD CONSTRAINT epic_scorecard_responses_selected_answer_id_fkey FOREIGN KEY (selected_answer_id) REFERENCES public.scorecard_answers(id);


--
-- Name: epic_spend epic_spend_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_spend
    ADD CONSTRAINT epic_spend_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE CASCADE;


--
-- Name: epic_value_metrics epic_value_metrics_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_value_metrics
    ADD CONSTRAINT epic_value_metrics_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE CASCADE;


--
-- Name: epic_wsjf epic_wsjf_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_wsjf
    ADD CONSTRAINT epic_wsjf_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE CASCADE;


--
-- Name: epic_wsjf epic_wsjf_pi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epic_wsjf
    ADD CONSTRAINT epic_wsjf_pi_id_fkey FOREIGN KEY (pi_id) REFERENCES public.program_increments(id) ON DELETE CASCADE;


--
-- Name: epics epics_primary_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epics
    ADD CONSTRAINT epics_primary_program_id_fkey FOREIGN KEY (primary_program_id) REFERENCES public.programs(id) ON DELETE SET NULL;


--
-- Name: epics epics_theme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epics
    ADD CONSTRAINT epics_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.strategic_themes(id) ON DELETE SET NULL;


--
-- Name: feature_pi_objective_links feature_pi_objective_links_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_pi_objective_links
    ADD CONSTRAINT feature_pi_objective_links_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.features(id) ON DELETE CASCADE;


--
-- Name: feature_pi_objective_links feature_pi_objective_links_pi_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_pi_objective_links
    ADD CONSTRAINT feature_pi_objective_links_pi_objective_id_fkey FOREIGN KEY (pi_objective_id) REFERENCES public.pi_objectives(id) ON DELETE CASCADE;


--
-- Name: feature_scheduling_history feature_scheduling_history_end_sprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_scheduling_history
    ADD CONSTRAINT feature_scheduling_history_end_sprint_id_fkey FOREIGN KEY (end_sprint_id) REFERENCES public.iterations(id);


--
-- Name: feature_scheduling_history feature_scheduling_history_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_scheduling_history
    ADD CONSTRAINT feature_scheduling_history_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.features(id) ON DELETE CASCADE;


--
-- Name: feature_scheduling_history feature_scheduling_history_start_sprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_scheduling_history
    ADD CONSTRAINT feature_scheduling_history_start_sprint_id_fkey FOREIGN KEY (start_sprint_id) REFERENCES public.iterations(id);


--
-- Name: feature_scheduling_history feature_scheduling_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_scheduling_history
    ADD CONSTRAINT feature_scheduling_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: features features_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.features
    ADD CONSTRAINT features_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE CASCADE;


--
-- Name: features features_iteration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.features
    ADD CONSTRAINT features_iteration_id_fkey FOREIGN KEY (iteration_id) REFERENCES public.iterations(id) ON DELETE SET NULL;


--
-- Name: features features_pi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.features
    ADD CONSTRAINT features_pi_id_fkey FOREIGN KEY (pi_id) REFERENCES public.program_increments(id) ON DELETE SET NULL;


--
-- Name: features features_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.features
    ADD CONSTRAINT features_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: features features_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.features
    ADD CONSTRAINT features_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: features features_team_target_completion_sprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.features
    ADD CONSTRAINT features_team_target_completion_sprint_id_fkey FOREIGN KEY (team_target_completion_sprint_id) REFERENCES public.iterations(id);


--
-- Name: epics fk_epics_portfolio; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epics
    ADD CONSTRAINT fk_epics_portfolio FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: epics fk_epics_process_step; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.epics
    ADD CONSTRAINT fk_epics_process_step FOREIGN KEY (process_step_id) REFERENCES public.process_steps(id) ON DELETE SET NULL;


--
-- Name: objectives fk_objectives_parent_key_result; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT fk_objectives_parent_key_result FOREIGN KEY (parent_key_result_id) REFERENCES public.key_results_v2(id) ON DELETE SET NULL;


--
-- Name: risks fk_program; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT fk_program FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: risks fk_program_increment; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT fk_program_increment FOREIGN KEY (program_increment_id) REFERENCES public.program_increments(id) ON DELETE CASCADE;


--
-- Name: forecast_entries forecast_entries_pi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_entries
    ADD CONSTRAINT forecast_entries_pi_id_fkey FOREIGN KEY (pi_id) REFERENCES public.program_increments(id) ON DELETE CASCADE;


--
-- Name: forecast_entries forecast_entries_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_entries
    ADD CONSTRAINT forecast_entries_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: forecast_entries forecast_entries_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_entries
    ADD CONSTRAINT forecast_entries_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: forecast_entries forecast_entries_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forecast_entries
    ADD CONSTRAINT forecast_entries_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: goals goals_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.strategy_snapshots(id) ON DELETE CASCADE;


--
-- Name: idea_group_members idea_group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idea_group_members
    ADD CONSTRAINT idea_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.idea_groups(id) ON DELETE CASCADE;


--
-- Name: idea_groups idea_groups_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idea_groups
    ADD CONSTRAINT idea_groups_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.ideation_forms(id) ON DELETE SET NULL;


--
-- Name: ideas ideas_idea_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideas
    ADD CONSTRAINT ideas_idea_group_id_fkey FOREIGN KEY (idea_group_id) REFERENCES public.idea_groups(id) ON DELETE CASCADE;


--
-- Name: ideation_attachments ideation_attachments_idea_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideation_attachments
    ADD CONSTRAINT ideation_attachments_idea_id_fkey FOREIGN KEY (idea_id) REFERENCES public.ideas(id) ON DELETE CASCADE;


--
-- Name: ideation_comments ideation_comments_idea_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideation_comments
    ADD CONSTRAINT ideation_comments_idea_id_fkey FOREIGN KEY (idea_id) REFERENCES public.ideas(id) ON DELETE CASCADE;


--
-- Name: ideation_form_fields ideation_form_fields_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideation_form_fields
    ADD CONSTRAINT ideation_form_fields_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.ideation_forms(id) ON DELETE CASCADE;


--
-- Name: ideation_subscriptions ideation_subscriptions_idea_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideation_subscriptions
    ADD CONSTRAINT ideation_subscriptions_idea_id_fkey FOREIGN KEY (idea_id) REFERENCES public.ideas(id) ON DELETE CASCADE;


--
-- Name: ideation_votes ideation_votes_idea_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ideation_votes
    ADD CONSTRAINT ideation_votes_idea_id_fkey FOREIGN KEY (idea_id) REFERENCES public.ideas(id) ON DELETE CASCADE;


--
-- Name: initiatives initiatives_theme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.initiatives
    ADD CONSTRAINT initiatives_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.strategic_themes(id) ON DELETE CASCADE;


--
-- Name: intake_fields intake_fields_intake_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_fields
    ADD CONSTRAINT intake_fields_intake_set_id_fkey FOREIGN KEY (intake_set_id) REFERENCES public.intake_sets(id) ON DELETE CASCADE;


--
-- Name: intake_sets intake_sets_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_sets
    ADD CONSTRAINT intake_sets_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id);


--
-- Name: iterations iterations_pi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iterations
    ADD CONSTRAINT iterations_pi_id_fkey FOREIGN KEY (pi_id) REFERENCES public.program_increments(id) ON DELETE CASCADE;


--
-- Name: iterations iterations_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iterations
    ADD CONSTRAINT iterations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: jira_auth_credentials jira_auth_credentials_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jira_auth_credentials
    ADD CONSTRAINT jira_auth_credentials_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.jira_connections(id) ON DELETE CASCADE;


--
-- Name: jira_board_mappings jira_board_mappings_catalyst_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jira_board_mappings
    ADD CONSTRAINT jira_board_mappings_catalyst_team_id_fkey FOREIGN KEY (catalyst_team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: jira_board_mappings jira_board_mappings_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jira_board_mappings
    ADD CONSTRAINT jira_board_mappings_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.jira_connections(id) ON DELETE CASCADE;


--
-- Name: jira_field_mappings jira_field_mappings_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jira_field_mappings
    ADD CONSTRAINT jira_field_mappings_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.jira_connections(id) ON DELETE CASCADE;


--
-- Name: jira_project_mappings jira_project_mappings_catalyst_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jira_project_mappings
    ADD CONSTRAINT jira_project_mappings_catalyst_program_id_fkey FOREIGN KEY (catalyst_program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: jira_project_mappings jira_project_mappings_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jira_project_mappings
    ADD CONSTRAINT jira_project_mappings_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.jira_connections(id) ON DELETE CASCADE;


--
-- Name: jira_sync_logs jira_sync_logs_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jira_sync_logs
    ADD CONSTRAINT jira_sync_logs_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.jira_connections(id) ON DELETE CASCADE;


--
-- Name: jira_work_item_links jira_work_item_links_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jira_work_item_links
    ADD CONSTRAINT jira_work_item_links_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.jira_connections(id) ON DELETE CASCADE;


--
-- Name: kanban_board_users kanban_board_users_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_board_users
    ADD CONSTRAINT kanban_board_users_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.kanban_boards(id) ON DELETE CASCADE;


--
-- Name: kanban_board_users kanban_board_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_board_users
    ADD CONSTRAINT kanban_board_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: kanban_boards kanban_boards_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_boards
    ADD CONSTRAINT kanban_boards_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: kanban_boards kanban_boards_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_boards
    ADD CONSTRAINT kanban_boards_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE SET NULL;


--
-- Name: kanban_boards kanban_boards_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_boards
    ADD CONSTRAINT kanban_boards_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE SET NULL;


--
-- Name: kanban_boards kanban_boards_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_boards
    ADD CONSTRAINT kanban_boards_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: kanban_card_history kanban_card_history_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_card_history
    ADD CONSTRAINT kanban_card_history_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.kanban_cards(id) ON DELETE CASCADE;


--
-- Name: kanban_card_history kanban_card_history_from_column_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_card_history
    ADD CONSTRAINT kanban_card_history_from_column_id_fkey FOREIGN KEY (from_column_id) REFERENCES public.kanban_columns(id);


--
-- Name: kanban_card_history kanban_card_history_moved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_card_history
    ADD CONSTRAINT kanban_card_history_moved_by_fkey FOREIGN KEY (moved_by) REFERENCES auth.users(id);


--
-- Name: kanban_card_history kanban_card_history_to_column_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_card_history
    ADD CONSTRAINT kanban_card_history_to_column_id_fkey FOREIGN KEY (to_column_id) REFERENCES public.kanban_columns(id);


--
-- Name: kanban_cards kanban_cards_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_cards
    ADD CONSTRAINT kanban_cards_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.kanban_boards(id) ON DELETE CASCADE;


--
-- Name: kanban_cards kanban_cards_column_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_cards
    ADD CONSTRAINT kanban_cards_column_id_fkey FOREIGN KEY (column_id) REFERENCES public.kanban_columns(id);


--
-- Name: kanban_cards kanban_cards_swim_lane_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_cards
    ADD CONSTRAINT kanban_cards_swim_lane_id_fkey FOREIGN KEY (swim_lane_id) REFERENCES public.kanban_swim_lanes(id);


--
-- Name: kanban_columns kanban_columns_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_columns
    ADD CONSTRAINT kanban_columns_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.kanban_boards(id) ON DELETE CASCADE;


--
-- Name: kanban_columns kanban_columns_parent_column_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_columns
    ADD CONSTRAINT kanban_columns_parent_column_id_fkey FOREIGN KEY (parent_column_id) REFERENCES public.kanban_columns(id) ON DELETE CASCADE;


--
-- Name: kanban_swim_lanes kanban_swim_lanes_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_swim_lanes
    ADD CONSTRAINT kanban_swim_lanes_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.kanban_boards(id) ON DELETE CASCADE;


--
-- Name: kb_doc_spaces kb_doc_spaces_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_doc_spaces
    ADD CONSTRAINT kb_doc_spaces_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.kb_projects(id) ON DELETE CASCADE;


--
-- Name: kb_document_attachments kb_document_attachments_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_attachments
    ADD CONSTRAINT kb_document_attachments_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.kb_documents(id) ON DELETE CASCADE;


--
-- Name: kb_document_comments kb_document_comments_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_comments
    ADD CONSTRAINT kb_document_comments_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.kb_documents(id) ON DELETE CASCADE;


--
-- Name: kb_document_comments kb_document_comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_comments
    ADD CONSTRAINT kb_document_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.kb_document_comments(id) ON DELETE CASCADE;


--
-- Name: kb_document_favorites kb_document_favorites_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_favorites
    ADD CONSTRAINT kb_document_favorites_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.kb_documents(id) ON DELETE CASCADE;


--
-- Name: kb_document_jira_issues kb_document_jira_issues_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_jira_issues
    ADD CONSTRAINT kb_document_jira_issues_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.kb_documents(id) ON DELETE CASCADE;


--
-- Name: kb_document_labels kb_document_labels_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_labels
    ADD CONSTRAINT kb_document_labels_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.kb_documents(id) ON DELETE CASCADE;


--
-- Name: kb_document_page_properties kb_document_page_properties_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_page_properties
    ADD CONSTRAINT kb_document_page_properties_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.kb_documents(id) ON DELETE CASCADE;


--
-- Name: kb_document_restrictions kb_document_restrictions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_restrictions
    ADD CONSTRAINT kb_document_restrictions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.kb_documents(id) ON DELETE CASCADE;


--
-- Name: kb_document_versions kb_document_versions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_versions
    ADD CONSTRAINT kb_document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.kb_documents(id) ON DELETE CASCADE;


--
-- Name: kb_document_watchers kb_document_watchers_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_document_watchers
    ADD CONSTRAINT kb_document_watchers_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.kb_documents(id) ON DELETE CASCADE;


--
-- Name: kb_documents kb_documents_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_documents
    ADD CONSTRAINT kb_documents_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.kb_documents(id) ON DELETE SET NULL;


--
-- Name: kb_documents kb_documents_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kb_documents
    ADD CONSTRAINT kb_documents_space_id_fkey FOREIGN KEY (space_id) REFERENCES public.kb_doc_spaces(id) ON DELETE CASCADE;


--
-- Name: key_result_checkins key_result_checkins_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_result_checkins
    ADD CONSTRAINT key_result_checkins_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: key_result_checkins key_result_checkins_key_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_result_checkins
    ADD CONSTRAINT key_result_checkins_key_result_id_fkey FOREIGN KEY (key_result_id) REFERENCES public.key_results_v2(id) ON DELETE CASCADE;


--
-- Name: key_results key_results_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_results
    ADD CONSTRAINT key_results_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: key_results_v2 key_results_v2_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_results_v2
    ADD CONSTRAINT key_results_v2_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: key_results_v2 key_results_v2_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_results_v2
    ADD CONSTRAINT key_results_v2_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: kr_work_contributions kr_work_contributions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kr_work_contributions
    ADD CONSTRAINT kr_work_contributions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: kr_work_contributions kr_work_contributions_key_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kr_work_contributions
    ADD CONSTRAINT kr_work_contributions_key_result_id_fkey FOREIGN KEY (key_result_id) REFERENCES public.key_results_v2(id) ON DELETE CASCADE;


--
-- Name: milestone_categories milestone_categories_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestone_categories
    ADD CONSTRAINT milestone_categories_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id);


--
-- Name: milestones milestones_business_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_business_request_id_fkey FOREIGN KEY (business_request_id) REFERENCES public.business_requests(id) ON DELETE CASCADE;


--
-- Name: milestones milestones_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.milestone_categories(id);


--
-- Name: milestones milestones_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE CASCADE;


--
-- Name: milestones milestones_work_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.milestones
    ADD CONSTRAINT milestones_work_item_id_fkey FOREIGN KEY (work_item_id) REFERENCES public.features(id) ON DELETE CASCADE;


--
-- Name: objective_capability_links objective_capability_links_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_capability_links
    ADD CONSTRAINT objective_capability_links_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: objective_contributors objective_contributors_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_contributors
    ADD CONSTRAINT objective_contributors_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: objective_dependencies objective_dependencies_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_dependencies
    ADD CONSTRAINT objective_dependencies_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: objective_epic_links objective_epic_links_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_epic_links
    ADD CONSTRAINT objective_epic_links_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE CASCADE;


--
-- Name: objective_epic_links objective_epic_links_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_epic_links
    ADD CONSTRAINT objective_epic_links_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: objective_feature_links objective_feature_links_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_feature_links
    ADD CONSTRAINT objective_feature_links_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.features(id) ON DELETE CASCADE;


--
-- Name: objective_feature_links objective_feature_links_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_feature_links
    ADD CONSTRAINT objective_feature_links_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: objective_impediments objective_impediments_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_impediments
    ADD CONSTRAINT objective_impediments_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: objective_initiative_links objective_initiative_links_initiative_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_initiative_links
    ADD CONSTRAINT objective_initiative_links_initiative_id_fkey FOREIGN KEY (initiative_id) REFERENCES public.initiatives(id) ON DELETE CASCADE;


--
-- Name: objective_initiative_links objective_initiative_links_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_initiative_links
    ADD CONSTRAINT objective_initiative_links_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: objective_linked_items objective_linked_items_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_linked_items
    ADD CONSTRAINT objective_linked_items_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: objective_program_increments objective_program_increments_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_program_increments
    ADD CONSTRAINT objective_program_increments_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: objective_program_increments objective_program_increments_program_increment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_program_increments
    ADD CONSTRAINT objective_program_increments_program_increment_id_fkey FOREIGN KEY (program_increment_id) REFERENCES public.program_increments(id) ON DELETE CASCADE;


--
-- Name: objective_risks objective_risks_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_risks
    ADD CONSTRAINT objective_risks_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: objective_theme_links objective_theme_links_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_theme_links
    ADD CONSTRAINT objective_theme_links_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: objective_theme_links objective_theme_links_theme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_theme_links
    ADD CONSTRAINT objective_theme_links_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.strategic_themes(id) ON DELETE CASCADE;


--
-- Name: objective_work_item_alignments objective_work_item_alignments_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_work_item_alignments
    ADD CONSTRAINT objective_work_item_alignments_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: objective_work_items objective_work_items_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_work_items
    ADD CONSTRAINT objective_work_items_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: objective_work_items objective_work_items_work_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objective_work_items
    ADD CONSTRAINT objective_work_items_work_item_id_fkey FOREIGN KEY (work_item_id) REFERENCES public.features(id) ON DELETE CASCADE;


--
-- Name: objectives objectives_anchor_sprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT objectives_anchor_sprint_id_fkey FOREIGN KEY (anchor_sprint_id) REFERENCES public.anchor_sprints(id) ON DELETE SET NULL;


--
-- Name: objectives objectives_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT objectives_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE SET NULL;


--
-- Name: objectives objectives_objective_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT objectives_objective_level_id_fkey FOREIGN KEY (objective_level_id) REFERENCES public.objective_levels(id) ON DELETE CASCADE;


--
-- Name: objectives objectives_parent_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT objectives_parent_goal_id_fkey FOREIGN KEY (parent_goal_id) REFERENCES public.strategic_goals(id) ON DELETE SET NULL;


--
-- Name: objectives objectives_parent_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT objectives_parent_objective_id_fkey FOREIGN KEY (parent_objective_id) REFERENCES public.objectives(id) ON DELETE SET NULL;


--
-- Name: objectives objectives_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT objectives_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE SET NULL;


--
-- Name: objectives objectives_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT objectives_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE SET NULL;


--
-- Name: objectives objectives_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT objectives_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.strategy_snapshots(id) ON DELETE SET NULL;


--
-- Name: objectives objectives_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT objectives_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: objectives objectives_theme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT objectives_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.strategic_themes(id) ON DELETE SET NULL;


--
-- Name: org_modules org_modules_enabled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_modules
    ADD CONSTRAINT org_modules_enabled_by_fkey FOREIGN KEY (enabled_by) REFERENCES auth.users(id);


--
-- Name: org_modules org_modules_module_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_modules
    ADD CONSTRAINT org_modules_module_code_fkey FOREIGN KEY (module_code) REFERENCES public.modules(code) ON DELETE CASCADE;


--
-- Name: package_modules package_modules_module_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_modules
    ADD CONSTRAINT package_modules_module_code_fkey FOREIGN KEY (module_code) REFERENCES public.modules(code) ON DELETE CASCADE;


--
-- Name: package_modules package_modules_package_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_modules
    ADD CONSTRAINT package_modules_package_code_fkey FOREIGN KEY (package_code) REFERENCES public.module_packages(code) ON DELETE CASCADE;


--
-- Name: permission_grants permission_grants_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permission_grants
    ADD CONSTRAINT permission_grants_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.permission_roles(id) ON DELETE CASCADE;


--
-- Name: pi_objectives pi_objectives_pi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pi_objectives
    ADD CONSTRAINT pi_objectives_pi_id_fkey FOREIGN KEY (pi_id) REFERENCES public.program_increments(id) ON DELETE CASCADE;


--
-- Name: pi_objectives pi_objectives_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pi_objectives
    ADD CONSTRAINT pi_objectives_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: portfolio_estimation_settings portfolio_estimation_settings_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_estimation_settings
    ADD CONSTRAINT portfolio_estimation_settings_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: portfolio_members portfolio_members_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_members
    ADD CONSTRAINT portfolio_members_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: portfolio_members portfolio_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_members
    ADD CONSTRAINT portfolio_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: predictability_metrics predictability_metrics_pi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictability_metrics
    ADD CONSTRAINT predictability_metrics_pi_id_fkey FOREIGN KEY (pi_id) REFERENCES public.program_increments(id) ON DELETE CASCADE;


--
-- Name: predictability_metrics predictability_metrics_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.predictability_metrics
    ADD CONSTRAINT predictability_metrics_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: process_flows process_flows_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_flows
    ADD CONSTRAINT process_flows_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: process_steps process_steps_process_flow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_steps
    ADD CONSTRAINT process_steps_process_flow_id_fkey FOREIGN KEY (process_flow_id) REFERENCES public.process_flows(id) ON DELETE CASCADE;


--
-- Name: product_role_permissions product_role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_role_permissions
    ADD CONSTRAINT product_role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.product_roles(id) ON DELETE CASCADE;


--
-- Name: product_view_configs product_view_configs_business_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_view_configs
    ADD CONSTRAINT product_view_configs_business_line_id_fkey FOREIGN KEY (business_line_id) REFERENCES public.business_lines(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: program_increments program_increments_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_increments
    ADD CONSTRAINT program_increments_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: program_members program_members_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_members
    ADD CONSTRAINT program_members_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: program_members program_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_members
    ADD CONSTRAINT program_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: program_spend_per_point program_spend_per_point_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_spend_per_point
    ADD CONSTRAINT program_spend_per_point_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: program_team_rankings program_team_rankings_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_team_rankings
    ADD CONSTRAINT program_team_rankings_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: program_team_rankings program_team_rankings_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_team_rankings
    ADD CONSTRAINT program_team_rankings_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: programs programs_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: release_feature_links release_feature_links_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_feature_links
    ADD CONSTRAINT release_feature_links_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.features(id) ON DELETE CASCADE;


--
-- Name: release_feature_links release_feature_links_release_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_feature_links
    ADD CONSTRAINT release_feature_links_release_id_fkey FOREIGN KEY (release_id) REFERENCES public.releases(id) ON DELETE CASCADE;


--
-- Name: release_story_links release_story_links_release_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_story_links
    ADD CONSTRAINT release_story_links_release_id_fkey FOREIGN KEY (release_id) REFERENCES public.releases(id) ON DELETE CASCADE;


--
-- Name: release_story_links release_story_links_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_story_links
    ADD CONSTRAINT release_story_links_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: release_vehicles release_vehicles_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_vehicles
    ADD CONSTRAINT release_vehicles_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE SET NULL;


--
-- Name: release_vehicles release_vehicles_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_vehicles
    ADD CONSTRAINT release_vehicles_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE SET NULL;


--
-- Name: releases releases_release_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.releases
    ADD CONSTRAINT releases_release_vehicle_id_fkey FOREIGN KEY (release_vehicle_id) REFERENCES public.release_vehicles(id) ON DELETE CASCADE;


--
-- Name: risks risks_business_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risks
    ADD CONSTRAINT risks_business_request_id_fkey FOREIGN KEY (business_request_id) REFERENCES public.business_requests(id) ON DELETE CASCADE;


--
-- Name: roadmap_items roadmap_items_program_increment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_items
    ADD CONSTRAINT roadmap_items_program_increment_id_fkey FOREIGN KEY (program_increment_id) REFERENCES public.program_increments(id) ON DELETE CASCADE;


--
-- Name: roadmap_items roadmap_items_work_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roadmap_items
    ADD CONSTRAINT roadmap_items_work_item_id_fkey FOREIGN KEY (work_item_id) REFERENCES public.features(id) ON DELETE CASCADE;


--
-- Name: scheduled_emails scheduled_emails_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_emails
    ADD CONSTRAINT scheduled_emails_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: scorecard_answers scorecard_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scorecard_answers
    ADD CONSTRAINT scorecard_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.scorecard_questions(id) ON DELETE CASCADE;


--
-- Name: scorecard_questions scorecard_questions_scorecard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scorecard_questions
    ADD CONSTRAINT scorecard_questions_scorecard_id_fkey FOREIGN KEY (scorecard_id) REFERENCES public.scorecards(id) ON DELETE CASCADE;


--
-- Name: scorecards scorecards_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scorecards
    ADD CONSTRAINT scorecards_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id);


--
-- Name: shared_service_allocations shared_service_allocations_iteration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_service_allocations
    ADD CONSTRAINT shared_service_allocations_iteration_id_fkey FOREIGN KEY (iteration_id) REFERENCES public.iterations(id) ON DELETE CASCADE;


--
-- Name: shared_service_allocations shared_service_allocations_shared_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_service_allocations
    ADD CONSTRAINT shared_service_allocations_shared_service_id_fkey FOREIGN KEY (shared_service_id) REFERENCES public.shared_services(id) ON DELETE CASCADE;


--
-- Name: shared_service_allocations shared_service_allocations_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_service_allocations
    ADD CONSTRAINT shared_service_allocations_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: shared_services shared_services_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_services
    ADD CONSTRAINT shared_services_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: skill_requirements skill_requirements_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skill_requirements
    ADD CONSTRAINT skill_requirements_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: snapshot_configurations snapshot_configurations_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshot_configurations
    ADD CONSTRAINT snapshot_configurations_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.strategy_snapshots(id) ON DELETE CASCADE;


--
-- Name: snapshot_strategy_links snapshot_strategy_links_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.snapshot_strategy_links
    ADD CONSTRAINT snapshot_strategy_links_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.strategy_snapshots(id) ON DELETE CASCADE;


--
-- Name: stories stories_feature_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES public.features(id) ON DELETE CASCADE;


--
-- Name: stories stories_sprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_sprint_id_fkey FOREIGN KEY (sprint_id) REFERENCES public.iterations(id) ON DELETE SET NULL;


--
-- Name: stories stories_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: story_comments story_comments_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_comments
    ADD CONSTRAINT story_comments_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: story_links story_links_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_links
    ADD CONSTRAINT story_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: story_links story_links_from_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_links
    ADD CONSTRAINT story_links_from_story_id_fkey FOREIGN KEY (from_story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: story_links story_links_to_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_links
    ADD CONSTRAINT story_links_to_story_id_fkey FOREIGN KEY (to_story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: strategic_goal_key_results strategic_goal_key_results_strategic_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategic_goal_key_results
    ADD CONSTRAINT strategic_goal_key_results_strategic_goal_id_fkey FOREIGN KEY (strategic_goal_id) REFERENCES public.strategic_goals(id) ON DELETE CASCADE;


--
-- Name: strategic_goals strategic_goals_parent_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategic_goals
    ADD CONSTRAINT strategic_goals_parent_goal_id_fkey FOREIGN KEY (parent_goal_id) REFERENCES public.strategic_goals(id);


--
-- Name: strategic_goals strategic_goals_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategic_goals
    ADD CONSTRAINT strategic_goals_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.strategy_snapshots(id) ON DELETE CASCADE;


--
-- Name: strategic_themes strategic_themes_snapshot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.strategic_themes
    ADD CONSTRAINT strategic_themes_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES public.strategy_snapshots(id);


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: subtasks subtasks_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subtasks
    ADD CONSTRAINT subtasks_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: team_member_skills team_member_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_member_skills
    ADD CONSTRAINT team_member_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: team_member_skills team_member_skills_team_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_member_skills
    ADD CONSTRAINT team_member_skills_team_member_id_fkey FOREIGN KEY (team_member_id) REFERENCES public.team_members(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: team_metrics team_metrics_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_metrics
    ADD CONSTRAINT team_metrics_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_point_systems team_point_systems_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_point_systems
    ADD CONSTRAINT team_point_systems_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_spend_per_sprint team_spend_per_sprint_sprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_spend_per_sprint
    ADD CONSTRAINT team_spend_per_sprint_sprint_id_fkey FOREIGN KEY (sprint_id) REFERENCES public.iterations(id) ON DELETE CASCADE;


--
-- Name: team_spend_per_sprint team_spend_per_sprint_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_spend_per_sprint
    ADD CONSTRAINT team_spend_per_sprint_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_subscriptions team_subscriptions_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_subscriptions
    ADD CONSTRAINT team_subscriptions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_subscriptions team_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_subscriptions
    ADD CONSTRAINT team_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: teams teams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: teams teams_parent_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_parent_portfolio_id_fkey FOREIGN KEY (parent_portfolio_id) REFERENCES public.portfolios(id) ON DELETE SET NULL;


--
-- Name: teams teams_parent_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_parent_program_id_fkey FOREIGN KEY (parent_program_id) REFERENCES public.programs(id) ON DELETE SET NULL;


--
-- Name: teams teams_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: test_activity_log test_activity_log_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_activity_log
    ADD CONSTRAINT test_activity_log_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: test_activity_log test_activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_activity_log
    ADD CONSTRAINT test_activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: test_case_bulk_operations test_case_bulk_operations_executed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_bulk_operations
    ADD CONSTRAINT test_case_bulk_operations_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES auth.users(id);


--
-- Name: test_case_datasets test_case_datasets_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_datasets
    ADD CONSTRAINT test_case_datasets_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.test_cases(id) ON DELETE CASCADE;


--
-- Name: test_case_parameters test_case_parameters_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_parameters
    ADD CONSTRAINT test_case_parameters_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.test_cases(id) ON DELETE CASCADE;


--
-- Name: test_case_priorities test_case_priorities_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_priorities
    ADD CONSTRAINT test_case_priorities_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: test_case_shared_steps test_case_shared_steps_shared_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_shared_steps
    ADD CONSTRAINT test_case_shared_steps_shared_step_id_fkey FOREIGN KEY (shared_step_id) REFERENCES public.shared_test_steps(id) ON DELETE CASCADE;


--
-- Name: test_case_shared_steps test_case_shared_steps_test_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_shared_steps
    ADD CONSTRAINT test_case_shared_steps_test_case_id_fkey FOREIGN KEY (test_case_id) REFERENCES public.test_cases(id) ON DELETE CASCADE;


--
-- Name: test_case_statuses test_case_statuses_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_statuses
    ADD CONSTRAINT test_case_statuses_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: test_case_steps test_case_steps_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_steps
    ADD CONSTRAINT test_case_steps_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.test_cases(id) ON DELETE CASCADE;


--
-- Name: test_case_version_changes test_case_version_changes_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_version_changes
    ADD CONSTRAINT test_case_version_changes_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.test_cases(id);


--
-- Name: test_case_version_changes test_case_version_changes_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_version_changes
    ADD CONSTRAINT test_case_version_changes_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);


--
-- Name: test_case_versions test_case_versions_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_versions
    ADD CONSTRAINT test_case_versions_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.test_cases(id) ON DELETE CASCADE;


--
-- Name: test_case_versions test_case_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_versions
    ADD CONSTRAINT test_case_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: test_case_versions test_case_versions_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_versions
    ADD CONSTRAINT test_case_versions_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.test_folders(id);


--
-- Name: test_case_versions test_case_versions_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_versions
    ADD CONSTRAINT test_case_versions_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);


--
-- Name: test_case_work_item_links test_case_work_item_links_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_work_item_links
    ADD CONSTRAINT test_case_work_item_links_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.test_cases(id) ON DELETE CASCADE;


--
-- Name: test_case_work_item_links test_case_work_item_links_linked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_work_item_links
    ADD CONSTRAINT test_case_work_item_links_linked_by_fkey FOREIGN KEY (linked_by) REFERENCES auth.users(id);


--
-- Name: test_case_work_items test_case_work_items_test_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_work_items
    ADD CONSTRAINT test_case_work_items_test_case_id_fkey FOREIGN KEY (test_case_id) REFERENCES public.test_cases(id) ON DELETE CASCADE;


--
-- Name: test_cases test_cases_archived_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cases
    ADD CONSTRAINT test_cases_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES auth.users(id);


--
-- Name: test_cases test_cases_automation_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cases
    ADD CONSTRAINT test_cases_automation_owner_id_fkey FOREIGN KEY (automation_owner_id) REFERENCES auth.users(id);


--
-- Name: test_cases test_cases_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cases
    ADD CONSTRAINT test_cases_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id);


--
-- Name: test_cases test_cases_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cases
    ADD CONSTRAINT test_cases_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.test_folders(id) ON DELETE SET NULL;


--
-- Name: test_cases test_cases_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cases
    ADD CONSTRAINT test_cases_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);


--
-- Name: test_cases test_cases_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cases
    ADD CONSTRAINT test_cases_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: test_cycle_case_assignments test_cycle_case_assignments_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cycle_case_assignments
    ADD CONSTRAINT test_cycle_case_assignments_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.test_cases(id) ON DELETE CASCADE;


--
-- Name: test_cycle_case_assignments test_cycle_case_assignments_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cycle_case_assignments
    ADD CONSTRAINT test_cycle_case_assignments_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.test_cycles(id) ON DELETE CASCADE;


--
-- Name: test_cycle_dependencies test_cycle_dependencies_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cycle_dependencies
    ADD CONSTRAINT test_cycle_dependencies_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.test_cycles(id) ON DELETE CASCADE;


--
-- Name: test_cycle_dependencies test_cycle_dependencies_predecessor_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cycle_dependencies
    ADD CONSTRAINT test_cycle_dependencies_predecessor_case_id_fkey FOREIGN KEY (predecessor_case_id) REFERENCES public.test_cases(id) ON DELETE CASCADE;


--
-- Name: test_cycle_dependencies test_cycle_dependencies_successor_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cycle_dependencies
    ADD CONSTRAINT test_cycle_dependencies_successor_case_id_fkey FOREIGN KEY (successor_case_id) REFERENCES public.test_cases(id) ON DELETE CASCADE;


--
-- Name: test_cycle_executions test_cycle_executions_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cycle_executions
    ADD CONSTRAINT test_cycle_executions_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.test_cases(id) ON DELETE CASCADE;


--
-- Name: test_cycle_executions test_cycle_executions_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cycle_executions
    ADD CONSTRAINT test_cycle_executions_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.test_cycles(id) ON DELETE CASCADE;


--
-- Name: test_cycles test_cycles_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cycles
    ADD CONSTRAINT test_cycles_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.test_folders(id) ON DELETE SET NULL;


--
-- Name: test_cycles test_cycles_source_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cycles
    ADD CONSTRAINT test_cycles_source_set_id_fkey FOREIGN KEY (source_set_id) REFERENCES public.test_sets(id);


--
-- Name: test_dashboard_gadgets test_dashboard_gadgets_dashboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_dashboard_gadgets
    ADD CONSTRAINT test_dashboard_gadgets_dashboard_id_fkey FOREIGN KEY (dashboard_id) REFERENCES public.test_dashboards(id) ON DELETE CASCADE;


--
-- Name: test_dashboard_shares test_dashboard_shares_dashboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_dashboard_shares
    ADD CONSTRAINT test_dashboard_shares_dashboard_id_fkey FOREIGN KEY (dashboard_id) REFERENCES public.test_dashboards(id) ON DELETE CASCADE;


--
-- Name: test_data_parameters test_data_parameters_test_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_data_parameters
    ADD CONSTRAINT test_data_parameters_test_case_id_fkey FOREIGN KEY (test_case_id) REFERENCES public.test_cases(id) ON DELETE CASCADE;


--
-- Name: test_data_rows test_data_rows_test_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_data_rows
    ADD CONSTRAINT test_data_rows_test_case_id_fkey FOREIGN KEY (test_case_id) REFERENCES public.test_cases(id) ON DELETE CASCADE;


--
-- Name: test_datasets test_datasets_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_datasets
    ADD CONSTRAINT test_datasets_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.test_cycles(id) ON DELETE CASCADE;


--
-- Name: test_evidence test_evidence_execution_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_evidence
    ADD CONSTRAINT test_evidence_execution_step_id_fkey FOREIGN KEY (execution_step_id) REFERENCES public.test_execution_steps(id) ON DELETE CASCADE;


--
-- Name: test_execution_defects test_execution_defects_execution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_execution_defects
    ADD CONSTRAINT test_execution_defects_execution_id_fkey FOREIGN KEY (execution_id) REFERENCES public.test_cycle_executions(id) ON DELETE CASCADE;


--
-- Name: test_execution_evidence test_execution_evidence_execution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_execution_evidence
    ADD CONSTRAINT test_execution_evidence_execution_id_fkey FOREIGN KEY (execution_id) REFERENCES public.test_cycle_executions(id) ON DELETE CASCADE;


--
-- Name: test_execution_evidence test_execution_evidence_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_execution_evidence
    ADD CONSTRAINT test_execution_evidence_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);


--
-- Name: test_execution_runs test_execution_runs_copied_from_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_execution_runs
    ADD CONSTRAINT test_execution_runs_copied_from_run_id_fkey FOREIGN KEY (copied_from_run_id) REFERENCES public.test_execution_runs(id);


--
-- Name: test_execution_runs test_execution_runs_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_execution_runs
    ADD CONSTRAINT test_execution_runs_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.test_cycles(id) ON DELETE CASCADE;


--
-- Name: test_execution_step_results test_execution_step_results_execution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_execution_step_results
    ADD CONSTRAINT test_execution_step_results_execution_id_fkey FOREIGN KEY (execution_id) REFERENCES public.test_cycle_executions(id) ON DELETE CASCADE;


--
-- Name: test_execution_steps test_execution_steps_test_execution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_execution_steps
    ADD CONSTRAINT test_execution_steps_test_execution_id_fkey FOREIGN KEY (test_execution_id) REFERENCES public.test_executions(id) ON DELETE CASCADE;


--
-- Name: test_execution_steps test_execution_steps_test_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_execution_steps
    ADD CONSTRAINT test_execution_steps_test_step_id_fkey FOREIGN KEY (test_step_id) REFERENCES public.test_steps(id) ON DELETE CASCADE;


--
-- Name: test_executions test_executions_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_executions
    ADD CONSTRAINT test_executions_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: test_executions test_executions_test_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_executions
    ADD CONSTRAINT test_executions_test_case_id_fkey FOREIGN KEY (test_case_id) REFERENCES public.test_cases(id) ON DELETE CASCADE;


--
-- Name: test_field_configurations test_field_configurations_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_field_configurations
    ADD CONSTRAINT test_field_configurations_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: test_folders test_folders_parent_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_folders
    ADD CONSTRAINT test_folders_parent_folder_id_fkey FOREIGN KEY (parent_folder_id) REFERENCES public.test_folders(id) ON DELETE CASCADE;


--
-- Name: test_folders test_folders_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_folders
    ADD CONSTRAINT test_folders_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: test_folders test_folders_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_folders
    ADD CONSTRAINT test_folders_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: test_run_statuses test_run_statuses_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_run_statuses
    ADD CONSTRAINT test_run_statuses_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: test_set_cases test_set_cases_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_set_cases
    ADD CONSTRAINT test_set_cases_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.test_cases(id) ON DELETE CASCADE;


--
-- Name: test_set_cases test_set_cases_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_set_cases
    ADD CONSTRAINT test_set_cases_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.test_sets(id) ON DELETE CASCADE;


--
-- Name: test_sets test_sets_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_sets
    ADD CONSTRAINT test_sets_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.test_folders(id) ON DELETE SET NULL;


--
-- Name: test_sets test_sets_parent_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_sets
    ADD CONSTRAINT test_sets_parent_version_id_fkey FOREIGN KEY (parent_version_id) REFERENCES public.test_sets(id);


--
-- Name: test_steps test_steps_library_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_steps
    ADD CONSTRAINT test_steps_library_step_id_fkey FOREIGN KEY (library_step_id) REFERENCES public.shared_test_steps(id) ON DELETE SET NULL;


--
-- Name: test_steps test_steps_test_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_steps
    ADD CONSTRAINT test_steps_test_case_id_fkey FOREIGN KEY (test_case_id) REFERENCES public.test_cases(id) ON DELETE CASCADE;


--
-- Name: theme_epic_links theme_epic_links_epic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_epic_links
    ADD CONSTRAINT theme_epic_links_epic_id_fkey FOREIGN KEY (epic_id) REFERENCES public.epics(id) ON DELETE CASCADE;


--
-- Name: theme_epic_links theme_epic_links_theme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.theme_epic_links
    ADD CONSTRAINT theme_epic_links_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.strategic_themes(id) ON DELETE CASCADE;


--
-- Name: user_epic_backlog_preferences user_epic_backlog_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_epic_backlog_preferences
    ADD CONSTRAINT user_epic_backlog_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_forecast_preferences user_forecast_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_forecast_preferences
    ADD CONSTRAINT user_forecast_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_notification_preferences user_notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_permission_overrides user_permission_overrides_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permission_overrides
    ADD CONSTRAINT user_permission_overrides_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_product_roles user_product_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_product_roles
    ADD CONSTRAINT user_product_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.product_roles(id) ON DELETE CASCADE;


--
-- Name: user_product_roles user_product_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_product_roles
    ADD CONSTRAINT user_product_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: value_stream_metrics value_stream_metrics_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.value_stream_metrics
    ADD CONSTRAINT value_stream_metrics_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: work_item_assignments work_item_assignments_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_assignments
    ADD CONSTRAINT work_item_assignments_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: work_item_assignments work_item_assignments_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_assignments
    ADD CONSTRAINT work_item_assignments_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: work_item_forecast_ranks work_item_forecast_ranks_pi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_forecast_ranks
    ADD CONSTRAINT work_item_forecast_ranks_pi_id_fkey FOREIGN KEY (pi_id) REFERENCES public.program_increments(id) ON DELETE CASCADE;


--
-- Name: work_item_key_history work_item_key_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_key_history
    ADD CONSTRAINT work_item_key_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);


--
-- Name: work_item_label_assignments work_item_label_assignments_label_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_label_assignments
    ADD CONSTRAINT work_item_label_assignments_label_id_fkey FOREIGN KEY (label_id) REFERENCES public.work_item_labels(id) ON DELETE CASCADE;


--
-- Name: work_item_links work_item_links_pi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_links
    ADD CONSTRAINT work_item_links_pi_id_fkey FOREIGN KEY (pi_id) REFERENCES public.program_increments(id);


--
-- Name: work_item_links work_item_links_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_links
    ADD CONSTRAINT work_item_links_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id);


--
-- Name: work_item_presence work_item_presence_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_presence
    ADD CONSTRAINT work_item_presence_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: work_item_time_logs work_item_time_logs_logged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_time_logs
    ADD CONSTRAINT work_item_time_logs_logged_by_fkey FOREIGN KEY (logged_by) REFERENCES auth.users(id);


--
-- Name: work_item_versions work_item_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_versions
    ADD CONSTRAINT work_item_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: work_item_versions work_item_versions_release_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_item_versions
    ADD CONSTRAINT work_item_versions_release_id_fkey FOREIGN KEY (release_id) REFERENCES public.releases(id) ON DELETE CASCADE;


--
-- Name: workflow_rules workflow_rules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_rules
    ADD CONSTRAINT workflow_rules_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: workflow_rules workflow_rules_program_increment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_rules
    ADD CONSTRAINT workflow_rules_program_increment_id_fkey FOREIGN KEY (program_increment_id) REFERENCES public.program_increments(id) ON DELETE SET NULL;


--
-- Name: ideas Admins and owners can delete ideas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and owners can delete ideas" ON public.ideas FOR DELETE TO authenticated USING (((auth.uid() = created_by_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: anchor_sprints Admins and program managers can manage anchor sprints; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and program managers can manage anchor sprints" ON public.anchor_sprints USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role)));


--
-- Name: capacity_plans Admins and program managers can manage capacity plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and program managers can manage capacity plans" ON public.capacity_plans USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role)));


--
-- Name: work_item_forecast_ranks Admins and program managers can manage forecast ranks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and program managers can manage forecast ranks" ON public.work_item_forecast_ranks TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role)));


--
-- Name: goals Admins and program managers can manage goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and program managers can manage goals" ON public.goals TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role)));


--
-- Name: milestones Admins and program managers can manage milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and program managers can manage milestones" ON public.milestones USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role)));


--
-- Name: objective_dependencies Admins and program managers can manage objective dependencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and program managers can manage objective dependencies" ON public.objective_dependencies USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role)));


--
-- Name: objective_epic_links Admins and program managers can manage objective epic links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and program managers can manage objective epic links" ON public.objective_epic_links USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role)));


--
-- Name: objective_impediments Admins and program managers can manage objective impediments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and program managers can manage objective impediments" ON public.objective_impediments USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role)));


--
-- Name: objective_risks Admins and program managers can manage objective risks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and program managers can manage objective risks" ON public.objective_risks USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role)));


--
-- Name: objective_work_items Admins and program managers can manage objective work item link; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and program managers can manage objective work item link" ON public.objective_work_items USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role)));


--
-- Name: predictability_metrics Admins and program managers can manage predictability metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and program managers can manage predictability metrics" ON public.predictability_metrics USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role(auth.uid(), 'program_manager'::public.app_role) AND public.user_in_program(auth.uid(), program_id))));


--
-- Name: roadmap_items Admins and program managers can manage roadmap items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and program managers can manage roadmap items" ON public.roadmap_items TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role)));


--
-- Name: strategic_goals Admins and program managers can manage strategic goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and program managers can manage strategic goals" ON public.strategic_goals USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role)));


--
-- Name: work_item_assignments Admins and program managers can manage work item assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and program managers can manage work item assignments" ON public.work_item_assignments USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role)));


--
-- Name: user_product_roles Admins can delete user_product_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete user_product_roles" ON public.user_product_roles FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: profiles Admins can insert profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: test_dashboard_templates Admins can insert templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert templates" ON public.test_dashboard_templates FOR INSERT WITH CHECK (true);


--
-- Name: user_product_roles Admins can insert user_product_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert user_product_roles" ON public.user_product_roles FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: pi_objectives Admins can manage PI objectives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage PI objectives" ON public.pi_objectives USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: program_increments Admins can manage PIs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage PIs" ON public.program_increments USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: active_package Admins can manage active_package; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage active_package" ON public.active_package USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: idea_group_members Admins can manage all group members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all group members" ON public.idea_group_members USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: team_metrics Admins can manage all team metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all team metrics" ON public.team_metrics USING (public.is_admin(auth.uid()));


--
-- Name: announcements Admins can manage announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage announcements" ON public.announcements USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: kanban_board_users Admins can manage board users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage board users" ON public.kanban_board_users USING (((board_id IN ( SELECT b.id
   FROM (public.kanban_boards b
     JOIN public.kanban_board_users u ON ((u.board_id = b.id)))
  WHERE ((u.user_id = auth.uid()) AND ((u.role)::text = 'Admin'::text)))) OR (board_id IN ( SELECT kanban_boards.id
   FROM public.kanban_boards
  WHERE (kanban_boards.created_by = auth.uid())))));


--
-- Name: business_lines Admins can manage business lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage business lines" ON public.business_lines USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: capacity_allocations Admins can manage capacity allocations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage capacity allocations" ON public.capacity_allocations USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: certifications Admins can manage certifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage certifications" ON public.certifications USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: dependencies Admins can manage dependencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage dependencies" ON public.dependencies USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: drawer_tab_configs Admins can manage drawer tab configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage drawer tab configs" ON public.drawer_tab_configs USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: epics Admins can manage epics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage epics" ON public.epics USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: estimation_conversions Admins can manage estimation conversions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage estimation conversions" ON public.estimation_conversions TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: external_entities Admins can manage external entities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage external entities" ON public.external_entities USING (public.is_admin(auth.uid()));


--
-- Name: ideation_external_users Admins can manage external users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage external users" ON public.ideation_external_users TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: feature_pi_objective_links Admins can manage feature PI objective links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage feature PI objective links" ON public.feature_pi_objective_links USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: feature_flags Admins can manage feature flags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage feature flags" ON public.feature_flags TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: features Admins can manage features; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage features" ON public.features USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: demand_field_configs Admins can manage field configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage field configs" ON public.demand_field_configs USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ideation_form_fields Admins can manage form fields; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage form fields" ON public.ideation_form_fields TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: idea_groups Admins can manage idea groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage idea groups" ON public.idea_groups TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (auth.uid() = ANY (admin_user_ids))));


--
-- Name: ideation_forms Admins can manage ideation forms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage ideation forms" ON public.ideation_forms TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: initiatives Admins can manage initiatives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage initiatives" ON public.initiatives USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: iterations Admins can manage iterations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage iterations" ON public.iterations USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: jira_auth_credentials Admins can manage jira_auth_credentials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage jira_auth_credentials" ON public.jira_auth_credentials USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: jira_board_mappings Admins can manage jira_board_mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage jira_board_mappings" ON public.jira_board_mappings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: jira_connections Admins can manage jira_connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage jira_connections" ON public.jira_connections USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: jira_field_mappings Admins can manage jira_field_mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage jira_field_mappings" ON public.jira_field_mappings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: jira_project_mappings Admins can manage jira_project_mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage jira_project_mappings" ON public.jira_project_mappings USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: jira_sync_logs Admins can manage jira_sync_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage jira_sync_logs" ON public.jira_sync_logs USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: jira_work_item_links Admins can manage jira_work_item_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage jira_work_item_links" ON public.jira_work_item_links USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: key_results Admins can manage key results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage key results" ON public.key_results USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: modules Admins can manage modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage modules" ON public.modules USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: objectives Admins can manage objectives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage objectives" ON public.objectives USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: org_modules Admins can manage org_modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage org_modules" ON public.org_modules USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: package_modules Admins can manage package_modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage package_modules" ON public.package_modules USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: module_packages Admins can manage packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage packages" ON public.module_packages USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: portfolio_estimation_settings Admins can manage portfolio estimation settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage portfolio estimation settings" ON public.portfolio_estimation_settings TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: portfolio_members Admins can manage portfolio members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage portfolio members" ON public.portfolio_members USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: portfolios Admins can manage portfolios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage portfolios" ON public.portfolios USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: program_members Admins can manage program members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage program members" ON public.program_members USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: program_spend_per_point Admins can manage program spend per point; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage program spend per point" ON public.program_spend_per_point TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::public.app_role, 'program_manager'::public.app_role]))))));


--
-- Name: programs Admins can manage programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage programs" ON public.programs USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: release_vehicles Admins can manage release vehicles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage release vehicles" ON public.release_vehicles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: releases Admins can manage releases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage releases" ON public.releases USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: report_definitions Admins can manage reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage reports" ON public.report_definitions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: scheduled_emails Admins can manage scheduled emails; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage scheduled emails" ON public.scheduled_emails USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: demand_section_configs Admins can manage section configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage section configs" ON public.demand_section_configs USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: shared_service_allocations Admins can manage shared service allocations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage shared service allocations" ON public.shared_service_allocations USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: shared_services Admins can manage shared services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage shared services" ON public.shared_services USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: skill_requirements Admins can manage skill_requirements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage skill_requirements" ON public.skill_requirements USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: skills Admins can manage skills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage skills" ON public.skills USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: strategy_snapshots Admins can manage snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage snapshots" ON public.strategy_snapshots USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_status_configs Admins can manage status configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage status configs" ON public.product_status_configs USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: stories Admins can manage stories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage stories" ON public.stories USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: subtasks Admins can manage subtasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage subtasks" ON public.subtasks USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: demand_tab_configs Admins can manage tab configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage tab configs" ON public.demand_tab_configs USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: team_members Admins can manage team members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage team members" ON public.team_members USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: team_point_systems Admins can manage team point systems; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage team point systems" ON public.team_point_systems TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::public.app_role, 'team_lead'::public.app_role]))))));


--
-- Name: team_spend_per_sprint Admins can manage team spend per sprint; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage team spend per sprint" ON public.team_spend_per_sprint TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::public.app_role, 'team_lead'::public.app_role]))))));


--
-- Name: team_member_skills Admins can manage team_member_skills; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage team_member_skills" ON public.team_member_skills USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: teams Admins can manage teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage teams" ON public.teams USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: strategic_themes Admins can manage themes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage themes" ON public.strategic_themes USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: value_stream_metrics Admins can manage value stream metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage value stream metrics" ON public.value_stream_metrics USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_view_configs Admins can manage view configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage view configs" ON public.product_view_configs USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: workflow_rules Admins can manage workflow rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage workflow rules" ON public.workflow_rules USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can update any profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: user_product_roles Admins can update user_product_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update user_product_roles" ON public.user_product_roles FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: user_role_history Admins can view all role history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all role history" ON public.user_role_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ideation_external_users Admins can view external users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view external users" ON public.ideation_external_users FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: process_flows Allow admins to manage process flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admins to manage process flows" ON public.process_flows USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role)));


--
-- Name: process_steps Allow admins to manage process steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admins to manage process steps" ON public.process_steps USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role)));


--
-- Name: theme_epic_links Allow all authenticated users to view theme_epic_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all authenticated users to view theme_epic_links" ON public.theme_epic_links FOR SELECT TO authenticated USING (true);


--
-- Name: snapshot_strategy_links Allow all operations on snapshot_strategy_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all operations on snapshot_strategy_links" ON public.snapshot_strategy_links USING (true) WITH CHECK (true);


--
-- Name: strategy_missions Allow all operations on strategy_missions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all operations on strategy_missions" ON public.strategy_missions USING (true) WITH CHECK (true);


--
-- Name: strategy_values Allow all operations on strategy_values; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all operations on strategy_values" ON public.strategy_values USING (true) WITH CHECK (true);


--
-- Name: strategy_visions Allow all operations on strategy_visions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all operations on strategy_visions" ON public.strategy_visions USING (true) WITH CHECK (true);


--
-- Name: activity_logs Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.activity_logs TO authenticated USING (true) WITH CHECK (true);


--
-- Name: board_configs Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.board_configs TO authenticated USING (true) WITH CHECK (true);


--
-- Name: capacity_allocations Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.capacity_allocations TO authenticated USING (true) WITH CHECK (true);


--
-- Name: custom_field_defs Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.custom_field_defs TO authenticated USING (true) WITH CHECK (true);


--
-- Name: custom_field_values Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.custom_field_values TO authenticated USING (true) WITH CHECK (true);


--
-- Name: dependencies Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.dependencies TO authenticated USING (true) WITH CHECK (true);


--
-- Name: epics Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.epics TO authenticated USING (true) WITH CHECK (true);


--
-- Name: features Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.features TO authenticated USING (true) WITH CHECK (true);


--
-- Name: hierarchy_configs Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.hierarchy_configs TO authenticated USING (true) WITH CHECK (true);


--
-- Name: initiatives Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.initiatives TO authenticated USING (true) WITH CHECK (true);


--
-- Name: integration_connectors Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.integration_connectors TO authenticated USING (true) WITH CHECK (true);


--
-- Name: iterations Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.iterations TO authenticated USING (true) WITH CHECK (true);


--
-- Name: key_results Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.key_results TO authenticated USING (true) WITH CHECK (true);


--
-- Name: objective_initiative_links Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.objective_initiative_links TO authenticated USING (true) WITH CHECK (true);


--
-- Name: objective_levels Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.objective_levels TO authenticated USING (true) WITH CHECK (true);


--
-- Name: objective_theme_links Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.objective_theme_links TO authenticated USING (true) WITH CHECK (true);


--
-- Name: objectives Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.objectives TO authenticated USING (true) WITH CHECK (true);


--
-- Name: permission_grants Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.permission_grants TO authenticated USING (true) WITH CHECK (true);


--
-- Name: permission_roles Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.permission_roles TO authenticated USING (true) WITH CHECK (true);


--
-- Name: portfolios Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.portfolios TO authenticated USING (true) WITH CHECK (true);


--
-- Name: program_increments Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.program_increments TO authenticated USING (true) WITH CHECK (true);


--
-- Name: programs Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.programs TO authenticated USING (true) WITH CHECK (true);


--
-- Name: release_feature_links Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.release_feature_links TO authenticated USING (true) WITH CHECK (true);


--
-- Name: release_story_links Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.release_story_links TO authenticated USING (true) WITH CHECK (true);


--
-- Name: release_vehicles Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.release_vehicles TO authenticated USING (true) WITH CHECK (true);


--
-- Name: releases Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.releases TO authenticated USING (true) WITH CHECK (true);


--
-- Name: stories Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.stories TO authenticated USING (true) WITH CHECK (true);


--
-- Name: strategic_themes Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.strategic_themes TO authenticated USING (true) WITH CHECK (true);


--
-- Name: subtasks Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.subtasks TO authenticated USING (true) WITH CHECK (true);


--
-- Name: teams Allow authenticated users full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users full access" ON public.teams TO authenticated USING (true) WITH CHECK (true);


--
-- Name: test_cycle_case_assignments Allow authenticated users to manage assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to manage assignments" ON public.test_cycle_case_assignments USING ((auth.uid() IS NOT NULL));


--
-- Name: test_cycle_dependencies Allow authenticated users to manage dependencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to manage dependencies" ON public.test_cycle_dependencies USING ((auth.uid() IS NOT NULL));


--
-- Name: test_cycle_templates Allow authenticated users to manage templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to manage templates" ON public.test_cycle_templates USING ((auth.uid() IS NOT NULL));


--
-- Name: theme_epic_links Allow authenticated users to manage theme_epic_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to manage theme_epic_links" ON public.theme_epic_links TO authenticated USING (true) WITH CHECK (true);


--
-- Name: anchor_sprints Allow authenticated users to view anchor sprints; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view anchor sprints" ON public.anchor_sprints FOR SELECT USING (true);


--
-- Name: test_cycle_case_assignments Allow authenticated users to view assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view assignments" ON public.test_cycle_case_assignments FOR SELECT USING (true);


--
-- Name: key_result_checkins Allow authenticated users to view checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view checkins" ON public.key_result_checkins FOR SELECT USING (true);


--
-- Name: test_cycle_dependencies Allow authenticated users to view dependencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view dependencies" ON public.test_cycle_dependencies FOR SELECT USING (true);


--
-- Name: epic_program_increments Allow authenticated users to view epic PI assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view epic PI assignments" ON public.epic_program_increments FOR SELECT USING (true);


--
-- Name: goals Allow authenticated users to view goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view goals" ON public.goals FOR SELECT TO authenticated USING (true);


--
-- Name: key_results_v2 Allow authenticated users to view key results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view key results" ON public.key_results_v2 FOR SELECT USING (true);


--
-- Name: milestones Allow authenticated users to view milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view milestones" ON public.milestones FOR SELECT USING (true);


--
-- Name: objective_dependencies Allow authenticated users to view objective dependencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view objective dependencies" ON public.objective_dependencies FOR SELECT USING (true);


--
-- Name: objective_epic_links Allow authenticated users to view objective epic links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view objective epic links" ON public.objective_epic_links FOR SELECT USING (true);


--
-- Name: objective_impediments Allow authenticated users to view objective impediments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view objective impediments" ON public.objective_impediments FOR SELECT USING (true);


--
-- Name: objective_risks Allow authenticated users to view objective risks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view objective risks" ON public.objective_risks FOR SELECT USING (true);


--
-- Name: objective_work_items Allow authenticated users to view objective work item links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view objective work item links" ON public.objective_work_items FOR SELECT USING (true);


--
-- Name: process_flows Allow authenticated users to view process flows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view process flows" ON public.process_flows FOR SELECT USING (true);


--
-- Name: process_steps Allow authenticated users to view process steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view process steps" ON public.process_steps FOR SELECT USING (true);


--
-- Name: report_definitions Allow authenticated users to view reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view reports" ON public.report_definitions FOR SELECT USING (true);


--
-- Name: roadmap_items Allow authenticated users to view roadmap items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view roadmap items" ON public.roadmap_items FOR SELECT TO authenticated USING (true);


--
-- Name: strategy_snapshots Allow authenticated users to view snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view snapshots" ON public.strategy_snapshots FOR SELECT USING (true);


--
-- Name: strategic_goals Allow authenticated users to view strategic goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view strategic goals" ON public.strategic_goals FOR SELECT USING (true);


--
-- Name: test_cycle_templates Allow authenticated users to view templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to view templates" ON public.test_cycle_templates FOR SELECT USING (true);


--
-- Name: business_requests Allow delete for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow delete for authenticated users" ON public.business_requests FOR DELETE USING (true);


--
-- Name: epic_programs Allow delete on epic_programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow delete on epic_programs" ON public.epic_programs FOR DELETE USING (true);


--
-- Name: business_requests Allow insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for authenticated users" ON public.business_requests FOR INSERT WITH CHECK (true);


--
-- Name: epic_programs Allow insert to epic_programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert to epic_programs" ON public.epic_programs FOR INSERT WITH CHECK (true);


--
-- Name: epic_program_increments Allow program managers to manage epic PI assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow program managers to manage epic PI assignments" ON public.epic_program_increments USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role)));


--
-- Name: business_request_audit_logs Allow public insert for system audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert for system audit logs" ON public.business_request_audit_logs FOR INSERT WITH CHECK ((actor_name = 'System'::text));


--
-- Name: business_request_discussions Allow public insert for system comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert for system comments" ON public.business_request_discussions FOR INSERT WITH CHECK ((user_id = '00000000-0000-0000-0000-000000000000'::uuid));


--
-- Name: business_requests Allow read access to all authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read access to all authenticated users" ON public.business_requests FOR SELECT USING (true);


--
-- Name: epic_programs Allow read access to epic_programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read access to epic_programs" ON public.epic_programs FOR SELECT USING (true);


--
-- Name: business_request_audit_logs Allow read system audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read system audit logs" ON public.business_request_audit_logs FOR SELECT USING ((actor_name = 'System'::text));


--
-- Name: business_request_discussions Allow read system comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read system comments" ON public.business_request_discussions FOR SELECT USING ((user_id = '00000000-0000-0000-0000-000000000000'::uuid));


--
-- Name: business_requests Allow update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for authenticated users" ON public.business_requests FOR UPDATE USING (true);


--
-- Name: key_result_checkins Allow users to create checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to create checkins" ON public.key_result_checkins FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: key_result_checkins Allow users to delete checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to delete checkins" ON public.key_result_checkins FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: objective_capability_links Allow users to manage capability links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to manage capability links" ON public.objective_capability_links USING ((auth.uid() IS NOT NULL));


--
-- Name: objective_dependencies Allow users to manage dependency links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to manage dependency links" ON public.objective_dependencies USING ((auth.uid() IS NOT NULL));


--
-- Name: objective_feature_links Allow users to manage feature links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to manage feature links" ON public.objective_feature_links USING ((auth.uid() IS NOT NULL));


--
-- Name: objective_impediments Allow users to manage impediment links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to manage impediment links" ON public.objective_impediments USING ((auth.uid() IS NOT NULL));


--
-- Name: objective_linked_items Allow users to manage linked items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to manage linked items" ON public.objective_linked_items USING ((auth.uid() IS NOT NULL));


--
-- Name: objective_risks Allow users to manage risk links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to manage risk links" ON public.objective_risks USING ((auth.uid() IS NOT NULL));


--
-- Name: key_result_checkins Allow users to view checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow users to view checkins" ON public.key_result_checkins FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: active_package Anyone can view active_package; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active_package" ON public.active_package FOR SELECT USING (true);


--
-- Name: business_lines Anyone can view business lines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view business lines" ON public.business_lines FOR SELECT USING (true);


--
-- Name: drawer_tab_configs Anyone can view drawer tab configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view drawer tab configs" ON public.drawer_tab_configs FOR SELECT USING (true);


--
-- Name: feature_flags Anyone can view feature flags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view feature flags" ON public.feature_flags FOR SELECT TO authenticated USING (true);


--
-- Name: demand_field_configs Anyone can view field configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view field configs" ON public.demand_field_configs FOR SELECT USING (true);


--
-- Name: epic_label_assignments Anyone can view label assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view label assignments" ON public.epic_label_assignments FOR SELECT USING (true);


--
-- Name: epic_labels Anyone can view labels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view labels" ON public.epic_labels FOR SELECT USING (true);


--
-- Name: modules Anyone can view modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view modules" ON public.modules FOR SELECT USING (true);


--
-- Name: org_modules Anyone can view org_modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view org_modules" ON public.org_modules FOR SELECT USING (true);


--
-- Name: package_modules Anyone can view package_modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view package_modules" ON public.package_modules FOR SELECT USING (true);


--
-- Name: module_packages Anyone can view packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view packages" ON public.module_packages FOR SELECT USING (true);


--
-- Name: demand_section_configs Anyone can view section configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view section configs" ON public.demand_section_configs FOR SELECT USING (true);


--
-- Name: product_status_configs Anyone can view status configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view status configs" ON public.product_status_configs FOR SELECT USING (true);


--
-- Name: demand_tab_configs Anyone can view tab configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view tab configs" ON public.demand_tab_configs FOR SELECT USING (true);


--
-- Name: test_dashboard_templates Anyone can view templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view templates" ON public.test_dashboard_templates FOR SELECT USING (true);


--
-- Name: product_view_configs Anyone can view view configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view view configs" ON public.product_view_configs FOR SELECT USING (true);


--
-- Name: attachments Attachments are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Attachments are viewable by everyone" ON public.attachments FOR SELECT USING (true);


--
-- Name: ideation_attachments Authenticated users can add attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can add attachments" ON public.ideation_attachments FOR INSERT TO authenticated WITH CHECK ((auth.uid() = uploaded_by_id));


--
-- Name: epic_label_assignments Authenticated users can assign labels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can assign labels" ON public.epic_label_assignments FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: kanban_boards Authenticated users can create boards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create boards" ON public.kanban_boards FOR INSERT WITH CHECK ((auth.uid() = created_by));


--
-- Name: story_comments Authenticated users can create comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create comments" ON public.story_comments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ideas Authenticated users can create ideas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create ideas" ON public.ideas FOR INSERT TO authenticated WITH CHECK ((auth.uid() = created_by_id));


--
-- Name: epic_labels Authenticated users can create labels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create labels" ON public.epic_labels FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: work_item_labels Authenticated users can create labels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create labels" ON public.work_item_labels FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: comment_mentions Authenticated users can create mentions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create mentions" ON public.comment_mentions FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: snapshot_configurations Authenticated users can create snapshot configurations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create snapshot configurations" ON public.snapshot_configurations FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: work_item_time_logs Authenticated users can create time logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create time logs" ON public.work_item_time_logs FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: test_case_work_items Authenticated users can create work item test links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create work item test links" ON public.test_case_work_items FOR INSERT WITH CHECK ((auth.uid() = created_by));


--
-- Name: kr_work_contributions Authenticated users can delete kr_work_contributions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete kr_work_contributions" ON public.kr_work_contributions FOR DELETE TO authenticated USING (true);


--
-- Name: work_item_labels Authenticated users can delete labels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete labels" ON public.work_item_labels FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: snapshot_configurations Authenticated users can delete snapshot configurations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete snapshot configurations" ON public.snapshot_configurations FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: feature_scheduling_history Authenticated users can insert feature scheduling history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert feature scheduling history" ON public.feature_scheduling_history FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: work_item_key_history Authenticated users can insert key history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert key history" ON public.work_item_key_history FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: kr_work_contributions Authenticated users can insert kr_work_contributions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert kr_work_contributions" ON public.kr_work_contributions FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: work_item_label_assignments Authenticated users can manage label assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage label assignments" ON public.work_item_label_assignments USING ((auth.uid() IS NOT NULL));


--
-- Name: program_team_rankings Authenticated users can manage program team rankings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage program team rankings" ON public.program_team_rankings USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: kb_document_restrictions Authenticated users can manage restrictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage restrictions" ON public.kb_document_restrictions USING ((auth.uid() IS NOT NULL));


--
-- Name: test_cases Authenticated users can manage test cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage test cases" ON public.test_cases USING ((auth.uid() IS NOT NULL)) WITH CHECK (((auth.uid() = created_by) OR (auth.uid() IS NOT NULL)));


--
-- Name: test_execution_steps Authenticated users can manage test execution steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage test execution steps" ON public.test_execution_steps USING ((auth.uid() IS NOT NULL));


--
-- Name: test_executions Authenticated users can manage test executions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage test executions" ON public.test_executions USING ((auth.uid() IS NOT NULL)) WITH CHECK (((auth.uid() = executed_by) OR (auth.uid() IS NOT NULL)));


--
-- Name: test_folders Authenticated users can manage test folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage test folders" ON public.test_folders USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() = created_by));


--
-- Name: test_steps Authenticated users can manage test steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage test steps" ON public.test_steps USING ((auth.uid() IS NOT NULL));


--
-- Name: work_item_versions Authenticated users can manage work item versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage work item versions" ON public.work_item_versions USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: portfolios Authenticated users can read portfolios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read portfolios" ON public.portfolios FOR SELECT TO authenticated USING (true);


--
-- Name: programs Authenticated users can read programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read programs" ON public.programs FOR SELECT TO authenticated USING (true);


--
-- Name: epic_label_assignments Authenticated users can remove label assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can remove label assignments" ON public.epic_label_assignments FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: kr_work_contributions Authenticated users can update kr_work_contributions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update kr_work_contributions" ON public.kr_work_contributions FOR UPDATE TO authenticated USING (true);


--
-- Name: work_item_labels Authenticated users can update labels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update labels" ON public.work_item_labels FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: snapshot_configurations Authenticated users can update snapshot configurations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update snapshot configurations" ON public.snapshot_configurations FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: ideation_attachments Authenticated users can view attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view attachments" ON public.ideation_attachments FOR SELECT TO authenticated USING (true);


--
-- Name: ideation_comments Authenticated users can view comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view comments" ON public.ideation_comments FOR SELECT TO authenticated USING (true);


--
-- Name: ideation_form_fields Authenticated users can view form fields; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view form fields" ON public.ideation_form_fields FOR SELECT TO authenticated USING (true);


--
-- Name: idea_group_members Authenticated users can view group members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view group members" ON public.idea_group_members FOR SELECT TO authenticated USING (true);


--
-- Name: idea_groups Authenticated users can view idea groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view idea groups" ON public.idea_groups FOR SELECT TO authenticated USING (true);


--
-- Name: ideas Authenticated users can view ideas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view ideas" ON public.ideas FOR SELECT TO authenticated USING (true);


--
-- Name: ideation_forms Authenticated users can view ideation forms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view ideation forms" ON public.ideation_forms FOR SELECT TO authenticated USING (true);


--
-- Name: kr_work_contributions Authenticated users can view kr_work_contributions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view kr_work_contributions" ON public.kr_work_contributions FOR SELECT TO authenticated USING (true);


--
-- Name: work_item_label_assignments Authenticated users can view label assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view label assignments" ON public.work_item_label_assignments FOR SELECT USING (true);


--
-- Name: work_item_labels Authenticated users can view labels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view labels" ON public.work_item_labels FOR SELECT USING (true);


--
-- Name: test_cases Authenticated users can view test cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view test cases" ON public.test_cases FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: test_execution_steps Authenticated users can view test execution steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view test execution steps" ON public.test_execution_steps FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: test_executions Authenticated users can view test executions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view test executions" ON public.test_executions FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: test_folders Authenticated users can view test folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view test folders" ON public.test_folders FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: test_steps Authenticated users can view test steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view test steps" ON public.test_steps FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: ideation_votes Authenticated users can view votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view votes" ON public.ideation_votes FOR SELECT TO authenticated USING (true);


--
-- Name: kanban_boards Board creators or admins can delete boards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Board creators or admins can delete boards" ON public.kanban_boards FOR DELETE USING (((created_by = auth.uid()) OR (auth.uid() IN ( SELECT kanban_board_users.user_id
   FROM public.kanban_board_users
  WHERE ((kanban_board_users.board_id = kanban_boards.id) AND ((kanban_board_users.role)::text = 'Admin'::text))))));


--
-- Name: comments Comments are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);


--
-- Name: certifications Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for authenticated users" ON public.certifications FOR SELECT TO authenticated USING (true);


--
-- Name: skill_requirements Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for authenticated users" ON public.skill_requirements FOR SELECT TO authenticated USING (true);


--
-- Name: skills Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for authenticated users" ON public.skills FOR SELECT TO authenticated USING (true);


--
-- Name: team_member_skills Enable read access for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Enable read access for authenticated users" ON public.team_member_skills FOR SELECT TO authenticated USING (true);


--
-- Name: idea_group_members Group admins can manage members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Group admins can manage members" ON public.idea_group_members TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.idea_group_members igm
  WHERE ((igm.group_id = idea_group_members.group_id) AND (igm.user_id = auth.uid()) AND (igm.role = 'admin'::text)))));


--
-- Name: pi_objectives Program managers can manage PI objectives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage PI objectives" ON public.pi_objectives USING ((public.has_role(auth.uid(), 'program_manager'::public.app_role) AND public.user_in_program(auth.uid(), program_id)));


--
-- Name: program_increments Program managers can manage PIs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage PIs" ON public.program_increments USING (public.has_role(auth.uid(), 'program_manager'::public.app_role));


--
-- Name: capacity_allocations Program managers can manage capacity allocations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage capacity allocations" ON public.capacity_allocations USING (public.has_role(auth.uid(), 'program_manager'::public.app_role));


--
-- Name: dependencies Program managers can manage dependencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage dependencies" ON public.dependencies USING (public.has_role(auth.uid(), 'program_manager'::public.app_role));


--
-- Name: epics Program managers can manage epics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage epics" ON public.epics USING (public.has_role(auth.uid(), 'program_manager'::public.app_role));


--
-- Name: feature_pi_objective_links Program managers can manage feature PI objective links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage feature PI objective links" ON public.feature_pi_objective_links USING ((public.has_role(auth.uid(), 'program_manager'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.features f
  WHERE ((f.id = feature_pi_objective_links.feature_id) AND public.user_in_program(auth.uid(), f.program_id))))));


--
-- Name: features Program managers can manage features in their program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage features in their program" ON public.features USING ((public.has_role(auth.uid(), 'program_manager'::public.app_role) AND public.user_in_program(auth.uid(), program_id)));


--
-- Name: initiatives Program managers can manage initiatives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage initiatives" ON public.initiatives USING (public.has_role(auth.uid(), 'program_manager'::public.app_role));


--
-- Name: iterations Program managers can manage iterations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage iterations" ON public.iterations USING (public.has_role(auth.uid(), 'program_manager'::public.app_role));


--
-- Name: key_results Program managers can manage key results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage key results" ON public.key_results USING (public.has_role(auth.uid(), 'program_manager'::public.app_role));


--
-- Name: objectives Program managers can manage objectives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage objectives" ON public.objectives USING (public.has_role(auth.uid(), 'program_manager'::public.app_role));


--
-- Name: programs Program managers can manage programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage programs" ON public.programs USING (public.has_role(auth.uid(), 'program_manager'::public.app_role));


--
-- Name: release_vehicles Program managers can manage release vehicles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage release vehicles" ON public.release_vehicles USING (public.has_role(auth.uid(), 'program_manager'::public.app_role));


--
-- Name: releases Program managers can manage releases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage releases" ON public.releases USING (public.has_role(auth.uid(), 'program_manager'::public.app_role));


--
-- Name: shared_service_allocations Program managers can manage shared service allocations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage shared service allocations" ON public.shared_service_allocations USING ((public.has_role(auth.uid(), 'program_manager'::public.app_role) AND public.user_in_team(auth.uid(), team_id)));


--
-- Name: shared_services Program managers can manage shared services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage shared services" ON public.shared_services USING ((public.has_role(auth.uid(), 'program_manager'::public.app_role) AND ((portfolio_id IS NULL) OR public.user_in_portfolio(auth.uid(), portfolio_id))));


--
-- Name: stories Program managers can manage stories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage stories" ON public.stories USING (public.has_role(auth.uid(), 'program_manager'::public.app_role));


--
-- Name: subtasks Program managers can manage subtasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage subtasks" ON public.subtasks USING (public.has_role(auth.uid(), 'program_manager'::public.app_role));


--
-- Name: teams Program managers can manage teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage teams" ON public.teams USING (public.has_role(auth.uid(), 'program_manager'::public.app_role));


--
-- Name: strategic_themes Program managers can manage themes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Program managers can manage themes" ON public.strategic_themes USING (public.has_role(auth.uid(), 'program_manager'::public.app_role));


--
-- Name: business_request_audit_logs System can create audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create audit logs" ON public.business_request_audit_logs FOR INSERT WITH CHECK (true);


--
-- Name: discussion_mentions System can create mentions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create mentions" ON public.discussion_mentions FOR INSERT WITH CHECK (true);


--
-- Name: notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: capacity_allocations Team leads can manage capacity allocations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leads can manage capacity allocations" ON public.capacity_allocations USING (public.has_role(auth.uid(), 'team_lead'::public.app_role));


--
-- Name: dependencies Team leads can manage dependencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leads can manage dependencies" ON public.dependencies USING (public.has_role(auth.uid(), 'team_lead'::public.app_role));


--
-- Name: features Team leads can manage features; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leads can manage features" ON public.features USING (public.has_role(auth.uid(), 'team_lead'::public.app_role));


--
-- Name: initiatives Team leads can manage initiatives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leads can manage initiatives" ON public.initiatives USING (public.has_role(auth.uid(), 'team_lead'::public.app_role));


--
-- Name: iterations Team leads can manage iterations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leads can manage iterations" ON public.iterations USING (public.has_role(auth.uid(), 'team_lead'::public.app_role));


--
-- Name: releases Team leads can manage releases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leads can manage releases" ON public.releases USING (public.has_role(auth.uid(), 'team_lead'::public.app_role));


--
-- Name: shared_service_allocations Team leads can manage shared service allocations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leads can manage shared service allocations" ON public.shared_service_allocations USING ((public.has_role(auth.uid(), 'team_lead'::public.app_role) AND public.user_in_team(auth.uid(), team_id)));


--
-- Name: stories Team leads can manage stories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leads can manage stories" ON public.stories USING (public.has_role(auth.uid(), 'team_lead'::public.app_role));


--
-- Name: subtasks Team leads can manage subtasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leads can manage subtasks" ON public.subtasks USING (public.has_role(auth.uid(), 'team_lead'::public.app_role));


--
-- Name: pi_objectives Team leads can view PI objectives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leads can view PI objectives" ON public.pi_objectives FOR SELECT USING ((public.has_role(auth.uid(), 'team_lead'::public.app_role) OR public.user_in_program(auth.uid(), program_id)));


--
-- Name: program_increments Team leads can view PIs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leads can view PIs" ON public.program_increments FOR SELECT USING (public.has_role(auth.uid(), 'team_lead'::public.app_role));


--
-- Name: epics Team leads can view epics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leads can view epics" ON public.epics FOR SELECT USING (public.has_role(auth.uid(), 'team_lead'::public.app_role));


--
-- Name: key_results Team leads can view key results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leads can view key results" ON public.key_results FOR SELECT USING (public.has_role(auth.uid(), 'team_lead'::public.app_role));


--
-- Name: objectives Team leads can view objectives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leads can view objectives" ON public.objectives FOR SELECT USING (public.has_role(auth.uid(), 'team_lead'::public.app_role));


--
-- Name: release_vehicles Team leads can view release vehicles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leads can view release vehicles" ON public.release_vehicles FOR SELECT USING (public.has_role(auth.uid(), 'team_lead'::public.app_role));


--
-- Name: teams Team leads can view teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leads can view teams" ON public.teams FOR SELECT USING (public.has_role(auth.uid(), 'team_lead'::public.app_role));


--
-- Name: strategic_themes Team leads can view themes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team leads can view themes" ON public.strategic_themes FOR SELECT USING (public.has_role(auth.uid(), 'team_lead'::public.app_role));


--
-- Name: team_metrics Team members can view their team metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view their team metrics" ON public.team_metrics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.team_members
  WHERE ((team_members.team_id = team_metrics.team_id) AND (team_members.user_id = auth.uid())))));


--
-- Name: test_set_cases Users can add cases to sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add cases to sets" ON public.test_set_cases FOR INSERT WITH CHECK (true);


--
-- Name: kb_document_favorites Users can add favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add favorites" ON public.kb_document_favorites FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: epic_acceptance_criteria Users can create acceptance criteria; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create acceptance criteria" ON public.epic_acceptance_criteria FOR INSERT WITH CHECK (true);


--
-- Name: test_activity_log Users can create activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create activity logs" ON public.test_activity_log FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: test_case_bulk_operations Users can create bulk operations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create bulk operations" ON public.test_case_bulk_operations FOR INSERT WITH CHECK ((executed_by = auth.uid()));


--
-- Name: business_request_links Users can create business request links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create business request links" ON public.business_request_links FOR INSERT WITH CHECK (true);


--
-- Name: key_result_checkins Users can create checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create checkins" ON public.key_result_checkins FOR INSERT WITH CHECK ((created_by_user_id = auth.uid()));


--
-- Name: comments Users can create comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND public.check_permission(auth.uid(), entity_type, 'edit'::public.permission_action)));


--
-- Name: ideation_comments Users can create comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create comments" ON public.ideation_comments FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: test_case_datasets Users can create datasets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create datasets" ON public.test_case_datasets FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: test_execution_defects Users can create defects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create defects" ON public.test_execution_defects FOR INSERT WITH CHECK (true);


--
-- Name: dependencies Users can create dependencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create dependencies" ON public.dependencies FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: dependency_negotiations Users can create dependency negotiations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create dependency negotiations" ON public.dependency_negotiations FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: business_request_discussions Users can create discussions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create discussions" ON public.business_request_discussions FOR INSERT WITH CHECK (true);


--
-- Name: discussions Users can create discussions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create discussions" ON public.discussions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: test_execution_runs Users can create execution runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create execution runs" ON public.test_execution_runs FOR INSERT WITH CHECK (true);


--
-- Name: test_cycle_executions Users can create executions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create executions" ON public.test_cycle_executions FOR INSERT WITH CHECK (true);


--
-- Name: forecast_entries Users can create forecast entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create forecast entries" ON public.forecast_entries FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role) OR public.has_role(auth.uid(), 'team_lead'::public.app_role)));


--
-- Name: kb_audit_log Users can create kb audit log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create kb audit log" ON public.kb_audit_log FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: kb_document_comments Users can create kb comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create kb comments" ON public.kb_document_comments FOR INSERT TO authenticated WITH CHECK ((author_id = auth.uid()));


--
-- Name: kb_doc_spaces Users can create kb doc spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create kb doc spaces" ON public.kb_doc_spaces FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: kb_documents Users can create kb documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create kb documents" ON public.kb_documents FOR INSERT TO authenticated WITH CHECK ((created_by = auth.uid()));


--
-- Name: kb_projects Users can create kb projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create kb projects" ON public.kb_projects FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: milestones Users can create milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create milestones" ON public.milestones FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.epics e
  WHERE ((e.id = milestones.epic_id) AND (auth.uid() IS NOT NULL)))));


--
-- Name: objectives Users can create objectives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create objectives" ON public.objectives FOR INSERT WITH CHECK (true);


--
-- Name: test_case_parameters Users can create parameters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create parameters" ON public.test_case_parameters FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: test_reports Users can create reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reports" ON public.test_reports FOR INSERT WITH CHECK (true);


--
-- Name: risks Users can create risks in their programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create risks in their programs" ON public.risks FOR INSERT WITH CHECK (((program_id IN ( SELECT program_members.program_id
   FROM public.program_members
  WHERE (program_members.user_id = auth.uid()))) AND (created_by = auth.uid())));


--
-- Name: shared_test_steps Users can create shared test steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create shared test steps" ON public.shared_test_steps FOR INSERT WITH CHECK ((created_by = auth.uid()));


--
-- Name: story_links Users can create story links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create story links" ON public.story_links FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: test_activity_log Users can create test activity log in their program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create test activity log in their program" ON public.test_activity_log FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (program_id IS NOT NULL)));


--
-- Name: test_case_steps Users can create test case steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create test case steps" ON public.test_case_steps FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: test_cases Users can create test cases in their program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create test cases in their program" ON public.test_cases FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (program_id IS NOT NULL)));


--
-- Name: test_cycles Users can create test cycles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create test cycles" ON public.test_cycles FOR INSERT WITH CHECK (true);


--
-- Name: test_datasets Users can create test datasets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create test datasets" ON public.test_datasets FOR INSERT WITH CHECK (true);


--
-- Name: test_executions Users can create test executions in their program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create test executions in their program" ON public.test_executions FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (program_id IS NOT NULL)));


--
-- Name: test_folders Users can create test folders in their program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create test folders in their program" ON public.test_folders FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (program_id IS NOT NULL)));


--
-- Name: test_sets Users can create test sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create test sets" ON public.test_sets FOR INSERT WITH CHECK (true);


--
-- Name: epic_custom_columns Users can create their own custom columns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own custom columns" ON public.epic_custom_columns FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: saved_filters Users can create their own filters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own filters" ON public.saved_filters FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: test_case_versions Users can create versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create versions" ON public.test_case_versions FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: test_case_work_item_links Users can create work item links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create work item links" ON public.test_case_work_item_links FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.test_cases tc
  WHERE (tc.id = test_case_work_item_links.case_id))));


--
-- Name: work_item_rankings Users can create work item rankings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create work item rankings" ON public.work_item_rankings FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role) OR public.has_role(auth.uid(), 'team_lead'::public.app_role))));


--
-- Name: epic_acceptance_criteria Users can delete acceptance criteria; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete acceptance criteria" ON public.epic_acceptance_criteria FOR DELETE USING (true);


--
-- Name: business_request_links Users can delete business request links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete business request links" ON public.business_request_links FOR DELETE USING (true);


--
-- Name: test_dashboard_gadgets Users can delete dashboard gadgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete dashboard gadgets" ON public.test_dashboard_gadgets FOR DELETE USING (true);


--
-- Name: test_case_datasets Users can delete datasets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete datasets" ON public.test_case_datasets FOR DELETE TO authenticated USING (true);


--
-- Name: test_execution_defects Users can delete defects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete defects" ON public.test_execution_defects FOR DELETE USING (true);


--
-- Name: test_execution_runs Users can delete execution runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete execution runs" ON public.test_execution_runs FOR DELETE USING (true);


--
-- Name: test_cycle_executions Users can delete executions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete executions" ON public.test_cycle_executions FOR DELETE USING (true);


--
-- Name: milestones Users can delete milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete milestones" ON public.milestones FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.epics e
  WHERE ((e.id = milestones.epic_id) AND (auth.uid() IS NOT NULL)))));


--
-- Name: objectives Users can delete objectives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete objectives" ON public.objectives FOR DELETE USING (true);


--
-- Name: test_dashboards Users can delete own dashboards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own dashboards" ON public.test_dashboards FOR DELETE USING (true);


--
-- Name: business_request_discussions Users can delete own discussions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own discussions" ON public.business_request_discussions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: kb_document_comments Users can delete own kb comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own kb comments" ON public.kb_document_comments FOR DELETE TO authenticated USING ((author_id = auth.uid()));


--
-- Name: kb_documents Users can delete own kb documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own kb documents" ON public.kb_documents FOR DELETE TO authenticated USING ((created_by = auth.uid()));


--
-- Name: work_item_time_logs Users can delete own time logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own time logs" ON public.work_item_time_logs FOR DELETE USING ((logged_by = auth.uid()));


--
-- Name: test_case_parameters Users can delete parameters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete parameters" ON public.test_case_parameters FOR DELETE TO authenticated USING (true);


--
-- Name: risks Users can delete risks in their programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete risks in their programs" ON public.risks FOR DELETE USING ((program_id IN ( SELECT program_members.program_id
   FROM public.program_members
  WHERE (program_members.user_id = auth.uid()))));


--
-- Name: risks Users can delete risks linked to business requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete risks linked to business requests" ON public.risks FOR DELETE USING (true);


--
-- Name: story_links Users can delete story links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete story links" ON public.story_links FOR DELETE USING (((auth.uid() = created_by) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role)));


--
-- Name: test_case_shared_steps Users can delete test case shared steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete test case shared steps" ON public.test_case_shared_steps FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: test_case_steps Users can delete test case steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete test case steps" ON public.test_case_steps FOR DELETE TO authenticated USING (true);


--
-- Name: test_cases Users can delete test cases in their program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete test cases in their program" ON public.test_cases FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: test_cycles Users can delete test cycles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete test cycles" ON public.test_cycles FOR DELETE USING ((NOT is_adhoc));


--
-- Name: test_data_rows Users can delete test data rows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete test data rows" ON public.test_data_rows FOR DELETE USING (true);


--
-- Name: test_datasets Users can delete test datasets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete test datasets" ON public.test_datasets FOR DELETE USING (true);


--
-- Name: test_executions Users can delete test executions in their program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete test executions in their program" ON public.test_executions FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: test_folders Users can delete test folders in their program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete test folders in their program" ON public.test_folders FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: test_data_parameters Users can delete test parameters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete test parameters" ON public.test_data_parameters FOR DELETE USING (true);


--
-- Name: test_sets Users can delete test sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete test sets" ON public.test_sets FOR DELETE USING (true);


--
-- Name: attachments Users can delete their own attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own attachments" ON public.attachments FOR DELETE TO authenticated USING (((auth.uid() = uploaded_by) AND public.check_permission(auth.uid(), entity_type, 'delete'::public.permission_action)));


--
-- Name: ideation_attachments Users can delete their own attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own attachments" ON public.ideation_attachments FOR DELETE TO authenticated USING (((auth.uid() = uploaded_by_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: key_result_checkins Users can delete their own checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own checkins" ON public.key_result_checkins FOR DELETE USING ((created_by_user_id = auth.uid()));


--
-- Name: comments Users can delete their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE TO authenticated USING (((auth.uid() = user_id) AND public.check_permission(auth.uid(), entity_type, 'delete'::public.permission_action)));


--
-- Name: ideation_comments Users can delete their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own comments" ON public.ideation_comments FOR DELETE TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: epic_custom_columns Users can delete their own custom columns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own custom columns" ON public.epic_custom_columns FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: discussions Users can delete their own discussions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own discussions" ON public.discussions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: test_execution_evidence Users can delete their own evidence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own evidence" ON public.test_execution_evidence FOR DELETE USING ((auth.uid() = uploaded_by));


--
-- Name: saved_filters Users can delete their own filters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own filters" ON public.saved_filters FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: epic_labels Users can delete their own labels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own labels" ON public.epic_labels FOR DELETE USING ((created_by = auth.uid()));


--
-- Name: notifications Users can delete their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: shared_test_steps Users can delete their own shared test steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own shared test steps" ON public.shared_test_steps FOR DELETE USING (((created_by = auth.uid()) AND (usage_count = 0)));


--
-- Name: starred_items Users can delete their own starred items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own starred items" ON public.starred_items FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: test_evidence Users can delete their own test evidence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own test evidence" ON public.test_evidence FOR DELETE USING ((uploaded_by = auth.uid()));


--
-- Name: test_case_work_items Users can delete their own work item test links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own work item test links" ON public.test_case_work_items FOR DELETE USING ((auth.uid() = created_by));


--
-- Name: test_case_work_item_links Users can delete work item links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete work item links" ON public.test_case_work_item_links FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.test_cases tc
  WHERE (tc.id = test_case_work_item_links.case_id))));


--
-- Name: work_item_rankings Users can delete work item rankings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete work item rankings" ON public.work_item_rankings FOR DELETE USING (((auth.uid() IS NOT NULL) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role))));


--
-- Name: kanban_card_history Users can insert card history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert card history" ON public.kanban_card_history FOR INSERT WITH CHECK ((card_id IN ( SELECT kanban_cards.id
   FROM public.kanban_cards
  WHERE (kanban_cards.board_id IN ( SELECT b.id
           FROM (public.kanban_boards b
             JOIN public.kanban_board_users u ON ((u.board_id = b.id)))
          WHERE ((u.user_id = auth.uid()) AND ((u.role)::text = ANY ((ARRAY['Admin'::character varying, 'Edit Boards'::character varying, 'Manage Cards'::character varying])::text[]))))))));


--
-- Name: test_dashboard_gadgets Users can insert dashboard gadgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert dashboard gadgets" ON public.test_dashboard_gadgets FOR INSERT WITH CHECK (true);


--
-- Name: import_history Users can insert import history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert import history" ON public.import_history FOR INSERT WITH CHECK ((imported_by = auth.uid()));


--
-- Name: test_dashboards Users can insert own dashboards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own dashboards" ON public.test_dashboards FOR INSERT WITH CHECK (true);


--
-- Name: epic_process_history Users can insert process history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert process history" ON public.epic_process_history FOR INSERT WITH CHECK (true);


--
-- Name: risks Users can insert risks linked to business requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert risks linked to business requests" ON public.risks FOR INSERT WITH CHECK (true);


--
-- Name: test_dashboard_shares Users can insert shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert shares" ON public.test_dashboard_shares FOR INSERT WITH CHECK (true);


--
-- Name: test_execution_step_results Users can insert step results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert step results" ON public.test_execution_step_results FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.test_cycle_executions tce
     JOIN public.test_cycles tc ON ((tce.cycle_id = tc.id)))
  WHERE (tce.id = test_execution_step_results.execution_id))));


--
-- Name: test_case_shared_steps Users can insert test case shared steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert test case shared steps" ON public.test_case_shared_steps FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: test_data_rows Users can insert test data rows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert test data rows" ON public.test_data_rows FOR INSERT WITH CHECK (true);


--
-- Name: test_evidence Users can insert test evidence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert test evidence" ON public.test_evidence FOR INSERT WITH CHECK ((uploaded_by = auth.uid()));


--
-- Name: test_data_parameters Users can insert test parameters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert test parameters" ON public.test_data_parameters FOR INSERT WITH CHECK (true);


--
-- Name: user_forecast_preferences Users can insert their own forecast preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own forecast preferences" ON public.user_forecast_preferences FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_industry_preferences Users can insert their own industry preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own industry preferences" ON public.user_industry_preferences FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_notification_preferences Users can insert their own notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own notification preferences" ON public.user_notification_preferences FOR INSERT WITH CHECK (((auth.uid())::text = (user_id)::text));


--
-- Name: user_epic_backlog_preferences Users can insert their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own preferences" ON public.user_epic_backlog_preferences FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_notification_preferences Users can insert their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own preferences" ON public.user_notification_preferences FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: recent_activity Users can insert their own recent activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own recent activity" ON public.recent_activity FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: starred_items Users can insert their own starred items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own starred items" ON public.starred_items FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: test_notification_preferences Users can insert their own test notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own test notification preferences" ON public.test_notification_preferences FOR INSERT WITH CHECK (((auth.uid())::text = (user_id)::text));


--
-- Name: epic_roi_scores Users can manage ROI scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage ROI scores" ON public.epic_roi_scores USING ((auth.uid() IS NOT NULL));


--
-- Name: epic_wsjf Users can manage WSJF scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage WSJF scores" ON public.epic_wsjf USING ((auth.uid() IS NOT NULL));


--
-- Name: objective_work_item_alignments Users can manage alignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage alignments" ON public.objective_work_item_alignments USING (true);


--
-- Name: subtasks Users can manage assigned subtasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage assigned subtasks" ON public.subtasks USING ((public.has_role(auth.uid(), 'user'::public.app_role) AND (assignee_id = auth.uid())));


--
-- Name: objective_contributors Users can manage contributors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage contributors" ON public.objective_contributors USING (true);


--
-- Name: epic_benefits Users can manage epic benefits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage epic benefits" ON public.epic_benefits USING ((auth.uid() IS NOT NULL));


--
-- Name: epic_design_items Users can manage epic design items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage epic design items" ON public.epic_design_items USING ((auth.uid() IS NOT NULL));


--
-- Name: epic_pi_forecasts Users can manage epic forecasts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage epic forecasts" ON public.epic_pi_forecasts USING ((auth.uid() IS NOT NULL));


--
-- Name: epic_links Users can manage epic links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage epic links" ON public.epic_links USING ((auth.uid() IS NOT NULL));


--
-- Name: epic_spend Users can manage epic spend; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage epic spend" ON public.epic_spend USING ((auth.uid() IS NOT NULL));


--
-- Name: epic_value_metrics Users can manage epic value metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage epic value metrics" ON public.epic_value_metrics USING ((auth.uid() IS NOT NULL));


--
-- Name: epic_intake_responses Users can manage intake responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage intake responses" ON public.epic_intake_responses USING ((auth.uid() IS NOT NULL));


--
-- Name: kb_document_labels Users can manage kb labels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage kb labels" ON public.kb_document_labels TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.kb_documents
  WHERE ((kb_documents.id = kb_document_labels.document_id) AND (kb_documents.created_by = auth.uid())))));


--
-- Name: kb_document_page_properties Users can manage kb page properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage kb page properties" ON public.kb_document_page_properties TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.kb_documents
  WHERE ((kb_documents.id = kb_document_page_properties.document_id) AND (kb_documents.created_by = auth.uid())))));


--
-- Name: key_results_v2 Users can manage key results they own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage key results they own" ON public.key_results_v2 USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role) OR (owner_user_id = auth.uid())));


--
-- Name: objective_linked_items Users can manage links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage links" ON public.objective_linked_items USING (true);


--
-- Name: milestone_categories Users can manage milestone categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage milestone categories" ON public.milestone_categories USING ((auth.uid() IS NOT NULL));


--
-- Name: work_item_presence Users can manage own presence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own presence" ON public.work_item_presence USING ((auth.uid() = user_id));


--
-- Name: objective_program_increments Users can manage pi links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage pi links" ON public.objective_program_increments USING (true);


--
-- Name: test_report_schedules Users can manage report schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage report schedules" ON public.test_report_schedules USING (true);


--
-- Name: epic_scorecard_responses Users can manage scorecard responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage scorecard responses" ON public.epic_scorecard_responses USING ((auth.uid() IS NOT NULL));


--
-- Name: strategic_goal_key_results Users can manage strategic goal key results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage strategic goal key results" ON public.strategic_goal_key_results USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: test_case_priorities Users can manage test case priorities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage test case priorities" ON public.test_case_priorities USING (true);


--
-- Name: test_case_statuses Users can manage test case statuses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage test case statuses" ON public.test_case_statuses USING (true);


--
-- Name: test_field_configurations Users can manage test field configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage test field configs" ON public.test_field_configurations USING (true);


--
-- Name: test_run_statuses Users can manage test run statuses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage test run statuses" ON public.test_run_statuses USING (true);


--
-- Name: announcement_dismissals Users can manage their own dismissals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own dismissals" ON public.announcement_dismissals USING ((auth.uid() = user_id));


--
-- Name: epic_report_templates Users can manage their own report templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own report templates" ON public.epic_report_templates USING ((auth.uid() = user_id));


--
-- Name: ideation_subscriptions Users can manage their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own subscriptions" ON public.ideation_subscriptions TO authenticated USING ((auth.uid() = user_id));


--
-- Name: subscriptions Users can manage their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own subscriptions" ON public.subscriptions USING ((auth.uid() = user_id));


--
-- Name: team_subscriptions Users can manage their own team subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own team subscriptions" ON public.team_subscriptions USING ((user_id = auth.uid()));


--
-- Name: ideation_votes Users can manage their own votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own votes" ON public.ideation_votes TO authenticated USING ((auth.uid() = user_id));


--
-- Name: work_item_links Users can manage work item links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage work item links" ON public.work_item_links USING ((auth.uid() IS NOT NULL));


--
-- Name: key_result_checkins Users can modify checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can modify checkins" ON public.key_result_checkins USING (true);


--
-- Name: key_results Users can modify key_results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can modify key_results" ON public.key_results USING (true);


--
-- Name: objectives Users can read all objectives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read all objectives" ON public.objectives FOR SELECT USING (true);


--
-- Name: key_result_checkins Users can read checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read checkins" ON public.key_result_checkins FOR SELECT USING (true);


--
-- Name: key_results Users can read key_results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read key_results" ON public.key_results FOR SELECT USING (true);


--
-- Name: test_set_cases Users can remove cases from sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove cases from sets" ON public.test_set_cases FOR DELETE USING (true);


--
-- Name: kb_document_favorites Users can remove favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove favorites" ON public.kb_document_favorites FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: kb_document_watchers Users can unwatch documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can unwatch documents" ON public.kb_document_watchers FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: work_item_watchers Users can unwatch work items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can unwatch work items" ON public.work_item_watchers FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: epic_acceptance_criteria Users can update acceptance criteria; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update acceptance criteria" ON public.epic_acceptance_criteria FOR UPDATE USING (true);


--
-- Name: stories Users can update assigned stories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update assigned stories" ON public.stories FOR UPDATE USING ((public.has_role(auth.uid(), 'user'::public.app_role) AND (assignee_id = auth.uid())));


--
-- Name: business_request_links Users can update business request links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update business request links" ON public.business_request_links FOR UPDATE USING (true);


--
-- Name: test_dashboard_gadgets Users can update dashboard gadgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update dashboard gadgets" ON public.test_dashboard_gadgets FOR UPDATE USING (true);


--
-- Name: test_case_datasets Users can update datasets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update datasets" ON public.test_case_datasets FOR UPDATE TO authenticated USING (true);


--
-- Name: dependencies Users can update dependencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update dependencies" ON public.dependencies FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: test_execution_runs Users can update execution runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update execution runs" ON public.test_execution_runs FOR UPDATE USING (true);


--
-- Name: test_cycle_executions Users can update executions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update executions" ON public.test_cycle_executions FOR UPDATE USING (true);


--
-- Name: forecast_entries Users can update forecast entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update forecast entries" ON public.forecast_entries FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role) OR public.has_role(auth.uid(), 'team_lead'::public.app_role)));


--
-- Name: kb_doc_spaces Users can update kb doc spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update kb doc spaces" ON public.kb_doc_spaces FOR UPDATE TO authenticated USING (true);


--
-- Name: kb_projects Users can update kb projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update kb projects" ON public.kb_projects FOR UPDATE TO authenticated USING (true);


--
-- Name: milestones Users can update milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update milestones" ON public.milestones FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.epics e
  WHERE ((e.id = milestones.epic_id) AND (auth.uid() IS NOT NULL)))));


--
-- Name: objectives Users can update objectives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update objectives" ON public.objectives FOR UPDATE USING (true);


--
-- Name: test_dashboards Users can update own dashboards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own dashboards" ON public.test_dashboards FOR UPDATE USING (true);


--
-- Name: kb_document_comments Users can update own kb comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own kb comments" ON public.kb_document_comments FOR UPDATE TO authenticated USING ((author_id = auth.uid()));


--
-- Name: kb_documents Users can update own kb documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own kb documents" ON public.kb_documents FOR UPDATE TO authenticated USING ((created_by = auth.uid()));


--
-- Name: work_item_time_logs Users can update own time logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own time logs" ON public.work_item_time_logs FOR UPDATE USING ((logged_by = auth.uid()));


--
-- Name: test_case_parameters Users can update parameters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update parameters" ON public.test_case_parameters FOR UPDATE TO authenticated USING (true);


--
-- Name: epic_process_history Users can update process history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update process history" ON public.epic_process_history FOR UPDATE USING (true);


--
-- Name: risks Users can update risks in their programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update risks in their programs" ON public.risks FOR UPDATE USING ((program_id IN ( SELECT program_members.program_id
   FROM public.program_members
  WHERE (program_members.user_id = auth.uid()))));


--
-- Name: risks Users can update risks linked to business requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update risks linked to business requests" ON public.risks FOR UPDATE USING (true);


--
-- Name: test_set_cases Users can update set cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update set cases" ON public.test_set_cases FOR UPDATE USING (true);


--
-- Name: test_execution_step_results Users can update step results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update step results" ON public.test_execution_step_results FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.test_cycle_executions tce
     JOIN public.test_cycles tc ON ((tce.cycle_id = tc.id)))
  WHERE (tce.id = test_execution_step_results.execution_id))));


--
-- Name: story_links Users can update story links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update story links" ON public.story_links FOR UPDATE USING (((auth.uid() = created_by) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role)));


--
-- Name: test_case_shared_steps Users can update test case shared steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update test case shared steps" ON public.test_case_shared_steps FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: test_case_steps Users can update test case steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update test case steps" ON public.test_case_steps FOR UPDATE TO authenticated USING (true);


--
-- Name: test_cases Users can update test cases in their program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update test cases in their program" ON public.test_cases FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: test_cycles Users can update test cycles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update test cycles" ON public.test_cycles FOR UPDATE USING (true);


--
-- Name: test_data_rows Users can update test data rows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update test data rows" ON public.test_data_rows FOR UPDATE USING (true);


--
-- Name: test_datasets Users can update test datasets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update test datasets" ON public.test_datasets FOR UPDATE USING (true);


--
-- Name: test_executions Users can update test executions in their program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update test executions in their program" ON public.test_executions FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: test_folders Users can update test folders in their program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update test folders in their program" ON public.test_folders FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: test_data_parameters Users can update test parameters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update test parameters" ON public.test_data_parameters FOR UPDATE USING (true);


--
-- Name: test_sets Users can update test sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update test sets" ON public.test_sets FOR UPDATE USING (true);


--
-- Name: comments Users can update their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own comments" ON public.comments FOR UPDATE TO authenticated USING (((auth.uid() = user_id) AND public.check_permission(auth.uid(), entity_type, 'edit'::public.permission_action)));


--
-- Name: ideation_comments Users can update their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own comments" ON public.ideation_comments FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: epic_custom_columns Users can update their own custom columns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own custom columns" ON public.epic_custom_columns FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: discussions Users can update their own discussions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own discussions" ON public.discussions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: saved_filters Users can update their own filters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own filters" ON public.saved_filters FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_forecast_preferences Users can update their own forecast preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own forecast preferences" ON public.user_forecast_preferences FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: ideas Users can update their own ideas or admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own ideas or admins" ON public.ideas FOR UPDATE TO authenticated USING (((auth.uid() = owner_id) OR (auth.uid() = created_by_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: user_industry_preferences Users can update their own industry preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own industry preferences" ON public.user_industry_preferences FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: epic_labels Users can update their own labels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own labels" ON public.epic_labels FOR UPDATE USING ((created_by = auth.uid()));


--
-- Name: user_notification_preferences Users can update their own notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notification preferences" ON public.user_notification_preferences FOR UPDATE USING (((auth.uid())::text = (user_id)::text));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_epic_backlog_preferences Users can update their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own preferences" ON public.user_epic_backlog_preferences FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_notification_preferences Users can update their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own preferences" ON public.user_notification_preferences FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: recent_activity Users can update their own recent activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own recent activity" ON public.recent_activity FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: shared_test_steps Users can update their own shared test steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own shared test steps" ON public.shared_test_steps FOR UPDATE USING ((created_by = auth.uid()));


--
-- Name: test_notification_preferences Users can update their own test notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own test notification preferences" ON public.test_notification_preferences FOR UPDATE USING (((auth.uid())::text = (user_id)::text));


--
-- Name: work_item_rankings Users can update work item rankings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update work item rankings" ON public.work_item_rankings FOR UPDATE USING (((auth.uid() IS NOT NULL) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role) OR public.has_role(auth.uid(), 'team_lead'::public.app_role))));


--
-- Name: attachments Users can upload attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can upload attachments" ON public.attachments FOR INSERT TO authenticated WITH CHECK (((auth.uid() = uploaded_by) AND public.check_permission(auth.uid(), entity_type, 'edit'::public.permission_action)));


--
-- Name: test_execution_evidence Users can upload evidence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can upload evidence" ON public.test_execution_evidence FOR INSERT WITH CHECK (((auth.uid() = uploaded_by) AND (EXISTS ( SELECT 1
   FROM (public.test_cycle_executions tce
     JOIN public.test_cycles tc ON ((tce.cycle_id = tc.id)))
  WHERE (tce.id = test_execution_evidence.execution_id)))));


--
-- Name: kb_document_attachments Users can upload kb attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can upload kb attachments" ON public.kb_document_attachments FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.kb_documents
  WHERE ((kb_documents.id = kb_document_attachments.document_id) AND (kb_documents.created_by = auth.uid())))));


--
-- Name: pi_objectives Users can view PI objectives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view PI objectives" ON public.pi_objectives FOR SELECT USING (public.user_in_program(auth.uid(), program_id));


--
-- Name: program_increments Users can view PIs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view PIs" ON public.program_increments FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role) OR public.has_role(auth.uid(), 'team_lead'::public.app_role) OR public.user_in_portfolio(auth.uid(), portfolio_id)));


--
-- Name: epic_wsjf Users can view WSJF scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view WSJF scores" ON public.epic_wsjf FOR SELECT USING (true);


--
-- Name: epic_acceptance_criteria Users can view acceptance criteria; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view acceptance criteria" ON public.epic_acceptance_criteria FOR SELECT USING (true);


--
-- Name: announcements Users can view active announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view active announcements" ON public.announcements FOR SELECT USING (((is_active = true) AND ((now() >= start_date) AND (now() <= end_date))));


--
-- Name: test_activity_log Users can view all activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all activity logs" ON public.test_activity_log FOR SELECT USING (true);


--
-- Name: dependencies Users can view all dependencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all dependencies" ON public.dependencies FOR SELECT USING (true);


--
-- Name: discussions Users can view all discussions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all discussions" ON public.discussions FOR SELECT USING (true);


--
-- Name: work_item_presence Users can view all presence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all presence" ON public.work_item_presence FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: user_roles Users can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (true);


--
-- Name: stories Users can view all stories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all stories" ON public.stories FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (auth.uid() = assignee_id) OR ((team_id IS NOT NULL) AND public.user_in_team(auth.uid(), team_id)) OR (EXISTS ( SELECT 1
   FROM public.features f
  WHERE ((f.id = stories.feature_id) AND public.user_in_program(auth.uid(), f.program_id))))));


--
-- Name: subtasks Users can view all subtasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all subtasks" ON public.subtasks FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (auth.uid() = assignee_id) OR (EXISTS ( SELECT 1
   FROM (public.stories s
     LEFT JOIN public.features f ON ((f.id = s.feature_id)))
  WHERE ((s.id = subtasks.story_id) AND ((s.assignee_id = auth.uid()) OR ((s.team_id IS NOT NULL) AND public.user_in_team(auth.uid(), s.team_id)) OR public.user_in_program(auth.uid(), f.program_id)))))));


--
-- Name: business_request_audit_logs Users can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view audit logs" ON public.business_request_audit_logs FOR SELECT USING (true);


--
-- Name: kanban_board_users Users can view board users for accessible boards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view board users for accessible boards" ON public.kanban_board_users FOR SELECT USING ((board_id IN ( SELECT kanban_boards.id
   FROM public.kanban_boards
  WHERE ((auth.uid() IN ( SELECT kanban_board_users_1.user_id
           FROM public.kanban_board_users kanban_board_users_1
          WHERE (kanban_board_users_1.board_id = kanban_boards.id))) OR (kanban_boards.created_by = auth.uid())))));


--
-- Name: kanban_boards Users can view boards they have access to; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view boards they have access to" ON public.kanban_boards FOR SELECT USING (((auth.uid() IN ( SELECT kanban_board_users.user_id
   FROM public.kanban_board_users
  WHERE (kanban_board_users.board_id = kanban_boards.id))) OR (created_by = auth.uid())));


--
-- Name: business_request_links Users can view business request links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view business request links" ON public.business_request_links FOR SELECT USING (true);


--
-- Name: capacity_allocations Users can view capacity allocations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view capacity allocations" ON public.capacity_allocations FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role) OR public.has_role(auth.uid(), 'team_lead'::public.app_role) OR public.user_in_team(auth.uid(), team_id)));


--
-- Name: capacity_plans Users can view capacity plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view capacity plans" ON public.capacity_plans FOR SELECT USING (true);


--
-- Name: kanban_card_history Users can view card history for accessible boards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view card history for accessible boards" ON public.kanban_card_history FOR SELECT USING ((card_id IN ( SELECT kanban_cards.id
   FROM public.kanban_cards
  WHERE (kanban_cards.board_id IN ( SELECT kanban_boards.id
           FROM public.kanban_boards
          WHERE ((auth.uid() IN ( SELECT kanban_board_users.user_id
                   FROM public.kanban_board_users
                  WHERE (kanban_board_users.board_id = kanban_boards.id))) OR (kanban_boards.created_by = auth.uid())))))));


--
-- Name: kanban_cards Users can view cards for accessible boards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view cards for accessible boards" ON public.kanban_cards FOR SELECT USING ((board_id IN ( SELECT kanban_boards.id
   FROM public.kanban_boards
  WHERE ((auth.uid() IN ( SELECT kanban_board_users.user_id
           FROM public.kanban_board_users
          WHERE (kanban_board_users.board_id = kanban_boards.id))) OR (kanban_boards.created_by = auth.uid())))));


--
-- Name: kanban_columns Users can view columns for accessible boards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view columns for accessible boards" ON public.kanban_columns FOR SELECT USING ((board_id IN ( SELECT kanban_boards.id
   FROM public.kanban_boards
  WHERE ((auth.uid() IN ( SELECT kanban_board_users.user_id
           FROM public.kanban_board_users
          WHERE (kanban_board_users.board_id = kanban_boards.id))) OR (kanban_boards.created_by = auth.uid())))));


--
-- Name: comment_mentions Users can view comment mentions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view comment mentions" ON public.comment_mentions FOR SELECT USING (true);


--
-- Name: story_comments Users can view comments on stories they can see; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view comments on stories they can see" ON public.story_comments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.stories
  WHERE (stories.id = story_comments.story_id))));


--
-- Name: test_dashboard_gadgets Users can view dashboard gadgets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view dashboard gadgets" ON public.test_dashboard_gadgets FOR SELECT USING (true);


--
-- Name: test_case_datasets Users can view datasets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view datasets" ON public.test_case_datasets FOR SELECT TO authenticated USING (true);


--
-- Name: test_execution_defects Users can view defects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view defects" ON public.test_execution_defects FOR SELECT USING (true);


--
-- Name: dependencies Users can view dependencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view dependencies" ON public.dependencies FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role) OR public.has_role(auth.uid(), 'team_lead'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.features f
  WHERE (((f.id = dependencies.from_feature_id) OR (f.id = dependencies.to_feature_id)) AND public.user_in_program(auth.uid(), f.program_id))))));


--
-- Name: dependency_audit_log Users can view dependency audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view dependency audit logs" ON public.dependency_audit_log FOR SELECT USING (true);


--
-- Name: dependency_negotiations Users can view dependency negotiations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view dependency negotiations" ON public.dependency_negotiations FOR SELECT USING (true);


--
-- Name: business_request_discussions Users can view discussions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view discussions" ON public.business_request_discussions FOR SELECT USING (true);


--
-- Name: epic_spend Users can view epic spend; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view epic spend" ON public.epic_spend FOR SELECT USING (true);


--
-- Name: epics Users can view epics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view epics" ON public.epics FOR SELECT USING (public.has_role(auth.uid(), 'user'::public.app_role));


--
-- Name: estimation_conversions Users can view estimation conversions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view estimation conversions" ON public.estimation_conversions FOR SELECT TO authenticated USING (true);


--
-- Name: test_execution_evidence Users can view evidence in their program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view evidence in their program" ON public.test_execution_evidence FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.test_cycle_executions tce
     JOIN public.test_cycles tc ON ((tce.cycle_id = tc.id)))
  WHERE (tce.id = test_execution_evidence.execution_id))));


--
-- Name: test_execution_runs Users can view execution runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view execution runs" ON public.test_execution_runs FOR SELECT USING (true);


--
-- Name: test_cycle_executions Users can view executions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view executions" ON public.test_cycle_executions FOR SELECT USING (true);


--
-- Name: external_entities Users can view external entities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view external entities" ON public.external_entities FOR SELECT USING (true);


--
-- Name: feature_pi_objective_links Users can view feature PI objective links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view feature PI objective links" ON public.feature_pi_objective_links FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.features f
  WHERE ((f.id = feature_pi_objective_links.feature_id) AND public.user_in_program(auth.uid(), f.program_id)))));


--
-- Name: feature_scheduling_history Users can view feature scheduling history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view feature scheduling history" ON public.feature_scheduling_history FOR SELECT USING (true);


--
-- Name: features Users can view features; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view features" ON public.features FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.user_in_program(auth.uid(), program_id)));


--
-- Name: forecast_entries Users can view forecast entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view forecast entries" ON public.forecast_entries FOR SELECT USING (true);


--
-- Name: work_item_forecast_ranks Users can view forecast ranks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view forecast ranks" ON public.work_item_forecast_ranks FOR SELECT TO authenticated USING (true);


--
-- Name: initiatives Users can view initiatives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view initiatives" ON public.initiatives FOR SELECT USING (public.has_role(auth.uid(), 'user'::public.app_role));


--
-- Name: intake_fields Users can view intake fields; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view intake fields" ON public.intake_fields FOR SELECT USING (true);


--
-- Name: intake_sets Users can view intake sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view intake sets" ON public.intake_sets FOR SELECT USING (true);


--
-- Name: iterations Users can view iterations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view iterations" ON public.iterations FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role) OR public.has_role(auth.uid(), 'team_lead'::public.app_role) OR ((team_id IS NOT NULL) AND public.user_in_team(auth.uid(), team_id)) OR (EXISTS ( SELECT 1
   FROM public.program_increments pi
  WHERE ((pi.id = iterations.pi_id) AND public.user_in_portfolio(auth.uid(), pi.portfolio_id))))));


--
-- Name: jira_sync_logs Users can view jira_sync_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view jira_sync_logs" ON public.jira_sync_logs FOR SELECT USING (true);


--
-- Name: jira_work_item_links Users can view jira_work_item_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view jira_work_item_links" ON public.jira_work_item_links FOR SELECT USING (true);


--
-- Name: kb_document_attachments Users can view kb attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view kb attachments" ON public.kb_document_attachments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.kb_documents
  WHERE ((kb_documents.id = kb_document_attachments.document_id) AND ((kb_documents.published_at IS NOT NULL) OR (kb_documents.created_by = auth.uid()))))));


--
-- Name: kb_audit_log Users can view kb audit log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view kb audit log" ON public.kb_audit_log FOR SELECT TO authenticated USING (true);


--
-- Name: kb_document_comments Users can view kb comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view kb comments" ON public.kb_document_comments FOR SELECT TO authenticated USING (true);


--
-- Name: kb_doc_spaces Users can view kb doc spaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view kb doc spaces" ON public.kb_doc_spaces FOR SELECT TO authenticated USING (true);


--
-- Name: kb_document_versions Users can view kb document versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view kb document versions" ON public.kb_document_versions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.kb_documents
  WHERE ((kb_documents.id = kb_document_versions.document_id) AND ((kb_documents.published_at IS NOT NULL) OR (kb_documents.created_by = auth.uid()))))));


--
-- Name: kb_documents Users can view kb documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view kb documents" ON public.kb_documents FOR SELECT TO authenticated USING (((published_at IS NOT NULL) OR (created_by = auth.uid())));


--
-- Name: kb_document_labels Users can view kb labels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view kb labels" ON public.kb_document_labels FOR SELECT TO authenticated USING (true);


--
-- Name: kb_document_page_properties Users can view kb page properties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view kb page properties" ON public.kb_document_page_properties FOR SELECT TO authenticated USING (true);


--
-- Name: kb_projects Users can view kb projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view kb projects" ON public.kb_projects FOR SELECT TO authenticated USING (true);


--
-- Name: work_item_key_history Users can view key history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view key history" ON public.work_item_key_history FOR SELECT USING (true);


--
-- Name: key_results Users can view key results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view key results" ON public.key_results FOR SELECT USING (public.has_role(auth.uid(), 'user'::public.app_role));


--
-- Name: discussion_mentions Users can view mentions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view mentions" ON public.discussion_mentions FOR SELECT USING (true);


--
-- Name: milestone_categories Users can view milestone categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view milestone categories" ON public.milestone_categories FOR SELECT USING (true);


--
-- Name: milestones Users can view milestones in their portfolio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view milestones in their portfolio" ON public.milestones FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.epics e
  WHERE ((e.id = milestones.epic_id) AND (auth.uid() IS NOT NULL)))));


--
-- Name: objectives Users can view objectives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view objectives" ON public.objectives FOR SELECT USING (public.has_role(auth.uid(), 'user'::public.app_role));


--
-- Name: user_app_preferences Users can view own app preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own app preferences" ON public.user_app_preferences USING (true);


--
-- Name: test_dashboards Users can view own dashboards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own dashboards" ON public.test_dashboards FOR SELECT USING (true);


--
-- Name: user_email_preferences Users can view own email preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own email preferences" ON public.user_email_preferences USING (true);


--
-- Name: user_notification_settings Users can view own notification settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notification settings" ON public.user_notification_settings USING (true);


--
-- Name: user_notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.user_notifications USING (true);


--
-- Name: user_theme_preferences Users can view own theme preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own theme preferences" ON public.user_theme_preferences USING (true);


--
-- Name: test_case_parameters Users can view parameters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view parameters" ON public.test_case_parameters FOR SELECT TO authenticated USING (true);


--
-- Name: portfolio_estimation_settings Users can view portfolio estimation settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view portfolio estimation settings" ON public.portfolio_estimation_settings FOR SELECT TO authenticated USING (true);


--
-- Name: portfolio_members Users can view portfolio members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view portfolio members" ON public.portfolio_members FOR SELECT USING (true);


--
-- Name: predictability_metrics Users can view predictability metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view predictability metrics" ON public.predictability_metrics FOR SELECT USING (public.user_in_program(auth.uid(), program_id));


--
-- Name: epic_process_history Users can view process history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view process history" ON public.epic_process_history FOR SELECT USING (true);


--
-- Name: program_members Users can view program members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view program members" ON public.program_members FOR SELECT USING (true);


--
-- Name: program_spend_per_point Users can view program spend per point; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view program spend per point" ON public.program_spend_per_point FOR SELECT TO authenticated USING (true);


--
-- Name: program_team_rankings Users can view program team rankings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view program team rankings" ON public.program_team_rankings FOR SELECT USING (true);


--
-- Name: release_vehicles Users can view release vehicles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view release vehicles" ON public.release_vehicles FOR SELECT USING (public.has_role(auth.uid(), 'user'::public.app_role));


--
-- Name: releases Users can view releases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view releases" ON public.releases FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role) OR public.has_role(auth.uid(), 'team_lead'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.release_vehicles rv
  WHERE ((rv.id = releases.release_vehicle_id) AND (((rv.program_id IS NOT NULL) AND public.user_in_program(auth.uid(), rv.program_id)) OR ((rv.portfolio_id IS NOT NULL) AND public.user_in_portfolio(auth.uid(), rv.portfolio_id))))))));


--
-- Name: test_report_schedules Users can view report schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view report schedules" ON public.test_report_schedules FOR SELECT USING (true);


--
-- Name: test_reports Users can view reports for their programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view reports for their programs" ON public.test_reports FOR SELECT USING (true);


--
-- Name: kb_document_restrictions Users can view restrictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view restrictions" ON public.kb_document_restrictions FOR SELECT USING (true);


--
-- Name: risks Users can view risks in their programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view risks in their programs" ON public.risks FOR SELECT USING ((program_id IN ( SELECT program_members.program_id
   FROM public.program_members
  WHERE (program_members.user_id = auth.uid()))));


--
-- Name: risks Users can view risks linked to business requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view risks linked to business requests" ON public.risks FOR SELECT USING (((business_request_id IS NOT NULL) OR true));


--
-- Name: scorecard_answers Users can view scorecard answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view scorecard answers" ON public.scorecard_answers FOR SELECT USING (true);


--
-- Name: scorecard_questions Users can view scorecard questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view scorecard questions" ON public.scorecard_questions FOR SELECT USING (true);


--
-- Name: scorecards Users can view scorecards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view scorecards" ON public.scorecards FOR SELECT USING (true);


--
-- Name: shared_service_allocations Users can view shared service allocations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view shared service allocations" ON public.shared_service_allocations FOR SELECT USING (public.user_in_team(auth.uid(), team_id));


--
-- Name: shared_services Users can view shared services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view shared services" ON public.shared_services FOR SELECT USING (((portfolio_id IS NULL) OR public.user_in_portfolio(auth.uid(), portfolio_id)));


--
-- Name: shared_test_steps Users can view shared test steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view shared test steps" ON public.shared_test_steps FOR SELECT USING (true);


--
-- Name: test_dashboard_shares Users can view shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view shares" ON public.test_dashboard_shares FOR SELECT USING (true);


--
-- Name: snapshot_configurations Users can view snapshot configurations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view snapshot configurations" ON public.snapshot_configurations FOR SELECT USING (true);


--
-- Name: test_execution_step_results Users can view step results in their program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view step results in their program" ON public.test_execution_step_results FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.test_cycle_executions tce
     JOIN public.test_cycles tc ON ((tce.cycle_id = tc.id)))
  WHERE (tce.id = test_execution_step_results.execution_id))));


--
-- Name: story_links Users can view story links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view story links" ON public.story_links FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: strategic_goal_key_results Users can view strategic goal key results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view strategic goal key results" ON public.strategic_goal_key_results FOR SELECT USING (true);


--
-- Name: ideation_subscriptions Users can view subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view subscriptions" ON public.ideation_subscriptions FOR SELECT TO authenticated USING (true);


--
-- Name: kanban_swim_lanes Users can view swim lanes for accessible boards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view swim lanes for accessible boards" ON public.kanban_swim_lanes FOR SELECT USING ((board_id IN ( SELECT kanban_boards.id
   FROM public.kanban_boards
  WHERE ((auth.uid() IN ( SELECT kanban_board_users.user_id
           FROM public.kanban_board_users
          WHERE (kanban_board_users.board_id = kanban_boards.id))) OR (kanban_boards.created_by = auth.uid())))));


--
-- Name: team_members Users can view team members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view team members" ON public.team_members FOR SELECT USING (true);


--
-- Name: team_point_systems Users can view team point systems; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view team point systems" ON public.team_point_systems FOR SELECT TO authenticated USING (true);


--
-- Name: team_spend_per_sprint Users can view team spend per sprint; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view team spend per sprint" ON public.team_spend_per_sprint FOR SELECT TO authenticated USING (true);


--
-- Name: teams Users can view teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view teams" ON public.teams FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'program_manager'::public.app_role) OR public.has_role(auth.uid(), 'team_lead'::public.app_role) OR public.user_in_team(auth.uid(), id) OR public.user_in_program(auth.uid(), program_id)));


--
-- Name: test_activity_log Users can view test activity log in their program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view test activity log in their program" ON public.test_activity_log FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: test_case_priorities Users can view test case priorities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view test case priorities" ON public.test_case_priorities FOR SELECT USING (true);


--
-- Name: test_case_shared_steps Users can view test case shared steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view test case shared steps" ON public.test_case_shared_steps FOR SELECT USING (true);


--
-- Name: test_case_statuses Users can view test case statuses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view test case statuses" ON public.test_case_statuses FOR SELECT USING (true);


--
-- Name: test_case_steps Users can view test case steps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view test case steps" ON public.test_case_steps FOR SELECT TO authenticated USING (true);


--
-- Name: test_cases Users can view test cases in their program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view test cases in their program" ON public.test_cases FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: test_cycles Users can view test cycles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view test cycles" ON public.test_cycles FOR SELECT USING (true);


--
-- Name: test_data_rows Users can view test data rows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view test data rows" ON public.test_data_rows FOR SELECT USING (true);


--
-- Name: test_datasets Users can view test datasets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view test datasets" ON public.test_datasets FOR SELECT USING (true);


--
-- Name: test_evidence Users can view test evidence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view test evidence" ON public.test_evidence FOR SELECT USING (true);


--
-- Name: test_executions Users can view test executions in their program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view test executions in their program" ON public.test_executions FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: test_field_configurations Users can view test field configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view test field configs" ON public.test_field_configurations FOR SELECT USING (true);


--
-- Name: test_folders Users can view test folders in their program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view test folders in their program" ON public.test_folders FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: test_data_parameters Users can view test parameters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view test parameters" ON public.test_data_parameters FOR SELECT USING (true);


--
-- Name: test_run_statuses Users can view test run statuses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view test run statuses" ON public.test_run_statuses FOR SELECT USING (true);


--
-- Name: test_set_cases Users can view test set cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view test set cases" ON public.test_set_cases FOR SELECT USING (true);


--
-- Name: test_sets Users can view test sets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view test sets" ON public.test_sets FOR SELECT USING (true);


--
-- Name: kb_document_favorites Users can view their favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their favorites" ON public.kb_document_favorites FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: test_case_bulk_operations Users can view their own bulk operations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own bulk operations" ON public.test_case_bulk_operations FOR SELECT USING ((executed_by = auth.uid()));


--
-- Name: epic_custom_columns Users can view their own custom columns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own custom columns" ON public.epic_custom_columns FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: saved_filters Users can view their own filters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own filters" ON public.saved_filters FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_forecast_preferences Users can view their own forecast preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own forecast preferences" ON public.user_forecast_preferences FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: import_history Users can view their own import history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own import history" ON public.import_history FOR SELECT USING ((imported_by = auth.uid()));


--
-- Name: user_industry_preferences Users can view their own industry preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own industry preferences" ON public.user_industry_preferences FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_notification_preferences Users can view their own notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notification preferences" ON public.user_notification_preferences FOR SELECT USING (((auth.uid())::text = (user_id)::text));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_epic_backlog_preferences Users can view their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own preferences" ON public.user_epic_backlog_preferences FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_notification_preferences Users can view their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own preferences" ON public.user_notification_preferences FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: recent_activity Users can view their own recent activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own recent activity" ON public.recent_activity FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_role_history Users can view their own role history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own role history" ON public.user_role_history FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: starred_items Users can view their own starred items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own starred items" ON public.starred_items FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: test_notification_preferences Users can view their own test notification preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own test notification preferences" ON public.test_notification_preferences FOR SELECT USING (((auth.uid())::text = (user_id)::text));


--
-- Name: strategic_themes Users can view themes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view themes" ON public.strategic_themes FOR SELECT USING (public.has_role(auth.uid(), 'user'::public.app_role));


--
-- Name: work_item_time_logs Users can view time logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view time logs" ON public.work_item_time_logs FOR SELECT USING (true);


--
-- Name: value_stream_metrics Users can view value stream metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view value stream metrics" ON public.value_stream_metrics FOR SELECT USING (public.user_in_portfolio(auth.uid(), portfolio_id));


--
-- Name: test_case_version_changes Users can view version changes of accessible cases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view version changes of accessible cases" ON public.test_case_version_changes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.test_cases
  WHERE ((test_cases.id = test_case_version_changes.case_id) AND (test_cases.program_id IN ( SELECT program_members.program_id
           FROM public.program_members
          WHERE (program_members.user_id = auth.uid())))))));


--
-- Name: test_case_versions Users can view versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view versions" ON public.test_case_versions FOR SELECT TO authenticated USING (true);


--
-- Name: kb_document_watchers Users can view watchers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view watchers" ON public.kb_document_watchers FOR SELECT USING (true);


--
-- Name: work_item_assignments Users can view work item assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view work item assignments" ON public.work_item_assignments FOR SELECT USING (true);


--
-- Name: test_case_work_item_links Users can view work item links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view work item links" ON public.test_case_work_item_links FOR SELECT TO authenticated USING (true);


--
-- Name: work_item_links Users can view work item links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view work item links" ON public.work_item_links FOR SELECT USING (true);


--
-- Name: test_case_work_item_links Users can view work item links in their program; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view work item links in their program" ON public.test_case_work_item_links FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.test_cases tc
  WHERE (tc.id = test_case_work_item_links.case_id))));


--
-- Name: work_item_rankings Users can view work item rankings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view work item rankings" ON public.work_item_rankings FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: test_case_work_items Users can view work item test links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view work item test links" ON public.test_case_work_items FOR SELECT USING (true);


--
-- Name: work_item_versions Users can view work item versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view work item versions" ON public.work_item_versions FOR SELECT USING (true);


--
-- Name: work_item_watchers Users can view work item watchers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view work item watchers" ON public.work_item_watchers FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: workflow_rules Users can view workflow rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view workflow rules" ON public.workflow_rules FOR SELECT USING (true);


--
-- Name: kb_document_watchers Users can watch documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can watch documents" ON public.kb_document_watchers FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: work_item_watchers Users can watch work items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can watch work items" ON public.work_item_watchers FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: kanban_columns Users with Admin or Edit Boards role can manage columns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users with Admin or Edit Boards role can manage columns" ON public.kanban_columns USING ((board_id IN ( SELECT b.id
   FROM (public.kanban_boards b
     JOIN public.kanban_board_users u ON ((u.board_id = b.id)))
  WHERE ((u.user_id = auth.uid()) AND ((u.role)::text = ANY ((ARRAY['Admin'::character varying, 'Edit Boards'::character varying])::text[]))))));


--
-- Name: kanban_swim_lanes Users with Admin or Edit Boards role can manage swim lanes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users with Admin or Edit Boards role can manage swim lanes" ON public.kanban_swim_lanes USING ((board_id IN ( SELECT b.id
   FROM (public.kanban_boards b
     JOIN public.kanban_board_users u ON ((u.board_id = b.id)))
  WHERE ((u.user_id = auth.uid()) AND ((u.role)::text = ANY ((ARRAY['Admin'::character varying, 'Edit Boards'::character varying])::text[]))))));


--
-- Name: kanban_boards Users with Admin or Edit Boards role can update boards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users with Admin or Edit Boards role can update boards" ON public.kanban_boards FOR UPDATE USING (((auth.uid() IN ( SELECT kanban_board_users.user_id
   FROM public.kanban_board_users
  WHERE ((kanban_board_users.board_id = kanban_boards.id) AND ((kanban_board_users.role)::text = ANY ((ARRAY['Admin'::character varying, 'Edit Boards'::character varying])::text[]))))) OR (created_by = auth.uid())));


--
-- Name: kanban_cards Users with Manage Cards role can manage cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users with Manage Cards role can manage cards" ON public.kanban_cards USING ((board_id IN ( SELECT b.id
   FROM (public.kanban_boards b
     JOIN public.kanban_board_users u ON ((u.board_id = b.id)))
  WHERE ((u.user_id = auth.uid()) AND ((u.role)::text = ANY ((ARRAY['Admin'::character varying, 'Edit Boards'::character varying, 'Manage Cards'::character varying])::text[]))))));


--
-- Name: active_package; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.active_package ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: anchor_sprints; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.anchor_sprints ENABLE ROW LEVEL SECURITY;

--
-- Name: announcement_dismissals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: board_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.board_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: business_lines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_lines ENABLE ROW LEVEL SECURITY;

--
-- Name: business_request_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_request_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: business_request_discussions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_request_discussions ENABLE ROW LEVEL SECURITY;

--
-- Name: business_request_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_request_links ENABLE ROW LEVEL SECURITY;

--
-- Name: business_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: capacity_allocations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.capacity_allocations ENABLE ROW LEVEL SECURITY;

--
-- Name: capacity_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.capacity_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: certifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

--
-- Name: comment_mentions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;

--
-- Name: comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_field_defs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_field_defs ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_field_values; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

--
-- Name: demand_field_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.demand_field_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: demand_section_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.demand_section_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: demand_tab_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.demand_tab_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: dependencies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dependencies ENABLE ROW LEVEL SECURITY;

--
-- Name: dependency_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dependency_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: dependency_negotiations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dependency_negotiations ENABLE ROW LEVEL SECURITY;

--
-- Name: discussion_mentions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discussion_mentions ENABLE ROW LEVEL SECURITY;

--
-- Name: discussions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;

--
-- Name: drawer_tab_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.drawer_tab_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: epic_acceptance_criteria; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epic_acceptance_criteria ENABLE ROW LEVEL SECURITY;

--
-- Name: epic_benefits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epic_benefits ENABLE ROW LEVEL SECURITY;

--
-- Name: epic_custom_columns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epic_custom_columns ENABLE ROW LEVEL SECURITY;

--
-- Name: epic_design_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epic_design_items ENABLE ROW LEVEL SECURITY;

--
-- Name: epic_intake_responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epic_intake_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: epic_label_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epic_label_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: epic_labels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epic_labels ENABLE ROW LEVEL SECURITY;

--
-- Name: epic_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epic_links ENABLE ROW LEVEL SECURITY;

--
-- Name: epic_pi_forecasts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epic_pi_forecasts ENABLE ROW LEVEL SECURITY;

--
-- Name: epic_process_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epic_process_history ENABLE ROW LEVEL SECURITY;

--
-- Name: epic_program_increments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epic_program_increments ENABLE ROW LEVEL SECURITY;

--
-- Name: epic_programs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epic_programs ENABLE ROW LEVEL SECURITY;

--
-- Name: epic_report_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epic_report_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: epic_roi_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epic_roi_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: epic_scorecard_responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epic_scorecard_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: epic_spend; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epic_spend ENABLE ROW LEVEL SECURITY;

--
-- Name: epic_value_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epic_value_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: epic_wsjf; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epic_wsjf ENABLE ROW LEVEL SECURITY;

--
-- Name: epics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.epics ENABLE ROW LEVEL SECURITY;

--
-- Name: estimation_conversions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.estimation_conversions ENABLE ROW LEVEL SECURITY;

--
-- Name: external_entities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.external_entities ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_flags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_pi_objective_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feature_pi_objective_links ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_scheduling_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feature_scheduling_history ENABLE ROW LEVEL SECURITY;

--
-- Name: features; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

--
-- Name: forecast_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forecast_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

--
-- Name: hierarchy_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hierarchy_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: idea_group_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.idea_group_members ENABLE ROW LEVEL SECURITY;

--
-- Name: idea_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.idea_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: ideas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

--
-- Name: ideation_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ideation_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: ideation_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ideation_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: ideation_external_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ideation_external_users ENABLE ROW LEVEL SECURITY;

--
-- Name: ideation_form_fields; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ideation_form_fields ENABLE ROW LEVEL SECURITY;

--
-- Name: ideation_forms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ideation_forms ENABLE ROW LEVEL SECURITY;

--
-- Name: ideation_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ideation_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: ideation_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ideation_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: import_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

--
-- Name: initiatives; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;

--
-- Name: intake_fields; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intake_fields ENABLE ROW LEVEL SECURITY;

--
-- Name: intake_sets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intake_sets ENABLE ROW LEVEL SECURITY;

--
-- Name: integration_connectors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integration_connectors ENABLE ROW LEVEL SECURITY;

--
-- Name: iterations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.iterations ENABLE ROW LEVEL SECURITY;

--
-- Name: jira_auth_credentials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jira_auth_credentials ENABLE ROW LEVEL SECURITY;

--
-- Name: jira_board_mappings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jira_board_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: jira_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jira_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: jira_field_mappings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jira_field_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: jira_project_mappings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jira_project_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: jira_sync_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jira_sync_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: jira_work_item_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jira_work_item_links ENABLE ROW LEVEL SECURITY;

--
-- Name: kanban_board_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kanban_board_users ENABLE ROW LEVEL SECURITY;

--
-- Name: kanban_boards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kanban_boards ENABLE ROW LEVEL SECURITY;

--
-- Name: kanban_card_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kanban_card_history ENABLE ROW LEVEL SECURITY;

--
-- Name: kanban_cards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: kanban_columns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;

--
-- Name: kanban_swim_lanes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kanban_swim_lanes ENABLE ROW LEVEL SECURITY;

--
-- Name: kb_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kb_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: kb_doc_spaces; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kb_doc_spaces ENABLE ROW LEVEL SECURITY;

--
-- Name: kb_document_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kb_document_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: kb_document_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kb_document_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: kb_document_favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kb_document_favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: kb_document_labels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kb_document_labels ENABLE ROW LEVEL SECURITY;

--
-- Name: kb_document_page_properties; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kb_document_page_properties ENABLE ROW LEVEL SECURITY;

--
-- Name: kb_document_restrictions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kb_document_restrictions ENABLE ROW LEVEL SECURITY;

--
-- Name: kb_document_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kb_document_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: kb_document_watchers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kb_document_watchers ENABLE ROW LEVEL SECURITY;

--
-- Name: kb_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kb_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: kb_projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kb_projects ENABLE ROW LEVEL SECURITY;

--
-- Name: key_result_checkins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.key_result_checkins ENABLE ROW LEVEL SECURITY;

--
-- Name: key_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;

--
-- Name: key_results_v2; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.key_results_v2 ENABLE ROW LEVEL SECURITY;

--
-- Name: kr_work_contributions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kr_work_contributions ENABLE ROW LEVEL SECURITY;

--
-- Name: milestone_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.milestone_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: milestones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: module_packages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.module_packages ENABLE ROW LEVEL SECURITY;

--
-- Name: modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: objective_capability_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objective_capability_links ENABLE ROW LEVEL SECURITY;

--
-- Name: objective_contributors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objective_contributors ENABLE ROW LEVEL SECURITY;

--
-- Name: objective_dependencies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objective_dependencies ENABLE ROW LEVEL SECURITY;

--
-- Name: objective_epic_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objective_epic_links ENABLE ROW LEVEL SECURITY;

--
-- Name: objective_feature_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objective_feature_links ENABLE ROW LEVEL SECURITY;

--
-- Name: objective_impediments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objective_impediments ENABLE ROW LEVEL SECURITY;

--
-- Name: objective_initiative_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objective_initiative_links ENABLE ROW LEVEL SECURITY;

--
-- Name: objective_levels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objective_levels ENABLE ROW LEVEL SECURITY;

--
-- Name: objective_linked_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objective_linked_items ENABLE ROW LEVEL SECURITY;

--
-- Name: objective_program_increments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objective_program_increments ENABLE ROW LEVEL SECURITY;

--
-- Name: objective_risks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objective_risks ENABLE ROW LEVEL SECURITY;

--
-- Name: objective_theme_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objective_theme_links ENABLE ROW LEVEL SECURITY;

--
-- Name: objective_work_item_alignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objective_work_item_alignments ENABLE ROW LEVEL SECURITY;

--
-- Name: objective_work_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objective_work_items ENABLE ROW LEVEL SECURITY;

--
-- Name: objectives; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;

--
-- Name: org_modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.org_modules ENABLE ROW LEVEL SECURITY;

--
-- Name: package_modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.package_modules ENABLE ROW LEVEL SECURITY;

--
-- Name: permission_grants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.permission_grants ENABLE ROW LEVEL SECURITY;

--
-- Name: permission_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.permission_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: pi_objectives; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pi_objectives ENABLE ROW LEVEL SECURITY;

--
-- Name: portfolio_estimation_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portfolio_estimation_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: portfolio_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portfolio_members ENABLE ROW LEVEL SECURITY;

--
-- Name: portfolios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

--
-- Name: predictability_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.predictability_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: process_flows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.process_flows ENABLE ROW LEVEL SECURITY;

--
-- Name: process_steps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.process_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: product_role_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: product_role_permissions product_role_permissions_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_role_permissions_admin_write ON public.product_role_permissions TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: product_role_permissions product_role_permissions_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_role_permissions_read ON public.product_role_permissions FOR SELECT TO authenticated USING (true);


--
-- Name: product_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: product_roles product_roles_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_roles_admin_write ON public.product_roles TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: product_roles product_roles_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_roles_read ON public.product_roles FOR SELECT TO authenticated USING (true);


--
-- Name: product_status_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_status_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: product_view_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_view_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: program_increments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.program_increments ENABLE ROW LEVEL SECURITY;

--
-- Name: program_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.program_members ENABLE ROW LEVEL SECURITY;

--
-- Name: program_spend_per_point; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.program_spend_per_point ENABLE ROW LEVEL SECURITY;

--
-- Name: program_team_rankings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.program_team_rankings ENABLE ROW LEVEL SECURITY;

--
-- Name: programs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

--
-- Name: recent_activity; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recent_activity ENABLE ROW LEVEL SECURITY;

--
-- Name: release_feature_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.release_feature_links ENABLE ROW LEVEL SECURITY;

--
-- Name: release_story_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.release_story_links ENABLE ROW LEVEL SECURITY;

--
-- Name: release_vehicles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.release_vehicles ENABLE ROW LEVEL SECURITY;

--
-- Name: releases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;

--
-- Name: report_definitions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;

--
-- Name: risks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;

--
-- Name: roadmap_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

--
-- Name: saved_filters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_emails; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

--
-- Name: scorecard_answers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scorecard_answers ENABLE ROW LEVEL SECURITY;

--
-- Name: scorecard_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scorecard_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: scorecards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scorecards ENABLE ROW LEVEL SECURITY;

--
-- Name: shared_service_allocations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shared_service_allocations ENABLE ROW LEVEL SECURITY;

--
-- Name: shared_services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shared_services ENABLE ROW LEVEL SECURITY;

--
-- Name: shared_test_steps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shared_test_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: skill_requirements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.skill_requirements ENABLE ROW LEVEL SECURITY;

--
-- Name: skills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

--
-- Name: snapshot_configurations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.snapshot_configurations ENABLE ROW LEVEL SECURITY;

--
-- Name: snapshot_strategy_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.snapshot_strategy_links ENABLE ROW LEVEL SECURITY;

--
-- Name: starred_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.starred_items ENABLE ROW LEVEL SECURITY;

--
-- Name: stories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

--
-- Name: story_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: story_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.story_links ENABLE ROW LEVEL SECURITY;

--
-- Name: strategic_goal_key_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.strategic_goal_key_results ENABLE ROW LEVEL SECURITY;

--
-- Name: strategic_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.strategic_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: strategic_themes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.strategic_themes ENABLE ROW LEVEL SECURITY;

--
-- Name: strategy_missions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.strategy_missions ENABLE ROW LEVEL SECURITY;

--
-- Name: strategy_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.strategy_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: strategy_values; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.strategy_values ENABLE ROW LEVEL SECURITY;

--
-- Name: strategy_visions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.strategy_visions ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: subtasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

--
-- Name: team_member_skills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_member_skills ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: team_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: team_point_systems; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_point_systems ENABLE ROW LEVEL SECURITY;

--
-- Name: team_spend_per_sprint; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_spend_per_sprint ENABLE ROW LEVEL SECURITY;

--
-- Name: team_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: test_activity_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: test_case_bulk_operations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_case_bulk_operations ENABLE ROW LEVEL SECURITY;

--
-- Name: test_case_datasets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_case_datasets ENABLE ROW LEVEL SECURITY;

--
-- Name: test_case_parameters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_case_parameters ENABLE ROW LEVEL SECURITY;

--
-- Name: test_case_priorities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_case_priorities ENABLE ROW LEVEL SECURITY;

--
-- Name: test_case_shared_steps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_case_shared_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: test_case_statuses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_case_statuses ENABLE ROW LEVEL SECURITY;

--
-- Name: test_case_steps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_case_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: test_case_version_changes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_case_version_changes ENABLE ROW LEVEL SECURITY;

--
-- Name: test_case_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_case_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: test_case_work_item_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_case_work_item_links ENABLE ROW LEVEL SECURITY;

--
-- Name: test_case_work_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_case_work_items ENABLE ROW LEVEL SECURITY;

--
-- Name: test_cases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;

--
-- Name: test_cycle_case_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_cycle_case_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: test_cycle_dependencies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_cycle_dependencies ENABLE ROW LEVEL SECURITY;

--
-- Name: test_cycle_executions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_cycle_executions ENABLE ROW LEVEL SECURITY;

--
-- Name: test_cycle_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_cycle_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: test_cycles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_cycles ENABLE ROW LEVEL SECURITY;

--
-- Name: test_dashboard_gadgets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_dashboard_gadgets ENABLE ROW LEVEL SECURITY;

--
-- Name: test_dashboard_shares; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_dashboard_shares ENABLE ROW LEVEL SECURITY;

--
-- Name: test_dashboard_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_dashboard_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: test_dashboards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_dashboards ENABLE ROW LEVEL SECURITY;

--
-- Name: test_data_parameters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_data_parameters ENABLE ROW LEVEL SECURITY;

--
-- Name: test_data_rows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_data_rows ENABLE ROW LEVEL SECURITY;

--
-- Name: test_datasets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_datasets ENABLE ROW LEVEL SECURITY;

--
-- Name: test_evidence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_evidence ENABLE ROW LEVEL SECURITY;

--
-- Name: test_execution_defects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_execution_defects ENABLE ROW LEVEL SECURITY;

--
-- Name: test_execution_evidence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_execution_evidence ENABLE ROW LEVEL SECURITY;

--
-- Name: test_execution_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_execution_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: test_execution_step_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_execution_step_results ENABLE ROW LEVEL SECURITY;

--
-- Name: test_execution_steps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_execution_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: test_executions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_executions ENABLE ROW LEVEL SECURITY;

--
-- Name: test_field_configurations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_field_configurations ENABLE ROW LEVEL SECURITY;

--
-- Name: test_folders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_folders ENABLE ROW LEVEL SECURITY;

--
-- Name: test_notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: test_report_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_report_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: test_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: test_run_statuses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_run_statuses ENABLE ROW LEVEL SECURITY;

--
-- Name: test_set_cases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_set_cases ENABLE ROW LEVEL SECURITY;

--
-- Name: test_sets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_sets ENABLE ROW LEVEL SECURITY;

--
-- Name: test_steps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: theme_epic_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.theme_epic_links ENABLE ROW LEVEL SECURITY;

--
-- Name: user_app_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_app_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_email_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_epic_backlog_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_epic_backlog_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_forecast_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_forecast_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_industry_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_industry_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notification_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: user_permission_overrides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

--
-- Name: user_permission_overrides user_permission_overrides_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_permission_overrides_admin_write ON public.user_permission_overrides TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: user_permission_overrides user_permission_overrides_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_permission_overrides_read ON public.user_permission_overrides FOR SELECT TO authenticated USING (true);


--
-- Name: user_product_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_product_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_product_roles user_product_roles_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_product_roles_admin_write ON public.user_product_roles TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: user_product_roles user_product_roles_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_product_roles_read ON public.user_product_roles FOR SELECT TO authenticated USING (true);


--
-- Name: user_role_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_role_history ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_theme_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_theme_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: value_stream_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.value_stream_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: work_item_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.work_item_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: work_item_forecast_ranks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.work_item_forecast_ranks ENABLE ROW LEVEL SECURITY;

--
-- Name: work_item_key_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.work_item_key_history ENABLE ROW LEVEL SECURITY;

--
-- Name: work_item_label_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.work_item_label_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: work_item_labels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.work_item_labels ENABLE ROW LEVEL SECURITY;

--
-- Name: work_item_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.work_item_links ENABLE ROW LEVEL SECURITY;

--
-- Name: work_item_presence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.work_item_presence ENABLE ROW LEVEL SECURITY;

--
-- Name: work_item_rankings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.work_item_rankings ENABLE ROW LEVEL SECURITY;

--
-- Name: work_item_time_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.work_item_time_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: work_item_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.work_item_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: work_item_watchers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.work_item_watchers ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


