/**
 * CANONICAL — Parent / Link picker for all CatalystView* components.
 * Change here → updates all work item types.
 *
 * Supports two modes:
 *   single — one parent via parent_key field (Story→Epic, Subtask→Story, etc.)
 *   multi  — multiple links via ph_issue_links table (Defect→Stories, Incident→Stories)
 *
 * The picker shows items grouped by Active (todo + in_progress) and Done,
 * following the Jira pattern. Items are filtered by the allowed parent types
 * defined in parent-rules.ts.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, X, Check, Plus } from 'lucide-react';
import type { PhIssue, CatalystItemType } from '../types';
import { PARENT_LINK_RULES, type ParentLinkRule } from '../parent-rules';
import {
  IssueIcon, StatusLozenge,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components';

/* ═══════════════════════════════════════════════
   CANONICAL TRIGGER — single dashed "+ Add …" button reused across
   all three sidebar pickers (BR / Single / Multi). Previous version
   duplicated this exact 12-line block three times (Apr 2026 sweep).
   Styling matches Catalyst sidebar convention (dashed ring + Plus icon);
   breadcrumb-level Add-parent uses the separate AddParentPicker component
   with Jira's SquarePen look.
   ═══════════════════════════════════════════════ */
function SidebarAddTrigger({
  label, onClick, isOpen,
}: { label: string; onClick: () => void; isOpen: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-expanded={isOpen}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px',
        background: 'none', border: '1px dashed #C1C7D0', borderRadius: 4,
        cursor: 'pointer', fontSize: 13, color: '#5E6C84', whiteSpace: 'nowrap',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#4C9AFF'; e.currentTarget.style.background = '#F4F5F7'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#C1C7D0'; e.currentTarget.style.background = 'none'; }}
    >
      <Plus size={12} /> {label}
    </button>
  );
}

interface CatalystParentLinkerProps {
  /** The current issue */
  issue: PhIssue | null;
  /** Current item ID */
  itemId: string;
  /** Resolved Catalyst item type */
  itemType: CatalystItemType;
  /** Project key for scoping the search */
  projectKey?: string;
  /** Callback when a parent link is clicked to open its detail */
  onOpenItem?: (itemId: string) => void;
}

interface CandidateItem {
  id: string;
  issue_key: string;
  summary: string;
  issue_type: string;
  status: string;
  status_category: string;
}

export function CatalystParentLinker({
  issue, itemId, itemType, projectKey, onOpenItem,
}: CatalystParentLinkerProps) {
  const rule = PARENT_LINK_RULES[itemType];

  // If no allowed parents, don't render
  if (!rule || rule.allowedParentTypes.length === 0) return null;

  if (rule.useBusinessRequests) {
    return <BusinessRequestParentPicker issue={issue} itemId={itemId} rule={rule} projectKey={projectKey} onOpenItem={onOpenItem} />;
  }

  return rule.mode === 'single'
    ? <SingleParentPicker issue={issue} itemId={itemId} rule={rule} projectKey={projectKey} onOpenItem={onOpenItem} />
    : <MultiLinkPicker issue={issue} itemId={itemId} rule={rule} projectKey={projectKey} onOpenItem={onOpenItem} />;
}

/* ═══════════════════════════════════════════════
   BUSINESS REQUEST PARENT PICKER — queries business_requests table
   ═══════════════════════════════════════════════ */
interface BrCandidate {
  id: string;
  request_key: string | null;
  title: string;
  process_step: string;
}

