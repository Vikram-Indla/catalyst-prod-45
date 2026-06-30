/**
 * ImageToolbar — floating image-options bar.
 *
 * Layout (matches Jira / Atlaskit editor exactly):
 *
 *   [ Border ][ ▾ ] │ [ Align L ][ Align C ][ Align R ][ Wrap L ][ Wrap R ] │ [ ⋯ ]
 *
 * ⋯ opens a menu with: Add link, Add alt text, Resize, Preview,
 *   ─── divider ─── Copy, Delete (danger).
 *
 * ▾ opens a small border options panel with color swatches + size dots.
 *
 * Positioning:
 *   - Takes the image's Tiptap doc position (`imagePos`); re-measures the
 *     image's DOM rect on mount, on scroll (capture-phase, catches any
 *     scrolling ancestor), and on resize. Toolbar always tracks the image.
 *   - Renders below the image when there's room, above otherwise.
 *   - Portal to document.body so it sits on top of any blocking content.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { LinkInputModal } from '@/components/shared/LinkInputModal';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/react';
// eslint-disable-next-line no-restricted-imports
import AlignImageLeftIcon from '@atlaskit/icon/core/align-image-left';
// eslint-disable-next-line no-restricted-imports
import AlignImageCenterIcon from '@atlaskit/icon/core/align-image-center';
// eslint-disable-next-line no-restricted-imports
import AlignImageRightIcon from '@atlaskit/icon/core/align-image-right';
// eslint-disable-next-line no-restricted-imports
import ContentWrapLeftIcon from '@atlaskit/icon/core/content-wrap-left';
// eslint-disable-next-line no-restricted-imports
import ContentWrapRightIcon from '@atlaskit/icon/core/content-wrap-right';
// eslint-disable-next-line no-restricted-imports
import BorderIcon from '@atlaskit/icon/core/border';
// eslint-disable-next-line no-restricted-imports
import ShowMoreHorizontalIcon from '@atlaskit/icon/core/show-more-horizontal';
// eslint-disable-next-line no-restricted-imports
import LinkIcon from '@atlaskit/icon/core/link';
// eslint-disable-next-line no-restricted-imports
import TextIcon from '@atlaskit/icon/core/text';
// eslint-disable-next-line no-restricted-imports
import ExpandHorizontalIcon from '@atlaskit/icon/core/expand-horizontal';
// eslint-disable-next-line no-restricted-imports
import ImageFullscreenIcon from '@atlaskit/icon/core/image-fullscreen';
// eslint-disable-next-line no-restricted-imports
import CopyIcon from '@atlaskit/icon/core/copy';
// eslint-disable-next-line no-restricted-imports
import DeleteIcon from '@atlaskit/icon/core/delete';
// eslint-disable-next-line no-restricted-imports
import BorderWeightThinIcon from '@atlaskit/icon/core/border-weight-thin';
// eslint-disable-next-line no-restricted-imports
import BorderWeightMediumIcon from '@atlaskit/icon/core/border-weight-medium';
// eslint-disable-next-line no-restricted-imports
import BorderWeightThickIcon from '@atlaskit/icon/core/border-weight-thick';
import {
  BORDER_COLOR_HEX,
  type BorderColor,
  type BorderSize,
  type ImageAlignment,
} from '../../extensions/CatalystImage';

interface Props {
  editor: Editor;
  /** Position of the image node in the Tiptap doc. */
  imagePos: number;
  /** Current attrs sourced from the live image node. */
  alignment: ImageAlignment;
  borderColor: BorderColor | null;
  borderSize: BorderSize;
  src: string;
}

const TOOLBAR_GAP = 8;

