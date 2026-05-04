# Catalyst Design System — Migration Plan

> **Goal:** Replace `@/components/ui/*` (the existing shadcn/Radix layer) with `@/design-system/*` (Atlassian-shaped, Catalyst-skinned) — component-by-component, without breaking the app.

## TL;DR

| | |
|---|---|
| **Components migrated** | 8 (Button, TextField, Select, Checkbox, Radio, Modal, SectionMessage, Tabs) |
| **Existing `ui/` modules to replace** | 86 files |
| **Largest blast radius** | `@/components/ui/button` — ~1,072 importing files |
| **Recommended approach** | Codemods + adapter shims, **not** manual rewrites |
| **Phasing** | 4 phases over 4–6 sprints |
| **Coexistence** | Both layers ship side-by-side until each component is fully cut over |

## 1. Recommendations

### 1.1 Don't replace files — replace imports

Manually rewriting ~1,000 button call-sites is a non-starter. Instead:

1. Keep the new design system at `@/design-system` (already done).
2. For each component being migrated, write a **jscodeshift / ts-morph codemod** that rewrites:
   - Import path: `@/components/ui/button` → `@/design-system`
   - Prop names: `variant="default"` → `appearance="default"`, `variant="destructive"` → `appearance="danger"`, `disabled` → `isDisabled`, `loading` → `isLoading`, `leftIcon` → `iconBefore`, `rightIcon` → `iconAfter`, `size="sm"` → `spacing="compact"`
   - Component names if needed (e.g. `<Dialog>` → `<Modal>`, `<DialogTitle>` → `<ModalTitle>`)
3. Land the codemod, run it on a feature branch, eyeball a sample of diffs, then merge.

Sketch of a Button codemod (jscodeshift):

```js
// codemods/button-to-ds.js
module.exports = function transform(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // 1. Rewrite the import source
  root
    .find(j.ImportDeclaration, { source: { value: "@/components/ui/button" } })
    .forEach((p) => (p.value.source.value = "@/design-system"));

  // 2. Rewrite Button props
  root.findJSXElements("Button").forEach((p) => {
    p.value.openingElement.attributes.forEach((attr) => {
      if (attr.name?.name === "variant") {
        attr.name.name = "appearance";
        if (attr.value?.value === "destructive") attr.value.value = "danger";
      }
      if (attr.name?.name === "disabled") attr.name.name = "isDisabled";
      if (attr.name?.name === "loading") attr.name.name = "isLoading";
      if (attr.name?.name === "leftIcon") attr.name.name = "iconBefore";
      if (attr.name?.name === "rightIcon") attr.name.name = "iconAfter";
      if (attr.name?.name === "size") {
        attr.name.name = "spacing";
        if (attr.value?.value === "sm") attr.value.value = "compact";
        if (attr.value?.value === "default") attr.value.value = "default";
      }
    });
  });

  return root.toSource({ quote: "double" });
};
```

### 1.2 Use adapter shims for irreducible API gaps

Some components have shapes that don't translate 1:1. Ship a tiny shim at `@/components/ui/button` that re-exports the new component with its old API:

```ts
// src/components/ui/button.tsx (after migration)
import { Button as DSButton, type ButtonProps as DSButtonProps } from "@/design-system";

export interface ButtonProps extends Omit<DSButtonProps, "appearance" | "spacing" | "isDisabled" | "isLoading"> {
  variant?: "default" | "primary" | "secondary" | "ghost" | "outline" | "danger" | "destructive" | "success" | "ai" | "link";
  size?: "xs" | "sm" | "default" | "lg" | "icon" | "icon-sm" | "icon-xs";
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT: Record<NonNullable<ButtonProps["variant"]>, DSButtonProps["appearance"]> = {
  default: "default", primary: "primary", secondary: "default",
  ghost: "subtle", outline: "default",
  danger: "danger", destructive: "danger",
  success: "primary", // map to primary, lose the green
  ai: "discovery", link: "link",
};

const SIZE: Record<NonNullable<ButtonProps["size"]>, DSButtonProps["spacing"]> = {
  xs: "compact", sm: "compact", default: "default", lg: "default",
  icon: "default", "icon-sm": "compact", "icon-xs": "compact",
};

export const Button = ({ variant = "default", size = "default", loading, disabled, leftIcon, rightIcon, ...rest }: ButtonProps) => (
  <DSButton
    appearance={VARIANT[variant]}
    spacing={SIZE[size]}
    isLoading={loading}
    isDisabled={disabled}
    iconBefore={leftIcon}
    iconAfter={rightIcon}
    {...rest}
  />
);
```

This lets you cut over **800 files in one PR** by changing the shim, then mop up call-sites with the codemod over time.

### 1.3 Visual regression before, during, after

The existing app uses Catalyst V5 colors (blue brand, teal accents, AI purple). The new design system maps to the *same* CSS variables, so the visual diff should be subtle. To prove that:

1. Take Percy / Chromatic snapshots of the top 30 routes today.
2. Land the design system + first codemod (Button) on a branch.
3. Re-snapshot. Approve diffs that are intentional, file bugs for the rest.
4. Repeat per component.

