# ADS COMPLIANCE AUDIT — Description Field Capability
**Date:** 2026-05-03  
**Owner:** Vikram (Delivery Manager)  
**Status:** AUDIT COMPLETE → ARCHITECTURE DRAFT  
**Quality Gate:** 100% ADS-compliant, 100% Jira parity

---

## EXECUTIVE SUMMARY

### Current State
The Catalyst platform has **5 scattered description implementations** with NO ADS component usage:
- `DescriptionEditor.tsx` (backlog) — contentEditable + Lucide icons
- `IncidentDescription.tsx` — shadcn/ui Textarea
- `TaskDescription.tsx` (planner) — MentionTextarea (custom)
- `FeatureDescription.tsx` (project) — shadcn/ui Textarea
- `DescriptionTab.tsx` (planner modal) — vanilla `<textarea>` + inline styles

### Compliance Status
| Implementation | ADS Aligned? | Jira Parity | Consolidation | Priority |
|---|---|---|---|---|
| Backlog Description | ❌ NO | ❌ NO | ⚠️ Fragmented | 🔴 HIGH |
| Incident Description | ❌ NO | ❌ NO | ⚠️ Fragmented | 🔴 HIGH |
| Task Description (Planner) | ❌ NO | ❌ NO | ⚠️ Fragmented | 🔴 HIGH |
| Feature Description | ❌ NO | ❌ NO | ⚠️ Fragmented | 🔴 HIGH |
| Modal Description Tab | ❌ NO | ❌ NO | ⚠️ Fragmented | 🔴 HIGH |

---

## COMPONENT AUDIT

### Problem Statement

**Current fragmentation:**
- 5 different UI implementations
- 0 ADS components used (all shadcn/ui or custom)
- No @atlassian packages imported
- Inconsistent styling across hubs
- No unified API or interface contract
- Different features (rich text, mentions, markdown) scattered

**Why this matters:**
1. **Design Debt**: Each hub maintains its own description UX
2. **Maintenance Burden**: 5 code paths to update for consistency changes
3. **Jira Divergence**: Not matching Jira's description editing model
4. **ADS Non-Compliance**: Zero alignment with company design system

---

## ADS COMPONENT MAPPING

### Recommended ADS Component Stack

| ADS Component | Purpose | Current | Replacement |
|---|---|---|---|
| **TextArea** | Base text input | shadcn/ui Textarea | `@atlaskit/textarea` |
| **TextField** | Label + validation wrapper | Custom | `@atlaskit/textfield` |
| **Label** | Accessible field labeling | Missing | `@atlaskit/form` |
| **HelperMessage** | Field helper text | Missing | `@atlaskit/form` |
| **ErrorMessage** | Validation errors | Missing | `@atlaskit/form` |
| **Button** | Save/Cancel/Edit actions | shadcn/ui | `@atlaskit/button` |
| **Icon** | Edit/delete/actions | Lucide | `@atlaskit/icon` |
| **Tooltip** | Inline help | Missing | `@atlaskit/tooltip` |
| **Tag** | Mentions/references | Missing | `@atlaskit/tag` |
| **Editor Core** | Rich text (future) | N/A | `@atlaskit/editor-core` |

### Jira Description Field Model

**Jira provides:**
1. **Rich Text Editor** — full formatting capabilities
2. **Smart Mentions** — @username auto-suggest
3. **Link Inference** — URL → smart cards
4. **Formatting Toolbar** — Bold, Italic, Code, Lists, etc.
5. **Markdown Support** — # headers, ```code```, **bold**, etc.
6. **Version History** — audit trail of changes
7. **Collaborative Mentions** — @team, @domain tags
8. **Edit Mode Toggle** — edit/view switcher with save/cancel

**Current Catalyst gaps:**
- ❌ Rich text formatting (except planner tab which has inline styles)
- ❌ Mention system (only TaskDescription has MentionTextarea)
- ❌ Link inference
- ❌ Markdown support
- ❌ Version history
- ❌ Consistent edit/view modes
- ❌ ADS Form wrapper pattern

