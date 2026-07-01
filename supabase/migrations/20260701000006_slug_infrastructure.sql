-- CAT-SLUGS-UNIVERSAL-20260701-001 — Shared slug infrastructure
-- Creates a reusable slugify() SQL function used by all per-table slug triggers.

CREATE OR REPLACE FUNCTION public.catalyst_slugify(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        trim(input_text),
        '[^a-zA-Z0-9\s\-]', '', 'g'   -- strip non-alphanumeric (keep spaces, hyphens)
      ),
      '[\s\-]+', '-', 'g'              -- collapse whitespace/hyphens to single hyphen
    )
  );
END;
$$;

COMMENT ON FUNCTION public.catalyst_slugify IS
  'Normalises a name to a URL-safe slug. Used by per-table slug triggers. Slug policy: frozen on creation.';
