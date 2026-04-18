/**
 * Unified Backlog page -- combines Story / Epic / Feature into one table.
 *
 *   - Type chips at the top filter by issue type (All / Epics / Features / Stories)
 *   - Hierarchy: Epics have expand/collapse carets revealing their child stories
 *   - Canonical JiraTable + editors (status / assignee / priority / parent / summary)
 *   - Row click on Key opens the detail side panel (from CatalystDetailRouter)
 *   - Bottom inline "+ Create" row
 *
 * Route suggestion (wire in App.tsx or FullAppRoutes):
 *   <Route path="/project-hub/:key/backlog" element={<NativeBacklogPage />} />
 *
 * Canonical: this page is ~400 lines and designed to be the template for
 * ReleaseHub, TestHub, IncidentHub boards that want a Jira-style list view.
 */
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import EmptyState from '@atlaskit/empty-state';
import SectionMessage from '@atlaskit/section-message';
import Spinner from '@atlaskit/spinner';
import Textfield from '@atlaskit/textfield';
import { Box, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import Tooltip from '@atlaskit/tooltip';
import Button from '@atlaskit/button';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';

import {
  JiraTable,
  makeKeyCell,
  makeCommentsCell,
  makeDateCell,
  makeTypeIconCell,
  makeCaretCell,
  makeStatusEditCell,
  makeStatusEditCellAkPopup,
  makeSummaryInlineEditCell,
  makeAssigneeEditCell,
  makePriorityEditCell,
  makeParentEditCell,
  makeRowActionsCell,
  FlagsHost,
  flag,
} from '@/components/shared/JiraTable';
import type {
  Column,
  LozengeAppearance,
  StatusOption,
  AssigneeChoice,
  ParentChoice,
  RowAction,
} from '@/components/shared/JiraTable';

import { useStoryBacklog, useEpicBacklog, useInitiativesByKeys } from '../hooks/useBacklogData';
import type { InitiativeRow } from '../hooks/useBacklogData';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { STORY_STATUS_LOZENGE, getPriorityLabel } from '../utils/backlog.utils';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useAtlaskitThemeSync } from '../components/SubtasksPanel/atlaskitTheme';
import { writeTicketOrigin } from '../hooks/useTicketOrigin';
import { JiraFilterAtlaskit, emptyFilterValue } from '@/components/shared/JiraFilterAtlaskit';
import type {
  JiraFilterValue,
  AssigneeOption,
  FixVersionOption,
} from '@/components/shared/JiraFilterAtlaskit';
import { Search as SearchIcon, Plus, Pencil, Trash2, Flag, Copy as CopyIcon, ChevronLeft, ChevronRight, X as CloseIcon, Maximize2, Minimize2, ChevronsLeft, ChevronsRight } from 'lucide-react';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

/* ─── Unified model ────────────────────────────────────────────────────── */

/**
 * BacklogType — rows in the unified backlog surface.
 * - 'initiative' (Catalyst-native, from ph_initiatives) sits at depth 0
 *   and is the "Business Request" layer the ERD describes.
 * - 'epic' / 'feature' / 'story' come from Jira + Catalyst work-item
 *   tables.
 */
export type BacklogType = 'initiative' | 'epic' | 'feature' | 'story';

export interface BacklogItem {
  id: string;
  type: BacklogType;
  key: string | null;
  title: string;
  status: string | null;
  priority: string | null;
  assignee_name: string | null;
  /** Reporter display_name — sourced from ph_issues.reporter_display_name,
   *  used by the Reporter filter chip. Null for Catalyst-native rows. */
  reporter_name: string | null;
  /** Business-request (MDT) issue_key that this work item links to via
   *  ph_issue_links.link_type = 'BRD' / 'is BRD of'. Currently null for
   *  100% of BAU rows (Lovable's 2026-04 discovery confirmed 0 existing
   *  links); will populate automatically once MDT linking starts. */
  business_request_key: string | null;
  parent_id: string | null;        // used to link stories to epics
  parent_key: string | null;
  parent_label: string | null;     // computed for display
  source: 'jira' | 'catalyst';
  updated_at: string | null;
  created_at: string | null;
  comment_count: number | null;
}

/* ─── Status mapping (shared with Story Backlog) ────────────────────────── */

function statusAppearance(status: string | null | undefined): LozengeAppearance {
  if (!status) return 'default';
  const cfg = STORY_STATUS_LOZENGE[status];
  if (cfg?.color === 'blue') return 'inprogress';
  if (cfg?.color === 'green') return 'success';
  return 'default';
}
// Jira's list view renders status in sentence case, not uppercase (measured
// on digital-transformation.atlassian.net 2026-04-18). Return the raw Jira
// value as-is; the StatusPill itself doesn't re-uppercase.
function statusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return status;
}
const STATUS_OPTIONS: StatusOption[] = [
  { value: 'To Do', label: 'To Do', appearance: 'default', group: 'To Do' },
  { value: 'Backlog', label: 'Backlog', appearance: 'default', group: 'To Do' },
  { value: 'In Requirements', label: 'In Requirements', appearance: 'default', group: 'To Do' },
  { value: 'In Development', label: 'In Development', appearance: 'inprogress', group: 'In Progress' },
  { value: 'In Progress', label: 'In Progress', appearance: 'inprogress', group: 'In Progress' },
  { value: 'In QA', label: 'In QA', appearance: 'inprogress', group: 'In Progress' },
  { value: 'In UAT', label: 'In UAT', appearance: 'inprogress', group: 'In Progress' },
  { value: 'Done', label: 'Done', appearance: 'success', group: 'Done' },
  { value: 'In Production', label: 'In Production', appearance: 'success', group: 'Done' },
];
const PRIORITY_ORDER = ['critical', 'highest', 'high', 'medium', 'low', 'lowest'];

/* ─── Entry wrapper: resolves projectId from URL key ───────────────────── */

export default function NativeBacklogPage() {
  const { key } = useParams<{ key: string }>();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!key) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('projects').select('id').eq('key', key).single();
      setProjectId(data?.id ?? null);
      setLoading(false);
    })();
  }, [key]);

  if (loading) {
    return (
      <Box xcss={xcss({ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: 'space.1000' })}>
        <Spinner size="large" label="Loading project" />
      </Box>
    );
  }
  if (!projectId) return <EmptyState header="Project not found" description={`No project with key "${key}"`} />;
  return <BacklogPage projectId={projectId} projectKey={key || ''} />;
}

/* ─── The canonical page ───────────────────────────────────────────────── */

