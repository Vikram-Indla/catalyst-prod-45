/**
 * IssueContentView — Jira-parity single issue view:
 * Left side: breadcrumb, title, actions, key details, description, subtasks, linked work, activity
 * Right side: collapsible Details sidebar (Assignee, Priority, Reporter, Labels, Sprint/Iteration, MDT Ref)
 * Implements recommendations #11-16, #17, #19-26, #28-30
 */
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { catalystToast } from '@/lib/catalystToast';
import { ChevronDown, ChevronRight, ChevronLeft, Link2, ArrowRightLeft, MoreHorizontal, Pencil, Plus, MessageSquare, History as HistoryIcon, FileText, Send, Eye, Share2, Bold, Italic, List, Code2, Link as LinkIcon, Smile, Paperclip, Undo2, Redo2, ArrowUpDown, ArrowRight, CheckSquare, Globe, Palette, Search, X, Flag, Zap, SquarePen } from '@/lib/atlaskit-icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AllWorkItem } from '@/types/allwork.types';
import { formatDistanceToNow, format } from 'date-fns';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { STATUS_OPTION_GROUPS } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';
import { resolveStatusCategory } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';
import { useIssueTypeWorkflow } from '@/hooks/useIssueTypeWorkflow';

// Story Detail Modal sections — identical components for AllWork mid-body
import { AttachmentsSection } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/AttachmentsSection';
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items';
import { DefectsSection } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/DefectsSection';
import { IncidentsSection } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/IncidentsSection';
import { TestHubSection } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/TestHubSection';
import { EditableAssignee, EditablePriority, EditableLabels } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/EditableFields';
import { AddParentPicker } from '@/components/shared/AddParentPicker';
import { IssueKeyLink } from '@/components/shared/IssueKeyLink';
import { enqueueWriteBack } from '@/lib/jira-writeback';
import { IssueNavChevrons } from '@/components/shared/IssueNavChevrons';
import { useSprintReleases } from '@/modules/project-work-hub/hooks/useSprintReleases';
import { ConvertToSubtaskWizard } from './ConvertToSubtaskWizard';
import { FlagPopover, isFlagged as checkFlagged, CloneWizard, MoveWizard, ArchiveDialog, DeleteDialog } from './IssueActionDialogs';
// 2026-05-31 — Description renderer + composer are now the canonical
// Catalyst Tiptap surface (`@/components/catalyst-detail-views/shared
// /sections/Description`). One component owns click-to-edit, empty
// state, save mutation, and the read view with line-numbered code
// blocks + Prism syntax highlighting. No Atlaskit editor on this surface.
/* §19 chokepoint — ALL user-avatar lookups on this surface resolve
   through `resolveAvatarUrl`. Never read `profiles.avatar_url`
   (Gravatar CDN, banned) and never display an external URL. */
import { resolveAvatarUrl } from '@/lib/avatars';
import '@/modules/project-work-hub/components/dialogs/story-detail-extensions.css';
import { ActivityPanelPilot } from './activity/ActivityPanelPilot';
/* Catalyst Defect anatomy — unifies the All Work view with the
   CatalystViewDefect overlay so there is ONE canonical source of truth for
   Defect-specific fields (Severity / Steps / Environment / Found-in /
   Fix-in / Root Cause / Resolution). Only rendered when the work item's
   issue_type is Bug or Defect. */
import { CatalystDefectFields } from '@/components/catalyst-detail-views/defect/CatalystDefectFields';
import type { PhIssue } from '@/components/catalyst-detail-views/shared/types';
import { Description } from '@/components/catalyst-detail-views/shared/sections/Description';


interface Props {
  issueKey: string | null;
  item?: AllWorkItem | null;
  parentItem?: AllWorkItem | null;
  childItems?: AllWorkItem[];
  childrenLoading?: boolean;
  links?: any[];
  linksLoading?: boolean;
  comments?: any[];
  commentsLoading?: boolean;
  historyItems?: any[];
  historyLoading?: boolean;
  worklogs?: any[];
  worklogsLoading?: boolean;
  createComment?: any;
  logWork?: any;
  loading?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  projectId?: string;
}

const AVATAR_COLORS = [
  'var(--ds-background-accent-blue-bold)',
  'var(--ds-background-accent-orange-bold)',
  'var(--ds-background-accent-green-bold)',
  'var(--ds-background-accent-magenta-bold)',
  'var(--ds-background-accent-purple-bold)',
];
function avatarBg(name: string) { return AVATAR_COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]; }
function initials(name: string) { return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(); }
function fmtRel(d: string | null) { if (!d) return ''; try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return ''; } }
function fmtDate(d: string | null) { if (!d) return ''; try { return format(new Date(d), 'MMMM d, yyyy \'at\' h:mm a'); } catch { return ''; } }
function capitalize(s: string) { if (!s) return s; return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }
function fmtMinutes(m: number) {
  if (!m || m <= 0) return '0m';
  const h = Math.floor(m / 60);
  const mins = m % 60;
  if (h > 0 && mins > 0) return `${h}h ${mins}m`;
  if (h > 0) return `${h}h`;
  return `${mins}m`;
}

