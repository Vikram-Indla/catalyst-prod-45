# Enterprise Risks Page - Logic Audit

**Route:** `/enterprise/risks`  
**Component:** `src/pages/enterprise/EnterpriseRisks.tsx`  
**Data Hook:** `src/hooks/risks/useRisks.ts`  
**Audit Date:** 2025-12-13  

---

## Executive Summary

The Enterprise Risks page displays analytics and KPIs based on risks stored in the `risks` database table. **All real risks currently have `relationship = 'Feature'`** because they were created from Business Request drawers, which default the relationship field to `'Feature'`. There is **no actual "Department" or "Business Owner" field** in the `risks` table, so the UI uses the `relationship` field as a proxy for "Department" and `owner_id` (which is a UUID, not a name) for "Business Owner" - resulting in misleading labels.

---

## 1. Data Source & Fetching

### 1.1 Primary Data Hook

**Hook:** `useRisks()` from `src/hooks/risks/useRisks.ts`

```typescript
const { risks, isLoading, createRisk, updateRisk, deleteRisk } = useRisks();
```

### 1.2 Query Details

| Property | Value |
|----------|-------|
| Table | `risks` |
| Filter | `deleted_at IS NULL` |
| Ordering | `created_at DESC` |
| Optional Filters | `program_id`, `program_increment_id` (not used on Enterprise page) |

**Important:** The Enterprise Risks page calls `useRisks()` with NO parameters, meaning it fetches **all non-deleted risks** regardless of program or PI scope.

### 1.3 Database Schema (risks table)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | uuid | NO | Primary key |
| risk_number | integer | NO | Auto-increment display number |
| title | text | NO | Risk title |
| description | text | NO | Risk description |
| status | text | NO | 'Open' or 'Closed' |
| occurrence | text | YES | 'Low', 'Medium', 'High', 'Critical' |
| impact | text | YES | 'Low', 'Medium', 'High', 'Critical' |
| critical_path | text | YES | 'Yes' or 'No' |
| program_id | uuid | YES | FK to programs table |
| program_increment_id | uuid | YES | FK to program_increments table |
| **owner_id** | uuid | YES | **UUID reference, NOT a human-readable name** |
| **relationship** | text | NO | 'Theme', 'Epic', 'Capability', 'Feature', 'Program Increment' |
| related_item_id | uuid | YES | FK to related entity |
| resolution_method | text | NO | ROAM: 'Resolved', 'Owned', 'Accepted', 'Mitigated' |
| target_resolution_date | date | YES | Target resolution date |
| **business_request_id** | uuid | YES | FK to business_requests table |
| notify | text | YES | Notification setting |
| consequence | text | YES | Risk consequence description |
| contingency | text | YES | Contingency plan |
| mitigation | text | YES | Mitigation actions |
| resolution_status | text | YES | Resolution status notes |
| tags | text | YES | Comma-separated tags |
| created_by | uuid | YES | Creator user ID |
| created_at | timestamp | NO | Creation timestamp |
| updated_at | timestamp | NO | Last update timestamp |
| deleted_at | timestamp | YES | Soft delete timestamp |

### 1.4 Current Real Data Sample

From the database query, here are the current risks:

| risk_number | title | relationship | owner_id | business_request_id |
|-------------|-------|--------------|----------|---------------------|
| 1 | Title of the risk | Feature | NULL | dddddddd-... |
| 2 | Test risk | Feature | NULL | 450c8c96-... |
| 4 | Require budget, delay... | Feature | NULL | a4a3d686-... |
| 5 | Unified Risk Drawer | Feature | NULL | f49bdba4-... |

**Key Finding:** ALL risks have:
- `relationship = 'Feature'` (hardcoded default)
- `owner_id = NULL` (never populated)
- `business_request_id` populated (they were created from BR drawer)

---

## 2. KPI Tiles (Top Row)

### 2.1 Total Open Risks

**Location:** Line 454-457  
**Calculation:**
```typescript
const openRisks = allRisks.filter(r => r.status === 'Open');
// Display: openRisks.length
```
**Filters:** `status === 'Open'`  
**Data Source:** All risks from `useRisks()`  
**Current Value:** Based on real data from `risks` table

### 2.2 Critical / High

**Location:** Line 458-462  
**Calculation:**
```typescript
const criticalHighRisks = openRisks.filter(r => 
  r.critical_path === 'Yes' || r.impact === 'Critical' || r.impact === 'High'
);
```
**Filters:** Open risks where `critical_path = 'Yes'` OR `impact IN ('Critical', 'High')`  
**Data Source:** Real data  
**Note:** Correctly uses schema fields

