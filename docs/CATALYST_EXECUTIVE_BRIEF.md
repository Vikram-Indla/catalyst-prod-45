# Catalyst Executive Capability Brief — MIM

**Document Type:** Executive Briefing  
**Version:** 1.0  
**Date:** December 2024  
**Classification:** Internal

---

## Executive Summary

- ✅ **Catalyst is a MIM-owned strategy-to-execution platform** built specifically for Ministry operations, not a generic tool adaptation
- ✅ **Complete work hierarchy implemented:** Business Requests → Epics → Features → Stories → Subtasks with full traceability
- ✅ **Strategy objects operational:** Strategic Themes, Objectives, Key Results (OKR) with ownership and health tracking
- ✅ **Portfolio governance ready:** Departments, Business Lines, Business Owners, Products all modeled with relationships
- ✅ **Operations modules in place:** Incidents, Defects, Change Cards, Releases with audit logging
- ✅ **Dense enterprise UX:** 50+ column tables, inline editing, column visibility controls, pinned columns
- ✅ **Program Increment planning:** Iterations, Sprints, Capacity Allocations, Velocity Baselines
- ✅ **Approval workflows:** Committee approvals, voting, veto controls, multi-step approval chains
- ✅ **Audit-first architecture:** Activity logs, audit events, before/after JSON snapshots, actor tracking
- ✅ **Custom field extensibility:** Field definitions, validation rules, display ordering per entity type
- ✅ **AI foundation ready:** Lovable AI integration available for requirement intake and analysis
- ✅ **Supabase/PostgreSQL backend:** Row-level security, real-time subscriptions, edge functions
- 🟡 **DGA alignment mappable:** Platform structure supports governance standards mapping
- 🟡 **Reporting layer:** Strategic Snapshots exist, analytics dashboards partially evidenced

---

## What Catalyst Is and Isn't

### What Catalyst IS

| Capability | Description |
|------------|-------------|
| **Ministry-native execution system** | Purpose-built for MIM's hierarchy: Departments → Business Lines → Products → Work Items |
| **Strategy-to-execution bridge** | Themes → Objectives → Key Results linked to delivery (Epics/Features/Stories) |
| **Portfolio governance platform** | Business request intake, prioritization, approval workflows, executive reporting |
| **Delivery execution tracker** | Agile work item management with sprint planning and capacity allocation |
| **Operations management** | Incident, defect, change, and release management with committee governance |
| **Single source of truth** | Cross-program traceability eliminating shadow IT and manual consolidation |

### What Catalyst IS NOT

| Not This | Why |
|----------|-----|
| A Jira replacement | Catalyst complements team execution tools; it owns portfolio-level governance |
| A ServiceNow replacement | Coexistence strategy—Catalyst handles MIM-specific workflows, ITSM for enterprise IT |
| A generic project tracker | Every entity and workflow reflects MIM's actual governance requirements |
| A vendor-controlled platform | MIM owns the IP, data model, and evolution roadmap |

---

## Capability Map (Evidence-Based)

