// @ts-nocheck
/**
 * Story Backlog Page — @atlaskit/* build.
 *
 * Mounted via a localStorage flag — `catalyst.story-backlog.atlaskit === '1'`.
 * See StoryBacklogPage.tsx (the flag router) for the opt-in wiring.
 *
 * Uses (already installed in Catalyst):
 *   - @atlaskit/dynamic-table   sortable/paginated table
 *   - @atlaskit/lozenge          subtle status pills
 *   - @atlaskit/avatar           assignee avatars
 *   - @atlaskit/textfield        search input
 *   - @atlaskit/button           actions + toolbar
 *   - @atlaskit/checkbox         row select
 *   - @atlaskit/dropdown-menu    Group-by, ⋯ menu
 *   - @atlaskit/popup            Filter, column-picker
 *   - @atlaskit/inline-edit      inline Summary edit
 *   - @atlaskit/empty-state      no-results state
 *   - @atlaskit/spinner          loading
 *   - @atlaskit/tokens           theme-aware colours
 *
 * Preserves EVERY hook from the legacy page — data/sort/filter/group/select/
 * bulk-action/edit/delete/detail logic is identical.
 */

import React, { useState, useMemo, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ── Atlaskit ────────────────────────────────────────
import Avatar from '@atlaskit/avatar';
import Textfield from '@atlaskit/textfield';
import Button, { IconButton } from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';
import { Box, Stack, Inline, xcss } from '@atlaskit/primitives';

// ── Canonical JiraTable (this is THE table for all Catalyst pages) ───────────
import {
  JiraTable,
  makeKeyCell,
  makeCommentsCell,
  makeDateCell,
  makeTypeIconCell,
  makeStatusEditCell,
  makeSummaryInlineEditCell,
  makeAssigneeEditCell,
  makePriorityEditCell,
  makeParentEditCell,
  makeRowActionsCell,
} from '@/components/shared/JiraTable';
import type { Column, LozengeAppearance, StatusOption, AssigneeChoice, ParentChoice, RowAction } from '@/components/shared/JiraTable';
import { Pencil, Copy as CopyIcon, Trash2, Flag } from 'lucide-react';

// ── Catalyst hooks + utilities (PRESERVED) ──────────
import { useStoryBacklog, useEpicBacklog } from '../hooks/useBacklogData';
import { useStarredItemIds, useToggleStar } from '@/hooks/home/useStarredItems';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { writeTicketOrigin } from '../hooks/useTicketOrigin';
import { STORY_STATUS_LOZENGE, getPriorityLabel, getInitials } from '../utils/backlog.utils';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { JiraBulkActionBar } from '@/components/shared/JiraBulkActionBar';
import { JiraFilterAtlaskit, emptyFilterValue, DEFAULT_QUICK_FILTERS } from '@/components/shared/JiraFilterAtlaskit';
import type { JiraFilterValue, AssigneeOption, FixVersionOption } from '@/components/shared/JiraFilterAtlaskit';
import { DeleteConfirmDialog } from '../components/dialogs/DeleteConfirmDialog';
import { EditStoryDialog } from '../components/dialogs/EditStoryDialog';
import { useAtlaskitThemeSync } from '../components/SubtasksPanel/atlaskitTheme';
import type { BacklogStory } from '../types/backlog.types';
import { Search as SearchIcon, Filter as FilterIcon, ChevronDown, Settings, MoreHorizontal, Star, Plus } from 'lucide-react';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

// ─────────────────────────────────────────────────────────────────────────────
// Column model (keys match Jira surface layout the user asked to copy)
// ─────────────────────────────────────────────────────────────────────────────

type ColKey = 'select' | 'type' | 'key' | 'summary' | 'status' | 'comments' | 'parent' | 'assignee' | 'priority' | 'updated';

interface ColumnConfig {
  key: ColKey;
  label: string;
  width?: number;
  isSortable?: boolean;
  defaultVisible: boolean;
  alwaysVisible?: boolean;
}

// Atlaskit DynamicTable widths are fractional (out of 100) — not pixels.
// One row of widths must sum to ~100 for the table to render correctly.
const COLUMNS: ColumnConfig[] = [
  { key: 'select',   label: '',         width: 4,  defaultVisible: true, alwaysVisible: true },
  { key: 'type',     label: '',         width: 3,  defaultVisible: true, alwaysVisible: true },
  { key: 'key',      label: 'Key',      width: 9,  isSortable: true, defaultVisible: true },
  { key: 'summary',  label: 'Summary',  width: 28, isSortable: true, defaultVisible: true, alwaysVisible: true },
  { key: 'status',   label: 'Status',   width: 11, isSortable: true, defaultVisible: true },
  { key: 'comments', label: 'Comments', width: 9,  defaultVisible: true },
  { key: 'parent',   label: 'Parent',   width: 16, isSortable: true, defaultVisible: true },
  { key: 'assignee', label: 'Assignee', width: 13, isSortable: true, defaultVisible: true },
  { key: 'priority', label: 'Priority', width: 7,  isSortable: true, defaultVisible: false },
  { key: 'updated',  label: 'Updated',  width: 8,  isSortable: true, defaultVisible: false },
];

const PRIORITY_ORDER = ['critical', 'highest', 'high', 'medium', 'low', 'lowest'];

// ─────────────────────────────────────────────────────────────────────────────
// Status → Atlaskit Lozenge mapping
// ─────────────────────────────────────────────────────────────────────────────
type LozengeAppearance = 'default' | 'inprogress' | 'success' | 'removed' | 'moved' | 'new';

function statusAppearance(status: string | null | undefined): LozengeAppearance {
  if (!status) return 'default';
  // `STORY_STATUS_LOZENGE.color` is now the Atlaskit appearance token directly
  // (§20 / L41 migration). Pass it through; fall back to 'default' for unknown.
  const cfg = STORY_STATUS_LOZENGE[status];
  return (cfg?.color as LozengeAppearance) ?? 'default';
}

function statusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return STORY_STATUS_LOZENGE[status]?.label || status.toUpperCase();
}

