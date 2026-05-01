/**
 * Floating inline editor components for table cells.
 * All use position:fixed + getBoundingClientRect() + z-index 9999.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, ArrowDown, ArrowRight, ChevronsUp, Check, Search, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

// ─── Utility: Fixed portal dropdown ─────────────────────────
function FixedDropdown({ anchorRef, children, onClose, width = 180 }: {
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = document.getElementById('inline-dropdown-portal');
      if (el && !el.contains(e.target as Node)) onClose();
    };
    // Use rAF to prevent immediate close from trigger click
    requestAnimationFrame(() => document.addEventListener('mousedown', handler));
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return createPortal(
    <div
      id="inline-dropdown-portal"
      className="bg-[var(--cp-float)]"
      style={{
        position: 'fixed', top: pos.top, left: pos.left, width,
        border: '1px solid var(--divider)', borderRadius: 6,
        boxShadow: '0 12px 32px rgba(0,0,0,0.18)', zIndex: 9999,
        maxHeight: 280, overflowY: 'auto',
      }}
    >
      {children}
    </div>,
    document.body
  );
}

// ─── Inline Summary Editor ──────────────────────────────────
export function InlineSummaryEditor({ value, onSave, onCancel }: {
  value: string; onSave: (v: string) => void; onCancel: () => void;
}) {
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const save = () => { if (text.trim() && text !== value) onSave(text.trim()); else onCancel(); };

  return (
    <input
      ref={inputRef}
      value={text}
      onChange={e => setText(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onCancel(); }}
      onBlur={save}
      className="w-full text-[12px] font-medium px-1 py-0.5 rounded outline-none bg-[var(--cp-float)]"
      style={{ border: '2px solid var(--cp-blue)', fontFamily: 'var(--cp-font-body)', color: 'var(--fg-1)' }}
    />
  );
}

// ─── Inline Status Picker ──────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  todo: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', in_progress: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', done: 'var(--ds-text-success, var(--ds-text-success, #16A34A))', terminal: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))',
};

export function InlineStatusPicker({ currentStatusId, statuses, anchorRef, onSelect, onClose }: {
  currentStatusId: string;
  statuses: { id: string; name: string; category: string }[];
  anchorRef: React.RefObject<HTMLElement | null>;
  onSelect: (statusId: string) => void;
  onClose: () => void;
}) {
  return (
    <FixedDropdown anchorRef={anchorRef} onClose={onClose} width={180}>
      <div className="py-1">
        {statuses.map(s => (
          <button
            key={s.id}
            onClick={() => { onSelect(s.id); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #F8FAFC))] transition-colors text-left"
            style={{ color: 'var(--fg-1)' }}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[s.category] || 'var(--fg-4)' }} />
            <span className="flex-1">{s.name}</span>
            {s.id === currentStatusId && <Check size={12} className="text-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))]" />}
          </button>
        ))}
      </div>
    </FixedDropdown>
  );
}

// ─── Inline Priority Picker ─────────────────────────────────
const PRIORITIES = [
  { value: 'Critical', icon: ChevronsUp, color: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))' },
  { value: 'High', icon: ArrowUp, color: 'var(--ds-text-warning, var(--ds-text-warning, #D97706))' },
  { value: 'Medium', icon: ArrowRight, color: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' },
  { value: 'Low', icon: ArrowDown, color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))' },
];

export function InlinePriorityPicker({ current, anchorRef, onSelect, onClose }: {
  current: string;
  anchorRef: React.RefObject<HTMLElement | null>;
  onSelect: (p: string) => void;
  onClose: () => void;
}) {
  return (
    <FixedDropdown anchorRef={anchorRef} onClose={onClose} width={160}>
      <div className="py-1">
        {PRIORITIES.map(p => {
          const Icon = p.icon;
          return (
            <button
              key={p.value}
              onClick={() => { onSelect(p.value); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #F8FAFC))] transition-colors text-left"
              style={{ color: 'var(--fg-1)' }}
            >
              <Icon size={13} style={{ color: p.color }} />
              <span className="flex-1">{p.value}</span>
              {current === p.value && <Check size={12} className="text-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))]" />}
            </button>
          );
        })}
      </div>
    </FixedDropdown>
  );
}

// ─── Inline Assignee Picker ─────────────────────────────────
export function InlineAssigneePicker({ currentId, profiles, anchorRef, onSelect, onClose }: {
  currentId: string | null;
  profiles: { id: string; name: string }[];
  anchorRef: React.RefObject<HTMLElement | null>;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = profiles.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <FixedDropdown anchorRef={anchorRef} onClose={onClose} width={220}>
      <div className="p-2 border-b" style={{ borderColor: 'var(--cp-bd-zone)' }}>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ border: '1px solid var(--divider)' }}>
          <Search size={12} className="text-[var(--ds-text-subtlest,var(--ds-text-subtlest, #94A3B8))]" />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-[11px] outline-none bg-transparent"
            placeholder="Search..."
          />
        </div>
      </div>
      <div className="py-1 max-h-[200px] overflow-y-auto">
        <button
          onClick={() => { onSelect(null); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #F8FAFC))] text-left"
          style={{ color: 'var(--fg-4)' }}
        >
          Unassigned
          {!currentId && <Check size={12} className="ml-auto text-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))]" />}
        </button>
        {filtered.map(p => (
          <button
            key={p.id}
            onClick={() => { onSelect(p.id); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-[var(--ds-surface-sunken,var(--ds-surface-sunken, #F8FAFC))] text-left"
            style={{ color: 'var(--fg-1)' }}
          >
            <AvatarCircle name={p.name} size={18} />
            <span className="flex-1 truncate">{p.name}</span>
            {currentId === p.id && <Check size={12} className="text-[var(--ds-text-brand,var(--ds-text-brand, #2563EB))]" />}
          </button>
        ))}
      </div>
    </FixedDropdown>
  );
}

// ─── Inline Due Date Picker ─────────────────────────────────
export function InlineDatePicker({ current, anchorRef, onSelect, onClose }: {
  current: string | null;
  anchorRef: React.RefObject<HTMLElement | null>;
  onSelect: (d: string | null) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState<Date | undefined>(current ? new Date(current) : undefined);

  return (
    <FixedDropdown anchorRef={anchorRef} onClose={onClose} width={280}>
      <div className="p-2">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            setDate(d);
            onSelect(d ? format(d, 'yyyy-MM-dd') : null);
            onClose();
          }}
          className="pointer-events-auto"
        />
        {current && (
          <button
            onClick={() => { onSelect(null); onClose(); }}
            className="w-full text-center text-[11px] py-1 mt-1 rounded hover:bg-[var(--ds-background-danger,var(--ds-background-danger, #FEF2F2))]"
            style={{ color: 'var(--sem-danger)' }}
          >
            Clear date
          </button>
        )}
      </div>
    </FixedDropdown>
  );
}

function AvatarCircle({ name, size = 20 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const colors = ['var(--ds-text-brand, var(--ds-text-brand, #2563EB))', '#0D9488', '#7C3AED', 'var(--ds-text-warning, var(--ds-text-warning, #D97706))', 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))', 'var(--ds-text-success, var(--ds-text-success, #16A34A))'];
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4, backgroundColor: colors[Math.abs(hash) % colors.length] }}
    >
      {initials}
    </div>
  );
}
