# @catylast/icons

The icon system for the Catylast component library. A single `<Icon name="…" />`
API backed by a registry. Today the registry uses Lucide as the placeholder
icon set; when the designer ships the official Catylast icon library, swapping
is a one-file edit (`src/registry.ts`) and consumer code stays untouched.

## Install

```bash
# pnpm
pnpm add @catylast/icons

# npm
npm install @catylast/icons

# yarn
yarn add @catylast/icons
```

## Use

```tsx
import { Icon } from "@catylast/icons";

<Icon name="check" size={16} />
<Icon name="alert-triangle" size={20} label="Warning" />
```

`name` is type-checked — autocomplete shows every available icon.

## Props

- `name` — icon to render (typed union of registry keys)
- `size` — pixel size, default `16`
- `color` — defaults to `currentColor`, so the icon inherits text color
- `strokeWidth` — default `2`
- `label` — accessible label. If omitted, the icon is treated as decorative
  (`aria-hidden="true"`)
- `className`, `style` — passed through to the SVG

## Browsing the set

The full list of available icon names is exported as `iconNames`:

```ts
import { iconNames } from "@catylast/icons";
```

The Storybook page **Foundations / Icons** renders every icon in the set.

## Swapping the icon set

When the official icon library lands, replace the contents of
`src/registry.ts` with mappings from icon name to your own SVG components.
Keep the `IconName` type and `iconRegistry` export — everything else
(consumers, the `<Icon>` component, this README) stays the same.
