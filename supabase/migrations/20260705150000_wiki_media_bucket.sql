-- CAT-DOCS-NOTION-20260704-001 — wiki-media storage bucket
-- Editor image/file/video/audio uploads for Wiki pages. Public read (page
-- media renders via public URL, same model as card-covers); authenticated
-- users upload; owners delete their own objects.

insert into storage.buckets (id, name, public)
values ('wiki-media', 'wiki-media', true)
on conflict (id) do nothing;

drop policy if exists "wiki-media authenticated upload" on storage.objects;
create policy "wiki-media authenticated upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'wiki-media');

drop policy if exists "wiki-media public read" on storage.objects;
create policy "wiki-media public read"
  on storage.objects for select
  using (bucket_id = 'wiki-media');

drop policy if exists "wiki-media owner delete" on storage.objects;
create policy "wiki-media owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'wiki-media' and owner = auth.uid());
