// @ts-nocheck
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
import DropdownMenu, { DropdownItemRadioGroup, DropdownItemRadio } from '@atlaskit/dropdown-menu';
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

import { useStoryBacklog, useEpicBacklog, useInitiativesByKeys, useInitiativeLinksByEpicKeys } from '../hooks/useBacklogData';
import { useProject } from '@/hooks/useProjects';
import { DangerConfirmModal } from '@/components/shared/DangerConfirmModal';
import type { InitiativeRow } from '../hooks/useBacklogData';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { STORY_STATUS_LOZENGE, getPriorityLabel } from '../utils/backlog.utils';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useAtlaskitThemeSync } from '../components/SubtasksPanel/atlaskitTheme';
import { writeTicketOrigin } from '../hooks/useTicketOrigin';
import { generateIssueKey } from '@/modules/project-work-hub/lib/generateIssueKey';
import { jiraSyncService } from '@/services/jira-sync.service';
import { JiraFilterAtlaskit, emptyFilterValue } from '@/components/shared/JiraFilterAtlaskit';
import type {
  JiraFilterValue,
  AssigneeOption,
  FixVersionOption,
} from '@/components/shared/JiraFilterAtlaskit';
import { Search as SearchIcon, Plus, Pencil, Trash2, Flag, Copy as CopyIcon, ChevronLeft, ChevronRight, X as CloseIcon, Maximize2, Minimize2, ChevronsLeft, ChevronsRight, CircleUser } from 'lucide-react';

// Apr 19, 2026 — U-4 (BAU Dashboard Atlaskit Conversion handover §2):
// migrated outer page wrapper (blue page bg + white card + h1) onto the
// shared AtlaskitPageShell so this surface tracks the Dashboard's shell
// padding (currently 8px) instead of carrying its own bespoke 24px.
import { AtlaskitPageShell } from '@/components/ads';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

/* ─── Unified model ────────────────────────────────────────────────────── */

/**
 * BacklogType — rows in the unified backlog surface.
 * - 'initiative' (Catalyst-native, from ph_initiatives) sits at depth 0
 *   and is the "Business Request" layer the ERD describes.
 * - 'epic' / 'feature' / 'story' come from Jira + Catalyst work-item
 *   tables.
 */
/** Apr 27, 2026 — Backlog scope expansion: 'bug' (QA Bug) and 'incident'
 *  (Production Incident) are now first-class leaf types alongside 'story'.
 *  The unified Backlog view fetches all three from ph_issues and renders
 *  pill filters for each. */
export type BacklogType = 'initiative' | 'epic' | 'feature' | 'story' | 'bug' | 'incident';

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
  /** Apr 27, 2026 (L54): parent's actual Jira issue_type ('Epic' |
   *  'Feature' | 'Story' | 'Task' etc.) — used by the Parent column
   *  cell to render the correct icon (was hardcoded as Epic, causing
   *  BAU-4466 — a Feature — to render as a purple lightning bolt in
   *  the Parent column while showing as a green checkbox elsewhere
   *  in the rail). null when no parent. */
  parent_issue_type: string | null;
  source: 'jira' | 'catalyst';
  updated_at: string | null;
  created_at: string | null;
  comment_count: number | null;
}

/* ─── Status mapping (shared with Story Backlog) ────────────────────────── */

