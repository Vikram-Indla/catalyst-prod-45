
-- ============================================================================
-- CATALYST HIERARCHY CORE — 4-Level Work Item System (hi_ prefix)
-- Epic (1) → Feature (2) → Story (3) → Sub-task (4)
-- Flexible parenting: Story can be under Epic OR Feature
-- ============================================================================

create extension if not exists "uuid-ossp";

-- Hierarchy levels
create table if not exists hi_hierarchy_levels (
    id int primary key,
    name text not null,
    color text not null,
    color_text text not null,
    icon text not null,
    sort_order int not null
);

insert into hi_hierarchy_levels (id, name, color, color_text, icon, sort_order) values
    (1, 'Epic',     '#2563EB', '#1D4ED8', 'zap',         1),
    (2, 'Feature',  '#7C3AED', '#6D28D9', 'puzzle',      2),
    (3, 'Story',    '#16A34A', '#15803D', 'book-open',    3),
    (4, 'Sub-task', '#64748B', '#475569', 'list-checks',  4)
on conflict (id) do nothing;

-- Priorities
create table if not exists hi_priorities (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    color text not null,
    color_text text not null,
    icon text,
    sort_order int not null
);

insert into hi_priorities (name, color, color_text, sort_order)
select * from (values
    ('Critical', '#DC2626', '#D92525', 1),
    ('High',     '#D97706', '#AF6003', 2),
    ('Medium',   '#2563EB', '#1D4ED8', 3),
    ('Low',      '#16A34A', '#15803D', 4),
    ('Trivial',  '#64748B', '#475569', 5)
) as v(name, color, color_text, sort_order)
where not exists (select 1 from hi_priorities limit 1);

-- Statuses (project-scoped)
create table if not exists hi_statuses (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    color text not null,
    color_text text not null,
    is_default boolean default false,
    is_terminal boolean default false,
    sort_order int not null,
    project_id uuid references projects(id) on delete cascade
);

-- Project versions
create table if not exists hi_project_versions (
    id uuid default gen_random_uuid() primary key,
    project_id uuid not null references projects(id) on delete cascade,
    name text not null,
    description text,
    start_date date,
    release_date date,
    status text default 'planning'
        check (status in ('planning', 'development', 'testing', 'released', 'archived')),
    released boolean default false,
    archived boolean default false,
    created_at timestamptz default now()
);

-- Key sequence (race-safe key generation)
create table if not exists hi_project_sequences (
    project_id uuid primary key references projects(id) on delete cascade,
    last_number int not null default 0
);

-- Work items
create table if not exists hi_work_items (
    id uuid default gen_random_uuid() primary key,
    project_id uuid not null references projects(id) on delete cascade,
    key text not null unique,
    number int not null,
    hierarchy_level int not null references hi_hierarchy_levels(id),
    parent_id uuid references hi_work_items(id) on delete set null,
    root_id uuid references hi_work_items(id) on delete cascade,
    title text not null,
    description jsonb default null,
    status_id uuid not null references hi_statuses(id),
    priority_id uuid references hi_priorities(id),
    assignee_id uuid references auth.users(id),
    reporter_id uuid not null references auth.users(id),
    fix_version_id uuid references hi_project_versions(id),
    labels text[] default '{}',
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    resolved_at timestamptz,
    due_date date,
    last_modified_by uuid references auth.users(id),
    version int default 1
);

-- Indexes
create index if not exists idx_hiwi_project on hi_work_items(project_id);
create index if not exists idx_hiwi_parent on hi_work_items(parent_id);
create index if not exists idx_hiwi_root on hi_work_items(root_id);
create index if not exists idx_hiwi_hierarchy on hi_work_items(hierarchy_level);
create index if not exists idx_hiwi_assignee on hi_work_items(assignee_id);
create index if not exists idx_hiwi_status on hi_work_items(status_id);
create index if not exists idx_hiwi_updated on hi_work_items(updated_at desc);
create index if not exists idx_hiwi_parent_level on hi_work_items(parent_id, hierarchy_level);