function BusinessRequestParentPicker({
  issue, itemId, rule, projectKey, onOpenItem,
}: {
  issue: PhIssue | null; itemId: string; rule: ParentLinkRule;
  projectKey?: string; onOpenItem?: (id: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Close on outside click
  useEffect(() => {
    if (!showPicker) return;
    const h = (e: MouseEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showPicker]);

  // Fetch active business requests
  const { data: candidates = [] } = useQuery({
    queryKey: ['cv-br-parent-candidates'],
    enabled: showPicker,
    queryFn: async () => {
      const { data } = await supabase.from('business_requests')
        .select('id, request_key, title, process_step')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(200);
      return (data || []) as BrCandidate[];
    },
    staleTime: 30000,
  });

  // Resolve current parent — stored as parent_key on ph_issues, matching request_key on business_requests
  const { data: currentParent } = useQuery({
    queryKey: ['cv-br-parent-resolved', issue?.parent_key],
    enabled: !!issue?.parent_key,
    queryFn: async () => {
      // Try matching parent_key to request_key
      const { data } = await supabase.from('business_requests')
        .select('id, request_key, title, process_step')
        .eq('request_key', issue!.parent_key!)
        .is('deleted_at', null)
        .maybeSingle();
      return data as BrCandidate | null;
    },
  });

  const updateParent = useMutation({
    mutationFn: async (newParentKey: string | null) => {
      await supabase.from('ph_issues').update({ parent_key: newParentKey }).eq('id', itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', itemId] });
      queryClient.invalidateQueries({ queryKey: ['cv-br-parent-resolved'] });
      setShowPicker(false);
      setSearch('');
    },
  });

  const DONE_STEPS = ['done', 'completed', 'closed', 'cancelled', 'rejected'];
  const filtered = candidates.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.request_key?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q);
  });
  const active = filtered.filter(c => !DONE_STEPS.includes(c.process_step?.toLowerCase()));
  const done = filtered.filter(c => DONE_STEPS.includes(c.process_step?.toLowerCase()));

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: '11px 0', position: 'relative' }} ref={pickerRef}>
      <span style={{ fontSize: 14, fontWeight: 500, lineHeight: '18.67px', color: '#505258', minWidth: 96, flexShrink: 0 }}>Parent</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Current parent display */}
        {currentParent ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IssueIcon type="Business Request" size={16} />
            <span
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: '#0052CC', cursor: 'pointer', flexShrink: 0 }}
              onClick={() => onOpenItem?.(currentParent.id)}
            >{currentParent.request_key}</span>
            <span style={{ fontSize: 14, color: '#292A2E', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
              onClick={() => onOpenItem?.(currentParent.id)}
            >{currentParent.title}</span>
            <button onClick={() => updateParent.mutate(null)} title="Remove parent" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#6B778C', display: 'flex' }}>
              <X size={12} />
            </button>
          </div>
        ) : (
          <SidebarAddTrigger label="Add parent" isOpen={showPicker} onClick={() => setShowPicker(!showPicker)} />
        )}

        {/* Picker dropdown */}
        {showPicker && (
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4,
            background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 6,
            boxShadow: '0 8px 16px rgba(9,30,66,0.15)', zIndex: 100, maxHeight: 400, display: 'flex', flexDirection: 'column',
          }}>
            {/* Search */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #F4F5F7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '2px solid #4C9AFF', borderRadius: 4, padding: '4px 8px' }}>
                <Search size={14} color="#5E6C84" />
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search business requests…"
                  style={{ border: 'none', outline: 'none', fontSize: 13, color: '#292A2E', width: '100%', fontFamily: 'inherit' }} />
                {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B778C', display: 'flex', padding: 0 }}><X size={14} /></button>}
              </div>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 340 }}>
              {renderBrGroup('ACTIVE', active, issue?.parent_key, (key) => updateParent.mutate(key))}
              {renderBrGroup('DONE', done, issue?.parent_key, (key) => updateParent.mutate(key))}
              {filtered.length === 0 && <div style={{ padding: '16px', fontSize: 13, color: '#6B778C', textAlign: 'center' }}>No matching business requests</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Render a group (ACTIVE / DONE) for business request parent picker */
function renderBrGroup(
  label: string, items: BrCandidate[], currentParentKey: string | null | undefined,
  onSelect: (key: string) => void,
) {
  if (items.length === 0) return null;
  const DONE_STEPS = ['done', 'completed', 'closed', 'cancelled', 'rejected'];
  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px 4px' }}>{label}</div>
      {items.map(item => {
        const isSelected = currentParentKey === item.request_key;
        const statusCat = DONE_STEPS.includes(item.process_step?.toLowerCase()) ? 'done' : 
                          ['in_progress', 'in progress', 'implementation', 'testing'].some(s => item.process_step?.toLowerCase().includes(s)) ? 'indeterminate' : 'new';
        return (
          <div key={item.id} onClick={() => item.request_key && onSelect(item.request_key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              cursor: 'pointer', background: isSelected ? '#DEEBFF' : 'transparent', transition: 'background 80ms',
            }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F4F5F7'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#DEEBFF' : 'transparent'; }}
          >
            <IssueIcon type="Business Request" size={14} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#5E6C84', flexShrink: 0 }}>{item.request_key || '—'}</span>
            <span style={{ fontSize: 13, color: '#292A2E', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
            <StatusLozenge status={item.process_step} category={statusCat} />
            {isSelected && <Check size={16} color="#0052CC" />}
          </div>
        );
      })}
    </>
  );
}

/* ═══════════════════════════════════════════════
   SINGLE PARENT PICKER — uses parent_key
   ═══════════════════════════════════════════════ */
function SingleParentPicker({
  issue, itemId, rule, projectKey, onOpenItem,
}: {
  issue: PhIssue | null; itemId: string; rule: ParentLinkRule;
  projectKey?: string; onOpenItem?: (id: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Close on outside click
  useEffect(() => {
    if (!showPicker) return;
    const h = (e: MouseEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showPicker]);

  // Fetch candidates
  const pk = projectKey || issue?.project_key;
  const { data: candidates = [] } = useQuery({
    queryKey: ['cv-parent-candidates', pk, rule.allowedParentTypes.join(',')],
    enabled: showPicker && !!pk,
    queryFn: async () => {
      const { data } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .eq('project_key', pk!)
        .in('issue_type', rule.allowedParentTypes)
        .is('deleted_at', null)
        .order('jira_updated_at', { ascending: false })
        .limit(200);
      return (data || []) as CandidateItem[];
    },
    staleTime: 30000,
  });

  // Resolve current parent
  const { data: currentParent } = useQuery({
    queryKey: ['cv-parent-resolved', issue?.parent_key],
    enabled: !!issue?.parent_key,
    queryFn: async () => {
      const { data } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .eq('issue_key', issue!.parent_key!)
        .is('deleted_at', null)
        .maybeSingle();
      return data as CandidateItem | null;
    },
  });

  const updateParent = useMutation({
    mutationFn: async (newParentKey: string | null) => {
      await supabase.from('ph_issues').update({ parent_key: newParentKey }).eq('id', itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', itemId] });
      queryClient.invalidateQueries({ queryKey: ['cv-parent-resolved'] });
      setShowPicker(false);
      setSearch('');
    },
  });

  const filtered = candidates.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.issue_key?.toLowerCase().includes(q) || c.summary?.toLowerCase().includes(q);
  });
  const active = filtered.filter(c => c.status_category !== 'done');
  const done = filtered.filter(c => c.status_category === 'done');

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: '11px 0', position: 'relative' }} ref={pickerRef}>
      <span style={{ fontSize: 14, fontWeight: 500, lineHeight: '18.67px', color: '#505258', minWidth: 96, flexShrink: 0 }}>Parent</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Current parent display */}
        {currentParent ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IssueIcon type={currentParent.issue_type} size={16} />
            <span
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: '#0052CC', cursor: 'pointer', flexShrink: 0 }}
              onClick={() => onOpenItem?.(currentParent.id)}
            >{currentParent.issue_key}</span>
            <span style={{ fontSize: 14, color: '#292A2E', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
              onClick={() => onOpenItem?.(currentParent.id)}
            >{currentParent.summary}</span>
            <button onClick={() => updateParent.mutate(null)} title="Remove parent" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#6B778C', display: 'flex' }}>
              <X size={12} />
            </button>
          </div>
        ) : (
          <SidebarAddTrigger label="Add parent" isOpen={showPicker} onClick={() => setShowPicker(!showPicker)} />
        )}

        {/* Picker dropdown */}
        {showPicker && (
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4,
            background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 6,
            boxShadow: '0 8px 16px rgba(9,30,66,0.15)', zIndex: 100, maxHeight: 400, display: 'flex', flexDirection: 'column',
          }}>
            {/* Search */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #F4F5F7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '2px solid #4C9AFF', borderRadius: 4, padding: '4px 8px' }}>
                <Search size={14} color="#5E6C84" />
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                  style={{ border: 'none', outline: 'none', fontSize: 13, color: '#292A2E', width: '100%', fontFamily: 'inherit' }} />
                {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B778C', display: 'flex', padding: 0 }}><X size={14} /></button>}
              </div>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 340 }}>
              {renderGroup('ACTIVE', active, issue?.parent_key, (key) => updateParent.mutate(key))}
              {renderGroup('DONE', done, issue?.parent_key, (key) => updateParent.mutate(key))}
              {filtered.length === 0 && <div style={{ padding: '16px', fontSize: 13, color: '#6B778C', textAlign: 'center' }}>No matching items</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MULTI LINK PICKER — uses ph_issue_links
   ═══════════════════════════════════════════════ */
function MultiLinkPicker({
  issue, itemId, rule, projectKey, onOpenItem,
}: {
  issue: PhIssue | null; itemId: string; rule: ParentLinkRule;
  projectKey?: string; onOpenItem?: (id: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!showPicker) return;
    const h = (e: MouseEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showPicker]);

  const pk = projectKey || issue?.project_key;

  // Fetch existing links for this item
  const { data: existingLinks = [] } = useQuery({
    queryKey: ['cv-parent-links', itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data } = await supabase.from('ph_issue_links')
        .select('id, target_id, link_type')
        .eq('source_id', itemId)
        .eq('link_type', 'is_child_of');
      if (!data?.length) return [];
      const targetIds = data.map(l => l.target_id);
      const { data: targets } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .in('id', targetIds)
        .is('deleted_at', null);
      return (targets || []).map(t => ({
        ...t,
        linkId: data.find(l => l.target_id === t.id)?.id,
      }));
    },
  });

  // Fetch candidates
  const { data: candidates = [] } = useQuery({
    queryKey: ['cv-parent-candidates', pk, rule.allowedParentTypes.join(',')],
    enabled: showPicker && !!pk,
    queryFn: async () => {
      const { data } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .eq('project_key', pk!)
        .in('issue_type', rule.allowedParentTypes)
        .is('deleted_at', null)
        .order('jira_updated_at', { ascending: false })
        .limit(200);
      return (data || []) as CandidateItem[];
    },
    staleTime: 30000,
  });

  const linkedIds = new Set(existingLinks.map((l: any) => l.id));

  const addLink = useMutation({
    mutationFn: async (targetId: string) => {
      await supabase.from('ph_issue_links').insert({
        source_id: itemId,
        target_id: targetId,
        link_type: 'is_child_of',
        created_by: (await supabase.auth.getUser()).data.user?.id ?? '',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv-parent-links', itemId] });
      toast.success('Link added');
    },
  });

  const removeLink = useMutation({
    mutationFn: async (linkId: string) => {
      await supabase.from('ph_issue_links').delete().eq('id', linkId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cv-parent-links', itemId] });
      toast.success('Link removed');
    },
  });

  const toggleLink = (candidate: CandidateItem) => {
    const existing = existingLinks.find((l: any) => l.id === candidate.id);
    if (existing) {
      removeLink.mutate((existing as any).linkId);
    } else {
      addLink.mutate(candidate.id);
    }
  };

  const filtered = candidates.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.issue_key?.toLowerCase().includes(q) || c.summary?.toLowerCase().includes(q);
  });
  const active = filtered.filter(c => c.status_category !== 'done');
  const done = filtered.filter(c => c.status_category === 'done');

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: '11px 0', position: 'relative' }} ref={pickerRef}>
      <span style={{ fontSize: 14, fontWeight: 500, lineHeight: '18.67px', color: '#505258', minWidth: 96, flexShrink: 0 }}>Linked to</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Current links display */}
        {existingLinks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
            {existingLinks.map((link: any) => (
              <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IssueIcon type={link.issue_type} size={16} />
                <span
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: '#0052CC', cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => onOpenItem?.(link.id)}
                >{link.issue_key}</span>
                <span style={{ fontSize: 14, color: '#292A2E', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                  onClick={() => onOpenItem?.(link.id)}
                >{link.summary}</span>
                <StatusLozenge status={link.status} category={link.status_category} />
                <button onClick={() => removeLink.mutate(link.linkId)} title="Remove link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#6B778C', display: 'flex' }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <SidebarAddTrigger label="Add link" isOpen={showPicker} onClick={() => setShowPicker(!showPicker)} />

        {/* Picker dropdown */}
        {showPicker && (
          <div style={{
            position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 4,
            background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 6,
            boxShadow: '0 8px 16px rgba(9,30,66,0.15)', zIndex: 100, maxHeight: 400, display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #F4F5F7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '2px solid #4C9AFF', borderRadius: 4, padding: '4px 8px' }}>
                <Search size={14} color="#5E6C84" />
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                  style={{ border: 'none', outline: 'none', fontSize: 13, color: '#292A2E', width: '100%', fontFamily: 'inherit' }} />
                {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B778C', display: 'flex', padding: 0 }}><X size={14} /></button>}
              </div>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 340 }}>
              {renderGroupMulti('ACTIVE', active, linkedIds, toggleLink)}
              {renderGroupMulti('DONE', done, linkedIds, toggleLink)}
              {filtered.length === 0 && <div style={{ padding: '16px', fontSize: 13, color: '#6B778C', textAlign: 'center' }}>No matching items</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SHARED RENDER HELPERS
   ═══════════════════════════════════════════════ */

/** Render a group (ACTIVE / DONE) for single-parent picker */
function renderGroup(
  label: string, items: CandidateItem[], currentParentKey: string | null | undefined,
  onSelect: (key: string) => void,
) {
  if (items.length === 0) return null;
  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px 4px' }}>{label}</div>
      {items.map(item => {
        const isSelected = currentParentKey === item.issue_key;
        return (
          <div key={item.id} onClick={() => onSelect(item.issue_key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              cursor: 'pointer', background: isSelected ? '#DEEBFF' : 'transparent', transition: 'background 80ms',
            }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F4F5F7'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#DEEBFF' : 'transparent'; }}
          >
            <IssueIcon type={item.issue_type} size={14} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#5E6C84', flexShrink: 0 }}>{item.issue_key}</span>
            <span style={{ fontSize: 13, color: '#292A2E', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.summary}</span>
            <StatusLozenge status={item.status} category={item.status_category} />
            {isSelected && <Check size={14} color="#0052CC" />}
          </div>
        );
      })}
    </>
  );
}

/** Render a group (ACTIVE / DONE) for multi-link picker — checkboxes */
function renderGroupMulti(
  label: string, items: CandidateItem[], linkedIds: Set<string>,
  onToggle: (item: CandidateItem) => void,
) {
  if (items.length === 0) return null;
  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px 4px' }}>{label}</div>
      {items.map(item => {
        const isLinked = linkedIds.has(item.id);
        return (
          <div key={item.id} onClick={() => onToggle(item)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              cursor: 'pointer', background: isLinked ? '#DEEBFF' : 'transparent', transition: 'background 80ms',
            }}
            onMouseEnter={e => { if (!isLinked) e.currentTarget.style.background = '#F4F5F7'; }}
            onMouseLeave={e => { e.currentTarget.style.background = isLinked ? '#DEEBFF' : 'transparent'; }}
          >
            {/* Checkbox */}
            <div style={{
              width: 16, height: 16, borderRadius: 3, flexShrink: 0,
              border: `1.5px solid ${isLinked ? '#2563EB' : '#C1C7D0'}`,
              background: isLinked ? '#2563EB' : '#FFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.12s, border-color 0.12s',
            }}>
              {isLinked && <Check size={10} color="#FFF" strokeWidth={3} />}
            </div>
            <IssueIcon type={item.issue_type} size={14} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#5E6C84', flexShrink: 0 }}>{item.issue_key}</span>
            <span style={{ fontSize: 13, color: '#292A2E', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.summary}</span>
            <StatusLozenge status={item.status} category={item.status_category} />
          </div>
        );
      })}
    </>
  );
}
