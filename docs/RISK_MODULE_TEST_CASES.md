# Risk Module - Comprehensive Test Cases & Navigation Guide

## 📊 Test Data Summary

**Total Risks Seeded**: 55 risks (30 original + 25 new comprehensive test risks)

### ROAM Distribution (New Test Risks 31-55):
- ✅ **Resolved** (Closed): 5 risks (#31-35)
- 👤 **Owned** (Open): 8 risks (#36-43)
- ✔️ **Accepted** (Open): 7 risks (#44-50)
- 🛡️ **Mitigated** (Open): 5 risks (#51-55)

### Impact/Occurrence Coverage:
- **Impact**: Low, Medium, High, Critical
- **Occurrence**: Low, Medium, High, Critical
- **Critical Path**: Yes/No variations
- **Relationship Types**: Feature, Epic, Capability, Program Increment, Theme

---

## 🧪 Test Case 1: ROAM Board - All Four Columns

### Objective
Verify ROAM Board displays risks in correct columns with proper drag-drop functionality.

### Navigation
```
/risk-roam-report
```

### What to Verify
1. **Four Columns Visible**:
   - ✅ Resolved (should show 5 risks: #31-35)
   - 👤 Owned (should show 8 risks: #36-43)
   - ✔️ Accepted (should show 7 risks: #44-50)
   - 🛡️ Mitigated (should show 5 risks: #51-55)

2. **Risk Cards Display**:
   - Risk number and title visible
   - Impact/Occurrence badges with color coding
   - Critical path indicator
   - Tags displayed

3. **Column Counts**:
   - Check donut chart shows: Open: 20, Closed: 5
   - Risk Occurrence chart displays distribution
   - Impact Analysis chart shows severity spread

4. **Drag & Drop**:
   - Drag risk #36 (Owned) to Mitigated column
   - Verify risk updates to "Mitigated" status
   - Drag back to Owned

5. **View Settings**:
   - Click view settings icon
   - Toggle "Show Resolved Risks" off
   - Verify Resolved column hides
   - Toggle back on

### Expected Results
- All 25 test risks appear in correct columns
- Drag-drop updates resolution_method
- Charts reflect current data
- View settings work correctly

---

## 🧪 Test Case 2: Risk Grid - Filters & Search

### Objective
Test grid view with comprehensive filtering and search functionality.

### Navigation
```
/risks
```

### What to Verify
1. **Grid Display**:
   - 55 total risks visible
   - Columns: Risk #, Title, Status, ROAM Status, Impact, Occurrence, Owner, Program, PI

2. **Status Filter**:
   - Click Filters button
   - Select Status = "Open"
   - Verify 50 risks displayed (excludes 5 Closed/Resolved)
   - Clear filter

3. **ROAM Filter**:
   - Select Resolution Method = "Owned"
   - Verify 8 risks displayed (#36-43)
   - Clear filter

4. **Impact Filter**:
   - Select Impact = "Critical"
   - Verify risks #33, 35, 36, 41, 44, 51, 53 displayed (7 total)
   - Clear filter

5. **Search Functionality**:
   - Type "API" in search
   - Verify risk #31 "API Rate Limiting Impact" appears
   - Clear search

6. **Combined Filters**:
   - Status = Open + Impact = High + ROAM = Owned
   - Should show: #36 (Cloud Cost), #37 (Developer Attrition), #38 (Compliance), #41 (Data Center)
   - Clear all filters

7. **Export CSV**:
   - Click Export button
   - Verify CSV downloads with all risk data

### Expected Results
- Filters narrow results correctly
- Search finds partial matches
- Combined filters work as AND logic
- Export includes all filtered data

---

## 🧪 Test Case 3: Risk Detail Panel - All Tabs

### Objective
Verify risk detail panel displays complete information across all tabs.

### Navigation
```
/risks → Click any risk card
```

### Recommended Test Risk
Click on Risk #36: "Cloud Cost Overrun Risk"

### What to Verify
1. **Details Tab**:
   - Title: "Cloud Cost Overrun Risk"
   - Status: Open
   - ROAM Status: Owned (badge with cyan background)
   - Owner: [current user]
   - Program: Test Program
   - PI: PI-5
   - Impact: Critical
   - Occurrence: High
   - Critical Path: Yes
   - Target Resolution Date: 2025-01-15
   - Tags: Budget, Infrastructure, Critical

2. **Description Section**:
   - Full description visible
   - Edit button functional

3. **Mitigation Field**:
   - Shows: "Implement auto-scaling and resource optimization policies"
   - Editable

4. **Consequence Field**:
   - Shows: "Budget exceeded, project delay"
   - Editable

5. **Contingency Field**:
   - Shows: "Request additional budget allocation"
   - Editable

6. **Related Work Item**:
   - Shows linked Feature
   - Click should navigate to feature

7. **External Links Section**:
   - Add new link functionality
   - Edit/delete existing links

8. **Discussions Tab**:
   - Add comment functionality
   - View existing comments with timestamps
   - @mention functionality

### Expected Results
- All fields display correct data
- Inline editing works
- Links navigate correctly
- Discussions save and display

---

## 🧪 Test Case 4: Create/Edit Risk Workflow

### Objective
Test creating new risk and editing existing risk with validation.

### Navigation
```
/risks → Click "Create Risk" button
```

### What to Verify
1. **Create New Risk**:
   - Title: "Test Risk - UI Validation"
   - Description: "Testing create flow"
   - Owner: Select current user
   - Program: Select "Test Program"
   - PI: Select "PI-5"
   - Impact: Select "High"
   - Occurrence: Select "Medium"
   - Resolution Method: Select "Owned"
   - Critical Path: "Yes"
   - Tags: "Testing,UI"
   - Click Save

2. **Validation**:
   - Leave Title blank → should show error
   - Leave Owner blank → should show error
   - All required fields enforce validation

3. **Edit Existing Risk**:
   - Open Risk #37 "Key Developer Attrition"
   - Click Edit button
   - Change Impact from "High" to "Critical"
   - Change Resolution Method from "Owned" to "Mitigated"
   - Add Mitigation text: "Hiring completed, onboarding in progress"
   - Click Save

4. **Verify Changes**:
   - Return to grid view
   - Search for Risk #37
   - Verify Impact now shows "Critical"
   - Open ROAM Board
   - Verify Risk #37 now in "Mitigated" column

### Expected Results
- New risk creates successfully
- Validation prevents incomplete submissions
- Edits save and reflect across all views
- ROAM Board automatically updates

---

## 🧪 Test Case 5: Dependency Risk Analysis Page

### Objective
Test the dedicated Dependency Risk analysis with high-risk dependency filtering.

### Navigation
```
/insights/dependency-risk
```

### What to Verify
1. **Summary Cards**:
   - Total Dependencies count
   - High Risk Dependencies (red)
   - Medium Risk Dependencies (yellow)
   - Low Risk Dependencies (green)

2. **Risk Distribution Chart**:
   - Donut chart showing risk level breakdown
   - Color coding: red (high), yellow (med), green (low)
   - Percentages calculated correctly

3. **Severity Trend Chart** (if available):
   - Line/bar chart showing risk trends over time
   - Filter by PI functionality

4. **High Risk Dependencies List**:
   - Table showing only high-risk dependencies
   - Columns: From Feature, To Feature, Status, Type, Risk Level
   - Click dependency opens detail drawer

5. **Empty States**:
   - If no high-risk dependencies, verify "No high-risk dependencies found" message displays
   - Verify suggestion to check other risk levels

6. **Filters**:
   - Program filter works
   - PI filter works
   - Type filter (Feature/Epic) works

### Expected Results
- Charts render with accurate data
- High-risk dependencies prominently displayed
- Filters narrow results correctly
- Empty states show helpful messages

---

## 📋 Quick Navigation Reference

| Feature | Route | Purpose |
|---------|-------|---------|
| **Risk Grid** | `/risks` | Main list view with filters |
| **ROAM Board** | `/risk-roam-report` | Kanban-style ROAM board |
| **Dependency Risk** | `/insights/dependency-risk` | Dependency risk analysis |
| **Enterprise Risks** | `/enterprise/risks` | Enterprise-level risk view |
| **Create Risk** | `/risks` + "Create Risk" button | New risk creation |

---

## 🎯 Coverage Matrix

| Test Scenario | Risk Numbers | Key Attributes |
|---------------|-------------|----------------|
| **Resolved/Closed Risks** | #31-35 | Status: Closed, Resolution: Resolved, Has resolution_status |
| **High Impact + Owned** | #36, #37, #38, #41 | Impact: High/Critical, ROAM: Owned, Critical Path varied |
| **Critical Path Risks** | #31, #33, #35, #36, #37, #41, #44, #48, #51, #53 | Critical Path: Yes |
| **Accepted Risks** | #44-50 | ROAM: Accepted, Various impacts |
| **Mitigated Risks** | #51-55 | ROAM: Mitigated, Mitigation plans documented |
| **Tags Testing** | All new risks | Various tag combinations |
| **Related Work Items** | All new risks | Linked to Features, Epics, Capabilities |

---

## 🔍 Additional Verification Points

1. **Performance**:
   - Grid loads with 55 risks < 2 seconds
   - ROAM board renders smoothly
   - No console errors

2. **Responsive Design**:
   - Test on mobile viewport
   - Verify cards stack properly
   - Filters accessible on mobile

3. **Data Integrity**:
   - Risk numbers are unique
   - All risks have owners
   - All risks link to valid work items

4. **Edge Cases**:
   - Drag risk to same column (no-op)
   - Delete a risk → verify soft delete (deleted_at populated)
   - Edit closed risk → verify resolution_status required

---

## 📊 Expected Totals After Seeding

- **Total Risks**: 55
- **Open Status**: 50
- **Closed Status**: 5
- **ROAM - Resolved**: 5
- **ROAM - Owned**: 8
- **ROAM - Accepted**: 7
- **ROAM - Mitigated**: 5
- **ROAM - (Original 30 risks)**: 30
- **Impact - Critical**: 7
- **Impact - High**: Multiple
- **Occurrence - Critical**: Multiple

---

*Test data seeded: 2025-11-30*  
*Test cases cover: Grid, ROAM Board, Detail Panel, CRUD operations, Dependency Risk Analysis*