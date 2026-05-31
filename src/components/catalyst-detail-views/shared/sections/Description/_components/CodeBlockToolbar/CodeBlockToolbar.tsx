/**
 * CodeBlockToolbar — floating bar that appears below the active code
 * block (mirrors Jira's code-block toolbar probed 2026-05-31).
 *
 * Layout (left → right):
 *   [ Select language ▾ ] [ ⤶ wrap ] │ [ ⋯ ]
 *
 * - Select language: searchable dropdown of 87 Jira-parity languages
 *   (see codeBlockLanguages.ts). Writes `language` attr on the codeBlock
 *   node — stored verbatim so docs round-trip to Jira lossless. Focus
 *   ring is the blue border per ADS. Hover row = blue rail + neutral
 *   grey bg; selected row = blue rail + light-blue bg (matches probe).
 *
 * - Wrap toggle: writes the custom `wrapped` boolean attr. The wrapper
 *   sets data-wrapped="true"; editorStyles.ts handles the soft-wrap CSS.
 *
 * - 3-dots menu: Copy (HTML clipboard of code text) + Delete.
 *
 * Positioning: re-uses TableToolbar's approach — listen to selection +
 * transaction, measure the code block rect, render via document.body
 * portal. Renders only when the cursor is inside a codeBlock node and
 * the editor is editable.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
import { NodeSelection, type EditorState } from '@tiptap/pm/state';
// eslint-disable-next-line no-restricted-imports
import ShowMoreHorizontalIcon from '@atlaskit/icon/core/show-more-horizontal';
// eslint-disable-next-line no-restricted-imports
import CopyIcon from '@atlaskit/icon/core/copy';
// eslint-disable-next-line no-restricted-imports
import DeleteIcon from '@atlaskit/icon/core/delete';
// eslint-disable-next-line no-restricted-imports
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import { ChevronDownGlyph } from '../Toolbar/ChevronDownGlyph';
import {
  CODE_LANGUAGES,
  CODE_LANGUAGE_NONE,
  findCodeLanguage,
  type CodeLanguage,
} from '../../data/codeBlockLanguages';

interface Props {
  editor: Editor;
  containerRef: RefObject<HTMLElement | null>;
}

interface CodeBlockAttrs {
  language?: string | null;
  wrapped?: boolean;
}

interface ActiveBlock {
  pos: number;
  rect: DOMRect;
  attrs: CodeBlockAttrs;
  text: string;
}

const TOOLBAR_GAP = 8;
const ICON_COLOR = 'var(--ds-text, #292A2E)';
const ICON_COLOR_ACTIVE = 'var(--ds-text-information, #0C66E4)';

function findCodeBlockAt(state: EditorState) {
  const { $from } = state.selection;
  for (let d = $from.depth; d >= 0; d--) {
    const node = $from.node(d);
    if (node.type.name === 'codeBlock') {
      return { node, pos: $from.before(d) };
    }
  }
  // NodeSelection on a code block.
  if (state.selection instanceof NodeSelection) {
    const node = state.selection.node;
    if (node.type.name === 'codeBlock') {
      return { node, pos: state.selection.from };
    }
  }
  return null;
}

export function CodeBlockToolbar({ editor, containerRef }: Props) {
  const [active, setActive] = useState<ActiveBlock | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const measure = useCallback(() => {
    const found = findCodeBlockAt(editor.state);
    if (!found) {
      setActive((prev) => (prev === null ? prev : null));
      return;
    }
    const rendered = editor.view.nodeDOM(found.pos) as HTMLElement | null;
    if (!rendered) {
      setActive((prev) => (prev === null ? prev : null));
      return;
    }
    const blockEl =
      rendered.classList?.contains('catalyst-code-block')
        ? rendered
        : (rendered.querySelector('.catalyst-code-block') as HTMLElement | null) ??
          rendered;
    const raw = blockEl.getBoundingClientRect();
    const rect = {
      top: Math.round(raw.top),
      left: Math.round(raw.left),
      width: Math.round(raw.width),
      height: Math.round(raw.height),
      bottom: Math.round(raw.bottom),
      right: Math.round(raw.right),
      x: Math.round(raw.x),
      y: Math.round(raw.y),
      toJSON: raw.toJSON,
    } as DOMRect;
    const attrs = found.node.attrs as CodeBlockAttrs;
    const text = found.node.textContent;
    setActive((prev) => {
      if (
        prev &&
        prev.pos === found.pos &&
        prev.rect.top === rect.top &&
        prev.rect.left === rect.left &&
        prev.rect.width === rect.width &&
        prev.rect.height === rect.height &&
        prev.attrs.language === attrs.language &&
        prev.attrs.wrapped === attrs.wrapped &&
        prev.text === text
      ) {
        return prev;
      }
      return { pos: found.pos, rect, attrs, text };
    });
  }, [editor]);

  useEffect(() => {
    measure();
    editor.on('selectionUpdate', measure);
    editor.on('transaction', measure);
    return () => {
      editor.off('selectionUpdate', measure);
      editor.off('transaction', measure);
    };
  }, [editor, measure]);

  useEffect(() => {
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  useLayoutEffect(() => {
    if (!active || !toolbarRef.current) {
      setPos((prev) => (prev === null ? prev : null));
      return;
    }
    const tb = toolbarRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - active.rect.bottom - TOOLBAR_GAP;
    const fitsBelow = spaceBelow >= tb.height;
    const top = fitsBelow
      ? active.rect.bottom + TOOLBAR_GAP
      : Math.max(8, active.rect.top - tb.height - TOOLBAR_GAP);
    const left = Math.max(
      8,
      active.rect.left + active.rect.width / 2 - tb.width / 2,
    );
    setPos((prev) => {
      if (prev && prev.top === top && prev.left === left) return prev;
      return { top, left };
    });
  }, [active]);

  if (!active || !editor.isEditable) return null;

  return createPortal(
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Code block options"
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: 4,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 6,
        boxShadow: '0 4px 12px rgba(9,30,66,0.15)',
        zIndex: 2147483600,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      <LanguageSelect editor={editor} active={active} />
      <WrapToggle editor={editor} active={active} />
      <Divider />
      <EllipsisButton editor={editor} active={active} />
    </div>,
    document.body,
  );
}

/* ──────────────────────────── helpers ──────────────────────────── */

