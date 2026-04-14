/**
 * IssueContentView — Jira-parity single issue view:
 * Left side: breadcrumb, title, actions, key details, description, subtasks, linked work, activity
 * Right side: collapsible Details sidebar (Assignee, Priority, Reporter, Labels, Fix versions, MDT Ref)
 * Implements recommendations #11-16, #17, #19-26, #28-30
 */
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, ChevronUp, Link2, ArrowRightLeft, MoreHorizontal, Pencil, Plus, MessageSquare, History as HistoryIcon, FileText, Send, Eye, Share2, Bold, Italic, List, Code2, Link as LinkIcon, Smile, Paperclip, Undo2, Redo2, ArrowUpDown, ArrowRight } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { useAuth } from '@/hooks/useAuth';
import type { AllWorkItem } from '@/types/allwork.types';
import { formatDistanceToNow, format } from 'date-fns';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';


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

/** Jira-strong status pill with dropdown chevron */
function StatusPill({ status, statusCategory }: { status: string; statusCategory?: string | null }) {
  const cat = (statusCategory ?? '').toLowerCase();
  let bg = '#44546F';
  let color = '#FFFFFF';
  if (cat.includes('done') || cat === 'complete') { bg = '#1B845D'; }
  else if (cat.includes('progress') || cat === 'indeterminate') { bg = '#0C66E4'; }
  else if (status.toLowerCase().includes('beta')) { bg = '#1B845D'; }
  else if (status.toLowerCase().includes('done') || status.toLowerCase().includes('complete')) { bg = '#1B845D'; }
  else if (status.toLowerCase().includes('progress') || status.toLowerCase().includes('implementation') || status.toLowerCase().includes('review') || status.toLowerCase().includes('requirement')) { bg = '#0C66E4'; }

  return (
    <button className="awStatusPill" style={{ background: bg, color }}>
      {status}
      <ChevronDown style={{ width: 12, height: 12 }} />
    </button>
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
  onPrev, onNext,
}: Props) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activityTab, setActivityTab] = useState<ActivityTab>('all');
  const [commentText, setCommentText] = useState('');
  const [commentFocused, setCommentFocused] = useState(false);
  const [posting, setPosting] = useState(false);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  // Section collapse
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(s => ({ ...s, [id]: !s[id] }));

  const totalChildren = childItems.length || (item?.child_count ?? 0);

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
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
              <button className="awNavArrow" onClick={onPrev} title="Previous issue"><ChevronUp style={{ width: 14, height: 14 }} /></button>
              <button className="awNavArrow" onClick={onNext} title="Next issue"><ChevronDown style={{ width: 14, height: 14 }} /></button>
            </span>
          </div>

          {/* Title */}
          <div className="awIssueTitle">{item?.summary ?? 'Untitled'}</div>

          {/* #13: Actions row: + and ⚙ buttons */}
          <div className="awActions">
            <button className="awPill" style={{ padding: '0 6px' }}><Plus style={{ width: 14, height: 14 }} /></button>
            
          </div>
        </div>

        {/* Scrollable body */}
        <div className="awBody">
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

          {/* ── Description ── */}
          <div className="awSection">
            <div className="awSectionHead" onClick={() => toggle('desc')}>
              <span className="awSectionLabel">
                {collapsed.desc ? <ChevronRight style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
                Description
              </span>
              <div className="awSectionActions">
                <button className="awPill" style={{ height: 22 }}><Pencil style={{ width: 12, height: 12 }} /></button>
              </div>
            </div>
            {!collapsed.desc && (
              <div className="awSectionBody">
                {item?.description_text ? (
                  <div className="awDescriptionContent">
                    {item.description_text}
                  </div>
                ) : (
                  <div className="awDescPlaceholder">Add a description...</div>
                )}
              </div>
            )}
          </div>

          {/* ── Subtasks Panel (#28: actions already in SubtasksPanel) ── */}
          <SubtasksPanel
            storyKey={issueKey!}
            storyId={item?.id || ''}
            projectKey={item?.project_key || ''}
          />

          {/* ── Linked work items (#29) ── */}
          <div className="awSection">
            <div className="awSectionHead" onClick={() => toggle('links')}>
              <span className="awSectionLabel">
                {collapsed.links ? <ChevronRight style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
                Linked work items
              </span>
              <div className="awSectionActions">
                <button className="awPill" style={{ height: 22 }}><Plus style={{ width: 12, height: 12 }} /></button>
              </div>
            </div>
            {!collapsed.links && (
              <div className="awSectionBody">
                {links.length === 0 ? (
                  <div className="awEmpty">No linked work items</div>
                ) : links.map((link: any, i: number) => (
                  <div key={link.id ?? i}>
                    <div className="awLinkGroupLabel">{link.link_type_name ?? 'relates to'}</div>
                    <div className="awLinkRow">
                      <JiraIssueTypeIcon type={link.target_issue_type ?? link.source_issue_type ?? ''} size={14} />
                      <span style={{ color: 'var(--aw-blue)', fontWeight: 500, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{link.target_key ?? link.source_key ?? ''}</span>
                      <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.target_summary ?? link.source_summary ?? ''}</span>
                      {(link.target_status ?? link.source_status) && <StatusLozenge status={link.target_status ?? link.source_status} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
        {/* Status pill + #14 watcher + #15 share + #16 more menu + #19 issue type badge */}
        <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusPill status={item?.status ?? ''} statusCategory={item?.status_category} />
          {/* #19: Issue type badge next to status */}
          {item?.issue_type && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--aw-text-subtle)', border: '1px solid var(--aw-border)', borderRadius: 4, padding: '2px 8px', height: 24 }}>
              <JiraIssueTypeIcon type={item.issue_type} size={14} />
              {item.issue_type}
            </span>
          )}
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {/* #14: Watcher count */}
            <button className="awPill" style={{ padding: '0 6px', height: 22, gap: 3 }}>
              <Eye style={{ width: 14, height: 14 }} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>1</span>
            </button>
            {/* #15: Share button */}
            <button className="awPill" style={{ padding: '0 4px', height: 22 }}><Share2 style={{ width: 14, height: 14 }} /></button>
            {/* #16: More menu */}
            <button className="awPill" style={{ padding: '0 4px', height: 22 }}><MoreHorizontal style={{ width: 14, height: 14 }} /></button>
          </span>
        </div>

        {/* Details section */}
        <div className="awDetailsSection">
          <div className="awDetailsSectionHead" onClick={() => toggle('details')}>
            {collapsed.details ? <ChevronRight style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
            Details
          </div>
          {!collapsed.details && (
            <div className="awDetailsSectionBody">
              {/* Fix versions */}
              <div className="awFieldRow awFieldRowBorder">
                <div className="awFieldLabel">Fix versions</div>
                <div className="awFieldValue"><span className="awFieldNone">{fixVersionName || 'None'}</span></div>
              </div>
              {/* #20: Assignee + always show "Assign to me" */}
              <div className="awFieldRow awFieldRowBorder awFieldRowTall">
                <div className="awFieldLabel">Assignee</div>
                <div className="awFieldValue" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {item?.assignee_display_name ? <>
                      <Avatar name={item.assignee_display_name} url={item.assignee_avatar} size={24} />
                      <span>{item.assignee_display_name}</span>
                    </> : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B3BAC5" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 10-16 0"/></svg>
                        <span className="awFieldNone">Unassigned</span>
                      </span>
                    )}
                  </div>
                  <span style={{ color: '#0C66E4', fontSize: 12, cursor: 'pointer', marginLeft: item?.assignee_display_name ? 30 : 26 }}>Assign to me</span>
                </div>
              </div>
              {/* Priority */}
              <div className="awFieldRow awFieldRowBorder">
                <div className="awFieldLabel">Priority</div>
                <div className="awFieldValue">
                  <PriorityIcon priority={item?.priority} />
                  <span>{capitalize(item?.priority ?? 'Medium')}</span>
                </div>
              </div>
              {/* #21: Reporter with photo avatar */}
              <div className="awFieldRow awFieldRowBorder">
                <div className="awFieldLabel">Reporter</div>
                <div className="awFieldValue">
                  {item?.reporter_name ? <>
                    <Avatar name={item.reporter_name} url={(item as any).reporter_avatar} size={24} />
                    <span>{item.reporter_name}</span>
                  </> : <span className="awFieldNone">None</span>}
                </div>
              </div>
              {/* Labels */}
              <div className="awFieldRow awFieldRowBorder">
                <div className="awFieldLabel">Labels</div>
                <div className="awFieldValue">
                  {item?.labels && item.labels.length > 0
                    ? item.labels.map((l, i) => <span key={i} className="awLabelChip">{l}</span>)
                    : <span className="awFieldNone">None</span>
                  }
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
    </div>
  );
}
