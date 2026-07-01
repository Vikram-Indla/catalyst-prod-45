import * as React from 'react';
import { ArrowRight } from '@/lib/atlaskit-icons';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import type { CdsActivityItem } from '../types';
import { renderJiraContent, normalizeJiraText, type JiraUserMap } from '../utils/jiraContent';
import { TicketLinkCard } from '@/components/shared/TicketLinkCard';
import { HistoryPill } from './JiraActivityRow';
import { PriorityIcon } from '@/components/icons/PriorityIcon';
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
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <PriorityIcon level={value} size={14} />
      <span>{value}</span>
    </span>
  );
}

function TicketLinkSide({ value }: { value: string | null }) {
  if (!value) {
    return <span style={{ fontStyle: 'italic', color: 'var(--ds-text-subtlest)' }}>None</span>;
  }
  const m = TICKET_KEY_RE.exec(value);
  if (m) return <TicketLinkCard issueKey={m[1]} />;
  return <span>{value}</span>;
}

const STATUS_PILL: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 3,
  border: '1px solid var(--ds-border)',
  background: 'var(--ds-background-neutral)',
  padding: '2px 8px',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  color: 'var(--ds-text)',
  whiteSpace: 'nowrap',
};

const ARROW_ICON: React.CSSProperties = {
  width: 12,
  height: 12,
  color: 'var(--ds-text-subtlest)',
  flexShrink: 0,
};

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
    <div style={{ display: 'flex', gap: 12, padding: '16px 0' }} className={className}>
      {/* Avatar only — no colored action-type circles */}
      <span style={{ flexShrink: 0 }}>
        <CatalystAvatar size="medium" name={actor.name} src={actor.avatarUrl} />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Author + action line */}
        <div className="flex items-baseline gap-1 flex-wrap">
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text)' }}>
            {actor.name}
          </span>

          {type === 'create' && (
            <span style={{ fontSize: 14, color: 'var(--ds-text)', fontWeight: 400 }}>
              {description || 'created this item'}
            </span>
          )}

          {type === 'update' && fieldChange && (
            <span style={{ fontSize: 14, color: 'var(--ds-text)', fontWeight: 400 }}>
              changed the{' '}
              <span style={{ fontWeight: 600 }}>
                {formatFieldName(fieldChange.field)}
              </span>
            </span>
          )}

          {type === 'delete' && (
            <span style={{ fontSize: 14, color: 'var(--ds-text)', fontWeight: 400 }}>
              {description || 'deleted this item'}
            </span>
          )}
        </div>

        {/* Date — absolute format. When the row was emitted during a
            standup, append a small "during standup" link back to the
            standup detail page (Phase 7b). */}
        <div style={{ fontSize: 12, color: 'var(--ds-text-subtlest)', marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span>{formatAbsoluteDate(timestamp)}</span>
          {standupContext && (
            <a
              href={standupContext.href}
              onClick={(e) => { e.stopPropagation(); }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'var(--ds-background-information-bold-hovered)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = 'var(--ds-background-information-bold, var(--ds-link))';
              }}
              className="inline-flex items-center"
              style={{
                padding: '2px 6px',
                borderRadius: 3,
                fontSize: 11,
                fontWeight: 500,
                textDecoration: 'none',
                background: 'var(--ds-background-information-bold)',
                color: 'var(--ds-text-inverse)',
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
          <div style={{ marginTop: 8 }}>
            <HistoryPill />
          </div>
        )}

        {/* Field change content */}
        {type === 'update' && fieldChange && (
          <div style={{ marginTop: 8 }}>
            {isStatus ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span style={STATUS_PILL}>
                  {formatDisplayValue(fieldChange.oldValue)}
                </span>
                <span style={{ fontSize: 14, color: 'var(--ds-text-subtlest)' }}>→</span>
                <span style={STATUS_PILL}>
                  {formatDisplayValue(fieldChange.newValue)}
                </span>
              </div>
            ) : isUser ? (
              // Assignee / Reporter / Delivery Manager / Product Owner —
              // Avatar + name on each side. `resolveAvatarUrl(name)` looks
              // up the deterministic-by-name photo URL when present so the
              // diff matches the actor avatar above; falls through to
              // initials otherwise.
              <div className="flex items-center gap-3 flex-wrap" style={{ fontSize: 13, color: 'var(--ds-text)' }}>
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
                  <span style={{ fontStyle: 'italic', color: 'var(--ds-text-subtlest)' }}>None</span>
                )}
                <ArrowRight style={ARROW_ICON} />
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
                  <span style={{ fontStyle: 'italic', color: 'var(--ds-text-subtlest)' }}>None</span>
                )}
              </div>
            ) : isPriority ? (
              // Priority — colored arrow glyph + label.
              <div className="flex items-center gap-3 flex-wrap" style={{ fontSize: 13, color: 'var(--ds-text)' }}>
                {fieldChange.oldValue ? (
                  <PriorityChip value={fieldChange.oldValue} />
                ) : (
                  <span style={{ fontStyle: 'italic', color: 'var(--ds-text-subtlest)' }}>None</span>
                )}
                <ArrowRight style={ARROW_ICON} />
                {fieldChange.newValue ? (
                  <PriorityChip value={fieldChange.newValue} />
                ) : (
                  <span style={{ fontStyle: 'italic', color: 'var(--ds-text-subtlest)' }}>None</span>
                )}
              </div>
            ) : isTicketLink ? (
              // Parent / Epic / Link — smart card when value looks
              // like a ticket key, plain text otherwise.
              <div className="flex items-center gap-3 flex-wrap" style={{ fontSize: 13, color: 'var(--ds-text)' }}>
                <TicketLinkSide value={fieldChange.oldValue} />
                <ArrowRight style={ARROW_ICON} />
                <TicketLinkSide value={fieldChange.newValue} />
              </div>
            ) : isRich ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'start' }}>
                <div style={{ fontSize: 13, color: 'var(--ds-text-subtlest)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {fieldChange.oldValue
                    ? renderJiraContent(fieldChange.oldValue, { userMap: jiraUserMap })
                    : <span style={{ fontStyle: 'italic' }}>None</span>}
                </div>
                <ArrowRight style={{ ...ARROW_ICON, marginTop: 6 }} />
                <div style={{ fontSize: 13, color: 'var(--ds-text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {fieldChange.newValue
                    ? renderJiraContent(fieldChange.newValue, { userMap: jiraUserMap })
                    : <span style={{ fontStyle: 'italic', color: 'var(--ds-text-subtlest)' }}>None</span>}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontSize: 13, color: 'var(--ds-text-subtlest)', textDecoration: 'line-through' }}>
                  {normalizeJiraText(fieldChange.oldValue, { userMap: jiraUserMap }) || 'None'}
                </span>
                <ArrowRight style={ARROW_ICON} />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text)' }}>
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
