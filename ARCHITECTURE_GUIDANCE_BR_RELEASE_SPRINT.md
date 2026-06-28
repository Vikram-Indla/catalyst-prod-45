# Catalyst Enterprise Architecture Guidance
## Business Request → Feature → Story → Sprint → Release Hierarchy

**Status:** Architectural Proposal | **Date:** 2026-06-28 | **Scope:** Product + Project + Release Hubs

---

## Executive Summary

Catalyst currently has tension between three "measuring sticks": **Sprints** (dev iterative work), **Releases** (production deployments), and **Business Requests** (product strategy). The architecture must enable each persona to navigate in their native language while maintaining full traceability upward and downward.

**Core Principle:** Don't use the same measuring stick (sprints) to track both agile delivery AND business request progress. Instead, use **Release Phases** as the measuring unit for business requests, which aggregate sprints underneath.

---

## Current State Analysis

### Existing Entities

```
BusinessRequest (product_id, release_id, end_date, planned_quarter, process_step)
  ├─ release_id → Release (project_id, name, start_date, release_date)
  │   └─ Sprint[] (release_id, project_id, start_date, end_date, capacity)
  │       └─ Story[] (via story_sprints junction)
  │
  └─ (implied) Features → Stories → Tasks/Subtasks
```

### Gaps & Tensions

1. **No explicit Feature↔BusinessRequest link** — Stories are children of Features, but Features don't explicitly link to BusinessRequests.
2. **Release is scoped to one project** — A BusinessRequest spanning 6 months might need releases across multiple projects. Current model assumes 1 Release = 1 Project.
3. **Sprint language bleeds into product layer** — Product Owners see `planned_quarter` (legacy) instead of a clear "release phase" or "milestone" concept.
4. **Release vs Release Phase confusion** — Release currently means "production deployment container for one project." Need to distinguish between:
   - **Release Hub Release** = production deployment (ops concern)
   - **Product Release Phase** = business request delivery checkpoint (product concern)
5. **No cross-project sprint aggregation** — A BR might be delivered via sprints in 3 different projects. No entity to say "this BR is 40% done across all its delivery sprints."

---

## Proposed Architecture

### Three Stacks, One Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│ PRODUCT HUB (Product Owners, Business Analysts, Stakeholders)   │
├─────────────────────────────────────────────────────────────────┤
│ BusinessRequest                                                 │
│  ├─ Process Step (Requested, In Discussion, Scoped, etc.)      │
│  ├─ Urgency / Priority                                          │
│  ├─ Target End Date                                             │
│  ├─ Release Phases[] (NEW: checkpoints, not technical)          │
│  │  └─ Features[] (from Project Hub, linked upward)             │
│  │     └─ Delivery status (feature complete = BR progress)      │
│  └─ Timeline View: "6-month roadmap with 100+ BRs & phases"    │
│     (No sprint language, no release deployment language)        │
└─────────────────────────────────────────────────────────────────┘
                            ↓ (Features link down)
┌─────────────────────────────────────────────────────────────────┐
│ PROJECT HUB (Dev Teams, Project Managers, Scrum Masters)        │
├─────────────────────────────────────────────────────────────────┤
│ Project                                                         │
│  ├─ Epic (maps to 0+ BusinessRequests via Features)             │
│  ├─ Feature (maps to 1+ BusinessRequests)                       │
│  │  └─ Story (scheduled in Sprint)                              │
│  │     └─ Task/Subtask (work unit)                              │
│  └─ Release[] (project-scoped, for grouping stories by sprint)  │
│     └─ Sprint[] (time-boxed delivery, 2-4 weeks)                │
│        └─ Story[] (units of work)                               │
│                                                                 │
│ "This project has 3 epics, 12 features. Features X,Y,Z link to │
│  BR-42 (Industrial Marketplace). We're delivering those via     │
│  Q3 Sprint 1, 2, 3. Release Q3-v1 bundles sprints 1-2."         │
└─────────────────────────────────────────────────────────────────┘
                            ↓ (Work items get deployed)
