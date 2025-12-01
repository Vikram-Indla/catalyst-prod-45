# Forecast & WSJF Testing Routes

## Current Data Status
✅ **Forecast Entries**: 20+ entries across PIs  
✅ **Epic WSJF**: Populated with scores (8.67, 7.60, 7.20, etc.)  
✅ **Feature WSJF**: 116 features with scores (88, 85, 80, etc.)  
✅ **Program Increments**: 11 PIs available  

---

## Forecast Testing Routes

### 1. **Epic Forecast Tab**
**Route**: Navigate to any epic → Forecast tab  
**Test**: 
- Open Epic Backlog `/backlog/epics`
- Click on any epic (e.g., "EP-1015 Customer Portal Redesign")
- Go to "Forecast" tab in details panel
- Select a PI from dropdown
- See programs listed with team-level estimate inputs
- Enter estimates and verify they save

### 2. **Feature Forecast Tab**
**Route**: Navigate to any feature → Forecast tab  
**Test**: 
- Go to Features `/features`
- Click on any feature (e.g., "4705 Payment Integration")
- Go to "Forecast" tab in details panel
- Select a PI and verify forecast data displays

### 3. **Program Forecast Page**
**Route**: `/programs/:programId/forecast`  
**Example**: `/programs/22222222-2222-2222-2222-222222222222/forecast`  
**Test**:
- Use Program sidebar → click "Forecast"
- Select a PI from dropdown (e.g., "PI-2025-Q4")
- Verify forecast grid displays with work items
- Test editing estimates inline
- Check capacity warnings

### 4. **Global Forecast Page**
**Route**: `/forecast`  
**Test**:
- Navigate from Enterprise sidebar
- Select multiple PIs
- Verify forecast grid shows all work items
- Test view level toggle (Team/Program)
- Test work item level toggle (Epics/Features)

### 5. **Work Spend Grid**
**Route**: `/work-spend-grid`  
**Access**: Program/Portfolio sidebar → Reports → Work spend grid  
**Test**:
- Select a PI (e.g., "PI-2025-Q4")
- Verify Forecasted/Estimated/Accepted Spend columns display
- Test search functionality
- Click "Export to CSV" button

---

## WSJF Testing Routes

### 1. **Epic WSJF Tab**
**Route**: Navigate to any epic → WSJF tab  
**Test**: 
- Open Epic Backlog `/backlog/epics`
- Click on any epic with WSJF data:
  - "EP-1015 Customer Portal Redesign" (WSJF: 8.67)
  - "EP-1020 Customer Portal Redesign" (WSJF: 8.67)
  - "EP-1019 Security Compliance" (WSJF: 7.20)
- Go to "WSJF" tab
- Select a PI
- Verify Business Value, Time Criticality, RR/OE, Job Size inputs
- Change values and verify calculated score updates
- Formula displayed: (BV + TC + RR/OE) ÷ Job Size

### 2. **Feature WSJF Tab**
**Route**: Navigate to any feature → WSJF tab  
**Test**: 
- Go to Features `/features`
- Click on features with WSJF scores:
  - "4705 Payment Integration" (WSJF: 88)
  - "7638 Account Profile Page" (WSJF: 85)
  - "1111 Navigation Bar Component" (WSJF: 80)
- Go to "WSJF" tab (should be added to FeatureDetailsPanel)
- Verify all 4 WSJF inputs display
- Test value changes and score calculation

### 3. **Apply WSJF to Rank - Epic Backlog**
**Route**: `/backlog/epics`  
**Test**:
- Click "Apply WSJF to Rank" button in header
- Dialog opens with confirmation
- Click "Apply WSJF to Rank" in dialog
- Verify epics reorder by WSJF score (highest first)
- Check toast notification confirms reordering

### 4. **Apply WSJF to Rank - Features**
**Route**: `/features`  
**Test**:
- Click "Apply WSJF" button in header
- Dialog opens with scope options
- Apply to all features or filtered scope
- Verify features reorder by WSJF score
- Top features should be: Payment Integration (88), Account Profile (85), Navigation Bar (80)

### 5. **Pull Rank - Epic Backlog**
**Route**: `/backlog/epics`  
**Test**:
- Select an epic (click to highlight)
- Click "Pull Rank" button in header
- Choose source: Portfolio Rank or Program Rank
- Click "Pull Rank" in dialog
- Verify global rank copies from selected source

### 6. **Pull Rank - Features**
**Route**: `/features`  
**Test**:
- Select a feature
- Click "Pull Rank" button
- Choose Portfolio or Program rank source
- Verify rank updates

---

## Navigation Links Testing

### Portfolio Sidebar
✅ Forecast link: `/portfolio/:portfolioId/forecast`  
✅ Work Spend Grid: Reports → Work spend grid → `/work-spend-grid`

### Program Sidebar
✅ Forecast link: `/programs/:programId/forecast`  
✅ Work Spend Grid: Reports → Work spend grid → `/work-spend-grid`

### Enterprise Sidebar  
✅ Forecast link: Should route to global `/forecast`

---

## Quick Test Sequence

1. **Start at Epic Backlog**: `/backlog/epics`
   - Click "Apply WSJF to Rank" → verify reordering
   - Click any epic → Forecast tab → select PI → add estimates
   - Same epic → WSJF tab → select PI → set values → verify calculated score

2. **Go to Features**: `/features`
   - Click "Apply WSJF" → verify reordering by score
   - Click top feature → WSJF tab → verify score displays
   - Same feature → Forecast tab → verify estimates

3. **Go to Program Forecast**: `/programs/22222222-2222-2222-2222-222222222222/forecast`
   - Select "PI-2025-Q4"
   - Verify grid shows work items with estimates
   - Edit an estimate → verify save
   - Check total calculations

4. **Go to Work Spend Grid**: `/work-spend-grid`
   - Select "PI-2025-Q4"
   - Verify Forecasted/Estimated/Accepted columns
   - Export CSV → verify download

---

## Data Verification Queries

```sql
-- Check Epic WSJF scores
SELECT e.epic_key, e.name, ew.wsjf_score, ew.business_value, ew.time_value, ew.rroe_value, ew.job_size
FROM epics e
JOIN epic_wsjf ew ON e.id = ew.epic_id
ORDER BY ew.wsjf_score DESC LIMIT 10;

-- Check Feature WSJF scores
SELECT display_id, name, wsjf_score, business_value, time_criticality, risk_reduction, job_size
FROM features
WHERE wsjf_score IS NOT NULL
ORDER BY wsjf_score DESC LIMIT 10;

-- Check Forecast data by PI
SELECT 
  pi.name as pi_name,
  fe.work_item_type,
  COUNT(fe.id) as count,
  SUM(fe.estimate) as total
FROM forecast_entries fe
JOIN program_increments pi ON fe.pi_id = pi.id
GROUP BY pi.name, fe.work_item_type
ORDER BY pi.name;
```
