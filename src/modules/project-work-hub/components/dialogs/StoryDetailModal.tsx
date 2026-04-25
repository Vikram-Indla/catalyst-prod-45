/**
 * StoryDetailModal — V15 Rebuild · Thin Orchestrator Shell
 * All types, constants, helpers, shared components, and section components
 * are imported from ./story-detail-modules/
 */
import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button, { IconButton } from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import InlineEdit from '@atlaskit/inline-edit';
import Textfield from '@atlaskit/textfield';
import Heading from '@atlaskit/heading';
import {
  X, ChevronDown, ChevronRight, Plus, Paperclip,
  ExternalLink, Share2, Search, MessageSquare, Clock,
  GripVertical, Link2, Trash2, Check,
  Eye, EyeOff, Sparkles, Loader2, RotateCcw, Settings2, AlertTriangle,
  SquarePen, Reply, ThumbsUp, Smile, Pencil, MoreHorizontal, Copy,
  Globe, Palette, CheckSquare,
} from 'lucide-react';
import { RichTextCommentEditor } from './story-detail-modules/RichTextCommentEditor';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { enqueueWriteBack } from '@/lib/jira-writeback';
import { CloneIssueDialog } from './CloneIssueDialog';
import { MoveIssueDialog } from './MoveIssueDialog';
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog';
import { useProjectMemberRole } from '../../hooks/useProjectMemberRole';
import { useTrackRecentItem } from '@/hooks/useRecentProjectItems';


// Ring-fenced CSS for extension components
import './story-detail-extensions.css';
import { useFixVersions } from '../../hooks/useFixVersions';

// ── Module imports ────────────────────────────────
import type {
  PhIssue, PhComment, PhActivityLog, PhAttachment, PhIssueLink,
  TmTestCase, ThTestExecution, RhRelease, RhChange,
  Profile, ProjectMember, PhIssueRow,
  ColumnConfig, ParentIssue, AIOutput,
  StatusCategory, PriorityLevel, TestResult, AIImproveType,
  ActivityTab, StoryDetailModalProps,
} from './story-detail-modules';

import {
  DEFAULT_COLUMNS, STATUS_CATEGORIES, STATUS_STYLES, STATUS_OPTION_GROUPS,
  LOZENGE_STYLES, LOZENGE, PRIORITY_COLORS, PRIORITY_STYLES, PRIORITY_ICONS, PRIORITY_LIST,
  TEST_RESULT_STYLES, LINK_TYPE_LABELS, LINK_TYPE_STYLES, LINK_TYPE_OPTIONS,
  WORK_ITEM_ICONS, AI_IMPROVE_OPTIONS,
  menuItemStyle, detailLabelStyle, detailValueStyle,
} from './story-detail-modules';

import {
  fmtDate, formatDateShort, getStatusCategory, getStatusStyle,
  getInitials, getAvatarColor, getLozengeVariant, nextPos, resolveStatusCategory,
} from './story-detail-modules';

import {
  IssueIcon, StatusLozenge, JiraStatusPill, Skel, DetailRow,
  SectionBlock, IssueRow, ColumnPicker, InlineCreateRow, SkeletonRows, EmptyState,
} from './story-detail-modules';

import { SubtasksPanel } from '../SubtasksPanel';
import { DefectsSection } from './story-detail-modules';
import { IncidentsSection } from './story-detail-modules';
import { TestHubSection } from './story-detail-modules';
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items';
import { AttachmentsSection } from './story-detail-modules';
import { EditableAssignee, EditablePriority, EditableLabels, AvatarCircle } from './story-detail-modules';
import { AddParentPicker } from '@/components/shared/AddParentPicker';
import { IssueKeyLink } from '@/components/shared/IssueKeyLink';
import { TicketBreadcrumbs } from '@/modules/project-work-hub/components/TicketBreadcrumbs';
// 2026-04-20 — TipTap CatalystRichTextEditor import + AtlaskitBoundary
// removed (USER DIRECTIVE). Atlaskit <EpicDescriptionEditor> is the sole
// composer; `tryAdfStringToHtml` is only used by the TipTap HTML path,
// also removed.
import EpicDescriptionRenderer from '@/components/shared/rich-text/atlaskit/EpicDescriptionRenderer';
import { isAdfEmpty } from '@/components/shared/rich-text/atlaskit/adfHelpers';
// Lazy-load Atlaskit editor so Rollup keeps it in its own chunk and
// doesn't bloat the first-load bundle.
const EpicDescriptionEditor = lazy(
  () => import('@/components/shared/rich-text/atlaskit/EpicDescriptionEditor'),
);
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { resolveAvatarUrl } from '@/lib/avatars';
import Lozenge from '@atlaskit/lozenge';
import { statusToLozenge } from '../../utils/statusToLozenge';

/**
 * §19 avatar chokepoint helper (2026-04-20).
 * Overwrites `avatar_url` on any profile-like row with the local-hashed asset
 * URL resolved from `full_name` / `display_name`. External Atlassian-CDN /
 * Gravatar URLs never reach render. Returns `null` when no local match exists;
 * render sites then fall back to initials (getAvatarColor + getInitials).
 */
function localizeAvatar<T extends { avatar_url?: string | null; full_name?: string | null }>(row: T | null | undefined): T | null {
  if (!row) return null;
  return { ...row, avatar_url: row.full_name ? resolveAvatarUrl(row.full_name) : null };
}

/* `resolveMediaSlotsForEditor` removed in B2b — the Atlaskit editor no longer
   consumes HTML, so there's no need to rewrite TipTap media placeholders. */

/* ═══════════════════════════════════════════════
   ANIMATIONS
   ═══════════════════════════════════════════════ */