┌─────────────────────────────────────────────────────────────────┐
│ RELEASE HUB (Release Managers, Ops, Deployment Teams)           │
├─────────────────────────────────────────────────────────────────┤
│ ReleaseDeployment (formerly "Release")                          │
│  ├─ Key (e.g., REL-2026-Q3-01)                                  │
│  ├─ Change Records[] (technical change requests)                │
│  ├─ Status (Planning → In Progress → Released → Archived)       │
│  ├─ Deployment Pipeline (Dev → QA → Staging → UAT → Prod)      │
│  └─ Linked Sprints[] (which project sprints ship in this rel?)  │
│                                                                 │
│ "Release REL-2026-Q3-01 ships Project-A Sprints 1-2 +           │
│  Project-B Sprint 3. Change records cover DB migrations,        │
│  API versioning, feature toggles. Deployment ready for Q3."     │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

#### 1. **Release Phases** (NEW) — Measuring Unit for BusinessRequests

A **Release Phase** is a product-facing checkpoint tied to a BusinessRequest. It's **not** a technical sprint, **not** a deployment. It's "we promised to deliver X by Q3" or "by end of August."

```typescript
// New table: business_request_release_phases
interface ReleasePhase {
  id: string;
  business_request_id: string; // FK
  phase_number: number; // 1, 2, 3...
  title: string; // "MVP Launch", "Phase 2: Advanced Analytics", etc.
  target_date: string; // ISO date
  status: 'planned' | 'in_progress' | 'completed' | 'at_risk' | 'delayed';
  
  // Linked features deliver this phase
  feature_ids: string[]; // FK to project_features
  
  // Progress calculated from linked features' story completion
  progress_percent: number; // Derived: sum(story.done) / sum(story.all) for linked features
  
  created_at: string;
  updated_at: string;
}
```

**Why this works:**
- Product Owners talk about "Phase 1 by June 30" without knowing sprints exist.
- Dev teams deliver Phase 1 via however many sprints across whatever projects they need.
- Release Managers see which Phases ship in Release Q3-01.
- Traceability: BR → Phase → Feature → Story → Sprint → Release Deployment.

#### 2. **Feature ↔ BusinessRequest Link** (FORMALIZE)

Currently Features are in ProjectHub, but they're the link to BusinessRequests. Make this explicit:

```typescript
// Update: project_features table — add column
interface Feature {
  // ... existing fields
  
  // NEW: linked business requests this feature delivers
  linked_business_request_ids: string[]; // Array/JSON column or FK junction table
  
  // NEW: which release phase(s) does this feature contribute to?
  linked_release_phase_ids: string[]; // FK to business_request_release_phases
}
```

**Rationale:**
- A Feature can satisfy 1+ BusinessRequests (e.g., "API enhancement" serves 3 different BRs).
- When a Feature completes, it automatically updates ReleasePhase progress.
- Product roadmap query: "Which features are linked to BR-42? Are they done? What's the progress?"

#### 3. **Decouple Release Deployments from Project Releases**

Rename for clarity. Currently `releases` table in phase3-releases.ts is scoped to a project:

```typescript
// Rename phase3 Release → ProjectRelease (or keep as-is, clarify in naming)
interface ProjectRelease {
  id: string;
  project_id: string;
  name: string; // "Q3-v1", "2026-Q3-01"
  // Purpose: Group sprints in a project into logical delivery batches
  // NOT for cross-project OR production deployment coordination
}

// NEW table: release_deployments (in ReleaseHub)
interface ReleaseDeployment {
  id: string;
  key: string; // REL-2026-Q3-01
  name: string; // "Q3 Production Release"
  
  // Link to 1+ project releases / sprints across projects
  linked_sprint_ids: string[];
  
  // Operational details
  status: 'planning' | 'in_progress' | 'released' | 'archived';
  deployment_pipeline: ReleasePipeline; // Dev → QA → Staging → UAT → Prod
  change_records: ChangeRecord[];
  target_prod_date: string;
  
  created_at: string;
  updated_at: string;
}
```

**Why:**
- Clear separation of concerns: ProjectRelease is internal agile grouping; ReleaseDeployment is ops orchestration.
- Release Managers can create a deployment that spans multiple projects/sprints.
- Avoids the "what does Release mean?" ambiguity.

#### 4. **BusinessRequest.release_id Becomes Derived**

