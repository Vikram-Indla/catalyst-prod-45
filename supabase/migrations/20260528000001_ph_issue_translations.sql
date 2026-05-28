-- ph_issue_translations
-- Cache translated text keyed by (issue_key, field, target_lang).
-- source_hash (sha256 of source text) detects stale entries so the
-- client can invalidate and re-translate when the source changes.
--
-- Fields: 'summary' | 'description' | 'comment:<comment_id>'

create table if not exists public.ph_issue_translations (
  id              uuid        primary key default gen_random_uuid(),
  issue_key       text        not null,
  field           text        not null,   -- 'summary' | 'description' | 'comment:<id>'
  source_lang     text        not null,   -- 'en' | 'ar'
  target_lang     text        not null,   -- 'en' | 'ar'
  source_hash     text        not null,   -- sha256(source_text) for cache invalidation
  translated_text text        not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint ph_issue_translations_unique
    unique (issue_key, field, target_lang)
);

-- Auto-update updated_at on upsert
create or replace trigger ph_issue_translations_updated_at
  before update on public.ph_issue_translations
  for each row execute function moddatetime(updated_at);

alter table public.ph_issue_translations enable row level security;

-- Translations are non-PII; any authenticated user can read them.
create policy "ph_issue_translations_select"
  on public.ph_issue_translations
  for select to authenticated
  using (true);

-- Any authenticated user can write translations (created by the client).
create policy "ph_issue_translations_insert"
  on public.ph_issue_translations
  for insert to authenticated
  with check (true);

create policy "ph_issue_translations_update"
  on public.ph_issue_translations
  for update to authenticated
  using (true)
  with check (true);

-- Index for the cache-hit lookup path
create index if not exists ph_issue_translations_lookup_idx
  on public.ph_issue_translations (issue_key, field, target_lang, source_hash);
