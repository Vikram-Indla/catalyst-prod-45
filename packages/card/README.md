# @catylast/card

A surface primitive for Catylast. `Card` is a token-driven, accessible
container with named slots (`Cover`, `Header`, `Body`, `Footer`), three
visual variants (`outlined`, `elevated`, `filled`), full state coverage
(default / hover / pressed / selected / disabled), independent knobs for
**size / radius / padding / elevation / tone**, and first-class **cover
image** + **background image** props. It is the building block for every
contained block in the Catylast app — board cards, dashboard widgets,
settings tiles, profile blocks, modal content surfaces.

For the architectural rationale (why we don't have a single monolithic card
component, why we follow a compositional design-system approach, and how
the domain-specific `WorkItemCard` will sit on top of this primitive), see
**§17 of `CLAUDE.md`** in the repo root.

## Install

```bash
# pnpm
pnpm add @catylast/card

# npm
npm install @catylast/card

# yarn
yarn add @catylast/card
```

```tsx
import { Card } from "@catylast/card";
import "@catylast/card/styles.css";
```

## Quickstart

```tsx
<Card variant="elevated">
  <Card.Header>
    <h3>Project status</h3>
  </Card.Header>
  <Card.Body>Sprint 12 is on track.</Card.Body>
  <Card.Footer>Updated 2 hours ago</Card.Footer>
</Card>
```

## Design philosophy

Every customizable dimension is exposed **two ways**:

1. As a **prop** with a small enum (`size="lg"`, `radius="xl"`, etc.).
2. As a **CSS variable** on the root element (`--card-radius`,
   `--card-shadow`, …) that consumers can override directly via `style` for
   values outside the prop vocabulary.

Defaults always resolve through `@catylast/tokens`, so theme switching,
dark mode, and the eventual Figma swap flow through automatically without
touching the component.

## API

### `<Card>` props

| Prop                     | Type                                                          | Default            | Notes                                                                            |
| ------------------------ | ------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------- |
| `variant`                | `"outlined" \| "elevated" \| "filled"`                        | `"outlined"`       | Surface preset.                                                                  |
| `size`                   | `"sm" \| "md" \| "lg"`                                        | `"md"`             | Scales slot padding.                                                             |
| `radius`                 | `"none" \| "sm" \| "md" \| "lg" \| "xl" \| "full"`            | `"md"` (token)     | Corner radius.                                                                   |
| `padding`                | `"none" \| "sm" \| "md" \| "lg"`                              | follows `size`     | Body padding override.                                                           |
| `elevation`              | `"none" \| "xs" \| "sm" \| "md" \| "lg" \| "xl"`              | follows variant    | Shadow depth, independent of variant.                                            |
| `tone`                   | `"neutral" \| "accent" \| "success" \| "warning" \| "danger"` | `"neutral"`        | Top accent strip.                                                                |
| `toneHeight`             | `number \| string`                                            | `"3px"`            | Strip thickness.                                                                 |
| `interactive`            | `boolean`                                                     | `false`            | Adds button-shaped affordance with keyboard support and `focus-visible` ring.    |
| `selected`               | `boolean`                                                     | `false`            | Accent border + tinted background. Combine with `interactive`.                   |
| `disabled`               | `boolean`                                                     | `false`            | Desaturates, removes from tab order, suppresses interactive effects.             |
| `fullWidth`              | `boolean`                                                     | `false`            | Stretch to parent width.                                                         |
| `coverImage`             | `string`                                                      | —                  | Auto-renders a `Card.Cover` with this image at the top.                          |
| `coverImageAlt`          | `string`                                                      | `""`               | Alt text for `coverImage`.                                                       |
| `coverHeight`            | `number \| string`                                            | `"160px"`          | Cover region height.                                                             |
| `backgroundImage`        | `string`                                                      | —                  | Full-bleed background image behind the content.                                  |
| `backgroundImageOpacity` | `number`                                                      | `1`                | Opacity of the background image.                                                 |
| `backgroundOverlay`      | `boolean \| string`                                           | `false`            | `true` adds a sensible dark gradient; pass any CSS color/gradient for control.   |
| `textColor`              | `string`                                                      | —                  | Force foreground color when using a dark background image.                       |
| `as`                     | `keyof JSX.IntrinsicElements \| Component`                    | `"div"`            | Override the rendered tag (`as="a"` for a linkified card).                       |
| `className`              | `string`                                                      | —                  | Merged with internal classes.                                                    |
| `style`                  | `CSSProperties`                                               | —                  | Merged with internal CSS-variable map. Use this to override variables directly.  |
| `children`               | `ReactNode`                                                   | —                  | Use the slot subcomponents (`Card.Cover`, `Card.Header`, `Card.Body`, `Card.Footer`). |

### Slots

- **`<Card.Cover>`** — full-bleed top section. No internal padding so an
  `<img>` fills it edge-to-edge. Auto-rendered when `coverImage` is set.
- **`<Card.Header>`** — top content row, divided from `Body` by a hairline
  border.
- **`<Card.Body>`** — main content. The only slot most cards need.
- **`<Card.Footer>`** — meta row, divided from `Body` by a hairline border.

All slots are optional and can appear in any order. Recommended order:
`Cover → Header → Body → Footer`.

## Variants

