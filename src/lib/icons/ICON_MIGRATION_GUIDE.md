# Catalyst Icon Migration Guide — @atlaskit/icons

**Status:** Phase B (Chat), 2026-06-10  
**Target:** Unified icon registry at `src/lib/icons/icon-registry.ts`  
**Scope:** Chat toolbar, navigation, and common UI icons

---

## Overview

Catalyst migrates from scattered `@atlaskit/icon/glyph/*` imports to a centralized icon registry. This enables:

1. **Single source of truth** — Icon changes affect one file
2. **Future library swaps** — Replace @atlaskit/icon for any other library
3. **Consistent sizing** — Toolbar icons always 16px, action icons 20px, etc.
4. **Emoji integration** — Quick-reactions use Unicode emojis (spec)

---

## Quick Start

### Before (Scattered imports)

```tsx
import CopyIconCore from '@atlaskit/icon/core/copy';
import ClockIconCore from '@atlaskit/icon/core/clock';
import ChevronDownGlyph from '@atlaskit/icon/glyph/chevron-down';

export function MessageActionsToolbar() {
  return (
    <>
      <button>
        <CopyIconCore size="small" />
      </button>
      <button>
        <ClockIconCore size="small" />
      </button>
    </>
  );
}
```

### After (Centralized registry)

```tsx
import { CopyIcon, ClockIcon, ChevronDown } from '@/lib/icons/icon-registry';

export function MessageActionsToolbar() {
  return (
    <>
      <button>
        <CopyIcon />  {/* size baked-in */}
      </button>
      <button>
        <ClockIcon />  {/* 16px always */}
      </button>
    </>
  );
}
```

---

## Icon Categories & Sizing

### 1. Toolbar Icons (16px / SMALL)

**Used in:** Message action toolbars, quick-action buttons  
**Size:** 16px (CSS: `width: 16px; height: 16px`)  
**Color:** `currentColor` (inherits from button text)  
**Count:** 4 primary

| Icon | Registry Export | Use Case | Atlaskit Source |
|------|---|---|---|
| Copy | `<CopyIcon />` | Copy message link | `@atlaskit/icon/core/copy` |
| Bell/Unread | `<BellIcon filled={bool} />` | Mark unread (custom SVG) | Custom |
| Clock | `<ClockIcon />` | Set reminder | `@atlaskit/icon/core/clock` |
| Arrow Up | `<ArrowUpIcon />` | Turn into issue | Custom |

**Color Handling:**
- Idle: `currentColor` (inherits from `color: var(--ds-text, #292A2E)`)
- Hover: (button hover CSS applies)
- Disabled: `opacity: 0.5` + `cursor: not-allowed`

### 2. Navigation Icons (16px default, flexible)

**Used in:** Dropdowns, expand/collapse, navigation  
**Size:** 16px default, parametric (small/medium/large)  
**Color:** `currentColor`  
**Count:** 3 core

| Icon | Registry Export | Use Case |
|------|---|---|
| Chevron Down | `<ChevronDown />` | Dropdown trigger, expand group |
| Chevron Right | `<ChevronRight />` | Expand/next item |
| Chevron Left | `<ChevronLeft />` | Collapse/previous item |

**Size Variants:**
```tsx
<ChevronDown />                    {/* 16px default */}
<ChevronDown size="medium" />      {/* 20px */}
<ChevronDown size="large" />       {/* 24px */}
```

### 3. Common Action Icons (16px default)

**Used in:** Buttons, headers, inline actions  
**Size:** 16px default, some support size prop  
**Color:** `currentColor`  
**Count:** 13

| Icon | Registry Export | Use Case | Size Prop |
|------|---|---|---|
| Add/Plus | `<AddIcon />` | Create, add item | Yes |
| Delete | `<DeleteIcon />` | Remove item | Yes |
| Search | `<SearchIcon />` | Search input | No |
| Edit | `<EditIcon />` | Edit mode toggle | No |
| Refresh | `<RefreshIcon />` | Reload/sync | No |
| Download | `<DownloadIcon />` | Export/save | No |
| Settings | `<SettingsIcon />` | Configuration | No |
| People | `<PeopleGroupIcon />` | Team/members | No |
| Shield | `<ShieldIcon />` | Security/admin | No |
| Check | `<CheckMarkIcon />` | Confirmation | No |
| Warning | `<WarningIcon />` | Alert/error | No |
| Link | `<LinkIcon />` | URL/external | No |
| Close | `<CloseIcon />` | Dismiss | Yes |

### 4. Quick-Reactions (Unicode Emojis, NOT icons)

