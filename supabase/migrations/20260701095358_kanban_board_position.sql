-- Kanban canonical board — persistent per-column reorder ("Move work item" menu).
-- Adds board_position bigint on every table the canonical KanbanPage reads,
-- plus a single RPC that atomically swaps / bumps positions for Up/Down/Top/Bottom.
--
-- Tables (one per mode):
--   ph_issues        (project, incident)
--   business_requests (product)
--   rh_releases      (release)
--   tasks            (tasks)
--   tm_test_cases    (test)
--
-- Legacy rows keep board_position = NULL; read order uses `nullsLast` so
-- unreordered items fall back to their existing tiebreaker (updated_at desc).

alter table public.ph_issues         add column if not exists board_position bigint;
alter table public.business_requests add column if not exists board_position bigint;
alter table public.rh_releases       add column if not exists board_position bigint;
alter table public.tasks             add column if not exists board_position bigint;
alter table public.tm_test_cases     add column if not exists board_position bigint;

create index if not exists idx_ph_issues_board_position         on public.ph_issues         (board_position);
create index if not exists idx_business_requests_board_position on public.business_requests (board_position);
create index if not exists idx_rh_releases_board_position       on public.rh_releases       (board_position);
create index if not exists idx_tasks_board_position             on public.tasks             (board_position);
create index if not exists idx_tm_test_cases_board_position     on public.tm_test_cases     (board_position);

comment on column public.ph_issues.board_position         is 'Kanban per-column rank. NULL = never manually reordered.';
comment on column public.business_requests.board_position is 'Kanban per-column rank. NULL = never manually reordered.';
comment on column public.rh_releases.board_position       is 'Kanban per-column rank. NULL = never manually reordered.';
comment on column public.tasks.board_position             is 'Kanban per-column rank. NULL = never manually reordered.';
comment on column public.tm_test_cases.board_position     is 'Kanban per-column rank. NULL = never manually reordered.';

-- ────────────────────────────────────────────────────────────────────────────
-- RPC: kanban_move_position
--
-- Atomically reorders one card within its column. Server-side so two users
-- reordering the same column at the same time cannot swap into the same slot.
--
-- Contract:
--   p_table       whitelist: 'ph_issues' | 'business_requests' | 'rh_releases'
--                            | 'tasks' | 'tm_test_cases'
--   p_issue_id    uuid of the row to move
--   p_direction   'up' | 'down' | 'top' | 'bottom'
--   p_column_ids  the full ordered list of row ids in the card's current
--                 column, as seen by the client (position ASC nullsLast,
--                 then updated_at DESC). Used to (a) locate the neighbour
--                 for up/down swaps and (b) initialise board_position for
--                 columns that still have any NULL rows.
--
-- Behavior:
--   • First run per column: assigns 1024, 2048, 3072, … to every row in
--     p_column_ids so every row has a definite rank.
--   • up   → swap board_position with the previous row in p_column_ids
--   • down → swap board_position with the next row in p_column_ids
--   • top  → set board_position to (min in column) - 1024
--   • bottom → set board_position to (max in column) + 1024
--   • no-op if the card is already at the boundary (client also disables
--     the menu items, this is defensive).
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.kanban_move_position(
  p_table       text,
  p_issue_id    uuid,
  p_direction   text,
  p_column_ids  uuid[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed   constant text[] := array['ph_issues','business_requests','rh_releases','tasks','tm_test_cases'];
  v_idx       int;
  v_len       int;
  v_neighbour uuid;
  v_null_count int;
  i           int;
  v_my_pos    bigint;
  v_nb_pos    bigint;
  v_min       bigint;
  v_max       bigint;
begin
  if not (p_table = any(v_allowed)) then
    raise exception 'kanban_move_position: table % not allowed', p_table;
  end if;
  if p_direction not in ('up','down','top','bottom') then
    raise exception 'kanban_move_position: direction % invalid', p_direction;
  end if;
  if p_column_ids is null or array_length(p_column_ids, 1) is null then
    raise exception 'kanban_move_position: p_column_ids empty';
  end if;

  v_len := array_length(p_column_ids, 1);

  -- Locate the moving card's index (1-based) in the client's ordered list.
  v_idx := null;
  for i in 1..v_len loop
    if p_column_ids[i] = p_issue_id then
      v_idx := i;
      exit;
    end if;
  end loop;
  if v_idx is null then
    raise exception 'kanban_move_position: issue % not in column list', p_issue_id;
  end if;

  -- If any row in the column still has NULL board_position, seed all of them
  -- so subsequent swaps have real values to work with. Uses 1024-step gaps
  -- so future top/bottom inserts don't have to renumber the whole column.
  execute format(
    'select count(*) from %I where id = any($1) and board_position is null',
    p_table
  ) into v_null_count using p_column_ids;

  if v_null_count > 0 then
    for i in 1..v_len loop
      execute format(
        'update %I set board_position = $1 where id = $2',
        p_table
      ) using (i * 1024)::bigint, p_column_ids[i];
    end loop;
  end if;

  -- Boundary no-ops (defensive; client should have disabled these).
  if (p_direction in ('up','top')   and v_idx = 1)     then return; end if;
  if (p_direction in ('down','bottom') and v_idx = v_len) then return; end if;

  if p_direction in ('up','down') then
    v_neighbour := case p_direction
      when 'up'   then p_column_ids[v_idx - 1]
      when 'down' then p_column_ids[v_idx + 1]
    end;

    execute format('select board_position from %I where id = $1', p_table)
      into v_my_pos using p_issue_id;
    execute format('select board_position from %I where id = $1', p_table)
      into v_nb_pos using v_neighbour;

    execute format('update %I set board_position = $1 where id = $2', p_table)
      using v_nb_pos, p_issue_id;
    execute format('update %I set board_position = $1 where id = $2', p_table)
      using v_my_pos, v_neighbour;
    return;
  end if;

  -- top / bottom: recompute min/max of the column set and put us outside it.
  execute format(
    'select min(board_position), max(board_position) from %I where id = any($1)',
    p_table
  ) into v_min, v_max using p_column_ids;

  if p_direction = 'top' then
    execute format('update %I set board_position = $1 where id = $2', p_table)
      using coalesce(v_min, 0) - 1024, p_issue_id;
  else
    execute format('update %I set board_position = $1 where id = $2', p_table)
      using coalesce(v_max, 0) + 1024, p_issue_id;
  end if;
end;
$$;

grant execute on function public.kanban_move_position(text, uuid, text, uuid[]) to authenticated;
grant execute on function public.kanban_move_position(text, uuid, text, uuid[]) to anon;
