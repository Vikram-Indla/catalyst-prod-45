-- Rollback the ph_boards changes I made earlier today.
-- Project Hub was never broken; I misread the handoff and shouldn't have
-- touched ph_boards at all.

-- 1. Delete the Lifecycle Board row I seeded.
delete from public.ph_boards
where name = 'Lifecycle Board';

-- 2. Restore Dev Board as the default (it was is_default=true before I
--    flipped it to false during the diagnostic).
update public.ph_boards
set is_default = true
where name = 'Dev Board';

-- 3. RLS state is already restored to the original migration shape
--    (USING(true) for authenticated, FOR SELECT). Nothing to do here.

-- 4. Verify final state matches what was there before this session.
select id, name, is_default, jsonb_array_length(columns) as col_count
from public.ph_boards
order by is_default desc, name;