If you don't have snapshot infra, a poor-man's version: take screenshots of the showcase page (`/design-system`) and any 5 high-traffic pages before and after each migration. Eyeball.

### 1.4 Don't migrate everything

Some `ui/` modules are not Atlassian primitives — they're Catalyst-specific (`AIIntelligenceButton`, `CatalystOwnerAvatar`, `BusinessOwnerPicker`, `LookupSelect`, `unified-toolbar`, `primary-search-row`, `premium-card`, `gold-link`). These should stay as Catalyst app components and be **rebuilt on top of** the new design system, not migrated by codemod.

## 2. Component-by-component plan

Mapping of `@/components/ui/*` → `@/design-system/*`. **File count** is approximate importing-file count; * indicates "very high — over default Grep limit".

### Phase 1 — Foundations (this PR)

| `@/components/ui/*` | Replace with | API delta | Files | Effort |
|---|---|---|---|---|
| `button` | `Button` | `variant`→`appearance`, `size`→`spacing`, `disabled/loading/leftIcon/rightIcon` → `is*`/`iconBefore`/`iconAfter` | ~1072 | Codemod + shim |
| `input` | `TextField` + `Field` | wrap in `<Field label>` for labelling, `disabled`→`isDisabled` | * | Codemod + shim |
| `select` | `Select` | switch from `<Select.Item>` composition to `options=[]` array; OR keep composition variant in phase 2 | ~196 | **Manual** for first ~10 call-sites, then codemod |
| `checkbox` | `Checkbox` | `checked`/`onCheckedChange` → `isChecked`/`onChange` | ~25 | Codemod |
| `radio-group` | `RadioGroup` | switch from composition to `options=[]` | 0 | Codemod (none needed) |
| `dialog` + `ui/Modal` | `Modal` + `Modal*` parts | `open/onOpenChange` → `isOpen/onClose`; `<DialogTitle>` → `<ModalTitle>` | * | Codemod + shim |
| `alert` | `SectionMessage` | new `appearance` enum; `title` becomes prop, body becomes children | 0 | Codemod (none needed) |
| `tabs` | `Tabs`/`TabList`/`Tab`/`TabPanel` | switch from `value=string` to `selected=number` (or use `TabsWithPanels` for new code) | ~97 | **Manual** — small enough |

### Phase 2 — Atlaskit "Tier 1" (next ~3 sprints)

| `ui/*` | DS component | Notes |
|---|---|---|
| `card` | `Card` | New DS component; appearance: "raised" \| "outlined" |
| `badge` + `StatusBadge` | `Lozenge` | Atlaskit calls these "lozenges"; appearances: `default`, `inprogress`, `success`, `removed`, `moved`, `new` |
| `StatusLozenge` | `Lozenge` | Same as above — collapse two into one |
| `tooltip` | `Tooltip` | Wrap Radix tooltip with Atlaskit API |
| `popover` | `Popover` | Wrap Radix popover; `placement` → Atlaskit `position` enum |
| `dropdown-menu` | `DropdownMenu` | Big API; ship `DropdownItem`, `DropdownItemGroup`, `DropdownItemCheckbox` |
| `switch` | `Toggle` | `checked` → `isChecked` |
| `textarea` | `TextArea` | Mirrors TextField API but `<textarea>` |
| `avatar` | `Avatar` + `AvatarGroup` | Atlaskit: `size="xsmall"\|"small"\|"medium"\|"large"`, presence/status indicators |
| `progress` | `ProgressBar` | `appearance="success"\|"discovery"`; `value` 0–1 |
| `skeleton` | `Skeleton` | Trivial wrapper |
| `separator` | `Separator` | Trivial wrapper |
| `scroll-area` | `ScrollArea` | Atlaskit doesn't ship one; keep ours but match token usage |
| `accordion` | `Accordion` | `<Accordion><AccordionItem><AccordionTrigger><AccordionContent>` |
| `collapsible` | covered by `Accordion` | Delete after migration |
| `EmptyState` | `EmptyState` | Already exists; add `image`, `headingLevel`, `primaryAction`, `secondaryAction` props per Atlaskit |
| `breadcrumb` | `Breadcrumbs` + `BreadcrumbsItem` | |
| `pagination` | `Pagination` | `pages`, `selectedIndex`, `onChange` |

### Phase 3 — Atlaskit "Tier 2" (specialty)

