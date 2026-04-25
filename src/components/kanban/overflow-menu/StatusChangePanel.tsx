/**
 * StatusChangePanel — Real status transition submenu for kanban overflow menu.
 * Uses actual statuses from KANBAN_COLUMNS (which map real Jira statuses).
 * Groups by column category for visual clarity.
 */
import { useState, useRef, useEffect } from 'react';
import { Check, Search } from 'lucide-react';
import { KANBAN_COLUMNS } from '../kanban-tokens';
import type { KanbanThemeTokens } from '../kanban-tokens';

interface StatusChangePanelProps {
  currentStatus: string;
  tk: KanbanThemeTokens;
  onChangeStatus: (newStatus: string) => void;
  onClose: () => void;
}

export function StatusChangePanel({ currentStatus, tk, onChangeStatus, onClose }: StatusChangePanelProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const q = search.trim().toLowerCase();

  return (
    <div
      style={{
        position: 'absolute', left: '100%', top: 0, zIndex: 10000,
        width: 240, maxHeight: 400, display: 'flex', flexDirection: 'column',
        background: tk.surfaceBg, border: `1px solid ${tk.border}`,
        borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.24)',
        overflow: 'hidden',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Search */}
      <div style={{ padding: '8px 8px 4px', borderBottom: `1px solid ${tk.borderSubtle}` }}>
        <div style={{ position: 'relative' }}>
          <Search size={12} color={tk.textDisabled} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search statuses"
            style={{
              width: '100%', height: 28, paddingLeft: 26, paddingRight: 8,
              border: `1px solid ${tk.inputBorder}`, borderRadius: 3,
              fontSize: 12, color: tk.textPrimary, background: tk.inputBg,
              outline: 'none', fontFamily: 'var(--cp-font-body)',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Status list grouped by column */}
      <div style={{ overflowY: 'auto', maxHeight: 340, padding: '4px 0' }}>
        {KANBAN_COLUMNS.map(col => {
          const statuses = col.statuses.filter(s => !q || s.toLowerCase().includes(q));
          if (statuses.length === 0) return null;
          const categoryDot = col.category === 'done' ? '#006644' : col.category === 'in_progress' ? '#0747A6' : '#5E6C84';
          return (
            <div key={col.id}>
              <div style={{
                padding: '6px 12px 2px', fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', color: tk.textDisabled,
                letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: categoryDot, flexShrink: 0 }} />
                {col.name}
              </div>
              {statuses.map(s => {
                const isCurrent = currentStatus.toLowerCase() === s.toLowerCase();
                return (
                  <button
                    key={s}
                    role="menuitem"
                    onClick={() => {
                      if (!isCurrent) onChangeStatus(s);
                      onClose();
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '6px 12px', border: 'none',
                      background: isCurrent ? tk.dropHighlight : 'transparent',
                      cursor: isCurrent ? 'default' : 'pointer',
                      fontSize: 12, color: isCurrent ? tk.selectedAccent : tk.textPrimary,
                      fontWeight: isCurrent ? 600 : 400,
                      fontFamily: 'var(--cp-font-body)', textAlign: 'left',
                    }}
                    onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = tk.surfaceHover; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isCurrent ? tk.dropHighlight : 'transparent'; }}
                  >
                    {isCurrent && <Check size={12} color={tk.selectedAccent} />}
                    <span style={{ marginLeft: isCurrent ? 0 : 20 }}>{s}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
