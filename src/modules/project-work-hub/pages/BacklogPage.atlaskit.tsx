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
import React, { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useCreateCatyConversation } from '@/hooks/useCatyAI';

import EmptyState from '@atlaskit/empty-state';
import { SectionMessage } from '@/components/ads';
import Spinner from '@atlaskit/spinner';
import Textfield from '@atlaskit/textfield';
import { Box, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import Tooltip from '@atlaskit/tooltip';
import Button from '@atlaskit/button';
import AkChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import AkChevronLeftIcon from '@atlaskit/icon/glyph/chevron-left';
import AkChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import AkMoreIcon from '@atlaskit/icon/glyph/more';
import AkTrashIcon from '@atlaskit/icon/glyph/trash';
import AkSearchIcon from '@atlaskit/icon/core/search';
import AkAddIcon from '@atlaskit/icon/core/add';
import AkEditIcon from '@atlaskit/icon/core/edit';
import AkFlagIcon from '@atlaskit/icon/core/flag';
import AkCopyIcon from '@atlaskit/icon/core/copy';
import AkCloseIcon from '@atlaskit/icon/core/close';
import AkMaximizeIcon from '@atlaskit/icon/core/maximize';
import AkMinimizeIcon from '@atlaskit/icon/core/minimize';
import AkPersonAvatarIcon from '@atlaskit/icon/core/person-avatar';
import AkFilterIcon from '@atlaskit/icon/core/filter';
import AkRefreshIcon from '@atlaskit/icon/core/refresh';
import AkDownloadIcon from '@atlaskit/icon/core/download';
import AkCommentIcon from '@atlaskit/icon/core/comment';
import AkClockIcon from '@atlaskit/icon/core/clock';
import AkArrowUpIcon from '@atlaskit/icon/core/arrow-up';
import AkArrowDownIcon from '@atlaskit/icon/core/arrow-down';
import AkAttachmentIcon from '@atlaskit/icon/core/attachment';
import AkBoardIcon from '@atlaskit/icon/core/board';
import AkShareIcon from '@atlaskit/icon/core/share';
import AkWarningIcon from '@atlaskit/icon/core/warning';
import AkArchiveBoxIcon from '@atlaskit/icon/core/archive-box';
import AkLinkExternalIcon from '@atlaskit/icon/core/link-external';
import AkLinkIcon from '@atlaskit/icon/core/link';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import DropdownMenu, { DropdownItemRadioGroup, DropdownItemRadio } from '@atlaskit/dropdown-menu';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Select from '@atlaskit/select';
import { Fieldset, Label } from '@atlaskit/form';

import {
  JiraTable,
  makeKeyCell,
  makeCommentsCell,
  makeDateCell,
  makeCaretCell,
  makeStatusEditCell,
  makeStatusEditCellAkPopup,
  makeSummaryInlineEditCell,
  makeAssigneeCell,
  makeAssigneeEditCell,
  makePriorityEditCell,
  makeParentEditCell,
  makeLabelsCell,
  makeLabelsEditCell,
  makeFixVersionsCell,
  makeDateEditCell,
  makeRowActionsCell,
  makeRowMenuCell,
  FlagsHost,
  flag,
  StatusPill,
  BulkFooterBar,
} from '@/components/shared/JiraTable';
import type {
  Column,
  LozengeAppearance,
  StatusOption,
  AssigneeChoice,
  ParentChoice,
  RowAction,
} from '@/components/shared/JiraTable';

import { useStoryBacklog, useEpicBacklog, useRequestsByKeys, useRequestLinksByEpicKeys } from '../hooks/useBacklogData';
import { useProject } from '@/hooks/useProjects';
// Apr 28, 2026 (carryover #9): Star/Unstar persisted via the canonical
// starred_items table chokepoint. Replaces the prior local useState toggle
// that didn't persist.
import { useStarredItems } from '@/hooks/useStarredItems';
import { DangerConfirmModal } from '@/components/shared/DangerConfirmModal';
import type { RequestRow } from '../hooks/useBacklogData';
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

// Drag-and-drop support for row ranking (2026-05-12 Tier 1 gap)
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ChevronsLeft/ChevronsRight (first/last page) have no ADS equivalent — inline SVG below
const AkChevronsLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z"/></svg>
);
const AkChevronsRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z"/></svg>
);

/**
 * DragHandleCell — useSortable hook for row ranking.
 *
 * 2026-05-17 jira-compare cycle 2 (revision 3): TR-transform hack reverted.
 * Trying to apply dnd-kit's transform to the parent <tr> via closest('tr')
 * was the wrong layer — TRs inside table-layout: fixed have inconsistent
 * transform behavior across browsers AND setNodeRef remained on the handle
 * so verticalListSortingStrategy never saw the actual rows. The canonical
 * fix is DragOverlay — a portal-mounted ghost that follows the cursor,
 * independent of any table clipping. The handle stays as the sortable item;
 * the overlay (rendered in BacklogPage's DndContext) gives the visual
 * feedback; original row stays put; drop persists. Cleaner, more reliable.
 */
function DragHandleCell({ row }: { row: BacklogItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id: row.id });

  return (
    <span
      ref={setNodeRef}
      className="jira-drag-handle"
      aria-hidden
      style={{ opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 16,
          height: 20,
          // 2026-05-17 jira-compare cycle 2 (rev 2): Jira renders the drag
          // handle as a small button with a subtle dark rounded background
          // (per Vikram screenshot). Adds visual weight so the grip reads
          // as an interactive affordance, not a decorative icon.
          borderRadius: 3,
          background: token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)'),
          cursor: listeners ? 'grabbing' : 'grab',
          color: token('color.icon.subtle', '#626F86'),
        }}
      >
        {/* 6-dot grip — no ADS equivalent; inline SVG */}
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden>
          <circle cx="2" cy="2" r="1.5"/>
          <circle cx="8" cy="2" r="1.5"/>
          <circle cx="2" cy="8" r="1.5"/>
          <circle cx="8" cy="8" r="1.5"/>
          <circle cx="2" cy="14" r="1.5"/>
          <circle cx="8" cy="14" r="1.5"/>
        </svg>
      </span>
    </span>
  );
}

// Apr 19, 2026 — U-4 (BAU Dashboard Atlaskit Conversion handover §2):
// migrated outer page wrapper (blue page bg + white card + h1) onto the
// shared AtlaskitPageShell so this surface tracks the Dashboard's shell
// padding (currently 8px) instead of carrying its own bespoke 24px.
import { AtlaskitPageShell } from '@/components/ads';
// Apr 27 2026 (jira-compare regression D-001/002/003): chrome-level project
// header band (Spaces breadcrumb + project icon + H1) lifted out of the
// white card to match Jira parity. Single import, scoped to project-work-hub.
import { ProjectChromeBand } from '../components/ProjectChromeBand';
import { ProjectHeaderChip } from '@/components/layout/ProjectHeaderChip';
import { ProjectTabBar } from '@/components/layout/ProjectTabBar';
// Apr 27 2026 (LOVABLE-01 landed in-session): AvatarGroup for the chrome-band
// member strip + resolveAvatarUrl for local-asset photo lookups (avatars
// chokepoint per CLAUDE.md §19).
import AvatarGroup from '@atlaskit/avatar-group';
import { resolveAvatarUrl } from '@/lib/avatars';
import { toast } from 'sonner';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

/* ─── Unified model ────────────────────────────────────────────────────── */

/**
 * BacklogType — rows in the unified backlog surface.
 * - 'initiative' (Catalyst-native, from ph_requests) sits at depth 0
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
  due_date: string | null;
  comment_count: number | null;
  labels: string[] | null;
  fix_versions: string[] | null;
  rank_order: number | null;
}

/* ─── Status mapping (shared with Story Backlog) ────────────────────────── */

function statusAppearance(status: string | null | undefined): LozengeAppearance {
  if (!status) return 'default';
  // `STORY_STATUS_LOZENGE.color` is now the Atlaskit appearance token directly
  // (§20 / L41 migration). Pass it through; fall back to 'default' for unknown.
  const cfg = STORY_STATUS_LOZENGE[status];
  return (cfg?.color as LozengeAppearance) ?? 'default';
}
// Jira renders status labels uppercase in the list view DOM (the text content
// is uppercase, not CSS text-transform). Use the STORY_STATUS_LOZENGE label
// which is already uppercase; fall back to uppercase raw value for unknowns.
function statusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return STORY_STATUS_LOZENGE[status]?.label ?? status.toUpperCase();
}
// Apr 27, 2026 — F1 fix: STATUS_OPTIONS was a 9-item subset of the
// vocabulary that STORY_STATUS_LOZENGE already maps to lozenge colours
// (17+ statuses). Rows whose current status was outside that subset
// (notably "Ready for QA" — the most common BAU status) saw a popup
// that did NOT include their own value, so any pick silently
// downgraded the issue. Aligning the option list to the full Jira BAU
// workflow + grouping by statusCategory key (new / indeterminate / done)
// matches what the Jira list-view dropdown shows on
// digital-transformation.atlassian.net/jira/software/c/projects/BAU/list.
const STATUS_OPTIONS: StatusOption[] = [
  // To Do family (statusCategory: new)
  { value: 'To Do', label: 'To Do', appearance: 'default', group: 'To Do' },
  { value: 'Backlog', label: 'Backlog', appearance: 'default', group: 'To Do' },
  { value: 'In Requirements', label: 'In Requirements', appearance: 'default', group: 'To Do' },
  { value: 'Ready for Development', label: 'Ready for Development', appearance: 'default', group: 'To Do' },
  // 2026-05-08: In Design = grey in BAU Jira project (To Do category). Prior 'inprogress' was wrong.
  { value: 'In Design', label: 'In Design', appearance: 'default', group: 'To Do' },
  // In Progress family (statusCategory: indeterminate)
  { value: 'In Development', label: 'In Development', appearance: 'inprogress', group: 'In Progress' },
  { value: 'In Progress', label: 'In Progress', appearance: 'inprogress', group: 'In Progress' },
  // Done family (statusCategory: done — Jira treats QA/UAT/BETA as "verifying", green)
  { value: 'Ready for QA', label: 'Ready for QA', appearance: 'success', group: 'Done' },
  { value: 'In QA', label: 'In QA', appearance: 'success', group: 'Done' },
  { value: 'Ready for UAT', label: 'Ready for UAT', appearance: 'success', group: 'Done' },
  { value: 'In UAT', label: 'In UAT', appearance: 'success', group: 'Done' },
  { value: 'BETA READY', label: 'BETA READY', appearance: 'success', group: 'Done' },
  { value: 'In BETA', label: 'In BETA', appearance: 'success', group: 'Done' },
  { value: 'Done', label: 'Done', appearance: 'success', group: 'Done' },
  { value: 'In Production', label: 'In Production', appearance: 'success', group: 'Done' },
  // Blocked / On Hold: Jira BAU DOM probe 2026-05-08 = grey (To Do category, rgb(221,222,225))
  { value: 'Blocked', label: 'Blocked', appearance: 'default', group: 'To Do' },
  { value: 'On Hold', label: 'On Hold', appearance: 'default', group: 'To Do' },
  // Jira DOM probe 2026-05-16: Rejected = Done category (green), not grey.
  { value: 'Rejected', label: 'Rejected', appearance: 'success', group: 'Done' },
  { value: 'Cancelled', label: 'Cancelled', appearance: 'default', group: 'To Do' },
  { value: 'Closed', label: 'Closed', appearance: 'success', group: 'Done' },
  { value: 'In Review', label: 'In Review', appearance: 'inprogress', group: 'In Progress' },
  { value: 'Ready to Implement', label: 'Ready to Implement', appearance: 'default', group: 'To Do' },
];
// All distinct status values used in BAU — drives the status inline-edit dropdown.
const ALL_BACKLOG_STATUSES = [
  'To Do', 'In Requirements', 'In Design', 'Ready for Development',
  'In Development', 'Ready for QA', 'In QA', 'Ready for UAT', 'In UAT',
  'In Production', 'Done', 'Blocked', 'On Hold', 'Closed', 'Cancelled',
  'Backlog', 'In Progress', 'In Review', 'Ready to Implement',
];

const PRIORITY_ORDER = ['highest', 'critical', 'high', 'medium', 'low', 'lowest'];

// Apr 27, 2026 — F2 fix: BAU has rows with priority "Highest" (per the
// Jira /rest/api/3/priority list — id=1 maps to Highest), but the editor
// default options array in editors.tsx omits 'highest', so opening the
// popup on a Highest row never highlights or preserves the value.
// Pass explicit options (including 'highest') at the column wiring site.
const PRIORITY_OPTIONS = ['highest', 'critical', 'high', 'medium', 'low', 'lowest'];

// Jira-parity column restriction (2026-05-12).
// Only standard Jira fields are allowed in the column picker.
// Type-specific custom fields (Gap Classification, IR Demo Date, etc.) are permanently banned.
// See CLAUDE.md 2026-05-05, 2026-05-07 for the full ban list.
const ALLOWED_COLUMN_IDS = new Set([
  // 2026-05-17 jira-compare cycle 2: standalone 'type' column removed; type
  // icon now lives inside the Work cell via makeKeyCell getIcon prefix.
  // 2026-05-17 jira-compare cycle 2 (design-critique H4 P0): standalone
  // summary column merged into the key column (now labeled "Work").
  // key id retained for URL backward-compat.
  'key',
  'status',
  'comments',
  'parent',
  'assignee',
  'priority',
  'fix_versions',
  'labels',
  'due_date',
  'created',
  'updated',
  'reporter',
  '__drag',
  '__actions',
]);

// Permanently banned fields that must NEVER appear in column picker
const BANNED_COLUMN_IDS = new Set([
  'customfield_10882', // MDT Ref
  'customfield_10288', // Assessment Feature
  'customfield_10130', // Service Now #
  // Type-specific custom fields (all permanently banned per Vikram 2026-05-12)
  'customfield_10881', 'customfield_10116', 'customfield_10117', 'customfield_10118',
  'customfield_10139', 'customfield_10140', 'customfield_10141', 'customfield_10142',
  'customfield_10143', 'customfield_10144', 'customfield_10145', 'customfield_10146',
  'customfield_10883', 'customfield_10884',
]);

// Apr 28, 2026 — Set project background palettes. Sourced from Atlassian
// Design System color tokens (atlassian.design/tokens) for the solids,
// and from common Jira theme-picker gradient hues for the gradients.
// Stored in `projects.settings.background` as { type, value } where
// `value` is the CSS background string applied directly to the chrome
// band. Default chrome background `#E9F2FE` is the Jira BAU list-view
// chrome blue (probed 2026-04-27).
const BG_DEFAULT = 'var(--ds-background-selected, #E9F2FE)';
const BG_SOLIDS: Array<{ name: string; value: string }> = [
  { name: 'Sky',     value: 'var(--ds-background-selected, #E9F2FE)' }, // Jira BAU chrome (default)
  { name: 'Mint',    value: '#DCFFF1' },
  { name: 'Lemon',   value: '#FFF7D6' },
  { name: 'Peach',   value: '#FFE2D5' },
  { name: 'Rose',    value: '#FFD2DC' },
  { name: 'Lilac',   value: '#E5DBFF' },
  { name: 'Stone',   value: 'var(--ds-border, #DFE1E6)' },
  { name: 'Blue',    value: '#0C66E4' }, // bold accents
  { name: 'Teal',    value: '#1F845A' },
  { name: 'Violet',  value: '#5E4DB2' },
  { name: 'Orange',  value: '#F18D3D' },
  { name: 'Crimson', value: 'var(--ds-icon-accent-red, #C9372C)' },
];
const BG_GRADIENTS: Array<{ name: string; value: string }> = [
  { name: 'Sunrise',  value: 'linear-gradient(135deg, #FFD2DC, #FFF7D6)' },
  { name: 'Ocean',    value: 'linear-gradient(135deg, #B8DAFF, #DCFFF1)' },
  { name: 'Sunset',   value: 'linear-gradient(135deg, var(--ds-icon-accent-red, #C9372C), #E54787)' },
  { name: 'Forest',   value: 'linear-gradient(135deg, #1F845A, var(--ds-icon-accent-green, #22A06B))' },
  { name: 'Lavender', value: 'linear-gradient(135deg, #8270DB, #5E4DB2)' },
  { name: 'Slate',    value: 'linear-gradient(135deg, #44546F, var(--ds-text-subtlest, #6B6E76))' },
];

interface ProjectBackground {
  type: 'solid' | 'gradient';
  value: string;
}
function readProjectBackground(project: any): ProjectBackground | null {
  const bg = project?.settings?.background;
  if (!bg || typeof bg !== 'object') return null;
  if (bg.type === 'solid' || bg.type === 'gradient') {
    if (typeof bg.value === 'string' && bg.value) return bg as ProjectBackground;
  }
  return null;
}

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

