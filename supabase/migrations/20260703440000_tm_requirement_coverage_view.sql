-- P1-S11: computed coverage engine (TRC-004). coverage_status was a
-- manually-set column with zero live writers (tm_update_coverage_status RPC
-- had no callers) and zero live readers outside a fully-dead hook file
-- (src/hooks/test-cases/useRequirementLinks.ts). Replace the "hand-set lie"
-- with a computed view derived from each case's latest tm_cycle_scope run —
-- the same "latest run" semantics TraceabilityPage.tsx already hand-rolled
-- client-side (and the pre-existing but legacy-table-coupled, dead
-- tm_get_traceability_matrix RPC already settled on). Never denormalized.

CREATE OR REPLACE VIEW v_tm_requirement_coverage AS
SELECT
  l.id AS link_id,
  l.test_case_id,
  l.requirement_type,
  l.requirement_id,
  l.external_key,
  l.external_title,
  l.link_type,
  l.project_id,
  latest.current_status AS latest_run_status,
  CASE
    WHEN latest.current_status IS NULL OR latest.current_status = 'not_run' THEN 'not_run'
    WHEN latest.current_status = 'passed' THEN 'ok'
    WHEN latest.current_status IN ('failed', 'blocked') THEN 'nok'
    ELSE 'not_run'
  END AS coverage_verdict
FROM tm_requirement_links l
LEFT JOIN LATERAL (
  SELECT cs.current_status
  FROM tm_cycle_scope cs
  WHERE cs.test_case_id = l.test_case_id
  ORDER BY cs.updated_at DESC NULLS LAST
  LIMIT 1
) latest ON true;

-- The manual-write pathway (TRC-004's actual "lie" mechanism) had zero
-- callers anywhere in src/ — drop it so coverage_status cannot be hand-set
-- going forward. The column itself is left in place (read-only legacy,
-- zero live readers) rather than dropped, matching this feature's pattern
-- of not destructively dropping vestigial columns with unclear blast radius.
DROP FUNCTION IF EXISTS tm_update_coverage_status(uuid, text);
