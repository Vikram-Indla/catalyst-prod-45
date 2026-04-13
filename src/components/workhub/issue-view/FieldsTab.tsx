/**
 * FieldsTab — "Fields" tab: grouped field/value editor viewer
 * ════════════════════════════════════════════════════════════════════════════
 * Groups: Status & Priority, People, Hierarchy, Dates, Tracking/Meta, Development
 */
import { cn } from '@/lib/utils';
import {
  ChevronDown, User, Calendar, Hash, FileText,
  GitBranch, Tag, Eye, ThumbsUp,
} from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import type { AllWorkItem } from '@/types/allwork.types';
import { formatDistanceToNow, format } from 'date-fns';

interface FieldsTabProps {
  issueKey: string;
  isDark: boolean;
  item?: AllWorkItem | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  Highest: '#EF4444',
  High: '#F97316',
  Medium: '#3B82F6',
  Low: '#22C55E',
  Lowest: '#8C8F96',
};

function formatDate(date: string | null): string {
  if (!date) return 'None';
  try {
    return format(new Date(date), 'MMM d, yyyy h:mm a');
  } catch {
    return 'None';
  }
}

function formatRelative(date: string | null): string {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '';
  }
}

function FieldGroup({
  title,
  isDark,
  children,
}: {
  title: string;
  isDark: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <h4 className={cn(
        'font-body text-xs font-semibold uppercase tracking-wide px-4 py-2',
        isDark ? 'text-[#878787]' : 'text-[#6B6E76]',
      )}>
        {title}
      </h4>
      <div>{children}</div>
    </div>
  );
}

function FieldRow({
  label,
  isDark,
  children,
}: {
  label: string;
  isDark: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(
      'flex items-center gap-5 px-4 py-2 min-h-[36px]',
      'hover:bg-opacity-5',
      isDark ? 'hover:bg-white' : 'hover:bg-black',
    )}>
      <span className={cn(
        'font-body text-sm font-medium w-[140px] shrink-0',
        isDark ? 'text-[#A1A1A1]' : 'text-[#505258]',
      )}>
        {label}
      </span>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}

function FieldValue({
  value,
  isDark,
  isEmpty,
}: {
  value: string;
  isDark: boolean;
  isEmpty?: boolean;
}) {
  return (
    <span className={cn(
      'font-body text-sm',
      isEmpty
        ? isDark ? 'text-[#878787]' : 'text-[#6B6E76]'
        : isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]',
    )}>
      {value}
    </span>
  );
}

function AvatarName({
  name,
  isDark,
}: {
  name: string | null;
  isDark: boolean;
}) {
  if (!name) return <FieldValue value="Unassigned" isDark={isDark} isEmpty />;

  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const hashCode = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const colors = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1'];
  const bg = colors[hashCode % colors.length];

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
        style={{ backgroundColor: bg }}
      >
        {initials}
      </div>
      <span className={cn('font-body text-sm', isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]')}>
        {name}
      </span>
    </div>
  );
}

