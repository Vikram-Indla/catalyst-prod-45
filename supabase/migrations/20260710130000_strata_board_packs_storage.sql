-- CAT-STRATA-CLOSEOUT-20260710-001 · W1 — board-pack persistence
-- Private storage bucket for generated executive board packs (PDF/PPTX).
-- Until now packs were generated client-side and downloaded to one browser only;
-- strata_board_packs.storage_path stayed empty, so packs were never retrievable
-- by anyone else. This bucket makes the pack a shared governance artifact.
--
-- Access model (mirrors the strata_board_packs ROW policies exactly, so a user
-- who can see a pack row can also fetch its binary):
--   read  → current_user_is_approved()            (same as strata_board_packs_select)
--   write → strata_has_role(ARRAY['strategy_office'])  (same as strata_board_packs_write;
--            strata_is_admin() bypass is built into strata_has_role)
-- Bucket is PRIVATE — downloads go through short-lived signed URLs, never public URLs.

insert into storage.buckets (id, name, public)
values ('strata-board-packs', 'strata-board-packs', false)
on conflict (id) do nothing;

drop policy if exists "strata-board-packs approved read" on storage.objects;
create policy "strata-board-packs approved read"
  on storage.objects for select to authenticated
  using (bucket_id = 'strata-board-packs' and public.current_user_is_approved());

drop policy if exists "strata-board-packs strategy-office insert" on storage.objects;
create policy "strata-board-packs strategy-office insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'strata-board-packs' and public.strata_has_role(array['strategy_office']));

drop policy if exists "strata-board-packs strategy-office update" on storage.objects;
create policy "strata-board-packs strategy-office update"
  on storage.objects for update to authenticated
  using (bucket_id = 'strata-board-packs' and public.strata_has_role(array['strategy_office']))
  with check (bucket_id = 'strata-board-packs' and public.strata_has_role(array['strategy_office']));

drop policy if exists "strata-board-packs strategy-office delete" on storage.objects;
create policy "strata-board-packs strategy-office delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'strata-board-packs' and public.strata_has_role(array['strategy_office']));
