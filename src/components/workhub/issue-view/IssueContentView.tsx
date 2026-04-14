/**
 * IssueContentView — Jira-parity single issue view:
 * Left side: breadcrumb, title, actions, key details, description, subtasks, linked work, activity
 * Right side: collapsible Details sidebar (Assignee, Priority, Reporter, Labels, Fix versions, MDT Ref)
 * Implements recommendations #11-16, #17, #19-26, #28-30
 */
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, ChevronUp, Link2, ArrowRightLeft, MoreHorizontal, Pencil, Plus, Settings, MessageSquare, History as HistoryIcon, Clock, FileText, Send, Eye, Share2 } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { useAuth } from '@/hooks/useAuth';
import type { AllWorkItem } from '@/types/allwork.types';
import { formatDistanceToNow, format } from 'date-fns';
import { SubtasksPanel } from './sections/SubtasksPanel';
import { LocalStorageBackedProvider } from '@/lib/subtasks-provider';


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
  createComment?: any;
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

type ActivityTab = 'all' | 'comments' | 'history' | 'worklog';

export function IssueContentView({
  issueKey, item, parentItem, childItems = [], childrenLoading,
  links = [], linksLoading, comments = [], commentsLoading,
  historyItems = [], historyLoading, createComment, loading,
  onPrev, onNext,
}: Props) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activityTab, setActivityTab] = useState<ActivityTab>('all');
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const subtasksProvider = useMemo(() => new LocalStorageBackedProvider(), []);

  // Section collapse
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(s => ({ ...s, [id]: !s[id] }));

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

  const totalChildren = childItems.length || (item?.child_count ?? 0);

  const handleComment = async () => {
    if (!commentText.trim() || !createComment) return;
    setPosting(true);
    try { await createComment.mutateAsync({ body: commentText.trim(), authorId: user?.id ?? '' }); setCommentText(''); }
    catch {} finally { setPosting(false); }
  };

  const TABS: { key: ActivityTab; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'comments', label: 'Comments' },
    { key: 'history', label: 'History' }, { key: 'worklog', label: 'Work log' },
  ];

  const fixVersionName = item?.fix_version_name;

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
            <button className="awPill" style={{ padding: '0 6px' }}><Settings style={{ width: 14, height: 14 }} /></button>
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
            parentKey={issueKey!}
            provider={subtasksProvider}
            externalChildren={childItems}
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

          {/* ── Activity (#30: pill-style tabs) ── */}
          <div className="awSection" style={{ borderBottom: 'none' }}>
            <div className="awSectionHead" style={{ cursor: 'default' }}>
              <span className="awSectionLabel">Activity</span>
              <div className="awActivityTabs">
                {TABS.map(t => (
                  <button key={t.key} className={`awActivityTab ${activityTab === t.key ? 'active' : ''}`} onClick={() => setActivityTab(t.key)}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="awSectionBody">
              {/* Comment box */}
              <div className="awCommentBox">
                {user && <Avatar name={user.email ?? 'You'} size={28} />}
                <input
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleComment(); }}
                  disabled={posting}
                />
                {commentText.trim() && (
                  <button onClick={handleComment} disabled={posting} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--aw-blue)' }}>
                    <Send style={{ width: 16, height: 16 }} />
                  </button>
                )}
              </div>

              {/* Activity items */}
              {(activityTab === 'all' || activityTab === 'comments') && comments.map((c: any, i: number) => (
                <div key={c.id ?? `c-${i}`} className="awActivityItem">
                  <div className="awAvatar" style={{ background: avatarBg(c._author_name ?? 'U') }}>{initials(c._author_name ?? 'U')}</div>
                  <div className="awActivityBody">
                    <div className="awActivityMeta"><strong>{c._author_name ?? 'Unknown'}</strong> {fmtRel(c.created_at)}</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>{c.body}</div>
                  </div>
                </div>
              ))}
              {(activityTab === 'all' || activityTab === 'history') && historyItems.map((h: any, i: number) => (
                <div key={h.id ?? `h-${i}`} className="awActivityItem">
                  <div className="awAvatar" style={{ background: avatarBg(h._author_name ?? 'S') }}>{initials(h._author_name ?? 'S')}</div>
                  <div className="awActivityBody">
                    <div className="awActivityMeta">
                      <strong>{h._author_name ?? 'System'}</strong> changed <strong>{h.field_name}</strong> {fmtRel(h.created_at)}
                    </div>
                    {(h.old_display ?? h.old_value) && <div style={{ fontSize: 12, marginTop: 2, color: 'var(--aw-text-subtle)' }}>{h.old_display ?? h.old_value} → <strong style={{ color: 'var(--aw-text)' }}>{h.new_display ?? h.new_value}</strong></div>}
                  </div>
                </div>
              ))}
              {comments.length === 0 && historyItems.length === 0 && (
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
              {/* MDT Ref */}
              <div className="awFieldRow awFieldRowBorder">
                <div className="awFieldLabel">MDT Ref</div>
                <div className="awFieldValue"><span className="awFieldNone" style={{ cursor: 'pointer' }}>Add text</span></div>
              </div>
            </div>
          )}
        </div>

        {/* #23: More fields collapsible */}
        <div className="awDetailsSection">
          <div className="awDetailsSectionHead" onClick={() => toggle('morefields')}>
            {collapsed.morefields ? <ChevronRight style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
            More fields
            <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--aw-text-subtle)', marginLeft: 6 }}>
              Original estimate, Time tracking, Fix versions, Parent
            </span>
          </div>
          {!collapsed.morefields && (
            <div className="awDetailsSectionBody">
              <div className="awFieldRow awFieldRowBorder">
                <div className="awFieldLabel">Original estimate</div>
                <div className="awFieldValue"><span className="awFieldNone">None</span></div>
              </div>
              <div className="awFieldRow awFieldRowBorder">
                <div className="awFieldLabel">Time tracking</div>
                <div className="awFieldValue"><span className="awFieldNone">None</span></div>
              </div>
              {(parentItem || item?.parent_key) && (
                <div className="awFieldRow awFieldRowBorder">
                  <div className="awFieldLabel">Parent</div>
                  <div className="awFieldValue">
                    {parentItem && <JiraIssueTypeIcon type={parentItem.issue_type} size={14} />}
                    <span className="awParentLink">{parentItem?.issue_key ?? item?.parent_key}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="awTimestamps">
          {item?.jira_created_at && <div>Created {fmtDate(item.jira_created_at)}</div>}
          {item?.jira_updated_at && <div>Updated {fmtRel(item.jira_updated_at)}</div>}
        </div>

        {/* Configure button */}
        <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="awPill" style={{ fontSize: 12 }}>
            <Settings style={{ width: 12, height: 12 }} /> Configure
          </button>
        </div>
      </div>
    </div>
  );
}