function BacklogPage({ projectId, projectKey }: { projectId: string; projectKey: string }) {
  useAtlaskitThemeSync();

  const queryClient = useQueryClient();
  const {
    data: stories = [],
    isLoading: storiesLoading,
    error: storiesError,
    refetch: refetchStories,
  } = useStoryBacklog(projectId);
  const {
    data: epics = [],
    isLoading: epicsLoading,
    error: epicsError,
    refetch: refetchEpics,
  } = useEpicBacklog(projectId);
  const avatarsByName = useProfileAvatarsByName();
  const backlogError = storiesError || epicsError;

  // Initiative (Business Request) resolution — per the ProductBacklog ERD,
  // ph_initiatives.initiative_key appears as ph_issues.parent_key on any
  // Jira issue that belongs to an initiative. So we collect every distinct
  // parent_key across stories + epics (and the stories' epic parents), then
  // ask ph_backlog_initiatives_view which of those keys are initiatives.
  // Matches become top-level rows in the backlog; epics that reference them
  // nest underneath.
  //
  // Today (2026-04-18) BAU epics have parent_key = NULL so no initiative
  // rows surface. When linkage gets created (Catalyst sets parent_key on an
  // epic to an initiative_key, or Jira sync starts populating it), the UI
  // picks it up on the next render with no code change.
  const initiativeCandidateKeys = useMemo(() => {
    const keys = new Set<string>();
    epics.forEach((e) => {
      const pk = (e as any).parent_key;
      if (pk) keys.add(pk);
    });
    stories.forEach((s) => {
      // Story parents are epics — but occasionally a story's parent_key
      // could ALSO be an initiative_key directly if the team skipped epic
      // as a layer. Include them in the lookup.
      const ek = s.feature?.epic?.epic_key;
      if (ek) keys.add(ek);
    });
    return Array.from(keys);
  }, [epics, stories]);
  const { data: initiativesByKey } = useInitiativesByKeys(initiativeCandidateKeys);

  // ── URL deep-link ──────────────────────────────────────────────────────
  // All user-facing view state (type filter, search, sort, column visibility,
  // groupBy, collapsed groups, detail item, expanded epics) is serialized to
  // URL query params. This lets users bookmark / share an exact view.
  //
  // On mount we hydrate state from the URL; every state change pushes a
  // `replaceState` so back-button navigation stays clean. Param names are
  // short to keep URLs readable.
  const [searchParams, setSearchParams] = useSearchParams();
  const DEFAULT_VISIBLE_COLUMNS = ['key', 'summary', 'status', 'parent', 'assignee', 'priority', 'updated'];
  const parseSet = (raw: string | null): Set<string> =>
    raw ? new Set(raw.split(',').filter(Boolean)) : new Set();

  // ── UI state (URL-seeded) ──
  const [typeFilter, setTypeFilter] = useState<BacklogType | 'all'>(
    () => (searchParams.get('type') as BacklogType | 'all') || 'all',
  );
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [filterValue, setFilterValue] = useState<JiraFilterValue>(emptyFilterValue);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => parseSet(searchParams.get('expanded')));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Default sort — Updated DESC (most recently touched first) matches
  // Jira's default list-view ordering. URL params override.
  const DEFAULT_SORT_KEY = 'updated';
  const DEFAULT_SORT_DIR: 'ASC' | 'DESC' = 'DESC';
  const [sortKey, setSortKey] = useState<string | null>(
    () => searchParams.get('sort') || DEFAULT_SORT_KEY,
  );
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC' | null>(
    () => (searchParams.get('dir') as 'ASC' | 'DESC' | null) || DEFAULT_SORT_DIR,
  );
  const [page, setPage] = useState(() => Number(searchParams.get('page') || '1') || 1);
  // Detail panel (Jira-parity drawer). URL param migrated from ?detail= to
  // ?selectedIssue= (2026-04-18) to match Jira's list-view pattern. The
  // fallback-read supports old bookmarks with ?detail=<uuid>. On write we
  // only emit ?selectedIssue so new URLs stay Jira-native.
  //
  // Design: selectedIssue carries the backlog item's ID (uuid), not its
  // Jira issue_key. This matches what CatalystDetailRouter expects and
  // preserves Catalyst-native items that have no Jira key.
  const [detailItemId, setDetailItemId] = useState<string | null>(
    () => searchParams.get('selectedIssue') || searchParams.get('detail') || null,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BacklogItem | null>(null);
  // Panel mode machine — matches Jira's 3 states measured from their DOM:
  //   'compact'    = 400px right drawer (default)
  //   'expanded'   = ~60% of viewport (Jira's Expand button)
  //   'fullscreen' = full viewport (Jira's Enter full screen button)
  // Stored in URL as ?panel= so bookmarks preserve the user's last state.
  type PanelMode = 'compact' | 'expanded' | 'fullscreen';
  const [panelMode, setPanelMode] = useState<PanelMode>(
    () => (searchParams.get('panel') as PanelMode) || 'compact',
  );
  // Column visibility — seeded from URL if present, else defaults.
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const raw = searchParams.get('cols');
    return raw ? parseSet(raw) : new Set(DEFAULT_VISIBLE_COLUMNS);
  });
  // Group-by — matches catalog 076-095. 'none' disables grouping.
  type GroupByKey = 'none' | 'status' | 'parent' | 'assignee' | 'priority';
  const [groupBy, setGroupBy] = useState<GroupByKey>(
    () => (searchParams.get('group') as GroupByKey) || 'none',
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => parseSet(searchParams.get('collapsed')),
  );
  const toggleGroup = useCallback((id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Serialize view state → URL (replaceState, no history spam).
  // Only emit params that differ from defaults so URLs stay short.
  useEffect(() => {
    const params = new URLSearchParams();
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (search) params.set('q', search);
    // Don't write the default sort back to the URL — keeps URLs clean.
    if (sortKey && sortKey !== DEFAULT_SORT_KEY) params.set('sort', sortKey);
    if (sortDir && sortDir !== DEFAULT_SORT_DIR) params.set('dir', sortDir);
    if (page !== 1) params.set('page', String(page));
    if (detailItemId) params.set('selectedIssue', detailItemId);
    if (panelMode !== 'compact') params.set('panel', panelMode);
    if (groupBy !== 'none') params.set('group', groupBy);
    if (collapsedGroups.size) params.set('collapsed', Array.from(collapsedGroups).join(','));
    if (expandedIds.size) params.set('expanded', Array.from(expandedIds).join(','));
    // Only emit `cols` if it differs from defaults — so users who haven't
    // customized don't see a noisy URL.
    const defaultSet = new Set(DEFAULT_VISIBLE_COLUMNS);
    const differs =
      visibleColumns.size !== defaultSet.size ||
      Array.from(visibleColumns).some((id) => !defaultSet.has(id));
    if (differs) params.set('cols', Array.from(visibleColumns).join(','));
    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, search, sortKey, sortDir, page, detailItemId, panelMode, groupBy, collapsedGroups, expandedIds, visibleColumns]);
  const containerRef = useRef<HTMLDivElement>(null);

  const pageSize = 25;

  // ── Mutations ──
  const updateField = useMutation({
    mutationFn: async ({ id, source, patch }: { id: string; source?: string; patch: Record<string, unknown> }) => {
      if (source !== 'catalyst') throw new Error('Jira-synced items must be edited in Jira.');
      const { error } = await supabase
        .from('catalyst_issues')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-epics', projectId] });
      flag.success('Updated');
    },
    onError: (e: Error) => flag.error('Update failed', e.message),
  });

  // ── Normalize epics + stories into BacklogItem ──
  // Merge strategy:
  //   1. Start with epics returned by useEpicBacklog (may be empty if the
  //      year filter excludes everything).
  //   2. Walk stories; for each distinct parent epic we haven't already
  //      seen, synthesize an epic row so hierarchy renders even when the
  //      primary epic fetcher returned nothing.
  const items: BacklogItem[] = useMemo(() => {
    const out: BacklogItem[] = [];
    const epicSeen = new Set<string>();
    const initiativeSeen = new Set<string>();

    // Initiative rows first (top of hierarchy). Sourced from
    // ph_backlog_initiatives_view via useInitiativesByKeys. Only initiatives
    // that are referenced as a parent_key by any current BAU epic/story land
    // here — no noise.
    if (initiativesByKey && initiativesByKey.size > 0) {
      initiativesByKey.forEach((init, key) => {
        if (initiativeSeen.has(init.id)) return;
        initiativeSeen.add(init.id);
        out.push({
          id: init.id,
          type: 'initiative',
          key: init.initiative_key,
          title: init.title,
          status: null,
          priority: null,
          assignee_name: null,
          reporter_name: null,
          business_request_key: null,
          parent_id: null,
          parent_key: null,
          parent_label: null,
          source: 'catalyst',
          updated_at: null,
          created_at: null,
          comment_count: null,
        });
      });
    }

    epics.forEach((e) => {
      epicSeen.add(e.id);
      // If this epic's own parent_key resolves to an initiative, link it up
      // so the tree builder nests the epic under the initiative row.
      const epicParentKey = (e as any).parent_key as string | null;
      const parentInit = epicParentKey ? initiativesByKey?.get(epicParentKey) : undefined;
      out.push({
        id: e.id,
        type: 'epic',
        key: e.epic_key,
        title: e.name,
        status: e.status,
        priority: e.priority ?? null,
        assignee_name: e.assignee_name ?? null,
        reporter_name: (e as any).reporter_name ?? null,
        business_request_key: parentInit ? parentInit.initiative_key : null,
        parent_id: parentInit?.id ?? null,
        parent_key: parentInit?.initiative_key ?? null,
        parent_label: parentInit?.title ?? null,
        source: e.source ?? 'jira',
        updated_at: e.jira_updated_at ?? null,
        created_at: e.jira_created_at ?? null,
        comment_count: e.comment_count ?? null,
      });
    });

    // Synthesize epic rows from stories' parent info for any epic the
    // useEpicBacklog fetcher didn't return (BAU's epics are older than the
    // 2026 cutoff that hook applies). useStoryBacklog now enriches the
    // epic object on story.feature.epic with real Jira status/priority/
    // assignee/jira_updated_at (2026-04 wiring fix) so the synthesized
    // rows aren't blank "Set status" ghosts any more.
    stories.forEach((s) => {
      const ep = s.feature?.epic as (typeof s.feature extends { epic: infer E } ? E : any) & {
        status?: string | null;
        priority?: string | null;
        assignee_name?: string | null;
        jira_updated_at?: string | null;
        jira_created_at?: string | null;
      } | null | undefined;
      if (ep && !epicSeen.has(ep.id)) {
        epicSeen.add(ep.id);
        // Synthesized epics don't carry parent_key on the BacklogStory.feature
        // shape; when/if BAU epics ever gain a parent_key pointing at an
        // initiative, useEpicBacklog returns them and the branch above
        // handles the linkage. For now synthesized epics float at the top.
        out.push({
          id: ep.id,
          type: 'epic',
          key: ep.epic_key,
          title: ep.name,
          status: ep.status ?? null,
          priority: ep.priority ?? null,
          assignee_name: ep.assignee_name ?? null,
          reporter_name: ep.reporter_name ?? null,
          business_request_key: null,
          parent_id: null,
          parent_key: null,
          parent_label: null,
          source: 'jira',
          updated_at: ep.jira_updated_at ?? null,
          created_at: ep.jira_created_at ?? null,
          comment_count: null,
        });
      }
    });

    // Stories
    stories.forEach((s) => {
      const ep = s.feature?.epic;
      out.push({
        id: s.id,
        type: 'story',
        key: s.story_key,
        title: s.title,
        status: s.status,
        priority: s.priority,
        assignee_name: s.assignee_name ?? null,
        reporter_name: s.reporter_name ?? null,
        business_request_key: null,
        parent_id: ep?.id ?? null,
        parent_key: ep?.epic_key ?? null,
        parent_label: ep?.name ?? null,
        source: s.source ?? 'jira',
        updated_at: s.jira_updated_at ?? null,
        created_at: s.jira_created_at ?? null,
        comment_count: null,
      });
    });
    return out;
  }, [epics, stories, initiativesByKey]);

  // ── Three-level tree: Initiative → Epic → Story.
  //   - Items with parent_id go into childrenOf[parent_id].
  //   - Initiatives always stay top-level.
  //   - Epics without a parent_id also stay top-level.
  //   - Stories with a parent_id nest under their epic.
  //   - Epics with a parent_id (pointing at an initiative) nest under it. ──
  const { topLevel, childrenOf } = useMemo(() => {
    const topLevel: BacklogItem[] = [];
    const childrenOf = new Map<string, BacklogItem[]>();
    items.forEach((it) => {
      if (it.parent_id && (it.type === 'story' || it.type === 'epic' || it.type === 'feature')) {
        if (!childrenOf.has(it.parent_id)) childrenOf.set(it.parent_id, []);
        childrenOf.get(it.parent_id)!.push(it);
      } else {
        topLevel.push(it);
      }
    });
    return { topLevel, childrenOf };
  }, [items]);

  // Flatten tree into visible rows given expandedIds + typeFilter + search + filters.
  const visibleRows: BacklogItem[] = useMemo(() => {
    const out: BacklogItem[] = [];
    const q = search.trim().toLowerCase();
    const matchesText = (it: BacklogItem) =>
      !q ||
      (it.title || '').toLowerCase().includes(q) ||
      (it.key || '').toLowerCase().includes(q) ||
      (it.assignee_name || '').toLowerCase().includes(q);
    const matchesType = (it: BacklogItem) => typeFilter === 'all' || it.type === typeFilter;
    const matchesFilterBar = (it: BacklogItem) => {
      const f = filterValue;
      // Priority filter
      if (f.priority.length && (!it.priority || !f.priority.includes(it.priority as any))) return false;
      // Status filter
      if (f.status.length && (!it.status || !f.status.includes(it.status))) return false;
      // Work type filter (maps to BacklogType for now — Epic / Feature / Story)
      if (f.workType.length) {
        const typeLabel = it.type.charAt(0).toUpperCase() + it.type.slice(1); // story → Story
        if (!f.workType.includes(typeLabel)) return false;
      }
      // Assignee filter
      if (f.assignees.length && (!it.assignee_name || !f.assignees.includes(it.assignee_name))) return false;
      // Reporter filter — sourced from ph_issues.reporter_display_name
      if (f.reporter.length && (!it.reporter_name || !f.reporter.includes(it.reporter_name))) return false;
      // Fix version filter (parent epic maps to a "fix version" in this view)
      if (f.fixVersions.length && (!it.parent_id || !f.fixVersions.includes(it.parent_id))) return false;
      // Updated date range
      if (f.updated.from && (!it.updated_at || it.updated_at < f.updated.from)) return false;
      if (f.updated.to && (!it.updated_at || it.updated_at > f.updated.to + 'T23:59:59')) return false;
      // Created date range
      if (f.created.from && (!it.created_at || it.created_at < f.created.from)) return false;
      if (f.created.to && (!it.created_at || it.created_at > f.created.to + 'T23:59:59')) return false;
      // Reporter + Labels not wired yet (no data plumbed through BacklogItem)
      return true;
    };

    // Track emitted IDs so we never push the same row twice — orphan stories
    // without a parent_id already land in topLevel (the topLevel builder
    // treats them as top-level), so the orphans loop below was double-
    // emitting them. Duplicate-key fix (2026-04-18).
    const emitted = new Set<string>();
    const tryPush = (it: BacklogItem) => {
      if (emitted.has(it.id)) return;
      emitted.add(it.id);
      out.push(it);
    };

    for (const top of topLevel) {
      const topVisible = matchesText(top) && matchesType(top) && matchesFilterBar(top);
      const kids = childrenOf.get(top.id) ?? [];
      const matchingKids = kids.filter((k) => matchesText(k) && matchesType(k) && matchesFilterBar(k));
      if (topVisible) tryPush(top);
      if (expandedIds.has(top.id)) {
        for (const k of matchingKids) tryPush(k);
      }
    }
    // Orphan stories (no parent_id, or parent not in epics list) — show them when stories filter is active.
    if (typeFilter === 'all' || typeFilter === 'story') {
      for (const it of items) {
        if (it.type !== 'story') continue;
        if (!it.parent_id || !topLevel.find((t) => t.id === it.parent_id)) {
          if (matchesText(it) && matchesType(it) && matchesFilterBar(it)) tryPush(it);
        }
      }
    }
    return out;
  }, [topLevel, childrenOf, items, expandedIds, typeFilter, search, filterValue]);

  // ── Sorting ──
  const sortedRows: BacklogItem[] = useMemo(() => {
    if (!sortKey || !sortDir) return visibleRows;
    const s = [...visibleRows];
    const getValue = (it: BacklogItem): string | number => {
      switch (sortKey) {
        case 'key': return it.key || '';
        case 'summary': return (it.title || '').toLowerCase();
        case 'status': return (it.status || '').toLowerCase();
        case 'parent': return (it.parent_label || '').toLowerCase();
        case 'assignee': return (it.assignee_name || '').toLowerCase();
        case 'priority': {
          const i = PRIORITY_ORDER.indexOf((it.priority || '').toLowerCase());
          return i >= 0 ? i : 999;
        }
        case 'updated': return it.updated_at || '';
        default: return '';
      }
    };
    s.sort((a, b) => {
      const av = getValue(a); const bv = getValue(b);
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === 'ASC' ? cmp : -cmp;
    });
    return s;
  }, [visibleRows, sortKey, sortDir]);

  const total = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // Slicing is handled inside JiraTable now (Round H). We keep `total` +
  // `totalPages` available for the count display in the toolbar.

  // Group definitions — built off the sorted (unpaginated) rows. When the
  // user picks a group-by the table trades pagination for grouped sections.
  const groupedRows = useMemo(() => {
    if (groupBy === 'none') return null;
    const groupLabelFor = (it: BacklogItem): string => {
      switch (groupBy) {
        case 'status':   return it.status || 'No status';
        case 'parent':   return it.parent_label || (it.type === 'epic' ? it.title : 'No parent');
        case 'assignee': return it.assignee_name || 'Unassigned';
        case 'priority': return it.priority ? it.priority[0].toUpperCase() + it.priority.slice(1) : 'No priority';
        default: return '—';
      }
    };
    const buckets = new Map<string, BacklogItem[]>();
    for (const it of sortedRows) {
      const k = groupLabelFor(it);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k)!.push(it);
    }
    // Stable group order — alpha, with "No X" / "Unassigned" at the end.
    const keys = Array.from(buckets.keys()).sort((a, b) => {
      const aOrphan = /^(No |Unassigned)/i.test(a);
      const bOrphan = /^(No |Unassigned)/i.test(b);
      if (aOrphan !== bOrphan) return aOrphan ? 1 : -1;
      return a.localeCompare(b);
    });
    return keys.map((k) => ({ id: k, label: k, rows: buckets.get(k)! }));
  }, [groupBy, sortedRows]);

  useEffect(() => { setPage(1); }, [typeFilter, search, filterValue, sortKey, sortDir]);

  // ── Row click → side panel ──
  const openDetail = useCallback((it: BacklogItem) => {
    writeTicketOrigin({
      fromUrl: `/project-hub/${projectKey}/backlog`,
      fromLabel: 'Backlog',
      fromType: 'story-backlog',
    });
    setDetailItemId(it.id);
  }, [projectKey]);
  const closeDetail = useCallback(() => {
    setDetailItemId(null);
    setPanelMode('compact');
  }, []);

  // Prev / next navigation for the side detail panel. Walks through the
  // currently-sorted rows (respecting group/filter/search). Wraps at the ends.
  const currentDetailIdx = useMemo(
    () => (detailItemId ? sortedRows.findIndex((r) => r.id === detailItemId) : -1),
    [detailItemId, sortedRows],
  );
  const navigateDetail = useCallback((dir: 1 | -1) => {
    if (currentDetailIdx < 0 || sortedRows.length === 0) return;
    const nextIdx = (currentDetailIdx + dir + sortedRows.length) % sortedRows.length;
    setDetailItemId(sortedRows[nextIdx].id);
  }, [currentDetailIdx, sortedRows]);

  // j / k keys ALSO navigate the detail panel when it's open — no more
  // having to close the panel to move to the next item.
  useEffect(() => {
    if (!detailItemId) return;
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const inEditor =
        !!active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.isContentEditable);
      if (inEditor) return;
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); navigateDetail(1); }
      if (e.key === 'k' || e.key === 'ArrowUp')   { e.preventDefault(); navigateDetail(-1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [detailItemId, navigateDetail]);

  // ── Toggle expanded ──
  const toggleExpanded = useCallback((it: BacklogItem) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(it.id)) next.delete(it.id); else next.add(it.id);
      return next;
    });
  }, []);
  const hasChildren = useCallback(
    // Both initiatives (with epics under) and epics (with stories under)
    // render expand/collapse carets.
    (it: BacklogItem) =>
      (it.type === 'initiative' || it.type === 'epic') &&
      (childrenOf.get(it.id)?.length ?? 0) > 0,
    [childrenOf],
  );

  // ── Picker options ──
  const assigneeOptions = useMemo<AssigneeOption[]>(() => {
    const m = new Map<string, AssigneeOption>();
    items.forEach((it) => {
      if (it.assignee_name && !m.has(it.assignee_name)) {
        m.set(it.assignee_name, {
          id: it.assignee_name,
          name: it.assignee_name,
          avatarUrl: avatarsByName.get(it.assignee_name.toLowerCase()) ?? null,
        });
      }
    });
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items, avatarsByName]);

  // Reporters — distinct display names across the visible items. Sourced from
  // ph_issues.reporter_display_name (Lovable 2026-04 discovery). We reuse the
  // profile-avatar lookup by name so familiar faces show up if they're also in
  // Catalyst's profiles table; otherwise the avatar falls back to initials.
  const reporterOptions = useMemo<AssigneeOption[]>(() => {
    const m = new Map<string, AssigneeOption>();
    items.forEach((it) => {
      if (it.reporter_name && !m.has(it.reporter_name)) {
        m.set(it.reporter_name, {
          id: it.reporter_name,
          name: it.reporter_name,
          avatarUrl: avatarsByName.get(it.reporter_name.toLowerCase()) ?? null,
        });
      }
    });
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items, avatarsByName]);

  // Parent picker + chip options. Every option carries the Epic type icon
  // so the chip matches Jira's list-view "parent" chip (icon + key + summary).
  const parentOptions = useMemo<ParentChoice[]>(() => {
    return epics
      .map((e) => ({
        id: e.id,
        key: e.epic_key,
        label: e.name,
        icon: <JiraIssueTypeIcon type="Epic" size={12} />,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [epics]);

  // ── Canonical row action list — shared by the ⋯ menu AND the right-click
  //   context menu so there's one source of truth. Order is intentional:
  //   non-destructive items first, destructive items pushed to the bottom
  //   (makeRowActionsCell re-sorts danger into its own section).
  const rowActions = useMemo<RowAction<BacklogItem>[]>(() => ([
    { id: 'open', label: 'Open', icon: <Pencil size={14} />, onClick: (r) => openDetail(r) },
    { id: 'edit', label: 'Edit', icon: <Pencil size={14} />, onClick: (r) => setEditingId(r.id) },
    { id: 'flag', label: 'Flag', icon: <Flag size={14} />, onClick: (r) => flag.info(`Flagged ${r.key || r.id}`) },
    { id: 'duplicate', label: 'Duplicate', icon: <CopyIcon size={14} />,
      onClick: (r) => flag.info('Duplicate', `${r.key} — not yet implemented`),
      hidden: (r) => r.source !== 'catalyst' },
    { id: 'delete', label: 'Delete', icon: <Trash2 size={14} />, danger: true,
      onClick: (r) => setDeleteTarget(r),
      hidden: (r) => r.source !== 'catalyst' },
  ]), [openDetail]);

  // ── Column schema ──
  const columns = useMemo<Column<BacklogItem>[]>(() => ([
    {
      id: '__caret',
      label: '',
      width: 3,
      alwaysVisible: true,
      align: 'center',
      cell: makeCaretCell({
        hasChildren,
        isExpanded: (it) => expandedIds.has(it.id),
        toggle: toggleExpanded,
      }),
    },
    {
      id: 'type',
      label: '',
      width: 3,
      align: 'center',
      alwaysVisible: true,
      cell: makeTypeIconCell((it: BacklogItem) => {
        // Initiatives render with their own pre-joined color/icon (from
        // ph_backlog_initiatives_view). Fall back to the purple Epic lightning
        // if the view row somehow lacks type metadata. Every other backlog
        // type uses our canonical JiraIssueTypeIcon.
        if (it.type === 'initiative') {
          const init = initiativesByKey?.get(it.key || '');
          const bg = init?.initiative_type_color_hex || '#904EE2';
          return (
            <span
              title={init?.initiative_type_label || 'Initiative'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                height: 16,
                borderRadius: 3,
                background: bg,
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {/* Use the first letter of the type key as a glyph — keeps
                  the icon monochrome-simple; when we source the actual
                  initiative_type_icon SVG we can swap it in. */}
              {(init?.initiative_type_key || 'I')[0].toUpperCase()}
            </span>
          );
        }
        const typeMap: Record<Exclude<BacklogType, 'initiative'>, 'Epic' | 'Feature' | 'Story'> = {
          epic: 'Epic', feature: 'Feature', story: 'Story',
        };
        return <JiraIssueTypeIcon type={typeMap[it.type as Exclude<BacklogType, 'initiative'>]} size={16} />;
      }),
    },
    {
      id: 'key',
      label: 'Key',
      width: 9,
      sortable: true,
      defaultVisible: true,
      accessor: (r) => r.key || '',
      cell: makeKeyCell((r: BacklogItem) => r.key),
    },
    {
      id: 'summary',
      label: 'Summary',
      width: 28,
      sortable: true,
      alwaysVisible: true,
      cell: makeSummaryInlineEditCell<BacklogItem>({
        getSummary: (r) => r.title,
        canEdit: (r) => r.source === 'catalyst',
        onChange: (row, next) => updateField.mutate({ id: row.id, source: row.source, patch: { title: next } }),
      }),
    },
    {
      id: 'status',
      label: 'Status',
      // Width = 15 fractions. The longest pill text on BAU today is
      // "Ready for Development" which renders ~153px wide; the column div
      // has horizontal padding that reduces usable width, and the cell
      // wrapper clips on overflow. 15 gives ~180px at typical container
      // widths — enough for every status in the STATUS_OPTIONS vocabulary.
      width: 15,
      sortable: true,
      defaultVisible: true,
      // B.4 verdict: @atlaskit/popup portal mounts on this surface but
      // renders empty content — same issue documented in HANDOVER §5a.
      // ADS theme activation via Phase A tokens did NOT resolve it. The
      // bespoke EditorPopover (portal + manual positioning) remains the
      // only working path. makeStatusEditCellAkPopup is kept in the kit
      // for future experiments once the upstream surface bug is root-caused.
      cell: makeStatusEditCell<BacklogItem>({
        getStatus: (r) => r.status,
        appearanceFor: (s) => statusAppearance(s) as LozengeAppearance,
        labelFor: statusLabel,
        options: STATUS_OPTIONS,
        canEdit: () => true,
        onChange: (row, next) => updateField.mutate({ id: row.id, source: row.source, patch: { status: next } }),
      }),
    },
    {
      id: 'comments',
      label: 'Comments',
      width: 9,
      cell: makeCommentsCell(
        (r: BacklogItem) => r.comment_count,
        // Clicking the cell opens the side panel — users land on Comments
        // via the detail view since inline comment authoring requires
        // the full editor context.
        (r: BacklogItem) => openDetail(r),
      ),
    },
    {
      id: 'parent',
      label: 'Parent',
      width: 14,
      sortable: true,
      defaultVisible: true,
      cell: makeParentEditCell<BacklogItem>({
        getParent: (r) => r.parent_id ? {
          id: r.parent_id,
          key: r.parent_key,
          label: r.parent_label || '',
          icon: <JiraIssueTypeIcon type="Epic" size={12} />,
        } : null,
        options: parentOptions,
        // Editable for any row — Jira-synced items still fail at mutation
        // time with a toast, but the PICKER itself is reachable so users see
        // the affordance. Matches Jira's pattern.
        canEdit: () => true,
        onChange: (row, next) => updateField.mutate({
          id: row.id, source: row.source,
          patch: { parent_id: next?.id ?? null, parent_key: next?.key ?? null },
        }),
      }),
    },
    {
      id: 'assignee',
      label: 'Assignee',
      width: 13,
      sortable: true,
      defaultVisible: true,
      cell: makeAssigneeEditCell<BacklogItem>({
        getAssignee: (r) => r.assignee_name
          ? { id: r.assignee_name, name: r.assignee_name, avatarUrl: avatarsByName.get(r.assignee_name.toLowerCase()) ?? null }
          : null,
        options: assigneeOptions.map<AssigneeChoice>((a) => ({ id: a.id, name: a.name, avatarUrl: a.avatarUrl ?? null })),
        onChange: (row, next) => updateField.mutate({
          id: row.id, source: row.source,
          patch: { assignee_id: next?.id ?? null, assignee_name: next?.name ?? null },
        }),
      }),
    },
    {
      id: 'priority',
      label: 'Priority',
      width: 5,
      sortable: true,
      defaultVisible: true,
      cell: makePriorityEditCell<BacklogItem>({
        getPriority: (r) => r.priority,
        onChange: (row, next) => updateField.mutate({ id: row.id, source: row.source, patch: { priority: next } }),
      }),
    },
    {
      id: 'updated',
      label: 'Updated',
      width: 7,
      sortable: true,
      defaultVisible: true,
      accessor: (r) => r.updated_at || '',
      cell: makeDateCell((r: BacklogItem) => r.updated_at),
    },
    {
      id: '__actions',
      label: '',
      width: 3,
      align: 'end',
      alwaysVisible: true,
      cell: makeRowActionsCell<BacklogItem>({
        // Hide "Open" from the ⋯ menu (the Key cell already opens the panel);
        // keep it in the context menu only so right-clickers get a visible path.
        actions: rowActions.filter((a) => a.id !== 'open'),
      }),
    },
  ]), [expandedIds, toggleExpanded, hasChildren, parentOptions, assigneeOptions, avatarsByName, updateField, rowActions]);

  // ── Panel mode cycling (2026-04-18 drawer redesign).
  //   Drag-to-resize removed — Jira uses a 3-state machine instead.
  //   Expand: compact → expanded (~60% viewport).
  //   Fullscreen: any → fullscreen (100%, table hidden).
  //   Close: resets panelMode to 'compact' and closes the panel.
  const toggleExpanded2 = useCallback(() => {
    setPanelMode((m) => (m === 'compact' ? 'expanded' : 'compact'));
  }, []);
  const toggleFullscreen = useCallback(() => {
    setPanelMode((m) => (m === 'fullscreen' ? 'compact' : 'fullscreen'));
  }, []);

  // Editing state — used by EditBacklogItemModal below.
  const editingItem = useMemo(
    () => (editingId ? items.find((it) => it.id === editingId) ?? null : null),
    [editingId, items],
  );

  // Delete mutation — wired to @atlaskit/modal-dialog confirmation below.
  const deleteItem = useMutation({
    mutationFn: async (item: BacklogItem) => {
      if (item.source !== 'catalyst') {
        throw new Error('Jira-synced items must be deleted in Jira.');
      }
      const { error } = await supabase.from('catalyst_issues').delete().eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: (_data, item) => {
      flag.success(`Deleted ${item.key || item.title}`);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-epics', projectId] });
    },
    onError: (e: Error) => flag.error('Delete failed', e.message),
  });

  // Bulk update + delete — operate on the current `selectedIds` set.
  // Filters to Catalyst-owned rows only; Jira-synced rows are surfaced as a
  // partial-success count so the user knows why N of M weren't applied.
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const bulkUpdate = useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: Record<string, unknown> }) => {
      const editable = items.filter((it) => ids.includes(it.id) && it.source === 'catalyst');
      const skipped = ids.length - editable.length;
      if (editable.length === 0) {
        throw new Error('All selected items are Jira-synced and must be edited in Jira.');
      }
      const { error } = await supabase
        .from('catalyst_issues')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .in('id', editable.map((it) => it.id));
      if (error) throw error;
      return { applied: editable.length, skipped };
    },
    onSuccess: ({ applied, skipped }) => {
      flag.success(
        `Updated ${applied} item${applied === 1 ? '' : 's'}`,
        skipped > 0 ? `${skipped} Jira-synced item${skipped === 1 ? '' : 's'} skipped.` : undefined,
      );
      queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-epics', projectId] });
    },
    onError: (e: Error) => flag.error('Bulk update failed', e.message),
  });
  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const editable = items.filter((it) => ids.includes(it.id) && it.source === 'catalyst');
      const skipped = ids.length - editable.length;
      if (editable.length === 0) {
        throw new Error('All selected items are Jira-synced and must be deleted in Jira.');
      }
      const { error } = await supabase
        .from('catalyst_issues')
        .delete()
        .in('id', editable.map((it) => it.id));
      if (error) throw error;
      return { applied: editable.length, skipped };
    },
    onSuccess: ({ applied, skipped }) => {
      flag.success(
        `Deleted ${applied} item${applied === 1 ? '' : 's'}`,
        skipped > 0 ? `${skipped} Jira-synced item${skipped === 1 ? '' : 's'} skipped.` : undefined,
      );
      setBulkDeleteOpen(false);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-epics', projectId] });
    },
    onError: (e: Error) => flag.error('Bulk delete failed', e.message),
  });

  if (storiesLoading || epicsLoading) {
    return (
      <Box xcss={xcss({ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: 'space.1000' })}>
        <Spinner size="large" label="Loading backlog" />
      </Box>
    );
  }

  // Error state — shows only when BOTH fetchers failed. If only one errors
  // we still render the table from the partial data; a toast already surfaced
  // the failure via TanStack Query's built-in retry path.
  if (backlogError && stories.length === 0 && epics.length === 0) {
    return (
      <Box xcss={xcss({ padding: 'space.400', maxWidth: '720px' })}>
        <SectionMessage
          appearance="error"
          title="Couldn't load backlog"
          actions={[
            {
              key: 'retry',
              text: 'Retry',
              onClick: () => {
                if (storiesError) refetchStories();
                if (epicsError) refetchEpics();
              },
            },
          ]}
        >
          <p style={{ margin: 0 }}>
            {backlogError instanceof Error ? backlogError.message : 'Backlog data couldn\u2019t be fetched.'}
          </p>
        </SectionMessage>
      </Box>
    );
  }

  const isPanelOpen = !!detailItemId;
  const typeCount = {
    all: items.length,
    initiative: items.filter((i) => i.type === 'initiative').length,
    epic: items.filter((i) => i.type === 'epic').length,
    feature: items.filter((i) => i.type === 'feature').length,
    story: items.filter((i) => i.type === 'story').length,
  };

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        // Measured verbatim from Jira BAU list DOM 2026-04-18:
        //   - outer page bg: rgb(233, 242, 254) / #E9F2FE
        //   - font-family: "Atlassian Sans" base stack
        // The white table lives inside this as a rounded card — see the
        // inner wrapper further down.
        fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", sans-serif',
        background: '#E9F2FE',
        padding: 24,
      }}
    >
      {/* White table card — Jira's list view nests the table inside a
          rounded white surface with 8px border-radius sitting on the light-
          blue page background. Measured from Jira DOM 2026-04-18. */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          background: '#FFFFFF',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
      {/* Page header — clean h1, matches Jira's list-view header.
          The page breadcrumb (ProjectHub / BAU) was removed as redundant —
          the top nav already shows location. The bracketed work-item-type
          list was removed as visual noise — Jira never inlines that kind
          of detail in the h1. */}
      <div style={{ padding: '16px 16px 4px' }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: token('color.text', '#172B4D'), letterSpacing: '-0.003em' }}>
          Backlog
        </h1>
      </div>

      {/* Type chips */}
      <div style={{ padding: '12px 16px 6px', display: 'flex', gap: 8 }}>
        {([
          ['all', 'All', typeCount.all],
          ['epic', 'Epics', typeCount.epic],
          ['feature', 'Features', typeCount.feature],
          ['story', 'Stories', typeCount.story],
        ] as const).map(([key, label, count]) => (
          <TypeChip
            key={key}
            active={typeFilter === key}
            onClick={() => setTypeFilter(key as typeof typeFilter)}
            count={count}
          >{label}</TypeChip>
        ))}
      </div>

      {/* Toolbar: search + filter */}
      <div style={{ padding: '6px 16px 10px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 280 }}>
          <Textfield
            isCompact
            placeholder="Search list"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            elemBeforeInput={
              <span style={{ paddingInlineStart: 8, color: token('color.text.subtlest', '#6B778C'), display: 'flex', alignItems: 'center' }}>
                <SearchIcon size={14} />
              </span>
            }
          />
        </div>
        <div style={{ position: 'relative' }}>
          <JiraFilterAtlaskit
            value={filterValue}
            onChange={setFilterValue}
            assignees={assigneeOptions}
            reporters={reporterOptions}
            statuses={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label, appearance: s.appearance }))}
            workTypes={[
              { id: 'Epic',                label: 'Epic',                icon: <JiraIssueTypeIcon type="Epic"    size={14} /> },
              { id: 'Feature',             label: 'Feature',             icon: <JiraIssueTypeIcon type="Feature" size={14} /> },
              { id: 'Story',               label: 'Story',               icon: <JiraIssueTypeIcon type="Story"   size={14} /> },
              { id: 'Task',                label: 'Task',                icon: <JiraIssueTypeIcon type="Task"    size={14} /> },
              { id: 'QA Bug',              label: 'QA Bug',              icon: <JiraIssueTypeIcon type="Bug"     size={14} /> },
              { id: 'Production Incident', label: 'Production Incident', icon: <JiraIssueTypeIcon type="Bug"     size={14} /> },
              { id: 'Change Request',      label: 'Change Request',      icon: <JiraIssueTypeIcon type="Task"    size={14} /> },
              { id: 'Business Gap',        label: 'Business Gap',        icon: <JiraIssueTypeIcon type="Story"   size={14} /> },
              { id: 'API Requirement',     label: 'API Requirement',     icon: <JiraIssueTypeIcon type="Task"    size={14} /> },
            ]}
            fixVersions={epics.map<FixVersionOption>((e) => ({ id: e.id, label: e.epic_key ? `${e.epic_key} — ${e.name}` : e.name }))}
            labels={[]}
          />
        </div>
        {/* Group by — native select kept local; small surface, Atlaskit Select
            is heavier than needed here. The result feeds JiraTable.groups. */}
        <label style={{ fontSize: 12, color: token('color.text.subtlest', '#6B778C') }}>
          Group by:{' '}
          <select
            value={groupBy}
            onChange={(e) => { setGroupBy(e.target.value as typeof groupBy); setCollapsedGroups(new Set()); }}
            style={{
              height: 28,
              padding: '0 6px',
              fontSize: 13,
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: 3,
              background: token('elevation.surface', '#FFFFFF'),
              color: token('color.text', '#172B4D'),
              fontFamily: 'inherit',
            }}
          >
            <option value="none">None</option>
            <option value="status">Status</option>
            <option value="parent">Parent</option>
            <option value="assignee">Assignee</option>
            <option value="priority">Priority</option>
          </select>
        </label>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: token('color.text.subtlest', '#6B778C') }}>
          {total} item{total === 1 ? '' : 's'}
          {selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ''}
        </span>
      </div>

      {/* Bulk actions bar — only visible when selection is non-empty.
          Atlaskit-native: Button primitives + a minimal DropdownMenu-style
          popover for the status/assignee pickers. Delete requires a modal
          confirmation (ModalDialog) before committing. */}
      {selectedIds.size > 0 && (
        <BulkActionsBar
          count={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          statusOptions={STATUS_OPTIONS}
          assigneeOptions={assigneeOptions.map<AssigneeChoice>((a) => ({ id: a.id, name: a.name, avatarUrl: a.avatarUrl ?? null }))}
          onChangeStatus={(next) => bulkUpdate.mutate({ ids: Array.from(selectedIds), patch: { status: next } })}
          onChangeAssignee={(next) => bulkUpdate.mutate({
            ids: Array.from(selectedIds),
            patch: { assignee_id: next?.id ?? null, assignee_name: next?.name ?? null },
          })}
          onDelete={() => setBulkDeleteOpen(true)}
          isBusy={bulkUpdate.isPending || bulkDelete.isPending}
        />
      )}

      {/* Table + panel split — Jira 3-state machine:
           • compact    → table flex:1, panel fixed 400px
           • expanded   → table 40%, panel 60%
           • fullscreen → table hidden, panel 100% */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <div
          style={{
            // Table column width driven by panelMode (no drag-resize).
            ...(isPanelOpen && panelMode === 'fullscreen'
              ? { display: 'none' as const }
              : isPanelOpen && panelMode === 'expanded'
                ? { width: '40%', flexShrink: 0 }
                : isPanelOpen
                  ? { flex: 1 }       // compact — share remainder with fixed 400px panel
                  : { flex: 1 }),     // panel closed — full width
            minWidth: 0,
            overflow: 'auto',
            padding: '4px 16px 16px',
            transition: 'width 150ms ease, flex-basis 150ms ease',
          }}
        >
          <JiraTable<BacklogItem>
            columns={columns}
            data={groupedRows ? undefined : sortedRows}
            groups={groupedRows ?? undefined}
            collapsedGroups={collapsedGroups}
            onToggleGroup={toggleGroup}
            columnVisibility={visibleColumns}
            onColumnVisibilityChange={setVisibleColumns}
            contextMenuActions={rowActions}
            getRowId={(r) => r.id}
            getRowDepth={(r) => {
              // Three-level hierarchy: Initiative (0) → Epic (1) → Story (2).
              if (r.type === 'initiative') return 0;
              if (r.type === 'epic' && r.parent_id) return 1;       // epic under initiative
              if (r.type === 'story' && r.parent_id) {
                // Story under an epic that's under an initiative → depth 2
                // (the epic it's under has parent_id), otherwise depth 1.
                const parent = items.find((it) => it.id === r.parent_id);
                return parent?.parent_id ? 2 : 1;
              }
              return 0;
            }}
            onRowClick={openDetail}
            onEscape={closeDetail}
            selectable
            selection={selectedIds}
            onSelectionChange={setSelectedIds}
            sortKey={sortKey || undefined}
            sortOrder={sortDir || undefined}
            onSortChange={(k, ord) => { setSortKey(k); setSortDir(ord); }}
            rowsPerPage={pageSize}
            page={page}
            onPageChange={setPage}
            density="compact"
            ariaLabel="Unified backlog"
            emptyView={
              <EmptyState
                header="No items match"
                description="Try clearing the search, filters, or chip."
              />
            }
          />

          {/* Inline + Create — one row when no grouping, one per group when
              grouping is active. Each group row is seeded with the group's
              field value so new items land in the correct bucket. */}
          {groupedRows ? (
            groupedRows.map((g) => {
              if (collapsedGroups.has(g.id)) return null;
              const seed: Record<string, unknown> = (() => {
                if (groupBy === 'status') {
                  // Only seed status if the group id matches a real status.
                  const match = STATUS_OPTIONS.find((o) => o.value === g.id || o.label === g.id.toUpperCase());
                  return match ? { status: match.value } : {};
                }
                if (groupBy === 'priority') {
                  return g.id.startsWith('No ') ? {} : { priority: g.id.toLowerCase() };
                }
                if (groupBy === 'parent') {
                  const match = parentOptions.find((p) => p.label === g.id || (p.key && `${p.key} — ${p.label}` === g.id));
                  return match ? { parent_id: match.id, parent_key: match.key } : {};
                }
                if (groupBy === 'assignee') {
                  return g.id === 'Unassigned' ? {} : { assignee_name: g.id };
                }
                return {};
              })();
              return (
                <InlineCreateRow
                  key={`create-${g.id}`}
                  projectId={projectId}
                  typeFilter={typeFilter === 'all' ? 'story' : typeFilter}
                  seedPatch={seed}
                  placeholder={`+ Create in ${g.label}`}
                  onCreated={() => {
                    queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] });
                    queryClient.invalidateQueries({ queryKey: ['backlog-epics', projectId] });
                  }}
                />
              );
            })
          ) : (
            <InlineCreateRow
              projectId={projectId}
              typeFilter={typeFilter === 'all' ? 'story' : typeFilter}
              onCreated={() => {
                queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] });
                queryClient.invalidateQueries({ queryKey: ['backlog-epics', projectId] });
              }}
            />
          )}
        </div>

        {isPanelOpen && (
          <div
            style={{
              // Panel column width driven by panelMode:
              //  compact   → fixed 400px (Jira parity)
              //  expanded  → 60% of viewport
              //  fullscreen→ 100% (table hidden above)
              ...(panelMode === 'fullscreen'
                ? { flex: 1, minWidth: 0 }
                : panelMode === 'expanded'
                  ? { width: '60%', flexShrink: 0 }
                  : { width: 400, flexShrink: 0 }),
              borderLeft: `1px solid ${token('color.border', '#DFE1E6')}`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              transition: 'width 150ms ease',
            }}
          >
            {/* Jira-faithful panel toolbar — Expand / Fullscreen / Close triad.
                Prev/Next row navigation still works via j/k/↑/↓ keyboard. */}
            <div
              role="toolbar"
              aria-label="Detail panel controls"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
                background: token('color.background.neutral.subtle', '#FAFBFC'),
                flexShrink: 0,
              }}
            >
              <DetailNavIconButton
                ariaLabel="Previous item (k)"
                onClick={() => navigateDetail(-1)}
                isDisabled={sortedRows.length < 2}
              >
                <ChevronLeft size={14} />
              </DetailNavIconButton>
              <DetailNavIconButton
                ariaLabel="Next item (j)"
                onClick={() => navigateDetail(1)}
                isDisabled={sortedRows.length < 2}
              >
                <ChevronRight size={14} />
              </DetailNavIconButton>
              <span style={{ fontSize: 12, color: token('color.text.subtlest', '#6B778C'), marginLeft: 4, whiteSpace: 'nowrap' }}>
                {currentDetailIdx >= 0 ? `${currentDetailIdx + 1} of ${sortedRows.length}` : ''}
              </span>
              <span style={{ width: 1, height: 14, background: token('color.border', '#DFE1E6'), margin: '0 4px' }} />
              {/* Atlaskit Breadcrumbs — ProjectHub / KEY / Backlog / ITEM.
                  Handles truncation + overflow disclosure automatically. */}
              {(() => {
                const current = detailItemId ? items.find((it) => it.id === detailItemId) : null;
                const label = current ? (current.key ? `${current.key} \u2014 ${current.title}` : current.title) : '';
                return (
                  <div style={{ minWidth: 0, overflow: 'hidden', flex: '0 1 auto' }}>
                    <Breadcrumbs>
                      <BreadcrumbsItem text="ProjectHub" />
                      <BreadcrumbsItem text={projectKey} />
                      <BreadcrumbsItem text="Backlog" />
                      {label && <BreadcrumbsItem text={label} />}
                    </Breadcrumbs>
                  </div>
                );
              })()}
              <div style={{ flex: 1 }} />
              {/* Jira-faithful icon triad: Expand (←/→) · Fullscreen · Close */}
              <DetailNavIconButton
                ariaLabel={panelMode === 'compact' ? 'Expand panel' : 'Collapse panel'}
                onClick={toggleExpanded2}
                isDisabled={panelMode === 'fullscreen'}
              >
                {panelMode === 'compact' ? <ChevronsLeft size={14} /> : <ChevronsRight size={14} />}
              </DetailNavIconButton>
              <DetailNavIconButton
                ariaLabel={panelMode === 'fullscreen' ? 'Exit fullscreen' : 'Fullscreen'}
                onClick={toggleFullscreen}
              >
                {panelMode === 'fullscreen' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </DetailNavIconButton>
              <DetailNavIconButton ariaLabel="Close panel (Esc)" onClick={closeDetail}>
                <CloseIcon size={14} />
              </DetailNavIconButton>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              <Suspense fallback={<div style={{ padding: 24, color: token('color.text.subtlest', '#6B778C') }}>Loading…</div>}>
                <CatalystDetailRouter
                  isOpen={true}
                  onClose={closeDetail}
                  itemId={detailItemId!}
                  projectId={projectId}
                  projectKey={projectKey}
                  onOpenItem={(id) => setDetailItemId(id)}
                  panelMode={true}
                  onTogglePanelMode={closeDetail}
                />
              </Suspense>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Atlaskit-native Edit modal (replaces shadcn Dialog wrapper).
          Mounts only when editingId is set — ModalTransition handles enter/exit. */}
      <EditBacklogItemModal
        item={editingItem}
        onClose={() => setEditingId(null)}
        onSave={(patch) => {
          if (!editingItem) return;
          updateField.mutate({ id: editingItem.id, source: editingItem.source, patch });
          setEditingId(null);
        }}
      />

      {/* Atlaskit-native Delete confirmation (replaces shadcn AlertDialog wrapper). */}
      <ModalTransition>
        {deleteTarget && (
          <Modal
            onClose={() => setDeleteTarget(null)}
            shouldScrollInViewport
            width="small"
          >
            <ModalHeader>
              <ModalTitle appearance="danger">
                Delete {deleteTarget.type}?
              </ModalTitle>
            </ModalHeader>
            <ModalBody>
              <p style={{ margin: 0, color: token('color.text', '#172B4D'), fontSize: 14 }}>
                <strong>{deleteTarget.key ? `${deleteTarget.key} — ` : ''}{deleteTarget.title}</strong>
              </p>
              <p style={{ marginTop: 12, color: token('color.text.subtlest', '#6B778C'), fontSize: 13 }}>
                This action can&rsquo;t be undone. Any links pointing at this item will break.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                appearance="danger"
                isLoading={deleteItem.isPending}
                onClick={() => deleteItem.mutate(deleteTarget)}
              >
                Delete
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>

      {/* Bulk delete confirmation (ModalDialog) */}
      <ModalTransition>
        {bulkDeleteOpen && (
          <Modal
            onClose={() => setBulkDeleteOpen(false)}
            shouldScrollInViewport
            width="small"
          >
            <ModalHeader>
              <ModalTitle appearance="danger">
                Delete {selectedIds.size} item{selectedIds.size === 1 ? '' : 's'}?
              </ModalTitle>
            </ModalHeader>
            <ModalBody>
              <p style={{ margin: 0, color: token('color.text', '#172B4D'), fontSize: 14 }}>
                You&rsquo;re about to delete <strong>{selectedIds.size}</strong> item{selectedIds.size === 1 ? '' : 's'}.
              </p>
              <p style={{ marginTop: 12, color: token('color.text.subtlest', '#6B778C'), fontSize: 13 }}>
                Jira-synced items will be skipped. This action can&rsquo;t be undone.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setBulkDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                appearance="danger"
                isLoading={bulkDelete.isPending}
                onClick={() => bulkDelete.mutate(Array.from(selectedIds))}
              >
                Delete
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>

      {/* Single FlagsHost for this route — picks up every showFlag()/flag.* call. */}
      <FlagsHost />
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────────────────────── */

function TypeChip({
  active, count, onClick, children,
}: { active: boolean; count: number; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 32,
        padding: '0 14px',
        borderRadius: 16,
        border: `1px solid ${active ? token('color.border.selected', '#0C66E4') : token('color.border', '#DFE1E6')}`,
        background: active ? token('color.background.selected', '#E9F2FF') : token('elevation.surface', '#FFFFFF'),
        color: active ? token('color.text.selected', '#0055CC') : token('color.text.subtle', '#42526E'),
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 120ms ease',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'); }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = token('elevation.surface', '#FFFFFF'); }}
    >
      <span>{children}</span>
      <span style={{
        padding: '0 6px',
        borderRadius: 10,
        background: active ? 'rgba(12,102,228,0.16)' : token('color.background.neutral', '#F1F2F4'),
        color: active ? token('color.text.selected', '#0055CC') : token('color.text.subtle', '#42526E'),
        fontSize: 11,
        fontWeight: 700,
        minWidth: 20,
        textAlign: 'center',
      }}>{count}</span>
    </button>
  );
}

