/**
 * LinkedIssuesSection — Jira-parity rebuild
 * Full link type list, inline create with dropdown + search + Link/Cancel buttons
 */
import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Check, Loader2, ChevronDown, Sparkles, Minus } from 'lucide-react';
import type { StatusCategory } from './types';
import { LOZENGE, LINK_TYPE_OPTIONS, WORK_ITEM_ICONS } from './constants';
import { getAvatarColor } from './helpers';
import { SectionBlock, SkeletonRows, EmptyState } from './shared-components';

/* ── Complete Jira link types ── */
const JIRA_LINK_TYPES = [
  'is blocked by',
  'blocks',
  'is BRD of',
  'BRD',
  'is cloned by',
  'clones',
  'is duplicated by',
  'duplicates',
  'is implemented by',
  'implements',
  'relates to',
];

/* ── Link Type Dropdown (Jira-parity) ── */
function LinkTypeDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        height: 36, padding: '0 10px', border: open ? '2px solid #4C9AFF' : '1px solid #DFE1E6',
        borderRadius: 3, fontSize: 14, fontFamily: 'inherit', background: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6, color: '#172B4D', minWidth: 160,
        transition: 'border-color 0.15s',
      }}>
        <span style={{ flex: 1, textAlign: 'left' }}>{value}</span>
        <ChevronDown size={14} color="#6B778C" />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 2px)', left: 0, minWidth: 200,
          background: '#fff', border: '1px solid #DFE1E6', borderRadius: 4,
          boxShadow: '0 4px 8px rgba(9,30,66,.25)', zIndex: 60, overflow: 'hidden',
          maxHeight: 320, overflowY: 'auto',
        }}>
          {JIRA_LINK_TYPES.map(opt => (
            <div key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', height: 36, padding: '0 12px',
                cursor: 'pointer', fontSize: 14, color: '#172B4D',
                background: opt === value ? '#DEEBFF' : 'transparent',
              }}
              onMouseEnter={e => { if (opt !== value) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
              onMouseLeave={e => { if (opt !== value) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span>{opt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Add Link Row (Jira-parity, multi-select) ── */
function AddLinkRow({ issueId, onClose, onSuccess }: { issueId: string; onClose: () => void; onSuccess: () => void }) {
  const [linkType, setLinkType] = useState(JIRA_LINK_TYPES[0]);
  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ id: string; item_key: string; summary: string; issue_type?: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        inputAreaRef.current && !inputAreaRef.current.contains(target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: results = [] } = useQuery({
    queryKey: ['linkSearch', search],
    queryFn: async () => {
      if (!search.trim()) {
        const { data } = await supabase.from('ph_issues')
          .select('issue_key, summary, issue_type, status, status_category')
          .is('jira_removed_at', null)
          .order('jira_updated_at', { ascending: false })
          .limit(8);
        return data ?? [];
      }
      const { data } = await supabase.from('ph_issues')
        .select('issue_key, summary, issue_type, status, status_category')
        .or(`issue_key.ilike.${search}%,summary.ilike.%${search}%`)
        .is('jira_removed_at', null)
        .limit(10);
      return data ?? [];
    },
    enabled: true,
  });

  // Filter out already-selected items from results
  const filteredResults = results.filter((r: any) => !selectedItems.some(s => s.item_key === r.issue_key));

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!selectedItems.length) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      for (const item of selectedItems) {
        const { error } = await supabase.from('ph_issue_links').insert({
          source_id: issueId,
          target_id: item.item_key,
          link_type: linkType,
          created_by: user.id,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess,
  });

  const handleSelect = (r: any) => {
    setSelectedItems(prev => [...prev, {
      id: r.issue_key,
      item_key: r.issue_key,
      summary: r.summary,
      issue_type: r.issue_type,
    }]);
    setSearch('');
    inputRef.current?.focus();
  };

  const removeSelected = (key: string) => {
    setSelectedItems(prev => prev.filter(s => s.item_key !== key));
  };

  return (
    <div style={{ padding: '12px 0', borderTop: '1px solid #DFE1E6' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <LinkTypeDropdown value={linkType} onChange={setLinkType} />
        {/* Multi-select input area */}
        <div
          ref={inputAreaRef}
          style={{
            flex: 1, minHeight: 36, display: 'flex', flexWrap: 'wrap', alignItems: 'center',
            gap: 4, padding: '4px 8px',
            border: '2px solid #4C9AFF', borderRadius: 3, background: '#fff',
            cursor: 'text', position: 'relative',
          }}
          onClick={() => inputRef.current?.focus()}
        >
          {selectedItems.map(item => {
            const icon = WORK_ITEM_ICONS[item.issue_type?.toLowerCase() ?? ''] ?? WORK_ITEM_ICONS.story;
            return (
              <span key={item.item_key} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, height: 24,
                padding: '0 6px', background: '#F4F5F7', borderRadius: 3, border: '1px solid #DFE1E6',
                fontSize: 12, fontWeight: 500, color: '#172B4D', whiteSpace: 'nowrap',
              }}>
                <span dangerouslySetInnerHTML={{ __html: icon }} style={{ display: 'flex', width: 14, height: 14 }} />
                {item.item_key}
                <button onClick={e => { e.stopPropagation(); removeSelected(item.item_key); }}
                  style={{ display: 'flex', alignItems: 'center', border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#6B778C', fontSize: 14, lineHeight: 1 }}
                >×</button>
              </span>
            );
          })}
          <input
            ref={inputRef}
            value={search}
            onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            placeholder={selectedItems.length ? '' : 'Type, search or paste URL'}
            style={{
              flex: 1, minWidth: 120, height: 26, border: 'none', outline: 'none',
              fontSize: 14, fontFamily: 'inherit', color: '#172B4D', background: 'transparent',
            }}
          />
          {selectedItems.length > 0 && (
            <button onClick={() => setSelectedItems([])}
              style={{ display: 'flex', alignItems: 'center', border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#6B778C', flexShrink: 0 }}
              title="Clear all"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#DFE1E6"/><path d="M8 8l8 8M16 8l-8 8" stroke="#6B778C" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Search results dropdown */}
      {showDropdown && filteredResults.length > 0 && (
        <div ref={dropdownRef} style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #DFE1E6', borderRadius: 3, background: '#fff', marginBottom: 8, boxShadow: '0 4px 8px rgba(9,30,66,.13)' }}>
          <div style={{ padding: '8px 12px 4px', fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {search.trim() ? 'Search results' : 'Recently viewed'}
          </div>
          {filteredResults.map((r: any) => {
            const issueIcon = WORK_ITEM_ICONS[r.issue_type?.toLowerCase()] ?? WORK_ITEM_ICONS.story;
            return (
              <div key={r.issue_key} onClick={() => handleSelect(r)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 12px',
                  cursor: 'pointer', fontSize: 13, color: '#172B4D', borderLeft: '3px solid transparent',
                  transition: 'background 0.1s, border-color 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7'; e.currentTarget.style.borderLeftColor = '#4C9AFF'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderLeftColor = 'transparent'; }}
              >
                <span dangerouslySetInnerHTML={{ __html: issueIcon }} style={{ display: 'flex', width: 16, height: 16, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--cp-font-mono, monospace)', fontSize: 12, fontWeight: 600, color: '#505258', flexShrink: 0 }}>{r.issue_key}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.summary}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* + Create linked work item / Link / Cancel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#172B4D', fontWeight: 500, fontFamily: 'inherit', padding: 0 }}>
          <Plus size={14} /> Create linked work item
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => linkMutation.mutate()}
            disabled={!selectedItems.length || linkMutation.isPending}
            style={{
              height: 32, padding: '0 16px', border: 'none', borderRadius: 3,
              background: selectedItems.length ? '#0052CC' : '#F4F5F7',
              color: selectedItems.length ? '#fff' : '#A5ADBA', fontSize: 14, fontWeight: 500,
              cursor: selectedItems.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            }}
          >
            {linkMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Link'}
          </button>
          <button onClick={onClose} style={{
            height: 32, padding: '0 16px', border: 'none', borderRadius: 3,
            background: 'transparent', color: '#6B778C', fontSize: 14,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Section ── */
export function LinkedIssuesSection({ issueId }: { issueId: string }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['linkedIssues', issueId],
    queryFn: async () => {
      const { data: rawLinks, error } = await supabase.from('ph_issue_links')
        .select('id, link_type, created_at, source_id, target_id')
        .or(`source_id.eq.${issueId},target_id.eq.${issueId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!rawLinks?.length) return [];
      // target keys are the "other side" of the link
      const targetKeys = rawLinks.map(l => l.source_id === issueId ? l.target_id : l.source_id);
      const { data: targets } = await supabase.from('ph_issues')
        .select('issue_key, summary, status, status_category, issue_type, assignee_account_id, assignee_display_name, priority, jira_updated_at')
        .in('issue_key', targetKeys)
        .is('jira_removed_at', null);
      const targetMap = new Map((targets ?? []).map((t: any) => [t.issue_key, t]));
      return rawLinks.map(l => {
        const key = l.source_id === issueId ? l.target_id : l.source_id;
        return { ...l, target: targetMap.get(key) };
      }).filter(l => l.target) as any[];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (linkId: string) => { const { error } = await supabase.from('ph_issue_links').delete().eq('id', linkId); if (error) throw error; },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['linkedIssues', issueId] }),
  });

  // Group links by type (Jira groups them under type headers)
  const grouped = links.reduce((acc: Record<string, any[]>, link: any) => {
    const key = link.link_type || 'relates to';
    if (!acc[key]) acc[key] = [];
    acc[key].push(link);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <SectionBlock title="Linked work items" count={links.length} defaultExpanded={links.length > 0} headerRight={
      <button onClick={() => setShowAdd(true)} title="Link issue" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 24, height: 24, border: 'none', borderRadius: 3, background: 'transparent',
        cursor: 'pointer', color: '#6B778C', transition: 'background 0.15s, color 0.15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7'; e.currentTarget.style.color = '#172B4D'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B778C'; }}
      >
        <Plus size={16} strokeWidth={2} />
      </button>
    }>

      {isLoading && <SkeletonRows />}
      {!isLoading && links.length === 0 && !showAdd && (
        <EmptyState heading="No linked issues" sub="Link related, blocking, or duplicate issues" cta="+ Link issue" onCta={() => setShowAdd(true)} />
      )}

      {/* Grouped link display — Jira style */}
      {!isLoading && Object.entries(grouped).map(([type, typeLinks]) => (
        <div key={type} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6B778C', padding: '6px 0 4px', textTransform: 'lowercase' }}>{type}</div>
          <div style={{ border: '1px solid #DFE1E6', borderRadius: 3, overflow: 'hidden' }}>
            {(typeLinks as any[]).map((link: any) => {
              const target = link.target;
              const avatarColor = target.assignee_display_name ? getAvatarColor(target.assignee_display_name) : '#8993A4';
              const statusLoz = LOZENGE[target.status_category as StatusCategory] ?? LOZENGE.todo;
              const issueIcon = WORK_ITEM_ICONS[target.issue_type?.toLowerCase()] ?? WORK_ITEM_ICONS.story;
              return (
                <div key={link.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 12px',
                  borderBottom: '1px solid #F4F5F7', transition: 'background 0.12s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFC')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span dangerouslySetInnerHTML={{ __html: issueIcon }} style={{ display: 'flex', width: 16, height: 16, flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--cp-font-mono, monospace)', fontSize: 12, fontWeight: 600, color: '#0052CC', flexShrink: 0 }}>{target.issue_key}</span>
                  <span style={{ flex: 1, fontSize: 13, color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{target.summary}</span>
                  <span style={{
                    ...statusLoz as any, display: 'inline-flex', alignItems: 'center', gap: 3,
                    height: 20, lineHeight: '20px', fontSize: 11, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.03em', borderRadius: 3,
                    padding: '0 6px', whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {target.status}
                    <ChevronDown size={10} />
                  </span>
                  {target.assignee_display_name ? (
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: avatarColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                    }} title={target.assignee_display_name}>
                      {target.assignee_display_name.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', border: '2px dashed #DFE1E6',
                      flexShrink: 0,
                    }} />
                  )}
                  {/* Remove button — Jira uses orange "=" drag handle, we use minus */}
                  <button onClick={e => { e.stopPropagation(); removeMutation.mutate(link.id); }}
                    title="Remove link"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 24, height: 24, border: 'none', borderRadius: 3, background: 'transparent',
                      cursor: 'pointer', color: '#FF991F', flexShrink: 0,
                    }}
                  >
                    <Minus size={16} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {showAdd && (
        <AddLinkRow
          issueId={issueId}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['linkedIssues', issueId] }); setShowAdd(false); }}
        />
      )}
    </SectionBlock>
  );
}
