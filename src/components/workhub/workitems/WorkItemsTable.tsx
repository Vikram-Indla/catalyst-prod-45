/**
 * WorkItemsTable — Virtualized table with hierarchy tree for wh_issues
 * Resolves assignee avatars via wh_user_mapping → profiles
 */

import { useRef, useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { WorkItemRow } from './WorkItemRow';
import type { JiraIssue } from '@/hooks/workhub/useWorkItems';
import { buildTree, flattenTree } from '@/hooks/workhub/useWorkItems';
import { AlertCircle, FileStack } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WorkItemsTableProps {
  items: JiraIssue[];
  isLoading: boolean;
  error: Error | null;
  selectedIds: Set<string>;
  onToggleSelect: (key: string) => void;
  onSelectAll: () => void;
  selectAllState: 'none' | 'some' | 'all';
  onOpenDrawer: (key: string) => void;
  onRetry?: () => void;
}

const ROW_HEIGHT = 44;
const HEADER_COLS = ['Key', 'Summary', 'Status', 'Assignee', 'Priority', 'Updated', 'Created'];

/**
 * Fetch avatar mapping: jira_account_id → avatar_url from wh_user_mapping joined with profiles.
 * Returns a Map<jiraAccountId, avatarUrl>.
 */
function useAssigneeAvatars() {
  return useQuery({
    queryKey: ['workhub', 'assignee-avatars'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('wh_user_mapping')
        .select('jira_account_id, jira_avatar_url, catalyst_profile_id')
        .eq('is_mapped', true);

      if (error) throw new Error(error.message);

      // Also fetch profile avatar_url for mapped users (may be more up to date)
      const profileIds = (data ?? [])
        .map((d: any) => d.catalyst_profile_id)
        .filter(Boolean);

      let profileAvatars = new Map<string, string>();
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .in('id', profileIds);
        (profiles ?? []).forEach((p: any) => {
          if (p.avatar_url) profileAvatars.set(p.id, p.avatar_url);
        });
      }

      // Build jira_account_id → avatar_url map
      // Prefer profile avatar (propagated), fallback to jira_avatar_url
      const avatarMap = new Map<string, string>();
      (data ?? []).forEach((m: any) => {
        const profileAvatar = m.catalyst_profile_id ? profileAvatars.get(m.catalyst_profile_id) : null;
        const url = profileAvatar || m.jira_avatar_url;
        if (url) {
          avatarMap.set(m.jira_account_id, url);
        }
      });

      return avatarMap;
    },
    staleTime: 120_000,
  });
}

export function WorkItemsTable({
  items, isLoading, error, selectedIds,
  onToggleSelect, onSelectAll, selectAllState,
  onOpenDrawer, onRetry,
}: WorkItemsTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => {
    const keys = new Set<string>();
    const parentKeys = new Set(items.filter(i => i.parent_key).map(i => i.parent_key!));
    parentKeys.forEach(k => keys.add(k));
    return keys;
  });

  // All hooks must be called before early returns
  const tree = useMemo(() => buildTree(items), [items]);
  const flatNodes = useMemo(() => flattenTree(tree, expandedKeys), [tree, expandedKeys]);

  const keysWithChildren = useMemo(() => {
    const s = new Set<string>();
    items.forEach(i => { if (i.parent_key) s.add(i.parent_key); });
    return s;
  }, [items]);

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const virtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  });

  // Fetch avatar mapping (jira_account_id → avatar_url) — MUST be before early returns
  const { data: avatarMap } = useAssigneeAvatars();

  if (isLoading) {
    return (
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--wh-border, #e2e8f0)', backgroundColor: 'var(--wh-surface, #fff)' }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="grid items-center px-4 border-b animate-pulse"
            style={{
              gridTemplateColumns: '36px minmax(140px, auto) 1fr 120px 100px 130px 90px 90px',
              height: ROW_HEIGHT,
              borderColor: '#f1f5f9',
            }}
          >
            {Array.from({ length: 8 }).map((_, j) => (
              <div key={j} className="h-3 bg-slate-100 rounded" style={{ width: `${40 + Math.random() * 50}%` }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border p-12 text-center" style={{ borderColor: 'var(--wh-border, #e2e8f0)', backgroundColor: 'var(--wh-surface, #fff)' }}>
        <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: '#dc2626' }} />
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--wh-text-primary, #0f172a)' }}>Failed to load work items</p>
        <p className="text-xs mb-4" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }}>{error.message}</p>
        {onRetry && (
          <button onClick={onRetry} className="px-4 py-1.5 text-xs font-medium rounded-lg text-white" style={{ backgroundColor: 'var(--wh-primary, #2563eb)' }}>
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border p-12 text-center" style={{ borderColor: 'var(--wh-border, #e2e8f0)', backgroundColor: 'var(--wh-surface, #fff)' }}>
        <FileStack className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }} />
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--wh-text-primary, #0f172a)' }}>No work items found</p>
        <p className="text-xs" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }}>Try adjusting your filters or run a Jira sync</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--wh-border, #e2e8f0)', backgroundColor: 'var(--wh-surface, #fff)' }}>
      {/* Header */}
      <div
        className="grid items-center border-b sticky top-0"
        style={{
          gridTemplateColumns: '36px minmax(140px, auto) 1fr 120px 100px 130px 90px 90px',
          height: '36px',
          backgroundColor: '#f8fafc',
          borderColor: 'var(--wh-border, #e2e8f0)',
          zIndex: 10,
        }}
      >
        <div className="flex justify-center">
          <input
            type="checkbox"
            checked={selectAllState === 'all'}
            ref={el => { if (el) el.indeterminate = selectAllState === 'some'; }}
            onChange={onSelectAll}
            className="w-4 h-4 rounded cursor-pointer"
            style={{ accentColor: 'var(--wh-primary, #2563eb)' }}
          />
        </div>
        {HEADER_COLS.map(col => (
          <span key={col} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }}>
            {col}
          </span>
        ))}
      </div>

      {/* Virtualized rows */}
      <div ref={parentRef} style={{ height: Math.min(flatNodes.length * ROW_HEIGHT, 600), overflow: 'auto' }}>
        <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
          {virtualizer.getVirtualItems().map(virtualRow => {
            const node = flatNodes[virtualRow.index];
            if (!node) return null;
            // Resolve avatar from mapping
            const assigneeAvatar = node.item.assignee_account_id
              ? avatarMap?.get(node.item.assignee_account_id) ?? null
              : null;
            return (
              <div
                key={node.item.issue_key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <WorkItemRow
                  item={node.item}
                  depth={node.depth}
                  hasChildren={keysWithChildren.has(node.item.issue_key)}
                  isExpanded={expandedKeys.has(node.item.issue_key)}
                  isSelected={selectedIds.has(node.item.issue_key)}
                  avatarUrl={assigneeAvatar}
                  onToggleExpand={() => toggleExpand(node.item.issue_key)}
                  onToggleSelect={() => onToggleSelect(node.item.issue_key)}
                  onOpenDrawer={() => onOpenDrawer(node.item.issue_key)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