function InlineCreateRow({
  projectId,
  typeFilter,
  seedPatch,
  placeholder,
  onCreated,
}: {
  projectId: string;
  typeFilter: BacklogType;
  /** Extra fields pre-applied on create — e.g. `{ status: 'In Progress' }`
   *  when this row lives under the "In Progress" group so new items land in
   *  the right bucket. */
  seedPatch?: Record<string, unknown>;
  placeholder?: string;
  onCreated: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [summary, setSummary] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (isEditing) inputRef.current?.focus(); }, [isEditing]);

  const reset = () => { setSummary(''); setIsEditing(false); };
  const create = async () => {
    const title = summary.trim();
    if (!title || !projectId) { reset(); return; }
    try {
      const issueType = typeFilter === 'epic' ? 'Epic' : typeFilter === 'feature' ? 'Feature' : 'Story';
      const { error } = await supabase.from('catalyst_issues').insert({
        project_id: projectId,
        title,
        issue_type: issueType,
        status: 'To Do',
        priority: 'medium',
        ...(seedPatch || {}),
      });
      if (error) throw error;
      flag.success(`Created "${title}"`);
      reset();
      onCreated();
    } catch {
      flag.error('Failed to create');
    }
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '10px 12px', marginTop: 4,
          border: '1px dashed transparent', borderRadius: 4,
          background: 'transparent', color: token('color.text.subtlest', '#6B778C'),
          fontSize: 13, fontWeight: 500, textAlign: 'left',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7');
          (e.currentTarget as HTMLElement).style.borderColor = token('color.border', '#DFE1E6');
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
        }}
      >
        <Plus size={14} />
        {placeholder || `Create ${typeFilter}`}
      </button>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', marginTop: 4,
      border: `1px solid ${token('color.border.focused', '#0C66E4')}`, borderRadius: 4, background: token('elevation.surface', '#FFFFFF'),
    }}>
      <JiraIssueTypeIcon type={typeFilter === 'epic' ? 'Epic' : typeFilter === 'feature' ? 'Feature' : 'Story'} size={16} />
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
          flex: 1, height: 28, border: 'none', outline: 'none',
          fontSize: 14, color: token('color.text', '#172B4D'), fontFamily: 'inherit', background: 'transparent',
        }}
      />
    </div>
  );
}

