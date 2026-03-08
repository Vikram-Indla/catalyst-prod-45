# IncidentHub — Complete Business Rules, Technical Spec & Database Architecture

> Generated: 2026-03-08 | Source of truth for Committee, Conversion, Junction Tables

---

## Table of Contents

1. [Database Tables — Complete Schema](#1-database-tables--complete-schema)
2. [Status State Machine](#2-status-state-machine)
3. [Priority Calculation Engine](#3-priority-calculation-engine)
4. [Committee (CAP) Governance](#4-committee-cap-governance)
5. [Conversion Functionality](#5-conversion-functionality)
6. [SLA Engine](#6-sla-engine)
7. [Junction Tables — Answer](#7-junction-tables--answer)
8. [Edge Functions (Backend)](#8-edge-functions-backend)
9. [Frontend Wiring](#9-frontend-wiring)
10. [Data Flow Diagrams](#10-data-flow-diagrams)

---

## 1. Database Tables — Complete Schema

### 1.1 `incidents` (Core Table)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `incident_key` | text | YES | — | Auto-generated `INC-NNN` |
| `title` | text | NO | — | |
| `description` | text | YES | — | |
| `status` | enum(`incident_status`) | NO | — | `open\|triage\|to_committee\|in_progress\|resolved\|converted\|closed` |
| `severity` | enum(`severity_level`) | NO | — | `SEV1\|SEV2\|SEV3\|SEV4` |
| `support_level` | enum(`support_level`) | YES | — | `L1\|L2\|L3` |
| `priority` | enum(`priority_level`) | YES | — | `P1\|P2\|P3\|P4` (calculated) |
| `impact` | enum(`impact_level`) | YES | — | `high\|medium\|low` |
| `urgency` | enum(`urgency_level`) | YES | — | `high\|medium\|low` |
| `is_major_incident` | boolean | YES | — | Auto-flagged: SEV1 + high impact + high urgency |
| `delivery_stage` | enum | YES | — | |
| `reporter_id` | uuid FK → `incident_user_profiles` | YES | — | |
| `reporter_name` | text | YES | — | Denormalized fallback |
| `assignee_id` | uuid FK → `incident_user_profiles` | YES | — | |
| `assignee_workgroup_id` | uuid FK → `workgroups` | YES | — | |
| `project_id` | uuid FK → `projects` | YES | — | **Required before close/resolve** |
| `team_id` | uuid | YES | — | |
| `owning_team_id` | uuid | YES | — | |
| `release_version_id` | uuid FK → `release_versions` | YES | — | |
| `target_date` | date | YES | — | |
| `resolved_at` | timestamptz | YES | — | Set when status → resolved |
| `closed_at` | timestamptz | YES | — | Set when status → closed |
| `requires_committee` | boolean | YES | — | Flags committee gate |
| `committee_id` | uuid FK → `incident_committees` | YES | — | Links to active committee |
| `committee_set_at` | timestamptz | YES | — | |
| `committee_set_by` | uuid | YES | — | |
| `converted_to_type` | text | YES | — | `business_request\|epic\|feature\|story` |
| `converted_to_id` | uuid | YES | — | FK to created work item |
| `converted_to_key` | text | YES | — | e.g., `MDT-042` |
| `converted_at` | timestamptz | YES | — | |
| `converted_by` | uuid | YES | — | |
| `conversion_reason` | text | YES | — | |
| `resolution_summary` | text | YES | — | Required on resolve/close |
| `resolution_type` | text | YES | — | |
| `root_cause` | text | YES | — | |
| `business_process_id` | uuid | YES | — | ⚠️ FK target table missing |
| `service_component` | text | YES | — | |
| `incident_type` | text | YES | — | |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |
| `created_by` | uuid | YES | — | |
| `updated_by` | uuid | YES | — | |
| `deleted_at` | timestamptz | YES | — | Soft delete |

### 1.2 `incident_committees` (Committee/CAP Table)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `incident_id` | uuid | YES | — |
| `status` | enum(`committee_status`) | NO | `'pending'` — Values: `pending\|approved\|rejected` |
| `required_approvals` | integer | YES | `2` |
| `decision_note` | text | YES | — |
| `decided_at` | timestamptz | YES | — |
| `due_date` | timestamptz | YES | — |
| `created_by` | uuid | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

### 1.3 `committee_members` (Approvers)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `committee_id` | uuid FK → `incident_committees` | NO | — |
| `user_id` | uuid FK → `incident_user_profiles` | NO | — |
| `role` | text | YES | — |
| `has_veto` | boolean | YES | `false` |
| `created_at` | timestamptz | NO | `now()` |

### 1.4 `committee_votes` (Individual Votes)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `committee_id` | uuid FK → `incident_committees` | NO | — |
| `member_id` | uuid FK → `committee_members` | NO | — |
| `vote` | enum(`vote_status`) | NO | `'pending'` — Values: `pending\|approved\|rejected\|vetoed` |
| `comment` | text | YES | — |
| `voted_at` | timestamptz | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

**Unique constraint:** `(committee_id, member_id)` — one vote per member per committee.

### 1.5 `incident_conversion_rules` (Admin Config)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `allowed_statuses` | text[] | NO | — |
| `allowed_target_types` | text[] | NO | — |
| `auto_lock_after_conversion` | boolean | NO | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |
| `updated_by` | uuid | YES | — |

---

## 7. Junction Tables — Answer

### ✅ ALL junction tables exist as REAL Supabase tables. Nothing is stored as JSONB arrays on `incidents`.

| Table | Exists? | Type | Relationship |
|-------|---------|------|--------------|
| `incident_comments` | ✅ YES | Junction | `incident_id` FK → `incidents.id` |
| `incident_watchers` | ✅ YES | Junction | `incident_id` + `user_id` |
| `incident_attachments` | ✅ YES | Junction | `incident_id` FK → `incidents.id` |
| `incident_work_items` | ✅ YES | Junction | `incident_id` + `work_item_id` (linked items) |
| `incident_history` | ✅ YES | Audit trail | `incident_id` FK → `incidents.id` |
| `incident_labels` | ✅ YES | Junction | `incident_id` + `label_id` → `incident_label_defs` |
| `sla_records` | ✅ YES | 1:many | `incident_id` FK → `incidents.id` |

### Detailed Junction Table Schemas

#### `incident_comments`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | NO |
| `incident_id` | uuid FK | NO |
| `author_id` | uuid FK → `incident_user_profiles` | YES |
| `author_name` | text | YES |
| `content` | text | NO |
| `comment_type` | enum(`comment_type`) | YES — `comment\|update\|system\|workaround` |
| `is_pinned` | boolean | YES |
| `is_system` | boolean | YES |
| `created_at` | timestamptz | NO |
| `updated_at` | timestamptz | NO |
| `deleted_at` | timestamptz | YES |

#### `incident_watchers`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | NO |
| `incident_id` | uuid FK | NO |
| `user_id` | uuid FK | NO |
| `created_at` | timestamptz | NO |

#### `incident_work_items` (Linked Items)

| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | NO |
| `incident_id` | uuid FK | NO |
| `work_item_type` | text | NO — `epic\|feature\|story\|business_request` |
| `work_item_id` | uuid | NO |
| `work_item_key` | text | NO |
| `work_item_title` | text | YES |
| `linked_at` | timestamptz | NO |
| `linked_by` | uuid | YES |

#### `incident_attachments`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | NO |
| `incident_id` | uuid FK | NO |
| `file_name` | text | NO |
| `file_size` | integer | NO |
| `file_type` | text | NO |
| `storage_path` | text | NO |
| `uploaded_by` | uuid FK → `incident_user_profiles` | YES |
| `created_at` | timestamptz | NO |
| `deleted_at` | timestamptz | YES |

#### `incident_history` (Audit Trail)

| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | NO |
| `incident_id` | uuid FK | NO |
| `field_name` | text | NO |
| `old_value` | text | YES |
| `new_value` | text | YES |
| `changed_by` | uuid FK → `incident_user_profiles` | YES |
| `changed_at` | timestamptz | NO |

#### `incident_labels` + `incident_label_defs`

```
incident_labels: (incident_id uuid, label_id uuid, created_at timestamptz)
incident_label_defs: (id uuid, name text, color text, created_at timestamptz)
```

#### `sla_records`

| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | NO |
| `incident_id` | uuid FK | NO |
| `response_due_at` | timestamptz | NO |
| `response_met_at` | timestamptz | YES |
| `response_breached` | boolean | YES |
| `resolution_due_at` | timestamptz | NO |
| `resolution_met_at` | timestamptz | YES |
| `resolution_breached` | boolean | YES |
| `created_at` | timestamptz | NO |
| `updated_at` | timestamptz | NO |

#### `incident_teams` (Reference Data)

| Column | Type | Nullable |
|--------|------|----------|
| `id` | uuid | NO |
| `name` | text | NO |
| `description` | text | YES |
| `is_active` | boolean | NO |
| `sort_order` | integer | NO |
| `created_by` | uuid | YES |
| `updated_by` | uuid | YES |
| `created_at` | timestamptz | NO |
| `updated_at` | timestamptz | NO |

#### `incident_user_profiles` (Incident-scoped user directory)

Used across all joins: assignee, reporter, committee members, comment authors.

#### `incident_field_options` (Dropdown config)

Admin-managed field options for dynamic dropdowns.

---

## 2. Status State Machine

```
                    ┌──────────────────────┐
                    │        OPEN          │
                    └──────┬───────────────┘
                           │
              ┌────────────▼────────────┐
              │        TRIAGE           │
              └──┬────────┬─────────────┘
                 │        │
    ┌────────────▼─┐  ┌───▼──────────────┐
    │ IN_PROGRESS  │  │  TO_COMMITTEE    │ ← Only L3
    └──┬───────────┘  │  (blocked until  │
       │              │   approved/vetoed)│
       │              └───┬──────────────┘
       │                  │ (after approval)
       ▼                  ▼
    ┌──────────────────────┐
    │      RESOLVED        │
    └──────┬───────────────┘
           │
    ┌──────▼───────────────┐
    │       CLOSED         │ ← Terminal
    └──────────────────────┘
    
    ┌──────────────────────┐
    │     CONVERTED        │ ← Terminal (via Edge Function)
    └──────────────────────┘
```

### Business Rules

| From | To | Condition |
|------|----|-----------|
| `open` | `triage` | Assignee should be set |
| `open` | `resolved` | Minor issues, direct resolution |
| `triage` | `in_progress` | Investigation started |
| `triage` | `resolved` | Quick fix applied |
| `triage` | `to_committee` | **L3 only** — committee approval required |
| `to_committee` | `in_progress` | **After committee approved** |
| `to_committee` | `triage` | Return for more investigation |
| `in_progress` | `resolved` | Fix verified |
| `resolved` | `closed` | Verified by reporter/QA |
| `resolved` | `in_progress` | Issue recurred (reopen) |
| `closed` | — | **Terminal** — no transitions |
| `converted` | — | **Terminal** — no transitions |

### Resolution Gate

Before transitioning to `resolved` or `closed`:
1. **Project must be assigned** (`project_id` required) — enforced in `handleStatusChange()`
2. **Resolution modal** opens requiring: `resolution_summary`, `resolution_type`, optional `root_cause`
3. Timestamps auto-set: `resolved_at` or `closed_at`

**Source:** `src/utils/incidentLifecycle.ts` → `STATUS_TRANSITIONS`, `getAllowedTransitions()`

---

## 3. Priority Calculation Engine

```
Priority = SeverityScore + ImpactScore + UrgencyScore
```

| Severity | Score | | Impact | Score | | Urgency | Score |
|----------|-------|-|--------|-------|-|---------|-------|
| SEV1 | 4 | | High | 3 | | High | 3 |
| SEV2 | 3 | | Medium | 2 | | Medium | 2 |
| SEV3 | 2 | | Low | 1 | | Low | 1 |
| SEV4 | 1 | | | | | | |

| Total Score | Priority |
|-------------|----------|
| ≥ 9 | **P1** |
| ≥ 7 | **P2** |
| ≥ 5 | **P3** |
| < 5 | **P4** |

### Major Incident Auto-Flag

```
IF severity = SEV1 AND impact = High AND urgency = High
THEN is_major_incident = TRUE
```

**Source:** `src/utils/incidentLifecycle.ts` → `calculatePriority()`, `shouldBeMajorIncident()`

---

## 4. Committee (CAP) Governance

### 4.1 When Is a Committee Required?

```
IF support_level = 'L3' → Committee required before conversion
IF support_level = 'L1' or 'L2' → No committee needed
```

### 4.2 Committee Lifecycle

```
1. CREATE COMMITTEE
   └─ incident_committees.insert({ incident_id, status: 'pending', required_approvals: 2 })
   └─ incidents.update({ committee_id: newCommittee.id })
   └─ incident_history.insert({ field: 'committee', new_value: 'Committee created' })

2. ADD APPROVERS
   └─ committee_members.insert({ committee_id, user_id, has_veto, role })
   └─ committee_votes.insert({ committee_id, member_id, vote: 'pending' })

3. SUBMIT VOTES (via Edge Function: submit-vote)
   └─ committee_votes.upsert({ vote: 'approved'|'rejected'|'vetoed' })
   └─ Check majority → Update committee status

4. COMMITTEE DECISION
   └─ If approved: committee.status = 'approved' → Conversion unlocked
   └─ If rejected: committee.status = 'rejected' → incident.status = 'in_progress'
   └─ If vetoed: committee.status = 'rejected' (immediately) → incident.status = 'in_progress'
```

### 4.3 Voting Rules (Edge Function: `submit-vote`)

| Rule | Logic |
|------|-------|
| **Who can vote** | Only `committee_members` for this committee. Incident owners (created_by, assignee_id) are auto-added if not already members. |
| **Vote options** | `approved` or `rejected` |
| **Veto power** | A member with `has_veto = true` OR `incident_user_profiles.has_veto_power = true` can cast a **veto** |
| **Veto effect** | **Immediate rejection** — committee status → `rejected`, incident → `in_progress`, system comment posted |
| **Approval threshold** | `approvedCount >= committee.required_approvals` (default: 2) |
| **Rejection threshold** | `rejectedCount > totalMembers - required_approvals` (majority against) |
| **Re-voting** | Allowed — uses `upsert` on `(committee_id, member_id)` unique constraint |
| **Closed committee** | Cannot vote if `committee.status !== 'pending'` → returns 400 |

### 4.4 Conversion Gate Logic

```typescript
// src/utils/incidentLifecycle.ts → canConvertIncident()

function canConvertIncident(status, supportLevel, committeeStatus):
  if status === 'converted' → BLOCKED: "Already converted"
  if supportLevel === 'L3':
    if no committee       → BLOCKED: "Must be sent to committee first"
    if committeeStatus === 'pending'  → BLOCKED: "Awaiting committee approval"
    if committeeStatus === 'rejected' → BLOCKED: "Committee rejected"
  return ALLOWED
```

### 4.5 Frontend Wiring

| Component | Role |
|-----------|------|
| `IncidentRoomDetail.tsx` | Orchestrates all committee/convert flows |
| `CommitteeModal.tsx` | UI for managing approvers and viewing votes |
| `handleCreateCommittee()` | Creates committee + links to incident |
| `handleAddApprover()` | Adds member + initializes pending vote |
| `handleVote()` | Calls `submit-vote` Edge Function |
| `handleConvert()` | Calls `convert-incident` Edge Function |
| `handleInitiateCommittee()` | Sends to committee queue (status → `to_committee`) |

---

## 5. Conversion Functionality

### 5.1 Business Rules

1. **Allowed target types:** `business_request`, `epic`, `feature`, `story`
2. **Pre-conditions:**
   - Incident is NOT already `converted`
   - If `requires_committee` is true → committee must be `approved`
3. **Post-conversion:**
   - Incident status → `converted` (terminal)
   - `converted_to_type`, `converted_to_id`, `converted_at`, `conversion_reason` all set
   - System comment auto-posted
   - History entry logged

### 5.2 Edge Function: `convert-incident`

**Location:** `supabase/functions/convert-incident/index.ts`

```
Input:  { incident_id, convert_to, reason }
Auth:   Bearer token required
Method: POST

Flow:
1. Validate input (incident exists, not converted, valid type)
2. Check committee gate (if requires_committee → committee.status must be 'approved')
3. Create target work item:
   - business_request → INSERT INTO business_requests
   - epic → INSERT INTO epics  
   - feature → INSERT INTO features
   - story → INSERT INTO stories
   Title format: "[From INC-NNN] Original Title"
4. Update incident:
   - status = 'converted'
   - converted_to_type, converted_to_id, converted_at, conversion_reason
5. Insert incident_history entry
6. Insert system comment

Output: { success, converted_to_type, converted_to_id, message }
```

### 5.3 Frontend Flow

```
User clicks "Convert" button (disabled unless canConvert === true)
  └─ Opens convertDialog
  └─ User selects type (epic/feature/story) + enters reason
  └─ handleConvert() → supabase.functions.invoke('convert-incident', { body })
  └─ On success: toast + invalidate queries
  └─ On error: toast error message
```

### 5.4 `incident_conversion_rules` (Admin Config)

Stores org-level rules for which statuses and target types are allowed for conversion. Currently exists as a config table but is **not yet enforced** in the edge function (the edge function uses hardcoded validation).

---

## 6. SLA Engine

### SLA Targets (Reference)

| Severity | Response Time | Resolution Time |
|----------|---------------|-----------------|
| SEV1 | 15 minutes | 1 hour |
| SEV2 | 30 minutes | 4 hours |
| SEV3 | 1 hour | 8 hours |
| SEV4 | 2 hours | 24 hours |

### `sla_records` Table

Created per-incident. Tracks:
- `response_due_at` / `response_met_at` / `response_breached`
- `resolution_due_at` / `resolution_met_at` / `resolution_breached`

**Frontend:** `SlaStatusCard` component displays breach status with countdowns.

---

## 8. Edge Functions (Backend)

| Function | Path | Purpose |
|----------|------|---------|
| `convert-incident` | `supabase/functions/convert-incident/index.ts` | Converts incident to work item (with committee gate check) |
| `submit-vote` | `supabase/functions/submit-vote/index.ts` | Records committee vote, auto-resolves committee status |

Both functions:
- Use `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS)
- Validate JWT from `Authorization` header
- Return structured JSON responses with error codes

---

## 9. Frontend Wiring

### 9.1 Hook Map

| Hook | Source File | Purpose |
|------|------------|---------|
| `useIncidents()` | `src/hooks/useIncidents.ts` | List all incidents with joins |
| `useIncident(id)` | `src/hooks/useIncidents.ts` | Single incident with full nested data |
| `useCreateIncident()` | `src/hooks/useIncidents.ts` | Create mutation |
| `useUpdateIncident()` | `src/hooks/useIncidents.ts` | Update mutation |
| `useAddComment()` | `src/hooks/useIncidents.ts` | Comment mutation |
| `useIncidentCommittee(id)` | `src/hooks/useIncidentCommittee.ts` | Fetch committee + members + votes |
| `useIncidentWorkItems(id)` | `src/hooks/useIncidentWorkItems.ts` | Linked work items |
| `useUnlinkWorkItem()` | `src/hooks/useIncidentWorkItems.ts` | Remove link mutation |
| `useIsWatching(id)` | `src/hooks/useIncidentWatchers.ts` | Current user watch status |
| `useWatcherCount(id)` | `src/hooks/useIncidentWatchers.ts` | Total watcher count |
| `useToggleWatch(id)` | `src/hooks/useIncidentWatchers.ts` | Watch/unwatch mutation |
| `useUploadIncidentAttachment()` | `src/hooks/useIncidentAttachments.ts` | File upload |
| `useDeleteIncidentAttachment()` | `src/hooks/useIncidentAttachments.ts` | File delete |
| `useDownloadIncidentAttachment()` | `src/hooks/useIncidentAttachments.ts` | File download |
| `useAvailableApprovers()` | `src/hooks/useIncidentUserProfiles.ts` | All incident user profiles |
| `useIncidentTeams()` | `src/hooks/useIncidentTeams.ts` | Team reference data |
| `useReleaseVersions()` | `src/hooks/useIncidents.ts` | Release versions for linking |

### 9.2 `useIncident()` — Join Query

```sql
SELECT *,
  release_version:release_versions(*),
  assignee:incident_user_profiles!incidents_assignee_id_fkey(*, workgroup:workgroups(*)),
  reporter:incident_user_profiles!incidents_reporter_id_fkey(*),
  assignee_workgroup:workgroups(*),
  project:projects!incidents_project_id_fkey(id, name, key),
  committee:incident_committees!incidents_committee_id_fkey(
    *, members:committee_members(
      *, user:incident_user_profiles(*), vote:committee_votes(*)
    )
  ),
  sla:sla_records(*)
FROM incidents WHERE id = :id AND deleted_at IS NULL
```

Then fetches separately:
- `incident_labels` → `incident_label_defs`
- `incident_comments` → `incident_user_profiles` (author)
- `incident_attachments` → `incident_user_profiles` (uploader)
- `incident_history` → `incident_user_profiles` (changer)

### 9.3 Component Tree

```
IncidentRoomDetail (page)
├── IncidentStickyHeader
│   ├── Status dropdown (getAllowedTransitions)
│   ├── Severity/Priority badges
│   ├── Watch toggle
│   └── Convert button (gated by canConvertIncident)
├── IncidentWorkArea (left column)
│   ├── Description editor
│   ├── Attachments section
│   ├── Comments feed (comment_type: comment|update|system|workaround)
│   ├── Committee panel (vote buttons, approver list)
│   ├── Resolution card (shown when resolved/closed)
│   └── Activity/History feed
├── IncidentContextRail (right column)
│   ├── Status, Severity, Priority, Impact, Urgency
│   ├── Support Level
│   ├── Assignee + Workgroup
│   ├── Reporter
│   ├── Project selector
│   ├── Team selector
│   ├── Delivery Stage
│   ├── Release Version
│   ├── Business Process (currently shows "Not specified" — table missing)
│   ├── SLA Status Card
│   └── Labels
├── LinkWorkItemModal
├── ResolutionModal
├── CommitteeModal
└── ConvertDialog (inline)
```

---

## 10. Data Flow Diagrams

### 10.1 Committee → Conversion Flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ User clicks  │────▶│ handleCreate     │────▶│ incident_       │
│ "Create      │     │ Committee()      │     │ committees      │
│  Committee"  │     │                  │     │ INSERT           │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                       │
┌─────────────┐     ┌──────────────────┐              │
│ User adds   │────▶│ handleAdd        │◀─────────────┘
│ approvers   │     │ Approver()       │
└─────────────┘     │ → committee_     │
                    │   members INSERT │
                    │ → committee_     │
                    │   votes INSERT   │
                    └──────────────────┘

┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Approver     │────▶│ Edge Function:   │────▶│ committee_votes  │
│ clicks       │     │ submit-vote      │     │ UPSERT           │
│ Approve/     │     │                  │     │                  │
│ Reject       │     │ Checks majority  │     │ If veto:         │
└─────────────┘     │ / veto logic     │     │ → committee =    │
                    └──────────────────┘     │   rejected       │
                                             │ If majority:     │
                                             │ → committee =    │
                                             │   approved       │
                                             └────────┬────────┘
                                                       │
┌─────────────┐     ┌──────────────────┐              │
│ User clicks  │────▶│ Edge Function:   │◀─────────────┘
│ "Convert"    │     │ convert-incident │  (gate: committee.status === 'approved')
│ (enabled     │     │                  │
│  after       │     │ Creates work     │
│  approval)   │     │ item, updates    │
└─────────────┘     │ incident status  │
                    └──────────────────┘
```

### 10.2 Resolution Flow

```
User clicks "Resolve" or "Close"
  │
  ├─ Validation: project_id must be set
  │   └─ If missing → toast.error("Assign a project first")
  │
  ├─ Opens ResolutionModal
  │   └─ Fields: resolution_summary (required), resolution_type, root_cause
  │
  └─ handleResolutionSubmit()
      ├─ incidents.update({ status, resolution_summary, resolution_type, root_cause, resolved_at/closed_at })
      ├─ incident_history.insert({ field: 'resolution', ... })
      └─ toast.success + invalidate queries
```

---

## RLS Policies

```sql
-- Incidents
CREATE POLICY "Users can view all incidents" ON incidents FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "Users can create incidents" ON incidents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update incidents" ON incidents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
```

All authenticated users can read/write incidents. The edge functions use `SERVICE_ROLE_KEY` to bypass RLS entirely.

---

## Known Issues / Gaps

| Issue | Details |
|-------|---------|
| `business_processes` table missing | FK `business_process_id` exists on `incidents` but the referenced table doesn't exist. `useIncident` join was removed to prevent query failure. UI shows "Not specified". |
| `incident_conversion_rules` unused | Table exists with `allowed_statuses` and `allowed_target_types` but the `convert-incident` edge function uses hardcoded validation instead. |
| No `on_hold` status in DB enum | State machine references `on_hold` concept but the actual DB enum doesn't include it. `in_progress` → `resolved` is used instead. |