function statusAppearance(status: string | null | undefined): LozengeAppearance {
  if (!status) return 'default';
  // `STORY_STATUS_LOZENGE.color` is now the Atlaskit appearance token directly
  // (§20 / L41 migration). Pass it through; fall back to 'default' for unknown.
  const cfg = STORY_STATUS_LOZENGE[status];
  return (cfg?.color as LozengeAppearance) ?? 'default';
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
  // Apr 27, 2026 (L50): canonical Project Hub page-title pattern is
  // `{Project Name} {Hub Function}` — e.g. "Senaei BAU Backlog". Falls
  // back to the project key while the name is loading. Same pattern
  // should be applied to every Project Hub surface (Dashboard, Board,
  // Roadmap, etc.) — see the L50 lesson note for the sweep target list.
  const { data: project } = useProject(projectId);
  const projectDisplayName = project?.name || projectKey;
  const pageTitle = `${projectDisplayName} Backlog`;
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
  // Resolve initiative links via ph_issue_links (Apr 2026 InitiativeLinkedItemsTab
  // path). Map<epic_issue_key, initiative_key>. This is the SECOND linkage path
  // alongside ph_issues.parent_key.
  const epicKeysForLinks = useMemo(
    () => epics.map((e) => e.epic_key).filter(Boolean) as string[],
    [epics],
  );
  const { data: epicLinkedInitiativeByKey } = useInitiativeLinksByEpicKeys(epicKeysForLinks);

  const initiativeCandidateKeys = useMemo(() => {
    const keys = new Set<string>();
    epics.forEach((e) => {
      const pk = (e as any).parent_key;
      if (pk) keys.add(pk);
      // Also include initiatives linked via ph_issue_links.
      const linkedInit = epicLinkedInitiativeByKey?.get(e.epic_key);
      if (linkedInit) keys.add(linkedInit);
    });
    stories.forEach((s) => {
      // Story parents are epics — but occasionally a story's parent_key
      // could ALSO be an initiative_key directly if the team skipped epic
      // as a layer. Include them in the lookup.
      const ek = s.feature?.epic?.epic_key;
      if (ek) keys.add(ek);
    });
    return Array.from(keys);
  }, [epics, stories, epicLinkedInitiativeByKey]);
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
  // Apr 27, 2026 (L44): track the most recently viewed detail item so the
  // "Maximize table" toolbar button can act as a toggle — when the rail
  // is closed via Maximize, this lets the same button restore the last
  // panel without the user having to re-click a row. Cleared when the
  // user explicitly closes via the rail's X (intentional dismissal).
  const [lastDetailId, setLastDetailId] = useState<string | null>(null);
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
  // containerRef was declared + attached to the outer wrapper but never
  // read anywhere in this module. Removed Apr 19, 2026 as part of the
  // AtlaskitPageShell migration (handover §4 step (b)). `useRef` import
  // is still needed — JiraTable passes its own refs through helpers.

  const pageSize = 25;

  // ── Mutations ──
  // F-iter9 unification + F14 hard rule: ALL rows (Jira + Catalyst) are
  // editable. Writes always land in ph_issues. For source='jira' rows we
  // additionally queue a write-back to the Atlassian tenant (moderator-
  // approved). Field map: Catalyst's `title` → ph_issues' `summary` for
  // the queueWriteBack hand-off. `updated_at` on the patch is renamed to
  // `jira_updated_at` to match ph_issues.
  const JIRA_FIELD_MAP: Record<string, string> = {
    title: 'summary',
  };
  const updateField = useMutation({
    mutationFn: async ({ id, source, patch }: { id: string; source?: string; patch: Record<string, unknown> }) => {
      // Step 1 — local cache write to ph_issues (canonical source of truth).
      // Map any catalyst-style field names in the patch to their ph_issues
      // equivalents (title→summary). updated_at→jira_updated_at.
      const phPatch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(patch)) {
        if (k === 'updated_at') continue;
        phPatch[JIRA_FIELD_MAP[k] || k] = v;
      }
      phPatch.jira_updated_at = new Date().toISOString();
      // F-iter9 PK fix: ph_issues PK is issue_key, not id. The `id` parameter
      // is actually the row's issue_key (BacklogItem.id is populated from
      // issue_key per useBacklogData).
      const { error: cacheError } = await supabase
        .from('ph_issues')
        .update(phPatch)
        .eq('issue_key', id);
      if (cacheError) throw cacheError;

      // Step 2 — for Jira-sourced rows, queue write-back per field.
      // Best-effort: if the jira_write_back_queue infra is missing/broken,
      // swallow the error so the user's local edit still persists. Track via
      // console.warn so we surface this in Sentry/logs without breaking UX.
      if (source === 'jira') {
        for (const [field, value] of Object.entries(patch)) {
          if (field === 'updated_at') continue;
          const jiraField = JIRA_FIELD_MAP[field] || field;
          try {
            await jiraSyncService.queueWriteBack(id, jiraField, String(value));
          } catch (qErr) {
            console.warn('[updateField] queueWriteBack failed (non-fatal)', { id, field: jiraField, qErr });
          }
        }
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['backlog-stories-v2', projectId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-epics', projectId] });
      if (variables.source === 'jira') {
        flag.success('Updated', 'Change queued for Jira sync approval');
      } else {
        flag.success('Updated');
      }
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
          parent_issue_type: null,
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
      // so the tree builder nests the epic under the initiative row. As a
      // fallback, honor ph_issue_links rows from the InitiativeLinkedItemsTab.
      const epicParentKey = (e as any).parent_key as string | null;
      const linkedInitKey = epicLinkedInitiativeByKey?.get(e.epic_key) ?? null;
      const resolvedParentKey = epicParentKey ?? linkedInitKey;
      const parentInit = resolvedParentKey ? initiativesByKey?.get(resolvedParentKey) : undefined;
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
        parent_issue_type: parentInit ? 'Initiative' : null,
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
          parent_issue_type: null,
          source: 'jira',
          updated_at: ep.jira_updated_at ?? null,
          created_at: ep.jira_created_at ?? null,
          comment_count: null,
        });
      }
    });

    // Leaf rows (Story / QA Bug / Production Incident).
    // Apr 27, 2026: useStoryBacklog now fetches all three issue types in
    // one query. Map ph_issues.issue_type → BacklogItem.type so the pill
    // filters and Group-by-Type logic can split them correctly. Anything
    // else (older rows missing issue_type) defaults to 'story' to preserve
    // historical behaviour.
    const leafTypeFromIssueType = (it: string | null | undefined): 'story' | 'bug' | 'incident' => {
      if (it === 'QA Bug') return 'bug';
      if (it === 'Production Incident') return 'incident';
      return 'story';
    };
    stories.forEach((s) => {
      const ep = s.feature?.epic;
      // Apr 27, 2026 (L52): fall back to raw parent_key/parent_summary
      // from ph_issues when the parent isn't an Epic (so QA Bug +
      // Production Incident rows linked to Stories/Features still render
      // a parent in the table column). Epic-parent rows keep their
      // existing rich epic_key + name + status enrichment via `ep`.
      const rawParentKey = (s as any).parent_key as string | null | undefined;
      const rawParentSummary = (s as any).parent_summary as string | null | undefined;
      const parentId = ep?.id ?? rawParentKey ?? null;
      const parentKey = ep?.epic_key ?? rawParentKey ?? null;
      const parentLabel = ep?.name ?? rawParentSummary ?? null;
      // L54: parent's real issue_type from epicMap. The parent might be a
      // Feature/Story/Task (not an Epic), so this drives the Parent column's
      // icon canonically — no more hardcoded purple Epic lightning.
      const parentIssueType = (ep as any)?.issue_type ?? null;
      out.push({
        id: s.id,
        type: leafTypeFromIssueType((s as any).issue_type),
        key: s.story_key,
        title: s.title,
        status: s.status,
        priority: s.priority,
        assignee_name: s.assignee_name ?? null,
        reporter_name: s.reporter_name ?? null,
        business_request_key: null,
        parent_id: parentId,
        parent_key: parentKey,
        parent_label: parentLabel,
        parent_issue_type: parentIssueType,
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

    // Jira parity (2026-04-27): when typeFilter='all', the list is FLAT
     // (matches Jira's list view, e.g. /jira/software/c/projects/BAU/list).
     // Catalyst's tree view only emitted children when the parent epic was
     // in expandedIds — so with all 11 epics collapsed by default, the
     // user saw "135 items" instead of the actual 243. Force-expand all
     // parents on the "All" tab; other tabs preserve the manual tree.
    const flattenAll = typeFilter === 'all';
    for (const top of topLevel) {
      const topVisible = matchesText(top) && matchesType(top) && matchesFilterBar(top);
      const kids = childrenOf.get(top.id) ?? [];
      const matchingKids = kids.filter((k) => matchesText(k) && matchesType(k) && matchesFilterBar(k));
      if (topVisible) tryPush(top);
      if (flattenAll || expandedIds.has(top.id)) {
        for (const k of matchingKids) tryPush(k);
      }
    }
    // Orphan leaf rows (no parent_id, or parent not in epics list).
    // Apr 27, 2026: extended from 'story' only to also cover 'bug' and
    // 'incident' so the new Defects + Incidents pills surface their
    // unparented items. The matchesType() guard ensures the filter still
    // narrows correctly on each pill.
    if (typeFilter === 'all' || typeFilter === 'story' || typeFilter === 'bug' || typeFilter === 'incident') {
      for (const it of items) {
        if (it.type !== 'story' && it.type !== 'bug' && it.type !== 'incident') continue;
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
    // Explicit close via rail's X — clear the restore memory.
    setLastDetailId(null);
    setDetailItemId(null);
    setPanelMode('compact');
  }, []);
  // Maximize-table — close the rail BUT remember what was open so the
  // toolbar button can restore it. Used by the "Maximize table" button.
  const maximizeTable = useCallback(() => {
    setLastDetailId((prev) => prev ?? detailItemId);
    setDetailItemId(null);
    setPanelMode('compact');
  }, [detailItemId]);
  // Restore the last panel that was maximized away.
  const restoreDetail = useCallback(() => {
    if (!lastDetailId) return;
    setDetailItemId(lastDetailId);
    setLastDetailId(null);
  }, [lastDetailId]);

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
  // F8 (iter-9): __caret column dropped — caret affordance folded into the
  // Type col cell renderer instead (matches Jira's inline expand pattern).
  // F9 (iter-9): Type col widened from width:3 (~40px) to width:9 (~108px).
  const columns = useMemo<Column<BacklogItem>[]>(() => ([
    {
      id: 'type',
      label: '',
      width: 9,
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
        // Apr 27, 2026 — Backlog scope expansion: map 'bug' and 'incident'
        // to the canonical Jira issue-type strings expected by
        // JiraIssueTypeIcon. CLAUDE.md §11 calls these out as 'QA Bug'
        // (red asterisk #E5493A) and 'Production Incident' (orange
        // question-circle #F97316). size=16 keeps every leaf row's icon
        // at one consistent visual size — the misalignment the user
        // surfaced earlier was actually a size mismatch from JiraIssueTypeIcon
        // rendering different glyphs at different intrinsic heights.
        const typeMap: Record<Exclude<BacklogType, 'initiative'>, string> = {
          epic: 'Epic',
          feature: 'Feature',
          story: 'Story',
          bug: 'QA Bug',
          incident: 'Production Incident',
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
        // Iron dome OPEN (2026-04-27 audit). Every row is inline-editable.
        // The unified architecture is: catalyst rows write directly to
        // ph_issues; jira-sourced rows write to ph_issues optimistically
        // AND queue a write-back via jira_write_back_queue (the gate at
        // BacklogPage.atlaskit.tsx:387 in updateField.mutate routes the
        // queue insert on source==='jira'). The factory's optional
        // canEdit / getReadOnlyTooltip props are kept available in
        // editors.tsx for other surfaces that may want them, but BAU
        // backlog deliberately does not constrain edits by source.
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
      // Apr 27, 2026 (L61): default visible — Jira's list view shows
      // Comments column at position 5 between Status and Parent. Probed
      // against Jira BAU list "1 comment" / "Add comment" cells.
      defaultVisible: true,
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
          // Apr 27, 2026 (L68): size bumped 12→16 so the SVG renders at
          // its native designed size (story-16.svg, bug-16.svg, etc.)
          // — the 0.75× scale at size=12 caused sub-pixel rendering
          // jitter that made adjacent rows' icons LOOK like different
          // shapes even when they were the same source SVG. 16×16 is
          // pixel-perfect at 1× zoom and aligns with the row-1 type
          // icon's size (also 16).
          icon: <JiraIssueTypeIcon type={r.parent_issue_type || 'Story'} size={16} />,
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
      // Apr 27, 2026 (L65): width bumped 7→12 to fit the new bordered
      // calendar chip ("📅 27 Apr 26") without truncating to "27 A".
      // 7% of 1280 = 89px which left only ~39px for text after the
      // chip's icon+gap+padding+border (~50px). 12% = 154px is enough.
      label: 'Updated',
      width: 12,
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
      // F-iter9 unification: Catalyst-native rows live in ph_issues with
      // source='catalyst'. Delete by id (PK) — id values are unique across
      // sources so the source filter is belt-and-suspenders.
      // F-iter9 PK fix: ph_issues PK is issue_key (item.id is populated from issue_key).
      const { error } = await supabase.from('ph_issues').delete().eq('issue_key', item.id).eq('source', 'catalyst');
      if (error) throw error;
    },
    onSuccess: (_data, item) => {
      flag.success(`Deleted ${item.key || item.title}`);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['backlog-stories-v2', projectId] });
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
      // F-iter9 unification: Catalyst-native rows are in ph_issues, source='catalyst'.
      // Map catalyst-only `updated_at` to ph_issues `jira_updated_at`.
      // PK fix: ph_issues PK is issue_key — BacklogItem.id is populated from issue_key.
      const { error } = await supabase
        .from('ph_issues')
        .update({ ...patch, jira_updated_at: new Date().toISOString() })
        .in('issue_key', editable.map((it) => it.id))
        .eq('source', 'catalyst');
      if (error) throw error;
      return { applied: editable.length, skipped };
    },
    onSuccess: ({ applied, skipped }) => {
      flag.success(
        `Updated ${applied} item${applied === 1 ? '' : 's'}`,
        skipped > 0 ? `${skipped} Jira-synced item${skipped === 1 ? '' : 's'} skipped.` : undefined,
      );
      queryClient.invalidateQueries({ queryKey: ['backlog-stories-v2', projectId] });
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
      // F-iter9 unification + PK fix: ph_issues PK is issue_key.
      const { error } = await supabase
        .from('ph_issues')
        .delete()
        .in('issue_key', editable.map((it) => it.id))
        .eq('source', 'catalyst');
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
      queryClient.invalidateQueries({ queryKey: ['backlog-stories-v2', projectId] });
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
    bug: items.filter((i) => i.type === 'bug').length,
    incident: items.filter((i) => i.type === 'incident').length,
  };

  // Apr 27, 2026 (L48): Maximize/Restore icon now lives in the toolbar,
  // immediately right of "N items" so the label sits to its LEFT (per
  // user request — earlier iter put it in the page header's actions slot
  // which left the label and icon vertically stacked at different y's).
  // Defined as a JSX expression so we can drop it inline in the toolbar.
  const toolbarMaximizeIcon = isPanelOpen ? (
    <Tooltip content="Maximize table — closes the detail panel">
      <button
        type="button"
        onClick={maximizeTable}
        aria-label="Maximize table"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, padding: 0, marginLeft: 8,
          border: 'none', background: 'transparent', borderRadius: 3,
          color: token('color.text.subtle', '#42526E'), cursor: 'pointer',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#E4E6EA'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Maximize2 size={16} />
      </button>
    </Tooltip>
  ) : lastDetailId ? (
    <Tooltip content="Restore detail panel">
      <button
        type="button"
        onClick={restoreDetail}
        aria-label="Restore detail panel"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, padding: 0, marginLeft: 8,
          border: 'none', background: 'transparent', borderRadius: 3,
          color: token('color.text.subtle', '#42526E'), cursor: 'pointer',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#E4E6EA'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Minimize2 size={16} />
      </button>
    </Tooltip>
  ) : null;

  // Apr 27, 2026 (L46): Compact rail is routed through AtlaskitPageShell's
  // `sideRail` prop so it extends to the TOP of the page card alongside the
  // H1 — matching Jira's pattern where the rail starts at y=67 alongside
  // "Senaei BAU" project header (probed). Expanded/fullscreen modes keep
  // their existing rendering (expanded uses the inline 60% column,
  // fullscreen uses position:fixed modal with backdrop).
  const useRailAsSideSlot = isPanelOpen && panelMode === 'compact';

  // Inner content shared by sideRail compact rendering AND the fullscreen
  // modal — keeps "Catalyst work item" + toolbar + scrollable detail one
  // source of truth.
  // Apr 27, 2026 (L47): merged the "Catalyst work item" label band and
  // the panel controls into ONE row to mirror Jira's pattern
  // (`☑ Jira work item .......... ↗ ⤢ ×`). Dropped the second toolbar
  // row entirely along with the Prev/Next chevrons and the "1 of N"
  // counter — Jira's rail has neither (verified by probe of
  // platform-issue-preview-panel.preview-panel-expand-btn at y=68).
  // Row navigation still works via j/k keyboard shortcuts (see
  // useEffect that registers them).
  const railInnerContent = !isPanelOpen ? null : (
    <>
      {/* Single header row — label on left, controls on right.
          Bottom border = horizontal divider that Jira shows after the
          "Jira work item" label. Removed Prev/Next + counter (no Jira
          equivalent). */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px 10px 14px',
          flexShrink: 0,
          background: '#F4F5F7',
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
          minHeight: 44,
        }}
      >
        {/* Label group — Atlaskit-style checkbox-in-square + text */}
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          width: 20, height: 20, borderRadius: 4,
          background: token('color.icon.accent.blue', '#1868DB'),
          color: '#FFFFFF', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
        }}>✓</span>
        <span style={{
          fontSize: 14, fontWeight: 653,
          color: token('color.text', '#172B4D'),
          letterSpacing: '-0.003em',
        }}>Catalyst work item</span>
        <div style={{ flex: 1 }} />
        {/* Controls — Expand/Fullscreen/Close (Jira parity).
            'Open in new tab' deferred (no Catalyst equivalent yet). */}
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
      {/* Scrollable detail body (Add parent / BAU-5609 / H1 / fields) */}
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
    </>
  );

  return (
    <AtlaskitPageShell
      title={pageTitle}
      sideRail={useRailAsSideSlot ? railInnerContent : undefined}
      sideRailWidth={400}
    >
      {/* Toolbar: search + filter + type chips inline + count + maximize.
          Apr 27, 2026 (L48 + L51): type chips inline; bottom padding
          increased to 16px and a 1px subtle border-bottom added to give
          the eye a clear "controls finished" rest before the table.
          Earlier 10px-bottom padding ran the toolbar baseline almost
          flush with the column header row (≈6px gap visually). */}
      <div style={{
        padding: '6px 16px 14px',
        marginBottom: 4,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
      }}>
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
        {/* Group by — Atlaskit DropdownMenu (Apr 27, 2026, L41).
            Was a native <select> which is banned by CLAUDE.md §7 and the
            jira-compare skill's Atlaskit-only mandate. Replaced with
            @atlaskit/dropdown-menu's radio-group pattern. Trigger is a
            compact "Group" button matching Jira's toolbar pill;
            current selection is shown in parentheses when not 'none'. */}
        {(() => {
          const groupLabels: Record<typeof groupBy, string> = {
            none: 'None',
            status: 'Status',
            parent: 'Parent',
            assignee: 'Assignee',
            priority: 'Priority',
          };
          const triggerText = groupBy === 'none' ? 'Group' : `Group: ${groupLabels[groupBy]}`;
          // Apr 27, 2026 (L49):
          // 1. Removed `shouldRenderToParent` — it forced the menu to render
          //    inside the toolbar's flex container which has overflow:hidden,
          //    causing the menu to flip ABOVE the trigger and clip into the
          //    global nav. Default portal rendering positions correctly
          //    against viewport.
          // 2. Removed `title="Group by"` from the radio group — it was
          //    rendering a small grey caps heading inside the menu that
          //    duplicated the trigger label.
          return (
            <DropdownMenu trigger={triggerText} placement="bottom-start">
              <DropdownItemRadioGroup id="backlog-group-by">
                {(['none', 'status', 'parent', 'assignee', 'priority'] as const).map((opt) => (
                  <DropdownItemRadio
                    key={opt}
                    id={`group-by-${opt}`}
                    isSelected={groupBy === opt}
                    onClick={() => { setGroupBy(opt); setCollapsedGroups(new Set()); }}
                  >
                    {groupLabels[opt]}
                  </DropdownItemRadio>
                ))}
              </DropdownItemRadioGroup>
            </DropdownMenu>
          );
        })()}
        {/* Inline type chips — All/Epics/Features/Stories/Defects/Incidents.
            Sit between Group dropdown and the items count, on the same
            32px baseline as Filter/Group for visual rhythm.
            Apr 27, 2026 (L48). */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginLeft: 4,
          flexShrink: 1,
          minWidth: 0,
          overflowX: 'auto',
        }}>
          {([
            ['all', 'All', typeCount.all],
            ['epic', 'Epics', typeCount.epic],
            ['feature', 'Features', typeCount.feature],
            ['story', 'Stories', typeCount.story],
            ['bug', 'Defects', typeCount.bug],
            ['incident', 'Incidents', typeCount.incident],
          ] as const).map(([key, label, count]) => (
            <TypeChip
              key={key}
              active={typeFilter === key}
              onClick={() => setTypeFilter(key as typeof typeFilter)}
              count={count}
            >{label}</TypeChip>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {/* Subtle divider between pills/spacer and the right-side cluster
            (count + maximize). Mirrors Atlaskit toolbar separators. */}
        <span aria-hidden style={{
          display: 'inline-block',
          width: 1, height: 18,
          background: token('color.border', '#DFE1E6'),
          marginRight: 4,
        }} />
        <span style={{ fontSize: 13, color: token('color.text.subtlest', '#6B778C') }}>
          {total} item{total === 1 ? '' : 's'}
          {selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ''}
        </span>
        {/* Maximize/Restore icon — sits to the RIGHT of the items label.
            Apr 27, 2026 (L48). */}
        {toolbarMaximizeIcon}
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
            // Apr 27, 2026 (L39): fullscreen no longer hides the table.
            // The panel renders as a position:fixed modal overlay above
            // the table (Jira parity), so we keep the table at full
            // flex width behind the modal — visible at the modal's edges
            // and contributing to the dim-backdrop perception.
            ...(isPanelOpen && panelMode === 'expanded'
              ? { width: '40%', flexShrink: 0 }
              : isPanelOpen && panelMode !== 'fullscreen'
                ? { flex: 1 }       // compact — share remainder with fixed 400px panel
                : { flex: 1 }),     // panel closed OR fullscreen modal — full width
            minWidth: 0,
            // Apr 27, 2026 (L66): bottom padding 60px reserves space for
            // the fixed-positioned Create row at the viewport bottom (Create
            // is height ~46 + 6px margin from footer + breathing room) —
            // without this, the last table row gets hidden under the
            // floating Create bar. Vertical scroll on the column lets the
            // content above the fixed Create remain reachable.
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            padding: '4px 16px 60px',
            transition: 'width 150ms ease, flex-basis 150ms ease',
          }}
        >
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
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
          </div>

          {/* Apr 27, 2026 (L54): single bottom-anchored "+ Create" row.
              Smart default: Defects pill → QA Bug, Incidents pill →
              Production Incident, Epics → Epic, Features → Feature,
              everything else → Story (Jira's default). User can change
              via the type picker — Jira's pattern. */}
          <BottomCreateRow
            projectKey={projectKey}
            defaultIssueType={
              typeFilter === 'epic' ? 'Epic'
              : typeFilter === 'feature' ? 'Feature'
              : typeFilter === 'bug' ? 'QA Bug'
              : typeFilter === 'incident' ? 'Production Incident'
              : 'Story'
            }
            // Right offset = rail width when open (400 compact, 60% expanded),
            // 0 when closed. Left offset = 0 (let it span from page edge).
            rightOffset={
              isPanelOpen && panelMode === 'compact' ? 400
              : isPanelOpen && panelMode === 'expanded' ? Math.round(window.innerWidth * 0.6)
              : 0
            }
            leftOffset={0}
            onCreated={() => {
              queryClient.invalidateQueries({ queryKey: ['backlog-stories-v2', projectId] });
              queryClient.invalidateQueries({ queryKey: ['backlog-epics', projectId] });
            }}
          />
        </div>

        {/* Fullscreen backdrop — dim layer behind the modal panel.
            Click closes back to compact mode (Jira parity). */}
        {isPanelOpen && panelMode === 'fullscreen' && (
          <div
            onClick={() => setPanelMode('compact')}
            aria-hidden
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(9, 30, 66, 0.54)',
              zIndex: 510,
              transition: 'opacity 150ms ease',
            }}
          />
        )}
        {/* Apr 27, 2026 (L46): compact mode rail is now rendered via
            AtlaskitPageShell.sideRail (extends to top of page = Jira parity).
            Only render this inline panel for 'expanded' (60% inline) and
            'fullscreen' (position:fixed modal) modes. */}
        {isPanelOpen && panelMode !== 'compact' && (
          <div
            style={{
              // Panel column width driven by panelMode:
              //  expanded  → 60% of flex row (table at 40% beside)
              //  fullscreen→ position:fixed modal overlay (Apr 27, 2026 L39)
              //                — table stays visible behind the dim backdrop;
              //                  modal centered, capped width/height, scrollable
              //                  internally. Click backdrop or X/⛶ to close.
              ...(panelMode === 'fullscreen'
                ? {
                    position: 'fixed' as const,
                    top: '4vh',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 'min(1280px, 92vw)',
                    height: '92vh',
                    zIndex: 520,
                    background: token('elevation.surface', '#FFFFFF'),
                    borderRadius: 8,
                    boxShadow: '0 24px 56px rgba(9, 30, 66, 0.32), 0 0 1px rgba(9, 30, 66, 0.31)',
                    border: 'none',
                  }
                : panelMode === 'expanded'
                  ? {
                      width: '60%', flexShrink: 0,
                      borderLeft: `1px solid ${token('color.border', '#DFE1E6')}`,
                      // Apr 27, 2026 (L45): reverted aggressive sticky+100vh
                      // clamp — it was causing the rail to overlap the
                      // global page chrome (search vanishing when rail
                      // opened). Rely on the parent flex container's
                      // existing min-height:0 + overflow:hidden to size
                      // the rail; inner content scrolls via the existing
                      // flex:1+overflow:auto wrapper at line 1572.
                    }
                  : {
                      width: 400, flexShrink: 0,
                      borderLeft: `1px solid ${token('color.border', '#DFE1E6')}`,
                    }),
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              transition: panelMode === 'fullscreen' ? 'none' : 'width 150ms ease',
            }}
          >
            {/* "Catalyst work item" anchor band — mirrors Jira's "Jira work
                item" label at the top of every issue rail. Apr 27, 2026
                (L40, iter 2): without this the rail's first content
                (chevrons + close buttons) reads as "floating against
                white" — the persistent "roof touch" perception even
                after the canonical white canvas landed. The label gives
                the rail a clear top edge and a cognitive anchor so the
                user knows what they're looking at. Atlaskit Heading
                semibold (Atlassian Sans, 14px/653) for top-row prominence;
                bottom border separates it from the chevrons toolbar. */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                fontSize: 14,
                fontWeight: 653,
                color: token('color.text', '#172B4D'),
                letterSpacing: '-0.003em',
                flexShrink: 0,
                // Hex literal — `color.background.neutral.subtle` token
                // resolved to transparent in this theme (probed iter 16),
                // and CLAUDE.md mandates hex over HSL anyway.
                background: '#F4F5F7',
                borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
                minHeight: 44,
              }}
            >
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                width: 20,
                height: 20,
                borderRadius: 4,
                background: token('color.icon.accent.blue', '#1868DB'),
                color: '#FFFFFF',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
              }}>
                ✓
              </span>
              Catalyst work item
            </div>
            {/* Jira-faithful panel toolbar — Expand / Fullscreen / Close triad.
                Prev/Next row navigation still works via j/k/↑/↓ keyboard. */}
            <div
              role="toolbar"
              aria-label="Detail panel controls"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 10px 6px',
                borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
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
              {/* Apr 27, 2026 iter-3 (duplication fix): dropped the
                  Breadcrumbs from this top row entirely. Row 2 below
                  ("Add parent / <issue-key> / Share / Actions") already
                  carries the issue identification. Jira's pattern is:
                  Row 1 = panel chrome only (label + expand/fullscreen/close);
                  Row 2 = parent-switcher + current key.
                  Earlier iters had this row showing
                  "ProjectHub / BAU / Backlog / BAU-5609 — long title" then
                  trimmed to "BAU / BAU-5609". Both produced redundant key
                  display since row 2 also shows BAU-5609. Keep row 1 as
                  pure chrome to match Jira and remove the duplication. */}
              <div style={{ flex: '0 1 auto' }} />
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

      {/* Apr 27, 2026 (L53): both delete dialogs now use the canonical
          DangerConfirmModal, which mirrors Jira's exact pattern from the
          BAU list-view delete probe — title with red-icon ModalTitle
          appearance="danger", irreversible warning copy, "Type delete to
          continue" gating, Cancel + danger Delete buttons. The phrase-
          typing gate is the safeguard against a single misclick wiping
          data. Other Catalyst delete sites should adopt the same
          component (see DangerConfirmModal.tsx header comment for the
          sweep target list). */}
      <DangerConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteItem.mutate(deleteTarget)}
        title={`Delete ${deleteTarget?.key ? `${deleteTarget.key} — ` : ''}${deleteTarget?.title || 'work item'}?`}
        description="You're about to permanently delete this work item, its comments and attachments, and all of its data. This is irreversible."
        hint="If you're not sure, you can resolve or close this issue instead."
        isLoading={deleteItem.isPending}
      />

      <DangerConfirmModal
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() => bulkDelete.mutate(Array.from(selectedIds))}
        title={`Delete ${selectedIds.size} work item${selectedIds.size === 1 ? '' : 's'}?`}
        description={`You're about to permanently delete ${selectedIds.size} work item${selectedIds.size === 1 ? '' : 's'}, including comments and attachments. This is irreversible. Jira-synced items will be skipped.`}
        hint="If you're not sure, you can close the items instead."
        isLoading={bulkDelete.isPending}
      />

      {/* Single FlagsHost for this route — picks up every showFlag()/flag.* call. */}
      <FlagsHost />
    </AtlaskitPageShell>
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

