# Catalyst Icon Library

> **Single source of truth** for every work-item-type icon, priority indicator, and project avatar in Catalyst (web + mobile).
>
> **Code word:** `RESET ICONS` (matches `src/lib/jira-issue-type-icons.tsx` legacy guardrail).

## Folder layout

```
src/assets/icons/
├── manifest.json                ← machine-readable index (CI validates)
├── README.md                    ← this file
├── work-type/                   ← 14 SVGs, one per work-item type
│   ├── *.svg                    ← canonical light variants (20×20 viewBox)
│   └── _dark/                   ← dark-mode overrides (only icons that fail WCAG AA on dark)
├── priority/                    ← 6 SVGs, one per priority level
│   ├── *.svg
│   └── _dark/
└── project-avatars/             ← 18 PNGs named by project key + 8 stock pool
    ├── <PROJECT_KEY>.png        ← 256×256 RGBA, full-bleed
    └── _stock/                  ← unassigned avatars for future projects
```

## Consumption

**Engineers do NOT import these files directly.** All consumption goes through the typed components in `src/components/icons/`:

```tsx
import { WorkItemTypeIcon, PriorityIcon, ProjectAvatar } from '@/components/icons';

<WorkItemTypeIcon type="story" size={20} label="Story" />
<PriorityIcon level="highest" size={16} />
<ProjectAvatar projectKey="BAU" size={32} />
```

The components handle: size variants, light/dark automatic swap, accessibility, stable test ids, Jira-side normalization.

## Adding / updating icons — TWO paths

### Path A — design-time (canonical, requires PR)

1. Drop the SVG/PNG into the appropriate category folder.
2. Add a manifest entry.
3. Extend `src/components/icons/icons.registry.ts`.
4. Open a PR — CI lint validates manifest sync + viewBox.

### Path B — runtime override via `/admin/icons` (no PR required)

Admins can upload replacement assets through `/admin/icons` (admin-only route). Uploads persist to Supabase Storage, and a runtime hook (`useIconOverrides`) tells `WorkItemTypeIcon` / `PriorityIcon` / `ProjectAvatar` to prefer the override URL over the bundled compile-time asset.

Path B is for marketing/branding cycles where rebuilding+redeploying isn't acceptable. Path A is for permanent additions to the icon set.

## Dark-mode rendering

Most icons keep their brand color in both modes (Jira parity). Only icons that fail WCAG AA contrast on dark surface ship a `_dark/` override:

| Icon | Light fill | Dark fill | Reason |
|---|---|---|---|
| `figma.svg` | `#292A2E` (1.04:1 on dark — INVISIBLE) | `#CECFD2` | Color collision with dark surface |
| `priority/none.svg` | `#080F21` @ 29% (~1:1 on dark) | `#9FADBC` @ 70% | Dimmed glyph needs more contrast in dark |

Avatars are full-bleed self-contained illustrations — same in both modes.

## CI guardrails

- ESLint `no-restricted-imports` blocks direct `@/assets/icons/**` imports outside `src/components/icons/**`.
- A GitHub Action (`.github/workflows/icon-manifest-check.yml`) validates that every file in `src/assets/icons/**` has a matching `manifest.json` entry, every SVG has `viewBox="0 0 20 20"`, and no SVG contains `<style>` / `<script>` / embedded raster.
- Pre-commit hook runs SVGO on changed assets.

## License & provenance

These icons are owned by Catalyst (TurnQy) and the same set is used in the Catalyst mobile app. Do not redistribute outside the organization.
