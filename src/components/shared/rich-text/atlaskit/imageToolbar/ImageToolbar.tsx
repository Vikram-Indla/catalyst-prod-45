import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { openImagePreview } from '@/lib/openImagePreview';
import {
  setMediaSingleAttrs,
  setInnerMediaAttrs,
  removeMediaSingle,
  readMediaSingleAttrs,
  readInnerMediaAttrs,
  type MinimalEditorView,
} from './imageNodeOps';
import type { ImageSelection } from './useImageToolbarController';
import { catalystToast } from '@/lib/catalystToast';
import { ChevronDown, ChevronLeft, ChevronRight } from '@/lib/atlaskit-icons';
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

interface ImageToolbarProps {
  selection: ImageSelection | null;
  getEditorView: () => MinimalEditorView | null;
  onDismiss: () => void;
}

const LAYOUT_ALIGN_LEFT = 'align-start' as const;
const LAYOUT_ALIGN_CENTER = 'center' as const;
const LAYOUT_ALIGN_RIGHT = 'align-end' as const;
const LAYOUT_WRAP_LEFT = 'wrap-left' as const;
const LAYOUT_WRAP_RIGHT = 'wrap-right' as const;

type BorderColor = 'light' | 'medium' | 'dark';
type BorderSize = 'small' | 'medium' | 'large';
const BORDER_COLOR_HEX: Record<BorderColor, string> = {
  light: 'var(--ds-border-disabled)',
  medium: 'var(--ds-text-disabled)',
  dark: 'var(--ds-surface)',
};
const BORDER_SIZE_PX: Record<BorderSize, number> = {
  small: 1,
  medium: 2,
  large: 4,
};

const T = {
  surface: 'var(--ds-surface-overlay)',
  border: 'var(--ds-border)',
  textSubtle: 'var(--ds-text-subtle)',
  textBold: 'var(--ds-text)',
  hoverBg: 'var(--ds-background-neutral-subtle-hovered)',
  activeBg: 'var(--ds-background-selected)',
  activeText: 'var(--ds-text-selected)',
  dangerText: 'var(--ds-text-danger)',
  dangerBg: 'var(--ds-background-danger)',
  shadow: '0 4px 8px -2px var(--ds-shadow-raised, rgba(9,30,66,0.25)), 0 0 1px var(--ds-shadow-raised, rgba(9,30,66,0.31))',
};

export function ImageToolbar({ selection, getEditorView, onDismiss }: ImageToolbarProps) {
  if (!selection) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: selection.top,
        left: selection.centerX,
        transform: 'translateX(-50%)',
        zIndex: 100,
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => e.stopPropagation()}
    >
      <ImageToolbarInner
        key={selection.version}
        selection={selection}
        getEditorView={getEditorView}
        onDismiss={onDismiss}
      />
    </div>
  );
}

