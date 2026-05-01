/**
 * AssigneePickerPopover — Click avatar to reassign a work item
 * Renders a searchable dropdown anchored to the avatar.
 */
import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { Search, User } from 'lucide-react';
import { KanbanAvatar } from './KanbanAvatar';
import type { KanbanThemeTokens } from './kanban-tokens';

export interface AssigneeOption {
  name: string;
  avatarUrl?: string | null;
  email?: string | null;
}

interface AssigneePickerPopoverProps {
  currentAssignee: string | null;
  options: AssigneeOption[];
  avatarsByName: Map<string, string>;
  tk: KanbanThemeTokens;
  avatarSize: number;
  onSelect: (name: string | null) => void;
}

export const AssigneePickerPopover = memo(function AssigneePickerPopover({
  currentAssignee, options, avatarsByName, tk, avatarSize, onSelect,
}: AssigneePickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen(o => !o);
    setSearch('');
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Filter options
  const q = search.toLowerCase();
  const filtered = options.filter(o =>
    o.name.toLowerCase().includes(q) ||
    (o.email && o.email.toLowerCase().includes(q))
  );

  // Position calc
  const rect = anchorRef.current?.getBoundingClientRect();
  const panelStyle: React.CSSProperties = rect ? {
    position: 'fixed',
    top: rect.bottom + 4,
    left: Math.max(8, rect.left - 100),
    zIndex: 9999,
    width: 280,
  } : { display: 'none' };

  return (
    <>
      <button
        ref={anchorRef}
        onClick={toggle}
        style={{
          background: 'none', border: 'none', padding: 0, margin: 0,
          cursor: 'pointer', borderRadius: '50%', display: 'flex',
          outline: 'none', flexShrink: 0,
        }}
        aria-label="Change assignee"
        title={currentAssignee || 'Unassigned'}
      >
        <KanbanAvatar
          name={currentAssignee}
          url={currentAssignee ? avatarsByName.get(currentAssignee.toLowerCase()) : null}
          size={avatarSize}
          tk={tk}
        />
      </button>

      {open && createPortal(
        <div ref={panelRef} style={panelStyle} onClick={e => e.stopPropagation()}>
          <div style={{
            background: 'var(--ds-surface, var(--ds-surface, #FFFFFF))',
            borderRadius: 8,
            border: '2px solid #2563EB',
            boxShadow: '0 8px 24px rgba(9,30,66,0.25)',
            overflow: 'hidden',
          }}>
            {/* Search header — Jira pattern: shows current assignee name as editable text, clears on type */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px',
              borderBottom: '1px solid #EBECF0',
              background: '#F0F4FF',
            }}>
              <KanbanAvatar
                name={currentAssignee}
                url={currentAssignee ? avatarsByName.get(currentAssignee.toLowerCase()) : null}
                size={28}
                tk={tk}
              />
              <input
                ref={inputRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={currentAssignee || 'Search people...'}
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  fontSize: 14, fontWeight: 500, color: 'var(--ds-text, var(--ds-text, #172B4D))',
                  background: 'transparent',
                  fontFamily: 'var(--cp-font-body)',
                }}
              />
            </div>

            {/* Options list */}
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {/* Unassigned option */}
              <button
                onClick={(e) => { e.stopPropagation(); onSelect(null); setOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', border: 'none', cursor: 'pointer',
                  background: currentAssignee === null ? 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F4F5F7))' : 'var(--ds-surface, var(--ds-surface, #FFFFFF))',
                  textAlign: 'left', fontFamily: 'var(--cp-font-body)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F4F5F7))'; }}
                onMouseLeave={e => { e.currentTarget.style.background = currentAssignee === null ? 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F4F5F7))' : 'var(--ds-surface, var(--ds-surface, #FFFFFF))'; }}
              >
                <span style={{
                  width: 32, height: 32, borderRadius: '50%', background: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F4F5F7))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <User size={18} color="#5E6C84" />
                </span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text, var(--ds-text, #172B4D))' }}>Unassigned</span>
              </button>

              {/* People */}
              {filtered.map(person => {
                const isActive = currentAssignee?.toLowerCase() === person.name.toLowerCase();
                return (
                  <button
                    key={person.name}
                    onClick={(e) => { e.stopPropagation(); onSelect(person.name); setOpen(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', border: 'none', cursor: 'pointer',
                      background: isActive ? 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F4F5F7))' : 'var(--ds-surface, var(--ds-surface, #FFFFFF))',
                      textAlign: 'left', fontFamily: 'var(--cp-font-body)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F4F5F7))'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isActive ? 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F4F5F7))' : 'var(--ds-surface, var(--ds-surface, #FFFFFF))'; }}
                  >
                    <KanbanAvatar
                      name={person.name}
                      url={person.avatarUrl || avatarsByName.get(person.name.toLowerCase())}
                      size={32}
                      tk={tk}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text, var(--ds-text, #172B4D))', lineHeight: '18px' }}>
                        {person.name}
                      </div>
                      {person.email && (
                        <div style={{ fontSize: 12, color: '#5E6C84', lineHeight: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {person.email}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div style={{ padding: '16px 12px', textAlign: 'center', color: '#5E6C84', fontSize: 13 }}>
                  No matches found
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
});
