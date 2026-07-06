-- Docex My Space — personal workspaces (CAT-DOCEX-DB-COEDIT-20260705-001 V2,
-- Vikram 2026-07-06: "My Space… I can create pages and then I can move them
-- into projects"). One personal workspace per user: container_type='personal',
-- container_id = auth user id (uniqueness enforced by the existing
-- kb_doc_spaces (container_type, container_id) unique index). Provisioned
-- on demand by the client; slug comes from the existing insert trigger.
ALTER TABLE public.kb_doc_spaces
  DROP CONSTRAINT IF EXISTS kb_doc_spaces_container_type_check;
ALTER TABLE public.kb_doc_spaces
  ADD CONSTRAINT kb_doc_spaces_container_type_check
  CHECK (container_type IN ('project', 'product', 'organization', 'personal'));
