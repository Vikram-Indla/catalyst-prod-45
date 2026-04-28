/**
 * LinkedIssuesSection — Jira-parity rebuild
 * Full link type list, inline create with dropdown + search + Link/Cancel buttons
 */
import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Check, Loader2, ChevronDown, Sparkles } from 'lucide-react';
import { catalystToast } from '@/lib/catalystToast';
import { AiLinkSimilarPanel } from './AiLinkSimilarPanel';
import { CreateStoryModal } from '@/components/workhub/create-story/CreateStoryModal';
import type { LinkedSourceConfig } from '@/components/workhub/create-story/CreateStoryModal';
import type { StatusCategory } from './types';
import { LOZENGE, LINK_TYPE_OPTIONS, WORK_ITEM_ICONS } from './constants';
import { getAvatarColor } from './helpers';
import { SectionBlock, SkeletonRows, EmptyState } from './shared-components';
import Lozenge from '@atlaskit/lozenge';
import { statusToLozenge } from '../../../utils/statusToLozenge';

const CatalystDetailRouter = lazy(
  () => import('@/components/catalyst-detail-views/CatalystDetailRouter')
);

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
function AddLinkRow({ issueKey, onClose, onSuccess, onCreateNew, existingLinkedKeys = new Set() }: { issueKey: string; onClose: () => void; onSuccess: () => void; onCreateNew?: () => void; existingLinkedKeys?: Set<string> }) {
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
      const mapCat = (rows: any[]) =>
        rows.map((r) => ({
          issue_key: r.issue_key,
          summary: r.title,
          issue_type: r.issue_type,
          status: r.status,
          status_category: 'todo',
        }));
      if (!search.trim()) {
        const [phRes, catRes] = await Promise.all([
          supabase.from('ph_issues')
            .select('issue_key, summary, issue_type, status, status_category, jira_updated_at')
            .is('jira_removed_at', null)
            .is('archived_at', null)
            .order('jira_updated_at', { ascending: false })
            .limit(8),
          supabase.from('catalyst_issues')
            .select('issue_key, title, issue_type, status, updated_at')
            .order('updated_at', { ascending: false })
            .limit(8),
        ]);
        const ph = phRes.data ?? [];
        const seen = new Set(ph.map((r: any) => r.issue_key));
        const cat = mapCat((catRes.data ?? []).filter((r: any) => r.issue_key && !seen.has(r.issue_key)));
        return [...ph, ...cat].slice(0, 12);
      }
      const [phRes, catRes] = await Promise.all([
        supabase.from('ph_issues')
          .select('issue_key, summary, issue_type, status, status_category')
          .or(`issue_key.ilike.${search}%,summary.ilike.%${search}%`)
          .is('jira_removed_at', null)
          .is('archived_at', null)
          .limit(10),
        supabase.from('catalyst_issues')
          .select('issue_key, title, issue_type, status')
          .or(`issue_key.ilike.${search}%,title.ilike.%${search}%`)
          .limit(10),
      ]);
      const ph = phRes.data ?? [];
      const seen = new Set(ph.map((r: any) => r.issue_key));
      const cat = mapCat((catRes.data ?? []).filter((r: any) => r.issue_key && !seen.has(r.issue_key)));
      return [...ph, ...cat].slice(0, 15);
    },
    enabled: true,
  });

  // Filter out already-selected AND already-linked items from results
  const filteredResults = results.filter((r: any) =>
    !selectedItems.some(s => s.item_key === r.issue_key) &&
    r.issue_key !== issueKey &&
    !existingLinkedKeys.has(r.issue_key)
  );

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!selectedItems.length) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      for (const item of selectedItems) {
        const { error } = await supabase.from('ph_issue_links').insert({
          source_id: issueKey,
          target_id: item.item_key,
          link_type: linkType,
          created_by: user.id,
        } as any);
        if (error) {
          // Treat duplicate constraint violation as success (already linked)
          if (error.code === '23505' || error.message?.includes('unique_link')) continue;
          throw error;
        }
      }
    },
    onSuccess: () => {
      catalystToast.success(`Linked ${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''}`);
      onSuccess();
    },
    onError: (err: any) => {
      catalystToast.error('Failed to link', err.message);
    },
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
        <button
          onClick={onCreateNew}
          style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: '#44546F', fontFamily: 'inherit', fontWeight: 400, padding: 0, textDecoration: 'none' }}
          onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; e.currentTarget.style.color = '#172B4D'; }}
          onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; e.currentTarget.style.color = '#44546F'; }}
        >
          <Plus size={14} strokeWidth={1.5} /> Create linked work item
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
export function LinkedIssuesSection({ issueId, issueKey: issueKeyProp, projectKey }: { issueId: string; issueKey?: string; projectKey?: string }) {
  const navigate = useNavigate();
  // ph_issue_links stores issue_keys (e.g. "BAU-4511"), not UUIDs.
  // Use issueKey for all ph_issue_links operations; fall back to issueId for legacy callers.
  const issueKey = issueKeyProp || issueId;
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLinkType, setCreateLinkType] = useState('relates to');
  const [openedItem, setOpenedItem] = useState<{ id: string; issueKey: string; issueType: string; projectKey: string; projectId?: string } | null>(null);

  // Resolve projectId (UUID) from projectKey for CreateWorkItemModal
  const derivedProjectKey = projectKey || issueKey.split('-')[0];
  const { data: projectData } = useQuery({
    queryKey: ['projectByKey', derivedProjectKey],
    queryFn: async () => {
      const { data } = await supabase.from('projects')
        .select('id, key')
        .eq('key', derivedProjectKey)
        .single();
      return data;
    },
    enabled: !!derivedProjectKey,
    staleTime: Infinity,
  });

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['linkedIssues', issueKey],
    queryFn: async () => {
      const { data: rawLinks, error } = await supabase.from('ph_issue_links')
        .select('id, link_type, created_at, source_id, target_id')
        .or(`source_id.eq.${issueKey},target_id.eq.${issueKey}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!rawLinks?.length) return [];
      const targetKeys = rawLinks.map(l => l.source_id === issueKey ? l.target_id : l.source_id);

      // Resolve targets from ph_issues first
      const { data: phTargets } = await supabase.from('ph_issues')
        .select('issue_key, summary, status, status_category, issue_type, assignee_account_id, assignee_display_name, priority, jira_updated_at, project_key')
        .in('issue_key', targetKeys)
        .is('jira_removed_at', null)
        .is('archived_at', null);
      const targetMap = new Map((phTargets ?? []).map((t: any) => [t.issue_key, t]));

      // Fallback: resolve missing keys from catalyst_issues (locally-created items)
      const missingKeys = targetKeys.filter(k => !targetMap.has(k));
      if (missingKeys.length > 0) {
        const { data: catTargets } = await supabase.from('catalyst_issues')
          .select('id, issue_key, title, status, issue_type, assignee_id, priority, project_id')
          .in('issue_key', missingKeys);
        (catTargets ?? []).forEach((ct: any) => {
          targetMap.set(ct.issue_key, {
            id: ct.id,
            issue_key: ct.issue_key,
            summary: ct.title,
            status: ct.status,
            status_category: ct.status === 'Done' ? 'Done' : ct.status === 'In Progress' ? 'In Progress' : 'To Do',
            issue_type: ct.issue_type,
            assignee_account_id: ct.assignee_id,
            assignee_display_name: null,
            priority: ct.priority,
            jira_updated_at: null,
            project_id: ct.project_id,
          });
        });
      }

      // Final fallback: resolve missing keys from ph_requests so links to
      // MIM-* / MDT-* initiatives (created via InitiativeLinkedItemsTab)
      // appear on the linked epic / story / defect side of the relationship.
      const stillMissing = targetKeys.filter(k => !targetMap.has(k));
      if (stillMissing.length > 0) {
        const { data: initTargets } = await supabase.from('ph_requests')
          .select('id, initiative_key, title, status, assignee_id, priority, updated_at')
          .in('initiative_key', stillMissing)
          .eq('is_deleted', false);
        (initTargets ?? []).forEach((it: any) => {
          const status = String(it.status ?? '');
          const status_category =
            status === 'closed' ? 'Done' : status === 'in_progress' ? 'In Progress' : 'To Do';
          targetMap.set(it.initiative_key, {
            id: it.id,
            issue_key: it.initiative_key,
            summary: it.title,
            status,
            status_category,
            issue_type: 'Request',
            assignee_account_id: it.assignee_id ?? null,
            assignee_display_name: null,
            priority: it.priority ?? null,
            jira_updated_at: it.updated_at ?? null,
          });
        });
      }

      return rawLinks.map(l => {
        const key = l.source_id === issueKey ? l.target_id : l.source_id;
        return { ...l, target: targetMap.get(key) };
      }).filter(l => l.target) as any[];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (linkId: string) => { const { error } = await supabase.from('ph_issue_links').delete().eq('id', linkId); if (error) throw error; },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linkedIssues', issueKey] });
      catalystToast.success('Link removed');
    },
  });

  // Auto-link after creating a new work item
  const handleCreatedItem = async (newItemKey: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('ph_issue_links').insert({
        source_id: issueKey,
        target_id: newItemKey,
        link_type: createLinkType,
        created_by: user.id,
      } as any);
      if (error) {
        if (error.code === '23505' || error.message?.includes('unique_link')) {
          catalystToast.info(`${newItemKey} already linked to ${issueKey}`);
        } else {
          throw error;
        }
      } else {
        catalystToast.success(`Linked ${newItemKey} to ${issueKey}`, `as "${createLinkType}"`);
      }
      queryClient.invalidateQueries({ queryKey: ['linkedIssues', issueKey] });
    } catch (err: any) {
      catalystToast.error(`Created ${newItemKey} but failed to link`, err.message);
    }
    setShowCreateModal(false);
  };

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
      {/* AI Link Similar panel */}
      <AiLinkSimilarPanel
        issueKey={issueKey}
        existingLinkedKeys={links.map((l: any) => {
          const target = l.target;
          return target?.issue_key ?? '';
        }).filter(Boolean)}
        onLinked={() => queryClient.invalidateQueries({ queryKey: ['linkedIssues', issueKey] })}
      />

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
              // §20 / L41 — pill colour resolved from the Atlaskit helper.
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
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      if (target.id) {
                        // catalyst_issues item — open in modal
                        const targetProjectKey = target.project_key || target.issue_key?.split('-')[0] || derivedProjectKey;
                        setOpenedItem({ id: target.id, issueKey: target.issue_key, issueType: target.issue_type, projectKey: targetProjectKey, projectId: target.project_id });
                      } else {
                        // ph_issues item — navigate to full page
                        navigate(`/issue/${target.issue_key}`);
                      }
                    }}
                    style={{ fontFamily: 'var(--cp-font-mono, monospace)', fontSize: 12, fontWeight: 600, color: '#0052CC', flexShrink: 0, cursor: 'pointer', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                  >{target.issue_key}</span>
                  <span style={{ flex: 1, fontSize: 13, color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{target.summary}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                    <Lozenge appearance={statusToLozenge(target.status)}>{target.status}</Lozenge>
                    <ChevronDown size={10} color="#42526E" />
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
                  {/* Drag handle — orange "=" icon (Jira parity) */}
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, color: '#FF991F', flexShrink: 0, cursor: 'grab',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="8" width="16" height="2.5" rx="1" fill="currentColor"/>
                      <rect x="4" y="13.5" width="16" height="2.5" rx="1" fill="currentColor"/>
                    </svg>
                  </span>
                  {/* Unlink — X cross (Jira parity) */}
                  <button onClick={e => { e.stopPropagation(); removeMutation.mutate(link.id); }}
                    title="Unlink work item"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 24, height: 24, border: 'none', borderRadius: 3, background: 'transparent',
                      cursor: 'pointer', color: '#6B778C', flexShrink: 0, transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#172B4D')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#6B778C')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {showAdd && (
        <AddLinkRow
          issueKey={issueKey}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['linkedIssues', issueKey] }); setShowAdd(false); }}
          onCreateNew={() => { setShowAdd(false); setShowCreateModal(true); }}
          existingLinkedKeys={new Set(links.map((l: any) => l.target?.issue_key).filter(Boolean))}
        />
      )}

      {/* Create linked work item modal — reuses canonical CreateStoryModal with linkedSource */}
      {showCreateModal && projectData && (
        <CreateStoryModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          projectId={projectData.id}
          projectKey={projectData.key}
          linkedSource={{
            issueKey: issueKey,
            linkType: createLinkType,
            locked: true,
          }}
          onSuccess={(newKey) => {
            queryClient.invalidateQueries({ queryKey: ['linkedIssues', issueKey] });
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Detail modal for linked item */}
      {openedItem && (
        <Suspense fallback={null}>
          <CatalystDetailRouter
            isOpen={true}
            onClose={() => setOpenedItem(null)}
            itemId={openedItem.id}
            itemType={openedItem.issueType}
            projectId={openedItem.projectId}
            projectKey={openedItem.projectKey}
          />
        </Suspense>
      )}
    </SectionBlock>
  );
}
