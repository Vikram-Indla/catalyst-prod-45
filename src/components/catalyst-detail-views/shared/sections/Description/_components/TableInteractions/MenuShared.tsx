/**
 * MenuShared — shared MenuDropdown + MenuItem primitives used by both
 * ColumnMenu and RowMenu. Renders via portal, dismisses on outside
 * click (handled by parent), supports left-icon + right shortcut hint.
 */
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

interface MenuDropdownProps {
  anchorRect: DOMRect;
  children: ReactNode;
  minWidth?: number;
}

export function MenuDropdown({
  anchorRect,
  children,
  minWidth = 240,
}: MenuDropdownProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: anchorRect.bottom + 6,
    left: anchorRect.left,
  });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    // Flip below → above if it overflows the viewport.
    let top = anchorRect.bottom + 6;
    if (top + r.height > window.innerHeight - 8) {
      top = Math.max(8, anchorRect.top - r.height - 6);
    }
    let left = anchorRect.left;
    if (left + r.width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - r.width - 8);
    }
    setPos({ top, left });
  }, [anchorRect]);

  return createPortal(
    <div
      ref={ref}
      data-catalyst-table-menu
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        minWidth,
        background: 'var(--ds-surface-overlay)',
        border: '1px solid var(--ds-border)',
        borderRadius: 6,
        boxShadow: '0 6px 20px var(--ds-shadow-raised)',
        padding: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        zIndex: 2147483646,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

export function MenuDivider() {
  return (
    <div
      role="separator"
      style={{
        height: 1,
        margin: '4px 0',
        background: 'var(--ds-border)',
      }}
    />
  );
}

export interface MenuItemProps {
  icon?: ReactNode;
  label: string;
  /** Array of key tokens, e.g. ['Ctrl','Alt','ArrowLeft']. Arrow* and
   *  Backspace render as icon glyphs; everything else renders as the
   *  literal string ("Ctrl", "Alt", "-", "="). */
  shortcut?: string[];
  onClick: () => void;
  disabled?: boolean;
  /** Right-aligned content (color swatch, chevron, toggle…). */
  rightSlot?: ReactNode;
  /** Fires true on mouseenter, false on mouseleave. Used by the
   *  Delete / Clear items to preview the target column/row in red. */
  onHoverChange?: (hovering: boolean) => void;
}

export function MenuItem({
  icon,
  label,
  shortcut,
  onClick,
  disabled = false,
  rightSlot,
  onHoverChange,
}: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onClick();
      }}
      onMouseDown={(e) => e.preventDefault()}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '4px 10px',
        border: 'none',
        borderRadius: 4,
        background: 'transparent',
        color: disabled
          ? 'var(--ds-text-disabled)'
          : 'var(--ds-text)',
        fontSize: 'var(--ds-font-size-300)',
        fontWeight: 400,
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'start',
        opacity: disabled ? 0.55 : 1,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background =
          'var(--ds-background-neutral-subtle-hovered)';
        onHoverChange?.(true);
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        onHoverChange?.(false);
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ds-text-subtle)',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {rightSlot}
      {shortcut && shortcut.length > 0 && <ShortcutHint keys={shortcut} />}
    </button>
  );
}

/** Renders the key tokens inside a SINGLE shared pill — keys are
 *  inline within one background, not one pill per key. Arrow keys and
 *  Backspace render as icon glyphs; everything else renders as text. */
export function ShortcutHint({ keys }: { keys: string[] }) {
  return (
    <span
      aria-hidden
      style={{
        background: 'var(--ds-background-neutral)',
        color: 'var(--ds-text-subtle)',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: 'var(--ds-font-size-50)',
        fontWeight: 500,
        padding: '0 6px',
        borderRadius: 3,
        height: 16,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      {keys.map((k, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span
              aria-hidden
              style={{
                color: 'var(--ds-text-subtlest)',
                fontWeight: 400,
              }}
            >
              +
            </span>
          )}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {renderKeyContent(k)}
          </span>
        </Fragment>
      ))}
    </span>
  );
}

function renderKeyContent(value: string): ReactNode {
  switch (value) {
    case 'ArrowLeft':
      // Horizontal line + arrowhead on the left → real "left arrow".
      return <KeyIconSvg path="M12 7 H3 M3 7 L6 4 M3 7 L6 10" />;
    case 'ArrowRight':
      return <KeyIconSvg path="M2 7 H11 M11 7 L8 4 M11 7 L8 10" />;
    case 'ArrowUp':
      return <KeyIconSvg path="M7 12 V3 M7 3 L4 6 M7 3 L10 6" />;
    case 'ArrowDown':
      return <KeyIconSvg path="M7 2 V11 M7 11 L4 8 M7 11 L10 8" />;
    case 'Backspace':
      return <BackspaceGlyph />;
    default:
      return value;
  }
}

function KeyIconSvg({ path }: { path: string }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

function BackspaceGlyph() {
  return (
    <svg
      width="12"
      height="10"
      viewBox="0 0 16 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 1.5h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5L1 7l4-5.5Z" />
      <path d="M7.5 5l4 4M11.5 5l-4 4" />
    </svg>
  );
}

/** A small "off/on" toggle pill used by Header Row / Numbered Rows. */
export function MenuToggle({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 14,
        borderRadius: 999,
        background: on
          ? 'var(--ds-background-success-bold)'
          : 'var(--ds-text-subtle)',
        position: 'relative',
        transition: 'background-color 120ms ease',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          insetInlineStart: on ? 12 : 2,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'var(--ds-surface)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'var(--ds-font-size-100)',
          color: on
            ? 'var(--ds-background-success-bold)'
            : 'var(--ds-text-subtle)',
          fontWeight: 700,
          transition: 'inset-inline-start 120ms ease',
        }}
      >
        {on ? '✓' : '✕'}
      </span>
    </span>
  );
}

/** Hook: notify parent when user clicks outside menu / presses Escape. */
export function useMenuDismiss(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);
}
