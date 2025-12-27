# Catalyst Database Schema Documentation

> **Generated:** December 27, 2025  
> **Database:** PostgreSQL (Lovable Cloud)  
> **Total Tables:** 180+

---

## Table of Contents

1. [Core Entities](#core-entities)
2. [Work Items Hierarchy](#work-items-hierarchy)
3. [User & Authentication](#user--authentication)
4. [Project Management](#project-management)
5. [Incident Management](#incident-management)
6. [Change Management](#change-management)
7. [Release Management](#release-management)
8. [Capacity & Resource Management](#capacity--resource-management)
9. [Dependencies](#dependencies)
10. [Defect Tracking](#defect-tracking)
11. [OKR & Strategy](#okr--strategy)
12. [Configuration & Settings](#configuration--settings)
13. [Analytics & Audit](#analytics--audit)
14. [Enums](#enums)

---

## Core Entities

### profiles
User profiles linked to authentication.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | - | Primary key, references auth.users |
| email | text | NO | - | User email address |
| full_name | text | YES | - | Display name |
| role | text | YES | 'user' | User role (user, admin, super_admin) |
| approval_status | text | YES | 'PENDING_APPROVAL' | Account approval status |
| avatar_url | text | YES | - | Profile picture URL |
| requested_at | timestamptz | YES | - | When access was requested |
| approved_at | timestamptz | YES | - | When account was approved |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### teams
Development/delivery teams.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Team name |
| description | text | YES | - | Team description |
| project_id | uuid | YES | - | FK to projects |
| velocity_baseline | integer | YES | - | Team velocity |
| capacity_points | integer | YES | - | Available capacity |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### team_members
Junction table for team membership.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| team_id | uuid | NO | - | FK to teams |
| user_id | uuid | NO | - | FK to profiles |
| role | text | YES | - | Role in team |
| created_at | timestamptz | YES | now() | Record creation timestamp |

---

## Work Items Hierarchy

### programs
Top-level organizational container.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Program name |
| key | text | NO | - | 3-letter code (e.g., 'ABC') |
| description | text | YES | - | Program description |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### projects
Projects within programs.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Project name |
| key | text | YES | - | Project key |
| program_id | uuid | YES | - | FK to programs |
| description | text | YES | - | Project description |
| status | text | YES | - | Project status |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### epics
Large bodies of work spanning multiple features.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| epic_key | text | YES | - | Auto-generated key (AAA-###) |
| title | text | NO | - | Epic title |
| description | text | YES | - | Epic description |
| status | text | YES | 'backlog' | Epic status |
| priority | text | YES | - | Priority level |
| primary_program_id | uuid | YES | - | FK to programs |
| assignee_id | uuid | YES | - | FK to profiles |
| theme_id | uuid | YES | - | FK to themes |
| process_step | text | YES | - | Current process step |
| business_value | integer | YES | - | WSJF component |
| time_value | integer | YES | - | WSJF component |
| rroe_value | integer | YES | - | WSJF component |
| job_size | integer | YES | - | WSJF component |
| wsjf_score | numeric | YES | - | Calculated WSJF score |
| start_date | date | YES | - | Planned start date |
| target_end_date | date | YES | - | Target completion date |
| deleted_at | timestamptz | YES | - | Soft delete timestamp |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### features
Deliverable capabilities within epics/projects.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| display_id | text | YES | - | Display identifier |
| title | text | NO | - | Feature title |
| description | text | YES | - | Feature description |
| status | text | YES | 'backlog' | Feature status |
| priority | text | YES | - | Priority level |
| project_id | uuid | YES | - | FK to projects |
| epic_id | uuid | YES | - | FK to epics |
| owner_id | uuid | YES | - | FK to profiles |
| assignee_id | uuid | YES | - | FK to profiles |
| business_value | integer | YES | - | WSJF component |
| time_criticality | integer | YES | - | WSJF component |
| risk_reduction | integer | YES | - | WSJF component |
| job_size | integer | YES | - | WSJF component |
| wsjf_score | numeric | YES | - | Calculated WSJF score |
| story_points | integer | YES | - | Estimated story points |
| pi_id | uuid | YES | - | FK to program_increments |
| iteration_id | uuid | YES | - | FK to iterations |
| change_number_id | uuid | YES | - | FK to change_numbers |
| deleted_at | timestamptz | YES | - | Soft delete timestamp |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### stories
User stories within features.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| story_key | text | YES | - | Story identifier |
| title | text | NO | - | Story title |
| description | text | YES | - | Story description |
| status | text | YES | 'backlog' | Story status |
| priority | text | YES | - | Priority level |
| feature_id | uuid | YES | - | FK to features |
| project_id | uuid | YES | - | FK to projects |
| assignee_id | uuid | YES | - | FK to profiles |
| story_points | integer | YES | - | Estimated story points |
| iteration_id | uuid | YES | - | FK to iterations |
| change_number_id | uuid | YES | - | FK to change_numbers |
| deleted_at | timestamptz | YES | - | Soft delete timestamp |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### acceptance_criteria
Acceptance criteria for stories.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| story_id | uuid | NO | - | FK to stories |
| content | text | NO | - | Criteria description |
| is_met | boolean | YES | false | Whether criteria is met |
| order_index | integer | YES | 0 | Display order |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### work_manager_tasks
Lightweight tasks for work management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| key | text | YES | - | Auto-generated key |
| title | text | NO | - | Task title |
| description | text | YES | - | Task description |
| status | text | YES | 'todo' | Task status |
| priority | text | YES | - | Priority level |
| team_id | uuid | YES | - | FK to teams |
| assignee_id | uuid | YES | - | FK to profiles |
| created_by | uuid | YES | - | FK to profiles |
| due_date | date | YES | - | Due date |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

---

## User & Authentication

### user_roles
Role assignments for users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | - | FK to profiles |
| role | app_role | NO | - | Role enum value |
| created_at | timestamptz | YES | now() | Record creation timestamp |

### user_role_history
Audit trail for role changes.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | - | FK to profiles |
| role | app_role | NO | - | Role that changed |
| action | text | NO | - | 'assigned' or 'removed' |
| changed_by | uuid | YES | - | FK to profiles |
| notes | text | YES | - | Change notes |
| created_at | timestamptz | YES | now() | Record creation timestamp |

### auth_audit_log
Authentication events audit log.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | - | FK to profiles |
| user_email | text | YES | - | User email |
| event_type | text | NO | - | Event type |
| event_details | jsonb | YES | - | Additional details |
| ip_address | text | YES | - | Client IP |
| user_agent | text | YES | - | Browser user agent |
| created_at | timestamptz | YES | now() | Event timestamp |

### auth_settings
Authentication configuration settings.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| setting_key | text | NO | - | Setting name |
| setting_value | jsonb | NO | '{}' | Setting value |
| updated_by | uuid | YES | - | FK to profiles |
| updated_at | timestamptz | YES | now() | Last update timestamp |

---

## Project Management

### program_increments
Planning intervals (PIs) for SAFe.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | PI name (e.g., 'PI 24.1') |
| code | text | YES | - | PI code |
| start_date | date | NO | - | PI start date |
| end_date | date | NO | - | PI end date |
| status | text | YES | 'planning' | PI status |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### iterations
Sprints within PIs.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Iteration name |
| code | text | YES | - | Iteration code |
| pi_id | uuid | YES | - | FK to program_increments |
| start_date | date | NO | - | Start date |
| end_date | date | NO | - | End date |
| status | text | YES | 'planning' | Iteration status |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### themes
Strategic themes for grouping work.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Theme name |
| description | text | YES | - | Theme description |
| color | text | YES | - | Display color |
| program_id | uuid | YES | - | FK to programs |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

---

## Incident Management

### incidents
Incident records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| incident_key | text | YES | - | Auto-generated key (INC-###) |
| title | text | NO | - | Incident title |
| description | text | YES | - | Incident description |
| status | text | YES | 'new' | Incident status |
| severity | text | YES | - | Severity level (SEV1-SEV4) |
| priority | priority_level | YES | - | Derived priority |
| impact | text | YES | - | Impact level |
| urgency | text | YES | - | Urgency level |
| is_major_incident | boolean | YES | false | Major incident flag |
| assignee_id | uuid | YES | - | FK to profiles |
| reporter_id | uuid | YES | - | FK to profiles |
| project_id | uuid | YES | - | FK to projects |
| committee_id | uuid | YES | - | FK to incident_committees |
| resolved_at | timestamptz | YES | - | Resolution timestamp |
| deleted_at | timestamptz | YES | - | Soft delete timestamp |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### incident_comments
Comments on incidents.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| incident_id | uuid | NO | - | FK to incidents |
| user_id | uuid | NO | - | FK to profiles |
| content | text | NO | - | Comment content |
| is_internal | boolean | YES | false | Internal note flag |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### incident_history
Incident change history.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| incident_id | uuid | NO | - | FK to incidents |
| field_name | text | NO | - | Changed field |
| old_value | text | YES | - | Previous value |
| new_value | text | YES | - | New value |
| changed_by | uuid | YES | - | FK to profiles |
| changed_at | timestamptz | YES | now() | Change timestamp |

### incident_committees
Approval committees for incidents.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| incident_id | uuid | NO | - | FK to incidents |
| status | text | YES | 'pending' | Committee status |
| decision | text | YES | - | Committee decision |
| decided_at | timestamptz | YES | - | Decision timestamp |
| created_at | timestamptz | YES | now() | Record creation timestamp |

### sla_configs
SLA configuration by severity.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| severity | text | NO | - | Severity level |
| response_minutes | integer | NO | - | Response SLA minutes |
| resolution_minutes | integer | NO | - | Resolution SLA minutes |
| created_at | timestamptz | YES | now() | Record creation timestamp |

### sla_records
SLA tracking for incidents.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| incident_id | uuid | NO | - | FK to incidents |
| response_due_at | timestamptz | NO | - | Response deadline |
| resolution_due_at | timestamptz | NO | - | Resolution deadline |
| responded_at | timestamptz | YES | - | Actual response time |
| resolved_at | timestamptz | YES | - | Actual resolution time |

---

## Change Management

### change_cards
Change management records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| change_number | text | NO | - | Change number |
| title | text | NO | - | Change title |
| description | text | YES | - | Change description |
| status | change_card_status | YES | 'draft' | Change status |
| compliance_state | compliance_state | YES | 'compliant' | Compliance state |
| risk_level | text | YES | - | Risk level |
| planned_prod_date | date | NO | - | Planned production date |
| change_manager_user_id | uuid | NO | - | FK to profiles |
| created_by_user_id | uuid | NO | - | FK to profiles |
| approved | boolean | YES | false | Approval status |
| approved_at | timestamptz | YES | - | Approval timestamp |
| approved_by_user_id | uuid | YES | - | FK to profiles |
| release_version_id | uuid | YES | - | FK to release_versions |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### change_numbers
Legacy change number tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| number | text | NO | - | Change number (CHG-YYYY-####) |
| description | text | YES | - | Change description |
| status | text | YES | 'open' | Status (open/closed) |
| release_id | uuid | YES | - | FK to releases |
| scheduled_date | date | YES | - | Scheduled date |
| created_by | uuid | YES | - | FK to profiles |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### change_approvals
Approval workflow steps.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| change_card_id | uuid | NO | - | FK to change_cards |
| step_type | text | NO | - | Approval step type |
| step_order | integer | YES | 0 | Step sequence |
| status | text | YES | 'pending' | Approval status |
| assigned_user_id | uuid | YES | - | FK to profiles |
| assigned_role | text | YES | - | Required role |
| decided_at | timestamptz | YES | - | Decision timestamp |
| decision_by_user_id | uuid | YES | - | FK to profiles |
| comments | text | YES | - | Approval comments |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

---

## Release Management

### releases
Release records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Release name |
| version | text | YES | - | Version number |
| status | text | YES | 'planning' | Release status |
| planned_date | date | YES | - | Planned release date |
| actual_date | date | YES | - | Actual release date |
| project_id | uuid | YES | - | FK to projects |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### release_versions
Version tracking for releases.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| release_id | uuid | NO | - | FK to releases |
| version | text | NO | - | Version string |
| status | text | YES | 'draft' | Version status |
| notes | text | YES | - | Release notes |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### release_windows
Release windows for scheduling.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Window name |
| start_date | timestamptz | NO | - | Window start |
| end_date | timestamptz | NO | - | Window end |
| is_blocked | boolean | YES | false | Blocked flag |
| blocked_reason | text | YES | - | Reason for blocking |
| created_at | timestamptz | YES | now() | Record creation timestamp |

---

## Capacity & Resource Management

### capacity_allocations
Team capacity per iteration.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| team_id | uuid | NO | - | FK to teams |
| iteration_id | uuid | NO | - | FK to iterations |
| capacity_points | integer | YES | - | Allocated capacity |
| actual_capacity_points | integer | YES | - | Actual capacity used |
| velocity_baseline | integer | YES | - | Baseline velocity |
| load_factor | numeric | YES | - | Load factor |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### capacity_plans
Capacity planning by PI.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| pi_id | uuid | NO | - | FK to program_increments |
| team_id | uuid | YES | - | FK to teams |
| project_id | uuid | YES | - | FK to projects |
| available_capacity | integer | YES | 0 | Available capacity |
| unit | text | YES | 'story_points' | Capacity unit |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### resource_inventory
Resource pool management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Resource name |
| role_code | text | YES | - | Role code |
| capacity_percent | integer | YES | 100 | Available capacity % |
| project_id | uuid | YES | - | FK to projects |
| is_active | boolean | YES | true | Active flag |
| start_date | date | YES | - | Start date |
| end_date | date | YES | - | End date |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### capacity_bookings
Resource booking records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| resource_id | uuid | NO | - | FK to resource_inventory |
| business_request_id | uuid | YES | - | FK to business_requests |
| booking_type | text | NO | - | Type of booking |
| start_date | date | NO | - | Booking start |
| end_date | date | NO | - | Booking end |
| status | text | YES | - | Booking status |
| priority | text | YES | - | Priority |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

---

## Dependencies

### dependencies
Work item dependencies.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| from_feature_id | uuid | YES | - | FK to features (requesting) |
| to_feature_id | uuid | YES | - | FK to features (provider) |
| requesting_work_item_id | uuid | YES | - | Requesting work item |
| requesting_work_item_type | work_item_dependency_type | YES | - | Work item type |
| depends_on_work_item_id | uuid | YES | - | Provider work item |
| depends_on_work_item_type | work_item_dependency_type | YES | - | Work item type |
| status | dependency_status | YES | 'open' | Dependency status |
| type | dependency_type | YES | - | Dependency type |
| risk_level | risk_level | YES | - | Risk level |
| dependency_level_v2 | dependency_level_v2 | YES | - | Dependency level |
| quarter | text | NO | - | Target quarter |
| needed_by_date | date | YES | - | Date needed by |
| committed_by_date | date | YES | - | Committed date |
| description | text | YES | - | Description |
| source_blocked | boolean | YES | false | Source blocked flag |
| target_delayed | boolean | YES | false | Target delayed flag |
| pi_id | uuid | YES | - | FK to program_increments |
| requesting_project_id | uuid | YES | - | FK to projects |
| depends_on_project_id | uuid | YES | - | FK to projects |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### dependency_audit_log
Dependency change history.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| dependency_id | uuid | NO | - | FK to dependencies |
| action | text | NO | - | Action performed |
| field_changed | text | YES | - | Field that changed |
| old_value | text | YES | - | Previous value |
| new_value | text | YES | - | New value |
| changed_by | uuid | YES | - | FK to profiles |
| notes | text | YES | - | Change notes |
| created_at | timestamptz | YES | now() | Record creation timestamp |

---

## Defect Tracking

### defects
Defect/bug records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| defect_id | text | NO | - | Auto-generated ID (DEF-YYYY-####) |
| title | text | NO | - | Defect title |
| description | text | YES | - | Defect description |
| workflow_status | text | YES | 'new' | Workflow status |
| severity | text | NO | - | Severity level |
| priority | text | NO | - | Priority level |
| expected_result | text | NO | - | Expected behavior |
| actual_result | text | NO | - | Actual behavior |
| steps_to_reproduce | jsonb | YES | - | Reproduction steps |
| environment | text | YES | - | Environment |
| assignee_id | uuid | YES | - | FK to profiles |
| reporter_id | uuid | YES | - | FK to profiles |
| project_id | uuid | YES | - | FK to projects |
| linked_feature_id | uuid | YES | - | FK to features |
| linked_story_id | uuid | YES | - | FK to stories |
| target_release_id | uuid | YES | - | FK to releases |
| resolved_at | timestamptz | YES | - | Resolution timestamp |
| resolved_by | uuid | YES | - | FK to profiles |
| sla_target_hours | integer | YES | - | SLA target hours |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### defect_comments
Comments on defects.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| defect_id | uuid | NO | - | FK to defects |
| author_id | uuid | YES | - | FK to profiles |
| content | text | NO | - | Comment content |
| is_internal | boolean | YES | false | Internal flag |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### defect_attachments
File attachments for defects.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| defect_id | uuid | NO | - | FK to defects |
| file_name | text | NO | - | File name |
| file_url | text | NO | - | File URL |
| file_type | text | NO | - | MIME type |
| file_size | integer | NO | - | Size in bytes |
| capture_type | text | NO | - | Capture type |
| uploaded_by | uuid | YES | - | FK to profiles |
| created_at | timestamptz | YES | now() | Record creation timestamp |

---

## OKR & Strategy

### objectives
OKR objectives.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| title | text | NO | - | Objective title |
| description | text | YES | - | Objective description |
| status | text | YES | 'draft' | Status |
| level | text | YES | - | Level (company/team/individual) |
| owner_id | uuid | YES | - | FK to profiles |
| parent_objective_id | uuid | YES | - | FK to objectives (parent) |
| time_period_id | uuid | YES | - | FK to time_periods |
| score | numeric | YES | - | Current score (0-1) |
| score_override | numeric | YES | - | Manual score override |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### key_results
Key results for objectives.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| objective_id | uuid | NO | - | FK to objectives |
| title | text | NO | - | Key result title |
| description | text | YES | - | Description |
| metric_type | text | YES | - | Metric type |
| baseline_value | numeric | YES | 0 | Starting value |
| current_value | numeric | YES | - | Current value |
| goal_value | numeric | NO | - | Target value |
| unit | text | YES | - | Unit of measure |
| owner_id | uuid | YES | - | FK to profiles |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### strategy_snapshots
Strategic planning snapshots.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Snapshot name |
| description | text | YES | - | Description |
| status | text | YES | 'DRAFT' | Status |
| fiscal_year | text | YES | - | Fiscal year |
| data_json | jsonb | YES | - | Snapshot data |
| active_since | timestamptz | YES | - | When activated |
| archived_at | timestamptz | YES | - | When archived |
| created_by | uuid | YES | - | FK to profiles |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

---

## Configuration & Settings

### business_lines
Business line configurations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| key | text | NO | - | Unique key |
| name | text | NO | - | Display name |
| description | text | YES | - | Description |
| is_active | boolean | YES | true | Active flag |
| is_default | boolean | YES | false | Default flag |
| sort_order | integer | YES | 0 | Display order |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### departments
Department master data.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Department name |
| is_active | boolean | YES | true | Active flag |
| sort_order | integer | YES | - | Display order |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### products
Product catalog.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Product name |
| description | text | YES | - | Description |
| is_active | boolean | YES | true | Active flag |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### feature_flags
Feature flag configuration.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| key | text | NO | - | Flag key |
| name | text | NO | - | Display name |
| description | text | YES | - | Description |
| is_enabled | boolean | YES | false | Enabled flag |
| rollout_percentage | integer | YES | 0 | Rollout % |
| target_roles | text[] | YES | - | Target roles |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

---

## Analytics & Audit

### activity_logs
General activity audit log.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| entity_type | text | NO | - | Entity type |
| entity_id | uuid | NO | - | Entity ID |
| action | text | NO | - | Action performed |
| actor_id | uuid | YES | - | FK to profiles |
| before_json | jsonb | YES | - | State before change |
| after_json | jsonb | YES | - | State after change |
| created_at | timestamptz | YES | now() | Record creation timestamp |

### home_analytics_events
Home page analytics tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | YES | - | FK to profiles |
| home_mode | text | YES | - | Home mode |
| event_name | text | NO | - | Event name |
| event_data | jsonb | YES | - | Event data |
| created_at | timestamptz | YES | now() | Event timestamp |

### comments
Generic comments system.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| entity_type | text | NO | - | Entity type |
| entity_id | uuid | NO | - | Entity ID |
| user_id | uuid | NO | - | FK to profiles |
| content | text | NO | - | Comment content |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### discussions
Discussion threads.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| entity_type | text | NO | - | Entity type |
| entity_id | uuid | NO | - | Entity ID |
| user_id | uuid | NO | - | FK to profiles |
| message | text | NO | - | Message content |
| created_at | timestamptz | YES | now() | Record creation timestamp |
| updated_at | timestamptz | YES | now() | Last update timestamp |

### attachments
Generic file attachments.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| entity_type | text | NO | - | Entity type |
| entity_id | uuid | NO | - | Entity ID |
| file_name | text | NO | - | File name |
| file_path | text | NO | - | Storage path |
| file_size | integer | NO | - | Size in bytes |
| mime_type | text | NO | - | MIME type |
| uploaded_by | uuid | NO | - | FK to profiles |
| created_at | timestamptz | YES | now() | Record creation timestamp |

---

## Enums

### app_role
```sql
'viewer' | 'user' | 'admin' | 'super_admin'
```

### priority_level
```sql
'P1' | 'P2' | 'P3' | 'P4'
```

### dependency_status
```sql
'open' | 'pending_commit' | 'committed' | 'in_progress' | 'delivered' | 'done' | 'rejected' | 'no_work_done'
```

### dependency_type
```sql
'internal' | 'external' | 'cross_team' | 'vendor'
```

### dependency_level_v2
```sql
'execution' | 'delivery' | 'cross_level'
```

### risk_level
```sql
'low' | 'medium' | 'high' | 'critical'
```

### change_card_status
```sql
'draft' | 'pending_approval' | 'approved' | 'rejected' | 'deployed' | 'rolled_back'
```

### compliance_state
```sql
'compliant' | 'exception' | 'non_compliant'
```

### vote_status
```sql
'pending' | 'approved' | 'rejected' | 'abstained'
```

### board_type
```sql
'kanban' | 'scrum'
```

### board_scope_type
```sql
'global' | 'program' | 'project' | 'team'
```

### field_type
```sql
'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'user' | 'textarea'
```

### work_item_dependency_type
```sql
'epic' | 'feature' | 'story' | 'task'
```

---

## Entity Relationship Diagram (Simplified)

```
programs
    └── projects
        ├── teams
        │   └── team_members → profiles
        ├── features
        │   ├── stories
        │   │   └── acceptance_criteria
        │   └── dependencies
        └── iterations
            └── capacity_allocations

epics
    ├── epic_projects → projects
    ├── epic_program_increments → program_increments
    ├── features (via epic_id)
    └── themes

incidents
    ├── incident_comments → profiles
    ├── incident_history
    ├── incident_committees
    │   └── committee_members → profiles
    └── sla_records

change_cards
    ├── change_approvals
    ├── change_card_links
    └── release_versions → releases

defects
    ├── defect_comments → profiles
    ├── defect_attachments
    └── defect_work_item_links

objectives
    └── key_results
```

---

## Notes

1. **Soft Deletes**: Many tables use `deleted_at` for soft deletion instead of hard deletes.
2. **Audit Trails**: Most entities have corresponding audit/history tables.
3. **UUID Primary Keys**: All tables use UUID for primary keys.
4. **Timestamps**: All tables include `created_at` and most include `updated_at`.
5. **RLS Policies**: Row Level Security is enabled on most tables based on user roles and project membership.

---

*This documentation was auto-generated and may require updates as the schema evolves.*
