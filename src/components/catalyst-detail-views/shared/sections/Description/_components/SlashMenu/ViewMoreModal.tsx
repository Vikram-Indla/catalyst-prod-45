/**
 * ViewMoreModal — custom portal modal for "Browse elements".
 *
 * Built as a portal-rendered div (NOT Atlaskit Modal) so it opens
 * instantly with no chunk-load lag. Layout:
 *
 *   ┌─────────┬──────────────────────────────────┐
 *   │ Browse  │ [search]                         │
 *   │         ├──────────────────────────────────┤
 *   │ All     │ [card] [card] [card]             │
 *   │ Caty    │ [card] [card] [card]   ← scroll  │
 *   │ Conf    │ ...                              │
 *   │ Ext     ├──────────────────────────────────┤
 *   │ Dev     │                  [Close] [Insert]│
 *   └─────────┴──────────────────────────────────┘
 *
 * Header (search) + footer (buttons) are sticky; only the middle grid
 * scrolls. First item in the active tab is auto-selected on open / on
 * tab change. Insert applies the selection and closes.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
// eslint-disable-next-line no-restricted-imports
import TaskIcon from '@atlaskit/icon/glyph/editor/task';
// eslint-disable-next-line no-restricted-imports
import MentionIcon from '@atlaskit/icon/glyph/editor/mention';
// eslint-disable-next-line no-restricted-imports
import TableIcon from '@atlaskit/icon/glyph/editor/table';
// eslint-disable-next-line no-restricted-imports
import PanelIcon from '@atlaskit/icon/glyph/editor/panel';
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
// eslint-disable-next-line no-restricted-imports
import EmojiIcon from '@atlaskit/icon/glyph/editor/emoji';
// eslint-disable-next-line no-restricted-imports
import ImageIcon from '@atlaskit/icon/glyph/editor/image';
// eslint-disable-next-line no-restricted-imports
import LinkIcon from '@atlaskit/icon/glyph/editor/link';
// eslint-disable-next-line no-restricted-imports
import CodeIcon from '@atlaskit/icon/glyph/editor/code';
// eslint-disable-next-line no-restricted-imports
import BulletListIcon from '@atlaskit/icon/glyph/editor/bullet-list';
// eslint-disable-next-line no-restricted-imports
import NumberListIcon from '@atlaskit/icon/glyph/editor/number-list';
// eslint-disable-next-line no-restricted-imports
import HelpIcon from '@atlaskit/icon/glyph/editor/help';
// eslint-disable-next-line no-restricted-imports
import CloseIcon from '@atlaskit/icon/core/close';
import catyLogo from '@/assets/logo-mark-dark.svg';
import {
  MODAL_ELEMENTS,
  MODAL_TABS,
  filterModalElements,
  type ModalCategory,
  type ModalElement,
  type ModalIconColor,
  type ModalIconId,
  type ExternalAction,
} from '../../data/modalElements';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
  /** Routes externalAction ids (Ask Caty, Help, Attachments, etc.). */
  onExternalAction?: (action: ExternalAction) => void;
}

const COLOR_TO_HEX: Record<ModalIconColor, string> = {
  green: 'var(--ds-background-success-bold, #1F845A)',
  blue: 'var(--ds-link, #1868DB)',
// TODO: ads-unmapped — #E56910 context unclear
  orange: '#E56910',
  purple: 'var(--ds-background-discovery-bold, #6E5DC6)',
  red: 'var(--ds-background-danger-bold, #C9372C)',
  gray: 'var(--ds-icon-subtle, #626F86)',
// TODO: ads-unmapped — #E774BB context unclear
  pink: '#E774BB',
  brand: 'var(--ds-link, #1868DB)',
};

