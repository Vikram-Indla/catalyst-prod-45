# In-Jira Module - Database Schema

## Overview

The In-Jira module implements a Jira-class project execution backend with full audit trails, multi-tenancy support, and strict hierarchy enforcement.

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           IN-JIRA DATA MODEL                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │    TENANT    │
                    │  (injira_    │
                    │   tenants)   │
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │   PROJECT    │ │  ISSUE_TYPE  │ │   STATUS     │
    │  (injira_    │ │  (injira_    │ │  (injira_    │
    │   projects)  │ │ issue_types) │ │   statuses)  │
    └──────┬───────┘ └──────────────┘ └──────────────┘
           │                     
           │         ┌───────────────────────────────────┐
           │         │         CANONICAL HIERARCHY        │
           │         │                                   │
           │         │  ┌─────────────────────────────┐  │
           │         │  │ PROGRAM EPIC (epics table)  │  │
           │         │  │ - Catalyst-native           │  │
           │         │  │ - Jira Epic → maps here     │  │
           │         │  └─────────────┬───────────────┘  │
           │         │                │                   │
           │         │  ┌─────────────▼───────────────┐  │
           │         │  │ FEATURE (features table)    │  │
           │         │  │ - Lives in Project          │  │
           │         │  └─────────────┬───────────────┘  │
           │         │                │                   │
           ▼         │  ┌─────────────▼───────────────┐  │
    ┌──────────────┐ │  │ STORY (injira_issues)       │  │
    │    ISSUE     │ │  │ - MUST ref parent_feature_id│  │
    │  (injira_    │◄┼──│ - program_epic_id optional  │  │
    │   issues)    │ │  └─────────────┬───────────────┘  │
    └──────┬───────┘ │                │                   │
           │         │  ┌─────────────▼───────────────┐  │
           │         │  │ SUB-TASK (injira_issues)    │  │
           │         │  │ - MUST have parent_id       │  │
           │         │  │ - parent = Story only       │  │
           │         │  └─────────────────────────────┘  │
           │         │                                   │
           │         │  ┌─────────────────────────────┐  │
           │         │  │ DEFECT/INCIDENT             │  │
           │         │  │ (injira_issues)             │  │
           │         │  │ - First-class, no parent    │  │
           │         │  │ - Independent work items    │  │
           │         │  └─────────────────────────────┘  │
           │         └───────────────────────────────────┘
           │
    ┌──────┴──────────────────────────────────────────────┐
    │                                                      │
    ▼              ▼              ▼              ▼        ▼
┌────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌────────┐
│ SPRINT │  │  BOARD   │  │ VERSION  │  │ COMMENT │  │CHANGELOG│
└────────┘  └──────────┘  └──────────┘  └─────────┘  └────────┘
```

## Tables Reference

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `injira_tenants` | Multi-tenant container | `id`, `key`, `name` |
| `injira_projects` | Jira project | `id`, `tenant_id`, `key`, `name`, `lead_user_id` |
| `injira_issue_types` | Issue type definitions | `id`, `category`, `is_subtask`, `hierarchy_level` |
| `injira_statuses` | Workflow statuses | `id`, `category`, `is_initial`, `is_final` |
| `injira_resolutions` | Resolution types | `id`, `name`, `is_default` |

### Issue Table

**`injira_issues`** - The core work item table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | FK to tenant (required) |
| `project_id` | UUID | FK to project (required) |
| `key` | TEXT | Auto-generated (e.g., PROJ-123) |
| `issue_number` | INTEGER | Sequential per project |
| `issue_type_id` | UUID | FK to issue type |
| `status_id` | UUID | FK to status |
| `resolution_id` | UUID | FK to resolution (nullable) |
| `summary` | TEXT | Issue title |
| `description` | JSONB | ADF format content |
| `parent_id` | UUID | Self-ref (sub-task → story only) |
| `parent_feature_id` | UUID | FK to features table |
| `program_epic_id` | UUID | FK to epics table |
| `reporter_id` | UUID | FK to profiles |
| `assignee_id` | UUID | FK to profiles |
| `priority` | TEXT | Priority level |
| `story_points` | DECIMAL | Estimation |
| `sprint_id` | UUID | FK to sprint |
| `rank_lexo` | TEXT | Lexorank for ordering |
| `labels` | TEXT[] | Label array |
| `components` | TEXT[] | Component array |
| `optimistic_lock_version` | INTEGER | Concurrency control |
| `custom_fields` | JSONB | Extensible fields |
| `deleted_at` | TIMESTAMPTZ | Soft delete |

### Board & Sprint Tables

| Table | Purpose |
|-------|---------|
| `injira_boards` | Board configuration (Kanban/Scrum) |
| `injira_board_columns` | Column definitions with status mappings |
| `injira_sprints` | Sprint containers with goal, dates, velocity |

### Version Tables

| Table | Purpose |
|-------|---------|
| `injira_versions` | Release versions |
| `injira_issue_versions` | Many-to-many (fix/affects versions) |

### Collaboration Tables

| Table | Purpose |
|-------|---------|
| `injira_comments` | Comments in ADF JSON format |
| `injira_attachments` | File attachments |

### Audit Tables (Append-Only)

| Table | Purpose |
|-------|---------|
| `injira_changelog_groups` | Groups related changes per transaction |
| `injira_changelog_items` | Individual field changes |

> **Note**: Changelog tables have no UPDATE or DELETE operations - append-only audit trail.

### Permission Tables

| Table | Purpose |
|-------|---------|
| `injira_permission_schemes` | Permission scheme containers |
| `injira_roles` | Role definitions |
| `injira_role_assignments` | User/group → role in project |
| `injira_permission_grants` | Permission → role in scheme |
| `injira_issue_security_levels` | Issue-level security |

### Automation & Integration Tables

| Table | Purpose |
|-------|---------|
| `injira_automation_rules` | Automation rule configuration |
| `injira_webhooks` | Webhook subscriptions |

### Import Tables

| Table | Purpose |
|-------|---------|
| `injira_import_jobs` | Import job tracking |
| `injira_import_mappings` | Jira ID → Catalyst ID mapping |
| `injira_import_manifests` | Planned import structure |
| `injira_import_diff_reports` | Import diff analysis |

### AI Table

| Table | Purpose |
|-------|---------|
| `injira_ai_suggestions` | AI-generated suggestions |

## Hierarchy Enforcement Rules

### Constraint: Sub-task MUST have parent Story

```sql
-- Trigger validates:
IF v_issue_type_category = 'subtask' THEN
  IF NEW.parent_id IS NULL THEN
    RAISE EXCEPTION 'Sub-task must have a parent Story';
  END IF;
  -- Parent must be Story type
