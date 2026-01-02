# In-Jira Module — QA Acceptance Checks

**Module**: Project Execution ("In-Jira")  
**Version**: 1.0  
**Last Updated**: January 2026  
**Parent System**: Catalyst Enterprise Platform  

---

## Purpose

This document defines the **Quality Assurance (QA) acceptance checks** for the In-Jira module. These checks ensure Jira Cloud parity while maintaining Catalyst integration standards.

---

## Test Categories

1. [Shell Integration](#1-shell-integration)
2. [Hierarchy Enforcement](#2-hierarchy-enforcement)
3. [Scrum Board](#3-scrum-board)
4. [Kanban Board](#4-kanban-board)
5. [Jira Import](#5-jira-import)
6. [Work Item CRUD](#6-work-item-crud)
7. [Permissions & Security](#7-permissions--security)
8. [Audit & Logging](#8-audit--logging)
9. [UX DNA Compliance](#9-ux-dna-compliance)
10. [Performance](#10-performance)
11. [Accessibility](#11-accessibility)
12. [Dark Mode](#12-dark-mode)

---

## 1. Shell Integration

### 1.1 Global Navigation

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| SHELL-001 | Navigate to In-Jira from sidebar | Route loads within Catalyst shell | P0 |
| SHELL-002 | Breadcrumb displays correct path | Shows: Home > Program > Project > Board | P0 |
| SHELL-003 | Top nav actions work | Search, notifications, user menu functional | P0 |
| SHELL-004 | Theme toggle affects In-Jira | Light/dark mode applies correctly | P1 |
| SHELL-005 | User context persists | Logged-in user shown across all views | P0 |

### 1.2 Routing

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| ROUTE-001 | Direct URL access to project board | Loads correct project context | P0 |
| ROUTE-002 | Back/forward browser navigation | State preserved correctly | P1 |
| ROUTE-003 | Deep link to specific issue | Issue detail opens in drawer | P0 |
| ROUTE-004 | 404 for invalid project ID | Shows error state, not crash | P1 |
| ROUTE-005 | Permission denied redirect | Shows access denied message | P0 |

---

## 2. Hierarchy Enforcement

### 2.1 Structure Validation

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| HIER-001 | Create Epic at Program level | Epic created with program_id | P0 |
| HIER-002 | Attempt Epic at Project level | Blocked with error message | P0 |
| HIER-003 | Create Feature under Project | Feature created with project_id | P0 |
| HIER-004 | Create Story under Feature | Story created with feature_id | P0 |
| HIER-005 | Create Sub-task under Story | Sub-task created with story_id | P0 |
| HIER-006 | Create Defect at Project level | Defect created independently | P0 |
| HIER-007 | Create Incident at Project level | Incident created independently | P0 |
| HIER-008 | Attempt Business Request import | Import skipped with log | P0 |

### 2.2 Parent-Child Relationships

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| HIER-010 | Move Story to different Feature | Parent reference updated | P1 |
| HIER-011 | Delete Feature with Stories | Cascade handled per policy | P0 |
| HIER-012 | Orphan detection | Stories without Features flagged | P2 |
| HIER-013 | Circular reference prevention | Block Story → Story reference | P1 |

---

## 3. Scrum Board

### 3.1 Sprint Management

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| SCRUM-001 | Create new sprint | Sprint appears in sprint list | P0 |
| SCRUM-002 | Start sprint | Sprint becomes active, dates set | P0 |
| SCRUM-003 | Complete sprint | Incomplete items shown for disposition | P0 |
| SCRUM-004 | Move item backlog → sprint | Item appears in sprint backlog | P0 |
| SCRUM-005 | Move item sprint → backlog | Item returns to product backlog | P0 |
| SCRUM-006 | View sprint goal | Goal displayed in sprint header | P1 |
| SCRUM-007 | Edit sprint dates | Dates update, validation applied | P1 |

### 3.2 Sprint Board

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| SCRUM-010 | View sprint board columns | To Do, In Progress, Done visible | P0 |
| SCRUM-011 | Drag card between columns | Status updates, optimistic UI | P0 |
| SCRUM-012 | View story points in column | Sum displayed in column header | P0 |
| SCRUM-013 | Filter by assignee | Cards filtered correctly | P1 |
| SCRUM-014 | Quick filter by label | Cards filtered by label | P1 |
| SCRUM-015 | Expand story to sub-tasks | Sub-tasks visible inline | P1 |

### 3.3 Velocity & Burndown

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| SCRUM-020 | View burndown chart | Chart shows ideal vs actual | P1 |
| SCRUM-021 | Velocity widget | Shows last 5 sprints trend | P1 |
| SCRUM-022 | Sprint report generation | PDF export with summary | P2 |

---

## 4. Kanban Board

### 4.1 Board Configuration

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| KAN-001 | Default Kanban columns | Backlog, Selected, In Progress, Done | P0 |
| KAN-002 | Custom column creation | New column appears at position | P1 |
| KAN-003 | Column reordering | Columns reorder via drag | P1 |
| KAN-004 | Set WIP limit | Limit enforced visually | P0 |
| KAN-005 | WIP limit exceeded | Column highlighted, warning shown | P0 |

### 4.2 Card Operations

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| KAN-010 | Create card from column | Card created in that column | P0 |
| KAN-011 | Drag card between columns | Status updates immediately | P0 |
| KAN-012 | Card age indicator | Days in column displayed | P1 |
| KAN-013 | Card detail expand | Detail drawer opens | P0 |
| KAN-014 | Assignee avatar on card | Avatar displayed on card | P0 |
| KAN-015 | Priority indicator | Priority badge visible | P0 |

### 4.3 Swimlanes

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| KAN-020 | Swimlane by assignee | Cards grouped by assignee | P1 |
| KAN-021 | Swimlane by priority | Cards grouped by priority | P1 |
| KAN-022 | Swimlane by epic | Cards grouped by parent epic | P1 |
| KAN-023 | Collapse swimlane | Swimlane collapses, count shown | P2 |

### 4.4 Metrics

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| KAN-030 | Cumulative flow diagram | Historical data accurate | P2 |
| KAN-031 | Average cycle time | Calculation correct | P2 |
| KAN-032 | Throughput widget | Items completed per period | P2 |

---

## 5. Jira Import

### 5.1 Import Process

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| IMP-001 | Connect Jira Cloud instance | OAuth connection established | P0 |
| IMP-002 | Select project for import | Project list displayed | P0 |
| IMP-003 | Preview import mapping | Field mapping shown | P0 |
| IMP-004 | Execute import | Progress indicator, completion summary | P0 |
| IMP-005 | Import same data twice | Idempotent, no duplicates | P0 |
| IMP-006 | Import with missing fields | Defaults applied, warnings shown | P1 |
| IMP-007 | Import cancellation | Partial import rolled back | P1 |

### 5.2 Data Mapping

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| IMP-010 | Jira Epic → Program Epic | Epic linked to program level | P0 |
| IMP-011 | Jira Story → Project Story | Story under correct feature | P0 |
| IMP-012 | Jira Sub-task → Sub-task | Sub-task under story | P0 |
| IMP-013 | Jira Bug → Defect | Defect created at project level | P0 |
| IMP-014 | Jira custom fields → Catalyst fields | Custom field mapping applied | P1 |
| IMP-015 | Jira attachments → Storage | Files uploaded to Supabase Storage | P1 |
| IMP-016 | Jira comments → Comments | Comments preserved with author | P1 |
| IMP-017 | Jira Business Request ignored | BR type not imported | P0 |

### 5.3 Import Validation

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| IMP-020 | Invalid Jira credentials | Clear error message | P0 |
| IMP-021 | Jira rate limit hit | Retry with backoff, user informed | P1 |
| IMP-022 | Malformed issue data | Item skipped, logged | P1 |
| IMP-023 | Import audit log | All imports logged with source | P0 |

---

## 6. Work Item CRUD

### 6.1 Create Operations

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| CRUD-001 | Create Story from board | Modal opens, story created | P0 |
| CRUD-002 | Create Story with required fields | Validation enforced | P0 |
| CRUD-003 | Create Sub-task from story | Sub-task linked to parent | P0 |
| CRUD-004 | Quick create (keyboard shortcut) | `C` opens create modal | P1 |
| CRUD-005 | Create from template | Template fields pre-filled | P2 |

### 6.2 Read Operations

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| CRUD-010 | View issue detail drawer | All fields displayed | P0 |
| CRUD-011 | View activity feed | Comments, changes shown | P0 |
| CRUD-012 | View linked issues | Related items listed | P1 |
| CRUD-013 | View attachments | Files downloadable | P1 |
| CRUD-014 | View time tracking | Estimate vs logged time | P2 |

### 6.3 Update Operations

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| CRUD-020 | Inline title edit | Title updates on blur | P0 |
| CRUD-021 | Status transition | Status changes, audit logged | P0 |
| CRUD-022 | Assignee change | Notification sent to assignee | P0 |
| CRUD-023 | Priority change | Priority updates immediately | P0 |
| CRUD-024 | Description edit (rich text) | Formatting preserved | P1 |
| CRUD-025 | Bulk edit multiple items | All selected items updated | P1 |
| CRUD-026 | Optimistic update | UI updates before server confirm | P0 |

### 6.4 Delete Operations

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| CRUD-030 | Delete issue | Confirmation modal, soft delete | P0 |
| CRUD-031 | Delete with sub-tasks | Cascade handled per policy | P0 |
| CRUD-032 | Restore deleted issue | Item restored from trash | P2 |
| CRUD-033 | Permanent delete (admin) | Item removed, audit logged | P2 |

---

## 7. Permissions & Security

### 7.1 Role-Based Access

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| PERM-001 | Viewer cannot edit | Edit buttons disabled/hidden | P0 |
| PERM-002 | Member can create/edit | CRUD operations work | P0 |
| PERM-003 | Admin can delete | Delete permission granted | P0 |
| PERM-004 | Cross-project access denied | 403 on unauthorized project | P0 |
| PERM-005 | Team membership check | Only team members see board | P0 |

### 7.2 Data Security

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| SEC-001 | RLS on all tables | Supabase linter passes | P0 |
| SEC-002 | API authentication required | Unauthenticated requests fail | P0 |
| SEC-003 | CSRF protection | Tokens validated | P0 |
| SEC-004 | XSS prevention | User input sanitized | P0 |
| SEC-005 | SQL injection prevention | Parameterized queries only | P0 |

---

## 8. Audit & Logging

### 8.1 Mutation Logging

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| AUD-001 | Create logs actor and timestamp | Audit record created | P0 |
| AUD-002 | Update logs before/after state | Diff captured | P0 |
| AUD-003 | Delete logs reason | Deletion reason recorded | P0 |
| AUD-004 | Import logs source system | Jira source tracked | P0 |
| AUD-005 | Bulk operation logs all items | Each item has audit entry | P0 |

### 8.2 Changelog

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| AUD-010 | View issue history | All changes shown chronologically | P0 |
| AUD-011 | Filter history by field | Specific field changes shown | P2 |
| AUD-012 | Actor name displayed | User name, not just ID | P1 |

---

## 9. UX DNA Compliance

### 9.1 Linear (Speed)

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| UX-001 | Keyboard shortcuts work | Common actions have shortcuts | P1 |
| UX-002 | No unnecessary modals | Inline editing preferred | P1 |
| UX-003 | Instant feedback on action | Optimistic UI updates | P0 |
| UX-004 | Command palette | `Cmd+K` opens command menu | P2 |

### 9.2 Notion (Density)

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| UX-010 | Progressive disclosure | Details expand on demand | P1 |
| UX-011 | No visual clutter | Clean, focused interface | P1 |
| UX-012 | Collapsible sections | Sections collapse to save space | P1 |

### 9.3 Bloomberg (Data Density)

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| UX-020 | Maximum info visible | Key fields shown without scroll | P1 |
| UX-021 | Zero ambiguity | Status, priority clear at glance | P0 |
| UX-022 | Dense table views | Compact mode available | P2 |

---

## 10. Performance

### 10.1 Load Time

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| PERF-001 | Board load (50 items) | < 200ms | P0 |
| PERF-002 | Board load (500 items) | < 500ms with virtualization | P0 |
| PERF-003 | Issue detail load | < 100ms | P0 |
| PERF-004 | Search results | < 300ms | P1 |

### 10.2 Operations

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| PERF-010 | Drag-drop card | < 50ms visual feedback | P0 |
| PERF-011 | Status update | < 200ms round-trip | P0 |
| PERF-012 | Bulk update (100 items) | < 5s | P1 |
| PERF-013 | Import (1000 items) | < 30s | P1 |

---

## 11. Accessibility

### 11.1 WCAG 2.1 AA

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| A11Y-001 | Keyboard navigation | All elements focusable | P0 |
| A11Y-002 | Screen reader compatible | ARIA labels on all interactive | P0 |
| A11Y-003 | Color contrast | 4.5:1 ratio minimum | P0 |
| A11Y-004 | Focus visible | Clear focus indicators | P0 |
| A11Y-005 | Form labels | All inputs have labels | P0 |
| A11Y-006 | Error identification | Errors announced to SR | P0 |

### 11.2 Motion

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| A11Y-010 | Reduced motion respected | Animations disabled when preferred | P1 |
| A11Y-011 | No flashing content | No content flashes > 3/sec | P0 |

---

## 12. Dark Mode

### 12.1 Theme Consistency

| Test ID | Test Case | Expected Result | Priority |
|---------|-----------|-----------------|----------|
| DARK-001 | All surfaces use theme tokens | No hardcoded colors | P0 |
| DARK-002 | Text contrast in dark mode | Readable on dark background | P0 |
| DARK-003 | Status colors visible | Status badges clear in both modes | P0 |
| DARK-004 | Charts/graphs themed | Data viz follows theme | P1 |
| DARK-005 | Images/icons adapt | Dark mode variants used | P1 |

---

## Test Execution Tracking

### Test Run Template

```markdown
## Test Run: [Date]
**Tester**: [Name]
**Environment**: [Dev/Staging/Prod]
**Build**: [Version/Commit]

### Summary
- Total Tests: [X]
- Passed: [X]
- Failed: [X]
- Blocked: [X]
- Not Run: [X]

### Failed Tests
| Test ID | Failure Description | Bug ID |
|---------|---------------------|--------|
| XXX-XXX | Description | BUG-XXX |

### Notes
[Any observations or blockers]
```

---

## Sign-Off Checklist

Before release, all must be ✅:

- [ ] All P0 tests pass
- [ ] 95%+ of P1 tests pass
- [ ] No critical/blocker bugs open
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Security review completed
- [ ] Audit logging verified
- [ ] UX review approved

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | Catalyst Team | Initial QA acceptance checks |
