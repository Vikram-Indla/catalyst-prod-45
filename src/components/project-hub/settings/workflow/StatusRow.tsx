import { useState, useRef, useEffect } from 'react';
import { GripVertical, MoreHorizontal } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const CATEGORY_PILL: Record<string, { bg: string; text: string; label: string }> = {
  todo: { bg: '#1A1A1A', text: 'rgba(237,237,237,0.40)', label: 'To Do' },
  in_progress: { bg: 'rgba(59,130,246,0.06)', text: '#2563EB', label: 'In Progress' },
  done: { bg: '#F0FDFA', text: '#0D9488', label: 'Done' },
  terminal: { bg: '#1A1A1A', text: 'rgba(237,237,237,0.40)', label: 'Terminal' },
};

interface StatusRowProps {
  id: string;
  name: string;
  color: string;
  category: string;
  isDefault: boolean;
  itemCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function StatusRow({ id, name, color, category, isDefault, itemCount, onEdit, onDelete }: StatusRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.1)' : undefined,
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Determine pill styling
  const catKey = category.toLowerCase().replace(/\s+/g, '_');
  const pill = isDefault
    ? { bg: 'rgba(59,130,246,0.06)', text: '#2563EB', label: 'Default' }
    : CATEGORY_PILL[catKey] || CATEGORY_PILL.todo;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-3 rounded-lg hover:bg-[#1A1A1A] transition-colors"
      {...attributes}
    >
      {/* Drag handle */}
      <button
        {...listeners}
        className="flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{ width: 20, height: 40, border: 'none', background: 'transparent', padding: 0 }}
      >
        <GripVertical size={16} color="var(--fg-4)" />
      </button>

      {/* Color dot */}
      <div className="flex-shrink-0 rounded-full" style={{ width: 12, height: 12, background: color }} />

      {/* Name */}
      <span className="flex-1 truncate" style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-1)' }}>
        {name}
      </span>

      {/* Category pill — always shown */}
      <span
        className="flex-shrink-0 rounded-full"
        style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', background: pill.bg, color: pill.text }}
      >
        {pill.label}
      </span>

      {/* Item count */}
      <span
        className="flex-shrink-0 text-right"
        style={{ fontSize: 12, color: 'var(--fg-4)', fontFamily: "'JetBrains Mono', monospace", minWidth: 24 }}
      >
        {itemCount}
      </span>

      {/* Actions */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center justify-center rounded transition-colors hover:bg-[var(--bd-default, rgba(255,255,255,0.10))]"
          style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          <MoreHorizontal size={16} color="var(--fg-3)" />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 z-10 bg-[var(--cp-float)] dark:bg-[#1A1A1A]"
            style={{
              width: 120, border: '1px solid var(--divider)',
              borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0,0,0,.07)',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => { onEdit(); setMenuOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-[#1A1A1A] transition-colors"
              style={{ fontSize: 12, color: 'var(--fg-2)', border: 'none', background: 'transparent', cursor: 'pointer', display: 'block' }}
            >
              Edit
            </button>
            {!isDefault && (
              <button
                onClick={() => { onDelete(); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-[rgba(248,113,113,0.06)] transition-colors"
                style={{ fontSize: 12, color: 'var(--sem-danger)', border: 'none', background: 'transparent', cursor: 'pointer', display: 'block' }}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
