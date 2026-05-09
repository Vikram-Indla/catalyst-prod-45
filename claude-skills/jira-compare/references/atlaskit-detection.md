# Atlaskit Detection — DOM Fingerprints

Use this to classify any element as Atlaskit vs shadcn/Radix vs Tailwind-bespoke vs raw HTML.
The goal is never ambiguous: every element in scope gets a concrete label, and that label
drives the P0/P1 classification in the audit.

## 1. Decision tree (apply in order; first match wins)

1. **Is it inside `<div id="atlaskit-portal-container">` or has `data-atlaskit-portal-container`?**
   → Atlaskit portalled overlay (modal, popup, dropdown, tooltip). Record the portal container it came from.

2. **Does the element (or its closest meaningful ancestor) carry `data-ds-*` or `data-testid` matching an Atlaskit convention?**
   - `data-testid="form-field-*"` → `@atlaskit/form` field wrapper
   - `data-testid="select--*"` / `react-select-*-*` → `@atlaskit/select` (wraps react-select)
   - `data-testid="textfield-*"` → `@atlaskit/textfield`
   - `data-testid="textarea-*"` → `@atlaskit/textarea`
   - `data-testid="modal-dialog--*"` or `role="dialog"` inside the portal container → `@atlaskit/modal-dialog`
   - `data-testid="lozenge--*"` or a `<span>` with `aria-label` and one of the 5 Jira status backgrounds → `@atlaskit/lozenge`
   - `data-testid="dropdown-menu--*"` / `data-testid="dropdown-menu-trigger"` → `@atlaskit/dropdown-menu`
   - `data-testid="tabs--*"` / `role="tablist"` with Atlaskit class prefixes → `@atlaskit/tabs`
   - `data-testid="breadcrumbs--*"` → `@atlaskit/breadcrumbs`
   - `data-testid="user-picker*"` → `@atlaskit/user-picker`
   → Atlaskit, and the specific package is named.

3. **Does the element have an Emotion class (`class="css-<hash>"`) at the root level AND no `data-radix-*`?**
   → Likely Atlaskit. Record as "Atlaskit (unverified — Emotion class only)" and look for a sibling `data-testid` to confirm.

4. **Does the element carry `data-radix-*` or `data-state="open|closed"` with `data-slot`?**
   → Radix / shadcn. This is a P0 if Atlaskit has a primitive for the role.

5. **Does the class attribute contain a long Tailwind utility chain (`flex`, `items-*`, `gap-*`, `px-*`, `py-*`, `text-*`, `font-*`, `rounded-*`, `border*`, `bg-*` in sequence) AND no vendor `data-*`?**
   → Tailwind-bespoke. P0 if Atlaskit has a primitive for the role.

6. **None of the above?**
   → Raw HTML element styled via global CSS. Treat as Tailwind-bespoke for P0 classification — if Atlaskit has a primitive, this is wrong.

## 2. Role → Atlaskit package lookup

When you've identified an element's role in scope, here's the canonical target:

| Observed role | Target Atlaskit package | Notes |
|---------------|-------------------------|-------|
| Primary CTA button | `@atlaskit/button/new` | `<Button appearance="primary">`. Not old `@atlaskit/button` — v2 is required. |
| Subtle/ghost button | `@atlaskit/button/new` | `appearance="subtle"` |
| Icon-only button | `@atlaskit/button/new` | `<IconButton icon={...} label="..."/>` |
| Text input, single line | `@atlaskit/textfield` | |
| Text input, multi-line | `@atlaskit/textarea` | |
| Select (fixed options) | `@atlaskit/select` | Wraps react-select. For async/user search use `isAsync`. |
| User picker / assignee | `@atlaskit/user-picker` | Distinct package; has avatar chips. |
| Checkbox | `@atlaskit/checkbox` | |
| Radio | `@atlaskit/radio` | `<RadioGroup>` parent. |
| Toggle / switch | `@atlaskit/toggle` | |
| Date picker | `@atlaskit/datetime-picker` | `DatePicker` export. |
| Calendar grid | `@atlaskit/calendar` | Low-level; use DatePicker unless custom. |
| Modal dialog | `@atlaskit/modal-dialog` | `<ModalDialog>` + `<ModalHeader>` etc. |
| Right-panel drawer | `@atlaskit/drawer` | |
| Popover / inline dialog | `@atlaskit/popup` | Newer. `@atlaskit/inline-dialog` is legacy. |
| Dropdown menu | `@atlaskit/dropdown-menu` | |
| Tabs | `@atlaskit/tabs` | |
| Breadcrumbs | `@atlaskit/breadcrumbs` | |
| Page header | `@atlaskit/page-header` | |
| Status pill | `@atlaskit/lozenge` | Five appearances: default/success/inprogress/moved/removed. |
| Count badge | `@atlaskit/badge` | |
| Avatar (single) | `@atlaskit/avatar` | |
| Avatar group | `@atlaskit/avatar-group` | |
| Tooltip | `@atlaskit/tooltip` | |
| Toast / flag | `@atlaskit/flag` | Use `@atlaskit/flag-group` as manager. |
| Inline system message | `@atlaskit/section-message` | |
| Empty state | `@atlaskit/empty-state` | |
| Loading spinner | `@atlaskit/spinner` | |
| Progress bar | `@atlaskit/progress-bar` | |
| Step tracker | `@atlaskit/progress-tracker` | |
| Table (simple) | `@atlaskit/table-tree` | |
| Table (sortable, paginated) | `@atlaskit/dynamic-table` | |
| Rich-text editor | `@atlaskit/editor-core` | Heavy; only for real editor surfaces. |
| Form scaffolding | `@atlaskit/form` | `<Form>`, `<Field>`, `<HelperMessage>`, `<ErrorMessage>`. |
| Layout primitives | `@atlaskit/primitives` | `Box`, `Stack`, `Inline`, `Grid` — replaces Tailwind flex/gap/padding. |
| Text / heading | `@atlaskit/heading`, `@atlaskit/primitives`'s `<Text>` | Never raw `<h1>..<h6>` in scope. |
| Design tokens | `@atlaskit/tokens` | `token('color.background.neutral')`, CSS var `var(--ds-background-neutral)`. |
| Icons | `@atlaskit/icon`, `@atlaskit/icon-lab` | Never Lucide for work-item-type icons (CLAUDE.md §11). |