function ImageToolbarInner({
  selection,
  getEditorView,
  onDismiss,
}: {
  selection: ImageSelection;
  getEditorView: () => MinimalEditorView | null;
  onDismiss: () => void;
}) {
  const borderBtnRef = useRef<HTMLButtonElement>(null);
  const ellipsisBtnRef = useRef<HTMLButtonElement>(null);
  const [borderMenuOpen, setBorderMenuOpen] = useState(false);
  const [ellipsisOpen, setEllipsisOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [altOpen, setAltOpen] = useState(false);

  const closeAllMenus = useCallback(() => {
    setBorderMenuOpen(false);
    setEllipsisOpen(false);
    setLinkOpen(false);
    setAltOpen(false);
  }, []);

  const initialAttrs = useMemo(
    () => readMediaSingleAttrs(getEditorView(), selection.wrapperEl) ?? {},
    [selection.wrapperEl, selection.version, getEditorView],
  );
  const initialInner = useMemo(
    () => readInnerMediaAttrs(getEditorView(), selection.wrapperEl) ?? {},
    [selection.wrapperEl, selection.version, getEditorView],
  );

  const currentLayout = (initialAttrs.layout as string) ?? LAYOUT_ALIGN_CENTER;
  const currentBorderColor = (initialAttrs.borderColor as BorderColor | undefined) ?? null;
  const currentBorderSize = (initialAttrs.borderSize as BorderSize | undefined) ?? 'medium';
  const hasBorder = currentBorderColor != null;

  useEffect(() => {
    const img = selection.wrapperEl.querySelector<HTMLImageElement>(
      'img[data-catalyst-injected="true"]',
    );
    if (!img) return;
    if (hasBorder && currentBorderColor) {
      img.style.border = `${BORDER_SIZE_PX[currentBorderSize]}px solid ${BORDER_COLOR_HEX[currentBorderColor]}`;
    } else {
      img.style.border = '';
    }
  }, [hasBorder, currentBorderColor, currentBorderSize, selection.wrapperEl, selection.version]);

  const setLayout = useCallback(
    (layout: string) => {
      setMediaSingleAttrs(getEditorView(), selection.wrapperEl, { layout });
    },
    [getEditorView, selection.wrapperEl],
  );

  const setBorder = useCallback(
    (patch: { borderColor?: BorderColor | null; borderSize?: BorderSize }) => {
      const view = getEditorView();
      const next: Record<string, unknown> = {};
      if ('borderColor' in patch) next.borderColor = patch.borderColor;
      if ('borderSize' in patch) next.borderSize = patch.borderSize;
      setMediaSingleAttrs(view, selection.wrapperEl, next);
    },
    [getEditorView, selection.wrapperEl],
  );

  const toggleBorder = useCallback(() => {
    if (hasBorder) {
      setBorder({ borderColor: null });
    } else {
      setBorder({ borderColor: 'medium', borderSize: currentBorderSize });
    }
  }, [hasBorder, currentBorderSize, setBorder]);

  const handleCopy = useCallback(async () => {
    const url = (initialInner.url as string) ?? '';
    if (!url) {
      catalystToast.error('No image URL to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      catalystToast.success('Image URL copied');
    } catch {
      catalystToast.error('Copy failed');
    }
    closeAllMenus();
  }, [initialInner, closeAllMenus]);

  const handleDelete = useCallback(() => {
    const ok = removeMediaSingle(getEditorView(), selection.wrapperEl);
    if (!ok) catalystToast.error('Delete failed');
    onDismiss();
  }, [getEditorView, selection.wrapperEl, onDismiss]);

  const handlePreview = useCallback(() => {
    const url = (initialInner.url as string) ?? '';
    if (url) openImagePreview(url);
  }, [initialInner]);

  const handleSetAlt = useCallback(
    (alt: string) => {
      setInnerMediaAttrs(getEditorView(), selection.wrapperEl, { alt });
      const img = selection.wrapperEl.querySelector<HTMLImageElement>(
        'img[data-catalyst-injected="true"]',
      );
      if (img) img.alt = alt;
      setAltOpen(false);
      catalystToast.success('Alt text updated');
    },
    [getEditorView, selection.wrapperEl],
  );

  const handleSetLink = useCallback(
    (href: string) => {
      setInnerMediaAttrs(getEditorView(), selection.wrapperEl, { link: { href } });
      setLinkOpen(false);
      catalystToast.success('Link added');
    },
    [getEditorView, selection.wrapperEl],
  );

  return (
    <div
      role="toolbar"
      aria-label="Image options"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0,
        padding: 4,
        borderRadius: 4,
        background: T.surface,
        border: `1px solid ${T.border}`,
        boxShadow: T.shadow,
        fontFamily:
          '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, sans-serif',
      }}
    >
      <ToolbarButton
        ref={borderBtnRef}
        active={hasBorder}
        onClick={() => {
          closeAllMenus();
          toggleBorder();
        }}
        aria-label="Toggle border"
        title="Toggle border"
      >
        <BorderIcon label="" />
      </ToolbarButton>
      <ToolbarButton
        active={borderMenuOpen}
        onClick={() => {
          const next = !borderMenuOpen;
          closeAllMenus();
          setBorderMenuOpen(next);
        }}
        aria-label="Border options"
        title="Border options"
        compact
      >
        <ChevronDown size={12} />
      </ToolbarButton>

      <Sep />

      <ToolbarButton
        active={currentLayout === LAYOUT_ALIGN_LEFT}
        onClick={() => { closeAllMenus(); setLayout(LAYOUT_ALIGN_LEFT); }}
        aria-label="Align left"
        title="Align left"
      >
        <AlignImageLeftIcon label="" />
      </ToolbarButton>
      <ToolbarButton
        active={currentLayout === LAYOUT_ALIGN_CENTER}
        onClick={() => { closeAllMenus(); setLayout(LAYOUT_ALIGN_CENTER); }}
        aria-label="Align center"
        title="Align center"
      >
        <AlignImageCenterIcon label="" />
      </ToolbarButton>
      <ToolbarButton
        active={currentLayout === LAYOUT_ALIGN_RIGHT}
        onClick={() => { closeAllMenus(); setLayout(LAYOUT_ALIGN_RIGHT); }}
        aria-label="Align right"
        title="Align right"
      >
        <AlignImageRightIcon label="" />
      </ToolbarButton>
      <ToolbarButton
        active={currentLayout === LAYOUT_WRAP_LEFT}
        onClick={() => { closeAllMenus(); setLayout(LAYOUT_WRAP_LEFT); }}
        aria-label="Wrap left"
        title="Wrap left"
      >
        <ContentWrapLeftIcon label="" />
      </ToolbarButton>
      <ToolbarButton
        active={currentLayout === LAYOUT_WRAP_RIGHT}
        onClick={() => { closeAllMenus(); setLayout(LAYOUT_WRAP_RIGHT); }}
        aria-label="Wrap right"
        title="Wrap right"
      >
        <ContentWrapRightIcon label="" />
      </ToolbarButton>

      <Sep />

      <ToolbarButton
        ref={ellipsisBtnRef}
        active={ellipsisOpen}
        onClick={() => {
          const next = !ellipsisOpen;
          closeAllMenus();
          setEllipsisOpen(next);
        }}
        aria-label="More options"
        title="More options"
      >
        <ShowMoreHorizontalIcon label="" />
      </ToolbarButton>

      {borderMenuOpen && (
        <BorderMenu
          triggerRef={borderBtnRef}
          currentColor={currentBorderColor}
          currentSize={currentBorderSize}
          onChange={(patch) => setBorder(patch)}
          onClose={() => setBorderMenuOpen(false)}
        />
      )}
      {ellipsisOpen && !linkOpen && !altOpen && (
        <EllipsisMenu
          triggerRef={ellipsisBtnRef}
          onAddLink={() => { setEllipsisOpen(false); setLinkOpen(true); }}
          onAddAlt={() => { setEllipsisOpen(false); setAltOpen(true); }}
          onResize={() => {
            setEllipsisOpen(false);
            catalystToast.info('Drag the corner handles on the image to resize');
          }}
          onPreview={() => { setEllipsisOpen(false); handlePreview(); }}
          onCopy={handleCopy}
          onDelete={handleDelete}
        />
      )}
      {linkOpen && (
        <AddLinkPanel
          triggerRef={ellipsisBtnRef}
          initialHref={
            typeof (initialInner.link as { href?: string } | undefined)?.href === 'string'
              ? (initialInner.link as { href: string }).href
              : ''
          }
          onBack={() => { setLinkOpen(false); setEllipsisOpen(true); }}
          onClose={() => setLinkOpen(false)}
          onSubmit={handleSetLink}
        />
      )}
      {altOpen && (
        <AddAltPanel
          triggerRef={ellipsisBtnRef}
          initialAlt={(initialInner.alt as string) ?? ''}
          onBack={() => { setAltOpen(false); setEllipsisOpen(true); }}
          onClose={() => setAltOpen(false)}
          onSubmit={handleSetAlt}
        />
      )}
    </div>
  );
}

const ToolbarButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; compact?: boolean }
>(function ToolbarButton({ children, active, compact, ...rest }, ref) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      ref={ref}
      type="button"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...rest}
      style={{
        all: 'unset',
        boxSizing: 'border-box',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 28,
        minWidth: compact ? 18 : 28,
        padding: compact ? '0 2px' : 0,
        borderRadius: 3,
        color: active ? T.activeText : T.textSubtle,
        background: active ? T.activeBg : hovered ? T.hoverBg : 'transparent',
        transition: 'background 100ms, color 100ms',
        ...(rest.style ?? {}),
      }}
    >
      {children}
    </button>
  );
});

function Sep() {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 1,
        height: 16,
        background: T.border,
        margin: '0 4px',
      }}
    />
  );
}

function usePortalPosition(
  triggerRef: React.RefObject<HTMLElement | null>,
  align: 'left' | 'right',
) {
  const computeFromRef = (): { top: number; left?: number; right?: number } => {
    const el = triggerRef.current;
    if (!el) return { top: 0, left: 0 };
    const r = el.getBoundingClientRect();
    return align === 'left'
      ? { top: r.bottom + 4, left: r.left }
      : { top: r.bottom + 4, right: window.innerWidth - r.right };
  };
  const [pos, setPos] = useState(computeFromRef);
  useEffect(() => {
    const handler = () => setPos(computeFromRef());
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerRef, align]);
  return pos;
}

