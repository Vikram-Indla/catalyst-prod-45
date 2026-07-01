-- Sticky "was flagged at least once" marker for ph_issues. Card shows a
-- light-blue tint when the item is currently unflagged but previously was.
-- Only ph_issues has is_flagged in this DB; add here only.
alter table public.ph_issues add column if not exists was_flagged boolean not null default false;
-- Backfill: anything currently flagged has certainly been flagged.
update public.ph_issues set was_flagged = true where is_flagged is true and was_flagged is false;