## 3. Token mapping — Catalyst `--cp-*` vs Atlaskit `--ds-*`

These are NOT interchangeable. Part of the audit is calling out when Catalyst uses its own
token for a role Atlaskit has a canonical token for.

| Semantic role | Atlaskit token | Catalyst legacy token |
|---------------|----------------|------------------------|
| Page background | `--ds-surface` | `--cp-bg-page` |
| Card/panel background | `--ds-surface-raised` | `--cp-bg-surface` |
| Subtle section | `--ds-surface-sunken` | `--cp-bg-overlay` |
| Input background | `--ds-background-input` | `--cp-bg-inset` |
| Default border | `--ds-border` | `--cp-border-default` |
| Strong border | `--ds-border-bold` | `--cp-border-strong` |
| Focus ring | `--ds-border-focused` | `--cp-border-focus` |
| Primary text | `--ds-text` | `--cp-text-primary` |
| Secondary text | `--ds-text-subtle` | `--cp-text-secondary` |
| Muted text | `--ds-text-subtlest` | `--cp-text-muted` |
| Disabled text | `--ds-text-disabled` | `--cp-text-disabled` |
| Inverse text | `--ds-text-inverse` | `--cp-text-inverse` |
| Primary brand | `--ds-background-brand-bold` | `--cp-primary-60` |
| Hover overlay | `--ds-background-neutral-hovered` | `--cp-interact-hover` |
| Selected overlay | `--ds-background-selected` | `--cp-interact-selected` |
| Pressed overlay | `--ds-background-neutral-pressed` | `--cp-interact-press` |

Rule of thumb: if the scoped surface is being migrated to Atlaskit, the new code uses `--ds-*`
or `token()` from `@atlaskit/tokens`. Leaving `--cp-*` in the migrated file is a P1 finding.

## 4. What you can skip

- The CSS variable `--ds-*` vs `--cp-*` distinction doesn't apply when NOCTURNE dark mode is in
  effect and the surface is legacy. Note it in the report, but don't blow the finding up to P0
  unless the surface is explicitly in scope for the current audit.
- Atlaskit version numbers don't matter for the audit — name the package, not the version.
  The fix plan handles version selection.

## 5. Typography sweep — how Jira actually sets fonts

Jira sets typography via two mechanisms only:

1. `@atlaskit/heading` for headings (`<Heading size="xxlarge" | "xlarge" | "large" | "medium" | "small" | "xsmall" | "xxsmall">`).
2. `@atlaskit/primitives`'s `<Text>` for body copy (`<Text size="large" | "medium" | "small">` or `as="strong"` for emphasis).

If Catalyst sets font-size/weight/family via Tailwind utilities (`text-sm font-semibold` etc.) on
a surface in scope, that is a P0 — Atlaskit has a primitive for this exact role.

Jira's font stack (as of 2026):
```
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
Ubuntu, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif
```

Catalyst uses Sora / Inter / JetBrains Mono. The audit should flag the font-family mismatch
for every text role in the sweep, and the fix plan should propose either:

- (Preferred) Use `@atlaskit/heading` and `<Text>` on the migrated surface, inheriting Atlaskit's
  system font stack.
- (Acceptable only if product-level decision) Override Atlaskit's font stack via a theme at the
  app root — but this is a platform decision, not a per-surface one, and must be approved by
  Vikram before shipping.
