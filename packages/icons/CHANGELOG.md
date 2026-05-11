# @catylast/icons

## 0.1.0

### Minor Changes

- Initial 0.1.0 release of the Catylast component library.

  This release ships:
  - `@catylast/tokens` — three-tier design token system (primitives → semantic) with light + dark CSS emit. Full color ramps (neutral, blue, red, yellow, green, purple), spacing, radius, typography, motion, z-index, and theme-aware semantic tokens for surface, text, border, accent, danger, success, warning, plus elevation.
  - `@catylast/theme` — `ThemeProvider`, `useTheme` hook, `ThemeScope` for subtree overrides, and `createInitScript` for FOUC-free SSR. SSR-safe `usePrefersColorScheme` via `useSyncExternalStore`.
  - `@catylast/icons` — single `<Icon name="…" />` API backed by a swappable registry. 55 icons mapped to Lucide as a placeholder set; `iconNames` array exposed for picker UIs.
  - `@catylast/primitives` — Button, IconButton, Badge, Avatar (with image-error fallback to initials), Checkbox (with indeterminate state), Tooltip, Popover, Menu, ContextMenu. Accessible primitives wrap Radix UI.
  - `@catylast/dynamic-table` — DynamicTable component with sticky/pinned columns, hierarchical row expansion (depth-based indentation), multi-row selection (with header indeterminate), per-column sorting and resizing, density modes (compact / standard / comfortable), and empty / loading state slots. Generic over row data shape.

  **Note:** initial token color values and the icon set are placeholders, awaiting the official Catylast design handoff. The token names, structure, and component APIs are stable — only the underlying values will change in a future release.