/**
 * BottomCreateRow — Jira-parity bottom-of-table inline create row.
 *
 * Apr 27, 2026 (L54). Direct Chrome MCP probe of Jira's BAU list view
 * (testid `business-issue-create.ui.inline-create-form.*`) confirmed the
 * exact pattern:
 *
 *   Collapsed:  full-width row, "+ Create" subtle button, persistent at bottom
 *   Expanded:   [type-picker icon | textarea | assignee | Create button + ↵]
 *
 * Replaces the per-group `<InlineCreateRow>` (kept below as legacy/deprecated).
 *
 * Key differences from legacy:
 *   - Type is USER-CHOOSABLE via dropdown (not derived from active pill)
 *   - All 9 work types from CLAUDE.md §11 are pickable
 *   - Defaults to Story (Jira default)
 *   - Uses @atlaskit/textarea per probe (Jira renders <TEXTAREA>, not <INPUT>)
 *   - Persistent button at bottom of table (Jira pattern), not inside groups
 *   - Esc dismisses; Enter submits; outside-click commits-or-resets
 *
 * Atlaskit primitives:
 *   - @atlaskit/dropdown-menu  (type picker)
 *   - @atlaskit/textarea       (summary input)
 *   - @atlaskit/button         (Create submit, "+ Create" trigger)
 *   - @atlaskit/avatar         (assignee placeholder, v1 just shows "Unassigned")
 *   - lucide-react Plus + ArrowDown (icons)
 */
