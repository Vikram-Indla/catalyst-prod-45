/**
 * WorkCardAssigneePicker — Compact avatar-only assignee picker for the
 * navigator card list. Click the avatar → opens the same Atlassian-style
 * member picker used in the sidebar. Writes `assignee_account_id` +
 * `assignee_display_name` to ph_issues and invalidates the list query
 * so the card refreshes in real time.
 *
 * Why a dedicated component (and not EditableAssignee directly):
 *  EditableAssignee renders avatar + name as a full row with hover
 *  background — that crowds the card footer. This wrapper renders only
 *  the avatar bubble, but reuses the same data fetching, mutation, and
 *  member-picker UX.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveAvatarUrl } from '@/lib/avatars';

interface Props {
  /** ph_issues.id (UUID PK). Required — issue_key would silent-400 (CLAUDE.md §L39). */
  dbId: string;
  /** Current assignee UUID (project_members.user_id) or null. */
  currentAssigneeId: string | null;
  /** Current assignee display name — drives avatar resolution. */
  currentAssigneeName: string | null;
  /** Project UUID — required to fetch project_members. */
  projectId: string | undefined;
  /** Fallback initials shown when no local face PNG exists. */
  fallbackInitials: string;
  /** Fallback bubble background color (hash-based). */
  fallbackColor: string;
}

interface Member {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export function WorkCardAssigneePicker({
  dbId, currentAssigneeId, currentAssigneeName, projectId,
  fallbackInitials, fallbackColor,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const localUrl = useMemo(
    () => (currentAssigneeName ? resolveAvatarUrl(currentAssigneeName) : null),
    [currentAssigneeName],
  );

  const { data: members = [] } = useQuery({
    queryKey: ['workcard-project-members', projectId],
    enabled: open && !!projectId,
    queryFn: async (): Promise<Member[]> => {
      const { data } = await supabase
        .from('project_members')
        .select('user_id, role')
        .eq('project_id', projectId!);
      if (!data?.length) return [];
      const ids = data.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles').select('id, full_name').in('id', ids);
      const map = new Map((profiles ?? []).map(p => [p.id, p]));
      return data.map(d => {
        const full_name = map.get(d.user_id)?.full_name ?? 'Unknown';
        return { user_id: d.user_id, full_name, avatar_url: resolveAvatarUrl(full_name) };
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (userId: string | null) => {
      const name = userId ? (members.find(m => m.user_id === userId)?.full_name ?? null) : null;
      const { error } = await supabase
        .from('ph_issues')
        .update({ assignee_account_id: userId, assignee_display_name: name } as any)
        .eq('id', dbId);
      if (error) throw error;
    },
    onSuccess: () => {
      // Real-time refresh of the navigator list AND any open detail panels.
      queryClient.invalidateQueries({ queryKey: ['project-all-work-items-v2'] });
      queryClient.invalidateQueries({ queryKey: ['cv-issue-detail'] });
      setOpen(false);
    },
  });

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [open]);

  const filtered = members.filter(m => m.full_name.toLowerCase().includes(search.toLowerCase()));

  // Trigger bubble — preserves card-list visual (28px circle).
  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
      title={currentAssigneeName ? `Assignee: ${currentAssigneeName} — click to change` : 'Assign'}
      style={{
        width: 28, height: 28, padding: 0, borderRadius: '50%', border: 'none',
        background: 'transparent', cursor: 'pointer', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {localUrl ? (
        <img src={localUrl} alt={currentAssigneeName ?? ''}
          style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
      ) : currentAssigneeName ? (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: fallbackColor,
          color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 11,
        }}>{fallbackInitials}</div>
      ) : (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', border: '1px dashed #C1C7D0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: '#C1C7D0',
        }}>?</div>
      )}
    </button>
  );

  if (!open) return trigger;

  // Position the popover via portal — trigger lives inside a clipped/scrollable
  // card list, so a fixed-position portal escapes the overflow:hidden ancestor.
  const rect = triggerRef.current?.getBoundingClientRect();
  const top = (rect?.bottom ?? 0) + 4;
  const width = 280;
  const left = Math.min(rect?.left ?? 0, window.innerWidth - width - 16);

  return (
    <>
      {trigger}
      {createPortal(
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', top, left, width, zIndex: 10000,
            background: '#FFFFFF', borderRadius: 4,
            boxShadow: '0 4px 24px rgba(30,31,33,0.16), 0 0 1px rgba(30,31,33,0.31)',
            overflow: 'hidden',
            fontFamily: "'Atlassian Sans', -apple-system, sans-serif",
          }}
        >
          <div style={{ padding: '8px 8px 4px' }}>
            <input
              autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search members..."
              style={{
                width: '100%', height: 36, padding: '0 10px',
                border: '1px solid rgba(9,30,66,0.14)', borderRadius: 4,
                fontSize: 14, fontFamily: 'inherit', outline: 'none',
              }}
              onFocus={e => (e.target.style.border = '2px solid #2563EB')}
              onBlur={e => (e.target.style.border = '1px solid rgba(9,30,66,0.14)')}
            />
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {/* Unassigned */}
            <div onClick={() => updateMutation.mutate(null)} style={{
              height: 40, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', borderBottom: '1px solid #F4F5F7',
              background: !currentAssigneeId ? '#DEEBFF' : 'transparent',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                border: '1px dashed #C1C7D0', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 16, color: '#C1C7D0',
              }}>?</div>
              <span style={{ fontSize: 14, color: '#6B778C', flex: 1 }}>Unassigned</span>
            </div>
            {filtered.map(m => (
              <div key={m.user_id} onClick={() => updateMutation.mutate(m.user_id)}
                style={{
                  height: 40, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer',
                  background: m.user_id === currentAssigneeId ? '#DEEBFF' : 'transparent',
                }}
                onMouseEnter={e => { if (m.user_id !== currentAssigneeId) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
                onMouseLeave={e => { if (m.user_id !== currentAssigneeId) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt=""
                    style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: '#6554C0', color: '#FFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800,
                  }}>{m.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}</div>
                )}
                <div style={{
                  flex: 1, minWidth: 0, fontSize: 14, color: '#172B4D',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{m.full_name}</div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: 16, fontSize: 13, color: '#6B778C', textAlign: 'center' }}>
                No members found
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
