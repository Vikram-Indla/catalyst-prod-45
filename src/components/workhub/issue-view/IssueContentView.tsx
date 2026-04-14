/**
 * IssueContentView — Jira-parity single issue view:
 * Left side: breadcrumb, title, actions, key details, description, subtasks, linked work, activity
 * Right side: collapsible Details sidebar (Assignee, Priority, Reporter, Labels, Fix versions, MDT Ref)
 * Implements recommendations #11-16, #17, #19-26, #28-30
 */
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, ChevronLeft, ChevronUp, Link2, ArrowRightLeft, MoreHorizontal, Pencil, Plus, MessageSquare, History as HistoryIcon, FileText, Send, Eye, Share2, Bold, Italic, List, Code2, Link as LinkIcon, Smile, Paperclip, Undo2, Redo2, ArrowUpDown, ArrowRight, CheckSquare, Globe, Palette, Search, X } from 'lucide-react';
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
import { ChildIssuesSection } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/ChildIssuesSection';
import { LinkedIssuesSection } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/LinkedIssuesSection';
import { DefectsSection } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/DefectsSection';
import { IncidentsSection } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/IncidentsSection';
import { TestHubSection } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/TestHubSection';
import { EditableAssignee, EditablePriority, EditableLabels } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/EditableFields';
import { useFixVersions } from '@/modules/project-work-hub/hooks/useFixVersions';
import { ConvertToSubtaskWizard } from './ConvertToSubtaskWizard';
import { FlagDialog, CloneWizard, MoveWizard, ArchiveDialog, DeleteDialog } from './IssueActionDialogs';
import { AdfDescriptionRenderer } from '@/modules/project-work-hub/components/AdfDescriptionRenderer';
import { StoryRichTextEditor } from '@/modules/project-work-hub/components/story-detail/StoryRichTextEditor';
import { adfToHtml } from '@/modules/project-work-hub/utils/adfToHtml';
import '@/modules/project-work-hub/components/dialogs/story-detail-extensions.css';


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

/** Priority icon matching Jira native */
function PriorityIcon({ priority }: { priority?: string | null }) {
  const p = (priority ?? '').toLowerCase();
  let color = '#F79232';
  if (p === 'highest' || p === 'critical') color = '#EF4444';
  else if (p === 'high') color = '#F97316';
  else if (p === 'low') color = '#3B82F6';
  else if (p === 'lowest' || p === 'trivial') color = '#60A5FA';

  if (p === 'highest' || p === 'high' || p === 'critical') {
    return <svg width="14" height="14" viewBox="0 0 16 16"><path d="M3 13l5-10 5 10" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  }
  if (p === 'low' || p === 'lowest' || p === 'trivial') {
    return <svg width="14" height="14" viewBox="0 0 16 16"><path d="M3 3l5 10 5-10" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  }
  return <svg width="14" height="14" viewBox="0 0 16 16"><rect x="2" y="5" width="12" height="2" rx="1" fill={color}/><rect x="2" y="9" width="12" height="2" rx="1" fill={color}/></svg>;
}

