/**
 * TestHub Documentation Page
 * Route: /testhub/docs
 * Provides a visually appealing, downloadable functional flow guide.
 */
import { useState } from 'react';
import { Download, BookOpen, ChevronDown, ChevronRight, Database, ArrowRight, CheckCircle2, AlertTriangle, Layers, GitBranch } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

// ── Markdown content ──
const DOCS_MARKDOWN = `# 🧪 TestHub — Complete Functional Flow Guide

> **Version:** 1.0 · **Last Updated:** February 2026  
> **Module:** TestHub (Quality Assurance & Release Management)

---

## 📋 Table of Contents

1. [Module Overview](#1-module-overview)
2. [Dependency Chain — What Must Exist Before What](#2-dependency-chain)
3. [Step-by-Step Testing Flow](#3-step-by-step-testing-flow)
4. [Database Schema — Key Tables & Relationships](#4-database-schema)
5. [Business Rules & Constraints](#5-business-rules)
6. [Quick Reference — Routes & Navigation](#6-routes)

---

## 1. Module Overview {#1-module-overview}

TestHub is the unified QA and Release Management module. It covers the full testing lifecycle:

| Layer | Modules | Purpose |
|-------|---------|---------|
| **Foundation** | Folders, Tags, Environments, Shared Steps | Organize and reuse test assets |
| **Authoring** | Test Repository (Cases), Requirements | Create and version test cases |
| **Grouping** | Test Sets, Test Plans | Bundle cases logically or for formal planning |
| **Execution** | Test Cycles, Execution Hub, Quick Run | Run tests, record results |
| **Quality** | Defects, Traceability, Coverage Matrix | Track failures and coverage |
| **Release** | Releases, Command Center, Quality Gates | Gate releases on quality metrics |
| **Intelligence** | Dashboard, Reports, CATY AI, Activity Feed | Analyze and report |

---

## 2. Dependency Chain — What Must Exist Before What {#2-dependency-chain}

This is the **critical dependency order**. You cannot use a downstream feature without first creating the upstream dependency.

\`\`\`
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 0 — PLATFORM (auto-provisioned)                            │
│  ► Project (tm_projects) — created on first login                 │
│  ► User & Roles (tm_users, tm_roles, tm_user_roles)               │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 1 — FOUNDATION (create these first)                        │
│  ► Folders (tm_folders) — organize test cases into tree            │
│  ► Tags (tm_labels) — label anything                              │
│  ► Environments (tm_environments) — define test targets            │
│  ► Shared Steps (tm_step_definitions) — reusable step blocks      │
│  ❌ No dependencies — these are standalone                        │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 2 — AUTHORING (needs Layer 1)                              │
│  ► Test Cases (tm_test_cases) — requires a Folder                 │
│     • Steps (tm_test_steps) — belong to a test case               │
│     • Gherkin Steps (tm_gherkin_steps) — BDD format               │
│     • Attachments (tm_test_attachments)                            │
│     • Versions (tm_test_case_versions) — auto-tracked             │
│  ► Requirements (tm_requirement_links) — link to test cases       │
│  ⚠️ You MUST create at least one folder before creating cases     │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 3 — GROUPING (needs Layer 2)                               │
│  ► Test Sets (tm_test_sets + tm_test_set_cases)                   │
│     • Bundle test cases into reusable groups                      │
│     • Static or dynamic membership                                │
│  ► Test Plans (tm_test_plans + tm_plan_scope + tm_plan_team)      │
│     • Formal planning with scope, team, milestones, approvals     │
│  ⚠️ You need test cases before you can add them to sets/plans     │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 4 — EXECUTION (needs Layer 2, optionally Layer 3)          │
│  ► Test Cycles (tm_test_cycles)                                   │
│     • Links to test cases via tm_cycle_scope                      │
│     • Assigns testers via tm_cycle_assignments                    │
│     • Tracks milestones via tm_cycle_milestones                   │
│  ► Test Execution (tm_test_runs + tm_step_results)                │
│     • Run individual test cases within a cycle                    │
│     • Record pass/fail/blocked per step                           │
│  ⚠️ You need test cases (and optionally a release) to create     │
│     a cycle. You need an active cycle to execute tests.           │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 5 — QUALITY (needs Layer 4)                                │
│  ► Defects (tm_defects) — raised from failed executions           │
│     • Linked to test cases via tm_defect_links                    │
│  ► Coverage Matrix — requires cases + requirements                │
│  ► Traceability — requires cases + requirements + defects         │
│  ⚠️ Defects can be created standalone, but are most useful when  │
│     linked to a test run that failed.                             │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 6 — RELEASE (needs Layer 4 + Layer 5)                      │
│  ► Releases (linked from releases table)                          │
│  ► Quality Gates (tm_release_quality_gates)                       │
│     • Automated pass/fail criteria based on cycle metrics          │
│  ► Command Center — real-time quality dashboard per release        │
│  ⚠️ Releases need cycles attached to calculate quality metrics.  │
│     Quality gates need defect/execution data to evaluate.         │
└──────────────┬──────────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 7 — INTELLIGENCE (read-only, aggregates everything)        │
│  ► Dashboard — summary of all metrics                             │
│  ► Reports — configurable drill-down reports                      │
│  ► CATY AI — AI-powered insights and suggestions                  │
│  ► Activity Feed — audit trail of all actions                     │
│  ✅ No creation dependencies — works with whatever data exists    │
└─────────────────────────────────────────────────────────────────────┘
\`\`\`

---

## 3. Step-by-Step Testing Flow {#3-step-by-step-testing-flow}

Follow this exact order to test every module end-to-end:

### 🔹 Step 1: Foundation Setup

| # | Action | Route | What to verify |
|---|--------|-------|----------------|
| 1.1 | Create 2–3 **Folders** (e.g., "Login Module", "Payments", "API") | \`/testhub/repository\` (left panel) | Folder tree renders, rename/delete works |
| 1.2 | Create 2–3 **Tags** | \`/testhub/tags\` | Tags list, edit, delete |
| 1.3 | Create an **Environment** (e.g., "Staging", "Production") | \`/testhub/environments\` | Environment card renders with health status |
| 1.4 | Create a **Shared Step** (e.g., "Login as Admin") | \`/testhub/shared-steps\` | Step appears in list, can be referenced later |

### 🔹 Step 2: Test Case Authoring

| # | Action | Route | What to verify |
|---|--------|-------|----------------|
| 2.1 | Select a folder, click **"Create Test Case"** | \`/testhub/repository\` | Modal opens, folder is pre-selected |
| 2.2 | Fill title, priority, type, add 3–5 **manual steps** | Create modal | Steps render in order with action/expected columns |
| 2.3 | Add a **shared step** reference to one test case | Create/Edit modal | Shared step block renders inline |
| 2.4 | Create 5+ test cases across different folders | Repository | Table/grid view shows all cases with correct folder |
| 2.5 | **Clone** a test case | Context menu | Clone appears with "(Copy)" suffix |
| 2.6 | **Version** a test case (edit and save) | Edit modal | Version history panel shows v1 → v2 |
| 2.7 | Attach a file to a test case | Attachments section | File uploads, thumbnail renders |

### 🔹 Step 3: Requirements & Traceability

| # | Action | Route | What to verify |
|---|--------|-------|----------------|
| 3.1 | Create a **Requirement** | \`/testhub/requirements\` | Requirement card renders |
| 3.2 | **Link** test cases to the requirement | Requirement detail | Linked cases appear in the list |
| 3.3 | View the **Coverage Matrix** | \`/testhub/coverage-matrix\` | Matrix shows requirements vs. cases |
| 3.4 | View the **Traceability** page | \`/testhub/traceability\` | End-to-end trace: Req → Case → Run → Defect |

### 🔹 Step 4: Test Sets

| # | Action | Route | What to verify |
|---|--------|-------|----------------|
| 4.1 | Create a **Test Set** (e.g., "Smoke Tests") | \`/testhub/test-sets\` | Set card renders |
| 4.2 | Add test cases to the set | Set detail page | Cases appear in the set with correct count |
| 4.3 | Remove a case from the set | Set detail | Count decreases, case removed from list |

### 🔹 Step 5: Test Plans (Formal Planning)

| # | Action | Route | What to verify |
|---|--------|-------|----------------|
| 5.1 | Create a **Test Plan** (draft) | \`/testhub/test-plans\` | Plan card renders with "Draft" status |
| 5.2 | Add **scope** (folders or individual cases) | Plan detail | Scope section lists included items |
| 5.3 | Add **team members** with roles | Plan detail | Team grid renders with roles |
| 5.4 | Add **milestones** with target dates | Plan detail | Milestone timeline renders |
| 5.5 | Submit for **approval** | Plan detail | Status changes to "Pending Approval" |
| 5.6 | **Approve** the plan | Plan detail (as approver) | Status changes to "Approved" |

### 🔹 Step 6: Test Cycles & Execution

| # | Action | Route | What to verify |
|---|--------|-------|----------------|
| 6.1 | Create a **Test Cycle** (link to a release if available) | \`/testhub/cycles\` | Cycle card renders |
| 6.2 | **Add test cases** to the cycle | Cycle detail | Cases listed with "Not Run" status |
| 6.3 | **Assign testers** to cases | Cycle detail | Assignee avatar appears on each case |
| 6.4 | **Start execution** — click "Run" on a test case | Cycle detail → Execute | Three-pane execution view opens |
| 6.5 | Mark steps as **Pass/Fail/Blocked** | Execution page | Step status pills update in real-time |
| 6.6 | Complete the run — set overall result | Execution page | Run result saved, progress bar updates |
| 6.7 | Use **Quick Run** (modal execution for fast tests) | Cycle detail | Modal opens, result saved |
| 6.8 | View **Cycle Report** | \`/testhub/cycles/:id/report\` | Charts + summary render correctly |
| 6.9 | View **Execution Hub** | \`/testhub/execution\` | All active cycles shown with progress |

### 🔹 Step 7: Defect Management

| # | Action | Route | What to verify |
|---|--------|-------|----------------|
| 7.1 | During a failed execution, click **"Log Defect"** | Execution page | Defect form pre-fills from failed step |
| 7.2 | Create a **standalone defect** | \`/testhub/defects\` | Defect card renders with priority/severity |
| 7.3 | **Link** a defect to a test case | Defect detail | Link appears in both defect and case views |
| 7.4 | Update defect **status** (Open → In Progress → Fixed) | Defect detail | Status badge updates, audit log records |
| 7.5 | Add **comments** to a defect | Defect detail | Comment thread renders |

### 🔹 Step 8: Release Management & Quality Gates

| # | Action | Route | What to verify |
|---|--------|-------|----------------|
| 8.1 | View/create a **Release** | \`/testhub/releases\` | Release card renders |
| 8.2 | Link test cycles to the release | Release detail or cycle creation | Cycles appear under the release |
| 8.3 | View **Command Center** | \`/testhub/releases/command-center\` | Real-time quality dashboard renders |
| 8.4 | Configure **Quality Gates** | \`/testhub/releases/quality-gates\` | Gate rules render (pass rate %, defect thresholds) |
| 8.5 | Evaluate a gate (automated based on cycle data) | Quality gates page | Pass/Fail indicator updates |

### 🔹 Step 9: Intelligence & Reporting

| # | Action | Route | What to verify |
|---|--------|-------|----------------|
| 9.1 | View the **Dashboard** | \`/testhub/dashboard\` | Widgets render with live data |
| 9.2 | Generate a **Report** | \`/testhub/reports\` | Report renders with charts |
| 9.3 | View **Activity Feed** | \`/testhub/activity\` | Chronological action log |
| 9.4 | Use **CATY AI** | \`/testhub/caty\` | AI provides insights/suggestions |
| 9.5 | View **My Test Scope** | \`/testhub/my-scope\` | Personal work queue with assigned items |

### 🔹 Step 10: Settings & Utilities

| # | Action | Route | What to verify |
|---|--------|-------|----------------|
| 10.1 | View **Settings** | \`/testhub/settings\` | Configuration options render |
| 10.2 | **Import/Export** test cases | \`/testhub/import-export\` | CSV/Excel upload & download |

---

## 4. Database Schema — Key Tables & Relationships {#4-database-schema}

### Core Entity Tables

| Table | Purpose | Key Columns | Foreign Keys |
|-------|---------|-------------|--------------|
| \`tm_projects\` | Project container | id, name, key_prefix | — |
| \`tm_users\` | User profiles | id, auth_user_id, full_name | auth.users |
| \`tm_folders\` | Case folder tree | id, name, parent_id, project_id | tm_projects, self-ref |
| \`tm_test_cases\` | Test case definitions | id, case_key, title, folder_id, status | tm_folders, tm_projects |
| \`tm_test_steps\` | Steps within a case | id, test_case_id, step_number, action | tm_test_cases |
| \`tm_step_definitions\` | Shared/reusable steps | id, name, steps_json, project_id | tm_projects |
| \`tm_labels\` | Tags/labels | id, name, color, project_id | tm_projects |
| \`tm_environments\` | Test environments | id, name, url, health_status | tm_projects |

### Grouping Tables

| Table | Purpose | Key Foreign Keys |
|-------|---------|-----------------|
| \`tm_test_sets\` | Named groups of cases | project_id |
| \`tm_test_set_cases\` | Junction: set ↔ case | test_set_id → tm_test_sets, test_case_id → tm_test_cases |
| \`tm_test_plans\` | Formal test plans | project_id, created_by |
| \`tm_plan_scope\` | Plan scope entries | plan_id → tm_test_plans, entity_id (folder or case) |
| \`tm_plan_team\` | Plan team assignments | plan_id → tm_test_plans, user_id → tm_users |
| \`tm_plan_milestones\` | Plan milestones | plan_id → tm_test_plans |
| \`tm_plan_approvals\` | Plan approval workflow | plan_id → tm_test_plans, approver_id → tm_users |

### Execution Tables

| Table | Purpose | Key Foreign Keys |
|-------|---------|-----------------|
| \`tm_test_cycles\` | Execution containers | project_id, release_id, environment_id |
| \`tm_cycle_scope\` | Cycle ↔ case links | cycle_id → tm_test_cycles, test_case_id → tm_test_cases |
| \`tm_cycle_assignments\` | Tester assignments | cycle_id, user_id, test_case_id |
| \`tm_test_runs\` | Individual execution records | cycle_id, test_case_id, executed_by |
| \`tm_step_results\` | Per-step execution results | run_id → tm_test_runs, step_id → tm_test_steps |

### Quality Tables

| Table | Purpose | Key Foreign Keys |
|-------|---------|-----------------|
| \`tm_defects\` | Defect tracking | project_id, test_case_id, cycle_id |
| \`tm_defect_links\` | Defect ↔ entity links | defect_id, linked_entity_id |
| \`tm_requirement_links\` | Requirement ↔ case links | test_case_id, requirement_id |
| \`tm_release_quality_gates\` | Gate definitions | release_id |
| \`tm_release_gate_results\` | Gate evaluation results | gate_id |

### Key Relationship Diagram

\`\`\`
tm_projects
  ├── tm_folders ─────────┐
  │     └── (parent_id)   │ (self-referencing tree)
  │                       │
  ├── tm_test_cases ◄─────┘ (folder_id)
  │     ├── tm_test_steps
  │     ├── tm_test_case_versions
  │     ├── tm_gherkin_steps
  │     ├── tm_test_attachments
  │     └── tm_case_labels ──► tm_labels
  │
  ├── tm_test_sets
  │     └── tm_test_set_cases ──► tm_test_cases
  │
  ├── tm_test_plans
  │     ├── tm_plan_scope ──► tm_test_cases / tm_folders
  │     ├── tm_plan_team ──► tm_users
  │     ├── tm_plan_milestones
  │     └── tm_plan_approvals ──► tm_users
  │
  ├── tm_test_cycles ──► tm_environments
  │     ├── tm_cycle_scope ──► tm_test_cases
  │     ├── tm_cycle_assignments ──► tm_users
  │     ├── tm_cycle_milestones
  │     └── tm_test_runs
  │           └── tm_step_results ──► tm_test_steps
  │
  ├── tm_defects ──► tm_test_cases, tm_test_cycles
  │     └── tm_defect_links
  │
  └── tm_release_quality_gates ──► releases
        └── tm_release_gate_results
\`\`\`

---

## 5. Business Rules & Constraints {#5-business-rules}

### Hard Rules (enforced by DB/code)

| Rule | Description |
|------|-------------|
| **Folder required for cases** | Every test case must belong to a \`tm_folder\`. The folder selector is mandatory in the creation modal. |
| **Unique case keys** | \`case_key\` (e.g., TC-001) is auto-generated per project via \`tm_key_sequences\` — guaranteed unique. |
| **Cycle must have cases** | A test cycle with zero scope items cannot be executed. Add cases first. |
| **Run requires active cycle** | Execution pages check \`cycle.status === 'active'\` before allowing runs. |
| **Step results tied to runs** | \`tm_step_results\` requires a valid \`run_id\` — no orphan step data. |
| **Defect keys unique** | Defect IDs use \`defect_id_sequences\` for unique, year-based numbering. |
| **Plan approval workflow** | Plans move: Draft → Pending Approval → Approved → In Progress → Completed. Cannot skip states. |

### Soft Rules (enforced by UI/logic)

| Rule | Description |
|------|-------------|
| **Assign before execute** | UI encourages assigning testers before starting a cycle, but it's not strictly required. |
| **Environment recommended** | Creating a cycle without an environment shows a warning but is allowed. |
| **Quality gates need data** | Gates evaluate to "No Data" if the linked release has no completed cycles. |
| **Reports need history** | Report charts show empty state if no execution data exists yet. |
| **AI needs context** | CATY AI works best when there are existing test cases and execution data to analyze. |

---

## 6. Quick Reference — Routes & Navigation {#6-routes}

| Route | Module | Layer |
|-------|--------|-------|
| \`/testhub/dashboard\` | Dashboard | 7 - Intelligence |
| \`/testhub/repository\` | Test Cases (Repository) | 2 - Authoring |
| \`/testhub/shared-steps\` | Shared Steps | 1 - Foundation |
| \`/testhub/tags\` | Tags | 1 - Foundation |
| \`/testhub/environments\` | Environments | 1 - Foundation |
| \`/testhub/requirements\` | Requirements | 2 - Authoring |
| \`/testhub/test-sets\` | Test Sets | 3 - Grouping |
| \`/testhub/test-plans\` | Test Plans | 3 - Grouping |
| \`/testhub/cycles\` | Test Cycles | 4 - Execution |
| \`/testhub/execution\` | Execution Hub | 4 - Execution |
| \`/testhub/defects\` | Defects | 5 - Quality |
| \`/testhub/coverage-matrix\` | Coverage Matrix | 5 - Quality |
| \`/testhub/traceability\` | Traceability | 5 - Quality |
| \`/testhub/releases\` | Releases | 6 - Release |
| \`/testhub/releases/command-center\` | Command Center | 6 - Release |
| \`/testhub/releases/quality-gates\` | Quality Gates | 6 - Release |
| \`/testhub/reports\` | Reports | 7 - Intelligence |
| \`/testhub/activity\` | Activity Feed | 7 - Intelligence |
| \`/testhub/caty\` | CATY AI Assistant | 7 - Intelligence |
| \`/testhub/my-scope\` | My Test Scope | 7 - Intelligence |
| \`/testhub/settings\` | Settings | Config |
| \`/testhub/import-export\` | Import/Export | Utility |

---

*Generated by Catalyst TestHub · © 2026*
`;

