/**
 * LinkedIssuesSection + AddLinkRow — extracted from StoryDetailModal
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, X, Check, Loader2 } from 'lucide-react';
import type { StatusCategory } from './types';
import { LOZENGE, LINK_TYPE_STYLES, LINK_TYPE_OPTIONS, WORK_ITEM_ICONS } from './constants';
import { getAvatarColor, formatDateShort } from './helpers';
import { SectionBlock, SkeletonRows, EmptyState } from './shared-components';

function AddLinkRow({ issueId, onClose, onSuccess }: { issueId: string; onClose: () => void; onSuccess: () => void }) {
  const [linkType, setLinkType] = useState(LINK_TYPE_OPTIONS[0]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ id: string; issue_key: string; summary: string } | null>(null);

  const { data: results = [] } = useQuery({
    queryKey: ['linkSearch', search],
    queryFn: async () => {
      if (!search.trim()) return [];
      const { data } = await supabase.from('ph_issues').select('id, issue_key, summary')
        .or(`issue_key.ilike.${search}%,summary.ilike.%${search}%`)
        .is('deleted_at', null).neq('id', issueId).limit(10);
      return data ?? [];
    },
    enabled: search.length > 0,
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const { error } = await supabase.from('ph_issue_links').insert({ source_id: issueId, target_id: selected.id, link_type: linkType });
      if (error) throw error;
    },
    onSuccess,
  });

  return (
    <div style={{ padding: '8px 12px', background: '#EFF6FF', borderTop: '1px solid #BFDBFE', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <select value={linkType} onChange={e => setLinkType(e.target.value)} style={{ height: 28, border: '1px solid rgba(9,30,66,.14)', borderRadius: 4, fontSize: 12, fontFamily: 'inherit', padding: '0 6px', background: '#fff', flex: '0 0 auto' }}>
          {LINK_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by issue key or title…"
          style={{ flex: 1, height: 28, padding: '0 7px', border: '1px solid #BFDBFE', borderRadius: 4, fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
        <button className="sdm-confirm-btn" onClick={() => linkMutation.mutate()} disabled={!selected || linkMutation.isPending}>
          {linkMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
        </button>
        <button className="sdm-cancel-btn" onClick={onClose}><X size={13} /></button>
      </div>
      {results.length > 0 && (
        <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid rgba(9,30,66,.14)', borderRadius: 4, background: '#fff' }}>
          {results.map((r: any) => (
            <div key={r.id} onClick={() => setSelected(r)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, height: 34, padding: '0 10px', cursor: 'pointer', background: selected?.id === r.id ? '#EFF6FF' : 'transparent', fontSize: 12 }}
              onMouseEnter={e => { if (selected?.id !== r.id) (e.currentTarget as HTMLElement).style.background = 'rgba(9,30,66,.04)'; }}
              onMouseLeave={e => { if (selected?.id !== r.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span style={{ fontFamily: 'var(--cp-font-mono, monospace)', fontSize: 11, fontWeight: 600, color: '#2563EB', flexShrink: 0 }}>{r.issue_key}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#172B4D' }}>{r.summary}</span>
              {selected?.id === r.id && <Check size={12} color="#2563EB" />}
            </div>
          ))}
        </div>
      )}
      {selected && <div style={{ fontSize: 11, color: '#6B778C' }}>Will link: <strong>{selected.issue_key}</strong> as &quot;{linkType}&quot;</div>}
    </div>
  );
}

export function LinkedIssuesSection({ issueId }: { issueId: string }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['linkedIssues', issueId],
    queryFn: async () => {
      const { data: rawLinks, error } = await supabase.from('ph_issue_links')
        .select('id, link_type, created_at, source_id, target_id')
        .eq('source_id', issueId).order('created_at', { ascending: false });
      if (error) throw error;
      if (!rawLinks?.length) return [];
      const targetIds = rawLinks.map(l => l.target_id);
      const { data: targets } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, status, status_category, issue_type, assignee_account_id, assignee_display_name, priority, jira_updated_at, deleted_at')
        .in('id', targetIds).is('deleted_at', null);
      const targetMap = new Map((targets ?? []).map((t: any) => [t.id, t]));
      return rawLinks.map(l => ({ ...l, target: targetMap.get(l.target_id) })).filter(l => l.target) as any[];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (linkId: string) => { const { error } = await supabase.from('ph_issue_links').delete().eq('id', linkId); if (error) throw error; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['linkedIssues', issueId] }),
  });

  return (
    <SectionBlock title="Linked Issues" count={links.length} defaultExpanded={links.length > 0} headerRight={
      <button className="sdm-create-btn" onClick={() => setShowAdd(true)}><Plus size={11} strokeWidth={2.5} /> Link issue</button>
    }>
      {isLoading && <SkeletonRows />}
      {!isLoading && links.length === 0 && <EmptyState heading="No linked issues" sub="Link related, blocking, or duplicate issues" cta="+ Link issue" onCta={() => setShowAdd(true)} />}
      {!isLoading && links.length > 0 && (
        <div className="sdm-child-list" role="list">
          {links.map((link: any) => {
            const target = link.target;
            const avatarColor = target.assignee_display_name ? getAvatarColor(target.assignee_display_name) : '#8993A4';
            const linkStyle = LINK_TYPE_STYLES[link.link_type] ?? { background: '#F1F5F9', color: '#6B778C' };
            return (
              <div key={link.id} className="sdm-child-row">
                <span style={{ ...linkStyle, display: 'inline-flex', alignItems: 'center', height: 17, padding: '0 6px', borderRadius: 3, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', flexShrink: 0, whiteSpace: 'nowrap' }}>{link.link_type}</span>
                <span className="sdm-type-icon" dangerouslySetInnerHTML={{ __html: WORK_ITEM_ICONS[target.issue_type?.toLowerCase()] ?? WORK_ITEM_ICONS.story }} />
                <span className="sdm-child-key">{target.issue_key}</span>
                <span className={`sdm-child-summary${target.status_category === 'done' ? ' sdm-child-summary--done' : ''}`}>{target.summary}</span>
                <span className="sdm-status-lozenge" style={LOZENGE[target.status_category as StatusCategory] ?? LOZENGE.todo}>{target.status}</span>
                {target.assignee_display_name && (
                  <div className="sdm-child-avatar" style={{ background: avatarColor }}>{target.assignee_display_name.charAt(0).toUpperCase()}</div>
                )}
                <span className="sdm-date-col" title={`Linked: ${link.created_at}`}>{formatDateShort(link.created_at)}</span>
                <div className="sdm-row-actions">
                  <button className="sdm-row-action-btn sdm-row-action-btn--danger" title="Remove link" onClick={e => { e.stopPropagation(); removeMutation.mutate(link.id); }}><X size={11} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showAdd && <AddLinkRow issueId={issueId} onClose={() => setShowAdd(false)} onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['linkedIssues', issueId] }); setShowAdd(false); }} />}
    </SectionBlock>
  );
}