type ActivityTab = 'all' | 'comments' | 'history';

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
  const [activityTab, setActivityTab] = useState<ActivityTab>('all');
  const [commentText, setCommentText] = useState('');
  const [commentFocused, setCommentFocused] = useState(false);
  const [posting, setPosting] = useState(false);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [descEditMode, setDescEditMode] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [showConvertWizard, setShowConvertWizard] = useState(false);
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [showCloneWizard, setShowCloneWizard] = useState(false);
  const [showMoveWizard, setShowMoveWizard] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!item?.id) throw new Error('No item');
      const { error } = await supabase.from('ph_issues').update({ status: newStatus, status_category: resolveStatusCategory(newStatus) } as any).eq('id', item.id);
      if (error) throw error;
      await supabase.from('jira_write_back_queue').insert({ ph_issue_id: item.id, field_name: 'status', new_value: newStatus, status: 'approved' } as any);
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

  // Derive project key from issue key (e.g. "BAU-5364" → "BAU")
  const projectKey = issueKey?.split('-')[0] ?? '';

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
        .then(({ error }) => {
          if (error) { toast.error('Failed to update fix version'); return; }
          toast.success('Fix version updated');
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

  const handleComment = async () => {
    if (!commentText.trim() || !createComment) return;
    setPosting(true);
    try {
      await createComment.mutateAsync({ body: commentText.trim(), authorId: user?.id ?? '' });
      setCommentText('');
      setCommentFocused(false);
    } catch {
      // Error toast handled by mutation onError
    } finally {
      setPosting(false);
    }
  };

  const TABS: { key: ActivityTab; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'comments', label: 'Comments' },
    { key: 'history', label: 'History' },
  ];

  // Merged + sorted activity feed
  const activityFeed = useMemo(() => {
    const items: { type: 'comment' | 'history' | 'worklog'; data: any; ts: number }[] = [];
    if (activityTab === 'all' || activityTab === 'comments') {
      comments.forEach((c: any) => items.push({ type: 'comment', data: c, ts: new Date(c.created_at ?? 0).getTime() }));
    }
    if (activityTab === 'all' || activityTab === 'history') {
      historyItems.forEach((h: any) => items.push({ type: 'history', data: h, ts: new Date(h.created_at ?? 0).getTime() }));
    }
    items.sort((a, b) => sortDir === 'desc' ? b.ts - a.ts : a.ts - b.ts);
    return items;
  }, [comments, historyItems, worklogs, activityTab, sortDir]);

  const fixVersionName = item?.fix_version_name;

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
          {/* Breadcrumb — #11: Add parent link, #12: nav arrows */}
          <div className="awBreadcrumb">
            {/* Add parent CTA when no parent */}
            {!parentItem && !item?.parent_key && (
              <span className="awAddParentLink">
                <Pencil style={{ width: 11, height: 11 }} />
                Add parent
              </span>
            )}
            {/* Show parent if exists */}
            {(parentItem || item?.parent_key) && <>
              <JiraIssueTypeIcon type={parentItem?.issue_type ?? 'epic'} size={14} />
              <span className="awBreadcrumbLink">{parentItem?.issue_key ?? item?.parent_key}</span>
            </>}
            <span style={{ color: 'var(--aw-text-subtle)' }}>/</span>
            {item && <JiraIssueTypeIcon type={item.issue_type} size={14} />}
            <span>{issueKey}</span>
            {/* #12: Prev/Next navigation arrows */}
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button className="awNavArrow" onClick={onPrev} title="Previous issue"><ChevronUp /></button>
              <button className="awNavArrow" onClick={onNext} title="Next issue"><ChevronDown /></button>
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
                {/* Priority */}
                <div className="awKeyDetailRow">
                  <div className="awKeyDetailLabel">Priority</div>
                  <div className="awKeyDetailValue">
                    <PriorityIcon priority={item?.priority} />
                    <span>{capitalize(item?.priority ?? 'Medium')}</span>
                  </div>
                </div>
                {/* Parent */}
                <div className="awKeyDetailRow">
                  <div className="awKeyDetailLabel">Parent</div>
                  <div className="awKeyDetailValue">
                    {(parentItem || item?.parent_key) ? (
                      <>
                        <JiraIssueTypeIcon type={parentItem?.issue_type ?? 'epic'} size={14} />
                        <span style={{ color: '#1868DB', cursor: 'pointer' }}>{parentItem?.issue_key ?? item?.parent_key}</span>
                        {parentItem?.summary && <span style={{ color: '#505258', marginLeft: 4 }}>{parentItem.summary}</span>}
                      </>
                    ) : (
                      <span className="awFieldNone" style={{ cursor: 'pointer' }}>Select parent</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

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
                  <div style={{ position: 'relative', borderRadius: 3, backgroundColor: '#FFFFFF' }}>
                    <StoryRichTextEditor
                      content={adfToHtml((item as any)?.description_adf) || item?.description_text || ''}
                      workItemId={item?.id ?? ''}
                      onSave={(html) => {
                        if (item?.id) {
                          supabase.from('ph_issues').update({ description_text: html }).eq('id', item.id).then(() => {
                            toast.success('Description saved');
                          });
                        }
                        setDescEditMode(false);
                      }}
                      onCancel={() => setDescEditMode(false)}
                      placeholder="Add a description..."
                      minHeight={150}
                    />
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
                      const descHtml = adfToHtml((item as any)?.description_adf) || item?.description_text || '';
                      if (!descHtml || descHtml === '<p></p>' || descHtml.trim() === '') {
                        return <span style={{ fontSize: 14, color: '#8C8F97', padding: '4px 0' }}>Add a description...</span>;
                      }
                      return <AdfDescriptionRenderer html={descHtml} issueKey={item?.issue_key} />;
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Attachments (from StoryDetailModal) ── */}
          <AttachmentsSection
            attachments={attachments}
            itemId={item?.id ?? ''}
            userId={user?.id ?? ''}
          />

          {/* ── Subtasks / Child Issues (from StoryDetailModal — ChildIssuesSection) ── */}
          <ChildIssuesSection
            storyKey={issueKey!}
            storyId={item?.id ?? ''}
            projectKey={projectKey}
          />

          {/* ── Linked work items (from StoryDetailModal — LinkedIssuesSection) ── */}
          <LinkedIssuesSection issueId={item?.id ?? ''} />

          {/* ── Defects (from StoryDetailModal) ── */}
          <DefectsSection storyKey={issueKey!} projectKey={projectKey} />

          {/* ── Production Incidents (from StoryDetailModal) ── */}
          <IncidentsSection storyKey={issueKey!} />

          {/* ── TestHub (from StoryDetailModal) ── */}
          <TestHubSection storyId={item?.id ?? ''} />

          {/* ── Activity — Jira Cloud parity ── */}
          <div className="awSection" style={{ borderBottom: 'none' }}>
            {/* Activity heading */}
            <div className="awActivityHeader">
              <h3 className="awActivityHeading">Activity</h3>
            </div>

            {/* Underline-style tabs + sort toggle */}
            <div className="awActivityTabBar">
              <div className="awActivityTabList">
                {TABS.map(t => (
                  <button
                    key={t.key}
                    className={`awActivityTab2 ${activityTab === t.key ? 'active' : ''}`}
                    onClick={() => setActivityTab(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                className="awSortToggle"
                onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                title={sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
              >
                <ArrowUpDown style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Comment composer — Atlassian pattern: collapsed → expanded */}
            <div className="awActivityBody2">
              {!commentFocused ? (
                <div className="awCommentBox" onClick={() => setCommentFocused(true)}>
                  {user && <Avatar name={user.email ?? 'You'} size={32} />}
                  <span className="awCommentPlaceholder">Add a comment...</span>
                </div>
              ) : (
                <div className="awCommentComposer">
                  <div className="awCommentComposerLeft">
                    {user && <Avatar name={user.email ?? 'You'} size={32} />}
                  </div>
                  <div className="awCommentComposerRight">
                    <div className="awCommentEditorBox">
                      {/* Formatting toolbar (visual parity) */}
                      <div className="awEditorToolbar">
                        <button className="awToolbarBtn" title="Bold"><Bold style={{ width: 15, height: 15 }} /></button>
                        <button className="awToolbarBtn" title="Italic"><Italic style={{ width: 15, height: 15 }} /></button>
                        <button className="awToolbarBtn" title="List"><List style={{ width: 15, height: 15 }} /></button>
                        <button className="awToolbarBtn" title="Code"><Code2 style={{ width: 15, height: 15 }} /></button>
                        <span className="awToolbarDivider" />
                        <button className="awToolbarBtn" title="Link"><LinkIcon style={{ width: 15, height: 15 }} /></button>
                        <button className="awToolbarBtn" title="Emoji"><Smile style={{ width: 15, height: 15 }} /></button>
                        <button className="awToolbarBtn" title="Attachment"><Paperclip style={{ width: 15, height: 15 }} /></button>
                        <span className="awToolbarDivider" />
                        <button className="awToolbarBtn" title="Undo"><Undo2 style={{ width: 15, height: 15 }} /></button>
                        <button className="awToolbarBtn" title="Redo"><Redo2 style={{ width: 15, height: 15 }} /></button>
                      </div>
                      {/* Textarea */}
                      <textarea
                        autoFocus
                        rows={3}
                        placeholder="Type @ to mention and notify someone."
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleComment(); }
                          if (e.key === 'Escape' && !commentText.trim()) { setCommentFocused(false); }
                        }}
                        disabled={posting}
                        className="awCommentTextarea2"
                      />
                    </div>
                    {/* Save / Cancel below editor box */}
                    <div className="awCommentFooter">
                      <button
                        className="awCommentSaveBtn"
                        onClick={handleComment}
                        disabled={posting || !commentText.trim()}
                      >
                        {posting ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="awCommentCancelBtn"
                        onClick={() => { setCommentFocused(false); setCommentText(''); }}
                        disabled={posting}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Log work form (toggle) — visible on Work log tab */}

              {/* Merged activity timeline */}
              {activityFeed.length > 0 ? (
                <div className="awTimeline">
                  {activityFeed.map((entry, i) => {
                    if (entry.type === 'comment') {
                      const c = entry.data;
                      const name = c._author_name ?? 'Unknown';
                      return (
                        <div key={c.id ?? `c-${i}`} className="awTimelineItem">
                          <div className="awTimelineAvatar" style={{ background: avatarBg(name) }}>{initials(name)}</div>
                          <div className="awTimelineContent">
                            <div className="awTimelineName">{name}</div>
                            <div className="awTimelineTime">{fmtRel(c.created_at)}</div>
                            <span className="awTypeBadge awTypeBadgeComment">COMMENT</span>
                            <div className="awTimelineDetail">{c.body}</div>
                          </div>
                        </div>
                      );
                    }
                    if (entry.type === 'history') {
                      const h = entry.data;
                      const name = h._author_name ?? 'System';
                      const field = h.field_name ?? '';
                      const oldVal = h.old_display ?? h.old_value ?? null;
                      const newVal = h.new_display ?? h.new_value ?? null;
                      const isStatus = field.toLowerCase() === 'status';
                      const isAssignee = field.toLowerCase() === 'assignee';
                      const isCreated = field.toLowerCase() === '' && !oldVal && !newVal;
                      return (
                        <div key={h.id ?? `h-${i}`} className="awTimelineItem">
                          <div className="awTimelineAvatar" style={{ background: avatarBg(name) }}>{initials(name)}</div>
                          <div className="awTimelineContent">
                            <div className="awTimelineName">
                              {name} {isCreated ? 'created the Work item' : <>changed the <strong>{field}</strong></>}
                            </div>
                            <div className="awTimelineTime">{fmtRel(h.created_at)}</div>
                            <span className="awTypeBadge awTypeBadgeHistory">HISTORY</span>
                            {/* Change detail rendering */}
                            {!isCreated && (oldVal || newVal) && (
                              <div className="awTimelineChange">
                                {isStatus ? (
                                  <>
                                    {oldVal && <span className="awStatusLoz">{oldVal}</span>}
                                    <ArrowRight style={{ width: 14, height: 14, color: 'var(--aw-text-subtle)', flexShrink: 0 }} />
                                    {newVal && <span className="awStatusLoz">{newVal}</span>}
                                  </>
                                ) : isAssignee ? (
                                  <>
                                    {oldVal && (
                                      <span className="awAssigneeChip">
                                        <span className="awAssigneeChipAvatar" style={{ background: avatarBg(oldVal) }}>{initials(oldVal)}</span>
                                        {oldVal}
                                      </span>
                                    )}
                                    <ArrowRight style={{ width: 14, height: 14, color: 'var(--aw-text-subtle)', flexShrink: 0 }} />
                                    {newVal && (
                                      <span className="awAssigneeChip">
                                        <span className="awAssigneeChipAvatar" style={{ background: avatarBg(newVal) }}>{initials(newVal)}</span>
                                        {newVal}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <span className="awChangeOld">{oldVal ?? 'None'}</span>
                                    <ArrowRight style={{ width: 14, height: 14, color: 'var(--aw-text-subtle)', flexShrink: 0 }} />
                                    <span className="awChangeNew">{newVal}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                
                </div>
              ) : (
                <div className="awEmpty">No activity yet</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══ DIVIDER with collapse button ══ */}
      <div className="awSidebarDivider" onClick={() => setSidebarOpen(o => !o)}>
        <button className="awCollapseBtn" title={sidebarOpen ? 'Collapse' : 'Expand'}>
          {sidebarOpen ? <ChevronRight style={{ width: 12, height: 12 }} /> : <ChevronLeft style={{ width: 12, height: 12 }} />}
        </button>
      </div>

      {/* ══ RIGHT: Details sidebar (collapsible) ══ */}
      <div className={`awDetailsSidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        {/* Status pill + watcher + share (copy link) + more menu */}
        <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusPill status={item?.status ?? ''} statusCategory={item?.status_category} issueId={item?.id} onStatusChange={(s) => updateStatusMutation.mutate(s)} />
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
                  {/* Add flag */}
                  <button onClick={() => { setShowFlagDialog(true); setMoreMenuOpen(false); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', fontSize: 14, color: '#172B4D', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onMouseOver={e => (e.currentTarget.style.background = '#F4F5F7')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                  >Add flag</button>
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

              {/* Priority — Jira parity: SVG icon + dark text, click-to-edit */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Priority</div>
                {item?.id ? (
                  <EditablePriority
                    issueId={item.id}
                    currentPriority={item.priority ?? 'Medium'}
                    onUpdate={() => { queryClient.invalidateQueries({ queryKey: ['ph_issues'] }); queryClient.invalidateQueries({ queryKey: ['allwork-items'] }); }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px' }}>
                    <span style={{ fontSize: 14, color: '#172B4D' }}>Medium</span>
                  </div>
                )}
              </div>

              {/* Reporter — Jira parity: 28px avatar + 14px name */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Reporter</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 4 }}>
                  {item?.reporter_name ? (
                    <>
                      <Avatar name={item.reporter_name} url={(item as any).reporter_avatar} size={28} />
                      <span style={{ fontSize: 14, color: '#172B4D', fontWeight: 400 }}>{item.reporter_name}</span>
                    </>
                  ) : <span style={{ color: '#42526E', fontSize: 14 }}>—</span>}
                </div>
              </div>

              {/* Labels — Jira parity: colored chips, click-to-edit */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#172B4D', marginBottom: 4 }}>Labels</div>
                {item?.id ? (
                  <EditableLabels
                    issueId={item.id}
                    currentLabels={item.labels ?? []}
                    onUpdate={() => { queryClient.invalidateQueries({ queryKey: ['ph_issues'] }); queryClient.invalidateQueries({ queryKey: ['allwork-items'] }); }}
                  />
                ) : (
                  <div style={{ padding: '4px 8px' }}>
                    <span style={{ fontSize: 14, color: '#7A869A' }}>None</span>
                  </div>
                )}
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
    </div>
  );
}
