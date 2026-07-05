-- CAT-TESTHUB-REBUILD-20260704-001 Phase 1
-- tm_activity_log: field-change history / audit trail for test-management entities.
-- Mirrors public.ph_activity_log (work-item audit trail) but keyed for TestHub entities
-- (test_case / test_step). Step activity is logged under the parent case's id so the
-- case history surface can render step add/update/delete alongside case field changes.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.tm_activity_log (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,                       -- 'test_case' | 'test_step'
  entity_id   uuid not null,                       -- always a tm_test_cases.id (steps log under parent case)
  user_id     uuid default auth.uid(),             -- nullable; NULL for system/trigger-less context
  action      text not null,                       -- created|updated|deleted|status_changed|step_added|step_updated|step_deleted
  field_name  text,
  old_value   text,
  new_value   text,
  metadata    jsonb default '{}'::jsonb,           -- mirrors ph_activity_log shape; reserved for future use
  created_at  timestamptz default now()
);

create index if not exists tm_activity_log_entity_idx
  on public.tm_activity_log (entity_type, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS (mirrors tm_test_steps idiom: access gated via parent test case's project)
-- ---------------------------------------------------------------------------
alter table public.tm_activity_log enable row level security;

drop policy if exists tm_activity_log_select on public.tm_activity_log;
create policy tm_activity_log_select on public.tm_activity_log
  for select
  using (
    exists (
      select 1
      from public.tm_test_cases tc
      where tc.id = tm_activity_log.entity_id
        and public.tm_user_has_access(auth.uid(), tc.project_id)
    )
  );

-- INSERT allowed to authenticated. Triggers are SECURITY DEFINER and bypass RLS,
-- so this policy only governs any direct client insert path.
drop policy if exists tm_activity_log_insert on public.tm_activity_log;
create policy tm_activity_log_insert on public.tm_activity_log
  for insert
  to authenticated
  with check (true);

-- ---------------------------------------------------------------------------
-- Trigger fn: tm_test_cases INSERT -> one 'created' row
-- ---------------------------------------------------------------------------
create or replace function public.tm_activity_log_case_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tm_activity_log (entity_type, entity_id, user_id, action)
  values ('test_case', new.id, auth.uid(), 'created');
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger fn: tm_test_cases UPDATE -> one row per changed tracked field
--   tracked: status, title, priority_id, assigned_to
--   status change -> action 'status_changed', else 'updated'
-- ---------------------------------------------------------------------------
create or replace function public.tm_activity_log_case_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.tm_activity_log (entity_type, entity_id, user_id, action, field_name, old_value, new_value)
    values ('test_case', new.id, auth.uid(), 'status_changed', 'status', old.status::text, new.status::text);
  end if;

  if new.title is distinct from old.title then
    insert into public.tm_activity_log (entity_type, entity_id, user_id, action, field_name, old_value, new_value)
    values ('test_case', new.id, auth.uid(), 'updated', 'title', old.title::text, new.title::text);
  end if;

  if new.priority_id is distinct from old.priority_id then
    insert into public.tm_activity_log (entity_type, entity_id, user_id, action, field_name, old_value, new_value)
    values ('test_case', new.id, auth.uid(), 'updated', 'priority_id', old.priority_id::text, new.priority_id::text);
  end if;

  if new.assigned_to is distinct from old.assigned_to then
    insert into public.tm_activity_log (entity_type, entity_id, user_id, action, field_name, old_value, new_value)
    values ('test_case', new.id, auth.uid(), 'updated', 'assigned_to', old.assigned_to::text, new.assigned_to::text);
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger fn: tm_test_steps INSERT/UPDATE/DELETE
--   entity_type = 'test_case', entity_id = step's test_case_id
--   INSERT           -> 'step_added'
--   soft delete      -> 'step_deleted' (UPDATE that sets deleted_at from NULL)
--   other UPDATE     -> 'step_updated'
--   hard DELETE      -> 'step_deleted'
--   field_name = 'step '||step_number
-- ---------------------------------------------------------------------------
create or replace function public.tm_activity_log_step_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_case   uuid;
  v_num    integer;
begin
  if tg_op = 'INSERT' then
    v_action := 'step_added';
    v_case   := new.test_case_id;
    v_num    := new.step_number;
  elsif tg_op = 'DELETE' then
    v_action := 'step_deleted';
    v_case   := old.test_case_id;
    v_num    := old.step_number;
  else -- UPDATE
    v_case := new.test_case_id;
    v_num  := new.step_number;
    if new.deleted_at is not null and old.deleted_at is null then
      v_action := 'step_deleted';    -- soft delete
    else
      v_action := 'step_updated';
    end if;
  end if;

  insert into public.tm_activity_log (entity_type, entity_id, user_id, action, field_name)
  values ('test_case', v_case, auth.uid(), v_action, 'step ' || v_num::text);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
drop trigger if exists tm_test_cases_activity_insert on public.tm_test_cases;
create trigger tm_test_cases_activity_insert
  after insert on public.tm_test_cases
  for each row execute function public.tm_activity_log_case_insert();

drop trigger if exists tm_test_cases_activity_update on public.tm_test_cases;
create trigger tm_test_cases_activity_update
  after update on public.tm_test_cases
  for each row execute function public.tm_activity_log_case_update();

drop trigger if exists tm_test_steps_activity_change on public.tm_test_steps;
create trigger tm_test_steps_activity_change
  after insert or update or delete on public.tm_test_steps
  for each row execute function public.tm_activity_log_step_change();