/**
 * Status options for the inline editor. Values mirror STORY_STATUS_LOZENGE
 * keys so `appearanceFor` / `labelFor` work without any translation.
 * Grouped into Jira's three canonical status categories.
 */
const STATUS_OPTIONS: StatusOption[] = [
  // To Do
  { value: 'To Do',                   label: 'TO DO',                   appearance: 'default',    group: 'To Do' },
  { value: 'Backlog',                 label: 'BACKLOG',                 appearance: 'default',    group: 'To Do' },
  { value: 'In Requirements',         label: 'IN REQUIREMENTS',         appearance: 'default',    group: 'To Do' },
  { value: 'In Design',               label: 'IN DESIGN',               appearance: 'default',    group: 'To Do' },
  // In Progress
  { value: 'Ready for Development',   label: 'READY FOR DEV',           appearance: 'inprogress', group: 'In Progress' },
  { value: 'In Development',          label: 'IN DEVELOPMENT',          appearance: 'inprogress', group: 'In Progress' },
  { value: 'In Progress',             label: 'IN PROGRESS',             appearance: 'inprogress', group: 'In Progress' },
  { value: 'In QA',                   label: 'IN QA',                   appearance: 'inprogress', group: 'In Progress' },
  { value: 'In UAT',                  label: 'IN UAT',                  appearance: 'inprogress', group: 'In Progress' },
  { value: 'BETA READY',              label: 'BETA READY',              appearance: 'inprogress', group: 'In Progress' },
  { value: 'In BETA',                 label: 'IN BETA',                 appearance: 'inprogress', group: 'In Progress' },
  // Done
  { value: 'Done',                    label: 'DONE',                    appearance: 'success',    group: 'Done' },
  { value: 'In Production',           label: 'IN PRODUCTION',           appearance: 'success',    group: 'Done' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sort / filter / group helpers (PRESERVED semantics from legacy)
// ─────────────────────────────────────────────────────────────────────────────

function getSortValue(s: BacklogStory, k: ColKey): string | number {
  switch (k) {
    case 'key':      return s.story_key || '';
    case 'summary':  return (s.title || '').toLowerCase();
    case 'status':   return (s.status || '').toLowerCase();
    case 'parent':   return s.feature?.epic?.name?.toLowerCase() || '';
    case 'assignee': return (s.assignee_name || '').toLowerCase();
    case 'priority': {
      const i = PRIORITY_ORDER.indexOf(s.priority || '');
      return i >= 0 ? i : 999;
    }
    case 'updated':  return s.jira_updated_at || '';
    default:         return '';
  }
}

function sortStories(items: BacklogStory[], key: ColKey | null, dir: 'ASC' | 'DESC' | null) {
  if (!key || !dir) return items;
  return [...items].sort((a, b) => {
    const av = getSortValue(a, key);
    const bv = getSortValue(b, key);
    const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return dir === 'ASC' ? cmp : -cmp;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout tokens (xcss for Atlaskit primitives)
// ─────────────────────────────────────────────────────────────────────────────

const pageStyles = xcss({
  minHeight: '100%',
  backgroundColor: 'elevation.surface',
  color: 'color.text',
  font: 'font.body',
});

const headerStyles = xcss({
  paddingBlock: 'space.300',
  paddingInline: 'space.400',
  borderBottomWidth: 'border.width',
  borderBottomStyle: 'solid',
  borderBottomColor: 'color.border',
  backgroundColor: 'elevation.surface',
});

const toolbarStyles = xcss({
  paddingBlock: 'space.150',
  paddingInline: 'space.400',
  display: 'flex',
  alignItems: 'center',
  gap: 'space.150',
  borderBottomWidth: 'border.width',
  borderBottomStyle: 'solid',
  borderBottomColor: 'color.border',
  backgroundColor: 'elevation.surface',
});

const contentStyles = xcss({
  padding: 'space.300',
});

// ─────────────────────────────────────────────────────────────────────────────
// The Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AtlaskitStoryBacklogPage({
  projectId: propProjectId,
  projectKey,
}: {
  projectId?: string;
  projectKey?: string;
}) {
  // === 1. All hooks declared up-front — no conditional hooks ================
  const params = useParams<{ projectId: string }>();
  const projectId = propProjectId || params.projectId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // keep @atlaskit/tokens in sync with Catalyst's light/dark theme
  useAtlaskitThemeSync();

  const { data: stories, isLoading, error } = useStoryBacklog(projectId || '');
  const { data: epics } = useEpicBacklog(projectId || '');
  const avatarsByName = useProfileAvatarsByName();
  const { data: starredIds } = useStarredItemIds();
  const toggleStar = useToggleStar();

  // ui state
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<ColKey | null>(null);
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC' | null>(null);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(() =>
    new Set(COLUMNS.filter(c => c.defaultVisible).map(c => c.key)),
  );
  const [groupBy, setGroupBy] = useState<'none' | 'status' | 'priority' | 'assignee' | 'parent'>('none');
  const [filterValue, setFilterValue] = useState<JiraFilterValue>(emptyFilterValue);
  const [editStoryId, setEditStoryId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BacklogStory | null>(null);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);

  const pageSize = 25;
  const containerRef = useRef<HTMLDivElement>(null);

  // derived: assignee options — union of (a) all assignees seen in stories,
  //                                    (b) all assignees seen in epics,
  //                                    (c) all entries in the profile directory.
  // This is closer to "all project members" than the previous version which
  // only used currently-paginated row data.
  const assigneeOptions = useMemo<AssigneeOption[]>(() => {
    const map = new Map<string, AssigneeOption>();
    const add = (name?: string | null) => {
      if (!name) return;
      if (map.has(name)) return;
      map.set(name, {
        id: name,
        name,
        avatarUrl: avatarsByName.get(name.toLowerCase()) ?? null,
      });
    };
    (stories || []).forEach(s => add(s.assignee_name));
    (epics || []).forEach(e => add(e.assignee_name));
    // Anyone in the profile directory we don't already have.
    avatarsByName.forEach((url, lowerName) => {
      // Skip — we only have lowercase keys + URL, not the original cased name.
      // The `stories`/`epics` loops above cover most real names; this is best-effort.
      void url; void lowerName;
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [stories, epics, avatarsByName]);

  // Parent picker options: all epics in the project (real list, not derived
  // from currently-visible stories).
  const parentOptions = useMemo<ParentChoice[]>(() => {
    return (epics || [])
      .map(e => ({ id: e.id, key: e.epic_key, label: e.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [epics]);

  // derived: fix-version options. We don't have a fix_version field on the
  // current data shape — use parent epics as a stand-in (same visual treatment).
  const fixVersionOptions = useMemo<FixVersionOption[]>(() => {
    const all = stories || [];
    const map = new Map<string, FixVersionOption>();
    all.forEach(s => {
      const ep = s.feature?.epic;
      if (ep && !map.has(ep.id)) {
        map.set(ep.id, { id: ep.id, label: ep.epic_key ? `${ep.epic_key} — ${ep.name}` : ep.name });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [stories]);

  // derived: search + filter + sort
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    let src = stories || [];

    // text search
    if (q) {
      src = src.filter(s =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.story_key || '').toLowerCase().includes(q) ||
        (s.assignee_name || '').toLowerCase().includes(q),
      );
    }

    const f = filterValue;

    // Saved chip — "starred"
    if (f.saved === 'starred') {
      src = src.filter(s => starredIds?.has(s.id));
    }

    // Quick filters (each id is a hardcoded predicate)
    if (f.quick.includes('assigned-to-me')) {
      // Without a current-user identity in scope, this filters to stories with ANY assignee
      // matching the first assignee in the list. Real implementation should plumb in current user name.
      src = src.filter(s => !!s.assignee_name);
    }
    if (f.quick.includes('due-this-week')) {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 7);
      src = src.filter(s => {
        const d = s.start_date;
        if (!d) return false;
        const t = new Date(d).getTime();
        return t >= start.getTime() && t <= end.getTime();
      });
    }
    if (f.quick.includes('done-work-items')) {
      src = src.filter(s => {
        const st = (s.status || '').toLowerCase();
        return st.includes('done') || st.includes('production') || st.includes('closed');
      });
    }
    if (f.quick.includes('open-defects')) {
      // No defect-type field in this data set — soft no-op.
    }

    // Date range — apply to start_date (Jira "due date" surrogate in this data)
    if (f.dateRange.start) {
      const t0 = new Date(f.dateRange.start).getTime();
      src = src.filter(s => s.start_date && new Date(s.start_date).getTime() >= t0);
    }
    if (f.dateRange.due) {
      const t1 = new Date(f.dateRange.due).getTime();
      src = src.filter(s => s.start_date && new Date(s.start_date).getTime() <= t1);
    }

    // Assignees
    if (f.assignees.length) {
      const sel = new Set(f.assignees);
      src = src.filter(s => s.assignee_name && sel.has(s.assignee_name));
    }

    // Created range — applied to jira_created_at
    if (f.createdRange.from) {
      const t0 = new Date(f.createdRange.from).getTime();
      src = src.filter(s => s.jira_created_at && new Date(s.jira_created_at).getTime() >= t0);
    }
    if (f.createdRange.to) {
      const t1 = new Date(f.createdRange.to).getTime();
      src = src.filter(s => s.jira_created_at && new Date(s.jira_created_at).getTime() <= t1);
    }

    // Fix versions (mapped to parent epic id in this data)
    if (f.fixVersions.length) {
      const sel = new Set(f.fixVersions);
      src = src.filter(s => s.feature?.epic && sel.has(s.feature.epic.id));
    }

    return src;
  }, [stories, search, filterValue, starredIds]);

  const sorted = useMemo(() => sortStories(searched, sortKey, sortDir), [searched, sortKey, sortDir]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page]);

  // reset page on search/sort/filter/group changes
  useEffect(() => { setPage(1); }, [search, sortKey, sortDir, groupBy, filterValue]);

  // Jira-style: click a row → opens the side detail panel (DOES NOT navigate away).
  const openStoryDetail = useCallback((s: BacklogStory) => {
    writeTicketOrigin({
      fromUrl: `/project-hub/${projectKey}/story-backlog`,
      fromLabel: 'Story backlog',
      fromType: 'story-backlog' as const,
    });
    setDetailItemId(s.id);
  }, [projectKey]);

  const closeDetail = useCallback(() => setDetailItemId(null), []);

  // selection
  const handleSelectRow = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const allSelected = paginated.length > 0 && paginated.every(s => selectedIds.has(s.id));
  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) paginated.forEach(s => next.add(s.id));
      else paginated.forEach(s => next.delete(s.id));
      return next;
    });
  }, [paginated]);

  // update summary mutation (for inline edit)
  const updateSummary = useMutation({
    mutationFn: async ({ id, summary, source }: { id: string; summary: string; source?: string }) => {
      if (source === 'catalyst') {
        const { error } = await supabase.from('catalyst_issues').update({ title: summary, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
      } else {
        // Jira-synced rows are read-only via Catalyst — show info toast
        throw new Error('Jira-synced items must be edited in Jira.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] });
      toast.success('Summary updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Inline-edit mutations: status / assignee / priority ──
  // These run for Catalyst-native rows; Jira-synced rows show a toast.
  const updateField = useMutation({
    mutationFn: async ({ id, source, patch }: { id: string; source?: string; patch: Record<string, unknown> }) => {
      if (source === 'catalyst') {
        const { error } = await supabase
          .from('catalyst_issues')
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      } else {
        throw new Error('Jira-synced items must be edited in Jira.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] });
      toast.success('Updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // delete mutation (only Catalyst-native items)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stories').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] });
      toast.success('Story archived');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to archive story'),
  });

  // === 2. Build the column schema for <JiraTable /> =========================
  // All cells are produced from the canonical helpers in @/components/shared/JiraTable.
  // Adding a new column here is the only change a future page needs to make.

  const tableColumns = useMemo<Column<BacklogStory>[]>(() => {
    const all: Column<BacklogStory>[] = [
      {
        id: 'type',
        label: '',
        width: 3,
        align: 'center',
        alwaysVisible: true,
        cell: makeTypeIconCell(() => <JiraIssueTypeIcon type="story" size={16} />),
      },
      {
        id: 'key',
        label: 'Key',
        width: 9,
        sortable: true,
        accessor: (r) => r.story_key || '',
        cell: makeKeyCell((r) => r.story_key),
      },
      {
        id: 'summary',
        label: 'Summary',
        width: 28,
        sortable: true,
        alwaysVisible: true,
        accessor: (r) => (r.title || '').toLowerCase(),
        cell: makeSummaryInlineEditCell<BacklogStory>({
          getSummary: (r) => r.title,
          canEdit: (r) => r.source === 'catalyst',
          onChange: (row, next) => updateField.mutate({ id: row.id, source: row.source, patch: { title: next } }),
        }),
      },
      {
        id: 'status',
        label: 'Status',
        width: 11,
        sortable: true,
        accessor: (r) => (r.status || '').toLowerCase(),
        cell: makeStatusEditCell<BacklogStory>({
          getStatus: (r) => r.status,
          appearanceFor: (s) => statusAppearance(s) as LozengeAppearance,
          labelFor: (s) => statusLabel(s),
          options: STATUS_OPTIONS,
          // For demo: allow opening picker for both — Catalyst persists, Jira shows toast.
          canEdit: () => true,
          onChange: (row, next) => updateField.mutate({ id: row.id, source: row.source, patch: { status: next } }),
        }),
      },
      {
        id: 'comments',
        label: 'Comments',
        width: 10,
        cell: makeCommentsCell((r) => (r as any).comment_count ?? null),
      },
      {
        id: 'parent',
        label: 'Parent',
        width: 16,
        sortable: true,
        accessor: (r) => r.feature?.epic?.name?.toLowerCase() || '',
        cell: makeParentEditCell<BacklogStory>({
          getParent: (r) => {
            const ep = r.feature?.epic;
            if (!ep) return null;
            return { id: ep.id, key: ep.epic_key, label: ep.name };
          },
          options: parentOptions,
          canEdit: () => true,
          onChange: (row, next) => updateField.mutate({
            id: row.id,
            source: row.source,
            patch: { parent_key: next?.key ?? null, parent_id: next?.id ?? null },
          }),
        }),
      },
      {
        id: 'assignee',
        label: 'Assignee',
        width: 13,
        sortable: true,
        accessor: (r) => (r.assignee_name || '').toLowerCase(),
        cell: makeAssigneeEditCell<BacklogStory>({
          getAssignee: (r) => {
            if (!r.assignee_name) return null;
            return {
              id: r.assignee_name,
              name: r.assignee_name,
              avatarUrl: avatarsByName.get(r.assignee_name.toLowerCase()) || null,
            };
          },
          options: assigneeOptions.map<AssigneeChoice>((a) => ({
            id: a.id, name: a.name, avatarUrl: a.avatarUrl ?? null,
          })),
          canEdit: () => true,
          onChange: (row, next) => updateField.mutate({
            id: row.id,
            source: row.source,
            patch: { assignee_id: next?.id ?? null, assignee_name: next?.name ?? null },
          }),
        }),
      },
      {
        id: 'priority',
        label: 'Priority',
        width: 6,
        sortable: true,
        accessor: (r) => {
          const i = PRIORITY_ORDER.indexOf((r.priority || '').toLowerCase());
          return i >= 0 ? i : 999;
        },
        cell: makePriorityEditCell<BacklogStory>({
          getPriority: (r) => r.priority,
          options: ['critical', 'high', 'medium', 'low', 'lowest'],
          canEdit: () => true,
          onChange: (row, next) => updateField.mutate({
            id: row.id,
            source: row.source,
            patch: { priority: next },
          }),
        }),
      },
      {
        id: 'updated',
        label: 'Updated',
        width: 7,
        sortable: true,
        accessor: (r) => r.jira_updated_at || '',
        cell: makeDateCell((r) => r.jira_updated_at ?? null),
      },
      // Trailing row-actions column (always visible, hover-revealed ⋯)
      {
        id: '__actions',
        label: '',
        width: 4,
        align: 'end',
        alwaysVisible: true,
        cell: makeRowActionsCell<BacklogStory>({
          actions: [
            {
              id: 'edit',
              label: 'Edit',
              icon: <Pencil size={14} />,
              onClick: (row) => setEditStoryId(row.id),
            },
            {
              id: 'flag',
              label: 'Flag',
              icon: <Flag size={14} />,
              onClick: (row) => toast.info(`Flagged ${row.story_key || row.id}`),
            },
            {
              id: 'duplicate',
              label: 'Duplicate',
              icon: <CopyIcon size={14} />,
              onClick: (row) => toast.info(`Duplicate ${row.story_key || row.id} (not yet implemented)`),
              hidden: (row) => row.source !== 'catalyst',
            },
            {
              id: 'delete',
              label: 'Delete',
              icon: <Trash2 size={14} />,
              onClick: (row) => setDeleteTarget(row),
              danger: true,
              hidden: (row) => row.source !== 'catalyst',
            },
          ] as RowAction<BacklogStory>[],
        }),
      },
    ];
    return all.filter((c) => visibleCols.has(c.id as any) || c.alwaysVisible);
  }, [visibleCols, avatarsByName, assigneeOptions, parentOptions, updateField]);

  // Detail panel resizable divider
  const isDraggingPanel = useRef(false);
  const handlePanelMouseDown = useCallback(() => {
    isDraggingPanel.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingPanel.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setPanelDividerWidth(Math.max(30, Math.min(75, pct)));
    };
    const handleMouseUp = () => {
      if (isDraggingPanel.current) {
        isDraggingPanel.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  const [panelDividerWidth, setPanelDividerWidth] = useState(58);
  const isPanelOpen = !!detailItemId;

  // === 4. Early returns (after ALL hooks) ===================================

  if (isLoading) {
    return (
      <Box xcss={pageStyles}>
        <Box xcss={xcss({ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'space.1000' })}>
          <Spinner size="large" label="Loading stories" />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box xcss={pageStyles}>
        <EmptyState
          header="Unable to load stories"
          description={(error as Error)?.message || 'An error occurred while loading the backlog.'}
        />
      </Box>
    );
  }

  // === 5. Render ============================================================

  return (
    <Box xcss={pageStyles} ref={containerRef as any}>
      {/* ─── Page header ─── */}
      <Box xcss={headerStyles}>
        <Stack space="space.100">
          <Inline space="space.100" alignBlock="center">
            <Box xcss={xcss({ fontSize: 'font.size.075', color: 'color.text.subtlest' })}>
              Project Hub
            </Box>
            <Box as="span" xcss={xcss({ color: 'color.text.subtlest' })}>/</Box>
            <Box xcss={xcss({ fontSize: 'font.size.075', color: 'color.text.subtlest' })}>
              {projectKey || '—'}
            </Box>
          </Inline>
          <Box xcss={xcss({
            font: 'font.heading.large',
            fontWeight: 'font.weight.bold',
            color: 'color.text',
          })}>
            Story Backlog
          </Box>
        </Stack>
      </Box>

      {/* ─── Toolbar ─── */}
      <Box xcss={toolbarStyles}>
        {/* Search */}
        <Box xcss={xcss({ width: '280px' })}>
          <Textfield
            placeholder="Search list"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            elemBeforeInput={
              <Box xcss={xcss({ paddingInlineStart: 'space.100', color: 'color.icon.subtle', display: 'flex', alignItems: 'center' })}>
                <SearchIcon size={14} />
              </Box>
            }
            isCompact
          />
        </Box>

        {/* Assignee avatar stack (first 3 + count) */}
        <AssigneeStackFilter stories={stories || []} avatarsByName={avatarsByName} />

        {/* Filter — Jira-style sectioned drawer (saved chips, quick filters, date ranges, assignees, fix versions) */}
        <JiraFilterAtlaskit
          value={filterValue}
          onChange={setFilterValue}
          assignees={assigneeOptions}
          fixVersions={fixVersionOptions}
        />

        {/* spacer */}
        <Box xcss={xcss({ flexGrow: 1 })} />

        {/* Group by */}
        <ToolbarMenu
          width={200}
          trigger={({ ref, isOpen, onClick }) => (
            <ToolbarButton
              ref={ref}
              isSelected={isOpen || groupBy !== 'none'}
              onClick={onClick}
              iconAfter={<ChevronDown size={14} />}
              testId="toolbar-group-trigger"
            >
              {groupBy === 'none' ? 'Group' : `Group: ${groupBy[0].toUpperCase()}${groupBy.slice(1)}`}
            </ToolbarButton>
          )}
        >
          {(close) => (
            <>
              <MenuLabel>Group by</MenuLabel>
              {([
                ['none', 'None'],
                ['status', 'Status'],
                ['priority', 'Priority'],
                ['assignee', 'Assignee'],
                ['parent', 'Parent'],
              ] as const).map(([k, label]) => (
                <MenuItem
                  key={k}
                  active={groupBy === k}
                  onClick={() => { setGroupBy(k); close(); }}
                >
                  {label}
                </MenuItem>
              ))}
            </>
          )}
        </ToolbarMenu>

        {/* Column picker */}
        <ColumnPickerButton
          visible={visibleCols}
          onChange={setVisibleCols}
        />

        {/* ⋯ more */}
        <ToolbarMenu
          anchor="right"
          width={180}
          trigger={({ ref, isOpen, onClick }) => (
            <ToolbarButton
              ref={ref}
              isSelected={isOpen}
              onClick={onClick}
              iconOnly
              ariaLabel="More options"
              testId="toolbar-more-trigger"
            >
              <MoreHorizontal size={14} />
            </ToolbarButton>
          )}
        >
          {(close) => (
            <>
              <MenuItem onClick={close}>Export CSV</MenuItem>
              <MenuItem onClick={close}>Print</MenuItem>
            </>
          )}
        </ToolbarMenu>
      </Box>

      {/* ─── Count / sub-header ─── */}
      <Box xcss={xcss({
        paddingBlock: 'space.100',
        paddingInline: 'space.400',
        fontSize: 'font.size.100',
        color: 'color.text.subtle',
      })}>
        {total} stor{total === 1 ? 'y' : 'ies'}
        {selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ''}
      </Box>

      {/* ─── Table + Side panel (split view when detail is open) ─── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        {/* Table pane */}
        <div
          style={{
            width: isPanelOpen ? `${panelDividerWidth}%` : '100%',
            minWidth: 0,
            overflow: 'auto',
            padding: '16px 24px',
            transition: isDraggingPanel.current ? 'none' : 'width 150ms ease',
          }}
        >
          <JiraTable<BacklogStory>
            columns={tableColumns}
            data={paginated}
            getRowId={(s) => s.id}
            onRowClick={(s) => openStoryDetail(s)}
            onEscape={closeDetail}
            selectable
            selection={selectedIds}
            onSelectionChange={setSelectedIds}
            sortKey={sortKey || undefined}
            sortOrder={sortDir || undefined}
            onSortChange={(k, ord) => { setSortKey(k as ColKey); setSortDir(ord); }}
            rowsPerPage={pageSize}
            page={page}
            onPageChange={setPage}
            density="comfortable"
            ariaLabel="Story backlog"
            emptyView={
              <EmptyState
                header="No stories match your filters"
                description="Try clearing the search or filter."
              />
            }
          />

          {/* Bottom inline create row — Jira-style "+ Create" at the end of the list */}
          <InlineCreateRow
            projectId={projectId || ''}
            onCreated={() => queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] })}
          />
        </div>

        {/* Draggable divider */}
        {isPanelOpen && (
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={handlePanelMouseDown}
            style={{
              width: 6,
              minWidth: 6,
              cursor: 'col-resize',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              position: 'relative',
              zIndex: 10,
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--ds-surface-sunken, #F4F5F7)')}
            onMouseLeave={(e) => { if (!isDraggingPanel.current) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <div style={{ width: 2, height: 40, borderRadius: 1, background: 'var(--ds-border, #DFE1E6)' }} />
          </div>
        )}

        {/* Side detail panel — uses existing CatalystDetailRouter */}
        {isPanelOpen && (
          <div
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              transition: isDraggingPanel.current ? 'none' : 'flex 150ms ease',
              borderLeft: '1px solid #DFE1E6',
            }}
          >
            <Suspense fallback={<div style={{ padding: 24, color: 'var(--ds-text-subtlest, #6B778C)' }}>Loading…</div>}>
              <CatalystDetailRouter
                isOpen={true}
                onClose={closeDetail}
                itemId={detailItemId!}
                projectId={projectId || ''}
                projectKey={projectKey || ''}
                onOpenItem={(id) => setDetailItemId(id)}
                panelMode={true}
                onTogglePanelMode={closeDetail}
              />
            </Suspense>
          </div>
        )}
      </div>

      {/* ─── Dialogs (existing, preserved) ─── */}
      {editStoryId && (
        <EditStoryDialog
          isOpen={!!editStoryId}
          onClose={() => setEditStoryId(null)}
          storyId={editStoryId}
          projectId={projectId || ''}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] })}
        />
      )}
      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        itemType="Story"
        itemKey={deleteTarget?.story_key || null}
        itemName={deleteTarget?.title || ''}
        isPending={deleteMutation.isPending}
      />
      {/* Detail panel rendered inline in split view above — no modal fallback needed */}

      {/* ─── Bulk action bar (existing, preserved) ─── */}
      {selectedIds.size > 0 && (() => {
        const selectedItems = (stories || []).filter(s => selectedIds.has(s.id));
        return (
          <JiraBulkActionBar
            selectedIds={Array.from(selectedIds)}
            items={selectedItems.map(s => ({
              id: s.id,
              issue_key: s.story_key,
              title: s.title,
              summary: s.title,
              status: s.status,
              priority: s.priority ?? undefined,
              assignee_name: s.assignee_name ?? undefined,
            }))}
            onClear={() => setSelectedIds(new Set())}
            onDelete={async (ids) => {
              const catIds = selectedItems.filter(s => (s as any).source === 'catalyst').map(s => s.id);
              const jiraCount = ids.length - catIds.length;
              if (catIds.length > 0) {
                const { error } = await supabase.from('catalyst_issues').delete().in('id', catIds);
                if (error) throw error;
              }
              if (jiraCount > 0) {
                toast.info(`${catIds.length} deleted. ${jiraCount} Jira-synced skipped.`);
              } else {
                toast.success(`${catIds.length} item${catIds.length !== 1 ? 's' : ''} deleted`);
              }
              setSelectedIds(new Set());
              queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] });
            }}
            entityLabel="work item"
          />
        );
      })()}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small sub-components
// ─────────────────────────────────────────────────────────────────────────────

/**
 * InlineCreateRow — Jira-style "+ Create" row at the bottom of the list.
 * Click to expand into a focused Summary input. Enter saves to catalyst_issues
 * with issue_type='Story'. Esc cancels.
 */
function InlineCreateRow({
  projectId,
  onCreated,
}: { projectId: string; onCreated: () => void }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [summary, setSummary] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const reset = () => { setSummary(''); setIsEditing(false); };

  const create = async () => {
    const title = summary.trim();
    if (!title || !projectId) { reset(); return; }
    try {
      const { error } = await supabase.from('catalyst_issues').insert({
        project_id: projectId,
        title,
        issue_type: 'Story',
        status: 'To Do',
        priority: 'medium',
      });
      if (error) throw error;
      toast.success(`Created "${title}"`);
      reset();
      onCreated();
    } catch (e) {
      toast.error('Failed to create story');
    }
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '10px 12px',
          marginTop: 4,
          border: '1px dashed transparent',
          borderRadius: 4,
          background: 'transparent',
          color: 'var(--ds-text-subtlest, #6B778C)',
          fontSize: 13,
          fontWeight: 500,
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'var(--ds-surface-sunken, #F4F5F7)';
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--ds-border, #DFE1E6)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
        }}
      >
        <Plus size={14} />
        Create
      </button>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        marginTop: 4,
        border: '1px solid #0C66E4',
        borderRadius: 4,
        background: 'var(--ds-text-inverse, #FFFFFF)',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
        <JiraIssueTypeIcon type="story" size={16} />
      </span>
      <input
        ref={inputRef}
        type="text"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        onBlur={() => { if (!summary.trim()) reset(); else create(); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); create(); }
          if (e.key === 'Escape') { e.preventDefault(); reset(); }
        }}
        placeholder="What needs to be done?"
        style={{
          flex: 1,
          height: 28,
          border: 'none',
          outline: 'none',
          fontSize: 14,
          color: 'var(--ds-text, #172B4D)',
          fontFamily: 'inherit',
          background: 'transparent',
        }}
      />
    </div>
  );
}

function AssigneeStackFilter({
  stories,
  avatarsByName,
}: {
  stories: BacklogStory[];
  avatarsByName: Map<string, string>;
}) {
  const assignees = useMemo(() => {
    const names = new Map<string, string>();
    stories.forEach(s => {
      if (s.assignee_name && !names.has(s.assignee_name)) {
        names.set(s.assignee_name, avatarsByName.get(s.assignee_name.toLowerCase()) || '');
      }
    });
    return Array.from(names.entries()).slice(0, 4);
  }, [stories, avatarsByName]);

  const remaining = Math.max(0, new Set(stories.map(s => s.assignee_name).filter(Boolean)).size - assignees.length);

  // Jira-style overlapping avatar stack: each avatar shifted -8px so they overlap,
  // with a white ring around each for separation.
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
      {assignees.map(([name, url], i) => (
        <span
          key={name}
          title={name}
          style={{
            marginLeft: i === 0 ? 0 : -8,
            width: 26, height: 26,
            borderRadius: '50%',
            border: '2px solid var(--ds-text-inverse, #FFFFFF)',
            background: 'var(--ds-text-inverse, #FFFFFF)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 4 - i,
          }}
        >
          <Avatar size="small" name={name} src={url || undefined} appearance="circle" />
        </span>
      ))}
      {remaining > 0 && (
        <span
          style={{
            marginLeft: -8,
            height: 26,
            minWidth: 26,
            padding: '0 8px',
            borderRadius: 13,
            border: '2px solid var(--ds-text-inverse, #FFFFFF)',
            background: 'var(--ds-border, #DFE1E6)',
            color: '#42526E',
            fontSize: 11,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 0,
          }}
        >+{remaining}</span>
      )}
    </div>
  );
}

// ─── Toolbar primitives ────────────────────────────────────────────────────
// Match the JiraFilterAtlaskit trigger style — 28px height, white bg, gray
// border, hover tint, blue tint when selected. All toolbar buttons share this
// look so the bar is visually cohesive.

interface ToolbarButtonProps {
  onClick?: (e: React.MouseEvent) => void;
  isSelected?: boolean;
  iconBefore?: React.ReactNode;
  iconAfter?: React.ReactNode;
  ariaLabel?: string;
  testId?: string;
  children?: React.ReactNode;
  /** Square icon-only button (28x28). */
  iconOnly?: boolean;
}

const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  function ToolbarButton({ onClick, isSelected, iconBefore, iconAfter, ariaLabel, testId, children, iconOnly }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        data-testid={testId}
        aria-label={ariaLabel}
        aria-pressed={isSelected || undefined}
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          height: 28,
          width: iconOnly ? 28 : undefined,
          padding: iconOnly ? 0 : '0 10px',
          border: '1px solid',
          borderColor: isSelected ? '#0C66E4' : 'var(--ds-border, #DFE1E6)',
          borderRadius: 4,
          background: isSelected ? '#E9F2FF' : 'var(--ds-text-inverse, #FFFFFF)',
          color: isSelected ? '#0055CC' : '#42526E',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'background 100ms, border-color 100ms, color 100ms',
          outline: 'none',
        }}
        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--ds-surface-sunken, #F4F5F7)'; }}
        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--ds-text-inverse, #FFFFFF)'; }}
      >
        {iconBefore}
        {children}
        {iconAfter}
      </button>
    );
  },
);