Currently BR has a direct `release_id` FK. Instead:

```typescript
interface BusinessRequest {
  // ... existing fields
  
  // REMOVE: release_id (was a 1:1 hack)
  
  // NEW: derive from Release Phases + ReleaseDeployments
  // Query: "Which ReleaseDeployment(s) ship this BR?"
  // Answer: Find all ReleasePhases for this BR → Find all Features in those phases →
  //         Find all Sprints with those Features → Find ReleaseDeployments linking those Sprints
}
```

If you need a quick "primary release," cache it or add a `primary_release_deployment_id` field, but derive it, don't store it directly.

---

## Data Flow & Traceability Examples

### Example 1: Product Owner's View (BR-42: Industrial Marketplace)

```
BR-42 "Industrial Marketplace MVP"
  ├─ Process Step: "In Development"
  ├─ Target End Date: 2026-09-30
  │
  ├─ Release Phase #1 "User Onboarding"
  │  ├─ Target Date: 2026-08-15
  │  ├─ Features Linked:
  │  │  ├─ Project-A: User Registration & Profile
  │  │  └─ Project-B: Email Verification Service
  │  └─ Progress: 75% (12/16 stories done)
  │
  ├─ Release Phase #2 "Marketplace Core"
  │  ├─ Target Date: 2026-09-30
  │  ├─ Features Linked:
  │  │  ├─ Project-A: Product Listing & Search
  │  │  ├─ Project-C: Payment Integration
  │  │  └─ Project-B: Transaction API
  │  └─ Progress: 40% (8/20 stories done)
  │
  └─ Roadmap Timeline: [Aug | Sep | Oct] with phases visualized
     (No sprint language visible, no "Sprint 1, 2, 3" noise)
```

**Product Owner reads this:** "Phase 1 is nearly done by mid-August. Phase 2 is 40% through, shipping end of September. On track."

### Example 2: Dev Team's View (Project-A)

```
Project-A "Industrial Portal"
  │
  ├─ Epic: "Marketplace Integration" (linked to BR-42 + BR-15)
  │  │
  │  ├─ Feature: "User Registration & Profile"
  │  │  ├─ Linked BRs: BR-42 (Phase #1), BR-18 (Phase #1)
  │  │  ├─ Linked Release Phases: [ release_phase_id_001 ]
  │  │  │
  │  │  ├─ Story PA-1001: "User signup form"
  │  │  │  └─ Sprint: Q3 Sprint 1 (starts Aug 5)
  │  │  ├─ Story PA-1002: "Email verification"
  │  │  │  └─ Sprint: Q3 Sprint 1
  │  │  └─ Story PA-1003: "Profile edit page"
  │  │     └─ Sprint: Q3 Sprint 2 (starts Aug 19)
  │  │
  │  ├─ Feature: "Product Listing & Search"
  │  │  ├─ Linked BRs: BR-42 (Phase #2)
  │  │  ├─ Linked Release Phases: [ release_phase_id_002 ]
  │  │  └─ Stories: PA-2001 through PA-2010
  │  │     └─ Sprints: Q3 Sprints 2, 3, 4
  │
  └─ ProjectRelease "Q3-v1"
     ├─ Sprints: [ Sprint 1, Sprint 2, Sprint 3 ]
     ├─ Purpose: "Group related work for clean deployment"
     └─ Note: Not used for BR tracking, just project-level grouping
```

**Dev team reads this:** "We ship Features X and Y in Sprints 1-4. Feature X gets PA-1003 into Sprint 2. Both features link to business requests, which means they feed into product release phases."

### Example 3: Release Manager's View (REL-2026-Q3-01)