function Divider() {
  return (
    <span
      aria-hidden
      style={{
        width: 1,
        alignSelf: 'stretch',
        background: 'var(--ds-border, #DFE1E6)',
        margin: '4px 2px',
      }}
    />
  );
}

interface IconBtnProps {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: ReactNode;
  active?: boolean;
  innerRef?: React.Ref<HTMLButtonElement>;
}

function IconBtn({
  label,
  onClick,
  children,
  active = false,
  innerRef,
}: IconBtnProps) {
  return (
    <button
      ref={innerRef}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 28,
        height: 28,
        padding: '0 6px',
        border: 'none',
        borderRadius: 4,
        background: active
          ? 'var(--ds-background-selected, #E9F2FE)'
          : 'transparent',
        color: active ? ICON_COLOR_ACTIVE : ICON_COLOR,
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background =
            'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      {children}
    </button>
  );
}

/* ────────────────── Wrap glyph (matches Jira's hooked arrow) ────────────────── */

function WrapGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 4h12" />
      <path d="M2 8h10a2 2 0 0 1 0 4H7" />
      <polyline points="9.5,10 7,12 9.5,14" />
      <path d="M2 14h3" />
    </svg>
  );
}

/* ────────────────── tool: Wrap toggle ────────────────── */

function WrapToggle({
  editor,
  active,
}: {
  editor: Editor;
  active: ActiveBlock;
}) {
  const isWrapped = !!active.attrs.wrapped;
  const handle = () => {
    editor
      .chain()
      .command(({ tr, state }) => {
        const node = state.doc.nodeAt(active.pos);
        if (!node || node.type.name !== 'codeBlock') return false;
        tr.setNodeMarkup(active.pos, undefined, {
          ...node.attrs,
          wrapped: !isWrapped,
        });
        return true;
      })
      .run();
  };
  return (
    <IconBtn
      label={isWrapped ? 'Turn off wrap' : 'Turn on wrap'}
      onClick={handle}
      active={isWrapped}
    >
      <WrapGlyph />
    </IconBtn>
  );
}

