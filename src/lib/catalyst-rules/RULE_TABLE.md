# Catalyst Rules Engine — Locked Rule Table

> **This file is the source of truth for all Catalyst product rules.**
> Every row was confirmed by Vikram. Changes require `/cre update [row-id] "[new rule]"` and a new confirmation.
> `CatalystRules.ts` implements these rows exactly. If they diverge, this file wins.

Confirmed: 2026-07-01 · Council session: CRE design + opportunity analysis

---

## GRID A — Module Ownership

Each work item type belongs to exactly one module.
Subtask family is universal (permitted in all modules).

| ID  | Type (Display)      | Kind               | Module    | Migration Needed |
|-----|---------------------|--------------------|-----------|-----------------|
| A1  | Story               | `story`            | TEAM      | No              |
| A2  | Epic                | `epic`             | PROGRAM   | No              |
| A3  | Feature             | `feature`          | TEAM      | No              |
| A4  | QA Bug              | `defect`           | TESTHUB   | **Yes** — was TEAM |
| A5  | Production Incident | `incident`         | INCIDENT  | **Yes** — was TEAM |
| A6  | Business Request    | `business_request` | PRODUCT   | No              |
| A7  | Business Gap        | `business_gap`     | PRODUCT   | No              |
| A8  | Change Request      | `change_request`   | TEAM      | No              |
| A9  | Task                | `task`             | TEAM      | No              |
| A10 | Subtask family      | `subtask`          | Universal | No              |
| A11 | Test Case           | `test_case`        | TESTHUB   | No              |
| A12 | Test Cycle          | `test_cycle`       | TESTHUB   | No              |
| A13 | Theme               | `theme`            | ENTERPRISE| No              |
| A14 | Objective           | `objective`        | ENTERPRISE| No              |

**Subtask family types (universal child, all modules):**
Sub-task, Backend, Frontend, Figma, Integration, API Requirement, BRD Task

---

## GRID B — Hierarchy (Parent → Children)

Structural parent_key relationships. A type not listed as an allowed child cannot be created under that parent.

| ID  | Parent Type         | Allowed Children                                                                                      |
|-----|---------------------|-------------------------------------------------------------------------------------------------------|
| B1  | Business Request    | Epic                                                                                                  |
| B2  | Epic                | Feature, Story, Task, QA Bug, Change Request, Production Incident, Business Gap, + subtask family     |
| B3  | Feature             | Story                                                                                                 |
| B4  | Story               | Subtask family                                                                                        |
| B5  | Task                | Subtask family                                                                                        |
| B6  | QA Bug              | Subtask family                                                                                        |
| B7  | Production Incident | Subtask family                                                                                        |
| B8  | Change Request      | Subtask family                                                                                        |
| B9  | Business Gap        | None (leaf)                                                                                           |
| B10 | Subtask family      | None (leaf)                                                                                           |

**Explicit hierarchy violations (enforced as bans):**

| ID  | Rule                                    | Enforcement |
|-----|-----------------------------------------|-------------|
| B11 | Epic CANNOT be a child of Story         | Epic not in Story's allowed children |
| B12 | Story CANNOT be a child of Story        | Story not in Story's allowed children |
| B13 | Any type CANNOT be its own child        | Same-type child creation banned universally |

---

## GRID C — Link Rules (ph_issue_links)

Many-to-many cross-references. Banned pairs are rejected by `canLinkTo()`.
All non-banned pairs are allowed unless explicitly listed here.

### Banned link pairs

| ID  | Type A              | Type B           | Rule    | Reason                                      |
|-----|---------------------|------------------|---------|---------------------------------------------|
| C1  | Business Request    | QA Bug           | ❌ BAN  | BR is product-level; defects belong in QA chain |
| C3  | Production Incident | QA Bug           | ❌ BAN  | Incidents and defects are separate domains  |
| C10 | Any type            | Same type        | ❌ BAN  | Self-type linking creates circular ambiguity (Story→Story, Epic→Epic, etc.) |

### Explicit allow (override of any future conservative default)

| ID  | Type A              | Type B              | Rule      | Reason                                   |
|-----|---------------------|---------------------|-----------|------------------------------------------|
| C2  | Business Request    | Production Incident | ✅ ALLOW  | Incidents can trace back to a BR         |
| C4  | Story               | QA Bug              | ✅ ALLOW  | Story-to-defect traceability             |
| C5  | Epic                | QA Bug              | ✅ ALLOW  | Epic-level defect tracking               |
| C6  | Story               | Production Incident | ✅ ALLOW  | Story may surface an incident            |
| C7  | Business Request    | Story               | ✅ ALLOW  | BR → delivery traceability               |
| C8  | Business Request    | Epic                | ✅ ALLOW  | BR → program traceability                |
| C9  | QA Bug              | Test Case           | ✅ ALLOW  | Defect ↔ test case traceability          |

---

## GRID D — Creation Rights

Each module may only create the types it owns, plus subtask family.

| ID  | Module    | Types Permitted to Create                                     |
|-----|-----------|---------------------------------------------------------------|
| D1  | TEAM      | Story, Feature, Task, Change Request + subtask family         |
| D2  | PRODUCT   | Business Request, Business Gap + subtask family               |
| D3  | PROGRAM   | Epic + subtask family                                         |
| D4  | TESTHUB   | QA Bug, Test Case, Test Cycle + subtask family                |
| D5  | INCIDENT  | Production Incident + subtask family                          |
| D6  | ENTERPRISE| Theme, Objective, Snapshot                                    |

---

## Change Log

| Date       | Row  | Change                          | Confirmed by |
|------------|----- |---------------------------------|--------------|
| 2026-07-01 | A4   | QA Bug module: TEAM → TESTHUB   | Vikram       |
| 2026-07-01 | A5   | Production Incident: TEAM → INCIDENT | Vikram  |
| 2026-07-01 | C2   | Business Request ↔ Production Incident: ALLOW (was proposed BAN) | Vikram |
| 2026-07-01 | C10  | Same-type linking: BAN          | Vikram       |

---

## How to Add a Rule

Use `/cre add "[rule text]"` — classifies, writes here, updates `CatalystRules.ts`, confirms before commit.
Or tell Claude Code directly: "Add CRE rule: [rule text]" — it will run plan-mode and ask for YES.
