# CATALYST CANONICAL RULEBOOK

> Catalyst-specific rules enforced on every session.
> These rules are non-negotiable unless Vikram explicitly overrides in writing.

---

## RULE 1 — CANONICAL COMPONENT FIRST

Catalyst is canonical-component-first.

The canonical hierarchy:

```
1. Existing Catalyst canonical component
2. Existing Catalyst wrapper
3. Catalyst Storybook component (query catalyst-storybook MCP)
4. Atlassian Design System primitive (@atlaskit/*)
5. Hand-rolled component — ONLY with explicit written approval
```

"Overkill" is not evidence of unsuitability. Prove unsuitability with API and usage evidence. Log in Karpathy loop.

---

## RULE 2 — JIRATABLE FIRST FOR TABLES AND LISTS

**JiraTable is mandatory for Jira/work-item tables and the first candidate for enterprise admin lists.**

Before building any table or list:
1. Prove whether `JiraTable` fits.
2. If JiraTable does not fit: document why (API evidence, missing props, incompatible data shape).
3. Only then consider another Catalyst table component.
4. Never use custom `<table>`, CSS grid table, or flex table without explicit written approval.

JiraTable file: `src/components/jira/JiraTable.tsx` (verify path before referencing).

---

## RULE 3 — HAND-ROLLED UI IS REJECTED BY DEFAULT

**Hand-rolled UI is rejected by default.**

Banned custom implementations:
- Tables (use JiraTable or canonical Catalyst table)
- Menus (use @atlaskit/dropdown-menu or Catalyst wrapper)
- Dropdowns (use @atlaskit/select or Catalyst wrapper)
- Modals (use @atlaskit/modal-dialog or Catalyst modal wrapper)
- Drawers (use @atlaskit/drawer or Catalyst drawer wrapper)
- Tabs (use @atlaskit/tabs or Catalyst tabs wrapper)
- Badges (use @atlaskit/badge or Catalyst badge component)
- Lozenges (use @atlaskit/lozenge)
- Status pills (use Lozenge or canonical Catalyst status component)
- Avatars (use @atlaskit/avatar or Catalyst avatar canonical)
- Date fields (use @atlaskit/datetime-picker or Catalyst date field)
- Inline edit fields (use @atlaskit/inline-edit or Catalyst wrapper)
- Rich text editors (use existing Catalyst TipTap integration)
- Tooltips (use @atlaskit/tooltip)
- Spinners (use @atlaskit/spinner)
- Empty states (use @atlaskit/empty-state or Catalyst EmptyState)
- Sidebars (use existing Catalyst sidebar canonical)
- Navigation items (use existing Catalyst nav canonical)
- Permission matrices (use existing Catalyst PermissionsMatrix or JiraTable)
- Action menus (use @atlaskit/dropdown-menu)

Two failed correction loops → rebuild from canonical or stop.

---

## RULE 4 — ADS TOKENS ONLY

**Bare colors are banned.**

Banned:
- Hex colors (`#E9F2FE`, `#fff`, `#1a1a1a`)
- Raw `rgb()`, `rgba()`, `hsl()`
- Lime, bright green, yellow/orange warning slabs
- Rainbow action colors on non-AI controls
- Tailwind color utilities (`bg-slate-100`, `text-gray-500`, `border-gray-200`)
- Custom color constants (`const PRIMARY_BLUE = '#0052CC'`)
- Inline `style={{ color: '#xxx' }}`

Allowed:
- `var(--ds-text)`, `var(--ds-background-neutral)`, `var(--ds-border)`, etc.
- ADS `token()` helper from `@atlaskit/tokens`
- Canonical Catalyst component-owned colors (do not override these)
- AI CTA rainbow only on approved canonical components (`AIIntelligenceButton`, `CatyRainbowCTA`)

---

## RULE 5 — NO CUSTOM SPACING OR TYPOGRAPHY

Spacing:
- Use ADS spacing tokens: `var(--ds-space-*)` or `token('space.*')`
- No custom `px` values except within explicitly approved canonical components

Typography:
- Use ADS type tokens or `@atlaskit/primitives/text`
- No custom font-size, font-weight, line-height inline styles

---

## RULE 6 — RBAC / ACCESS MANAGEMENT MENTAL MODEL

All RBAC and access management UI must respect the existing Catalyst Access Management mental model:

- Roles → Permissions (not Users → Permissions directly)
- User assignment is secondary to role definition
- Modal launchers must open correctly even if save/write is disabled pending migration
- Never show a half-wired permission matrix without a clear loading/empty/error state

---

## RULE 7 — MODAL LAUNCHERS MUST OPEN

If a modal is wired in Plan Lock, it must open on click.

Write flow inside the modal may be disabled (disabled button, tooltip explanation) if the backend is not ready. But the modal must render and open.

Never ship a UI that appears to have a button but nothing happens on click.

---

## RULE 8 — SCREENSHOT SIGNOFF IS MANDATORY

**Screenshots are mandatory for UI/UX acceptance.**

No UI-heavy commit without screenshots accepted by Vikram.

Screenshots do not prove functionality. DOM probes + API responses + test output prove functionality.

---

## RULE 9 — ZERO-ASSUMPTION DATA RENDERING

When data is unknown, uncertain, or missing — render nothing (dash, empty state, no icon).

**Never render a domain-specific default that is factually wrong.**

```tsx
// BANNED
type={r.parent_issue_type || 'Story'}
const status = row.status || 'todo'

// CORRECT
r.parent_issue_type ? <JiraIssueTypeIcon type={r.parent_issue_type} /> : null
const status = row.status ?? null
```

---

## RULE 10 — DARK MODE: NO LIGHT METAPHORS

Dark mode is fully supported. Do not ship light metaphors into dark mode:
- No white pills / cards with box-shadow elevation in dark
- No neutral palette that inverts (white background → black text) in dark
- Test dark mode by reloading the app in dark mode (not runtime toggle)

---

## RULE 11 — ICON CONTRACT

| Context | Icon |
|---|---|
| User avatars | Face avatar + name tooltip |
| Projects | ProjectIcon |
| Work items (issues, tasks) | JiraIssueTypeIcon |

Do not use generic icons where type-specific icons exist.

---

## RULE 12 — CANONICAL SCREEN REUSE

"Look exactly like X" means: **reuse X's component via adapter**, not hand-rebuild X.

Before building a new screen, prove whether an existing Catalyst route/page covers the UX. Log in Karpathy loop.

---

## PROVING UNSUITABILITY

If a canonical component appears unsuitable, you must provide:

1. Component name and file path
2. API signature (props/interface)
3. Exact reason it does not fit (missing prop, wrong data shape, incompatible layout)
4. Screenshot evidence (if visual)
5. Alternative proposed (must be next in canonical hierarchy)

"It's too complex" is not evidence. "It requires X prop which does not exist in its API" is evidence.
