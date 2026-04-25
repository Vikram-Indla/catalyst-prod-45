-- Drop the existing CHECK constraint and recreate with 'child of' and 'parent of' allowed
ALTER TABLE public.ph_issue_links
  DROP CONSTRAINT IF EXISTS ph_issue_links_link_type_check;

ALTER TABLE public.ph_issue_links
  ADD CONSTRAINT ph_issue_links_link_type_check
  CHECK (link_type = ANY (ARRAY[
    'blocks'::text,
    'is blocked by'::text,
    'is BRD of'::text,
    'BRD'::text,
    'is cloned by'::text,
    'clones'::text,
    'is duplicated by'::text,
    'duplicates'::text,
    'is implemented by'::text,
    'implements'::text,
    'relates to'::text,
    'child of'::text,
    'parent of'::text
  ]));