/**
 * BulkActionsBar — appears when selection.size > 0.
 *
 * Atlaskit-native composition: an inline row of Atlaskit Buttons + Lozenges
 * hosting a minimal popover for status/assignee selection. Uses the same
 * portal-based popover pattern as editors.tsx so it escapes any
 * overflow:hidden container.
 *
 * CTAs emitted:
 *   - Change status  → onChangeStatus(statusValue)
 *   - Assign         → onChangeAssignee(choice | null)
 *   - Delete         → onDelete()  (parent owns the ModalDialog confirm)
 *   - Clear          → onClear()
 */
function BulkActionsBar({
  count,
  onClear,
  statusOptions,
  assigneeOptions,
  onChangeStatus,
  onChangeAssignee,
  onDelete,
  isBusy,
}: {
  count: number;
  onClear: () => void;
  statusOptions: StatusOption[];
  assigneeOptions: AssigneeChoice[];
  onChangeStatus: (value: string) => void;
  onChangeAssignee: (choice: AssigneeChoice | null) => void;
  onDelete: () => void;
  isBusy: boolean;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        margin: '0 16px 10px',
        padding: '8px 12px',
        background: token('color.background.selected', '#E9F2FF'),
        border: `1px solid ${token('color.border.accent.blue', '#B3D4FF')}`,
        borderRadius: 4,
        fontSize: 13,
        color: token('color.text.accent.blue.bolder', '#0747A6'),
      }}
    >
      <strong style={{ fontSize: 13 }}>{count} selected</strong>
      <div style={{ width: 1, height: 18, background: token('color.border.accent.blue', '#B3D4FF') }} />
      <BulkPopover label="Change status" width={240}>
        {(close) => (
          <>
            <div style={{ padding: '6px 8px 2px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: token('color.text.subtlest', '#6B778C') }}>Status</div>
            {statusOptions.map((opt) => (
              <BulkMenuItem
                key={opt.value}
                onClick={() => { onChangeStatus(opt.value); close(); }}
              >
                {opt.label}
              </BulkMenuItem>
            ))}
          </>
        )}
      </BulkPopover>
      <BulkPopover label="Assign" width={280}>
        {(close) => (
          <>
            <BulkMenuItem onClick={() => { onChangeAssignee(null); close(); }}>Unassigned</BulkMenuItem>
            {assigneeOptions.slice(0, 12).map((a) => (
              <BulkMenuItem key={a.id} onClick={() => { onChangeAssignee(a); close(); }}>
                {a.name}
              </BulkMenuItem>
            ))}
          </>
        )}
      </BulkPopover>
      <Button appearance="danger" onClick={onDelete} isDisabled={isBusy}>
        Delete
      </Button>
      <div style={{ flex: 1 }} />
      <Button appearance="subtle" onClick={onClear} isDisabled={isBusy}>
        Clear selection
      </Button>
    </div>
  );
}