```
ReleaseDeployment: REL-2026-Q3-01
  ├─ Name: "Q3 Production Release"
  ├─ Status: "In Progress"
  ├─ Target Prod Date: 2026-09-30
  │
  ├─ Linked Sprints:
  │  ├─ Project-A: Q3 Sprint 1, Q3 Sprint 2
  │  ├─ Project-B: Q3 Sprint 1, Q3 Sprint 3
  │  └─ Project-C: Q3 Sprint 2
  │
  ├─ Change Records:
  │  ├─ CHG-001: DB schema migration (users table, indexes)
  │  ├─ CHG-002: API v2 endpoint for product listing
  │  └─ CHG-003: Payment gateway integration
  │
  ├─ Deployment Pipeline:
  │  ├─ Dev: Complete (deployed 2026-09-15)
  │  ├─ QA: In Progress (started 2026-09-18)
  │  ├─ Staging: Pending
  │  ├─ UAT: Pending
  │  └─ Prod: Pending (2026-09-30)
  │
  └─ Sign-off Gates:
     ├─ Security Clearance: Pending (Assigned to John)
     ├─ Ops Readiness: Approved (Jane, 2026-09-20)
     └─ Rollback Plan: Pending
```

**Release Manager reads this:** "Q3 release is ready for QA. I can see which projects/sprints ship. Change records tell me what infrastructure updates are needed. Pipeline tracks deployment stages. If issues arise, I trace back to the features (and thus business requests) that caused them."

### Traceability Chain

Starting from Product Roadmap and tracing down:
```
BR-42 (Industrial Marketplace) [Product Hub]
  ↓ (delivered via)
Release Phase #1 "User Onboarding" [Product Hub]
  ↓ (features implement)
Feature: "User Registration & Profile" [Project Hub, Project-A]
  ↓ (stories deliver)
Story PA-1001: "User signup form" [Project Hub]
  ↓ (scheduled in)
Sprint Q3-1 [Project Hub, Aug 5-16]
  ↓ (grouped in)
ProjectRelease Q3-v1 [Project Hub]
  ↓ (ships via)
ReleaseDeployment REL-2026-Q3-01 [Release Hub]
  ↓ (deployed as)
Production Deployment [Release Hub, Sept 30]
```

