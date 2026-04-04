# TestHub - Product Requirements Document

## Overview
TestHub is the test management module of the Catalyst Enterprise Portfolio Management platform. It provides comprehensive test case management, test cycle execution, defect tracking, and reporting capabilities.

## Core Features

### 1. Dashboard (/testhub/dashboard)
- Display KPI stat cards: total test cases, pass rate, active cycles, defect count
- Show active cycles list with progress bars
- Recent activity feed showing latest actions
- Top failing tests widget
- Pass rate trend chart
- Status distribution chart

### 2. Test Case Repository (/testhub/repository)
- Folder tree navigation on the left panel
- Test cases table with columns: Case Key, Title, Status, Priority, Type, Assignee
- Create test case modal with fields: title, description, objective, preconditions, priority, type, folder
- Test steps editor: action, expected result, test data per step
- View/edit test case modal
- Clone test case functionality
- Delete test case with confirmation
- Search by title or case key
- Filter by status (Draft, Ready, Approved, Deprecated), priority, type, assignee
- Toggle between table and grid views
- Context menu on right-click: Edit, Clone, Move to Folder, Delete

### 3. Test Cycles (/testhub/cycles)
- List test cycles as cards with status and progress
- Create cycle modal: name, description, start date, end date
- Cycle detail page showing assigned test cases
- Add/remove test cases from cycle scope
- Cycle status: Planned, In Progress, Completed, Archived
- Clone and delete cycle actions

### 4. Test Execution (/testhub/cycles/:cycleId/execute)
- 3-pane layout: Test List | Step Runner | Sidebar
- Left panel: list of test cases assigned to cycle
- Center panel: step-by-step execution with action and expected result
- Right sidebar: attachments, defects, history
- Step status: Pass, Fail, Blocked, Skip
- Keyboard shortcuts: P (Pass), F (Fail), B (Blocked), S (Skip), 1-9 (jump to step)
- Failure reason modal when marking as Failed
- Link defect during execution
- Pass All Remaining button
- Session timer
- Execution history modal

### 5. Defect Management (/testhub/defects)
- List defects with status and severity
- Create defect: title, description, severity (Critical, Major, Minor, Trivial)
- Defect status: Open, In Progress, Fixed, Verified, Closed, Won't Fix, Duplicate
- Link defects to test cases and execution steps
- Defect detail page

### 6. Reports (/testhub/reports)
- User Activity report: select users, date range, generate activity report
- Cycle Report: select cycle, view pass/fail/blocked statistics
- Export report data

### 7. Shared Steps (/testhub/shared-steps)
- Create reusable test steps
- Reference shared steps in multiple test cases

### 8. Test Plans (/testhub/test-plans)
- Create test plans grouping multiple cycles
- Plan detail with cycle assignments

### 9. Environments (/testhub/environments)
- Define test environments (browsers, OS, devices)
- Link environments to test cycles

### 10. Tags (/testhub/tags)
- Create and manage tags for test case categorization
- Tag-based filtering

## Technical Details
- Database: Supabase PostgreSQL with tm_test_cases, tm_test_cycles, tm_test_runs, tm_step_results tables
- Auth: Supabase Auth with row-level security
- State: TanStack React Query for server state, Zustand for UI state
- UI: React + TypeScript + Tailwind CSS + shadcn/ui
- Local dev server: Vite on port 5173