**Used in:** Message reaction picker  
**Icons:** NO — Use UNICODE EMOJIS  
**Set:** `👍 ❤️ 😂 😮 😢 🔥`  
**Registry:**
```tsx
import { QUICK_REACTION_EMOJIS } from '@/lib/icons/icon-registry';
// QUICK_REACTION_EMOJIS === ['👍', '❤️', '😂', '😮', '😢', '🔥']

QUICK_REACTION_EMOJIS.map(emoji => (
  <button key={emoji} onClick={() => react(emoji)}>
    {emoji}
  </button>
))
```

---

## Migration Checklist

### Phase 1: Chat Toolbar (MessageActionsToolbar)

- [ ] Replace custom SVG icons in `MessageActionsToolbar.tsx` with registry imports
- [ ] Update `CopyIcon()`, `BellIcon()`, `ClockIcon()`, `ArrowUpIcon()` function calls
- [ ] Verify sizes (all 16px)
- [ ] Verify colors (`currentColor` on disabled state via button CSS)
- [ ] Update TypeScript — no changes (return type stays `React.ReactNode`)

**Files affected:**
- `src/components/chat/main/MessageActionsToolbar.tsx`

### Phase 2: Emoji Picker (ReactionPicker)

- [ ] Keep UNICODE emojis as-is (`['👍', '❤️', '😄', '🎉', '👀', '🙏']`)
- [ ] No icon-font changes needed
- [ ] Add `QUICK_REACTION_EMOJIS` constant import from registry for future consistency
- [ ] Add `SmileIcon` for the picker trigger button (if added later)

**Files affected:**
- `src/components/chat/main/ReactionPicker.tsx`

### Phase 3: Global Icon Replacement (Entire codebase)

Map all `@atlaskit/icon/*` imports to registry exports:

```bash
# Find all @atlaskit/icon imports
grep -r "@atlaskit/icon" src/ --include="*.tsx" --include="*.ts" | grep import

# Replace in each file:
# OLD: import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
# NEW: import { ChevronDown } from '@/lib/icons/icon-registry';
#      export function ChevronDown({ size = 'small' }: { size?: ... } = {}) { ... }
```

**Priority order:**
1. Chat components (Phase B — highest priority)
2. Admin pages (audit scanner coverage)
3. Project Hub views
4. Product Hub views
5. Remaining modules

---

## Icon Component API Reference

### Toolbar Icons (No props)

```tsx
<CopyIcon />        // Always 16px
<BellIcon />        // Always 16px, outline
<BellIcon filled={true} />   // 16px, filled (unread)
<ClockIcon />       // Always 16px
<ArrowUpIcon />     // Always 16px
<SmileIcon />       // Always 16px (emoji picker trigger)
```

### Navigation Icons (Optional size prop)

```tsx
<ChevronDown />                 // 16px (default)
<ChevronDown size="medium" />   // 20px
<ChevronDown size="large" />    // 24px
<ChevronRight />
<ChevronLeft />
```

### Action Icons (Most support size)

```tsx
<AddIcon />                 // 16px (default)
<AddIcon size="medium" />   // 20px
<DeleteIcon />              // 16px
<SearchIcon />              // 16px (no size prop)
<EditIcon />                // 16px
<RefreshIcon />             // 16px
<DownloadIcon />            // 16px
<SettingsIcon />            // 16px
<PeopleGroupIcon />         // 16px
<ShieldIcon />              // 16px
<CheckMarkIcon />           // 16px
<WarningIcon />             // 16px
<LinkIcon />                // 16px
<CloseIcon />               // 16px
<CloseIcon size="medium" /> // 20px
```

### Emojis (Not icons)

```tsx
import { QUICK_REACTION_EMOJIS } from '@/lib/icons/icon-registry';

QUICK_REACTION_EMOJIS.forEach(emoji => console.log(emoji));
// Output: 👍 ❤️ 😂 😮 😢 🔥
```

---

## Color & Disabled State Conventions

### Idle State
- Color: `currentColor` (inherits from parent)
- Typical resolved value: `var(--ds-text, #292A2E)` (primary text)

### Hover State
- Color: Same as idle (button CSS applies `:hover` styling)
- Background/border: Managed by button component, not icon

### Disabled State
- Color: `opacity: 0.5` via button `disabled` CSS
- Aria: Button element has `disabled={true}`, no icon change needed
- Text: Button label changes to "Loading..." or "Working..." if async

### Success/Error States
- Success: Use `<CheckCircle />` (green checkmark)
- Error: Use `<WarningIcon />` (red warning triangle)
- Context: Rendered as a separate icon, not inline with action

---

## When to Use Custom SVG vs. Atlaskit

### Use Atlaskit Icon
- Standard icons: chevron, search, copy, delete, add, close, etc.
- Consistent sizing via size prop
- Automatic fallback rendering in SSR
- Accessibility: `aria-hidden` auto-applied