const ANIM_STYLE_ID = 'story-modal-anims';
if (typeof document !== 'undefined' && !document.getElementById(ANIM_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = ANIM_STYLE_ID;
  s.textContent = `
    @keyframes sdm-overlay-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes sdm-card-in { from { opacity: 0; transform: scale(0.97) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes sdm-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
    @keyframes sdm-confirm-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    @keyframes sdm-slide-down { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes sdm-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    @keyframes sdm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes sdm-panel-in { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

    /* ──────────────────────────────────────────────────────────────────────
       Compact-drawer restack (task #74, 2026-04-18).
       Shares the same breakpoint + behaviour with CatalystViewBase so
       Story / Improvement detail drawers don't crush the title column to
       ~66px in compact (400px) panel mode.
       ────────────────────────────────────────────────────────────────────── */
    /* v2 (2026-04-19 / task #28): threshold raised from 679 → 899 and
       min-width: 280 added to .sdm-drawer-left. See CatalystViewBase for
       the full rationale. Same fix mirrored here so Story / Improvement
       (which renders through StoryDetailModal, not CatalystViewBase) gets
       the same protection against left-column crush. */
    .sdm-drawer-body { container-type: inline-size; }
    .sdm-drawer-left { min-width: 280px; }
    /* v3 (2026-04-19 / Pass 7): hide the Details sidebar entirely at narrow
       container widths instead of restacking. Rationale: the prior restack
       relied on .sdm-drawer-body itself picking up flex-direction: column,
       but @container rules can't target the container element itself —
       .sdm-drawer-body IS the inline-size container and queries its OWN
       ancestor, not itself. Net effect: splitter hid and sidebar stretched
       to 100% width, but parent stayed flex-row so sidebar + left column
       still sat side-by-side and the middle title column was crushed to
       ~48px. Hiding the sidebar outright at narrow widths lets the left
       (title + body) take the full panel width — matches Jira Cloud's
       actual narrow-view behaviour. */
    @container (max-width: 1023px) {
      .sdm-drawer-splitter { display: none !important; }
      .sdm-drawer-sidebar { display: none !important; }
      .sdm-drawer-left {
        border-right: none !important;
        min-width: 0 !important;
        width: 100% !important;
      }
    }
    /* Modal shell: let Atlaskit modal shrink with the viewport so the
       inner container query (above) actually fires on narrow screens. */
    @media (max-width: 1180px) {
      [data-sdm-scope] { width: 100%; }
    }
  `;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */

export default function StoryDetailModal({
  isOpen, onClose, itemId, projectId, projectKey, onOpenItem,
  panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
}: StoryDetailModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const avatarsByName = useProfileAvatarsByName();
  // F3 (Archive) FE role gate. RLS still enforces server-side via
  // archived_at_update_admin_owner; this hook only hides/shows UI.
  const { isAdminOrOwner: canArchive } = useProjectMemberRole(projectKey);

  /* ── QUERIES ───────────────────────────────── */
  const { data: currentProfile } = useQuery({
    queryKey: ['profile-local', user?.id], enabled: !!user?.id,
    queryFn: async () => {
      // §19 chokepoint: select full_name only, resolve avatar locally.
      const { data } = await supabase.from('profiles').select('id, full_name, email').eq('id', user!.id).single();
      return localizeAvatar(data as Profile | null);
    },
  });

  const { data: issue, isLoading: issueLoading } = useQuery({
    queryKey: ['ph-issue-detail', itemId], enabled: !!itemId && isOpen,
    queryFn: async () => {
      // Try ph_issues first (Jira-synced items)
      const { data } = await supabase.from('ph_issues').select('*').eq('id', itemId).is('deleted_at', null).maybeSingle();
      if (data) return data as unknown as PhIssue;
      // Fallback: catalyst_issues (locally-created items like BAU-1)
      const { data: cat } = await supabase
        .from('catalyst_issues')
        .select('*')
        .eq('id', itemId)
        .is('deleted_at', null)
        .maybeSingle();
      if (!cat) return null;

      // Resolve assignee + reporter display names from profiles (catalyst stores
      // profiles.id directly in assignee_id/reporter_id, unlike ph_issues which
      // stores Atlassian account_id strings).
      const profileIds = [cat.assignee_id, cat.reporter_id].filter(Boolean) as string[];
      const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
      if (profileIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', profileIds);
        for (const p of profs ?? []) {
          const localized = localizeAvatar(p as any);
          profileMap.set(p.id, { full_name: localized?.full_name ?? null, avatar_url: localized?.avatar_url ?? null });
        }
      }

      // Resolve parent — prefer the native parent_key text column (Phase 2
      // parity); fall back to parent_id uuid lookup; finally fall back to
      // ph_issue_links 'parent' edge (cross-source parents).
      let parentKey: string | null = (cat as any).parent_key ?? null;
      if (!parentKey && cat.parent_id) {
        const { data: par } = await supabase
          .from('catalyst_issues')
          .select('issue_key')
          .eq('id', cat.parent_id)
          .maybeSingle();
        parentKey = par?.issue_key ?? null;
      }
      if (!parentKey && cat.issue_key) {
        const { data: linkRow } = await supabase
          .from('ph_issue_links')
          .select('target_id')
          .eq('source_id', cat.issue_key)
          .eq('link_type', 'child of')
          .maybeSingle();
        parentKey = (linkRow as any)?.target_id ?? null;
      }

      // Acceptance criteria — native jsonb column on catalyst_issues
      // (parity migration 20260425185838).
      const acExt = (cat as any).acceptance_criteria ?? null;

      const assignee = cat.assignee_id ? profileMap.get(cat.assignee_id) : undefined;
      const reporter = cat.reporter_id ? profileMap.get(cat.reporter_id) : undefined;

      return {
        id: cat.id,
        issue_key: cat.issue_key,
        summary: cat.title,
        description: cat.description,
        description_text: cat.description,
        description_adf: cat.description_adf_raw,
        status: cat.status,
        status_category: cat.status === 'Done' ? 'Done' : cat.status === 'In Progress' ? 'In Progress' : 'To Do',
        issue_type: cat.issue_type,
        priority: cat.priority,
        story_points: cat.story_points,
        assignee_account_id: cat.assignee_id,
        assignee_display_name: assignee?.full_name ?? null,
        reporter_account_id: cat.reporter_id,
        reporter_display_name: reporter?.full_name ?? null,
        project_key: cat.issue_key?.split('-')[0] || projectKey || '',
        sprint_name: cat.sprint_name,
        created_at: cat.created_at,
        updated_at: cat.updated_at,
        // Sidebar renders Created/Updated from jira_* keys — alias them.
        jira_created_at: cat.created_at,
        jira_updated_at: cat.updated_at,
        parent_key: parentKey,
        acceptance_criteria: acExt,
        // Catalyst stores user-facing labels in `labels` (text[]); legacy
        // `tags` is preserved for back-compat but UI reads from labels.
        labels: ((cat as any).labels && (cat as any).labels.length > 0)
          ? (cat as any).labels
          : ((cat as any).tags ?? null),
        fix_versions: (cat as any).fix_versions ?? null,
        // Marker so downstream code can detect source without re-querying.
        __catalyst_source: true,
      } as unknown as PhIssue;
    },
  });

  // Source detection — every mutation in this modal must target the right table.
  const workItemSource: 'jira' | 'catalyst' = (issue as any)?.__catalyst_source ? 'catalyst' : 'jira';
  const resolvedSource = useMemo(
    () => issue ? ({ source: workItemSource, id: issue.id, issueKey: issue.issue_key ?? null, projectKey: (issue as any).project_key ?? null } as const) : null,
    [issue, workItemSource],
  );

  // ── Recents tracking (sidebar Recent rail picks this up) ──
  // The story modal also opens for issue_type === 'Subtask'. Subtask exclusion
  // is enforced by skipping the track call when issue.parent_key is set.
  const trackRecent = useTrackRecentItem();
  const recordedRecentRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen || !issue?.id || !issue?.summary) return;
    if (recordedRecentRef.current === issue.id) return;
    if ((issue as any).parent_key) return; // subtask guard
    recordedRecentRef.current = issue.id;
    // Map issue_type → entity_type. Story modal can host stories, bugs, tasks
    // depending on issue_type. Default to 'story' for the canonical case.
    const issueType = String(issue.issue_type ?? '').toLowerCase();
    const entityType =
      issueType.includes('bug') ? 'defect'
      : issueType.includes('task') ? 'task'
      : issueType.includes('epic') ? 'epic'
      : issueType.includes('feature') ? 'feature'
      : 'story';
    trackRecent.mutate({
      entityType,
      entityId: issue.id,
      entityKey: (issue as any).issue_key ?? undefined,
      displaySummary: issue.summary,
      projectId: undefined,
      projectName: undefined,
      navPath: `/project-hub/${(issue as any).project_key ?? projectKey ?? ''}/issue/${(issue as any).issue_key ?? issue.id}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, issue?.id, issue?.summary]);

  /**
   * §19 chokepoint (2026-04-20): reporter avatar resolution.
   * Previously queried `jira_identity_map.avatar_url` + `profiles.avatar_url`
   * directly — the worst BANNED PATTERN per CLAUDE.md §19. Now we resolve
   * synchronously from `issue.reporter_display_name`. No Supabase call; no
   * external URL; no PII query. Returns `{ avatar_url: null }` when no local
   * asset exists, letting render site fall back to initials.
   */
  const reporterProfile = useMemo(
    () => ({ avatar_url: issue?.reporter_display_name ? resolveAvatarUrl(issue.reporter_display_name) : null }),
    [issue?.reporter_display_name],
  );

  const { data: comments = [] } = useQuery({
    queryKey: ['ph-comments', itemId, issue?.issue_key, (issue as any)?.__catalyst_source ? 'catalyst' : 'jira'],
    enabled: !!itemId && isOpen && !!issue,
    queryFn: async () => {
      const isCatalyst = !!(issue as any)?.__catalyst_source;
      const tbl = isCatalyst ? 'catalyst_comments' : 'ph_comments';
      // 1) Native comments (source-aware table)
      const { data: phData } = await supabase.from(tbl).select('id, work_item_id, body, author_id, created_at, updated_at').eq('work_item_id', itemId).order('created_at', { ascending: true });
      const phRows = phData ?? [];
      const authorIds = [...new Set(phRows.map((c: any) => c.author_id).filter(Boolean))];
      // §19 chokepoint: select full_name only, resolve avatar locally.
      const { data: profiles } = authorIds.length
        ? await supabase.from('profiles').select('id, full_name, email').in('id', authorIds)
        : { data: [] as any[] };
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, localizeAvatar(p)]));
      const phMapped = phRows.map((c: any) => ({ ...c, author: profileMap.get(c.author_id) ?? null }));

      // 2) Jira-synced comments (jira_sync_comments) — read-only, keyed by issue_key.
      // Only relevant for Jira-sourced items; Catalyst items have no jira_sync rows.
      let jiraMapped: any[] = [];
      if (!isCatalyst && issue?.issue_key) {
        const { data: jiraRows } = await supabase
          .from('jira_sync_comments')
          .select('id, jira_comment_id, author_display_name, author_account_id, body, jira_created_at, created_at')
          .eq('issue_key', issue.issue_key)
          .order('jira_created_at', { ascending: true });
        jiraMapped = (jiraRows ?? []).map(j => ({
          id: `jira-${j.id}`,
          work_item_id: itemId,
          body: j.body ?? '',
          author_id: j.author_account_id ?? null,
          created_at: j.jira_created_at ?? j.created_at,
          updated_at: j.jira_created_at ?? j.created_at,
          author: {
            id: j.author_account_id,
            full_name: j.author_display_name ?? 'Jira User',
            avatar_url: j.author_display_name ? resolveAvatarUrl(j.author_display_name) : null,
            email: null,
          },
          _jiraSynced: true,
        }));
      }
      const merged = [...phMapped, ...jiraMapped].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return merged as unknown as PhComment[];
    },
  });

  const { data: activityLog = [] } = useQuery({
    queryKey: ['ph-activity-log', itemId, issue?.issue_key, (issue as any)?.__catalyst_source ? 'catalyst' : 'jira'],
    enabled: !!itemId && isOpen && !!issue,
    queryFn: async () => {
      const isCatalyst = !!(issue as any)?.__catalyst_source;
      const tbl = isCatalyst ? 'catalyst_activity_log' : 'ph_activity_log';
      // 1) Native activity log (source-aware table)
      const { data: phData } = await supabase.from(tbl).select('id, work_item_id, action, field_name, old_value, new_value, user_id, metadata, created_at').eq('work_item_id', itemId).order('created_at', { ascending: false });
      const phRows = phData ?? [];
      const userIds = [...new Set(phRows.map((e: any) => e.user_id).filter(Boolean))];
      // §19 chokepoint: select full_name only, resolve avatar locally.
      const { data: profiles } = userIds.length
        ? await supabase.from('profiles').select('id, full_name, email').in('id', userIds)
        : { data: [] as any[] };
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, localizeAvatar(p)]));
      const phMapped = phRows.map((e: any) => ({ ...e, actor: profileMap.get(e.user_id) ?? null }));

      // 2) Jira-synced changelog (jira_sync_changelog) — read-only, keyed by issue_key.
      // Only relevant for Jira-sourced items.
      let jiraMapped: any[] = [];
      if (!isCatalyst && issue?.issue_key) {
        const { data: jiraRows } = await supabase
          .from('jira_sync_changelog')
          .select('id, author_display_name, author_account_id, field_name, from_value, to_value, from_string, to_string, jira_created_at, created_at')
          .eq('issue_key', issue.issue_key)
          .order('jira_created_at', { ascending: false });
        jiraMapped = (jiraRows ?? []).map(j => ({
          id: `jira-cl-${j.id}`,
          work_item_id: itemId,
          action: 'field_updated',
          field_name: j.field_name ?? '',
          old_value: j.from_string ?? j.from_value ?? null,
          new_value: j.to_string ?? j.to_value ?? null,
          user_id: j.author_account_id ?? null,
          metadata: null,
          created_at: j.jira_created_at ?? j.created_at,
          actor: {
            id: j.author_account_id,
            full_name: j.author_display_name ?? 'Jira',
            avatar_url: j.author_display_name ? resolveAvatarUrl(j.author_display_name) : null,
            email: null,
          },
          _jiraSynced: true,
        }));
      }
      return [...phMapped, ...jiraMapped].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as unknown as PhActivityLog[];
    },
  });

  const { data: rhReleases = { linked: [] as string[], all: [] as RhRelease[] } } = useQuery({
    queryKey: ['rh-releases-for-issue', issue?.issue_key, projectId], enabled: !!issue?.issue_key,
    queryFn: async () => {
      const { data: releaseLinks } = await supabase.from('rh_release_issues').select('release_id').eq('issue_key', issue!.issue_key);
      const releaseIds = (releaseLinks ?? []).map(r => r.release_id);
      const { data: allReleases } = await supabase.from('rh_releases').select('id, name, key, status, target_date, project_id').eq('project_id', projectId).order('target_date', { ascending: false });
      return { linked: releaseIds, all: (allReleases ?? []) as RhRelease[] };
    },
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ['ph-attachments', itemId], enabled: !!itemId && isOpen,
    queryFn: async () => {
      const { data } = await supabase.from('ph_attachments').select('id, work_item_id, file_name, file_size, mime_type, storage_path, uploaded_by, created_at').eq('work_item_id', itemId).order('created_at', { ascending: false });
      return (data ?? []) as unknown as PhAttachment[];
    },
  });

  /* `issueAttachments` query removed in B2b — its only consumer was
     `resolveMediaSlotsForEditor`, which is no longer needed now the
     description editor speaks ADF directly. If a future surface needs
     the Jira attachment list, re-add the query locally to that surface
     rather than loading it eagerly on every open. */

  // Team members for @mention — §19 chokepoint: no avatar_url SELECT, resolve locally.
  const { data: mentionMembers = [] } = useQuery({
    queryKey: ['team-members-mention-local', projectId], enabled: !!projectId && isOpen,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').limit(50);
      return (data ?? []).map((p: any) => localizeAvatar(p)) as Array<{ id: string; full_name: string; avatar_url: string | null }>;
    },
    staleTime: 120000,
  });

  /* ── LOCAL STATE ───────────────────────────── */
  const [activeActivityTab, setActiveActivityTab] = useState<ActivityTab>('comments');
  const [newComment, setNewComment] = useState('');
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showAiRegenConfirm, setShowAiRegenConfirm] = useState(false);
  const [showFigmaInput, setShowFigmaInput] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState('');
  const [figmaError, setFigmaError] = useState('');
  const [keyDetailsOpen, setKeyDetailsOpen] = useState(true);
  const [localStatus, setLocalStatus] = useState<string>('');
  const [localPriority, setLocalPriority] = useState<string>('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addMenuSearch, setAddMenuSearch] = useState('');
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [showDotsMenu, setShowDotsMenu] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [descEditMode, setDescEditMode] = useState(false);
  const [acEditMode, setAcEditMode] = useState(false);
  const [descUnsaved, setDescUnsaved] = useState(false);
  const [acUnsaved, setAcUnsaved] = useState(false);
  // Phase C (2026-04-18) migrated the contentEditable h1 to @atlaskit/inline-edit,
  // which owns its own focus state internally. The former `titleFocused` useState
  // is removed as part of the cleanup sweep.
  const [commentSummary, setCommentSummary] = useState<string | null>(null);
  const [commentSummaryLoading, setCommentSummaryLoading] = useState(false);
  const [showCommentSummary, setShowCommentSummary] = useState(true);
  const [showFixVersionDropdown, setShowFixVersionDropdown] = useState(false);
  const [fixVersionSearch, setFixVersionSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const dotsMenuRef = useRef<HTMLDivElement>(null);

  // Resizable splitter state
  // Default/max mirrored with CatalystViewBase (2026-04-19): measured against
  // live Jira BAU-5419 — sidebar ~549px with 504px of content. Bumped default
  // 280→380 and max 480→600 so values like Reporter "Nada alfassam" don't wrap
  // in the default layout. Min stays at 220 for compact-drawer (@container) path.
  const [rightPanelWidth, setRightPanelWidth] = useState(380);
  const isDraggingRef = useRef(false);
  const splitterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const modalEl = document.querySelector('[data-sdm-scope]') as HTMLElement;
      if (!modalEl) return;
      const rect = modalEl.getBoundingClientRect();
      // Clamp 220..600. Max was 480; raised to match Jira's ~549 sidebar.
      const newWidth = Math.max(220, Math.min(600, rect.right - e.clientX));
      setRightPanelWidth(newWidth);
    };
    const onMouseUp = () => { isDraggingRef.current = false; document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
  }, []);

  // AI Improve Story state
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiImproveType, setAiImproveType] = useState<AIImproveType>('improve_clarify');
  const [aiDropOpen, setAiDropOpen] = useState(false);
  const [aiFocusHint, setAiFocusHint] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiOutput, setAiOutput] = useState<AIOutput | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiEdited, setAiEdited] = useState(false);
  const aiDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (aiDropRef.current && !aiDropRef.current.contains(e.target as Node)) setAiDropOpen(false);
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) { setShowAddMenu(false); setAddMenuSearch(''); }
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) setShowAiMenu(false);
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) setShowStatusDropdown(false);
      if (dotsMenuRef.current && !dotsMenuRef.current.contains(e.target as Node)) setShowDotsMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (issue) {
      setLocalStatus(issue.status);
      setLocalPriority(issue.priority ?? 'Medium');
      setAcceptanceCriteria(issue.acceptance_criteria ?? '');
    }
  }, [issue?.id, issue?.priority, issue?.status]);

  /* ── MUTATIONS ─────────────────────────────── */

  // Source-aware table router. For catalyst items every mutation targets
  // catalyst_* tables; trigger tg_catalyst_issue_audit handles activity logging.
  const issueTable = workItemSource === 'catalyst' ? 'catalyst_issues' : 'ph_issues';
  const commentsTable = workItemSource === 'catalyst' ? 'catalyst_comments' : 'ph_comments';
  const attachmentsTable = workItemSource === 'catalyst' ? 'catalyst_attachments' : 'ph_attachments';
  const attachmentsBucket = workItemSource === 'catalyst' ? 'catalyst-attachments' : 'attachments';
  // Field-name shim: catalyst_issues uses different column names.
  const mapField = (f: string): string | null => {
    if (workItemSource !== 'catalyst') return f;
    const m: Record<string, string | null> = {
      summary: 'title', description: 'description', description_text: 'description',
      description_adf: 'description_adf_raw', labels: 'tags',
      assignee_account_id: 'assignee_id', reporter_account_id: 'reporter_id',
      // Catalyst now has parity columns added in migration 20260425185838
      status_category: 'status_category',
      fix_versions: 'fix_versions',
      acceptance_criteria: 'acceptance_criteria',
      parent_key: 'parent_key',
    };
    return f in m ? m[f] : f;
  };
  const remapPatch = (patch: Record<string, any>) => {
    if (workItemSource !== 'catalyst') return patch;
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(patch)) {
      const mapped = mapField(k);
      if (mapped) out[mapped] = v;
    }
    return out;
  };

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const patch = workItemSource === 'catalyst'
        ? { status: newStatus }
        : { status: newStatus, status_category: resolveStatusCategory(newStatus) };
      const { error } = await supabase.from(issueTable).update(patch).eq('id', itemId);
      if (error) throw error;
      if (workItemSource === 'jira') {
        await enqueueWriteBack({ phIssueId: itemId, fieldName: 'status', newValue: newStatus });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] });
      queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
      queryClient.invalidateQueries({ queryKey: ['catalyst_issues'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  const updateFieldMutation = useMutation({
    mutationFn: async ({ field, value, oldValue }: { field: string; value: string; oldValue: string }) => {
      const patch = remapPatch({ [field]: value });
      if (Object.keys(patch).length === 0) return; // field has no equivalent in this source
      const { error } = await supabase.from(issueTable).update(patch).eq('id', itemId);
      if (error) throw error;
      // ph_issues needs explicit activity rows (no DB trigger). Catalyst gets
      // them automatically via tg_catalyst_issue_audit.
      if (workItemSource === 'jira') {
        await supabase.from('ph_activity_log').insert({
          work_item_id: itemId, action: 'field_updated', field_name: field,
          old_value: oldValue, new_value: value, user_id: user!.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] });
      queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
      queryClient.invalidateQueries({ queryKey: ['catalyst_issues'] });
      queryClient.invalidateQueries({ queryKey: ['ph-activity-log', itemId] });
    },
    onError: () => toast.error('Failed to update'),
  });

  const updateAssigneeMutation = useMutation({
    mutationFn: async ({ userId, displayName }: { userId: string; displayName: string }) => {
      const patch = workItemSource === 'catalyst'
        ? { assignee_id: userId }
        : { assignee_account_id: userId, assignee_display_name: displayName };
      const { error } = await supabase.from(issueTable).update(patch).eq('id', itemId);
      if (error) throw error;
      if (workItemSource === 'jira') {
        await enqueueWriteBack({ phIssueId: itemId, fieldName: 'assignee', newValue: userId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] });
      queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
      queryClient.invalidateQueries({ queryKey: ['catalyst_issues'] });
    },
    onError: () => toast.error('Failed to update assignee'),
  });

  const addCommentMutation = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase.from(commentsTable).insert({ work_item_id: itemId, body, author_id: user!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { setNewComment(''); toast.success('Comment added'); queryClient.invalidateQueries({ queryKey: ['ph-comments', itemId] }); queryClient.invalidateQueries({ queryKey: ['ph-activity-log', itemId] }); },
    onError: (e: any) => toast.error(`Failed to add comment: ${e?.message ?? ''}`),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from(commentsTable).delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Comment deleted'); queryClient.invalidateQueries({ queryKey: ['ph-comments', itemId] }); },
    onError: () => toast.error('Failed to delete'),
  });

  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, body }: { commentId: string; body: string }) => {
      const { error } = await supabase.from(commentsTable).update({ body }).eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => { setEditingCommentId(null); queryClient.invalidateQueries({ queryKey: ['ph-comments', itemId] }); },
    onError: () => toast.error('Failed to update comment'),
  });

  const deleteIssueMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(issueTable).update({ deleted_at: new Date().toISOString() }).eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Ticket deleted'); onClose();
      queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
      queryClient.invalidateQueries({ queryKey: ['catalyst_issues'] });
    },
    onError: () => toast.error('Failed to delete'),
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split('.').pop();
      const path = `attachments/${itemId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(attachmentsBucket).upload(path, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from(attachmentsTable).insert({ work_item_id: itemId, file_name: file.name, file_size: file.size, mime_type: file.type, storage_path: path, uploaded_by: user!.id } as any);
      if (dbError) throw dbError;
    },
    onSuccess: () => { toast.success('Attachment uploaded'); queryClient.invalidateQueries({ queryKey: ['ph-attachments', itemId] }); },
    onError: (e: any) => toast.error(`Failed to upload: ${e?.message ?? ''}`),
  });

  const handleCommentSubmit = (html: string) => { if (html.trim()) addCommentMutation.mutate(html); };

  const assignToMe = () => {
    if (!currentProfile || !user) return;
    updateAssigneeMutation.mutate({ userId: user.id, displayName: currentProfile.full_name ?? user.email ?? 'Me' });
  };

  const saveFigmaLink = useCallback(() => {
    if (!/^https:\/\/(www\.)?figma\.com\//.test(figmaUrl)) { setFigmaError('Only Figma URLs accepted (figma.com)'); return; }
    setFigmaError('');
    supabase.from(attachmentsTable).insert({ work_item_id: itemId, file_name: figmaUrl, file_size: 0, mime_type: 'application/figma', storage_path: figmaUrl, uploaded_by: user!.id } as any).then(({ error }) => {
      if (error) { toast.error(`Failed to save Figma link: ${error.message}`); return; }
      setFigmaUrl(''); setShowFigmaInput(false);
      toast.success('Figma design link added');
      queryClient.invalidateQueries({ queryKey: ['ph-attachments', itemId] });
    });
  }, [figmaUrl, itemId, user, queryClient, attachmentsTable]);

  /* ── AI Apply handlers ─────────────────────── */
  const handleApplyDescription = useCallback(async (newDesc: string, prev: string) => {
    updateFieldMutation.mutate({ field: 'description_text', value: newDesc, oldValue: prev });
    // TipTap editor re-renders via React Query invalidation
  }, [updateFieldMutation]);

  const handleApplyAC = useCallback(async (newAC: string, _prev: string) => {
    setAcceptanceCriteria(newAC);
    await supabase.from(issueTable).update({ acceptance_criteria: newAC } as any).eq('id', itemId);
    queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] });
  }, [itemId, queryClient, issueTable]);

  const doAiGenerate = useCallback(async () => {
    setAiGenerating(true); setAiError(null); setAiOutput(null); setAiEdited(false); setShowAiRegenConfirm(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-improve-story', {
        body: {
          issue_id: itemId,
          improve_type: aiImproveType,
          focus_hint: aiFocusHint.trim() || null,
          current_description: issue?.description_text || '(empty)',
          current_ac: acceptanceCriteria || '(none)',
          issue_summary: issue?.summary ?? '',
        },
      });
      if (fnError) throw fnError;
      if (!data?.description && !data?.acceptance_criteria) throw new Error('No content returned');
      setAiOutput({ description: data.description ?? '', acceptance_criteria: data.acceptance_criteria ?? '' });
    } catch {
      setAiError('AI features temporarily unavailable. Try again.');
    } finally { setAiGenerating(false); }
  }, [aiImproveType, aiFocusHint, itemId, issue, acceptanceCriteria]);

  const handleAiGenerate = useCallback(async () => {
    if (aiGenerating) return;
    if (aiEdited && aiOutput) {
      setShowAiRegenConfirm(true);
      return;
    }
    doAiGenerate();
  }, [aiGenerating, aiEdited, aiOutput, doAiGenerate]);

  const handleParentChange = useCallback(async (newParentKey: string | null) => {
    await supabase.from(issueTable).update({ parent_key: newParentKey } as any).eq('id', itemId);
    if (workItemSource === 'jira') {
      await enqueueWriteBack({ phIssueId: itemId, fieldName: 'parent', newValue: newParentKey ?? '' });
    }
    queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] });
    queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
    queryClient.invalidateQueries({ queryKey: ['catalyst_issues'] });
  }, [itemId, queryClient, issueTable, workItemSource]);

  /* ── DERIVED ───────────────────────────────── */
  const statusCategory = issue?.status_category ?? 'todo';
  // §20 / L41 — hand-rolled `statusStyle` retired; status pills now resolve
  // their appearance via `statusToLozenge(localStatus)` at the render site
  // and the Atlaskit Lozenge component owns all pill colour tokens.

  const fixVersionNames = useMemo(() => {
    if (!issue?.fix_versions) return [];
    const fv = issue.fix_versions;
    if (Array.isArray(fv)) return fv.map((v: any) => v?.name || v).filter(Boolean);
    return [];
  }, [issue?.fix_versions]);

  const { unreleased: unreleasedVersions, released: releasedVersions, isLoading: versionsLoading } = useFixVersions(issue?.project_key);
  const fixVersionDropdownRef = useRef<HTMLDivElement>(null);

  const handleToggleFixVersion = useCallback((versionName: string) => {
    const current = fixVersionNames;
    let updated: string[];
    if (current.includes(versionName)) {
      updated = current.filter(v => v !== versionName);
    } else {
      updated = [...current, versionName];
    }
    // Save as array of {name} objects to match Jira JSONB format
    const jsonValue = updated.map(n => ({ name: n }));
    supabase.from(issueTable).update({ fix_versions: jsonValue } as any).eq('id', itemId).then(async () => {
      // For Jira items, log to ph_activity_log manually. Catalyst items get
      // activity rows automatically via tg_catalyst_issue_audit trigger.
      if (workItemSource === 'jira') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('ph_activity_log').insert({
            work_item_id: itemId,
            user_id: user.id,
            action: 'updated',
            field_name: 'fix_versions',
            old_value: current.join(', ') || null,
            new_value: updated.join(', ') || null,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] });
      queryClient.invalidateQueries({ queryKey: ['ph-dashboard-scope-change'] });
    });
  }, [fixVersionNames, itemId, queryClient, issueTable, workItemSource]);

  // Close fix version dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fixVersionDropdownRef.current && !fixVersionDropdownRef.current.contains(e.target as Node)) {
        setShowFixVersionDropdown(false);
        setFixVersionSearch('');
      }
    };
    if (showFixVersionDropdown) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFixVersionDropdown]);

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?issue=${issue?.issue_key ?? ''}`;
    navigator.clipboard.writeText(url);
    toast(`Link copied to clipboard · ${issue?.issue_key ?? ''}`);
  }, [issue?.issue_key]);

  const labelsArray = useMemo(() => {
    if (!issue?.labels) return [];
    if (Array.isArray(issue.labels)) return issue.labels;
    try { return JSON.parse(issue.labels as any); } catch { return []; }
  }, [issue?.labels]);

  // Escape key to close (Phase A.2b — gated to panel mode).
  // Modal mode: @atlaskit/modal-dialog handles Escape natively via Modal's
  //   own onClose + focus-trap semantics.
  // Fullpage mode: Escape is a no-op (back button replaces it).
  // Panel mode: we still own Escape-to-close. Double-firing with any
  //   BacklogPage-level handler is idempotent.
  useEffect(() => {
    if (!isOpen || !panelMode) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showStatusDropdown && !showDotsMenu && !showAddMenu && !aiDropOpen && !showConfirmDelete && !showWorkflow && !showFigmaInput) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, panelMode, showStatusDropdown, showDotsMenu, showAddMenu, aiDropOpen, showConfirmDelete, showWorkflow, showFigmaInput, onClose]);

  if (!isOpen) return null;

  // Guard: show loading overlay while issue data hasn't loaded yet (prevents null crash for catalyst_issues items)
  if (issueLoading || !issue) {
    const guardOverlay: React.CSSProperties = (fullPageMode || panelMode) ? {
      position: 'relative' as const, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF',
    } : {
      position: 'fixed' as const, inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(9, 30, 66, 0.54)',
    };
    return (
      <div style={guardOverlay} onClick={!fullPageMode && !panelMode ? onClose : undefined}>
        <div style={{ width: 48, height: 48, border: '3px solid #DFE1E6', borderTopColor: '#0052CC', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  /* ═════════════════════════════════════════════
     RENDER — Jira-parity layout
     ═════════════════════════════════════════════ */

  // Panel nav helpers
  const currentNavIndex = navigationItems?.findIndex(n => n.id === itemId) ?? -1;
  const canNavPrev = currentNavIndex > 0;
  const canNavNext = navigationItems ? currentNavIndex < navigationItems.length - 1 : false;
  const navPrev = () => { if (canNavPrev && navigationItems) onNavigate?.(navigationItems[currentNavIndex - 1].id); };
  const navNext = () => { if (canNavNext && navigationItems) onNavigate?.(navigationItems[currentNavIndex + 1].id); };

  const OVERLAY: React.CSSProperties = (fullPageMode || panelMode) ? {
    position: 'relative', width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
  } : {
    position: 'fixed', inset: 0, zIndex: 1000,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    background: 'rgba(9, 30, 66, 0.54)',
    padding: '40px 16px',
    overflowY: 'auto',
    animation: 'sdm-overlay-in 200ms ease-out',
  };

  const MODAL: React.CSSProperties = fullPageMode ? {
    width: '100%', height: '100%', background: '#FFFFFF',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  } : panelMode ? {
    width: '100%', height: '100%',
    background: '#FFFFFF',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    animation: 'sdm-panel-in 200ms ease-out',
    borderLeft: '1px solid #DFE1E6',
  } : {
    width: 1100, maxWidth: '95vw',
    minHeight: 600, maxHeight: 'calc(100vh - 80px)',
    background: '#FFFFFF', borderRadius: 8,
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(9, 30, 66, 0.25)',
    overflow: 'hidden',
    animation: 'sdm-card-in 250ms ease-out',
  };

  /* ── Card contents ─────────────────────────────────────────────────────
     Top bar + body JSX, extracted so all three modes (modal / panel /
     fullpage) render the same content inside different wrappers.
     Phase A.2b (2026-04-18): modal mode wraps in @atlaskit/modal-dialog
     for focus trap + escape + body-scroll-lock a11y.
     ──────────────────────────────────────────────────────────────────── */
  const cardContents = (
    <>

          {/* ── A. TOP BAR ─────────────────────────────────────────────────
              Jira-parity fix (Phase A.1, 2026-04-18, task #12):
              In panel mode the OUTER BacklogPage toolbar already renders
              Breadcrumbs + Prev/Next + Expand + Fullscreen + Close using
              Atlaskit IconButtons. Drawing those again here stacked two
              chrome bars on the BAU-5419 screenshot. The inner bar now
              shrinks to a right-aligned action bar with just Share + More
              (which the outer toolbar doesn't own) whenever panelMode is
              active. Full chrome stays for modal + fullpage modes.
              ──────────────────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px', minHeight: 44, flexShrink: 0,
            borderBottom: '1px solid #EBECF0',
          }}>
            {/* Breadcrumb — always shown; Jira parity. Panel-mode callers
                (ProjectAllWorkView, backlog pages) don't render their own
                breadcrumb, so the detail panel owns it. */}
            <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
              {issue && (
                <TicketBreadcrumbs
                  projectKey={issue.project_key}
                  itemType={issue.issue_type ?? 'Story'}
                  itemKey={issue.issue_key ?? null}
                  middleSlot={
                    <AddParentPicker
                      issueKey={issue.issue_key}
                      parentKey={issue.parent_key ?? null}
                      projectKey={issue.project_key}
                      onParentChange={handleParentChange}
                      variant="breadcrumb"
                    />
                  }
                />
              )}
            </div>

            {/* Right actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Phase B (2026-04-18): @atlaskit/button with iconBefore.
                  Hover state + typography owned by Atlaskit tokens. */}
              <Button
                appearance="subtle"
                iconBefore={() => <Share2 size={16} />}
                onClick={handleShare}
              >
                Share
              </Button>
              <div ref={dotsMenuRef} style={{ position: 'relative' }}>
                {/* Phase B (2026-04-18): Atlaskit IconButton trigger.
                    Dropdown render below is unchanged — trigger swap only. */}
                <IconButton
                  appearance="subtle"
                  isSelected={showDotsMenu}
                  icon={() => <MoreHorizontal size={18} />}
                  label="More actions"
                  onClick={() => setShowDotsMenu(!showDotsMenu)}
                />
                {showDotsMenu && (
                  <div style={{ position: 'absolute', right: 0, top: 36, background: '#FFF', border: '1px solid #DFE1E6', borderRadius: 6, boxShadow: '0 4px 16px rgba(9,30,66,0.18)', padding: '6px 0', zIndex: 50, minWidth: 200 }}>
                    <button onClick={() => { setShowDotsMenu(false); setShowCloneDialog(true); }} style={menuItemStyle}>Clone ticket</button>
                    <button onClick={() => { setShowDotsMenu(false); setShowMoveDialog(true); }} style={menuItemStyle}>Move to project</button>
                    {canArchive && !(issue as any)?.archived_at && (
                      <button onClick={() => { setShowDotsMenu(false); setShowArchiveDialog(true); }} style={menuItemStyle}>Archive ticket</button>
                    )}
                    {canArchive && (issue as any)?.archived_at && (
                      <button onClick={() => { setShowDotsMenu(false); setShowArchiveDialog(true); }} style={menuItemStyle}>Restore from archive</button>
                    )}
                    <div style={{ height: 1, background: '#EBECF0', margin: '6px 0' }} />
                    <button onClick={() => { setShowDotsMenu(false); setShowConfirmDelete(true); }} style={{ ...menuItemStyle, color: '#DE350B' }}>Delete ticket</button>
                  </div>
                )}
              </div>
              {/* Expand/Collapse panel toggle — hidden in full-page mode
                  AND in panel mode (outer toolbar has Expand/Fullscreen).
                  Phase B (2026-04-18): IconButton + Tooltip. Custom SVG
                  glyph kept inline (not in @atlaskit/icon). */}
              {onTogglePanelMode && !fullPageMode && !panelMode && (
                <Tooltip content={panelMode ? 'Show as modal' : 'Show as side panel'}>
                  <IconButton
                    appearance="subtle"
                    icon={() => (panelMode ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                    ))}
                    label={panelMode ? 'Show as modal' : 'Show as side panel'}
                    onClick={onTogglePanelMode}
                  />
                </Tooltip>
              )}
              {/* Panel navigation — DEAD in panel mode today (outer toolbar
                  owns Prev/Next). Kept gated-false so the block re-lights if
                  StoryDetailModal is ever mounted panel-style outside the
                  BacklogPage chrome. */}
              {false && panelMode && navigationItems && navigationItems.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button onClick={navPrev} disabled={!canNavPrev} style={{
                    background: 'none', border: 'none', cursor: canNavPrev ? 'pointer' : 'default',
                    padding: '6px 6px', borderRadius: 4, color: canNavPrev ? '#42526E' : '#C1C7D0',
                    display: 'flex', alignItems: 'center', transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => { if (canNavPrev) e.currentTarget.style.background = '#F4F5F7'; }}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <span style={{ fontSize: 11, color: '#42526E', fontFamily: 'var(--cp-font-mono)', minWidth: 44, textAlign: 'center' }}>
                    {currentNavIndex + 1} / {navigationItems.length}
                  </span>
                  <button onClick={navNext} disabled={!canNavNext} style={{
                    background: 'none', border: 'none', cursor: canNavNext ? 'pointer' : 'default',
                    padding: '6px 6px', borderRadius: 4, color: canNavNext ? '#42526E' : '#C1C7D0',
                    display: 'flex', alignItems: 'center', transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => { if (canNavNext) e.currentTarget.style.background = '#F4F5F7'; }}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              )}
              {/* Close — hidden in full-page mode (back button replaces it)
                  AND in panel mode (outer BacklogPage toolbar owns Close).
                  Phase B (2026-04-18): IconButton + Tooltip. Atlaskit token-
                  driven hover replaces the hand-rolled danger-red tint. */}
              {!fullPageMode && !panelMode && (
              <Tooltip content="Close (Esc)">
                <IconButton
                  appearance="subtle"
                  icon={() => <X size={18} />}
                  label="Close"
                  onClick={onClose}
                />
              </Tooltip>
              )}
            </div>
          </div>

          {/* ── B. BODY — two-column (restacks to single column under 680px via @container) ── */}
          <div className="sdm-drawer-body" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* LEFT PANEL */}
            <div className="sdm-drawer-left" style={{
              flex: 1, overflowY: 'auto', padding: '20px 24px 32px 24px',
              borderRight: '1px solid #EBECF0', minWidth: 0,
            }}>
              {issueLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Skel w={120} /><Skel w="80%" h={24} /><Skel w="60%" h={16} /><div style={{ height: 20 }} /><Skel w="100%" h={200} />
                </div>
              ) : (
                <>
                  {/* 1. TITLE
                      Phase C (2026-04-18): migrated to @atlaskit/inline-edit
                      wrapping @atlaskit/heading (read) + @atlaskit/textfield
                      (edit). Keyboard semantics + a11y from Atlaskit. The
                      local titleFocused state is no longer referenced.

                      Package 4 fix (2026-04-20): the `label="Issue title"`
                      prop is required by InlineEdit for a11y (screen readers
                      announce "Edit Issue title"). In the default Atlaskit
                      render that label appears as a visible micro-caption
                      above the H1, which reads as a field-label and demotes
                      the H1 to a field-value — flipping the page hierarchy.
                      The `.sdm-title-edit` wrapper lets us keep the label
                      in the DOM for a11y but clip it off-screen via the
                      standard visually-hidden pattern in
                      story-detail-extensions.css. Mirrors the fix already
                      applied in CatalystTitleEditor.tsx. */}
                  <div className="sdm-title-edit" style={{ marginBottom: 12 }}>
                    <InlineEdit<string>
                      key={issue?.id ?? 'empty'}
                      defaultValue={issue?.summary ?? ''}
                      label="Issue title"
                      readView={() => (
                        <Heading size="large" as="h1">
                          {issue?.summary || '—'}
                        </Heading>
                      )}
                      editView={(fieldProps) => <Textfield {...fieldProps} autoFocus />}
                      onConfirm={(value) => {
                        const trimmed = value.trim();
                        if (trimmed && trimmed !== issue?.summary) {
                          updateFieldMutation.mutate({
                            field: 'summary',
                            value: trimmed,
                            oldValue: issue?.summary ?? '',
                          });
                        }
                      }}
                      hideActionButtons
                      readViewFitContainerWidth
                    />
                  </div>

                  {/* 2. Quick actions */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                    <div ref={addMenuRef} style={{ position: 'relative' }}>
                      <button onClick={() => setShowAddMenu(!showAddMenu)} style={{
                        width: 28, height: 28, border: '1px solid #DFE1E6', background: '#FAFBFC',
                        borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#5E6C84', transition: 'background 0.15s, border-color 0.15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#EBECF0'; e.currentTarget.style.borderColor = '#C1C7D0'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#FAFBFC'; e.currentTarget.style.borderColor = '#DFE1E6'; }}
                      ><Plus size={14} /></button>
                      {showAddMenu && (() => {
                        const atlFont = '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif';
                        const atlText = 'rgb(41, 42, 46)';
                        const atlHover = 'rgba(11, 18, 14, 0.06)';
                        const atlBorder = 'rgba(11, 18, 14, 0.14)';
                        const addMenuItems = [
                          { id: 'subtask', icon: <CheckSquare size={16} color={atlText} />, label: 'Create subtask', shortcut: '⇧ C', section: 'primary', action: () => { setShowAddMenu(false); setAddMenuSearch(''); toast('Create Subtask — use Sub-tasks section below'); } },
                          { id: 'link', icon: <Link2 size={16} color={atlText} />, label: 'Link work item', shortcut: '⇧ K', section: 'primary', action: () => { setShowAddMenu(false); setAddMenuSearch(''); const el = document.querySelector('[data-section="linked-issues"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); toast.info('Use the Linked Issues section below to add links'); } },
                          { id: 'attachment', icon: <Paperclip size={16} color={atlText} />, label: 'Add attachment', section: 'secondary', action: () => { setShowAddMenu(false); setAddMenuSearch(''); fileInputRef.current?.click(); } },
                          { id: 'weblink', icon: <Globe size={16} color={atlText} />, label: 'Add web link', section: 'secondary', action: () => { setShowAddMenu(false); setAddMenuSearch(''); toast.info('Web link — coming soon'); } },
                          { id: 'design', icon: <Palette size={16} color={atlText} />, label: 'Add design', section: 'secondary', action: () => { setShowAddMenu(false); setAddMenuSearch(''); setShowFigmaInput(true); } },
                        ];
                        const q = addMenuSearch.toLowerCase();
                        const filteredMain = q ? addMenuItems.filter(i => i.label.toLowerCase().includes(q)) : addMenuItems;
                        const primaryItems = filteredMain.filter(i => i.section === 'primary');
                        const secondaryItems = filteredMain.filter(i => i.section === 'secondary');
                        return (
                        <div style={{ position: 'absolute', left: 0, top: 34, background: '#ffffff', borderRadius: 4, boxShadow: 'rgba(30,31,33,0.15) 0px 8px 12px 0px, rgba(30,31,33,0.31) 0px 0px 1px 0px', width: 266, zIndex: 400, padding: 0, fontFamily: atlFont }}>
                          {/* Search input */}
                          <div style={{ margin: '4px 8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '0.556px solid rgb(140, 143, 151)', borderRadius: 3, padding: '1px 0' }}>
                              <Search size={14} color={atlText} style={{ marginLeft: 8, flexShrink: 0 }} />
                              <input
                                type="text"
                                placeholder="Find menu item"
                                value={addMenuSearch}
                                onChange={e => setAddMenuSearch(e.target.value)}
                                autoFocus
                                style={{ background: 'transparent', border: 'none', outline: 'none', padding: '4px 4px 4px 8px', fontSize: 14, color: atlText, width: '100%', height: 28, fontFamily: 'inherit' }}
                              />
                              {addMenuSearch && (
                                <button onClick={() => setAddMenuSearch('')} style={{ marginLeft: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: atlText, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, marginRight: 6 }}>
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                          {/* Primary group */}
                          {primaryItems.length > 0 && (
                            <div style={{ padding: 0 }}>
                              {primaryItems.map(item => (
                                <button key={item.id} onClick={item.action} onMouseEnter={e => { e.currentTarget.style.background = atlHover; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }} style={{ display: 'flex', alignItems: 'center', height: 40, padding: '8px 16px', fontSize: 13.33, fontWeight: 400, color: atlText, background: 'transparent', border: 'none', borderRadius: 0, cursor: 'pointer', width: '100%', boxSizing: 'border-box' as const, fontFamily: 'inherit' }}>
                                  <span style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', flexShrink: 0, marginRight: 8 }}>{item.icon}</span>
                                  <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                                  {item.shortcut && <span style={{ marginLeft: 'auto', fontSize: 13.33, fontWeight: 400, color: atlText, opacity: 0.7 }}>{item.shortcut}</span>}
                                </button>
                              ))}
                            </div>
                          )}
                          {/* Separator */}
                          {primaryItems.length > 0 && secondaryItems.length > 0 && (
                            <div style={{ height: 0.556, background: atlBorder }} />
                          )}
                          {/* Secondary group */}
                          {secondaryItems.length > 0 && (
                            <div style={{ padding: 0 }}>
                              {secondaryItems.map(item => (
                                <button key={item.id} onClick={item.action} onMouseEnter={e => { e.currentTarget.style.background = atlHover; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }} style={{ display: 'flex', alignItems: 'center', height: 40, padding: '8px 16px', fontSize: 13.33, fontWeight: 400, color: atlText, background: 'transparent', border: 'none', borderRadius: 0, cursor: 'pointer', width: '100%', boxSizing: 'border-box' as const, fontFamily: 'inherit' }}>
                                  <span style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', flexShrink: 0, marginRight: 8 }}>{item.icon}</span>
                                  <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {filteredMain.length === 0 && (
                            <div style={{ padding: '12px 16px', fontSize: 13.33, color: atlText, opacity: 0.5, fontFamily: 'inherit' }}>No items found</div>
                          )}
                        </div>
                        );
                      })()}
                      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadAttachmentMutation.mutate(f); e.target.value = ''; }} />
                    </div>
                    <div ref={aiMenuRef} style={{ position: 'relative' }}>
                      <button onClick={() => setShowAiMenu(o => !o)} style={{
                        width: 28, height: 28, border: '1px solid #DEEBFF', background: '#EFF6FF',
                        borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#2563EB', transition: 'background 0.15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#DEEBFF'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                        title="Catalyst Intelligence"
                      ><Sparkles size={14} /></button>
                      {showAiMenu && (
                        <div style={{
                          position: 'absolute', left: 0, top: 34, background: '#FFF',
                          border: '1px solid #DFE1E6', borderRadius: 8,
                          boxShadow: '0 8px 28px rgba(9,30,66,0.22)', padding: '12px 0 8px',
                          zIndex: 50, minWidth: 280, animation: 'sdm-slide-down 0.15s ease',
                        }}>
                          <div style={{ padding: '0 16px 10px', fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Catalyst Intelligence
                          </div>
                          {[
                            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E6C84" strokeWidth="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>, label: 'Improve description', action: () => { setShowAiMenu(false); setAiPanelOpen(true); setAiOutput(null); setAiError(null); } },
                            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E6C84" strokeWidth="1.8"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></svg>, label: 'Summarize comments', action: async () => {
                              setShowAiMenu(false);
                              if (comments.length === 0) { toast.info('No comments to summarize'); return; }
                              setCommentSummaryLoading(true); setShowCommentSummary(true); setCommentSummary(null);
                              setActiveActivityTab('comments');
                              try {
                                const commentText = comments.map((c, i) => `[${c.author?.full_name ?? 'Unknown'}]: ${c.body}`).join('\n');
                                const { data, error: fnErr } = await supabase.functions.invoke('ai-improve-story', {
                                  body: {
                                    issue_id: itemId,
                                    improve_type: 'summarize_comments',
                                    focus_hint: 'Summarize the following comments into a concise overview with key bullet points. Return ONLY the summary text, no JSON.',
                                    current_description: commentText,
                                    current_ac: '',
                                    issue_summary: issue?.summary ?? '',
                                  },
                                });
                                if (fnErr) throw fnErr;
                                const summaryText = typeof data === 'string' ? data : (data?.description || data?.summary || JSON.stringify(data));
                                setCommentSummary(summaryText);
                              } catch {
                                setCommentSummary('Unable to generate summary. Please try again.');
                              } finally { setCommentSummaryLoading(false); }
                            } },
                            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E6C84" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M13 8h4"/><path d="M13 12h4"/><path d="M13 16h2"/></svg>, label: 'Suggest child work items', action: () => { setShowAiMenu(false); const el = document.querySelector('[data-section="child-issues"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); toast.info('Use the AI suggest bar in Sub-tasks section below'); } },
                            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E6C84" strokeWidth="1.8"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/></svg>, label: 'Link similar work items', action: () => { setShowAiMenu(false); const el = document.querySelector('[data-section="linked-issues"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); toast.info('Use the AI link bar in Linked Issues section below'); } },
                          ].map((item, i) => (
                            <button key={i} onClick={item.action} style={{
                              display: 'flex', alignItems: 'center', gap: 12,
                              width: '100%', padding: '10px 16px', border: 'none',
                              background: 'transparent', cursor: 'pointer',
                              fontSize: 14, color: '#172B4D', fontFamily: 'inherit',
                              textAlign: 'left', transition: 'background 0.1s',
                            }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              {item.icon}
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI IMPROVE PANEL */}
                  {aiPanelOpen && (
                    <div style={{ marginBottom: 20, border: '1px solid #BFDBFE', borderRadius: 8, overflow: 'hidden', animation: 'sdm-slide-down 0.2s ease' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#DBEAFE' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Sparkles size={13} style={{ color: '#2563EB' }} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>AI Improve Story Requirements</span>
                        </div>
                        <span style={{ fontSize: 10, color: '#1D4ED8', background: '#EFF6FF', padding: '1px 6px', borderRadius: 3, fontFamily: 'var(--cp-font-mono)', fontWeight: 600, letterSpacing: '0.02em' }}>gemini-flash</span>
                        <button onClick={() => { setAiPanelOpen(false); setAiOutput(null); setAiError(null); }}
                          style={{ width: 22, height: 22, borderRadius: 3, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B778C' }}
                        ><X size={13} /></button>
                      </div>
                      <div style={{ padding: '14px 14px 16px', background: '#FFFFFF' }}>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B778C', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Improve type</div>
                          <div ref={aiDropRef} style={{ position: 'relative' }}>
                            <div onClick={() => setAiDropOpen(o => !o)} role="button" tabIndex={0}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 32, padding: '0 10px', border: '1px solid rgba(9,30,66,0.14)', borderRadius: 4, cursor: 'pointer', background: aiDropOpen ? '#F8FAFC' : '#fff', transition: 'border-color 0.12s' }}>
                              <span style={{ fontSize: 13, color: '#172B4D' }}>{AI_IMPROVE_OPTIONS.find(o => o.value === aiImproveType)?.label ?? 'Select…'}</span>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 5L6 8L9 5" stroke="#6B778C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                            {aiDropOpen && (
                              <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#fff', border: '1px solid rgba(9,30,66,0.24)', borderRadius: 6, boxShadow: '0 6px 16px rgba(9,30,66,0.15)', zIndex: 60, overflow: 'hidden' }}>
                                {AI_IMPROVE_OPTIONS.map(opt => (
                                  <div key={opt.value} onClick={() => { setAiImproveType(opt.value); setAiDropOpen(false); }}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: '#172B4D', background: opt.value === aiImproveType ? '#EFF6FF' : 'transparent', transition: 'background 0.1s' }}
                                    onMouseEnter={e => { if (opt.value !== aiImproveType) (e.currentTarget as HTMLElement).style.background = 'rgba(9,30,66,0.04)'; }}
                                    onMouseLeave={e => { if (opt.value !== aiImproveType) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                  >
                                    <span>{opt.label}</span>
                                    {opt.value === aiImproveType && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B778C', marginBottom: 4 }}>Focus area <span style={{ fontWeight: 400, color: '#8993A4' }}>(optional)</span></div>
                          <input value={aiFocusHint} onChange={e => setAiFocusHint(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAiGenerate(); }}
                            placeholder='e.g. "focus on edge cases" or "make more concise"'
                            style={{ width: '100%', height: 32, padding: '0 8px', border: '1px solid rgba(9,30,66,0.14)', borderRadius: 4, fontFamily: 'inherit', fontSize: 13, color: '#172B4D', background: '#fff', outline: 'none' }}
                            onFocus={e => (e.target.style.borderColor = '#2563EB')} onBlur={e => (e.target.style.borderColor = 'rgba(9,30,66,0.14)')} />
                        </div>
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#6B778C', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Context from story</div>
                          <div style={{ padding: '8px 10px', background: '#F8FAFC', border: '1px solid rgba(9,30,66,0.08)', borderRadius: 4, fontSize: 12, color: '#42526E', lineHeight: 1.5, maxHeight: 80, overflow: 'auto' }}>
                            {issue?.description_text || <em style={{ color: '#8993A4' }}>No description yet — AI will generate from story title</em>}
                          </div>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <button onClick={handleAiGenerate} disabled={aiGenerating}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 16px', borderRadius: 4, border: 'none', background: aiGenerating ? '#93C5FD' : '#2563EB', color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: aiGenerating ? 'wait' : 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
                            onMouseEnter={e => { if (!aiGenerating) (e.currentTarget.style.background = '#1D4ED8'); }}
                            onMouseLeave={e => { if (!aiGenerating) (e.currentTarget.style.background = '#2563EB'); }}
                          >
                            {aiGenerating ? (<><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'sdm-spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg> Generating…</>) : (<><Sparkles size={13} /> Generate</>)}
                          </button>
                        </div>
                        {aiError && (
                          <div style={{ marginTop: 4, padding: '8px 10px', background: '#FFF1EF', border: '1px solid #FFBDAD', borderRadius: 4, fontSize: 12, color: '#BF2600', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <AlertTriangle size={13} />{aiError}
                            <button onClick={handleAiGenerate} style={{ marginLeft: 'auto', color: '#BF2600', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Retry</button>
                          </div>
                        )}
                        {aiGenerating && (
                          <div style={{ marginTop: 10, padding: 12, background: '#F8FAFC', borderRadius: 6, border: '1px solid rgba(9,30,66,0.08)' }}>
                            {[100, 85, 70, 55].map((w, i) => (<div key={i} style={{ height: 12, marginBottom: 8, borderRadius: 4, width: `${w}%`, background: 'linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)', backgroundSize: '200% 100%', animation: 'sdm-shimmer 1.5s ease-in-out infinite' }} />))}
                          </div>
                        )}
                        {aiOutput && !aiGenerating && (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ padding: 12, background: '#F8FAFC', borderRadius: 6, border: '1px solid rgba(9,30,66,0.08)', fontSize: 13, color: '#172B4D', lineHeight: 1.6 }}>
                              {aiOutput.description && (<><div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B778C', marginBottom: 6 }}>Description</div><p style={{ margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>{aiOutput.description}</p></>)}
                              {aiOutput.acceptance_criteria && (<><div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B778C', marginBottom: 6 }}>Acceptance Criteria</div><pre style={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>{aiOutput.acceptance_criteria}</pre></>)}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                              <button onClick={handleAiGenerate} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 4, border: '1px solid #BFDBFE', background: 'transparent', fontSize: 12, fontWeight: 500, color: '#1D4ED8', cursor: 'pointer', fontFamily: 'inherit' }}><RotateCcw size={11} /> Regenerate</button>
                              {aiOutput.description && (<button onClick={() => { handleApplyDescription(aiOutput.description, issue?.description_text ?? ''); setAiPanelOpen(false); }} style={{ padding: '5px 10px', borderRadius: 4, border: '1px solid #BFDBFE', background: 'transparent', fontSize: 12, fontWeight: 500, color: '#1D4ED8', cursor: 'pointer', fontFamily: 'inherit' }}>← Apply to Description</button>)}
                              {aiOutput.acceptance_criteria && (<button onClick={() => { handleApplyAC(aiOutput.acceptance_criteria, acceptanceCriteria); setAiPanelOpen(false); }} style={{ padding: '5px 10px', borderRadius: 4, border: '1px solid #BFDBFE', background: 'transparent', fontSize: 12, fontWeight: 500, color: '#1D4ED8', cursor: 'pointer', fontFamily: 'inherit' }}>← Apply to AC</button>)}
                              {aiOutput.description && aiOutput.acceptance_criteria && (<button onClick={() => { handleApplyDescription(aiOutput.description, issue?.description_text ?? ''); handleApplyAC(aiOutput.acceptance_criteria, acceptanceCriteria); setAiPanelOpen(false); }} style={{ padding: '5px 10px', borderRadius: 4, border: 'none', background: '#2563EB', fontSize: 12, fontWeight: 600, color: '#FFFFFF', cursor: 'pointer', fontFamily: 'inherit' }}>← Apply Both</button>)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. FIGMA URL INPUT ROW */}
                  {showFigmaInput && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 12px', background: '#F4F5F7', borderRadius: 4, border: '1px solid #DFE1E6' }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#5E6C84', whiteSpace: 'nowrap' }}>Figma URL</span>
                      <input value={figmaUrl} onChange={e => { setFigmaUrl(e.target.value); setFigmaError(''); }} placeholder="https://figma.com/..." style={{ flex: 1, height: 32, borderRadius: 4, border: figmaError ? '1px solid #DE350B' : '1px solid #DFE1E6', padding: '0 8px', fontSize: 12, outline: 'none' }} />
                      <button onClick={saveFigmaLink} style={{ padding: '5px 12px', borderRadius: 4, background: '#0052CC', color: '#FFF', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Add</button>
                      <button onClick={() => { setShowFigmaInput(false); setFigmaUrl(''); setFigmaError(''); }} style={{ padding: '5px 12px', borderRadius: 4, background: '#FFF', border: '1px solid #DFE1E6', fontSize: 12, cursor: 'pointer', color: '#5E6C84' }}>Cancel</button>
                      {figmaError && <span style={{ fontSize: 11, color: '#DE350B' }}>{figmaError}</span>}
                    </div>
                  )}

                  {/* 4. KEY DETAILS — collapsible */}
                  <div style={{ marginBottom: 24 }}>
                    <div onClick={() => setKeyDetailsOpen(!keyDetailsOpen)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none', marginBottom: 14, padding: '2px 0' }}>
                      <span style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#5E6C84', transition: 'transform 0.2s', transform: keyDetailsOpen ? 'rotate(0deg)' : 'rotate(-90deg)', flexShrink: 0 }}>
                        <ChevronDown size={14} />
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#172B4D' }}>Key details</span>
                    </div>
                    {keyDetailsOpen && (
                      <div>
                        {/* Parent field */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12, minHeight: 28 }}>
                          <span style={{ width: 100, flexShrink: 0, fontSize: 13, color: '#5E6C84', paddingTop: 4 }}>Parent</span>
                          <div style={{ flex: 1, fontSize: 13, color: '#172B4D' }}>
                            {issue && <AddParentPicker issueKey={issue.issue_key} parentKey={issue.parent_key ?? null} projectKey={issue.project_key} onParentChange={handleParentChange} variant="field" parentSummaryFallback={(issue as any).parent_summary ?? null} />}
                          </div>
                        </div>
                        {/* Priority field */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12, minHeight: 28 }}>
                          <span style={{ width: 100, flexShrink: 0, fontSize: 13, color: '#5E6C84', paddingTop: 4 }}>Priority</span>
                          <div style={{ flex: 1 }}>
                            {issue && <EditablePriority issueId={issue.id} currentPriority={localPriority} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] })} />}
                          </div>
                        </div>

                        {/* Description — Jira view/edit mode */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 4px 0' }}>
                          <h2 style={{ fontSize: 14, fontWeight: 500, color: 'rgb(80, 82, 88)', lineHeight: '18.67px', margin: 0, padding: 0, fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif' }}>Description</h2>
                          {descUnsaved && <span style={{ fontSize: 12, fontWeight: 653, color: 'rgb(41, 42, 46)' }}>• Unsaved changes</span>}
                        </div>
                        {descEditMode ? (
                          /* ── Atlaskit editor — sole composer.
                             2026-04-20: TipTap CatalystRichTextEditor fallback
                             removed per USER DIRECTIVE. If the
                             @atlaskit/editor-core chunk fails to load the
                             Suspense fallback stays visible. No alternate
                             editor — only Atlaskit ADF is accepted.
                             AI-improve was only wired on the old TipTap
                             fallback; Atlaskit's +insert menu replaces it. */
                          <div style={{ position: 'relative', borderRadius: 3, backgroundColor: '#FFFFFF' }}>
                            <Suspense
                              fallback={
                                <div style={{ minHeight: 150, padding: '8px 0', color: '#97A0AF', fontSize: 13 }}>
                                  Loading editor…
                                </div>
                              }
                            >
                              <EpicDescriptionEditor
                                initialContent={issue?.description_adf ?? issue?.description_text ?? null}
                                workItemId={itemId}
                                onSave={(adfJson) => {
                                  if (!itemId) { setDescEditMode(false); return; }
                                  const parsed = adfJson ? JSON.parse(adfJson) : null;
                                   const descCol = workItemSource === 'catalyst' ? 'description_adf_raw' : 'description_adf';
                                   supabase.from(issueTable).update({ [descCol]: parsed } as any).eq('id', itemId).then(() => {
                                    queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] });
                                    queryClient.invalidateQueries({ queryKey: ['project-all-work-items-v2'] });
                                    queryClient.invalidateQueries({ queryKey: ['allwork-items'] });
                                    queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
                                    toast.success('Description saved');
                                  });
                                  setDescEditMode(false);
                                  setDescUnsaved(false);
                                }}
                                onCancel={() => { setDescEditMode(false); }}
                                placeholder="Add a description..."
                              />
                            </Suspense>
                          </div>
                        ) : (
                          <div
                            onClick={() => setDescEditMode(true)}
                            onKeyDown={(e) => { if (e.key === 'Escape') { setDescEditMode(false); if (issue?.description_text) setDescUnsaved(true); } }}
                            style={{
                              border: descUnsaved ? '1.667px solid rgb(24, 104, 219)' : 'none',
                              borderRadius: 3,
                              padding: '8px 6px',
                              minHeight: 32,
                              cursor: 'text',
                              outline: 'none',
                              transition: 'background-color 0.2s ease-in-out, border-color 0.2s ease-in-out',
                            }}
                            onMouseEnter={e => { if (!descUnsaved) e.currentTarget.style.backgroundColor = '#F8F8F8'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            {(() => {
                              const descSource = issue?.description_adf ?? issue?.description_text ?? null;
                              if (isAdfEmpty(descSource)) {
                                return <span style={{ fontSize: 14, color: 'rgb(140, 143, 151)', fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif', padding: '4px 0' }}>Add a description…</span>;
                              }
                              return (
                                <EpicDescriptionRenderer
                                  content={descSource}
                                  issueKey={issue?.issue_key}
                                />
                              );
                            })()}
                          </div>
                        )}

                        {/* Acceptance Criteria — Jira view/edit mode */}
                        <div style={{ marginTop: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 4px 0' }}>
                            <h2 style={{ fontSize: 14, fontWeight: 500, color: 'rgb(80, 82, 88)', lineHeight: '18.67px', margin: 0, padding: 0, fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif' }}>Acceptance Criteria</h2>
                            {acUnsaved && <span style={{ fontSize: 12, fontWeight: 653, color: 'rgb(41, 42, 46)' }}>• Unsaved changes</span>}
                          </div>
                          {acEditMode ? (
                            /* ── Atlaskit editor — sole composer for
                               Acceptance Criteria. Same template as the
                               description editor above. Writes parsed ADF
                               object → JSONB column `ph_issues.acceptance_criteria`.
                               2026-04-20: TipTap fallback removed per USER
                               DIRECTIVE — Atlaskit only. */
                            <div style={{ position: 'relative', borderRadius: 3, backgroundColor: '#FFFFFF' }}>
                              <Suspense
                                fallback={
                                  <div style={{ minHeight: 80, padding: '8px 0', color: '#97A0AF', fontSize: 13 }}>
                                    Loading editor…
                                  </div>
                                }
                              >
                                <EpicDescriptionEditor
                                  initialContent={acceptanceCriteria ?? null}
                                  workItemId={itemId}
                                  onSave={(adfJson) => {
                                    const parsed = adfJson ? JSON.parse(adfJson) : null;
                                    setAcceptanceCriteria(adfJson);
                                    supabase.from(issueTable).update({ acceptance_criteria: parsed } as any).eq('id', itemId).then(() => { queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] }); });
                                    setAcEditMode(false);
                                    setAcUnsaved(false);
                                  }}
                                  onCancel={() => { setAcEditMode(false); }}
                                  placeholder="No acceptance criteria defined · Add manually or use AI →"
                                />
                              </Suspense>
                            </div>
                          ) : (
                            <div
                              onClick={() => setAcEditMode(true)}
                              style={{
                                border: acUnsaved ? '1.667px solid rgb(24, 104, 219)' : 'none',
                                borderRadius: 3,
                                padding: '8px 6px',
                                minHeight: 32,
                                cursor: 'text',
                                outline: 'none',
                                transition: 'background-color 0.2s ease-in-out, border-color 0.2s ease-in-out',
                              }}
                              onMouseEnter={e => { if (!acUnsaved) e.currentTarget.style.backgroundColor = '#F8F8F8'; }}
                              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              {(() => {
                                if (isAdfEmpty(acceptanceCriteria)) {
                                  return <span style={{ fontSize: 14, color: 'rgb(140, 143, 151)', fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif', padding: '4px 0' }}>No acceptance criteria defined · Click to add</span>;
                                }
                                return (
                                  <div
                                    style={{
                                      fontSize: 14, fontWeight: 400, lineHeight: '24px', color: 'rgb(41, 42, 46)',
                                      fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif',
                                      padding: 0, margin: 0, background: 'transparent',
                                    }}
                                    className="jira-desc-view"
                                  >
                                    <EpicDescriptionRenderer
                                      content={acceptanceCriteria}
                                      issueKey={issue?.issue_key}
                                    />
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 6. ATTACHMENTS — Jira-parity component
                      2026-04-20: guard on `user` to prevent mount crash when
                      the modal renders before auth resolves (e.g. deep-link
                      into ?issue=BAU-XXXX while the session is loading, or a
                      signed-out session). `user!.id` here was crashing with
                      "Cannot read properties of null (reading 'id')" and
                      tripping the page-level ErrorBoundary. AttachmentsSection
                      needs `userId` for uploads, so hide it entirely rather
                      than pass a placeholder — matches the `{issue && ...}`
                      guard used by SubtasksPanel etc. below. */}
                  {user && (
                    <AttachmentsSection
                      attachments={attachments}
                      itemId={itemId}
                      userId={user.id}
                      projectKey={issue?.project_key}
                    />
                  )}

                  {/* 7. V2 COLLAPSIBLE SECTIONS */}
                  {issue && (
                    <>
                      <SubtasksPanel storyKey={issue.issue_key} storyId={issue.id} projectKey={issue.project_key} parentIssueType={issue.issue_type || 'Story'} parentSummary={issue.summary || ''} />
                      <LinkedWorkItemsSection issueId={issue.id} issueKey={issue.issue_key} projectKey={issue.project_key} />
                      <DefectsSection storyKey={issue.issue_key} projectKey={issue.project_key} />
                      <IncidentsSection storyKey={issue.issue_key} />
                      <TestHubSection storyId={issue.id} />
                    </>
                  )}

                  {/* 8. ACTIVITY — Jira-exact */}
                  <div style={{ marginTop: 32 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#292A2E', lineHeight: '20px', margin: 0, padding: 0, marginBottom: 12 }}>Activity</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
                      {(['all', 'comments', 'history'] as ActivityTab[]).map(tab => {
                        const isActive = activeActivityTab === tab;
                        const label = tab === 'all' ? 'All' : tab === 'comments' ? 'Comments' : 'History';
                        return (
                          <button key={tab} onClick={() => setActiveActivityTab(tab)} style={{
                            height: 26, padding: '0 12px',
                            border: isActive ? '0.556px solid #1868DB' : '0.556px solid transparent',
                            borderRadius: 2,
                            background: isActive ? '#E9F2FE' : 'transparent',
                            // Jira parity (Apr 2026): activity-tab buttons computed as
                            // Atlassian Sans 14px/400 in live Jira. Catalyst previously used
                            // 13.33px/500 which rendered slightly smaller and heavier than Jira.
                            fontSize: 14, fontWeight: 400,
                            color: isActive ? '#1868DB' : '#505258',
                            cursor: 'pointer', transition: 'background 150ms, border-color 150ms, color 150ms',
                            lineHeight: 'normal',
                          }}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F0F1F2'; }}
                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                          >{label}</button>
                        );
                      })}
                      {/* Sort toggle — right-aligned */}
                      <button type="button" onClick={() => {/* toggle sort placeholder */}}
                        style={{
                          marginLeft: 'auto', fontSize: 14, fontWeight: 500, color: '#505258',
                          background: 'transparent', border: 'none', borderRadius: 3, padding: '2px 0',
                          height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                        Newest first
                      </button>
                    </div>

                    {/* COMMENTS + ALL tabs share comment input */}
                    {(activeActivityTab === 'comments' || activeActivityTab === 'all') && (
                      <div>
                        {/* AI Summary */}
                        {(commentSummary || commentSummaryLoading) && showCommentSummary && activeActivityTab === 'comments' && (
                          <div style={{ border: '1px solid #DFE1E6', borderRadius: 8, padding: '16px 20px', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E6C84" strokeWidth="1.8"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="17" y2="12"/><line x1="3" y1="18" x2="13" y2="18"/></svg>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#172B4D' }}>Comments summary</span>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#6B778C' }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B778C" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                  Only visible to you
                                </span>
                              </div>
                              <button onClick={() => { setShowCommentSummary(false); setCommentSummary(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6B778C', display: 'flex' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </div>
                            {commentSummaryLoading ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: '#6B778C', fontSize: 14 }}>
                                <div style={{ width: 16, height: 16, border: '2px solid #DFE1E6', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'sdm-spin 0.8s linear infinite' }} />
                                Summarizing comments…
                              </div>
                            ) : (
                              <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}
                                dangerouslySetInnerHTML={{ __html: (commentSummary ?? '').replace(/^[-•]\s*/gm, '').split('\n').filter(l => l.trim()).map((line, i) => {
                                  if (i === 0 && !line.startsWith('•')) return `<p style="margin:0 0 12px">${line}</p><ul style="margin:0;padding-left:20px">`;
                                  return `<li style="margin-bottom:6px;color:#172B4D">${line}</li>`;
                                }).join('') + '</ul>' }}
                              />
                            )}
                          </div>
                        )}

                        {/* Comment input — Rich text editor with image paste */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'flex-start' }}>
                          {currentProfile?.avatar_url ? (
                            <img src={currentProfile.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginTop: 4 }} />
                          ) : (
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: getAvatarColor(user?.id ?? ''), color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 4 }}>{getInitials(currentProfile?.full_name)}</div>
                          )}
                          <div style={{ flex: 1 }}>
                            <RichTextCommentEditor
                              onSubmit={handleCommentSubmit}
                              isSubmitting={addCommentMutation.isPending}
                              placeholder="Add a comment…"
                              teamMembers={mentionMembers}
                              workItemId={itemId}
                            />
                            {/* Quick-reply pills */}
                            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                              {['Status update...', 'Thanks...', 'Agree...'].map(chip => (
                                <button key={chip} type="button"
                                  style={{
                                    display: 'inline-flex', background: 'transparent', border: 'none',
                                    borderRadius: 3, color: '#505258', fontSize: 14, fontWeight: 500,
                                    padding: '2px 12px', height: 24, cursor: 'pointer',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#F0F1F2'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                >{chip}</button>
                              ))}
                            </div>
                            {/* Pro tip */}
                            <div style={{ fontSize: 14, fontWeight: 400, color: '#292A2E', lineHeight: '20px', marginTop: 4 }}>
                              Pro tip: press <span style={{ fontWeight: 600 }}>M</span> to comment
                            </div>
                          </div>
                        </div>

                        {/* Comments list */}
                        {activeActivityTab === 'comments' && comments.length === 0 && <div style={{ padding: '24px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>No comments yet</div>}
                        {activeActivityTab === 'comments' && comments.map(c => (
                          <div key={c.id} style={{ display: 'flex', gap: 8, margin: '8px 0 32px 0', minHeight: 40 }}>
                            {c.author?.avatar_url ? (
                              <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src={c.author.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: 9999, objectFit: 'cover', border: '2px solid #FFFFFF' }} />
                              </div>
                            ) : (
                              <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: getAvatarColor(c.author_id), color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, border: '2px solid #FFFFFF' }}>{getInitials(c.author?.full_name)}</div>
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'baseline' }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#292A2E' }}>{c.author?.full_name ?? 'Unknown'}</span>
                                <span style={{ fontSize: 14, fontWeight: 400, color: '#292A2E' }}>commented</span>
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 400, color: '#292A2E', lineHeight: '16px' }}>{fmtDate(c.created_at)}</div>

                              {editingCommentId === c.id ? (
                                <RichTextCommentEditor
                                  onSubmit={(html) => editCommentMutation.mutate({ commentId: c.id, body: html })}
                                  onCancel={() => setEditingCommentId(null)}
                                  isSubmitting={editCommentMutation.isPending}
                                  initialValue={c.body}
                                  teamMembers={mentionMembers}
                                  workItemId={itemId}
                                />
                              ) : (
                                <div
                                  className="catalyst-comment-body"
                                  style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.6 }}
                                  dangerouslySetInnerHTML={{ __html: c.body }}
                                  onClick={(e) => {
                                    const target = e.target as HTMLElement;
                                    if (target.tagName === 'IMG') {
                                      const src = (target as HTMLImageElement).src;
                                      if (src) window.open(src, '_blank', 'noopener,noreferrer');
                                    }
                                  }}
                                />
                              )}

                              {/* Comment action icons — Jira style */}
                              {editingCommentId !== c.id && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, position: 'relative' }}>
                                  {[
                                    { icon: <Reply size={14} />, title: 'Reply', onClick: () => {} },
                                    { icon: <ThumbsUp size={14} />, title: 'Like', onClick: () => {} },
                                    { icon: <Smile size={14} />, title: 'React', onClick: () => {} },
                                    { icon: <Pencil size={14} />, title: 'Edit', onClick: () => setEditingCommentId(c.id) },
                                  ].map((action, idx) => (
                                    <button key={idx} onClick={action.onClick} title={action.title}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, color: '#6B778C', display: 'flex', alignItems: 'center', transition: 'color 0.1s, background 0.1s' }}
                                      onMouseEnter={e => { e.currentTarget.style.color = '#172B4D'; e.currentTarget.style.background = '#F4F5F7'; }}
                                      onMouseLeave={e => { e.currentTarget.style.color = '#6B778C'; e.currentTarget.style.background = 'none'; }}
                                    >{action.icon}</button>
                                  ))}
                                  {/* 3-dot menu */}
                                  <div style={{ position: 'relative' }}>
                                    <button onClick={() => setCommentMenuId(commentMenuId === c.id ? null : c.id)} title="More"
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 4, color: '#6B778C', display: 'flex', alignItems: 'center', transition: 'color 0.1s, background 0.1s' }}
                                      onMouseEnter={e => { e.currentTarget.style.color = '#172B4D'; e.currentTarget.style.background = '#F4F5F7'; }}
                                      onMouseLeave={e => { e.currentTarget.style.color = '#6B778C'; e.currentTarget.style.background = 'none'; }}
                                    ><MoreHorizontal size={14} /></button>
                                    {commentMenuId === c.id && (
                                      <div style={{
                                        position: 'absolute', left: 0, top: 28, background: '#FFF', border: '1px solid #DFE1E6',
                                        borderRadius: 6, boxShadow: '0 4px 16px rgba(9,30,66,0.18)', zIndex: 50, minWidth: 160, padding: '4px 0',
                                      }}>
                                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/comment/${c.id}`); setCommentMenuId(null); toast.success('Link copied'); }}
                                          style={{ width: '100%', padding: '8px 14px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: '#172B4D', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.1s' }}
                                          onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        ><Copy size={14} /> Copy link</button>
                                        <button onClick={() => { deleteCommentMutation.mutate(c.id); setCommentMenuId(null); }}
                                          style={{ width: '100%', padding: '8px 14px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: '#DE350B', display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.1s' }}
                                          onMouseEnter={e => (e.currentTarget.style.background = '#FFEBE6')}
                                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        ><Trash2 size={14} /> Delete</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* ALL — interleaved with HISTORY badges */}
                        {activeActivityTab === 'all' && (() => {
                          type ME = { type: 'comment'; data: (typeof comments)[number]; ts: string } | { type: 'history'; data: (typeof activityLog)[number]; ts: string };
                          const merged: ME[] = [
                            ...comments.map(c => ({ type: 'comment' as const, data: c, ts: c.created_at })),
                            ...activityLog.map(e => ({ type: 'history' as const, data: e, ts: e.created_at })),
                          ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
                          if (merged.length === 0) return <div style={{ padding: '24px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>No activity yet</div>;
                          return merged.map((item) => {
                            if (item.type === 'comment') {
                              const c = item.data;
                              return (
                                <div key={`c-${c.id}`} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                                  {c.author?.avatar_url ? <img src={c.author.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 36, height: 36, borderRadius: '50%', background: getAvatarColor(c.author_id), color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{getInitials(c.author?.full_name)}</div>}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ marginBottom: 4 }}><span style={{ fontSize: 14, fontWeight: 600, color: '#172B4D' }}>{c.author?.full_name ?? 'Unknown'}</span> <span style={{ fontSize: 13, color: '#6B778C' }}>{fmtDate(c.created_at)}</span></div>
                                    <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.body}</div>
                                  </div>
                                </div>
                              );
                            }
                            const e = item.data;
                            return (
                              <div key={`h-${e.id}`} style={{ display: 'flex', gap: 8, margin: '8px 0 32px 0', minHeight: 40, fontSize: 14, lineHeight: '20px', color: '#292A2E' }}>
                                {e.actor?.avatar_url ? (
                                  <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img src={e.actor.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: 9999, objectFit: 'cover', border: '2px solid #FFFFFF' }} />
                                  </div>
                                ) : (
                                  <div style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0052CC', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, border: '2px solid #FFFFFF' }}>
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1"/><rect x="4" y="4" width="16" height="18" rx="2"/></svg>
                                    </div>
                                  </div>
                                )}
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'baseline' }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#292A2E' }}>{e.actor?.full_name ?? 'System'}</span>
                                    <span style={{ fontSize: 14, fontWeight: 400, color: '#292A2E' }}>{e.action === 'field_updated' ? 'changed the' : e.action}</span>
                                    {e.action === 'field_updated' && e.field_name && <span style={{ fontSize: 14, fontWeight: 500, color: '#292A2E' }}>{e.field_name}</span>}
                                  </div>
                                  <div style={{ fontSize: 12, fontWeight: 400, color: '#292A2E', lineHeight: '16px' }}>{fmtDate(e.created_at)}</div>
                                  {(e.old_value || e.new_value) && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 14, color: '#505258' }}>
                                      {e.old_value && <span style={{ color: '#292A2E', fontWeight: 400 }}>{e.old_value}</span>}
                                      {e.old_value && e.new_value && <span style={{ color: '#505258' }}>→</span>}
                                      {e.new_value && (
                                        e.field_name === 'assignee_display_name'
                                          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{(() => { const avu = avatarsByName.get(e.new_value.toLowerCase()); return avu ? <img src={avu} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 24, height: 24, borderRadius: '50%', background: getAvatarColor(e.new_value), color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{getInitials(e.new_value)}</div>; })()}<span style={{ fontWeight: 500 }}>{e.new_value}</span></span>
                                          : <span style={{ color: '#292A2E', fontWeight: 400 }}>{e.new_value}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}

                    {/* HISTORY TAB */}
                    {activeActivityTab === 'history' && (
                      <div>
                        {activityLog.length === 0 && <div style={{ padding: '24px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>No activity recorded</div>}
                        {activityLog.map(entry => (
                          <div key={entry.id} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                            {entry.actor?.avatar_url ? <img src={entry.actor.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0052CC', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2"><rect x="8" y="2" width="8" height="4" rx="1"/><rect x="4" y="4" width="16" height="18" rx="2"/></svg></div>}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.5, marginBottom: 2 }}><span style={{ fontWeight: 600 }}>{entry.actor?.full_name ?? 'System'}</span>{' '}{entry.action === 'field_updated' ? <>changed the <span style={{ fontWeight: 600 }}>{entry.field_name}</span></> : entry.action}</div>
                              <div style={{ fontSize: 13, color: '#6B778C' }}>{fmtDate(entry.created_at)}</div>
                              {(entry.old_value || entry.new_value) && (
                                <div style={{ marginTop: 10, fontSize: 14, color: '#172B4D', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                  <span style={{ color: '#6B778C' }}>{entry.old_value || 'Unassigned'}</span>
                                  <span style={{ color: '#97A0AF' }}>→</span>
                                  {entry.field_name === 'assignee_display_name' && entry.new_value ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{(() => { const avu = avatarsByName.get(entry.new_value.toLowerCase()); return avu ? <img src={avu} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 28, height: 28, borderRadius: '50%', background: getAvatarColor(entry.new_value), color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{getInitials(entry.new_value)}</div>; })()}<span style={{ fontWeight: 500 }}>{entry.new_value}</span></span> : <span style={{ fontWeight: 500 }}>{entry.new_value || 'None'}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* RESIZABLE SPLITTER — neutral grey, no blue tint */}
            <div
              ref={splitterRef}
              className="sdm-drawer-splitter"
              onMouseDown={() => { isDraggingRef.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }}
              style={{
                width: 6, minWidth: 6, cursor: 'col-resize', background: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
              onMouseLeave={e => { if (!isDraggingRef.current) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ width: 1.5, height: 32, borderRadius: 1, background: '#DFE1E6', transition: 'background 0.15s' }} />
            </div>

            {/* RIGHT PANEL — Sidebar details */}
            <div className="sdm-drawer-sidebar" style={{
              width: rightPanelWidth, minWidth: 220, maxWidth: 600,
              background: '#FFFFFF', overflowY: 'auto', overflowX: 'hidden',
              display: 'flex', flexDirection: 'column', padding: '16px 16px 32px 16px',
            }}>
              {/* Status
                  P0-1 (2026-04-20 critique): previously rendered as a bare pill
                  with no "Status" caption, while every peer field (Parent /
                  Priority / Assignee / Reporter / Labels / Fix versions) ships
                  a 12px/600 microlabel. Added the matching label row so the
                  sidebar hierarchy stays consistent.
                  P0-3 (same critique): dropped `isBold` from the Lozenge.
                  Atlaskit Lozenge with `isBold` renders the saturated solid
                  fill (olive #5B7F24 for "success"), which is an explicit §7
                  ban ("saturated status pills"). The non-bold variant renders
                  the canonical pastel bg/dark text pair from §5 (#E3FCEF /
                  #006644 for Done). */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Status</div>
                <div ref={statusDropdownRef} style={{ position: 'relative' }}>
                  {/*
                    §20 / L41 — Atlaskit Lozenge is the ONLY admissible status pill
                    on the Jira-clone surface. No inline bg/color (no cyan "In UAT",
                    no rainbow). The <button> wrapper is transparent and exists only
                    to carry the dropdown toggle + chevron affordance.
                  */}
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    style={{
                      background: 'transparent', border: 'none', padding: 0,
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
                      gap: 4, fontFamily: 'inherit', lineHeight: 1,
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    <Lozenge appearance={statusToLozenge(localStatus || 'Backlog')}>
                      {localStatus || 'Backlog'}
                    </Lozenge>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden><path d="M2 4L5 7L8 4" stroke="#42526E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  {showStatusDropdown && (
                    <div onKeyDown={e => { if (e.key === 'Escape') setShowStatusDropdown(false); }} style={{ position: 'absolute', left: 0, top: '100%', marginTop: 4, background: '#FFFFFF', borderRadius: 4, border: 'none', boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)', padding: '4px 0', zIndex: 9999, minWidth: 220, maxHeight: 340, overflowY: 'auto', animation: 'sdm-slide-down 0.15s ease-out' }}>
                      {STATUS_OPTION_GROUPS.map(group => (
                        <div key={group.category}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 12px 4px', marginTop: 4 }}>{group.groupLabel}</div>
                          {group.statuses.map(st => {
                            const isActive = localStatus === st;
                            return (
                              <div key={st} onClick={() => { setLocalStatus(st); setShowStatusDropdown(false); updateStatusMutation.mutate(st); }} style={{
                                height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: 'pointer', background: isActive ? '#DEEBFF' : 'transparent', transition: 'background 80ms',
                              }}
                                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F4F5F7'; }}
                                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                              >
                                {/* §20 / L41 — Atlaskit Lozenge only; no inline colours per-item.
                                    P0-3 (2026-04-20): dropped `isBold` — pastel variant matches §5 spec. */}
                                <Lozenge appearance={statusToLozenge(st)}>{st}</Lozenge>
                                {isActive && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0052CC" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      <div style={{ height: 1, background: '#EBECF0', margin: '4px 0' }} />
                      <div onClick={() => { setShowStatusDropdown(false); setShowWorkflow(true); }}
                        style={{ height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, fontWeight: 400, color: '#172B4D', transition: 'background 80ms' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >View workflow</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Details section */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 12, userSelect: 'none' }}>
                  <ChevronDown size={14} color="#42526E" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#172B4D' }}>Details</span>
                </div>

                {/* Fix versions — Jira-parity editable dropdown */}
                <div style={{ marginBottom: 14, position: 'relative' }} ref={fixVersionDropdownRef}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Fix versions</div>
                  {/* Selected versions + trigger */}
                  <div
                    onClick={() => setShowFixVersionDropdown(!showFixVersionDropdown)}
                    style={{
                      display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
                      padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                      minHeight: 32, transition: 'background 0.12s',
                      border: showFixVersionDropdown ? '2px solid #4C9AFF' : '2px solid transparent',
                      background: showFixVersionDropdown ? '#FFFFFF' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!showFixVersionDropdown) e.currentTarget.style.background = '#F4F5F7'; }}
                    onMouseLeave={e => { if (!showFixVersionDropdown) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {fixVersionNames.length > 0 ? (
                      fixVersionNames.map((v: string, i: number) => (
                        <span key={i} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 3,
                          background: '#DEEBFF', color: '#0747A6',
                        }}>
                          {v}
                          <button onClick={e => { e.stopPropagation(); handleToggleFixVersion(v); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#0747A6' }}>
                            <X size={10} />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span style={{ color: '#6B778C', fontSize: 14 }}>None</span>
                    )}
                  </div>

                  {/* Dropdown */}
                  {showFixVersionDropdown && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0,
                      background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 4,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100,
                      maxHeight: 320, overflow: 'hidden',
                    }}>
                      {/* Search */}
                      <div style={{ padding: '8px 12px', borderBottom: '1px solid #F4F5F7' }}>
                        <input
                          autoFocus
                          value={fixVersionSearch}
                          onChange={e => setFixVersionSearch(e.target.value)}
                          placeholder="Search versions..."
                          style={{
                            width: '100%', border: '1px solid #DFE1E6', borderRadius: 4,
                            padding: '6px 10px', fontSize: 13, color: '#172B4D', outline: 'none',
                            fontFamily: 'inherit',
                          }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#4C9AFF'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = '#DFE1E6'; }}
                        />
                      </div>
                      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                        {versionsLoading && <div style={{ padding: '12px 16px', fontSize: 13, color: '#6B778C' }}>Loading...</div>}

                        {/* Unreleased */}
                        {(() => {
                          const filtered = unreleasedVersions.filter(v => v.name.toLowerCase().includes(fixVersionSearch.toLowerCase()));
                          if (filtered.length === 0) return null;
                          return (
                            <>
                              <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Unreleased</div>
                              {filtered.map(v => {
                                const isSelected = fixVersionNames.includes(v.name);
                                return (
                                  <div
                                    key={v.name}
                                    onClick={() => handleToggleFixVersion(v.name)}
                                    style={{
                                      padding: '8px 16px', fontSize: 14, color: '#172B4D',
                                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                      background: isSelected ? '#DEEBFF' : 'transparent',
                                      transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F4F5F7'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#DEEBFF' : 'transparent'; }}
                                  >
                                    <span>{v.name}</span>
                                    {isSelected && <Check size={14} color="#0747A6" />}
                                  </div>
                                );
                              })}
                            </>
                          );
                        })()}

                        {/* Released */}
                        {(() => {
                          const filtered = releasedVersions.filter(v => v.name.toLowerCase().includes(fixVersionSearch.toLowerCase()));
                          if (filtered.length === 0) return null;
                          return (
                            <>
                              <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.03em', borderTop: '1px solid #F4F5F7' }}>Released</div>
                              {filtered.map(v => {
                                const isSelected = fixVersionNames.includes(v.name);
                                return (
                                  <div
                                    key={v.name}
                                    onClick={() => handleToggleFixVersion(v.name)}
                                    style={{
                                      padding: '8px 16px', fontSize: 14, color: '#172B4D',
                                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                      background: isSelected ? '#DEEBFF' : 'transparent',
                                      transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#F4F5F7'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#DEEBFF' : 'transparent'; }}
                                  >
                                    <span>{v.name}</span>
                                    {isSelected && <Check size={14} color="#0747A6" />}
                                  </div>
                                );
                              })}
                            </>
                          );
                        })()}

                        {!versionsLoading && unreleasedVersions.length === 0 && releasedVersions.length === 0 && (
                          <div style={{ padding: '16px', fontSize: 13, color: '#6B778C', textAlign: 'center' }}>No versions found for this project</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Assignee — Jira parity: avatar + name, no "Assign to me" link */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Assignee</div>
                  {issue && (
                    <EditableAssignee issueId={issue.id} projectId={projectId} currentAssigneeId={issue.assignee_account_id} currentAssigneeName={issue.assignee_display_name}
                      onUpdate={() => queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] })} />
                  )}
                </div>

                {/* Reporter — Jira parity: 28px avatar with real image, 14px name
                    §19 chokepoint (2026-04-20, critique P0-2): Reporter previously
                    hand-rolled a `<span>initials</span>` fallback tile while Assignee
                    (via EditableAssignee → AvatarCircle) rendered a CircleUser SVG
                    tile. Same user ("Nada alfassam"), same hash-colour, two
                    different components — violating the single-chokepoint rule.
                    Now both fields share AvatarCircle → identical fallback shape.
                    The "NANada alfassam" concat bug disappears as a side-effect
                    because AvatarCircle has no visible text inside the tile. */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Reporter</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 4 }}>
                    {issue?.reporter_display_name ? (
                      <>
                        <AvatarCircle
                          userId={issue.reporter_account_id ?? issue.reporter_display_name}
                          name={issue.reporter_display_name}
                          avatarUrl={reporterProfile?.avatar_url}
                          size={28}
                        />
                        <span style={{ fontSize: 14, color: '#172B4D', fontWeight: 400 }}>{issue.reporter_display_name}</span>
                      </>
                    ) : <span style={{ color: '#42526E', fontSize: 14 }}>—</span>}
                  </div>
                </div>

                {/* Labels */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Labels</div>
                  {issue && <EditableLabels issueId={issue.id} currentLabels={labelsArray} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['ph-issue-detail', itemId] })} />}
                </div>
              </div>

              {/* Timestamps — bottom */}
              <div style={{ marginTop: 'auto', padding: '12px 0 0' }}>
                <div style={{ fontSize: 12, color: '#5E6C84', marginBottom: 4, lineHeight: 1.6 }}>
                  <span style={{ color: '#42526E', fontWeight: 500 }}>Created</span> {fmtDate(issue?.jira_created_at)}
                </div>
                <div style={{ fontSize: 12, color: '#5E6C84', lineHeight: 1.6 }}>
                  <span style={{ color: '#42526E', fontWeight: 500 }}>Updated</span> {fmtDate(issue?.jira_updated_at)}
                </div>
              </div>
            </div>
          </div>
    </>
  );

  /* ── Drawer wrapper ─────────────────────────────────────────────────────
     Modal mode uses @atlaskit/modal-dialog (overlay + focus trap + escape
     + body scroll lock + click-outside all handled by Atlaskit).
     Panel + fullpage modes keep the hand-rolled shell from Phase A.1.
     ──────────────────────────────────────────────────────────────────── */
  const drawer = (!panelMode && !fullPageMode) ? (
    <Modal onClose={onClose} width={1100} shouldScrollInViewport={false}>
      <div data-sdm-scope style={{
        minHeight: 600,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {cardContents}
      </div>
    </Modal>
  ) : (
    <div style={OVERLAY} onClick={(panelMode || fullPageMode) ? undefined : onClose}>
      <div data-sdm-scope style={MODAL} onClick={e => e.stopPropagation()}>
        {cardContents}
      </div>
    </div>
  );

  return (
    <>
      {drawer}

      {/* ── MODALS ────────────────────────────────────────────────────────
          Phase H (2026-04-18): migrated three hand-rolled position:fixed
          modals to @atlaskit/modal-dialog. Focus trap, Escape, click-outside,
          body scroll lock all inherited. Matches E.1 sidebar delete pattern
          and BacklogPage bulk-delete pattern. */}
      <ModalTransition>
        {showConfirmDelete && (
          <Modal
            onClose={() => setShowConfirmDelete(false)}
            width="small"
          >
            <ModalHeader>
              <ModalTitle appearance="danger">
                Delete {issue?.issue_key}?
              </ModalTitle>
            </ModalHeader>
            <ModalBody>
              This ticket will be soft-deleted. It can be restored from the admin panel within 30 days.
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setShowConfirmDelete(false)}>
                Cancel
              </Button>
              <Button
                appearance="danger"
                onClick={() => { setShowConfirmDelete(false); deleteIssueMutation.mutate(); }}
              >
                Delete
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>

      <ModalTransition>
        {showWorkflow && (
          <Modal
            onClose={() => setShowWorkflow(false)}
            width="large"
          >
            <ModalHeader>
              <ModalTitle>
                Workflow — {issue?.issue_type ?? 'Story'} Issue Type
              </ModalTitle>
            </ModalHeader>
            <ModalBody>
              <div style={{ padding: '12px 0', display: 'flex', gap: 16, borderBottom: '1px solid #DFE1E6', fontSize: 12 }}>
                <span><span style={{ color: '#5E6C84' }}>Issue Type</span> <span style={{ fontWeight: 600 }}>{issue?.issue_type}</span></span>
                <span><span style={{ color: '#5E6C84' }}>Current Status</span> <JiraStatusPill status={localStatus} category={statusCategory} /></span>
              </div>
              <div style={{ padding: '8px 0', fontSize: 11, color: '#97A0AF', borderBottom: '1px solid #DFE1E6' }}>Transitions are open — any status can move to any.</div>
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#97A0AF', fontSize: 13 }}>
                Workflow visualization — coming soon
              </div>
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setShowWorkflow(false)}>
                Close
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>

      {/* AI Regen Confirm */}
      <ModalTransition>
        {showAiRegenConfirm && (
          <Modal
            onClose={() => setShowAiRegenConfirm(false)}
            width="small"
          >
            <ModalHeader>
              <ModalTitle>
                Regenerate AI output?
              </ModalTitle>
            </ModalHeader>
            <ModalBody>
              Your edits will be discarded. This cannot be undone.
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setShowAiRegenConfirm(false)}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={() => doAiGenerate()}>
                Regenerate
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>

      {/* Clone & Move dialogs (BATCH-B Features 1 & 2) */}
      {issue && (
        <CloneIssueDialog
          open={showCloneDialog}
          onClose={() => setShowCloneDialog(false)}
          source={{
            id: issue.id,
            issue_key: issue.issue_key,
            summary: issue.summary,
            project_key: issue.project_key,
            assignee_account_id: issue.assignee_account_id ?? null,
            assignee_display_name: issue.assignee_display_name ?? null,
          }}
        />
      )}
      {issue && (
        <MoveIssueDialog
          open={showMoveDialog}
          onClose={() => setShowMoveDialog(false)}
          source={{ id: issue.id, issue_key: issue.issue_key, project_key: issue.project_key }}
        />
      )}
      {issue && (
        <ArchiveConfirmDialog
          open={showArchiveDialog}
          onClose={() => setShowArchiveDialog(false)}
          mode={(issue as any).archived_at ? 'unarchive' : 'archive'}
          issue={{ id: issue.id, issue_key: issue.issue_key, summary: issue.summary }}
          onSuccess={() => {
            // After archive, close the modal so the user returns to the (now-filtered) list.
            if (!(issue as any).archived_at) onClose();
          }}
        />
      )}
    </>
  );
}