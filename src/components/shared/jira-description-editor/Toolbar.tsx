import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline, Strikethrough, Code, Subscript, Superscript,
  List, ListOrdered, ListTodo,
  Link, Image, Table, Minus, Quote, ChevronDown, MoreHorizontal, Undo2, Redo2,
  Type, Columns, Info, AlertTriangle, CheckCircle, AlertCircle, StickyNote,
  ChevronRight, Sparkles, AtSign, CheckSquare, Lightbulb, RemoveFormatting,
} from 'lucide-react';
import { uploadImageToSupabase } from './mediaUpload';

// ─── Jira's 13 text colors ────────────────────────────────────────────────────
const TEXT_COLORS = [
  { label: 'Default', value: null },
  { label: 'Subtle', value: '#6B778C' },
  { label: 'Red', value: '#DE350B' },
  { label: 'Orange', value: '#FF8B00' },
  { label: 'Yellow', value: '#FF991F' },
  { label: 'Green', value: '#00875A' },
  { label: 'Teal', value: '#00B8D9' },
  { label: 'Blue', value: '#0052CC' },
  { label: 'Purple', value: '#6554C0' },
  { label: 'Pink', value: '#FF5630' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
interface TbBtnProps {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

function TbBtn({ active, disabled, title, onClick, children, className = '' }: TbBtnProps) {
  return (
    <button
      title={title}
      disabled={disabled}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={[
        'jde-tb-btn',
        active ? 'jde-tb-btn--active' : '',
        disabled ? 'jde-tb-btn--disabled' : '',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function TbDivider() {
  return <div className="jde-tb-divider" />;
}

// ─── Style selector (Normal / H1–H6) ────────────────────────────────────────
const STYLE_OPTIONS = [
  { label: 'Normal text', apply: (e: Editor) => e.chain().focus().setParagraph().run(), isActive: (e: Editor) => e.isActive('paragraph') },
  { label: 'Heading 1', apply: (e: Editor) => e.chain().focus().setHeading({ level: 1 }).run(), isActive: (e: Editor) => e.isActive('heading', { level: 1 }) },
  { label: 'Heading 2', apply: (e: Editor) => e.chain().focus().setHeading({ level: 2 }).run(), isActive: (e: Editor) => e.isActive('heading', { level: 2 }) },
  { label: 'Heading 3', apply: (e: Editor) => e.chain().focus().setHeading({ level: 3 }).run(), isActive: (e: Editor) => e.isActive('heading', { level: 3 }) },
  { label: 'Heading 4', apply: (e: Editor) => e.chain().focus().setHeading({ level: 4 }).run(), isActive: (e: Editor) => e.isActive('heading', { level: 4 }) },
  { label: 'Heading 5', apply: (e: Editor) => e.chain().focus().setHeading({ level: 5 }).run(), isActive: (e: Editor) => e.isActive('heading', { level: 5 }) },
  { label: 'Heading 6', apply: (e: Editor) => e.chain().focus().setHeading({ level: 6 }).run(), isActive: (e: Editor) => e.isActive('heading', { level: 6 }) },
  { label: 'Quote', apply: (e: Editor) => e.chain().focus().toggleBlockquote().run(), isActive: (e: Editor) => e.isActive('blockquote') },
];

function StyleDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }}
        className="jde-tb-style-btn"
        title="Text style"
      >
        {/* Always shows "Tt" icon — Jira canonical */}
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 13, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1 }}>Tt</span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="jde-dropdown jde-dropdown--style">
          {STYLE_OPTIONS.map(o => (
            <button
              key={o.label}
              onMouseDown={e => {
                e.preventDefault();
                o.apply(editor);
                setOpen(false);
              }}
              className={`jde-dropdown-item ${o.isActive(editor) ? 'jde-dropdown-item--active' : ''}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Marks dropdown (B + italic/underline/strike/code/sub/sup) ───────────────
function MarksDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const MARKS = [
    { label: 'Bold',          icon: <Bold size={14} />,          cmd: () => editor.chain().focus().toggleBold().run(),          active: editor.isActive('bold') },
    { label: 'Italic',        icon: <Italic size={14} />,        cmd: () => editor.chain().focus().toggleItalic().run(),        active: editor.isActive('italic') },
    { label: 'Underline',     icon: <Underline size={14} />,     cmd: () => editor.chain().focus().toggleUnderline().run(),     active: editor.isActive('underline') },
    { label: 'Strikethrough', icon: <Strikethrough size={14} />, cmd: () => editor.chain().focus().toggleStrike().run(),        active: editor.isActive('strike') },
    { label: 'Code',          icon: <Code size={14} />,          cmd: () => editor.chain().focus().toggleCode().run(),          active: editor.isActive('code') },
    { label: 'Subscript',     icon: <Subscript size={14} />,     cmd: () => editor.chain().focus().toggleSubscript().run(),     active: editor.isActive('subscript') },
    { label: 'Superscript',   icon: <Superscript size={14} />,   cmd: () => editor.chain().focus().toggleSuperscript().run(),   active: editor.isActive('superscript') },
  ];

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex' }}>
      <TbBtn active={editor.isActive('bold')} title="Bold (Ctrl+B)" onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={14} />
      </TbBtn>
      <button
        onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }}
        className="jde-tb-btn"
        title="More formatting"
        style={{ width: 22 }}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="jde-dropdown jde-dropdown--marks">
          {MARKS.map(item => (
            <button
              key={item.label}
              onMouseDown={e => { e.preventDefault(); item.cmd(); setOpen(false); }}
              className={`jde-dropdown-item jde-dropdown-item--row ${item.active ? 'jde-dropdown-item--active' : ''}`}
            >
              <span className="jde-dropdown-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
          <div className="jde-dropdown-divider" />
          <button
            onMouseDown={e => {
              e.preventDefault();
              editor.chain().focus().clearNodes().unsetAllMarks().run();
              setOpen(false);
            }}
            className="jde-dropdown-item jde-dropdown-item--row"
          >
            <span className="jde-dropdown-icon"><RemoveFormatting size={14} /></span>
            Clear formatting
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Lists dropdown ───────────────────────────────────────────────────────────
function ListDropdown({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const active = editor.isActive('bulletList') || editor.isActive('orderedList') || editor.isActive('taskList');

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex' }}>
      <TbBtn active={active} title="Lists" onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={14} />
      </TbBtn>
      <button
        onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }}
        className="jde-tb-chevron"
        title="More list types"
        style={{ width: 14 }}
      >
        <ChevronDown size={9} />
      </button>
      {open && (
        <div className="jde-dropdown jde-dropdown--marks">
          {[
            { label: 'Bullet list', icon: <List size={14} />, cmd: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList') },
            { label: 'Numbered list', icon: <ListOrdered size={14} />, cmd: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList') },
            { label: 'Task list', icon: <ListTodo size={14} />, cmd: () => editor.chain().focus().toggleTaskList().run(), active: editor.isActive('taskList') },
          ].map(item => (
            <button
              key={item.label}
              onMouseDown={e => { e.preventDefault(); item.cmd(); setOpen(false); }}
              className={`jde-dropdown-item jde-dropdown-item--row ${item.active ? 'jde-dropdown-item--active' : ''}`}
            >
              <span className="jde-dropdown-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Text color picker ────────────────────────────────────────────────────────
function ColorBtn({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentColor = (editor.getAttributes('textStyle').color as string | undefined) ?? null;

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }}
        className="jde-tb-btn"
        title="Text color"
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Type size={13} />
          <div style={{ width: 12, height: 3, borderRadius: 1, background: currentColor ?? '#172B4D' }} />
        </div>
      </button>
      {open && (
        <div className="jde-dropdown jde-dropdown--colors">
          {TEXT_COLORS.map(c => (
            <button
              key={c.label}
              title={c.label}
              onMouseDown={e => {
                e.preventDefault();
                if (c.value) editor.chain().focus().setColor(c.value).run();
                else editor.chain().focus().unsetColor().run();
                setOpen(false);
              }}
              className="jde-color-swatch"
              style={{ background: c.value ?? '#172B4D', outline: currentColor === c.value ? '2px solid #2563EB' : 'none' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Link button ──────────────────────────────────────────────────────────────
function LinkBtn({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function openDialog() {
    setUrl(editor.getAttributes('link').href ?? '');
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function apply() {
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url.trim() }).run();
    }
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <TbBtn active={editor.isActive('link')} title="Link (Ctrl+K)" onClick={openDialog}>
        <Link size={14} />
      </TbBtn>
      {open && (
        <div className="jde-link-dialog">
          <div style={{ fontSize: 11, fontWeight: 650, marginBottom: 6, color: '#42526E' }}>Link URL</div>
          <input
            ref={inputRef}
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') apply(); if (e.key === 'Escape') setOpen(false); }}
            placeholder="https://example.com"
            className="jde-link-input"
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button onMouseDown={e => { e.preventDefault(); apply(); }} className="jde-btn-primary">Apply</button>
            {editor.isActive('link') && (
              <button onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetLink().run(); setOpen(false); }} className="jde-btn-ghost">Remove</button>
            )}
            <button onMouseDown={e => { e.preventDefault(); setOpen(false); }} className="jde-btn-ghost">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Image insert ────────────────────────────────────────────────────────────
function ImageBtn({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const url = await uploadImageToSupabase(file);
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      }
    } catch {
      // silently fall through — image won't be inserted
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <TbBtn title="Insert image" disabled={uploading} onClick={() => fileRef.current?.click()}>
        <Image size={14} />
      </TbBtn>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />
    </>
  );
}

// ─── Insert (+) macro menu ────────────────────────────────────────────────────
const INSERT_ITEMS = [
  // Jira-parity: Action item, Mention, Decision at top
  {
    label: 'Action item',
    icon: <CheckSquare size={14} style={{ color: '#0052CC' }} />,
    cmd: (e: Editor) => e.chain().focus().toggleTaskList().run(),
  },
  {
    label: 'Mention',
    icon: <AtSign size={14} style={{ color: '#42526E' }} />,
    cmd: (e: Editor) => e.chain().focus().insertContent('@').run(),
  },
  {
    label: 'Decision',
    icon: <Lightbulb size={14} style={{ color: '#FF8B00' }} />,
    cmd: (e: Editor) => e.chain().focus().insertContent({ type: 'panel', attrs: { panelType: 'note' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '🟡 Decision: ' }] }] }).run(),
  },
  { type: 'divider' as const },
  {
    label: 'Table',
    icon: <Table size={14} />,
    cmd: (e: Editor) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    label: 'Info panel',
    icon: <Info size={14} style={{ color: '#0052CC' }} />,
    cmd: (e: Editor) => e.chain().focus().insertContent({ type: 'panel', attrs: { panelType: 'info' }, content: [{ type: 'paragraph' }] }).run(),
  },
  {
    label: 'Quote',
    icon: <Quote size={14} />,
    cmd: (e: Editor) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    label: 'Divider',
    icon: <Minus size={14} />,
    cmd: (e: Editor) => e.chain().focus().setHorizontalRule().run(),
  },
  { type: 'divider' as const },
  {
    label: 'Code block',
    icon: <Code size={14} />,
    cmd: (e: Editor) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    label: 'Note panel',
    icon: <StickyNote size={14} style={{ color: '#6554C0' }} />,
    cmd: (e: Editor) => e.chain().focus().insertContent({ type: 'panel', attrs: { panelType: 'note' }, content: [{ type: 'paragraph' }] }).run(),
  },
  {
    label: 'Warning panel',
    icon: <AlertTriangle size={14} style={{ color: '#FF8B00' }} />,
    cmd: (e: Editor) => e.chain().focus().insertContent({ type: 'panel', attrs: { panelType: 'warning' }, content: [{ type: 'paragraph' }] }).run(),
  },
  {
    label: 'Success panel',
    icon: <CheckCircle size={14} style={{ color: '#00875A' }} />,
    cmd: (e: Editor) => e.chain().focus().insertContent({ type: 'panel', attrs: { panelType: 'success' }, content: [{ type: 'paragraph' }] }).run(),
  },
  {
    label: 'Error panel',
    icon: <AlertCircle size={14} style={{ color: '#DE350B' }} />,
    cmd: (e: Editor) => e.chain().focus().insertContent({ type: 'panel', attrs: { panelType: 'error' }, content: [{ type: 'paragraph' }] }).run(),
  },
  { type: 'divider' as const },
  {
    label: 'Expand section',
    icon: <ChevronRight size={14} />,
    cmd: (e: Editor) => e.chain().focus().insertContent({ type: 'expand', attrs: { title: 'Click to expand', open: false }, content: [{ type: 'paragraph' }] }).run(),
  },
  {
    label: 'Columns',
    icon: <Columns size={14} />,
    cmd: (e: Editor) => e.chain().focus().insertTable({ rows: 1, cols: 2, withHeaderRow: false }).run(),
  },
];

function InsertMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <TbBtn title="Insert content" onClick={() => setOpen(v => !v)}>
        <span style={{ fontSize: 16, fontWeight: 400, lineHeight: 1 }}>+</span>
      </TbBtn>
      {open && (
        <div className="jde-dropdown jde-dropdown--insert">
          {INSERT_ITEMS.map((item, i) =>
            item.type === 'divider'
              ? <div key={`d-${i}`} className="jde-dropdown-divider" />
              : (
                <button
                  key={item.label}
                  onMouseDown={e => { e.preventDefault(); item.cmd(editor); setOpen(false); }}
                  className="jde-dropdown-item jde-dropdown-item--row"
                >
                  <span className="jde-dropdown-icon">{item.icon}</span>
                  {item.label}
                </button>
              )
          )}
        </div>
      )}
    </div>
  );
}

// ─── Emoji picker (native) ────────────────────────────────────────────────────
const COMMON_EMOJI = ['😀','😂','🙌','👍','👎','❤️','🔥','✅','⚠️','❌','🎉','🚀','💡','📋','🔗','📌','⏰','💬','🔍','📊'];

function EmojiBtn({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <TbBtn title="Emoji" onClick={() => setOpen(v => !v)}>
        <span style={{ fontSize: 14 }}>😀</span>
      </TbBtn>
      {open && (
        <div className="jde-emoji-picker">
          {COMMON_EMOJI.map(e => (
            <button
              key={e}
              onMouseDown={ev => { ev.preventDefault(); editor.chain().focus().insertContent(e).run(); setOpen(false); }}
              className="jde-emoji-btn"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AI Improve button (Rovo-style, purple) ───────────────────────────────────
function AIImproveBtn({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const AI_ACTIONS = [
    { label: 'Improve writing', icon: <Sparkles size={13} /> },
    { label: 'Fix spelling & grammar', icon: <Sparkles size={13} /> },
    { label: 'Make shorter', icon: <Sparkles size={13} /> },
    { label: 'Make longer', icon: <Sparkles size={13} /> },
    { label: 'Summarise', icon: <Sparkles size={13} /> },
  ];

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {/* ✨ Improve button */}
      <button
        onMouseDown={e => { e.preventDefault(); setOpen(v => !v); }}
        className="jde-tb-style-btn"
        title="AI: Improve description"
        style={{ color: '#7C3AED', gap: 3 }}
      >
        <Sparkles size={13} style={{ color: '#7C3AED' }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: '#7C3AED' }}>Improve</span>
        <ChevronDown size={10} style={{ color: '#7C3AED' }} />
      </button>
      {open && (
        <div className="jde-dropdown jde-dropdown--style">
          {AI_ACTIONS.map(a => (
            <button
              key={a.label}
              onMouseDown={e => {
                e.preventDefault();
                // AI stub — shows intent; actual AI call would go here
                setOpen(false);
              }}
              className="jde-dropdown-item jde-dropdown-item--row"
              style={{ color: '#7C3AED' }}
            >
              <span className="jde-dropdown-icon" style={{ color: '#7C3AED' }}>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Toolbar ─────────────────────────────────────────────────────────────
interface ToolbarProps {
  editor: Editor;
}

export function JiraToolbar({ editor }: ToolbarProps) {
  return (
    <div className="jde-toolbar">
      {/* AI improve (Rovo-style purple) */}
      <AIImproveBtn editor={editor} />
      <TbDivider />

      {/* Style selector — always shows "Tt" */}
      <StyleDropdown editor={editor} />
      <TbDivider />

      {/* Bold + full marks dropdown (Italic, Underline, Strike, Code, Sub, Super, Clear) */}
      <MarksDropdown editor={editor} />
      <TbDivider />

      {/* Lists */}
      <ListDropdown editor={editor} />
      <TbDivider />

      {/* Text color */}
      <ColorBtn editor={editor} />
      <TbDivider />

      {/* Image */}
      <ImageBtn editor={editor} />

      {/* Emoji */}
      <EmojiBtn editor={editor} />

      {/* Insert (+) — Action item, Mention, Decision, Table, panels… */}
      <InsertMenu editor={editor} />

      {/* Link */}
      <LinkBtn editor={editor} />

      <TbDivider />

      {/* Undo / Redo */}
      <TbBtn disabled={!editor.can().undo()} title="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 size={14} />
      </TbBtn>
      <TbBtn disabled={!editor.can().redo()} title="Redo (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 size={14} />
      </TbBtn>
    </div>
  );
}