-- Trigger: Auto-generate key (PROJ-123) with atomic sequence
create or replace function hi_generate_work_item_key()
returns trigger as $$
declare
    proj_key text;
    next_num int;
begin
    select p.key into proj_key from projects p where p.id = new.project_id;
    insert into hi_project_sequences (project_id, last_number)
    values (new.project_id, 1)
    on conflict (project_id)
    do update set last_number = hi_project_sequences.last_number + 1
    returning last_number into next_num;
    new.key := proj_key || '-' || next_num;
    new.number := next_num;
    if new.parent_id is null then
        new.root_id := new.id;
    else
        select root_id into new.root_id from hi_work_items where id = new.parent_id;
    end if;
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_hi_generate_key on hi_work_items;
create trigger trg_hi_generate_key
    before insert on hi_work_items
    for each row execute function hi_generate_work_item_key();

-- Trigger: Validate parent hierarchy (flexible model)
create or replace function hi_validate_parent_level()
returns trigger as $$
declare
    parent_level int;
begin
    if new.parent_id is null then
        if new.hierarchy_level != 1 then
            raise exception 'Only Epics (level 1) can exist without a parent';
        end if;
        return new;
    end if;
    select hierarchy_level into parent_level from hi_work_items where id = new.parent_id;
    case new.hierarchy_level
        when 2 then
            if parent_level != 1 then
                raise exception 'Feature must be child of Epic (got level %)', parent_level;
            end if;
        when 3 then
            if parent_level not in (1, 2) then
                raise exception 'Story must be child of Epic or Feature (got level %)', parent_level;
            end if;
        when 4 then
            if parent_level != 3 then
                raise exception 'Sub-task must be child of Story (got level %)', parent_level;
            end if;
        else null;
    end case;
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_hi_validate_parent on hi_work_items;
create trigger trg_hi_validate_parent
    before insert or update of parent_id, hierarchy_level on hi_work_items
    for each row execute function hi_validate_parent_level();

-- Trigger: Prevent circular references
create or replace function hi_check_hierarchy_cycle()
returns trigger as $$
begin
    if new.parent_id is null then return new; end if;
    if new.parent_id = new.id then
        raise exception 'Work item cannot be its own parent';
    end if;
    if exists (
        with recursive descendants as (
            select id from hi_work_items where parent_id = new.id
            union all
            select wi.id from hi_work_items wi join descendants d on wi.parent_id = d.id
        )
        select 1 from descendants where id = new.parent_id
    ) then
        raise exception 'Circular hierarchy detected';
    end if;
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_hi_check_cycle on hi_work_items;
create trigger trg_hi_check_cycle
    before insert or update of parent_id on hi_work_items
    for each row execute function hi_check_hierarchy_cycle();

-- Trigger: Auto-increment version on update
create or replace function hi_update_work_item_version()
returns trigger as $$
begin
    new.updated_at := now();
    new.version := old.version + 1;
    new.last_modified_by := auth.uid();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_hi_version_update on hi_work_items;
create trigger trg_hi_version_update
    before update on hi_work_items
    for each row execute function hi_update_work_item_version();

