# @atlaskit/popup Workaround Audit

**Package:** `@atlaskit/popup@^4.16.5`  
**Status:** BUGGY — self-rolled portal pattern required  
**Audited:** 2026-06-24

---

## Bug

`@atlaskit/popup` v4.16 has two failure modes:

1. **Empty-portal bug** — popover renders into a detached DOM node → invisible or mispositioned
2. **Popper.js overflow:hidden conflict** — when trigger lives inside an `overflow: hidden` ancestor, Popper.js v2 computes zero visible area and positions the portal at `left: 0; top: 0` (viewport origin)

See CLAUDE.md 2026-06-13 RCA for full 3-layer breakdown.

---

## Detection: Does this context have an overflow:hidden ancestor?

Run in DevTools console targeting the trigger element:

```js
let el = document.querySelector('[your-trigger-selector]');
while (el) {
  const ov = getComputedStyle(el).overflow;
  if (ov !== 'visible' && ov !== 'clip') console.warn('CLIPPING ANCESTOR:', el, ov);
  el = el.parentElement;
}
// Any output = @atlaskit/popup WILL break here
```

---

## Canonical Workaround — PortalMenu Pattern

Use `createPortal` to `document.body` + direct `getBoundingClientRect()`:

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

function PortalMenu({ isOpen, onClose, triggerRef, children }: {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  children: React.ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) &&
          !triggerRef.current?.contains(e.target as Node)) onClose();
    };
    // capture phase — beats parent modal Escape handler
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen || !triggerRef.current) return null;
  const rect = triggerRef.current.getBoundingClientRect();

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Actions"
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 6,
        boxShadow: '0 8px 28px rgba(9,30,66,0.25)',
        padding: '4px 0',
        minWidth: 180,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

// Usage:
const btnRef = useRef<HTMLButtonElement>(null);
const [open, setOpen] = useState(false);

<button ref={btnRef} onClick={() => setOpen(v => !v)}>Actions</button>
<PortalMenu isOpen={open} onClose={() => setOpen(false)} triggerRef={btnRef}>
  <button role="menuitem" onClick={handleEdit}>Edit</button>
  <button role="menuitem" onClick={handleDelete}>Delete</button>
</PortalMenu>
```

---

## WCAG Requirements (mandatory for portal menus)

- Menu container: `role="menu"` + `aria-label`
- Each item: `role="menuitem"`
- Escape: capture-phase keydown handler (shown above) — closes menu WITHOUT closing parent modal
- Focus management: on open, focus first menuitem; on close, return focus to trigger

---

## Known Sites (audit before adding new dropdowns)

| Component | Overflow ancestor | Workaround applied |
|-----------|-------------------|-------------------|
| `WorkflowTypePanel.tsx` — "Copy workflow from…" | tabs wrapper | ✅ portal pattern 2026-06-13 |
| `GlobalSearchPanel` — filter chips | GlobalSearchPanel itself | ✅ portal pattern 2026-05-08 |
| `WatchersChip.tsx` — watchers popover | detail view rail | ✅ self-rolled popover 2026-05-05 |
| `AllProjectsTable.tsx` — row menus | table container | ✅ documented lines 19-22 |

---

## When to use @atlaskit/popup vs portal pattern

| Condition | Use |
|-----------|-----|
| No `overflow: hidden` ancestors anywhere in tree | `@atlaskit/popup` is fine |
| Any `overflow: hidden/scroll/auto` ancestor exists | **portal pattern only** |
| Inside modal, drawer, or panel | **portal pattern only** |
| Inside JiraTable, admin page, sidebar | **portal pattern only** |

Default to portal pattern for anything inside Catalyst shell — most containers have overflow constraints.

---

## When to remove

Remove when `@atlaskit/popup` upgrades to ≥4.17 AND the upgrade notes confirm the Popper.js overflow-clipping fix. Re-run the overflow-ancestry DevTools check after upgrade to verify.
