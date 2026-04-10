/**
 * EditableFields — EditableAssignee, EditablePriority, EditableLabels, ParentFieldPicker
 * Extracted from StoryDetailModal
 */
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Edit2, Plus, X, Check, ChevronRight } from 'lucide-react';
import type { ProjectMember, ParentIssue } from './types';
import { PRIORITY_COLORS, PRIORITY_ICONS, PRIORITY_LIST, WORK_ITEM_ICONS } from './constants';
import { getAvatarColor } from './helpers';

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
        <div style={{ position: 'fixed', top: dropTop, left: dropLeft, width: 240, background: '#fff', border: '1px solid rgba(9,30,66,.24)', borderRadius: 6, boxShadow: '0 6px 16px rgba(9,30,66,.15)', zIndex: 9999, overflow: 'hidden' }}>
          <div style={{ padding: 6, borderBottom: '1px solid rgba(9,30,66,.1)' }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…" style={{ width: '100%', height: 28, padding: '0 7px', border: '1px solid rgba(9,30,66,.14)', borderRadius: 4, fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            <div onClick={() => updateMutation.mutate(null)} style={{ display: 'flex', alignItems: 'center', gap: 7, height: 34, padding: '0 10px', cursor: 'pointer', fontSize: 13 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(9,30,66,.04)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#DFE1E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#6B778C' }}>?</div>
              <span>Unassigned</span>
              {!currentAssigneeId && <Check size={12} color="#2563EB" style={{ marginLeft: 'auto' }} />}
            </div>
            {filtered.map(m => (
              <div key={m.user_id} onClick={() => updateMutation.mutate(m.user_id)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, height: 34, padding: '0 10px', cursor: 'pointer', fontSize: 13, background: m.user_id === currentAssigneeId ? '#EFF6FF' : 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = m.user_id === currentAssigneeId ? '#DBEAFE' : 'rgba(9,30,66,.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = m.user_id === currentAssigneeId ? '#EFF6FF' : 'transparent')}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: getAvatarColor(m.full_name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{m.full_name.charAt(0).toUpperCase()}</div>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.full_name}</span>
                {m.user_id === currentAssigneeId && <Check size={12} color="#2563EB" />}
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
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, width: 160, background: '#fff', border: '1px solid rgba(9,30,66,.24)', borderRadius: 6, boxShadow: '0 6px 16px rgba(9,30,66,.15)', zIndex: 50, overflow: 'hidden' }}>
          {PRIORITY_LIST.map(p => (
            <div key={p} onClick={() => updateMutation.mutate(p)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, height: 34, padding: '0 10px', cursor: 'pointer', fontSize: 13, background: p === currentPriority ? '#EFF6FF' : 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = p === currentPriority ? '#DBEAFE' : 'rgba(9,30,66,.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = p === currentPriority ? '#EFF6FF' : 'transparent')}>
              <span style={{ color: PRIORITY_COLORS[p], fontSize: 12, width: 16 }}>{PRIORITY_ICONS[p]}</span>
              <span style={{ color: PRIORITY_COLORS[p], flex: 1 }}>{p}</span>
              {p === currentPriority && <Check size={12} color="#2563EB" />}
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
    <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3, padding: '2px 0' }}>
      {currentLabels.map(label => (
        <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height: 18, padding: '0 6px', borderRadius: 3, background: '#DEEBFF', color: '#0747A6', fontSize: 11, fontWeight: 500 }}>
          {label}
          <button onClick={() => removeLabel(label)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0747A6', padding: 0, display: 'flex', alignItems: 'center' }}><X size={10} /></button>
        </span>
      ))}
      {editing ? (
        <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLabel(draft); } if (e.key === 'Escape') { setEditing(false); setDraft(''); } }}
          onBlur={() => { if (draft) addLabel(draft); setEditing(false); }}
          placeholder="Type + Enter" style={{ height: 20, padding: '0 6px', border: '1px solid #2563EB', borderRadius: 3, fontSize: 11, fontFamily: 'inherit', outline: 'none', width: 90 }} />
      ) : (
        <button onClick={() => setEditing(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height: 18, padding: '0 6px', borderRadius: 3, border: '1px dashed rgba(9,30,66,.24)', color: '#8993A4', fontSize: 11, background: 'none', cursor: 'pointer' }}>
          <Plus size={9} /> Add label
        </button>
      )}
    </div>
  );
}

/* ── ParentFieldPicker ─────────────────────── */
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
          <span dangerouslySetInnerHTML={{ __html: WORK_ITEM_ICONS[currentParent.issue_type.toLowerCase()] ?? WORK_ITEM_ICONS.epic }} />
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
        <div className="sdm-parent-popover" role="dialog" aria-label="Select parent issue" style={{ top, right }}>
          <div className="sdm-popover-search">
            <input ref={searchInputRef} className="sdm-popover-input" type="text" placeholder="Search epics…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setSearch(''); } }} />
          </div>
          <div className="sdm-popover-results">
            {parentKey && <div className="sdm-popover-none-option" onClick={() => handleSelect(null)} role="button">✕ Remove parent</div>}
            {searchResults.map(result => (
              <div key={result.id} className={`sdm-popover-result${result.issue_key === parentKey ? ' sdm-popover-result--active' : ''}`} onClick={() => handleSelect(result.issue_key)} role="button">
                <span dangerouslySetInnerHTML={{ __html: WORK_ITEM_ICONS.epic }} />
                <span className="sdm-popover-result-key">{result.issue_key}</span>
                <span className="sdm-popover-result-name">{result.summary}</span>
                {result.issue_key === parentKey && <Check size={12} style={{ color: '#2563EB', flexShrink: 0 }} />}
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
