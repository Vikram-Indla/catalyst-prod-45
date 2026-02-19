import { useState, useRef, useEffect } from 'react';
import { GripVertical, MoreHorizontal } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  'To Do': { bg: '#F1F5F9', text: '#64748B' },
  'In Progress': { bg: '#EFF6FF', text: '#2563EB' },
  Done: { bg: '#F0FDFA', text: '#0D9488' },
  Terminal: { bg: '#F1F5F9', text: '#64748B' },
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
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
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

  const cs = CATEGORY_STYLES[category] || CATEGORY_STYLES['To Do'];
  const categoryLabel = isDefault ? 'Default' : category === 'Done' ? 'Completion' : category === 'Terminal' ? 'Terminal' : undefined;
  const categoryLabelStyle = isDefault
    ? { bg: '#EFF6FF', text: '#2563EB' }
    : category === 'Done'
    ? { bg: '#F0FDFA', text: '#0D9488' }
    : category === 'Terminal'
    ? { bg: '#F1F5F9', text: '#64748B' }
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-3 rounded-lg hover:bg-[#F8FAFC] transition-colors"
      {...attributes}
    >
      {/* Drag handle */}
      <button
        {...listeners}
        className="flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{ width: 20, height: 40, border: 'none', background: 'transparent', padding: 0 }}
      >
        <GripVertical size={16} color="#94A3B8" />
      </button>

      {/* Color dot */}
      <div
        className="flex-shrink-0 rounded-full"
        style={{ width: 12, height: 12, background: color }}
      />

      {/* Name */}
      <span className="flex-1 truncate" style={{ fontSize: 14, fontWeight: 500, color: '#0F172A' }}>
        {name}
      </span>

      {/* Category tag */}
      {categoryLabel && categoryLabelStyle && (
        <span
          className="flex-shrink-0 rounded-full"
          style={{
            fontSize: 11, fontWeight: 600, padding: '2px 10px',
            background: categoryLabelStyle.bg, color: categoryLabelStyle.text,
          }}
        >
          {categoryLabel}
        </span>
      )}

      {/* Item count */}
      <span
        className="flex-shrink-0 text-right"
        style={{ fontSize: 12, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", minWidth: 24 }}
      >
        {itemCount}
      </span>

      {/* Actions */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center justify-center rounded transition-colors hover:bg-[#E2E8F0]"
          style={{ width: 28, height: 28, border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          <MoreHorizontal size={16} color="#64748B" />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-full mt-1 z-10"
            style={{
              width: 120, background: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: 8, boxShadow: '0 4px 6px -1px rgba(0,0,0,.07)',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => { onEdit(); setMenuOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-[#F8FAFC] transition-colors"
              style={{ fontSize: 12, color: '#334155', border: 'none', background: 'transparent', cursor: 'pointer', display: 'block' }}
            >
              Edit
            </button>
            {!isDefault && (
              <button
                onClick={() => { onDelete(); setMenuOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-[#FEF2F2] transition-colors"
                style={{ fontSize: 12, color: '#DC2626', border: 'none', background: 'transparent', cursor: 'pointer', display: 'block' }}
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
