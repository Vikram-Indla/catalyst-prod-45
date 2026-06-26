# Decisions — CAT-AI-ACCESS-MGMT-20260626-003

## D1 — Permission level model: Allow/Deny binary
**Decision:** `permission_level` ENUM values change from `Full | View only | Own only | None` → `Allow | Deny`.
**Why:** Action-level permissions are binary by nature. "Create Story: Full" is meaningless. "Create Story: Allow" is clear.
**Migration:** `Full` → `Allow`. All others → `Deny`.
**Open:** Vikram needs to confirm before Slice 1 migration runs.

## D2 — Auto-create role: confirmation gate, not silent
**Decision:** When AI command references a non-existent role, show ADS SectionMessage (warning): "Role 'X' not found. Create it with default permissions?" and block execution until admin confirms.
**Why:** Silent auto-create = orphan roles with wrong defaults. Admin must know what's being created.
**Status:** Recommended in critique. Vikram to confirm.

## D3 — Avatar upload: v1 (already working)
**Decision:** In scope for v1 as an AI-orchestratable action. `uploadResourceAvatar` service already exists. AI can invoke it.
**Why:** Infrastructure already there. Low incremental cost.

## D4 — AI route: dedicated page `/admin/ai-assistant`
**Decision:** New full-page route, not a drawer or modal.
**Why:** Chat interface + progress panel + history needs space. Drawer is too constrained for step-by-step progress display.

## D5 — Gemini model: gemini-2.5-flash
**Decision:** Same model as all other Catalyst AI functions.
**Why:** `GEMINI_API_KEY` already configured in Supabase secrets. No new API key setup needed.

## D6 — `UserAccessPage.tsx` disposition
**Pending:** Read full 724 lines to determine if it duplicates `AdminAccessPage`. If yes → redirect to `/admin/access`. If no → fix and keep.
**Action required in Slice 2.**

## D7 — Saga rollback scope
**Decision:** Steps that fail after partially completing trigger compensating actions for all completed prior steps. Invite email failure (step N) is the exception — if invite send fails but user/role/permission setup succeeded, log a warning but do NOT roll back the user/role state (invite can be retried separately).
**Why:** Invite failure is recoverable without data loss. Role/permission state is what matters for access control.