**Navigation:**
- Product Owner → sees BR-42 at 100% complete (Phase #1 done) and 40% (Phase #2 in progress)
- Project Manager (Project-A) → sees 3 features, 10 stories, 4 sprints, knows they feed into 2 business requests
- Release Manager → knows Release Q3-01 ships Sprints 1-3 across 3 projects, ready for prod on Sept 30
- Dev team → works on stories in sprints, unaware of BR context if they don't need it

---

## Schema Changes Summary

### New Tables

```sql
-- Release Phases for BusinessRequests (Product Hub measuring unit)
CREATE TABLE business_request_release_phases (
  id UUID PRIMARY KEY,
  business_request_id UUID NOT NULL REFERENCES business_requests(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  target_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'planned', -- planned, in_progress, completed, at_risk, delayed
  progress_percent INTEGER GENERATED ALWAYS AS (
    -- Calculate from linked features' story completion
    CASE WHEN feature_count = 0 THEN 0 ELSE (done_count * 100) / feature_count END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(business_request_id, phase_number)
);

-- ReleaseDeployment (formerly mixed into "Release" concept)
CREATE TABLE release_deployments (
  id UUID PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL, -- REL-2026-Q3-01
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'planning',
  target_prod_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link ReleaseDeployments to Sprints (cross-project)
CREATE TABLE release_deployment_sprints (
  release_deployment_id UUID NOT NULL REFERENCES release_deployments(id) ON DELETE CASCADE,
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  PRIMARY KEY (release_deployment_id, sprint_id)
);
```

### Modified Tables

```sql
-- project_features (ADD columns to link to BRs and Release Phases)
ALTER TABLE project_features ADD COLUMN linked_business_request_ids UUID[] DEFAULT '{}';
ALTER TABLE project_features ADD COLUMN linked_release_phase_ids UUID[] DEFAULT '{}';

-- business_requests (REMOVE direct release_id, keep end_date + derived release tracking)
-- (Keep planned_quarter for legacy, but deprecate; use release_phases instead)

-- sprints (no change needed; already have release_id; will keep for project-scoped grouping)
```

### Naming Clarity

To avoid confusion, rename or clarify in documentation:
- **Releases** table → **ProjectReleases** (or keep name, but docs say "project-scoped grouping")
- **ReleaseDeployments** (new table) → used by Release Managers for production deployment
- **ReleasePhases** (new table) → used by Product Owners for business request progress

---

## Persona-Specific Interfaces & Views

### Product Hub (Product Owner / Product Manager)

**View: Product Roadmap Timeline**
```
Timeline: Q2 2026 - Q4 2026
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│ BR-42: Industrial Marketplace         [████████░░] 75%      │
│  ├─ Phase 1: MVP (Aug 15)       [██████████] Done          │
│  ├─ Phase 2: Analytics (Sep 30) [████░░░░░░] 40%           │
│  └─ Phase 3: Integrations (Oct)  [░░░░░░░░░░] Not started  │
│                                                             │
│ BR-15: Payment Gateway               [██████░░░░] 60%       │
│  ├─ Phase 1: Core API (Aug 1)   [██████████] Done          │
│  └─ Phase 2: HSM Integration    [██░░░░░░░░] 20%           │
│                                                             │
│ BR-18: Mobile App Support           [██░░░░░░░░] 20%        │
│  ├─ Phase 1: Design (Jul)        [██████████] Done         │
│  └─ Phase 2: Dev & Testing       [░░░░░░░░░░] Not started  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Filters: Status, Owner, Theme, Priority, Target Quarter
```

**No sprint language.** Only phases, dates, and progress bars.

### Project Hub (Dev Team / Project Manager)

**View: Project Backlog**
```
Project-A: Industrial Portal

Epics (3):
├─ Marketplace Integration → Linked to BRs: [42, 15]
├─ Admin Panel → Linked to BRs: [08, 12]
└─ Reporting → Linked to BRs: [99]

Features (12):
├─ User Registration & Profile → BR-42 Phase-1, BR-18 Phase-2 [75% done]
├─ Product Listing & Search → BR-42 Phase-2 [40% done]
├─ Payment Integration → BR-15 Phase-1 [100% done]
├─ ... (9 more)

Recent Sprints:
├─ Q3 Sprint 1 (Aug 5-16): 8 stories, 6 done [75%]
├─ Q3 Sprint 2 (Aug 19-30): 10 stories, 4 done [40%]
├─ Q3 Sprint 3 (Sep 2-13): Planned, 7 stories

Current Release Grouping:
└─ Q3-v1: Includes Sprints 1, 2, 3 (good checkpoint for ops)
```

**Dev team knows:** Stories feed sprints, sprints feed release groupings, which feed business requests. They can click Feature → "Which BRs does this serve?" without needing to know phase details.

### Release Hub (Release Manager)

**View: Release Deployment Dashboard**
```
REL-2026-Q3-01 (Q3 Production Release)

Status: In Progress → QA Phase
Target Prod: Sep 30, 2026

Linked Work:
├─ Project-A: Sprints Q3-1, Q3-2 (20 stories)
├─ Project-B: Sprints Q3-1, Q3-3 (15 stories)
└─ Project-C: Sprint Q3-2 (8 stories)

Change Records (3):
├─ CHG-001: DB schema (users, products)
├─ CHG-002: API v2 endpoints
└─ CHG-003: Payment gateway

Deployment Pipeline:
├─ Dev: ✅ Sep 15
├─ QA: 🟡 In Progress (Sep 18-25)
├─ Staging: ⏳ Sep 26-28
├─ UAT: ⏳ Sep 29
└─ Prod: ⏳ Sep 30

Sign-off Gates:
├─ Security: Pending → @john.smith
├─ Ops: ✅ Approved → @jane.doe
└─ Rollback: Pending → @ops-team

Related Business Requests (derived):
├─ BR-42 (Phase-2 ships in this release)
├─ BR-15 (Phase-2 ships in this release)
└─ BR-18 (Phase-1 ships in this release)
```

**Release manager can click BR-42 to see:** "This release delivers Phase 2. Here's the feature set, stories, and affected projects."

---

## Implementation Roadmap

### Phase 0: Foundation (Week 1)
- [ ] Create new tables: `business_request_release_phases`, `release_deployments`, `release_deployment_sprints`
- [ ] Alter `project_features` to add BR/Phase link columns
- [ ] Write migration scripts

### Phase 1: Backfill & Validation (Week 2-3)
- [ ] Migrate existing BusinessRequests → Release Phases (1 BR = 1 phase initially, with release_id → derived)
- [ ] Backfill `project_features.linked_business_request_ids` from epic/feature context
- [ ] Validate traceability end-to-end with sample BRs
- [ ] Update services & queries to calculate progress from phases/features

### Phase 2: UI Updates (Week 4-5)
- [ ] **Product Roadmap**: Display Release Phases instead of Sprints/Quarters
  - Drag-to-reorder phases by target date
  - Click phase → see linked features
- [ ] **Project Hub**: Show BR links on Features; track which phase(s) a feature feeds
- [ ] **Release Hub**: Link ReleaseDeployments to Sprints; show which BRs each deployment impacts

### Phase 3: Ops Integration (Week 6)
- [ ] ReleaseHub UI wiring: Create/edit ReleaseDeployments, link sprints
- [ ] Release Manager dashboard to show phased BR delivery
- [ ] Notifications when phases complete (trigger BR updates)

### Phase 4: Documentation & Training (Week 7)
- [ ] Update CLAUDE.md with new entity definitions
- [ ] Write persona guides (Product Owner, Project Manager, Release Manager)
- [ ] Deprecate or clarify legacy `planned_quarter` fields

---

## Guardrails & Governance

### Do's ✅
- ✅ Use **Release Phases** as the Product Hub measuring unit (never sprint)
- ✅ Link **Features** to **Business Requests** for traceability
- ✅ Let Release Managers create **ReleaseDeployments** that span multiple projects
- ✅ Derive **BR release_id** from linked phases, don't hardcode
- ✅ Display business request progress in **phase completion %, not sprint count**

### Don'ts ❌
- ❌ Don't show sprint language in Product Roadmap (confuses Product Owners)
- ❌ Don't force 1:1 Release:Project mapping (breaks cross-project deployments)
- ❌ Don't link BRs directly to Sprints (break the level of abstraction)
- ❌ Don't use `planned_quarter` as the primary BR schedule measure (it's legacy)
- ❌ Don't make ReleaseDeployments project-scoped (defeats the point of Release Hub)

