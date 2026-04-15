/**
 * ImageBubbleMenu — Floating popover for image management in TipTap editor.
 * Appears when an image node is selected. Provides:
 *   - Add link (wrap image in anchor)
 *   - Add alt text (accessibility)
 *   - Resize (Small / Medium / Large / Original)
 *   - Copy (copy image URL to clipboard)
 *   - Delete (remove image from editor)
 *
 * Matches the Atlassian/Notion-style contextual toolbar pattern.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Link2, ImageIcon, Maximize2, Copy, Trash2, Check, X,
  RectangleHorizontal, Square, Smartphone,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────── */

interface ImageBubbleMenuProps {
  editor: Editor;
  /** Position relative to editor container */
  position: { top: number; left: number } | null;
  /** Whether the menu is visible */
  visible: boolean;
  onClose: () => void;
}

/* ── Size presets ──────────────────────────────────────── */

const SIZE_PRESETS = [
  { label: 'Small', value: '25%', icon: Smartphone },
  { label: 'Medium', value: '50%', icon: Square },
  { label: 'Large', value: '75%', icon: RectangleHorizontal },
  { label: 'Original', value: '100%', icon: Maximize2 },
] as const;

/* ── Inline input for link / alt text ─────────────────── */

function InlineInput({
  label, initialValue, onConfirm, onCancel, placeholder,
}: {
  label: string; initialValue: string; onConfirm: (val: string) => void; onCancel: () => void; placeholder: string;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); onConfirm(value); }
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  };

  return (
    <div style={{ padding: '8px 12px', minWidth: 260 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#5E6C84', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            flex: 1, height: 32, padding: '0 8px', fontSize: 13,
            border: '1px solid #DFE1E6', borderRadius: 4, outline: 'none',
            color: '#172B4D', background: '#FAFBFC',
            fontFamily: 'inherit',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#4C9AFF'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#DFE1E6'; }}
        />
        <button
          onClick={() => onConfirm(value)}
          style={{
            width: 32, height: 32, borderRadius: 4, border: 'none',
            background: '#0052CC', color: '#FFF', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Confirm"
        >
          <Check size={14} />
        </button>
        <button
          onClick={onCancel}
          style={{
            width: 32, height: 32, borderRadius: 4, border: 'none',
            background: '#F4F5F7', color: '#42526E', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Cancel"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

/* ── Menu item button ─────────────────────────────────── */

function MenuItem({
  icon: Icon, label, onClick, danger,
}: {
  icon: React.ElementType; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '8px 14px', border: 'none',
        background: 'transparent', textAlign: 'left', cursor: 'pointer',
        fontSize: 13, color: danger ? '#DE350B' : '#172B4D',
        display: 'flex', alignItems: 'center', gap: 10,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? '#FFEBE6' : '#F4F5F7'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon size={16} style={{ flexShrink: 0, color: danger ? '#DE350B' : '#6B778C' }} />
      <span>{label}</span>
    </button>
  );
}

/* ── Resize sub-menu ─────────────────────────────────── */

function ResizePanel({ currentWidth, onSelect }: { currentWidth: string; onSelect: (w: string) => void }) {
  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ padding: '0 14px 6px', fontSize: 11, fontWeight: 600, color: '#5E6C84', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        Resize
      </div>
      {SIZE_PRESETS.map(({ label, value, icon: Icon }) => (
        <button
          key={value}
          onClick={() => onSelect(value)}
          style={{
            width: '100%', padding: '8px 14px', border: 'none',
            background: currentWidth === value ? '#DEEBFF' : 'transparent',
            textAlign: 'left', cursor: 'pointer',
            fontSize: 13, color: currentWidth === value ? '#0747A6' : '#172B4D',
            display: 'flex', alignItems: 'center', gap: 10,
            transition: 'background 0.1s',
            fontWeight: currentWidth === value ? 600 : 400,
          }}
          onMouseEnter={e => { if (currentWidth !== value) e.currentTarget.style.background = '#F4F5F7'; }}
          onMouseLeave={e => { if (currentWidth !== value) e.currentTarget.style.background = currentWidth === value ? '#DEEBFF' : 'transparent'; }}
        >
          <Icon size={16} style={{ flexShrink: 0, color: currentWidth === value ? '#0747A6' : '#6B778C' }} />
          <span>{label}</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#97A0AF' }}>{value}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Main ImageBubbleMenu ────────────────────────────── */

type SubMenu = 'none' | 'link' | 'alt' | 'resize';

export function ImageBubbleMenu({ editor, position, visible, onClose }: ImageBubbleMenuProps) {
  const [subMenu, setSubMenu] = useState<SubMenu>('none');
  const menuRef = useRef<HTMLDivElement>(null);

  // Reset sub-menu when hiding
  useEffect(() => {
    if (!visible) setSubMenu('none');
  }, [visible]);

  // Click outside to close
  useEffect(() => {
    if (!visible) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid immediate close on the click that opened the menu
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible, onClose]);

  // Get current image attributes
  const getImageAttrs = useCallback(() => {
    const { state } = editor;
    const { selection } = state;
    const node = state.doc.nodeAt(selection.from);
    if (node?.type.name === 'image') return node.attrs;
    // Try parent or nodeAfter
    if (selection.$from.nodeAfter?.type.name === 'image') return selection.$from.nodeAfter.attrs;
    return null;
  }, [editor]);

  const updateImageAttr = useCallback((attrs: Record<string, any>) => {
    const { state, dispatch } = editor.view;
    const { selection } = state;
    let pos = selection.from;
    let node = state.doc.nodeAt(pos);
    if (!node || node.type.name !== 'image') {
      if (selection.$from.nodeAfter?.type.name === 'image') {
        pos = selection.from;
        node = selection.$from.nodeAfter;
      }
    }
    if (!node || node.type.name !== 'image') return;
    const tr = state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
    dispatch(tr);
  }, [editor]);

  const handleAddLink = useCallback((url: string) => {
    if (url.trim()) {
      updateImageAttr({ 'data-link': url.trim() });
    }
    setSubMenu('none');
  }, [updateImageAttr]);

  const handleAddAlt = useCallback((alt: string) => {
    updateImageAttr({ alt: alt.trim() || 'image' });
    setSubMenu('none');
  }, [updateImageAttr]);

  const handleResize = useCallback((width: string) => {
    updateImageAttr({ width });
    setSubMenu('none');
  }, [updateImageAttr]);

  const handleCopy = useCallback(async () => {
    const attrs = getImageAttrs();
    if (attrs?.src) {
      await navigator.clipboard.writeText(attrs.src);
    }
    onClose();
  }, [getImageAttrs, onClose]);

  const handleDelete = useCallback(() => {
    editor.chain().focus().deleteSelection().run();
    onClose();
  }, [editor, onClose]);

  if (!visible || !position) return null;

  const attrs = getImageAttrs();
  const currentLink = attrs?.['data-link'] || '';
  const currentAlt = attrs?.alt || '';
  const currentWidth = attrs?.width || '100%';

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        background: '#FFFFFF',
        border: '1px solid #DFE1E6',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(9, 30, 66, 0.18)',
        zIndex: 200,
        minWidth: 200,
        overflow: 'hidden',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      {subMenu === 'none' && (
        <div style={{ padding: '4px 0' }}>
          <MenuItem icon={Link2} label="Add link" onClick={() => setSubMenu('link')} />
          <MenuItem icon={ImageIcon} label="Add alt text" onClick={() => setSubMenu('alt')} />
          <MenuItem icon={Maximize2} label="Resize" onClick={() => setSubMenu('resize')} />
          <div style={{ height: 1, background: '#EBECF0', margin: '4px 0' }} />
          <MenuItem icon={Copy} label="Copy" onClick={handleCopy} />
          <MenuItem icon={Trash2} label="Delete" onClick={handleDelete} danger />
        </div>
      )}
      {subMenu === 'link' && (
        <InlineInput
          label="Image link URL"
          initialValue={currentLink}
          onConfirm={handleAddLink}
          onCancel={() => setSubMenu('none')}
          placeholder="https://..."
        />
      )}
      {subMenu === 'alt' && (
        <InlineInput
          label="Alt text"
          initialValue={currentAlt}
          onConfirm={handleAddAlt}
          onCancel={() => setSubMenu('none')}
          placeholder="Describe this image..."
        />
      )}
      {subMenu === 'resize' && (
        <ResizePanel currentWidth={currentWidth} onSelect={handleResize} />
      )}
    </div>
  );
}