function BorderMenu({
  triggerRef,
  currentColor,
  currentSize,
  onChange,
  onClose,
}: {
  triggerRef: React.RefObject<HTMLElement | null>;
  currentColor: BorderColor | null;
  currentSize: BorderSize;
  onChange: (patch: { borderColor?: BorderColor; borderSize?: BorderSize }) => void;
  onClose: () => void;
}) {
  const pos = usePortalPosition(triggerRef, 'left');
  const [hoverItem, setHoverItem] = useState<'color' | 'size' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [onClose, triggerRef]);


  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        minWidth: 200,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 4,
        boxShadow: T.shadow,
        padding: '4px 0',
        zIndex: 2147483600,
      }}
    >
      <SubmenuRow
        label="Color"
        hovered={hoverItem === 'color'}
        onHover={() => setHoverItem('color')}
        onLeave={() => setHoverItem((p) => (p === 'color' ? null : p))}
      >
        {hoverItem === 'color' && (
          <ColorSwatches
            current={currentColor}
            onPick={(c) => onChange({ borderColor: c })}
          />
        )}
      </SubmenuRow>
      <SubmenuRow
        label="Size"
        hovered={hoverItem === 'size'}
        onHover={() => setHoverItem('size')}
        onLeave={() => setHoverItem((p) => (p === 'size' ? null : p))}
      >
        {hoverItem === 'size' && (
          <SizeDots
            current={currentSize}
            onPick={(s) => onChange({ borderSize: s })}
          />
        )}
      </SubmenuRow>
    </div>,
    document.body,
  );
}

function SubmenuRow({
  label,
  hovered,
  onHover,
  onLeave,
  children,
}: {
  label: string;
  hovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 12px',
        fontSize: 'var(--ds-font-size-400)',
        color: T.textBold,
        background: hovered ? T.hoverBg : 'transparent',
        cursor: 'default',
      }}
    >
      <span>{label}</span>
      <ChevronRight size={14} />
      {children}
    </div>
  );
}

