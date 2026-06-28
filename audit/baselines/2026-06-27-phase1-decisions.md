# Phase 1 Design Decisions — 2026-06-27

## G1 — Avatar Colors in `FieldsTab.tsx`

**File:** `src/components/workhub/issue-view/FieldsTab.tsx:20`

**Finding:**

```ts
const AVATAR_COLORS = [
  'var(--ds-background-discovery-bold, #6E5DC6)',  // already wrapped ✅
  '#FA8C16',    // bare — Ant Design orange
  '#52C41A',    // bare — Ant Design green
  '#EB2F96',    // bare — Ant Design magenta
  'var(--ds-background-discovery-bold, #6E5DC6)',  // already wrapped ✅
];
```

The three bare hex values (`#FA8C16`, `#52C41A`, `#EB2F96`) are **not** the same semantic as `workstreamColors.ts`. `workstreamColors.ts` uses `--cp-workstream-*` CSS custom-property references (e.g. `var(--cp-workstream-catalyst-primary)`) — these are workstream-area brand colors. The FieldsTab avatar palette is a distinct **user-avatar colour rotation** with no workstream semantic meaning.

**Proposed token mapping:**

| Bare hex | Semantic | Proposed token |
|---|---|---|
| `#FA8C16` | Orange avatar | `var(--ds-background-warning-bold, #FA8C16)` |
| `#52C41A` | Green avatar | `var(--ds-background-success-bold, #52C41A)` |
| `#EB2F96` | Magenta avatar | `var(--ds-background-accent-magenta-bolder, #EB2F96)` |

**Note:** These fallback hex values should remain as-is in the `var()` fallback (no ADS canonical mapping for Ant Design orange/green/magenta). The palette is a rotation for decorative use, not status.

---

## G2 — Workflow Border in `CatalystWorkflowBuilder.tsx`

**File:** `src/pages/admin/workflows/CatalystWorkflowBuilder.tsx:213`

**Finding:**

```tsx
// StartNode component
<div style={{
  background: 'var(--ds-background-neutral-bold, #44526E)',
  border: `2px solid #6B7FA3`,   // ← bare hex
  color: 'var(--ds-border, #DFE1E6)',
}}>
  START
</div>
```

`#6B7FA3` is the **border** of the `StartNode` circle in the workflow canvas. It is not a text color. The element is the circular START node in a React Flow workflow diagram. Surrounding border colours (the 11 other node types) are already wrapped.

**Proposed token mapping:**

`#6B7FA3` is a medium-blue-grey border — semantically a `border-bold` or a muted informational border.

