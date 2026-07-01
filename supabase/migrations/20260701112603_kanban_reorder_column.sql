-- Kanban canonical board — arbitrary-slot reorder via drag-drop.
-- Complements kanban_move_position (up/down/top/bottom) with a full
-- column re-rank used when the user drops a card between two other cards.
create or replace function public.kanban_reorder_column(
  p_table       text,
  p_column_ids  uuid[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed constant text[] := array['ph_issues','business_requests','rh_releases','tasks','tm_test_cases'];
  i int;
begin
  if not (p_table = any(v_allowed)) then
    raise exception 'kanban_reorder_column: table % not allowed', p_table;
  end if;
  if p_column_ids is null or array_length(p_column_ids, 1) is null then
    return;
  end if;
  for i in 1..array_length(p_column_ids, 1) loop
    execute format('update %I set board_position = $1 where id = $2', p_table)
      using (i * 1024)::bigint, p_column_ids[i];
  end loop;
end;
$$;
grant execute on function public.kanban_reorder_column(text, uuid[]) to authenticated;
grant execute on function public.kanban_reorder_column(text, uuid[]) to anon;
