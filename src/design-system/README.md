# Catalyst Design System (CDS)

An Atlassian-Design-System-inspired component library for Catalyst.

## Intent

- **API parity with Atlaskit**: prop names (`appearance`, `spacing`, `isDisabled`, `isLoading`, `iconBefore`, `iconAfter`…), component shapes (`ModalDialog` + `ModalHeader`/`ModalBody`/`ModalFooter`, `SectionMessage`, `TabList`/`Tab`/`TabPanel`), and composition patterns match [atlassian.design](https://atlassian.design/components).
- **Catalyst skin**: colors, typography, radii, and motion use Catalyst's V5 / V12 Hybrid Precision tokens — *not* Atlassian blue.
- **Radix under the hood**: overlay, dialog, select, tabs, checkbox, and radio components use the Radix primitives Catalyst already ships with for accessibility wins.
- **Drop-in coexistence**: lives at `src/design-system/` alongside the existing `src/components/ui/` shadcn layer. Migration happens component-by-component per `MIGRATION.md`.

## Structure

```
src/design-system/
├── tokens/           Design tokens (CSS vars + TS mirror)
├── components/       React components, one folder per component
├── utils/            Shared helpers (cn)
├── index.ts          Public barrel
└── MIGRATION.md      Per-component migration plan for src/components/ui
```

## Usage

```tsx
import { Button, TextField, Modal, ModalHeader, ModalBody, SectionMessage } from "@/design-system";

<Button appearance="primary" iconBefore={<Plus />}>Create project</Button>

<SectionMessage appearance="warning" title="Heads up">
  Your changes haven't been saved.
</SectionMessage>
```

## Token naming (Atlaskit-shaped)

All tokens are CSS custom properties on `:root` (and overridden on `[data-theme="dark"]`), so they respect Catalyst's existing theme switch.

| Token family | Example | Maps to |
|---|---|---|
| `--ds-color-background-*` | `--ds-color-background-accent-blue-subtlest` | Catalyst `--brand-primary` family |
| `--ds-color-text-*` | `--ds-color-text-subtle` | Catalyst `--text-2` |
| `--ds-color-border-*` | `--ds-color-border-focused` | Catalyst `--border-focus` |
| `--ds-color-icon-*` | `--ds-color-icon` | Catalyst `--text-2` |
| `--ds-elevation-surface-*` | `--ds-elevation-surface-raised` | Catalyst `--bg-1` |
| `--ds-elevation-shadow-*` | `--ds-elevation-shadow-overlay` | Catalyst `--shadow-elev-3` |
| `--ds-space-*` | `--ds-space-100` (= 8px) | 4px grid |
| `--ds-font-*` | `--ds-font-body` | Plus Jakarta Sans |
| `--ds-radius-*` | `--ds-radius-200` (= 6px) | Catalyst radii |

## Setup

In your app entry, ensure `tokens/tokens.css` is imported **after** `src/index.css`:

```tsx
import "./index.css";
import "./design-system/tokens/tokens.css";
```

## Accessibility

Every component ships with:
- WCAG AA color contrast (tokens tested in light + dark)
- Keyboard focus rings via `--ds-color-border-focused`
- Correct ARIA roles and labelling (Radix does most of the lifting)
- Reduced-motion fallbacks on animations
