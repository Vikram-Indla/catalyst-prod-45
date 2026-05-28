/**
 * ToolbarPopover — shared anchored popup used by all toolbar dropdowns.
 *
 * The panel renders via a React portal to document.body so it escapes
 * any overflow:hidden parent (e.g. the editor shell's sticky toolbar).
 *
 * Placement: prefers below the trigger; flips above when there's not
 * enough room below the viewport, AND clamps horizontally so it never
 * runs off the right edge of the screen.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { ToolbarIconButton } from './ToolbarIconButton';

interface Props {
  label: string;
  triggerContent: ReactNode;
  children: (api: { close: () => void }) => ReactNode;
  triggerWidth?: number;
  panelWidth?: number;
  testId?: string;
}

interface Coords {
  top: number;
  left: number;
}

export function ToolbarPopover({
  label,
  triggerContent,
  children,
  triggerWidth = 28,
  panelWidth = 220,
  testId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords>({ top: 0, left: 0 });
  const [measured, setMeasured] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Initial coords on open — anchor below the trigger. useLayoutEffect
  // then re-measures the panel and flips above if needed.
  const handleToggle = () => {
    if (!open && wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 4, left: r.left });
      setMeasured(false);
    }
    setOpen((o) => !o);
  };

  useLayoutEffect(() => {
    if (!open) return;
    if (!wrapRef.current || !panelRef.current) return;
    const t = wrapRef.current.getBoundingClientRect();
    const p = panelRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // Vertical: flip above if no room below.
    let top = t.bottom + 4;
    if (top + p.height > vh - 8) {
      const aboveTop = t.top - p.height - 4;
      if (aboveTop >= 8) top = aboveTop;
    }
    if (top < 8) top = 8;

    // Horizontal: clamp to viewport.
    let left = t.left;
    if (left + p.width > vw - 8) {
      left = Math.max(8, vw - p.width - 8);
    }

    setCoords((prev) =>
      prev.top === top && prev.left === left ? prev : { top, left },
    );
    setMeasured(true);
  }, [open]);

  // Click outside + Escape to close.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Close on outer scroll — avoids the panel lagging behind the trigger
  // when the page (or any ancestor container) scrolls. Internal scrolls
  // inside the menu list are ignored via the contains() guard.
  useEffect(() => {
    if (!open) return;
    const onScroll = (e: Event) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={wrapRef} style={{ display: 'inline-block' }}>
      <ToolbarIconButton
        label={label}
        active={open}
        onClick={handleToggle}
        width={triggerWidth}
        testId={testId}
      >
        {triggerContent}
      </ToolbarIconButton>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              zIndex: 2147483600,
              minWidth: panelWidth,
              background: 'var(--ds-surface-overlay, #FFFFFF)',
              border: '1px solid var(--ds-border, #DFE1E6)',
              borderRadius: 4,
              boxShadow:
                '0 4px 8px -2px rgba(9,30,66,0.25), 0 0 1px rgba(9,30,66,0.31)',
              padding: 4,
              // Hide the first frame before useLayoutEffect re-positions
              // to avoid a flash if the panel needs to flip above.
              visibility: measured ? 'visible' : 'hidden',
            }}
          >
            {children({ close })}
          </div>,
          document.body,
        )}
    </div>
  );
}

/**
 * MenuItem — a clickable row inside a ToolbarPopover.
 */
export function MenuItem({
  glyph,
  label,
  shortcut,
  active = false,
  onClick,
}: {
  glyph?: ReactNode;
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-selected={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '6px 8px',
        border: 'none',
        borderRadius: 3,
        background: active
          ? 'var(--ds-background-selected, #E9F2FE)'
          : 'transparent',
        color: 'var(--ds-text, #292A2E)',
        fontSize: 14,
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily:
          '"Atlassian Sans", ui-sans-serif, -apple-system, system-ui, sans-serif',
      }}
      onMouseEnter={(e) => {
        if (active) return;
        e.currentTarget.style.background =
          'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
      }}
      onMouseLeave={(e) => {
        if (active) return;
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {glyph !== undefined && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            flexShrink: 0,
            color: 'var(--ds-text-subtle, #44546F)',
          }}
        >
          {glyph}
        </span>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
      {shortcut && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--ds-text-subtlest, #6B778C)',
            flexShrink: 0,
          }}
        >
          {shortcut}
        </span>
      )}
    </button>
  );
}
