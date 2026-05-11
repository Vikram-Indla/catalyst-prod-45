# @catylast/tokens

Design tokens for the Catylast component library — primitives (color ramps,
spacing, radius, typography, elevation, motion, z-index) and theme-aware semantic
tokens (surface, text, border, accent, status colors). All tokens flow through
CSS custom properties.

## Install

```bash
# pnpm
pnpm add @catylast/tokens

# npm
npm install @catylast/tokens

# yarn
yarn add @catylast/tokens
```

## Use

Import the CSS once at the root of your app:

```ts
import "@catylast/tokens/tokens.css";
```

Then in component CSS or vanilla-extract:

```ts
import { color, space, radius, elevation } from "@catylast/tokens";

style({
  color: color.text.primary,
  background: color.surface.background,
  padding: space[8],
  borderRadius: radius.md,
  boxShadow: elevation.md,
});
```

## Theming

Set `data-theme="light"` or `data-theme="dark"` on `<html>` or any wrapper
element. Semantic tokens resolve through the active theme. Primitives stay
constant across themes.

## Token tiers

- **Primitive** — raw values (color ramps, spacing scale, etc.). Live under
  `:root` and never change with theme.
- **Semantic** — purpose-named, theme-aware values. Live under
  `[data-theme="light"]` and `[data-theme="dark"]` blocks. Reference primitives
  via `var()`.

Component code should reference semantic tokens by default. Reach for primitives
only when no semantic token fits.