-- RPC: Get full hierarchy tree
create or replace function hi_get_hierarchy_tree(p_root_id uuid)
returns table (
    id uuid, key text, title text, hierarchy_level int, parent_id uuid, root_id uuid,
    status_id uuid, status_name text, status_color text, status_color_text text, status_is_terminal boolean,
    assignee_id uuid, assignee_email text, assignee_display_name text,
    priority_name text, priority_color text, priority_color_text text,
    fix_version_id uuid, fix_version_name text,
    hierarchy_color text, hierarchy_color_text text, hierarchy_name text,
    total_descendants bigint, completed_count bigint,
    due_date date, labels text[], created_at timestamptz, updated_at timestamptz
) as $$
with recursive tree as (
    select wi.*, st.name as status_name, st.color as status_color, st.color_text as status_color_text,
        st.is_terminal as status_is_terminal,
        usr.email as assignee_email,
        coalesce(usr.raw_user_meta_data->>'full_name', usr.email) as assignee_display_name,
        pri.name as priority_name, pri.color as priority_color, pri.color_text as priority_color_text,
        pv.name as fix_version_name,
        hl.color as hierarchy_color, hl.color_text as hierarchy_color_text, hl.name as hierarchy_name,
        1 as depth
    from hi_work_items wi
    left join hi_statuses st on st.id = wi.status_id
    left join auth.users usr on usr.id = wi.assignee_id
    left join hi_priorities pri on pri.id = wi.priority_id
    left join hi_project_versions pv on pv.id = wi.fix_version_id
    left join hi_hierarchy_levels hl on hl.id = wi.hierarchy_level
    where wi.id = p_root_id
    union all
    select wi.*, st.name, st.color, st.color_text, st.is_terminal,
        usr.email, coalesce(usr.raw_user_meta_data->>'full_name', usr.email),
        pri.name, pri.color, pri.color_text, pv.name,
        hl.color, hl.color_text, hl.name, t.depth + 1
    from hi_work_items wi
    join tree t on wi.parent_id = t.id
    left join hi_statuses st on st.id = wi.status_id
    left join auth.users usr on usr.id = wi.assignee_id
    left join hi_priorities pri on pri.id = wi.priority_id
    left join hi_project_versions pv on pv.id = wi.fix_version_id
    left join hi_hierarchy_levels hl on hl.id = wi.hierarchy_level
    where wi.root_id = p_root_id
),
stats as (
    select t.parent_id, count(*) as cnt,
        count(*) filter (where t.status_is_terminal = true) as completed
    from tree t where t.parent_id is not null group by t.parent_id
)
select t.id, t.key, t.title, t.hierarchy_level, t.parent_id, t.root_id,
    t.status_id, t.status_name, t.status_color, t.status_color_text, t.status_is_terminal,
    t.assignee_id, t.assignee_email, t.assignee_display_name,
    t.priority_name, t.priority_color, t.priority_color_text,
    t.fix_version_id, t.fix_version_name,
    t.hierarchy_color, t.hierarchy_color_text, t.hierarchy_name,
    coalesce(s.cnt, 0), coalesce(s.completed, 0),
    t.due_date, t.labels, t.created_at, t.updated_at
from tree t left join stats s on s.parent_id = t.id
order by t.depth, t.created_at;
$$ language sql stable;

-- RPC: Validate hierarchy move
create or replace function hi_validate_hierarchy_move(p_node_id uuid, p_new_parent_id uuid)
returns boolean as $$
declare
    node_level int;
    parent_level int;
begin
    select hierarchy_level into node_level from hi_work_items where id = p_node_id;
    select hierarchy_level into parent_level from hi_work_items where id = p_new_parent_id;
    case node_level
        when 2 then if parent_level != 1 then return false; end if;
        when 3 then if parent_level not in (1, 2) then return false; end if;
        when 4 then if parent_level != 3 then return false; end if;
        else return false;
    end case;
    if exists (
        with recursive ancestors as (
            select id, parent_id from hi_work_items where id = p_new_parent_id
            union all
            select wi.id, wi.parent_id from hi_work_items wi join ancestors a on wi.id = a.parent_id
        )
        select 1 from ancestors where id = p_node_id
    ) then return false; end if;
    return true;
end;
$$ language plpgsql;