| Variant    | Border                       | Shadow         | Background           | Use when                                                        |
| ---------- | ---------------------------- | -------------- | -------------------- | --------------------------------------------------------------- |
| `outlined` | `1px solid border.subtle`    | none           | `surface.background` | Default surface on light pages.                                 |
| `elevated` | none                         | `elevation.sm` | `surface.background` | Card is the primary focus on the page.                          |
| `filled`   | none                         | none           | `surface.raised`     | Card sits on `surface.background` and needs a subtle distinction. |

Variants are *presets* of the underlying knobs. You can always override
any single knob (e.g. `<Card variant="filled" elevation="md" />`).

## States

| State    | Visual change                                                        |
| -------- | -------------------------------------------------------------------- |
| Default  | Variant baseline.                                                    |
| Hover    | Border ramps to `border.default`; elevation bumps. Interactive only. |
| Pressed  | Background ramps; subtle Y-translate. Interactive only.              |
| Selected | Border becomes `border.focus`; background tints to `surface.selected`. |
| Disabled | Opacity 0.6; cursor not-allowed; no hover or focus ring; not focusable. |

## Image patterns

### Top cover

```tsx
<Card coverImage="/cover.jpg" coverImageAlt="Mountain" coverHeight={140}>
  <Card.Body>…</Card.Body>
</Card>
```

### Full background

```tsx
<Card
  backgroundImage="/hero.jpg"
  backgroundOverlay
  textColor="#fff"
>
  <Card.Body>…</Card.Body>
</Card>
```

### Custom overlay

```tsx
<Card
  backgroundImage="/hero.jpg"
  backgroundOverlay="linear-gradient(135deg, rgba(20,30,55,0.85), rgba(60,30,90,0.55))"
  textColor="#fff"
>
  <Card.Body>…</Card.Body>
</Card>
```

### Both at once

```tsx
<Card
  coverImage="/cover.jpg"
  coverHeight={140}
  backgroundImage="/atmosphere.jpg"
  backgroundOverlay="linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.96))"
  tone="accent"
>
  …
</Card>
```

## CSS-variable escape hatch

Every prop writes one CSS variable on the root. To go beyond the enum
vocabulary (e.g. an exact `14px` radius or a brand-specific shadow), set
the same variable directly via `style`:

```tsx
<Card
  style={{
    "--card-radius": "14px",
    "--card-shadow": "0 12px 32px rgba(20, 30, 90, 0.18)",
    "--card-tone-color": "var(--catylast-color-purple-500)",
    "--card-tone-height": "4px",
    "--card-padding": "20px",
  } as React.CSSProperties}
>
  …
</Card>
```

### Variables published

| Variable                     | Default                | Purpose                              |
| ---------------------------- | ---------------------- | ------------------------------------ |
| `--card-radius`              | `radius.md`            | Corner radius.                       |
| `--card-border-color`        | `border.subtle` / —    | Border color.                        |
| `--card-border-width`        | `1px`                  | Border width.                        |
| `--card-shadow`              | none / `elevation.sm`  | Shadow.                              |
| `--card-shadow-hover`        | `elevation.md`         | Hover shadow when interactive.       |
| `--card-bg`                  | `surface.background`   | Card background color.               |
| `--card-bg-image`            | none                   | Background-image url(…).             |
| `--card-bg-image-opacity`    | `1`                    | Background image opacity.            |
| `--card-bg-overlay`          | transparent            | Overlay layer over the image.        |
| `--card-padding`             | size-derived           | Body padding.                        |
| `--card-padding-x`           | size-derived           | Header / Footer horizontal padding.  |
| `--card-padding-y`           | size-derived           | Header / Footer vertical padding.    |
| `--card-tone-color`          | transparent            | Top accent strip color.              |
| `--card-tone-height`         | `0`                    | Top accent strip height.             |
| `--card-cover-height`        | `auto`                 | Auto-cover region height.            |
| `--card-width`               | `auto`                 | Card width (`100%` when fullWidth).  |

## Composition example — work-item card

The ticket-style work-item card is *not* shipped here. Build it from
`@catylast/card` plus the design system primitives:

```tsx
import { Card } from "@catylast/card";
import { Avatar, Badge } from "@catylast/primitives";
import { Icon } from "@catylast/icons";

<Card interactive variant="outlined" tone="warning">
  <Card.Header>
    <Icon name="bug" /> CAT-123
  </Card.Header>
  <Card.Body>
    <strong>Editor crashes on slash menu</strong>
    <Badge variant="warning">In review</Badge>
  </Card.Body>
  <Card.Footer>
    <Avatar size="sm" name="Wasim Khan" />
    <span>3 SP · Due Mar 12</span>
  </Card.Footer>
</Card>
```

Once this composition stabilizes across screens, it will be promoted into
`@catylast/work-item` as `WorkItemCard` (see CLAUDE.md §17.3 phase 2).

## Accessibility

- `interactive` cards render with `role="button"`, `tabIndex={0}`, and
  handle Enter / Space; the focus ring matches the design system.
- `disabled` cards remove the role, set `aria-disabled="true"`, and are
  not in the tab order.
- The bg-image and overlay layers are `aria-hidden` and behind the content
  in z-order — assistive tech sees the slots, not the decoration.
- All values come from `@catylast/tokens` semantic layer, so dark mode and
  high-contrast adjust automatically.

## Storybook

Browse every variant, state, knob, and image pattern under **Display /
Card** — the canonical reference for how the component should render.
