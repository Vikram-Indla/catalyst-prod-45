/**
 * IssueContentView — Jira-parity single issue view:
 * Left side: breadcrumb, title, actions, key details, description, subtasks, linked work, activity
 * Right side: collapsible Details sidebar (Assignee, Priority, Reporter, Labels, Fix versions, MDT Ref)
 * Implements recommendations #11-16, #17, #19-26, #28-30
 */
import { useState, useMemo, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, ChevronLeft, Link2, ArrowRightLeft, MoreHorizontal, Pencil, Plus, MessageSquare, History as HistoryIcon, FileText, Send, Eye, Share2, Bold, Italic, List, Code2, Link as LinkIcon, Smile, Paperclip, Undo2, Redo2, ArrowUpDown, ArrowRight, CheckSquare, Globe, Palette, Search, X, Flag, Zap, SquarePen } from 'lucide-react';
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
import { useFixVersions } from '@/modules/project-work-hub/hooks/useFixVersions';
import { ConvertToSubtaskWizard } from './ConvertToSubtaskWizard';
import { FlagPopover, isFlagged as checkFlagged, CloneWizard, MoveWizard, ArchiveDialog, DeleteDialog } from './IssueActionDialogs';
// 2026-04-20 — TipTap CatalystRichTextEditor import removed. Atlaskit
// <EpicDescriptionEditor> is the sole composer (USER DIRECTIVE).
// AtlaskitBoundary removed along with it — no editor fallback path.
import EpicDescriptionRenderer from '@/components/shared/rich-text/atlaskit/EpicDescriptionRenderer';
import { isAdfEmpty } from '@/components/shared/rich-text/atlaskit/adfHelpers';
/* §19 chokepoint — ALL user-avatar lookups on this surface resolve
   through `resolveAvatarUrl`. Never read `profiles.avatar_url`
   (Gravatar CDN, banned) and never display an external URL. */
import { resolveAvatarUrl } from '@/lib/avatars';
/* Canonical Atlaskit editor — lazy-loaded, direct file import (NOT the
   barrel) so Rollup keeps the ~2MB @atlaskit/editor-core chunk isolated
   from the renderer graph. Matches CatalystDescriptionSection. */
const EpicDescriptionEditor = lazy(
  () => import('@/components/shared/rich-text/atlaskit/EpicDescriptionEditor'),
);
import '@/modules/project-work-hub/components/dialogs/story-detail-extensions.css';
import { ActivityPanelPilot } from './activity/ActivityPanelPilot';
/* Catalyst Defect anatomy — unifies the All Work view with the
   CatalystViewDefect overlay so there is ONE canonical source of truth for
   Defect-specific fields (Severity / Steps / Environment / Found-in /
   Fix-in / Root Cause / Resolution). Only rendered when the work item's
   issue_type is Bug or Defect. */
import { CatalystDefectFields } from '@/components/catalyst-detail-views/defect/CatalystDefectFields';
import type { PhIssue } from '@/components/catalyst-detail-views/shared/types';


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