| `ui/*` | DS component | Notes |
|---|---|---|
| `toast` + `sonner` + `toaster` + `CatalystToast` | `Flag` + `FlagGroup` | Atlaskit's `Flag` is the equivalent of toast; collapse 4 implementations into 1 |
| `sheet` + `drawer` | `Drawer` | Atlaskit ships a `<ModalDialog autoFocus />` left/right variant; build it |
| `command` + `command-palette` + `global-search-palette` | `CommandPalette` | Phase 3 — Atlaskit has no canonical primitive; design our own that *uses* DS tokens |
| `calendar` + `catalyst-date-picker` | `DatePicker` + `DateRangePicker` | Atlaskit ships these; wrap react-day-picker |
| `slider` | `Range` | Atlaskit's slider component |
| `chart` | unchanged | Tokens-only — DS doesn't ship charts, but adopt `tokens.chart.*` in chart.tsx |
| `table` + `catalyst-table` | `DynamicTable` | Atlaskit ships `DynamicTable` — sortable, paginated, virtualized |
| `form` | `Form` | Atlaskit `<Form>` + `<FormHeader>` + `<FormSection>` + `<FormFooter>` |
| `label` | folded into `Field` | Delete after migration |
| `hover-card` | covered by `Tooltip` rich variant | Delete after migration |
| `context-menu` | `ContextMenu` | Mirror Atlaskit |
| `menubar` | unused — delete | |
| `navigation-menu` | folded into Catalyst app shell | Don't migrate as DS primitive |
| `aspect-ratio` | trivial — keep | |
| `carousel` | not in Atlaskit — keep as Catalyst app component | |
| `input-otp` | `PinInput` | New DS component |
| `toggle` + `toggle-group` | `ToggleButton` + `ToggleButtonGroup` | |
| `resizable` | not in Atlaskit — keep | |
| `sidebar` | not in Atlaskit — keep as Catalyst app shell | |
| `typography` | folded into `tokens.font.*` + `<Heading>` + `<Text>` DS components | |

### Phase 4 — Catalyst-specific (rebuild on DS, don't migrate)

These are Catalyst app components, not DS primitives. Keep them where they are but rewrite their internals to compose DS components and consume DS tokens:

`AIIntelligenceButton`, `BusinessOwnerPicker`, `CatalystAvatar`, `CatalystOwnerAvatar`, `CatalystToast` (replaced by `Flag`), `CatalystToastContainer`, `DensityToggle`, `gold-link`, `InlineEditTextarea`, `LookupSelect`, `Modal` (the Catalyst-specific one — replaced by DS Modal), `PortalDropdown`, `premium-card`, `primary-search-row`, `ProgressBar` (replaced by DS), `qa-tester-picker`, `SectionHeader`, `segmented-tabs`, `SyncStatusIndicator`, `table-toolbar`, `ThemeToggle`, `unified-toolbar`, `user-picker`.

## 3. Execution sequence

```
Sprint 1
  ✅ Land design-system/ (this PR)
  ✅ Wire tokens.css into main.tsx
  ✅ Add /design-system showcase route
  □ Build component-spec docs in this folder

Sprint 2
  □ Button: codemod + shim, snapshot regression
  □ Checkbox + RadioGroup: codemod (small surface)
  □ SectionMessage replaces alert (small surface)

Sprint 3
  □ TextField: codemod + shim
  □ Modal: codemod + shim (HIGH risk — focus traps differ)
  □ Tabs: manual migration (~97 files)

Sprint 4
  □ Select: codemod (composition → options array)
  □ Phase 2 components built: Card, Lozenge, Tooltip, Popover, Avatar

Sprint 5–6
  □ Phase 2 codemods land
  □ Phase 3 components built (Flag, Drawer, DatePicker, Form)

Sprint 7+
  □ Phase 3 codemods
  □ Phase 4: rebuild Catalyst-specific components on DS
  □ Delete src/components/ui/ entirely; rename src/design-system/ → src/components/ui/ if desired
```

## 4. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Visual regression in dark mode | Medium | Token mapping uses Catalyst's existing CSS vars — should auto-flip. Test on Showcase page in both themes. |
| Dialog focus-trap differs from existing | Medium | Both use Radix Dialog under the hood; shim should preserve `onOpenChange` behavior. |
| Toast / Flag has different timing semantics | High | Build Flag with same default duration (5000ms) and pause-on-hover behavior. |
| Tailwind purge misses arbitrary values | Low | All `bg-[var(--ds-*)]` strings live in component files — Tailwind's `content` glob already covers `src/**/*.tsx`. Verify with `npm run build`. |
| TextField `<Field>` wrapper breaks layout | Medium | Provide a `<TextField>`-only path (no `<Field>`) for backwards compat in the shim. |
| Codemod breaks edge-case prop usage | High | Run on feature branch. Land in batches of 100 files. Manual review of every diff in first batch. |

## 5. Setup checklist (this PR)

- [x] Create `src/design-system/`
- [x] Author tokens (`tokens.css` + `tokens.ts`)
- [x] Author 8 core components
- [x] Showcase page at `src/design-system/showcase/Showcase.tsx`
- [ ] **Add to `src/main.tsx`** (or `src/index.css`):
  ```tsx
  import "./design-system/tokens/tokens.css";
  ```
- [ ] **Add to `src/App.tsx` routes** (under the public routes block):
  ```tsx
  import { Showcase } from "@/design-system/showcase";
  // ...
  <Route path="/design-system" element={<Showcase />} />
  ```
- [ ] Verify build: `npm run build`
- [ ] Open `/design-system` in dev — toggle light/dark to confirm token-flip works
