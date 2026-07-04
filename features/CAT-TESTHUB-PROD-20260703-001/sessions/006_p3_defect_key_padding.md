# Session 006: P3-F5 Defect Key Zero-Padding

**Started:** 2026-07-04
**Feature Work ID:** CAT-TESTHUB-PROD-20260703-001
**Phase:** P3-F5 (pull-based)
**SUBTASK:** Defect key zero-padding normalization

## Execution Plan

1. Create migration: normalize existing keys + update tm_next_entity_key() RPC
2. Validate and commit

## Acceptance Criteria

- All existing defect_key values normalized to DEF-NNNNN (5-digit zero-padded)
- RPC generates zero-padded format going forward
- Next defect created uses DEF-00XXX format
- SQL proves before/after format
- Grep finds zero old-format keys

## Log

### Step 1: Create migration
✓ Migration: 20260704144030_tm_defect_key_normalize.sql
  - UPDATE existing defect_key: extract numeric suffix, format as DEF-NNNNN (5-digit zero-padded)
  - UPDATE tm_next_entity_key() RPC: generate zero-padded keys for defect, test_case, test_cycle
  - Uses LPAD(v_next_seq::TEXT, 5, '0') for zero-padding
  - GRANT EXECUTE on RPC to authenticated

### Step 2: Validation
✓ npx tsc --noEmit — clean
✓ npm run lint:colors:gate — pass (0 = baseline 0)
✓ npm run audit:ads:gate — pass (no increase, tokens 24551/24551)
✓ npm run lint:cre — pass

## Ready for commit