// ── Sections for accordion ──
const SECTIONS = [
  { id: 'overview', title: '1. Module Overview', icon: BookOpen, color: '#3B82F6',
    summary: 'TestHub covers 7 layers: Foundation → Authoring → Grouping → Execution → Quality → Release → Intelligence.' },
  { id: 'dependency', title: '2. Dependency Chain', icon: GitBranch, color: '#8B5CF6',
    summary: 'Layer 0 (Platform) → Layer 1 (Folders/Tags/Envs) → Layer 2 (Cases) → Layer 3 (Sets/Plans) → Layer 4 (Cycles/Runs) → Layer 5 (Defects) → Layer 6 (Releases) → Layer 7 (Reports)' },
  { id: 'steps', title: '3. Step-by-Step Testing Flow', icon: CheckCircle2, color: '#10B981',
    summary: '10 phases, 40+ individual test steps covering every module from folder creation to AI insights.' },
  { id: 'database', title: '4. Database Schema', icon: Database, color: '#F59E0B',
    summary: '60+ tables in the tm_ schema with full foreign key relationships and entity hierarchy.' },
  { id: 'rules', title: '5. Business Rules & Constraints', icon: AlertTriangle, color: '#EF4444',
    summary: 'Hard rules (DB-enforced) and soft rules (UI-enforced) governing the entire workflow.' },
  { id: 'routes', title: '6. Routes & Navigation', icon: Layers, color: '#06B6D4',
    summary: '22 routes organized by layer for quick reference.' },
];