// Minimal popover used by the bulk bar — same portal trick as editors.tsx.
// Local to this page so we don't export another version from the kit.
function BulkPopover({
  label,
  width = 240,
  children,
}: {
  label: string;
  width?: number;
  children: (close: () => void) => React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const update = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      setAnchor({ top: r.bottom + 4, left: r.left });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  // Use a raw button here instead of Atlaskit Button — the bulk-bar context
  // is an action bar styled with a blue tint, and Atlaskit Button's default
  // background is neutral; matching the surrounding chrome is more important
  // than adopting the primitive here. Token colours keep it theme-aware.
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsOpen((v) => !v); }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          borderRadius: 3,
          background: token('elevation.surface', '#FFFFFF'),
          border: `1px solid ${token('color.border.accent.blue', '#B3D4FF')}`,
          color: token('color.text.accent.blue.bolder', '#0747A6'),
          fontSize: 13,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {label} ▾
      </button>
      {isOpen && anchor && ReactDOM.createPortal(
        <div
          ref={popRef}
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: anchor.top,
            left: anchor.left,
            zIndex: 1000,
            minWidth: width,
            background: token('elevation.surface', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: 4,
            boxShadow: '0 1px 1px rgba(9,30,66,0.25), 0 8px 24px -4px rgba(9,30,66,0.18)',
            padding: 4,
            maxHeight: 360,
            overflowY: 'auto',
            fontFamily: 'inherit',
            color: token('color.text', '#172B4D'),
          }}
        >
          {children(() => setIsOpen(false))}
        </div>,
        document.body,
      )}
    </>
  );
}

