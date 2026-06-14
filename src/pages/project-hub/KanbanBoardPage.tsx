/**
 * KanbanBoardPage — Enterprise-grade Kanban board for ProjectHub
 * Phase 1: Modular layout + DnD + Cards + Density + Dark Mode + Filters + Context Menu
 *
 * Architecture:
 * - Modular components: KanbanColumn, WorkItemCard, KanbanToolbar, KanbanSwimlane
 * - Dynamic columns from actual issue statuses
 * - DnD with optimistic updates + rollback + toast
 * - Card density toggle (compact/dense/comfortable)
 * - Dark mode via useTheme() + ADS dark hex tokens
 * - Filters: search, avatar stack, epic, type, priority, quick filters, group by
 * - Context menu on cards (⋯)
 * - Selection state with left accent bar
 * - All issue types (Story, Epic, Bug, Task, Subtask, Feature, Improvement, etc.)
 */
import React, { useState, useRef, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { ProjectHeaderChip } from '@/components/layout/ProjectHeaderChip';
import { ProjectTabBar } from '@/components/layout/ProjectTabBar';
import Button from '@atlaskit/button/new';
import { CatyBoardInsight } from '@/components/for-you/atlaskit/CatyBoardInsight';
import { KanbanToolbar } from '@/components/kanban/toolbar/KanbanToolbar';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { useProjectMemberRole } from '@/modules/project-work-hub/hooks/useProjectMemberRole';
import { useTheme } from '@/hooks/useTheme';
import { usePriToast } from '@/modules/priorities/hooks/usePriToast';
import { PriToastContainer } from '@/modules/priorities/components/PriToastContainer';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

// Kanban modules
import { KANBAN_TOKENS, DENSITY_CONFIG, KANBAN_COLUMNS as DEFAULT_KANBAN_COLUMNS, COL_PRIMARY_STATUS as DEFAULT_COL_PRIMARY_STATUS, STATUS_TO_COL_ID as DEFAULT_STATUS_TO_COL_ID, COLUMN_ID_SET as DEFAULT_COLUMN_ID_SET } from '@/components/kanban/kanban-tokens';
import type { KanbanDensity, KanbanColumnDef } from '@/components/kanban/kanban-tokens';
import type { BoardIssue, GroupByMode, ColMap } from '@/components/kanban/kanban-types';
import { BOARD_SUBTASK_TYPES, KANBAN_BOARD_TYPES, KANBAN_STORY_TYPES } from '@/components/kanban/kanban-types';
import { groupIssues, findCol } from '@/components/kanban/kanban-utils';
import { DroppableColumn } from '@/components/kanban/KanbanColumn';
import { OverlayCard } from '@/components/kanban/SortableCard';
import { SwimlaneRow } from '@/components/kanban/KanbanSwimlane';
import { PragmaticBoard } from '@/components/kanban/PragmaticBoard';
import { StandupModal } from '@/components/kanban/StandupModal';
import { useKanbanRealtime } from '@/components/kanban/useKanbanRealtime';
import { useKanbanKeyboard } from '@/components/kanban/useKanbanKeyboard';

import { useKanbanViewSettings } from '@/hooks/useKanbanViewSettings';
import { ENABLE_KANBAN_V2, ENABLE_FILTER_TO_KANBAN } from '@/lib/featureFlags';
import { useFilterBoardIssues } from '@/components/kanban/adapters/filterBoardSource';
import SectionMessage from '@atlaskit/section-message';
import { readDensityPref, writeDensityPref } from '@/components/kanban/densityPrefs';
import { statusChangeSchema } from '@/components/kanban/kanban-schemas';
import { useBoardUrlState } from '@/components/kanban/useBoardUrlState';
import {
  type AdvancedFilters,
  EMPTY_ADVANCED_FILTERS, hasActiveAdvancedFilters, countAdvancedFilters,
} from '@/components/kanban/AdvancedFilterPanel';
import { FilterTriggerButton } from '@/components/shared/JiraBasicFilter';
import type { FilterCategory } from '@/components/shared/JiraBasicFilter';
import { GroupByPopover } from '@/components/shared/GroupByPopover';
import type { GroupByOption } from '@/components/shared/GroupByPopover';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Textfield from '@atlaskit/textfield';
import AkChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import GrowDiagonalIcon from '@atlaskit/icon/core/grow-diagonal';
import VidFullScreenOffIcon from '@atlaskit/icon/glyph/vid-full-screen-off';
import { useUpdateBoard } from '@/hooks/useBoardMutations';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

export default function KanbanBoardPage() {
  const { key, boardId: urlBoardId } = useParams<{ key: string; boardId?: string }>();
  const { isDark } = useTheme();
  const tk = isDark ? KANBAN_TOKENS.dark : KANBAN_TOKENS.light;
  const avatarsByName = useProfileAvatarsByName();
  const qc = useQueryClient();
  const { toasts, dismissToast, success: toastSuccess, error: toastError } = usePriToast();

  /* ═══ STATE ═══ */
  // V2: URL-backed filter hydration. When the flag is off, `initial` resolves
  // to the schema defaults so the existing behavior is preserved exactly.
  const { initial: urlInit, writeToUrl } = useBoardUrlState(ENABLE_KANBAN_V2);
  const [search, setSearch] = useState(urlInit.search);
  const [debSearch, setDebSearch] = useState(urlInit.search);
  const [selAssignees, setSelAssignees] = useState<Set<string>>(new Set(urlInit.assignees));
  const [selEpics, setSelEpics] = useState<string[]>(urlInit.epics);
  const [selTypes, setSelTypes] = useState<string[]>(urlInit.types);
  const [selPriorities, setSelPriorities] = useState<string[]>(urlInit.priorities);
  const [quickFilters, setQuickFilters] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupByMode>(urlInit.group);
  // V2: density is user-scoped via localStorage (DENSITY_STORAGE_KEY). When
  // the flag is off, density stays hardcoded to 'comfortable' (existing behavior).
  const [density, setDensity] = useState<KanbanDensity>(
    ENABLE_KANBAN_V2 ? readDensityPref('comfortable') : 'comfortable',
  );
  const onDensityChange = useCallback((d: KanbanDensity) => {
    setDensity(d);
    writeDensityPref(d);
  }, []);
  const [selIssueId, setSelIssueId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [colMap, setColMap] = useState<ColMap>({});
  const [showViewSettings, setShowViewSettings] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [renameBoardOpen, setRenameBoardOpen] = useState(false);
  const [renameBoardValue, setRenameBoardValue] = useState('');
  const updateBoard = useUpdateBoard();
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [showBasicFilter, setShowBasicFilter] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(EMPTY_ADVANCED_FILTERS);
  const [collapsedSwimlanes, setCollapsedSwimlanes] = useState<Set<string>>(new Set());
  const [showStandup, setShowStandup] = useState(false);
  // Standup starts in fullscreen overlay by default (Jira parity). Click the
  // minimize button in the overlay to switch to docked mode (board + global
  // chrome visible, standup panel pinned to the left of the column row).
  const [isStandupFullscreen, setIsStandupFullscreen] = useState(false);
  const [standupAssignee, setStandupAssignee] = useState<string | null>(null);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(urlBoardId ?? null);
  const [showBoardSwitcher, setShowBoardSwitcher] = useState(false);
  const [isBoardSwitcherFocused, setIsBoardSwitcherFocused] = useState(false);
  const [isBoardSwitcherHovered, setIsBoardSwitcherHovered] = useState(false);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const boardSwitcherRef = React.useRef<HTMLDivElement>(null);
  // F3 (Archive) — Archived filter chip. When true, the kanban-issues query
  // inverts archived_at IS NULL → archived_at IS NOT NULL. Admin/owner only;
  // FE gate is cosmetic, RLS enforces server-side.
  const { isAdminOrOwner: canArchive } = useProjectMemberRole(key);
  const [showArchived, setShowArchived] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  /* ═══ PHASE 2: PAGINATION STATE ═══ */
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [hasMoreIssues, setHasMoreIssues] = useState(true);
  const boardScrollContainerRef = useRef<HTMLDivElement>(null);

  const d = DENSITY_CONFIG[density];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));


  // Current user ID for realtime suppression
  const { data: currentUserData } = useQuery({
    queryKey: ['current-user-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    staleTime: 300_000,
  });

  // View settings
  const { settings: viewSettings, updateSettings: updateViewSettings } = useKanbanViewSettings(key, currentUserData);
  const visibleFields = viewSettings.visibleFields;
  const cardColorMode = viewSettings.cardColorMode;
  const enabledQuickFilters = viewSettings.enabledQuickFilters;

  // Swimlane expand handler — collapse handler is defined after `groups` (line ~655)
  const handleExpandAll = useCallback(() => setCollapsedSwimlanes(new Set()), []);

  /* Board switcher outside-click */
  useEffect(() => {
    if (!showBoardSwitcher) return;
    function handler(e: MouseEvent) {
      if (boardSwitcherRef.current && !boardSwitcherRef.current.contains(e.target as Node)) {
        setShowBoardSwitcher(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showBoardSwitcher]);

  /* Board-menu outside-click handling now owned by <KanbanToolbar>. */

  // Realtime subscription
  useKanbanRealtime(key, currentUserData ?? null);

  /* ═══ DATA QUERIES ═══ */

  const { data: projMeta } = useQuery({
    queryKey: ['ph-project-meta', key],
    queryFn: async () => {
      if (!key) return null;
      const { data } = await supabase.from('ph_projects').select('id, key, name').eq('key', key.toUpperCase()).maybeSingle();
      return data;
    },
    enabled: !!key,
    staleTime: 60_000,
  });

  /* ═══ BOARDS LIST (multi-board support) ═══ */

  // Two parallel queries — merged into projectBoards:
  //   1. Project boards: boards with project_id matching ph_projects (inner join on key).
  //   2. Filter boards: boards with jira_project_key matching key AND filter_id IS NOT NULL.
  //      These have project_id = null (FK to legacy projects table) so the inner join
  //      in query 1 drops them — they need a separate fetch by jira_project_key.
  const { data: _projectNativeBoards = [], refetch: _refetchNative } = useQuery({
    queryKey: ['project-boards-native', key],
    queryFn: async () => {
      if (!key) return [];
      const { data } = await supabase
        .from('boards')
        .select('id, name, sort_order, ph_projects!inner(key)')
        .eq('ph_projects.key', key.toUpperCase())
        .is('deleted_at', null)
        .order('sort_order');
      return (data ?? []).map((b: any) => ({
        id: b.id, name: b.name, sort_order: b.sort_order,
      })) as { id: string; name: string; sort_order: number }[];
    },
    enabled: !!key,
    staleTime: 60_000,
  });

  const { data: _filterBoards = [] } = useQuery({
    queryKey: ['project-boards-filter', key],
    queryFn: async () => {
      if (!key || !ENABLE_FILTER_TO_KANBAN) return [];
      const { data } = await (supabase as any)
        .from('boards')
        .select('id, name, sort_order')
        .eq('jira_project_key', key.toUpperCase())
        .not('filter_id', 'is', null)
        .is('deleted_at', null)
        .order('sort_order');
      return (data ?? []).map((b: any) => ({
        id: b.id, name: b.name, sort_order: b.sort_order,
      })) as { id: string; name: string; sort_order: number }[];
    },
    enabled: !!key,
    staleTime: 60_000,
  });

  // Merged list — native boards first, then filter boards (deduplicated by id).
  const projectBoards = useMemo(() => {
    const seen = new Set<string>();
    return [..._projectNativeBoards, ..._filterBoards].filter(b => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  }, [_projectNativeBoards, _filterBoards]);

  const refetchBoards = _refetchNative;

  // Keep activeBoardId in sync: default to first board when list loads,
  // but only when no board was specified via the URL :boardId param.
  useEffect(() => {
    if (projectBoards.length > 0 && !activeBoardId && !urlBoardId) {
      setActiveBoardId(projectBoards[0].id);
    }
  }, [projectBoards, activeBoardId, urlBoardId]);

  /* ═══ DYNAMIC BOARD COLUMNS FROM DB ═══ */

  const resolvedBoardId = activeBoardId ?? projectBoards[0]?.id ?? null;

  const { data: dynamicBoardData } = useQuery({
    queryKey: ['kanban-board-columns', resolvedBoardId],
    queryFn: async () => {
      if (!resolvedBoardId) return null;

      // Get columns
      const { data: cols } = await supabase
        .from('board_columns')
        .select('id, name, position, status_ids, is_backlog, is_done')
        .eq('board_id', resolvedBoardId)
        .order('position');

      // Get status mappings
      const { data: mappings } = await supabase
        .from('board_status_mappings')
        .select('status_id, status_name, bucket_type, column_id, order_index')
        .eq('board_id', resolvedBoardId)
        .order('order_index');

      if (!cols?.length) return null;
      return { boardId: resolvedBoardId, columns: cols, mappings: mappings ?? [] };
    },
    enabled: !!resolvedBoardId,
    staleTime: 60_000,
  });

  // ─── Filter-backed board (ENABLE_FILTER_TO_KANBAN) ───────────────────────
  // When this board is driven by a saved filter (boards.filter_id), its issue
  // set comes from the filter's JQL via the canonical useJqlResults evaluator
  // — not the project-wide fetch below. Columns above still come from
  // board_columns. Entire path is inert when the flag is off (enabled gate).
  const { data: boardFilterJql = null } = useQuery({
    queryKey: ['kanban-board-filter-jql', resolvedBoardId],
    queryFn: async () => {
      if (!resolvedBoardId) return null;
      const { data: board } = await supabase
        .from('boards').select('filter_id').eq('id', resolvedBoardId).maybeSingle();
      const fid = (board as any)?.filter_id;
      if (!fid) return null;
      const { data: filter } = await supabase
        .from('ph_saved_filters').select('jql_query').eq('id', fid).maybeSingle();
      return ((filter as any)?.jql_query as string | null) ?? null;
    },
    enabled: ENABLE_FILTER_TO_KANBAN && !!resolvedBoardId,
    staleTime: 60_000,
  });

  const filterBoard = useFilterBoardIssues(boardFilterJql ?? undefined);
  const isFilterBacked = ENABLE_FILTER_TO_KANBAN && !!boardFilterJql;

  // Build dynamic columns, falling back to hardcoded defaults
  const { KANBAN_COLUMNS, STATUS_TO_COL_ID, COL_PRIMARY_STATUS, COLUMN_ID_SET } = useMemo(() => {
    if (dynamicBoardData?.columns?.length) {
      const cols: KanbanColumnDef[] = dynamicBoardData.columns
        .map((c: any) => {
          // Build status list from mappings or status_ids
          const mappedStatuses = dynamicBoardData.mappings
            .filter((m: any) => m.bucket_type === 'column' && m.column_id === c.id)
            .map((m: any) => m.status_name);

          // Fallback to status_ids if no mappings
          let statuses = mappedStatuses.length > 0 ? mappedStatuses : [];
          if (statuses.length === 0 && c.status_ids?.length) {
            statuses = dynamicBoardData.mappings
              .filter((m: any) => c.status_ids.includes(m.status_id))
              .map((m: any) => m.status_name);
          }

          const category: 'todo' | 'in_progress' | 'done' = c.is_done ? 'done' : c.is_backlog ? 'todo' : 'in_progress';
          return {
            id: c.id,
            name: c.name.toUpperCase(),
            statuses,
            category,
          };
        });

      const sToCId = new Map<string, string>();
      const cPrimary: Record<string, string> = {};
      cols.forEach(col => {
        if (col.statuses.length > 0) cPrimary[col.id] = col.statuses[0];
        col.statuses.forEach(s => sToCId.set(s.toLowerCase(), col.id));
      });
      const cIdSet = new Set(cols.map(c => c.id));
      return { KANBAN_COLUMNS: cols, STATUS_TO_COL_ID: sToCId, COL_PRIMARY_STATUS: cPrimary, COLUMN_ID_SET: cIdSet };
    }

    // Fallback to defaults
    return {
      KANBAN_COLUMNS: DEFAULT_KANBAN_COLUMNS,
      STATUS_TO_COL_ID: DEFAULT_STATUS_TO_COL_ID,
      COL_PRIMARY_STATUS: DEFAULT_COL_PRIMARY_STATUS,
      COLUMN_ID_SET: DEFAULT_COLUMN_ID_SET,
    };
  }, [dynamicBoardData]);

  const { data: projectIssues = [], isLoading: rawLoading } = useQuery({
    // FIX: projMeta?.id removed from queryKey — was causing double-fetch of all
    // ph_issues (once with id=undefined on mount, again when projMeta resolved).
    // projId is read from TanStack cache inside the queryFn instead.
    queryKey: ['kanban-issues', key, showArchived],
    queryFn: async () => {
      if (!key) return [];
      const PAGE = 1000;

      // Read projMeta from cache — available without a round-trip since
      // ph-project-meta fires in parallel. By the time the first ph_issues
      // page resolves (~400ms), projMeta (~150ms) is already in cache.
      const cachedMeta = qc.getQueryData<{ id: string } | null>(['ph-project-meta', key]);

      // --- parallel fetch: ph_issues (paginated) + catalyst_issues ---
      const fetchJira = async () => {
        let all: any[] = [];
        let from = 0;
        while (true) {
          let q = supabase.from('ph_issues')
            .select('id, issue_key, summary, status, status_category, issue_type, priority, assignee_display_name, labels, sprint_name, story_points, parent_key, parent_summary, sprint_release, is_flagged, jira_updated_at, jira_created_at, archived_at')
            .eq('project_key', key.toUpperCase())
            .is('deleted_at', null);
          q = showArchived ? q.not('archived_at', 'is', null) : q.is('archived_at', null);
          const { data, error } = await q
            .order('jira_updated_at', { ascending: false })
            .range(from, from + PAGE - 1);
          if (error) throw error;
          if (!data?.length) break;
          all = all.concat(data);
          if (data.length < PAGE) break;
          from += PAGE;
        }
        return all;
      };

      const fetchCatalyst = async () => {
        if (!cachedMeta?.id || showArchived) return [] as any[];
        const { data } = await supabase
          .from('catalyst_issues')
          .select('id, issue_key, title, status, issue_type, priority, assignee_id, parent_key, labels, created_at, updated_at')
          .eq('project_id', cachedMeta.id)
          .order('created_at', { ascending: false });
        return data ?? [];
      };

      // Fire both in parallel — eliminates the sequential catalyst_issues wait.
      const [all, catData] = await Promise.all([fetchJira(), fetchCatalyst()]);

      const jiraIssues: BoardIssue[] = all.map((r: any): BoardIssue => {
        let fv: string | null = null;
        if (r.sprint_release && Array.isArray(r.sprint_release) && r.sprint_release.length > 0) {
          const f = r.sprint_release[0];
          fv = typeof f === 'string' ? f : f?.name ?? null;
        }
        return {
          id: r.id,
          issueKey: r.issue_key,
          summary: r.summary ?? '',
          issueType: r.issue_type ?? '',
          priority: r.priority ?? '',
          status: r.status ?? '',
          statusCategory: r.status_category ?? '',
          assigneeName: r.assignee_display_name,
          labels: Array.isArray(r.labels) ? (r.labels as string[]) : [],
          sprintName: r.sprint_name,
          storyPoints: r.story_points ? Number(r.story_points) : null,
          parentKey: r.parent_key,
          parentSummary: r.parent_summary,
          sprintRelease: fv,
          isFlagged: !!r.is_flagged,
          updatedAt: r.jira_updated_at,
          createdAt: r.jira_created_at ?? null,
        };
      });

      // Merge in Catalyst-native (in-app created) issues.
      // Jira-wins: skip catalyst rows whose issue_key already exists in ph_issues.
      const seen = new Set(jiraIssues.map(i => i.issueKey).filter(Boolean));
      const catIssues: BoardIssue[] = (catData || [])
        .filter((r: any) => !(r.issue_key && seen.has(r.issue_key)))
        .map((r: any): BoardIssue => ({
          id: r.id,
          issueKey: r.issue_key,
          summary: r.title ?? '',
          issueType: r.issue_type ?? '',
          priority: r.priority ?? '',
          status: r.status ?? '',
          statusCategory: '',
          assigneeName: r.assignee_id ?? null,
          labels: Array.isArray(r.labels) ? (r.labels as string[]) : [],
          sprintName: null,
          storyPoints: null,
          parentKey: r.parent_key ?? null,
          parentSummary: null,
          sprintRelease: null,
          isFlagged: false,
          updatedAt: r.updated_at,
          createdAt: r.created_at,
        }));
      return [...catIssues, ...jiraIssues];
    },
    enabled: !!key && !isFilterBacked,
    staleTime: 30_000,
  });

  // Effective issue set + loading: filter-backed boards read from the filter's
  // JQL; all other boards keep the project-wide fetch. Defining rawIssues here
  // means EVERY downstream consumer (filtered grid, epic/type maps, counts)
  // follows automatically. When the flag is off, isFilterBacked is always
  // false → rawIssues === projectIssues, identical to the previous behaviour.
  const rawIssues = isFilterBacked ? filterBoard.issues : projectIssues;
  const isLoading = isFilterBacked ? filterBoard.isLoading : rawLoading;

  // ── Subtask map: parentKey → subtask-family children ──
  // Populated from rawIssues so it covers both filter-backed and project-wide boards.
  const subtasksByParentKey = useMemo(() => {
    const m = new Map<string, BoardIssue[]>();
    rawIssues.forEach(i => {
      if (BOARD_SUBTASK_TYPES.has(i.issueType) && i.parentKey) {
        const arr = m.get(i.parentKey) ?? [];
        arr.push(i);
        m.set(i.parentKey, arr);
      }
    });
    return m;
  }, [rawIssues]);

  // ── Parent promotion: when a filter-backed board returns ONLY subtasks,
  //    fetch their immediate parents so the board always has non-subtask cards. ──
  const allFilteredAreSubtasks = useMemo(() => {
    if (!isFilterBacked || rawIssues.length === 0) return false;
    return rawIssues.every(i => BOARD_SUBTASK_TYPES.has(i.issueType));
  }, [isFilterBacked, rawIssues]);

  const parentKeysNeeded = useMemo(() => {
    if (!allFilteredAreSubtasks) return [];
    const keys = new Set<string>();
    rawIssues.forEach(i => { if (i.parentKey) keys.add(i.parentKey); });
    return Array.from(keys);
  }, [allFilteredAreSubtasks, rawIssues]);

  const { data: promotedParents = [] } = useQuery<BoardIssue[]>({
    queryKey: ['kanban-promoted-parents', parentKeysNeeded],
    enabled: allFilteredAreSubtasks && parentKeysNeeded.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, issue_type, priority, status, status_category, assignee_display_name, labels, sprint_name, story_points, parent_key, parent_summary, sprint_release, is_flagged, jira_updated_at, jira_created_at')
        .in('issue_key', parentKeysNeeded);
      if (error || !data) return [];
      return data.map(r => ({
        id: r.id,
        issueKey: r.issue_key,
        summary: r.summary ?? '',
        issueType: r.issue_type ?? null,
        priority: r.priority ?? '',
        status: r.status ?? '',
        statusCategory: r.status_category ?? '',
        assigneeName: r.assignee_display_name ?? null,
        labels: (r.labels as string[]) ?? [],
        sprintName: r.sprint_name ?? null,
        storyPoints: r.story_points ?? null,
        parentKey: r.parent_key ?? null,
        parentSummary: r.parent_summary ?? null,
        fixVersion: (r.sprint_release as string[] | null)?.[0] ?? null,
        isFlagged: r.is_flagged ?? false,
        updatedAt: r.jira_updated_at ?? null,
        createdAt: r.jira_created_at ?? null,
      } as BoardIssue));
    },
  });

  const issuesById = useMemo(() => {
    const m = new Map<string, BoardIssue>();
    rawIssues.forEach(i => m.set(i.id, i));
    // Merge promoted parents so detail panel + column mapping can resolve them
    promotedParents.forEach(p => { if (!m.has(p.id)) m.set(p.id, p); });
    return m;
  }, [rawIssues, promotedParents]);

  // When showing promoted parents, augment STATUS_TO_COL_ID with category-based
  // fallbacks so parents whose exact status isn't mapped still land in a column.
  // e.g. "Ready for development" (In Progress category) → In Progress column.
  const effectiveStatusToColId = useMemo(() => {
    if (!allFilteredAreSubtasks || promotedParents.length === 0) return STATUS_TO_COL_ID;
    const catToCol = new Map<string, string>();
    KANBAN_COLUMNS.forEach(col => {
      if (col.category === 'todo') {
        if (!catToCol.has('to do')) catToCol.set('to do', col.id);
        catToCol.set('todo', col.id);
      } else if (col.category === 'in_progress') {
        if (!catToCol.has('in progress')) {
          catToCol.set('in progress', col.id);
          catToCol.set('indeterminate', col.id);
        }
      } else if (col.category === 'done') {
        if (!catToCol.has('done')) catToCol.set('done', col.id);
      }
    });
    const augmented = new Map(STATUS_TO_COL_ID);
    promotedParents.forEach(p => {
      const sl = p.status.toLowerCase();
      if (!augmented.has(sl)) {
        const fallback = catToCol.get((p.statusCategory ?? '').toLowerCase());
        if (fallback) augmented.set(sl, fallback);
      }
    });
    return augmented;
  }, [allFilteredAreSubtasks, promotedParents, STATUS_TO_COL_ID, KANBAN_COLUMNS]);

  // Debounce search
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebSearch(search), 250);
    return () => clearTimeout(timerRef.current);
  }, [search]);

  // V2: sync filter state to the URL. Debounced via debSearch so typing
  // doesn't spam history. Noop when ENABLE_KANBAN_V2 is false (writeToUrl guards).
  useEffect(() => {
    if (!ENABLE_KANBAN_V2) return;
    writeToUrl({
      search: debSearch,
      group: groupBy,
      assignees: Array.from(selAssignees),
      epics: selEpics,
      types: selTypes,
      priorities: selPriorities,
    });
  }, [debSearch, groupBy, selAssignees, selEpics, selTypes, selPriorities, writeToUrl]);

  /* ═══ AGGREGATIONS ═══ */

  const allAssignees = useMemo(() => {
    const m = new Map<string, number>();
    rawIssues.forEach(i => {
      const n = i.assigneeName || 'Unassigned';
      m.set(n, (m.get(n) ?? 0) + 1);
    });
    return Array.from(m.entries()).map(([n, c]) => ({ name: n, count: c })).sort((a, b) => b.count - a.count);
  }, [rawIssues]);

  const allEpics = useMemo(() => {
    const epicSummaryMap = new Map<string, string>();
    rawIssues.forEach(i => { if (i.issueType === 'Epic') epicSummaryMap.set(i.issueKey, i.summary); });
    const m = new Map<string, number>();
    rawIssues.forEach(i => { if (i.parentKey) m.set(i.parentKey, (m.get(i.parentKey) ?? 0) + 1); });
    return Array.from(m.entries()).map(([k, c]) => ({ key: k, summary: epicSummaryMap.get(k) ?? null, count: c })).sort((a, b) => b.count - a.count);
  }, [rawIssues]);

  const allTypes = useMemo(() => {
    const m = new Map<string, number>();
    rawIssues.forEach(i => { m.set(i.issueType, (m.get(i.issueType) ?? 0) + 1); });
    return Array.from(m.entries()).map(([t, c]) => ({ type: t, count: c }));
  }, [rawIssues]);

  /* ═══ CANONICAL FILTER CATEGORIES ═══ */
  const filterCategories: FilterCategory[] = useMemo(() => {
    const epicOptions = allEpics.map(e => ({
      id: e.key,
      label: e.summary || e.key,
      // Only show the key as secondary text when a summary exists — avoids "BAU-XXX BAU-XXX" duplication
      labelExtra: e.summary ? e.key : undefined,
    }));
    const typeOptions = allTypes.map(t => ({
      id: t.type,
      label: t.type,
    }));
    const priorityOptions = ['Critical', 'High', 'Medium', 'Low'].map(p => ({
      id: p,
      label: p,
    }));
    const statusOptions = KANBAN_COLUMNS.map(c => ({
      id: c.name,
      label: c.name,
    }));
    const assigneeOptions2 = allAssignees.map(a => ({
      id: a.name,
      label: a.name,
      avatarUrl: avatarsByName.get(a.name.toLowerCase()) || undefined,
      avatarType: (avatarsByName.get(a.name.toLowerCase()) ? 'photo' : 'person-icon') as 'photo' | 'person-icon',
    }));
    return [
      { id: 'epic', label: 'Epic', options: epicOptions, searchPlaceholder: 'Search epics...' },
      { id: 'type', label: 'Type', options: typeOptions },
      { id: 'priority', label: 'Priority', options: priorityOptions },
      { id: 'status', label: 'Status', options: statusOptions },
      { id: 'assignee', label: 'Assignee', options: assigneeOptions2, searchPlaceholder: 'Search people...' },
    ];
  }, [allEpics, allTypes, allAssignees, avatarsByName, KANBAN_COLUMNS]);

  const filterSelected: Record<string, string[]> = useMemo(() => ({
    epic: selEpics,
    type: selTypes,
    priority: selPriorities,
    status: [],
    assignee: Array.from(selAssignees),
  }), [selEpics, selTypes, selPriorities, selAssignees]);

  const handleFilterChange = useCallback((categoryId: string, optionIds: string[]) => {
    switch (categoryId) {
      case 'epic': setSelEpics(optionIds); break;
      case 'type': setSelTypes(optionIds); break;
      case 'priority': setSelPriorities(optionIds); break;
      case 'assignee': setSelAssignees(new Set(optionIds)); break;
    }
  }, []);

  const basicFilterCount = selEpics.length + selTypes.length + selPriorities.length + selAssignees.size;

  const BOARD_GROUP_OPTIONS: GroupByOption<GroupByMode>[] = useMemo(() => [
    { key: 'none' as GroupByMode, label: 'None' },
    { key: 'queries' as GroupByMode, label: 'Queries' },
    { key: 'assignee' as GroupByMode, label: 'Assignee', icon: 'assignee' },
    { key: 'epic' as GroupByMode, label: 'Epic', icon: 'parent' },
    { key: 'feature' as GroupByMode, label: 'Feature', icon: 'parent' },
    { key: 'priority' as GroupByMode, label: 'Priority', icon: 'priority' },
    { key: 'sprintRelease' as GroupByMode, label: 'Sprint/Iteration' },
  ], []);

  // Current user for "Assigned to me"
  const { data: currentUserName } = useQuery({
    queryKey: ['current-user-display-name'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('full_name, jira_display_name').eq('id', user.id).maybeSingle();
      return data?.jira_display_name ?? data?.full_name ?? null;
    },
    staleTime: 300_000,
  });

  /* ═══ FILTERING ═══ */

  const filtered = useMemo(() => {
    // Board type restriction: only Epic, Story, Feature are shown.
    // In group-by-none (flat) mode only Stories are cards — Epics and Features
    // are swimlane metadata and should not appear as standalone cards.
    // When the advanced filter specifies types explicitly, honour those exactly.
    // Filter-backed boards: the JQL already scoped the issue types, so accept
    // all types returned. Non-filter boards restrict to KANBAN_BOARD_TYPES (all
    // groupBy modes) or KANBAN_STORY_TYPES (flat/none mode, stories only).
    // When the filter returned ONLY subtasks, we promote their parents onto the
    // board. In that mode the rawIssues are the subtask-family issues themselves
    // (stored in subtasksByParentKey) and the promoted parents become the cards.
    const baseIssues = allFilteredAreSubtasks && promotedParents.length > 0
      ? promotedParents
      : rawIssues;

    const allowedTypes: Set<string> = advancedFilters.issueTypes.length > 0
      ? new Set(advancedFilters.issueTypes.filter(t => !BOARD_SUBTASK_TYPES.has(t)))
      : isFilterBacked
        ? new Set(baseIssues.map(i => i.issueType).filter(t => !BOARD_SUBTASK_TYPES.has(t)))
        : (groupBy !== 'none' ? KANBAN_BOARD_TYPES : KANBAN_STORY_TYPES);
    let issues = baseIssues.filter(i => allowedTypes.has(i.issueType));
    if (debSearch.trim()) {
      const q = debSearch.trim().toLowerCase();
      issues = issues.filter(i =>
        i.summary.toLowerCase().includes(q) ||
        i.issueKey.toLowerCase().includes(q) ||
        (i.assigneeName ?? '').toLowerCase().includes(q) ||
        i.labels.some(l => l.toLowerCase().includes(q))
      );
    }
    if (selAssignees.size > 0) issues = issues.filter(i => selAssignees.has(i.assigneeName || 'Unassigned'));
    if (selEpics.length > 0) issues = issues.filter(i => i.parentKey && selEpics.includes(i.parentKey));
    if (selTypes.length > 0) issues = issues.filter(i => selTypes.includes(i.issueType));
    if (selPriorities.length > 0) {
      const normalised = new Set(selPriorities.map(p => p.toLowerCase()));
      issues = issues.filter(i => {
        const pri = (i.priority ?? '').toLowerCase();
        if (normalised.has('critical') && (pri === 'highest' || pri === 'critical')) return true;
        if (normalised.has('high') && pri === 'high') return true;
        if (normalised.has('medium') && pri === 'medium') return true;
        if (normalised.has('low') && (pri === 'low' || pri === 'lowest')) return true;
        return false;
      });
    }
    if (quickFilters.has('assigned-to-me') && currentUserName) {
      issues = issues.filter(i => i.assigneeName?.toLowerCase() === currentUserName.toLowerCase());
    }
    if (quickFilters.has('flagged')) {
      issues = issues.filter(i => i.isFlagged);
    }
    if (quickFilters.has('recently-updated')) {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      issues = issues.filter(i => i.updatedAt && new Date(i.updatedAt).getTime() > cutoff);
    }
    if (quickFilters.has('high-priority')) {
      issues = issues.filter(i => {
        const p = (i.priority ?? '').toLowerCase();
        return p === 'highest' || p === 'high' || p === 'critical';
      });
    }
    if (quickFilters.has('unassigned')) {
      issues = issues.filter(i => !i.assigneeName);
    }
    if (quickFilters.has('in-progress')) {
      issues = issues.filter(i => i.statusCategory === 'inprogress' || i.statusCategory === 'in_progress');
    }

    // ── Advanced filters ──
    if (advancedFilters.sprintReleases.length > 0) {
      const fvSet = new Set(advancedFilters.sprintReleases);
      issues = issues.filter(i => i.sprintRelease && fvSet.has(i.sprintRelease));
    }
    if (advancedFilters.issueTypes.length > 0) {
      const tSet = new Set(advancedFilters.issueTypes);
      issues = issues.filter(i => tSet.has(i.issueType));
    }
    if (advancedFilters.statuses.length > 0) {
      const sSet = new Set(advancedFilters.statuses.map(s => s.toLowerCase()));
      issues = issues.filter(i => sSet.has(i.status.toLowerCase()));
    }
    if (advancedFilters.assignees.length > 0) {
      const aSet = new Set(advancedFilters.assignees);
      issues = issues.filter(i => {
        const name = i.assigneeName || 'Unassigned';
        return aSet.has(name);
      });
    }
    if (advancedFilters.createdAfter) {
      const afterDate = new Date(advancedFilters.createdAfter);
      issues = issues.filter(i => {
        const d = i.createdAt || i.updatedAt;
        if (!d) return false;
        return new Date(d) >= afterDate;
      });
    }
    if (advancedFilters.createdBefore) {
      const beforeDate = new Date(advancedFilters.createdBefore + 'T23:59:59');
      issues = issues.filter(i => {
        const d = i.createdAt || i.updatedAt;
        if (!d) return true;
        return new Date(d) <= beforeDate;
      });
    }

    // Standup: when a person is selected, the board shows only their issues (Jira parity)
    if (standupAssignee) {
      issues = issues.filter(i => (i.assigneeName || 'Unassigned') === standupAssignee);
    }

    return issues;
  }, [rawIssues, debSearch, selAssignees, selEpics, selTypes, selPriorities, quickFilters, currentUserName, advancedFilters, standupAssignee, groupBy, allFilteredAreSubtasks, promotedParents]);

  /* ═══ COLUMN MAPPING ═══ */

  useEffect(() => {
    if (dragId || groupBy !== 'none') return;
    const m: ColMap = {};
    KANBAN_COLUMNS.forEach(c => { m[c.id] = []; });
    // Route each issue to its column using board_status_mappings only.
    // Statuses not present in STATUS_TO_COL_ID (unmapped or zero-issue statuses)
    // are intentionally dropped — the board only shows statuses with issues.
    filtered.forEach(i => {
      const targetCol = effectiveStatusToColId.get(i.status.toLowerCase());
      if (targetCol && m[targetCol]) m[targetCol].push(i.id);
    });
    setColMap(prev => {
      // Only update if changed to prevent infinite loop
      const prevStr = JSON.stringify(prev);
      const newStr = JSON.stringify(m);
      return prevStr === newStr ? prev : m;
    });
  }, [filtered, dragId, groupBy, KANBAN_COLUMNS, effectiveStatusToColId]);

  const groups = useMemo(() => groupBy === 'none' ? [] : groupIssues(filtered, groupBy), [filtered, groupBy]);

  // Declared after `groups` to avoid temporal dead zone (groups dep)
  const handleCollapseAll = useCallback(() => {
    setCollapsedSwimlanes(prev => {
      const next = new Set(prev);
      groups.forEach((g) => next.add(g.groupKey));
      return next;
    });
  }, [groups]);

  const total = groupBy === 'none' ? Object.values(colMap).reduce((a, ids) => a + ids.length, 0) : filtered.length;

  /* When groupBy switches to 'epic', default all swimlane rows to collapsed.
     Other grouping modes start expanded. Uses a ref to guard against re-firing
     when only `groups` updates (e.g. new issues loaded with same groupBy). */
  const prevGroupByRef = useRef<GroupByMode>(groupBy);
  useEffect(() => {
    if (prevGroupByRef.current === groupBy) return;
    prevGroupByRef.current = groupBy;
    if (groupBy === 'epic') {
      setCollapsedSwimlanes(new Set(groups.map((g: any) => g.groupKey)));
    } else {
      setCollapsedSwimlanes(new Set());
    }
  }, [groupBy, groups]);

  /* Expand/collapse availability for View Settings panel */
  const hasSwimlanes = groupBy !== 'none';
  const canExpandAll = hasSwimlanes && collapsedSwimlanes.size > 0;
  const canCollapseAll = hasSwimlanes && groups.length > 0 && collapsedSwimlanes.size < groups.length;

  /* PragmaticBoard (group-by-none) uses denser card padding to avoid visual
     clutter when all issues pile into columns without swimlane grouping.
     Swimlane mode keeps the full comfortable 16px padding. */
  const pragmaticD = useMemo(() => ({ ...d, cardPad: d.cardPad === '16px' ? '8px' : d.cardPad }), [d]);

  /* ═══ CARD ACTIONS ═══ */

  const handleSaveSummary = useCallback(async (issueId: string, newSummary: string) => {
    const issue = issuesById.get(issueId);
    if (!issue) return;
    const oldSummary = issue.summary;
    issue.summary = newSummary;
    try {
      await supabase.from('ph_issues').update({ summary: newSummary } as any).eq('id', issueId);
      await supabase.from('catalyst_issues').update({ title: newSummary } as any).eq('issue_key', issue.issueKey);
      qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
    } catch {
      issue.summary = oldSummary;
      toastError('Failed to update summary');
    }
  }, [issuesById, key, qc, toastError]);

  const handleToggleFlag = useCallback(async (issueId: string) => {
    const issue = issuesById.get(issueId);
    if (!issue) return;
    const newFlag = !issue.isFlagged;
    issue.isFlagged = newFlag;
    try {
      await supabase.from('ph_issues').update({ is_flagged: newFlag } as any).eq('id', issueId);
      toastSuccess(newFlag ? `Flagged ${issue.issueKey}` : `Unflagged ${issue.issueKey}`);
      qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
    } catch {
      issue.isFlagged = !newFlag;
      toastError('Failed to update flag');
    }
  }, [issuesById, key, qc, toastSuccess, toastError]);

  const handleCopyLink = useCallback((issueKey: string) => {
    const url = `${window.location.origin}/project-hub/${key}/issue/${issueKey}`;
    navigator.clipboard.writeText(url).then(
      () => toastSuccess('Link copied'),
      () => toastError('Failed to copy link'),
    );
  }, [key, toastSuccess, toastError]);

  const handleCopyKey = useCallback((issueKey: string) => {
    navigator.clipboard.writeText(issueKey).then(
      () => toastSuccess(`Copied ${issueKey}`),
      () => toastError('Failed to copy key'),
    );
  }, [toastSuccess, toastError]);

  /* ═══ ASSIGNEE CHANGE ═══ */

  const assigneeOptions = useMemo(() => {
    return allAssignees
      .filter(a => a.name !== 'Unassigned')
      .map(a => ({
        name: a.name,
        avatarUrl: avatarsByName.get(a.name.toLowerCase()) || null,
        email: null as string | null,
      }));
  }, [allAssignees, avatarsByName]);

  const handleChangeAssignee = useCallback(async (issueId: string, newAssignee: string | null) => {
    const issue = issuesById.get(issueId);
    if (!issue) return;
    const oldAssignee = issue.assigneeName;
    issue.assigneeName = newAssignee;
    try {
      await supabase.from('ph_issues').update({ assignee_display_name: newAssignee } as any).eq('id', issueId);
      await supabase.from('catalyst_issues').update({ assignee_id: null } as any).eq('issue_key', issue.issueKey);
      qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
    } catch {
      issue.assigneeName = oldAssignee;
      toastError('Failed to update assignee');
    }
  }, [issuesById, key, qc, toastError]);

  /* ═══ LABELS UPDATE ═══ */

  const handleLabelsUpdated = useCallback(async (issueId: string, newLabels: string[]) => {
    const issue = issuesById.get(issueId);
    if (!issue) return;
    const oldLabels = issue.labels;
    issue.labels = newLabels;
    qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
  }, [issuesById, key, qc]);

  /* ═══ PARENT CHANGE ═══ */

  const handleParentChange = useCallback(async (issueId: string, newParentKey: string | null) => {
    const issue = issuesById.get(issueId);
    if (!issue) return;
    const oldParentKey = issue.parentKey;
    const oldParentSummary = issue.parentSummary;
    issue.parentKey = newParentKey;
    issue.parentSummary = null;
    try {
      // Fetch parent summary if setting a parent
      let parentSummary: string | null = null;
      if (newParentKey) {
        const { data: parentData } = await supabase.from('ph_issues')
          .select('summary').eq('issue_key', newParentKey).maybeSingle();
        parentSummary = parentData?.summary ?? null;
        issue.parentSummary = parentSummary;
      }
      await supabase.from('ph_issues').update({ parent_key: newParentKey, parent_summary: parentSummary } as any).eq('id', issueId);
      qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
    } catch {
      issue.parentKey = oldParentKey;
      issue.parentSummary = oldParentSummary;
      toastError('Failed to update parent');
    }
  }, [issuesById, key, qc, toastError]);

  /* ═══ MOVE WORK ITEM ═══ */

  const handleMoved = useCallback((issueId: string, newProjectKey: string) => {
    toastSuccess(`Moved ${issuesById.get(issueId)?.issueKey ?? 'item'} to ${newProjectKey}`);
    qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
  }, [issuesById, key, qc, toastSuccess]);

  /* ═══ LINK WORK ITEM ═══ */

  const handleLinked = useCallback(() => {
    toastSuccess('Work item linked');
    qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
  }, [key, qc, toastSuccess]);

  /* ═══ PAGINATION: LOAD NEXT BATCH ═══ */

  const loadNextBatch = useCallback(async () => {
    if (isLoadingMore || !hasMoreIssues || !nextPageToken || !key) return;

    setIsLoadingMore(true);
    try {
      const BATCH_SIZE = 100;

      // Fetch next batch from Supabase using offset
      let q = supabase.from('ph_issues')
        .select('id, issue_key, summary, status, status_category, issue_type, priority, assignee_display_name, labels, sprint_name, story_points, parent_key, parent_summary, sprint_release, is_flagged, jira_updated_at, jira_created_at, archived_at')
        .eq('project_key', key.toUpperCase())
        .is('deleted_at', null);
      q = showArchived ? q.not('archived_at', 'is', null) : q.is('archived_at', null);

      // Parse offset from nextPageToken (format: "offset:100", "offset:200", etc.)
      const offset = parseInt(nextPageToken.split(':')[1] || '0', 10);

      const { data: newData, error } = await q
        .order('jira_updated_at', { ascending: false })
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) {
        toastError('Failed to load more issues');
        setIsLoadingMore(false);
        return;
      }

      if (!newData || newData.length === 0) {
        // No more items
        setHasMoreIssues(false);
        setIsLoadingMore(false);
        return;
      }

      // Map new data to BoardIssue
      const newIssues: BoardIssue[] = newData.map((r: any): BoardIssue => {
        let fv: string | null = null;
        if (r.sprint_release && Array.isArray(r.sprint_release) && r.sprint_release.length > 0) {
          const f = r.sprint_release[0];
          fv = typeof f === 'string' ? f : f?.name ?? null;
        }
        return {
          id: r.id,
          issueKey: r.issue_key,
          summary: r.summary ?? '',
          issueType: r.issue_type ?? '',
          priority: r.priority ?? '',
          status: r.status ?? '',
          statusCategory: r.status_category ?? '',
          assigneeName: r.assignee_display_name,
          labels: Array.isArray(r.labels) ? (r.labels as string[]) : [],
          sprintName: r.sprint_name,
          storyPoints: r.story_points ? Number(r.story_points) : null,
          parentKey: r.parent_key,
          parentSummary: r.parent_summary,
          sprintRelease: fv,
          isFlagged: !!r.is_flagged,
          updatedAt: r.jira_updated_at,
          createdAt: r.jira_created_at ?? null,
        };
      });

      // Append to rawIssues via query cache mutation
      const seen = new Set(rawIssues.map(i => i.issueKey).filter(Boolean));
      const deduped = newIssues.filter(issue => !seen.has(issue.issueKey));

      qc.setQueryData(['kanban-issues', key, showArchived], (prev: BoardIssue[]) => {
        return [...prev, ...deduped];
      });

      // Update pagination state
      const newOffset = offset + BATCH_SIZE;
      if (newData.length < BATCH_SIZE) {
        setHasMoreIssues(false);
      } else {
        setNextPageToken(`offset:${newOffset}`);
      }

      setIsLoadingMore(false);
    } catch (err) {
      toastError('Failed to load more issues');
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreIssues, nextPageToken, key, showArchived, rawIssues, qc, toastError]);

  /* ═══ ARCHIVE ═══ */

  const handleArchive = useCallback(async (issueId: string) => {
    const issue = issuesById.get(issueId);
    if (!issue) return;
    try {
      const { error } = await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', issueId);
      if (error) throw error;
      toastSuccess(`Archived ${issue.issueKey}`);
      if (selIssueId === issueId) setSelIssueId(null);
      qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
    } catch {
      toastError(`Failed to archive ${issue.issueKey}`);
    }
  }, [issuesById, key, qc, toastSuccess, toastError, selIssueId]);

  /* ═══ DELETE (soft) ═══ */

  const handleDelete = useCallback(async (issueId: string) => {
    const issue = issuesById.get(issueId);
    if (!issue) return;
    try {
      const { error } = await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', issueId);
      if (error) throw error;
      toastSuccess(`Deleted ${issue.issueKey}`);
      if (selIssueId === issueId) setSelIssueId(null);
      qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
    } catch {
      toastError(`Failed to delete ${issue.issueKey}`);
    }
  }, [issuesById, key, qc, toastSuccess, toastError, selIssueId]);

  /* ═══ DND HANDLERS ═══ */

  const onDragStart = useCallback((e: DragStartEvent) => setDragId(String(e.active.id)), []);

  const resolveColId = useCallback((overId: string): string | null => {
    if (overId.includes('::')) return overId.split('::')[1] ?? null;
    if (COLUMN_ID_SET.has(overId)) return overId;
    return null;
  }, [COLUMN_ID_SET]);

  const onDragOver = useCallback((e: DragOverEvent) => {
    if (groupBy !== 'none') return;
    const aid = String(e.active.id), oid = e.over?.id ? String(e.over.id) : null;
    if (!oid) return;
    setColMap(prev => {
      const from = findCol(prev, aid);
      if (!from) return prev;
      const isCol = COLUMN_ID_SET.has(oid);
      const to = isCol ? oid : findCol(prev, oid);
      if (!to || from === to) return prev;
      const f = [...prev[from]], t = [...prev[to]], idx = f.indexOf(aid);
      if (idx < 0) return prev;
      f.splice(idx, 1);
      if (!isCol) { const oi = t.indexOf(oid); t.splice(oi >= 0 ? oi : 0, 0, aid); } else t.unshift(aid);
      return { ...prev, [from]: f, [to]: t };
    });
  }, [groupBy]);

  const persistStatusChange = useCallback(async (issueId: string, newStatus: string) => {
    // V2: Zod boundary on DnD — guards against empty/whitespace payloads from
    // aborted drags or stale overlay references. Silent noop when invalid so
    // the existing drag-stop UX is preserved.
    if (ENABLE_KANBAN_V2) {
      const parsed = statusChangeSchema.safeParse({ issueId, newStatus });
      if (!parsed.success) return;
    }
    const issue = issuesById.get(issueId);
    if (!issue || issue.status === newStatus) return;
    const oldStatus = issue.status;
    issue.status = newStatus;

    // Optimistic local colMap update — moves the card to its new column
    // immediately so the user doesn't need to refresh. Drag-paths that
    // already adjusted colMap upstream see this as a no-op (filter + insert
    // on the same id is idempotent across calls). On failure the catch
    // below invalidates and the server state replaces this.
    const targetColId = effectiveStatusToColId.get(newStatus.toLowerCase());
    if (targetColId) {
      setColMap(prev => {
        const fromColId = (Object.keys(prev) as string[]).find(cid => prev[cid]?.includes(issueId));
        if (!fromColId || fromColId === targetColId) return prev;
        const next: typeof prev = { ...prev };
        next[fromColId] = (prev[fromColId] || []).filter(id => id !== issueId);
        next[targetColId] = [issueId, ...(prev[targetColId] || [])];
        return next;
      });
    }

    try {
      const { error } = await supabase.from('ph_issues').update({ status: newStatus }).eq('id', issueId);
      if (error) throw error;
      await supabase.from('catalyst_issues').update({ status: newStatus }).eq('issue_key', issue.issueKey);
      qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
    } catch {
      issue.status = oldStatus;
      toastError(`Failed to move ${issue.issueKey}`);
      // Refetch authoritatively replaces our optimistic colMap on failure.
      qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
    }
  }, [issuesById, key, qc, toastSuccess, toastError, effectiveStatusToColId]);

  const onDragEnd = useCallback((e: DragEndEvent) => {
    const aid = String(e.active.id), oid = e.over?.id ? String(e.over.id) : null;
    setDragId(null);
    if (!oid) return;

    if (groupBy !== 'none') {
      const targetColId = resolveColId(oid);
      if (!targetColId) return;
      const newStatus = COL_PRIMARY_STATUS[targetColId];
      if (newStatus) persistStatusChange(aid, newStatus);
      return;
    }

    // Flat mode: reorder + persist
    setColMap(prev => {
      const c = findCol(prev, aid);
      if (!c) return prev;
      if (COLUMN_ID_SET.has(oid)) return prev;
      const ids = prev[c], oi = ids.indexOf(aid), ni = ids.indexOf(oid);
      if (oi < 0 || ni < 0 || oi === ni) return prev;
      return { ...prev, [c]: arrayMove(ids, oi, ni) };
    });
    const targetCol = findCol(colMap, aid);
    if (targetCol) {
      const ns = COL_PRIMARY_STATUS[targetCol];
      if (ns) persistStatusChange(aid, ns);
    }
  }, [groupBy, resolveColId, persistStatusChange, colMap]);

  const dragIssue = dragId ? issuesById.get(dragId) : null;

  /* ═══ ACTIVE FILTER COUNT ═══ */
  const advFilterCount = countAdvancedFilters(advancedFilters);
  const activeFilterCount = [
    selAssignees.size > 0,
    selEpics.length > 0,
    selTypes.length > 0,
    selPriorities.length > 0,
    quickFilters.size > 0,
    debSearch.trim().length > 0,
    advFilterCount > 0,
  ].filter(Boolean).length;

  // Stable card-click handler — prevents inline arrow re-creation on every render
  // which would defeat React.memo on PragmaticCard / VirtualizedColumnBody.
  const handleCardClick = useCallback((id: string) => setSelIssueId(id), []);

  const clearAllFilters = useCallback(() => {
    setSearch(''); setDebSearch('');
    setSelAssignees(new Set());
    setSelEpics([]);
    setSelTypes([]);
    setSelPriorities([]);
    setQuickFilters(new Set());
    setAdvancedFilters(EMPTY_ADVANCED_FILTERS);
  }, []);

  /* ═══ KEYBOARD NAVIGATION ═══ */
  useKanbanKeyboard({
    enabled: !dragId,
    colMap,
    issuesById,
    selectedId: focusedId,
    onSelect: setFocusedId,
    onOpen: (id) => setSelIssueId(id),
    onToggleFlag: handleToggleFlag,
    groupByActive: groupBy !== 'none',
  });

  /* ═══ LOADING STATE ═══ */

  // FIX: removed early skeleton bailout — board chrome (header, toolbar, column
  // names) now renders immediately. Skeleton cards are injected inline per column
  // via the `isLoading` prop so users see board structure at T=0 rather than a
  // blank shell for 1-3 seconds. Jira does the same: structure first, cards hydrate.

  /* ═══ RENDER ═══ */

  // Standup fullscreen mode: hides the global sidebar/header and the board's
  // own ProjectHeaderChip + full KanbanToolbar, replaced by a minimal header
  // and toolbar inside this overlay.
  const standupFullscreen = showStandup && isStandupFullscreen;

  return (
    <div
      className="flex flex-col flex-1 min-h-0"
      style={standupFullscreen
        ? {
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'var(--ds-surface, #FFFFFF)',
          }
        : { background: tk.pageBg }}
    >
      {/* In fullscreen standup mode the canonical ProjectHeaderChip is replaced
          by a minimal header rendered further down. Hide it here so the
          fullscreen layout starts clean. In normal mode, when a standup is
          active we wrap the chip in a row so the Maximize + End standup
          buttons sit at the far right of the title row (above the toolbar)
          — the toolbar itself stays untouched. */}
      {!standupFullscreen && key && (
        showStandup ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <ProjectHeaderChip projectKey={key} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 24 }}>
              <button
                type="button"
                onClick={() => setIsStandupFullscreen(true)}
                title="Full screen"
                aria-label="Full screen"
                style={{
                  width: 32, height: 32, display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center',
                  border: '1px solid var(--ds-border, #DFE1E6)',
                  background: 'var(--ds-surface, #FFFFFF)',
                  borderRadius: 4,
                  cursor: 'pointer', color: 'var(--ds-text-subtle, #44546F)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-surface, #FFFFFF)'; }}
              >
                <GrowDiagonalIcon label="" color="var(--ds-text-subtle, #44546F)" />
              </button>
              <button
                type="button"
                onClick={() => { setStandupAssignee(null); setShowStandup(false); }}
                style={{
                  height: 32, padding: '0 12px',
                  border: '1px solid var(--ds-border, #DFE1E6)',
                  background: 'var(--ds-surface, #FFFFFF)',
                  borderRadius: 4,
                  fontSize: 13, fontWeight: 500,
                  color: 'var(--ds-text, #292A2E)',
                  cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-surface, #FFFFFF)'; }}
              >
                End standup
              </button>
            </div>
          </div>
        ) : (
          <ProjectHeaderChip projectKey={key} />
        )
      )}
      {/* ProjectTabBar removed 2026-05-02 per Vikram — sidebar owns nav. */}
      {/* Board switcher now lives inside <KanbanToolbar /> via boardSwitcherSlot. */}

      {/* Create board dialog */}
      {showCreateBoard && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'var(--ds-blanket, rgba(9,30,66,0.54))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowCreateBoard(false)}
        >
          <div
            style={{
              width: 400, background: tk.surfaceBg, borderRadius: 8,
              padding: 24, boxShadow: 'var(--ds-shadow-overlay, 0 8px 32px rgba(0,0,0,0.24))',
              fontFamily: 'var(--cp-font-body)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, fontWeight: 600, color: tk.textPrimary, marginBottom: 16, fontFamily: 'var(--cp-font-heading)' }}>
              Create board
            </div>
            <label style={{ fontSize: 12, fontWeight: 600, color: tk.textMuted, display: 'block', marginBottom: 4 }}>
              BOARD NAME
            </label>
            <input
              autoFocus
              type="text"
              value={newBoardName}
              onChange={e => setNewBoardName(e.target.value)}
              onKeyDown={async e => {
                if (e.key === 'Enter' && newBoardName.trim()) {
                  e.preventDefault();
                  const trimmed = newBoardName.trim();
                  setShowCreateBoard(false);
                  const { data: userData } = await supabase.auth.getUser();
                  const userId = userData.user?.id;
                  if (!userId || !projMeta?.id) return;
                  const { data: newBoard } = await supabase
                    .from('boards')
                    .insert({
                      name: trimmed,
                      project_id: projMeta.id,
                      board_type: 'scrum',
                      created_by: userId,
                      filter_config: {},
                      filter_project_ids: [],
                      sort_order: (projectBoards.length + 1) * 10,
                    } as any)
                    .select('id')
                    .single();
                  if (newBoard?.id) {
                    // Copy columns from the current board if one exists
                    if (resolvedBoardId) {
                      const { data: srcCols } = await supabase
                        .from('board_columns')
                        .select('name, position, status_ids, is_backlog, is_done')
                        .eq('board_id', resolvedBoardId)
                        .order('position');
                      if (srcCols?.length) {
                        await supabase.from('board_columns').insert(
                          srcCols.map(c => ({ ...c, board_id: newBoard.id, id: undefined } as any))
                        );
                      }
                    }
                    await refetchBoards();
                    setActiveBoardId(newBoard.id);
                    qc.invalidateQueries({ queryKey: ['kanban-board-columns', newBoard.id] });
                  }
                }
              }}
              placeholder="e.g. Sprint board"
              style={{
                width: '100%', height: 32, padding: '0 8px',
                border: `2px solid var(--ds-border-focused, #4C9AFF)`,
                borderRadius: 4, fontSize: 14, color: tk.textPrimary,
                background: tk.surfaceBg, outline: 'none', boxSizing: 'border-box',
                fontFamily: 'var(--cp-font-body)',
              }}
            />
            <div style={{ fontSize: 11, color: tk.textMuted, marginTop: 8 }}>Press Enter to create, Escape to cancel</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => setShowCreateBoard(false)}
                style={{
                  height: 32, padding: '0 16px', borderRadius: 3,
                  border: `1px solid ${tk.border}`, background: 'transparent',
                  fontSize: 14, cursor: 'pointer', color: tk.textSecondary,
                  fontFamily: 'var(--cp-font-body)',
                }}
              >
                Cancel
              </button>
              <button
                disabled={!newBoardName.trim()}
                onClick={async () => {
                  const trimmed = newBoardName.trim();
                  if (!trimmed) return;
                  setShowCreateBoard(false);
                  const { data: userData } = await supabase.auth.getUser();
                  const userId = userData.user?.id;
                  if (!userId || !projMeta?.id) return;
                  const { data: newBoard } = await supabase
                    .from('boards')
                    .insert({
                      name: trimmed,
                      project_id: projMeta.id,
                      board_type: 'scrum',
                      created_by: userId,
                      filter_config: {},
                      filter_project_ids: [],
                      sort_order: (projectBoards.length + 1) * 10,
                    } as any)
                    .select('id')
                    .single();
                  if (newBoard?.id) {
                    if (resolvedBoardId) {
                      const { data: srcCols } = await supabase
                        .from('board_columns')
                        .select('name, position, status_ids, is_backlog, is_done')
                        .eq('board_id', resolvedBoardId)
                        .order('position');
                      if (srcCols?.length) {
                        await supabase.from('board_columns').insert(
                          srcCols.map(c => ({ ...c, board_id: newBoard.id, id: undefined } as any))
                        );
                      }
                    }
                    await refetchBoards();
                    setActiveBoardId(newBoard.id);
                    qc.invalidateQueries({ queryKey: ['kanban-board-columns', newBoard.id] });
                  }
                }}
                style={{
                  height: 32, padding: '0 16px', borderRadius: 3,
                  border: 'none',
                  background: newBoardName.trim() ? 'var(--ds-background-brand-bold, var(--cp-primary-60, #0052CC))' : tk.chipBg,
                  fontSize: 14, cursor: newBoardName.trim() ? 'pointer' : 'not-allowed',
                  color: newBoardName.trim() ? 'var(--ds-text-inverse, #FFFFFF)' : tk.textMuted,
                  fontFamily: 'var(--cp-font-body)',
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* F3: "Show archived" moved into the board ••• menu — no standalone row above toolbar */}
      {showArchived && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 16px', background: 'var(--ds-background-warning-bold, #FFAB00)', color: 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))' }}>
          <span style={{ fontSize: 12, fontWeight: 500, fontFamily: 'var(--cp-font-body)' }}>
            Showing archived issues — restore from the issue overflow menu.
          </span>
          <button
            onClick={() => setShowArchived(false)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))', fontFamily: 'var(--cp-font-body)', padding: '0 4px' }}
          >
            Exit
          </button>
        </div>
      )}

      {/* ── FULLSCREEN STANDUP: minimal header + toolbar row ────────────────
          Jira parity (Screenshot 2026-06-13 220818): only the project chip,
          add-people, meatball and a minimize button on top; a single row
          below it with Search + Filter on the left, Group + Analytics + End
          standup on the right. The normal <KanbanToolbar/> is hidden below. */}
      {standupFullscreen && (
        <>
          {/* Row 1 — minimal header */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 24px',
              background: 'var(--ds-surface, #FFFFFF)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Reuse the canonical ProjectHeaderChip — it renders board
                  name + add-people + meatball already. */}
              {key && <ProjectHeaderChip projectKey={key} />}
            </div>
            {/* Fullscreen title row only carries the minimize button.
                End standup lives in the toolbar to the right of Group. */}
            <button
              type="button"
              onClick={() => setIsStandupFullscreen(false)}
              title="Exit full screen"
              aria-label="Exit full screen"
              style={{
                width: 32, height: 32, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--ds-border, #DFE1E6)',
                background: 'var(--ds-surface, #FFFFFF)',
                borderRadius: 4,
                cursor: 'pointer', color: 'var(--ds-text-subtle, #44546F)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-surface, #FFFFFF)'; }}
            >
              <VidFullScreenOffIcon label="" size="small" primaryColor="var(--ds-text-subtle, #44546F)" />
            </button>
          </div>

          {/* Row 2 — simplified toolbar */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 24px 12px', gap: 8,
              background: 'var(--ds-surface, #FFFFFF)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Search input — reuses board search state */}
              <div style={{ position: 'relative', width: 220 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: tk.textMuted, pointerEvents: 'none', display: 'inline-flex' }}>
                  <svg width={14} height={14} viewBox="0 0 16 16" fill="none" aria-hidden>
                    <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search board"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', height: 32, paddingLeft: 30, paddingRight: 8,
                    border: `1px solid ${tk.border}`, borderRadius: 3,
                    fontSize: 14, fontWeight: 500,
                    color: tk.textPrimary, background: tk.surfaceBg,
                    outline: 'none', fontFamily: 'var(--cp-font-body)',
                  }}
                />
              </div>
              {/* Filter trigger — reuses board's basic filter state */}
              <FilterTriggerButton
                count={basicFilterCount}
                onClick={() => setShowBasicFilter(p => !p)}
                isOpen={showBasicFilter}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GroupByPopover<GroupByMode>
                value={groupBy}
                onChange={setGroupBy}
                options={BOARD_GROUP_OPTIONS}
                noneKey={'none' as GroupByMode}
              />
              {/* End standup — sits to the RIGHT of the Group trigger. */}
              <button
                type="button"
                onClick={() => { setStandupAssignee(null); setShowStandup(false); }}
                style={{
                  height: 32, padding: '0 12px',
                  border: '1px solid var(--ds-border, #DFE1E6)',
                  background: 'var(--ds-surface, #FFFFFF)',
                  borderRadius: 4,
                  fontSize: 13, fontWeight: 500,
                  color: 'var(--ds-text, #292A2E)',
                  cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-surface, #FFFFFF)'; }}
              >
                End standup
              </button>
            </div>
          </div>
        </>
      )}

      {/* CatyBoardInsight now lives inside <KanbanToolbar /> via catyInsightSlot. */}
      {/* ── Toolbar — canonical <KanbanToolbar/> (Phase 1 extraction) ── */}
      {/* Toolbar stays unchanged when standup is active — the standup panel
          sits below the toolbar, not above it. The legacy marginLeft offset
          that pushed the toolbar right has been removed. */}
      {!standupFullscreen && (
      <div>
      <KanbanToolbar<GroupByMode>
        tk={tk}
        search={search}
        onSearchChange={setSearch}
        allAssignees={allAssignees}
        selAssignees={selAssignees}
        onSelAssigneesChange={setSelAssignees}
        avatarsByName={avatarsByName}
        basicFilterCount={basicFilterCount}
        showBasicFilter={showBasicFilter}
        onShowBasicFilterChange={setShowBasicFilter}
        filterCategories={filterCategories}
        filterSelected={filterSelected}
        onFilterChange={handleFilterChange}
        onClearBasicFilters={() => {
          setSelEpics([]);
          setSelTypes([]);
          setSelPriorities([]);
          setSelAssignees(new Set());
        }}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        groupByOptions={BOARD_GROUP_OPTIONS}
        groupByNoneKey={'none' as GroupByMode}
        activeFilterCount={activeFilterCount}
        onClearAllFilters={clearAllFilters}
        totalIssues={total}
        showBoardMenu={showBoardMenu}
        onShowBoardMenuChange={setShowBoardMenu}
        showViewSettings={showViewSettings}
        onShowViewSettingsChange={setShowViewSettings}
        showAdvancedFilter={showAdvancedFilter}
        onShowAdvancedFilterChange={setShowAdvancedFilter}
        advancedFilters={advancedFilters}
        onAdvancedFiltersChange={setAdvancedFilters}
        advFilterCount={advFilterCount}
        viewSettings={viewSettings}
        onUpdateViewSettings={updateViewSettings}
        onExpandAll={handleExpandAll}
        onCollapseAll={() => {
          setCollapsedSwimlanes(() => {
            const next = new Set<string>();
            groups?.forEach((g: any) => next.add(g.groupKey));
            return next;
          });
        }}
        hasSwimlanes={hasSwimlanes}
        canExpandAll={canExpandAll}
        canCollapseAll={canCollapseAll}
        enableDensity={ENABLE_KANBAN_V2}
        density={density}
        onDensityChange={onDensityChange}
        mapStatusesPath={resolvedBoardId ? `/project-hub/${key}/boards/${resolvedBoardId}/map-statuses` : undefined}
        projectKey={key ?? ''}
        canArchive={canArchive}
        showArchived={showArchived}
        onShowArchivedChange={setShowArchived}
        onStartStandup={() => { setShowStandup(true); setIsStandupFullscreen(true); }}
        quickFilters={quickFilters}
        onQuickFiltersChange={setQuickFilters}
        enabledQuickFilters={enabledQuickFilters}
        onRenameBoard={resolvedBoardId ? () => {
          const currentName = projectBoards.find(b => b.id === resolvedBoardId)?.name ?? '';
          setRenameBoardValue(currentName);
          setRenameBoardOpen(true);
        } : undefined}
        catyInsightSlot={
          <CatyBoardInsight projectKey={key ?? null} resourceId={key ?? 'project'} />
        }
        /* Standup controls live in the title row above the toolbar (next to
           the ProjectHeaderChip) — the toolbar itself stays unmodified. */
        boardSwitcherSlot={
          <div ref={boardSwitcherRef} style={{ position: 'relative' }}>
            {(() => {
              const isActive = showBoardSwitcher || isBoardSwitcherFocused;
              const bg = showBoardSwitcher || isBoardSwitcherHovered
                ? tk.surfaceHover
                : 'var(--ds-surface, #FFFFFF)';
              return (
                <button
                  onClick={() => setShowBoardSwitcher(v => !v)}
                  onFocus={() => setIsBoardSwitcherFocused(true)}
                  onBlur={() => setIsBoardSwitcherFocused(false)}
                  onMouseEnter={() => setIsBoardSwitcherHovered(true)}
                  onMouseLeave={() => setIsBoardSwitcherHovered(false)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    width: 220, height: 32, padding: '0 8px 0 12px',
                    background: bg,
                    border: `1px solid ${isActive ? 'var(--ds-border-selected, #0C66E4)' : 'var(--ds-border, #DFE1E6)'}`,
                    boxShadow: isActive ? '0 0 0 1px var(--ds-border-selected, #0C66E4)' : 'none',
                    borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    color: tk.textSecondary, fontFamily: 'var(--cp-font-body)',
                    outline: 'none',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {projectBoards.find(b => b.id === resolvedBoardId)?.name ?? 'Board'}
                  </span>
                  <AkChevronDownIcon label="" size="medium" />
                </button>
              );
            })()}
            {showBoardSwitcher && (
              <div
                style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                  width: 220, background: tk.surfaceBg,
                  border: `1px solid ${tk.border}`, borderRadius: 8,
                  boxShadow: 'var(--ds-shadow-overlay, 0 8px 24px rgba(0,0,0,0.16))', zIndex: 60,
                  padding: '8px 0',
                }}
                onMouseDown={e => e.stopPropagation()}
              >
                {projectBoards.map(b => (
                  <button
                    key={b.id}
                    onClick={() => { setActiveBoardId(b.id); setShowBoardSwitcher(false); }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '8px 16px',
                      background: b.id === resolvedBoardId ? 'var(--ds-background-selected, #DEEBFF)' : 'transparent',
                      border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                      color: b.id === resolvedBoardId ? 'var(--ds-link, var(--cp-primary-60, #0052CC))' : tk.textPrimary,
                      fontFamily: 'var(--cp-font-body)',
                    }}
                    onMouseEnter={e => { if (b.id !== resolvedBoardId) e.currentTarget.style.background = tk.surfaceHover; }}
                    onMouseLeave={e => { if (b.id !== resolvedBoardId) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {b.name}
                  </button>
                ))}
                {projectBoards.length > 0 && <div style={{ height: 1, background: tk.borderSubtle, margin: '4px 8px' }} />}
                <button
                  onClick={() => { setShowBoardSwitcher(false); setNewBoardName(''); setShowCreateBoard(true); }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '8px 16px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 500,
                    color: 'var(--ds-link, var(--cp-primary-60, #0052CC))', fontFamily: 'var(--cp-font-body)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = tk.surfaceHover)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  + Create board
                </button>
              </div>
            )}
          </div>
        }
      />
      </div>
      )}

      <ModalTransition>
        {renameBoardOpen && (
          <ModalDialog onClose={() => setRenameBoardOpen(false)} width="small">
            <ModalHeader>
              <ModalTitle>Rename board</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <Textfield
                autoFocus
                value={renameBoardValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenameBoardValue(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' && renameBoardValue.trim() && resolvedBoardId) {
                    updateBoard.mutate({ boardId: resolvedBoardId, name: renameBoardValue.trim() });
                    setRenameBoardOpen(false);
                  }
                }}
                placeholder="Board name"
              />
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setRenameBoardOpen(false)}>Cancel</Button>
              <Button
                appearance="primary"
                isDisabled={!renameBoardValue.trim()}
                isLoading={updateBoard.isPending}
                onClick={() => {
                  if (!resolvedBoardId) return;
                  updateBoard.mutate({ boardId: resolvedBoardId, name: renameBoardValue.trim() });
                  setRenameBoardOpen(false);
                }}
              >
                Rename
              </Button>
            </ModalFooter>
          </ModalDialog>
        )}
      </ModalTransition>

      {/* ── Board content (Jira parity: 8px inter-column gap, 16px outer padding) ── */}
      {/* When a standup is active, render the StandupModal as an inline docked
          flex item to the left of the column area. The two share a row in a
          responsive flex container — no overlapping. Replaces the legacy
          marginLeft offset trick (which would otherwise hide content behind
          the fixed-positioned panel). */}
      <div className="flex-1 min-h-0 flex" style={{ overflow: 'auto', padding: '0 16px 16px 16px', gap: 16 }}>
        {showStandup && (
          <StandupModal
            docked
            issues={standupAssignee ? rawIssues.filter(i => i.issueType !== 'Epic' && !BOARD_SUBTASK_TYPES.has(i.issueType)) : filtered}
            avatarsByName={avatarsByName}
            tk={tk}
            onPersonChange={name => setStandupAssignee(name === 'Unassigned' ? null : name)}
            onClose={() => { setStandupAssignee(null); setShowStandup(false); }}
          />
        )}
        <div className="flex-1 min-w-0" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Filter-backed board states (ENABLE_FILTER_TO_KANBAN). */}
        {isFilterBacked && filterBoard.isError && (
          <div style={{ marginBottom: 16 }}>
            <SectionMessage appearance="error" title="Couldn't load this filter's results">
              The saved filter behind this board failed to run. Try reloading, or open the filter to check its definition.
            </SectionMessage>
          </div>
        )}
        {isFilterBacked && !filterBoard.isError && filterBoard.isTruncated && (
          <div style={{ marginBottom: 16 }}>
            <SectionMessage appearance="information" title={`Showing the first ${filterBoard.issues.length} of ${filterBoard.totalCount} items`}>
              This filter matches more items than the board shows at once. Refine the filter to narrow the results.
            </SectionMessage>
          </div>
        )}
        {groupBy !== 'none' ? (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
            <div style={{ background: 'transparent', minWidth: KANBAN_COLUMNS.length * 267 + (KANBAN_COLUMNS.length - 1) * 8 }}>
              {/* Column headers for swimlane mode (Jira parity: 48h, 267w, transparent) */}
              <div className="flex sticky top-0 z-20" style={{ background: tk.pageBg, gap: 8, paddingBottom: 4 }}>
                {KANBAN_COLUMNS.map((col) => {
                  const count = groups.reduce((sum, g) => sum + g.issueIds.filter(id => {
                    const issue = issuesById.get(id);
                    return issue ? effectiveStatusToColId.get(issue.status.toLowerCase()) === col.id : false;
                  }).length, 0);
                  // jira-compare 2026-05-08: fix category dot colors + column header typography to match PragmaticBoard patch
                  const categoryDot = col.category === 'done'
                    ? 'var(--ds-background-success-bold, #94C748)'
                    : col.category === 'in_progress'
                    ? 'var(--ds-background-information, #669DF1)'
                    : 'var(--ds-text-subtlest, #5E6C84)';
                  return (
                    <div key={col.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: 267, minWidth: 267, maxWidth: 267, height: 48, flexShrink: 0,
                      padding: '0 12px',
                      background: tk.headerBg,
                      borderRadius: '6px 6px 0 0',
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: categoryDot, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: tk.textMuted, flex: 1, lineHeight: '16px', fontFamily: 'var(--cp-font-body)' }}>{col.name.toUpperCase()}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: tk.textMuted, lineHeight: '16px', fontFamily: 'var(--cp-font-body)' }}>{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Swimlane rows */}
              {groups.map(g => (
                <SwimlaneRow
                  key={g.groupKey}
                  group={g}
                  mode={groupBy}
                  issuesById={issuesById}
                  avatarsByName={avatarsByName}
                  onCardClick={handleCardClick}
                  defaultOpen={!collapsedSwimlanes.has(g.groupKey)}
                  d={d}
                  tk={tk}
                  selectedId={selIssueId}
                  onToggleFlag={handleToggleFlag}
                  onCopyLink={handleCopyLink}
                  onCopyKey={handleCopyKey}
                  onChangeStatus={persistStatusChange}
                  onSaveSummary={handleSaveSummary}
                  onChangeAssignee={handleChangeAssignee}
                  assigneeOptions={assigneeOptions}
                  projectKey={key ?? ''}
                  onLabelsUpdated={handleLabelsUpdated}
                  onParentChange={handleParentChange}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  onMoved={handleMoved}
                  onLinked={handleLinked}
                  visibleFields={groupBy === 'epic' ? { ...visibleFields, epic: false } : visibleFields}
                  cardColorMode={cardColorMode}
                  columns={KANBAN_COLUMNS}
                  statusToColId={effectiveStatusToColId}
                  subtasksByParentKey={subtasksByParentKey}
                />
              ))}
              {groups.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', color: tk.textDisabled, fontSize: 13 }}>
                  No issues match filters
                </div>
              )}
            </div>
            <DragOverlay dropAnimation={null}>
              {dragIssue ? <OverlayCard issue={dragIssue} avatarUrl={dragIssue.assigneeName ? avatarsByName.get(dragIssue.assigneeName.toLowerCase()) : null} d={d} tk={tk} /> : null}
            </DragOverlay>
          </DndContext>
        ) : (
          /* Pragmatic drag-and-drop path (non-swimlane).
             Monitor-based reconciliation; host owns colMap + supabase persist. */
          <PragmaticBoard
            columns={KANBAN_COLUMNS}
            colMap={colMap}
            issuesById={issuesById}
            avatarsByName={avatarsByName}
            onCardClick={id => setSelIssueId(id)}
            d={pragmaticD}
            tk={tk}
            selectedId={selIssueId}
            focusedId={focusedId}
            isLoading={isLoading}
            onToggleFlag={handleToggleFlag}
            onCopyLink={handleCopyLink}
            onCopyKey={handleCopyKey}
            onChangeStatus={persistStatusChange}
            onSaveSummary={handleSaveSummary}
            onChangeAssignee={handleChangeAssignee}
            assigneeOptions={assigneeOptions}
            projectKey={key ?? ''}
            onLabelsUpdated={handleLabelsUpdated}
            onParentChange={handleParentChange}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onMoved={handleMoved}
            onLinked={handleLinked}
            visibleFields={visibleFields}
            cardColorMode={cardColorMode}
            subtasksByParentKey={subtasksByParentKey}
            boardColumns={KANBAN_COLUMNS}
            onCreateCard={() => {
              /* InlineCreateCard already wrote the issue to Supabase.
                 Refetch the board so the new card appears in its column. */
              qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
            }}
            createInColumnLabel="Create"
            onDrop={({ cardId, sourceColId, destColId, insertIndex }) => {
              /* 1. Optimistic local reorder. */
              setColMap(prev => {
                const next: typeof prev = { ...prev };
                const src = [...(next[sourceColId] ?? [])];
                const srcIdx = src.indexOf(cardId);
                if (srcIdx < 0) return prev;
                src.splice(srcIdx, 1);
                if (destColId === sourceColId) {
                  src.splice(insertIndex, 0, cardId);
                  next[sourceColId] = src;
                } else {
                  const dst = [...(next[destColId] ?? [])];
                  dst.splice(insertIndex, 0, cardId);
                  next[sourceColId] = src;
                  next[destColId] = dst;
                }
                return next;
              });
              /* 2. Persist status change on column switch.
                 Same-column reorders are UI-only (no status change). */
              if (destColId !== sourceColId) {
                const newStatus = COL_PRIMARY_STATUS[destColId];
                if (newStatus) persistStatusChange(cardId, newStatus);
              }
            }}
          />
        )}
        </div> {/* /board-column wrapper (flex-1) */}
      </div>

      {/* ── Detail panel ── */}
      {selIssueId && (
        <Suspense fallback={null}>
          <CatalystDetailRouter
            isOpen={true}
            onClose={() => setSelIssueId(null)}
            itemId={issuesById.get(selIssueId)?.issueKey ?? selIssueId}
            itemType={issuesById.get(selIssueId)?.issueType ?? undefined}
            projectId={projMeta?.id ?? ''}
            projectKey={key}
          />
        </Suspense>
      )}
      {/* StandupModal now renders as an inline docked panel inside the board
          content row above (Jira parity). The legacy fixed-overlay variant
          has been removed — it would have rendered on top of the column
          area and overlapped cards. */}
      <PriToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
