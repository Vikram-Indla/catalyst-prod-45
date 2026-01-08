# Test Management Module - Backend Specification

> Complete backend, API, and database specification for the Test Management module.
> This document provides everything needed to build the UI layer.

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [Enum Types](#enum-types)
3. [Database Functions](#database-functions)
4. [RLS Policies](#rls-policies)
5. [Edge Functions (APIs)](#edge-functions-apis)
6. [API Patterns & Response Formats](#api-patterns--response-formats)

---

## Database Schema

### Core Tables

#### tm_projects
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| key | varchar(10) | NO | - | Project key (e.g., "PROJ") |
| name | varchar(100) | NO | - | Project name |
| description | text | YES | - | Project description |
| status | varchar(20) | YES | 'active' | active, archived |
| settings | jsonb | YES | '{}' | Project settings |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |

#### tm_users
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| auth_user_id | uuid | YES | - | FK to auth.users |
| email | varchar(255) | NO | - | User email |
| display_name | varchar(100) | YES | - | Display name |
| avatar_url | text | YES | - | Avatar URL |
| status | varchar(20) | YES | 'active' | active, inactive |
| preferences | jsonb | YES | '{}' | User preferences |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |

#### tm_roles
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | varchar(50) | NO | - | Role name |
| permissions | jsonb | YES | '{}' | Permission flags |
| created_at | timestamptz | YES | now() | |

#### tm_user_roles
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | - | FK to tm_users |
| role_id | uuid | NO | - | FK to tm_roles |
| project_id | uuid | YES | - | FK to tm_projects (null = global) |
| created_at | timestamptz | YES | now() | |

#### tm_folders
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | NO | - | FK to tm_projects |
| name | varchar(100) | NO | - | Folder name |
| parent_id | uuid | YES | - | Parent folder (self-ref) |
| path | text | YES | - | Materialized path |
| depth | integer | YES | 0 | Nesting depth |
| sort_order | integer | YES | 0 | Sort order |
| case_count | integer | YES | 0 | Cached case count |
| created_by | uuid | YES | - | FK to auth.users |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |

#### tm_test_cases
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | NO | - | FK to tm_projects |
| folder_id | uuid | YES | - | FK to tm_folders |
| case_key | varchar(20) | NO | - | Auto-generated key (TC-0001) |
| title | varchar(500) | NO | - | Test case title |
| description | text | YES | - | Rich text description |
| preconditions | text | YES | - | Preconditions |
| expected_result | text | YES | - | Expected result |
| status | tm_case_status | YES | 'draft' | draft, ready, approved, deprecated |
| priority_id | uuid | YES | - | FK to tm_case_priorities |
| case_type_id | uuid | YES | - | FK to tm_case_types |
| estimated_time | integer | YES | - | Estimated duration (minutes) |
| automation_status | varchar(20) | YES | - | manual, automated, planned |
| automation_id | varchar(100) | YES | - | External automation reference |
| version | integer | YES | 1 | Version number |
| custom_fields | jsonb | YES | '{}' | Custom fields |
| created_by | uuid | YES | - | FK to auth.users |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |

#### tm_test_steps
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| test_case_id | uuid | NO | - | FK to tm_test_cases |
| step_number | integer | NO | - | Step order (1-based) |
| action | text | NO | - | Step action |
| expected_result | text | YES | - | Expected result |
| test_data | text | YES | - | Test data |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |

#### tm_test_cycles
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | NO | - | FK to tm_projects |
| cycle_key | varchar(20) | NO | - | Auto-generated key (CY-0001) |
| name | varchar(200) | NO | - | Cycle name |
| description | text | YES | - | Description |
| status | varchar(20) | YES | 'not_started' | not_started, in_progress, paused, completed, cancelled |
| environment_id | uuid | YES | - | FK to tm_environments |
| planned_start_date | date | YES | - | Planned start |
| planned_end_date | date | YES | - | Planned end |
| actual_start_date | timestamptz | YES | - | Actual start |
| actual_end_date | timestamptz | YES | - | Actual end |
| total_cases | integer | YES | 0 | Total scope count |
| passed_count | integer | YES | 0 | Passed count |
| failed_count | integer | YES | 0 | Failed count |
| blocked_count | integer | YES | 0 | Blocked count |
| skipped_count | integer | YES | 0 | Skipped count |
| not_run_count | integer | YES | 0 | Not run count |
| created_by | uuid | YES | - | FK to tm_users |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |

#### tm_cycle_scope
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| cycle_id | uuid | NO | - | FK to tm_test_cycles |
| test_case_id | uuid | NO | - | FK to tm_test_cases |
| assigned_to | uuid | YES | - | FK to tm_users |
| current_status | tm_execution_status | YES | 'not_run' | Current execution status |
| latest_run_id | uuid | YES | - | FK to tm_test_runs |
| sort_order | integer | YES | 0 | Execution order |
| added_at | timestamptz | YES | now() | |

#### tm_test_runs
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| scope_id | uuid | NO | - | FK to tm_cycle_scope |
| cycle_id | uuid | NO | - | FK to tm_test_cycles |
| case_id | uuid | YES | - | FK to tm_test_cases |
| run_number | integer | YES | 1 | Run number for this scope |
| status | tm_execution_status | YES | 'not_run' | Calculated from steps |
| executed_by | uuid | YES | - | FK to tm_users |
| started_at | timestamptz | YES | - | Execution start |
| completed_at | timestamptz | YES | - | Execution end |
| duration_seconds | integer | YES | - | Total duration |
| notes | text | YES | - | Execution notes |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |

#### tm_step_results
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| run_id | uuid | NO | - | FK to tm_test_runs |
| step_id | uuid | NO | - | FK to tm_test_steps |
| status | tm_execution_status | YES | 'not_run' | Step status |
| actual_result | text | YES | - | Actual result |
| executed_by | uuid | YES | - | Executor |
| executed_at | timestamptz | YES | - | Execution time |
| duration_seconds | integer | YES | - | Step duration |
| created_at | timestamptz | YES | now() | |

#### tm_defects
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | NO | - | FK to tm_projects |
| defect_key | varchar(20) | NO | - | Auto-generated key (DF-0001) |
| title | varchar(500) | NO | - | Defect title |
| description | text | YES | - | Rich description |
| severity | tm_defect_severity | YES | 'minor' | critical, major, minor, trivial |
| status | tm_defect_status | YES | 'open' | open, in_progress, resolved, closed, reopened |
| priority | varchar(50) | YES | 'medium' | Priority |
| assignee_id | uuid | YES | - | FK to profiles |
| reporter_id | uuid | YES | - | FK to profiles |
| external_id | varchar(100) | YES | - | Jira/external ID |
| external_url | text | YES | - | External URL |
| defect_type | varchar(50) | YES | 'bug' | bug, enhancement, etc. |
| component | varchar(255) | YES | - | Affected component |
| module | varchar(255) | YES | - | Affected module |
| labels | text[] | YES | '{}' | Labels array |
| environment | varchar(50) | YES | - | Environment |
| steps_to_reproduce | text | YES | - | Steps to reproduce |
| expected_result | text | YES | - | Expected result |
| actual_result | text | YES | - | Actual result |
| is_regression | boolean | YES | false | Regression flag |
| is_blocker | boolean | YES | false | Blocker flag |
| due_date | date | YES | - | Due date |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |
| resolved_at | timestamptz | YES | - | Resolution time |

#### tm_defect_links
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| defect_id | uuid | NO | - | FK to tm_defects |
| test_run_id | uuid | YES | - | FK to tm_test_runs |
| step_result_id | uuid | YES | - | FK to tm_step_results |
| created_by | uuid | YES | - | Creator |
| created_at | timestamptz | YES | now() | |

#### tm_test_sets
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | NO | - | FK to tm_projects |
| name | varchar(200) | NO | - | Set name |
| description | text | YES | - | Description |
| is_smart | boolean | YES | false | Smart set flag |
| smart_query | jsonb | YES | - | Smart filter criteria |
| created_by | uuid | YES | - | Creator |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |

#### tm_set_cases
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| test_set_id | uuid | NO | - | FK to tm_test_sets |
| test_case_id | uuid | NO | - | FK to tm_test_cases |
| sort_order | integer | YES | 0 | Sort order |
| created_at | timestamptz | YES | now() | |

### Settings Tables

#### tm_case_priorities
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | YES | - | FK to tm_projects (null = global) |
| name | varchar(50) | NO | - | Priority name |
| level | integer | YES | - | Priority level (1=highest) |
| color | varchar(7) | YES | '#6B7280' | Hex color |
| sort_order | integer | YES | 0 | Display order |
| is_default | boolean | YES | false | Default flag |
| created_at | timestamptz | YES | now() | |

#### tm_case_types
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | YES | - | FK to tm_projects |
| name | varchar(50) | NO | - | Type name |
| icon | varchar(50) | YES | - | Icon name |
| color | varchar(7) | YES | '#6B7280' | Hex color |
| is_default | boolean | YES | false | Default flag |
| created_at | timestamptz | YES | now() | |

#### tm_environments
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | NO | - | FK to tm_projects |
| name | varchar(100) | NO | - | Environment name |
| description | text | YES | - | Description |
| url | text | YES | - | Environment URL |
| sort_order | integer | YES | 0 | Display order |
| is_default | boolean | YES | false | Default flag |
| created_at | timestamptz | YES | now() | |

#### tm_labels
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | NO | - | FK to tm_projects |
| name | varchar(50) | NO | - | Label name |
| color | varchar(7) | YES | '#6B7280' | Hex color |
| description | text | YES | - | Description |
| created_at | timestamptz | YES | now() | |

#### tm_case_labels (junction)
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| test_case_id | uuid | NO | - | FK to tm_test_cases |
| label_id | uuid | NO | - | FK to tm_labels |
| created_at | timestamptz | YES | now() | |

### Support Tables

#### tm_attachments
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| entity_type | varchar(50) | NO | - | test_case, defect, step_result |
| entity_id | uuid | NO | - | Entity ID |
| file_name | varchar(255) | NO | - | File name |
| file_path | text | NO | - | Storage path |
| file_size | integer | YES | - | Size in bytes |
| mime_type | varchar(100) | YES | - | MIME type |
| uploaded_by | uuid | YES | - | Uploader |
| created_at | timestamptz | YES | now() | |

#### tm_comments
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| entity_type | varchar(50) | NO | - | Entity type |
| entity_id | uuid | NO | - | Entity ID |
| content | text | NO | - | Comment content |
| author_id | uuid | YES | - | FK to profiles |
| parent_id | uuid | YES | - | Parent comment (threading) |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |

#### tm_notifications
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | - | FK to tm_users |
| type | tm_notification_type | NO | - | Notification type |
| title | varchar(200) | NO | - | Title |
| message | text | YES | - | Message |
| entity_type | varchar(50) | YES | - | Related entity type |
| entity_id | uuid | YES | - | Related entity ID |
| is_read | boolean | YES | false | Read flag |
| created_at | timestamptz | YES | now() | |

#### tm_audit_log
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | YES | - | FK to tm_projects |
| entity_type | varchar(50) | NO | - | Entity type |
| entity_id | uuid | NO | - | Entity ID |
| action | tm_audit_action | NO | - | create, update, delete, execute, assign, clone |
| actor_id | uuid | YES | - | Actor |
| changes | jsonb | YES | - | Before/after diff |
| ip_address | inet | YES | - | IP address |
| user_agent | text | YES | - | User agent |
| created_at | timestamptz | YES | now() | |

#### tm_key_sequences
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| project_id | uuid | NO | - | FK to tm_projects |
| prefix | varchar(10) | NO | - | Key prefix (TC, CY, DF) |
| current_value | integer | YES | 0 | Current sequence |
| updated_at | timestamptz | YES | now() | |
| UNIQUE | - | - | - | (project_id, prefix) |

#### tm_test_case_templates
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | varchar(200) | NO | - | Template name |
| description | text | YES | - | Description |
| category_id | uuid | YES | - | FK to tm_template_categories |
| template_data | jsonb | NO | - | Template JSON |
| is_global | boolean | YES | false | Global template |
| project_id | uuid | YES | - | FK to tm_projects |
| created_by | uuid | YES | - | Creator |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |

#### tm_saved_filters
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | - | Owner |
| project_id | uuid | YES | - | Project scope |
| name | varchar(100) | NO | - | Filter name |
| entity_type | varchar(50) | NO | - | cases, cycles, defects |
| filter_data | jsonb | NO | - | Filter criteria |
| is_shared | boolean | YES | false | Shared flag |
| created_at | timestamptz | YES | now() | |

---

## Enum Types

```sql
-- Case Status
CREATE TYPE tm_case_status AS ENUM ('draft', 'ready', 'approved', 'deprecated');

-- Cycle Status  
CREATE TYPE tm_cycle_status AS ENUM ('planned', 'in_progress', 'completed', 'archived');

-- Execution Status
CREATE TYPE tm_execution_status AS ENUM ('not_run', 'in_progress', 'passed', 'failed', 'blocked', 'skipped');

-- Defect Severity
CREATE TYPE tm_defect_severity AS ENUM ('critical', 'major', 'minor', 'trivial');

-- Defect Status
CREATE TYPE tm_defect_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'reopened');

-- Audit Action
CREATE TYPE tm_audit_action AS ENUM ('create', 'update', 'delete', 'execute', 'assign', 'clone');

-- Notification Type
CREATE TYPE tm_notification_type AS ENUM ('assignment', 'mention', 'status_change', 'comment', 'due_date');
```

---

## Database Functions

### tm_user_has_access
Check if user has access to a project.

```sql
CREATE OR REPLACE FUNCTION tm_user_has_access(p_user_id uuid, p_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tm_user_roles 
    WHERE user_id = p_user_id AND project_id = p_project_id
  );
END;
$$;
```

### tm_next_entity_key
Generate next entity key (TC-0001, CY-0001, DF-0001).

```sql
CREATE OR REPLACE FUNCTION tm_next_entity_key(p_project_id uuid, p_prefix varchar)
RETURNS varchar
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  INSERT INTO tm_key_sequences (project_id, prefix, current_value)
  VALUES (p_project_id, p_prefix, 1)
  ON CONFLICT (project_id, prefix) 
  DO UPDATE SET current_value = tm_key_sequences.current_value + 1, updated_at = now()
  RETURNING current_value INTO v_next;
  
  RETURN p_prefix || '-' || LPAD(v_next::TEXT, 4, '0');
END;
$$;
```

### tm_calculate_run_status
Calculate run status from step results.

```sql
CREATE OR REPLACE FUNCTION tm_calculate_run_status(p_run_id uuid)
RETURNS tm_execution_status
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_status tm_execution_status;
BEGIN
  SELECT 
    CASE
      WHEN COUNT(*) FILTER (WHERE status = 'failed') > 0 THEN 'failed'::tm_execution_status
      WHEN COUNT(*) FILTER (WHERE status = 'blocked') > 0 THEN 'blocked'::tm_execution_status
      WHEN COUNT(*) FILTER (WHERE status = 'in_progress') > 0 THEN 'in_progress'::tm_execution_status
      WHEN COUNT(*) FILTER (WHERE status = 'not_run') = COUNT(*) THEN 'not_run'::tm_execution_status
      WHEN COUNT(*) FILTER (WHERE status IN ('passed', 'skipped')) = COUNT(*) THEN 'passed'::tm_execution_status
      ELSE 'in_progress'::tm_execution_status
    END INTO v_status
  FROM tm_step_results
  WHERE test_run_id = p_run_id;
  
  RETURN COALESCE(v_status, 'not_run');
END;
$$;
```

### tm_update_cycle_stats
Recalculate cycle statistics from scope.

```sql
CREATE OR REPLACE FUNCTION tm_update_cycle_stats(p_cycle_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE tm_test_cycles SET
    total_cases = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id),
    passed_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'passed'),
    failed_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'failed'),
    blocked_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'blocked'),
    skipped_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'skipped'),
    not_run_count = (SELECT COUNT(*) FROM tm_cycle_scope WHERE cycle_id = p_cycle_id AND current_status = 'not_run'),
    updated_at = now()
  WHERE id = p_cycle_id;
END;
$$;
```

### tm_check_circular_folder
Prevent circular folder references.

```sql
CREATE OR REPLACE FUNCTION tm_check_circular_folder(p_folder_id uuid, p_new_parent_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_current_id UUID;
BEGIN
  IF p_new_parent_id IS NULL THEN RETURN FALSE; END IF;
  IF p_folder_id = p_new_parent_id THEN RETURN TRUE; END IF;
  
  v_current_id := p_new_parent_id;
  WHILE v_current_id IS NOT NULL LOOP
    IF v_current_id = p_folder_id THEN RETURN TRUE; END IF;
    SELECT parent_id INTO v_current_id FROM tm_folders WHERE id = v_current_id;
  END LOOP;
  
  RETURN FALSE;
END;
$$;
```

### tm_update_folder_counts
Update folder case counts.

```sql
CREATE OR REPLACE FUNCTION tm_update_folder_counts(p_folder_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF p_folder_id IS NOT NULL THEN
    UPDATE tm_folders SET
      case_count = (SELECT COUNT(*) FROM tm_test_cases WHERE folder_id = p_folder_id),
      updated_at = now()
    WHERE id = p_folder_id;
  END IF;
END;
$$;
```

---

## RLS Policies

All tables have RLS enabled. Key patterns:

### Project-scoped tables
Tables like `tm_test_cases`, `tm_test_cycles`, `tm_defects`:
```sql
-- SELECT, UPDATE, DELETE
tm_user_has_access(auth.uid(), project_id)

-- INSERT
tm_user_has_access(auth.uid(), project_id) WITH CHECK
```

### Child tables (linked via parent)
Tables like `tm_test_steps`, `tm_cycle_scope`:
```sql
-- Uses JOIN to verify project access
EXISTS (
  SELECT 1 FROM tm_test_cases tc
  WHERE tc.id = tm_test_steps.test_case_id 
  AND tm_user_has_access(auth.uid(), tc.project_id)
)
```

### User-owned tables
Tables like `tm_saved_filters`, `tm_notifications`:
```sql
-- SELECT, UPDATE, DELETE
user_id = auth.uid()
```

---

## Edge Functions (APIs)

### Base URL Pattern
```
POST/GET/PATCH/DELETE https://{project}.supabase.co/functions/v1/{function-name}
```

### Authentication
All endpoints require `Authorization: Bearer {access_token}` header.

---

### tm-auth - Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /tm-auth/login | Login with email/password |
| POST | /tm-auth/register | Register new user |
| POST | /tm-auth/logout | Logout |
| GET | /tm-auth/me | Get current user with profile and roles |
| POST | /tm-auth/refresh | Refresh session |
| POST | /tm-auth/forgot-password | Request password reset |
| POST | /tm-auth/reset-password | Reset password |
| PATCH | /tm-auth/profile | Update profile |

---

### tm-cases - Test Cases

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tm-cases/projects/{projectId}/cases | List cases with pagination and filters |
| POST | /tm-cases/projects/{projectId}/cases | Create case |
| GET | /tm-cases/projects/{projectId}/cases/{caseId} | Get case with steps and labels |
| PATCH | /tm-cases/projects/{projectId}/cases/{caseId} | Update case |
| DELETE | /tm-cases/projects/{projectId}/cases/{caseId} | Soft delete (set status=deprecated) |
| POST | /tm-cases/projects/{projectId}/cases/{caseId}/clone | Clone case |
| GET | /tm-cases/projects/{projectId}/cases/{caseId}/versions | Get version history |
| PUT | /tm-cases/projects/{projectId}/cases/{caseId}/steps | Replace all steps |
| POST | /tm-cases/projects/{projectId}/cases/bulk | Bulk create |
| POST | /tm-cases/projects/{projectId}/cases/bulk-copy | Bulk copy |
| POST | /tm-cases/projects/{projectId}/cases/from-template/{templateId} | Create from template |

#### Query Parameters (List)
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 50, max: 100)
- `folderId` - Filter by folder
- `status` - Filter by status (draft, ready, approved, deprecated)
- `priorityId` - Filter by priority
- `typeId` - Filter by case type
- `search` - Title search (ilike)
- `labelIds` - Comma-separated label IDs

#### Response Format
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

---

### tm-cycles - Test Cycles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tm-cycles?project_id={id} | List cycles |
| POST | /tm-cycles | Create cycle |
| GET | /tm-cycles/{id} | Get cycle with scope and stats |
| PATCH | /tm-cycles/{id} | Update cycle |
| DELETE | /tm-cycles/{id} | Delete cycle (fails if has runs) |
| POST | /tm-cycles/{id}/clone | Clone cycle with scope |

#### Status Transitions
```
not_started → in_progress, cancelled
in_progress → paused, completed, cancelled
paused → in_progress, cancelled
completed → (terminal)
cancelled → (terminal)
```

---

### tm-scope - Cycle Scope Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tm-scope?cycle_id={id} | Get scope items with case details |
| POST | /tm-scope | Add cases to scope (verifies approved status) |
| DELETE | /tm-scope/{id} | Remove from scope (fails if has runs) |
| POST | /tm-scope/assign | Assign user to scope item |
| POST | /tm-scope/bulk-assign | Bulk assign |

#### Query Parameters
- `include_steps=true` - Include test steps in response

---

### tm-runs - Test Execution

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tm-runs?cycle_id={id} | List runs |
| GET | /tm-runs/{id} | Get run with step results |
| POST | /tm-runs | Create run (auto-creates step_results) |
| PATCH | /tm-runs/{id}/steps/{stepId} | Update single step status |
| PATCH | /tm-runs/{id}/steps/bulk | Bulk update steps |
| POST | /tm-runs/{id}/complete | Mark run complete |
| POST | /tm-runs/rerun-failed | Reset failed tests for rerun |

#### Status Percolation (CRITICAL)
When step status changes:
1. Calculate run status from all steps
2. Update run status
3. Update cycle_scope.current_status
4. Recalculate cycle statistics

```
Step Status Rules:
- ANY step failed → Run = FAILED
- ANY step blocked (no fails) → Run = BLOCKED  
- ALL steps passed → Run = PASSED
- ALL steps not_run → Run = NOT_RUN
- Otherwise → Run = IN_PROGRESS
```

---

### tm-defects - Defect Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tm-defects/projects/{projectId}/defects | List defects |
| POST | /tm-defects/projects/{projectId}/defects | Create defect |
| POST | /tm-defects/projects/{projectId}/defects/from-step | Quick defect from failed step |
| GET | /tm-defects/projects/{projectId}/defects/{defectId} | Get defect with links |
| PATCH | /tm-defects/projects/{projectId}/defects/{defectId} | Update defect |
| POST | /tm-defects/projects/{projectId}/defects/{defectId}/link | Link to run/step |

#### Quick Defect (from-step)
Auto-generates title and description from step context:
```json
{
  "step_result_id": "uuid",
  "additional_notes": "optional notes"
}
```

---

### tm-folders - Folder Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tm-folders/projects/{projectId}/folders | Get folder tree |
| POST | /tm-folders/projects/{projectId}/folders | Create folder |
| PATCH | /tm-folders/projects/{projectId}/folders/{folderId} | Rename folder |
| DELETE | /tm-folders/projects/{projectId}/folders/{folderId} | Delete folder |
| POST | /tm-folders/projects/{projectId}/folders/reorder | Move/reorder folder |

#### Query Parameters
- `format=tree` - Return nested tree structure (default)
- `format=flat` - Return flat list

---

### tm-sets - Test Sets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tm-sets/projects/{projectId}/sets | List test sets |
| POST | /tm-sets/projects/{projectId}/sets | Create set |
| GET | /tm-sets/projects/{projectId}/sets/{setId} | Get set with cases |
| PATCH | /tm-sets/projects/{projectId}/sets/{setId} | Update set |
| DELETE | /tm-sets/projects/{projectId}/sets/{setId} | Delete set |
| POST | /tm-sets/projects/{projectId}/sets/{setId}/cases | Add cases to set |
| DELETE | /tm-sets/projects/{projectId}/sets/{setId}/cases | Remove cases from set |

#### Smart Sets
When `is_smart=true`, cases are dynamically filtered by `smart_query`:
```json
{
  "folder_ids": ["uuid"],
  "status": ["approved"],
  "priority_ids": ["uuid"],
  "type_ids": ["uuid"],
  "search": "keyword"
}
```

---

### tm-templates - Case Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tm-templates/projects/{projectId}/templates | List templates |
| POST | /tm-templates/projects/{projectId}/templates | Create template |
| POST | /tm-templates/projects/{projectId}/templates/from-case/{caseId} | Create from case |
| GET | /tm-templates/projects/{projectId}/templates/{templateId} | Get template |
| PATCH | /tm-templates/projects/{projectId}/templates/{templateId} | Update template |
| DELETE | /tm-templates/projects/{projectId}/templates/{templateId} | Delete template |

#### Template Variables
Templates support `{{variable}}` placeholders:
```json
{
  "template_data": {
    "title": "Test {{feature}} login",
    "steps": [
      { "action": "Enter {{username}}", "expected_result": "Username accepted" }
    ],
    "variables": ["feature", "username"]
  }
}
```

---

### tm-my-work - User's Assigned Work

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tm-my-work/users/me/work | Get assigned work items |
| GET | /tm-my-work/users/me/work/stats | Get work statistics |

#### Response (stats)
```json
{
  "data": {
    "total": 25,
    "by_status": { "not_run": 10, "in_progress": 5, "passed": 8, "failed": 2, "blocked": 0 },
    "by_urgency": { "overdue": 2, "due_today": 3, "due_soon": 5, "on_track": 15 },
    "pending": 15
  }
}
```

---

### tm-reports - Reporting

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /tm-reports/projects/{projectId}/reports/traceability | Traceability report |
| GET | /tm-reports/projects/{projectId}/reports/execution | Execution report |
| GET | /tm-reports/projects/{projectId}/reports/burndown?cycleId={id} | Burndown chart |
| GET | /tm-reports/projects/{projectId}/reports/defect-impact | Defect impact report |

---

### tm-ai - AI Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /tm-ai/generate-cases | Generate test cases from requirement |
| POST | /tm-ai/suggest-steps | Suggest test steps |
| POST | /tm-ai/analyze-failure | Analyze test failure |
| POST | /tm-ai/find-duplicates | Find duplicate test cases |
| GET | /tm-ai/usage | Get AI usage stats |

#### Generate Cases Request
```json
{
  "requirement": "User should be able to login with email and password",
  "context": "Web application with OAuth support",
  "count": 5
}
```

#### Generate Cases Response
```json
{
  "testCases": [
    {
      "title": "Verify successful login with valid credentials",
      "objective": "Validate user can authenticate with correct email/password",
      "preconditions": "User account exists and is active",
      "priority": "high",
      "type": "functional",
      "steps": [
        { "action": "Navigate to login page", "expectedResult": "Login form displayed" },
        { "action": "Enter valid email", "expectedResult": "Email accepted" }
      ]
    }
  ]
}
```

---

### tm-admin - Admin Functions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST/PATCH/DELETE | /tm-admin/priorities | Manage priorities |
| GET/POST/PATCH/DELETE | /tm-admin/types | Manage case types |
| GET/POST/PATCH/DELETE | /tm-admin/environments | Manage environments |
| GET/POST/PATCH/DELETE | /tm-admin/labels | Manage labels |
| GET/POST/PATCH/DELETE | /tm-admin/users | Manage users (admin only) |
| GET/POST/PATCH | /tm-admin/roles | Manage roles |
| GET/POST/PATCH/DELETE | /tm-admin/projects | Manage projects |
| GET | /tm-admin/audit-log | View audit log |
| GET | /tm-admin/stats | System statistics |

---

## API Patterns & Response Formats

### Standard Success Response
```json
{
  "data": { ... } // or [...]
}
```

### Paginated Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### Error Response
```json
{
  "error": "Error message"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `204` - No Content (delete)
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

### CORS Headers
All responses include:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
```

---

## Notes for UI Implementation

### Key Relationships
```
Project
├── Folders (tree)
│   └── Test Cases
│       └── Test Steps
├── Test Sets
│   └── Set Cases → Test Cases
├── Test Cycles
│   └── Cycle Scope → Test Cases
│       └── Test Runs
│           └── Step Results → Test Steps
└── Defects
    └── Defect Links → Test Runs, Step Results
```

### Real-time Updates
Enable Supabase Realtime for:
- `tm_cycle_scope` - Live execution progress
- `tm_test_runs` - Run status updates
- `tm_notifications` - User notifications

### State Management Suggestions
- Use TanStack Query for API calls with proper cache invalidation
- Zustand stores for:
  - Current project context
  - Current cycle context
  - User preferences
  - UI state (selected items, filters)

### Execution Flow
1. Open cycle → Load scope with `include_steps=true`
2. Start run → POST /tm-runs (auto-creates step results)
3. Execute steps → PATCH /tm-runs/{id}/steps/{stepId}
4. Complete run → POST /tm-runs/{id}/complete
5. UI auto-refreshes via cache invalidation or realtime
