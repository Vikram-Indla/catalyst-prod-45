# AtlaskitAvatar Migration Guide

## Overview

The `AtlaskitAvatar` component provides an @atlaskit/avatar-based replacement for the legacy `Avatar` component in the chat module. It offers:

- ✅ Deterministic color seeding (automatic — no need to call `colorFor()`)
- ✅ @atlaskit/avatar as the rendering engine
- ✅ Presence indicator (green/red/amber/grey dot)
- ✅ Profile picture resolution with initials fallback
- ✅ Tooltip support (full name + status)
- ✅ Full backward compatibility with legacy Avatar size/presence API

## When to Use

### Use `AtlaskitAvatar` (new)
- **New components** — any new message, sidebar, or chat UI being added
- **Features requiring tooltips** — show full name + user status on hover
- **Refactoring existing code** — gradually migrate surfaces to AtlaskitAvatar

### Use `Avatar` (legacy)
- **Existing code** — no migration required; both components coexist
- **Performance-critical surfaces** — Avatar is slimmer (no Atlaskit overhead)
- **Custom size logic** — Avatar supports arbitrary pixel sizes more flexibly

## Migration Steps

### 1. Import the new component

```tsx
// Before
import { Avatar, colorFor, PresenceColor } from './avatar';

// After
import { AtlaskitAvatar, type AvatarPresenceColor } from './AtlaskitAvatar';
```

### 2. Replace the component call

**Simple case (no tooltip):**

```tsx
// Before
<Avatar
  name={user.name}
  seed={user.id}
  color={colorFor(user.id)}
  presence={presence}
  className="sidebar-avatar"
/>

// After
<AtlaskitAvatar
  name={user.name}
  seed={user.id}
  presence={presence}
  pixelSize={28}
  className="sidebar-avatar"
/>
```

**With tooltip:**

```tsx
// After
<AtlaskitAvatar
  name={user.name}
  seed={user.id}
  presence={presence}
  fullName={user.fullName}
  status={user.status} // "Online", "In a meeting", etc.
  pixelSize={28}
  className="sidebar-avatar"
/>
```

### 3. Size mapping

| Legacy `size` | New `pixelSize` | Atlaskit size |
|---|---|---|
| 16 | 16 | `xsmall` |
| 24 | 24 | `small` |
| 28-32 | 28-32 | `medium` |
| 40 | 40 | `large` |
| 48+ | 48+ | `xlarge` |

```tsx
// Old
<Avatar size={40} />

// New
<AtlaskitAvatar pixelSize={40} /> // Automatically maps to `size="large"`
```

### 4. Presence mapping

Both components use the same presence values:

```tsx
type PresenceColor = 'green' | 'red' | 'amber' | 'grey';

<AtlaskitAvatar
  presence="green"  // Online
  // or
  presence="red"    // Offline
  // or
  presence="amber"  // Away
  // or
  presence="grey"   // Idle
/>
```

## API Reference

### Props

```tsx
interface AtlaskitAvatarProps {
  // Required
  name: string; // Display name — used for initials if no image

  // Optional (color & seeding)
  seed?: string; // Seed for deterministic color (user ID preferred)

  // Optional (sizing)
  pixelSize?: number; // Explicit CSS size in pixels (takes precedence)
  size?: 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge'; // Atlaskit size

  // Optional (presence)
  presence?: 'green' | 'red' | 'amber' | 'grey' | null; // Status indicator

  // Optional (tooltip)
  fullName?: string; // Full name for tooltip (if different from name)
  status?: string; // Status text for tooltip (e.g., 'Online', 'In a meeting')

  // Optional (styling & interaction)
  className?: string; // Custom CSS class
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void; // Click handler
  isDisabled?: boolean; // Visual disabled state
}
```

### Examples

```tsx
// Minimal
<AtlaskitAvatar name="John Smith" />

// With presence
<AtlaskitAvatar name="Jane Doe" seed="user-456" presence="green" />

// With tooltip
<AtlaskitAvatar
  name="Bob Jones"
  seed="user-789"
  fullName="Robert Jones"
  status="Online"
/>

// With explicit size
<AtlaskitAvatar name="Alice Brown" pixelSize={40} />

// With click handler
<AtlaskitAvatar
  name="Charlie White"
  onClick={handleOpenProfile}
/>
```

