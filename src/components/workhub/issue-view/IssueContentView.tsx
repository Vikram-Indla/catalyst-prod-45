/**
 * IssueContentView — Jira-like single issue view:
 * Left side: breadcrumb, title, actions, description, subtasks, linked work, activity
 * Right side: collapsible Details sidebar (Assignee, Priority, Reporter, etc.)
 * Collapse button on the divider toggles the sidebar.
 */
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, Link2, ArrowRightLeft, MoreHorizontal, Pencil, Plus, MessageSquare, History as HistoryIcon, Clock, FileText, Send, Minus } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { useAuth } from '@/hooks/useAuth';
import type { AllWorkItem } from '@/types/allwork.types';
import { formatDistanceToNow, format } from 'date-fns';

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
}

const AVATAR_COLORS = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1'];
function avatarBg(name: string) { return AVATAR_COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]; }
function initials(name: string) { return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(); }
function fmtRel(d: string | null) { if (!d) return ''; try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return ''; } }
function fmtDate(d: string | null) { if (!d) return ''; try { return format(new Date(d), 'MMMM d, yyyy \'at\' h:mm a'); } catch { return ''; } }

function Avatar({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <div className="awFieldAvatar" style={{ width: size, height: size, background: avatarBg(name), fontSize: size * 0.4 }}>
      {initials(name)}
    </div>
  );
}

type ActivityTab = 'all' | 'comments' | 'history' | 'worklog';

