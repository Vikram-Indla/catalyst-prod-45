# Epic Features - User Guide

## Table of Contents
1. [Overview](#overview)
2. [Accessing Epics](#accessing-epics)
3. [View Modes](#view-modes)
4. [Epic Detail Panel](#epic-detail-panel)
5. [Bulk Operations](#bulk-operations)
6. [Context Menu Actions](#context-menu-actions)
7. [Reporting](#reporting)
8. [Special Features](#special-features)

---

## Overview

Epics are large initiatives in Catalyst that represent significant pieces of work. They break down into Features, which further decompose into Stories and Subtasks. This guide covers all Epic management capabilities in Catalyst.

**Key Capabilities:**
- Multiple view modes (List, Kanban)
- Comprehensive detail tracking (9 tabs)
- Bulk operations and reporting
- Process flow tracking
- Financial and value metrics

---

## Accessing Epics

### Navigation
**Main Route:** `/items/epics`

**Access Points:**
- Global navigation → Items → Epics
- Portfolio Room → Backlog → Epics section
- Enterprise menu → More → Epics

### Initial View
- List view by default
- Search bar at top
- View mode toggle (List/Kanban)
- Add Epic button (top right)
- More Actions dropdown

---

## View Modes

### List View

**Features:**
- Sortable columns
- Multi-select checkboxes
- Drag-and-drop row reordering
- Click row to open detail panel
- Search and filter

**Columns Displayed:**
- Name
- Theme
- Program
- State
- Health
- Owner
- Dates

**How to Use:**
1. Default view on page load
2. Click column headers to sort
3. Check boxes to select multiple epics
4. Click row to view details
5. Drag rows to reorder (updates rank)

### Kanban View

**Three Sub-Views:**

#### 1. State View
- **Columns:** Funnel, Analyzing, Portfolio Backlog, Implementing, Validating, Done
- **Use Case:** Track epic lifecycle stage
- **How to Use:** Drag cards between columns to change state

#### 2. Process Flow View
- **Columns:** Based on your process steps
- **Use Case:** Track epic through custom workflow
- **Features:** Time-in-step tracking, historical data
- **How to Use:** Drag cards to progress through process

#### 3. Custom Columns View
- **Columns:** Configurable (default: New, In Progress, Review, Completed)
- **Use Case:** Custom workflow tracking
- **How to Use:** 
  - Drag cards between columns
  - Click "Configure Columns" to customize

**Kanban Controls:**
1. Click "Kanban" tab in view selector
2. Choose sub-view (State/Process/Custom)
3. Drag cards to move between columns
4. Right-click cards for context menu
5. Click card to open detail panel

---

## Epic Detail Panel

**Opens When:** Click any epic row/card

**Panel Width:** 800px slide-out from right

**Close:** Click X or click outside panel

### Tab 1: Details

**Core Information:**
- Epic key and name
- Description
- State and health status
- Owner assignment
- Theme and program
- Start date, end date, target completion date
- Tags and custom fields

**Actions:**
- Edit inline fields
- Change state via dropdown
- Assign owner
- Update dates with date picker

### Tab 2: Design

**Purpose:** Store and reference design artifacts

**Fields:**
- Title
- Type (Wireframe, Mockup, Prototype, Specification)
- URL or file path
- Description

**How to Use:**
1. Click "Add Design Item"
2. Fill in title and URL
3. Select type from dropdown
4. Add optional description
5. Click "Add Design Item"
6. View list of all design artifacts
7. Click trash icon to delete

### Tab 3: Intake

**Purpose:** Capture business requirements and context

**Fields:**
- Business Justification (large text)
- Expected Business Value
- Target Market/Customer Segment
- Priority (Critical/High/Medium/Low)
- Dependencies (text)
- Risks (text)
- Assumptions (text)

**Auto-Save:** Changes save on blur

**How to Use:**
1. Navigate to Intake tab
2. Fill in business justification
3. Enter expected value and target market
4. Select priority level
5. Document dependencies, risks, assumptions
6. Click "Save Intake Responses"

### Tab 4: Benefits

**Purpose:** Track business benefits and outcomes

**Fields Per Benefit:**
- Title
- Description
- Metric (e.g., "Revenue Growth")
- Target Value (e.g., "$500K increase")

**How to Use:**
1. Click "Add New Benefit" section
2. Enter benefit title (required)
3. Add description, metric, target value
4. Click "Add Benefit"
5. View tracked benefits list below
6. Delete benefits with trash icon

### Tab 5: Value

**Purpose:** WSJF prioritization and value metrics

**WSJF Components (0-100 scale):**
- Business Value
- Time Criticality
- Risk Reduction
- **Score Display:** Sum of three components

**Financial Impact:**
- Estimated Revenue ($)
- Cost Savings ($)
- Customer Satisfaction Impact (0-100)
- Market Share Impact (0-100)

**How to Use:**
1. Adjust sliders for WSJF components
2. See score update in real-time
3. Enter financial estimates
4. Adjust impact sliders
5. Click "Save Value Metrics"

### Tab 6: Milestones

**Purpose:** Track key dates and deliverables

**Fields:**
- Title
- Due Date
- Description

**How to Use:**
1. Click "Add Milestone"
2. Enter title and due date
3. Add optional description
4. Click "Save"
5. View milestone list
6. Click pencil icon to edit
7. Click trash icon to delete

### Tab 7: Spend

**Purpose:** Financial tracking and ROI

**Budget Fields:**
- Budget
- Forecasted Spend
- Estimated Spend
- Accepted Spend
- Work Code
- Initial Investment

**ROI Fields:**
- Return on Investment
- Discount Rate
- Efficiency Dividend
- Revenue Assurance

**Risk Assessment:**
- Business Impact
- IT Risk
- Failure Probability
- Failure Impact
- Risk Appetite

**How to Use:**
1. Enter budget amounts
2. Track spend across categories
3. Calculate ROI metrics
4. Assess risks
5. Click "Save Spend Data"

### Tab 8: Forecast

**Purpose:** Estimate effort across Program Increments

**Display:** Table with PI rows

**Columns:**
- Program Increment (code and name)
- Estimate (Points) - editable input
- Action (delete forecast)

**Total Display:** Sum of all PI estimates at top

**How to Use:**
1. View list of PIs
2. Enter estimate points per PI
3. Input auto-saves on blur
4. See total forecasted points
5. Click trash to delete forecast for specific PI

### Tab 9: Links

**Purpose:** External references and documentation

**Fields:**
- Title
- URL
- Link Type (Documentation, Design, Ticket, Reference, Other)

**How to Use:**
1. Click "Add New Link" section
2. Enter title and URL
3. Select link type
4. Click "Add Link"
5. View links with color-coded type badges
6. Click link to open in new tab
7. Delete with trash icon

---

## Bulk Operations

**Activate:** Select epics with checkboxes

**Available Operations:**

### Bottom-Up Estimate
**Purpose:** Calculate epic estimate from feature estimates

**How to Use:**
1. Select one or more epics
2. Click More Actions → Bottom-Up Estimate
3. System aggregates feature.estimate_points
4. Updates epic.estimate automatically
5. Toast confirms calculation

### Mass Move
**Purpose:** Move multiple epics to program/PI

**How to Use:**
1. Select multiple epics
2. Click More Actions → Mass Move
3. Select target program
4. Select target PI
5. Click Confirm
6. All selected epics update

### Export Epics
**Purpose:** Download epic data as CSV

**Columns Exported:**
- Epic Key
- Name
- State
- Health
- Theme
- Program

**How to Use:**
1. Optionally filter/search epics
2. Click More Actions → Export Epics
3. CSV file downloads automatically
4. Open in Excel or Google Sheets

### Import Epics
**Purpose:** Bulk create epics from CSV

**How to Use:**
1. Click More Actions → Import Epics
2. Upload CSV file
3. Map columns to fields
4. Preview import
5. Click Import
6. Epics created in batch

### Print Epic Cards
**Purpose:** Physical cards for planning sessions

**How to Use:**
1. Optionally select specific epics
2. Click More Actions → Print Epic Cards
3. New window opens with card layout
4. Print dialog appears automatically
5. Cards formatted for A4 paper
6. Each card shows: name, key, state, health, estimate, theme

---

## Context Menu Actions

**Activate:** Right-click any epic or click More (⋮) icon

**Actions Available:**

### Open
- Opens epic detail panel
- Same as clicking row/card

### Duplicate Epic
- Opens dialog to name duplicate
- Options: Include dates, include description
- Creates copy with "-COPY" suffix
- Preserves metadata

### Move To Top
- Moves epic to position #1
- Updates global_rank
- Instant update

### Move To Bottom
- Moves epic to last position
- Updates global_rank
- Instant update

### Move To Position
- Opens dialog to select specific rank
- Enter number (1 to N)
- Updates global_rank
- Visual rank indicator

### Move To PI
- Assign epic to Program Increment
- Opens PI selector dialog
- Updates PI association

### Recycle Bin
- Soft deletes epic (sets deleted_at)
- Epic moves to Recycle Bin page
- Can be restored later

### Parking Lot
- Toggles parked status
- Parked epics shown with indicator
- Use for on-hold items

---

## Reporting

### Epic Status Report

**Route:** `/items/epics/:epicId/status-report`

**Sections:**
1. **Epic Overview:** Name, key, state, health, description, theme, program, dates
2. **Progress Metrics:** Feature completion percentage, total points, progress bars
3. **Features Breakdown:** List of features with status and points
4. **Milestones:** List with due dates
5. **Report Footer:** Generation timestamp

**Actions:**
- Print (opens print dialog)
- Export (downloads text file)

**How to Access:**
1. Open epic detail panel
2. Click More (⋮) → Status Report
3. Opens in new tab
4. Click Print or Export

### Epic Trace Report

**Route:** `/items/epics/:epicId/trace`

**Display:** Full hierarchy tree
- Epic (root)
  - Features (level 1)
    - Stories (level 2)
      - Subtasks (level 3)

**Features:**
- Collapsible tree sections
- Visual hierarchy lines
- Item counts per level
- Print and export

### Epic Requirement Hierarchy

**Route:** `/items/epics/:epicId/requirement-hierarchy`

**Display:** Structured requirement tree
- Full nested view
- Acceptance criteria
- Dependencies
- Story point aggregation

**Use Case:** Traceability and impact analysis

---

## Special Features

### Recycle Bin

**Route:** `/items/epics/recycle-bin`

**Purpose:** View and restore deleted epics

**Features:**
- Shows epics with deleted_at timestamp
- Restore button (clears deleted_at)
- Permanent delete option
- Filter and search

**How to Use:**
1. Navigate to More Actions → Access Recycle Bin
2. View deleted epics
3. Click Restore to recover
4. Or click Permanent Delete

### Canceled Items

**Route:** `/items/epics/canceled`

**Purpose:** Track canceled epics separately

**Features:**
- Separate from deleted items
- Reactivate option
- Status indicators
- Audit trail

### Pull Rank

**Purpose:** Batch ranking operations

**How to Use:**
1. Click More Actions → Pull Rank
2. Specify source rank
3. Select pull direction (up/down)
4. Confirm operation
5. Epics re-ranked automatically

### WSJF Prioritization

**Purpose:** Prioritize by Weighted Shortest Job First

**How to Use:**
1. Select multiple epics
2. Click More Actions → Prioritization (WSJF)
3. Enter WSJF components for each:
   - Business Value (1-100)
   - Time Value (1-100)
   - Risk Reduction (1-100)
   - Job Size (1-100)
4. View calculated scores
5. Click Apply to rank by WSJF
6. Epics reorder by score

---

## Tips and Best Practices

### Organization
1. Use themes to group related epics
2. Assign clear owners for accountability
3. Keep descriptions concise but complete
4. Tag epics for easy filtering

### Process Tracking
1. Move epics through states as work progresses
2. Update health regularly (green/yellow/red)
3. Document blockers in description
4. Use parking lot for paused work

### Value Management
1. Fill out Value tab for all epics
2. Calculate WSJF before each PI planning
3. Track benefits from day one
4. Review spend quarterly

### Collaboration
1. Add links to all relevant documents
2. Maintain milestones for stakeholder communication
3. Use design tab for artifact links
4. Keep intake responses up-to-date

### Reporting
1. Generate status reports monthly
2. Use trace reports for dependency analysis
3. Print cards for PI planning sessions
4. Export data for executive presentations

---

## Troubleshooting

### Epic Won't Save
- Check required fields are filled
- Verify permissions
- Check network connection
- Try refreshing page

### Drag-Drop Not Working
- Ensure you're not filtering (disables drag-drop)
- Check browser compatibility
- Try using context menu instead
- Clear browser cache

### Detail Panel Won't Open
- Check if epic ID is valid
- Verify database connection
- Try refreshing page
- Check console for errors

### Print Cards Blank
- Ensure epics are selected or all loaded
- Check browser print permissions
- Try different browser
- Verify popup blocker isn't blocking

---

## Keyboard Shortcuts

*Coming Soon*

- `Ctrl/Cmd + K` - Quick search
- `Escape` - Close panel
- `Ctrl/Cmd + N` - New epic
- `Ctrl/Cmd + E` - Export
- `Ctrl/Cmd + P` - Print cards

---

## Support

For additional help:
- Check Catalyst documentation
- Contact your system administrator
- Submit feedback via the app
- Review training materials

---

**Last Updated:** Phase 5 Completion  
**Version:** 1.0  
**Maintained By:** Catalyst Development Team
