/**
 * SlashMenu — Jira "Insert element" palette.
 *
 * Modes:
 *   - inline  (`/` typed in editor): query comes from the editor text
 *     after `/`; no internal search input; closes on click outside the
 *     menu OR on Escape OR after picking an item.
 *   - panel   (toolbar + button): renders an auto-focused search input
 *     at the top with a blue focus border; closes on click outside OR
 *     Escape OR after picking an item.
 *
 * Items are sourced from data/slashCommands.ts. Icons are colored
 * Atlaskit editor glyphs mapped here.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
// eslint-disable-next-line no-restricted-imports
import TaskIcon from '@atlaskit/icon/glyph/editor/task';
// eslint-disable-next-line no-restricted-imports
import MentionIcon from '@atlaskit/icon/glyph/editor/mention';
// eslint-disable-next-line no-restricted-imports
import TableIcon from '@atlaskit/icon/glyph/editor/table';
// eslint-disable-next-line no-restricted-imports
import PanelIcon from '@atlaskit/icon/glyph/editor/panel';
// eslint-disable-next-line no-restricted-imports
import QuoteIcon from '@atlaskit/icon/glyph/editor/quote';
// eslint-disable-next-line no-restricted-imports
import DecisionIcon from '@atlaskit/icon/glyph/editor/decision';
// eslint-disable-next-line no-restricted-imports
import DividerIcon from '@atlaskit/icon/glyph/editor/divider';
// eslint-disable-next-line no-restricted-imports
import ExpandIcon from '@atlaskit/icon/glyph/editor/expand';
// eslint-disable-next-line no-restricted-imports
import DateIcon from '@atlaskit/icon/glyph/editor/date';
// eslint-disable-next-line no-restricted-imports
import StatusIcon from '@atlaskit/icon/glyph/status';
// eslint-disable-next-line no-restricted-imports
import AttachmentIcon from '@atlaskit/icon/glyph/editor/attachment';
import catyLogo from '@/assets/logo-mark-dark.svg';
import {
  filterSlashCommands,
  type SlashCommand,
  type SlashIconColor,
  type SlashIconId,
} from '../../data/slashCommands';

interface Props {
  /** 'inline' (from / trigger) or 'panel' (from toolbar + button). */
  mode: 'inline' | 'panel';
  /** Active query — inline gets it from editor text, panel uses internal state. */
  query: string;
  coords: { left: number; top: number; bottom: number } | { anchor: HTMLElement };
  onPick: (command: SlashCommand) => void;
  onViewMore: () => void;
  onDismiss: () => void;
}

const COLOR_TO_HEX: Record<SlashIconColor, string> = {
  green: 'var(--ds-background-success-bold, #1F845A)',
  blue: 'var(--ds-link, #1868DB)',
  orange: 'var(--ds-text-warning, #E56910)',
  purple: 'var(--ds-background-discovery-bold, #6E5DC6)',
  red: 'var(--ds-background-danger-bold, #C9372C)',
  gray: 'var(--ds-icon-subtle, #626F86)',
  brand: 'var(--ds-link, #1868DB)',
};

function renderIcon(iconId: SlashIconId, color: SlashIconColor) {
  if (iconId === 'caty') {
    return <img src={catyLogo} alt="" width={18} height={18} />;
  }
  const primaryColor = COLOR_TO_HEX[color];
  const props = { label: '', primaryColor } as const;
  switch (iconId) {
    case 'task': return <TaskIcon {...props} />;
    case 'mention': return <MentionIcon {...props} />;
    case 'table': return <TableIcon {...props} />;
    case 'panel': return <PanelIcon {...props} />;
    case 'quote': return <QuoteIcon {...props} />;
    case 'decision': return <DecisionIcon {...props} />;
    case 'divider': return <DividerIcon {...props} />;
    case 'expand': return <ExpandIcon {...props} />;
    case 'date': return <DateIcon {...props} />;
    case 'status': return <StatusIcon {...props} />;
    case 'attachment': return <AttachmentIcon {...props} />;
  }
}

function resolveCoords(c: Props['coords']): { left: number; top: number } {
  if ('anchor' in c) {
    const r = c.anchor.getBoundingClientRect();
    return { left: r.left, top: r.bottom + 4 };
  }
  return { left: c.left, top: c.bottom + 4 };
}

