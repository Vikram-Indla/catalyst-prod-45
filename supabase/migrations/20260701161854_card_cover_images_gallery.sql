-- Per-work-item cover image gallery. One row per uploaded image so the
-- SelectCoverPanel upload tab can render a thumbnail strip, let the user
-- switch between images, and keep unused images around until deleted.
-- The currently-active cover URL still lives on the work-item row's cover
-- column (populated with `url("...") center/cover no-repeat`).
create table if not exists public.card_cover_images (
  id            uuid primary key default gen_random_uuid(),
  work_item_id  uuid not null,
  work_item_table text not null check (work_item_table in (
    'ph_issues','business_requests','tasks','rh_releases','tm_test_cases'
  )),
  image_url     text not null,
  storage_path  text,
  created_at    timestamptz not null default now(),
  created_by    uuid
);
create index if not exists idx_card_cover_images_item
  on public.card_cover_images (work_item_table, work_item_id, created_at desc);

alter table public.card_cover_images enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='card_cover_images' and policyname='cover_images_select_authed'
  ) then
    create policy cover_images_select_authed on public.card_cover_images
      for select to authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='card_cover_images' and policyname='cover_images_insert_authed'
  ) then
    create policy cover_images_insert_authed on public.card_cover_images
      for insert to authenticated with check (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='card_cover_images' and policyname='cover_images_delete_authed'
  ) then
    create policy cover_images_delete_authed on public.card_cover_images
      for delete to authenticated using (true);
  end if;
end $$;
