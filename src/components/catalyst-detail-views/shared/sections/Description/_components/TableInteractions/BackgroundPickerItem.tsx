/**
 * BackgroundPickerItem — menu row that shows the current background
 * color as a swatch and opens a palette popover to the right when
 * clicked. Used by both ColumnMenu and RowMenu.
 */
import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
// eslint-disable-next-line no-restricted-imports
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
// eslint-disable-next-line no-restricted-imports
import PaintBucketIcon from '@atlaskit/icon/core/paint-bucket';

interface ColorSwatch {
  name: string;
  /** null = "no fill" / clear. */
  value: string | null;
}

/* Palette matching Jira's table background picker — 4 rows × 5 cols.
   Row 1: very subtle / pastel tints. Row 2: light brights. Row 3:
   medium tones. Row 4: bold / dark variants. All chosen so cell text
   remains legible on whatever shade you pick. */
const PALETTE: ColorSwatch[] = [
  // Row 1 — subtle
  { name: 'No fill', value: null },
  { name: 'Subtle gray', value: 'var(--ds-background-neutral, #F1F2F4)' },
  { name: 'Subtle red', value: 'var(--ds-background-danger, #FFECEB)' },
  { name: 'Subtle orange', value: '#FFEFD6' },
  { name: 'Subtle yellow', value: 'var(--ds-background-warning, #FFF7D6)' },
  // Row 2 — light
  { name: 'Light green', value: 'var(--ds-background-success, #DFFCF0)' },
  { name: 'Light teal', value: '#E6FCFF' },
  { name: 'Light blue', value: 'var(--ds-background-information, #E9F2FF)' },
  { name: 'Light purple', value: 'var(--ds-background-discovery, #F3F0FF)' },
  { name: 'Light pink', value: '#FFE5F2' },
  // Row 3 — medium
  { name: 'Medium gray', value: 'var(--ds-text-disabled, #8590A2)' },
  { name: 'Medium blue', value: '#B8DAFF' },
  { name: 'Medium violet', value: '#C0B6F2' },
  { name: 'Medium magenta', value: '#FFB8E6' },
  { name: 'Medium mint', value: '#B8E8C9' },
  // Row 4 — bold / dark
  { name: 'Bold gray', value: 'var(--ds-text-subtlest, #626F86)' },
  { name: 'Bold red', value: 'var(--ds-background-danger-bold, #C9372C)' },
  { name: 'Bold orange', value: 'var(--ds-background-warning-bold, #E2B203)' },
  { name: 'Bold yellow', value: 'var(--ds-background-warning-bold, #E2B203)' },
  { name: 'Bold green', value: 'var(--ds-background-success-bold, #1F845A)' },
];

interface Props {
  /** Current background color (driven by the cell the user clicked the
   *  grip from). Used for the swatch and the picker's "selected" ring. */
  currentColor: string | null;
  onSelect: (color: string | null) => void;
  /** "Disabled" placeholder, kept for parity with other menu items. */
  disabled?: boolean;
}

export function BackgroundPickerItem({
  currentColor,
  onSelect,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const rowRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <button
        ref={rowRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (disabled) return;
          setOpen((v) => !v);
        }}
        onMouseDown={(e) => e.preventDefault()}
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '6px 10px',
          border: 'none',
          borderRadius: 4,
          background: open
            ? 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'
            : 'transparent',
          color: disabled
            ? 'var(--ds-text-disabled, #B3B9C4)'
            : 'var(--ds-text, #292A2E)',
          fontSize: 13,
          fontWeight: 400,
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'start',
        }}
        onMouseEnter={(e) => {
          if (disabled || open) return;
          e.currentTarget.style.background =
            'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
        }}
        onMouseLeave={(e) => {
          if (open) return;
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ds-text-subtle, #44546F)',
            flexShrink: 0,
          }}
        >
          <PaintBucketIcon label="" />
        </span>
        <span style={{ flex: 1 }}>Background color</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--ds-text-subtlest, #6B778C)',
          }}
        >
          <ColorSwatchBox color={currentColor} />
          <ChevronRightIcon label="" size="small" />
        </span>
      </button>
      {open && rowRef.current && (
        <PalettePopover
          anchor={rowRef.current}
          currentColor={currentColor}
          onPick={(c) => {
            setOpen(false);
            onSelect(c);
          }}
          onDismiss={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ColorSwatchBox({ color }: { color: string | null }) {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        borderRadius: 3,
        background: color ?? 'var(--ds-surface, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        display: 'inline-block',
      }}
    />
  );
}

interface PaletteProps {
  anchor: HTMLElement;
  currentColor: string | null;
  onPick: (c: string | null) => void;
  onDismiss: () => void;
}

function PalettePopover({
  anchor,
  currentColor,
  onPick,
  onDismiss,
}: PaletteProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>(() => {
    const r = anchor.getBoundingClientRect();
    return { top: r.top, left: r.right + 6 };
  });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    let left = anchorRect.right + 6;
    let top = anchorRect.top;
    if (left + r.width > window.innerWidth - 8) {
      left = Math.max(8, anchorRect.left - r.width - 6);
    }
    if (top + r.height > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - r.height - 8);
    }
    setPos({ top, left });
  }, [anchor]);

  return createPortal(
    <div
      ref={ref}
      data-catalyst-table-menu
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 6,
        boxShadow: '0 6px 20px var(--ds-shadow-raised, rgba(9,30,66,0.18))',
        padding: 8,
        zIndex: 2147483647,
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 22px)',
          gap: 6,
        }}
      >
        {PALETTE.map((c) => (
          <SwatchButton
            key={c.name}
            swatch={c}
            selected={normalize(c.value) === normalize(currentColor)}
            onClick={() => onPick(c.value)}
          />
        ))}
      </div>
      {/* Close on Escape — outer close handled by ColumnMenu's
          mousedown listener via [data-catalyst-table-menu] guard. */}
      <KeyHandler onEscape={onDismiss} />
    </div>,
    document.body,
  );
}

function normalize(c: string | null | undefined): string {
  return (c ?? '').toLowerCase().replace(/\s+/g, '');
}

function SwatchButton({
  swatch,
  selected,
  onClick,
}: {
  swatch: ColorSwatch;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={swatch.name}
      aria-label={swatch.name}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        width: 22,
        height: 22,
        padding: 0,
        border: selected
          ? '2px solid var(--ds-link, #0C66E4)'
          : '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 4,
        background: swatch.value ?? 'var(--ds-surface, #FFFFFF)',
        cursor: 'pointer',
      }}
    />
  );
}

function KeyHandler({ onEscape }: { onEscape: () => void }): ReactNode {
  // Tiny effect-only component so PalettePopover stays presentational.
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onEscape();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onEscape]);
  return null;
}
