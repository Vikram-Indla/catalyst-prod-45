# Catalyst - Jira Align Portfolio Management

> Operational note: documentation refreshed to trigger a clean deployment workflow.

A comprehensive SAFe (Scaled Agile Framework) portfolio management application built with modern web technologies.


## Project info

**URL**: https://lovable.dev/projects/77578548-3823-4707-93f2-f52869928c60

## Overview

Catalyst is a full-featured portfolio management system implementing Jira Align capabilities including:

- **Epic Management**: Comprehensive epic lifecycle tracking with multiple views
- **Portfolio Planning**: Strategic themes, initiatives, and roadmapping
- **Program Management**: PI planning, program boards, and capacity planning
- **Team Collaboration**: Sprint planning, story tracking, and task management
- **Strategic Alignment**: OKR tracking, value streams, and benefit realization
- **Risk Management**: ROAM boards, dependency tracking, and health monitoring
- **Reporting**: Status reports, trace reports, and hierarchy visualization

## Key Features

### Epic Management (Phase 5 Complete)
- **9 Detail Panel Tabs**: Details, Design, Intake, Benefits, Value, Milestones, Spend, Forecast, Links
- **3 Kanban Views**: State flow, Process flow, Custom columns
- **Bulk Operations**: Bottom-up estimate, mass move, export, import, print cards
- **Reporting**: Status reports, trace reports, requirement hierarchy
- **Context Actions**: Duplicate, move, rank, parking lot, recycle bin

### Security & Access Control (Phase 4 Complete)
- **Role-Based Access Control (RBAC)**: Admin, Program Manager, Team Lead, User roles
- **Scope-Based Filtering**: Team/Program/Portfolio membership tracking
- **Row-Level Security (RLS)**: Comprehensive data isolation
- **Permission Guards**: Fine-grained access control on operations

### Strategic Planning
- **Strategy Room**: Mission, vision, values, strategic goals
- **OKR Management**: Objectives, key results, check-ins, heatmap
- **Portfolio Kanban**: Theme and epic prioritization
- **Roadmaps**: PI-based timeline visualization

### Program Execution
- **Program Board**: PI planning with team swimlanes and dependencies
- **Capacity Planning**: Team velocity and load forecasting
- **Forecast View**: Work item effort distribution across PIs
- **Dependencies**: Visualization and risk tracking

## Documentation

Comprehensive documentation available in the `/docs` folder:

- **PHASE_5_EPIC_FEATURES_COMPLETION.md**: Complete epic functionality documentation
- **EPIC_FEATURES_USER_GUIDE.md**: User guide for epic management
- **PHASE_4_COMPLETION.md**: Security and access control implementation
- **JIRA_ALIGN_CHROME_IMPLEMENTATION.md**: Jira Align UI parity notes
- **CATALYST-MASTER-UI-UX-PARITY-PROMPT.md**: Design system specification

## What technologies are used for this project?

This project is built with:

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query (React Query) for server state
- **Backend**: Supabase (PostgreSQL database, Authentication, Edge Functions)
- **Drag & Drop**: @hello-pangea/dnd
- **Date Handling**: date-fns
- **Routing**: React Router v6
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: Sonner (toast notifications)

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/77578548-3823-4707-93f2-f52869928c60) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/77578548-3823-4707-93f2-f52869928c60) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Date Pulse — Phase 2A (MVP)

**Status:** Foundation Complete  
**Scope:** Business Request health status computation + ProductBacklogPage integration  
**Last updated:** 2026-06-19

### What Phase 2A Delivers

Date Pulse is a date-integrity engine that computes health status for Business Requests based on 18 rules across 5 categories:

- **Category A (Missing Dates):** Detects missing target dates, linked work without dates, release date gaps
- **Category B (Date Conflicts):** Detects release after BR target, sprint after release, story after release
- **Category C (Scope Creep):** Detects new stories after commitment baseline, defects near release
- **Category D (Status):** Detects work item state contradictions, overdue items
- **Category E (Alignment):** Detects ownership gaps, stakeholder misalignment

### Health Status States (7)

| State        | Color  | Meaning                                              |
|--------------|--------|------------------------------------------------------|
| Uncommitted  | Grey   | No work linked or dates set                           |
| Committed    | Blue   | Work linked + dates present                           |
| On Track     | Green  | Dates aligned, no violations                          |
| Delayed      | Amber  | Minor date misalignment                              |
| At Risk      | Orange | Significant date conflicts detected                  |
| Blocked      | Red    | Critical date misalignment or impossible schedule    |
| Delivered    | Green  | Completed                                            |

### Implemented Files

```
src/lib/date-pulse/
  ├── DatePulseEngine.ts         (18 rules, 5 categories)
  └── HealthStatusEngine.ts      (7-state finite state machine)

src/hooks/
  └── useBusinessRequestHealth.ts (React hook with 30s cache)

src/components/business-request/
  ├── HealthStatusBadge.tsx       (Status pill with ADS colors)
  ├── HealthStatusDescriptor.tsx  (Hover card details)
  └── DatePulseHoverCard.tsx      (Violation list + actions)

src/types/
  └── date-pulse.ts              (HealthStatus, DatePulseViolation, etc.)

supabase/migrations/
  └── 20260619_add_business_request_health_status.sql
```

### Integration

**ProductBacklogPage:** Health column added to BR backlog table  
**Column spec:** width=9, opt-in via picker, renders badge on every BR row  
**Interaction:** Click badge → popover shows violations + suggested actions  
**Performance:** <100ms per badge with in-memory 30s TTL cache

### Phase 2A Limitations (by design)

- ❌ Health column NOT on Epic/Story/Task/Defect/Incident views yet (Phase 3 scope)
- ❌ Kanban cards do not show health badges (Phase 3 scope)
- ❌ Timeline/roadmap do not mark health (Phase 3 scope)
- ❌ No audit trail for date changes (Phase 7 scope)
- ❌ No rationale capture for de-links (Phase 7 scope)
- ❌ No computed "Date Pulse Owner" field resolution (Phase 3+ scope)
- ❌ Release/Sprint dashboards not designed yet (Phase 5-6 scope)

### Testing Status

- ✅ ProductBacklogPage live verification: PASS (all 7 states render, popover works, no console errors)
- ⏳ Unit tests: Pending (vitest not configured; requires setup in next session)
- ⏳ Component storybook: Pending

### Next Steps (Phase 0 Research)

Before Phase 1-7 implementation, conduct full repository research per the strategic brief:

1. **Route & surface inventory** — All places where dates appear
2. **Data model audit** — Current date fields across all work item types
3. **Relationship mapping** — How BR, Epic, Story, Sprint, Release, Defect, Incident connect
4. **Component reuse audit** — Existing badge, icon, hover card patterns
5. **Dashboard architecture** — Current Product, Release, Project dashboard structure
6. **Rule expansion** — Map all 40+ rules (A-I categories per strategic brief) to Catalyst data model

### How to Run Phase 2A Locally

```bash
cd ~/catalyst
npm run dev
# Navigate to http://localhost:8080/product-hub/[product-code]/backlog
# Enable "Health" column from the column picker
# Click any health badge to see violations
```

### Documentation

- **Architecture:** See `DATE_PULSE_ARCHITECTURE_PHASE_1.md` (foundational spec)
- **Strategic vision:** See `DATE_PULSE_PHASE2_HANDOVER.md` (full brief including Phase 2B-7)
- **Code:** Inline comments in `DatePulseEngine.ts`, `HealthStatusEngine.ts`, components

---