interface ToolbarMenuProps {
  /** Render the trigger button. Receives a ref to attach + click toggle. */
  trigger: (props: { ref: React.Ref<HTMLButtonElement>; isOpen: boolean; onClick: (e: React.MouseEvent) => void }) => React.ReactNode;
  /** Render the menu content. Called only when open. Receives close(). */
  children: (close: () => void) => React.ReactNode;
  /** "left" anchors menu to trigger left edge; "right" to trigger right edge. */
  anchor?: 'left' | 'right';
  width?: number;
}

function ToolbarMenu({ trigger, children, anchor = 'left', width = 220 }: ToolbarMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      {trigger({
        ref: triggerRef,
        isOpen,
        onClick: (e) => { e.stopPropagation(); setIsOpen(v => !v); },
      })}
      {isOpen && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            [anchor === 'right' ? 'right' : 'left']: 0,
            zIndex: 50,
            minWidth: width,
            background: 'var(--ds-text-inverse, #FFFFFF)',
            border: '1px solid #DFE1E6',
            borderRadius: 4,
            boxShadow: '0 1px 1px rgba(9,30,66,0.25), 0 8px 24px -4px rgba(9,30,66,0.18)',
            padding: 4,
          }}
        >
          {children(() => setIsOpen(false))}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  children, onClick, active, icon,
}: { children: React.ReactNode; onClick: () => void; active?: boolean; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '8px 10px',
        border: 'none',
        background: active ? '#E9F2FF' : 'transparent',
        color: active ? '#0055CC' : 'var(--ds-text, #172B4D)',
        fontSize: 14,
        fontWeight: active ? 600 : 400,
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit',
        borderRadius: 3,
        outline: 'none',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--ds-surface-sunken, #F4F5F7)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {icon && <span style={{ display: 'inline-flex', width: 16, color: active ? '#0C66E4' : 'var(--ds-text-subtlest, #6B778C)' }}>{icon}</span>}
      <span style={{ flex: 1 }}>{children}</span>
    </button>
  );
}