function renderIcon(el: ModalElement) {
  const primaryColor = COLOR_TO_HEX[el.iconColor];
  const props = { label: '', primaryColor } as const;

  if (el.iconId === 'caty') {
    return <img src={catyLogo} alt="" width={20} height={20} />;
  }
  if (el.iconId === 'heading') {
    return (
      <span
        style={{
          fontWeight: 700, fontSize: 13,
          color: primaryColor,
          fontFamily: '"Atlassian Sans", ui-sans-serif, system-ui, sans-serif',
        }}
      >
        {el.iconText ?? 'H'}
      </span>
    );
  }
  switch (el.iconId as Exclude<ModalIconId, 'caty' | 'heading'>) {
    case 'task': return <TaskIcon {...props} />;
    case 'mention': return <MentionIcon {...props} />;
    case 'table': return <TableIcon {...props} />;
    case 'panel': return <PanelIcon {...props} />;
    case 'decision': return <DecisionIcon {...props} />;
    case 'divider': return <DividerIcon {...props} />;
    case 'expand': return <ExpandIcon {...props} />;
    case 'date': return <DateIcon {...props} />;
    case 'status': return <StatusIcon {...props} />;
    case 'attachment': return <AttachmentIcon {...props} />;
    case 'emoji': return <EmojiIcon {...props} />;
    case 'image': return <ImageIcon {...props} />;
    case 'link': return <LinkIcon {...props} />;
    case 'code': return <CodeIcon {...props} />;
    case 'bullet-list': return <BulletListIcon {...props} />;
    case 'number-list': return <NumberListIcon {...props} />;
    case 'help': return <HelpIcon {...props} />;
    case 'confluence':
    case 'dropbox':
    case 'create-page':
    case 'assets':
      // No dedicated Atlaskit glyph — render a colored squared placeholder.
      return (
        <span
          style={{
            width: 16, height: 16,
            background: primaryColor,
            borderRadius: 2,
            display: 'inline-block',
          }}
        />
      );
  }
}