// Minimal Atlaskit-style icon button used by the detail panel prev/next
// toolbar. Matches the icon-button dimensions used elsewhere in the file.
function DetailNavIconButton({
  children,
  ariaLabel,
  onClick,
  isDisabled,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  onClick: () => void;
  isDisabled?: boolean;
}) {
  const btn = (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={isDisabled}
      style={{
        width: 24,
        height: 24,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        background: 'transparent',
        color: isDisabled ? token('color.text.disabled', '#C1C7D0') : token('color.text.subtle', '#42526E'),
        cursor: isDisabled ? 'default' : 'pointer',
        borderRadius: 3,
      }}
      onMouseEnter={(e) => { if (!isDisabled) (e.currentTarget as HTMLElement).style.background = token('color.background.neutral.hovered', '#EBECF0'); }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
  // Atlaskit tooltip — matches Jira's hover affordance on icon-only buttons.
  // Disabled buttons still get the tooltip so users see WHY it's disabled.
  return <Tooltip content={ariaLabel} position="bottom">{btn}</Tooltip>;
}

function BulkMenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '8px 10px',
        border: 'none',
        background: 'transparent',
        color: token('color.text', '#172B4D'),
        fontSize: 14,
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'inherit',
        borderRadius: 3,
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', '#F4F5F7'))}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
    >
      {children}
    </button>
  );
}

