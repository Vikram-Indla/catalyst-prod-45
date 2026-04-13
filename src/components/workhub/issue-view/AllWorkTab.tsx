/**
 * AllWorkTab — Summary card + Hierarchy / Related issues / Activity section cards
 * Uses awCard/awCardHeader/awCardBody classes from allwork.css
 */
import { useState, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronRight, Link2, Send } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import { useAuth } from '@/hooks/useAuth';
import type { AllWorkItem } from '@/types/allwork.types';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  issueKey: string;
  isDark: boolean;
  item?: AllWorkItem | null;
  parentItem?: AllWorkItem | null;
  children?: AllWorkItem[];
  childrenLoading?: boolean;
  links?: any[];
  linksLoading?: boolean;
  comments?: any[];
  commentsLoading?: boolean;
  history?: any[];
  historyLoading?: boolean;
  createComment?: any;
}

interface Sections { hierarchy: boolean; links: boolean; activity: boolean }

function loadCollapsed(key: string): Sections {
  try { const r = localStorage.getItem(`allwork.collapsed.${key}`); if (r) return JSON.parse(r); } catch {}
  return { hierarchy: true, links: true, activity: true };
}

function formatRel(d: string | null): string {
  if (!d) return '';
  try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return ''; }
}

export function AllWorkTab({
  issueKey, isDark, item, parentItem,
  children: childItems = [], childrenLoading = false,
  links = [], linksLoading = false,
  comments = [], commentsLoading = false,
  history = [], historyLoading = false,
  createComment,
}: Props) {
  const { user } = useAuth();
  const [sections, setSections] = useState<Sections>(() => loadCollapsed(issueKey));
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'all' | 'comments' | 'history'>('all');

  useEffect(() => { setSections(loadCollapsed(issueKey)); }, [issueKey]);
  useEffect(() => {
    try { localStorage.setItem(`allwork.collapsed.${issueKey}`, JSON.stringify(sections)); } catch {}
  }, [issueKey, sections]);

  const toggle = (k: keyof Sections) => setSections(s => ({ ...s, [k]: !s[k] }));

  const hierarchyCount = (item?.parent_key ? 1 : 0) + (childItems.length || item?.child_count || 0);
  const linksCount = links?.length ?? 0;
  const activityCount = (comments?.length ?? 0) + (history?.length ?? 0);

  const handleComment = useCallback(async () => {
    if (!commentText.trim() || !createComment) return;
    setPosting(true);
    try {
      await createComment.mutateAsync({ body: commentText.trim(), authorId: user?.id ?? '' });
      setCommentText('');
    } catch {} finally { setPosting(false); }
  }, [commentText, createComment, user]);

  return (
    <div style={{ padding: 0 }}>
      {/* ── Summary card ── */}
      <div className="awRightSummary">
        <div className="awRightSummaryRow">
          {item && <JiraIssueTypeIcon issueType={item.issue_type} size={16} />}
          <span className="awRightKey">{issueKey}</span>
          <span className="awRightSummaryText">{item?.summary ?? 'Loading...'}</span>
        </div>
        <div className="awMetrics">
          <span>Hierarchy: {hierarchyCount}</span>
          <span><Link2 style={{ width: 12, height: 12, display: 'inline', verticalAlign: -2 }} /> Links: {linksCount}</span>
          <span>Activity: {activityCount}</span>
        </div>
      </div>

      {/* ── HIERARCHY card ── */}
      <div className="awCard">
        <div className="awCardHeader" onClick={() => toggle('hierarchy')}>
          <div className="awCardHeaderTitle">
            {sections.hierarchy ? <ChevronDown style={{ width: 14, height: 14, display: 'inline', verticalAlign: -2, marginRight: 4 }} /> : <ChevronRight style={{ width: 14, height: 14, display: 'inline', verticalAlign: -2, marginRight: 4 }} />}
            Hierarchy {hierarchyCount > 0 && <span style={{ fontWeight: 400, marginLeft: 4 }}>{hierarchyCount}</span>}
          </div>
        </div>
        {sections.hierarchy && (
          <div className="awCardBody">
            {item?.parent_key ? (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--aw-text-subtle)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Parent</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {parentItem && <JiraIssueTypeIcon issueType={parentItem.issue_type} size={14} />}
                  <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--aw-text-subtle)' }}>{item.parent_key}</span>
                  <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.parent_summary ?? parentItem?.summary ?? ''}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--aw-text-subtle)', marginLeft: 'auto', flexShrink: 0 }}>parent</span>
                </div>
              </div>
            ) : (
              <div className="awEmpty">No hierarchy items</div>
            )}
            {childItems.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--aw-text-subtle)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                  Children ({childItems.length})
                </div>
                {childItems.map(ch => (
                  <div key={ch.issue_key} className="awRow" style={{ padding: '6px 4px', borderLeft: 'none' }}>
                    <JiraIssueTypeIcon issueType={ch.issue_type} size={14} />
                    <div className="awRowMain">
                      <div className="awRowTop">
                        <span className="awKey">{ch.issue_key}</span>
                        <StatusLozenge status={ch.status} />
                      </div>
                      <div className="awSummary" style={{ WebkitLineClamp: 1 }}>{ch.summary}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── RELATED ISSUES card ── */}
      <div className="awCard">
        <div className="awCardHeader" onClick={() => toggle('links')}>
          <div className="awCardHeaderTitle">
            {sections.links ? <ChevronDown style={{ width: 14, height: 14, display: 'inline', verticalAlign: -2, marginRight: 4 }} /> : <ChevronRight style={{ width: 14, height: 14, display: 'inline', verticalAlign: -2, marginRight: 4 }} />}
            Related issues {linksCount > 0 && <span style={{ fontWeight: 400, marginLeft: 4 }}>{linksCount}</span>}
          </div>
        </div>
        {sections.links && (
          <div className="awCardBody">
            {linksCount === 0 ? (
              <>
                <div className="awEmpty">No related issues</div>
                <span className="awLinkCta"><Link2 style={{ width: 13, height: 13, display: 'inline', verticalAlign: -2, marginRight: 4 }} />Link issue</span>
              </>
            ) : (
              links.map((link: any, i: number) => (
                <div key={link.id ?? i} className="awRow" style={{ padding: '6px 4px', borderLeft: 'none' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--aw-text-subtle)' }}>
                    {link.link_type_name ?? 'Link'}
                  </span>
                  <span className="awKey">{link.target_key ?? link.source_key ?? ''}</span>
                  <span className="awSummary" style={{ flex: 1 }}>{link.target_summary ?? link.source_summary ?? ''}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── ACTIVITY card ── */}
      <div className="awCard">
        <div className="awCardHeader" onClick={() => toggle('activity')}>
          <div className="awCardHeaderTitle">
            {sections.activity ? <ChevronDown style={{ width: 14, height: 14, display: 'inline', verticalAlign: -2, marginRight: 4 }} /> : <ChevronRight style={{ width: 14, height: 14, display: 'inline', verticalAlign: -2, marginRight: 4 }} />}
            Activity {activityCount > 0 && <span style={{ fontWeight: 400, marginLeft: 4 }}>{activityCount}</span>}
          </div>
        </div>
        {sections.activity && (
          <div className="awCardBody">
            {/* Filters */}
            <div className="awActivityFilters">
              {(['all', 'comments', 'history'] as const).map(f => (
                <button key={f} className={`awFilterPill ${activityFilter === f ? 'awFilterPillActive' : ''}`} onClick={() => setActivityFilter(f)}>
                  {f === 'all' ? 'All' : f === 'comments' ? 'Comments' : 'History'}
                </button>
              ))}
            </div>

            {/* Comment input */}
            <div className="awCommentRow">
              <input
                className="awCommentInput"
                placeholder="Add a comment..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleComment(); }}
                disabled={posting}
              />
              <button
                className="awSendBtn"
                onClick={handleComment}
                disabled={posting || !commentText.trim()}
                aria-label="Send"
              >
                <Send style={{ width: 14, height: 14 }} />
              </button>
            </div>

            {/* Items */}
            {activityCount === 0 ? (
              <div className="awEmpty" style={{ marginTop: 12 }}>No activity yet</div>
            ) : (
              <div style={{ marginTop: 10 }}>
                {(activityFilter === 'all' || activityFilter === 'comments') && comments.map((c: any, i: number) => (
                  <div key={c.id ?? `c-${i}`} style={{ padding: '8px 0', borderBottom: '1px solid var(--aw-border)', fontSize: 13 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                      <strong style={{ fontSize: 12 }}>{c._author_name ?? c.author_name ?? 'Unknown'}</strong>
                      <span style={{ fontSize: 11, color: 'var(--aw-text-subtle)' }}>{formatRel(c.created_at)}</span>
                    </div>
                    <div style={{ marginTop: 4 }}>{c.body ?? ''}</div>
                  </div>
                ))}
                {(activityFilter === 'all' || activityFilter === 'history') && history.map((h: any, i: number) => (
                  <div key={h.id ?? `h-${i}`} style={{ padding: '8px 0', borderBottom: '1px solid var(--aw-border)', fontSize: 12, color: 'var(--aw-text-subtle)' }}>
                    <strong>{h._author_name ?? 'System'}</strong> changed <strong>{h.field_name ?? ''}</strong>
                    {h.old_display ?? h.old_value ? <> from <s>{h.old_display ?? h.old_value}</s></> : null}
                    {h.new_display ?? h.new_value ? <> to <strong style={{ color: 'var(--aw-text)' }}>{h.new_display ?? h.new_value}</strong></> : null}
                    <span style={{ marginLeft: 8, fontSize: 11 }}>{formatRel(h.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
