-- Rename presence_state enum value: on_set → onsite
-- PostgreSQL renames the label in pg_enum; existing rows update automatically (no data migration needed).
ALTER TYPE public.presence_state RENAME VALUE 'on_set' TO 'onsite';
