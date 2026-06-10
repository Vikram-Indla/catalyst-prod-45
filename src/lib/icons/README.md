# Catalyst Icon Library

**Unified icon registry for @atlaskit/icon v35 and custom SVG icons.**

---

## Files in This Directory

### 1. **icon-registry.ts** (Main)
Centralized icon wrapper components and re-exports.

**Exports:**
- Toolbar icons: `CopyIcon`, `BellIcon`, `ClockIcon`, `ArrowUpIcon`
- Navigation icons: `ChevronDown`, `ChevronRight`, `ChevronLeft`
- Action icons: `AddIcon`, `DeleteIcon`, `SearchIcon`, `EditIcon`, `RefreshIcon`, etc.
- Emoji const: `QUICK_REACTION_EMOJIS` (tuple of 6 unicode emojis)
- Raw re-exports: Direct @atlaskit/icon components for advanced use

**Usage:**
```tsx
import { CopyIcon, ClockIcon, ChevronDown } from '@/lib/icons/icon-registry';

<CopyIcon />              // 16px, currentColor
<ClockIcon />             // 16px, currentColor
<ChevronDown />           // 16px default, supports size prop
<ChevronDown size="medium" />  // 20px
```

### 2. **ICON_MIGRATION_GUIDE.md** (Spec)
Complete specification for icon sizing, colors, usage, and migration process.

**Topics:**
- Icon categories (toolbar, navigation, action, emoji)
- Size conventions (16px toolbar, 20px large buttons)
- Color handling (currentColor, disabled state)
- Migration checklist (Phase 1 chat, Phase 2 emoji, Phase 3 global)
- Component API reference
- Testing & accessibility
- Tooling & future swaps

### 3. **ICON_MAPPING.md** (Lookup Table)
Quick reference for migrating from scattered @atlaskit/icon imports to registry.

**Topics:**
- Old import → new import mapping (4 tables: toolbar, navigation, action, deprecated)
- Batch migration commands
- Migration progress template
- Conflict resolution
- Find & replace cheat sheets

---

## Quick Start

### Install icon-registry in your component

```tsx
import { CopyIcon, ClockIcon, BellIcon, ArrowUpIcon } from '@/lib/icons/icon-registry';

export function MessageActionsToolbar() {
  return (
    <div className="toolbar">
      <button><CopyIcon /></button>
      <button><BellIcon filled={isUnread} /></button>
      <button><ClockIcon /></button>
      <button><ArrowUpIcon /></button>
    </div>
  );
}
```

### Use emoji reactions (NOT icons)

```tsx
import { QUICK_REACTION_EMOJIS } from '@/lib/icons/icon-registry';

export function ReactionQuick() {
  return (
    <div className="reactions">
      {QUICK_REACTION_EMOJIS.map(emoji => (
        <button key={emoji} onClick={() => react(emoji)}>
          {emoji}
        </button>
      ))}
    </div>
  );
}
```

### Size variants for navigation icons

```tsx
<ChevronDown />                    // 16px (default)
<ChevronDown size="medium" />      // 20px
<ChevronDown size="large" />       // 24px
```

---

## Icon Categories

### Toolbar (16px, currentColor, icon-only)
```
CopyIcon, BellIcon, ClockIcon, ArrowUpIcon, SmileIcon
```
Used in: Message action buttons, quick-action toolbars

### Navigation (16px default, size-prop)
```
ChevronDown, ChevronRight, ChevronLeft, Cross
```
Used in: Dropdowns, expand/collapse, navigation menus

### Action (16px, varying size props)
```
AddIcon, DeleteIcon, SearchIcon, EditIcon, RefreshIcon, DownloadIcon,
SettingsIcon, PeopleGroupIcon, ShieldIcon, CheckMarkIcon, WarningIcon,
LinkIcon, CloseIcon, DragHandle, TrashIcon, CheckCircle
```
Used in: Buttons, headers, inline actions

### Emoji (Unicode, no icons)
```
👍 ❤️ 😂 😮 😢 🔥  (QUICK_REACTION_EMOJIS)
```
Used in: Reaction pickers, quick-reactions UI

---

## Size Convention

| Context | Size | CSS | Examples |
|---|---|---|---|
| Toolbar buttons (16px) | small | `width: 16px; height: 16px` | Copy, Clock, Bell, Arrow-up |
| Large buttons (20px) | medium | `width: 20px; height: 20px` | File upload, large action buttons |
| Large toolbars (24px) | large | `width: 24px; height: 24px` | Header icons, large nav |
| Inherit (from context) | — | `width: 100%; height: 100%` | Rare; use only when sizing is truly dynamic |

---

## Color Convention