| Domain | Capability | Location in Catalyst | Maturity | Executive Value |
|--------|------------|---------------------|----------|-----------------|
| **Strategy** | Strategic Themes | `strategic_themes` table, OKR Hub | ✅ Ready | Cascade vision to measurable objectives |
| **Strategy** | Objectives & Key Results | `objectives`, `key_results` tables | ✅ Ready | Track strategic progress with check-ins |
| **Strategy** | Strategy Alignment | `strategy_objectives`, Snapshots | ✅ Ready | Link work to strategic intent |
| **Portfolio** | Business Requests | `business_requests` (100+ fields) | ✅ Ready | Central demand intake with full lifecycle |
| **Portfolio** | Departments & Business Lines | `departments`, `business_lines` | ✅ Ready | Organizational hierarchy for rollups |
| **Portfolio** | Products | `products` table | ✅ Ready | Product-centric portfolio view |
| **Portfolio** | Business Owners | `business_owners` table | ✅ Ready | Ownership accountability |
| **Delivery** | Epics | `epics` table | ✅ Ready | Large initiative tracking |
| **Delivery** | Features | `features` table | ✅ Ready | Capability decomposition |
| **Delivery** | Stories | `stories` table | ✅ Ready | Implementable work items |
| **Delivery** | Program Increments | `program_increments` table | ✅ Ready | SAFe-style planning cadence |
| **Delivery** | Iterations/Sprints | `iterations`, `anchor_sprints` | ✅ Ready | Sprint execution tracking |
| **Delivery** | Capacity Planning | `capacity_allocations`, `capacity_plans` | ✅ Ready | Resource-aware planning |
| **Operations** | Incidents | `incidents` table | ✅ Ready | Issue tracking with severity/SLA |
| **Operations** | Defects | `defects` table | ✅ Ready | Quality management with workflows |
| **Operations** | Change Cards | `change_cards`, `change_approvals` | ✅ Ready | Change management with approval flows |
| **Operations** | Releases | `releases`, `release_versions` | ✅ Ready | Release coordination |
| **Governance** | Committee Voting | `committee_votes`, `committee_members` | ✅ Ready | Structured decision-making |
| **Governance** | Approval Workflows | `change_approvals`, step_order | ✅ Ready | Multi-step approval chains |
| **Governance** | Audit Logging | `activity_logs`, `*_audit_log` | ✅ Ready | Full action traceability |
| **Governance** | Custom Fields | `custom_field_defs`, `custom_field_values` | ✅ Ready | Extensible without code |
| **AI** | AI Gateway | Lovable AI integration | ✅ Ready | LLM-powered requirement processing |
| **Reporting** | Strategic Snapshots | `strategic_snapshots` (if exists) | 🟡 Partial | Point-in-time portfolio health |
| **Roadmaps** | Product Roadmap | `product-roadmap` module | ✅ Ready | Timeline visualization |

---

## Live Executive Demo Script

### Preparation
- Ensure demo data is seeded (Business Requests, Stories, Incidents)
- Log in as an executive persona with full visibility

### Demo Flow (12 Steps)

| Step | Route | What to Show | Executive Message |
|------|-------|--------------|-------------------|
| 1 | `/enterprise` | Strategy Room dashboard | "This is the single-pane strategic view of MIM's portfolio" |
| 2 | `/enterprise/okr` | OKR Hub with Themes/Objectives | "Every strategic theme cascades to measurable key results" |
| 3 | `/enterprise/okr` | Click an Objective → Drawer | "Full context: owner, status, linked work, check-in history" |
| 4 | `/enterprise/backlog` | Strategic Backlog | "All business requests with prioritization and governance status" |
| 5 | `/enterprise/backlog` | Filter by Department/Status | "Slice the portfolio any way leadership needs" |
| 6 | `/product-roadmap` | Roadmap timeline view | "Visual timeline of what's delivering when" |
| 7 | `/delivery` | Delivery view with work items | "From here, teams execute—but leadership maintains visibility" |
| 8 | `/delivery` | Click Epic → Show linked Features/Stories | "Full traceability: every story links to strategic intent" |
| 9 | `/release/incidents` | Incidents list | "Operational awareness: what's impacting services now" |
| 10 | `/release/incidents/insights` | Incident analytics | "Trends, patterns, SLA tracking—data-driven ops" |
| 11 | `/release/changes` | Change Cards with approval status | "Governance at the change level with committee oversight" |
| 12 | `/enterprise/snapshots` | Strategic Snapshot | "Point-in-time executive report: this is how we report up" |

---

## Functional Inventory by Module