---

## ARCHITECTURE: CANONICAL DESCRIPTION FIELD

### Phase 1: ADS Foundation (Week 1)

**Goal:** Build single-source-of-truth description component using ONLY ADS.

#### New Component: `CanonicalDescriptionField`

```typescript
// src/components/shared/CanonicalDescriptionField.tsx
import { TextArea } from '@atlaskit/textarea';
import { Label, HelperMessage, ErrorMessage } from '@atlaskit/form';
import { Button } from '@atlaskit/button';
import EditIcon from '@atlaskit/icon/glyph/edit';
import CheckIcon from '@atlaskit/icon/glyph/check';

interface CanonicalDescriptionFieldProps {
  /** Unique identifier for description (work item ID) */
  workItemId: string;
  /** Work item type: 'task' | 'feature' | 'incident' | 'epic' */
  workItemType: 'task' | 'feature' | 'incident' | 'epic';
  /** Current description value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Submit handler for save operations */
  onSave?: (value: string) => Promise<void>;
  /** Edit mode state */
  isEditing?: boolean;
  /** Toggle edit mode */
  onEditToggle?: (editing: boolean) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Validation error */
  error?: string;
  /** Loading state (during save) */
  isLoading?: boolean;
  /** Required field marker */
  isRequired?: boolean;
  /** Minimum character length */
  minLength?: number;
  /** Maximum character length */
  maxLength?: number;
}

export function CanonicalDescriptionField({
  workItemId,
  workItemType,
  value,
  onChange,
  onSave,
  isEditing = false,
  onEditToggle,
  placeholder = 'Add a description...',
  error,
  isLoading = false,
  isRequired = false,
  minLength,
  maxLength = 10000,
}: CanonicalDescriptionFieldProps) {
  // Implementation
}
```

### Phase 2: Jira Parity Features (Week 2–3)

**Add incrementally:**
1. **Edit Mode Toggle** — view/edit switcher matching Jira UX
2. **Character Counter** — live char count (ADS supports via HelperMessage)
3. **Link Inference** — detect URLs, convert to mentions
4. **Smart Mentions** — @user suggestions (using ADS PopUp + custom render)
5. **Markdown Preview** — toggle between raw/rendered (future)

### Phase 3: Integration Layer (Week 4)

**Hook:** `useCanonicalDescription(workItemId, workItemType)`

```typescript
// src/hooks/useCanonicalDescription.ts
export function useCanonicalDescription(
  workItemId: string,
  workItemType: string
) {
  const queryClient = useQueryClient();
  
  // Fetch description
  const { data: description } = useQuery({
    queryKey: ['description', workItemId],
    queryFn: () => descriptionApi.fetch(workItemId, workItemType),
  });

  // Save mutation
  const { mutate: save, isPending } = useMutation({
    mutationFn: (value: string) =>
      descriptionApi.update(workItemId, workItemType, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['description', workItemId] });
    },
  });

  return { description, save, isPending };
}
```

### Phase 4: Migration Strategy

**Target for replacement:**
1. `src/components/backlog/DetailPanel/DescriptionEditor.tsx` → use CanonicalDescriptionField
2. `src/components/incidents/IncidentDescription.tsx` → use CanonicalDescriptionField
3. `src/modules/planner/components/TaskDetailDrawer/TaskDescription.tsx` → use CanonicalDescriptionField
4. `src/pages/project/components/FeatureDescription.tsx` → use CanonicalDescriptionField
5. `src/components/planner/task-modal/organisms/tabs/DescriptionTab.tsx` → use CanonicalDescriptionField

**Migration sequence:**
- Week 5: Backlog + Incidents (low-risk)
- Week 6: Feature (medium-risk, has mutations)
- Week 7: Planner (high-risk, complex state)

---

## DEPENDENCIES TO ADD