const AVATAR_COLORS = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1'];
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
function StatusPill({ status, statusCategory, issueId, onStatusChange }: { status: string; statusCategory?: string | null; issueId?: string; onStatusChange?: (newStatus: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cat = (statusCategory ?? '').toLowerCase();
  let bg = '#44546F';
  let color = '#FFFFFF';
  if (cat.includes('done') || cat === 'complete') { bg = '#1B845D'; }
  else if (cat.includes('progress') || cat === 'indeterminate') { bg = '#0C66E4'; }
  else if (status.toLowerCase().includes('beta')) { bg = '#1B845D'; }
  else if (status.toLowerCase().includes('done') || status.toLowerCase().includes('complete')) { bg = '#1B845D'; }
  else if (status.toLowerCase().includes('progress') || status.toLowerCase().includes('implementation') || status.toLowerCase().includes('review') || status.toLowerCase().includes('requirement')) { bg = '#0C66E4'; }

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

  const groupLabelColor: Record<string, string> = { 'TO DO': '#42526E', 'IN PROGRESS': '#0C66E4', 'DONE': '#1B845D' };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="awStatusPill" style={{ background: bg, color }} onClick={() => setOpen(o => !o)}>
        {status}
        <ChevronDown style={{ width: 12, height: 12 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4,
          background: '#fff', borderRadius: 6, width: 220,
          boxShadow: '0 8px 24px rgba(9,30,66,.25)', zIndex: 80, padding: '4px 0',
          border: '1px solid #DFE1E6', maxHeight: 320, overflowY: 'auto',
        }}>
          {STATUS_OPTION_GROUPS.map(group => (
            <div key={group.groupLabel}>
              <div style={{ fontSize: 11, fontWeight: 700, color: groupLabelColor[group.groupLabel] ?? '#42526E', padding: '8px 12px 4px', textTransform: 'uppercase' as const, letterSpacing: '0.03em' }}>
                {group.groupLabel}
              </div>
              {group.statuses.map(s => (
                <button
                  key={s}
                  onClick={() => handleSelect(s)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '6px 12px', fontSize: 13, color: '#172B4D',
                    background: s === status ? '#E9F2FF' : 'transparent',
                    border: 'none', cursor: 'pointer', fontWeight: s === status ? 600 : 400,
                  }}
                  onMouseOver={e => (e.currentTarget.style.background = s === status ? '#E9F2FF' : '#F4F5F7')}
                  onMouseOut={e => (e.currentTarget.style.background = s === status ? '#E9F2FF' : 'transparent')}
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
  const [descEditMode, setDescEditMode] = useState(false);
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
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
      queryClient.invalidateQueries({ queryKey: ['allwork-items'] });
    },
    onError: () => toast.error('Failed to update status'),
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

  // Fix versions — editable dropdown pulling all releases
  const { unreleased: unreleasedVersions, released: releasedVersions, isLoading: versionsLoading } = useFixVersions(projectKey || null);
  const [showFixVersionDropdown, setShowFixVersionDropdown] = useState(false);
  const [fixVersionSearch, setFixVersionSearch] = useState('');
  const fixVersionDropdownRef = useRef<HTMLDivElement>(null);

  const fixVersionNames: string[] = useMemo(() => {
    if (!item?.fix_version_name) return [];
    return item.fix_version_name.split(',').map(s => s.trim()).filter(Boolean);
  }, [item?.fix_version_name]);

  const handleToggleFixVersion = useCallback((versionName: string) => {
    const current = fixVersionNames;
    let updated: string[];
    if (current.includes(versionName)) {
      updated = current.filter(v => v !== versionName);
    } else {
      updated = [...current, versionName];
    }
    if (item?.id) {
      supabase.from('ph_issues').update({ fix_versions: updated } as any).eq('id', item.id)
        .then(async ({ error }) => {
          if (error) { toast.error('Failed to update fix version'); return; }
          toast.success('Fix version updated');
          // Log to ph_activity_log so history panel and scope-change gadget
          // have Catalyst-native data (Jira-decommission-ready).
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('ph_activity_log').insert({
              work_item_id: item.id,
              user_id: user.id,
              action: 'updated',
              field_name: 'fix_versions',
              old_value: current.join(', ') || null,
              new_value: updated.join(', ') || null,
            });
          }
          queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
          queryClient.invalidateQueries({ queryKey: ['allwork-items'] });
        });
    }
  }, [fixVersionNames, item?.id, queryClient]);

  // Close fix version dropdown on outside click
  useEffect(() => {
    if (!showFixVersionDropdown) return;
    const handler = (e: MouseEvent) => {
      if (fixVersionDropdownRef.current && !fixVersionDropdownRef.current.contains(e.target as Node)) {
        setShowFixVersionDropdown(false);
        setFixVersionSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFixVersionDropdown]);

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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ph-comments', item?.id] }); toast.success('Comment added'); },
  });

  const fixVersionName = item?.fix_version_name;

  /* ── Catalyst Defect branch detection ─────────────────────────────
     Matches the same predicate used by the section-visibility matrix
     further down (`t.includes('bug') || t.includes('defect')`). Hoisted
     so it can gate the Defect-anatomy injections earlier in the render.
     Adapter constructs the minimal PhIssue shape CatalystDefectFields
     actually reads — `fix_versions` (array of { name }) and `resolution` —
     from the normalized AllWorkItem. Keeps the wire additive; no extra
     Supabase round-trip. */
  const _issueTypeLower = (item?.issue_type ?? '').toLowerCase();
  const isBugDefect = _issueTypeLower.includes('bug') || _issueTypeLower.includes('defect');
  const defectPhIssueAdapter: PhIssue | null = isBugDefect && item
    ? ({
        fix_versions: item.fix_version_name
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
      <span style={{ color: 'var(--aw-text-subtle)', fontSize: 13 }}>Select an issue to view details</span>
    </div>;
  }

  if (loading) {
    return <div className="awBody" style={{ padding: 20 }}>
      {[1,2,3].map(i => <div key={i} style={{ width: `${80-i*15}%`, height: 14, borderRadius: 3, background: '#E2E8F0', marginBottom: 10 }} />)}
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
                  style={{ fontSize: 13, fontWeight: 500, color: '#6B778C', textDecoration: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#0052CC'; e.currentTarget.style.textDecoration = 'underline'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#6B778C'; e.currentTarget.style.textDecoration = 'none'; }}
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
            <IssueKeyLink issueKey={issueKey ?? ''} style={{ color: '#0052CC', textDecoration: 'none', fontSize: 13 }} />
            {/* #12: Prev/Next navigation arrows — canonical IssueNavChevrons
                (shared component, Jira-parity 28×28 / 1px #DFE1E6 / 4px). */}
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
                  if (error) { toast.error('Failed to save title'); return; }
                  toast.success('Title saved');
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
              style={{ padding: '0 6px' }}
              onClick={() => setShowAddMenu(o => !o)}
            >
              <Plus style={{ width: 14, height: 14 }} />
            </button>
            {showAddMenu && (() => {
              const atlText = '#292A2E';
              const addMenuItems = [
                { id: 'subtask', icon: <CheckSquare size={16} color={atlText} />, label: 'Create subtask', shortcut: '⇧ C', section: 'primary', action: () => { setShowAddMenu(false); toast('Use the Sub-tasks section below'); } },
                { id: 'link', icon: <Link2 size={16} color={atlText} />, label: 'Link work item', shortcut: '⇧ K', section: 'primary', action: () => { setShowAddMenu(false); toast.info('Use the Linked Issues section below'); } },
                { id: 'attachment', icon: <Paperclip size={16} color={atlText} />, label: 'Add attachment', section: 'secondary', action: () => { setShowAddMenu(false); toast.info('Use the Attachments section below'); } },
                { id: 'weblink', icon: <Globe size={16} color={atlText} />, label: 'Add web link', section: 'secondary', action: () => { setShowAddMenu(false); toast.info('Web link — coming soon'); } },
              ];
              const q = addMenuSearch.toLowerCase();
              const filtered = q ? addMenuItems.filter(i => i.label.toLowerCase().includes(q)) : addMenuItems;
              const primary = filtered.filter(i => i.section === 'primary');
              const secondary = filtered.filter(i => i.section === 'secondary');
              return (
                <div style={{ position: 'absolute', left: 0, top: 34, background: '#ffffff', borderRadius: 4, boxShadow: '0px 8px 12px rgba(30,31,33,0.15), 0px 0px 1px rgba(30,31,33,0.31)', width: 266, zIndex: 400, padding: 0 }}>
                  <div style={{ margin: '4px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '2px solid #85B8FF', borderRadius: 3, padding: '1px 0' }}>
                      <Search size={14} color="#626F86" style={{ marginLeft: 8, flexShrink: 0 }} />
                      <input type="text" placeholder="Find menu item" value={addMenuSearch} onChange={e => setAddMenuSearch(e.target.value)} autoFocus
                        style={{ background: 'transparent', border: 'none', outline: 'none', boxShadow: 'none', padding: '4px 4px 4px 8px', fontSize: 14, color: atlText, width: '100%', height: 28, fontFamily: 'inherit' }} />
                      {addMenuSearch && (
                        <button onClick={() => setAddMenuSearch('')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: atlText, display: 'flex', alignItems: 'center', padding: 0, marginRight: 6 }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {primary.length > 0 && (
                    <div style={{ padding: 0 }}>
                      {primary.map(mi => (
                        <button key={mi.id} onClick={mi.action} style={{ width: '100%', display: 'flex', alignItems: 'center', height: 40, padding: '0 8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, color: atlText, fontFamily: 'inherit', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F0F1F2')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', flexShrink: 0, marginRight: 8 }}>{mi.icon}</span>
                          <span style={{ flex: 1, textAlign: 'left' }}>{mi.label}</span>
                          {mi.shortcut && <span style={{ fontSize: 13, color: atlText, opacity: 0.7 }}>{mi.shortcut}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {secondary.length > 0 && (
                    <div style={{ borderTop: '1px solid #DDDEE1', padding: 0 }}>
                      {secondary.map(mi => (
                        <button key={mi.id} onClick={mi.action} style={{ width: '100%', display: 'flex', alignItems: 'center', height: 40, padding: '0 8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, color: atlText, fontFamily: 'inherit', transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F0F1F2')}
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
                      <span style={{ fontSize: 14, color: '#172B4D' }}>Medium</span>
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
                      <span style={{ fontSize: 14, color: '#7A869A' }}>None</span>
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

          {/* ── Description (Story Detail Modal parity — ADF rich text with edit mode) ── */}
          <div className="awSection">
            <div className="awSectionHead" onClick={() => toggle('desc')}>
              <span className="awSectionLabel">
                {collapsed.desc ? <ChevronRight style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
                Description
              </span>
            </div>
            {!collapsed.desc && (
              <div className="awSectionBody">
                {descEditMode ? (
                  /* ── Edit mode — Atlaskit editor only (USER DIRECTIVE
                     2026-04-20). No TipTap fallback. If the
                     @atlaskit/editor-core chunk fails to load the
                     Suspense fallback stays visible and the error is
                     surfaced in the console for a fix, rather than
                     silently downgrading to an editor whose ADF
                     emission shape this app no longer accepts. */
                  <div style={{ position: 'relative', borderRadius: 3, backgroundColor: '#FFFFFF' }}>
                    <Suspense
                      fallback={
                        <div style={{ minHeight: 150, padding: '8px 0', color: '#97A0AF', fontSize: 13 }}>
                          Loading editor…
                        </div>
                      }
                    >
                      <EpicDescriptionEditor
                        initialContent={(item as any)?.description_adf ?? item?.description_text ?? null}
                        workItemId={item?.id ?? ''}
                        onSave={(adfJson) => {
                          if (!item?.id) { setDescEditMode(false); return; }
                          const parsed = adfJson ? JSON.parse(adfJson) : null;
                          supabase.from('ph_issues').update({ description_adf: parsed }).eq('id', item.id).then(() => {
                            queryClient.invalidateQueries({ queryKey: ['project-all-work-items-v3'] });
                            queryClient.invalidateQueries({ queryKey: ['allwork-items'] });
                            queryClient.invalidateQueries({ queryKey: ['ph_issues'] });
                            toast.success('Description saved');
                          });
                          setDescEditMode(false);
                        }}
                        onCancel={() => setDescEditMode(false)}
                        placeholder="Add a description..."
                      />
                    </Suspense>
                  </div>
                ) : (
                  <div
                    onClick={() => setDescEditMode(true)}
                    style={{
                      borderRadius: 3, padding: '8px 6px', minHeight: 32,
                      cursor: 'text', outline: 'none',
                      transition: 'background-color 0.2s ease-in-out',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F8F8F8'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {(() => {
                      const descSource = (item as any)?.description_adf ?? item?.description_text ?? null;
                      if (isAdfEmpty(descSource)) {
                        return <span style={{ fontSize: 14, color: '#8C8F97', padding: '4px 0' }}>Add a description...</span>;
                      }
                      return <EpicDescriptionRenderer content={descSource} issueKey={item?.issue_key} />;
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

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
          <StatusPill status={item?.status ?? ''} statusCategory={item?.status_category} issueId={item?.id} onStatusChange={(s) => updateStatusMutation.mutate(s)} />
          {/* Flag button — Jira parity: sits right next to status pill */}
          <div style={{ position: 'relative' }}>
            <button
              ref={flagBtnRef}
              onClick={() => setShowFlagPopover(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, border: '1px solid #DFE1E6', borderRadius: 4,
                background: checkFlagged(item) ? '#FFEBE6' : '#fff', cursor: 'pointer',
                padding: 0,
              }}
              title={checkFlagged(item) ? 'Remove flag' : 'Add flag'}
            >
              <Flag size={18} color="#DE350B" fill={checkFlagged(item) ? '#DE350B' : 'none'} />
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
              width: 32, height: 32, border: '1px solid #DFE1E6', borderRadius: 4,
              background: '#fff', cursor: 'pointer', padding: 0,
            }}
            title="Automation"
          >
            <Zap size={18} color="#172B4D" />
          </button>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {/* Watcher count */}
            <button className="awPill" style={{ padding: '0 6px', height: 22, gap: 3 }}>
              <Eye style={{ width: 14, height: 14 }} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>1</span>
            </button>
            {/* Share — copies current URL */}
            <button className="awPill" style={{ padding: '0 4px', height: 22 }} onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}><Share2 style={{ width: 14, height: 14 }} /></button>
            {/* More menu — Jira parity dropdown */}
            <div ref={moreMenuRef} style={{ position: 'relative' }}>
              <button className="awPill" style={{ padding: '0 4px', height: 22, background: moreMenuOpen ? '#E9F2FF' : undefined }} onClick={() => setMoreMenuOpen(o => !o)}>
                <MoreHorizontal style={{ width: 14, height: 14 }} />
              </button>
              {moreMenuOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: '#fff', borderRadius: 6, width: 220,
                  boxShadow: '0 8px 24px rgba(9,30,66,.25)', zIndex: 80,
                  border: '1px solid #DFE1E6', padding: '4px 0',
                }}>
                  {/* Add/Remove flag in menu */}
                  <button onClick={() => { setShowFlagPopover(true); setMoreMenuOpen(false); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 14, color: '#172B4D', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onMouseOver={e => (e.currentTarget.style.background = '#F4F5F7')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >{checkFlagged(item) ? 'Remove flag' : 'Add flag'}</button>
                  <div style={{ height: 1, background: '#EBECF0', margin: '4px 0' }} />
                  {/* Convert to Subtask */}
                  {item?.issue_type && item.issue_type !== 'Sub-task' && (
                    <button onClick={() => { setShowConvertWizard(true); setMoreMenuOpen(false); }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 14, color: '#172B4D', background: 'transparent', border: 'none', cursor: 'pointer' }}
                      onMouseOver={e => (e.currentTarget.style.background = '#F4F5F7')}
                      onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                    >Convert to Subtask</button>
                  )}
                  {/* Clone */}
                  <button onClick={() => { setShowCloneWizard(true); setMoreMenuOpen(false); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 14, color: '#172B4D', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onMouseOver={e => (e.currentTarget.style.background = '#F4F5F7')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >Clone</button>
                  {/* Move */}
                  <button onClick={() => { setShowMoveWizard(true); setMoreMenuOpen(false); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 14, color: '#172B4D', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onMouseOver={e => (e.currentTarget.style.background = '#F4F5F7')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >Move</button>
                  {/* Archive */}
                  <button onClick={() => { setShowArchiveDialog(true); setMoreMenuOpen(false); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 14, color: '#172B4D', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onMouseOver={e => (e.currentTarget.style.background = '#F4F5F7')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >Archive</button>
                  <div style={{ height: 1, background: '#EBECF0', margin: '4px 0' }} />
                  {/* Delete */}
                  <button onClick={() => { setShowDeleteDialog(true); setMoreMenuOpen(false); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 14, color: '#DE350B', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onMouseOver={e => (e.currentTarget.style.background = '#FFEBE6')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >Delete</button>
                </div>
              )}
            </div>
          </span>
        </div>

        {/* Details section — identical to Story Detail Modal sidebar */}
        <div style={{ marginBottom: 20, padding: '0 16px' }}>
          <div onClick={() => toggle('details')} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 12, userSelect: 'none' }}>
            {collapsed.details
              ? <ChevronRight size={14} color="#42526E" />
              : <ChevronDown size={14} color="#42526E" />
            }
            <span style={{ fontSize: 14, fontWeight: 700, color: '#172B4D' }}>Details</span>
          </div>
          {!collapsed.details && (
            <div>
              {/* Fix versions — Jira-parity editable dropdown */}
              <div style={{ marginBottom: 14, position: 'relative' }} ref={fixVersionDropdownRef}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Fix versions</div>
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
                    fixVersionNames.map((v, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 3, background: '#DEEBFF', color: '#0747A6' }}>
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
                {showFixVersionDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#FFFFFF', border: '1px solid #DFE1E6', borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, maxHeight: 320, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #F4F5F7' }}>
                      <input autoFocus value={fixVersionSearch} onChange={e => setFixVersionSearch(e.target.value)} placeholder="Search versions..."
                        style={{ width: '100%', border: '1px solid #DFE1E6', borderRadius: 4, padding: '6px 10px', fontSize: 13, color: '#172B4D', outline: 'none', fontFamily: 'inherit' }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#4C9AFF'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#DFE1E6'; }}
                      />
                    </div>
                    <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                      {versionsLoading && <div style={{ padding: '12px 16px', fontSize: 13, color: '#6B778C' }}>Loading...</div>}
                      {(() => {
                        const filtered = unreleasedVersions.filter(v => v.name.toLowerCase().includes(fixVersionSearch.toLowerCase()));
                        if (filtered.length === 0) return null;
                        return (
                          <>
                            <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Unreleased</div>
                            {filtered.map(v => {
                              const isSel = fixVersionNames.includes(v.name);
                              return (
                                <div key={v.name} onClick={() => handleToggleFixVersion(v.name)} style={{ padding: '8px 16px', fontSize: 14, color: '#172B4D', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isSel ? '#DEEBFF' : 'transparent', transition: 'background 0.1s' }}
                                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#F4F5F7'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = isSel ? '#DEEBFF' : 'transparent'; }}
                                >
                                  <span>{v.name}</span>
                                  {isSel && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0747A6" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                              );
                            })}
                          </>
                        );
                      })()}
                      {(() => {
                        const filtered = releasedVersions.filter(v => v.name.toLowerCase().includes(fixVersionSearch.toLowerCase()));
                        if (filtered.length === 0) return null;
                        return (
                          <>
                            <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.03em', borderTop: '1px solid #F4F5F7' }}>Released</div>
                            {filtered.map(v => {
                              const isSel = fixVersionNames.includes(v.name);
                              return (
                                <div key={v.name} onClick={() => handleToggleFixVersion(v.name)} style={{ padding: '8px 16px', fontSize: 14, color: '#172B4D', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isSel ? '#DEEBFF' : 'transparent', transition: 'background 0.1s' }}
                                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#F4F5F7'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = isSel ? '#DEEBFF' : 'transparent'; }}
                                >
                                  <span>{v.name}</span>
                                  {isSel && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0747A6" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
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
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Assignee</div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px' }}>
                    <span style={{ fontSize: 14, color: '#97A0AF' }}>Unassigned</span>
                  </div>
                )}
              </div>


              {/* Reporter — Jira parity: 28px avatar + 14px name */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Reporter</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 4 }}>
                  {item?.reporter_name ? (
                    <>
                      <Avatar name={item.reporter_name} url={resolveAvatarUrl(item.reporter_name)} size={28} />
                      <span style={{ fontSize: 14, color: '#172B4D', fontWeight: 400 }}>{item.reporter_name}</span>
                    </>
                  ) : <span style={{ color: '#42526E', fontSize: 14 }}>—</span>}
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