function ColorSwatches({
  current,
  onPick,
}: {
  current: BorderColor | null;
  onPick: (c: BorderColor) => void;
}) {
  const colors: BorderColor[] = ['light', 'medium', 'dark'];
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: '48%',
        marginLeft: 4,
        padding: 4,
        display: 'flex',
        gap: 4,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 4,
        boxShadow: T.shadow,
      }}
    >
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPick(c);
          }}
          aria-label={`Border color ${c}`}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 24,
            height: 24,
            borderRadius: 3,
            background: BORDER_COLOR_HEX[c],
            border: current === c ? `2px solid ${T.activeText}` : '1px solid var(--ds-shadow-raised, rgba(0,0,0,0.1))',
            boxSizing: 'border-box',
          }}
        />
      ))}
    </div>
  );
}

function SizeDots({
  current,
  onPick,
}: {
  current: BorderSize;
  onPick: (s: BorderSize) => void;
}) {
  const sizes: Array<{ key: BorderSize; Icon: typeof BorderWeightThinIcon }> = [
    { key: 'small', Icon: BorderWeightThinIcon },
    { key: 'medium', Icon: BorderWeightMediumIcon },
    { key: 'large', Icon: BorderWeightThickIcon },
  ];
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: '48%',
        marginLeft: 4,
        padding: 4,
        display: 'flex',
        gap: 4,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 4,
        boxShadow: T.shadow,
      }}
    >
      {sizes.map(({ key, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPick(key);
          }}
          aria-label={`Border size ${key}`}
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: 28,
            height: 28,
            borderRadius: 3,
            border: current === key ? `1.5px solid ${T.activeText}` : `1px solid ${T.border}`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: T.surface,
            color: T.textBold,
          }}
        >
          <Icon label="" />
        </button>
      ))}
    </div>
  );
}

function EllipsisMenu({
  triggerRef,
  onAddLink,
  onAddAlt,
  onResize,
  onPreview,
  onCopy,
  onDelete,
}: {
  triggerRef: React.RefObject<HTMLElement | null>;
  onAddLink: () => void;
  onAddAlt: () => void;
  onResize: () => void;
  onPreview: () => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const pos = usePortalPosition(triggerRef, 'right');
  const menuRef = useRef<HTMLDivElement>(null);

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        top: pos.top,
        right: pos.right,
        minWidth: 180,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 4,
        boxShadow: T.shadow,
        padding: '4px 0',
        zIndex: 2147483600,
      }}
    >
      <MenuItem icon={<LinkIcon label="" />} label="Add link" onClick={onAddLink} />
      <MenuItem icon={<TextIcon label="" />} label="Add alt text" onClick={onAddAlt} />
      <MenuItem icon={<ExpandHorizontalIcon label="" />} label="Resize" onClick={onResize} />
      <MenuItem icon={<ImageFullscreenIcon label="" />} label="Preview" onClick={onPreview} />
      <Divider />
      <MenuItem icon={<CopyIcon label="" />} label="Copy" onClick={onCopy} />
      <MenuItem icon={<DeleteIcon label="" />} label="Delete" onClick={onDelete} danger />
    </div>,
    document.body,
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        all: 'unset',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '8px 12px',
        cursor: 'pointer',
        fontSize: 'var(--ds-font-size-400)',
        color: danger ? T.dangerText : T.textBold,
        background: hovered ? (danger ? T.dangerBg : T.hoverBg) : 'transparent',
      }}
    >
      <span style={{ display: 'inline-flex', color: danger ? T.dangerText : T.textSubtle }}>
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
        background: T.border,
        margin: '4px 0',
      }}
    />
  );
}