/* ────────────────── tool: Language select ────────────────── */

const TRIGGER_WIDTH = 168;
const DROPDOWN_HEIGHT = 280;

function LanguageSelect({
  editor,
  active,
}: {
  editor: Editor;
  active: ActiveBlock;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // One ref that points to WHICHEVER element is currently rendered
  // (the idle button or the open-mode input). The dropdown anchors to
  // this ref so the position is always correct regardless of which
  // mode the trigger is in.
  const triggerRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const current = findCodeLanguage(active.attrs.language ?? null);
  const [highlight, setHighlight] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CODE_LANGUAGES;
    return CODE_LANGUAGES.filter((l) => l.label.toLowerCase().includes(q));
  }, [query]);

  const setLanguage = useCallback(
    (lang: CodeLanguage) => {
      editor
        .chain()
        .command(({ tr, state }) => {
          const node = state.doc.nodeAt(active.pos);
          if (!node || node.type.name !== 'codeBlock') return false;
          tr.setNodeMarkup(active.pos, undefined, {
            ...node.attrs,
            language: lang === CODE_LANGUAGE_NONE ? null : lang.label,
          });
          return true;
        })
        .run();
      setOpen(false);
      setQuery('');
    },
    [editor, active.pos],
  );

  // On open: focus the input (so the user can immediately type) and
  // land the highlight on the currently selected language.
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      const el = triggerRef.current;
      if (el && el instanceof HTMLInputElement) el.focus();
    });
    const idx = filtered.findIndex((l) => l.label === current.label);
    setHighlight(idx >= 0 ? idx : 0);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep highlight in range as the filter changes.
  useEffect(() => {
    setHighlight((h) => Math.min(h, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  // Scroll the highlighted row into view.
  useLayoutEffect(() => {
    if (!open || !listRef.current) return;
    const row = listRef.current.querySelector<HTMLElement>(
      `[data-lang-idx="${highlight}"]`,
    );
    row?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  // Outside-click + Escape dismiss.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      const dd = document.getElementById('catalyst-code-lang-dropdown');
      if (dd && dd.contains(t)) return;
      setOpen(false);
      setQuery('');
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  // Dropdown coords — track the trigger's viewport rect continuously
  // while open so the dropdown follows the toolbar smoothly on page
  // scroll, on window resize, AND when the parent toolbar reflows in
  // response to selection / transaction changes (active.rect deps).
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  useLayoutEffect(() => {
    if (!open) {
      setCoords((prev) => (prev === null ? prev : null));
      return;
    }
    const measure = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const next = { top: r.bottom + 4, left: r.left };
      setCoords((prev) =>
        prev && prev.top === next.top && prev.left === next.left ? prev : next,
      );
    };
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
    // active.rect.* is intentionally in deps so we remeasure whenever
    // the parent toolbar reflows (selection moved, content edited,
    // wrap toggled, etc.) — guarantees the dropdown sticks to the
    // trigger even when no scroll event fires.
  }, [
    open,
    active.rect.top,
    active.rect.left,
    active.rect.width,
    active.rect.height,
  ]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const lang = filtered[highlight];
      if (lang) setLanguage(lang);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHighlight(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setHighlight(filtered.length - 1);
    }
  };

  // Shared trigger styling — used by both the idle <button> and the
  // open-mode <input> so swapping between them is visually seamless.
  const triggerStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxSizing: 'border-box',
    height: 32,
    width: TRIGGER_WIDTH,
    padding: '0 10px',
    background: 'var(--ds-surface, #FFFFFF)',
    border: `${open ? 2 : 1}px solid ${
      open
        ? 'var(--ds-border-focused, #388BFF)'
        : 'var(--ds-border-input, #8590A2)'
    }`,
    borderRadius: 4,
    fontSize: 14,
    color:
      current === CODE_LANGUAGE_NONE
        ? 'var(--ds-text-subtle, #6B778C)'
        : 'var(--ds-text, #292A2E)',
    cursor: open ? 'text' : 'pointer',
    // Compensate the 1→2px border-width change so the trigger doesn't
    // jump 1px when focused.
    margin: open ? -1 : 0,
    outline: 'none',
  };

  return (
    <>
      {open ? (
        <span
          style={{
            ...triggerStyle,
            // span wraps the input + chevron to keep the border /
            // height / padding in one place; the inner input is the
            // typed-into element.
            padding: 0,
          }}
          onMouseDown={(e) => {
            // Clicking anywhere inside the trigger frame focuses the
            // input — keeps the cursor from being lost when the user
            // clicks on the chevron or padding instead of the text.
            const t = e.target as HTMLElement;
            if (t.tagName !== 'INPUT') {
              e.preventDefault();
              const inp = triggerRef.current;
              if (inp instanceof HTMLInputElement) inp.focus();
            }
          }}
        >
          <input
            ref={(el) => {
              triggerRef.current = el;
            }}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder={
              current === CODE_LANGUAGE_NONE ? 'Select language' : current.label
            }
            aria-label="Select language"
            aria-autocomplete="list"
            aria-controls="catalyst-code-lang-dropdown"
            aria-expanded
            aria-haspopup="listbox"
            style={{
              flex: 1,
              minWidth: 0,
              height: '100%',
              padding: '0 10px',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 14,
              color: 'var(--ds-text, #292A2E)',
            }}
          />
          <span
            aria-hidden
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 8px 0 0',
              color: 'var(--ds-text-subtle, #6B778C)',
              pointerEvents: 'none',
            }}
          >
            <ChevronDownGlyph />
          </span>
        </span>
      ) : (
        <button
          ref={(el) => {
            triggerRef.current = el;
          }}
          type="button"
          title="Select language"
          aria-haspopup="listbox"
          aria-expanded={false}
          onClick={() => setOpen(true)}
          onMouseDown={(e) => e.preventDefault()}
          style={triggerStyle}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {current === CODE_LANGUAGE_NONE ? 'Select language' : current.label}
          </span>
          <ChevronDownGlyph />
        </button>
      )}
      {open && coords
        ? createPortal(
            <div
              id="catalyst-code-lang-dropdown"
              onMouseDown={(e) => e.preventDefault()}
              style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                width: TRIGGER_WIDTH,
                background: 'var(--ds-surface-overlay, #FFFFFF)',
                border: '1px solid var(--ds-border, #DFE1E6)',
                borderRadius: 4,
                boxShadow: '0 6px 20px rgba(9,30,66,0.18)',
                zIndex: 2147483647,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                ref={listRef}
                role="listbox"
                aria-label="Code languages"
                style={{
                  maxHeight: DROPDOWN_HEIGHT,
                  overflowY: 'auto',
                  padding: 2,
                }}
              >
                {filtered.length === 0 ? (
                  <div
                    style={{
                      padding: '8px 12px',
                      fontSize: 13,
                      color: 'var(--ds-text-subtle, #6B778C)',
                    }}
                  >
                    No matches
                  </div>
                ) : (
                  filtered.map((lang, idx) => {
                    const isSelected = lang.label === current.label;
                    const isHighlighted = idx === highlight;
                    return (
                      <LanguageRow
                        key={lang.label}
                        index={idx}
                        lang={lang}
                        selected={isSelected}
                        highlighted={isHighlighted}
                        onHover={() => setHighlight(idx)}
                        onPick={() => setLanguage(lang)}
                      />
                    );
                  })
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

interface LanguageRowProps {
  index: number;
  lang: CodeLanguage;
  selected: boolean;
  highlighted: boolean;
  onHover: () => void;
  onPick: () => void;
}

function LanguageRow({
  index,
  lang,
  selected,
  highlighted,
  onHover,
  onPick,
}: LanguageRowProps) {
  // Visual states:
  //  - selected         → blue rail (2px) + light-blue bg
  //  - highlighted only → blue rail (2px) + neutral grey bg
  //  - idle             → no rail, transparent bg
  const showRail = selected || highlighted;
  const bg = selected
    ? 'var(--ds-background-selected, #E9F2FE)'
    : highlighted
      ? 'var(--ds-background-neutral, #F1F2F4)'
      : 'transparent';
  return (
    <div
      role="option"
      data-lang-idx={index}
      aria-selected={selected}
      onMouseEnter={onHover}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
      style={{
        position: 'relative',
        padding: '7px 12px 7px 14px',
        fontSize: 13,
        fontWeight: selected ? 500 : 400,
        color: selected
          ? 'var(--ds-text-information, #0C66E4)'
          : 'var(--ds-text, #292A2E)',
        cursor: 'pointer',
        borderRadius: 3,
        background: bg,
      }}
    >
      {showRail ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            insetInlineStart: 0,
            top: 4,
            bottom: 4,
            width: 2,
            background: 'var(--ds-border-focused, #388BFF)',
            borderRadius: 2,
          }}
        />
      ) : null}
      {lang.label}
    </div>
  );
}

/* ────────────────── tool: 3-dots (Copy / Delete) ────────────────── */

function EllipsisButton({
  editor,
  active,
}: {
  editor: Editor;
  active: ActiveBlock;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const handleCopy = () => {
    const text = active.text ?? '';
    try {
      void navigator.clipboard?.writeText?.(text);
    } catch {
      /* swallow — non-clipboard browsers / iframes */
    }
    setOpen(false);
  };
  const handleDelete = () => {
    editor
      .chain()
      .command(({ tr, state }) => {
        const node = state.doc.nodeAt(active.pos);
        if (!node || node.type.name !== 'codeBlock') return false;
        tr.delete(active.pos, active.pos + node.nodeSize);
        return true;
      })
      .focus()
      .run();
    setOpen(false);
  };

  return (
    <>
      <IconBtn
        innerRef={btnRef}
        label="More options"
        onClick={() => setOpen((v) => !v)}
        active={open}
      >
        <ShowMoreHorizontalIcon label="" />
      </IconBtn>
      <Dropdown open={open} anchorRef={btnRef} onClose={() => setOpen(false)}>
        <MenuItem
          label="Copy"
          icon={<CopyIcon label="" />}
          onClick={handleCopy}
        />
        <MenuItem
          label="Delete"
          icon={<DeleteIcon label="" />}
          onClick={handleDelete}
          danger
        />
      </Dropdown>
    </>
  );
}

interface DropdownProps {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  minWidth?: number;
}

function Dropdown({
  open,
  anchorRef,
  onClose,
  children,
  minWidth = 160,
}: DropdownProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 4, left: r.right - minWidth });
  }, [open, anchorRef, minWidth]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        ref.current?.contains(e.target as Node) ||
        anchorRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onClose, anchorRef]);

  if (!open || !coords) return null;

  return createPortal(
    <div
      ref={ref}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        minWidth,
        background: 'var(--ds-surface-overlay, #FFFFFF)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 6,
        boxShadow: '0 6px 20px rgba(9,30,66,0.18)',
        padding: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        zIndex: 2147483647,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

interface MenuItemProps {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

function MenuItem({ label, icon, onClick, danger = false }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '7px 10px',
        border: 'none',
        borderRadius: 4,
        background: 'transparent',
        color: danger
          ? 'var(--ds-text-danger, #AE2A19)'
          : 'var(--ds-text, #292A2E)',
        fontSize: 13,
        fontWeight: 400,
        cursor: 'pointer',
        textAlign: 'start',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background =
          'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {icon ? (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          {icon}
        </span>
      ) : null}
      <span style={{ flex: 1 }}>{label}</span>
      {danger ? null : (
        <CheckMarkIcon
          label=""
          color="transparent"
        />
      )}
    </button>
  );
}
