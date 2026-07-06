-- CAT-DOCEX-DB-COEDIT-20260705-001 D1 — Notion-style databases with views.
-- A database lives in a workspace; fields define the columns; rows hold
-- values keyed by field id (a row may also anchor a full Docex page);
-- views persist table/board/list/gallery/calendar configs.

create table if not exists public.kb_databases (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.kb_doc_spaces(id) on delete cascade,
  page_id uuid references public.kb_documents(id) on delete set null,
  name text not null,
  icon text,
  slug text not null,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (space_id, slug)
);

create table if not exists public.kb_database_fields (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null references public.kb_databases(id) on delete cascade,
  name text not null,
  type text not null check (type in
    ('text','number','select','multi_select','date','person','checkbox','url','relation')),
  options jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  width_px integer,
  is_visible_default boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists kb_database_fields_db_idx
  on public.kb_database_fields (database_id, position);

create table if not exists public.kb_database_rows (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null references public.kb_databases(id) on delete cascade,
  page_id uuid references public.kb_documents(id) on delete set null,
  values jsonb not null default '{}'::jsonb,
  position double precision not null default 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists kb_database_rows_db_idx
  on public.kb_database_rows (database_id, position);

create table if not exists public.kb_database_views (
  id uuid primary key default gen_random_uuid(),
  database_id uuid not null references public.kb_databases(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('table','board','list','gallery','calendar')),
  config jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists kb_database_views_db_idx
  on public.kb_database_views (database_id, position);

-- Slug: frozen on creation, derived from name, deduped per workspace
-- (slug contract CAT-SLUGS-UNIVERSAL-20260701-001).
create or replace function public.kb_databases_generate_slug()
returns trigger language plpgsql as $$
declare
  base text;
  candidate text;
  n integer := 1;
begin
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;
  base := lower(regexp_replace(coalesce(nullif(trim(new.name), ''), 'database'),
                               '[^a-zA-Z0-9؀-ۿ]+', '-', 'g'));
  base := trim(both '-' from base);
  if base = '' then base := 'database'; end if;
  candidate := base;
  while exists (select 1 from public.kb_databases
                where space_id = new.space_id and slug = candidate) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  new.slug := candidate;
  return new;
end;
$$;

drop trigger if exists kb_databases_slug_trigger on public.kb_databases;
create trigger kb_databases_slug_trigger
  before insert on public.kb_databases
  for each row execute function public.kb_databases_generate_slug();

-- RLS: authenticated (matches current kb_* posture; D5 batch tightens all
-- kb tables to membership together).
alter table public.kb_databases enable row level security;
alter table public.kb_database_fields enable row level security;
alter table public.kb_database_rows enable row level security;
alter table public.kb_database_views enable row level security;

do $$
declare t text;
begin
  foreach t in array array['kb_databases','kb_database_fields','kb_database_rows','kb_database_views'] loop
    execute format('drop policy if exists "authenticated all" on public.%I', t);
    execute format(
      'create policy "authenticated all" on public.%I for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)', t);
  end loop;
end;
$$;
