/**
 * CleanupPage — AI Cleanup Governance
 * Full page for managing stale work items.
 * Light mode only. Page bg #F8FAFC, cards #ffffff.
 */
import React, { useState, useMemo, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGovernanceScore } from '@/hooks/useGovernanceScore';
import { useAgeingItems, type AgeingItem } from '@/hooks/useAgeingItems';
import { toast } from 'sonner';
import {
  ChevronDown, ChevronUp, ChevronRight,
  AlertTriangle, Clock, GitBranch, UserX, Link, Copy, AlertCircle,
  CheckCircle, Bell, MessageSquare, Ghost, User, UserCheck, Folder, Tag,
  LayoutGrid, List as ListIcon,
} from 'lucide-react';
import { JiraIssueTypeIcon } from '@/components/shared/JiraIssueTypeIcon';
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const StoryDetailModal = lazy(() => import('@/modules/project-work-hub/components/dialogs/StoryDetailModal'));

// ── Types ────────────────────────────────────────
interface CleanupItem {
  id: string;
  issue_key: string;
  title: string;
  status: string;
  status_category: string;
  issue_type: string;
  updated_at: string;
  created_at: string;
  assignee_account_id: string | null;
  reporter_account_id: string | null;
  reporter_name: string | null;
  parent_key: string | null;
  days_stale: number;
  project_key: string;
  fixed_versions: string | null;
  categoryKey: number;
}

// ── Category Definitions ────────────────────────
interface CategoryDef {
  key: number;
  icon: React.ElementType;
  name: string;
  shortLabel: string;
  subtitle: string;
  isReporterOnus: boolean;
}

const CATEGORIES: CategoryDef[] = [
  { key: 1, icon: Ghost, name: 'Ghost Tickets', shortLabel: 'Ghost', subtitle: 'No comments, no activity, 60+ days stale', isReporterOnus: false },
  { key: 2, icon: GitBranch, name: 'No Work Breakdown', shortLabel: 'No Breakdown', subtitle: 'Stories without breakdown, 30+ days open', isReporterOnus: false },
  { key: 3, icon: UserX, name: 'Inactive Assignee', shortLabel: 'Inactive', subtitle: 'Assignee inactive — reporter must action', isReporterOnus: true },
  { key: 4, icon: Link, name: 'Epic-Linked Stale', shortLabel: 'Epic-Linked', subtitle: 'Epic-linked, 45+ days stale', isReporterOnus: false },
  { key: 5, icon: Clock, name: 'Long-Stale Low Priority', shortLabel: 'Long Stale', subtitle: 'Low priority, 90+ days open', isReporterOnus: false },
  { key: 6, icon: Copy, name: 'AI Duplicate', shortLabel: 'AI Dup', subtitle: 'Potential duplicates flagged by AI', isReporterOnus: false },
  { key: 7, icon: AlertCircle, name: 'Active Defect, Inactive Assignee', shortLabel: 'Active Defect', subtitle: 'Active defect, inactive assignee — reporter must action', isReporterOnus: true },
];

const CLOSURE_REASONS = [
  'No activity for 60+ days',
  'Superseded by another item',
  'Duplicate',
  'Requirement dropped',
  'Other (see comment)',
];

const AI_INSIGHTS: Record<number, string> = {
  1: 'No comments or transitions in 60+ days. Safe to close.',
  2: 'Story created 30+ days ago with no subtasks or work breakdown.',
  4: 'Linked to an active epic but stale for 45+ days.',
  5: 'Low priority item open for 90+ days with no recent activity.',
  6: 'AI-detected duplicate or superseded item.',
};

const CAT_SHORT: Record<number, string> = {
  1: 'Ghost', 2: 'No Breakdown', 3: 'Inactive',
  4: 'Epic-Linked', 5: 'Long Stale', 6: 'AI Dup', 7: 'Active Defect',
};

