/**
 * EditableFields — EditableAssignee, EditablePriority, EditableLabels, ParentFieldPicker
 * Rebuilt to Atlassian Design System spec
 */
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Edit2, Plus, X, Check, ChevronRight } from 'lucide-react';
import type { ProjectMember, ParentIssue } from './types';
import { PRIORITY_COLORS, PRIORITY_ICONS, PRIORITY_LIST, WORK_ITEM_ICONS } from './constants';
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
  const avatarColor = currentAssigneeName ? getAvatarColor(currentAssigneeName) : '#8993A4';

  return (
    <div ref={ref} style={{ flex: 1, position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 7px 2px 2px', borderRadius: 13, background: '#F8FAFC', border: '1px solid rgba(9,30,66,.14)', cursor: 'pointer', transition: 'background .12s' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')} onMouseLeave={e => (e.currentTarget.style.background = '#F8FAFC')}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>{currentAssigneeName?.charAt(0).toUpperCase() ?? '?'}</div>
        <span style={{ fontSize: 12, color: '#172B4D' }}>{currentAssigneeName ?? 'Unassigned'}</span>
        <Edit2 size={10} color="#8993A4" />
      </div>
      {open && (() => {
        const rect = ref.current?.getBoundingClientRect();
        const dropTop = (rect?.bottom ?? 0) + 4;
        const dropLeft = (rect?.left ?? 0);
        return (
        <div style={{ ...ATLASSIAN_DROPDOWN, position: 'fixed', top: dropTop, left: dropLeft, width: 260, overflow: 'hidden' }}>
          {/* Search input */}
          <div style={{ padding: '8px 8px 4px' }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..."
              style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid rgba(9,30,66,0.14)', borderRadius: 4, fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
              onFocus={e => (e.target.style.border = '2px solid #2563EB')}
              onBlur={e => (e.target.style.border = '1px solid rgba(9,30,66,0.14)')} />
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
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
              <span style={{ fontSize: 14, color: '#6B778C' }}>Unassigned</span>
              {!currentAssigneeId && <span style={{ marginLeft: 'auto' }}><CheckmarkSVG /></span>}
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
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: getAvatarColor(m.full_name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#FFFFFF' }}>{m.full_name.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.full_name}</div>
                  {m.role && <div style={{ fontSize: 12, color: '#6B778C', marginTop: 1 }}>{m.role}</div>}
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
      <div onClick={() => setOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', padding: '2px 4px', borderRadius: 4, transition: 'background .12s' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(9,30,66,.04)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <span style={{ color: PRIORITY_COLORS[currentPriority] ?? '#8993A4', fontSize: 12 }}>{PRIORITY_ICONS[currentPriority] ?? '—'}</span>
        <span style={{ fontSize: 13, color: PRIORITY_COLORS[currentPriority] ?? '#8993A4' }}>{currentPriority}</span>
        <Edit2 size={10} color="#8993A4" />
      </div>
      {open && (
        <div style={{ ...ATLASSIAN_DROPDOWN, position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 180, overflow: 'hidden' }}>
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
              <span style={{ color: PRIORITY_COLORS[p], fontSize: 12, width: 16 }}>{PRIORITY_ICONS[p]}</span>
              <span style={{ color: PRIORITY_COLORS[p], flex: 1 }}>{p}</span>
              {p === currentPriority && <CheckmarkSVG />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── EditableLabels ────────────────────────── */
export function EditableLabels({ issueId, currentLabels, onUpdate }: { issueId: string; currentLabels: string[]; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const updateMutation = useMutation({
    mutationFn: async (labels: string[]) => { const { error } = await supabase.from('ph_issues').update({ labels: JSON.stringify(labels) as any }).eq('id', issueId); if (error) throw error; },
    onSuccess: () => onUpdate(),
  });
  const addLabel = (label: string) => {
    const trimmed = label.trim().toLowerCase().replace(/\s+/g, '-');
    if (!trimmed || currentLabels.includes(trimmed)) return;
    updateMutation.mutate([...currentLabels, trimmed]);
    setDraft('');
  };
  const removeLabel = (label: string) => updateMutation.mutate(currentLabels.filter(l => l !== label));

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', padding: '2px 0' }}>
      {currentLabels.map(label => (
        <span key={label} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          height: 20, padding: '0 8px', background: '#DEEBFF', color: '#0052CC',
          borderRadius: 3, fontSize: 12, fontWeight: 500,
        }}>
          {label}
          <button onClick={() => removeLabel(label)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#0052CC',
            padding: 0, marginLeft: 2, display: 'flex', alignItems: 'center', lineHeight: 1, opacity: 0.7,
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </span>
      ))}
      {!editing ? (
        <button onClick={() => setEditing(true)} style={{
          height: 20, padding: '0 7px', border: '1px dashed #C1C7D0', borderRadius: 3,
          background: 'transparent', color: '#6B778C', fontSize: 12, cursor: 'pointer',
          fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 3,
        }}
          onMouseEnter={e => { (e.currentTarget.style.borderColor = '#2563EB'); (e.currentTarget.style.color = '#2563EB'); }}
          onMouseLeave={e => { (e.currentTarget.style.borderColor = '#C1C7D0'); (e.currentTarget.style.color = '#6B778C'); }}
        >
          + Add label
        </button>
      ) : (
        <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && draft.trim()) { addLabel(draft); setEditing(false); }
            if (e.key === 'Escape') { setDraft(''); setEditing(false); }
          }}
          onBlur={() => { if (draft.trim()) addLabel(draft); setDraft(''); setEditing(false); }}
          placeholder="Label name..."
          style={{ height: 22, padding: '0 6px', width: 110, border: '1px solid #2563EB', borderRadius: 3, fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
      )}
    </div>
  );
}

/* ── ParentFieldPicker ─────────────────────── */

/** Canonical epic icon — lightning bolt on purple rounded square */
const EPIC_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect fill="#6554C0" width="16" height="16" rx="2"/><path fill="#FFF" d="M11.5 6.5H9.5V3.5C9.5 3.22 9.28 3 9 3H7C6.72 3 6.5 3.22 6.5 3.5V8H4.5C4.22 8 4.08 8.34 4.27 8.54L8.27 12.79C8.46 12.99 8.77 12.99 8.96 12.79L12.73 8.54C12.92 8.34 12.78 8 12.5 8H11.5V6.5Z"/></svg>`;

export function ParentFieldPicker({ storyKey, parentKey, projectKey, onParentChange }: {
  storyKey: string; parentKey: string | null; projectKey: string;
  onParentChange: (newParentKey: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
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
    queryKey: ['parentSearch', projectKey, search],
    queryFn: async () => {
      let query = supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .eq('project_key', projectKey).eq('issue_type', 'Epic')
        .is('deleted_at', null).neq('issue_key', storyKey)
        .order('jira_updated_at', { ascending: false }).limit(10);
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
      {parentKey && currentParent ? (
        <div className="sdm-parent-field" onClick={() => setOpen(o => !o)}>
          <span dangerouslySetInnerHTML={{ __html: EPIC_ICON_SVG }} style={{ display: 'flex', flexShrink: 0 }} />
          <span className="sdm-parent-key">{currentParent.issue_key}</span>
          <span className="sdm-parent-name">{currentParent.summary}</span>
          <span className="sdm-parent-chevron"><ChevronRight size={10} /></span>
        </div>
      ) : (
        <div className="sdm-parent-field sdm-parent-field--empty" onClick={() => setOpen(o => !o)} role="button">None — Add parent</div>
      )}
      {open && (() => {
        const rect = containerRef.current?.getBoundingClientRect();
        const top = (rect?.bottom ?? 0) + 4;
        const right = window.innerWidth - (rect?.right ?? 0);
        return (
        <div className="sdm-parent-popover" role="dialog" aria-label="Select parent issue" style={{ top, right, ...ATLASSIAN_DROPDOWN, position: 'fixed' }}>
          <div className="sdm-popover-search">
            <input ref={searchInputRef} className="sdm-popover-input" type="text" placeholder="Search epics…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setSearch(''); } }} />
          </div>
          <div className="sdm-popover-results">
            {parentKey && <div className="sdm-popover-none-option" onClick={() => handleSelect(null)} role="button">✕ Remove parent</div>}
            {searchResults.map(result => (
              <div key={result.id} className={`sdm-popover-result${result.issue_key === parentKey ? ' sdm-popover-result--active' : ''}`} onClick={() => handleSelect(result.issue_key)} role="button"
                style={{ height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}
              >
                <span dangerouslySetInnerHTML={{ __html: EPIC_ICON_SVG }} style={{ display: 'flex', flexShrink: 0 }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#6554C0', fontSize: 12, flexShrink: 0 }}>{result.issue_key}</span>
                <span style={{ fontSize: 14, color: '#172B4D', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.summary}</span>
                {result.issue_key === parentKey && <CheckmarkSVG />}
              </div>
            ))}
            {searchResults.length === 0 && search && <div style={{ padding: 12, fontSize: 12, color: '#6B778C', textAlign: 'center' }}>No epics found for "{search}"</div>}
          </div>
        </div>
        );
      })()}
    </div>
  );
}