### Strategy Module
**Purpose:** Define and track strategic direction  
**Entities:** Strategic Themes, Strategy Objectives, Objectives, Key Results  
**Key Features:**
- Theme ownership and health status
- Objective hierarchy with tier support (Enterprise/Portfolio/Program/Team)
- Key Result check-ins with score tracking
- Alignment visualization

### Portfolio Module  
**Purpose:** Demand intake, prioritization, and governance  
**Entities:** Business Requests, Departments, Business Lines, Business Owners, Products  
**Key Features:**
- 100+ field business request form
- Multi-stage process workflow (process_step field)
- Priority tier and risk rating
- Approval tracking with committee integration
- Budget planning (approved_budget_sar, estimated_cost_sar)

### Delivery Module
**Purpose:** Execution tracking from epic to subtask  
**Entities:** Epics, Features, Stories, Projects, Iterations  
**Key Features:**
- Full work item hierarchy with linking
- Sprint/Iteration planning
- Capacity allocation per team
- Story points and velocity tracking
- Acceptance criteria per story

### Operations Module
**Purpose:** Incident, defect, change, and release management  
**Entities:** Incidents, Defects, Change Cards, Releases, Release Versions  
**Key Features:**
- Incident severity and priority classification
- Defect workflow with resolution tracking
- Change card approval workflow with committee voting
- Release window management
- Conflict detection between changes

### Governance Module
**Purpose:** Approval workflows, audit, and compliance  
**Entities:** Committee Members, Committee Votes, Approval Steps, Audit Logs  
**Key Features:**
- Multi-step approval chains
- Veto capability for committee members
- Before/after JSON audit snapshots
- Actor tracking for all changes

---

## Traceability Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        STRATEGY LAYER                           │
│  Strategic Theme → Strategy Objective → Objective → Key Result  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ aligns to
┌─────────────────────────▼───────────────────────────────────────┐
│                        PORTFOLIO LAYER                          │
│  Business Request → (approval) → Business Line → Product        │
└─────────────────────────┬───────────────────────────────────────┘
                          │ decomposes to
┌─────────────────────────▼───────────────────────────────────────┐
│                        DELIVERY LAYER                           │
│  Epic → Feature → Story → Subtask                               │
│  (linked to Program Increment → Iteration → Team)               │
└─────────────────────────┬───────────────────────────────────────┘
                          │ produces
┌─────────────────────────▼───────────────────────────────────────┐
│                       OPERATIONS LAYER                          │
│  Release → Change Card → (approval) → Deployment                │
│  Incident ← Defect ← Story (linked)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Executive Q&A

### A) Why not just enhance Jira or ServiceNow?

**Answer:** Jira and ServiceNow are excellent for their core purposes—team execution and IT service workflows. Catalyst is differentiated by:

| Catalyst Advantage | Jira/ServiceNow Gap |
|-------------------|---------------------|
| MIM-native data model (Departments, Business Lines, Business Owners) | Requires extensive customization |
| Strategy-to-execution traceability (Themes→Objectives→KRs→Epics) | Not designed for portfolio governance |
| Business Request lifecycle with ministry-specific approval workflows | Generic ticketing without governance context |
| Executive reporting designed for ministry leadership | Requires BI layer and custom dashboards |
| Arabic/English AI intake capability | Requires third-party integration |

**Evidence:** Database schema shows 100+ fields on business_requests tailored to MIM needs (budget_type, approval_decision, portfolio_decision, funding_status, etc.)

---

### B) Is Catalyst replacing ServiceNow?

**Answer:** Not initially. The strategy is **coexist then converge.**

**Near-term:** Catalyst complements ServiceNow by owning:
- Strategy-to-execution portfolio governance
- Cross-program traceability
- Executive views and strategic snapshots
- MIM-specific objects and workflows

**Later option:** Catalyst can absorb ITSM use cases (incident/change/release) once operational maturity is proven and ministry decides.

**Evidence:** Catalyst has complete incident, change_cards, and releases tables with approval workflows—ready for ITSM if needed.

---