export default function TestHubDocsPage() {
  const { isDark } = useTheme();
  const [expandedSection, setExpandedSection] = useState<string | null>('dependency');

  const handleDownload = () => {
    const blob = new Blob([DOCS_MARKDOWN], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TestHub-Functional-Flow-Guide.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: isDark ? '#0A0A0A' : '#1A1A1A' }}>
      {/* Header */}
      <div style={{
        padding: '24px 32px',
        backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
        borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.10)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)', margin: 0, fontFamily: 'Geist, -apple-system, sans-serif' }}>
            📘 TestHub Functional Flow Guide
          </h1>
          <p style={{ fontSize: 14, color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', margin: '4px 0 0', fontFamily: 'Geist, -apple-system, sans-serif' }}>
            Complete dependency map, step-by-step testing flow, database schema, and business rules
          </p>
        </div>
        <button
          onClick={handleDownload}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            backgroundColor: 'rgba(237,237,237,0.93)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Geist, -apple-system, sans-serif',
          }}
        >
          <Download size={16} />
          Download Markdown
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
        {/* Dependency Flow Visual */}
        <div style={{
          backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
          borderRadius: 12,
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.10)',
          padding: 24,
          marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)', margin: '0 0 16px', fontFamily: 'Geist, -apple-system, sans-serif' }}>
            Dependency Flow (Follow This Order)
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: 'Folders / Tags / Envs', color: '#DBEAFE', textColor: '#7DB8FC' },
              { label: 'Test Cases', color: '#D1FAE5', textColor: '#4ADE80' },
              { label: 'Test Sets / Plans', color: '#EDE9FE', textColor: '#A78BFA' },
              { label: 'Test Cycles', color: 'rgba(251,191,36,0.10)', textColor: '#FBBF24' },
              { label: 'Execution & Runs', color: '#FFE4E6', textColor: '#9F1239' },
              { label: 'Defects', color: '#FCE7F3', textColor: '#9D174D' },
              { label: 'Releases / Gates', color: '#CCFBF1', textColor: '#134E4A' },
              { label: 'Reports / AI', color: '#1A1A1A', textColor: '#475569' },
            ].map((item, i, arr) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  padding: '8px 14px',
                  backgroundColor: item.color,
                  color: item.textColor,
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'Geist, -apple-system, sans-serif',
                  whiteSpace: 'nowrap',
                }}>
                  {item.label}
                </div>
                {i < arr.length - 1 && <ArrowRight size={16} style={{ color: 'rgba(237,237,237,0.40)', flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Accordion Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SECTIONS.map(section => {
            const Icon = section.icon;
            const isOpen = expandedSection === section.id;
            return (
              <div
                key={section.id}
                style={{
                  backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                  borderRadius: 12,
                  border: `1px solid ${isOpen ? section.color + '40' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.10)'}`,
                  overflow: 'hidden',
                  transition: 'border-color 0.2s',
                }}
              >
                <button
                  onClick={() => setExpandedSection(isOpen ? null : section.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '16px 20px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 36,
                    height: 50,
                    borderRadius: 8,
                    backgroundColor: section.color + '15',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={18} style={{ color: section.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)', fontFamily: 'Geist, -apple-system, sans-serif' }}>
                      {section.title}
                    </div>
                    <div style={{ fontSize: 13, color: isDark ? '#878787' : 'rgba(237,237,237,0.40)', fontFamily: 'Geist, -apple-system, sans-serif', marginTop: 2 }}>
                      {section.summary}
                    </div>
                  </div>
                  {isOpen ? <ChevronDown size={18} style={{ color: 'rgba(237,237,237,0.40)' }} /> : <ChevronRight size={18} style={{ color: 'rgba(237,237,237,0.40)' }} />}
                </button>
                {isOpen && (
                  <div style={{
                    padding: '0 20px 20px',
                    fontSize: 14,
                    color: isDark ? '#A1A1A1' : 'rgba(237,237,237,0.53)',
                    fontFamily: 'Geist, -apple-system, sans-serif',
                    lineHeight: 1.7,
                  }}>
                    <div style={{
                      backgroundColor: isDark ? '#1A1A1A' : '#1A1A1A',
                      borderRadius: 8,
                      padding: 16,
                      whiteSpace: 'pre-wrap',
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      fontSize: 12,
                      lineHeight: 1.6,
                      overflowX: 'auto',
                      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.10)',
                      color: isDark ? '#A1A1A1' : undefined,
                    }}>
                      {getMarkdownSection(section.id)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div style={{
          marginTop: 24,
          padding: 20,
          backgroundColor: 'rgba(237,237,237,0.93)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#FFFFFF', fontFamily: 'Geist, -apple-system, sans-serif' }}>
              Download the full guide as Markdown
            </div>
            <div style={{ fontSize: 13, color: 'rgba(237,237,237,0.40)', fontFamily: 'Geist, -apple-system, sans-serif', marginTop: 4 }}>
              Open in any Markdown editor (VS Code, Obsidian, Notion) for the best reading experience
            </div>
          </div>
          <button
            onClick={handleDownload}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
              color: isDark ? '#EDEDED' : 'rgba(237,237,237,0.93)',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Geist, -apple-system, sans-serif',
            }}
          >
            <Download size={16} />
            Download .md
          </button>
        </div>
      </div>
    </div>
  );
}

// Extract markdown sections for accordion display
function getMarkdownSection(sectionId: string): string {
  const sections: Record<string, string> = {
    overview: `TestHub is the unified QA and Release Management module covering 7 layers:

┌─────────────────────────────────────────────────────┐
│  Layer    │ Modules                   │ Purpose     │
├───────────┼───────────────────────────┼─────────────┤
│ Foundation│ Folders, Tags, Envs,      │ Organize &  │
│           │ Shared Steps              │ reuse assets│
│ Authoring │ Test Cases, Requirements  │ Create tests│
│ Grouping  │ Test Sets, Test Plans     │ Bundle cases│
│ Execution │ Cycles, Execution Hub     │ Run tests   │
│ Quality   │ Defects, Traceability     │ Track issues│
│ Release   │ Releases, Quality Gates   │ Gate quality│
│ Intel     │ Dashboard, Reports, AI    │ Analyze     │
└─────────────────────────────────────────────────────┘`,

    dependency: `LAYER 0 — PLATFORM (auto-provisioned)
  ► Project (tm_projects) — created on first login
  ► Users & Roles — auto-assigned

LAYER 1 — FOUNDATION (create first, no dependencies)
  ► Folders → organize test cases into tree
  ► Tags → label anything
  ► Environments → define test targets
  ► Shared Steps → reusable step blocks

LAYER 2 — AUTHORING (needs folders from Layer 1)
  ► Test Cases → MUST belong to a folder
  ► Steps, Gherkin, Attachments, Versions → belong to cases
  ► Requirements → linkable to cases
  ⚠️ Cannot create cases without at least one folder

LAYER 3 — GROUPING (needs cases from Layer 2)
  ► Test Sets → bundle cases into groups
  ► Test Plans → formal planning with scope + approvals
  ⚠️ Cannot add cases that don't exist

LAYER 4 — EXECUTION (needs cases, optionally releases)
  ► Test Cycles → container for test execution
  ► Test Runs → individual case execution records
  ► Step Results → per-step pass/fail
  ⚠️ Cycle must be "active" to execute. Must have cases added.

LAYER 5 — QUALITY (needs execution data)
  ► Defects → raised from failed runs
  ► Coverage Matrix → requires cases + requirements
  ► Traceability → requires cases + reqs + defects

LAYER 6 — RELEASE (needs cycles + defects)
  ► Quality Gates → automated pass/fail based on metrics
  ► Command Center → real-time quality dashboard
  ⚠️ Gates need cycle execution data to evaluate

LAYER 7 — INTELLIGENCE (read-only)
  ► Dashboard, Reports, CATY AI, Activity Feed
  ✅ No creation dependencies — works with existing data`,

    steps: `STEP 1: Foundation Setup
  1.1  Create Folders (e.g., "Login", "Payments")     → /testhub/repository
  1.2  Create Tags                                      → /testhub/tags
  1.3  Create Environments ("Staging", "Prod")          → /testhub/environments
  1.4  Create Shared Steps ("Login as Admin")           → /testhub/shared-steps

STEP 2: Test Case Authoring
  2.1  Select folder → Create Test Case                 → /testhub/repository
  2.2  Add 3-5 manual steps (action + expected)
  2.3  Reference a shared step
  2.4  Create 5+ cases across folders
  2.5  Clone a test case
  2.6  Edit a case (triggers version history)
  2.7  Attach a file

STEP 3: Requirements & Traceability
  3.1  Create a Requirement                             → /testhub/requirements
  3.2  Link test cases to it
  3.3  View Coverage Matrix                             → /testhub/coverage-matrix
  3.4  View Traceability                                → /testhub/traceability

STEP 4: Test Sets
  4.1  Create a Test Set ("Smoke Tests")                → /testhub/test-sets
  4.2  Add test cases to the set
  4.3  Remove a case from the set

STEP 5: Test Plans
  5.1  Create a Test Plan (Draft)                       → /testhub/test-plans
  5.2  Add scope (folders or cases)
  5.3  Add team members with roles
  5.4  Add milestones with dates
  5.5  Submit for approval
  5.6  Approve the plan

STEP 6: Test Cycles & Execution
  6.1  Create a Test Cycle                              → /testhub/cycles
  6.2  Add test cases to the cycle
  6.3  Assign testers
  6.4  Start execution → 3-pane view                    → /testhub/cycles/:id/execute
  6.5  Mark steps Pass/Fail/Blocked
  6.6  Complete the run
  6.7  Try Quick Run (modal)
  6.8  View Cycle Report                                → /testhub/cycles/:id/report
  6.9  View Execution Hub                               → /testhub/execution

STEP 7: Defect Management
  7.1  Log defect from failed execution
  7.2  Create standalone defect                         → /testhub/defects
  7.3  Link defect to a test case
  7.4  Update defect status workflow
  7.5  Add comments

STEP 8: Release & Quality Gates
  8.1  View/create a Release                            → /testhub/releases
  8.2  Link cycles to the release
  8.3  View Command Center                              → /testhub/releases/command-center
  8.4  Configure Quality Gates                          → /testhub/releases/quality-gates
  8.5  Evaluate gates

STEP 9: Intelligence
  9.1  Dashboard                                        → /testhub/dashboard
  9.2  Reports                                          → /testhub/reports
  9.3  Activity Feed                                    → /testhub/activity
  9.4  CATY AI                                          → /testhub/caty
  9.5  My Test Scope                                    → /testhub/my-scope

STEP 10: Settings & Import/Export
  10.1 Settings                                         → /testhub/settings
  10.2 Import/Export                                     → /testhub/import-export`,

    database: `CORE ENTITIES:
  tm_projects          → Project container (id, name, key_prefix)
  tm_users             → Users (id, auth_user_id, full_name)
  tm_folders           → Case folders (parent_id = self-ref tree)
  tm_test_cases        → Cases (folder_id → tm_folders)
  tm_test_steps        → Steps (test_case_id → tm_test_cases)
  tm_step_definitions  → Shared steps (reusable blocks)
  tm_labels            → Tags/labels
  tm_environments      → Test environments

GROUPING:
  tm_test_sets         → Named groups
  tm_test_set_cases    → set_id → cases (junction)
  tm_test_plans        → Formal plans with lifecycle
  tm_plan_scope        → plan → cases/folders
  tm_plan_team         → plan → users
  tm_plan_milestones   → plan milestones
  tm_plan_approvals    → plan → approver workflow

EXECUTION:
  tm_test_cycles       → Execution containers
  tm_cycle_scope       → cycle → cases
  tm_cycle_assignments → cycle → users per case
  tm_test_runs         → Individual run records
  tm_step_results      → Per-step results (run → step)

QUALITY:
  tm_defects              → Defect tracking
  tm_defect_links         → Defect → entity links
  tm_requirement_links    → Requirement → case links
  tm_release_quality_gates → Gate definitions
  tm_release_gate_results  → Gate evaluation results

KEY RELATIONSHIP CHAIN:
  tm_projects
    └── tm_folders
          └── tm_test_cases
                ├── tm_test_steps
                ├── tm_test_set_cases → tm_test_sets
                ├── tm_cycle_scope → tm_test_cycles
                │     ├── tm_test_runs
                │     │     └── tm_step_results
                │     └── tm_cycle_assignments
                ├── tm_defects
                └── tm_requirement_links`,

    rules: `HARD RULES (Database/Code Enforced):
  ✗ Every test case MUST belong to a folder
  ✗ case_key is auto-generated and unique per project
  ✗ A cycle with zero cases cannot be executed
  ✗ Execution requires cycle.status === 'active'
  ✗ Step results require a valid run_id
  ✗ Defect IDs are unique (year-based sequence)
  ✗ Plan status flow: Draft → Pending → Approved → In Progress → Completed

SOFT RULES (UI Logic):
  ⚠ Tester assignment encouraged before execution
  ⚠ Environment recommended on cycle creation
  ⚠ Quality gates show "No Data" without cycle results
  ⚠ Reports show empty state without execution history
  ⚠ CATY AI needs existing data for meaningful insights`,

    routes: `FOUNDATION (Layer 1):
  /testhub/shared-steps         Shared Steps
  /testhub/tags                 Tags
  /testhub/environments         Environments

AUTHORING (Layer 2):
  /testhub/repository           Test Cases
  /testhub/requirements         Requirements

GROUPING (Layer 3):
  /testhub/test-sets            Test Sets
  /testhub/test-plans           Test Plans

EXECUTION (Layer 4):
  /testhub/cycles               Test Cycles
  /testhub/execution            Execution Hub

QUALITY (Layer 5):
  /testhub/defects              Defects
  /testhub/coverage-matrix      Coverage Matrix
  /testhub/traceability         Traceability

RELEASE (Layer 6):
  /testhub/releases             Releases
  /testhub/releases/command-center   Command Center
  /testhub/releases/quality-gates    Quality Gates

INTELLIGENCE (Layer 7):
  /testhub/dashboard            Dashboard
  /testhub/reports              Reports
  /testhub/activity             Activity Feed
  /testhub/caty                 CATY AI
  /testhub/my-scope             My Test Scope

CONFIG:
  /testhub/settings             Settings
  /testhub/import-export        Import/Export`,
  };
  return sections[sectionId] || '';
}