// ── Status Lozenge ──────────────────────────────
function StatusLozenge({ value }: { value: string }) {
  const lower = (value || '').toLowerCase();
  let bg = '#DFE1E6', color = '#253858';
  if (lower.includes('progress') || lower.includes('review') || lower.includes('active') || lower.includes('integration') || lower.includes('ready for development')) {
    bg = '#DEEBFF'; color = '#0747A6';
  } else if (lower.includes('done') || lower.includes('approved') || lower.includes('complete')) {
    bg = '#E3FCEF'; color = '#006644';
  }
  return (
    <span
      title={value}
      style={{
        display: 'inline-block', height: 20, lineHeight: '20px',
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.03em', borderRadius: 3, padding: '0 6px',
        background: bg, color, fontFamily: 'Inter, sans-serif',
        whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {value}
    </span>
  );
}

// ── Helpers ──────────────────────────────────────
function daysColor(d: number): string {
  if (d > 90) return '#DC2626';
  if (d >= 60) return '#92400E';
  return '#64748B';
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Main Component ──────────────────────────────
export default function CleanupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: govScore } = useGovernanceScore();

  const [activeTab, setActiveTab] = useState<'cleanup' | 'restore'>('cleanup');
  const [viewMode, setViewMode] = useState<'group' | 'list'>('group');
  const [openCats, setOpenCats] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    CATEGORIES.forEach(c => { init[c.key] = true; });
    return init;
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showForceCloseDialog, setShowForceCloseDialog] = useState(false);
  const [closureReason, setClosureReason] = useState(CLOSURE_REASONS[0]);
  const [detailItem, setDetailItem] = useState<{ id: string; catKey: number } | null>(null);
  const [detailNavIndex, setDetailNavIndex] = useState(0);

  // List view filters
  const [listCatFilter, setListCatFilter] = useState('all');
  const [listStatusFilter, setListStatusFilter] = useState('all');

  const toggleCat = (key: number) => {
    setOpenCats(p => ({ ...p, [key]: !p[key] }));
  };

  const toggleItem = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Use shared ageing items ──
  const { data: sharedItems = [], isLoading } = useAgeingItems();

  // ── Resolve project names from project keys ──
  const projectKeys = useMemo(() => [...new Set(sharedItems.map(i => i.project_key).filter(Boolean))], [sharedItems]);
  const { data: projectNameMap = {} } = useQuery({
    queryKey: ['cleanup-project-names', projectKeys],
    enabled: projectKeys.length > 0,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('key, name').in('key', projectKeys);
      const map: Record<string, string> = {};
      (data ?? []).forEach((p: any) => { map[p.key] = p.name; });
      return map;
    },
  });

  // ── Resolve parent info (title + issue_type) from parent_key ──
  const parentKeys = useMemo(() => [...new Set(sharedItems.map(i => i.parent_key).filter(Boolean))] as string[], [sharedItems]);
  const { data: parentInfoMap = {} } = useQuery({
    queryKey: ['cleanup-parent-info', parentKeys],
    enabled: parentKeys.length > 0,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase.from('ph_issues').select('issue_key, summary, issue_type').in('issue_key', parentKeys);
      const map: Record<string, { title: string; issueType: string }> = {};
      (data ?? []).forEach((p: any) => { map[p.issue_key] = { title: p.summary, issueType: p.issue_type || 'Task' }; });
      return map;
    },
  });

  // ── Inline status edit state ──
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);

  const handleInlineStatusChange = useCallback(async (itemId: string, newStatus: string) => {
    setEditingStatusId(null);
    const { error } = await supabase
      .from('catalyst_issues')
      .update({ status: newStatus })
      .eq('id', itemId);
    if (error) {
      toast.error('Status update failed: ' + error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ['ageing-items'] });
    toast.success(`Status updated to "${newStatus}"`);
  }, [qc]);

  // ── Categorize items ──
  const catData = useMemo(() => {
    const result: Record<number, CleanupItem[]> = {};

    const toCleanup = (item: AgeingItem, catKey: number): CleanupItem => ({
      id: item.id,
      issue_key: item.jira_key,
      title: item.summary,
      status: item.status,
      status_category: item.status_category,
      issue_type: item.issue_type_raw,
      updated_at: item.jira_updated_at || item.created_at,
      created_at: item.created_at,
      assignee_account_id: item.assignee_account_id,
      reporter_account_id: item.reporter_account_id,
      reporter_name: item.reporter_name,
      parent_key: item.parent_key,
      days_stale: item.days_assigned,
      project_key: item.project_key,
      fixed_versions: item.fixed_versions,
      categoryKey: catKey,
    });

    result[1] = sharedItems.filter(i => i.days_assigned >= 60).map(i => toCleanup(i, 1));
    result[2] = sharedItems.filter(i => i.item_type === 'Story' && i.days_assigned >= 30).map(i => toCleanup(i, 2));
    result[3] = [];
    result[4] = sharedItems.filter(i => i.parent_key && i.days_assigned >= 45).map(i => toCleanup(i, 4));
    result[5] = sharedItems.filter(i => i.days_assigned >= 90).map(i => toCleanup(i, 5));
    result[6] = [];
    result[7] = sharedItems.filter(i => i.item_type === 'QA Bug').map(i => toCleanup(i, 7));

    return result;
  }, [sharedItems]);

  // ── Stats ──
  const stats = useMemo(() => ({
    aiFlagged: sharedItems.length,
    ghost: (catData[1] ?? []).length,
    noBreakdown: (catData[2] ?? []).length,
    reporter: (catData[3] ?? []).length + (catData[7] ?? []).length,
    other: (catData[5] ?? []).length,
  }), [catData, sharedItems.length]);

  const allFlatItems = useMemo(() => Object.values(catData).flat(), [catData]);
  const selectedItems = useMemo(() => allFlatItems.filter(i => selected.has(i.id)), [allFlatItems, selected]);

  // ── List view: filtered items ──
  const listFilteredItems = useMemo(() => {
    let items = allFlatItems;
    if (listCatFilter !== 'all') {
      const catKey = parseInt(listCatFilter);
      items = items.filter(i => i.categoryKey === catKey);
    }
    if (listStatusFilter !== 'all') {
      items = items.filter(i => i.status === listStatusFilter);
    }
    return items;
  }, [allFlatItems, listCatFilter, listStatusFilter]);

  const distinctStatuses = useMemo(() => {
    const s = new Set(allFlatItems.map(i => i.status));
    return Array.from(s).sort();
  }, [allFlatItems]);

  // Checkable items in list (exclude cat3/cat7)
  const listCheckableItems = useMemo(() =>
    listFilteredItems.filter(i => !CATEGORIES.find(c => c.key === i.categoryKey)?.isReporterOnus),
    [listFilteredItems]
  );

  const allListChecked = listCheckableItems.length > 0 && listCheckableItems.every(i => selected.has(i.id));
  const someListChecked = listCheckableItems.some(i => selected.has(i.id));

  // Master checkbox ref for indeterminate
  const masterCheckRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (masterCheckRef.current) {
      const input = masterCheckRef.current.querySelector('input');
      if (input) input.indeterminate = someListChecked && !allListChecked;
    }
  }, [someListChecked, allListChecked]);

  const handleMasterCheck = useCallback(() => {
    if (allListChecked) {
      // Deselect all filtered
      setSelected(prev => {
        const next = new Set(prev);
        listCheckableItems.forEach(i => next.delete(i.id));
        return next;
      });
    } else {
      // Select all filtered checkable
      setSelected(prev => {
        const next = new Set(prev);
        listCheckableItems.forEach(i => next.add(i.id));
        return next;
      });
    }
  }, [allListChecked, listCheckableItems]);

  // ── Force Close Handler ──
  const handleForceClose = useCallback(async () => {
    if (!user?.id || selected.size === 0) return;
    const ids = Array.from(selected);
    const closedItems = allFlatItems.filter(i => ids.includes(i.id));
    const restoreDeadline = new Date(Date.now() + 90 * 86400_000).toISOString();
    const todayStr = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('catalyst_issues')
      .update({
        status: 'done',
        closure_method: 'force_bypass',
        force_closed_by: user.id,
        force_closed_at: new Date().toISOString(),
        force_close_reason: closureReason,
        restore_deadline: restoreDeadline,
      })
      .in('id', ids);

    if (error) { toast.error('Force close failed: ' + error.message); return; }

    for (const item of closedItems) {
      const catLabel = CATEGORIES.find(c => c.key === item.categoryKey)?.name ?? 'Unknown';
      await supabase.from('ph_comments').insert({
        work_item_id: item.id,
        author_id: user.id,
        body: `[AI Cleanup] Force closed on ${todayStr}. Reason: ${closureReason}. Governance category: ${catLabel}. Restore window expires: ${new Date(Date.now() + 90 * 86400_000).toISOString().split('T')[0]}. Audit reference: governance closure log.`,
      });
    }

    for (const item of closedItems) {
      await supabase.from('governance_closure_log').insert({
        item_key: item.issue_key,
        issue_id: item.id,
        closed_by: user.id,
        governance_category: item.categoryKey,
        stale_days: item.days_stale,
        reporter_notified: !!item.reporter_account_id,
        restore_deadline: restoreDeadline,
        closure_reason: closureReason,
        original_status: item.status,
      } as any);
    }

    const reporterIds = [...new Set(closedItems.map(i => i.reporter_account_id).filter(Boolean))] as string[];
    for (const rid of reporterIds) {
      const rItems = closedItems.filter(i => i.reporter_account_id === rid);
      await supabase.from('notifications').insert({
        recipient_user_id: rid,
        notification_type: 'direct',
        title: 'Items force-closed — action may be required',
        message: rItems.map(i => `${i.issue_key} "${i.title}"`).join(', ') + ' — force-closed by governance cleanup. Restore within 90 days if needed.',
        entity_type: 'issue',
        entity_id: rItems[0].id,
      });
    }

    qc.invalidateQueries({ queryKey: ['ageing-items'] });
    qc.invalidateQueries({ queryKey: ['governance-score'] });
    qc.invalidateQueries({ queryKey: ['cleanup-categories'] });
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['watching-tab'] });

    setSelected(new Set());
    setShowForceCloseDialog(false);
    toast.success(`${ids.length} item${ids.length > 1 ? 's' : ''} force-closed. Comment added to each issue. Reporters notified.`);
  }, [user, selected, closureReason, allFlatItems, qc]);

  // ── Notify Reporter ──
  const handleNotifyReporter = useCallback(async (item: CleanupItem) => {
    if (!item.reporter_account_id) { toast.error('No reporter on this item'); return; }
    await supabase.from('notifications').insert({
      recipient_user_id: item.reporter_account_id,
      notification_type: 'direct',
      title: 'Action required — inactive assignee',
      message: `${item.issue_key} "${item.title}" — assignee inactive. Please reassign or close within 7 days.`,
      entity_type: 'issue',
      entity_id: item.id,
    });
    toast.success('Reporter notified');
  }, []);

  // ── RAG config ──
  const ragStatus = govScore?.ragStatus ?? 'green';
  const breachStreak = govScore?.breachStreak ?? 0;
  const itemCount = sharedItems.length;
  const ragCfg = {
    green: { bg: '#ECFDF5', border: '#6EE7B7', color: '#065F46' },
    amber: { bg: '#FFFBEB', border: '#FCD34D', color: '#92400E' },
    red:   { bg: '#FEF2F2', border: '#FCA5A5', color: '#991B1B' },
  }[ragStatus];

  // ── Select all in category ──
  const handleSelectAllInCategory = useCallback((catKey: number) => {
    const items = catData[catKey] ?? [];
    const cat = CATEGORIES.find(c => c.key === catKey);
    if (cat?.isReporterOnus) return;
    setSelected(prev => {
      const next = new Set(prev);
      items.forEach(i => next.add(i.id));
      return next;
    });
  }, [catData]);

  const handleDeselectAllInCategory = useCallback((catKey: number) => {
    const items = catData[catKey] ?? [];
    setSelected(prev => {
      const next = new Set(prev);
      items.forEach(i => next.delete(i.id));
      return next;
    });
  }, [catData]);

  const handleDeselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  // ── Detail modal navigation ──
  const detailCatItems = useMemo(() => {
    if (!detailItem) return [];
    return catData[detailItem.catKey] ?? [];
  }, [detailItem, catData]);

  const handleOpenDetail = useCallback((item: CleanupItem) => {
    const catItems = catData[item.categoryKey] ?? [];
    const idx = catItems.findIndex(i => i.id === item.id);
    setDetailItem({ id: item.id, catKey: item.categoryKey });
    setDetailNavIndex(idx >= 0 ? idx : 0);
  }, [catData]);

  // For list view detail — use filtered list as navigation context
  const handleOpenDetailList = useCallback((item: CleanupItem, idx: number) => {
    setDetailItem({ id: item.id, catKey: item.categoryKey });
    setDetailNavIndex(idx);
  }, []);

  const handleDetailNavigate = useCallback((idx: number) => {
    if (idx < 0 || idx >= detailCatItems.length) return;
    setDetailNavIndex(idx);
    setDetailItem(prev => prev ? { ...prev, id: detailCatItems[idx].id } : null);
  }, [detailCatItems]);

  // ── Restore tab data ──
  const { data: restoreData = [], refetch: refetchRestore } = useQuery({
    queryKey: ['governance-restore', user?.id],
    enabled: !!user?.id && activeTab === 'restore',
    queryFn: async () => {
      const { data } = await supabase
        .from('governance_closure_log')
        .select('*')
        .eq('closed_by', user!.id)
        .order('closed_at', { ascending: false });
      return data ?? [];
    },
  });

  const handleRestore = useCallback(async (logEntry: any) => {
    if (!user?.id) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const originalStatus = (logEntry as any).original_status || 'To Do';

    await supabase
      .from('catalyst_issues')
      .update({
        status: originalStatus,
        closure_method: 'normal',
        force_closed_by: null,
        force_closed_at: null,
      })
      .eq('id', logEntry.issue_id);

    await supabase
      .from('governance_closure_log')
      .update({
        restored_at: new Date().toISOString(),
        restored_by: user.id,
      })
      .eq('id', logEntry.id);

    if (logEntry.issue_id) {
      await supabase.from('ph_comments').insert({
        work_item_id: logEntry.issue_id,
        author_id: user.id,
        body: `[AI Cleanup] Restored on ${todayStr}. Original force closure reason: ${logEntry.closure_reason || 'Not specified'}.`,
      });
    }

    qc.invalidateQueries({ queryKey: ['ageing-items'] });
    qc.invalidateQueries({ queryKey: ['governance-score'] });
    qc.invalidateQueries({ queryKey: ['cleanup-categories'] });
    qc.invalidateQueries({ queryKey: ['governance-restore'] });

    toast.success('Item restored. Original status and assignee reinstated.');
    refetchRestore();
  }, [user, qc, refetchRestore]);

  // ── First selected item category for "select all" in bulk bar ──
  const firstSelectedCatKey = useMemo(() => {
    if (selected.size === 0) return null;
    const firstId = Array.from(selected)[0];
    const item = allFlatItems.find(i => i.id === firstId);
    return item?.categoryKey ?? null;
  }, [selected, allFlatItems]);

  // ── Preview reporter notifications ──
  const handlePreviewReporterNotifications = useCallback(() => {
    if (selectedItems.length === 0) {
      toast.error('No items selected');
      return;
    }
    const reporterMap = new Map<string, { name: string; count: number }>();
    selectedItems.forEach(item => {
      const rid = item.reporter_account_id || 'unknown';
      const rname = item.reporter_name || 'Unknown Reporter';
      if (!reporterMap.has(rid)) reporterMap.set(rid, { name: rname, count: 0 });
      reporterMap.get(rid)!.count++;
    });
    const reporters = Array.from(reporterMap.values());
    const msg = reporters.map(r => `${r.name} (${r.count} item${r.count > 1 ? 's' : ''})`).join(', ');
    toast.info(`Reporters to be notified: ${msg}`);
  }, [selectedItems]);


  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#F8FAFC', fontFamily: 'Inter, sans-serif',
    }}>
      {/* ═══ PAGE HEADER ═══ */}
      <div style={{
        background: '#ffffff', borderBottom: '1px solid #E2E8F0',
        padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700, color: '#0F172A' }}>
            AI Cleanup
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#94A3B8' }}>Last scan: today 02:00 AST</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
            background: ragCfg.bg, border: `1px solid ${ragCfg.border}`, color: ragCfg.color,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: ragCfg.color, display: 'inline-block' }} />
            {ragStatus.toUpperCase()}
          </span>
        </div>
      </div>

      {/* ═══ GOVERNANCE BREACH BANNER ═══ */}
      {(ragStatus === 'red' || ragStatus === 'amber') && (
        <div style={{
          background: ragStatus === 'red' ? '#FEF2F2' : '#FFFBEB',
          borderBottom: '1px solid ' + (ragStatus === 'red' ? '#FCA5A5' : '#FCD34D'),
          padding: '8px 24px', display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <AlertTriangle size={14} color={ragStatus === 'red' ? '#991B1B' : '#92400E'} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13, color: ragStatus === 'red' ? '#991B1B' : '#92400E', lineHeight: 1.5 }}>
            {ragStatus === 'red'
              ? `Governance breach — ${itemCount} aging items, ${breachStreak}d streak. Force closures bypass status workflow. Reporters notified automatically. Audit trail is permanent. Restore window: 90 days. REPORTER items — onus is on the reporter, not you.`
              : `Governance warning — ${itemCount} aging items. Review and close stale work to prevent a breach.`
            }
          </span>
        </div>
      )}

      {/* ═══ TABS + VIEW TOGGLE ═══ */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: '#ffffff', borderBottom: '1px solid #E2E8F0', flexShrink: 0,
        padding: '0 16px 0 0',
      }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            { key: 'cleanup' as const, label: 'Active Cleanup' },
            { key: 'restore' as const, label: 'Closed — Restore' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 24px', border: 'none', cursor: 'pointer',
                background: 'transparent', fontFamily: 'Inter, sans-serif',
                fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 500,
                color: activeTab === tab.key ? '#0F172A' : '#64748B',
                borderBottom: activeTab === tab.key ? '2px solid #2563EB' : '2px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'cleanup' && (
          <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
            {[
              { key: 'group' as const, icon: LayoutGrid, label: 'Group' },
              { key: 'list' as const, icon: ListIcon, label: 'List' },
            ].map(v => (
              <button
                key={v.key}
                onClick={() => setViewMode(v.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  height: 32, padding: '0 12px', border: 'none', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500,
                  background: viewMode === v.key ? '#0F172A' : '#ffffff',
                  color: viewMode === v.key ? '#ffffff' : '#64748B',
                  transition: 'background 100ms, color 100ms',
                }}
              >
                <v.icon size={14} />
                {v.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === 'cleanup' ? (
        <>
          {/* ═══ STATS ROW ═══ */}
          <div style={{
            display: 'flex', gap: 32, padding: '16px 24px',
            borderBottom: '1px solid #E2E8F0', background: '#ffffff', flexShrink: 0,
          }}>
            {[
              { label: 'AI FLAGGED', value: stats.aiFlagged },
              { label: 'GHOST', value: stats.ghost },
              { label: 'NO BREAKDOWN', value: stats.noBreakdown },
              { label: 'REPORTER', value: stats.reporter },
              { label: 'OTHER', value: stats.other },
            ].map(cell => (
              <div key={cell.label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 26,
                  fontWeight: 600, color: '#0F172A',
                }}>
                  {cell.value}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 500, color: '#94A3B8',
                  textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4,
                }}>
                  {cell.label}
                </div>
              </div>
            ))}
          </div>

          {viewMode === 'group' ? (
            /* ═══ GROUP VIEW (existing accordion) ═══ */
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: selected.size > 0 ? 70 : 16 }}>
              {!isLoading && sharedItems.length === 0 ? (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', marginTop: 64, gap: 12,
                }}>
                  <CheckCircle size={48} color="#10B981" strokeWidth={1.5} />
                  <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, color: '#065F46' }}>
                    Governance: GREEN
                  </span>
                  <span style={{ fontSize: 13, color: '#94A3B8' }}>
                    All items are in compliance. Check back tomorrow.
                  </span>
                </div>
              ) : isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <div style={{
                    width: 24, height: 24,
                    border: '2.5px solid #E2E8F0', borderTopColor: '#2563EB',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                  }} />
                </div>
              ) : (
                CATEGORIES.map(cat => {
                  const items = catData[cat.key] ?? [];
                  const isOpen = openCats[cat.key] ?? true;
                  const CatIcon = cat.icon;
                  const checkableItems = items.filter(() => !cat.isReporterOnus);
                  const allCatSelected = checkableItems.length > 0 && checkableItems.every(i => selected.has(i.id));

                  return (
                    <div key={cat.key}>
                      {/* Section Header */}
                      <div
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                          padding: '12px 16px',
                          background: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
                          fontFamily: 'Inter, sans-serif',
                        }}
                      >
                        <button
                          onClick={() => toggleCat(cat.key)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, flex: 1,
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontFamily: 'Inter, sans-serif', textAlign: 'left',
                          }}
                        >
                          <CatIcon size={16} color="#64748B" />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
                              {cat.name}
                            </span>
                            <span style={{
                              marginLeft: 8, fontSize: 11, color: '#64748B',
                              background: '#F1F5F9', padding: '2px 8px', borderRadius: 20,
                            }}>
                              {items.length}
                            </span>
                            <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 2 }}>
                              {cat.subtitle}
                            </div>
                          </div>
                          {isOpen ? <ChevronUp size={14} color="#94A3B8" /> : <ChevronDown size={14} color="#94A3B8" />}
                        </button>

                        {/* Select all link in expanded header */}
                        {isOpen && !cat.isReporterOnus && checkableItems.length > 0 && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              if (allCatSelected) {
                                handleDeselectAllInCategory(cat.key);
                              } else {
                                handleSelectAllInCategory(cat.key);
                              }
                            }}
                            style={{
                              fontSize: 12, color: '#2563EB', cursor: 'pointer',
                              whiteSpace: 'nowrap', flexShrink: 0,
                            }}
                          >
                            {allCatSelected ? 'Deselect all' : `Select all ${checkableItems.length}`}
                          </span>
                        )}
                      </div>

                      {/* Items */}
                      {isOpen && items.length > 0 && items.map(item => (
                        <div
                          key={item.id}
                          style={{
                            padding: '12px 16px', borderBottom: '0.75px solid #F1F5F9',
                            background: '#ffffff', transition: 'background 150ms',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                        >
                          {/* LINE 1 */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {!cat.isReporterOnus && (
                              <Checkbox
                                checked={selected.has(item.id)}
                                onCheckedChange={() => toggleItem(item.id)}
                                style={{ width: 16, height: 16 }}
                              />
                            )}
                            <span style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 12, fontWeight: 500, color: '#2563EB',
                            }}>
                              {item.issue_key}
                            </span>
                            <StatusLozenge value={item.status} />
                            <span style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 13, fontWeight: 600, color: daysColor(item.days_stale),
                            }}>
                              {item.days_stale}d
                            </span>
                            {cat.isReporterOnus && (
                              <span style={{
                                fontSize: 11, fontWeight: 600,
                                background: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5',
                                padding: '2px 8px', borderRadius: 4,
                              }}>
                                REPORTER
                              </span>
                            )}
                            <div style={{ flex: 1 }} />
                            <button
                              onClick={() => handleOpenDetail(item)}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                padding: 4, display: 'flex',
                              }}
                            >
                              <ChevronRight size={14} color="#CBD5E1" />
                            </button>
                          </div>

                          {/* LINE 2 — Title */}
                          <div style={{
                            fontSize: 14, fontWeight: 400, color: '#1E293B',
                            marginTop: 4, paddingLeft: cat.isReporterOnus ? 0 : 28,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {item.title}
                          </div>

                          {/* LINE 3 — Metadata */}
                          <div style={{
                            display: 'flex', gap: 16, marginTop: 4,
                            paddingLeft: cat.isReporterOnus ? 0 : 28, flexWrap: 'wrap',
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#64748B' }}>
                              <User size={12} color="#94A3B8" />
                              {item.reporter_name || 'Unknown'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#64748B' }}>
                              <UserCheck size={12} color="#94A3B8" />
                              {item.reporter_name || 'Unknown'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#64748B' }}>
                              <Folder size={12} color="#94A3B8" />
                              {item.project_key || '\u2014'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#64748B' }}>
                              <Tag size={12} color="#94A3B8" />
                              {item.fixed_versions || '\u2014'}
                            </span>
                          </div>

                          {/* LINE 4 — AI reasoning */}
                          {!cat.isReporterOnus && AI_INSIGHTS[cat.key] && (
                            <div style={{
                              marginTop: 8, paddingLeft: cat.isReporterOnus ? 0 : 28,
                            }}>
                              <div style={{
                                background: '#F8FAFC', borderLeft: '2px solid #CBD5E1',
                                padding: '6px 12px', fontSize: 14, color: '#1E293B',
                              }}>
                                {AI_INSIGHTS[cat.key]}
                              </div>
                            </div>
                          )}

                          {/* Reporter onus note */}
                          {cat.isReporterOnus && (
                            <div style={{
                              fontSize: 13, color: '#94A3B8', marginTop: 4,
                            }}>
                              Reporter must action — {item.reporter_name || 'Unknown'}
                            </div>
                          )}
                        </div>
                      ))}

                      {isOpen && items.length === 0 && (
                        <div style={{
                          padding: '16px', textAlign: 'center',
                          fontSize: 13, color: '#94A3B8', background: '#ffffff',
                          borderBottom: '0.75px solid #F1F5F9',
                        }}>
                          No items in this category
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* ═══ LIST VIEW — ForYou-inherited <table> structure ═══ */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Toolbar */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px',
                background: '#ffffff', borderBottom: '1px solid #E2E8F0', flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Checkbox
                    ref={masterCheckRef as any}
                    checked={allListChecked}
                    onCheckedChange={handleMasterCheck}
                    style={{ width: 16, height: 16 }}
                  />
                  <span style={{ fontSize: 13, color: '#0F172A', whiteSpace: 'nowrap' }}>
                    {someListChecked
                      ? `${listCheckableItems.filter(i => selected.has(i.id)).length} of ${listCheckableItems.length} selected`
                      : `Select all ${listCheckableItems.length}`
                    }
                  </span>
                </div>

                <Select value={listCatFilter} onValueChange={setListCatFilter}>
                  <SelectTrigger style={{ height: 32, width: 180, fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 6, background: '#ffffff' }}>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent style={{ background: '#ffffff' }}>
                    <SelectItem value="all" style={{ fontSize: 12 }}>All categories</SelectItem>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.key} value={String(c.key)} style={{ fontSize: 12 }}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={listStatusFilter} onValueChange={setListStatusFilter}>
                  <SelectTrigger style={{ height: 32, width: 160, fontSize: 12, border: '1px solid #E2E8F0', borderRadius: 6, background: '#ffffff' }}>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent style={{ background: '#ffffff' }}>
                    <SelectItem value="all" style={{ fontSize: 12 }}>All statuses</SelectItem>
                    {distinctStatuses.map(s => (
                      <SelectItem key={s} value={s} style={{ fontSize: 12 }}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div style={{ flex: 1 }} />

                <Button
                  disabled={selected.size === 0}
                  onClick={() => setShowForceCloseDialog(true)}
                  className="disabled:opacity-100"
                  style={{
                    height: 32, fontSize: 12, fontWeight: 700,
                    background: selected.size > 0 ? '#DC2626' : '#F1F5F9',
                    color: selected.size > 0 ? '#ffffff' : '#94A3B8',
                    border: selected.size > 0 ? 'none' : '1px solid #E2E8F0',
                    cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={e => { if (selected.size > 0) e.currentTarget.style.background = '#B91C1C'; }}
                  onMouseLeave={e => { if (selected.size > 0) e.currentTarget.style.background = '#DC2626'; }}
                >
                  Force Close ({selected.size})
                </Button>
              </div>

              {/* Table */}
              <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', paddingBottom: selected.size > 0 ? 70 : 0 }}>
                {isLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <div style={{
                      width: 24, height: 24,
                      border: '2.5px solid #E2E8F0', borderTopColor: '#2563EB',
                      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                    }} />
                  </div>
                ) : listFilteredItems.length === 0 ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', padding: '64px 0', gap: 12,
                  }}>
                    <CheckCircle size={32} color="#CBD5E1" />
                    <span style={{ fontSize: 14, color: '#94A3B8' }}>No items match this filter</span>
                    {(listCatFilter !== 'all' || listStatusFilter !== 'all') && (
                      <span
                        onClick={() => { setListCatFilter('all'); setListStatusFilter('all'); }}
                        style={{ fontSize: 13, color: '#2563EB', textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        Clear filters
                      </span>
                    )}
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: 36 }} />
                      <col style={{ width: 120 }} />
                      <col />
                      <col style={{ width: 180 }} />
                      <col style={{ width: 160 }} />
                      <col style={{ width: 150 }} />
                      <col style={{ width: 150 }} />
                      <col style={{ width: 130 }} />
                      <col style={{ width: 60 }} />
                      <col style={{ width: 110 }} />
                      <col style={{ width: 32 }} />
                    </colgroup>
                    <thead>
                      <tr>
                        {[
                          { label: '', width: 36 },
                          { label: 'KEY', width: 120 },
                          { label: 'SUMMARY' },
                          { label: 'PARENT', width: 180 },
                          { label: 'PROJECT', width: 160 },
                          { label: 'REPORTER', width: 150 },
                          { label: 'ASSIGNEE', width: 150 },
                          { label: 'STATUS', width: 130, align: 'center' as const },
                          { label: 'DAYS', width: 60, align: 'right' as const },
                          { label: 'CATEGORY', width: 110 },
                          { label: '', width: 32 },
                        ].map((col, i) => (
                          <th key={i} style={{
                            height: 44, padding: '10px 12px',
                            background: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
                            fontSize: 11, fontWeight: 700, color: '#94A3B8',
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                            textAlign: (col.align || 'left') as any, whiteSpace: 'nowrap',
                            verticalAlign: 'middle', fontFamily: 'Inter, sans-serif',
                          }}>
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {listFilteredItems.map((item, idx) => {
                        const cat = CATEGORIES.find(c => c.key === item.categoryKey);
                        const isReporter = cat?.isReporterOnus ?? false;
                        const isSelected = selected.has(item.id);
                        const projectName = projectNameMap[item.project_key] || item.project_key || '\u2014';
                        const parentTitle = item.parent_key ? (parentTitleMap[item.parent_key] || item.parent_key) : null;

                        return (
                          <tr
                            key={item.id}
                            onClick={() => handleOpenDetailList(item, idx)}
                            style={{
                              height: 44, borderBottom: '1px solid #F1F5F9', cursor: 'pointer',
                              background: isSelected ? 'rgba(37,99,235,0.04)' : '#ffffff',
                              borderLeft: isSelected ? '2px solid #2563EB' : '2px solid transparent',
                              transition: 'background .1s',
                            }}
                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC'; }}
                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#ffffff'; }}
                          >
                            {/* Checkbox */}
                            <td style={{ padding: '8px 12px', width: 36 }} onClick={e => e.stopPropagation()}>
                              {isReporter ? (
                                <span style={{ color: '#CBD5E1', fontSize: 13 }}>{'\u2014'}</span>
                              ) : (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleItem(item.id)}
                                  style={{ width: 16, height: 16 }}
                                />
                              )}
                            </td>

                            {/* Key + Type icon */}
                            <td style={{ padding: '8px 12px', width: 120 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <JiraIssueTypeIcon issueType={item.issue_type} size={16} />
                                <span style={{
                                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                                  fontWeight: 600, color: '#2563EB',
                                }}>
                                  {item.issue_key}
                                </span>
                              </div>
                            </td>

                            {/* Summary */}
                            <td style={{
                              padding: '8px 12px', fontSize: 13, fontWeight: 500,
                              color: '#0F172A', maxWidth: 0,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {item.title}
                            </td>

                            {/* Parent — full title */}
                            <td style={{ padding: '8px 12px', width: 180 }} title={parentTitle || undefined}>
                              {parentTitle ? (
                                <span style={{
                                  fontSize: 13, fontWeight: 500, color: '#475569',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  display: 'block',
                                }}>
                                  {parentTitle}
                                </span>
                              ) : (
                                <span style={{ fontSize: 13, color: '#CBD5E1' }}>{'\u2014'}</span>
                              )}
                            </td>

                            {/* Project — full name */}
                            <td style={{ padding: '8px 12px', width: 160 }} title={projectName}>
                              <span style={{
                                fontSize: 13, fontWeight: 500, color: '#475569',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                display: 'block',
                              }}>
                                {projectName}
                              </span>
                            </td>

                            {/* Reporter */}
                            <td style={{ padding: '8px 12px', width: 150 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {(() => {
                                  const name = item.reporter_name || 'Unknown';
                                  const ini = initials(name);
                                  const clr = ['#2563EB', '#0D9488', '#0284C7', '#DC2626', '#DB2777'][ini.charCodeAt(0) % 5];
                                  return (
                                    <>
                                      <div style={{
                                        width: 24, height: 24, borderRadius: '50%', background: clr,
                                        color: '#ffffff', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0,
                                      }}>
                                        {ini}
                                      </div>
                                      <span style={{
                                        fontSize: 13, fontWeight: 500, color: '#475569',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                      }}>
                                        {name}
                                      </span>
                                    </>
                                  );
                                })()}
                              </div>
                            </td>

                            {/* Assignee */}
                            <td style={{ padding: '8px 12px', width: 150 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {(() => {
                                  const name = item.reporter_name || 'Unknown';
                                  const ini = initials(name);
                                  const clr = ['#2563EB', '#0D9488', '#0284C7', '#DC2626', '#DB2777'][ini.charCodeAt(0) % 5];
                                  return (
                                    <>
                                      <div style={{
                                        width: 24, height: 24, borderRadius: '50%', background: clr,
                                        color: '#ffffff', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0,
                                      }}>
                                        {ini}
                                      </div>
                                      <span style={{
                                        fontSize: 13, fontWeight: 500, color: '#475569',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                      }}>
                                        {name}
                                      </span>
                                    </>
                                  );
                                })()}
                              </div>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '8px 8px', width: 130, textAlign: 'center' }}>
                              <StatusLozenge value={item.status} />
                            </td>

                            {/* Days */}
                            <td style={{
                              padding: '8px 12px', width: 60, textAlign: 'right',
                              fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600,
                              color: daysColor(item.days_stale),
                            }}>
                              {item.days_stale}d
                            </td>

                            {/* Category */}
                            <td style={{ padding: '8px 8px', width: 110 }}>
                              <span style={{
                                display: 'inline-block', fontSize: 11, color: '#64748B',
                                background: '#F1F5F9', border: '1px solid #E2E8F0',
                                padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap',
                                maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis',
                              }}>
                                {CAT_SHORT[item.categoryKey] || 'Other'}
                              </span>
                            </td>

                            {/* Detail chevron */}
                            <td style={{ padding: '4px', width: 32, textAlign: 'center' }}>
                              <ChevronRight size={14} color="#CBD5E1" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ═══ BULK ACTION BAR ═══ */}
          {selected.size > 0 && (
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              background: '#ffffff', borderTop: '1px solid #E2E8F0',
              padding: '12px 24px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', zIndex: 50,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: '#0F172A' }}>
                  {selected.size} selected
                </span>
                {firstSelectedCatKey !== null && viewMode === 'group' && (
                  <span
                    onClick={() => {
                      const allInCat = (catData[firstSelectedCatKey] ?? []).every(i => selected.has(i.id));
                      if (allInCat) {
                        handleDeselectAllInCategory(firstSelectedCatKey);
                      } else {
                        handleSelectAllInCategory(firstSelectedCatKey);
                      }
                    }}
                    style={{ fontSize: 13, color: '#2563EB', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    {(catData[firstSelectedCatKey] ?? []).every(i => selected.has(i.id)) ? 'Deselect all' : `Select all ${(catData[firstSelectedCatKey] ?? []).length} in category`}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="outline"
                  style={{ height: 36, fontSize: 14 }}
                  onClick={handlePreviewReporterNotifications}
                >
                  Preview reporter notifications
                </Button>
                <Button
                  variant="outline"
                  style={{ height: 36, fontSize: 14, background: '#ffffff', border: '1px solid #E2E8F0', color: '#0F172A' }}
                  onClick={() => toast.info('Force Close via workflow — coming soon')}
                >
                  Force Close (via workflow)
                </Button>
                <Button
                  style={{
                    height: 36, fontSize: 14, fontWeight: 700,
                    background: '#DC2626', color: '#ffffff', border: 'none',
                  }}
                  onClick={() => setShowForceCloseDialog(true)}
                  onMouseEnter={e => (e.currentTarget.style.background = '#B91C1C')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#DC2626')}
                >
                  Force Close (bypass)
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ═══ RESTORE TAB ═══ */
        <div style={{ flex: 1, overflowY: 'auto', background: '#ffffff' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['KEY', 'SUMMARY', 'CATEGORY', 'CLOSED', 'RESTORE DEADLINE', 'ACTION'].map(h => (
                  <th key={h} style={{
                    padding: '10px 12px', fontSize: 11, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    color: '#64748B', textAlign: 'left', fontFamily: 'Inter, sans-serif',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {restoreData.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                    No closed items found
                  </td>
                </tr>
              ) : restoreData.map((entry: any) => {
                const deadlinePassed = entry.restore_deadline ? new Date(entry.restore_deadline) < new Date() : true;
                const alreadyRestored = !!entry.restored_at;
                const catLabel = CATEGORIES.find(c => c.key === entry.governance_category)?.name ?? 'Unknown';
                const daysUntilDeadline = entry.restore_deadline
                  ? Math.max(0, Math.ceil((new Date(entry.restore_deadline).getTime() - Date.now()) / 86400_000))
                  : 0;

                return (
                  <tr key={entry.id} style={{ borderBottom: '0.75px solid #F1F5F9', height: 36 }}>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 13, fontWeight: 500, color: '#2563EB',
                      }}>
                        {entry.item_key}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 13, color: '#0F172A', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.item_key}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 13, color: '#64748B' }}>
                      {catLabel}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: '#64748B' }}>
                        {entry.closed_at ? relativeTime(entry.closed_at) : '\u2014'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
                        color: deadlinePassed || alreadyRestored ? '#94A3B8' : '#065F46',
                      }}>
                        {alreadyRestored ? 'Restored' : deadlinePassed ? 'Window expired' : `Expires in ${daysUntilDeadline}d`}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {!deadlinePassed && !alreadyRestored ? (
                        <Button
                          variant="outline"
                          size="sm"
                          style={{ height: 28, fontSize: 13 }}
                          onClick={() => handleRestore(entry)}
                        >
                          Restore
                        </Button>
                      ) : (
                        <span style={{ color: '#CBD5E1' }}>{'\u2014'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ FORCE CLOSE DIALOG ═══ */}
      <Dialog open={showForceCloseDialog} onOpenChange={setShowForceCloseDialog}>
        <DialogContent
          style={{
            maxWidth: 680, width: '90vw', borderRadius: 8,
            backgroundColor: '#ffffff', border: 'none',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
            padding: 0,
          }}
        >
          {/* HEADER */}
          <div style={{ padding: '24px 24px 0' }}>
            <h2 style={{
              fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 700,
              color: '#0F172A', margin: 0,
            }}>
              Force close {selected.size} item{selected.size !== 1 ? 's' : ''}?
            </h2>
            <p style={{ fontSize: 14, color: '#64748B', marginTop: 6, marginBottom: 0 }}>
              These items will be marked Done and locked. Reporters will be notified. A comment will be added to each issue. The action is permanent in the audit trail.
            </p>
            <div style={{ height: 1, background: '#E2E8F0', marginTop: 20 }} />
          </div>

          {/* BODY */}
          <div style={{ padding: '16px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
            {/* Section 1 */}
            <div style={{
              fontSize: 11, fontWeight: 500, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12,
            }}>
              WHAT WILL HAPPEN
            </div>
            {[
              { Icon: CheckCircle, text: 'Items marked Done, bypassing status workflow' },
              { Icon: Bell, text: 'Reporters notified via in-app notification' },
              { Icon: MessageSquare, text: 'A system comment is added to each issue with your name, reason, and timestamp' },
              { Icon: Clock, text: 'Restore window: 90 days from today' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0' }}>
                <row.Icon size={16} color="#64748B" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 14, color: '#1E293B', lineHeight: 1.5 }}>{row.text}</span>
              </div>
            ))}

            <div style={{ height: 1, background: '#F1F5F9', margin: '16px 0' }} />

            {/* Section 2 — Reporters */}
            <div style={{
              fontSize: 11, fontWeight: 500, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12,
            }}>
              REPORTERS BEING NOTIFIED
            </div>
            {(() => {
              const reporterMap = new Map<string, { name: string; items: typeof selectedItems }>();
              selectedItems.forEach(item => {
                const rid = item.reporter_account_id || 'unknown';
                const rname = item.reporter_name || 'Unknown Reporter';
                if (!reporterMap.has(rid)) reporterMap.set(rid, { name: rname, items: [] });
                reporterMap.get(rid)!.items.push(item);
              });
              const reporters = Array.from(reporterMap.values());
              if (reporters.length === 0) {
                return <p style={{ fontSize: 13, color: '#94A3B8' }}>No reporters linked to selected items.</p>;
              }
              return (
                <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                  {reporters.map((r, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', background: '#F1F5F9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>{initials(r.name)}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{r.name}</div>
                        <div style={{ fontSize: 13, color: '#64748B' }}>
                          {r.items.length} item{r.items.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div style={{ height: 1, background: '#F1F5F9', margin: '16px 0' }} />

            {/* Section 3 — Closure reason */}
            <div style={{
              fontSize: 11, fontWeight: 500, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
            }}>
              CLOSURE REASON
            </div>
            <Select value={closureReason} onValueChange={setClosureReason}>
              <SelectTrigger style={{
                width: '100%', height: 40, border: '1px solid #E2E8F0',
                borderRadius: 6, fontSize: 14, color: '#0F172A',
                background: '#ffffff', padding: '0 12px',
              }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: '#ffffff' }}>
                {CLOSURE_REASONS.map(r => (
                  <SelectItem key={r} value={r} style={{ fontSize: 14 }}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* FOOTER */}
          <div style={{
            padding: '16px 24px', borderTop: '1px solid #E2E8F0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span
              onClick={() => { setShowForceCloseDialog(false); navigate('/audit-trail'); }}
              style={{ fontSize: 13, color: '#2563EB', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Audit trail
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowForceCloseDialog(false)}
                style={{
                  height: 36, padding: '0 20px', borderRadius: 6,
                  background: 'transparent', border: '1px solid #E2E8F0',
                  color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleForceClose}
                style={{
                  height: 36, padding: '0 24px', borderRadius: 6,
                  background: '#DC2626', border: 'none',
                  color: '#ffffff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#B91C1C')}
                onMouseLeave={e => (e.currentTarget.style.background = '#DC2626')}
              >
                Close {selected.size} item{selected.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ STORY DETAIL MODAL ═══ */}
      {detailItem && (viewMode === 'group' ? detailCatItems.length > 0 : listFilteredItems.length > 0) && (
        <Suspense fallback={null}>
          <StoryDetailModal
            isOpen={true}
            onClose={() => setDetailItem(null)}
            itemId={
              viewMode === 'group'
                ? (detailCatItems[detailNavIndex]?.id ?? detailItem.id)
                : (listFilteredItems[detailNavIndex]?.id ?? detailItem.id)
            }
            projectId=""
            projectKey={
              viewMode === 'group'
                ? (detailCatItems[detailNavIndex]?.project_key ?? '')
                : (listFilteredItems[detailNavIndex]?.project_key ?? '')
            }
          />
        </Suspense>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