export function ImageToolbar({
  editor,
  imagePos,
  alignment,
  borderColor,
  borderSize,
  src,
}: Props) {
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const borderBtnRef = useRef<HTMLButtonElement | null>(null);
  const ellipsisBtnRef = useRef<HTMLButtonElement | null>(null);
  const [borderMenu, setBorderMenu] = useState(false);
  const [ellipsisMenu, setEllipsisMenu] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [imgModal, setImgModal] = useState<'link' | 'alt' | null>(null);
  const [altInput, setAltInput] = useState('');

  // ── Measure the image rect; re-runs on scroll/resize so the toolbar
  //    tracks the image. Position is re-derived from the latest rect. ──
  const measure = useCallback(() => {
    const dom = editor.view.nodeDOM(imagePos) as HTMLElement | null;
    const imgEl =
      dom?.tagName === 'IMG'
        ? (dom as HTMLImageElement)
        : (dom?.querySelector('img') as HTMLImageElement | null);
    if (!imgEl) {
      setRect(null);
      return;
    }
    setRect(imgEl.getBoundingClientRect());
  }, [editor, imagePos]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    // capture-phase so we catch scrolls on any ancestor, not just window
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  // Re-derive (top, left) from rect + toolbar height.
  useLayoutEffect(() => {
    if (!rect || !toolbarRef.current) {
      setPos(null);
      return;
    }
    const tb = toolbarRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    const spaceBelow = vh - rect.bottom;
    const wantsAbove = spaceBelow < tb.height + TOOLBAR_GAP + 8;
    let top = wantsAbove
      ? rect.top - tb.height - TOOLBAR_GAP
      : rect.bottom + TOOLBAR_GAP;
    if (top < 8) top = rect.bottom + TOOLBAR_GAP;
    if (top + tb.height > vh - 8) top = vh - tb.height - 8;

    let left = rect.left + rect.width / 2 - tb.width / 2;
    if (left < 8) left = 8;
    if (left + tb.width > vw - 8) left = vw - tb.width - 8;

    setPos({ top, left });
  }, [rect]);

  // ── Actions on the underlying image node ──
  const updateAttrs = useCallback(
    (patch: Record<string, unknown>) => {
      editor.commands.command(({ state, tr }) => {
        const node = state.doc.nodeAt(imagePos);
        if (!node || node.type.name !== 'image') return false;
        tr.setNodeMarkup(imagePos, undefined, { ...node.attrs, ...patch });
        return true;
      });
    },
    [editor, imagePos],
  );

  const setAlignment = (a: ImageAlignment) => {
    updateAttrs({ alignment: a });
    setBorderMenu(false);
    setEllipsisMenu(false);
  };

  const toggleBorder = () => {
    if (borderColor) {
      updateAttrs({ borderColor: null });
    } else {
      updateAttrs({ borderColor: 'medium', borderSize: borderSize ?? 'medium' });
    }
    setEllipsisMenu(false);
  };

  const setBorderColor = (c: BorderColor) => updateAttrs({ borderColor: c });
  const setBorderSize = (s: BorderSize) => updateAttrs({ borderSize: s });

  const handleCopy = useCallback(async () => {
    if (!src) return;
    try {
      await navigator.clipboard.writeText(src);
    } catch (err) {
      console.error('[ImageToolbar] copy failed', err);
    }
    setEllipsisMenu(false);
  }, [src]);

  const handleDelete = useCallback(() => {
    editor.commands.command(({ tr, state }) => {
      const node = state.doc.nodeAt(imagePos);
      if (!node || node.type.name !== 'image') return false;
      tr.delete(imagePos, imagePos + node.nodeSize);
      return true;
    });
    setEllipsisMenu(false);
  }, [editor, imagePos]);

  const handleAddLink = useCallback(() => {
    setEllipsisMenu(false);
    setImgModal('link');
  }, []);

  const handleAddAlt = useCallback(() => {
    setEllipsisMenu(false);
    setAltInput('');
    setImgModal('alt');
  }, []);

  const handlePreview = useCallback(() => {
    if (!src) return;
    window.open(src, '_blank', 'noopener,noreferrer');
    setEllipsisMenu(false);
  }, [src]);

  const handleResize = useCallback(() => {
    // Resize lives on the image element itself (corner handles) — for v1
    // we just close the menu. Real resize handles can be a later add.
    setEllipsisMenu(false);
  }, []);

  if (!rect) return null;

  return createPortal(
    <>
      <div
        ref={toolbarRef}
        role="toolbar"
        aria-label="Image options"
        onMouseDown={(e) => e.preventDefault()}
        style={{
          position: 'fixed',
          top: pos?.top ?? 0,
          left: pos?.left ?? 0,
          zIndex: 2147483600,
          visibility: pos ? 'visible' : 'hidden',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0,
          padding: 4,
          background: 'var(--ds-surface-overlay)',
          border: '1px solid var(--ds-border)',
          borderRadius: 4,
          boxShadow:
            '0 4px 8px -2px var(--ds-shadow-raised, rgba(9,30,66,0.25)), 0 0 1px var(--ds-shadow-raised, rgba(9,30,66,0.31))',
          fontFamily:
            '"Atlassian Sans", ui-sans-serif, -apple-system, system-ui, sans-serif',
        }}
      >
        <ToolBtn
          ref={borderBtnRef}
          label="Toggle border"
          active={!!borderColor}
          onClick={toggleBorder}
        >
          <BorderIcon label="" />
        </ToolBtn>
        <ToolBtn
          label="Border options"
          active={borderMenu}
          compact
          onClick={() => {
            setEllipsisMenu(false);
            setBorderMenu((v) => !v);
          }}
        >
          <ChevronDown />
        </ToolBtn>

        <Separator />

        <ToolBtn
          label="Align left"
          active={alignment === 'align-start'}
          onClick={() => setAlignment('align-start')}
        >
          <AlignImageLeftIcon label="" />
        </ToolBtn>
        <ToolBtn
          label="Align center"
          active={alignment === 'center'}
          onClick={() => setAlignment('center')}
        >
          <AlignImageCenterIcon label="" />
        </ToolBtn>
        <ToolBtn
          label="Align right"
          active={alignment === 'align-end'}
          onClick={() => setAlignment('align-end')}
        >
          <AlignImageRightIcon label="" />
        </ToolBtn>
        <ToolBtn
          label="Wrap left"
          active={alignment === 'wrap-left'}
          onClick={() => setAlignment('wrap-left')}
        >
          <ContentWrapLeftIcon label="" />
        </ToolBtn>
        <ToolBtn
          label="Wrap right"
          active={alignment === 'wrap-right'}
          onClick={() => setAlignment('wrap-right')}
        >
          <ContentWrapRightIcon label="" />
        </ToolBtn>

        <Separator />

        <ToolBtn
          ref={ellipsisBtnRef}
          label="More options"
          active={ellipsisMenu}
          onClick={() => {
            setBorderMenu(false);
            setEllipsisMenu((v) => !v);
          }}
        >
          <ShowMoreHorizontalIcon label="" />
        </ToolBtn>
      </div>

      {borderMenu && pos && (
        <BorderMenu
          anchorRef={borderBtnRef}
          color={borderColor}
          size={borderSize}
          onPickColor={setBorderColor}
          onPickSize={setBorderSize}
          onClose={() => setBorderMenu(false)}
        />
      )}

      {ellipsisMenu && pos && (
        <EllipsisMenu
          anchorRef={ellipsisBtnRef}
          onAddLink={handleAddLink}
          onAddAlt={handleAddAlt}
          onResize={handleResize}
          onPreview={handlePreview}
          onCopy={handleCopy}
          onDelete={handleDelete}
          onClose={() => setEllipsisMenu(false)}
        />
      )}

      <LinkInputModal
        isOpen={imgModal === 'link'}
        onClose={() => setImgModal(null)}
        onConfirm={(href) => {
          updateAttrs({ /* link stored as part of image attrs — future */ });
          console.info('[ImageToolbar] add-link not yet wired; href:', href);
          setImgModal(null);
        }}
        title="Add link to image"
      />

      {imgModal === 'alt' && (
        <ModalDialog onClose={() => setImgModal(null)} width="small">
          <ModalHeader hasCloseButton>
            <ModalTitle>Add alt text</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <div>
              <label style={{
                display: 'block',
                marginBottom: 4,
                fontSize: 'var(--ds-font-size-300)',
                fontWeight: 600,
                color: 'var(--ds-text)',
              }}>
                Description
              </label>
              <Textfield
                value={altInput}
                onChange={(e) => setAltInput((e.target as HTMLInputElement).value)}
                placeholder="Describe this image"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateAttrs({ alt: altInput });
                    setImgModal(null);
                  }
                }}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={() => setImgModal(null)}>Cancel</Button>
            <Button appearance="primary" onClick={() => { updateAttrs({ alt: altInput }); setImgModal(null); }}>
              Save
            </Button>
          </ModalFooter>
        </ModalDialog>
      )}
    </>,
    document.body,
  );
}