export function ViewMoreModal({ isOpen, onClose, editor, onExternalAction }: Props) {
  const [tab, setTab] = useState<ModalCategory>('all');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = useMemo(() => filterModalElements(tab, search), [tab, search]);

  // Auto-select first item on open / tab change / filter change.
  useEffect(() => {
    if (!isOpen) return;
    setSelectedId(items[0]?.id ?? null);
  }, [isOpen, tab, items]);

  // Reset state on close.
  useEffect(() => {
    if (!isOpen) {
      setTab('all');
      setSearch('');
      setSelectedId(null);
    }
  }, [isOpen]);

  // Escape closes.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Auto-focus search input on open.
  const searchRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => searchRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [isOpen]);

  if (!isOpen) return null;

  const selected = MODAL_ELEMENTS.find((e) => e.id === selectedId) ?? null;

  const handleInsert = () => {
    if (!selected) return;
    if (selected.externalAction) {
      onExternalAction?.(selected.externalAction);
    } else if (selected.apply && editor) {
      selected.apply(editor);
    }
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Browse elements"
      onMouseDown={(e) => {
        // Click on backdrop closes; clicks on modal card don't bubble here.
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--ds-shadow-raised, rgba(9,30,66,0.54))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2147483600,
      }}
    >
      <div
        style={{
          width: 900,
          maxWidth: '92vw',
          height: 600,
          maxHeight: '90vh',
          background: 'var(--ds-surface-overlay, #FFFFFF)',
          borderRadius: 8,
          /* Drop shadow only — removed the 1px hairline ring so the modal
             has no border, just elevation. */
          boxShadow: '0 12px 24px -8px var(--ds-shadow-raised, rgba(9,30,66,0.30))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily:
            '"Atlassian Sans", ui-sans-serif, -apple-system, system-ui, sans-serif',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ── Top bar — close button on its own row ────────────────── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '10px 12px 0',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              borderRadius: 4,
              background: 'transparent',
              color: 'var(--ds-text-subtle, #44546F)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <CloseIcon label="" />
          </button>
        </div>

        {/* ── Body row — sidebar + main ───────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        {/* NOTE: must NOT be <aside> — src/index.css has a global
            `aside { border-right: ...; box-shadow: inset -1px 0 0 ...;
            background: var(--bg-1); }` rule (lines 1957-1964) that paints
            a divider on every <aside> in the app. Using a plain <div>
            sidesteps it entirely. */}
        <div
          style={{
            width: 200,
            flexShrink: 0,
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h3
            style={{
              margin: 0,
              padding: '8px 16px 28px',
              fontSize: 28,
              fontWeight: 600,
              lineHeight: 1.2,
              color: 'var(--ds-text, #292A2E)',
            }}
          >
            Browse
          </h3>
          <nav style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {MODAL_TABS.map((t) => {
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: 4,
                    background: active
                      ? 'var(--ds-background-selected, #E9F2FE)'
                      : 'transparent',
                    color: active
                      ? 'var(--ds-text-selected, #0C66E4)'
                      : 'var(--ds-text, #292A2E)',
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
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
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Main ───────────────────────────────────────────────────── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Sticky header — search */}
          <header
            style={{
              padding: 16,
              flexShrink: 0,
            }}
          >
            <input
              ref={searchRef}
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 14,
                border: searchFocused
                  ? '2px solid var(--ds-border-focused, #2684FF)'
                  : '2px solid var(--ds-border, #DFE1E6)',
                borderRadius: 4,
                background: 'var(--ds-surface, #FFFFFF)',
                color: 'var(--ds-text, #292A2E)',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 80ms ease',
              }}
            />
          </header>

          {/* Scrollable body — 3-col grid */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {items.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: 'center',
                  color: 'var(--ds-text-subtlest, #6B778C)',
                  fontSize: 13,
                }}
              >
                No elements match
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                }}
              >
                {items.map((el) => {
                  const active = el.id === selectedId;
                  return (
                    <button
                      key={el.id}
                      type="button"
                      title={el.description}
                      onClick={() => setSelectedId(el.id)}
                      onDoubleClick={() => {
                        setSelectedId(el.id);
                        // double-click acts as Insert
                        setTimeout(handleInsert, 0);
                      }}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        paddingLeft: active ? 13 : 12,
                        border: 'none',
                        borderRadius: 4,
                        background: active
                          ? 'var(--ds-background-selected, #E9F2FE)'
                          : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        overflow: 'hidden',
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
                      {active && (
                        <span
                          aria-hidden
                          style={{
                            position: 'absolute',
                            left: 0, top: 0, bottom: 0,
                            width: 3,
                            background: 'var(--ds-border-selected, #0C66E4)',
                          }}
                        />
                      )}
                      <span
                        aria-hidden
                        style={{
                          width: 32, height: 32,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: '1px solid var(--ds-border, #DFE1E6)',
                          borderRadius: 3,
                          background: 'var(--ds-surface, #FFFFFF)',
                        }}
                      >
                        {renderIcon(el)}
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: 'var(--ds-text, #292A2E)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {el.label}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: 'var(--ds-text-subtlest, #6B778C)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {el.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sticky footer — actions */}
          <footer
            style={{
              padding: 12,
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              background: 'transparent',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px 12px',
                fontSize: 14,
                fontWeight: 500,
                border: 'none',
                borderRadius: 3,
                background: 'transparent',
                color: 'var(--ds-text, #292A2E)',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
            <button
              type="button"
              disabled={!selected}
              onClick={handleInsert}
              style={{
                padding: '6px 14px',
                fontSize: 14,
                fontWeight: 500,
                border: 'none',
                borderRadius: 3,
                background: selected
                  ? 'var(--ds-background-brand-bold, #0C66E4)'
                  : 'var(--ds-background-neutral, #F1F2F4)',
                color: selected
                  ? 'var(--ds-text-inverse, #FFFFFF)'
                  : 'var(--ds-text-disabled, #B3B9C4)',
                cursor: selected ? 'pointer' : 'not-allowed',
              }}
            >
              Insert
            </button>
          </footer>
        </main>
        </div>
      </div>
    </div>,
    document.body,
  );
}
