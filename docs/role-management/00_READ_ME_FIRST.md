# Catalyst Enterprise Role Management — Documentation Entry Point

**Version:** 1.0  
**Status:** Design Approved, Implementation Pending  
**Last Updated:** 2026-06-24

---

## ⚠️ MANDATORY READING ORDER

This folder (`docs/role-management/`) is the **single source of truth** for Catalyst Enterprise Role Management implementation.

**Every Claude conversation must follow this order:**

1. **Read this file first** (`00_READ_ME_FIRST.md`)
2. **Read all numbered files 01–12 in sequential order** (including the new Delivery Contract)
3. **Inspect existing Catalyst components referenced in the docs**
4. **Produce a short execution plan for the current subiteration**
5. **Do not proceed to code until ALL documents (01–12) are read**

---

## ⚠️ CRITICAL: DO NOT IMPLEMENT UNTIL FILE 12 IS READ

**File 12 (`12_DELIVERY_CONTRACT.md`) is mandatory before any code.**

This file contains:
- Implementation gates that must be passed before each phase
- Stop conditions that block further work
- Evidence requirements for every deliverable
- Completion checklists for Cycle 1 and Cycle 2

**You cannot claim a phase is complete without understanding and meeting every requirement in file 12.**

**Do not write any code until you have read `12_DELIVERY_CONTRACT.md`.**

---

## Critical Rules — No Exceptions

### Architecture & Design

- ✅ **One active role per user** — enforced by partial unique index on `user_roles(user_id) WHERE is_active = true`
- ✅ **Normalized permission model** — Role → Module → Entity → Field → Action → Workflow Transition (NOT JSON blobs)
- ✅ **Four enforcement layers** — Route guard → UI guard → Mutation/API guard → RLS guard
- ✅ **Approved design is final** — no re-interpretation, no "better" alternatives
- ❌ **NO hardcoded ROLE_GROUPS** — all roles must load from `roles` table
- ❌ **NO JSON-only shortcut** — full normalized schema required
- ❌ **NO "coming soon" pages** — only complete UI or hidden features

### Implementation Requirements

- ✅ **Two-cycle path only** — Cycle 1 (foundation + UI), Cycle 2 (enforcement + hardening)
- ✅ **Every change logged** — permission audit trail mandatory
- ✅ **Incident Hub read-only** — mutations blocked in Catalyst, managed in Jira
- ✅ **Export respects field permissions** — hidden/banned fields excluded from CSV
- ✅ **Sticky save bar only** — no duplicate save/cancel buttons
- ✅ **Dynamic role dropdown** — Create Access modal reads from roles table

### UI & Visual

- ✅ **Flat Admin sidebar** — Access / Role Management / Permission Audit only (no nested detail pages)
- ✅ **Enterprise Atlassian style** — no consumer SaaS UI, no random colors
- ✅ **Existing Catalyst components** — reuse JiraTable, Atlassian Button/Select/Modal, not hand-rolled
- ✅ **ADS tokens only** — no hardcoded hex colors
- ✅ **Readable tables** — 48–56px row heights, sticky headers, 240px sidebar

### Absolute Bans

- ❌ **NO placeholder pages** — "Coming soon" / "Under construction" / "TODO UI"
- ❌ **NO empty tabs** — every tab has real content or is hidden
- ❌ **NO hardcoded roles** — all roles come from `roles` table
- ❌ **NO Incident Hub mutations** — all writes blocked in Catalyst
- ❌ **NO JSON-only approach** — full relational schema mandatory
- ❌ **NO duplicate components** — extend existing or ask JK / Product Owner before building new
- ❌ **NO faded gray unreadable UI** — contrast must meet WCAG AA
- ❌ **NO random colors** — only blue/red/amber/green/gray per ADS
- ❌ **NO full-page horizontal scroll** — table scroll only

---

## Before Touching Code

1. **Read files 01–12 completely**
2. **Inspect these existing Catalyst files:**
   - `src/components/admin/AdminGuard.tsx`
   - `src/components/admin/AdminLayout.tsx`
   - `src/hooks/useUserRole.ts`
   - `src/components/shared/JiraTable/`
   - `src/lib/permissions.ts` (may exist from prior work)
3. **Run this command to check current state:**
   ```bash
   grep -r "ROLE_GROUPS\|hardcoded.*role\|coming soon\|TODO" src/pages/admin src/components/admin 2>/dev/null | head -20
   ```