function Avatar({ name, url, size = 22 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    return <img src={url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div className="awFieldAvatar" style={{ width: size, height: size, background: avatarBg(name), fontSize: size * 0.4 }}>
      {initials(name)}
    </div>
  );
}

/** Jira-strong status pill with editable dropdown */
function StatusPill({ status, statusCategory, issueId, issueType, onStatusChange }: { status: string; statusCategory?: string | null; issueId?: string; issueType?: string | null; onStatusChange?: (newStatus: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { statusGroups, hasConfig, getAvailableStatuses } = useIssueTypeWorkflow(issueType ?? null);
  const available = new Set(getAvailableStatuses(status));
  const displayGroups = hasConfig
    ? statusGroups
        .map(g => ({ ...g, statuses: g.statuses.filter(s => available.has(s)) }))
        .filter(g => g.statuses.length > 0)
    : STATUS_OPTION_GROUPS;
  const cat = (statusCategory ?? '').toLowerCase();
  let bg = 'var(--ds-text-subtle)';
  const color = 'var(--ds-text-inverse)';
  if (cat.includes('done') || cat === 'complete') { bg = 'var(--ds-background-success-bold, var(--ds-background-success-bold))'; }
  else if (cat.includes('progress') || cat === 'indeterminate') { bg = 'var(--ds-background-information-bold, var(--ds-link))'; }
  else if (status.toLowerCase().includes('beta')) { bg = 'var(--ds-background-success-bold, var(--ds-background-success-bold))'; }
  else if (status.toLowerCase().includes('done') || status.toLowerCase().includes('complete')) { bg = 'var(--ds-background-success-bold, var(--ds-background-success-bold))'; }
  else if (status.toLowerCase().includes('progress') || status.toLowerCase().includes('implementation') || status.toLowerCase().includes('review') || status.toLowerCase().includes('requirement')) { bg = 'var(--ds-background-information-bold, var(--ds-link))'; }

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const handleSelect = (newStatus: string) => {
    setOpen(false);
    onStatusChange?.(newStatus);
  };

  const groupLabelColor: Record<string, string> = {
    'To do': 'var(--ds-text-subtle)',
    'In progress': 'var(--ds-background-information-bold)',
    'Done': 'var(--ds-background-success-bold)',
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="awStatusPill" style={{ background: bg, color }} onClick={() => setOpen(o => !o)}>
        {status}
        <ChevronDown style={{ width: 12, height: 12 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '48%', left: 0, marginTop: 4,
          background: 'var(--ds-surface)', borderRadius: 6, width: 220,
          boxShadow: 'var(--ds-shadow-overlay, 0 8px 24px rgba(9,30,66,.25))', zIndex: 80, padding: '4px 0',
          border: '1px solid var(--ds-border)', maxHeight: 320, overflowY: 'auto',
        }}>
          {displayGroups.map(group => (
            <div key={group.groupLabel}>
              <div style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: groupLabelColor[group.groupLabel] ?? 'var(--ds-text-subtle)', padding: '8px 12px 4px', letterSpacing: '0.03em' }}>
                {group.groupLabel}
              </div>
              {group.statuses.map(s => (
                <button
                  key={s}
                  onClick={() => handleSelect(s)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '8px 12px', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)',
                    background: s === status ? 'var(--ds-background-selected)' : 'transparent',
                    border: 'none', cursor: 'pointer', fontWeight: s === status ? 600 : 400,
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = s === status ? 'var(--ds-background-selected)' : 'var(--ds-surface-sunken)')}
                  onMouseOut={e => (e.currentTarget.style.background = s === status ? 'var(--ds-background-selected)' : 'transparent')}
                >
                  {s}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function IssueContentView({
  issueKey, item, parentItem, childItems = [], childrenLoading,
  links = [], linksLoading, comments = [], commentsLoading,
  historyItems = [], historyLoading, worklogs = [], worklogsLoading,
  createComment, logWork, loading,
  onPrev, onNext, projectId = '',
}: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [showConvertWizard, setShowConvertWizard] = useState(false);
  const [showFlagPopover, setShowFlagPopover] = useState(false);
  const flagBtnRef = useRef<HTMLButtonElement>(null);
  const [showCloneWizard, setShowCloneWizard] = useState(false);
  const [showMoveWizard, setShowMoveWizard] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((o) => !o);
  }, []);

  // Derive project key from issue key (e.g. "BAU-5364" → "BAU")
  const projectKey = issueKey?.split('-')[0] ?? '';


  const handleBreadcrumbParentChange = useCallback(async (newParentKey: string | null) => {
    if (!item?.id) return;
    await (supabase.from('ph_issues') as any)
      .update({ parent_key: newParentKey })
      .eq('issue_key', issueKey ?? item?.issue_key);
    await enqueueWriteBack({ phIssueId: item.id, fieldName: 'parent', newValue: newParentKey ?? '' });
    queryClient.invalidateQueries({ queryKey: ['project-all-work-items-v3'] });
    queryClient.invalidateQueries({ queryKey: ['allwork-items'] });
    queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
  }, [item?.id, issueKey, item?.issue_key, queryClient]);

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!item?.id) throw new Error('No item');
      const { error } = await supabase.from('ph_issues').update({ status: newStatus, status_category: resolveStatusCategory(newStatus) } as any).eq('id', item.id);
      if (error) throw error;
      await enqueueWriteBack({ phIssueId: item.id, fieldName: 'status', newValue: newStatus });
    },
    onSuccess: () => {
      catalystToast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
      queryClient.invalidateQueries({ queryKey: ['allwork-items'] });
    },
    onError: () => catalystToast.error('Failed to update status'),
  });

  // Close more menu on outside click
  useEffect(() => {
    if (!moreMenuOpen) return;
    const h = (e: MouseEvent) => { if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setMoreMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [moreMenuOpen]);

  // Section collapse
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(s => ({ ...s, [id]: !s[id] }));
  // Attachments query — wired to ph_attachments table
  const { data: attachments = [] } = useQuery({
    queryKey: ['ph-attachments', item?.id],
    queryFn: async () => {
      if (!item?.id) return [];
      const { data, error } = await supabase.from('ph_attachments')
        .select('id, work_item_id, file_name, file_size, mime_type, storage_path, uploaded_by, created_at')
        .eq('work_item_id', item.id)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data ?? [];
    },
    enabled: !!item?.id,
  });

  const totalChildren = childItems.length || (item?.child_count ?? 0);

  // Sprint/Iteration — editable dropdown pulling all releases
  const { unreleased: unreleasedVersions, released: releasedVersions, isLoading: versionsLoading } = useSprintReleases(projectKey || null);
  const [showSprintReleaseDropdown, setShowSprintReleaseDropdown] = useState(false);
  const [sprintReleaseSearch, setSprintReleaseSearch] = useState('');
  const sprintReleaseDropdownRef = useRef<HTMLDivElement>(null);

  const sprintReleaseNames: string[] = useMemo(() => {
    if (!item?.fix_version_name) return [];
    return item.fix_version_name.split(',').map(s => s.trim()).filter(Boolean);
  }, [item?.fix_version_name]);

  const handleToggleSprintRelease = useCallback((versionName: string) => {
    const current = sprintReleaseNames;
    let updated: string[];
    if (current.includes(versionName)) {
      updated = current.filter(v => v !== versionName);
    } else {
      updated = [...current, versionName];
    }
    if (item?.id) {
      supabase.from('ph_issues').update({ sprint_release: updated } as any).eq('id', item.id)
        .then(async ({ error }) => {
          if (error) { catalystToast.error('Failed to update sprint/release'); return; }
          catalystToast.success('Sprint/release updated');
          // Log to ph_activity_log so history panel and scope-change gadget
          // have Catalyst-native data (Jira-decommission-ready).
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('ph_activity_log').insert({
              work_item_id: item.id,
              user_id: user.id,
              action: 'updated',
              field_name: 'sprint_release',
              old_value: current.join(', ') || null,
              new_value: updated.join(', ') || null,
            });
          }
          queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
          queryClient.invalidateQueries({ queryKey: ['allwork-items'] });
        });
    }
  }, [sprintReleaseNames, item?.id, queryClient]);

  // Close sprint/release dropdown on outside click
  useEffect(() => {
    if (!showSprintReleaseDropdown) return;
    const handler = (e: MouseEvent) => {
      if (sprintReleaseDropdownRef.current && !sprintReleaseDropdownRef.current.contains(e.target as Node)) {
        setShowSprintReleaseDropdown(false);
        setSprintReleaseSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSprintReleaseDropdown]);

  // + Add menu state
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addMenuSearch, setAddMenuSearch] = useState('');
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAddMenu) return;
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) { setShowAddMenu(false); setAddMenuSearch(''); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddMenu]);

  // Direct ph_comments + ph_activity_log queries (canonical — same as Story Detail Modal)
  const { data: phComments = [] } = useQuery({
    queryKey: ['ph-comments', item?.id],
    queryFn: async () => {
      if (!item?.id) return [];
      const { data } = await supabase.from('ph_comments')
        .select('id, work_item_id, body, author_id, created_at, updated_at')
        .eq('work_item_id', item.id).order('created_at', { ascending: true });
      if (!data?.length) return [];
      const authorIds = [...new Set(data.map(c => c.author_id).filter(Boolean))];
      // §19 chokepoint: resolve through local PNGs. Never read profiles.avatar_url (Gravatar CDN, banned).
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', authorIds);
      const pm = new Map((profiles ?? []).map(p => [p.id, p]));
      return data.map(c => ({ ...c, _author_name: pm.get(c.author_id)?.full_name ?? 'Unknown', _author_avatar: resolveAvatarUrl(pm.get(c.author_id)?.full_name ?? null) }));
    },
    enabled: !!item?.id,
  });

  const { data: phHistory = [] } = useQuery({
    queryKey: ['ph-activity', item?.id],
    queryFn: async () => {
      if (!item?.id) return [];
      const { data } = await supabase.from('ph_activity_log')
        .select('id, work_item_id, action, field_name, old_value, new_value, user_id, created_at')
        .eq('work_item_id', item.id).order('created_at', { ascending: false });
      if (!data?.length) return [];
      const uids = [...new Set(data.map(h => h.user_id).filter(Boolean))];
      // §19 chokepoint: resolve through local PNGs. Never read profiles.avatar_url (Gravatar CDN, banned).
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', uids);
      const pm = new Map((profiles ?? []).map(p => [p.id, p]));
      return data.map(h => ({ ...h, _author_name: pm.get(h.user_id)?.full_name ?? 'System', _author_avatar: resolveAvatarUrl(pm.get(h.user_id)?.full_name ?? null) }));
    },
    enabled: !!item?.id,
  });

  const createPhComment = useMutation({
    mutationFn: async (body: string) => {
      if (!item?.id || !user?.id) throw new Error('Missing');
      const { error } = await supabase.from('ph_comments').insert({ work_item_id: item.id, body, author_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ph-comments', item?.id] }); catalystToast.success('Comment added'); },
  });

  const fixVersionName = item?.fix_version_name;

  /* ── Catalyst Defect branch detection ─────────────────────────────
     Matches the same predicate used by the section-visibility matrix
     further down (`t.includes('bug') || t.includes('defect')`). Hoisted
     so it can gate the Defect-anatomy injections earlier in the render.
     Adapter constructs the minimal PhIssue shape CatalystDefectFields
     actually reads — `sprint_release` (array of { name }) and `resolution` —
     from the normalized AllWorkItem. Keeps the wire additive; no extra
     Supabase round-trip. */
  const _issueTypeLower = (item?.issue_type ?? '').toLowerCase();
  const isBugDefect = _issueTypeLower.includes('bug') || _issueTypeLower.includes('defect');
  const defectPhIssueAdapter: PhIssue | null = isBugDefect && item
    ? ({
        sprint_release: item.fix_version_name
          ? item.fix_version_name
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
              .map(name => ({ name }))
          : [],
        resolution: item.resolution,
      } as unknown as PhIssue)
    : null;

  if (!issueKey) {
    return <div className="awBody" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--aw-text-subtle)', fontSize: 'var(--ds-font-size-300)' }}>Select an issue to view details</span>
    </div>;
  }

  if (loading) {
    return <div className="awBody" style={{ padding: 16 }}>
      {[1,2,3].map(i => <div key={i} style={{ width: `${80-i*15}%`, height: 16, borderRadius: 3, background: 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken)))', marginBottom: 8 }} />)}
    </div>;
  }

  return (
    <div className="awIssueView">
      {/* ══ LEFT: Issue content ══ */}
      <div className="awIssueContent">
        {/* Header */}
        <div className="awIssueHeader">
          {/* Breadcrumb — Project / Parent / IssueKey */}
          <div className="awBreadcrumb">
            {projectKey && (
              <>
                <a
                  href={`/project-hub/${projectKey}/allwork`}
                  onClick={e => { e.preventDefault(); e.stopPropagation(); window.location.href = `/project-hub/${projectKey}/allwork`; }}
                  style={{ fontSize: 'var(--ds-font-size-300)', fontWeight: 500, color: 'var(--ds-text-subtlest, var(--cp-text-secondary))', textDecoration: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--cp-primary-60, var(--ds-link))'; e.currentTarget.style.textDecoration = 'underline'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--ds-text-subtlest, var(--cp-text-secondary))'; e.currentTarget.style.textDecoration = 'none'; }}
                >
                  {projectKey}
                </a>
                <span style={{ color: 'var(--aw-text-subtle)' }}>/</span>
              </>
            )}
            <AddParentPicker
              issueKey={issueKey ?? item?.issue_key ?? ''}
              parentKey={parentItem?.issue_key ?? item?.parent_key ?? null}
              projectKey={projectKey}
              parentIssueType={parentItem?.issue_type ?? 'epic'}
              onParentChange={handleBreadcrumbParentChange}
              variant="breadcrumb"
            />
            <span style={{ color: 'var(--aw-text-subtle)' }}>/</span>
            {item && <JiraIssueTypeIcon type={item.issue_type} size={14} />}
            <IssueKeyLink issueKey={issueKey ?? ''} style={{ color: 'var(--cp-primary-60, var(--ds-link))', textDecoration: 'none', fontSize: 'var(--ds-font-size-300)' }} />
            {/* #12: Prev/Next navigation arrows — canonical IssueNavChevrons
                (shared component, Jira-parity 28×28 / 1px var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral))) / 4px). */}
            <span style={{ marginLeft: 'auto', display: 'inline-flex' }}>
              <IssueNavChevrons
                onPrev={onPrev}
                onNext={onNext}
                prevDisabled={!onPrev}
                nextDisabled={!onNext}
                prevTooltip="Previous issue"
                nextTooltip="Next issue"
              />
            </span>
          </div>

          {/* Title */}
          <h1
            className="awIssueTitle"
            contentEditable
            suppressContentEditableWarning
            onBlur={e => {
              const newText = e.currentTarget.textContent?.trim() ?? '';
              if (newText && newText !== item?.summary && item?.id) {
                supabase.from('ph_issues').update({ summary: newText }).eq('id', item.id).then(({ error }) => {
                  if (error) { catalystToast.error('Failed to save title'); return; }
                  catalystToast.success('Title saved');
                  queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
                  queryClient.invalidateQueries({ queryKey: ['allwork-items'] });
                });
              }
            }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
            style={{ cursor: 'text' }}
          >
            {item?.summary ?? 'Untitled'}
          </h1>

          {/* #13: Actions row: + menu (Story Detail Modal parity) */}
          <div className="awActions" ref={addMenuRef} style={{ position: 'relative' }}>
            <button
              className="awPill"
              style={{ padding: '0 8px' }}
              onClick={() => setShowAddMenu(o => !o)}
            >
              <Plus style={{ width: 14, height: 14 }} />
            </button>
            {showAddMenu && (() => {
              const atlText = 'var(--ds-text)';
              const addMenuItems = [
                { id: 'subtask', icon: <CheckSquare size={16} color={atlText} />, label: 'Create subtask', shortcut: '⇧ C', section: 'primary', action: () => { setShowAddMenu(false); toast('Use the Sub-tasks section below'); } },
                { id: 'link', icon: <Link2 size={16} color={atlText} />, label: 'Link work item', shortcut: '⇧ K', section: 'primary', action: () => { setShowAddMenu(false); catalystToast.info('Use the Linked Issues section below'); } },
                { id: 'attachment', icon: <Paperclip size={16} color={atlText} />, label: 'Add attachment', section: 'secondary', action: () => { setShowAddMenu(false); catalystToast.info('Use the Attachments section below'); } },
                { id: 'weblink', icon: <Globe size={16} color={atlText} />, label: 'Add web link', section: 'secondary', action: () => { setShowAddMenu(false); catalystToast.info('Web link — coming soon'); } },
              ];
              const q = addMenuSearch.toLowerCase();
              const filtered = q ? addMenuItems.filter(i => i.label.toLowerCase().includes(q)) : addMenuItems;
              const primary = filtered.filter(i => i.section === 'primary');
              const secondary = filtered.filter(i => i.section === 'secondary');
              return (
                <div style={{ position: 'absolute', left: 0, top: 32, background: 'var(--ds-surface)', borderRadius: 4, boxShadow: 'var(--ds-shadow-overlay, 0px 8px 12px rgba(9,30,66,.15))', width: 266, zIndex: 400, padding: 0 }}>
                  <div style={{ margin: '4px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--ds-surface)', border: '2px solid var(--ds-border-focused)', borderRadius: 3, padding: 0 }}>
                      <Search size={14} color="var(--ds-text-subtle)" style={{ marginLeft: 8, flexShrink: 0 }} />
                      <input type="text" placeholder="Find menu item" value={addMenuSearch} onChange={e => setAddMenuSearch(e.target.value)} autoFocus
                        style={{ background: 'transparent', border: 'none', outline: 'none', boxShadow: 'none', padding: '4px 4px 4px 8px', fontSize: 'var(--ds-font-size-400)', color: atlText, width: '100%', height: 28, fontFamily: 'inherit' }} />
                      {addMenuSearch && (
                        <button onClick={() => setAddMenuSearch('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: atlText, display: 'flex', alignItems: 'center', padding: 0, marginRight: 8 }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {primary.length > 0 && (
                    <div style={{ padding: 0 }}>
                      {primary.map(mi => (
                        <button key={mi.id} onClick={mi.action} style={{ width: '100%', display: 'flex', alignItems: 'center', height: 40, padding: '0 8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 'var(--ds-font-size-400)', color: atlText, fontFamily: 'inherit', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-hovered)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', flexShrink: 0, marginRight: 8 }}>{mi.icon}</span>
                          <span style={{ flex: 1, textAlign: 'left' }}>{mi.label}</span>
                          {mi.shortcut && <span style={{ fontSize: 'var(--ds-font-size-300)', color: atlText, opacity: 0.7 }}>{mi.shortcut}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {secondary.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--ds-surface-pressed)', padding: 0 }}>
                      {secondary.map(mi => (
                        <button key={mi.id} onClick={mi.action} style={{ width: '100%', display: 'flex', alignItems: 'center', height: 40, padding: '0 8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 'var(--ds-font-size-400)', color: atlText, fontFamily: 'inherit', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-hovered)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', flexShrink: 0, marginRight: 8 }}>{mi.icon}</span>
                          <span style={{ flex: 1, textAlign: 'left' }}>{mi.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Scrollable body — data-sdm-scope enables ring-fenced CSS from Story Detail Modal */}
        <div className="awBody" data-sdm-scope>
          {/* ── Key details (#26: show description content here, not just priority) ── */}
          <div className="awSection">
            <div className="awSectionHead" onClick={() => toggle('keydetails')}>
              <span className="awSectionLabel">
                {collapsed.keydetails ? <ChevronRight style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
                Key details
              </span>
            </div>
            {!collapsed.keydetails && (
              <div className="awSectionBody">
                {/* Priority — canonical EditablePriority */}
                <div className="awKeyDetailRow">
                  <div className="awKeyDetailLabel">Priority</div>
                  <div className="awKeyDetailValue" style={{ overflow: 'visible' }}>
                    {item?.id ? (
                      <EditablePriority
                        issueId={item.id}
                        issueKey={issueKey ?? item?.issue_key}
                        currentPriority={item.priority ?? 'Medium'}
                        onUpdate={() => { queryClient.invalidateQueries({ queryKey: ['ph_issues'] }); queryClient.invalidateQueries({ queryKey: ['allwork-items'] }); }}
                      />
                    ) : (
                      <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Medium</span>
                    )}
                  </div>
                </div>
                {/* Parent — canonical AddParentPicker (field variant) */}
                <div className="awKeyDetailRow">
                  <div className="awKeyDetailLabel">Parent</div>
                  <div className="awKeyDetailValue" style={{ overflow: 'visible' }}>
                    <AddParentPicker
                      issueKey={issueKey ?? item?.issue_key ?? ''}
                      parentKey={item?.parent_key ?? null}
                      projectKey={projectKey}
                      onParentChange={handleBreadcrumbParentChange}
                      variant="field"
                    />
                  </div>
                </div>
                {/* Labels */}
                <div className="awKeyDetailRow">
                  <div className="awKeyDetailLabel">Labels</div>
                  <div className="awKeyDetailValue" style={{ overflow: 'visible' }}>
                    {item?.id ? (
                      <EditableLabels
                        issueId={item.id}
                        issueKey={issueKey ?? item.issue_key}
                        currentLabels={item.labels ?? []}
                        onUpdate={() => { queryClient.invalidateQueries({ queryKey: ['ph_issues'] }); queryClient.invalidateQueries({ queryKey: ['allwork-items'] }); }}
                      />
                    ) : (
                      <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtlest)' }}>None</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Catalyst Defect canonical field rail ──
              Jira-parity anatomy for Bug/Defect items only: Severity /
              Steps to Reproduce / Environment / Found-in build / Fix-in
              build / Root Cause / Resolution. Mirrors the same block used
              by the CatalystViewDefect overlay so BAU-5517 (and every
              other defect opened via the All Work page) inherits the
              same structure with no duplication of presentation logic.
              Read-only in this pass — inline edit is a follow-up,
              matching CatalystDefectFields itself. */}
          {isBugDefect && (
            <div className="awSection">
              <div className="awSectionHead" onClick={() => toggle('defectfields')}>
                <span className="awSectionLabel">
                  {collapsed.defectfields ? <ChevronRight style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
                  Defect details
                </span>
              </div>
              {!collapsed.defectfields && (
                <div className="awSectionBody">
                  <CatalystDefectFields issue={defectPhIssueAdapter} />
                </div>
              )}
            </div>
          )}

          {/* ── Description — canonical Tiptap surface (Jira parity: no collapse) ── */}
          {item && (
            <Description
              issue={{
                id: item.id,
                issue_key: item.issue_key,
                description_adf: item.description_adf,
                description_text: item.description_text,
                project_key: item.project_key ?? '',
              } as PhIssue}
            />
          )}

          {/* ── Attachments (universal — all types) ── */}
          <AttachmentsSection
            attachments={attachments}
            itemId={item?.id ?? ''}
            userId={user?.id ?? ''}
          />

          {/* ── Section visibility matrix by work item type ──
               Sub-tasks:    Epic, Story, Feature, Task, Improvement
               Defects:      Story, Feature
               Incidents:    Story, Feature
               TestHub:      Story, Feature, Bug/Defect
               Linked items: Universal
               Activity:     Universal
          ── */}
          {(() => {
            const t = (item?.issue_type ?? '').toLowerCase();
            const isEpic = t.includes('epic');
            const isStory = t.includes('story') || t === 'feature' || t.includes('new feature');
            const isFeature = t === 'feature' || t.includes('new feature');
            const isTask = t === 'task' && !t.includes('sub');
            const isSubtask = t.includes('sub-task') || t.includes('subtask');
            const isBug = t.includes('bug') || t.includes('defect');
            const isIncident = t.includes('incident');
            const isImprovement = t.includes('improvement');

            const showSubtasks = isEpic || isStory || isFeature || isTask || isImprovement;
            const showDefects = isStory || isFeature;
            const showIncidents = isStory || isFeature;
            const showTestHub = isStory || isFeature || isBug;

            return (
              <>
                {showSubtasks && (
                  <SubtasksPanel
                    storyKey={issueKey!}
                    storyId={item?.id ?? ''}
                    projectKey={projectKey}
                    parentIssueType={item?.issue_type || ''}
                    parentSummary={item?.summary || ''}
                  />
                )}

                <LinkedWorkItemsSection
                  issueId={item?.id ?? ''}
                  issueKey={item?.issue_key ?? ''}
                  projectKey={projectKey}
                />

                {showDefects && (
                  <DefectsSection storyKey={issueKey!} projectKey={projectKey} />
                )}

                {showIncidents && (
                  <IncidentsSection storyKey={issueKey!} />
                )}

                {showTestHub && (
                  <TestHubSection storyId={item?.id ?? ''} />
                )}
              </>
            );
          })()}

          {/* ── Activity — canonical ActivityPanelPilot for every issue.
              Previously gated to a single pilot issue key (BAU-4771); now
              rolled out to all work items after acceptance. The legacy
              inline activity block below is retained as commented code for
              one release cycle for quick rollback, then will be deleted.
           */}
          <div className="awSection" style={{ borderBottom: 'none' }}>
            <div className="awSectionBody">
              <ActivityPanelPilot
                issueKey={issueKey}
                comments={phComments}
                commentsLoading={false}
                historyItems={phHistory}
                historyLoading={false}
                createComment={{ mutateAsync: async ({ body }: { body: string; authorId: string }) => createPhComment.mutateAsync(body) }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ══ DIVIDER with collapse button ══ */}
      <div className="awSidebarDivider" onClick={handleToggleSidebar}>
        <button className="awCollapseBtn" title={sidebarOpen ? 'Collapse' : 'Expand'}>
          {sidebarOpen ? <ChevronRight style={{ width: 12, height: 12 }} /> : <ChevronLeft style={{ width: 12, height: 12 }} />}
        </button>
      </div>

      {/* ══ RIGHT: Details sidebar (collapsible) ══ */}
      <div className={`awDetailsSidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        {/* Status pill + watcher + share (copy link) + more menu */}
        <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusPill status={item?.status ?? ''} statusCategory={item?.status_category} issueId={item?.id} issueType={item?.issue_type} onStatusChange={(s) => updateStatusMutation.mutate(s)} />
          {/* Flag button — Jira parity: sits right next to status pill */}
          <div style={{ position: 'relative' }}>
            <button
              ref={flagBtnRef}
              onClick={() => setShowFlagPopover(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, border: '1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border)))', borderRadius: 4,
                background: checkFlagged(item) ? 'var(--ds-background-danger)' : 'var(--ds-surface)', cursor: 'pointer',
                padding: 0,
              }}
              title={checkFlagged(item) ? 'Remove flag' : 'Add flag'}
            >
              <Flag size={18} color="var(--ds-text-danger)" fill={checkFlagged(item) ? 'var(--ds-text-danger)' : 'none'} />
            </button>
            {showFlagPopover && item?.id && (
              <FlagPopover
                issueId={item.id}
                issueKey={issueKey ?? ''}
                flagged={checkFlagged(item)}
                anchorRef={flagBtnRef}
                onClose={() => setShowFlagPopover(false)}
              />
            )}
          </div>
          {/* Automation / lightning icon */}
          <button
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, border: '1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral, var(--ds-border)))', borderRadius: 4,
              background: 'var(--ds-surface)', cursor: 'pointer', padding: 0,
            }}
            title="Automation"
          >
            <Zap size={18} color="var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))" />
          </button>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {/* Watcher count */}
            <button className="awPill" style={{ padding: '0 8px', height: 24, gap: 4 }}>
              <Eye style={{ width: 14, height: 14 }} />
              <span style={{ fontSize: 'var(--ds-font-size-100)', fontWeight: 600 }}>1</span>
            </button>
            {/* Share — copies current URL */}
            <button className="awPill" style={{ padding: '0 4px', height: 22 }} onClick={() => { navigator.clipboard.writeText(window.location.href); catalystToast.success('Link copied'); }}><Share2 style={{ width: 14, height: 14 }} /></button>
            {/* More menu — Jira parity dropdown */}
            <div ref={moreMenuRef} style={{ position: 'relative' }}>
              <button className="awPill" style={{ padding: '0 4px', height: 22, background: moreMenuOpen ? 'var(--ds-background-selected)' : undefined }} onClick={() => setMoreMenuOpen(o => !o)}>
                <MoreHorizontal style={{ width: 14, height: 14 }} />
              </button>
              {moreMenuOpen && (
                <div style={{
                  position: 'absolute', top: '48%', right: 0, marginTop: 4,
                  background: 'var(--ds-surface)', borderRadius: 6, width: 220,
                  boxShadow: 'var(--ds-shadow-overlay, 0 8px 24px rgba(9,30,66,.25))', zIndex: 80,
                  border: '1px solid var(--ds-border)', padding: '4px 0',
                }}>
                  {/* Add/Remove flag in menu */}
                  <button onClick={() => { setShowFlagPopover(true); setMoreMenuOpen(false); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken))')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >{checkFlagged(item) ? 'Remove flag' : 'Add flag'}</button>
                  <div style={{ height: 1, background: 'var(--ds-border)', margin: '4px 0' }} />
                  {/* Convert to Subtask */}
                  {item?.issue_type && item.issue_type !== 'Sub-task' && (
                    <button onClick={() => { setShowConvertWizard(true); setMoreMenuOpen(false); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', background: 'transparent', border: 'none', cursor: 'pointer' }}
                      onMouseOver={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken))')}
                      onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                    >Convert to Subtask</button>
                  )}
                  {/* Clone */}
                  <button onClick={() => { setShowCloneWizard(true); setMoreMenuOpen(false); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken))')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >Clone</button>
                  {/* Move */}
                  <button onClick={() => { setShowMoveWizard(true); setMoreMenuOpen(false); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken))')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >Move</button>
                  {/* Archive */}
                  <button onClick={() => { setShowArchiveDialog(true); setMoreMenuOpen(false); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken))')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >Archive</button>
                  <div style={{ height: 1, background: 'var(--ds-border)', margin: '4px 0' }} />
                  {/* Delete */}
                  <button onClick={() => { setShowDeleteDialog(true); setMoreMenuOpen(false); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--ds-background-danger)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >Delete</button>
                </div>
              )}
            </div>
          </span>
        </div>

        {/* Details section — identical to Story Detail Modal sidebar */}
        <div style={{ marginBottom: 16, padding: '0 16px' }}>
          <div onClick={() => toggle('details')} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', marginBottom: 12, userSelect: 'none' }}>
            {collapsed.details
              ? <ChevronRight size={14} color="var(--ds-text-subtle)" />
              : <ChevronDown size={14} color="var(--ds-text-subtle)" />
            }
            <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 700, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))' }}>Details</span>
          </div>
          {!collapsed.details && (
            <div>
              {/* Sprint/Iteration — Jira-parity editable dropdown */}
              <div style={{ marginBottom: 16, position: 'relative' }} ref={sprintReleaseDropdownRef}>
                <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', marginBottom: 4 }}>Sprint/Iteration</div>
                <div
                  onClick={() => setShowSprintReleaseDropdown(!showSprintReleaseDropdown)}
                  style={{
                    display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
                    padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                    minHeight: 32, transition: 'background 0.12s',
                    border: showSprintReleaseDropdown ? '2px solid var(--ds-border-focused)' : '2px solid transparent',
                    background: showSprintReleaseDropdown ? 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!showSprintReleaseDropdown) e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken))'; }}
                  onMouseLeave={e => { if (!showSprintReleaseDropdown) e.currentTarget.style.background = 'transparent'; }}
                >
                  {sprintReleaseNames.length > 0 ? (
                    sprintReleaseNames.map((v, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--ds-font-size-200)', fontWeight: 500, padding: '4px 8px', borderRadius: 3, background: 'var(--ds-background-information)', color: 'var(--ds-text-information)' }}>
                        {v}
                        <button onClick={e => { e.stopPropagation(); handleToggleSprintRelease(v); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--ds-text-information, var(--ds-link-pressed))' }}>
                          <X size={10} />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--ds-text-subtlest, var(--cp-text-secondary))', fontSize: 'var(--ds-font-size-400)' }}>None</span>
                  )}
                </div>
                {showSprintReleaseDropdown && (
                  <div style={{ position: 'absolute', top: '48%', left: 0, right: 0, background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: 4, boxShadow: 'var(--ds-shadow-overlay, 0 4px 12px rgba(9,30,66,.15))', zIndex: 100, maxHeight: 320, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--ds-border)' }}>
                      <input autoFocus value={sprintReleaseSearch} onChange={e => setSprintReleaseSearch(e.target.value)} placeholder="Search versions..."
                        style={{ width: '100%', border: '1px solid var(--ds-border)', borderRadius: 4, padding: '8px 12px', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', outline: 'none', fontFamily: 'inherit' }}
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--ds-border-focused)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))'; }}
                      />
                    </div>
                    <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                      {versionsLoading && <div style={{ padding: '12px 16px', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-subtlest, var(--cp-text-secondary))' }}>Loading...</div>}
                      {(() => {
                        const filtered = unreleasedVersions.filter(v => v.name.toLowerCase().includes(sprintReleaseSearch.toLowerCase()));
                        if (filtered.length === 0) return null;
                        return (
                          <>
                            <div style={{ padding: '8px 16px 4px', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)' }}>Unreleased</div>
                            {filtered.map(v => {
                              const isSel = sprintReleaseNames.includes(v.name);
                              return (
                                <div key={v.name} onClick={() => handleToggleSprintRelease(v.name)} style={{ padding: '8px 16px', fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, var(--ds-text))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isSel ? 'var(--ds-background-selected)' : 'transparent', transition: 'background 0.1s' }}
                                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--ds-background-neutral-subtle))'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = isSel ? 'var(--ds-background-selected)' : 'transparent'; }}
                                >
                                  <span>{v.name}</span>
                                  {isSel && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ds-text-information)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                              );
                            })}
                          </>
                        );
                      })()}
                      {(() => {
                        const filtered = releasedVersions.filter(v => v.name.toLowerCase().includes(sprintReleaseSearch.toLowerCase()));
                        if (filtered.length === 0) return null;
                        return (
                          <>
                            <div style={{ padding: '8px 16px 4px', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest)', borderTop: '1px solid var(--ds-border)' }}>Released</div>
                            {filtered.map(v => {
                              const isSel = sprintReleaseNames.includes(v.name);
                              return (
                                <div key={v.name} onClick={() => handleToggleSprintRelease(v.name)} style={{ padding: '8px 16px', fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, var(--ds-text))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isSel ? 'var(--ds-background-selected)' : 'transparent', transition: 'background 0.1s' }}
                                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--ds-background-neutral-subtle))'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = isSel ? 'var(--ds-background-selected)' : 'transparent'; }}
                                >
                                  <span>{v.name}</span>
                                  {isSel && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ds-text-information)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                              );
                            })}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Assignee — Jira parity: avatar + name, click-to-edit dropdown */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', marginBottom: 4 }}>Assignee</div>
                {item?.id ? (
                  <EditableAssignee
                    issueId={item.id}
                    issueKey={issueKey ?? item.issue_key}
                    projectId={projectId}
                    currentAssigneeId={item.assignee_id ?? null}
                    currentAssigneeName={item.assignee_display_name ?? null}
                    onUpdate={() => { queryClient.invalidateQueries({ queryKey: ['ph_issues'] }); queryClient.invalidateQueries({ queryKey: ['allwork-items'] }); }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px' }}>
                    <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtlest)' }}>Unassigned</span>
                  </div>
                )}
              </div>


              {/* Reporter — Jira parity: 28px avatar + 14px name */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', marginBottom: 4 }}>Reporter</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 4 }}>
                  {item?.reporter_name ? (
                    <>
                      <Avatar name={item.reporter_name} url={resolveAvatarUrl(item.reporter_name)} size={28} />
                      <span style={{ fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text, var(--cp-text-primary, var(--cp-text-inverse)))', fontWeight: 400 }}>{item.reporter_name}</span>
                    </>
                  ) : <span style={{ color: 'var(--ds-text-subtle, var(--ds-text-subtle))', fontSize: 'var(--ds-font-size-400)' }}>—</span>}
                </div>
              </div>

            </div>
          )}
        </div>


        {/* Timestamps */}
        <div className="awTimestamps">
          {item?.jira_created_at && <div>Created {fmtDate(item.jira_created_at)}</div>}
          {item?.jira_updated_at && <div>Updated {fmtRel(item.jira_updated_at)}</div>}
        </div>

      </div>

      {/* Convert to Sub-task wizard */}
      {showConvertWizard && item?.id && (
        <ConvertToSubtaskWizard
          issueId={item.id}
          issueKey={issueKey ?? ''}
          issueType={item.issue_type}
          currentStatus={item.status}
          projectKey={projectKey}
          onClose={() => setShowConvertWizard(false)}
        />
      )}

      {/* Flag popover is now rendered inline next to the flag button — no separate dialog needed */}
      {showCloneWizard && item?.id && (
        <CloneWizard issueId={item.id} issueKey={issueKey ?? ''} item={item} projectKey={projectKey} onClose={() => setShowCloneWizard(false)} />
      )}
      {showMoveWizard && item?.id && (
        <MoveWizard issueId={item.id} issueKey={issueKey ?? ''} item={item} projectKey={projectKey} onClose={() => setShowMoveWizard(false)} />
      )}
      {showArchiveDialog && item?.id && (
        <ArchiveDialog issueId={item.id} issueKey={issueKey ?? ''} onClose={() => setShowArchiveDialog(false)} />
      )}
      {showDeleteDialog && item?.id && (
        <DeleteDialog issueId={item.id} issueKey={issueKey ?? ''} onClose={() => setShowDeleteDialog(false)} />
      )}
    </div>
  );
}