### 2.3 Mitigated

**Location:** Line 463-467  
**Calculation:**
```typescript
const mitigatedRisks = openRisks.filter(r => r.resolution_method === 'Mitigated');
```
**Filters:** Open risks with `resolution_method = 'Mitigated'`  
**Data Source:** Real data

### 2.4 Business Requests (BR-linked risks)

**Location:** Line 468-472, calculation at lines 242-245  
**Calculation:**
```typescript
const brRisks = openRisks.filter(r => 
  r.relationship === 'Feature' || r.relationship === 'Epic' || 
  (risk => (risk as any).business_request_id)
);
```

**⚠️ BUG IDENTIFIED:** The third condition `(risk => (risk as any).business_request_id)` is a function that always evaluates to truthy (function objects are truthy), NOT the result of checking if `business_request_id` exists. This is a JavaScript syntax error in the filter logic.

**Correct Logic Should Be:**
```typescript
const brRisks = openRisks.filter(r => 
  r.relationship === 'Feature' || r.relationship === 'Epic' || 
  r.business_request_id != null
);
```

**Current Behavior:** Because of the bug, this effectively filters to `relationship === 'Feature' OR 'Epic'`, which captures all current risks since they all have `relationship = 'Feature'`.

---

## 3. Analytics & ROAM Section

### 3.1 Open vs Closed (Pie Chart)

**Location:** Lines 256-259  
**Calculation:**
```typescript
const openClosedData = [
  { name: 'Open', value: openRisks.length, color: CHART_COLORS.gold },
  { name: 'Closed', value: allRisks.filter(r => r.status === 'Closed').length, color: CHART_COLORS.olive },
];
```
**Grouping:** `status` field  
**Data Source:** Real data

### 3.2 Occurrence Likelihood (Pie Chart)

**Location:** Lines 261-265  
**Calculation:**
```typescript
const occurrenceData = [
  { name: 'High', value: openRisks.filter(r => r.occurrence === 'High').length, color: ... },
  { name: 'Medium', value: openRisks.filter(r => r.occurrence === 'Medium').length, color: ... },
  { name: 'Low', value: openRisks.filter(r => r.occurrence === 'Low').length, color: ... },
];
```
**Grouping:** `occurrence` field  
**Filter:** Open risks only  
**Data Source:** Real data  
**Note:** Does NOT include 'Critical' level even though schema supports it

### 3.3 Impact Severity (Pie Chart)

**Location:** Lines 267-272  
**Calculation:**
```typescript
const impactData = [
  { name: 'Critical', value: openRisks.filter(r => r.impact === 'Critical').length, ... },
  { name: 'High', value: openRisks.filter(r => r.impact === 'High').length, ... },
  { name: 'Medium', value: openRisks.filter(r => r.impact === 'Medium').length, ... },
  { name: 'Low', value: openRisks.filter(r => r.impact === 'Low').length, ... },
];
```
**Grouping:** `impact` field  
**Filter:** Open risks only  
**Data Source:** Real data

### 3.4 By Level (Bar Chart) - ⚠️ SHOWING "FEATURE"

**Location:** Lines 274-284 (definition), Lines 574-595 (render)  
**Chart Title:** "By Level"  
**Calculation:**
```typescript
const businessLineData = useMemo(() => {
  const byLine: Record<string, number> = {};
  allRisks.forEach(r => {
    const line = r.relationship || 'Enterprise';  // <-- Uses relationship field!
    byLine[line] = (byLine[line] || 0) + 1;
  });
  return Object.entries(byLine)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}, [allRisks]);
```

**Why "Feature" is showing:**
- The variable is named `businessLineData` but it groups by `r.relationship`
- The `relationship` field in all current risks is `'Feature'` (hardcoded default when creating risks)
- There is **NO "Business Line" field** in the `risks` table
- The chart is mislabeled as "By Level" but actually shows `relationship` distribution

**Expected Behavior (from Claude JSX):**
The reference file uses a `businessLine` field with values like 'Digital Transformation', 'Infrastructure', 'Operations', etc. This field **does not exist** in the real schema.

### 3.5 ROAM Tiles

**Location:** Lines 248-253 (definition), Lines 677-716 (render)  
**Calculation:**
```typescript
const roamSummary = useMemo(() => ({
  resolved: allRisks.filter(r => r.resolution_method === 'Resolved'),
  owned: allRisks.filter(r => r.resolution_method === 'Owned'),
  accepted: allRisks.filter(r => r.resolution_method === 'Accepted'),
  mitigated: allRisks.filter(r => r.resolution_method === 'Mitigated'),
}), [allRisks]);
```
**Grouping:** `resolution_method` field  
**Filter:** ALL risks (not just open)  
**Data Source:** Real data  
**Drill-down:** Click opens `RiskDrillDownDrawer` with `{ type: 'roam', value: 'Resolved' | 'Owned' | ... }`