```json
{
  "@atlaskit/textarea": "^3.0.0",
  "@atlaskit/textfield": "^5.0.0",
  "@atlaskit/form": "^9.0.0",
  "@atlaskit/button": "^19.0.0",
  "@atlaskit/icon": "^22.0.0",
  "@atlaskit/tooltip": "^18.0.0",
  "@atlaskit/popup": "^1.0.0",
  "@atlaskit/editor-core": "^195.0.0"
}
```

---

## DESIGN TOKEN ALIGNMENT

### NOCTURNE Dark Mode (ECLIPSE compliance)

All ADS components respect theme tokens. Ensure CSS variables map:

```css
/* Map Catalyst tokens to ADS tokens */
--cp-text-primary → color.text
--cp-bg-page → color.background.neutral
--cp-border-default → color.border
--cp-interact-hover → color.background.neutral.hovered
```

**No inline color overrides.** Use ADS's built-in dark mode support.

---

## JIRA PARITY CHECKLIST

- [ ] **View Mode** — display description as read-only text
- [ ] **Edit Mode** — full textarea with validation
- [ ] **Edit/View Toggle** — pencil icon to switch modes
- [ ] **Save/Cancel Buttons** — appear in edit mode only
- [ ] **Loading State** — spinner during save
- [ ] **Error Display** — ADS ErrorMessage component
- [ ] **Character Counter** — current/max chars
- [ ] **Placeholder Text** — context-aware
- [ ] **Markdown Support** — `**bold**`, `_italic_`, `` `code` ``
- [ ] **Mention Support** — @username suggestions
- [ ] **Link Inference** — auto-linkify URLs
- [ ] **Empty State** — "No description" message
- [ ] **Accessibility** — proper label/ARIA
- [ ] **Mobile Responsive** — works on tablets
- [ ] **Dark Mode** — NOCTURNE compliant

---

## GOVERNANCE

### Strict Rules for Canonical Description Field

1. **ADS-only imports** — no shadcn/ui, no Lucide for this component
2. **Single entry point** — all descriptions use `CanonicalDescriptionField`
3. **Work item type required** — context for schema/API routing
4. **No inline styles** — all via Tailwind/ADS tokens
5. **Version history required** — track all changes (future phase)
6. **Validation via schema** — min/max length, required field logic in database

### Deprecated (To Remove)

- ❌ `shadcn/ui Textarea` (in description context)
- ❌ Lucide formatting icons (use ADS icons)
- ❌ Custom contentEditable divs
- ❌ Scattered validation logic

---

## SUCCESS CRITERIA (Definition of Done)

✅ **100% ADS Component Compliance**
- Zero shadcn/ui imports in description code path
- All visual elements from ADS component library
- All icons from @atlaskit/icon

✅ **100% Jira Feature Parity**
- Matches Jira's description edit/view UX
- Supports same formatting options
- Same character limits and validation

✅ **100% Integration Across Hubs**
- Backlog ✅
- Incidents ✅
- Features ✅
- Planner (TaskDetailDrawer) ✅
- Planner (Modal DescriptionTab) ✅

✅ **Zero Regressions**
- All existing data migrates cleanly
- No loss of description content
- Edit/save workflows unchanged

✅ **NOCTURNE Dark Mode Verified**
- Computed background = `rgb(26, 23, 20)` in DevTools
- Text colors match NOCTURNE palette
- No contrast violations (WCAG AA minimum)

---

## NEXT STEPS

1. **Approve ADS component stack** — confirm @atlaskit packages
2. **Create CanonicalDescriptionField** — Phase 1
3. **Add integration hooks** — Phase 3
4. **Begin migration** — Backlog → Incidents → Feature → Planner
5. **Verify Jira parity** — side-by-side comparison
6. **Remove deprecated components** — cleanup pass

---

## REFERENCE LINKS

- [Atlassian Design System — TextArea](https://atlassian.design/components/textarea)
- [Atlassian Design System — Components](https://atlassian.design/components/)
- [Atlaskit Editor Core](https://atlaskit.atlassian.com/packages/editor/editor-core)
- [Jira Rich Text Editor](https://support.atlassian.com/jira/kb/change-text-custom-field-to-rich-text-editor-in-jira-data-center/)