export function FieldsTab({ issueKey, isDark, item }: FieldsTabProps) {
  if (!item) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className={cn('font-body text-sm', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
          No data available
        </p>
      </div>
    );
  }

  const priorityColor = PRIORITY_COLORS[item.priority] ?? '#8C8F96';

  return (
    <div className="py-2">
      {/* ─── Status & Priority ─── */}
      <FieldGroup title="Status & Priority" isDark={isDark}>
        <FieldRow label="Issue Type" isDark={isDark}>
          <div className="flex items-center gap-2">
            <JiraIssueTypeIcon issueType={item.issue_type} size={16} />
            <FieldValue value={item.issue_type} isDark={isDark} />
          </div>
        </FieldRow>
        <FieldRow label="Status" isDark={isDark}>
          <StatusLozenge status={item.status} />
        </FieldRow>
        <FieldRow label="Priority" isDark={isDark}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 12 12">
                <rect y="3" width="12" height="2" rx="1" fill={priorityColor} />
                <rect y="7" width="12" height="2" rx="1" fill={priorityColor} />
              </svg>
            </div>
            <FieldValue value={item.priority} isDark={isDark} />
          </div>
        </FieldRow>
        {item.resolution && (
          <FieldRow label="Resolution" isDark={isDark}>
            <FieldValue value={item.resolution} isDark={isDark} />
          </FieldRow>
        )}
      </FieldGroup>

      {/* ─── People ─── */}
      <FieldGroup title="People" isDark={isDark}>
        <FieldRow label="Assignee" isDark={isDark}>
          <AvatarName name={item.assignee_display_name} isDark={isDark} />
        </FieldRow>
        <FieldRow label="Reporter" isDark={isDark}>
          <AvatarName name={item.reporter_name} isDark={isDark} />
        </FieldRow>
      </FieldGroup>

      {/* ─── Hierarchy ─── */}
      <FieldGroup title="Hierarchy" isDark={isDark}>
        <FieldRow label="Parent" isDark={isDark}>
          {item.parent_key ? (
            <div className="flex items-center gap-2">
              <span className={cn('font-mono text-xs', isDark ? 'text-[#0C66E4]' : 'text-[#0C66E4]')}>
                {item.parent_key}
              </span>
              {item.parent_summary && (
                <span className={cn(
                  'font-body text-sm truncate',
                  isDark ? 'text-[#A1A1A1]' : 'text-[#505258]',
                )}>
                  {item.parent_summary}
                </span>
              )}
            </div>
          ) : (
            <FieldValue value="None" isDark={isDark} isEmpty />
          )}
        </FieldRow>
      </FieldGroup>

      {/* ─── Dates ─── */}
      <FieldGroup title="Dates" isDark={isDark}>
        <FieldRow label="Created" isDark={isDark}>
          <div className="flex items-center gap-2">
            <FieldValue value={formatDate(item.jira_created_at)} isDark={isDark} isEmpty={!item.jira_created_at} />
            {item.jira_created_at && (
              <span className={cn('font-body text-xs', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
                ({formatRelative(item.jira_created_at)})
              </span>
            )}
          </div>
        </FieldRow>
        <FieldRow label="Updated" isDark={isDark}>
          <div className="flex items-center gap-2">
            <FieldValue value={formatDate(item.jira_updated_at)} isDark={isDark} isEmpty={!item.jira_updated_at} />
            {item.jira_updated_at && (
              <span className={cn('font-body text-xs', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
                ({formatRelative(item.jira_updated_at)})
              </span>
            )}
          </div>
        </FieldRow>
      </FieldGroup>

      {/* ─── Tracking / Meta ─── */}
      <FieldGroup title="Tracking" isDark={isDark}>
        <FieldRow label="Story Points" isDark={isDark}>
          <FieldValue
            value={item.story_points != null ? String(item.story_points) : 'None'}
            isDark={isDark}
            isEmpty={item.story_points == null}
          />
        </FieldRow>
        <FieldRow label="Sprint" isDark={isDark}>
          <FieldValue
            value={item.sprint_name ?? 'None'}
            isDark={isDark}
            isEmpty={!item.sprint_name}
          />
        </FieldRow>
        <FieldRow label="Fix Version" isDark={isDark}>
          <FieldValue
            value={item.fix_version_name ?? 'None'}
            isDark={isDark}
            isEmpty={!item.fix_version_name}
          />
        </FieldRow>
        <FieldRow label="Labels" isDark={isDark}>
          {item.labels.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {item.labels.map((label) => (
                <span
                  key={label}
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-body font-medium',
                    isDark ? 'bg-[#292929] text-[#EDEDED]' : 'bg-[#F4F5F7] text-[#292A2E]',
                  )}
                >
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <FieldValue value="None" isDark={isDark} isEmpty />
          )}
        </FieldRow>
        {item.rank && (
          <FieldRow label="Rank" isDark={isDark}>
            <span className={cn('font-mono text-xs', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
              {item.rank}
            </span>
          </FieldRow>
        )}
      </FieldGroup>

      {/* ─── Development ─── */}
      <FieldGroup title="Development" isDark={isDark}>
        <FieldRow label="Attachments" isDark={isDark}>
          <FieldValue
            value={item.attachment_count > 0 ? `${item.attachment_count} file${item.attachment_count > 1 ? 's' : ''}` : 'None'}
            isDark={isDark}
            isEmpty={item.attachment_count === 0}
          />
        </FieldRow>
        <FieldRow label="Comments" isDark={isDark}>
          <FieldValue
            value={item.comment_count > 0 ? String(item.comment_count) : 'None'}
            isDark={isDark}
            isEmpty={item.comment_count === 0}
          />
        </FieldRow>
      </FieldGroup>
    </div>
  );
}
