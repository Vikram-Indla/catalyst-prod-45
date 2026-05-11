# @catylast/card

## 0.2.0

### Minor Changes

- First Beta release of `@catylast/card` — the surface primitive for every contained block in Catylast (board cards, dashboard widgets, settings tiles, profile blocks, modal content surfaces).

  **Variants:** `outlined`, `elevated`, `filled`
  **States:** default, hover, pressed, selected, disabled
  **Slots:** `Card.Cover`, `Card.Header`, `Card.Body`, `Card.Footer`
  **Sizing knobs:** `size`, `radius`, `padding`, `elevation`, `tone` (each independent)
  **Image patterns:** `coverImage`, `backgroundImage`, `backgroundOverlay`, `textColor`
  **Polymorphic:** `as` prop for rendering as `<a>`, custom components, etc.
  **Accessibility:** `interactive` cards get `role="button"` + Enter/Space handling, `aria-pressed` for selection, `aria-disabled` for disabled state.

  Every styling dimension is exposed as both an enum prop and a CSS variable (`--card-radius`, `--card-shadow`, `--card-padding`, `--card-tone-color`, …) so consumers can override per-instance via `style` without touching the prop API. All defaults flow from `@catylast/tokens` semantic layer.