/**
 * Edit modal for a single backlog item — Atlaskit ModalDialog + Textfield.
 * Replaces the previous shadcn Dialog wrapper. Editing is intentionally
 * minimal (Title / Status); fuller field-level edits happen via inline
 * editors in the table or the side detail panel.
 */
function EditBacklogItemModal({
  item,
  onClose,
  onSave,
}: {
  item: BacklogItem | null;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [status, setStatus] = useState<string | null>(item?.status ?? null);

  // Re-seed when the targeted item changes (reopen on a different row).
  useEffect(() => {
    setTitle(item?.title ?? '');
    setStatus(item?.status ?? null);
  }, [item]);

  const isJiraSynced = item?.source !== 'catalyst';
  const dirty = !!item && (title !== (item.title ?? '') || status !== (item.status ?? null));

  return (
    <ModalTransition>
      {item && (
        <Modal onClose={onClose} shouldScrollInViewport width="medium">
          <ModalHeader>
            <ModalTitle>
              Edit {item.type}{item.key ? ` · ${item.key}` : ''}
            </ModalTitle>
          </ModalHeader>
          <ModalBody>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: token('color.text.subtle', '#42526E'), marginBottom: 4 }}>
              Title
            </label>
            <Textfield
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              isDisabled={isJiraSynced}
              placeholder="Item title"
            />

            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: token('color.text.subtle', '#42526E'), marginTop: 16, marginBottom: 4 }}>
              Status
            </label>
            <select
              value={status ?? ''}
              onChange={(e) => setStatus(e.target.value || null)}
              disabled={isJiraSynced}
              style={{
                width: '100%',
                height: 36,
                padding: '0 10px',
                border: `1px solid ${token('color.border', '#DFE1E6')}`,
                borderRadius: 3,
                fontSize: 14,
                fontFamily: 'inherit',
                background: isJiraSynced ? token('color.background.neutral.subtle.hovered', '#F4F5F7') : token('elevation.surface', '#FFFFFF'),
                color: token('color.text', '#172B4D'),
              }}
            >
              <option value="">— Not set —</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {isJiraSynced && (
              <p style={{ marginTop: 12, fontSize: 12, color: token('color.text.subtlest', '#7A869A'), fontStyle: 'italic' }}>
                This item is synced from Jira and must be edited there.
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>Cancel</Button>
            <Button
              appearance="primary"
              isDisabled={isJiraSynced || !dirty || !title.trim()}
              onClick={() => onSave({ title: title.trim(), status })}
            >
              Save
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