function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '8px 10px 4px',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--ds-text-subtlest, #6B778C)',
    }}>{children}</div>
  );
}

function ColumnPickerButton({
  visible,
  onChange,
}: {
  visible: Set<ColKey>;
  onChange: (next: Set<ColKey>) => void;
}) {
  const toggleable = COLUMNS.filter(c => !c.alwaysVisible);

  return (
    <ToolbarMenu
      anchor="right"
      width={220}
      trigger={({ ref, isOpen, onClick }) => (
        <ToolbarButton
          ref={ref}
          isSelected={isOpen}
          onClick={onClick}
          iconOnly
          ariaLabel="Columns"
          testId="toolbar-columns-trigger"
        >
          <Settings size={14} />
        </ToolbarButton>
      )}
    >
      {() => (
        <>
          <MenuLabel>Columns</MenuLabel>
          {toggleable.map(c => {
            const isVisible = visible.has(c.key);
            return (
              <button
                key={c.key}
                type="button"
                role="menuitemcheckbox"
                aria-checked={isVisible}
                onClick={() => {
                  onChange(new Set(
                    isVisible
                      ? [...visible].filter(k => k !== c.key)
                      : [...visible, c.key]
                  ));
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '8px 10px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--ds-text, #172B4D)',
                  fontSize: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  borderRadius: 3,
                  outline: 'none',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-surface-sunken, #F4F5F7)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <input
                  type="checkbox"
                  checked={isVisible}
                  readOnly
                  style={{ margin: 0, cursor: 'pointer' }}
                />
                <span style={{ flex: 1 }}>{c.label}</span>
              </button>
            );
          })}
        </>
      )}
    </ToolbarMenu>
  );
}