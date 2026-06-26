# Allowed Edit Surface: sample-feature-2 / exp-000

**Date:** 2026-06-26
**Type:** research

> MANDATORY — no implementation work may begin until this file is filled and reviewed.
> This is the Catalyst equivalent of Karpathy AutoResearch's constrained editable file.

---

## Allowed Files

_Fill before starting. Be specific — list exact file paths._

- [ ] (none yet — fill before starting)

---

## Forbidden Files

Always forbidden without explicit human approval:

- `supabase/migrations/` — schema changes need Gate 4
- `supabase/functions/` — edge functions need Gate 5
- `src/routes/FullAppRoutes.tsx` — route changes need Gate 6
- `src/components/layout/SidebarBase.tsx` — nav changes need human approval
- `package.json` / `package-lock.json` — dependency changes need human approval
- `CLAUDE.md` — governance doc, never modified
- `design-governance/` — audit infrastructure, never modified
- Global theme / CSS variables — ADS tokens only, never new themes
- Auth / RBAC source files — security boundary, never touched without Gate approval
- Any file NOT in the Allowed list above

---

## Edit Rules

1. No file outside the Allowed list may be edited.
2. If a new file becomes necessary mid-experiment, STOP. Update this document first.
3. If schema changes emerge, STOP. Request Gate 4 approval.
4. If route changes emerge, STOP. Request Gate 6 approval.
5. If a shared component needs parameterising (not forking), confirm with Vikram first.

---

## Gate Status

- [ ] Allowed edit surface reviewed before work started
- [ ] No files added mid-experiment without updating this document