---

## 4. Lower Analytics Cards

### 4.1 Risks by Department (Bar Chart) - ⚠️ SHOWING "FEATURE"

**Location:** Lines 287-296 (definition), Lines 598-629 (render)  
**Chart Title:** "Risks by Department"  
**Calculation:**
```typescript
const departmentData = useMemo(() => {
  const byDept: Record<string, number> = {};
  openRisks.forEach(r => {
    const dept = r.relationship || 'Enterprise';  // <-- Uses relationship as proxy!
    byDept[dept] = (byDept[dept] || 0) + 1;
  });
  return Object.entries(byDept)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}, [openRisks]);
```

**Why "Feature" is showing:**
- **There is NO "department" field in the `risks` table**
- The code uses `r.relationship` as a proxy/substitute for department
- All current risks have `relationship = 'Feature'`
- Hence, the chart shows only one bar: "Feature" with count of all open risks

**This is NOT the intended behavior.** The reference JSX uses a `businessLine` field that maps to departments like 'Digital Transformation', 'Infrastructure', etc. This field does not exist in the current schema.

**Drill-down Behavior:**
```typescript
onClick={(data: any) => handleDepartmentClick(data.name)}
// Sets: setDrillDownMode({ type: 'department', value: departmentName })
```
Clicking opens the drill-down drawer filtering by `risk.relationship === clicked_value`.

### 4.2 Top Business Owners by Risk - ⚠️ SHOWING "UNASSIGNED / FEATURE"

**Location:** Lines 299-313 (definition), Lines 631-660 (render)  
**Chart Title:** "Top Business Owners by Risk"  
**Calculation:**
```typescript
const topBusinessOwners = useMemo(() => {
  const byOwner: Record<string, { count: number; unit: string }> = {};
  openRisks.forEach(r => {
    const ownerName = r.owner_id || 'Unassigned';  // <-- Uses owner_id (UUID), not a name!
    const unit = r.relationship || 'Enterprise';
    if (!byOwner[ownerName]) {
      byOwner[ownerName] = { count: 0, unit };
    }
    byOwner[ownerName].count++;
  });
  return Object.entries(byOwner)
    .map(([owner, data]) => ({ owner, openRisks: data.count, unit: data.unit }))
    .sort((a, b) => b.openRisks - a.openRisks)
    .slice(0, 5);
}, [openRisks]);
```

**Why "Unassigned / Feature" is showing:**
1. **`owner_id` is NULL** for all current risks (never populated during creation)
2. When NULL, the code defaults to `'Unassigned'`
3. The `unit` displays `r.relationship` which is `'Feature'` for all risks
4. **`owner_id` is a UUID**, not a human-readable name - even if populated, it would show a UUID string

**What's missing:**
- No JOIN to resolve `owner_id` UUID to a user/person name
- No `business_owner` text field exists in the `risks` table
- The Business Request has a `business_owner` field (text), but the risk is not querying it

**Drill-down Behavior:**
```typescript
onClick={() => handleOwnerClick(item.owner)}
// Sets: setDrillDownMode({ type: 'owner', value: ownerUUIDorUnassigned })
// Filters by: risk.owner_id === mode.value
```

### 4.3 Overdue Risks

**NOT IMPLEMENTED in the current component.**

The reference JSX shows an "Overdue Risks" card, but the current `EnterpriseRisks.tsx` does not include:
- Any calculation for overdue risks (`target_resolution_date < today`)
- Any UI element displaying overdue count
- Any drill-down for overdue risks

---

## 5. Drill-Down Drawer

### 5.1 Component

`RiskDrillDownDrawer` - Defined inline at lines 64-196

### 5.2 Drill-Down Modes

| Mode Type | Trigger | Filter Applied |
|-----------|---------|----------------|
| `roam` | Click ROAM tile | `risk.resolution_method === mode.value` |
| `department` | Click department bar | `risk.relationship === mode.value` |
| `owner` | Click owner row | `risk.owner_id === mode.value` |

### 5.3 Fields Shown in Drill-Down Risk Cards

| Field | Source | Notes |
|-------|--------|-------|
| Risk ID | `R-{risk_number}` formatted | Padded to 3 digits |
| Title | `risk.title` | |
| Level badge | `risk.relationship || 'Enterprise'` | Shows 'Feature' for all |
| Critical badge | `risk.critical_path === 'Yes'` | Conditional |
| Target date | `risk.target_resolution_date` | Formatted as month/year |
| Occurrence | `risk.occurrence` | |
| Impact | `risk.impact` | |