-- RPC: Flat list for backlog view
create or replace function hi_get_project_work_items(
    p_project_id uuid, p_hierarchy_level int default null,
    p_status_id uuid default null, p_limit int default 100, p_offset int default 0
)
returns table (
    id uuid, key text, title text, hierarchy_level int, hierarchy_name text,
    hierarchy_color text, hierarchy_color_text text, parent_id uuid, parent_key text,
    status_name text, status_color text, status_color_text text,
    priority_name text, priority_color text, priority_color_text text,
    assignee_display_name text, fix_version_name text,
    due_date date, created_at timestamptz, updated_at timestamptz
) as $$
select wi.id, wi.key, wi.title, wi.hierarchy_level,
    hl.name, hl.color, hl.color_text, wi.parent_id,
    pw.key as parent_key,
    st.name, st.color, st.color_text,
    pri.name, pri.color, pri.color_text,
    coalesce(usr.raw_user_meta_data->>'full_name', usr.email),
    pv.name, wi.due_date, wi.created_at, wi.updated_at
from hi_work_items wi
left join hi_work_items pw on pw.id = wi.parent_id
left join hi_hierarchy_levels hl on hl.id = wi.hierarchy_level
left join hi_statuses st on st.id = wi.status_id
left join hi_priorities pri on pri.id = wi.priority_id
left join auth.users usr on usr.id = wi.assignee_id
left join hi_project_versions pv on pv.id = wi.fix_version_id
where wi.project_id = p_project_id
  and (p_hierarchy_level is null or wi.hierarchy_level = p_hierarchy_level)
  and (p_status_id is null or wi.status_id = p_status_id)
order by wi.updated_at desc limit p_limit offset p_offset;
$$ language sql stable;

-- RLS
alter table hi_work_items enable row level security;
alter table hi_statuses enable row level security;
alter table hi_project_versions enable row level security;

create policy "hi_wi_select" on hi_work_items for select using (exists (
    select 1 from project_members pm where pm.project_id = hi_work_items.project_id and pm.user_id = auth.uid()
));
create policy "hi_wi_insert" on hi_work_items for insert with check (exists (
    select 1 from project_members pm where pm.project_id = hi_work_items.project_id and pm.user_id = auth.uid() and pm.role in ('admin', 'editor')
));
create policy "hi_wi_update" on hi_work_items for update using (exists (
    select 1 from project_members pm where pm.project_id = hi_work_items.project_id and pm.user_id = auth.uid() and pm.role in ('admin', 'editor')
));
create policy "hi_wi_delete" on hi_work_items for delete using (exists (
    select 1 from project_members pm where pm.project_id = hi_work_items.project_id and pm.user_id = auth.uid() and pm.role = 'admin'
));
create policy "hi_st_select" on hi_statuses for select using (exists (
    select 1 from project_members pm where pm.project_id = hi_statuses.project_id and pm.user_id = auth.uid()
));
create policy "hi_pv_select" on hi_project_versions for select using (exists (
    select 1 from project_members pm where pm.project_id = hi_project_versions.project_id and pm.user_id = auth.uid()
));

-- Realtime
alter publication supabase_realtime add table hi_work_items;

-- ═══════════════════════════════════════════════════════════════
-- AUTO-PROVISION: Every new project gets default hierarchy statuses
-- ═══════════════════════════════════════════════════════════════
create or replace function hi_provision_project_defaults()
returns trigger as $$
begin
  insert into hi_statuses (name, color, color_text, is_default, is_terminal, sort_order, project_id)
  values
    ('Backlog',     '#64748B', '#475569', true,  false, 1, new.id),
    ('To Do',       '#2563EB', '#1D4ED8', false, false, 2, new.id),
    ('In Progress', '#0D9488', '#0A8277', false, false, 3, new.id),
    ('In Review',   '#D97706', '#AF6003', false, false, 4, new.id),
    ('Done',        '#16A34A', '#11853D', false, true,  5, new.id),
    ('Blocked',     '#DC2626', '#D92525', false, false, 6, new.id);

  insert into hi_project_sequences (project_id, last_number)
  values (new.id, 0)
  on conflict do nothing;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_hi_provision_project on projects;
create trigger trg_hi_provision_project
    after insert on projects
    for each row
    execute function hi_provision_project_defaults();
