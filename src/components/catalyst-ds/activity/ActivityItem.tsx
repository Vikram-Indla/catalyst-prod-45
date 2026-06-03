import * as React from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight } from '@/lib/atlaskit-icons';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import type { CdsActivityItem, CdsAppearance } from '../types';
import { Lozenge } from '../status/Lozenge';
import { renderJiraContent, normalizeJiraText, type JiraUserMap } from '../utils/jiraContent';

function formatAbsoluteDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return (
    d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  );
}

function formatFieldName(field: string): string {
  return field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDisplayValue(value: string | null): string {
  if (value === null || value === 'null' || value === '') return 'None';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    try {
      return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      // fall through
    }
  }
  return value;
}

function statusAppearance(value: string | null): CdsAppearance | undefined {
  if (!value) return undefined;
  const v = value.toLowerCase().replace(/[_\s]/g, '');
  if (['done', 'approved', 'completed', 'closed', 'resolved'].includes(v)) return 'success';
  if (['inprogress', 'inreview', 'analyse', 'implement', 'readytoimpl'].includes(v)) return 'inprogress';
  if (['rejected', 'cancelled'].includes(v)) return 'danger';
  if (['onhold'].includes(v)) return 'warning';
  return 'default';
}

const RICH_TEXT_FIELDS = new Set(['description', 'summary', 'comment', 'title']);
const STATUS_FIELDS = new Set(['process_step', 'status', 'health']);

export interface ActivityItemProps {
  item: CdsActivityItem;
  jiraUserMap?: JiraUserMap;
  showTypeBadge?: boolean;
  className?: string;
}

function ActivityItemDisplay({ item, jiraUserMap, showTypeBadge = false, className }: ActivityItemProps) {
  const { type, actor, timestamp, fieldChange, description } = item;

  const fieldKey = fieldChange ? fieldChange.field.toLowerCase().replace(/\s/g, '_') : '';
  const isStatus = STATUS_FIELDS.has(fieldKey);
  const isRich =
    RICH_TEXT_FIELDS.has(fieldKey) ||
    (fieldChange &&
      ((fieldChange.oldValue?.length ?? 0) > 80 || (fieldChange.newValue?.length ?? 0) > 80));

  return (
    <div className={cn('flex gap-3 py-4', className)}>
      {/* Avatar only — no colored action-type circles */}
      <span className="shrink-0">
        <CatalystAvatar size="medium" name={actor.name} src={actor.avatarUrl} />
      </span>

      <div className="flex-1 min-w-0">
        {/* Author + action line */}
        <div className="flex items-baseline gap-1 flex-wrap">
          <span className="text-[14px] font-semibold text-[var(--ds-text,#172B4D)] dark:text-[var(--ds-text,#EDEDED)]">
            {actor.name}
          </span>

          {type === 'create' && (
            <span className="text-[14px] text-[var(--ds-text,#172B4D)] dark:text-[var(--ds-text,#EDEDED)] font-normal">
              {description || 'created this item'}
            </span>
          )}

          {type === 'update' && fieldChange && (
            <span className="text-[14px] text-[var(--ds-text,#172B4D)] dark:text-[var(--ds-text,#EDEDED)] font-normal">
              changed the{' '}
              <span className="font-semibold">
                {formatFieldName(fieldChange.field)}
              </span>
            </span>
          )}

          {type === 'delete' && (
            <span className="text-[14px] text-[var(--ds-text,#172B4D)] dark:text-[var(--ds-text,#EDEDED)] font-normal">
              {description || 'deleted this item'}
            </span>
          )}
        </div>

        {/* Date — absolute format */}
        <div className="text-[12px] text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#878787)] mt-0.5">
          {formatAbsoluteDate(timestamp)}
        </div>

        {/* Type badge — shown in "All" tab to distinguish history from comments */}
        {showTypeBadge && (
          <div className="mt-2">
            <Lozenge appearance="default" isBold={false}>
              HISTORY
            </Lozenge>
          </div>
        )}

        {/* Field change content */}
        {type === 'update' && fieldChange && (
          <div className="mt-2">
            {isStatus ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-flex items-center rounded-[3px] border border-[var(--ds-border,#DFE1E6)] bg-[var(--ds-background-neutral,#F4F5F7)] dark:bg-[var(--ds-surface-raised,#2E2E2E)] dark:border-[var(--ds-border,#454545)] px-2 py-0.5 text-[12px] font-bold uppercase text-[var(--ds-text,#172B4D)] dark:text-[var(--ds-text,#EDEDED)] whitespace-nowrap"
                >
                  {formatDisplayValue(fieldChange.oldValue)}
                </span>
                <span className="text-[14px] text-[var(--ds-text-subtlest,#6B778C)]">→</span>
                <span
                  className="inline-flex items-center rounded-[3px] border border-[var(--ds-border,#DFE1E6)] bg-[var(--ds-background-neutral,#F4F5F7)] dark:bg-[var(--ds-surface-raised,#2E2E2E)] dark:border-[var(--ds-border,#454545)] px-2 py-0.5 text-[12px] font-bold uppercase text-[var(--ds-text,#172B4D)] dark:text-[var(--ds-text,#EDEDED)] whitespace-nowrap"
                >
                  {formatDisplayValue(fieldChange.newValue)}
                </span>
              </div>
            ) : isRich ? (
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
                <div className="text-[13px] text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#A1A1A1)] whitespace-pre-wrap break-words">
                  {fieldChange.oldValue
                    ? renderJiraContent(fieldChange.oldValue, { userMap: jiraUserMap })
                    : <span className="italic">None</span>}
                </div>
                <ArrowRight className="h-3 w-3 text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#878787)] shrink-0 mt-1.5" />
                <div className="text-[13px] text-[var(--ds-text,#172B4D)] dark:text-[var(--ds-text,#EDEDED)] whitespace-pre-wrap break-words">
                  {fieldChange.newValue
                    ? renderJiraContent(fieldChange.newValue, { userMap: jiraUserMap })
                    : <span className="italic text-[var(--ds-text-subtlest,#6B778C)]">None</span>}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#A1A1A1)] line-through">
                  {normalizeJiraText(fieldChange.oldValue, { userMap: jiraUserMap }) || 'None'}
                </span>
                <ArrowRight className="h-3 w-3 text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#878787)] shrink-0" />
                <span className="text-[13px] font-medium text-[var(--ds-text,#172B4D)] dark:text-[var(--ds-text,#EDEDED)]">
                  {normalizeJiraText(fieldChange.newValue, { userMap: jiraUserMap }) || 'None'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { ActivityItemDisplay as ActivityItem };