### C) Does Catalyst align with DGA indexes/standards?

**Answer:** Yes, Catalyst is built to align. Mapping approach:

| DGA Standard | Catalyst Mapping |
|--------------|------------------|
| Digital Transformation Basic Standards V4.0 | Governance workflows, audit logging, approval chains |
| Digital Experience Maturity Index | Strategic snapshots, health indicators, service performance tracking |
| IT Governance Controls | Committee approvals, veto controls, role-based access |
| Continuity/Availability Policies | Incident management, SLA tracking, change governance |

**Evidence:** Tables like `committee_votes`, `change_approvals`, `activity_logs` directly support governance requirements.

---

### D) Does Catalyst follow known frameworks?

**Answer:** Yes—by design, it incorporates best practices:

| Framework | Catalyst Implementation |
|-----------|------------------------|
| **Agile** | Epics/Features/Stories/Subtasks, sprint execution, backlog management |
| **SAFe** | Program Increments, anchor sprints, capacity planning, PI objectives |
| **Portfolio/PMI** | Milestones, delivery governance, risk rating, approvals |
| **ITSM** | Incident/change/release management, committee approvals, SLA tracking |

**Evidence:** Database includes `program_increments`, `anchor_sprints`, `capacity_allocations` (SAFe); `incidents`, `change_cards`, `releases` (ITSM).

---

### E) Is it cheaper than current tools?

**Answer:** Cost savings come from multiple levers (specific numbers require ministry analysis):

| Cost Lever | Mechanism |
|------------|-----------|
| Reduced license sprawl | One platform vs. Jira Align + Jira + add-ons + ServiceNow modules |
| Lower customization spend | Purpose-built vs. consultant-heavy vendor customization |
| Eliminated reporting shadow IT | Native executive reporting vs. manual Excel/PowerPoint |
| Platform reuse | Single engine across departments vs. siloed tools |

**Costs to consider:**
- Platform team and operations
- Security and compliance
- Ongoing product ownership

---

### F) Why is it more sustainable than Jira/ServiceNow?

**Answer:** Sustainability = ownership + fit-to-purpose:

| Sustainability Factor | Catalyst Advantage |
|----------------------|-------------------|
| MIM owns data model and reporting logic | No vendor changes breaking governance |
| Ministry-specific workflows | Business request closure rules, alignment reporting match how MIM works |
| Token-based design system | No hard-coded colors, reusable components reduce UI regression |
| Evolvable architecture | Can adapt as DGA standards update without vendor roadmap dependencies |

**Evidence:** Design system uses semantic tokens; custom_field_defs allows extensibility without code changes.

---

### G) What skills are needed? Vendor lock-in risks?

**Required Skills:**

| Role | Responsibility |
|------|----------------|
| Product Owner | Governance + roadmap |
| Solution Architect | Domain model + integrations |
| Frontend Engineers | React + TypeScript + enterprise UX |
| Backend Engineers | API + database + security |
| DevOps/SRE | CI/CD, observability, reliability |
| Data/Analytics | Reporting layer, metrics |
| AI Engineer | Prompt pipelines, guardrails (for AI modules) |

**Vendor Lock-in Risk:** 
- **Reduced** vs. SaaS vendors if MIM owns code and hosting
- **New risk** = platform team dependency

**Mitigation:** Architecture documentation, coding standards, automated tests, reproducible infrastructure, structured handover.

---

### H) When can all DT teams use it? Roadmap?

**Phase 1 (0-3 months): Portfolio Visibility**
- Strategy Room + OKR Hub
- Delivery hierarchy and traceability
- Strategic Snapshots
- Roadmaps (read-heavy)

**Phase 2 (3-6 months): Execution + Governance at Scale**
- Capacity planning and resource inventory
- Approval workflows (committee approvals)
- Audit logs and reporting maturity
- Integrations: SSO, notifications, optional Jira sync