type CreatableIssueType =
  | 'Story'
  | 'Epic'
  | 'Feature'
  | 'Task'
  | 'QA Bug'
  | 'Production Incident'
  | 'Business Gap'
  | 'API Requirement'
  | 'Change Request';

const CREATABLE_TYPES: CreatableIssueType[] = [
  'Story',
  'Epic',
  'Feature',
  'Task',
  'QA Bug',
  'Production Incident',
  'Business Gap',
  'API Requirement',
  'Change Request',
];

function BottomCreateRow({
  projectKey,
  defaultIssueType = 'Story',
  rightOffset = 0,
  leftOffset = 0,
  onCreated,
}: {
  projectKey: string;
  /** Smart default based on the active pill — when user's on "Defects"
   *  the picker should pre-select QA Bug; on "Incidents" it pre-selects
   *  Production Incident; on All/Stories it stays Story. Same Jira
   *  behaviour where "+ Create" pre-fills the type from current view. */
  defaultIssueType?: CreatableIssueType;
  /** Apr 27, 2026 (L57): right-side offset so the fixed-bottom row
   *  doesn't sit under the open rail. Pass rail width when open, 0
   *  when closed. */
  rightOffset?: number;
  /** Left offset matching the global nav / page padding so the fixed
   *  row aligns with the table column edge. */
  leftOffset?: number;
  onCreated: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [issueType, setIssueType] = useState<CreatableIssueType>(defaultIssueType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Resync issueType if the user changes the active pill while the form
  // is closed — so opening it later reflects the latest pill choice.
  useEffect(() => {
    if (!isOpen) setIssueType(defaultIssueType);
  }, [defaultIssueType, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const reset = () => {
    setSummary('');
    setIsOpen(false);
    setIssueType('Story');
  };

  const create = async () => {
    const title = summary.trim();
    // Validation: required + max 255 chars (Jira's documented limit)
    if (!title) { textareaRef.current?.focus(); return; }
    if (title.length > 255) {
      flag.error('Summary must be 255 characters or fewer');
      return;
    }
    if (!projectKey) return;
    setIsSubmitting(true);
    try {
      const issueKey = await generateIssueKey(projectKey);
      const nowIso = new Date().toISOString();
      const { error } = await supabase.from('ph_issues').insert({
        issue_key: issueKey,
        project_key: projectKey,
        summary: title,
        issue_type: issueType,
        status: 'To Do',
        priority: 'medium',
        source: 'catalyst',
        jira_created_at: nowIso,
        jira_updated_at: nowIso,
      });
      if (error) throw error;
      flag.success(`Created ${issueKey} — ${title}`);
      reset();
      onCreated();
    } catch (e) {
      flag.error('Failed to create');
      setIsSubmitting(false);
    }
  };

  // Collapsed state — full-width persistent "+ Create" trigger.
  // Apr 27, 2026 (L66): position:fixed at viewport bottom, 6px above
  // the page footer per user spec. Right-offset accounts for the rail
  // width when open. To prevent the fixed bar from hiding the last
  // table row, the table column wrapper applies a bottom padding
  // equal to ~52px (Create row height + 6px gap).
  if (!isOpen) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 6,
          left: leftOffset,
          right: rightOffset,
          zIndex: 50,
          borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
          background: token('elevation.surface', '#FFFFFF'),
          boxShadow: '0 -2px 8px rgba(9, 30, 66, 0.08)',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Create work item"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '10px 16px',
            border: 'none', background: 'transparent',
            color: token('color.text.subtle', '#42526E'),
            fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
            cursor: 'pointer', textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              token('color.background.neutral.subtle.hovered', '#F4F5F7');
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <Plus size={14} />
          Create
        </button>
      </div>
    );
  }

  // Expanded state — Jira pattern: type picker | textarea | assignee | Create
  // Apr 27, 2026 (L66): position:fixed at viewport bottom (6px above
  // footer), same as the collapsed trigger. Pinned, not in flow.
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 6,
        left: leftOffset,
        right: rightOffset,
        zIndex: 50,
        borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
        background: token('elevation.surface', '#FFFFFF'),
        boxShadow: '0 -2px 8px rgba(9, 30, 66, 0.08)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          reset();
        }
      }}
    >
      {/* Type picker dropdown — @atlaskit/dropdown-menu with icon trigger */}
      <DropdownMenu
        placement="top-start"
        trigger={({ triggerRef, ...triggerProps }: any) => (
          <button
            {...triggerProps}
            ref={triggerRef}
            type="button"
            aria-label={`Select work type. ${issueType} currently selected.`}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, padding: 0,
              border: 'none', background: 'transparent', borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            <JiraIssueTypeIcon type={issueType} size={16} />
          </button>
        )}
      >
        <DropdownItemRadioGroup id="bottom-create-type">
          {CREATABLE_TYPES.map((t) => (
            <DropdownItemRadio
              key={t}
              id={`type-${t}`}
              isSelected={issueType === t}
              onClick={() => setIssueType(t)}
              elemBefore={<JiraIssueTypeIcon type={t} size={14} />}
            >
              {t}
            </DropdownItemRadio>
          ))}
        </DropdownItemRadioGroup>
      </DropdownMenu>

      {/* Summary textarea — matches Jira's <TEXTAREA> probe */}
      <textarea
        ref={textareaRef}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            create();
          }
        }}
        placeholder="What needs to be done?"
        rows={1}
        style={{
          flex: 1, minHeight: 28, maxHeight: 120,
          border: 'none', outline: 'none',
          fontSize: 14, lineHeight: '20px',
          color: token('color.text', '#172B4D'),
          fontFamily: 'inherit', background: 'transparent',
          resize: 'none', padding: '4px 0',
        }}
      />

      {/* Assignee placeholder — v1 Unassigned. v2 wires @atlaskit/user-picker. */}
      <Tooltip content="Unassigned">
        <button
          type="button"
          aria-label="Unassigned"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, padding: 0,
            border: 'none', background: 'transparent', borderRadius: '50%',
            color: token('color.text.subtlest', '#6B778C'),
            cursor: 'not-allowed',
          }}
          disabled
        >
          <CircleUser size={20} />
        </button>
      </Tooltip>

      {/* Cancel button — soft escape */}
      <Button
        appearance="subtle"
        spacing="compact"
        onClick={reset}
        isDisabled={isSubmitting}
      >
        Cancel
      </Button>

      {/* Create submit — ↵ keycap as iconAfter */}
      <Button
        appearance="primary"
        onClick={create}
        isLoading={isSubmitting}
        isDisabled={!summary.trim() || isSubmitting}
        iconAfter={() => (
          <span
            aria-hidden
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 18, height: 16, marginLeft: 4,
              padding: '0 4px', borderRadius: 3,
              background: 'rgba(255,255,255,0.2)',
              fontSize: 11, fontWeight: 600, lineHeight: '14px',
            }}
          >
            ↵
          </span>
        )}
      >
        Create
      </Button>
    </div>
  );
}

