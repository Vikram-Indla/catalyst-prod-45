import * as React from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight } from '@/lib/atlaskit-icons';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import type { CdsActivityItem, CdsAppearance } from '../types';
import { Lozenge } from '../status/Lozenge';
import { renderJiraContent, normalizeJiraText, type JiraUserMap } from '../utils/jiraContent';
import { TicketLinkCard } from '@/components/shared/TicketLinkCard';
import { HistoryPill } from './JiraActivityRow';
import { PriorityIcon } from '@/components/icons/PriorityIcon';
import { WorkItemTypeIcon } from '@/components/icons/WorkItemTypeIcon';
import { resolveAvatarUrl } from '@/lib/avatars';

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
const STATUS_FIELDS = new Set(['process_step', 'status', 'health', 'severity', 'resolution']);
// User-type field changes render as Avatar + name on each side of the
// diff arrow. Includes BR-specific labels (Delivery Manager, Product
// Owner) — both store profile UUIDs and are pre-resolved to display
// names by the BR section's audit query before reaching this renderer.
const USER_FIELDS = new Set([
  'assignee',
  'reporter',
  'delivery_manager',
  'product_owner',
]);
const PRIORITY_FIELDS = new Set(['priority']);
const TICKET_LINK_FIELDS = new Set(['parent', 'parent_link', 'epic_link', 'epic_child', 'link']);

const TICKET_KEY_RE = /\b([A-Z][A-Z0-9]{0,9}-\d+)\b/;

function PriorityChip({ value }: { value: string }) {
  // Use the canonical PriorityIcon (same SVG family as the priority
  // dropdown picker in the right rail) so the diff payload matches
  // the field's regular display.
  return (
    <span className="inline-flex items-center gap-1.5">
      <PriorityIcon level={value} size={14} />
      <span>{value}</span>
    </span>
  );
}

function TicketLinkSide({ value }: { value: string | null }) {
  if (!value) {
    return <span className="italic text-[var(--ds-text-subtlest,#6B778C)]">None</span>;
  }
  const m = TICKET_KEY_RE.exec(value);
  if (m) return <TicketLinkCard issueKey={m[1]} />;
  return <span>{value}</span>;
}

export interface ActivityItemProps {
  item: CdsActivityItem;
  jiraUserMap?: JiraUserMap;
  showTypeBadge?: boolean;
  className?: string;
}

function ActivityItemDisplay({ item, jiraUserMap, showTypeBadge = false, className }: ActivityItemProps) {
  const { type, actor, timestamp, fieldChange, description, standupContext } = item;

  const fieldKey = fieldChange ? fieldChange.field.toLowerCase().replace(/\s/g, '_') : '';
  const isStatus = STATUS_FIELDS.has(fieldKey);
  const isUser = USER_FIELDS.has(fieldKey);
  const isPriority = PRIORITY_FIELDS.has(fieldKey);
  const isTicketLink = TICKET_LINK_FIELDS.has(fieldKey);
  const isRich =
    RICH_TEXT_FIELDS.has(fieldKey) ||
    (fieldChange &&
      !isUser && !isPriority && !isTicketLink &&
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

        {/* Date — absolute format. When the row was emitted during a
            standup, append a small "during standup" link back to the
            standup detail page (Phase 7b). */}
        <div className="text-[12px] text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#878787)] mt-0.5 inline-flex items-center gap-2 flex-wrap">
          <span>{formatAbsoluteDate(timestamp)}</span>
          {standupContext && (
            <a
              href={standupContext.href}
              onClick={(e) => { e.stopPropagation(); }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'var(--ds-background-information-bold-hovered, #0055CC)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'var(--ds-background-information-bold, #0C66E4)';
              }}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium no-underline hover:no-underline transition-colors"
              style={{
                background: 'var(--ds-background-information-bold, #0C66E4)',
                color: 'var(--ds-text-inverse, #FFFFFF)',
                transition: 'background-color 120ms ease',
              }}
              title="Status was changed during a standup. Click to open."
            >
              During standup
            </a>
          )}
        </div>

        {/* Type badge — shown in "All" tab to distinguish history from
            comments. Uses our explicit-color HistoryPill so the background
            is actually visible (the ADS `default` Lozenge's bg resolves
            to the border-color token which is near-invisible on white). */}
        {showTypeBadge && (
          <div className="mt-2">
            <HistoryPill />
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
            ) : isUser ? (
              // Assignee / Reporter / Delivery Manager / Product Owner —
              // Avatar + name on each side. `resolveAvatarUrl(name)` looks
              // up the deterministic-by-name photo URL when present so the
              // diff matches the actor avatar above; falls through to
              // initials otherwise.
              <div className="flex items-center gap-3 flex-wrap text-[13px] text-[var(--ds-text,#172B4D)] dark:text-[var(--ds-text,#EDEDED)]">
                {fieldChange.oldValue ? (
                  <span className="inline-flex items-center gap-2">
                    <CatalystAvatar
                      size="small"
                      name={fieldChange.oldValue}
                      src={resolveAvatarUrl(fieldChange.oldValue) ?? null}
                    />
                    <span>{fieldChange.oldValue}</span>
                  </span>
                ) : (
                  <span className="italic text-[var(--ds-text-subtlest,#6B778C)]">None</span>
                )}
                <ArrowRight className="h-3 w-3 text-[var(--ds-text-subtlest,#6B778C)] shrink-0" />
                {fieldChange.newValue ? (
                  <span className="inline-flex items-center gap-2">
                    <CatalystAvatar
                      size="small"
                      name={fieldChange.newValue}
                      src={resolveAvatarUrl(fieldChange.newValue) ?? null}
                    />
                    <span>{fieldChange.newValue}</span>
                  </span>
                ) : (
                  <span className="italic text-[var(--ds-text-subtlest,#6B778C)]">None</span>
                )}
              </div>
            ) : isPriority ? (
              // Priority — colored arrow glyph + label.
              <div className="flex items-center gap-3 flex-wrap text-[13px] text-[var(--ds-text,#172B4D)] dark:text-[var(--ds-text,#EDEDED)]">
                {fieldChange.oldValue ? (
                  <PriorityChip value={fieldChange.oldValue} />
                ) : (
                  <span className="italic text-[var(--ds-text-subtlest,#6B778C)]">None</span>
                )}
                <ArrowRight className="h-3 w-3 text-[var(--ds-text-subtlest,#6B778C)] shrink-0" />
                {fieldChange.newValue ? (
                  <PriorityChip value={fieldChange.newValue} />
                ) : (
                  <span className="italic text-[var(--ds-text-subtlest,#6B778C)]">None</span>
                )}
              </div>
            ) : isTicketLink ? (
              // Parent / Epic / Link — smart card when value looks
              // like a ticket key, plain text otherwise.
              <div className="flex items-center gap-3 flex-wrap text-[13px] text-[var(--ds-text,#172B4D)] dark:text-[var(--ds-text,#EDEDED)]">
                <TicketLinkSide value={fieldChange.oldValue} />
                <ArrowRight className="h-3 w-3 text-[var(--ds-text-subtlest,#6B778C)] shrink-0" />
                <TicketLinkSide value={fieldChange.newValue} />
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
