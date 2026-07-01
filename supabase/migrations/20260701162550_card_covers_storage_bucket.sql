-- Public storage bucket for card cover images. Covers are cosmetic — no
-- sensitive content — so they live in their own public bucket separate from
-- the private `attachments` bucket (which requires signed URLs).
insert into storage.buckets (id, name, public)
values ('card-covers', 'card-covers', true)
on conflict (id) do update set public = true;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects'
      and policyname='card_covers_public_read'
  ) then
    create policy card_covers_public_read on storage.objects
      for select using (bucket_id = 'card-covers');
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects'
      and policyname='card_covers_auth_insert'
  ) then
    create policy card_covers_auth_insert on storage.objects
      for insert to authenticated with check (bucket_id = 'card-covers');
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects'
      and policyname='card_covers_auth_delete'
  ) then
    create policy card_covers_auth_delete on storage.objects
      for delete to authenticated using (bucket_id = 'card-covers');
  end if;
end $$;
