/**
 * FieldsTab — Flat field/value viewer using awCard styles
 * Groups: Status & Priority, People, Hierarchy, Dates, Tracking
 * Avatars with initials, priority icons, proper date formatting.
 */
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import type { AllWorkItem } from '@/types/allwork.types';
import { format, formatDistanceToNow } from 'date-fns';

interface Props {
  issueKey: string;
  isDark: boolean;
  item?: AllWorkItem | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  Highest: 'var(--ds-text-danger, #EF4444)', High: '#F97316', Medium: 'var(--ds-text-brand, #3B82F6)', Low: 'var(--ds-text-success, #22C55E)', Lowest: '#8C8F96',
};
const AVATAR_COLORS = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1'];

function formatDate(d: string | null): string {
  if (!d) return 'None';
  try { return format(new Date(d), 'MMM d, yyyy h:mm a'); } catch { return 'None'; }
}
function formatRel(d: string | null): string {
  if (!d) return '';
  try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return ''; }
}

function Avatar({ name }: { name: string | null }) {
  if (!name) return <span style={{ color: 'var(--aw-text-subtle)', fontSize: 13 }}>Unassigned</span>;
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = AVATAR_COLORS[hash % AVATAR_COLORS.length];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%', background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color: 'var(--ds-surface, #fff)', flexShrink: 0,
      }}>{initials}</div>
      <span style={{ fontSize: 13, color: 'var(--aw-text)' }}>{name}</span>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 12px', minHeight: 32 }}>
      <span style={{ width: 120, flexShrink: 0, fontSize: 12, fontWeight: 500, color: 'var(--aw-text-subtle)' }}>
        {label}
      </span>
      <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--aw-text)' }}>
        {children}
      </div>
    </div>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="awCard">
      <div className="awCardHeader" style={{ cursor: 'default' }}>
        <div className="awCardHeaderTitle">{title}</div>
      </div>
      <div className="awCardBody" style={{ padding: '4px 0' }}>
        {children}
      </div>
    </div>
  );
}

function EmptyVal() {
  return <span style={{ color: 'var(--aw-text-subtle)', fontSize: 13 }}>None</span>;
}

export function FieldsTab({ issueKey, isDark, item }: Props) {
  if (!item) {
    return <div className="awEmpty" style={{ padding: 40 }}>No data available</div>;
  }

  const pc = PRIORITY_COLORS[item.priority] ?? '#8C8F96';

  return (
    <div style={{ padding: '10px 0' }}>
      {/* Status & Priority */}
      <FieldGroup title="Status & Priority">
        <FieldRow label="Issue Type">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <JiraIssueTypeIcon type={item.issue_type} size={16} />
            <span>{item.issue_type}</span>
          </div>
        </FieldRow>
        <FieldRow label="Status">
          <StatusLozenge status={item.status} />
        </FieldRow>
        <FieldRow label="Priority">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 14 14">
              <rect y="4" width="14" height="2.5" rx="1" fill={pc} />
              <rect y="8" width="14" height="2.5" rx="1" fill={pc} />
            </svg>
            <span>{item.priority}</span>
          </div>
        </FieldRow>
        {item.resolution && (
          <FieldRow label="Resolution"><span>{item.resolution}</span></FieldRow>
        )}
      </FieldGroup>

      {/* People */}
      <FieldGroup title="People">
        <FieldRow label="Assignee">
          <Avatar name={item.assignee_display_name} />
        </FieldRow>
        <FieldRow label="Reporter">
          <Avatar name={item.reporter_name} />
        </FieldRow>
      </FieldGroup>

      {/* Hierarchy */}
      <FieldGroup title="Hierarchy">
        <FieldRow label="Parent">
          {item.parent_key ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--aw-blue)', fontWeight: 600, fontSize: 12 }}>{item.parent_key}</span>
              {item.parent_summary && (
                <span style={{ color: 'var(--aw-text-subtle)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.parent_summary}
                </span>
              )}
            </div>
          ) : <EmptyVal />}
        </FieldRow>
      </FieldGroup>

      {/* Dates */}
      <FieldGroup title="Dates">
        <FieldRow label="Created">
          {item.jira_created_at ? (
            <div>
              <span>{formatDate(item.jira_created_at)}</span>
              <span style={{ color: 'var(--aw-text-subtle)', fontSize: 11, marginLeft: 6 }}>({formatRel(item.jira_created_at)})</span>
            </div>
          ) : <EmptyVal />}
        </FieldRow>
        <FieldRow label="Updated">
          {item.jira_updated_at ? (
            <div>
              <span>{formatDate(item.jira_updated_at)}</span>
              <span style={{ color: 'var(--aw-text-subtle)', fontSize: 11, marginLeft: 6 }}>({formatRel(item.jira_updated_at)})</span>
            </div>
          ) : <EmptyVal />}
        </FieldRow>
      </FieldGroup>

      {/* Tracking */}
      <FieldGroup title="Tracking">
        <FieldRow label="Story Points">
          {item.story_points != null ? <span>{item.story_points}</span> : <EmptyVal />}
        </FieldRow>
        <FieldRow label="Sprint">
          {item.sprint_name ? <span>{item.sprint_name}</span> : <EmptyVal />}
        </FieldRow>
        <FieldRow label="Fix Version">
          {item.fix_version_name ? <span>{item.fix_version_name}</span> : <EmptyVal />}
        </FieldRow>
        <FieldRow label="Labels">
          {item.labels.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {item.labels.map(l => (
                <span key={l} style={{
                  display: 'inline-flex', padding: '2px 8px', borderRadius: 4,
                  fontSize: 11, fontWeight: 500,
                  background: 'var(--aw-hover)', color: 'var(--aw-text)',
                }}>{l}</span>
              ))}
            </div>
          ) : <EmptyVal />}
        </FieldRow>
        <FieldRow label="Attachments">
          {item.attachment_count > 0 ? <span>{item.attachment_count} file{item.attachment_count > 1 ? 's' : ''}</span> : <EmptyVal />}
        </FieldRow>
        <FieldRow label="Comments">
          {item.comment_count > 0 ? <span>{item.comment_count}</span> : <EmptyVal />}
        </FieldRow>
      </FieldGroup>
    </div>
  );
}
