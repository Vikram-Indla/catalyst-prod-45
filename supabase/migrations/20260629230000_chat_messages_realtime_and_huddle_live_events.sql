-- CAT-CHAT-HUDDLE-RT-20260629-001
-- B1/B2: enable realtime delivery for chat messages.
-- Root cause: chat_messages was never added to the supabase_realtime publication,
-- so postgres_changes subscriptions delivered nothing — receivers only updated on
-- their own send/poll. Adding it makes the existing per-conversation channels live.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;

-- B3/B4: one event row per huddle that transitions live -> summary.
-- Old index was partial on event_type='huddle_summary' only, leaving 'huddle_live'
-- rows un-deduped (both peers would insert one). Widen to cover both so the row
-- inserted at call start is the same row updated to a summary at call end.
drop index if exists chat_messages_huddle_summary_uniq;
create unique index if not exists chat_messages_huddle_event_uniq
  on public.chat_messages (((event_meta ->> 'huddle_id')))
  where event_type in ('huddle_live', 'huddle_summary');
