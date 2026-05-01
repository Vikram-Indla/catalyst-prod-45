# Catalyst Icon Library

> **Single source of truth** for every work-item-type icon, priority indicator, and project avatar in Catalyst (web + mobile).
>
> **Code word:** `RESET ICONS` (matches `src/lib/jira-issue-type-icons.tsx` legacy guardrail).

## Folder layout

```
src/assets/icons/
├── manifest.json                ← machine-readable index (audit + codegen source)
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

The components handle:
- Size variants (16 / 20 / 24 px for SVGs; 24 / 32 / 40 / 80 px for avatars)
- Light / dark mode automatic swap (via `useTheme()`)
- Accessibility (`role="img"`, `aria-label`, `aria-hidden` defaults)
- Stable `data-testid` for parity tests
- Fallback for unknown types

## Adding a new icon

1. Drop the SVG (20×20 viewBox, single solid fill, no `<style>` blocks) into the appropriate category folder.
2. Add an entry to `manifest.json`.
3. Add the type to the registry (`src/components/icons/icons.registry.ts`).
4. Run `npm run lint:icons` (CI enforces viewBox + manifest sync).
5. Run Storybook (`pnpm storybook`) → `Icons / All Work Types` page to visual-verify in light + dark.

## Adding a new project avatar

1. Drop the PNG (256×256 RGBA recommended) into `project-avatars/`.
2. Name it `<PROJECT_KEY>.png` if it's permanently assigned — or drop into `_stock/` with a semantic name if it's a pool option.
3. Add an entry to `manifest.json` under `projectAvatars.items` (or `stockPool`).

## Dark-mode rendering

Most work-type icons keep their brand color in both modes (Jira parity — Story is always green, Bug always red). Only icons whose brand color fails WCAG AA contrast on Catalyst's dark surface (`#1A1A1A`) ship a `_dark/` override:

| Icon | Light fill | Dark fill | Reason |
|---|---|---|---|
| `figma.svg` | `#292A2E` (16.5:1 light, 1.04:1 dark — INVISIBLE) | `#CECFD2` | Color collision with dark surface |
| `priority/none.svg` | `#080F21` @ 29% (1.86:1 light, ~1:1 dark) | `#9FADBC` @ 70% | Dimmed glyph needs more contrast in dark |

Avatars are full-bleed self-contained illustrations — same in both modes, no overrides needed.

## License & provenance

These icons are owned by Catalyst (TurnQy) and the same set is used in the Catalyst mobile app. Do not redistribute outside the organization. The `figma.svg` Figma logomark falls under [Figma's brand guidelines](https://www.figma.com/legal/) and is used here only to indicate "external Figma link" — not as a Figma endorsement.
