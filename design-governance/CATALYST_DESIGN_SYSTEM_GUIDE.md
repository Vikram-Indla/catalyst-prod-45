# Catalyst Design System — Designer Setup Guide

**Figma file:** https://www.figma.com/design/mtpXVYTB4dSPPMmyWSPfoY  
**Storybook:** https://main--6a22d4960f743958c893234b.chromatic.com  
**ADS Reference:** https://atlassian.design/

---

## File Structure

| Page | Purpose |
|---|---|
| 🎨 Tokens | All `--ds-*` + `--cp-*` color, typography, spacing tokens |
| 🧩 Components | Every `@atlaskit/*` component — props, states, usage rules |
| 🔗 @atlaskit Mapping | Figma component → npm package cross-reference |
| 📋 Handoff Template | Spec template — duplicate for each feature |
| 📖 Setup Guide | This guide in Figma form |

---

## Token Naming Convention

### Two-layer system

```
--ds-*   →  Atlassian Design System canonical tokens
--cp-*   →  Catalyst aliases (always reference --ds-* as fallback)
```

### Pattern

```
--ds-[category]-[variant]-[modifier]
  e.g. --ds-background-information-bold
  e.g. --ds-text-subtle
  e.g. --ds-border-focused

--cp-[namespace]-[concept]
  e.g. --cp-color-teal
  e.g. --cp-status-passed-bg
```

### Banned in all Figma → Code

- ❌ Hardcoded hex (`#E9F2FE`) — always use a `--ds-*` token
- ❌ Non-ADS fonts — only `Atlassian Sans`, `Atlassian Mono`, `Charlie Display`
- ❌ Non-4px spacing — only `4 / 8 / 12 / 16 / 24 / 32 / 40 / 48px`
- ❌ Tailwind color classes (`text-slate-500`, `bg-gray-100`)
- ❌ `text-transform: uppercase` — sentence case everywhere

---

## Component Library Access

All canonical Catalyst components live in:

1. **This Figma file → 🧩 Components page** — visual reference + props + states
2. **Catalyst Storybook** — authoritative interactive reference
3. **`src/components/shared/`** — codebase implementations

### Reuse Rule (P0 — Non-Negotiable)

**Before designing any UI element:**

1. Check 🧩 Components page
2. Check Storybook
3. If it exists → use it exactly, no visual deviations without Vikram approval
4. If it doesn't exist → ask Vikram before creating custom

### Never redesign these canonical components

| Need | Use |
|---|---|
| Work item table | `JiraTable` |
| Status badge | `CatalystStatusPill` |
| Work item type icon | `JiraIssueTypeIcon` |
| Detail view shell | `CatalystViewBase` |
| Sidebar field rows | `CatalystSidebarDetails` |
| Click-to-edit field | `EditableAssignee` / `EditablePriority` / `makeDateEditCell` |
| Toast notification | `@atlaskit/flag` |
| AI CTA | `AIIntelligenceButton` / `CatyRainbowCTA` |

---

## Handoff Spec Process

### Steps

1. **Duplicate** the `📋 Handoff Template` frame in this Figma file
2. **Rename** it: `[TICKET-KEY] [Feature Name]`
3. **Fill all 6 sections:**
   - Components Used
   - Design Tokens
   - States & Interactions
   - Accessibility (WCAG 2.1 AA)
   - Jira Parity Notes
   - Data & API
4. **Run design-critique:** `/design-critique` in Claude Code
5. **Fix all P0 + P1** findings
6. **Tag engineer** in Jira with Figma link

### Blocked handoff criteria

Do NOT send to engineering if:

- ❌ Any spec section incomplete
- ❌ Hardcoded hex colors used
- ❌ Non-ADS fonts or non-grid spacing
- ❌ No jira-compare run logged
- ❌ Unresolved P0 design-critique findings

---

## Enterprise UI Rules

Catalyst is an enterprise work-management platform. Before designing any animation or effect, ask: **Does Jira, Salesforce, Workday, or ServiceNow do this?** If no → stop and ask Vikram.

### Permanently banned

- ❌ Spinning/rotating containers (text or buttons must never rotate)
- ❌ Animated conic-gradient borders
- ❌ Pulsing glows, neon outlines, particle effects
- ❌ Rainbow borders on non-AI buttons
- ❌ Uppercase labels anywhere

### AI CTA exception (static only)

A **static** (non-animated) rainbow border is allowed **only** on:
- `AIIntelligenceButton`
- Ask Caty surfaces
- `CatyRainbowCTA`

Never on generic buttons.

### Loading states

Use `@atlaskit/spinner` — `size="small"` + `appearance="invert"` inside buttons.  
Never custom spinners, never animated borders as loading indicators.

---

## Work Item Type Icons

Every work item type icon **must** use `JiraIssueTypeIcon` with the exact `type` string:

| Type | `type` prop |
|---|---|
| Story | `'Story'` |
| Epic | `'Epic'` |
| Feature | `'Feature'` |
| Task | `'Task'` |
| Sub-task | `'Sub-task'` |
| QA Bug / Defect | `'QA Bug'` or `'Defect'` |
| Production Incident | `'Production Incident'` |
| Change Request | `'Change Request'` |
| Business Request | `'Business Request'` |
| Business Gap | `'Business Gap'` |

Never use colored dots, colored squares, or custom SVG for type indicators.

---

## Contact

Questions about design system → tag **Vikram Indla** in Jira or Slack.  
Questions about component implementation → file a Jira ticket and link the Figma spec.