END IF;
```

### Constraint: Story MUST reference Feature

```sql
-- Trigger validates:
IF v_issue_type_category = 'story' THEN
  IF NEW.parent_feature_id IS NULL THEN
    RAISE EXCEPTION 'Story must reference a Feature';
  END IF;
  IF NEW.parent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Story cannot have parent_id';
  END IF;
END IF;
```

### Constraint: Feature/Defect/Incident cannot have parent_id

```sql
-- Trigger validates:
IF v_issue_type_category IN ('feature', 'defect', 'incident') THEN
  IF NEW.parent_id IS NOT NULL THEN
    RAISE EXCEPTION '% cannot have parent_id', v_issue_type_category;
  END IF;
END IF;
```

### Rule: Jira Epic never stored in issue table

Jira Epics map to Program Epics (`public.epics` table), not `injira_issues`. The `program_epic_id` FK links stories to their Program Epic.

## Indexes

### List & Board Performance

```sql
-- Primary list queries
CREATE INDEX idx_injira_issues_project_status ON injira_issues(project_id, status_id);
CREATE INDEX idx_injira_issues_project_sprint ON injira_issues(project_id, sprint_id);
CREATE INDEX idx_injira_issues_project_rank ON injira_issues(project_id, rank_lexo);

-- Assignee workload
CREATE INDEX idx_injira_issues_assignee ON injira_issues(assignee_id);

-- Hierarchy traversal
CREATE INDEX idx_injira_issues_parent ON injira_issues(parent_id);
CREATE INDEX idx_injira_issues_parent_feature ON injira_issues(parent_feature_id);
CREATE INDEX idx_injira_issues_program_epic ON injira_issues(program_epic_id);

-- Key lookup (for browse)
CREATE INDEX idx_injira_issues_key ON injira_issues(key);

-- Full-text search
CREATE INDEX idx_injira_issues_summary_trgm ON injira_issues USING GIN(summary gin_trgm_ops);

-- Labels filtering
CREATE INDEX idx_injira_issues_labels ON injira_issues USING GIN(labels);
```

### Changelog Performance

```sql
-- History queries
CREATE INDEX idx_injira_changelog_groups_issue ON injira_changelog_groups(issue_id);
CREATE INDEX idx_injira_changelog_groups_created ON injira_changelog_groups(issue_id, created_at DESC);
```

## Enum Types

| Type | Values |
|------|--------|
| `injira_issue_type_category` | feature, story, subtask, defect, incident |
| `injira_status_category` | to_do, in_progress, done |
| `injira_board_type` | kanban, scrum |
| `injira_sprint_state` | future, active, closed |
| `injira_import_status` | pending, in_progress, completed, failed, cancelled |
| `injira_permission_type` | browse, create, edit, delete, assign, transition, comment, attach, manage |
| `injira_webhook_event` | issue_created, issue_updated, issue_deleted, sprint_started, sprint_closed, version_released |

## Triggers

### Auto-Update Timestamps

All tables with `updated_at` have triggers to auto-update on modification.

### Issue Key Generation

```sql
-- Auto-generates: PROJECT_KEY + "-" + SEQUENCE_NUMBER
-- Example: PROJ-123
CREATE TRIGGER generate_injira_issue_key_trigger
  BEFORE INSERT ON injira_issues
  FOR EACH ROW
  WHEN (NEW.key IS NULL)
  EXECUTE FUNCTION generate_injira_issue_key();
```

### Changelog Logging

```sql
-- Logs all field changes to changelog tables
-- Increments optimistic_lock_version on every update
CREATE TRIGGER log_injira_issue_changes_trigger
  BEFORE UPDATE ON injira_issues
  FOR EACH ROW
  EXECUTE FUNCTION log_injira_issue_changes();
```

## Row Level Security

All tables have RLS enabled with policies:

- **SELECT**: Approved users can read
- **ALL**: Approved users can manage issues, projects, boards, sprints, versions, comments
- **ADMIN**: Only admins can manage issue types, statuses, resolutions, tenants

## Migration Notes

### No Cascading Deletes

All FKs use `ON DELETE RESTRICT` or `ON DELETE SET NULL` - no cascading deletes to prevent data loss.

### Soft Delete Pattern

Issues use `deleted_at` for soft delete. All indexes include `WHERE deleted_at IS NULL`.

### Optimistic Locking

`optimistic_lock_version` is auto-incremented on every update for concurrent edit detection.