4. **Check existing migrations:**
   ```bash
   ls -la supabase/migrations/ | grep role | tail -5
   ```
5. **Produce a one-paragraph execution plan** stating:
   - What files will change
   - What the expected output is
   - What validation will prove it works
   - What the blockers are (if any)

---

## Context Loss Prevention

If you are reading this and cannot answer these questions from your own memory (without re-reading the docs), **YOU MUST RE-READ THE DOCS BEFORE CODING:**

- What are the 16 default roles?
- What is the permission chain?
- What are the 10 active modules?
- What are the 3 dormant modules?
- Why is Incident Hub read-only?
- What is banned (2 fields)?
- What is the sticky save bar?
- How many fields in the field grid?
- What are the four enforcement layers?
- What does "one active role per user" mean?

If you cannot answer all of these from memory, **stop and re-read files 01–05 now.**

---

## Handoff File Location

Before starting any subiteration, read:

```
CLAUDE_ROLE_MANAGEMENT_HANDOFF.md  (repo root)
```

At the end of every subiteration, update:

```
docs/role-management/10_CONTEXT_HANDOFF.md
```

---

## File Structure

```
docs/role-management/
├── 00_READ_ME_FIRST.md                        ← Start here
├── 01_PRODUCT_DECISIONS.md                    ← Non-negotiable requirements
├── 02_ARCHITECTURE_AND_ERD.md                 ← System design + ERD
├── 03_DATABASE_SCHEMA.md                      ← All tables + constraints
├── 04_PERMISSION_MODEL.md                     ← Permission rules + dependencies
├── 05_MODULE_FIELD_ACTION_INVENTORY.md        ← Complete module/field/action list
├── 06_DESIGN_SPECIFICATION.md                 ← Approved wireframes + layouts
├── 07_UI_GUARDRAILS.md                        ← Hard UI rules (must/must-not)
├── 08_IMPLEMENTATION_PLAN_TWO_CYCLES.md       ← Cycle 1 + Cycle 2 subiterations
├── 09_TEST_AND_SANITY_PLAN.md                 ← 25 mandatory tests
├── 10_CONTEXT_HANDOFF.md                      ← Status after each subiteration
├── 11_RISK_REGISTER_AND_NO_EXCUSES.md         ← Failure modes + prevention
└── 12_DELIVERY_CONTRACT.md                    ← Implementation gates + acceptance criteria
```

---

## Next Steps

1. **Read `01_PRODUCT_DECISIONS.md`** (decisions, not negotiable)
2. **Read `02_ARCHITECTURE_AND_ERD.md`** (understand the model)
3. **Read `03_DATABASE_SCHEMA.md`** (understand the tables)
4. **Read `04_PERMISSION_MODEL.md`** (understand the rules)
5. **Read `05_MODULE_FIELD_ACTION_INVENTORY.md`** (memorize the scope)
6. **Read `06_DESIGN_SPECIFICATION.md`** (understand the UI)
7. **Read `07_UI_GUARDRAILS.md`** (know what's forbidden)
8. **Read `08_IMPLEMENTATION_PLAN_TWO_CYCLES.md`** (understand the timeline)
9. **Read `09_TEST_AND_SANITY_PLAN.md`** (know what "done" means)
10. **Read `10_CONTEXT_HANDOFF.md`** (understand current status)
11. **Read `11_RISK_REGISTER_AND_NO_EXCUSES.md`** (know how to avoid failure)
12. **Read `12_DELIVERY_CONTRACT.md`** (know implementation gates + stop conditions)

**Then and only then:** produce your execution plan and ask if you are unblocked.

---

## Context Health Check

If you cannot honestly answer "yes" to all of these, stop and re-read:

- [ ] I have read all 12 files in `docs/role-management/`
- [ ] I understand the permission chain
- [ ] I understand the four enforcement layers
- [ ] I know the 16 default roles
- [ ] I know the 10 active modules
- [ ] I know which fields are banned
- [ ] I understand why Incident Hub is read-only
- [ ] I understand the two-cycle plan
- [ ] I know what the sticky save bar is
- [ ] I know the 25 sanity tests
- [ ] I understand the implementation gates in file 12
- [ ] I understand all stop conditions in file 12

If any of these is false, **stop immediately and re-read the relevant file(s).**

---

**Do not proceed to code until you have read all files 01–12.**
