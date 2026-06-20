-- Short, secure invite/reset links.
-- The shareable URL carries ONLY an opaque `code` (high-entropy base62).
-- The raw token + email live here server-side and are handed to the invitee's
-- browser transiently via the `invite-resolve` edge function — never in a URL,
-- never in browser history. RLS is enabled with NO client policies, so anon /
-- authenticated have zero access; only the service-role edge functions can read.

create table if not exists public.short_links (
  code           text primary key,
  invitation_id  uuid not null references public.user_invitations(id) on delete cascade,
  raw_token      text not null,
  email          text not null,
  purpose        text not null default 'invite',
  expires_at     timestamptz not null,
  used_at        timestamptz,
  resolve_count  integer not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists short_links_invitation_idx on public.short_links(invitation_id);
create index if not exists short_links_expires_idx on public.short_links(expires_at);

alter table public.short_links enable row level security;
-- Intentionally NO policies: deny all anon/authenticated access. Service-role
-- (edge functions) bypasses RLS and is the only reader/writer.