## CSS Classes & Customization

The component uses Atlaskit's CSS under the hood. To customize:

```css
/* Target the wrapper (if pixelSize is set) */
.chat-avatar {
  cursor: pointer;
  transition: opacity 0.2s;
}

.chat-avatar:hover {
  opacity: 0.8;
}

/* Target the Atlaskit avatar button */
.chat-avatar [data-testid='avatar'] {
  /* Custom styles */
}
```

## Presence Indicator

The presence dot appears in the bottom-right corner:

```tsx
<AtlaskitAvatar
  name="User"
  presence="green" // Dot appears automatically
  pixelSize={32}   // Dot size scales with avatar
/>
```

Presence colors:
- `green` — Online / Active
- `red` — Offline / Do Not Disturb
- `amber` — Away / Idle
- `grey` — Idle / Neutral

## Tooltip Behavior

When `fullName` or `status` is provided, the component auto-wraps in a `@atlaskit/tooltip`:

```tsx
// No tooltip (just hover shows nothing extra)
<AtlaskitAvatar name="User" />

// Tooltip shows on hover
<AtlaskitAvatar
  name="User"
  fullName="Full Name"
  status="Online"
/>
```

Tooltip styling is Atlaskit-standard and uses design tokens.

## Photo Resolution

The component automatically resolves local profile pictures:

```tsx
// If /src/assets/avatars/john-smith.png exists,
// it will be used as the image source
<AtlaskitAvatar name="John Smith" />

// If no file matches the name, initials are shown
<AtlaskitAvatar name="Unknown User" /> // Shows "UU"
```

Photo URL resolution uses `resolveAvatarUrl()` from `@/lib/avatars`.

## Migration Checklist

- [ ] Import `AtlaskitAvatar` from `./AtlaskitAvatar`
- [ ] Replace `Avatar` component call
- [ ] Remove `colorFor()` import (automatic now)
- [ ] Map `size` prop to `pixelSize` if needed
- [ ] Add `fullName` + `status` for tooltip (optional)
- [ ] Test presence indicator appearance
- [ ] Verify tooltip shows on hover (if used)
- [ ] Check CSS class application
- [ ] Test profile picture resolution

## Known Limitations

1. **Async profile pictures** — Currently only resolves synchronous local assets. Future: add `src` prop for external URLs.
2. **Custom initials** — Component auto-generates from name. To customize, we'd need an `initials` prop (not yet implemented).
3. **Presence animation** — Presence dot is static. Future: add subtle pulse animation for online status.

## Performance Considerations

- AtlaskitAvatar uses `useMemo` for color seeding (only recalculates on seed change)
- No extra DOM nodes beyond the wrapper + Atlaskit Avatar + presence dot
- Tooltip is lazy-loaded by Atlaskit on demand

## Troubleshooting

### Avatar shows placeholder circle instead of initials

- Ensure `name` prop is set
- Check browser console for `resolveAvatarUrl` errors

### Presence dot doesn't appear

- Verify `presence` prop is set to one of: `'green'` | `'red'` | `'amber'` | `'grey'`
- Ensure `pixelSize` is set (presence positioning requires wrapper styling)

### Tooltip doesn't show

- Set `fullName` or `status` prop
- Check that `@atlaskit/tooltip` is properly loaded

### Color is different from legacy Avatar

- AtlaskitAvatar uses a different color palette (design-system aligned)
- Color is deterministic based on `seed` — same seed = same color
- No `color` prop override (intentional — use seed-based coloring)

## Related Files

- **Component:** `/src/components/chat/main/AtlaskitAvatar.tsx`
- **Legacy Avatar:** `/src/components/chat/main/avatar.tsx`
- **Photo Resolution:** `/src/lib/avatars.ts`
- **Example Integration:** `/src/components/chat/main/MessageItem.example.tsx`

## Future Enhancements

- [ ] Add `initials` prop for custom initials override
- [ ] Add `src` prop for external profile pictures
- [ ] Add `status` as built-in prop (in addition to tooltip)
- [ ] Add presence animation (pulse on active)
- [ ] Add keyboard navigation for clickable avatars
