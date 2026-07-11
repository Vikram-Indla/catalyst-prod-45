-- V3-OPEN-017 · Milestone names are unique within a project card.
-- Two layers: the client pre-checks for instant in-modal rejection, and this
-- migration adds a case-insensitive unique index as the concurrency-safe
-- backstop so two simultaneous inserts/updates cannot both land a duplicate.
--
-- Before the index can be created, any pre-existing case/trim-insensitive
-- duplicate within a card is reconciled by suffixing the later row(s) with a
-- short id fragment — deterministic and guaranteed unique (id is the PK), so
-- the reconciliation can never itself produce a new collision. Only rows that
-- are actually duplicates (rn > 1) are touched.
WITH ranked AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY project_card_id, lower(btrim(name))
      ORDER BY order_index NULLS LAST, id
    ) AS rn
  FROM public.strata_milestones
)
UPDATE public.strata_milestones m
SET name = btrim(m.name) || ' (dup ' || left(m.id::text, 8) || ')'
FROM ranked r
WHERE m.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_strata_milestones_card_name
  ON public.strata_milestones (project_card_id, lower(btrim(name)));