function InlineCreateRow({
  projectId,
  projectKey,
  typeFilter,
  seedPatch,
  placeholder,
  onCreated,
}: {
  projectId: string;
  /** ph_issues uses project_key (text), not project_id (uuid). Threaded
   *  through from BacklogPage so the create insert can target ph_issues
   *  with source='catalyst' (per F-iter9 unification). */
  projectKey: string;
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
    if (!title || !projectKey) { reset(); return; }
    try {
      const issueType = typeFilter === 'epic' ? 'Epic' : typeFilter === 'feature' ? 'Feature' : 'Story';
      // F-iter9 unification: write Catalyst-native rows directly into ph_issues
      // with source='catalyst'. Field map: title → summary, project_id (uuid)
      // → project_key (text). Issue_key is generated up-front so the row has
      // a stable key from creation and matches Jira-synced peers in the same
      // project.
      const issueKey = await generateIssueKey(projectKey);
      const nowIso = new Date().toISOString();
      const { error } = await supabase.from('ph_issues').insert({
        issue_key: issueKey,
        project_key: projectKey,
        summary: title,
        issue_type: issueType,
        status: 'To Do',
        priority: 'medium',
        source: 'catalyst',
        jira_created_at: nowIso,
        jira_updated_at: nowIso,
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
  // Re-styled 2026-04-26 to match Jira's list-view bulk action bar:
  //   - floating bottom dark pill (NOT a top-of-table inline blue bar)
  //   - portal-mounted to <body> so panel/scroll can't clip it
  //   - dark surface #44546F, white text, 14px/500
  //   - X close on left → vertical divider → "N work item(s) selected"
  //     → vertical divider → action buttons → red Delete
  //   - hover state: white/10 overlay
  // The Change-status / Assign popovers are richer than Jira's stock
  // bar (which has Edit/Copy/Delete only) — kept because they're a
  // Catalyst quality-of-life. Visual chrome matches Jira pixel-for-pixel.
  const itemLabel = count === 1 ? 'work item' : 'work items';
  const bar = (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        animation: 'bau-bulk-slide-up 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        role="toolbar"
        aria-label="Bulk actions"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          height: 44,
          background: '#44546F',
          color: '#FFFFFF',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)',
          fontFamily: 'var(--cp-font-body)',
          overflow: 'hidden',
          fontSize: 14,
        }}
      >
        {/* Close (X) */}
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          disabled={isBusy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            background: 'transparent',
            border: 'none',
            color: '#FFFFFF',
            cursor: 'pointer',
            transition: 'background 100ms',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <CloseIcon size={18} />
        </button>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.20)' }} />

        {/* Selected count */}
        <span
          style={{
            padding: '0 16px',
            fontSize: 14,
            fontWeight: 500,
            color: '#FFFFFF',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          {count} {itemLabel} selected
        </span>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.20)' }} />

        {/* Change status */}
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

        {/* Assign */}
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

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          disabled={isBusy}
          aria-label="Delete selected"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 44,
            padding: '0 16px',
            background: 'transparent',
            border: 'none',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 500,
            cursor: isBusy ? 'default' : 'pointer',
            opacity: isBusy ? 0.5 : 1,
            fontFamily: 'inherit',
            transition: 'background 100ms',
          }}
          onMouseEnter={(e) => { if (!isBusy) (e.currentTarget.style.background = 'rgba(220,38,38,0.20)'); }}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Trash2 size={15} />
          Delete
        </button>
      </div>

      <style>{`
        @keyframes bau-bulk-slide-up {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
  return ReactDOM.createPortal(bar, document.body);
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

  // Anchor flip: when the trigger lives in the lower half of the viewport
  // (i.e. inside the floating bottom bulk bar), open the popover ABOVE so
  // it doesn't render off-screen.
  const [openAbove, setOpenAbove] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    const update = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const above = r.top > window.innerHeight / 2;
      setOpenAbove(above);
      if (above) {
        // Anchor by `bottom` so we can grow upward from the trigger top
        setAnchor({ top: r.top, left: r.left });
      } else {
        setAnchor({ top: r.bottom + 4, left: r.left });
      }
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

  // Trigger styled to live INSIDE Jira's dark floating bulk-action bar
  // (re-skinned 2026-04-26). White text on transparent bg; hover white/10
  // overlay; chevron suffix retained for affordance.
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
          height: 44,
          padding: '0 14px',
          background: 'transparent',
          border: 'none',
          color: '#FFFFFF',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'background 100ms',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
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
            // When opening above (trigger in lower half of viewport), use
            // `bottom` so the popover grows upward from just above the bar.
            ...(openAbove
              ? { bottom: window.innerHeight - anchor.top + 4 }
              : { top: anchor.top }),
            left: anchor.left,
            zIndex: 10000,
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