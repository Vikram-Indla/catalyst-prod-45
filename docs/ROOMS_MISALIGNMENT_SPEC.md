# Catalyst Rooms & Misalignment Specification

## Room Hierarchy

```
Enterprise Level
└── Strategy Room
    └── Product Level
        └── Product Room
            └── Program Level
                └── Program Room
                    └── Project Level
                        └── Project Room
```

---

## Room Definitions

### 1. Strategy Room (Enterprise Level)
**Purpose:** Strategic oversight, OKR alignment, theme management

**Contains:**
- Strategic Themes
- OKRs/Objectives
- Mission, Vision, Values

**Misalignment Section - "Unserved Business Requests":**
| Metric | Logic | Severity |
|--------|-------|----------|
| Orphan Business Requests | BR not linked to ANY Epic or Feature | High |
| High-Score Orphans | Orphan BR with business_score >= 70 | Critical |
| Unranked Orphans | Orphan BR with no rank assigned | Medium |

**Query Logic:**
```sql
-- Orphan Business Requests (not served)
SELECT br.* FROM business_requests br
WHERE br.id NOT IN (
  SELECT DISTINCT linked_business_request_id FROM epics 
  WHERE linked_business_request_id IS NOT NULL
)
AND br.id NOT IN (
  SELECT DISTINCT business_request_id FROM features 
  WHERE business_request_id IS NOT NULL
)
AND br.deleted_at IS NULL;
```

**Analytics Cards:**
- Total Business Requests
- Served (linked to Epic/Feature)
- Unserved (orphaned)
- High-Priority Unserved (score >= 70)

---

### 2. Product Room (Product Level)
**Purpose:** Business request intake, demand management, prioritization

**Contains:**
- Business Requests
- Executive Roadmap
- Demand analytics

**Misalignment Section - "Business Justification Gaps":**
| Metric | Logic | Severity |
|--------|-------|----------|
| Epics without BR | Epic has no linked_business_request_id | High |
| Features without BR | Feature has no business_request_id | Medium |

**Query Logic:**
```sql
-- Epics missing business justification
SELECT e.* FROM epics e
WHERE e.linked_business_request_id IS NULL
AND e.deleted_at IS NULL;

-- Features missing business justification
SELECT f.* FROM features f
WHERE f.business_request_id IS NULL
AND f.deleted_at IS NULL;
```

**Key Insight:** These work items lack business traceability—they exist without formal business request backing.

---

### 3. Program Room (Program Level)
**Purpose:** Epic management, PI planning, cross-team coordination

**Contains:**
- Epics (scoped to program)
- Epic Backlog
- Epic Roadmap

**Misalignment Section - "Delivery Gaps":**
| Metric | Logic | Severity |
|--------|-------|----------|
| Epics without Theme | Epic has no theme_id | High |
| Epics without Quarter | Epic has no planned_quarter | High |
| Epics without Both | No theme AND no quarter | Critical |

**Query Logic:**
```sql
-- Epics missing strategic alignment
SELECT e.* FROM epics e
WHERE e.primary_program_id = :programId
AND (e.theme_id IS NULL OR e.planned_quarter IS NULL)
AND e.deleted_at IS NULL;
```

**Analytics Cards:**
- Total Epics
- Strategically Aligned (has theme)
- Delivery Targeted (has quarter)
- Fully Aligned (has both)
- Misaligned (missing either)

---

### 4. Project Room (Project Level)
**Purpose:** Feature/Story execution, sprint management, release tracking

**Contains:**
- Features
- Stories
- Sprints/Iterations

**Misalignment Section - "Release Gaps":**
| Metric | Logic | Severity |
|--------|-------|----------|
| Features without Release | Feature has no release_id/version | High |
| Stories without Release | Story has no release_id/version | Medium |
| Stories without Feature | Story has no feature_id (orphan) | High |

**Query Logic:**
```sql
-- Features not targeted in release
SELECT f.* FROM features f
WHERE f.project_id = :projectId
AND f.release_id IS NULL
AND f.deleted_at IS NULL;

-- Stories not targeted in release
SELECT s.* FROM stories s
WHERE s.project_id = :projectId
AND s.release_id IS NULL
AND s.deleted_at IS NULL;

-- Orphan stories (no parent feature)
SELECT s.* FROM stories s
WHERE s.project_id = :projectId
AND s.feature_id IS NULL
AND s.deleted_at IS NULL;
```

---

## Misalignment Component Pattern

Each room should have a `MisalignedWorkItems` component that:

1. **Fetches misalignment data** based on room context (programId, projectId, etc.)
2. **Displays counts** in card format with severity indicators
3. **Allows drill-down** to see actual misaligned items
4. **Provides quick actions** to resolve (e.g., "Assign Theme", "Set Quarter")

### Shared Component Structure:
```tsx
interface MisalignmentData {
  category: string;
  count: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  items: MisalignedItem[];
  actionLabel?: string;
  onAction?: () => void;
}

interface MisalignedItem {
  id: string;
  type: 'epic' | 'feature' | 'story' | 'business_request';
  key: string;
  name: string;
  missingField: string;
}
```

---

## Relationship Map

```
Business Request (BR)
    │
    ├──► Epic (linked_business_request_id)
    │       │
    │       └──► Strategic Theme (theme_id) ← REQUIRED for alignment
    │       └──► Planned Quarter (planned_quarter) ← REQUIRED for delivery
    │
    └──► Feature (business_request_id)
            │
            └──► Release/Version (release_id) ← REQUIRED for delivery
            │
            └──► Story (feature_id)
                    │
                    └──► Release/Version (release_id) ← REQUIRED for delivery
```

---

## Implementation Checklist

### Strategy Room
- [ ] Orphan BR count widget
- [ ] High-score orphan BR callout
- [ ] BR served vs unserved pie chart
- [ ] Drill-down to orphan BR list

### Product Room
- [ ] Epics without BR count
- [ ] Features without BR count
- [ ] "Needs Business Justification" section
- [ ] Quick-link to assign BR

### Program Room
- [ ] Epics without Theme count
- [ ] Epics without Quarter count
- [ ] Combined misalignment view
- [ ] Quick-assign Theme/Quarter actions

### Project Room
- [ ] Features without Release count
- [ ] Stories without Release count
- [ ] Orphan Stories count
- [ ] Release assignment quick action

---

## Color/Severity Coding

| Severity | Use Case | Visual |
|----------|----------|--------|
| Critical | Missing multiple required fields | Red indicator |
| High | Missing one required field | Amber indicator |
| Medium | Missing optional but recommended | Yellow indicator |
| Low | Minor gap | Grey indicator |

---

## Notes

- **Business Requests never need Strategic Themes** - that's IT organization linking
- **Business Requests are upstream** - they drive work, not receive assignments
- **High-score orphan BRs are critical** - valuable business needs being ignored
- **Release/Version is the delivery alignment marker** for Project level
- **Theme + Quarter is the delivery alignment marker** for Program level