function AddLinkPanel({
  triggerRef,
  initialHref,
  onBack,
  onClose,
  onSubmit,
}: {
  triggerRef: React.RefObject<HTMLElement | null>;
  initialHref: string;
  onBack: () => void;
  onClose: () => void;
  onSubmit: (href: string) => void;
}) {
  const pos = usePortalPosition(triggerRef, 'right');
  const [query, setQuery] = useState(initialHref);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [onClose, triggerRef]);

  const { data: tickets = [] } = useQuery({
    queryKey: ['image-toolbar-link-tickets', query],
    queryFn: async () => {
      const q = query.trim();
      const isUrl = /^https?:\/\//i.test(q);
      if (isUrl) return [];
      let req = supabase
        .from('ph_issues')
        .select('issue_key, summary')
        .order('updated_at', { ascending: false })
        .limit(5);
      if (q.length > 0) {
        req = req.or(`issue_key.ilike.%${q}%,summary.ilike.%${q}%`).limit(8);
      }
      const { data } = await req;
      return (data ?? []) as Array<{ issue_key: string; summary: string }>;
    },
    staleTime: 30_000,
  });

  const handleSubmit = (href: string) => {
    const value = href.trim();
    if (!value) return;
    onSubmit(value);
  };


  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: pos.top,
        right: pos.right,
        width: 320,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 4,
        boxShadow: T.shadow,
        padding: 8,
        zIndex: 2147483600,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            padding: 4,
            borderRadius: 3,
            color: T.textSubtle,
          }}
        >
          <ChevronLeft size={16} />
        </button>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit(query);
            }
          }}
          placeholder="Paste or search for a link"
          style={{
            flex: 1,
            height: 32,
            padding: '0 8px',
            fontSize: 'var(--ds-font-size-400)',
            border: `2px solid ${T.activeText}`,
            borderRadius: 3,
            outline: 'none',
            background: T.surface,
            color: T.textBold,
          }}
        />
      </div>
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {tickets.length === 0 ? (
          <div style={{ padding: '8px 12px', fontSize: 'var(--ds-font-size-300)', color: T.textSubtle }}>
            {query.trim() ? 'No matches — press Enter to use as URL' : 'Type to search'}
          </div>
        ) : (
          tickets.map((t) => {
            const href = `/project-hub/${t.issue_key.split('-')[0]}/issue/${t.issue_key}`;
            return (
              <button
                key={t.issue_key}
                type="button"
                onClick={() => handleSubmit(href)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'flex',
                  width: '100%',
                  padding: '4px 12px',
                  fontSize: 'var(--ds-font-size-300)',
                  color: T.textBold,
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = T.hoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontWeight: 500, marginRight: 8, color: T.textSubtle }}>
                  {t.issue_key}
                </span>
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.summary}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>,
    document.body,
  );
}

function AddAltPanel({
  triggerRef,
  initialAlt,
  onBack,
  onClose,
  onSubmit,
}: {
  triggerRef: React.RefObject<HTMLElement | null>;
  initialAlt: string;
  onBack: () => void;
  onClose: () => void;
  onSubmit: (alt: string) => void;
}) {
  const pos = usePortalPosition(triggerRef, 'right');
  const [alt, setAlt] = useState(initialAlt);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [onClose, triggerRef]);


  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: pos.top,
        right: pos.right,
        width: 320,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 4,
        boxShadow: T.shadow,
        padding: 8,
        zIndex: 2147483600,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'inline-flex',
            padding: 4,
            color: T.textSubtle,
          }}
        >
          <ChevronLeft size={16} />
        </button>
        <input
          ref={inputRef}
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSubmit(alt);
            }
          }}
          placeholder="Describe this image"
          style={{
            flex: 1,
            height: 32,
            padding: '0 8px',
            fontSize: 'var(--ds-font-size-400)',
            border: `2px solid ${T.activeText}`,
            borderRadius: 3,
            outline: 'none',
            background: T.surface,
            color: T.textBold,
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, gap: 4 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '4px 10px',
            fontSize: 'var(--ds-font-size-300)',
            color: T.textSubtle,
            borderRadius: 3,
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSubmit(alt)}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '4px 10px',
            fontSize: 'var(--ds-font-size-300)',
            color: 'var(--ds-text-inverse)',
            background: T.activeText,
            borderRadius: 3,
            fontWeight: 500,
          }}
        >
          Save
        </button>
      </div>
    </div>,
    document.body,
  );
}