### Use Custom SVG
- Domain-specific: bell with fill toggle (`<BellIcon filled={bool} />`)
- Shapes not in Atlaskit: arrow-up (used for "turn into issue")
- Emoji: Always use Unicode emojis, never icon fonts

### Custom SVG Template

```tsx
function MyCustomIcon() {
  return (
    <svg
      width="16"           // or size-prop-dependent
      height="16"
      viewBox="0 0 24 24"
      fill="none"          // OR fill="currentColor" if filled
      stroke="currentColor" // OR remove if fill is used
      strokeWidth="2"
      aria-hidden          // Always add for icons
    >
      {/* SVG path elements */}
    </svg>
  );
}
```

---

## Direct Re-exports (Advanced Use)

For cases where wrapper standardization isn't needed, the registry re-exports raw Atlaskit icons:

```tsx
import { CopyIconCore, ChevronDownGlyph } from '@/lib/icons/icon-registry';

// Advanced: custom size not in the wrapper
<CopyIconCore size="xlarge" />
<ChevronDownGlyph size="medium" />
```

**Use sparingly** — prefer wrappers for consistency.

---

## Testing

### Unit Tests for Icon Components

```tsx
import { render } from '@testing-library/react';
import { CopyIcon, ChevronDown } from '@/lib/icons/icon-registry';

describe('Icon Registry', () => {
  it('renders CopyIcon with 16px dimensions', () => {
    const { container } = render(<CopyIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('renders ChevronDown with size prop', () => {
    const { container } = render(<ChevronDown size="medium" />);
    const svg = container.querySelector('svg');
    // Check Atlaskit's size prop application (may vary by version)
    expect(svg).toBeInTheDocument();
  });

  it('BellIcon toggles filled state', () => {
    const { rerender, container } = render(<BellIcon filled={false} />);
    expect(container.querySelector('svg')).toHaveAttribute('fill', 'none');
    rerender(<BellIcon filled={true} />);
    expect(container.querySelector('svg')).toHaveAttribute('fill', 'currentColor');
  });
});
```

### Accessibility Checklist

- [ ] All toolbar icons have `aria-hidden` (icon-only buttons)
- [ ] Buttons using icons have `aria-label` (e.g., `aria-label="Copy message link"`)
- [ ] Icon color meets WCAG AA contrast (4.5:1 for text, 3:1 for graphics)
- [ ] Disabled state has visual indicator (opacity change)
- [ ] Keyboard navigation works on icon buttons (Tab, Enter)

---

## Tooling & Future Steps

### Codemod (Automated Migration)

Future automated migration from scatter imports to registry:

```bash
npx codemod --parser tsx \
  --transform=replace \
  'import ChevronDownIcon from "@atlaskit/icon/glyph/chevron-down"' \
  'import { ChevronDown } from "@/lib/icons/icon-registry"'
```

### Icon Library Swap

To replace @atlaskit/icon with another library (e.g., lucide-react):

1. Update `icon-registry.ts` imports
2. Update wrapper components (most still work, only sizing may differ)
3. Run tests
4. One file touched, no other changes needed

### Icon Audit

```bash
# Find remaining scattered @atlaskit/icon imports
grep -r "@atlaskit/icon" src/ --include="*.tsx" --include="*.ts" | \
  grep -v "icon-registry.ts" | \
  wc -l
```

---

## FAQ

**Q: Why wrap @atlaskit/icon icons if they already work?**  
A: Future-proofs the codebase. If Atlaskit deprecates icon sizes or naming, one file changes, not 100.

**Q: Can I use icon sizes not listed?**  
A: Yes, via direct re-exports. Prefer listed sizes for consistency — document custom sizes in a comment.

**Q: Why Unicode emojis for reactions instead of icon fonts?**  
A: Per Catalyst spec (2026-06-10), emojis are human-readable, platform-native, and don't require font loading.

**Q: What about RTL (right-to-left) layouts?**  
A: Atlaskit icons handle RTL automatically via SVG transforms. No changes needed in wrappers.

**Q: Can I style icons with CSS classes?**  
A: Prefer CSS-in-JS or inline `style` prop on the icon component. Avoid ::before/::after pseudo-elements on icon elements (they're SVGs, not containers).

---

## Related Docs

- [Atlaskit Icon v35 Docs](https://atlassian.design/components/icon/)
- [CLAUDE.md — Design System Guardrails](../../CLAUDE.md#🎨-catalyst-design-system)
- [MessageActionsToolbar Spec](../components/chat/main/MessageActionsToolbar.tsx)
- [ReactionPicker Spec](../components/chat/main/ReactionPicker.tsx)

---

## Version History

- **2026-06-10** — Phase B chat engine icons + spec published
- **TBD** — Phase 3 global codebase migration
