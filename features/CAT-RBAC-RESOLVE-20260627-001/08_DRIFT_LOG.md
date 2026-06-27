# 08 — Drift Log

## DRIFT-1 (2026-06-27) — backfill source assumption was wrong
**Plan assumed:** backfill `user_product_roles` by mapping legacy `app_role` (`user_roles`).
**Live data (cyij dev) shows:** `user_roles` has 2 rows / 61. Dead. The only per-user role signal
is `profiles.role` (text).

**Worse:** `product_roles` (26) is a job-title taxonomy (Backend Architect, React Developer, PMO…)
with no privilege tiers except `super_admin`. No `admin`/`program_manager`/`user` codes exist live.
Codes mismatch names (`team_lead`→"React Lead", `developer`→"DEVOPS").

**`profiles.role` distribution & mappability:**
- `user` ×50 → NO clean target (no baseline role exists)
- `program_manager` ×3 → NO clean target (no PM tier)
- `Frontend Developer` ×3 → NO clean target (no frontend code)
- `team_lead` ×2 → code `team_lead` exists (name "React Lead" — confirm intent)
- `admin` ×1 → `super_admin` ✅
- `Backend Architect` ×1 → `backend_architect` ✅
- `Product Owner` ×1 → `product_owner` ✅

Only 3/61 map cleanly. **Models are semantically incompatible** (job title vs privilege tier).

**Effect on plan:** Phase 0 backfill CANNOT be authored as a 1:1 map. Blocked pending policy
ruling on the 3 unmapped buckets (`user`, `program_manager`, `Frontend Developer`) and whether a
new baseline product role is created. No backfill SQL written. RED FLAG raised to Vikram.
