/**
 * EditableFields — EditableAssignee, EditablePriority, EditableLabels, ParentFieldPicker
 * Rebuilt to exact Jira parity — no pencil icons, Jira-native priority SVGs, 28px avatars, 14px names
 */
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight } from 'lucide-react';
import type { ProjectMember, ParentIssue } from './types';
import { PRIORITY_LIST, WORK_ITEM_ICONS } from './constants';
import { getAvatarColor } from './helpers';

/** Atlassian-spec dropdown container styles */
const ATLASSIAN_DROPDOWN: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 4, border: 'none',
  boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
  padding: '4px 0', zIndex: 9999,
};

/** Atlassian checkmark SVG */
const CheckmarkSVG = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2.5" style={{ flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

/** Jira-native priority SVG icons — exact parity */
const PRIORITY_SVG: Record<string, React.ReactNode> = {
  Highest: (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3 8l5-5 5 5" fill="none" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 12l5-5 5 5" fill="none" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  High: (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3 10l5-5 5 5" fill="none" stroke="#FF5630" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Medium: (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3 6h10" fill="none" stroke="#FFAB00" strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 10h10" fill="none" stroke="#FFAB00" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Low: (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3 6l5 5 5-5" fill="none" stroke="#2684FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Lowest: (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path d="M3 4l5 5 5-5" fill="none" stroke="#2684FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 8l5 5 5-5" fill="none" stroke="#2684FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

/* ── Avatar helper — prioritises real image ── */
function AvatarCircle({ userId, name, avatarUrl, size = 28 }: { userId: string; name: string; avatarUrl?: string | null; size?: number }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: getAvatarColor(userId), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.39), fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/* ── EditableAssignee ──────────────────────── */
export function EditableAssignee({ issueId, projectId, currentAssigneeId, currentAssigneeName, onUpdate }: {
  issueId: string; projectId: string; currentAssigneeId: string | null; currentAssigneeName: string | null; onUpdate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const { data: members = [] } = useQuery({
    queryKey: ['projectMembers-edit', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('project_members').select('user_id, role').eq('project_id', projectId);
      if (error) throw error;
      if (!data?.length) return [];
      const userIds = data.map(d => d.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
      return data.map(d => ({ user_id: d.user_id, full_name: profileMap.get(d.user_id)?.full_name ?? 'Unknown', avatar_url: profileMap.get(d.user_id)?.avatar_url ?? null, role: d.role })) as ProjectMember[];
    },
    enabled: open,
  });

  // Fetch current assignee's avatar_url — resolve via jira_identity_map (account_id is a Jira ID, not a Catalyst UUID)
  const { data: assigneeProfile } = useQuery({
    queryKey: ['profile-avatar-jira', currentAssigneeId],
    queryFn: async () => {
      if (!currentAssigneeId) return null;
      // First try jira_identity_map (Jira account ID → avatar_url)
      const { data: jiraRow } = await supabase.from('jira_identity_map').select('avatar_url, catalyst_user_id').eq('jira_account_id', currentAssigneeId).maybeSingle();
      if (jiraRow?.avatar_url) return { avatar_url: jiraRow.avatar_url };
      // Fallback: try catalyst_user_id → profiles
      if (jiraRow?.catalyst_user_id) {
        const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', jiraRow.catalyst_user_id).single();
        if (profile?.avatar_url) return profile;
      }
      // Final fallback: try profiles directly (for catalyst-native users)
      const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('id', currentAssigneeId).maybeSingle();
      return profile;
    },
    enabled: !!currentAssigneeId,
    staleTime: 60000,
  });

  const updateMutation = useMutation({
    mutationFn: async (userId: string | null) => {
      const { error } = await supabase.from('ph_issues').update({
        assignee_account_id: userId,
        assignee_display_name: members.find(m => m.user_id === userId)?.full_name ?? null,
      }).eq('id', issueId);
      if (error) throw error;
    },
    onSuccess: () => { onUpdate(); setOpen(false); },
  });

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const filtered = members.filter(m => m.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} style={{ flex: 1, position: 'relative' }}>
      {/* Jira-style trigger — avatar + name, no chip/border/pencil */}
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px',
        borderRadius: 4, cursor: 'pointer', transition: 'background .12s',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {currentAssigneeName ? (
          <>
            <AvatarCircle userId={currentAssigneeId!} name={currentAssigneeName} avatarUrl={assigneeProfile?.avatar_url} />
            <span style={{ fontSize: 14, color: '#172B4D', fontWeight: 400 }}>{currentAssigneeName}</span>
          </>
        ) : (
          <span style={{ fontSize: 14, color: '#97A0AF' }}>Unassigned</span>
        )}
      </div>
      {open && (() => {
        const rect = ref.current?.getBoundingClientRect();
        const dropTop = (rect?.bottom ?? 0) + 4;
        const dropLeft = (rect?.left ?? 0);
        return (
        <div style={{ ...ATLASSIAN_DROPDOWN, position: 'fixed', top: dropTop, left: dropLeft, width: 280, overflow: 'hidden' }}>
          {/* Search input */}
          <div style={{ padding: '8px 8px 4px' }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..."
              style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid rgba(9,30,66,0.14)', borderRadius: 4, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
              onFocus={e => (e.target.style.border = '2px solid #2563EB')}
              onBlur={e => (e.target.style.border = '1px solid rgba(9,30,66,0.14)')} />
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {/* Unassigned option */}
            <div onClick={() => updateMutation.mutate(null)} style={{
              height: 40, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', borderBottom: '1px solid #F4F5F7',
              background: !currentAssigneeId ? '#DEEBFF' : 'transparent',
            }}
              onMouseEnter={e => { if (currentAssigneeId) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
              onMouseLeave={e => { if (currentAssigneeId) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, border: '1px dashed #C1C7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#C1C7D0' }}>?</div>
              <span style={{ fontSize: 14, color: '#6B778C', flex: 1 }}>Unassigned</span>
              {!currentAssigneeId && <CheckmarkSVG />}
            </div>
            {/* Members */}
            {filtered.map(m => (
              <div key={m.user_id} onClick={() => updateMutation.mutate(m.user_id)}
                style={{
                  height: 40, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer', background: m.user_id === currentAssigneeId ? '#DEEBFF' : 'transparent',
                }}
                onMouseEnter={e => { if (m.user_id !== currentAssigneeId) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
                onMouseLeave={e => { if (m.user_id !== currentAssigneeId) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <AvatarCircle userId={m.user_id} name={m.full_name} avatarUrl={m.avatar_url} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 400, color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.full_name}</div>
                </div>
                {m.user_id === currentAssigneeId && <CheckmarkSVG />}
              </div>
            ))}
          </div>
        </div>
        );
      })()}
    </div>
  );
}

/* ── EditablePriority ──────────────────────── */
export function EditablePriority({ issueId, currentPriority, onUpdate }: { issueId: string; currentPriority: string; onUpdate: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const updateMutation = useMutation({
    mutationFn: async (priority: string) => { const { error } = await supabase.from('ph_issues').update({ priority }).eq('id', issueId); if (error) throw error; },
    onSuccess: () => { onUpdate(); setOpen(false); },
  });
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} style={{ flex: 1, position: 'relative' }}>
      {/* Jira-style trigger — SVG icon + dark text, no pencil, no colored text */}
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        padding: '4px 6px', borderRadius: 4, transition: 'background .12s',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <span style={{ display: 'flex', flexShrink: 0 }}>{PRIORITY_SVG[currentPriority] ?? PRIORITY_SVG.Medium}</span>
        <span style={{ fontSize: 14, color: '#172B4D', fontWeight: 400 }}>{currentPriority}</span>
      </div>
      {open && (
        <div style={{ ...ATLASSIAN_DROPDOWN, position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 200, overflow: 'hidden' }}>
          {PRIORITY_LIST.map(p => (
            <div key={p} onClick={() => updateMutation.mutate(p)}
              style={{
                height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', fontSize: 14, fontWeight: 400, color: '#172B4D',
                background: p === currentPriority ? '#DEEBFF' : 'transparent',
              }}
              onMouseEnter={e => { if (p !== currentPriority) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
              onMouseLeave={e => { if (p !== currentPriority) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span style={{ display: 'flex', flexShrink: 0 }}>{PRIORITY_SVG[p]}</span>
              <span style={{ flex: 1 }}>{p}</span>
              {p === currentPriority && <CheckmarkSVG />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── EditableLabels — Jira-parity dropdown ── */

/** Deterministic label border colors from Jira's palette */
const LABEL_COLORS = ['#4C9AFF', '#00B8D9', '#36B37E', '#FFAB00', '#FF5630', '#6554C0', '#FF7452', '#57D9A3', '#FFC400', '#998DD9', '#79E2F2', '#FF8F73'];
function getLabelColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}

export function EditableLabels({ issueId, currentLabels, onUpdate }: { issueId: string; currentLabels: string[]; onUpdate: () => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const updateMutation = useMutation({
    mutationFn: async (labels: string[]) => {
      const { error } = await supabase.from('ph_issues').update({ labels: JSON.stringify(labels) as any }).eq('id', issueId);
      if (error) throw error;
    },
    onSuccess: () => onUpdate(),
  });

  // Fetch all unique labels from project issues for the "All labels" list
  const { data: allLabels = [] } = useQuery({
    queryKey: ['ph-all-labels'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ph_issues')
        .select('labels').is('deleted_at', null).not('labels', 'is', null);
      if (error) throw error;
      const labelSet = new Set<string>();
      (data ?? []).forEach(row => {
        if (Array.isArray(row.labels)) {
          (row.labels as string[]).forEach(l => { if (typeof l === 'string' && l.trim()) labelSet.add(l.trim()); });
        }
      });
      return Array.from(labelSet).sort((a, b) => a.localeCompare(b));
    },
    staleTime: 30000,
  });

  const filteredLabels = search.trim()
    ? allLabels.filter(l => l.toLowerCase().includes(search.toLowerCase()))
    : allLabels;

  const toggleLabel = (label: string) => {
    const next = currentLabels.includes(label)
      ? currentLabels.filter(l => l !== label)
      : [...currentLabels, label];
    updateMutation.mutate(next);
  };

  const addNewLabel = () => {
    const trimmed = search.trim();
    if (!trimmed || currentLabels.includes(trimmed)) return;
    updateMutation.mutate([...currentLabels, trimmed]);
    setSearch('');
  };

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => { if (open) setTimeout(() => searchInputRef.current?.focus(), 50); }, [open]);

  const removeLabel = (label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateMutation.mutate(currentLabels.filter(l => l !== label));
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Selected label chips */}
      {currentLabels.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {currentLabels.map(label => {
            const color = getLabelColor(label);
            return (
              <span key={label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                height: 22, padding: '0 8px', background: '#fff',
                border: `1px solid ${color}`, borderRadius: 3,
                fontSize: 12, fontWeight: 500, color: '#172B4D',
              }}>
                {label}
                <button onClick={(e) => removeLabel(label, e)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: '#6B778C',
                  padding: 0, marginLeft: 2, display: 'flex', alignItems: 'center', lineHeight: 1,
                }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#172B4D')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#6B778C')}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Trigger — "Select label" with chevron, Jira style */}
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 40, padding: '0 12px',
        border: open ? '2px solid #4C9AFF' : '1px solid #DFE1E6',
        borderRadius: 3, cursor: 'pointer', background: '#fff',
        transition: 'border-color 0.15s',
      }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = '#B3D4FF'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = open ? '#4C9AFF' : '#DFE1E6'; }}
      >
        <span style={{ fontSize: 14, color: currentLabels.length > 0 ? '#172B4D' : '#7A869A' }}>
          {currentLabels.length > 0 ? `${currentLabels.length} selected` : 'Select label'}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B778C" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>
      </div>

      {/* Dropdown — Jira "All labels" style */}
      {open && (() => {
        const rect = containerRef.current?.getBoundingClientRect();
        const top = (rect?.bottom ?? 0) + 4;
        const left = rect?.left ?? 0;
        const width = Math.max(rect?.width ?? 280, 280);
        return (
          <div style={{
            ...ATLASSIAN_DROPDOWN, position: 'fixed', top, left, width,
            maxHeight: 380, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Search input */}
            <div style={{ padding: '8px 8px 4px' }}>
              <input ref={searchInputRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search labels..."
                onKeyDown={e => {
                  if (e.key === 'Enter' && search.trim() && filteredLabels.length === 0) addNewLabel();
                  if (e.key === 'Escape') { setOpen(false); setSearch(''); }
                }}
                style={{
                  width: '100%', height: 36, padding: '0 12px',
                  border: '2px solid #4C9AFF', borderRadius: 3,
                  fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#172B4D',
                }} />
            </div>

            {/* "All labels" header */}
            <div style={{ padding: '8px 12px 4px', fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              All labels
            </div>

            {/* Label list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredLabels.map(label => {
                const isSelected = currentLabels.includes(label);
                const color = getLabelColor(label);
                return (
                  <div key={label} onClick={() => toggleLabel(label)}
                    style={{
                      padding: '8px 12px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: isSelected ? '#F4F5F7' : 'transparent',
                      borderLeft: isSelected ? '3px solid #4C9AFF' : '3px solid transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      height: 22, padding: '0 10px',
                      border: `1px solid ${color}`, borderRadius: 3,
                      fontSize: 13, fontWeight: 500, color: '#172B4D', background: '#fff',
                    }}>
                      {label}
                    </span>
                  </div>
                );
              })}
              {filteredLabels.length === 0 && search.trim() && (
                <div onClick={addNewLabel} style={{
                  padding: '10px 12px', cursor: 'pointer', fontSize: 13, color: '#0052CC',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Create "{search.trim()}"
                </div>
              )}
              {filteredLabels.length === 0 && !search.trim() && (
                <div style={{ padding: 16, fontSize: 13, color: '#6B778C', textAlign: 'center' }}>No labels available</div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ── ParentFieldPicker — Jira-parity rebuild ── */

/** Canonical epic icon — lightning bolt on purple rounded square (Jira parity) */
const EpicIconInline = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
    <rect fill="#6554C0" width="16" height="16" rx="2"/>
    <path fill="#FFF" d="M8.39 2L4.5 9h3.11v5L11.5 7H8.39V2z"/>
  </svg>
);

export function ParentFieldPicker({ storyKey, parentKey, projectKey, onParentChange }: {
  storyKey: string; parentKey: string | null; projectKey: string;
  onParentChange: (newParentKey: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showDone, setShowDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: currentParent } = useQuery({
    queryKey: ['parentIssue', parentKey],
    queryFn: async () => {
      if (!parentKey) return null;
      const { data, error } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .eq('issue_key', parentKey).is('deleted_at', null).single();
      if (error) return null;
      return data as ParentIssue;
    },
    enabled: !!parentKey,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['parentSearch', projectKey, search, showDone],
    queryFn: async () => {
      let query = supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .eq('project_key', projectKey).eq('issue_type', 'Epic')
        .is('deleted_at', null).neq('issue_key', storyKey)
        .order('jira_updated_at', { ascending: false }).limit(20);
      if (!showDone) {
        query = query.neq('status_category', 'done');
      }
      if (search.trim()) {
        query = query.or(`issue_key.ilike.${search}%,summary.ilike.%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ParentIssue[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => { if (open) setTimeout(() => searchInputRef.current?.focus(), 50); }, [open]);
  const handleSelect = (key: string | null) => { onParentChange(key); setOpen(false); setSearch(''); };

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1 }}>
      {/* Trigger — Jira full-width input style */}
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        height: 40, padding: '0 12px',
        border: open ? '2px solid #4C9AFF' : '1px solid #DFE1E6',
        borderRadius: 3, cursor: 'pointer', background: '#fff',
        transition: 'border-color 0.15s',
      }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = '#B3D4FF'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = '#DFE1E6'; }}
      >
        {parentKey && currentParent ? (
          <>
            <EpicIconInline />
            <span style={{ flex: 1, fontSize: 14, color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentParent.issue_key} {currentParent.summary}
            </span>
            {/* Clear button */}
            <button onClick={e => { e.stopPropagation(); handleSelect(null); }} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: '50%', border: 'none',
              background: '#DFE1E6', cursor: 'pointer', color: '#42526E', flexShrink: 0,
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#C1C7D0')}
              onMouseLeave={e => (e.currentTarget.style.background = '#DFE1E6')}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B778C" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>
          </>
        ) : (
          <>
            <span style={{ flex: 1, fontSize: 14, color: '#6B778C', fontStyle: 'italic' }}>None — Add parent</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B778C" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>
          </>
        )}
      </div>

      {/* Dropdown — Jira parity with two-line rows, color dots, "Show done" checkbox */}
      {open && (() => {
        const rect = containerRef.current?.getBoundingClientRect();
        const top = (rect?.bottom ?? 0) + 4;
        const left = rect?.left ?? 0;
        const width = Math.max(rect?.width ?? 420, 420);
        return (
          <div style={{
            ...ATLASSIAN_DROPDOWN, position: 'fixed', top, left, width,
            maxHeight: 440, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Search input */}
            <div style={{ padding: '8px 8px 4px' }}>
              <input ref={searchInputRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search epics..."
                onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setSearch(''); } }}
                style={{
                  width: '100%', height: 40, padding: '0 12px',
                  border: '2px solid #4C9AFF', borderRadius: 3,
                  fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#172B4D',
                }} />
            </div>

            {/* Show done checkbox */}
            <div style={{ padding: '6px 12px', borderBottom: '1px solid #F4F5F7' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#172B4D' }}>
                <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#0052CC', cursor: 'pointer' }} />
                Show done work items
              </label>
            </div>

            {/* Results — Jira parity: epic icon + key on line 1, summary on line 2, NO color dots */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {searchResults.map(result => {
                const isActive = result.issue_key === parentKey;
                return (
                  <div key={result.id} onClick={() => handleSelect(result.issue_key)}
                    style={{
                      padding: '10px 12px', cursor: 'pointer',
                      borderBottom: '1px solid #F4F5F7',
                      background: isActive ? '#DEEBFF' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = isActive ? '#DEEBFF' : 'transparent'; }}
                  >
                    {/* Line 1: icon + key */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <EpicIconInline />
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#6B778C', fontSize: 12 }}>{result.issue_key}</span>
                    </div>
                    {/* Line 2: summary */}
                    <div style={{ fontSize: 14, color: '#172B4D', paddingLeft: 22, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {result.summary}
                    </div>
                  </div>
                );
              })}
              {searchResults.length === 0 && search && (
                <div style={{ padding: 16, fontSize: 13, color: '#6B778C', textAlign: 'center' }}>No epics found for "{search}"</div>
              )}
              {searchResults.length === 0 && !search && (
                <div style={{ padding: 16, fontSize: 13, color: '#6B778C', textAlign: 'center' }}>No epics available</div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
