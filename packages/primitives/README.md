# @catylast/primitives

Foundational React components shared across the Catylast component library —
the building blocks larger components (DynamicTable, Timeline) compose. Styles
are written in vanilla-extract and resolve through `@catylast/tokens`.

## Install

```bash
# pnpm
pnpm add @catylast/primitives @catylast/tokens

# npm
npm install @catylast/primitives @catylast/tokens

# yarn
yarn add @catylast/primitives @catylast/tokens
```

## Components (wave 1)

- `Button` — primary, secondary, ghost, danger; sm / md / lg
- `IconButton` — square button with an icon and required accessible label
- `Badge` — default, primary, success, warning, danger
- `Avatar` — image with initials fallback; xs / sm / md / lg / xl

More primitives (Tooltip, Popover, Menu, ContextMenu, Checkbox) ship in a
follow-up wave.

## Use

```tsx
import { Avatar, Badge, Button, IconButton } from "@catylast/primitives";

<Button variant="primary" size="md" onClick={save}>Save</Button>
<IconButton icon="trash" label="Delete row" variant="ghost" />
<Badge variant="success">Done</Badge>
<Avatar name="Alex Doe" src="/avatar.png" size="md" />
```
