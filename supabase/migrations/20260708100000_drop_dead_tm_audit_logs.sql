-- CAT-TESTHUB-PRODREADY-20260707-001 Q2: drop dead duplicate audit table.
-- tm_audit_logs (0 rows, no inbound FK dependents, no live code references —
-- only auto-generated types.ts mentioned it) is a stale duplicate of the live
-- tm_activity_log table. Applied directly on staging cyij 2026-07-08; this
-- file exists so the migration ledger stays 1:1 with applied DDL.
drop table if exists tm_audit_logs;
