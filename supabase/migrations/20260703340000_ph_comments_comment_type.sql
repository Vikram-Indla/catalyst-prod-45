-- CAT-KANBAN-FLAG-COMMENT-20260703-001
-- Add comment_type discriminator to ph_comments so flag/unflag audit
-- entries can be rendered with the flag-parity header row in the
-- ActivityFeed. Default 'normal' keeps all existing rows unaffected.

alter table public.ph_comments
  add column if not exists comment_type text not null default 'normal';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ph_comments_comment_type_check'
  ) then
    alter table public.ph_comments
      add constraint ph_comments_comment_type_check
      check (comment_type in ('normal', 'flag_added', 'flag_removed'));
  end if;
end$$;

comment on column public.ph_comments.comment_type is
  'Discriminator for the ActivityFeed renderer. ''normal'' = user comment; ''flag_added'' / ''flag_removed'' = machine-inserted audit entry from a flag toggle, body holds the optional reason (may be empty).';