/* ── Primitives ───────────────────────────────────────────────────── */

// React 18: ref forwarding REQUIRES forwardRef. Without it, refs passed
// from parents (ellipsisBtnRef, borderBtnRef) silently never attach, the
// anchor positioning then defaults to {top:0,left:0}, and menus open at
// the top-left of the viewport. Use forwardRef explicitly.
const ToolBtn = forwardRef<
  HTMLButtonElement,
  {
    label: string;
    active?: boolean;
    compact?: boolean;
    onClick: () => void;
    children: ReactNode;
  }
>(function ToolBtn({ label, active = false, compact = false, onClick, children }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        width: compact ? 18 : 28,
        height: 28,
        padding: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: 3,
        background: active
          ? 'var(--ds-background-selected)'
          : 'transparent',
        color: active
          ? 'var(--ds-text-selected)'
          : 'var(--ds-text-subtle)',
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
      {children}
    </button>
  );
});

function Separator() {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 1,
        height: 16,
        background: 'var(--ds-border)',
        margin: '0 4px',
      }}
    />
  );
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M3 4.5 L6 7.5 L9 4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Ellipsis dropdown ───────────────────────────────────────────── */

function EllipsisMenu({
  anchorRef,
  onAddLink,
  onAddAlt,
  onResize,
  onPreview,
  onCopy,
  onDelete,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onAddLink: () => void;
  onAddAlt: () => void;
  onResize: () => void;
  onPreview: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const pos = useAnchorPos(anchorRef, 'right');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      if (anchorRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [anchorRef, onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        top: pos.top,
        right: pos.right,
        zIndex: 2147483600,
        minWidth: 180,
        padding: '4px 0',
        background: 'var(--ds-surface-overlay)',
        border: '1px solid var(--ds-border)',
        borderRadius: 4,
        boxShadow:
          '0 4px 8px -2px var(--ds-shadow-raised, rgba(9,30,66,0.25)), 0 0 1px var(--ds-shadow-raised, rgba(9,30,66,0.31))',
      }}
    >
      <MenuRow icon={<LinkIcon label="" />} label="Add link" onClick={onAddLink} />
      <MenuRow icon={<TextIcon label="" />} label="Add alt text" onClick={onAddAlt} />
      <MenuRow icon={<ExpandHorizontalIcon label="" />} label="Resize" onClick={onResize} />
      <MenuRow icon={<ImageFullscreenIcon label="" />} label="Preview" onClick={onPreview} />
      <Divider />
      <MenuRow icon={<CopyIcon label="" />} label="Copy" onClick={onCopy} />
      <MenuRow icon={<DeleteIcon label="" />} label="Delete" onClick={onDelete} danger />
    </div>
  );
}