export function SlashMenu({ mode, query, coords, onPick, onViewMore, onDismiss }: Props) {
  const [internalSearch, setInternalSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const effectiveQuery = mode === 'inline' ? query : internalSearch;
  const items = useMemo(() => filterSlashCommands(effectiveQuery), [effectiveQuery]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => setActiveIdx(0), [effectiveQuery]);

  // Auto-focus the search input on mount (panel mode only).
  useEffect(() => {
    if (mode === 'panel') {
      // setTimeout so the input is mounted before focus.
      const id = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
  }, [mode]);

  // Click outside to close.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      onDismiss();
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onDismiss]);

  // Close on outer scroll — keeps the dropdown from drifting when the
  // page (or any ancestor container) scrolls. Scrolls INSIDE the menu's
  // own scrollable list are ignored via the contains() guard.
  useEffect(() => {
    const onScroll = (e: Event) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      onDismiss();
    };
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [onDismiss]);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => (items.length === 0 ? 0 : (i + 1) % items.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => (items.length === 0 ? 0 : (i - 1 + items.length) % items.length));
      } else if (e.key === 'Enter') {
        const item = items[activeIdx];
        if (item) {
          e.preventDefault();
          onPick(item);
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [items, activeIdx, onPick, onDismiss]);

  const { left, top } = resolveCoords(coords);

  return (
    <div
      ref={wrapRef}
      role="listbox"
      aria-label="Insert element"
      style={{
        position: 'fixed',
        left, top,
        zIndex: 2147483600,
        width: 320,
        maxHeight: 400,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 4,
        boxShadow: '0 4px 8px -2px var(--ds-shadow-raised, rgba(9,30,66,0.25)), 0 0 1px var(--ds-shadow-raised, rgba(9,30,66,0.31))',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {mode === 'panel' && (
        <div style={{ padding: 8, borderBottom: '1px solid var(--ds-border, #DFE1E6)' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search elements"
            value={internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={{
              width: '100%',
              padding: '6px 10px',
              fontSize: 'var(--ds-font-size-400)',
              border: searchFocused
                ? '2px solid var(--ds-border-focused, #2684FF)'
                : '2px solid var(--ds-border, #DFE1E6)',
              borderRadius: 3,
              background: 'var(--ds-surface, #FFFFFF)',
              color: 'var(--ds-text, #292A2E)',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 80ms ease',
            }}
          />
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
        {items.length === 0 && (
          <div
            style={{
              fontSize: 'var(--ds-font-size-200)',
              color: 'var(--ds-text-subtlest, #6B778C)',
              padding: 16,
              textAlign: 'center',
            }}
          >
            No elements match
          </div>
        )}
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={i === activeIdx}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(item)}
            onMouseEnter={() => setActiveIdx(i)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              border: 'none',
              borderRadius: 3,
              background:
                i === activeIdx
                  ? 'var(--ds-background-selected, #E9F2FE)'
                  : 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily:
                '"Atlassian Sans", ui-sans-serif, -apple-system, system-ui, sans-serif',
            }}
          >
            {/* Bordered icon box — matches Jira's insert palette where
                each colored icon sits in a thin-bordered rounded square. */}
            <span
              aria-hidden
              style={{
                width: 32,
                height: 32,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid var(--ds-border, #DFE1E6)',
                borderRadius: 3,
                background: 'var(--ds-surface, #FFFFFF)',
              }}
            >
              {renderIcon(item.iconId, item.iconColor)}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, #292A2E)' }}>
                {item.label}
              </span>
              {item.description && (
                <span style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtlest, #6B778C)' }}>
                  {item.description}
                </span>
              )}
            </span>
            {item.shortcut && (
              <span
                style={{
                  fontSize: 'var(--ds-font-size-100)',
                  color: 'var(--ds-text-subtlest, #6B778C)',
                  flexShrink: 0,
                }}
              >
                {item.shortcut}
              </span>
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onViewMore}
        style={{
          width: '100%',
          padding: '8px 10px',
          border: 'none',
          borderTop: '1px solid var(--ds-border, #DFE1E6)',
          background: 'var(--ds-surface-sunken, #F7F8F9)',
          color: 'var(--ds-text-subtle, #44546F)',
          fontSize: 'var(--ds-font-size-200)',
          fontWeight: 500,
          cursor: 'pointer',
          /* Flex so the ellipsis + label sit on one row and align
             on the same vertical center. */
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {/* U+22EF MIDLINE HORIZONTAL ELLIPSIS — three dots that sit at the
            line midline (vs U+2026 "…" which sits at the baseline). */}
        <span aria-hidden style={{ fontSize: 'var(--ds-font-size-400)', lineHeight: 1 }}>⋯</span>
        <span>View more</span>
      </button>
    </div>
  );
}