```tsx
border: `2px solid var(--ds-border-bold, #6B7FA3)`
```

ADS `--ds-border-bold` (#8590A2 light / auto-resolved in dark) is the closest match. The original `#6B7FA3` is slightly more blue than `#8590A2`; the difference is visually negligible and semantically equivalent for a non-interactive node border.

---

## G3 — Phase Delivery Color in `StageOverviewWidget.tsx`

**File:** `src/components/product-dashboard/widgets/StageOverviewWidget.tsx:14`

**Finding:**

```ts
// Phase colour system
const PHASE_DEMAND   = 'var(--ds-background-information-bold, #0C66E4)';  // wrapped ✅
const PHASE_APPROVAL = '#F5A623';    // bare — orange
const PHASE_DELIVERY = '#8A7CFF';   // bare — purple
const PHASE_CLOSURE  = 'var(--ds-background-success-bold, #1F845A)';     // wrapped ✅
```

The `PHASE_DELIVERY` constant (`#8A7CFF`) is a **different semantic** from the `workstreamColors.ts` entries. `workstreamColors.ts` uses `--cp-workstream-*` tokens and references workstream-area palettes (Catalyst Indigo, Data & AI Purple, etc.). The `#8A7CFF` in StageOverviewWidget represents a **lifecycle phase** (Delivery stage of a process), not a workstream brand color.

The same hex `#8A7CFF` is also used in `WhoCarriesWhatWidget` as a chart color, where the 05_COMPARISON doc confirms it was wrapped to `var(--ds-chart-purple-bold, #8A7CFF)` in PR5. These are the same hex, different semantic context.

**Proposed token mapping:**

```ts
const PHASE_APPROVAL = 'var(--ds-background-warning-bold, #F5A623)';
const PHASE_DELIVERY = 'var(--ds-background-discovery-bold, #8A7CFF)';
```

`--ds-background-discovery-bold` (#6E5DC6 canonical, but #8A7CFF works as fallback) is the correct ADS semantic for a "discovery/planning phase" purple. The phase-delivery concept in a lifecycle widget maps naturally to discovery-bold (planning/in-flight). The WhoCarriesWhatWidget precedent using `chart-purple-bold` is a data-viz context; for a lifecycle-phase pill `background-discovery-bold` is more correct.

---

## G4 — Attention Background in `TimelineView.tsx`

**File:** `src/features/all-releases/components/TimelineView.tsx:38`

**Finding:**

```ts
const VERSION_BADGE_COLORS: Record<HealthLevel, { bg: string; text: string }> = {
  critical:  { bg: 'var(--ds-background-danger, #fef2f2)', text: 'var(--ds-text-danger, #ef4444)' },
  at_risk:   { bg: 'var(--ds-background-warning, #FFF7D6)', text: 'var(--ds-background-warning-bold, #f97316)' },
  attention: { bg: '#fefce8', text: 'var(--ds-text-warning, #974F0C)' },   // ← bare bg hex
  healthy:   { bg: 'var(--ds-background-success, #DFFCF0)', text: 'var(--ds-text-success, #16a34a)' },
};
```

`#fefce8` is the **background** of the `attention` health-level badge in the Timeline View release bar. It applies to the badge wrapper `<div>` background. The paired text color is already wrapped: `var(--ds-text-warning, #974F0C)` — so the semantic pairing is clear.

**Proposed token mapping:**

`#fefce8` is Tailwind `yellow-50` — a very pale yellow, semantically equivalent to ADS `--ds-background-warning`:

```ts
attention: { bg: 'var(--ds-background-warning, #FFF7D6)', text: 'var(--ds-text-warning, #974F0C)' },
```

The existing ADS warning background (`--ds-background-warning`, fallback `#FFF7D6`) is semantically correct for an "attention" health badge, and the text token already matches. Using the same token as `at_risk` bg is acceptable here — the visual distinction between "at_risk" and "attention" is carried by the text label and icon, not the bg shade.

---

## C1 — Priority Palette Conflict

### Both palettes side by side

| Priority | FieldsTab.tsx (`PRIORITY_COLORS`) | CanonicalFilter.tsx (`priorityIcon()`) |
|---|---|---|
| **Highest** | `var(--ds-text-danger, #EF4444)` | `var(--ds-text-danger, #CD1316)` |
| **High** | `var(--ds-background-warning-bold, #E2B203)` | `var(--ds-background-danger-bold, #E15D31)` |
| **Medium** | `var(--ds-text-brand, #3B82F6)` | `var(--ds-background-warning-bold, #E4A11B)` |
| **Low** | `var(--ds-text-success, #22C55E)` | `var(--ds-link, #2898BD)` |
| **Lowest** | `var(--ds-text-subtlest, #8C8F96)` | `var(--ds-border-focused, #388BFF)` |

**Conflicts:** Every priority level disagrees except the token category pattern (`--ds-text-*` vs `--ds-icon-*` tinting). The fallback hex values and token choices differ on all 5 levels.

### Recommendation

**Adopt the CanonicalFilter.tsx palette as canonical.** Reasons:

1. `CanonicalFilter.tsx` maps directly to Atlaskit priority icon components (`@atlaskit/icon/core/priority-*`) and applies the color as an icon tint — this is the Jira-standard pattern.
2. The FieldsTab palette mixes semantic categories incorrectly: `High` mapped to `background-warning-bold` (should be danger), and `Medium` mapped to `text-brand` (should be warning).
3. CanonicalFilter's `Highest → text-danger`, `High → background-danger-bold`, `Medium → background-warning-bold` follows the Jira-standard severity gradient (danger → danger-bold → warning).
4. `Low → link` (blue) and `Lowest → border-focused` (light blue) match Jira's deprioritized visual treatment.

**Canonical mapping going forward:**

| Priority | Token | Fallback |
|---|---|---|
| Highest | `var(--ds-text-danger)` | `#CD1316` |
| High | `var(--ds-background-danger-bold)` | `#E15D31` |
| Medium | `var(--ds-background-warning-bold)` | `#E4A11B` |
| Low | `var(--ds-link)` | `#2898BD` |
| Lowest | `var(--ds-text-subtlest)` | `#8C8F96` |

FieldsTab `PRIORITY_COLORS` should be updated to match CanonicalFilter in Phase 2.
