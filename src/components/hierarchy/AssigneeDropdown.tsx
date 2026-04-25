/**
 * AssigneeDropdown — Searchable people picker for inline assignee change
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import { Check, Search } from 'lucide-react';

export interface AssigneeOption {
  displayName: string;
  email?: string;
  accountId?: string;
}

interface AssigneeDropdownProps {
  currentAssignee: string | undefined; // displayName
  availableAssignees: AssigneeOption[];
  onSelect: (assignee: AssigneeOption | null) => void;
  onClose: () => void;
}

export function AssigneeDropdown({ currentAssignee, availableAssignees, onSelect, onClose }: AssigneeDropdownProps) {
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', keyHandler); };
  }, [onClose]);

  const filtered = useMemo(() => {
    if (!search) return availableAssignees;
    const q = search.toLowerCase();
    return availableAssignees.filter(a =>
      a.displayName.toLowerCase().includes(q) || (a.email && a.email.toLowerCase().includes(q))
    );
  }, [availableAssignees, search]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 240,
        background: 'var(--cp-float)', border: '1px solid var(--divider)', borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)', zIndex: 9999, overflow: 'hidden',
      }}
    >
      {/* Search */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Search size={14} color="var(--fg-4)" />
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search people..."
          style={{
            flex: 1, border: 'none', outline: 'none', fontSize: 12,
            fontFamily: 'var(--cp-font-body)', color: 'var(--fg-1)', background: 'transparent',
          }}
        />
      </div>

      {/* Unassigned option */}
      <div
        onClick={() => { onSelect(null); onClose(); }}
        style={{
          height: 50, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-1)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '')}
      >
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '1px dashed #CBD5E1', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--fg-4)', fontStyle: 'italic' }}>Unassigned</span>
        {!currentAssignee && <Check size={14} color="var(--cp-blue)" style={{ marginLeft: 'auto' }} />}
      </div>

      {/* List */}
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {filtered.map((a) => {
          const isCurrent = currentAssignee === a.displayName;
          const initials = a.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
          return (
            <div
              key={a.displayName + (a.email || '')}
              onClick={() => { onSelect(a); onClose(); }}
              style={{
                height: 40, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', background: isCurrent ? 'var(--bg-1)' : undefined,
                fontFamily: 'var(--cp-font-body)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = isCurrent ? 'var(--bg-1, #F8FAFC)' : '')}
            >
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--cp-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#FFFFFF' }}>{initials}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.displayName}</div>
                {a.email && <div style={{ fontSize: 10, color: 'var(--fg-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.email}</div>}
              </div>
              {isCurrent && <Check size={14} color="var(--cp-blue)" />}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: '12px', fontSize: 12, color: 'var(--fg-4)', textAlign: 'center' }}>No results</div>
        )}
      </div>
    </div>
  );
}
