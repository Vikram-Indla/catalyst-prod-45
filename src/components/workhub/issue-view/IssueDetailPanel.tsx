/**
 * IssueDetailPanel — Right panel showing selected issue details
 * Sections: Details (Assignee, Priority, Reporter), Development, More fields
 * Header: key + summary + status actions + close button
 */
import { useState } from 'react';
import { ChevronDown, ChevronRight, X, Link2, ArrowRightLeft, ExternalLink, MoreHorizontal } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import type { AllWorkItem } from '@/types/allwork.types';
import { formatDistanceToNow, format } from 'date-fns';

interface Props {
  item?: AllWorkItem | null;
  parentItem?: AllWorkItem | null;
  onClose: () => void;
}

const AVATAR_COLORS = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1'];
function avatarBg(name: string) { return AVATAR_COLORS[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length]; }
function initials(name: string) { return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(); }
function fmtRel(d: string | null) { if (!d) return ''; try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return ''; } }
function fmtDate(d: string | null) { if (!d) return ''; try { return format(new Date(d), 'MMMM d, yyyy \'at\' h:mm a'); } catch { return ''; } }

const PRIORITY_COLORS: Record<string, string> = {
  Highest: '#EF4444', High: '#F97316', Medium: '#3B82F6', Low: '#22C55E', Lowest: '#8C8F96',
};

function Avatar({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <span className="allwork-avatar" style={{ width: size, height: size, background: avatarBg(name), fontSize: size * 0.4 }}>
      {initials(name)}
    </span>
  );
}

export function IssueDetailPanel({ item, parentItem, onClose }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ development: true, more: true });
  const toggle = (id: string) => setCollapsed(s => ({ ...s, [id]: !s[id] }));

  if (!item) {
    return (
      <div className="allwork-right">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b778c', fontSize: 13 }}>
          Select an issue
        </div>
      </div>
    );
  }

  const pc = PRIORITY_COLORS[item.priority] ?? '#8C8F96';

  return (
    <div className="allwork-right">
      {/* ── Header ── */}
      <div className="allwork-right-header">
        <div className="allwork-right-keyline">
          <JiraIssueTypeIcon issueType={item.issue_type} size={16} />
          <span className="allwork-right-key">{item.issue_key}</span>
          <div className="allwork-right-actions">
            <button className="allwork-toolbar-button" style={{ padding: '2px 6px' }}>
              <ExternalLink style={{ width: 14, height: 14 }} />
            </button>
            <button className="allwork-toolbar-button" style={{ padding: '2px 6px' }} onClick={onClose}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
        <div className="allwork-right-summary">{item.summary}</div>
        <div className="allwork-right-action-row">
          <StatusLozenge status={item.status} />
          <button className="allwork-toolbar-button"><Link2 style={{ width: 12, height: 12 }} /> Link</button>
          <button className="allwork-toolbar-button"><ArrowRightLeft style={{ width: 12, height: 12 }} /> Move</button>
          <button className="allwork-toolbar-button" style={{ marginLeft: 'auto', padding: '2px 6px' }}>
            <MoreHorizontal style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="allwork-right-body">
        {/* Details section */}
        <div className="allwork-right-section">
          <div className="allwork-right-section-head" onClick={() => toggle('details')}>
            {collapsed.details ? <ChevronRight /> : <ChevronDown />}
            Details
          </div>
          {!collapsed.details && (
            <div className="allwork-right-section-body">
              {/* Assignee */}
              <div className="allwork-field-row">
                <div className="allwork-field-label">Assignee</div>
                <div className="allwork-field-value">
                  {item.assignee_display_name ? <>
                    <Avatar name={item.assignee_display_name} />
                    <span>{item.assignee_display_name}</span>
                  </> : <span className="allwork-field-none">Unassigned</span>}
                </div>
              </div>
              {item.assignee_display_name && (
                <div className="allwork-field-row">
                  <div className="allwork-field-label" />
                  <div className="allwork-field-value">
                    <span className="allwork-field-link">Assign to me</span>
                  </div>
                </div>
              )}

              {/* Priority */}
              <div className="allwork-field-row">
                <div className="allwork-field-label">Priority</div>
                <div className="allwork-field-value">
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <rect y="4" width="14" height="2.5" rx="1" fill={pc} />
                    <rect y="8" width="14" height="2.5" rx="1" fill={pc} />
                  </svg>
                  <span>{item.priority}</span>
                </div>
              </div>

              {/* Reporter */}
              <div className="allwork-field-row">
                <div className="allwork-field-label">Reporter</div>
                <div className="allwork-field-value">
                  {item.reporter_name ? <>
                    <Avatar name={item.reporter_name} />
                    <span>{item.reporter_name}</span>
                  </> : <span className="allwork-field-none">None</span>}
                </div>
              </div>

              {/* Labels */}
              <div className="allwork-field-row">
                <div className="allwork-field-label">Labels</div>
                <div className="allwork-field-value">
                  {item.labels?.length ? (
                    <span>{item.labels.join(', ')}</span>
                  ) : <span className="allwork-field-none">None</span>}
                </div>
              </div>

              {/* Parent */}
              {item.parent_key && (
                <div className="allwork-field-row">
                  <div className="allwork-field-label">Parent</div>
                  <div className="allwork-field-value">
                    <span className="allwork-field-link">{item.parent_key}</span>
                    {item.parent_summary && <span style={{ color: '#6b778c', fontSize: 12 }}>{item.parent_summary}</span>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Development section */}
        <div className="allwork-right-section">
          <div className="allwork-right-section-head" onClick={() => toggle('development')}>
            {collapsed.development ? <ChevronRight /> : <ChevronDown />}
            Development
          </div>
          {!collapsed.development && (
            <div className="allwork-right-section-body">
              <span style={{ color: '#6b778c', fontSize: 12 }}>No development activity</span>
            </div>
          )}
        </div>

        {/* More fields section */}
        <div className="allwork-right-section">
          <div className="allwork-right-section-head" onClick={() => toggle('more')}>
            {collapsed.more ? <ChevronRight /> : <ChevronDown />}
            More fields
            <span className="allwork-right-section-meta">Story Points, Fix versions</span>
          </div>
          {!collapsed.more && (
            <div className="allwork-right-section-body">
              <div className="allwork-field-row">
                <div className="allwork-field-label">Story Points</div>
                <div className="allwork-field-value">
                  {item.story_points != null ? <span>{item.story_points}</span> : <span className="allwork-field-none">None</span>}
                </div>
              </div>
              <div className="allwork-field-row">
                <div className="allwork-field-label">Fix Version</div>
                <div className="allwork-field-value">
                  {item.fix_version_name ? <span>{item.fix_version_name}</span> : <span className="allwork-field-none">None</span>}
                </div>
              </div>
              <div className="allwork-field-row">
                <div className="allwork-field-label">Sprint</div>
                <div className="allwork-field-value">
                  {item.sprint_name ? <span>{item.sprint_name}</span> : <span className="allwork-field-none">None</span>}
                </div>
              </div>
              <div className="allwork-field-row">
                <div className="allwork-field-label">Resolution</div>
                <div className="allwork-field-value">
                  {item.resolution ? <span>{item.resolution}</span> : <span className="allwork-field-none">None</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="allwork-timestamps">
          {item.jira_created_at && <div>Created {fmtDate(item.jira_created_at)}</div>}
          {item.jira_updated_at && <div>Updated {fmtRel(item.jira_updated_at)}</div>}
        </div>
      </div>
    </div>
  );
}