### 5.4 Quick Stats in Drawer Header

| Stat | Calculation |
|------|-------------|
| Critical | `filteredRisks.filter(r => r.critical_path === 'Yes').length` |
| High Impact | `filteredRisks.filter(r => r.impact === 'High' \|\| r.impact === 'Critical').length` |
| Open | `filteredRisks.filter(r => r.status === 'Open').length` |

---

## 6. Specific Questions Answered

### Q1: Why is "Feature" showing as the only value in By Level, Risks by Department, and Top Business Owners by Risk?

**Answer:**
- All three charts group/filter by `risk.relationship`
- ALL current risks in the database have `relationship = 'Feature'` (hardcoded default when creating risks from Business Request drawer)
- There is NO department, business_line, or level field in the schema
- The code uses `relationship` as a proxy for all three concepts

### Q2: Where do you get the Department value from? Which column/relation?

**Answer:**
- **There is NO department column in the `risks` table.**
- The code at line 290 uses `r.relationship || 'Enterprise'` as a substitute for department.
- This is NOT the correct data - it should ideally come from the linked Business Request's `department` field via JOIN, but this is not implemented.

### Q3: Where do you get the Business Owner value from?

**Answer:**
- The code at line 302 uses `r.owner_id || 'Unassigned'`
- **`owner_id` is a UUID field, NOT a human-readable name**
- Currently, `owner_id` is NULL for all risks
- Even if populated, it would display a UUID string, not a person's name
- The linked Business Request HAS a `business_owner` text field, but the risks query does NOT JOIN to it

### Q4: Are current risks actually being read from Business Demand / Business Requests?

**Answer:**
- **YES and NO.**
- Risks ARE fetched from the `risks` table which contains real data
- Each risk HAS a `business_request_id` FK linking to a Business Request
- However, the query does NOT JOIN to `business_requests` to pull in BR-specific fields like `department` or `business_owner`
- The reference JSX file (`enterprise-risks-v3.jsx`) uses **hardcoded demo data**, NOT the database

### Q5: Is there a Risk Owner field in the schema?

**Answer:**
- **YES:** `owner_id` (uuid, nullable) exists in the `risks` table
- **However:** It is a UUID reference, not a text name
- **Usage:** Used in `topBusinessOwners` calculation at line 302
- **Problem:** Never populated (all NULL) and would show UUID if populated
- **Missing:** No JOIN to users/profiles table to resolve UUID → name

---

## 7. Assumptions Made in Current Implementation

| Area | Assumption | Reality |
|------|------------|---------|
| Department | `relationship` field represents department | `relationship` is work item type (Theme/Epic/Feature), not department |
| Business Owner | `owner_id` can be displayed directly | `owner_id` is UUID, needs JOIN to resolve name |
| Level | Using `relationship` for "By Level" chart | Correct usage, but mislabeled in reference as "businessLine" |
| Business Line | Not implemented | No `business_line` field exists in schema |
| Linked BR data | Not needed for display | BR has `department` and `business_owner` but not queried |

---

## 8. Recommendations for Fix (NOT IMPLEMENTED YET)

1. **Add JOIN to Business Requests** to pull `department` and `business_owner` fields for BR-linked risks
2. **Add JOIN to resolve `owner_id`** to a human-readable name from users/profiles table
3. **Fix the BR-linked risks filter** - the function arrow syntax bug at line 244
4. **Implement Overdue Risks card** with filter on `target_resolution_date < NOW()`
5. **Consider adding** `department`, `business_owner_name`, and `business_line` fields to the `risks` table for Enterprise-level risks not linked to BRs

---

## Appendix: Reference JSX vs Reality

| Feature | Reference JSX (enterprise-risks-v3.jsx) | Current Implementation |
|---------|----------------------------------------|------------------------|
| Data Source | Hardcoded `allRisks` array with 47 demo risks | Real `risks` table via Supabase |
| Business Line | Explicit `businessLine` field per risk | Not available in schema |
| Owner | Human-readable `owner` name string | UUID `owner_id` (all NULL) |
| Level | Explicit `level` field (Program, Enterprise, Epic, etc.) | `relationship` field misused |
| Department | Uses `businessLine` for department chart | Uses `relationship` as proxy |
| Overdue | Hardcoded `overdueCount = 7` | Not implemented |
| Risk Trend | Hardcoded 6-month trend data | Not implemented |
