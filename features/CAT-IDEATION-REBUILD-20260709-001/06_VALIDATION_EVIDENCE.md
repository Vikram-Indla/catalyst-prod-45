# Validation Evidence

## S1 — core schema (20260709130000_idn_core_schema.sql) · staging · 2026-07-09

**Target verification**: Supabase MCP connector scoped to `catalyst-staging` (`cyijbdeuehohvhnsywig`, eu-central-1, ACTIVE_HEALTHY) — prod not visible to token; project ID cross-checked against Vikram's dashboard screenshot. No local link created (shared checkout untouched).

**Apply**: `apply_migration` success. Ledger row aligned to committed file: `version=20260709130000, name=idn_core_schema` (1:1 discipline).

**P0 structural** (raw): `idn_tables=7, idn_policies=21, idn_triggers=4, approval_fn_exists=true`

**Behavioral RLS probes** (JWT-simulated approved users A/B, raw output):
| Probe | Outcome |
|---|---|
| P1 insert + key/slug autogen (user A) | PASS: IDEA-2 / s1-probe-idea |
| P3 cross-user draft edit (user B) | PASS: 0 rows |
| P4 spoofed submitter insert | PASS: blocked (42501) |
| P6a update on converted (locked) idea | PASS: 0 rows |
| P6b comment on locked idea (designed exemption) | PASS: allowed |
| P6c vote on locked idea | PASS: blocked (42501) |
| P8 non-admin delete | PASS: 0 rows |
| P9 audit-log tamper (append-only) | PASS: 0 rows |
| cleanup | done (probe rows removed) |

Notes: key sequence shows IDEA-2 because a first probe transaction rolled back on a temp-table grant (sequences don't roll back — expected, gap-tolerant by design). P2 (parallel-session key race) not executable over a single MCP connection; covered structurally by sequence-based generation + UNIQUE constraint; flagged for the Phase 2 integration test suite.