function MenuRow({
  icon, label, onClick, danger = false,
}: {
  icon: ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      role="menuitem"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '8px 12px',
        border: 'none',
        background: hovered
          ? danger
            ? 'var(--ds-background-danger)'
            : 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'
          : 'transparent',
        color: danger
          ? 'var(--ds-text-danger)'
          : 'var(--ds-text)',
        cursor: 'pointer',
        fontSize: 'var(--ds-font-size-400)',
        textAlign: 'left',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          color: danger
            ? 'var(--ds-text-danger)'
            : 'var(--ds-text-subtle)',
        }}
      >
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function Divider() {
  return (
    <div
      aria-hidden
      style={{
        height: 1,
        margin: '4px 0',
        background: 'var(--ds-border)',
      }}
    />
  );
}

/* ── Border options panel ────────────────────────────────────────── */

function BorderMenu({
  anchorRef, color, size, onPickColor, onPickSize, onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  color: BorderColor | null;
  size: BorderSize;
  onPickColor: (c: BorderColor) => void;
  onPickSize: (s: BorderSize) => void;
  onClose: () => void;
}) {
  const pos = useAnchorPos(anchorRef, 'left');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      if (anchorRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [anchorRef, onClose]);

  const COLORS: BorderColor[] = ['light', 'medium', 'dark'];
  const SIZES: Array<[BorderSize, ReactNode]> = [
    ['small', <BorderWeightThinIcon key="s" label="" />],
    ['medium', <BorderWeightMediumIcon key="m" label="" />],
    ['large', <BorderWeightThickIcon key="l" label="" />],
  ];

  return (
    <div
      ref={menuRef}
      role="menu"
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 2147483600,
        padding: 8,
        background: 'var(--ds-surface-overlay)',
        border: '1px solid var(--ds-border)',
        borderRadius: 4,
        boxShadow:
          '0 4px 8px -2px var(--ds-shadow-raised, rgba(9,30,66,0.25)), 0 0 1px var(--ds-shadow-raised, rgba(9,30,66,0.31))',
      }}
    >
      <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>Color</div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Border color ${c}`}
            onClick={() => onPickColor(c)}
            style={{
              width: 24, height: 24,
              border: color === c
                ? '2px solid var(--ds-border-selected)'
                : '1px solid var(--ds-shadow-raised, rgba(0,0,0,0.1))',
              borderRadius: 3,
              background: BORDER_COLOR_HEX[c],
              cursor: 'pointer',
              padding: 0,
              boxSizing: 'border-box',
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtle)', marginBottom: 4 }}>Size</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {SIZES.map(([s, icon]) => (
          <button
            key={s}
            type="button"
            aria-label={`Border size ${s}`}
            onClick={() => onPickSize(s)}
            style={{
              width: 28, height: 28,
              border: size === s
                ? '1.5px solid var(--ds-border-selected)'
                : '1px solid var(--ds-border)',
              borderRadius: 3,
              background: 'var(--ds-surface)',
              color: 'var(--ds-text)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Anchor positioning hook for the menus ──────────────────────── */

function useAnchorPos(
  anchorRef: React.RefObject<HTMLElement | null>,
  align: 'left' | 'right',
) {
  const compute = (): { top: number; left?: number; right?: number } => {
    const el = anchorRef.current;
    if (!el) return { top: 0, left: 0 };
    const r = el.getBoundingClientRect();
    return align === 'left'
      ? { top: r.bottom + 4, left: r.left }
      : { top: r.bottom + 4, right: window.innerWidth - r.right };
  };
  // Initial state is {top:0,left:0} because anchorRef is null on first
  // render. useLayoutEffect then immediately re-computes the real
  // position once the ref is attached — before paint, so the menu
  // never visually appears at 0,0.
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number }>(
    { top: 0, left: 0 },
  );
  useLayoutEffect(() => {
    setPos(compute());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorRef, align]);
  useEffect(() => {
    const handler = () => setPos(compute());
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorRef, align]);
  return pos;
}