---

## FAQ & Clarifications

**Q: Why not link BR directly to Release?**
A: Because a BR might span multiple releases (e.g., "Deploy Phase 1 in July release, Phase 2 in September release"). Release Phases give us that granularity.

**Q: What about a BR that's only 1 phase, spanning 6 months?**
A: That's still one ReleasePhase with `target_date = 6-month end date`. The features/stories inside determine delivery rhythm.

**Q: Can a Feature link to multiple BRs?**
A: Yes. E.g., "Payment API" might serve BR-15 (Payment Gateway), BR-42 (Marketplace), AND BR-18 (Mobile App). That's OK.

**Q: What's the difference between ProjectRelease and ReleaseDeployment?**
A: ProjectRelease = "Hey dev teams, group your sprints into logical batches for your project." ReleaseDeployment = "Hey ops, here's the cross-project bundle that ships to production on X date."

**Q: Do we deprecate sprints?**
A: No. Sprints stay. They're still the unit of work scheduling within projects. We just don't use them to track BR progress.

**Q: Who owns which view?**
A: Product Owners own the Roadmap (Release Phases). Project Managers own Backlog/Sprints. Release Managers own Deployments.

---

## Success Metrics

After implementation:
1. **Product Owner can articulate a 12-month roadmap** with 100+ BRs, 300+ release phases, without seeing sprint/sprint language. ✅
2. **Release Manager can identify** which BRs ship in each production deployment. ✅
3. **Dev team can trace** a story → feature → release phase → business request → product roadmap. ✅
4. **No entity appears in multiple "persona spaces"** without clear translation (e.g., a sprint is never shown as a BR milestone). ✅
5. **Traceability is bidirectional**: BR → Features → Stories AND Story → Feature → BR. ✅

---

## Next Steps

1. **Review this proposal** with Product Owner, Release Manager, and Tech Lead
2. **Validate schema changes** against current use cases (run migration diffs)
3. **Identify gaps** (e.g., what about defects, incidents, production issues?)
4. **Assign ownership** for each phase of implementation
5. **Schedule weekly sync** to review Phase 0 foundation work

---

**Document prepared by:** Architectural Review  
**Last updated:** 2026-06-28  
**Audience:** Catalyst leadership, Product, Engineering, Release Management