**Phase 3 (6-12 months): Operational Excellence + AI**
- Incident/change/release maturity (if replacing ITSM)
- AI requirement ingestion (Arabic/English)
- Enterprise analytics and compliance mapping

---

### I) Is adoption easier than Jira/ServiceNow?

**Yes, when:**
- UX and data model match how MIM teams actually work
- Familiar concepts (epic/feature/story)
- Better executive reporting without manual translation
- Prebuilt ministry governance patterns

**Honest caveat:**
- Easier with migration support, training, and integration—not just UI

---

### J) Is it fully custom built by MIM?

**Answer:** Catalyst is a MIM-owned platform built for MIM.

| Ownership Aspect | Status |
|-----------------|--------|
| Intellectual property | MIM-owned |
| Data model and governance rules | MIM-defined |
| Hosting and infrastructure | MIM-controlled |
| Delivery capacity | Can use vendors, but IP stays with ministry |

---

## Sustainability & Operating Model

### Platform Team Structure

```
┌──────────────────────────────────────────────────────────────┐
│                    PLATFORM OWNER (MIM)                       │
│            Roadmap / Governance / Stakeholder Mgmt            │
└──────────────────────────┬───────────────────────────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
┌───▼───┐            ┌─────▼─────┐          ┌─────▼─────┐
│ Arch  │            │Engineering│          │   Ops     │
│ Team  │            │   Team    │          │   Team    │
└───────┘            └───────────┘          └───────────┘
Domain Model         Frontend/Backend       DevOps/SRE
Integrations         AI Modules             Support
Standards            Testing                Monitoring
```

### Key Success Factors

1. **Clear product ownership** at ministry level
2. **Documented architecture** and coding standards
3. **Automated testing** and CI/CD
4. **Knowledge transfer** protocols
5. **Regular stakeholder engagement** for roadmap alignment

---

## Slide-Ready Headlines

### For Vision Slides
- "Catalyst: MIM's Single Lens from Strategy to Execution"
- "One Platform, Full Traceability, Ministry-Owned"
- "Built for How MIM Works—Not How Vendors Think"

### For Capability Slides
- "100+ Fields Designed for Ministry Governance"
- "Strategy → Portfolio → Delivery → Operations: Connected"
- "Committee Approvals, Audit Trails, Full Accountability"

### For Differentiation Slides
- "Jira is for Teams. ServiceNow is for IT. Catalyst is for MIM."
- "Coexist Today, Converge When Ready"
- "No Vendor Roadmap Dependency—We Own the Evolution"

### Objection-Handling Lines

| Objection | Response |
|-----------|----------|
| "Why not just use Jira?" | "Jira is great for team execution. Catalyst gives leadership the portfolio governance layer Jira wasn't designed for." |
| "This looks expensive to build." | "Compare to multi-year customization and license costs for adapting generic tools to MIM's specific governance needs." |
| "Can the team maintain this?" | "With documented architecture, coding standards, and clear handover—yes. The alternative is permanent vendor dependency." |
| "Is this aligned with DGA?" | "Absolutely. We can provide a standards mapping against DGA Digital Transformation requirements and governance controls." |

---

## Appendix: Database Evidence Summary

Key tables inspected (from schema):

| Table | Field Count | Purpose |
|-------|-------------|---------|
| `business_requests` | 100+ | Central demand intake |
| `strategic_themes` | 10+ | Strategy objects |
| `objectives` | 15+ | OKR objectives |
| `key_results` | 12+ | Measurable key results |
| `epics` | 12+ | Large initiatives |
| `features` | 15+ | Capability delivery |
| `stories` | 20+ | Implementable items |
| `incidents` | 25+ | Operations tracking |
| `change_cards` | 20+ | Change management |
| `committee_votes` | 8+ | Governance decisions |
| `activity_logs` | 10+ | Full audit trail |

---

*Document generated from Catalyst codebase analysis — December 2024*