| State | Color | CSS Value |
|---|---|---|
| Idle | `currentColor` | Inherits from button/text color (usually `var(--ds-text, #292A2E)`) |
| Hover | `currentColor` | Button `:hover` CSS applies background/border, icon color same |
| Disabled | `opacity: 0.5` | Applied to button `disabled` state, icon becomes 50% opaque |
| Error | `var(--ds-text-danger, #AE2A19)` | Use `<WarningIcon />` in error context |
| Success | `var(--ds-text-success, #216E4E)` | Use `<CheckCircle />` in success context |

---

## Direct Re-exports (Advanced)

For cases where the wrapper doesn't fit your need, raw Atlaskit icons are re-exported:

```tsx
import { CopyIconCore, ChevronDownGlyph } from '@/lib/icons/icon-registry';

// Bypass wrapper to use custom size
<CopyIconCore size="xlarge" />
<ChevronDownGlyph size="medium" />
```

**Note:** Prefer wrappers for consistency. Use direct re-exports only when documented and justified.

---

## Accessibility

All icons in the registry have `aria-hidden` by default (they're decorative).

When icons are in buttons, the button element must have an `aria-label`:

```tsx
<button aria-label="Copy message link">
  <CopyIcon />
</button>
```

✅ **DO:**
```tsx
<Tooltip content="Copy link">
  <button aria-label="Copy message link" onClick={handleCopy}>
    <CopyIcon />
  </button>
</Tooltip>
```

❌ **DON'T:**
```tsx
<button>
  <CopyIcon /> Copy  {/* Redundant icon + text */}
</button>
```

---

## Custom Icon Template

To add a new custom SVG icon (not in @atlaskit/icon):

```tsx
export function MyCustomIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"              // OR fill="currentColor"
      stroke="currentColor"    // For outline icons
      strokeWidth="2"
      aria-hidden
    >
      {/* SVG path elements */}
      <path d="..." />
    </svg>
  );
}
```

Key points:
- Always set explicit `width` and `height` (16px is the default for toolbar)
- Use `currentColor` for stroke/fill so icon inherits button text color
- Add `aria-hidden` — icons are decorative, not text content
- Add JSDoc comment above function (see existing icons in icon-registry.ts)
- Test in light + dark modes (if your theme supports it)

---

## Testing

### Unit Test Example

```tsx
import { render } from '@testing-library/react';
import { CopyIcon, ChevronDown } from '@/lib/icons/icon-registry';

describe('Icon Registry', () => {
  it('renders CopyIcon with correct dimensions', () => {
    const { container } = render(<CopyIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('passes size prop to ChevronDown', () => {
    const { container } = render(<ChevronDown size="medium" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
```

### Accessibility Test

```tsx
it('toolbar icons are aria-hidden', () => {
  const { container } = render(<CopyIcon />);
  const svg = container.querySelector('svg');
  expect(svg).toHaveAttribute('aria-hidden');
});
```

---

## Migration Path

### Phase 1 — Chat Toolbar (2026-06-10)
- [ ] MessageActionsToolbar.tsx → Use icon-registry
- [ ] ReactionPicker.tsx → Use QUICK_REACTION_EMOJIS

### Phase 2 — Full Codebase
Update all files with `@atlaskit/icon` imports to use the registry.

**Progress:**
```bash
grep -r "@atlaskit/icon" src/ --include="*.tsx" | grep -v "icon-registry" | wc -l
```

---

## Troubleshooting

**Q: Icon not showing?**
- Check `viewBox` is set correctly on custom SVGs
- Verify `currentColor` inheritance (button must have a color set)
- Check browser DevTools for SVG rendering errors

**Q: Icon size is wrong?**
- Check the wrapper size (16px, 20px, 24px)
- Check `size` prop was not overridden in CSS
- Verify CSS doesn't have conflicting `width: auto` or `max-width`

**Q: Icon color is wrong in dark mode?**
- Use `currentColor` (inherits from parent, works in all themes)
- Avoid hardcoded hex colors in custom SVGs
- Use ADS tokens for explicit colors: `var(--ds-text-danger, #AE2A19)`

**Q: Icon doesn't respond to button hover?**
- Check button `:hover` CSS is correct
- Icon should stay same color (currentColor), button changes background
- If icon needs to change color on hover, add explicit CSS to button:hover svg

---

## Related Documentation

- [ICON_MIGRATION_GUIDE.md](./ICON_MIGRATION_GUIDE.md) — Full specification
- [ICON_MAPPING.md](./ICON_MAPPING.md) — Quick lookup table
- [Atlaskit Icon v35](https://atlassian.design/components/icon/)
- [CLAUDE.md Design System](../../CLAUDE.md#🎨-catalyst-design-system)

---

## Version

- **2026-06-10** — Initial release, Phase B chat icons
- **Atlaskit/icon version:** 35.0.0+
- **Supported React:** 17.0+

---

## Questions?

Consult the [ICON_MIGRATION_GUIDE.md](./ICON_MIGRATION_GUIDE.md) for detailed explanations, or open an issue if you find missing icons or need to add a new one.
