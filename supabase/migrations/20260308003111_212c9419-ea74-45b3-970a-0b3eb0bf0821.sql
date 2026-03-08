
-- TABLE: boards
create table if not exists public.boards (
  id              uuid        default gen_random_uuid() primary key,
  name            text        not null,
  description     text,
  icon            text        default '📋',
  color           text        default '#2563EB',
  project_id      uuid        references public.projects(id) on delete cascade,
  is_personal     boolean     not null default false,
  visibility      text        not null default 'project',
  filter_project_ids uuid[]   not null default '{}',
  filter_config   jsonb       not null default '{}'::jsonb,
  board_type      text        not null default 'kanban',
  swimlane_type   text        not null default 'none',
  show_swimlanes  boolean     not null default true,
  is_starred      boolean     not null default false,
  sort_order      int         not null default 0,
  last_viewed_at  timestamptz,
  created_by      uuid        not null,
  updated_by      uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- TABLE: board_columns
create table if not exists public.board_columns (
  id          uuid    default gen_random_uuid() primary key,
  board_id    uuid    not null references public.boards(id) on delete cascade,
  name        text    not null,
  position    int     not null,
  color       text,
  status_ids  uuid[]  not null default '{}',
  is_backlog  boolean not null default false,
  is_done     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(board_id, position),
  unique(board_id, name)
);

-- TABLE: board_issue_rank
create table if not exists public.board_issue_rank (
  id            uuid    default gen_random_uuid() primary key,
  board_id      uuid    not null references public.boards(id) on delete cascade,
  work_item_id  uuid    not null,
  rank_value    text    not null,
  column_id     uuid    references public.board_columns(id) on delete set null,
  updated_at    timestamptz not null default now(),
  unique(board_id, work_item_id)
);

-- TABLE: board_members
create table if not exists public.board_members (
  id            uuid    default gen_random_uuid() primary key,
  board_id      uuid    not null references public.boards(id) on delete cascade,
  user_id       uuid    not null,
  role          text    not null default 'viewer',
  is_starred    boolean not null default false,
  last_viewed_at timestamptz,
  created_at    timestamptz not null default now(),
  unique(board_id, user_id)
);

-- TABLE: board_quick_filters
create table if not exists public.board_quick_filters (
  id          uuid    default gen_random_uuid() primary key,
  board_id    uuid    not null references public.boards(id) on delete cascade,
  name        text    not null,
  filter_type text    not null,
  filter_value jsonb  not null default '{}'::jsonb,
  is_system   boolean not null default false,
  sort_order  int     not null default 0,
  created_at  timestamptz not null default now()
);

-- INDEXES
create index if not exists idx_boards_project_id    on public.boards(project_id) where deleted_at is null;
create index if not exists idx_boards_created_by    on public.boards(created_by) where deleted_at is null;
create index if not exists idx_board_columns_board  on public.board_columns(board_id, position);
create index if not exists idx_board_members_user   on public.board_members(user_id);
create index if not exists idx_issue_rank_board     on public.board_issue_rank(board_id, rank_value);

-- RLS
alter table public.boards            enable row level security;
alter table public.board_columns     enable row level security;
alter table public.board_members     enable row level security;
alter table public.board_issue_rank  enable row level security;
alter table public.board_quick_filters enable row level security;

-- RLS policies for boards
create policy "boards_select" on public.boards for select using (
  deleted_at is null and (
    (project_id is not null and visibility != 'private' and
      exists(select 1 from public.project_members pm where pm.project_id = boards.project_id and pm.user_id = auth.uid()))
    or (visibility = 'private' and created_by = auth.uid())
    or (visibility = 'global')
    or exists(select 1 from public.board_members bm where bm.board_id = boards.id and bm.user_id = auth.uid())
  )
);
create policy "boards_insert" on public.boards for insert with check (created_by = auth.uid());
create policy "boards_update" on public.boards for update using (
  created_by = auth.uid() or
  exists(select 1 from public.board_members bm where bm.board_id = boards.id and bm.user_id = auth.uid() and bm.role = 'admin')
);

-- RLS policies for board_columns
create policy "board_columns_select" on public.board_columns for select using (
  exists(select 1 from public.boards b where b.id = board_columns.board_id and b.deleted_at is null)
);
create policy "board_columns_insert" on public.board_columns for insert with check (
  exists(select 1 from public.boards b where b.id = board_columns.board_id and (b.created_by = auth.uid() or exists(select 1 from public.board_members bm where bm.board_id = b.id and bm.user_id = auth.uid() and bm.role in ('admin','editor'))))
);
create policy "board_columns_update" on public.board_columns for update using (
  exists(select 1 from public.boards b where b.id = board_columns.board_id and (b.created_by = auth.uid() or exists(select 1 from public.board_members bm where bm.board_id = b.id and bm.user_id = auth.uid() and bm.role in ('admin','editor'))))
);
create policy "board_columns_delete" on public.board_columns for delete using (
  exists(select 1 from public.boards b where b.id = board_columns.board_id and (b.created_by = auth.uid() or exists(select 1 from public.board_members bm where bm.board_id = b.id and bm.user_id = auth.uid() and bm.role = 'admin')))
);

-- RLS policies for board_issue_rank
create policy "issue_rank_select" on public.board_issue_rank for select using (
  exists(select 1 from public.boards b where b.id = board_issue_rank.board_id and b.deleted_at is null)
);
create policy "issue_rank_insert" on public.board_issue_rank for insert with check (
  exists(select 1 from public.boards b where b.id = board_issue_rank.board_id and (b.created_by = auth.uid() or exists(select 1 from public.board_members bm where bm.board_id = b.id and bm.user_id = auth.uid())))
);
create policy "issue_rank_update" on public.board_issue_rank for update using (
  exists(select 1 from public.boards b where b.id = board_issue_rank.board_id and (b.created_by = auth.uid() or exists(select 1 from public.board_members bm where bm.board_id = b.id and bm.user_id = auth.uid())))
);
create policy "issue_rank_delete" on public.board_issue_rank for delete using (
  exists(select 1 from public.boards b where b.id = board_issue_rank.board_id and (b.created_by = auth.uid() or exists(select 1 from public.board_members bm where bm.board_id = b.id and bm.user_id = auth.uid())))
);

-- RLS policies for board_members
create policy "board_members_select" on public.board_members for select using (
  exists(select 1 from public.boards b where b.id = board_members.board_id and b.deleted_at is null)
);
create policy "board_members_insert" on public.board_members for insert with check (
  exists(select 1 from public.boards b where b.id = board_members.board_id and (b.created_by = auth.uid() or exists(select 1 from public.board_members bm where bm.board_id = b.id and bm.user_id = auth.uid() and bm.role = 'admin')))
);
create policy "board_members_update" on public.board_members for update using (
  exists(select 1 from public.boards b where b.id = board_members.board_id and (b.created_by = auth.uid() or exists(select 1 from public.board_members bm where bm.board_id = b.id and bm.user_id = auth.uid() and bm.role = 'admin')))
);
create policy "board_members_delete" on public.board_members for delete using (
  exists(select 1 from public.boards b where b.id = board_members.board_id and (b.created_by = auth.uid() or exists(select 1 from public.board_members bm where bm.board_id = b.id and bm.user_id = auth.uid() and bm.role = 'admin')))
);

-- RLS policies for board_quick_filters
create policy "board_quick_filters_select" on public.board_quick_filters for select using (
  exists(select 1 from public.boards b where b.id = board_quick_filters.board_id and b.deleted_at is null)
);
create policy "board_quick_filters_insert" on public.board_quick_filters for insert with check (
  exists(select 1 from public.boards b where b.id = board_quick_filters.board_id and (b.created_by = auth.uid() or exists(select 1 from public.board_members bm where bm.board_id = b.id and bm.user_id = auth.uid() and bm.role in ('admin','editor'))))
);

-- REALTIME
alter publication supabase_realtime add table public.boards;
alter publication supabase_realtime add table public.board_columns;
alter publication supabase_realtime add table public.board_issue_rank;

-- FACTORY FUNCTION
create or replace function public.create_board(
  p_name text,
  p_project_id uuid default null,
  p_is_personal boolean default false,
  p_visibility text default 'project',
  p_swimlane_type text default 'none',
  p_color text default '#2563EB',
  p_columns jsonb default null,
  p_user_id uuid default null
) returns uuid language plpgsql security definer as $$
declare
  v_board_id uuid;
  v_col jsonb;
  v_pos int := 0;
  v_uid uuid := coalesce(p_user_id, auth.uid());
  v_default_cols jsonb := coalesce(p_columns, '[
    {"name":"To Do","is_backlog":true,"is_done":false},
    {"name":"In Progress","is_backlog":false,"is_done":false},
    {"name":"Done","is_backlog":false,"is_done":true}
  ]'::jsonb);
begin
  insert into public.boards(name, project_id, is_personal, visibility, swimlane_type,
    show_swimlanes, color, filter_project_ids, created_by, updated_by)
  values(p_name, p_project_id, p_is_personal, p_visibility, p_swimlane_type,
    true, p_color,
    case when p_project_id is not null then array[p_project_id] else '{}'::uuid[] end,
    v_uid, v_uid)
  returning id into v_board_id;

  for v_col in select * from jsonb_array_elements(v_default_cols) loop
    insert into public.board_columns(board_id, name, position, status_ids, is_backlog, is_done)
    values(v_board_id, v_col->>'name', v_pos, '{}',
      coalesce((v_col->>'is_backlog')::boolean, false),
      coalesce((v_col->>'is_done')::boolean, false));
    v_pos := v_pos + 1;
  end loop;

  insert into public.board_quick_filters(board_id, name, filter_type, is_system, sort_order) values
    (v_board_id, 'All Issues', 'all', true, 0),
    (v_board_id, 'My Issues', 'mine', true, 1),
    (v_board_id, 'Current Release', 'release', true, 2);

  insert into public.board_members(board_id, user_id, role)
  values(v_board_id, v_uid, 'admin')
  on conflict(board_id, user_id) do nothing;

  return v_board_id;
end;
$$;
