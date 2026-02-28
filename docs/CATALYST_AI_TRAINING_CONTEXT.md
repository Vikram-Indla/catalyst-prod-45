# Catalyst Platform — AI Training Context Document
## Comprehensive Database Schema, Modules & Question Training Guide

> **Purpose**: This document provides an exhaustive reference of the Catalyst platform's database tables, modules, hierarchies, and data relationships. It is designed to be fed to an AI training pipeline to generate 1,000+ natural-language questions that cover 100% of platform functionality.

---

## TABLE OF CONTENTS

1. [Platform Overview](#1-platform-overview)
2. [Module Inventory](#2-module-inventory)
3. [Database Schema — Complete Table Reference](#3-database-schema)
4. [Database Views](#4-database-views)
5. [Key Hierarchies & Relationships](#5-key-hierarchies)
6. [Entity Cross-References](#6-entity-cross-references)
7. [Question Categories & Coverage Matrix](#7-question-categories)
8. [Sample Question Templates per Domain](#8-sample-question-templates)

---

## 1. PLATFORM OVERVIEW

**Catalyst** is an enterprise portfolio management platform that integrates with Jira and provides:
- Strategic planning (OKRs, Themes, Initiatives)
- Product management (Epics, Features, Stories, Subtasks)
- Project execution (Boards, Backlogs, Sprints, Releases)
- Quality assurance (Test Cases, Test Cycles, Defects)
- Resource management (Capacity, Budget, Resource 360)
- Knowledge management (KB with RAG-based AI search)
- Demand management (Business Requests lifecycle)
- Incident & Change management
- AI-powered intelligence across all modules

### Data Sources
- **Jira Sync**: `ph_issues` table contains all Jira-synced data (Epics, Stories, Tasks, Subtasks, Bugs)
- **Native Data**: Platform-native tables for strategy, budget, capacity, testing, etc.
- **Profiles**: `profiles` table contains all user information (name, email, role, department, vendor, contract dates)
- **Resource Inventory**: `resource_inventory` enriched resource data with assignment, department, vendor, cost info

---

## 2. MODULE INVENTORY

### 2.1 Strategy Hub (`es_` prefix)
- **Mission & Vision**: `es_missions`, `es_visions`
- **Strategic Themes**: `es_strategic_themes` — top-level strategic pillars with fiscal year, BSC perspective, budget, owner, health
- **Goals**: `es_goals` — quarterly/fiscal goals linked to themes, with progress tracking
- **Key Results (KRs)**: `es_key_results` — measurable outcomes with start/target/current values, confidence
- **KR Check-ins**: `es_kr_checkins` — periodic progress updates
- **Initiatives**: `es_initiatives` — tactical work linked to KRs
- **Epic Links**: `es_initiative_epics` — links initiatives to execution-level epics
- **Health & AI**: `es_health_scores`, `es_ai_recommendations`
- **Investment**: `es_investment_allocations`
- **Dashboard Views**: `es_dashboard_*` (6 views: execution_dials, health_composite, okr_heatmap, okr_tree, pyramid_summary, team_alignment)
- **Intelligence View**: `vw_chain_intelligence` — flattened hierarchy with ST-### keys

### 2.2 Product Hub / ProjectHub (`ph_` prefix)
- **Projects**: `ph_projects` — key, name, department, status, health, feature_layer toggle
- **Work Items**: `ph_work_items` — core entity (Epic/Feature/Story/Bug/Task/Subtask) with item_key, status, priority, assignee, sprint, story_points, labels, estimates
- **Jira Issues**: `ph_issues` — raw Jira-synced data with issue_key, project_key, issue_type, summary, status, status_category, assignee, parent_key, story_points, sprint_name, fix_versions, labels, components, priority, resolution, changelog, comments
- **SDLC Issues**: `ph_sdlc_issues` — project-scoped SDLC planning items
- **Releases**: `ph_releases` — release management with dates, status, owner
- **Boards**: `ph_boards` — Kanban board configuration
- **Comments & Activity**: `ph_comments`, `ph_comment_reactions`, `ph_activity_log`
- **Attachments**: `ph_attachments`
- **Labels & Components**: `ph_labels`, `ph_components`, `ph_work_item_labels`, `ph_work_item_components`
- **Hierarchy Overrides**: `ph_hierarchy_overrides` — custom parent-child reassignments surviving Jira sync
- **Initiatives**: `ph_initiatives` — product initiatives with roadmap support, scoring, milestones, risks, budget items, links
- **Ideas/Ideation**: `ph_ideas` — innovation pipeline with RICE/WSJF scoring, voting, AI enrichment
- **Incidents**: `ph_incidents` — production incident tracking
- **Themes**: `ph_themes`, `ph_theme_items`
- **Saved Views/Filters**: `ph_saved_views`, `ph_saved_filters`, `ph_list_view_configs`
- **User Preferences**: `ph_user_preferences`, `ph_user_favorites`

#### Key Views:
- `ph_work_items_full_view` — enriched work items with joins
- `ph_team_workload_view` — team member workload distribution
- `ph_lifecycle_view` — item lifecycle tracking
- `ph_overdue_view` — overdue items
- `ph_items_by_status_view` — status breakdown
- `ph_backlog_initiatives_view` — initiative backlog
- `ph_roadmap_initiatives_view` — roadmap items
- `ph_release_health` — release health metrics
- `ph_person_workload` — per-person workload

### 2.3 Work Hub (`wh_` prefix)
- **Projects**: `wh_projects` — WorkHub project entities
- **Work Items**: `wh_work_items` — independent work items with Lexorank ordering, priority/severity enums
- **Statuses & Workflows**: `wh_statuses`, `wh_workflow_transitions`
- **History**: `wh_history` — full audit trail
- **Labels**: `wh_labels`, `wh_work_item_labels`
- **Comments/Attachments**: `wh_comments`, `wh_attachments`
- **User State**: `wh_saved_filters`, `wh_column_configs`
- **Navigation**: `wh_project_stars`, `wh_project_recents`

#### Key Views:
- `wh_all_work_list` — optimized list with LATERAL joins
- `wh_dashboard_stats` — dashboard metrics
- `wh_sidebar_projects` — sidebar project list
- `wh_work_item_detail` — detailed single item view

### 2.4 Test Hub (`tm_` prefix)
- **Test Cases**: `tm_test_cases` — with versioning, AI generation, Gherkin support, priorities, types, labels
- **Test Cycles**: `tm_test_cycles` — execution cycles with pass/fail/blocked/skipped counts
- **Test Plans**: `tm_test_plans` — planning with scope, strategy, environments, entry/exit criteria
- **Test Runs**: `tm_test_runs`, `tm_test_run_results` — individual execution results
- **Defects**: `tm_defects` — QA defects with severity, priority, environment, regression tracking
- **Defect Links**: `tm_defect_links` — links between defects and test cases
- **Folders**: `tm_folders` — test case organization
- **Environments**: `tm_environments`
- **Steps**: `tm_step_definitions`, `tm_step_results`, `tm_gherkin_steps`
- **Requirements Traceability**: `tm_requirement_links`
- **Quality Gates**: `tm_release_quality_gates`, `tm_release_gate_results`
- **Cycle Assignments**: `tm_cycle_assignments`, `tm_run_case_assignments`

#### Key Views:
- `v_tm_test_cases_full` — enriched test cases
- `v_tm_cycle_progress` — cycle execution progress
- `v_tm_execution_by_assignee` — assignee-level execution
- `v_tm_my_work` — personal work queue
- `v_tm_test_cycle_list_metrics` — cycle metrics
- `v_tm_traceability_summary` — requirements traceability

### 2.5 Resource 360 (`r360_` prefix)
- **Resources**: `r360_resources` — people with job_role, department, vendor, contract info, cost
- **Work Items**: `r360_work_items` — items assigned to resources across hubs
- **Projects**: `r360_projects`
- **Releases**: `r360_releases`
- **Assignments**: `r360_assignments`
- **Departments**: `r360_departments`
- **Vendors**: `r360_vendors`
- **Status Transitions**: `r360_status_transitions`
- **AI Profiles**: `r360_ai_profiles`, `r360_ai_behavioral_patterns`, `r360_ai_cache`
- **Resource Metrics**: `r360_resource_metrics`

#### Key Views:
- `r360_constellation_view` — orbit visualization data
- `r360_chronology_events_view` — timeline events
- `r360_gantt_view` — Gantt chart data
- `r360_resource_summary_view` — resource KPIs
- `r360_work_items_enriched_view` — enriched assignments
- `r360_resource_hub_distribution_view` — hub distribution

### 2.6 Demand Management / Business Requests
- **Business Requests**: `business_requests` — full lifecycle from intake to closure with 80+ fields including:
  - Identity: request_key, title, description
  - Process: process_step, health, progress, priority_tier
  - People: requestor, assignee, business_owner, implementation_owner, project_manager_user_id
  - Dates: start_date, end_date, impl_start_date, impl_target_end_date
  - Budget: estimated_cost_sar, approved_budget_sar, current_year_budget_sar, funding_status
  - Scoring: business_value, complexity_score, business_score, executive_urgency
  - Delivery: delivery_model, delivery_platform, delivery_track
  - Vendor: contract_type, primary_vendor_name, po_numbers
  - Integration: integration_required, integration_systems
- **Audit**: `business_request_audit_logs`
- **Links**: `business_request_links`
- **Business Owners**: `business_owners`
- **Business Lines**: `business_lines`

### 2.7 Release Hub
- **Releases**: `releases` — comprehensive release tracking with test metrics, health_score, gate counts, scope creep
- **Production Events**: `pc_events` — production deployment events with investor_impact, linked_release_versions, linked_change_numbers
- **Event Tickets**: `pc_event_tickets`
- **Period Summaries**: `pc_period_summaries`
- **Change Numbers**: `change_numbers` — change management
- **Change Dependencies**: `change_dependencies`
- **Change Conflicts**: `change_conflicts`

### 2.8 Capacity Planner
- **Departments**: `capacity_departments`
- **Resource Inventory**: `resource_inventory` — master resource list with role, department, vendor, contract dates, cost (CTC), country, Jira account mapping
- **Assignments**: Managed via capacity planning hooks
- **Budget Scenarios**: `budget_scenarios` — what-if budget modeling

### 2.9 Budget Module
- **Software Licenses**: `software_licenses` — license tracking with vendor, category, cost, renewal dates
- **License Allocations**: `assignment_license_allocations` — license-to-assignment mapping
- **Resource Costs**: Managed via `resource_inventory` CTC field and `resource_current_cost` view

### 2.10 Knowledge Base (`kb_` prefix)
- **Sources**: `kb_sources` — data sources (URLs, documents)
- **Embeddings**: `kb_embeddings` — vector embeddings for semantic search (1536 dimensions)
- **Training Questions**: `kb_training_questions` — curated Q&A pairs with categories
- **Query Log**: `kb_query_log` — search history and analytics
- **Cache**: `kb_cache` — response caching
- **Access Matrix**: `kb_access_matrix` — role-based module access
- **Documents**: `kb_documents`, `kb_document_versions`, `kb_document_comments`, `kb_document_attachments`
- **Spaces**: `kb_doc_spaces`

### 2.11 Incident Management
- **Tickets**: `incident_tickets`
- **Committees**: `incident_committees`, `committee_members`, `committee_votes`
- **User Profiles**: `incident_user_profiles`

### 2.12 Dependencies
- **Dependencies**: `dependencies` — cross-team/project dependency tracking with risk_level, blocked status, criticality_score, negotiation support

### 2.13 Planner (Personal Task Management)
- **Views**: `planner_board_tasks`, `planner_calendar_tasks`, `planner_my_tasks`, `planner_dashboard_*`

### 2.14 Epic Balancing / WSJF
- **Epics**: `epics` — with WSJF scoring (strategic_value_score, effort_swag, ability_to_execute)
- **Epic Scoring**: `epic_roi_scores`, `epic_scorecard_responses`
- **Epic Benefits**: `epic_benefits`
- **Epic Spend**: `epic_spend`

### 2.15 Defects (Standalone)
- **Defects**: `defects` — standalone defect management with SLA, environment, severity
- **History**: `defect_history`
- **Links**: `defect_links`, `defect_work_item_links`

### 2.16 AI Briefs
- **Briefs**: `ai_briefs` — cached AI-generated intelligence with scope, metrics_json, version, publish lifecycle

### 2.17 CATY AI Assistant
- **Conversations**: `caty_conversations` — chat sessions
- **Messages**: `caty_messages` — individual messages with role, tokens, feedback
- **Suggestions**: `caty_suggestions` — AI-generated suggestions
- **Prompt Templates**: `caty_prompt_templates`
- **Analytics**: `caty_analytics`

### 2.18 Admin & RBAC
- **Profiles**: `profiles` — user identity (full_name, email, avatar, role, department, vendor, contract dates, country, resource_type, CTC)
- **Roles**: Managed via `v_user_roles` view
- **Nav Modules**: `admin_nav_modules` — navigation structure
- **Permissions**: `admin_role_module_permissions` — role-based module access
- **Create Menu Visibility**: `create_menu_visibility`

### 2.19 Other Tables
- **Departments**: `departments`
- **Sprints**: `sprints` (if exists)
- **Forecasting**: `forecast_entries`
- **Dashboard Widgets**: `dashboard_widgets` — user-configurable dashboard
- **Comments**: `comments` — generic entity comments
- **Activity Logs**: `activity_logs` — generic audit trail
- **Custom Fields**: `custom_field_defs`
- **Discussions**: `discussions`, `discussion_mentions`
- **Daily Execution Stats**: `daily_execution_stats`

---

## 3. KEY TABLE COLUMN DETAILS

### 3.1 `profiles` (User Identity — CRITICAL FOR PERSON QUERIES)
```
id, email, full_name, avatar_url, role, status, department_id, vendor,
contract_end_date, country, country_code, location, contract_start_date,
resource_type, rid, ctc, last_login, approval_status
```

### 3.2 `resource_inventory` (Resource Master — CRITICAL FOR RESOURCE QUERIES)
```
id, name, role_code, default_capacity_percent, is_active, notes,
role_name, assignment_id, profile_id, contract_start_date, contract_end_date,
vendor_name, department_name, assignments, country_id, location_id,
vendor_id, department_id, resource_type, rid, ctc, email, jira_account_id, avatar_url
```

### 3.3 `ph_issues` (Jira Synced Data — PRIMARY WORK ITEM SOURCE)
```
issue_key, project_key, issue_type, summary, status, status_category,
assignee_account_id, assignee_display_name, parent_key, hierarchy_level,
fix_versions, due_date, labels, components, priority, story_points,
sprint_name, resolution, jira_created_at, jira_updated_at, synced_at,
description_text, comments, changelog, type_icon_url, parent_summary,
reporter_display_name, project_name, jira_removed_at
```

### 3.4 `ph_work_items` (Native Work Items)
```
id, item_key, item_type, summary, description, status, priority,
parent_id, project_id, release_id, theme_id, assignee_id, reporter_id,
due_date, start_date, story_points, estimated_hours, actual_hours,
labels, estimate, department, team, environment, security_level,
sort_order, resolved_at, cycle_time_days, status_changed_at, deleted_at
```

### 3.5 `business_requests` (Demand Management)
```
id, request_key, title, description, process_step, health, progress,
priority_tier, rank, requestor, assignee, business_owner, department,
start_date, end_date, estimated_cost_sar, approved_budget_sar,
delivery_model, delivery_platform, funding_status, complexity,
urgency, business_value, complexity_score, on_hold_reason
```

### 3.6 `es_strategic_themes` (Strategy)
```
id, title, description, fiscal_year, status, type, bsc_perspective,
owner_id, start_date, target_completion, planned_budget, progress_pct,
ai_health_score, is_major, priority, process_step
```

### 3.7 `es_goals`
```
id, theme_id, title, description, owner_id, quarter, year, target_date,
status, progress_pct, department_id, goal_key, priority, weight,
fiscal_quarter, bsc_perspective, ai_health_score, confidence_level
```

### 3.8 `es_key_results`
```
id, goal_id, title, description, owner_id, metric_type,
start_value, target_value, current_value, unit, due_date,
status, progress_pct, confidence_level, kr_key, weight
```

### 3.9 `epics` (Portfolio Epics)
```
id, theme_id, name, description, owner_id, status, estimate,
start_date, end_date, health, epic_key, tags, epic_type,
strategic_value_score, effort_swag, investment_type, delivery_track,
delivery_platform, reporter_id, assignee_id, linked_business_request_id
```

### 3.10 `features`
```
id, epic_id, project_id, name, description, owner_id, status,
estimate_points, wsjf_score, progress_pct, health, business_value,
time_criticality, risk_reduction, job_size, budget, workflow_status,
priority, release_id, assignee_id, department_id, labels, components
```

### 3.11 `stories`
```
id, feature_id, team_id, sprint_id, name, title, description,
assignee_id, status, estimate_points, story_points, priority,
blocked, blocked_reason, tags, progress_pct, health, start_date
```

### 3.12 `tm_test_cases`
```
id, project_id, folder_id, case_key, title, description, preconditions,
status, priority_id, case_type_id, automation_status, version,
is_ai_generated, assigned_to, test_format (gherkin/manual), release_id
```

### 3.13 `tm_test_cycles`
```
id, project_id, cycle_key, name, status, environment_id,
planned_start, planned_end, total_cases, passed_count, failed_count,
blocked_count, skipped_count, not_run_count, release_id
```

### 3.14 `tm_defects`
```
id, project_id, defect_key, title, description, severity, status,
assignee_id, reporter_id, priority, component, module, environment,
is_regression, is_blocker, is_security_issue, customer_reported,
due_date, sprint, epic_link
```

### 3.15 `dependencies`
```
id, type, status, risk_level, criticality_score, blocked_days,
dependency_level, requesting_team_id, depends_on_team_id,
needed_by_date, committed_by_date, description, quarter
```

### 3.16 `software_licenses`
```
id, name, vendor, category, license_type, user_count, annual_cost,
start_date, renewal_date, is_active, department_id
```

---

## 4. KEY DATABASE VIEWS

| View | Purpose |
|------|---------|
| `ph_work_items_full_view` | Enriched work items with all joins |
| `ph_team_workload_view` | Team member workload |
| `ph_person_workload` | Individual workload |
| `ph_overdue_view` | Overdue items |
| `ph_lifecycle_view` | Item lifecycle stages |
| `ph_release_health` | Release health metrics |
| `v_project_list` | Unified project portfolio |
| `vw_chain_intelligence` | Strategy chain with ST-### keys |
| `wh_all_work_list` | WorkHub optimized list |
| `r360_constellation_view` | Resource orbit visualization |
| `r360_resource_summary_view` | Resource KPIs |
| `v_tm_test_cases_full` | Enriched test cases |
| `v_tm_cycle_progress` | Test cycle progress |
| `v_tm_execution_by_assignee` | Testing by assignee |
| `v_tm_traceability_summary` | Requirements traceability |
| `resource_current_cost` | Current resource costs |
| `license_allocation_totals` | License allocation summary |

---

## 5. KEY HIERARCHIES & RELATIONSHIPS

### 5.1 Strategy Hierarchy
```
Mission → Vision → Strategic Theme → Goal → Key Result → Initiative → Epic
```

### 5.2 Jira/Product Hierarchy
```
Epic → Feature (optional layer) → Story/Bug/Task → Subtask
```
- Issue types in `ph_issues.issue_type`: Epic, Feature, Story, Task, Bug, Sub-task, QA Bug, Business Gap
- Hierarchy levels: 1 (Epic/Business Gap), 2 (Feature), 3 (Story/Task/Bug/QA Bug), 4 (Sub-task)

### 5.3 Demand → Delivery
```
Business Request → Initiative → Epic → Feature → Story
```

### 5.4 Release Hierarchy
```
Release → Change Numbers → Production Events → Stories/Features
```

### 5.5 Testing Hierarchy
```
Test Plan → Test Cycle → Test Run → Test Case → Step Results → Defects
```

### 5.6 Resource Relationships
```
Profile ↔ Resource Inventory ↔ Assignments ↔ Work Items
Profile → Department → Business Line
Profile → Vendor → Contract
```

---

## 6. ENTITY CROSS-REFERENCES

| From | To | Via |
|------|----|-----|
| Strategic Theme | Goal | `es_goals.theme_id` |
| Goal | Key Result | `es_key_results.goal_id` |
| Key Result | Initiative | `es_kr_initiatives` |
| Initiative | Epic | `es_initiative_epics` |
| Epic | Feature | `features.epic_id` |
| Feature | Story | `stories.feature_id` |
| Story | Sprint | `stories.sprint_id` |
| Work Item | Release | `ph_work_items.release_id` |
| Work Item | Assignee | `ph_work_items.assignee_id` → `profiles.id` |
| Business Request | Department | `business_requests.department_id` |
| Test Case | Test Cycle | `tm_cycle_scope` |
| Defect | Test Case | `tm_defect_links` |
| Resource | Profile | `resource_inventory.profile_id` |
| Dependency | Feature/Epic | `dependencies.from_feature_id` / `to_feature_id` |

---

## 7. QUESTION CATEGORIES & COVERAGE MATRIX

The 1,000+ training questions should cover these categories with approximate distribution:

| # | Category | Count | Key Tables |
|---|----------|-------|------------|
| 1 | **Person/Resource Queries** | ~120 | profiles, resource_inventory, ph_issues, ph_work_items |
| 2 | **Work Item Status & Tracking** | ~150 | ph_issues, ph_work_items, wh_work_items |
| 3 | **Epic Management** | ~80 | epics, ph_issues (type=Epic) |
| 4 | **Story & Task Queries** | ~80 | stories, ph_issues (type=Story/Task) |
| 5 | **Feature Queries** | ~50 | features, ph_issues (type=Feature) |
| 6 | **Sprint & Board** | ~60 | ph_issues (sprint_name), stories (sprint_id) |
| 7 | **Release Management** | ~60 | releases, ph_releases, pc_events, change_numbers |
| 8 | **Business Requests/Demand** | ~70 | business_requests |
| 9 | **Strategy & OKR** | ~80 | es_strategic_themes, es_goals, es_key_results, es_kr_checkins |
| 10 | **Initiative Tracking** | ~50 | ph_initiatives, es_initiatives |
| 11 | **Testing & QA** | ~70 | tm_test_cases, tm_test_cycles, tm_defects, tm_test_plans |
| 12 | **Defect Queries** | ~40 | defects, tm_defects, ph_defects |
| 13 | **Dependency Queries** | ~30 | dependencies |
| 14 | **Capacity & Budget** | ~40 | resource_inventory, capacity_departments, software_licenses, budget_scenarios |
| 15 | **Resource 360** | ~30 | r360_resources, r360_work_items |
| 16 | **Project Portfolio** | ~40 | ph_projects, v_project_list |
| 17 | **Cross-Hub Analytics** | ~30 | Multiple views |
| 18 | **Timeline & Dates** | ~30 | Multiple (due_date, start_date, end_date across entities) |
| 19 | **Labels, Components, Priority** | ~20 | ph_issues, ph_work_items labels/components/priority |
| 20 | **AI Briefs & Intelligence** | ~20 | ai_briefs, vw_chain_intelligence |

---

## 8. SAMPLE QUESTION TEMPLATES PER DOMAIN

### 8.1 Person/Resource Queries (Who is doing what?)
```
- What is {person_name} working on?
- What items are assigned to {person_name}?
- How many open stories does {person_name} have?
- What is {person_name}'s workload this sprint?
- Which epics is {person_name} responsible for?
- What has {person_name} completed this week?
- What team does {person_name} belong to?
- What is {person_name}'s role?
- Which department does {person_name} work in?
- Is {person_name} an internal or external resource?
- When does {person_name}'s contract end?
- What is {person_name}'s utilization rate?
- Who is the most overloaded team member?
- Who has the least work assigned?
- Which vendor does {person_name} work for?
- Show me {person_name}'s completed items this month
- What blockers does {person_name} have?
- Who reported the most bugs this sprint?
- Who is the owner of epic {epic_key}?
- Who is working on project {project_name}?
```

### 8.2 Work Item Status & Tracking
```
- What stories were completed today/this week/this sprint?
- How many items are in progress right now?
- What is blocked and why?
- Which items are overdue?
- What changed status in the last 24 hours?
- How many items moved to Done this sprint?
- What is the cycle time for stories in project {X}?
- Show me all flagged items
- What items have been in "In Progress" for more than 5 days?
- What is the status breakdown for project {X}?
- How many items are in the backlog?
- What was the throughput last sprint?
- Which items have no assignee?
- What items were created today?
- Show me recently updated items
```

### 8.3 Epic Queries
```
- Which epic has the most stories?
- What is the progress of epic {epic_key}?
- Which epics are at risk?
- What epics are planned for this quarter?
- Which epic was created most recently?
- How many epics are in progress?
- What is the health of epic {epic_key}?
- Which epics are linked to strategic theme {theme_name}?
- What epics belong to project {project_name}?
- Who owns the most epics?
- Which epics have overdue stories?
- What is the WSJF score for epic {epic_key}?
- Which epics have no features?
- How many story points are in epic {epic_key}?
- What epics were completed this quarter?
```

### 8.4 Sprint & Board
```
- What is the current sprint?
- How many story points are committed this sprint?
- What is the sprint burndown?
- Which items spilled over from last sprint?
- What is the sprint velocity for team {X}?
- How many items are in each board column?
- What items were added mid-sprint?
- Which sprint had the highest completion rate?
- What items have no sprint assigned?
- Show me the sprint backlog
```

### 8.5 Release Management
```
- When is the next release?
- What is included in release {version}?
- What is the release health score?
- How many defects are open for release {X}?
- What is the test coverage for release {X}?
- Are there any blocker defects for this release?
- What change numbers are linked to release {X}?
- When was the last production deployment?
- What is the scope creep percentage for this release?
- Which releases are at risk?
- What quality gates are passing/failing?
```

### 8.6 Business Requests / Demand
```
- How many business requests are pending approval?
- What requests are in the pipeline?
- Which requests have the highest priority?
- What is the estimated cost of pending requests?
- Who submitted the most requests?
- Which department has the most open requests?
- What requests are on hold and why?
- How long has request {key} been in process?
- What is the approved budget for active requests?
- Which requests require EA review?
- What is the funding status of request {key}?
- Show me requests planned for Q2
```

### 8.7 Strategy & OKR
```
- What are our strategic themes this year?
- What is the progress of goal {goal_key}?
- Which key results are at risk?
- What is the overall OKR completion percentage?
- Which themes have the lowest health score?
- How many KR check-ins were done this quarter?
- Which goals have no key results?
- What initiatives support theme {X}?
- What is the confidence level for KR {kr_key}?
- Who owns the most goals?
- What is the BSC perspective breakdown?
- Which goals are behind schedule?
- What is the AI health assessment for theme {X}?
```

### 8.8 Testing & QA
```
- How many test cases are there for project {X}?
- What is the pass rate for test cycle {X}?
- How many defects were found this sprint?
- What is the test coverage for release {X}?
- Which test cases are failing?
- How many test cases are automated vs manual?
- What is the defect severity breakdown?
- Who has the most test executions?
- What test plans are active?
- How many regression bugs were found?
- What is the average defect resolution time?
- Which modules have the most defects?
- Are there any blocker defects open?
- What is the test completion percentage?
```

### 8.9 Capacity & Budget
```
- What is the total budget allocated this year?
- How many resources are allocated to project {X}?
- What is the capacity utilization rate?
- Which department has the most resources?
- What software licenses are expiring soon?
- What is the total license cost?
- How many external vs internal resources do we have?
- What is the budget variance for scenario {X}?
- Which vendors have the most resources?
- What is the average resource cost?
```

### 8.10 Dependency Queries
```
- What dependencies are at risk?
- How many cross-team dependencies exist?
- Which dependencies are blocking?
- What is the average dependency resolution time?
- Which teams have the most dependencies?
- What dependencies are committed for this quarter?
- How many blocked days from dependencies?
```

### 8.11 Cross-Hub / Analytics
```
- What is the overall project health?
- How many items were created vs completed this month?
- What is the trend in story completion?
- Which project has the most overdue items?
- What is the team's average velocity?
- How does this sprint compare to last sprint?
- What is the defect leakage rate?
- Show me the production incident trend
```

---

## 9. IMPORTANT QUERY PATTERNS FOR TRAINING

### Person Resolution
Questions mentioning a person's name should resolve via:
1. `profiles.full_name` (exact or fuzzy match)
2. `resource_inventory.name` (resource master)
3. `ph_issues.assignee_display_name` (Jira display name)

### Project Resolution
- `ph_projects.name` or `ph_projects.key`
- `ph_issues.project_key` or `ph_issues.project_name`

### Status Categories
- **To Do**: status_category = 'To Do'
- **In Progress**: status_category = 'In Progress'
- **Done**: status_category = 'Done'

### Priority Values
- Jira: Highest, High, Medium, Low, Lowest
- Native: critical, high, medium, low
- WorkHub: highest, high, medium, low, lowest

### Issue Types
Epic, Feature, Story, Task, Bug, Sub-task, QA Bug, Business Gap

### Time-Aware Queries
- "today" → created_at/updated_at within current day
- "this week" → within current ISO week
- "this sprint" → matches current sprint_name
- "this quarter" → within current fiscal quarter
- "recently" → last 7 days

---

## 10. TRAINING DATA GENERATION INSTRUCTIONS

When generating 1,000 questions, ensure:

1. **Variety**: Mix simple lookups ("How many epics?") with analytical ("Which team has highest velocity?") and person-focused ("What is Sarah working on?")

2. **Context-Aware**: Include project context, sprint context, release context, and time context

3. **Resource-Aware**: Cover person lookups, team workload, vendor queries, department queries

4. **Cross-Module**: Questions that span multiple modules ("Which strategic themes have failing test cycles?")

5. **Temporal**: Past ("What was completed last sprint?"), Present ("What is currently blocked?"), Future ("What is planned for Q3?")

6. **Aggregation**: Counts, percentages, averages, trends

7. **Comparison**: "Compare sprint velocity", "Which project has more defects?"

8. **Drill-Down**: "Show me details of story {X}", "What are the subtasks of {story}?"

9. **Natural Language Variation**: Same intent in different phrasings:
   - "What is Imran working on?" / "Show me Imran's tasks" / "Imran's current assignments"

10. **Edge Cases**: Empty results ("Are there any critical defects?"), negations ("Which epics have NO features?"), conditionals ("If we delay release X, what is affected?")