export function IssueContentView({
  issueKey, item, parentItem, childItems = [], childrenLoading,
  links = [], linksLoading, comments = [], commentsLoading,
  historyItems = [], historyLoading, createComment, loading,
}: Props) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activityTab, setActivityTab] = useState<ActivityTab>('all');
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

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

  const doneCount = childItems.filter(c => (c.status_category ?? '').toLowerCase().includes('done')).length;
  const totalChildren = childItems.length || (item?.child_count ?? 0);
  const donePercent = totalChildren > 0 ? Math.round((doneCount / totalChildren) * 100) : 0;

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

  return (
    <div className="awIssueView">
      {/* ══ LEFT: Issue content ══ */}
      <div className="awIssueContent">
        {/* Header */}
        <div className="awIssueHeader">
          {/* Breadcrumb */}
          <div className="awBreadcrumb">
            {parentItem && <>
              <JiraIssueTypeIcon type={parentItem.issue_type} size={14} />
              <span className="awBreadcrumbLink">{parentItem.issue_key}</span>
              <span>/</span>
            </>}
            {item && <JiraIssueTypeIcon type={item.issue_type} size={14} />}
            <span>{issueKey}</span>
            {/* Prev/Next arrows */}
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
              <button className="awPill" style={{ padding: '0 4px', height: 22 }}>▲</button>
              <button className="awPill" style={{ padding: '0 4px', height: 22 }}>▼</button>
            </span>
          </div>

          {/* Title */}
          <div className="awIssueTitle">{item?.summary ?? 'Untitled'}</div>

          {/* Actions row */}
          <div className="awActions">
            {item && <StatusLozenge status={item.status} />}
            <button className="awPill"><Link2 style={{ width: 14, height: 14 }} /> Link</button>
            <button className="awPill"><ArrowRightLeft style={{ width: 14, height: 14 }} /> Move</button>
            <button className="awPill" style={{ marginLeft: 'auto' }}><MoreHorizontal style={{ width: 14, height: 14 }} /></button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="awBody">
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
                  <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {item.description_text}
                  </div>
                ) : (
                  <div style={{ color: 'var(--aw-text-subtle)', fontStyle: 'italic' }}>Add a description...</div>
                )}
              </div>
            )}
          </div>

          {/* ── Subtasks / Child work items ── */}
          {totalChildren > 0 && (
            <div className="awSection">
              <div className="awSectionHead" onClick={() => toggle('subtasks')}>
                <span className="awSectionLabel">
                  {collapsed.subtasks ? <ChevronRight style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
                  {item?.parent_key ? 'Subtasks' : 'Child work items'}
                  <span className="awCount">{totalChildren}</span>
                </span>
                <div className="awSectionActions">
                  <button className="awPill" style={{ height: 22 }}><Plus style={{ width: 12, height: 12 }} /></button>
                </div>
              </div>
              {!collapsed.subtasks && (
                <div className="awSectionBody">
                  <div className="awProgress">
                    <div className="awProgressBar"><div className="awProgressFill" style={{ width: `${donePercent}%` }} /></div>
                    <span className="awProgressText">{donePercent}% Done</span>
                  </div>
                  <table className="awSubtasksTable">
                    <thead><tr>
                      <th>Work</th><th>Priority</th><th>Assignee</th><th>Status</th>
                    </tr></thead>
                    <tbody>
                      {childItems.map(ch => (
                        <tr key={ch.issue_key}>
                          <td style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <JiraIssueTypeIcon type={ch.issue_type} size={14} />
                            <span style={{ color: 'var(--aw-blue)', fontWeight: 500, fontSize: 12 }}>{ch.issue_key}</span>
                            <span style={{ fontSize: 13 }}>{ch.summary}</span>
                          </td>
                          <td><span style={{ fontSize: 12 }}>{ch.priority}</span></td>
                          <td>{ch.assignee_display_name ? <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Avatar name={ch.assignee_display_name} size={18} /><span style={{ fontSize: 12 }}>{ch.assignee_display_name.split(' ').map(n=>n[0]).join('')}...</span></div> : <span style={{ color: 'var(--aw-text-subtle)', fontSize: 12 }}>—</span>}</td>
                          <td><StatusLozenge status={ch.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Linked work items ── */}
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
                      <span style={{ color: 'var(--aw-blue)', fontWeight: 500, fontSize: 12 }}>{link.target_key ?? link.source_key ?? ''}</span>
                      <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.target_summary ?? link.source_summary ?? ''}</span>
                      {(link.target_status ?? link.source_status) && <StatusLozenge status={link.target_status ?? link.source_status} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Activity ── */}
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
                {user && <Avatar name={user.email ?? 'You'} size={24} />}
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
        {/* Details section */}
        <div className="awDetailsSection">
          <div className="awDetailsSectionHead" onClick={() => toggle('details')}>
            {collapsed.details ? <ChevronRight style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
            Details
          </div>
          {!collapsed.details && (
            <div className="awDetailsSectionBody">
              <div className="awFieldRow">
                <div className="awFieldLabel">Assignee</div>
                <div className="awFieldValue">
                  {item?.assignee_display_name ? <>
                    <Avatar name={item.assignee_display_name} />
                    <span>{item.assignee_display_name}</span>
                  </> : <span className="awFieldNone">Unassigned</span>}
                </div>
              </div>
              {item?.assignee_display_name && (
                <div className="awFieldRow">
                  <div className="awFieldLabel" />
                  <div className="awFieldValue"><span style={{ color: 'var(--aw-blue)', fontSize: 12, cursor: 'pointer' }}>Assign to me</span></div>
                </div>
              )}
              <div className="awFieldRow">
                <div className="awFieldLabel">Priority</div>
                <div className="awFieldValue">
                  <svg width="14" height="14" viewBox="0 0 14 14"><rect y="4" width="14" height="2.5" rx="1" fill={item?.priority === 'Highest' ? '#EF4444' : item?.priority === 'High' ? '#F97316' : '#3B82F6'} /><rect y="8" width="14" height="2.5" rx="1" fill={item?.priority === 'Highest' ? '#EF4444' : item?.priority === 'High' ? '#F97316' : '#3B82F6'} /></svg>
                  <span>{item?.priority ?? 'None'}</span>
                </div>
              </div>
              <div className="awFieldRow">
                <div className="awFieldLabel">Reporter</div>
                <div className="awFieldValue">
                  {item?.reporter_name ? <>
                    <Avatar name={item.reporter_name} />
                    <span>{item.reporter_name}</span>
                  </> : <span className="awFieldNone">None</span>}
                </div>
              </div>
              <div className="awFieldRow">
                <div className="awFieldLabel">Labels</div>
                <div className="awFieldValue"><span className="awFieldNone">None</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Development */}
        <div className="awDetailsSection">
          <div className="awDetailsSectionHead" onClick={() => toggle('dev')}>
            {collapsed.dev ? <ChevronRight style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
            Development
          </div>
        </div>

        {/* More fields */}
        <div className="awDetailsSection">
          <div className="awDetailsSectionHead" onClick={() => toggle('more')}>
            {collapsed.more ? <ChevronRight style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
            More fields
            <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--aw-text-subtle)', marginLeft: 6 }}>Story Points, Fix versions</span>
          </div>
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
