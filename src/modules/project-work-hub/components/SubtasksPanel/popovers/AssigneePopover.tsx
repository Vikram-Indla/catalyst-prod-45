/**
 * AssigneePopover — createPortal-based assignee typeahead (fixed-position dropdown).
 * Replaced @atlaskit/popup 2026-05-05 — same click-outside race fix as StatusPopover.
 * Uses Atlaskit Avatar for row glyphs.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import Avatar from '@atlaskit/avatar';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { Check, Search, UserX } from 'lucide-react';
import { resolveAvatarUrl } from '@/lib/avatars';

export interface AssigneeOption {
  jira_account_id: string | null;
  display_name: string;
  avatar_url: string | null;
  email: string | null;
}

interface AssigneePopoverProps {
  currentAccountId: string | null;
  onChange: (assignee: { accountId: string | null; displayName: string | null }) => void;
  children: React.ReactNode;
  /** When false, no "current value" check mark is rendered — use in bulk-edit contexts. */
  showActive?: boolean;
}

export function AssigneePopover({ currentAccountId, onChange, children, showActive = true }: AssigneePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const [q, setQ] = useState('');
  const triggerRef = useRef<HTMLSpanElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: people = [], isLoading } = useQuery({
    queryKey: ['subtask-assignee-options-local'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jira_identity_map')
        .select('jira_account_id,display_name,email,is_active_in_catalyst,is_active_in_jira')
        .order('display_name', { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? [])
        .filter((p) => p.is_active_in_catalyst !== false || p.is_active_in_jira !== false)
        .map((p) => ({
          jira_account_id: p.jira_account_id,
          display_name: p.display_name,
          avatar_url: p.display_name ? resolveAvatarUrl(p.display_name) : null,
          email: p.email,
        })) as AssigneeOption[];
    },
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return people.slice(0, 60);
    return people
      .filter((p) => p.display_name?.toLowerCase().includes(needle) || p.email?.toLowerCase().includes(needle))
      .slice(0, 60);
  }, [people, q]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      const pop = document.querySelector('[data-sp-assignee-popover]');
      if (pop?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Auto-focus search on open
  useEffect(() => {
    if (isOpen) setTimeout(() => searchRef.current?.focus(), 50);
    else setQ('');
  }, [isOpen]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!triggerRef.current) return;
    if (isOpen) { setIsOpen(false); return; }
    const r = triggerRef.current.getBoundingClientRect();
    setAnchor({ top: r.bottom + 4, left: r.left });
    setIsOpen(true);
  };

  return (
    <>
      <span ref={triggerRef} onClick={toggle} style={{ display: 'inline-flex', cursor: 'pointer' }}>
        {children}
      </span>

      {isOpen && anchor && typeof document !== 'undefined' &&
        createPortal(
          <div
            data-sp-assignee-popover
            role="menu"
            style={{
              position: 'fixed',
              top: anchor.top,
              left: anchor.left,
              width: 280,
              maxHeight: 320,
              display: 'flex',
              flexDirection: 'column',
              background: token('elevation.surface.overlay', '#FFFFFF'),
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(9, 30, 66, 0.16)',
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}` }}>
              <Search size={14} color="var(--ds-text-subtlest, #6B778C)" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Assign to..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent', color: 'var(--ds-text, #172B4D)' }}
              />
            </div>

            {/* Options list */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {/* Unassign option */}
              <button
                type="button"
                role="menuitem"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  height: 36, padding: '0 10px',
                  background: showActive && !currentAccountId ? token('color.background.selected', '#E9F2FF') : 'transparent',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { if (currentAccountId) e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'); }}
                onMouseLeave={(e) => { if (currentAccountId) e.currentTarget.style.background = 'transparent'; }}
                onClick={() => { onChange({ accountId: null, displayName: null }); setIsOpen(false); }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: 'var(--ds-border, #DFE1E6)', color: 'var(--ds-text-subtlest, #6B778C)' }}>
                  <UserX size={12} />
                </span>
                <span style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)' }}>Unassigned</span>
                {showActive && !currentAccountId && <Check size={14} color="#0052CC" style={{ marginLeft: 'auto' }} />}
              </button>

              {isLoading && <div style={{ padding: 12, fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>Loading…</div>}
              {!isLoading && filtered.length === 0 && <div style={{ padding: 12, fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>No matches</div>}

              {filtered.map((p) => {
                const active = showActive && p.jira_account_id === currentAccountId;
                return (
                  <button
                    key={p.jira_account_id ?? p.email ?? p.display_name}
                    type="button"
                    role="menuitem"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      height: 36, padding: '0 10px',
                      background: active ? token('color.background.selected', '#E9F2FF') : 'transparent',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'); }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                    onClick={() => { onChange({ accountId: p.jira_account_id, displayName: p.display_name }); setIsOpen(false); }}
                  >
                    <Avatar size="small" name={p.display_name} src={p.avatar_url ?? undefined} borderColor="transparent" />
                    <span style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.display_name}
                    </span>
                    {active && <Check size={14} color="#0052CC" style={{ marginLeft: 'auto' }} />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