export function BacklogPage({ projectId, projectKey, assigneeIds, displayName, baseUrl }: { projectId: string; projectKey: string; assigneeIds?: string[]; displayName?: string; baseUrl?: string }) {
  // May 12, 2026 (Phase 1.3): CATY hooks for Ask CATY toolbar button.
  const { user } = useAuth();
  const createConversation = useCreateCatyConversation();

  // Apr 27, 2026 (L50): canonical Project Hub page-title pattern is
  // `{Project Name} {Hub Function}` — e.g. "Senaei BAU Backlog". Falls
  // back to the project key while the name is loading. Same pattern
  // should be applied to every Project Hub surface (Dashboard, Board,
  // Roadmap, etc.) — see the L50 lesson note for the sweep target list.
  const { data: project } = useProject(projectId);
  const projectDisplayName = displayName || project?.name || projectKey;
  const resolvedBaseUrl = baseUrl ?? `/project-hub/${projectKey}`;
  // Apr 28, 2026 — chrome band background derived from
  // `projects.settings.background`. Falls back to the Jira-parity blue.
  const projectBackground = readProjectBackground(project);
  const chromeBgValue = projectBackground?.value || BG_DEFAULT;
  // Apr 27, 2026 — jira-compare audit P1 #4: Jira's BAU list page header
  // is the project name only ("Senaei BAU"), not "{Project} Backlog". The
  // hub function (Backlog/Board/Roadmap) is communicated by the breadcrumb
  // + sidebar entry, not duplicated in the H1. Drop the " Backlog" suffix
  // on this surface to match Jira parity. L50's "{Project} {Hub Function}"
  // pattern is rescinded for Project Hub list views; H1 = project name only.
  const pageTitle = projectDisplayName;
  useAtlaskitThemeSync();
  const navigate = useNavigate();

  // 2026-05-12 — Ask CATY entry point. Mirrors Jira's "✦ Ask AI" button
  // position (left of Search in the list toolbar). On click: creates a
  // CATY conversation scoped to this project, then navigates to /caty
  // with the conversation id passed via URLSearchParams.
  // 2026-05-17: useAuth + useCreateCatyConversation already declared at
  // the top of the component body (lines ~458-459) for the CATY hook
  // setup; reuse those bindings here instead of re-declaring.
  const createCatyConversation = createConversation;
  const handleAskCaty = useCallback(async () => {
    if (!user?.id || !projectId) return;
    try {
      const conversation = await createCatyConversation.mutateAsync({
        userId: user.id,
        projectId,
        type: 'chat',
      });
      navigate(`/caty?conversationId=${conversation.id}&source=backlog&projectKey=${projectKey}`);
    } catch (err) {
      console.error('Failed to start CATY conversation', err);
    }
  }, [user?.id, projectId, projectKey, createCatyConversation, navigate]);

  // ────────────────────────────────────────────────────────────────────
  // Apr 27 2026 (LOVABLE-01 landed in-session): project members for the
  // chrome-band avatar strip. Query mirrors the EditableAssignee pattern
  // (project_members → profiles → resolveAvatarUrl). Cached at TanStack's
  // default staleTime; the chrome band shows up to 7 avatars + a +N
  // overflow chip with aria-label "N more people" (closes a11y row #13).
  // The "Add people" button stubs to a sonner toast for now — real
  // user-picker modal is a follow-on; per LOVABLE-01 wiring acceptance
  // it just can't be DEAD.
  // ────────────────────────────────────────────────────────────────────
  const { data: chromeBandMembers = [] } = useQuery({
    queryKey: ['chrome-band-members', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select('user_id, role')
        .eq('project_id', projectId);
      if (error) throw error;
      if (!data?.length) return [];
      const userIds = data.map((d) => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      return data
        .map((d) => {
          const full_name = profileMap.get(d.user_id)?.full_name ?? 'Unknown';
          return {
            key: d.user_id,
            name: full_name,
            // resolveAvatarUrl is the single avatar chokepoint (CLAUDE.md §19);
            // returns null for unknown users, AvatarGroup falls back to initials.
            src: resolveAvatarUrl(full_name) ?? undefined,
          };
        })
        .filter((m) => m.name && m.name !== 'Unknown');
    },
    enabled: !!projectId,
    staleTime: 5 * 60_000,
  });

  const queryClient = useQueryClient();

  // Always pass forceProjectKey so Product Hub adapters (whose projectId
  // comes from the products table, not projects) can bypass the
  // projects-table lookup inside useStoryBacklog / useEpicBacklog.
  // For normal project-hub usage this is a no-op (the resolved key matches).
  const backlogOpts = {
    ...(assigneeIds?.length ? { assigneeIds } : {}),
    forceProjectKey: projectKey || undefined,
  };
  const {
    data: stories = [],
    isLoading: storiesLoading,
    error: storiesError,
    refetch: refetchStories,
  } = useStoryBacklog(projectId, backlogOpts);
  const {
    data: epics = [],
    isLoading: epicsLoading,
    error: epicsError,
    refetch: refetchEpics,
  } = useEpicBacklog(projectId, backlogOpts);
  const avatarsByName = useProfileAvatarsByName();
  const backlogError = storiesError || epicsError;

  // Request (Business Request) resolution — per the ProductBacklog ERD,
  // ph_requests.initiative_key appears as ph_issues.parent_key on any
  // Jira issue that belongs to an initiative. So we collect every distinct
  // parent_key across stories + epics (and the stories' epic parents), then
  // ask ph_backlog_requests_view which of those keys are initiatives.
  // Matches become top-level rows in the backlog; epics that reference them
  // nest underneath.
  //
  // Today (2026-04-18) BAU epics have parent_key = NULL so no initiative
  // rows surface. When linkage gets created (Catalyst sets parent_key on an
  // epic to an initiative_key, or Jira sync starts populating it), the UI
  // picks it up on the next render with no code change.
  // Resolve initiative links via ph_issue_links (Apr 2026 RequestLinkedItemsTab
  // path). Map<epic_issue_key, initiative_key>. This is the SECOND linkage path
  // alongside ph_issues.parent_key.
  const epicKeysForLinks = useMemo(
    () => epics.map((e) => e.epic_key).filter(Boolean) as string[],
    [epics],
  );
  const { data: epicLinkedInitiativeByKey } = useRequestLinksByEpicKeys(epicKeysForLinks);

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
  const { data: initiativesByKey } = useRequestsByKeys(initiativeCandidateKeys);

  // ── URL deep-link ──────────────────────────────────────────────────────
  // All user-facing view state (type filter, search, sort, column visibility,
  // groupBy, collapsed groups, detail item, expanded epics) is serialized to
  // URL query params. This lets users bookmark / share an exact view.
  //
  // On mount we hydrate state from the URL; every state change pushes a
  // `replaceState` so back-button navigation stays clean. Param names are
  // short to keep URLs readable.
  const [searchParams, setSearchParams] = useSearchParams();
  // Apr 27, 2026 — column order matches the Jira BAU list view (verified
  // against Vikram's screenshot of digital-transformation.atlassian.net):
  //   Type | Key | Summary | Status | Comments | Parent | Assignee | Priority | Created | Updated
  // 'comments' was previously excluded from defaults; 'created' was added
  // as defaultVisible:false but Vikram wants it on by default for queue
  // triage. Creating column-picker remains the way to hide either.
  // Apr 27, 2026 — jira-compare audit P1 #6 (re-probe iter 2): Created
  // and Updated REMOVED from defaults. Jira's BAU list hides both by
  // default; including them in Catalyst's defaults squashed Summary
  // and Parent below their parity targets (≥360 / ≥280px). Users opt
  // in via the column picker `+` button when they need queue-triage
  // dates. The column schema retains both with `defaultVisible: false`
  // so they remain available; this array is the authoritative initial
  // visibility set on first load.
  // 2026-05-04 jira-compare audit: Jira BAU list default columns (verified live):
  // Jira BAU list default columns (re-probed 2026-05-07 live DOM):
  // Type | Key | Summary | Status | Comments | Parent | Assignee | Due date | Priority | Labels
  // Jira BAU list shows 6 columns above the fold by default (Type | Key |
  // Summary | Status | Comments | Parent). Catalyst has no Comments column,
  // so we mirror that as 5: key | summary | status | parent | assignee.
  // Priority, due_date, labels are off by default (match Jira's behavior
  // where those require horizontal scroll or column picker). Gives Summary
  // ~500px of flex width — matching Jira's ~340px summary column.
  // Jira BAU default columns (re-probed 2026-05-08): Type | Key | Summary |
  // Status | Comments | Parent | Assignee. Mirror that exactly — Comments is
  // now visible by default at position 4 (between Status and Parent).
  // Jira-parity (2026-05-08): Jira's BAU list default columns are Type | Key |
  // Summary | Status | Comments | Parent — NO Assignee by default. Assignee is
  // available via the column picker (+) but hidden in the factory layout.
  // NOTE: Comments column is banned (2026-05-11), removed from defaults
  // 2026-05-17 jira-compare cycle 2: 'summary' merged into 'key' (Work column).
  const DEFAULT_VISIBLE_COLUMNS = ['key', 'status', 'assignee', 'priority', 'parent', 'fix_versions'];

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
  // 2026-05-17 jira-compare cycle 2 (rev 3): track the row currently being
  // dragged so the DragOverlay portal can render a ghost preview that
  // follows the cursor. Cleared on drag end / cancel.
  const [activeDragRow, setActiveDragRow] = useState<BacklogItem | null>(null);
  // Default sort — Key ASC matches Jira's default "Rank" ordering which
  // surfaces oldest issues (BAU-310 first). Updated DESC was incorrect —
  // live probe 2026-05-04 shows Jira BAU list starts at BAU-310, not newest.
  const DEFAULT_SORT_KEY = 'key';
  const DEFAULT_SORT_DIR: 'ASC' | 'DESC' = 'ASC';
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
  // 2026-05-12 task E: Full-width detail route (removed detail panel state).
  // Detail views now navigate to /project-hub/:key/backlog/:issueKey for
  // full-width rendering. No longer managing detailItemId or lastDetailId.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BacklogItem | null>(null);
  // Panel mode machine — matches Jira's 3 states measured from their DOM:
  // 2026-05-12 task E: panelMode removed (no longer managing detail panel).
  // Column visibility — seeded from URL if present, else defaults.
  // Apr 27, 2026: when a URL state is present we MERGE with the current
  // DEFAULT_VISIBLE_COLUMNS so columns added to the defaults later (like
  // `created` on this pass) auto-appear for users with bookmarked URLs.
  // Without this, anyone with a saved `cols=…` query string would never
  // see the new column until they manually toggled it via the picker.
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const raw = searchParams.get('cols');
    if (!raw) return new Set(DEFAULT_VISIBLE_COLUMNS);
    const fromUrl = parseSet(raw);
    DEFAULT_VISIBLE_COLUMNS.forEach((c) => fromUrl.add(c));
    return fromUrl;
  });
  // Group-by — matches catalog 076-095. 'none' disables grouping.
  type GroupByKey = 'none' | 'type' | 'status' | 'parent' | 'assignee' | 'priority';
  // Apr 27, 2026 (audit pass 10, IRP-518 alignment): URL param renamed
  // 'group' → 'groupBy' to match Jira's list-view URL contract. Reads
  // both for one release so bookmarked URLs from the old name keep
  // working; writes only the new name.
  const [groupBy, setGroupBy] = useState<GroupByKey>(
    () => (searchParams.get('groupBy') || searchParams.get('group')) as GroupByKey || 'none',
  );
  // Apr 27 2026 (jira-compare regression F-NEW-2 functional fill):
  // which group has the inline-create form open. Click "+" on a group
  // header → setInlineCreateGroup(groupId). The form renders an extra
  // row immediately below that group's header via JiraTable's
  // renderGroupInlineRow prop. On submit / cancel / Esc → set back to null.
  const [inlineCreateGroup, setInlineCreateGroup] = useState<string | null>(null);
  const [inlineCreateSubmitting, setInlineCreateSubmitting] = useState(false);
  // Jira-parity: sticky tfoot create row. When true, the footer placeholder
  // switches to an InlineGroupCreateRow (creates into the first/default group).
  const [footerCreateActive, setFooterCreateActive] = useState(false);
  // Apr 27 2026 (jira-compare regression iter 3 — View options menu
  // parity with Jira). Toggling "Hide done work items" filters out any
  // row whose status is in DONE_LIKE_STATUSES (Catalyst variants of
  // Jira's "Done" column). When false (default), all rows render.
  const [hideDoneItems, setHideDoneItems] = useState<boolean>(false);
  // 2026-05-12 Jira parity: "Show hierarchy" toggle in toolbar ⋯ menu.
  // When ON: parent rows show > chevron and children render indented inline.
  // When OFF: flat row rendering (current behaviour). Defaults ON to match Jira.
  const [showHierarchy, setShowHierarchy] = useState<boolean>(true);
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  // Column width persistence — survives page reload (Jira saves widths per project).
  const COL_WIDTHS_KEY = `ph-backlog-col-widths-v1:${projectKey}`;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try { const r = localStorage.getItem(COL_WIDTHS_KEY); return r ? JSON.parse(r) : {}; } catch { return {}; }
  });

  // Apr 27 2026 (jira-compare regression iter 3 — Add people modal).
  // Catalyst's Add people CTA in the chrome band opens this modal,
  // mirroring Jira's `invite-people.ui.navigation-add-people-button`
  // behavior (probed at /jira/.../list — heading "Add people to {proj}",
  // emails input, role select, suggestion chips, Cancel/Add). Catalyst
  // version: emails Textfield, click-cycle role, click-to-add chips
  // populated from non-members in the org. On Add, parse emails (comma
  // /space separated) → look up profiles by email → insert
  // project_members rows.
  const [addPeopleOpen, setAddPeopleOpen] = useState<boolean>(false);
  const [addPeopleEmails, setAddPeopleEmails] = useState<string>('');
  const [addPeopleRole, setAddPeopleRole] = useState<'Admin' | 'Member' | 'Viewer'>('Member');
  const [addPeopleSubmitting, setAddPeopleSubmitting] = useState<boolean>(false);

  // Apr 27 2026 (jira-compare regression iter 4 — project ... menu).
  // Mirrors Jira's project-menu-kebab next to the project header H1.
  // Items per Vikram scope: Remove from starred / Linked teams / Set
  // project background / Project settings / Archive project / Delete project.
  // Uses bespoke createPortal (L21).
  const [projectMenuAnchor, setProjectMenuAnchor] = useState<{ top: number; left: number } | null>(null);
  // Apr 28, 2026 (carryover #9): Star/Unstar wired to the canonical
  // starred_items table via useStarredItems. The prior local useState was
  // a stub that didn't persist. room_type='project' + room_id=projectId
  // (UUID) is the canonical key shape used everywhere else (HomeSidebar
  // Pinned, ProjectTable, Starred page).
  const { toggleStar: toggleStarredItem, isStarred: isStarredFn } = useStarredItems({ filterByRoomType: 'project' as const, limit: 100 });
  const isStarred = isStarredFn('project' as const, projectId);
  const projectMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  // Apr 28, 2026 (carryover A + C): Linked teams + Archive + Delete project
  // confirm modals. Patterns sourced from:
  //   - Linked teams: Jira live DOM probe — modal title "Link contributing
  //     teams", body "Add the teams that work in this space, so everyone
  //     knows who to go to for help.", search input "Search and add teams",
  //     Cancel + Save footer, 400×370 modal.
  //     (Catalyst rename: "space" → "project" per the Spaces→Projects
  //     rename pass — see CLAUDE.md §10 NEW-FILE GUARDRAIL session log.)
  //   - Archive (warning) and Delete (danger): Atlassian Design System
  //     canonical pattern from atlassian.design/components/modal-dialog —
  //     "warning or danger styling … must be set on both the modal title
  //     and the primary button". Bespoke createPortal modal because
  //     @atlaskit/modal-dialog renders empty in this surface (L21).
  // Backend writes (link_teams insert, project archive flag, project hard-
  // delete) are intentionally stubbed via flag.info — no Supabase tables
  // exist for these flows yet. UI is wired so the affordances are no
  // longer dead toasts.
  const [linkedTeamsOpen, setLinkedTeamsOpen] = useState(false);
  const [linkedTeamsSearch, setLinkedTeamsSearch] = useState('');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Apr 28, 2026 (carryover — Set project background).
  // Pattern source: Jira live DOM probe of the testid
  // `project-theme-components.ui.theme-picker.popup-content.background-picker-wrapper`
  // — popup, not modal; 350×500; heading "Space background"; sections:
  // Photos by Unsplash + Solid colors + Gradients + Custom images, plus
  // "Remove background". Catalyst scope (Vikram, Apr 28): solid + gradient
  // + remove only. No Unsplash API integration, no custom upload — those
  // require API keys / Storage buckets we haven't provisioned. Background
  // value persisted in `projects.settings.background` (existing JSONB,
  // no migration needed) as `{ type: 'solid'|'gradient', value: <css> }`.
  // Renders on the chrome band only via AtlaskitPageShell's chromeBg prop.
  const [bgPickerAnchor, setBgPickerAnchor] = useState<{ top: number; left: number } | null>(null);

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
    // 2026-05-12 task E: detail state (selectedIssue, panel mode) removed.
    // Detail views now use full-page route /backlog/:issueKey.
    if (groupBy !== 'none') params.set('groupBy', groupBy);
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
  }, [typeFilter, search, sortKey, sortDir, page, groupBy, collapsedGroups, expandedIds, visibleColumns]);
  // containerRef was declared + attached to the outer wrapper but never
  // read anywhere in this module. Removed Apr 19, 2026 as part of the
  // AtlaskitPageShell migration (handover §4 step (b)). `useRef` import
  // is still needed — JiraTable passes its own refs through helpers.

  const pageSize = 25;

  // ── Jira keyboard shortcuts ──
  // `c` → activate footer inline-create (Jira: opens quick-create dialog)
  // 2026-05-12 task E: Removed `Enter` detail-panel navigation (now full-page route)
  // Guard: skip if user is typing in an input/textarea/contenteditable
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
        (e.target as HTMLElement)?.isContentEditable;
      if (isEditable || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setFooterCreateActive(true);
        // Scroll table to bottom so the sticky footer is visible
        const viewport = document.querySelector('.jira-table-viewport') as HTMLElement | null;
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

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
  // Apr 28, 2026 (carryover P2): added onMutate for optimistic UI so the
  // cell flips to the new value within ~10ms instead of waiting ~2-3s for
  // the background refetch. onError reverts the snapshot if the PATCH
  // fails. onSettled is the single invalidation point so the local
  // optimistic write reconciles with the authoritative server response.
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
    onMutate: async ({ id, patch }) => {
      // The actual cache keys used by useStoryBacklog / useEpicBacklog are
      // 3-tuple: ['backlog-*', projectId, projectKey]. The first two
      // elements are stable for this page; we use a partial-match
      // predicate so we don't have to thread projectKey through here.
      const storyPrefix = ['backlog-stories-v2', projectId] as const;
      const epicPrefix = ['backlog-epics', projectId] as const;

      // Cancel in-flight refetches so they don't race the optimistic write.
      await queryClient.cancelQueries({ queryKey: storyPrefix });
      await queryClient.cancelQueries({ queryKey: epicPrefix });

      // Snapshot every matching query so we can revert on error.
      const prevStories = queryClient.getQueriesData<any[]>({ queryKey: storyPrefix });
      const prevEpics = queryClient.getQueriesData<any[]>({ queryKey: epicPrefix });

      // Build the optimistic patch in BacklogItem shape. Caller passes
      // catalyst-style names ('title') which the BacklogItem shape uses
      // directly (BacklogItem.title is populated from row.summary in the
      // hook's mapper, but downstream consumers read row.title /
      // row.priority etc; we patch the same keys the renderer reads).
      const optimisticPatch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(patch)) {
        if (k === 'updated_at') continue;
        optimisticPatch[k] = v;
      }
      optimisticPatch.jira_updated_at = new Date().toISOString();

      const applyPatch = (arr: any[] | undefined) => {
        if (!arr) return arr;
        return arr.map((row) => {
          const matchesId =
            row.id === id ||
            row.issue_key === id ||
            row.story_key === id ||
            row.epic_key === id;
          return matchesId ? { ...row, ...optimisticPatch } : row;
        });
      };

      // Apply to every snapshotted query (handles the projectKey suffix).
      for (const [key] of prevStories) {
        queryClient.setQueryData(key, applyPatch);
      }
      for (const [key] of prevEpics) {
        queryClient.setQueryData(key, applyPatch);
      }

      return { prevStories, prevEpics };
    },
    onError: (e: Error, _variables, context) => {
      // Revert every snapshotted query on failure.
      if (context?.prevStories) {
        for (const [key, data] of context.prevStories) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.prevEpics) {
        for (const [key, data] of context.prevEpics) {
          queryClient.setQueryData(key, data);
        }
      }
      flag.error('Update failed', e.message);
    },
    onSuccess: (_data, variables) => {
      if (variables.source === 'jira') {
        flag.success('Updated', 'Change queued for Jira sync approval');
      } else {
        flag.success('Updated');
      }
    },
    onSettled: () => {
      // Reconcile against the server (partial-match invalidation covers
      // every projectKey variant of the cache keys).
      queryClient.invalidateQueries({ queryKey: ['backlog-stories-v2', projectId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-epics', projectId] });
    },
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

    // Request rows first (top of hierarchy). Sourced from
    // ph_backlog_requests_view via useRequestsByKeys. Only initiatives
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
          labels: null,
          fix_versions: null,
          rank_order: null,
        });
      });
    }

    epics.forEach((e) => {
      epicSeen.add(e.id);
      // If this epic's own parent_key resolves to an initiative, link it up
      // so the tree builder nests the epic under the initiative row. As a
      // fallback, honor ph_issue_links rows from the RequestLinkedItemsTab.
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
        parent_issue_type: parentInit ? 'Request' : null,
        source: e.source ?? 'jira',
        updated_at: e.jira_updated_at ?? null,
        created_at: e.jira_created_at ?? null,
        due_date: (e as any).end_date ?? (e as any).due_date ?? null,
        comment_count: e.comment_count ?? null,
        labels: (e as any).labels ?? null,
        fix_versions: (e as any).fix_versions ?? null,
        rank_order: (e as any).rank_order ?? null,
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
          due_date: null,
          comment_count: null,
          labels: null,
          fix_versions: null,
          rank_order: null,
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
        due_date: (s as any).start_date ?? (s as any).due_date ?? null,
        comment_count: null,
        labels: (s as any).labels ?? null,
        fix_versions: (s as any).fix_versions ?? null,
        rank_order: (s as any).rank_order ?? null,
      });
    });
    return out;
  }, [epics, stories, initiativesByKey]);

  // ── Three-level tree: Request → Epic → Story.
  //   - Items with parent_id go into childrenOf[parent_id].
  //   - Requests always stay top-level.
  //   - Epics without a parent_id also stay top-level.
  //   - Stories with a parent_id nest under their epic.
  //   - Epics with a parent_id (pointing at an initiative) nest under it. ──
  const { topLevel, childrenOf } = useMemo(() => {
    const topLevel: BacklogItem[] = [];
    const childrenOf = new Map<string, BacklogItem[]>();
    items.forEach((it) => {
      // Apr 28, 2026 (jira-compare cycle 3 D-NEW-2): nest ANY item with
      // a parent_id, not just story/epic/feature. Earlier filter dropped
      // QA Bug, Task, Production Incident, Sub-task children — Rovo
      // confirmed BAU-5419 has 1 QA Bug + 9 Stories, but Catalyst showed
      // only the Stories (and not all of those). Jira's hierarchy nests
      // any issue with parent_id under that parent regardless of type;
      // Catalyst must mirror. Requests still stay top-level (no
      // parent_id by definition for our schema).
      if (it.parent_id) {
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

    // Apr 28 2026 (carryover #13 — chevron discoverability fix).
    // Pattern source: Jira BAU list view live DOM probe — clicked the
    // expand button on BAU-5419, observed delta +10 rows (children
    // expanded inline) and aria-label flipped from "open" to "collapse".
    // Initial state: ALL parents collapsed. Children appear only when the
    // user explicitly clicks a chevron.
    //
    // Catalyst previously inverted the semantics for typeFilter='all'
    // (Apr 27 2026 — F-NEW-3 fill): start all expanded, expandedIds
    // tracks explicitly-COLLAPSED rows. That diverged from Jira and
    // hurt discoverability — the chevron started rotated-down and users
    // didn't see "click to expand" affordance on initial load.
    //
    // Reverted to standard semantics: expandedIds tracks explicitly-
    // EXPANDED rows. Initial set is empty (URL-seeded), so all parents
    // start collapsed. Clicking a chevron adds the parent's id to the
    // set. Same behaviour for every typeFilter. Matches Jira parity.
    for (const top of topLevel) {
      const topVisible = matchesText(top) && matchesType(top) && matchesFilterBar(top);
      const kids = childrenOf.get(top.id) ?? [];
      const matchingKids = kids.filter((k) => matchesText(k) && matchesType(k) && matchesFilterBar(k));
      if (topVisible) tryPush(top);
      // 2026-05-12 Jira parity: when showHierarchy is OFF, render ALL children
      // flat (no parent grouping, no expand/collapse). When ON (default),
      // children render only when their parent is in expandedIds.
      const showChildren = !showHierarchy || expandedIds.has(top.id);
      if (showChildren) {
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
  }, [topLevel, childrenOf, items, expandedIds, showHierarchy, typeFilter, search, filterValue]);

  // ── "Hide done work items" filter (Apr 27 2026 — Jira parity View
  // options menu). When toggled on, rows whose status indicates a
  // done/closed state are filtered out before sorting. Status names
  // come from Catalyst's STATUS_OPTIONS — anything matching /done|closed/i
  // is treated as done. ──
  const filteredVisibleRows: BacklogItem[] = useMemo(() => {
    if (!hideDoneItems) return visibleRows;
    return visibleRows.filter((r) => !/^(done|closed)$/i.test((r.status || '').trim()));
  }, [visibleRows, hideDoneItems]);

  // ── Sorting ──
  const sortedRows: BacklogItem[] = useMemo(() => {
    if (!sortKey || !sortDir) return filteredVisibleRows;
    const s = [...filteredVisibleRows];
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
  }, [filteredVisibleRows, sortKey, sortDir]);

  const total = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // Slicing is handled inside JiraTable now (Round H). We keep `total` +
  // `totalPages` available for the count display in the toolbar.

  // Group definitions — built off ALL filtered items (not just expand/collapse-
  // visible rows). When groupBy is active the table shows every matching item
  // regardless of hierarchy expand state, so "Group by Parent" shows ALL
  // stories under their parent epic even when the epic row is collapsed.
  const groupedRows = useMemo(() => {
    if (groupBy === 'none') return null;

    // Apply the same filter logic as visibleRows but WITHOUT the expand/collapse
    // gate — grouping needs the full flat item set.
    const q = search.trim().toLowerCase();
    let rowsForGroup = items.filter((it) => {
      if (q && !(it.title || '').toLowerCase().includes(q) &&
          !(it.key || '').toLowerCase().includes(q) &&
          !(it.assignee_name || '').toLowerCase().includes(q)) return false;
      if (typeFilter !== 'all' && it.type !== typeFilter) return false;
      const f = filterValue;
      if (f.priority.length && (!it.priority || !f.priority.includes(it.priority as any))) return false;
      if (f.status.length && (!it.status || !f.status.includes(it.status))) return false;
      if (f.workType.length) {
        const typeLabel = it.type.charAt(0).toUpperCase() + it.type.slice(1);
        if (!f.workType.includes(typeLabel)) return false;
      }
      if (f.assignees.length && (!it.assignee_name || !f.assignees.includes(it.assignee_name))) return false;
      if (f.reporter.length && (!it.reporter_name || !f.reporter.includes(it.reporter_name))) return false;
      if (f.fixVersions.length && (!it.parent_id || !f.fixVersions.includes(it.parent_id))) return false;
      if (f.updated.from && (!it.updated_at || it.updated_at < f.updated.from)) return false;
      if (f.updated.to && (!it.updated_at || it.updated_at > f.updated.to + 'T23:59:59')) return false;
      if (f.created.from && (!it.created_at || it.created_at < f.created.from)) return false;
      if (f.created.to && (!it.created_at || it.created_at > f.created.to + 'T23:59:59')) return false;
      if (hideDoneItems && /^(done|closed)$/i.test((it.status || '').trim())) return false;
      return true;
    });

    // Apply the same sort as sortedRows.
    if (sortKey && sortDir) {
      const getValue = (it: BacklogItem): string | number => {
        switch (sortKey) {
          case 'key':      return it.key || '';
          case 'summary':  return (it.title || '').toLowerCase();
          case 'status':   return (it.status || '').toLowerCase();
          case 'parent':   return (it.parent_label || '').toLowerCase();
          case 'assignee': return (it.assignee_name || '').toLowerCase();
          case 'priority': {
            const i = PRIORITY_ORDER.indexOf((it.priority || '').toLowerCase());
            return i >= 0 ? i : 999;
          }
          case 'updated':  return it.updated_at || '';
          default:         return '';
        }
      };
      rowsForGroup = [...rowsForGroup].sort((a, b) => {
        const av = getValue(a); const bv = getValue(b);
        const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === 'ASC' ? cmp : -cmp;
      });
    }

    const groupLabelFor = (it: BacklogItem): string => {
      switch (groupBy) {
        case 'status':   return it.status || 'No status';
        case 'parent':   return it.parent_label || (it.type === 'epic' ? it.title : 'No parent');
        case 'assignee': return it.assignee_name || 'Unassigned';
        case 'priority': return it.priority ? it.priority[0].toUpperCase() + it.priority.slice(1) : 'No priority';
        case 'type': {
          const t = it.type || '';
          if (t === 'epic') return 'Epic';
          if (t === 'feature') return 'Feature';
          if (t === 'story') return 'Story';
          if (t === 'bug') return 'QA Bug';
          if (t === 'incident') return 'Production Incident';
          return t ? t[0].toUpperCase() + t.slice(1) : 'No type';
        }
        default: return '—';
      }
    };
    const buckets = new Map<string, BacklogItem[]>();
    for (const it of rowsForGroup) {
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
    // Apr 27, 2026 (audit pass 10): build a rich labelNode per groupBy
    // so the group header renders Atlaskit primitives instead of plain
    // uppercase text — matches the spec the user shared (Lozenge for
    // status, Avatar for assignee, PriorityBars for priority,
    // JiraIssueTypeIcon for parent). The plain `label` string is kept
    // so id/sort/persistence still work; JiraTable picks `labelNode`
    // when present.
    return keys.map((k) => {
      const sample = buckets.get(k)![0];
      let labelNode: React.ReactNode = null;
      if (groupBy === 'status') {
        // 2026-05-08: use StatusPill (exact Jira hex colors) instead of Atlaskit
        // Lozenge — Atlaskit's token resolution in Catalyst's theme differs from
        // Jira's rendering (e.g. success → rgb(239,255,214) vs Jira's rgb(179,223,114)).
        const appearance = sample.status ? statusAppearance(sample.status) : 'default';
        const label = sample.status ? statusLabel(sample.status) : k.toUpperCase();
        // 2026-05-08 DOM probe confirms: Jira renders ALL status group headers with a
        // visible pill (including grey/default — bg: rgb(221,222,225)). StatusPill uses
        // exact Jira-measured hex, not Atlaskit token resolution which diverges.
        labelNode = <StatusPill appearance={appearance as LozengeAppearance}>{label}</StatusPill>;
      } else if (groupBy === 'assignee') {
        const isUnassigned = !sample.assignee_name;
        const avatarUrl = sample.assignee_name ? (resolveAvatarUrl(sample.assignee_name) ?? avatarsByName?.get(sample.assignee_name)) : null;
        labelNode = (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Avatar size="small" name={k} src={avatarUrl || undefined} appearance={isUnassigned ? 'square' : 'circle'} />
            <span>{k}</span>
          </span>
        );
      } else if (groupBy === 'priority') {
        // Compact bars + label, matching the Priority cell renderer
        const p = (sample.priority || '').toLowerCase();
        const PRIORITY_RANK: Record<string, { level: number; color: string }> = {
          highest:  { level: 4, color: 'var(--ds-icon-accent-red, #C9372C)' }, critical: { level: 4, color: 'var(--ds-icon-accent-red, #C9372C)' },
          high:     { level: 3, color: 'var(--ds-text-warning, var(--cp-amber, #F59E0B))' },
          medium:   { level: 2, color: 'var(--ds-text-success, #22C55E)' },
          low:      { level: 1, color: 'var(--ds-text-success, #22C55E)' },
          lowest:   { level: 0, color: 'var(--ds-border, #DFE1E6)' },
        };
        const rank = PRIORITY_RANK[p] || { level: 0, color: 'var(--ds-border, #DFE1E6)' };
        labelNode = (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title={k}>
            <span style={{ display: 'inline-flex', gap: 2 }}>
              {[1, 2, 3, 4].map((i) => (
                <span key={i} style={{ width: 4, height: 12, borderRadius: 1, background: i <= rank.level ? rank.color : 'var(--ds-border, #DFE1E6)' }} />
              ))}
            </span>
            <span>{k}</span>
          </span>
        );
      } else if (groupBy === 'parent') {
        const isOrphan = /^(No parent|—)$/i.test(k);
        const parentType = sample.parent_issue_type || (sample.type === 'epic' ? 'Epic' : 'Epic');
        // 2026-05-10 hierarchy parity: render parent header as
        // [type icon] [KEY in mono] [summary]
        // The bucket's `sample` may be the parent itself (epic with no
        // parent_key) OR a child of the parent (parent_key set). Find a
        // child to source parent_key; if none, sample is the parent and
        // we use its own `key`.
        const bucketRows = buckets.get(k)!;
        const childWithParentKey = bucketRows.find((row) => !!row.parent_key);
        const parentKey = isOrphan
          ? ''
          : (childWithParentKey?.parent_key || sample.key || '');
        // Strip "[KEY] " prefix from parent_label if present.
        const parentSummary = isOrphan
          ? ''
          : k.replace(/^\[[^\]]+\]\s*/, '').replace(/^[A-Z]+-\d+\s*[—\-:]\s*/, '');
        // Parent's status — look it up from the parent row itself if the
        // parent is in the bucket (epic with no parent_key), else from a
        // separate items lookup by parent_key. Falls back to undefined.
        const parentRow = bucketRows.find((row) => !row.parent_key)
          ?? items.find((it) => it.key === parentKey);
        const parentStatus = isOrphan ? null : (parentRow?.status ?? null);
        const parentStatusAppearance = parentStatus ? statusAppearance(parentStatus) : 'default';
        labelNode = (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            {!isOrphan && <JiraIssueTypeIcon type={parentType} size={14} />}
            {!isOrphan && parentKey && (
              <span style={{
                fontFamily: 'var(--cp-font-mono)',
                fontSize: 12,
                color: 'var(--ds-text-subtle, #42526E)',
                fontWeight: 600,
                flexShrink: 0,
              }}>{parentKey}</span>
            )}
            {!isOrphan && parentSummary && (
              <span style={{
                color: 'var(--ds-text, #172B4D)',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}>{parentSummary}</span>
            )}
            {!isOrphan && parentStatus && (
              <span style={{ flexShrink: 0, marginLeft: 4 }}>
                <StatusPill appearance={parentStatusAppearance as LozengeAppearance}>
                  {parentStatus}
                </StatusPill>
              </span>
            )}
            {isOrphan && <span style={{ color: 'var(--ds-text-subtlest, #6B6E76)' }}>{k}</span>}
          </span>
        );
      }
      return { id: k, label: k, labelNode: labelNode ?? undefined, rows: buckets.get(k)! };
    });
  }, [groupBy, items, search, typeFilter, filterValue, hideDoneItems, sortKey, sortDir, avatarsByName]);

  useEffect(() => { setPage(1); }, [typeFilter, search, filterValue, sortKey, sortDir]);

  // ── Row click → full-width detail route ──
  const openDetail = useCallback((it: BacklogItem) => {
    // Save scroll position before navigating to detail view
    const container = document.querySelector('[data-backlog-scroll-container]');
    if (container && projectKey) {
      sessionStorage.setItem(`backlog-scroll-${projectKey}`, Math.max(0, container.scrollTop).toString());
    }
    writeTicketOrigin({
      fromUrl: `${resolvedBaseUrl}/backlog`,
      fromLabel: 'Backlog',
      fromType: 'story-backlog',
    });
    navigate(`${resolvedBaseUrl}/backlog/${it.issue_key || it.id}`);
  }, [projectKey, navigate]);
  // Detail callbacks removed 2026-05-12 task E: no longer managing panel state.

  // Detail navigation (j/k keys) removed 2026-05-12 task E: detail view now
  // full-page route. User can navigate via breadcrumb or back-button.

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
          avatarUrl: resolveAvatarUrl(it.assignee_name) ?? avatarsByName.get(it.assignee_name.toLowerCase()) ?? null,
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
          avatarUrl: resolveAvatarUrl(it.reporter_name) ?? avatarsByName.get(it.reporter_name.toLowerCase()) ?? null,
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
  //   context menu so there's one source of truth.
  //
  // 2026-05-12 — Jira parity: rewritten to match the 8-item set probed
  // from Jira BAU live (digital-transformation.atlassian.net). Order:
  //   1. View work item · 2. Comment · 3. Log work · 4. Agile board
  //   5. Rank to top · 6. Rank to bottom · 7. Attach files
  // (Connect Slack channel — OUT OF SCOPE per gap registry, no Slack integration)
  // Catalyst-specific actions (Open in Jira, Copy link, Duplicate, Delete)
  // kept as secondary group at the end of the menu.
  const rowActions = useMemo<RowAction<BacklogItem>[]>(() => ([
    { id: 'view', label: 'View work item', icon: <AkEditIcon label="" size="small" />, onClick: (r) => openDetail(r) },
    { id: 'comment', label: 'Comment', icon: <AkCommentIcon label="" />,
      onClick: (r) => { openDetail(r); flag.info('Open comments', 'Activity → Comments in the right rail.'); } },
    { id: 'log-work', label: 'Log work', icon: <AkClockIcon label="" />,
      onClick: (r) => { openDetail(r); flag.info('Log work', 'Worklog section in the right rail.'); } },
    { id: 'agile-board', label: 'Agile board', icon: <AkBoardIcon label="" />,
      onClick: (r) => {
        const parent = r.parent_key || r.key;
        navigate(`${resolvedBaseUrl}/kanban${parent ? `?epic=${parent}` : ''}`);
      } },
    { id: 'rank-top', label: 'Rank to top', icon: <AkArrowUpIcon label="" />,
      onClick: async (r) => {
        // 2026-05-12 task #10 — rank-to-top: writes a rank_order lower than
        // the current MIN within the project scope. Schema migration lives
        // at supabase/migrations-pending/20260512_ph_issues_rank_order.sql
        // (PENDING Vikram approval + Lovable manual paste). Until that
        // lands the column doesn't exist → graceful fallback to info flag.
        try {
          const { data: minRow, error: minErr } = await supabase
            .from('ph_issues')
            .select('sort_order')
            .eq('project_key', projectKey)
            .not('sort_order', 'is', null)
            .order('sort_order', { ascending: true })
            .limit(1)
            .maybeSingle();
          if (minErr || !minRow) {
            flag.info('Rank to top', `No sortable rows found.`);
            return;
          }
          const newRank = ((minRow as any).sort_order ?? 100) - 10;
          const { error: updErr } = await supabase
            .from('ph_issues')
            .update({ sort_order: newRank } as any)
            .eq('issue_key', r.id);
          if (updErr) throw updErr;
          queryClient.invalidateQueries({ queryKey: ['backlog-stories-v2', projectId] });
          flag.success('Ranked to top', r.key || r.id);
        } catch (e: any) {
          flag.error('Rank failed', e?.message ?? String(e));
        }
      } },
    { id: 'rank-bottom', label: 'Rank to bottom', icon: <AkArrowDownIcon label="" />,
      onClick: async (r) => {
        // Symmetric: writes rank_order higher than current MAX in project scope.
        try {
          const { data: maxRow, error: maxErr } = await supabase
            .from('ph_issues')
            .select('sort_order')
            .eq('project_key', projectKey)
            .not('sort_order', 'is', null)
            .order('sort_order', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (maxErr || !maxRow) {
            flag.info('Rank to bottom', `No sortable rows found.`);
            return;
          }
          const newRank = ((maxRow as any).sort_order ?? 0) + 10;
          const { error: updErr } = await supabase
            .from('ph_issues')
            .update({ sort_order: newRank } as any)
            .eq('issue_key', r.id);
          if (updErr) throw updErr;
          queryClient.invalidateQueries({ queryKey: ['backlog-stories-v2', projectId] });
          flag.success('Ranked to bottom', r.key || r.id);
        } catch (e: any) {
          flag.error('Rank failed', e?.message ?? String(e));
        }
      } },
    { id: 'attach', label: 'Attach files', icon: <AkAttachmentIcon label="" />,
      onClick: (r) => { openDetail(r); flag.info('Attach files', 'Attachments section in the right rail.'); } },
    // ── Secondary group — Catalyst-specific actions ─────────────────────
    { id: 'open-in-jira', label: 'Open in Jira', icon: <AkLinkExternalIcon label="" size="small" />,
      onClick: (r) => {
        if (r.key) window.open(`https://digital-transformation.atlassian.net/browse/${r.key}`, '_blank', 'noopener');
        else flag.info('No Jira key', 'This is a Catalyst-native item with no Jira counterpart.');
      },
    },
    { id: 'copy-link', label: 'Copy link', icon: <AkLinkIcon label="" size="small" />,
      onClick: (r) => {
        const url = `${window.location.origin}/project-hub/${projectKey}/backlog?selectedIssue=${r.id}`;
        navigator.clipboard.writeText(url).then(
          () => flag.success('Link copied'),
          () => flag.error('Copy failed', 'Clipboard access denied'),
        );
      },
    },
    { id: 'duplicate', label: 'Duplicate', icon: <AkCopyIcon label="" size="small" />,
      onClick: async (r) => {
        try {
          const issueKey = await generateIssueKey(projectKey);
          const nowIso = new Date().toISOString();
          const { error } = await supabase.from('ph_issues').insert({
            issue_key: issueKey,
            project_key: projectKey,
            summary: `Copy of ${r.title}`,
            issue_type: r.type || 'Story',
            status: 'To Do',
            priority: r.priority || 'medium',
            source: 'catalyst',
            parent_key: r.parent_key ?? null,
            jira_created_at: nowIso,
            jira_updated_at: nowIso,
          } as any);
          if (error) throw error;
          queryClient.invalidateQueries({ queryKey: ['backlog-stories-v2', projectId] });
          flag.success('Duplicated', `Created ${issueKey}`);
        } catch (e: any) {
          flag.error('Duplicate failed', e?.message ?? String(e));
        }
      },
      hidden: (r) => r.source !== 'catalyst' },
    { id: 'delete', label: 'Delete', icon: <AkTrashIcon label="" size="small" />, danger: true,
      onClick: (r) => setDeleteTarget(r),
      hidden: (r) => r.source !== 'catalyst' },
  ]), [openDetail, projectKey, projectId, navigate, queryClient]);

  // ── Column schema ──
  // F8 (iter-9): __caret column dropped — caret affordance folded into the
  // Type col cell renderer instead (matches Jira's inline expand pattern).
  // F9 (iter-9): Type col widened from width:3 (~40px) to width:9 (~108px).
  const columns = useMemo<Column<BacklogItem>[]>(() => ([
    // 2026-05-17 jira-compare cycle 2 (design-critique H8 P0): __drag
    // column removed entirely. Drag handle now renders as a row-level
    // absolute-positioned overlay on the __select cell via JiraTable's
    // renderRowDragHandle prop (wired below at the JiraTable call site).
    // Matches Jira's grip-on-row-hover pattern; eliminates the wasted
    // ~36px empty column 2 that Vikram flagged.
    // 2026-05-17 jira-compare cycle 2: redundant __checkbox column removed.
    // JiraTable auto-prepends a __select column when selectable={true} —
    // having both rendered as an empty column 2 visible to Vikram. Now the
    // canonical's __select is the only selection column, fed by the same
    // selection / onSelectionChange props (lines ~3031-3033).
    {
      // 2026-05-17 jira-compare cycle 2 (design-critique H4 P0): merged Key
      // and Summary columns into ONE "Work" column matching Jira's BAU list.
      // Jira renders [type icon][BAU-key link][summary text] in a SINGLE
      // cell with one header labeled "Work". Catalyst was splitting this
      // across two columns ("Key" + "Summary") with a vertical divider that
      // Jira does not have. Column id stays 'key' for URL backward-compat
      // (DEFAULT_VISIBLE_COLUMNS / ALLOWED_COLUMN_IDS still reference 'key').
      // The standalone 'summary' column block below is now deleted.
      id: 'key',
      label: 'Work',
      flex: true,
      sortable: true,
      alwaysVisible: true,
      defaultVisible: true,
      accessor: (r) => r.key || '',
      // Composed cell: keyCellRenderer renders [icon][BAU-XXXX link],
      // summaryCellRenderer adds the inline-editable title text. Both
      // factories are instantiated once per column-array memo recreation.
      cell: (() => {
        const keyCellRenderer = makeKeyCell(
          (r: BacklogItem) => r.key,
          (r: BacklogItem) => openDetail(r),
          (r: BacklogItem) => `/project-hub/${projectKey}/backlog/${r.key || r.id}`,
          (it: BacklogItem) => {
          if (it.type === 'initiative') {
            const init = initiativesByKey?.get(it.key || '');
            const bg = init?.initiative_type_color_hex || '#904EE2';
            return (
              <span
                title={init?.initiative_type_label || 'Request'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  background: bg,
                  color: 'var(--ds-text-inverse, #FFFFFF)',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {(init?.initiative_type_key || 'I')[0].toUpperCase()}
              </span>
            );
          }
          const typeMap: Record<Exclude<BacklogType, 'initiative'>, string> = {
            epic: 'Epic',
            feature: 'Feature',
            story: 'Story',
            bug: 'QA Bug',
            incident: 'Production Incident',
          };
          return <JiraIssueTypeIcon type={typeMap[it.type as Exclude<BacklogType, 'initiative'>]} size={16} />;
        },
        );
        const summaryCellRenderer = makeSummaryInlineEditCell<BacklogItem>({
          getSummary: (r) => r.title,
          // Iron dome OPEN (2026-04-27 audit). Every row is inline-editable.
          onChange: (row, next) => updateField.mutate({ id: row.id, source: row.source, patch: { title: next } }),
          // 2026-05-12 Jira parity: row hover → ↗ "Open work item" opens the
          // detail panel for that row (mirrors Jira's full-width detail open).
          onOpenWorkItem: (row) => openDetail(row),
          // 2026-05-12 Jira parity: row hover → + "Create child item".
          onCreateChild: (row) => {
            const groupId = groupBy === 'parent'
              ? (row.parent_key || row.id)
              : row.parent_key || row.id;
            setInlineCreateGroup(groupId);
          },
          canCreateChild: (row) => {
            const t = row.type || '';
            return t === 'Epic' || t === 'Feature' || t === 'Story' || t === 'Task';
          },
        });
        return function WorkCell(props: any) {
          return (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                minWidth: 0,
              }}
            >
              <span style={{ flexShrink: 0 }}>{keyCellRenderer(props)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>{summaryCellRenderer(props)}</span>
            </span>
          );
        };
      })(),
    },
    {
      id: 'status',
      label: 'Status',
      // 2026-05-16: Jira DOM probe = 180px. width:15 = 180px.
      // Prior width:20 (240px) was too wide. Status pill wraps at all widths so 180px works.
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
        options: ALL_BACKLOG_STATUSES,
        appearanceFor: (s) => statusAppearance(s) as LozengeAppearance,
        onChange: (row, next) => updateField.mutate({ id: row.id, source: row.source, patch: { status: next } }),
      }),
      // 2026-05-10 Jira-parity per-column filter chevron.
      filterable: true,
      hasActiveFilter: filterValue.status.length > 0,
      renderFilterMenu: (close) => (
        <ColumnFilterMultiSelect
          title="Status"
          options={ALL_BACKLOG_STATUSES}
          selected={filterValue.status}
          onChange={(next) => setFilterValue((p) => ({ ...p, status: next }))}
          onClose={close}
        />
      ),
    },
    {
      id: 'comments',
      label: 'Comments',
      // Jira-parity: Comments is the 5th column (after Status) in Jira's BAU
      // default list view. icon(16) + gap(4) + "Add comment"(~90px) + cell-
      // padding(24px) = ~134px needed. 12 fractions = 144px (inner 120px) fits.
      // 2026-05-12 design-critique H8 fix: reduced from width:12 (144px) to
      // width:8 (96px). Icon + count badge is the only content; fits easily.
      width: 8,
      sortable: false,
      defaultVisible: true,
      alwaysVisible: false,
      cell: makeCommentsCell(
        (r: BacklogItem) => r.comment_count,
        (r: BacklogItem) => openDetail(r),
      ),
    },
    {
      id: 'parent',
      label: 'Parent',
      // 2026-05-16: Jira DOM probe = 129px. width:11 ≈ 132px matches.
      // Prior width:22 (264px) was double Jira's actual column width.
      width: 11,
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
      // width:11 = 132px — fits avatar + typical name length without cramping.
      width: 11,
      sortable: true,
      defaultVisible: true,
      cell: makeAssigneeEditCell<BacklogItem>({
        getAssignee: (r) => r.assignee_name
          ? { id: r.assignee_name, name: r.assignee_name, avatarUrl: resolveAvatarUrl(r.assignee_name) ?? avatarsByName.get(r.assignee_name.toLowerCase()) ?? null }
          : null,
        options: assigneeOptions.map<AssigneeChoice>((a) => ({ id: a.id, name: a.name, avatarUrl: a.avatarUrl ?? null })),
        onChange: (row, next) => updateField.mutate({
          id: row.id, source: row.source,
          patch: { assignee_id: next?.id ?? null, assignee_name: next?.name ?? null },
        }),
      }),
      filterable: true,
      hasActiveFilter: filterValue.assignees.length > 0,
      renderFilterMenu: (close) => (
        <ColumnFilterMultiSelect
          title="Assignee"
          options={['Unassigned', ...assigneeOptions.map((a) => a.name)]}
          selected={filterValue.assignees}
          onChange={(next) => setFilterValue((p) => ({ ...p, assignees: next }))}
          onClose={close}
        />
      ),
    },
    {
      id: 'due_date',
      label: 'Due date',
      width: 8,
      sortable: true,
      defaultVisible: false,
      accessor: (r: BacklogItem) => r.due_date || '',
      cell: makeDateEditCell<BacklogItem>({
        getDate: (r) => r.due_date,
        onChange: (row, next) => updateField.mutate({ id: row.id, source: row.source, patch: { due_date: next } }),
      }),
    },
    {
      id: 'priority',
      label: 'Priority',
      // 2026-05-12 design-critique H8 fix: reduced from width:8 (96px) to
      // width:6 (72px). Priority is icon + label (High/Medium/Low/Highest) —
      // all values ≤8 chars fit at 72px inner.
      width: 6,
      sortable: true,
      defaultVisible: true,
      cell: makePriorityEditCell<BacklogItem>({
        getPriority: (r) => r.priority,
        // F2: pass the full Jira BAU priority vocabulary including
        // 'highest' so rows that load with priority='highest' stay
        // editable without silent downgrades.
        options: PRIORITY_OPTIONS,
        onChange: (row, next) => updateField.mutate({ id: row.id, source: row.source, patch: { priority: next } }),
      }),
      filterable: true,
      hasActiveFilter: filterValue.priority.length > 0,
      renderFilterMenu: (close) => (
        <ColumnFilterMultiSelect
          title="Priority"
          options={PRIORITY_OPTIONS.map((p) => p[0].toUpperCase() + p.slice(1))}
          selected={filterValue.priority}
          onChange={(next) => setFilterValue((p) => ({ ...p, priority: next as typeof filterValue.priority }))}
          onClose={close}
        />
      ),
    },
    {
      id: 'labels',
      label: 'Labels',
      width: 7,
      sortable: false,
      defaultVisible: false,
      accessor: (r: BacklogItem) => (r.labels || []).join(', '),
      cell: makeLabelsEditCell<BacklogItem>({
        getLabels: (r) => r.labels,
        onChange: (row, next) => updateField.mutate({ id: row.id, source: row.source, patch: { labels: next } }),
      }),
    },
    {
      id: 'fix_versions',
      label: 'Fix versions',
      // 2026-05-16: Jira DOM probe = 220px. width:18 = 216px (≈220px).
      // Prior width:10 (120px) clipped version names badly.
      width: 18,
      sortable: false,
      defaultVisible: true,
      accessor: (r: BacklogItem) => (r.fix_versions || []).join(', '),
      cell: makeFixVersionsCell((r: BacklogItem) => r.fix_versions),
      include: (row: BacklogItem) => row.issue_type !== 'Feature',
    },
    {
      id: 'created',
      label: 'Created',
      width: 8,
      sortable: true,
      defaultVisible: false,
      accessor: (r: BacklogItem) => r.created_at || '',
      cell: makeDateCell((r: BacklogItem) => r.created_at),
    },
    {
      id: 'updated',
      label: 'Updated',
      width: 8,
      sortable: true,
      defaultVisible: false,
      accessor: (r) => r.updated_at || '',
      cell: makeDateCell((r: BacklogItem) => r.updated_at),
    },
    {
      id: 'reporter',
      label: 'Reporter',
      // 2026-05-12 design-critique H8 fix: reduced from width:15 (180px) to
      // width:10 (120px) to reduce excessive default spacing. Reporter is
      // rarely visible by default; hidden columns don't impact visual density.
      width: 10,
      sortable: true,
      defaultVisible: false,
      accessor: (r: BacklogItem) => r.reporter_name || '',
      cell: makeAssigneeCell((r: BacklogItem) =>
        r.reporter_name
          ? { name: r.reporter_name, avatarUrl: resolveAvatarUrl(r.reporter_name) ?? avatarsByName.get(r.reporter_name.toLowerCase()) ?? null }
          : null,
      ),
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
  ]), [expandedIds, toggleExpanded, hasChildren, parentOptions, assigneeOptions, avatarsByName, updateField, rowActions, sortKey, sortDir, groupBy]);

  // Filter columns to only allowed standard Jira fields (2026-05-12).
  // Prevents type-specific custom fields and banned fields from appearing
  // in the column picker. See ALLOWED_COLUMN_IDS + BANNED_COLUMN_IDS above.
  const filteredCols = useMemo(() =>
    columns.filter((col) => ALLOWED_COLUMN_IDS.has(col.id) && !BANNED_COLUMN_IDS.has(col.id)),
    [columns, ALLOWED_COLUMN_IDS, BANNED_COLUMN_IDS]
  );


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
      // source='catalyst'. Soft-delete via jira_removed_at — the guardrail
      // trigger trg_guard_ph_issues_no_delete blocks hard DELETE on ph_issues
      // (returns 204 silently via RLS). All backlog queries filter on
      // jira_removed_at IS NULL so setting it removes the row from all views.
      // F-iter9 PK fix: ph_issues PK is issue_key (item.id is populated from issue_key).
      const { error } = await supabase
        .from('ph_issues')
        .update({ jira_removed_at: new Date().toISOString() })
        .eq('issue_key', item.id)
        .eq('source', 'catalyst');
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
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkMoveTarget, setBulkMoveTarget] = useState<string | null>(null);
  const [bulkTransitionOpen, setBulkTransitionOpen] = useState(false);
  const [bulkTransitionTarget, setBulkTransitionTarget] = useState<string | null>(null);
  // Bulk change wizard — 2-step modal (step 1: choose action; step 2: configure + confirm).
  const [bulkWizardOpen, setBulkWizardOpen] = useState(false);
  const [bulkWizardStep, setBulkWizardStep] = useState<1 | 2>(1);
  const [bulkWizardAction, setBulkWizardAction] = useState<'edit' | 'move' | 'transition' | 'delete' | null>(null);
  const [bulkWizardEditField, setBulkWizardEditField] = useState<'priority' | 'status' | 'assignee' | 'parent' | null>(null);
  const [bulkWizardEditValue, setBulkWizardEditValue] = useState<string | null>(null);
  const closeBulkWizard = () => {
    setBulkWizardOpen(false);
    setBulkWizardStep(1);
    setBulkWizardAction(null);
    setBulkWizardEditField(null);
    setBulkWizardEditValue(null);
  };
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
      // Soft-delete via jira_removed_at (hard DELETE blocked by trigger).
      const { error } = await supabase
        .from('ph_issues')
        .update({ jira_removed_at: new Date().toISOString() })
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

  const typeCount = {
    all: items.length,
    initiative: items.filter((i) => i.type === 'initiative').length,
    epic: items.filter((i) => i.type === 'epic').length,
    feature: items.filter((i) => i.type === 'feature').length,
    story: items.filter((i) => i.type === 'story').length,
    bug: items.filter((i) => i.type === 'bug').length,
    incident: items.filter((i) => i.type === 'incident').length,
  };


  // Apr 27, 2026 — jira-compare audit P1 #7: "More actions" overflow ⋯
  // wired to @atlaskit/dropdown-menu with view-level actions (Refresh,
  // Export). Refresh invalidates the backlog query keys; Export is a
  // stub flag until CSV pipeline lands. P1 #8 view-options sibling
  // (Settings icon → density menu) lives below.
  const handleRefreshBacklog = () => {
    queryClient.invalidateQueries({ queryKey: ['backlog-stories-v2', projectId] });
    queryClient.invalidateQueries({ queryKey: ['backlog-epics', projectId] });
    flag.info('Refreshing', 'Reloading backlog data…');
  };

  const handleExportCSV = () => {
    const rows = filteredVisibleRows.length > 0 ? filteredVisibleRows : items;
    const headers = ['Key', 'Summary', 'Type', 'Status', 'Priority', 'Assignee', 'Reporter', 'Parent', 'Created', 'Updated', 'Due date'];
    const escape = (v: string | null | undefined) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(','),
      ...rows.map((r) => [
        escape(r.key),
        escape(r.title),
        escape(r.type),
        escape(r.status),
        escape(r.priority),
        escape(r.assignee_name),
        escape(r.reporter_name),
        escape(r.parent_key ? `${r.parent_key} ${r.parent_label || ''}`.trim() : null),
        escape(r.created_at ? r.created_at.slice(0, 10) : null),
        escape(r.updated_at ? r.updated_at.slice(0, 10) : null),
        escape(r.due_date ? r.due_date.slice(0, 10) : null),
      ].join(',')),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backlog-${projectId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    flag.success('Exported', `${rows.length} rows exported to CSV`);
  };

  // Shared icon-button styles for the right-cluster toolbar buttons.
  // All 32×32, transparent bg, ADS subtle text token.
  const toolbarIconButtonStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, padding: 0,
    border: 'none', background: 'transparent', borderRadius: 3,
    color: token('color.text.subtle', '#42526E'), cursor: 'pointer',
  };

  // P1 #8 — Settings (view-options) icon button. Separate from "Manage
  // columns" (which JiraTable owns inside the table head's `+` button).
  // Apr 27, 2026 (re-probe iter 2): @atlaskit/dropdown-menu rendered an
  // EMPTY portal on this surface (verified via Chrome MCP — aria-expanded
  // flipped to true but atlaskitPortalCount=0, no role="menu" in DOM,
  // body innerText didn't include "Density"). Same documented bug that
  // drove GroupByControl's bespoke portal pattern (see line ~2162).
  // Switched to the shared ToolbarMenuButton helper which uses
  // ReactDOM.createPortal directly and computes anchor from the trigger
  // rect — verified working pattern on this exact React tree.
  // Apr 27 2026 (jira-compare regression iter 3 — View options menu
  // parity). Replaced Catalyst's Density/Layout items with Jira's actual
  // view-options menu (probed from /jira/.../list?groupBy=status):
  //   - Hide done work items   (toggle, filters status="done"|"closed")
  //   - Expand all work items  (clears collapsedGroups)
  //   - Collapse all work items (sets every group id to collapsed)
  // The "Hide done" item shows a check/✓ glyph when active so the toggle
  // state is visible without a real shadcn-style switch on the menu.
  const toolbarViewOptionsButton = (
    <ToolbarMenuButton
      icon={<AkFilterIcon label="" size="small" />}
      ariaLabel="View options"
      tooltipContent="View options"
      buttonStyle={toolbarIconButtonStyle}
      groups={[
        {
          items: [
            {
              id: 'hide-done',
              label: hideDoneItems ? 'Show done work items' : 'Hide done work items',
              onClick: () => setHideDoneItems((v) => !v),
            },
            {
              id: 'expand-all',
              label: 'Expand all work items',
              onClick: () => {
                setCollapsedGroups(new Set());
                flag.success('Expanded all work items');
              },
            },
            {
              id: 'collapse-all',
              label: 'Collapse all work items',
              onClick: () => {
                if (groupedRows) {
                  setCollapsedGroups(new Set(groupedRows.map((g) => g.id)));
                  flag.success('Collapsed all work items');
                } else {
                  flag.info('Collapse all', 'Switch to a grouped view first.');
                }
              },
            },
          ],
        },
        {
          items: [
            {
              id: 'density-compact',
              label: density === 'compact' ? '✓ Compact' : 'Compact',
              onClick: () => setDensity('compact'),
            },
            {
              id: 'density-comfortable',
              label: density === 'comfortable' ? '✓ Comfortable' : 'Comfortable',
              onClick: () => setDensity('comfortable'),
            },
          ],
        },
      ]}
    />
  );

  // 2026-05-12 — More actions overflow ⋯. Probed Jira's 10-item set:
  //   1. Apply settings from old List view   — Jira-internal migration, N/A
  //   2. View work items as a chart          — out of scope (no chart pivot)
  //   3. Format rules                        — Jira-specific, N/A
  //   4. Hide done work items [toggle]       — implemented (state at L646)
  //   5. Show hierarchy [toggle]             — implemented (state at L649)
  //   6. Export →                            — implemented (CSV)
  //   7. Import work items from CSV          — stub flag
  //   8. Bulk change work items              — opens bulk wizard (task #7)
  //   9. Go to all work items                — wired to /allwork route
  //  10. Give feedback                       — out of scope
  // Items grouped: view-toggles, data-ops, navigation.
  const toolbarMoreActionsButton = (
    <ToolbarMenuButton
      icon={<AkMoreIcon label="" size="small" />}
      ariaLabel="More actions"
      tooltipContent="More actions"
      buttonStyle={toolbarIconButtonStyle}
      groups={[
        // Group 1 — view toggles (Jira parity items 4 + 5)
        { items: [
          { id: 'toggle-hide-done',
            label: hideDoneItems ? 'Show done work items' : 'Hide done work items',
            icon: <AkArchiveBoxIcon label="" size="small" />,
            onClick: () => setHideDoneItems((v) => !v) },
          { id: 'toggle-hierarchy',
            label: showHierarchy ? 'Hide hierarchy' : 'Show hierarchy',
            icon: <AkChevronDownIcon label="" size="small" />,
            onClick: () => setShowHierarchy((v) => !v) },
        ]},
        // Group 2 — data ops (Jira parity items 6 + 7 + 8)
        { items: [
          { id: 'refresh', label: 'Refresh', icon: <AkRefreshIcon label="" size="small" />, onClick: handleRefreshBacklog },
          { id: 'export', label: 'Export to CSV', icon: <AkDownloadIcon label="" size="small" />, onClick: handleExportCSV },
          { id: 'import-csv', label: 'Import work items from CSV', icon: <AkDownloadIcon label="" size="small" />,
            onClick: () => flag.info('Import CSV', 'CSV importer scope: pending Vikram approval.') },
          { id: 'bulk-change', label: 'Bulk change work items', icon: <AkEditIcon label="" size="small" />,
            onClick: () => setBulkWizardOpen(true), opensModal: true },
        ]},
        // Group 3 — navigation (Jira parity item 9)
        { items: [
          { id: 'all-work', label: 'Go to all work items', icon: <AkLinkIcon label="" size="small" />,
            onClick: () => navigate(`/project-hub/${projectKey}/allwork`) },
        ]},
      ]}
    />
  );


  return (
    <>
    <AtlaskitPageShell
      // Apr 27 2026 (jira-compare regression D-003): the H1 moved OUT of
      // the white card and INTO the chromeBand (Jira parity — H1 sits in
      // the chrome band, not inside the table card). The `title` prop is
      // intentionally NOT passed; passing it would double-render the H1.
      flush
      // Apr 27, 2026 — jira-compare iter 3: opt in to Jira's blue page
      // chrome (#E9F2FE probed at https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/list?groupBy=status)
      // and the white-card-with-margin geometry. cardPadding {x:48,y:16}
      // matches Jira's card-from-chrome offsets (probed card x=48 on a
      // 1214px viewport). cardBorder mirrors Jira's BaseTable subtle
      // stroke. SCOPED to this surface only — Dashboard / Releases /
      // other Project Hub views still use the V3 flat-white shell.
      // Apr 28, 2026: chrome bg now resolves from
      // `projects.settings.background` (Set project background picker).
      // Falls back to BG_DEFAULT (#E9F2FE) when unset → preserves the
      // Jira-parity look for projects that haven't picked a background.
      chromeBg={chromeBgValue}
      // Apr 27 2026 (jira-compare regression iter 4 — Vikram fullscreen
      // probe). Jira at vp 2133: baseTable.x=47, projectHeader.x=0,
      // padding-x=24 → card sits 23px in from chrome content edge. Was
      // {x:48, y:16} which gave card.x=55 in Catalyst (50px in from
      // chrome) — twice Jira's. Reducing to {x:24, y:16} so the card
      // edge aligns with toolbar/table inset measured from Jira.
      cardPadding={{ x: 24, y: 16 }}
      cardBorder="1px solid #DFE1E6"
      // Apr 27 2026 (jira-compare regression D-001/002/003): chrome-band
      // slot. Renders Projects breadcrumb + project icon + H1 ABOVE the
      // white card.
      // Apr 28 2026 (Vikram): removed AvatarGroup + Add people text button
      // + Share + Automation + Give feedback from the right cluster. Only
      // Enter full screen remains (the invite-people icon next to the H1
      // still opens the Add people modal).
      chromeBand={
        <>
        {/* jira-compare catalog item 1 cascade (2026-05-02): single
            canonical ProjectHeaderChip — replaces the legacy
            ProjectChromeBand. Vikram directive (2026-05-02): "always idea
            is to bring it as close to Jira as possible". The chip carries
            avatar + name + Add people / meatball / share / automation /
            feedback / fullscreen, matching Jira's
            horizontal-nav-header.ui.project-header.header. The legacy
            ProjectChromeBand is retained for back-compat by surfaces that
            still mount it directly, but Backlog now uses the chip alone. */}
        <ProjectHeaderChip projectKey={projectKey} />
        {/* ProjectTabBar removed 2026-05-02 per Vikram — sidebar owns nav. */}
        {false && <ProjectChromeBand
          projectName={pageTitle}
          projectIconUrl={(project as any)?.avatar_url ?? undefined}
          projectIconName={(project as any)?.icon ?? null}
          projectColor={(project as any)?.color ?? null}
          projectsHref="/"
          nameAdornment={
            <>
              {/* Apr 27 2026 (regression iter 4): small invite-people
                  icon next to project name (Jira testid
                  `invite-people.ui.navigation-add-people-button.trigger`).
                  Clicking opens the same Add people modal as the right-
                  side text button. */}
              <Tooltip content="Add people">
                <button
                  type="button"
                  data-testid="project-chrome-band.invite-icon-trigger"
                  aria-label="Add people"
                  onClick={() => setAddPeopleOpen(true)}
                  style={{
                    width: 28,
                    height: 28,
                    border: 'none',
                    background: 'transparent',
                    color: token('color.text.subtle', '#6B6E76'),
                    borderRadius: 3,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(9, 30, 66, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                </button>
              </Tooltip>
              <Tooltip content="More project actions">
                <button
                  ref={projectMenuTriggerRef}
                  type="button"
                  data-testid="project-chrome-band.project-menu-trigger"
                  aria-label="More project actions"
                  aria-haspopup="menu"
                  aria-expanded={!!projectMenuAnchor}
                  onClick={(e) => {
                    if (projectMenuAnchor) {
                      setProjectMenuAnchor(null);
                    } else {
                      const r = e.currentTarget.getBoundingClientRect();
                      setProjectMenuAnchor({ top: r.bottom + 4, left: r.left });
                    }
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    border: 'none',
                    background: 'transparent',
                    color: token('color.text.subtle', '#6B6E76'),
                    borderRadius: 3,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    if (!projectMenuAnchor) e.currentTarget.style.background = 'rgba(9, 30, 66, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    if (!projectMenuAnchor) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <AkMoreIcon label="" size="small" />
                </button>
              </Tooltip>
            </>
          }
          // Apr 28 2026 (Vikram): right-side cluster (AvatarGroup + Add
          // people text button + Share + Automation + Give feedback) was
          // removed from the chrome band. Only the Enter full screen
          // affordance remains in pageChromeRightCtas. The small invite-
          // people icon next to the H1 (in nameAdornment) still opens the
          // Add people modal.
          // Apr 27 2026 (Vikram instruction): tabs row removed entirely.
          // All work / Releases / "+" not required on this surface.
          pageChromeRightCtas={{}}
        />}
        </>
      }
    >
      {/* Toolbar: search + filter + type chips inline + count + maximize.
          Apr 27, 2026 (L48 + L51): type chips inline; bottom padding
          increased to 16px and a 1px subtle border-bottom added to give
          the eye a clear "controls finished" rest before the table.
          Earlier 10px-bottom padding ran the toolbar baseline almost
          flush with the column header row (≈6px gap visually). */}
      <div style={{
        // Apr 27 2026 (jira-compare regression iter 3 — left/right padding
        // re-probed). Probe deltas: toolbar items (Search starts x=72,
        // count ends x=1137) sit 16px inset from the card edges (card
        // x=55-1154), while table cells start at x=57 (≈flush with card).
        // Result: toolbar items appear 15-16px deeper than table columns,
        // visibly misaligned. Set L+R padding to 0 so toolbar items align
        // with table content. Top/bottom kept at 32 (still matches Jira's
        // 45px tabs→toolbar / toolbar→table rhythm — verified earlier
        // probe). marginBottom kept at 4 so body table doesn't drift.
        // Apr 28, 2026 (jira-compare cycle 2 V1+V2+V3): horizontal
        // padding 0 → 24px so the search input + items count + table
        // STOP hugging the white card edges. User-visible defect that
        // multiple cycles missed. This wrapper extends across both
        // toolbar and (via marginBottom + the JiraTable wrapper below)
        // bleeds the same inset to the table head + body — see the
        // sibling wrapper directly after this div.
        padding: '32px 24px 32px',
        marginBottom: 4,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
      }}>
        {/* Apr 27, 2026 — REVERTED toolbar Create button. Jira's list view
            does NOT have a Create CTA in the table toolbar; the only
            in-table Create is the sticky bottom-left "+ Create" row that
            already exists via JiraTable.bottomSlot → BottomCreateRow.
            The global-nav Create handles cross-hub creation. Adding a
            third Create CTA on the toolbar was scope creep that broke
            Jira parity. Removed cleanly; toolbar starts with Search. */}
        {/* 2026-05-12 — Ask CATY button, Jira parity placement.
            Jira's "✦ Ask AI" sits left of "Search work" in the list
            toolbar at all times (verified via Chrome MCP probe of
            digital-transformation.atlassian.net BAU list view). Catalyst
            previously rendered Ask CATY in the global top nav — wrong
            location. Moved here per jira-compare 2026-05-12 finding. */}
        <Tooltip content="Ask CATY about this backlog" position="bottom">
          <Button
            appearance="subtle"
            isLoading={createCatyConversation.isPending}
            onClick={handleAskCaty}
            iconBefore={
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                height: 16,
                color: token('color.icon.accent.purple', '#8270DB'),
                fontSize: 14,
                lineHeight: 1,
              }}>
                ✦
              </span>
            }
          >
            Ask CATY
          </Button>
        </Tooltip>
        {/* Apr 28, 2026 (jira-compare cycle 2 T5): wrapper width fixed
            280 → flex:1 with min/max so the input expands like Jira's
            (probed Jira width=625px) instead of cramming at 280. */}
        <div style={{ flex: 1, minWidth: 240, maxWidth: 640 }}>
          <Textfield
            isCompact
            placeholder="Search list"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            elemBeforeInput={
              <span style={{ paddingInlineStart: 8, color: token('color.text.subtlest', '#6B778C'), display: 'flex', alignItems: 'center' }}>
                <AkSearchIcon label="" size="small" />
              </span>
            }
            elemAfterInput={
              search ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch('')}
                  style={{
                    paddingInlineEnd: 6,
                    display: 'flex',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: token('color.text.subtlest', '#6B778C'),
                    padding: '0 6px 0 2px',
                  }}
                >
                  <AkCloseIcon label="" size="small" />
                </button>
              ) : undefined
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
        {/* Apr 28, 2026 — Phase A.3 (next-session): @atlaskit/avatar-group
            renders project members beside Filter, mirroring Jira's BAU list
            view toolbar. Data sourced from assigneeOptions (already memoized
            from items + avatarsByName). maxCount=5 with appearance="stack"
            matches Jira's stacked-circle pattern. The "Add people" CTA is a
            future addition; for cycle 1 we ship read-only avatar stack. */}
        {assigneeOptions.length > 0 && (
          <AvatarGroup
            appearance="stack"
            size="small"
            maxCount={5}
            label="Filter by assignee"
            data={assigneeOptions.map((a) => ({
              key: a.id,
              name: a.name,
              src: a.avatarUrl ?? undefined,
            }))}
            onAvatarClick={(_event, _analytics, index) => {
              const a = assigneeOptions[index];
              if (!a) return;
              setFilterValue((prev) => ({
                ...prev,
                assignees: prev.assignees.includes(a.name)
                  ? prev.assignees.filter((x) => x !== a.name)
                  : [...prev.assignees, a.name],
              }));
            }}
          />
        )}

        {/* Apr 27, 2026 — jira-compare audit P0 #2 / P1 #3:
            Two-flex-cluster toolbar. LEFT cluster (above this spacer)
            holds Search + Filter + Avatar group. RIGHT cluster (below this
            spacer) anchors all table-affecting controls: Group → Settings
            → More actions → divider → count → maximize. Jira's BAU list at
            /list?groupBy=status anchors "Group: Status" to x≈971
            (toolbar-end); pushing it past the flex spacer matches that
            anchor.

            Audit pass 10 type-chips removal note retained: inline type
            chips (All/Epics/Features/Stories/...) live in the Filter
            dropdown's Work-type facet now, not the toolbar. */}
        <div style={{ flex: 1 }} />

        {/* RIGHT cluster begins — Group control + view-options + more-actions */}
        {/* Group by — Apr 27, 2026 (Vikram audit pass 4): @atlaskit/dropdown-menu
            was rendering an empty/invisible portal on this surface (same
            documented bug as the cell editors at line 1003: `@atlaskit/popup
            portal mounts on this surface but renders empty content`). Click
            fired but no menu appeared, leaving the CTA dead. Replaced with
            the same proven portal pattern used by Status/Priority cell
            editors — manual createPortal + position computed from trigger
            rect. Visual still uses @atlaskit/button + the Atlaskit chevron
            glyph; menu rows use ADS tokens for the selected/hover states.
            Atlaskit-only mandate from CLAUDE.md §7 still satisfied — the
            primitives that work on this surface are still all ADS. */}
        <GroupByControl
          value={groupBy}
          onChange={(opt) => { setGroupBy(opt); setCollapsedGroups(new Set()); }}
        />
        {/* P1 #8 — Settings (view-options) icon: density / layout menu.
            Distinct from JiraTable's column-picker `+` (which lives
            inside the table head and owns column visibility). */}
        {toolbarViewOptionsButton}
        {/* P1 #7 — More actions overflow ⋯: refresh + export. */}
        {toolbarMoreActionsButton}

        {/* 2026-05-12 — Pagination counter: "X of Y" format. Shows total visible
            items in current filter scope. Jira parity: BAU list shows "50 of 810"
            style counter on the right side of the toolbar. */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: 32,
          padding: '0 12px',
          marginLeft: 8,
          color: token('color.text.subtlest', '#626F86'),
          fontSize: 12,
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}>
          {total} item{total === 1 ? '' : 's'}
        </div>
      </div>

      {/* Bulk footer bar — Jira-parity bottom-anchored action bar showing
          when selectedIds.size > 0. MVP Phase 1: selection UX only (checkbox
          visibility + footer appearance). Phase 2: Move / Transition handlers. */}
      {selectedIds.size > 0 && (
        <BulkFooterBar
          selectedCount={selectedIds.size}
          onSelectAll={() => setSelectedIds(new Set(sortedRows.map((r) => r.id)))}
          onDeselectAll={() => setSelectedIds(new Set())}
          onDelete={() => setBulkDeleteOpen(true)}
          onMove={() => setBulkMoveOpen(true)}
          onTransition={() => setBulkTransitionOpen(true)}
        />
      )}

      {/* Table + panel split — Jira 3-state machine:
           • compact    → table flex:1, panel fixed 400px
           • expanded   → table 40%, panel 60%
           • fullscreen → table hidden, panel 100% */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <div
          data-backlog-scroll-container
          style={{
            // Table container — full width (panel removed)
            minWidth: 0,
            // Apr 27, 2026: page-level overflow was eating the table's own
            // .jira-table-viewport scroll. Switching to overflow:hidden +
            // flex column with minHeight:0 lets the inner viewport's
            // overflow-y:auto take over (sticky header + scrolling body).
            // L70 note retained: bottomSlot Create row + horizontal scroll
            // still sit inside the table viewport.
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            // Apr 27, 2026 (audit pass 9): horizontal padding 16/16 → 0/0.
            // 32px of dead whitespace on the right of the table that the
            // user surfaced ("still empty space") was 16px contributed
            // here. Keeping top:4 for breathing room under the toolbar
            // bottom border. Outer page chrome still has 8px padding-left
            // (AtlaskitPageShell) so the table won't touch the nav edge.
            // Apr 28, 2026 (jira-compare cycle 2 V3): horizontal padding
            // 0 → 24px so the table thead + tbody inset matches the
            // toolbar's new 24px inset. Without this the table still
            // hugs the white card edge.
            padding: '4px 24px 0',
            transition: 'width 150ms ease, flex-basis 150ms ease',
          }}
        >
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DndContext
            collisionDetection={closestCenter}
            onDragStart={(event: DragStartEvent) => {
              // Capture the row being dragged so DragOverlay can render
              // a portal-mounted ghost that follows the cursor.
              const row = sortedRows.find((r) => r.id === event.active.id) ?? null;
              setActiveDragRow(row);
            }}
            onDragCancel={() => setActiveDragRow(null)}
            onDragEnd={async (event: DragEndEvent) => {
              setActiveDragRow(null);
              const { active, over } = event;
              if (!over || active.id === over.id || !projectKey) return;

              // Find the dragged row and target row
              const draggedRow = sortedRows.find((r) => r.id === active.id);
              const overRow = sortedRows.find((r) => r.id === over.id);
              if (!draggedRow || !overRow) return;

              // Calculate new rank_order: midpoint between neighbors
              // If dragging above overRow: new_rank = (overRow.rank_order - ABOVE_rank_order) / 2
              // If dragging below overRow: new_rank = (BELOW_rank_order - overRow.rank_order) / 2
              const draggedIndex = sortedRows.indexOf(draggedRow);
              const overIndex = sortedRows.indexOf(overRow);
              const direction = draggedIndex < overIndex ? 1 : -1; // 1 = down, -1 = up

              let newRankOrder: number;
              if (direction === 1) {
                // Dragging down: insert after overRow
                const below = sortedRows[overIndex + 1];
                const currentRank = overRow.rank_order ?? 0;
                const belowRank = below?.rank_order ?? (currentRank + 100);
                newRankOrder = (currentRank + belowRank) / 2;
              } else {
                // Dragging up: insert before overRow
                const above = sortedRows[overIndex - 1];
                const currentRank = overRow.rank_order ?? 0;
                const aboveRank = above?.rank_order ?? Math.max(0, currentRank - 100);
                newRankOrder = (aboveRank + currentRank) / 2;
              }

              // Write sort_order directly to ph_issues — bulkUpdate filters to
              // source==='catalyst' (correct for Jira-synced fields like summary
              // /status) but sort_order is a Catalyst-local rank field with no
              // Jira sync, so the filter wrongly rejected Jira rows and drag
              // silently failed. Row-menu Rank-to-top/bottom already write
              // sort_order directly without a source filter — mirror that.
              try {
                const { error: updErr } = await supabase
                  .from('ph_issues')
                  .update({ sort_order: newRankOrder, jira_updated_at: new Date().toISOString() })
                  .eq('issue_key', draggedRow.id);
                if (updErr) throw updErr;
                // Invalidate backlog queries to re-fetch and re-sort by rank_order
                queryClient.invalidateQueries({ queryKey: ['backlog-stories-v2', projectId] });
                queryClient.invalidateQueries({ queryKey: ['backlog-epics', projectId] });
                // 2026-05-17 jira-compare cycle 2: when an explicit column
                // sort was active, the client-side sort was overriding the
                // DB sort_order so the drag appeared to do nothing. Auto-
                // clear the sort after a successful drag so the persisted
                // rank order is visible immediately. Display now shows the
                // row in its new position (DB-natural order, no client
                // re-sort applied — see sortedRows guard at line ~1304).
                if (sortKey !== null) {
                  setSortKey(null);
                  setSortDir(null);
                }
                flag.success(
                  'Reordered',
                  `${draggedRow.key || 'Row'} moved.`,
                );
              } catch (e: any) {
                flag.error('Rank update failed', e?.message ?? String(e));
              }
            }}
          >
            <SortableContext
              items={sortedRows.map((r) => r.id)}
              strategy={verticalListSortingStrategy}
              // 2026-05-17 jira-compare cycle 2: previously disabled unless
              // sortKey === 'rank_order', but no column produces that sortKey,
              // so SortableContext was always disabled and drag silently
              // never fired. Vikram flagged "drag handle not working" once the
              // handle was made visible.
              //
              // New gate matches the row-level handle's visibility gate
              // (rowDragHandleHidden, set at the JiraTable call site below):
              // drag is enabled in the default sort state (key ASC) with no
              // grouping. Drag fires bulkUpdate of sort_order; visual reorder
              // is immediate when sortKey resolves to rank_order, and persists
              // for the next visit if the user later sorts by rank_order.
              disabled={
                sortKey !== DEFAULT_SORT_KEY ||
                sortDir !== DEFAULT_SORT_DIR ||
                (groupBy !== null && groupBy !== 'none')
              }
            >
          <JiraTable<BacklogItem>
            columns={filteredCols}
            data={groupedRows ? undefined : sortedRows}
            groups={groupedRows ?? undefined}
            collapsedGroups={collapsedGroups}
            onToggleGroup={toggleGroup}
            // 2026-05-17: Feature flags declare intent explicitly per canonical
            // governance framework. BacklogPage has sticky footer create only
            // (no group inline-create affordances per user feedback 2026-05-17).
            enableGroupCreateButton={false}
            enableStickyCreateFooter={true}
            // Apr 28 2026 (carryover #13 — chevron discoverability):
            // expandedRowIds passes through expandedIds directly. Removed
            // the typeFilter='all' inversion (which previously fed the
            // table a set of "currently expanded" parents derived from
            // the inverted expandedIds = explicitly-collapsed semantics).
            // Both the visibleRows logic above and the chevron icon now
            // share the same standard semantics: expandedIds tracks
            // explicitly-EXPANDED rows, initial state empty → all
            // chevrons render collapsed. Click to expand. Matches Jira.
            // 2026-05-12 Jira parity: "Show hierarchy" toolbar toggle gates
            // the expand chevron column. When off, getRowHasChildren returns
            // false for every row → no chevrons rendered → flat list view.
            // When on (default), parents render the > chevron and children
            // expand inline (existing tree flatten in visibleRows).
            getRowHasChildren={(row) => showHierarchy && childrenOf.has(row.id)}
            expandedRowIds={expandedIds}
            onToggleRowExpanded={(rowId) => {
              if (!showHierarchy) return;
              setExpandedIds((prev) => {
                const next = new Set(prev);
                if (next.has(rowId)) next.delete(rowId);
                else next.add(rowId);
                return next;
              });
            }}
            stickyCreateFooter={{
              placeholder: 'What needs to be done?',
              onActivate: () => setFooterCreateActive(true),
              active: footerCreateActive ? (() => {
                const submitFooter = async (
                  summaryText: string,
                  issueType: CreatableIssueType,
                  assignee: { id: string; name: string } | null,
                ) => {
                  const trimmed = summaryText.trim();
                  if (!trimmed || !projectKey) return;
                  if (trimmed.length > 255) { flag.error('Summary must be 255 characters or fewer'); return; }
                  setInlineCreateSubmitting(true);
                  try {
                    const issueKey = await generateIssueKey(projectKey);
                    const nowIso = new Date().toISOString();
                    // Default status: first group when grouped by status, else 'To Do'
                    const defaultStatus = groupBy === 'status' && groupedRows[0]
                      ? groupedRows[0].id
                      : 'To Do';
                    const { error } = await supabase.from('ph_issues').insert({
                      issue_key: issueKey,
                      project_key: projectKey,
                      summary: trimmed,
                      issue_type: issueType,
                      status: defaultStatus,
                      priority: 'medium',
                      source: 'catalyst',
                      assignee_account_id: assignee?.id ?? null,
                      assignee_display_name: assignee?.name ?? null,
                      jira_created_at: nowIso,
                      jira_updated_at: nowIso,
                    } as any);
                    if (error) throw error;
                    flag.success(`Created ${issueKey} — ${trimmed}`);
                    queryClient.invalidateQueries({ queryKey: ['backlog-stories-v2', projectId] });
                    queryClient.invalidateQueries({ queryKey: ['backlog-epics', projectId] });
                    setFooterCreateActive(false);
                    // 2026-05-10 UX: with virtualization + 600+ rows, a newly-
                    // created row at the bottom of an ASC sort is invisible.
                    // Switch sort to updated_at DESC so the new row appears at
                    // the top of the visible viewport. User can re-sort later.
                    if (sortKey !== 'updated' || sortDir !== 'DESC') {
                      setSortKey('updated');
                      setSortDir('DESC');
                    }
                  } catch {
                    flag.error('Failed to create');
                  } finally {
                    setInlineCreateSubmitting(false);
                  }
                };
                return (
                  <InlineGroupCreateRow
                    groupLabel=""
                    isSubmitting={inlineCreateSubmitting}
                    members={chromeBandMembers}
                    onSubmit={submitFooter}
                    onCancel={() => setFooterCreateActive(false)}
                  />
                );
              })() : null,
            }}
            columnVisibility={visibleColumns}
            onColumnVisibilityChange={setVisibleColumns}
            contextMenuActions={rowActions}
            getRowId={(r) => r.id}
            getRowDepth={(r) => {
              // 2026-05-10: Indent only in flat view — when grouped, children
              // share the group's visual scope and additional indent is noise.
              if (groupBy && groupBy !== 'parent') return 0;
              // Three-level hierarchy: Request/Epic (0) → child (1) → grandchild (2).
              // Covers all child types (story/bug/task/subtask/feature/incident).
              if (r.type === 'initiative') return 0;
              if (r.type === 'epic' && r.parent_id) return 1;
              const childTypes = ['story', 'bug', 'task', 'subtask', 'feature', 'incident'];
              if (childTypes.includes(r.type) && r.parent_id) {
                const parent = items.find((it) => it.id === r.parent_id);
                return parent?.parent_id ? 2 : 1;
              }
              return 0;
            }}
            onRowClick={openDetail}
            selectable
            selection={selectedIds}
            onSelectionChange={setSelectedIds}
            renderRowDragHandle={(row) => <DragHandleCell row={row} />}
            rowDragHandleHidden={
              sortKey !== DEFAULT_SORT_KEY ||
              sortDir !== DEFAULT_SORT_DIR ||
              (groupBy !== null && groupBy !== 'none')
            }
            sortKey={sortKey || undefined}
            sortOrder={sortDir || undefined}
            onSortChange={(k, ord) => {
              // Empty key signals "sort cleared" — restore defaults so drag handles reappear
              setSortKey(k || DEFAULT_SORT_KEY);
              setSortDir((k ? ord : DEFAULT_SORT_DIR) as 'ASC' | 'DESC');
            }}
            // Apr 28, 2026 (jira-compare cycle 2 T20+T21, refined cycle 3 +
            // cycle 3 second pass):
            // Pagination footer + circular info button removed — Jira /list
            // uses infinite scroll, has none of these.
            //
            // Earlier attempt: rowsPerPage=undefined → JiraTable defaulted to
            // 25 (line 137 of JiraTable.tsx) → only 25 of 810 rows rendered,
            // BAU-5419 + older Epics never in DOM.
            //
            // Second attempt: rowsPerPage=Infinity → caused (page-1)*Infinity
            // = 0*Infinity = NaN → data.slice(NaN, NaN) = [] → empty table.
            //
            // Final: rowsPerPage=0 hits the early-exit `if (!rowsPerPage ||
            // rowsPerPage <= 0) return data` (JiraTable.tsx:312) and renders
            // ALL rows. Native scroll handles the tall table. True
            // IntersectionObserver lazy load is a later optimization.
            rowsPerPage={0}
            page={1}
            onPageChange={undefined as any}
            density={density}
            enableVirtualization
            enableColumnReorder
            columnOrder={columnOrder ?? undefined}
            onColumnOrderChange={(next) => setColumnOrder(next)}
            initialColumnWidths={columnWidths}
            onColumnWidthsChange={(widths) => {
              setColumnWidths(widths);
              try { localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(widths)); } catch { /* quota */ }
            }}
            ariaLabel="Unified backlog"
            emptyView={
              /* Tailwind base CSS zeroes margins on h2/p so @atlaskit/empty-state
                 renders inline (heading + description concatenated on one line).
                 Use explicit block stacking to ensure correct layout. */
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                gap: 0,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: token('color.background.neutral', '#F1F2F4'),
                  marginBottom: 16,
                  color: token('color.icon.subtle', '#626F86'),
                }}>
                  <AkSearchIcon label="" size="medium" />
                </div>
                <div style={{
                  display: 'block',
                  fontSize: 16,
                  fontWeight: 600,
                  color: token('color.text', '#172B4D'),
                  marginBottom: 8,
                  textAlign: 'center',
                }}>
                  No items match your search
                </div>
                <div style={{
                  display: 'block',
                  fontSize: 14,
                  fontWeight: 400,
                  color: token('color.text.subtle', '#44546F'),
                  textAlign: 'center',
                  marginBottom: 16,
                }}>
                  Try clearing the search, filters, or assignee filter.
                </div>
                {(search || Object.keys(filterValue ?? {}).some(k => (filterValue as any)[k]?.length)) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setFilterValue(emptyFilterValue);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 12px',
                      fontSize: 14,
                      fontWeight: 500,
                      color: token('color.link', '#0C66E4'),
                      background: 'transparent',
                      border: `1px solid ${token('color.border', '#DFE1E6')}`,
                      borderRadius: 3,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', '#F1F2F4'))}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            }
            // Apr 27, 2026 (L70): Create row now renders INSIDE the
            // table viewport via JiraTable's `bottomSlot` prop —
            // eliminates the visual gap that the horizontal scrollbar
            // was creating between the last table row and the floating
            // Create row. Sticks to the table; horizontal scroll sits
            // BELOW Create. Smart-default issue type matches the
            // active type-filter pill.
            bottomSlot={
              <BottomCreateRow
                projectKey={projectKey}
                defaultIssueType={
                  typeFilter === 'epic' ? 'Epic'
                  : typeFilter === 'feature' ? 'Feature'
                  : typeFilter === 'bug' ? 'QA Bug'
                  : typeFilter === 'incident' ? 'Production Incident'
                  : 'Story'
                }
                onCreated={() => {
                  queryClient.invalidateQueries({ queryKey: ['backlog-stories-v2', projectId] });
                  queryClient.invalidateQueries({ queryKey: ['backlog-epics', projectId] });
                }}
              />
            }
          />
            </SortableContext>
            {/* 2026-05-17 jira-compare cycle 2 (rev 3): DragOverlay portal.
                Renders a ghost preview of the row being dragged. Portal-
                mounted at document.body so it follows the cursor regardless
                of the table's overflow:hidden clipping. Shows type icon,
                key, and summary in a card-like wrapper with shadow. */}
            <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
              {activeDragRow ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    background: token('elevation.surface.overlay', '#FFFFFF'),
                    border: `1px solid ${token('color.border', '#DFE1E6')}`,
                    borderRadius: 4,
                    boxShadow: token('elevation.shadow.overlay', '0 8px 24px rgba(9,30,66,0.15)'),
                    opacity: 0.96,
                    cursor: 'grabbing',
                    maxWidth: 600,
                    fontSize: 14,
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                    {activeDragRow.type === 'initiative' ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 16,
                          height: 16,
                          borderRadius: 3,
                          background: '#904EE2',
                          color: 'var(--ds-text-inverse, #FFFFFF)',
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      >
                        I
                      </span>
                    ) : (
                      <JiraIssueTypeIcon
                        type={
                          activeDragRow.type === 'epic' ? 'Epic'
                          : activeDragRow.type === 'feature' ? 'Feature'
                          : activeDragRow.type === 'bug' ? 'QA Bug'
                          : activeDragRow.type === 'incident' ? 'Production Incident'
                          : 'Story'
                        }
                        size={16}
                      />
                    )}
                  </span>
                  <span style={{ color: token('color.link', '#0C66E4'), textDecoration: 'underline', fontWeight: 500, flexShrink: 0 }}>
                    {activeDragRow.key || '—'}
                  </span>
                  <span style={{ color: token('color.text', '#172B4D'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {activeDragRow.title}
                  </span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          </div>
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

      {/* Bulk Move Modal — Phase 2 */}
      <ModalTransition>
        {bulkMoveOpen && (
          <Modal onClose={() => setBulkMoveOpen(false)}>
            <ModalHeader>
              <ModalTitle>Move {selectedIds.size} item{selectedIds.size === 1 ? '' : 's'} to...</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <Fieldset>
                <Label htmlFor="bulk-move-parent-select">Parent Epic</Label>
                <Select
                  inputId="bulk-move-parent-select"
                  options={epics.map(e => ({ label: e.issue_key, value: e.issue_key, data: e }))}
                  value={bulkMoveTarget ? { label: bulkMoveTarget, value: bulkMoveTarget } : null}
                  onChange={(opt) => setBulkMoveTarget(opt?.value ?? null)}
                  placeholder="Select parent epic"
                  isClearable
                />
              </Fieldset>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setBulkMoveOpen(false)}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                isDisabled={!bulkMoveTarget || bulkUpdate.isPending}
                onClick={() => {
                  if (bulkMoveTarget) {
                    bulkUpdate.mutate(
                      { ids: Array.from(selectedIds), patch: { parent_key: bulkMoveTarget } },
                      {
                        onSuccess: () => {
                          setBulkMoveOpen(false);
                          setBulkMoveTarget(null);
                          setSelectedIds(new Set());
                        },
                      }
                    );
                  }
                }}
              >
                {bulkUpdate.isPending ? 'Moving...' : 'Move'}
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>

      {/* Bulk Transition Modal — Phase 2 */}
      <ModalTransition>
        {bulkTransitionOpen && (
          <Modal onClose={() => setBulkTransitionOpen(false)}>
            <ModalHeader>
              <ModalTitle>Transition {selectedIds.size} item{selectedIds.size === 1 ? '' : 's'} to...</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <FieldGroup>
                <Label htmlFor="bulk-transition-status-select">Status</Label>
                <Select
                  inputId="bulk-transition-status-select"
                  options={STATUS_OPTIONS.map(s => ({ label: s.label, value: s.value, data: s }))}
                  value={bulkTransitionTarget ? { label: bulkTransitionTarget, value: bulkTransitionTarget } : null}
                  onChange={(opt) => setBulkTransitionTarget(opt?.value ?? null)}
                  placeholder="Select target status"
                  isClearable
                />
              </FieldGroup>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setBulkTransitionOpen(false)}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                isDisabled={!bulkTransitionTarget || bulkUpdate.isPending}
                onClick={() => {
                  if (bulkTransitionTarget) {
                    bulkUpdate.mutate(
                      { ids: Array.from(selectedIds), patch: { status: bulkTransitionTarget } },
                      {
                        onSuccess: () => {
                          setBulkTransitionOpen(false);
                          setBulkTransitionTarget(null);
                          setSelectedIds(new Set());
                        },
                      }
                    );
                  }
                }}
              >
                {bulkUpdate.isPending ? 'Transitioning...' : 'Transition'}
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>

      {/* Bulk Change Wizard — 2-step modal triggered from "Bulk change work items" menu.
          Step 1: choose operation (Edit / Move / Transition / Delete).
          Step 2: configure operation + confirm.
          Reuses bulkUpdate + bulkDelete mutations. */}
      <ModalTransition>
        {bulkWizardOpen && (
          <Modal onClose={closeBulkWizard} width="medium">
            <ModalHeader>
              <ModalTitle>
                Bulk change {selectedIds.size} work item{selectedIds.size === 1 ? '' : 's'}
              </ModalTitle>
            </ModalHeader>
            <ModalBody>
              {/* Step indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                {[1, 2].map((s) => (
                  <React.Fragment key={s}>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                      background: bulkWizardStep >= s ? '#0C66E4' : '#DFE1E6',
                      color: bulkWizardStep >= s ? '#fff' : '#42526E',
                    }}>{s}</span>
                    <span style={{ fontSize: 12, color: bulkWizardStep >= s ? '#0C66E4' : '#7A869A', fontWeight: 500 }}>
                      {s === 1 ? 'Choose action' : 'Configure & confirm'}
                    </span>
                    {s < 2 && <span style={{ flex: 1, height: 1, background: '#DFE1E6' }} />}
                  </React.Fragment>
                ))}
              </div>

              {/* Step 1 — choose action */}
              {bulkWizardStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {([
                    { id: 'edit' as const, label: 'Edit', description: 'Change a field value on all selected items.' },
                    { id: 'move' as const, label: 'Move', description: 'Reassign selected items to a different parent epic.' },
                    { id: 'transition' as const, label: 'Transition', description: 'Move selected items to a new status.' },
                    { id: 'delete' as const, label: 'Delete', description: 'Permanently remove selected items (Catalyst-owned only).' },
                  ] as const).map((opt) => (
                    <label
                      key={opt.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '12px 16px', borderRadius: 6, cursor: 'pointer',
                        border: `2px solid ${bulkWizardAction === opt.id ? '#0C66E4' : '#DFE1E6'}`,
                        background: bulkWizardAction === opt.id ? '#E9F2FF' : '#FAFBFC',
                        transition: 'border-color 80ms, background 80ms',
                      }}
                    >
                      <input
                        type="radio"
                        name="bulk-action"
                        value={opt.id}
                        checked={bulkWizardAction === opt.id}
                        onChange={() => setBulkWizardAction(opt.id)}
                        style={{ marginTop: 2, accentColor: '#0C66E4' }}
                      />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#292A2E', marginBottom: 2 }}>{opt.label}</div>
                        <div style={{ fontSize: 13, color: '#44546F' }}>{opt.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Step 2 — configure action */}
              {bulkWizardStep === 2 && bulkWizardAction === 'edit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <Label htmlFor="bulk-edit-field-select">Field to update</Label>
                    <Select
                      inputId="bulk-edit-field-select"
                      options={[
                        { value: 'priority', label: 'Priority' },
                        { value: 'status', label: 'Status' },
                        { value: 'parent', label: 'Parent Epic' },
                      ]}
                      value={bulkWizardEditField ? { value: bulkWizardEditField, label: { priority: 'Priority', status: 'Status', assignee: 'Assignee', parent: 'Parent Epic' }[bulkWizardEditField] } : null}
                      onChange={(opt) => { setBulkWizardEditField((opt?.value as any) ?? null); setBulkWizardEditValue(null); }}
                      placeholder="Select field"
                    />
                  </div>
                  {bulkWizardEditField === 'priority' && (
                    <div>
                      <Label htmlFor="bulk-edit-priority-val">New priority</Label>
                      <Select
                        inputId="bulk-edit-priority-val"
                        options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))}
                        value={bulkWizardEditValue ? { value: bulkWizardEditValue, label: bulkWizardEditValue[0].toUpperCase() + bulkWizardEditValue.slice(1) } : null}
                        onChange={(opt) => setBulkWizardEditValue(opt?.value ?? null)}
                        placeholder="Select priority"
                      />
                    </div>
                  )}
                  {bulkWizardEditField === 'status' && (
                    <div>
                      <Label htmlFor="bulk-edit-status-val">New status</Label>
                      <Select
                        inputId="bulk-edit-status-val"
                        options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
                        value={bulkWizardEditValue ? { value: bulkWizardEditValue, label: STATUS_OPTIONS.find((s) => s.value === bulkWizardEditValue)?.label ?? bulkWizardEditValue } : null}
                        onChange={(opt) => setBulkWizardEditValue(opt?.value ?? null)}
                        placeholder="Select status"
                      />
                    </div>
                  )}
                  {bulkWizardEditField === 'parent' && (
                    <div>
                      <Label htmlFor="bulk-edit-parent-val">New parent epic</Label>
                      <Select
                        inputId="bulk-edit-parent-val"
                        options={epics.map((e) => ({ value: e.issue_key, label: `${e.issue_key} — ${e.title}` }))}
                        value={bulkWizardEditValue ? { value: bulkWizardEditValue, label: bulkWizardEditValue } : null}
                        onChange={(opt) => setBulkWizardEditValue(opt?.value ?? null)}
                        placeholder="Select epic"
                        isClearable
                      />
                    </div>
                  )}
                </div>
              )}
              {bulkWizardStep === 2 && bulkWizardAction === 'move' && (
                <div>
                  <Label htmlFor="bulk-wiz-move-select">Parent Epic</Label>
                  <Select
                    inputId="bulk-wiz-move-select"
                    options={epics.map((e) => ({ value: e.issue_key, label: `${e.issue_key} — ${e.title}` }))}
                    value={bulkWizardEditValue ? { value: bulkWizardEditValue, label: bulkWizardEditValue } : null}
                    onChange={(opt) => setBulkWizardEditValue(opt?.value ?? null)}
                    placeholder="Select parent epic"
                    isClearable
                  />
                </div>
              )}
              {bulkWizardStep === 2 && bulkWizardAction === 'transition' && (
                <div>
                  <Label htmlFor="bulk-wiz-transition-select">Target status</Label>
                  <Select
                    inputId="bulk-wiz-transition-select"
                    options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
                    value={bulkWizardEditValue ? { value: bulkWizardEditValue, label: STATUS_OPTIONS.find((s) => s.value === bulkWizardEditValue)?.label ?? bulkWizardEditValue } : null}
                    onChange={(opt) => setBulkWizardEditValue(opt?.value ?? null)}
                    placeholder="Select target status"
                  />
                </div>
              )}
              {bulkWizardStep === 2 && bulkWizardAction === 'delete' && (
                <div style={{ padding: '12px 0' }}>
                  <SectionMessage appearance="warning">
                    <p>You are about to permanently delete <strong>{selectedIds.size} work item{selectedIds.size === 1 ? '' : 's'}</strong>. This cannot be undone. Jira-synced items will be skipped.</p>
                  </SectionMessage>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              {bulkWizardStep === 1 ? (
                <>
                  <Button appearance="subtle" onClick={closeBulkWizard}>Cancel</Button>
                  <Button
                    appearance="primary"
                    isDisabled={!bulkWizardAction}
                    onClick={() => setBulkWizardStep(2)}
                  >
                    Next
                  </Button>
                </>
              ) : (
                <>
                  <Button appearance="subtle" onClick={() => setBulkWizardStep(1)}>Back</Button>
                  <Button appearance="subtle" onClick={closeBulkWizard}>Cancel</Button>
                  <Button
                    appearance={bulkWizardAction === 'delete' ? 'danger' : 'primary'}
                    isDisabled={
                      bulkUpdate.isPending || bulkDelete.isPending ||
                      (bulkWizardAction === 'edit' && (!bulkWizardEditField || !bulkWizardEditValue)) ||
                      (bulkWizardAction === 'move' && !bulkWizardEditValue) ||
                      (bulkWizardAction === 'transition' && !bulkWizardEditValue)
                    }
                    onClick={() => {
                      if (bulkWizardAction === 'delete') {
                        bulkDelete.mutate(Array.from(selectedIds), {
                          onSuccess: () => { closeBulkWizard(); setSelectedIds(new Set()); },
                        });
                      } else if (bulkWizardAction === 'move' && bulkWizardEditValue) {
                        bulkUpdate.mutate(
                          { ids: Array.from(selectedIds), patch: { parent_key: bulkWizardEditValue } },
                          { onSuccess: () => { closeBulkWizard(); setSelectedIds(new Set()); } },
                        );
                      } else if (bulkWizardAction === 'transition' && bulkWizardEditValue) {
                        bulkUpdate.mutate(
                          { ids: Array.from(selectedIds), patch: { status: bulkWizardEditValue } },
                          { onSuccess: () => { closeBulkWizard(); setSelectedIds(new Set()); } },
                        );
                      } else if (bulkWizardAction === 'edit' && bulkWizardEditField && bulkWizardEditValue) {
                        const patchKey = bulkWizardEditField === 'parent' ? 'parent_key' : bulkWizardEditField;
                        bulkUpdate.mutate(
                          { ids: Array.from(selectedIds), patch: { [patchKey]: bulkWizardEditValue } },
                          { onSuccess: () => { closeBulkWizard(); setSelectedIds(new Set()); } },
                        );
                      }
                    }}
                  >
                    {(bulkUpdate.isPending || bulkDelete.isPending)
                      ? 'Working...'
                      : bulkWizardAction === 'delete' ? 'Delete' : 'Apply changes'}
                  </Button>
                </>
              )}
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>

      {/* Single FlagsHost for this route — picks up every showFlag()/flag.* call. */}
      <FlagsHost />
    </AtlaskitPageShell>

    {/* Apr 27 2026 (jira-compare regression iter 4 — project ... menu).
        Bespoke createPortal popup (L21 dropdown-menu portal-empty bug).
        Anchored to projectMenuTrigger ref. Items per Vikram scope. */}
    {projectMenuAnchor && ReactDOM.createPortal(
      <>
        {/* Click-outside backdrop */}
        <div
          onClick={() => setProjectMenuAnchor(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 9000 }}
        />
        <div
          role="menu"
          data-testid="project-chrome-band.project-menu-popup"
          style={{
            position: 'fixed',
            top: projectMenuAnchor.top,
            left: projectMenuAnchor.left,
            zIndex: 9001,
            background: token('elevation.surface.overlay', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: 4,
            boxShadow: '0 4px 16px rgba(9, 30, 66, 0.16)',
            minWidth: 280,
            padding: '6px 0',
          }}
        >
          {[
            { id: 'star', label: isStarred ? 'Remove from starred' : 'Add to starred', onClick: () => {
              toggleStarredItem({
                room_type: 'project' as const,
                room_id: projectId,
                room_name: pageTitle,
                room_subtitle: projectKey,
                room_path: `/project-hub/${projectKey}`,
                pi_label: null,
              });
            } },
            { id: 'teams', label: 'Linked teams', onClick: () => setLinkedTeamsOpen(true) },
            { id: 'bg', label: 'Set project background', onClick: () => {
              // Anchor the popup at the menu's left edge, just below it
              // (matches Jira's popup-anchored-to-menu-item placement).
              if (projectMenuAnchor) {
                setBgPickerAnchor({ top: projectMenuAnchor.top + 32, left: projectMenuAnchor.left });
              }
            } },
            { id: 'sep1', divider: true },
            { id: 'settings', label: 'Project settings', onClick: () => flag.info('Project settings', 'Settings page is coming soon.') },
            { id: 'sep2', divider: true },
            { id: 'archive', label: 'Archive project', onClick: () => setArchiveOpen(true) },
            { id: 'delete', label: 'Delete project', danger: true, onClick: () => { setDeleteConfirmText(''); setDeleteOpen(true); } },
          ].map((item) => {
            if ((item as any).divider) {
              return <div key={item.id} style={{ height: 1, background: token('color.border', '#DFE1E6'), margin: '6px 0' }} />;
            }
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  (item as any).onClick();
                  setProjectMenuAnchor(null);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 16px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  fontSize: 14,
                  fontWeight: 400,
                  fontFamily: 'inherit',
                  color: (item as any).danger
                    ? token('color.text.danger', '#AE2A19')
                    : token('color.text', '#292A2E'),
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(9, 30, 66, 0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {(item as any).label}
              </button>
            );
          })}
        </div>
      </>,
      document.body,
    )}

    {/* Apr 27 2026 (jira-compare regression iter 3 — Add people modal).
        @atlaskit/modal-dialog rendered an empty portal on this surface
        (L21 — same documented bug that hit @atlaskit/dropdown-menu and
        drove GroupByControl's bespoke portal). Replaced with a bespoke
        createPortal-to-body modal. Visual conventions still come from
        @atlaskit/tokens; semantically it's a real role="dialog" with
        focus trap-ish behavior (Esc dismisses; click overlay does not). */}
    {addPeopleOpen && ReactDOM.createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-people-modal-title"
        data-testid="add-people-modal"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(9, 30, 66, 0.54)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 60,
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !addPeopleSubmitting) {
            setAddPeopleOpen(false);
            setAddPeopleEmails('');
            setAddPeopleRole('Member');
          }
        }}
      >
        <div
          style={{
            width: 480,
            maxWidth: 'calc(100vw - 48px)',
            background: token('elevation.surface', '#FFFFFF'),
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(9, 30, 66, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100vh - 120px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px 12px',
            }}
          >
            <h2
              id="add-people-modal-title"
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 653,
                letterSpacing: '-0.003em',
                color: token('color.text', '#292A2E'),
              }}
            >
              Add people to {pageTitle}
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={() => {
                if (!addPeopleSubmitting) {
                  setAddPeopleOpen(false);
                  setAddPeopleEmails('');
                  setAddPeopleRole('Member');
                }
              }}
              style={{
                width: 32,
                height: 32,
                border: 'none',
                background: 'transparent',
                color: token('color.text.subtle', '#6B6E76'),
                cursor: 'pointer',
                borderRadius: 3,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AkCloseIcon label="" size="small" />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '0 24px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label
                htmlFor="add-people-emails"
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: token('color.text.subtle', '#6B6E76'),
                  marginBottom: 4,
                }}
              >
                Names or emails <span style={{ color: token('color.text.danger', '#AE2A19') }}>*</span>
              </label>
              <Textfield
                id="add-people-emails"
                placeholder="e.g., maria@company.com, john@company.com"
                value={addPeopleEmails}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAddPeopleEmails(e.target.value)
                }
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: token('color.text.subtle', '#6B6E76'),
                  marginBottom: 4,
                }}
              >
                Role <span style={{ color: token('color.text.danger', '#AE2A19') }}>*</span>
              </label>
              <button
                type="button"
                data-testid="add-people-modal.role-trigger"
                onClick={() =>
                  setAddPeopleRole((r) =>
                    r === 'Member' ? 'Admin' : r === 'Admin' ? 'Viewer' : 'Member',
                  )
                }
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  height: 36,
                  padding: '0 12px',
                  border: `1px solid ${token('color.border', '#DFE1E6')}`,
                  borderRadius: 3,
                  background: token('elevation.surface', '#FFFFFF'),
                  color: token('color.text', '#292A2E'),
                  fontSize: 14,
                  fontWeight: 400,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <span>{addPeopleRole}</span>
                <AkChevronDownIcon label="" size="small" />
              </button>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: token('color.text.subtlest', '#6B778C'),
              }}
            >
              Each person you add will get access to this project.
            </p>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              padding: '12px 24px 20px',
              borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
            }}
          >
            <Button
              appearance="subtle"
              onClick={() => {
                setAddPeopleOpen(false);
                setAddPeopleEmails('');
                setAddPeopleRole('Member');
              }}
              isDisabled={addPeopleSubmitting}
            >
              Cancel
            </Button>
            <Button
              appearance="primary"
              isDisabled={!addPeopleEmails.trim() || addPeopleSubmitting}
              onClick={async () => {
                const tokens = addPeopleEmails
                  .split(/[\s,;]+/)
                  .map((s) => s.trim())
                  .filter(Boolean);
                if (!tokens.length || !projectId) return;
                setAddPeopleSubmitting(true);
                try {
                  const { data: profiles, error: pErr } = await supabase
                    .from('profiles')
                    .select('id, email, full_name')
                    .in('email', tokens);
                  if (pErr) throw pErr;
                  const found = profiles ?? [];
                  if (!found.length) {
                    flag.error('No matching users', `Could not find profiles for: ${tokens.join(', ')}`);
                    setAddPeopleSubmitting(false);
                    return;
                  }
                  const rows = found.map((p) => ({
                    project_id: projectId,
                    user_id: p.id,
                    role: addPeopleRole.toLowerCase(),
                  }));
                  const { error: insErr } = await supabase
                    .from('project_members')
                    .upsert(rows as any, { onConflict: 'project_id,user_id' });
                  if (insErr) throw insErr;
                  flag.success(
                    `Added ${found.length} ${found.length === 1 ? 'person' : 'people'}`,
                    found.map((p) => p.full_name || p.email).join(', '),
                  );
                  queryClient.invalidateQueries({
                    queryKey: ['chrome-band-members', projectId],
                  });
                  setAddPeopleOpen(false);
                  setAddPeopleEmails('');
                  setAddPeopleRole('Member');
                } catch (e) {
                  flag.error('Failed to add people', String(e));
                } finally {
                  setAddPeopleSubmitting(false);
                }
              }}
            >
              {addPeopleSubmitting ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </div>
      </div>,
      document.body,
    )}

    {/* Apr 28 2026 (carryover C — Linked teams).
        Pattern source: Jira live DOM probe of BAU project ⋯ → Linked teams.
        Captured: title "Link contributing teams", body "Add the teams that
        work in this space, so everyone knows who to go to for help.", search
        input "Search and add teams", Cancel + Save footer, 400×370 modal,
        testid `modal-dialog`. Catalyst rename: "space" → "project". Bespoke
        createPortal because @atlaskit/modal-dialog renders empty here (L21).
        Save handler is intentionally a flag.info — there is no
        ph_linked_teams table yet; backend wiring lands separately. */}
    {linkedTeamsOpen && ReactDOM.createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="linked-teams-modal-title"
        data-testid="linked-teams-modal"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(9, 30, 66, 0.54)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 80,
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setLinkedTeamsOpen(false);
            setLinkedTeamsSearch('');
          }
        }}
      >
        <div
          style={{
            width: 400,
            maxWidth: 'calc(100vw - 48px)',
            background: token('elevation.surface', '#FFFFFF'),
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(9, 30, 66, 0.25)',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header — matches Jira's modal-header-manage-team layout. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px 8px',
            }}
          >
            <h2
              id="linked-teams-modal-title"
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 653,
                letterSpacing: '-0.003em',
                color: token('color.text', '#292A2E'),
              }}
            >
              Link contributing teams
            </h2>
            <button
              type="button"
              data-testid="linked-teams-modal-close-button"
              aria-label="Close"
              onClick={() => { setLinkedTeamsOpen(false); setLinkedTeamsSearch(''); }}
              style={{
                width: 32, height: 32, border: 'none', background: 'transparent',
                color: token('color.text.subtle', '#6B6E76'), cursor: 'pointer',
                borderRadius: 3, display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AkCloseIcon label="" size="small" />
            </button>
          </div>

          {/* Body — Jira copy adapted: "space" → "project". */}
          <div style={{ padding: '0 24px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 14, color: token('color.text', '#292A2E') }}>
              Add the teams that work in this project, so everyone knows who to go to for help.
            </p>
            <Textfield
              isCompact
              autoFocus
              placeholder="Search and add teams"
              value={linkedTeamsSearch}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLinkedTeamsSearch(e.target.value)}
              elemBeforeInput={
                <span style={{ paddingInlineStart: 8, color: token('color.text.subtlest', '#6B778C'), display: 'flex', alignItems: 'center' }}>
                  <AkSearchIcon label="" size="small" />
                </span>
              }
            />
          </div>

          {/* Footer — Cancel + Save (Jira parity). */}
          <div
            data-testid="linked-teams-modal-footer"
            style={{
              padding: '12px 24px 16px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
            }}
          >
            <Button appearance="subtle" onClick={() => { setLinkedTeamsOpen(false); setLinkedTeamsSearch(''); }}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={() => {
                // Backend wiring deferred — no ph_linked_teams table yet.
                // Surfacing as a flag so the affordance is wired end-to-end
                // visually without claiming success against a missing DB.
                flag.info('Save linked teams', 'Team linking will persist once the ph_linked_teams table lands.');
                setLinkedTeamsOpen(false);
                setLinkedTeamsSearch('');
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </div>,
      document.body,
    )}

    {/* Apr 28 2026 (carryover A — Archive project warning modal).
        Pattern source: Atlassian Design System docs at
        atlassian.design/components/modal-dialog/examples § Warning.
        ADS canonical: "warning or danger styling … must be set on both
        the modal title and the primary button". Bespoke createPortal
        (L21) so we apply the warning palette via @atlaskit/tokens
        (`color.text.warning`, `color.icon.warning`, `color.background.warning.bold`)
        on the title icon, title text, and primary button.
        Archive button stub: there is no project archive flag on the
        projects table yet (verified — the projects schema doesn't have
        archived_at). Wired to flag.info to acknowledge UX, no DB write. */}
    {archiveOpen && ReactDOM.createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-project-modal-title"
        data-testid="archive-project-modal"
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(9, 30, 66, 0.54)',
          zIndex: 9999,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: 100,
        }}
        onKeyDown={(e) => { if (e.key === 'Escape') setArchiveOpen(false); }}
      >
        <div
          style={{
            width: 480, maxWidth: 'calc(100vw - 48px)',
            background: token('elevation.surface', '#FFFFFF'),
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(9, 30, 66, 0.25)',
            display: 'flex', flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header — warning appearance (icon + title in warning color). */}
          <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: token('color.icon.warning', '#946F00'), display: 'inline-flex' }}>
              <AkWarningIcon label="" size="medium" />
            </span>
            <h2
              id="archive-project-modal-title"
              style={{
                margin: 0, fontSize: 20, fontWeight: 653,
                letterSpacing: '-0.003em',
                color: token('color.text.warning', '#7F5F01'),
              }}
            >
              Archive project?
            </h2>
          </div>

          <div style={{ padding: '0 24px 16px' }}>
            <p style={{ margin: 0, fontSize: 14, color: token('color.text', '#292A2E'), lineHeight: '20px' }}>
              <strong>{pageTitle}</strong> will be archived. Issues stay accessible from search and links, but the project disappears from the active projects list. You can unarchive it later.
            </p>
          </div>

          <div
            style={{
              padding: '12px 24px 16px',
              display: 'flex', justifyContent: 'flex-end', gap: 8,
              borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
            }}
          >
            <Button appearance="subtle" onClick={() => setArchiveOpen(false)}>Cancel</Button>
            <Button
              appearance="warning"
              iconBefore={<AkArchiveBoxIcon label="" size="small" />}
              onClick={() => {
                // No `archived_at` column on `projects` yet; archive flag
                // ships with a follow-on schema change. Surface as info.
                flag.info('Archive project', 'Project archival will persist once the projects.archived_at column lands.');
                setArchiveOpen(false);
              }}
            >
              Archive
            </Button>
          </div>
        </div>
      </div>,
      document.body,
    )}

    {/* Apr 28 2026 (carryover A — Delete project danger modal).
        Pattern source: Atlassian Design System docs at
        atlassian.design/components/modal-dialog/examples § Danger.
        Includes the type-to-confirm pattern Atlaskit recommends for
        destructive actions: user must type the project key/name to
        enable the Delete button. Adapted from
        @atlaskit/modal-dialog patterns and Atlassian's destructive-
        action guidance. Bespoke createPortal (L21).
        Delete button stub: hard-deleting a `projects` row would cascade
        across many tables (issues, releases, sprints, etc.) and there
        is no defined cascade path. Wired to flag.info — actual delete
        ships with a backend Edge Function. */}
    {deleteOpen && ReactDOM.createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-project-modal-title"
        data-testid="delete-project-modal"
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(9, 30, 66, 0.54)',
          zIndex: 9999,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: 100,
        }}
        onKeyDown={(e) => { if (e.key === 'Escape') { setDeleteOpen(false); setDeleteConfirmText(''); } }}
      >
        <div
          style={{
            width: 480, maxWidth: 'calc(100vw - 48px)',
            background: token('elevation.surface', '#FFFFFF'),
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(9, 30, 66, 0.25)',
            display: 'flex', flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header — danger appearance. */}
          <div style={{ padding: '20px 24px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: token('color.icon.danger', '#AE2A19'), display: 'inline-flex' }}>
              <AkWarningIcon label="" size="medium" />
            </span>
            <h2
              id="delete-project-modal-title"
              style={{
                margin: 0, fontSize: 20, fontWeight: 653,
                letterSpacing: '-0.003em',
                color: token('color.text.danger', '#AE2A19'),
              }}
            >
              Delete project?
            </h2>
          </div>

          <div style={{ padding: '0 24px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 14, color: token('color.text', '#292A2E'), lineHeight: '20px' }}>
              This will permanently delete <strong>{pageTitle}</strong> and all of its issues, releases, and sprints. This action cannot be undone.
            </p>
            <div>
              <label
                htmlFor="delete-project-confirm"
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: token('color.text.subtle', '#6B6E76'),
                  marginBottom: 4,
                }}
              >
                Type <code style={{ background: token('color.background.neutral', '#DFE1E6'), padding: '0 4px', borderRadius: 3, fontFamily: 'inherit' }}>{projectKey}</code> to confirm
              </label>
              <Textfield
                id="delete-project-confirm"
                autoFocus
                placeholder={projectKey}
                value={deleteConfirmText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteConfirmText(e.target.value)}
              />
            </div>
          </div>

          <div
            style={{
              padding: '12px 24px 16px',
              display: 'flex', justifyContent: 'flex-end', gap: 8,
              borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
            }}
          >
            <Button appearance="subtle" onClick={() => { setDeleteOpen(false); setDeleteConfirmText(''); }}>Cancel</Button>
            <Button
              appearance="danger"
              iconBefore={<AkTrashIcon label="" size="small" />}
              isDisabled={deleteConfirmText !== projectKey}
              onClick={() => {
                // No cascade path defined for projects → issues/releases/etc.
                // Real delete ships behind an Edge Function with cascade
                // ordering + audit log. Surface as info for now.
                flag.info('Delete project', 'Project deletion needs an Edge Function with cascade ordering before it can ship. Stubbed.');
                setDeleteOpen(false);
                setDeleteConfirmText('');
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>,
      document.body,
    )}

    {/* Apr 28 2026 — Set project background picker.
        Pattern source: Jira live DOM probe of testid
        `project-theme-components.ui.theme-picker.popup-content.background-picker-wrapper`.
        Probe captured: popup (not modal), 350×500 anchored to the menu
        item, heading "Space background", sections for Photos by Unsplash
        + Solid colors + Gradients + Custom images, plus "Remove
        background" footer action.
        Catalyst scope (Vikram, Apr 28): Solid + Gradient + Remove only.
        Persistence: writes to `projects.settings.background` JSONB key
        (existing column, no migration). Optimistic UI via setQueryData
        on the `tm-project` cache key. Renders on the chrome band only
        (chromeBg prop on AtlaskitPageShell). */}
    {bgPickerAnchor && ReactDOM.createPortal(
      <>
        <div
          onClick={() => setBgPickerAnchor(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 9000 }}
        />
        <div
          role="dialog"
          aria-labelledby="project-background-picker-title"
          data-testid="project-background-picker"
          style={{
            position: 'fixed',
            top: bgPickerAnchor.top,
            left: bgPickerAnchor.left,
            zIndex: 9001,
            width: 350,
            maxHeight: 500,
            background: token('elevation.surface.overlay', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(9, 30, 66, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => { if (e.key === 'Escape') setBgPickerAnchor(null); }}
        >
          {/* Header */}
          <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2
              id="project-background-picker-title"
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 653,
                color: token('color.text', '#292A2E'),
              }}
            >
              Project background
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setBgPickerAnchor(null)}
              style={{
                width: 24, height: 24, border: 'none', background: 'transparent',
                color: token('color.text.subtle', '#6B6E76'),
                cursor: 'pointer', borderRadius: 3, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <AkCloseIcon label="" size="small" />
            </button>
          </div>

          {/* Body — scrollable */}
          <div style={{ padding: '8px 16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Solid colors section */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: token('color.text.subtle', '#6B6E76'), marginBottom: 8 }}>
                Solid colors
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                {BG_SOLIDS.map((sw) => {
                  const isActive = projectBackground?.type === 'solid' && projectBackground.value === sw.value;
                  return (
                    <button
                      key={sw.value}
                      type="button"
                      title={sw.name}
                      aria-label={`Set background to ${sw.name}`}
                      data-active={isActive || undefined}
                      onClick={async () => {
                        const nextBg: ProjectBackground = { type: 'solid', value: sw.value };
                        const prevSettings = (project as any)?.settings ?? {};
                        const nextSettings = { ...prevSettings, background: nextBg };
                        // Optimistic
                        queryClient.setQueryData(['projects', projectId], (old: any) => old ? { ...old, settings: nextSettings } : old);
                        setBgPickerAnchor(null);
                        try {
                          const { error } = await supabase.from('projects').update({ settings: nextSettings as any }).eq('id', projectId);
                          if (error) throw error;
                          queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
                        } catch (e: any) {
                          flag.error('Background not saved', e?.message || 'Try again.');
                          queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
                        }
                      }}
                      style={{
                        height: 36,
                        borderRadius: 6,
                        background: sw.value,
                        border: isActive
                          ? `2px solid ${token('color.border.selected', '#0C66E4')}`
                          : `1px solid ${token('color.border', '#DFE1E6')}`,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Gradients section */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: token('color.text.subtle', '#6B6E76'), marginBottom: 8 }}>
                Gradients
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {BG_GRADIENTS.map((gr) => {
                  const isActive = projectBackground?.type === 'gradient' && projectBackground.value === gr.value;
                  return (
                    <button
                      key={gr.value}
                      type="button"
                      title={gr.name}
                      aria-label={`Set background to ${gr.name} gradient`}
                      data-active={isActive || undefined}
                      onClick={async () => {
                        const nextBg: ProjectBackground = { type: 'gradient', value: gr.value };
                        const prevSettings = (project as any)?.settings ?? {};
                        const nextSettings = { ...prevSettings, background: nextBg };
                        queryClient.setQueryData(['projects', projectId], (old: any) => old ? { ...old, settings: nextSettings } : old);
                        setBgPickerAnchor(null);
                        try {
                          const { error } = await supabase.from('projects').update({ settings: nextSettings as any }).eq('id', projectId);
                          if (error) throw error;
                          queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
                        } catch (e: any) {
                          flag.error('Background not saved', e?.message || 'Try again.');
                          queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
                        }
                      }}
                      style={{
                        height: 50,
                        borderRadius: 6,
                        background: gr.value,
                        border: isActive
                          ? `2px solid ${token('color.border.selected', '#0C66E4')}`
                          : `1px solid ${token('color.border', '#DFE1E6')}`,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer — Remove background. Disabled when no background is set. */}
          <div
            style={{
              padding: '10px 16px 12px',
              borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <Button
              appearance="subtle"
              isDisabled={!projectBackground}
              onClick={async () => {
                const prevSettings = (project as any)?.settings ?? {};
                const { background: _omit, ...rest } = prevSettings;
                queryClient.setQueryData(['projects', projectId], (old: any) => old ? { ...old, settings: rest } : old);
                setBgPickerAnchor(null);
                try {
                  const { error } = await supabase.from('projects').update({ settings: rest as any }).eq('id', projectId);
                  if (error) throw error;
                  queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
                } catch (e: any) {
                  flag.error('Background not removed', e?.message || 'Try again.');
                  queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
                }
              }}
            >
              Remove background
            </Button>
          </div>
        </div>
      </>,
      document.body,
    )}
    </>
  );
}

/* ─── Sub-components ────────────────────────────────────────────────────── */

// Apr 27, 2026 — TypeChip rewritten to be ADS-token-driven without
// fighting @atlaskit/button v20.5's isSelected behaviour. Live probe of
// BAU backlog showed Button + isSelected updated the className correctly
// but the visual selected state didn't propagate (React/emotion cache),
// so clicking a chip filtered the rows but the active chip didn't show
// blue. The fix: native <button> styled exclusively with @atlaskit/tokens
// (no hardcoded hex), aria-pressed for a11y, and @atlaskit/badge for the
// count. This keeps full ADS token compliance and ADS-hosted Badge
// rendering while guaranteeing the selected visual updates with every
// click — the original parity goal.
// Apr 27, 2026 — GroupByControl. Replaces the @atlaskit/dropdown-menu
// version that rendered an empty portal on this surface (same documented
// bug that drove the bespoke EditorPopover used by Status/Priority cell
// editors). Trigger is still @atlaskit/button + Atlaskit chevron glyph;
// menu is portal-mounted to <body> with position computed from the
// trigger rect, exactly mirroring the editors.tsx EditorPopover pattern
// that's been verified working in this exact React tree.
type GroupByOption = 'none' | 'type' | 'status' | 'parent' | 'assignee' | 'priority';
const GROUP_BY_LABELS: Record<GroupByOption, string> = {
  none: 'None',
  type: 'Type',
  status: 'Status',
  parent: 'Parent',
  assignee: 'Assignee',
  priority: 'Priority',
};
function GroupByControl({
  value, onChange,
}: { value: GroupByOption; onChange: (next: GroupByOption) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  // Apr 27, 2026 (audit pass 10, IRP-518/519 + spec): focused index for
  // arrow-key nav through the menu. Resets to the currently-active option
  // each time the menu opens.
  const [focusedIdx, setFocusedIdx] = useState<number>(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Array<HTMLButtonElement | null>>([]);
  // Apr 28, 2026 (jira-compare cycle 2): order matches Jira /list:
  // Status / Assignee / Priority / Story Points, with 'type' first as
  // the primary axis users actually want for per-type comparison.
  const OPTIONS: GroupByOption[] = ['none', 'type', 'status', 'parent', 'assignee', 'priority'];

  const triggerText = value === 'none' ? 'Group' : `Group: ${GROUP_BY_LABELS[value]}`;

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setAnchor({ top: r.bottom + 4, left: r.left });
    // Seed focused index from the current value so the active row is
    // pre-highlighted for keyboard users.
    const activeIdx = OPTIONS.indexOf(value);
    setFocusedIdx(activeIdx >= 0 ? activeIdx : 0);
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;
    // Move DOM focus to the focused menu item so screen readers track it.
    const el = itemsRef.current[focusedIdx];
    if (el) el.focus();
  }, [isOpen, focusedIdx]);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsOpen(false); triggerRef.current?.focus(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx((i) => (i + 1) % OPTIONS.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx((i) => (i - 1 + OPTIONS.length) % OPTIONS.length); }
      else if (e.key === 'Home') { e.preventDefault(); setFocusedIdx(0); }
      else if (e.key === 'End') { e.preventDefault(); setFocusedIdx(OPTIONS.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onChange(OPTIONS[focusedIdx]);
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, focusedIdx, onChange]);

  return (
    <>
      {/* Apr 27, 2026 (Vikram audit pass 7): trigger ported to the same
          hand-rolled native button + inline ADS-token style that
          JiraFilterAtlaskit's "Filter" trigger uses (lines 210-229 of
          JiraFilterAtlaskit.tsx) so the two pills are pixel-identical:
          32px height, 0 12px padding, white surface, 1px ds-border,
          3px radius, 13/500 type, with the open-state border switching
          to color.border.selected and the bg to color.background.selected.
          @atlaskit/button v20.5 with appearance="default" rendered a
          *different* visual (37px tall, no border, neutral subtle bg) on
          this surface, which is what caused the original drift. Native
          button + ADS tokens is also what the toolbar's Filter button
          itself does, so this isn't escaping ADS — it's matching the
          exact ADS pattern in use right next door. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={value === 'none' ? 'Group by' : `Group by ${GROUP_BY_LABELS[value]}. Click to change.`}
        onKeyDown={(e) => {
          if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        style={{
          // Apr 27, 2026 (jira-compare regression D-004): pill renders the
          // selected/active blue-chip styling whenever the menu is open OR
          // groupBy is engaged (value !== 'none'). Jira's parity probe at
          // /jira/.../list?groupBy=status: bg=rgb(233,242,254), color=
          // rgb(24,104,219). Without the `isActive` flag the trigger stays
          // flat white when the menu is closed even though the URL is
          // grouped — which fails to signal that a non-default group is
          // applied. The selected token resolves to the right values across
          // light + DARK MODE dark mode.
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 32,
          padding: '0 12px',
          borderRadius: 3,
          border: `1px solid ${(isOpen || value !== 'none') ? token('color.border.selected', '#0C66E4') : token('color.border', '#DFE1E6')}`,
          background: (isOpen || value !== 'none') ? token('color.background.selected', '#E9F2FF') : token('elevation.surface', '#FFFFFF'),
          color: (isOpen || value !== 'none') ? token('color.text.selected', '#0055CC') : token('color.text', '#292A2E'),
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'inherit',
          cursor: 'pointer',
          // Apr 27, 2026 (audit pass 9): nowrap + flexShrink:0 so the
          // trigger keeps "Group: Assignee" / "Group: Priority" on one
          // line when the toolbar shrinks. Earlier wrapping to two lines
          // (height ~50, label split across rows) was the user-flagged
          // mess.
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <span>{triggerText}</span>
        <AkChevronDownIcon label="" size="small" />
      </button>
      {isOpen && anchor && ReactDOM.createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label="Group by"
          style={{
            position: 'fixed',
            top: anchor.top,
            left: anchor.left,
            minWidth: 180,
            background: token('elevation.surface.overlay', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: 4,
            boxShadow: token('elevation.shadow.overlay', '0 8px 16px rgba(9,30,66,0.15)'),
            padding: '6px 0',
            zIndex: 9999,
            fontFamily: 'var(--cp-font-body)',
            fontSize: 14,
          }}
        >
          {OPTIONS.map((opt, i) => {
            const active = value === opt;
            const focused = focusedIdx === i;
            return (
              <button
                key={opt}
                ref={(el) => { itemsRef.current[i] = el; }}
                role="menuitemradio"
                aria-checked={active}
                tabIndex={focused ? 0 : -1}
                type="button"
                onMouseEnter={() => setFocusedIdx(i)}
                onClick={() => { onChange(opt); setIsOpen(false); triggerRef.current?.focus(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '6px 16px',
                  border: 'none',
                  outline: 'none',
                  background: active
                    ? token('color.background.selected', '#E9F2FF')
                    : focused
                      ? token('color.background.neutral.subtle.hovered', '#091E4208')
                      : 'transparent',
                  color: active ? token('color.text.selected', '#0C66E4') : token('color.text', '#292A2E'),
                  fontWeight: active ? 500 : 400,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {GROUP_BY_LABELS[opt]}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

// Apr 27, 2026 (audit pass 10): TypeChip component DELETED. Type-based
// filtering is now done through JiraFilterAtlaskit's "Work type" facet,
// matching Jira's BAU list (which has no inline chip strip). The
// component went through several iterations (lucide → Atlaskit Button +
// isSelected → Atlaskit Badge + native button + ADS tokens) before the
// chip strip itself was retired. Recover from git history if needed.

/**
 * ToolbarMenuButton — generic icon-button + portal-mounted menu.
 *
 * Apr 27, 2026 (jira-compare audit P1 #7 + #8 re-probe iter 2):
 * @atlaskit/dropdown-menu renders an empty portal on this surface (same
 * bug GroupByControl works around). This helper mirrors GroupByControl's
 * proven pattern: native trigger + ReactDOM.createPortal menu mounted to
 * <body> with position computed from the trigger rect. Items are
 * grouped, each with an optional icon + click handler. Disabled items
 * still render but don't fire onClick.
 *
 * Visual + a11y conventions match Atlaskit DropdownMenu / DropdownItem:
 *   - role="menu" on container, role="menuitem" on items
 *   - aria-haspopup="menu" + aria-expanded on trigger
 *   - keyboard nav: ArrowUp/Down, Home/End, Enter/Space, Esc
 *   - mousedown outside the trigger or menu closes the menu
 */
type ToolbarMenuItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  isDisabled?: boolean;
  onClick?: () => void;
  /** When true, skip focus-return to trigger so a newly-opened modal can claim focus. */
  opensModal?: boolean;
};
type ToolbarMenuGroup = {
  title?: string;
  items: ToolbarMenuItem[];
};
function ToolbarMenuButton({
  icon, ariaLabel, tooltipContent, buttonStyle, groups,
}: {
  icon: React.ReactNode;
  ariaLabel: string;
  tooltipContent: string;
  buttonStyle: React.CSSProperties;
  groups: ToolbarMenuGroup[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const [focusedIdx, setFocusedIdx] = useState<number>(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Array<HTMLButtonElement | null>>([]);

  // Flat enabled-items list for keyboard navigation (skips disabled).
  const enabledItems = useMemo(() => {
    const out: Array<{ groupIdx: number; itemIdx: number; flat: number }> = [];
    let flat = 0;
    groups.forEach((g, gi) => {
      g.items.forEach((it, ii) => {
        if (!it.isDisabled) out.push({ groupIdx: gi, itemIdx: ii, flat });
        flat++;
      });
    });
    return out;
  }, [groups]);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    // Anchor by the right edge so menu opens flush-right with trigger
    // (matches Atlaskit DropdownMenu placement="bottom-end" semantics).
    setAnchor({ top: r.bottom + 4, right: window.innerWidth - r.right });
    setFocusedIdx(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const el = itemsRef.current[enabledItems[focusedIdx]?.flat ?? 0];
    if (el) el.focus();
  }, [isOpen, focusedIdx, enabledItems]);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsOpen(false); triggerRef.current?.focus(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx((i) => (i + 1) % Math.max(1, enabledItems.length)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx((i) => (i - 1 + enabledItems.length) % Math.max(1, enabledItems.length)); }
      else if (e.key === 'Home') { e.preventDefault(); setFocusedIdx(0); }
      else if (e.key === 'End') { e.preventDefault(); setFocusedIdx(Math.max(0, enabledItems.length - 1)); }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const target = enabledItems[focusedIdx];
        if (target) {
          const item = groups[target.groupIdx]?.items[target.itemIdx];
          if (item && !item.isDisabled) {
            item.onClick?.();
            setIsOpen(false);
            triggerRef.current?.focus();
          }
        }
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, focusedIdx, enabledItems, groups]);

  // Flat counter for assigning refs / focus indices to items in render.
  let flatIdx = 0;

  return (
    <>
      <Tooltip content={tooltipContent}>
        <button
          ref={triggerRef}
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((v) => !v)}
          onKeyDown={(e) => {
            if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
          style={buttonStyle}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#E4E6EA'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {icon}
        </button>
      </Tooltip>
      {isOpen && anchor && ReactDOM.createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={ariaLabel}
          style={{
            position: 'fixed',
            top: anchor.top,
            right: anchor.right,
            minWidth: 180,
            background: token('elevation.surface.overlay', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: 4,
            boxShadow: token('elevation.shadow.overlay', '0 8px 16px rgba(9,30,66,0.15)'),
            padding: '6px 0',
            zIndex: 9999,
            fontFamily: 'var(--cp-font-body)',
            fontSize: 14,
          }}
        >
          {groups.map((group, gi) => (
            <React.Fragment key={`g${gi}`}>
              {group.title && (
                <div style={{
                  padding: '4px 16px',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: token('color.text.subtlest', '#6B778C'),
                }}>
                  {group.title}
                </div>
              )}
              {group.items.map((item) => {
                const myFlat = flatIdx++;
                const enabledIdx = enabledItems.findIndex((e) => e.flat === myFlat);
                const focused = enabledIdx !== -1 && enabledIdx === focusedIdx;
                return (
                  <button
                    key={item.id}
                    ref={(el) => { itemsRef.current[myFlat] = el; }}
                    role="menuitem"
                    type="button"
                    aria-disabled={item.isDisabled || undefined}
                    tabIndex={focused ? 0 : -1}
                    disabled={item.isDisabled}
                    onMouseEnter={() => { if (enabledIdx !== -1) setFocusedIdx(enabledIdx); }}
                    onClick={() => {
                      if (item.isDisabled) return;
                      item.onClick?.();
                      setIsOpen(false);
                      if (!item.opensModal) triggerRef.current?.focus();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '6px 16px',
                      border: 'none',
                      outline: 'none',
                      background: focused
                        ? token('color.background.neutral.subtle.hovered', '#091E4208')
                        : 'transparent',
                      color: item.isDisabled
                        ? token('color.text.disabled', '#A6A7AA')
                        : token('color.text', '#292A2E'),
                      fontSize: 14,
                      fontFamily: 'inherit',
                      textAlign: 'left',
                      cursor: item.isDisabled ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {item.icon && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', color: 'inherit' }}>
                        {item.icon}
                      </span>
                    )}
                    <span>{item.label}</span>
                  </button>
                );
              })}
              {gi < groups.length - 1 && (
                <div style={{
                  height: 1,
                  margin: '4px 0',
                  background: token('color.border', '#DFE1E6'),
                }} />
              )}
            </React.Fragment>
          ))}
        </div>,
        document.body
      )}
    </>
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

/**
 * 2026-05-10 Per-column filter popup body — minimal multi-select.
 * Shown inside the JiraTable filter chevron portal. Each option is a
 * checkbox; "Clear" removes all selections. State is fully driven by
 * `selected` + `onChange` so the parent owns the source of truth
 * (filterValue at the BacklogPage level).
 */
function ColumnFilterMultiSelect({
  title,
  options,
  selected,
  onChange,
  onClose,
}: {
  title: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  );
  const toggle = (opt: string) => {
    onChange(selected.includes(opt)
      ? selected.filter((s) => s !== opt)
      : [...selected, opt]);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #42526E)' }}>{title}</span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            style={{ border: 'none', background: 'transparent', color: 'var(--ds-link, #0C66E4)', fontSize: 12, cursor: 'pointer', padding: '2px 4px' }}
          >Clear</button>
        )}
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search…"
        style={{
          padding: '4px 8px', fontSize: 13,
          border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 3,
          outline: 'none', fontFamily: 'inherit',
        }}
        autoFocus
      />
      <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '6px 8px', fontSize: 12, color: 'var(--ds-text-subtlest, #6B6E76)' }}>No matches</div>
        )}
        {filtered.map((opt) => {
          const isChecked = selected.includes(opt);
          return (
            <label
              key={opt}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', cursor: 'pointer', fontSize: 14,
                borderRadius: 3,
                background: isChecked ? 'var(--ds-background-selected, #E9F2FF)' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggle(opt)}
                style={{ margin: 0 }}
              />
              <span>{opt}</span>
            </label>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--ds-border, #DFE1E6)', paddingTop: 6 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: '1px solid var(--ds-border, #DFE1E6)', background: 'transparent',
            padding: '4px 12px', borderRadius: 3, cursor: 'pointer', fontSize: 13,
          }}
        >Done</button>
      </div>
    </div>
  );
}

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

/**
 * InlineGroupCreateRow — Apr 27 2026 (jira-compare regression F-NEW-2
 * functional fill). Inline create form rendered as an extra row inside
 * a group when the user clicks the per-group "+" button. Mirrors Jira's
 * `business-list.common.ui.create-issue-plus-button.child-create-button-wrapper`
 * → on-click inline form, but Catalyst version is intentionally minimal:
 *   - Summary @atlaskit/textfield (autofocused, 255-char limit)
 *   - Create @atlaskit/button (primary, compact, disabled until non-empty)
 *   - Cancel @atlaskit/button (subtle, compact)
 *   - Enter submits, Esc cancels
 * Type defaults to "Story", status is wired by the consumer via the group
 * id (BacklogPage maps groupId → status when groupBy=status). The full
 * type-picker + assignee picker can layer on later without touching this
 * geometry.
 */
function InlineGroupCreateRow({
  groupLabel,
  isSubmitting,
  members,
  onSubmit,
  onCancel,
}: {
  groupLabel: string;
  isSubmitting: boolean;
  /**
   * Apr 27 2026 (jira-compare regression F-NEW-2 layer 3 — assignee
   * picker): project members from useQuery on project_members. The
   * picker cycles through these (+ Unassigned at index 0). Empty array
   * is allowed; in that case picker stays on "Unassigned".
   */
  members: Array<{ key: string; name: string; src?: string }>;
  onSubmit: (
    summary: string,
    issueType: CreatableIssueType,
    assignee: { id: string; name: string } | null,
  ) => void;
  onCancel: () => void;
}) {
  const [summary, setSummary] = useState('');
  const [issueType, setIssueType] = useState<CreatableIssueType>('Story');
  const [assigneeIdx, setAssigneeIdx] = useState<number>(-1); // -1 = Unassigned
  const inputRef = useRef<HTMLInputElement | null>(null);
  // 2026-05-10 Jira-parity: assignee portal dropdown — replaces click-cycle
  // (matches type picker pattern; CLAUDE.md 2026-05-08 click-cycle ≠ Jira).
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);
  const [assigneeMenuAnchor, setAssigneeMenuAnchor] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const assigneeTriggerRef = useRef<HTMLButtonElement>(null);
  const assigneeMenuRef = useRef<HTMLDivElement>(null);
  // Type picker dropdown — portal-based (L21 portal-empty bug prevents
  // @atlaskit/dropdown-menu; mirrors GroupByControl pattern exactly).
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [typeMenuAnchor, setTypeMenuAnchor] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const typeMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const typeMenuRef = useRef<HTMLDivElement>(null);
  const [typeMenuFocusedIdx, setTypeMenuFocusedIdx] = useState(0);
  const typeMenuItemsRef = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    // Focus the input on mount so the user can start typing immediately.
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  useLayoutEffect(() => {
    if (!typeMenuOpen || !typeMenuTriggerRef.current) return;
    const r = typeMenuTriggerRef.current.getBoundingClientRect();
    const estimatedHeight = CREATABLE_TYPES.length * 36 + 16;
    const spaceBelow = window.innerHeight - r.bottom - 8;
    // Open upward when near the bottom of the viewport (sticky footer case)
    const anchor = spaceBelow < estimatedHeight && r.top > estimatedHeight
      ? { bottom: window.innerHeight - r.top + 4, left: r.left }
      : { top: r.bottom + 4, left: r.left };
    setTypeMenuAnchor(anchor);
    setTypeMenuFocusedIdx(CREATABLE_TYPES.indexOf(issueType) >= 0 ? CREATABLE_TYPES.indexOf(issueType) : 0);
  }, [typeMenuOpen, issueType]);

  useEffect(() => {
    if (!typeMenuOpen) return;
    const el = typeMenuItemsRef.current[typeMenuFocusedIdx];
    if (el) el.focus();
  }, [typeMenuOpen, typeMenuFocusedIdx]);

  useEffect(() => {
    if (!typeMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (typeMenuTriggerRef.current?.contains(t) || typeMenuRef.current?.contains(t)) return;
      setTypeMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setTypeMenuOpen(false); typeMenuTriggerRef.current?.focus(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setTypeMenuFocusedIdx((i) => (i + 1) % CREATABLE_TYPES.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setTypeMenuFocusedIdx((i) => (i - 1 + CREATABLE_TYPES.length) % CREATABLE_TYPES.length); }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIssueType(CREATABLE_TYPES[typeMenuFocusedIdx]);
        setTypeMenuOpen(false);
        typeMenuTriggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [typeMenuOpen, typeMenuFocusedIdx]);

  // Assignee menu — open/position + outside-click + Escape.
  useLayoutEffect(() => {
    if (!assigneeMenuOpen || !assigneeTriggerRef.current) return;
    const r = assigneeTriggerRef.current.getBoundingClientRect();
    const estimatedHeight = Math.min(360, (members.length + 2) * 36 + 60);
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const anchor = spaceBelow < estimatedHeight && r.top > estimatedHeight
      ? { bottom: window.innerHeight - r.top + 4, left: r.left }
      : { top: r.bottom + 4, left: r.left };
    setAssigneeMenuAnchor(anchor);
    setAssigneeQuery('');
  }, [assigneeMenuOpen, members.length]);
  useEffect(() => {
    if (!assigneeMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (assigneeTriggerRef.current?.contains(t)) return;
      if (assigneeMenuRef.current?.contains(t)) return;
      setAssigneeMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAssigneeMenuOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [assigneeMenuOpen]);

  const trimmed = summary.trim();
  const canSubmit = !!trimmed && !isSubmitting;
  const currentAssignee = assigneeIdx === -1 ? null : members[assigneeIdx] ?? null;

  return (
    <div
      data-testid="jira-table.group-row.inline-create-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        background: token('elevation.surface', '#FFFFFF'),
        borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (canSubmit) {
            onSubmit(
              summary,
              issueType,
              currentAssignee ? { id: currentAssignee.key, name: currentAssignee.name } : null,
            );
          }
        }
      }}
    >
      {/* Type picker — 2026-05-08: replaced click-to-cycle with portal
          dropdown matching Jira's "Select work type" dropdown exactly.
          Same bespoke createPortal pattern as GroupByControl (L21 bug
          prevents @atlaskit/dropdown-menu from rendering on this surface). */}
      <>
        <button
          ref={typeMenuTriggerRef}
          type="button"
          data-testid="jira-table.group-row.inline-create-type-trigger"
          aria-label={`Select work type. ${issueType} currently selected.`}
          aria-haspopup="listbox"
          aria-expanded={typeMenuOpen}
          onClick={() => setTypeMenuOpen((v) => !v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            height: 24,
            padding: '0 4px',
            border: 'none',
            borderRadius: 3,
            background: typeMenuOpen ? token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)') : 'transparent',
            color: token('color.text.subtle', '#42526E'),
            fontSize: 12,
            fontFamily: 'inherit',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { if (!typeMenuOpen) e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)'); }}
          onMouseLeave={(e) => { if (!typeMenuOpen) e.currentTarget.style.background = 'transparent'; }}
        >
          <JiraIssueTypeIcon type={issueType} size={16} />
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden><path d="M2.5 3.5 5 6l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
        </button>
        {typeMenuOpen && typeMenuAnchor && ReactDOM.createPortal(
          <div
            ref={typeMenuRef}
            role="listbox"
            aria-label="Select work type"
            style={{
              position: 'fixed',
              top: typeMenuAnchor.top,
              bottom: typeMenuAnchor.bottom,
              left: typeMenuAnchor.left,
              minWidth: 200,
              maxHeight: '60vh',
              overflowY: 'auto',
              background: token('elevation.surface.overlay', '#FFFFFF'),
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: 4,
              boxShadow: token('elevation.shadow.overlay', '0 8px 16px rgba(9,30,66,0.15)'),
              padding: '6px 0',
              zIndex: 9999,
              fontFamily: 'var(--cp-font-body)',
              fontSize: 14,
            }}
          >
            {CREATABLE_TYPES.map((t, i) => {
              const active = issueType === t;
              const focused = typeMenuFocusedIdx === i;
              return (
                <button
                  key={t}
                  ref={(el) => { typeMenuItemsRef.current[i] = el; }}
                  role="option"
                  aria-selected={active}
                  tabIndex={focused ? 0 : -1}
                  type="button"
                  onMouseEnter={() => setTypeMenuFocusedIdx(i)}
                  onClick={() => { setIssueType(t); setTypeMenuOpen(false); typeMenuTriggerRef.current?.focus(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '6px 16px',
                    border: 'none',
                    outline: 'none',
                    background: active
                      ? token('color.background.selected', '#E9F2FF')
                      : focused
                        ? token('color.background.neutral.subtle.hovered', '#091E4208')
                        : 'transparent',
                    color: active ? token('color.text.selected', '#0C66E4') : token('color.text', '#292A2E'),
                    fontWeight: active ? 500 : 400,
                    fontSize: 14,
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <JiraIssueTypeIcon type={t} size={16} />
                  <span>{t}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
      </>
      <Textfield
        ref={inputRef as any}
        isCompact
        placeholder="What needs to be done?"
        value={summary}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSummary(e.target.value)}
        elemBeforeInput={
          <span style={{ paddingInlineStart: 8, color: token('color.text.subtlest', '#6B778C'), display: 'flex', alignItems: 'center' }}>
            <AkAddIcon label="" size="small" />
          </span>
        }
      />
      {/* Assignee picker — Apr 27 2026 (jira-compare regression F-NEW-2
          layer 3). Click cycles through Unassigned + project members
          (same click-cycle pattern as the type picker — avoids L21
          portal-empty bug from @atlaskit/dropdown-menu on this surface).
          Tooltip shows next-on-click value. When a member is selected
          the avatar is rendered alongside the name. */}
      {(() => {
        const currentLabel = currentAssignee ? currentAssignee.name : 'Unassigned';
        const filteredMembers = members.filter((m) => m.name.toLowerCase().includes(assigneeQuery.toLowerCase()));
        return (
          <>
            <button
              ref={assigneeTriggerRef}
              type="button"
              data-testid="jira-table.group-row.inline-create-assignee-trigger"
              aria-label={`Assignee: ${currentLabel}. Click to change.`}
              aria-haspopup="listbox"
              aria-expanded={assigneeMenuOpen}
              onClick={() => setAssigneeMenuOpen((v) => !v)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 27,
                padding: '0 10px',
                border: `1px solid ${token('color.border', '#DFE1E6')}`,
                borderRadius: 3,
                background: assigneeMenuOpen ? token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)') : token('elevation.surface', '#FFFFFF'),
                color: token('color.text', '#292A2E'),
                fontSize: 13,
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
                flexShrink: 0,
                maxWidth: 180,
              }}
            >
              {currentAssignee ? (
                <Avatar size="xsmall" src={currentAssignee.src} name={currentAssignee.name} />
              ) : (
                <AkPersonAvatarIcon label="" size="small" />
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentLabel}
              </span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden style={{ flexShrink: 0, opacity: 0.6 }}>
                <path d="M2.5 3.5 5 6l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              </svg>
            </button>
            {assigneeMenuOpen && assigneeMenuAnchor && ReactDOM.createPortal(
              <div
                ref={assigneeMenuRef}
                role="listbox"
                aria-label="Select assignee"
                style={{
                  position: 'fixed',
                  top: assigneeMenuAnchor.top,
                  bottom: assigneeMenuAnchor.bottom,
                  left: assigneeMenuAnchor.left,
                  minWidth: 240,
                  maxHeight: '50vh',
                  overflowY: 'auto',
                  background: token('elevation.surface.overlay', '#FFFFFF'),
                  border: `1px solid ${token('color.border', '#DFE1E6')}`,
                  borderRadius: 4,
                  boxShadow: token('elevation.shadow.overlay', '0 8px 16px rgba(9,30,66,0.15)'),
                  padding: 6,
                  zIndex: 9999,
                  fontFamily: 'var(--cp-font-body)',
                  fontSize: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <input
                  type="text"
                  autoFocus
                  value={assigneeQuery}
                  onChange={(e) => setAssigneeQuery(e.target.value)}
                  placeholder="Search people…"
                  style={{
                    padding: '6px 8px', fontSize: 13,
                    border: `1px solid ${token('color.border', '#DFE1E6')}`,
                    borderRadius: 3, outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <div style={{ overflowY: 'auto', maxHeight: 280 }}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={assigneeIdx === -1}
                    onClick={() => { setAssigneeIdx(-1); setAssigneeMenuOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '6px 8px',
                      border: 'none', outline: 'none',
                      background: assigneeIdx === -1 ? token('color.background.selected', '#E9F2FF') : 'transparent',
                      color: token('color.text', '#292A2E'),
                      fontSize: 14, fontFamily: 'inherit', textAlign: 'left',
                      cursor: 'pointer', borderRadius: 3,
                    }}
                  >
                    <AkPersonAvatarIcon label="" size="small" />
                    <span>Unassigned</span>
                  </button>
                  {filteredMembers.length === 0 && assigneeQuery && (
                    <div style={{ padding: '6px 8px', fontSize: 12, color: token('color.text.subtlest', '#6B6E76') }}>
                      No matches
                    </div>
                  )}
                  {filteredMembers.map((m) => {
                    const idx = members.indexOf(m);
                    const isActive = idx === assigneeIdx;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => { setAssigneeIdx(idx); setAssigneeMenuOpen(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', padding: '6px 8px',
                          border: 'none', outline: 'none',
                          background: isActive ? token('color.background.selected', '#E9F2FF') : 'transparent',
                          color: token('color.text', '#292A2E'),
                          fontSize: 14, fontFamily: 'inherit', textAlign: 'left',
                          cursor: 'pointer', borderRadius: 3,
                        }}
                        onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', '#F7F8F9'); }}
                        onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <Avatar size="xsmall" src={m.src} name={m.name} />
                        <span>{m.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>,
              document.body,
            )}
          </>
        );
      })()}
      <Button
        appearance="primary"
        spacing="compact"
        isDisabled={!canSubmit}
        onClick={() =>
          canSubmit &&
          onSubmit(
            summary,
            issueType,
            currentAssignee ? { id: currentAssignee.key, name: currentAssignee.name } : null,
          )
        }
      >
        {isSubmitting ? 'Creating…' : 'Create'}
      </Button>
    </div>
  );
}

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
  const inputRef = useRef<HTMLInputElement>(null);

  // Resync issueType if the user changes the active pill while the form
  // is closed — so opening it later reflects the latest pill choice.
  useEffect(() => {
    if (!isOpen) setIssueType(defaultIssueType);
  }, [defaultIssueType, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
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
    if (!title) { inputRef.current?.focus(); return; }
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
  // Apr 27, 2026 (L70): inline flow inside JiraTable.bottomSlot —
  // sticks flush to the table's last row with no visual gap. The
  // horizontal scrollbar of the viewport now sits BELOW this row.
  // Width: 100% of the table viewport (matches table's min-width),
  // so it scrolls horizontally with the table on narrow viewports.
  if (!isOpen) {
    return (
      <div
        style={{
          // Apr 27, 2026: position:sticky bottom:0 pins this row to the
          // bottom of the .jira-table-viewport scroller — Jira's exact
          // pattern. The probe-confirmed bug was that the row sat at
          // y≈1226 (below the 911px viewport bottom), so users had to
          // scroll the table to find Create. Now visible at all scroll
          // positions, including the moment the page loads.
          position: 'sticky',
          bottom: 0,
          zIndex: 2,
          borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
          background: token('elevation.surface', '#FFFFFF'),
          minWidth: '100%',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          data-testid="backlog-bottom-create"
          onClick={() => setIsOpen(true)}
          aria-label="Create work item"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', height: 40, padding: '0 16px',
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
          <AkAddIcon label="" size="small" />
          Create
        </button>
      </div>
    );
  }

  // Expanded state — Jira-parity: type picker + chevron | input | assignee | Create
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 2,
        borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
        background: token('elevation.surface', '#FFFFFF'),
        height: 40,
        minWidth: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 16px',
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          reset();
        }
      }}
    >
      {/* Type picker — icon + ▾ chevron, Jira parity.
       * Portal render (no shouldRenderToParent) so Popper uses position:fixed +
       * getBoundingClientRect — sticky bottom context requires viewport coords. */}
      <DropdownMenu
        placement="top-start"
        trigger={({ triggerRef, isSelected: _isSel, testId: _testId, ...triggerProps }: any) => (
          <button
            {...triggerProps}
            ref={triggerRef}
            type="button"
            aria-label={`Select work type. ${issueType} currently selected.`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              height: 28, padding: '0 4px',
              border: 'none', background: 'transparent', borderRadius: 3,
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <JiraIssueTypeIcon type={issueType} size={16} />
            <AkChevronDownIcon label="" size="small" />
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

      {/* Summary input — single-line like Jira (not textarea) */}
      <input
        ref={inputRef}
        type="text"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            create();
          }
        }}
        placeholder="What needs to be done?"
        style={{
          flex: 1, height: 28,
          border: 'none', outline: 'none',
          fontSize: 14, lineHeight: '20px',
          color: token('color.text', '#292A2E'),
          fontFamily: 'inherit', background: 'transparent',
          padding: 0, minWidth: 0,
        }}
      />

      {/* Assignee avatar — unassigned placeholder */}
      <Tooltip content="Unassigned">
        <button
          type="button"
          aria-label="Unassigned"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, padding: 0, flexShrink: 0,
            border: 'none', background: 'transparent', borderRadius: '50%',
            color: token('color.text.subtlest', '#6B778C'),
            cursor: 'default',
          }}
        >
          <AkPersonAvatarIcon label="" size="small" />
        </button>
      </Tooltip>

      {/* Create — plain text, no ↵ icon (Jira parity) */}
      <Button
        appearance="primary"
        spacing="compact"
        onClick={create}
        isLoading={isSubmitting}
        isDisabled={!summary.trim() || isSubmitting}
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
        <AkAddIcon label="" size="small" />
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
          fontSize: 14, color: token('color.text', '#292A2E'), fontFamily: 'inherit', background: 'transparent',
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
  totalAvailable,
  onSelectAll,
  onEditFields,
  onClear,
  statusOptions,
  assigneeOptions,
  onChangeStatus,
  onChangeAssignee,
  onDelete,
  isBusy,
}: {
  count: number;
  /**
   * 2026-05-12 Jira parity: total rows in current filter scope (used to label
   * the "Select all (N in scope)" CTA). When omitted, button is hidden.
   */
  totalAvailable?: number;
  onSelectAll?: () => void;
  /**
   * 2026-05-12 Jira parity: "Edit fields" opens the bulk-edit modal. When
   * omitted, the button is hidden (back-compat for callers without bulk edit).
   */
  onEditFields?: () => void;
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
          color: 'var(--ds-text-inverse, #FFFFFF)',
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
            color: 'var(--ds-text-inverse, #FFFFFF)',
            cursor: 'pointer',
            transition: 'background 100ms',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <AkCloseIcon label="" size="small" />
        </button>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.20)' }} />

        {/* Selected count */}
        <span
          style={{
            padding: '0 16px',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--ds-text-inverse, #FFFFFF)',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          {count} {itemLabel} selected
        </span>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.20)' }} />

        {/* 2026-05-12 Jira parity: Select all (in scope) — only when not yet all selected */}
        {onSelectAll && typeof totalAvailable === 'number' && count < totalAvailable && (
          <>
            <button
              type="button"
              onClick={onSelectAll}
              disabled={isBusy}
              style={{
                height: 32,
                padding: '0 12px',
                margin: '0 6px',
                background: 'transparent',
                border: 'none',
                color: 'var(--ds-text-inverse, #FFFFFF)',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: 4,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Select all ({totalAvailable} in scope)
            </button>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.20)' }} />
          </>
        )}

        {/* 2026-05-12 Jira parity: Edit fields button */}
        {onEditFields && (
          <>
            <button
              type="button"
              onClick={onEditFields}
              disabled={isBusy}
              style={{
                height: 32,
                padding: '0 12px',
                margin: '0 6px',
                background: 'transparent',
                border: 'none',
                color: 'var(--ds-text-inverse, #FFFFFF)',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: 4,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Edit fields
            </button>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.20)' }} />
          </>
        )}

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
            color: 'var(--ds-text-inverse, #FFFFFF)',
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
          <AkTrashIcon label="" size="small" />
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
          color: 'var(--ds-text-inverse, #FFFFFF)',
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
            color: token('color.text', '#292A2E'),
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
        color: token('color.text', '#292A2E'),
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
                color: token('color.text', '#292A2E'),
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
