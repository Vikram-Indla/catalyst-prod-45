/**
 * TimeInStatusHoverCard — rich hover content for a TIS duration cell.
 *
 * Phase 4 row 6.5 (post-critique) — Vikram directive 2026-06-10:
 * "Cell shows ONLY the duration. Everything else surfaces on hover."
 *
 * The cell render was getting cumbersome (duration + ETA strip + pattern
 * code chip stacked vertically inside a 35px row). That violated H8
 * minimalism + cluttered the scan-affordance of the matrix.
 *
 * Now: cell = canonical "12d 4h" + optional ×N revisit chip only. Hover
 * surfaces ALL of:
 *   - status pill + window range (entered → now / left)
 *   - duration prominent
 *   - ETA forecast strip (outlier #1)
 *   - Pattern lozenge full-label form (outlier #5)
 *   - description text under each
 *
 * Wired via @atlaskit/tooltip with JSX content. Width capped 320px so
 * the hover card stays scannable.
 */
import { token } from '@atlaskit/tokens';
import TimeInStatusEtaStrip from './TimeInStatusEtaStrip';
import DwellPatternLozenge from './DwellPatternLozenge';
import UserAvatar from '@/components/shared/UserAvatar';
import PriorityIcon from '@/components/shared/PriorityIcon';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import type { DwellPattern } from '@/lib/tis-dwell-classifier/classifier';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function fmtDuration(ms: number): string {
  if (!ms || ms < 0) return '—';
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const wk = Math.floor(day / 7);
  const mo = Math.floor(day / 30);
  if (mo >= 1) return `${mo}mo ${day - mo * 30}d`;
  if (wk >= 1) return `${wk}w ${day - wk * 7}d`;
  if (day >= 1) return `${day}d ${hr - day * 24}h`;
  if (hr >= 1) return `${hr}h ${min - hr * 60}m`;
  if (min >= 1) return `${min}m`;
  return `${sec}s`;
}

export interface TimeInStatusHoverCardProps {
  // === Ticket header (Jira hover-card parity) ===
  issueKey: string;
  issueType?: string | null;
  title?: string | null;
  assigneeDisplayName?: string | null;
  assigneeAvatarUrl?: string | null;
  priority?: string | null;
  // === Status window ===
  statusName: string;
  statusCategory?: 'todo' | 'in_progress' | 'done' | string | null;
  currentMs: number;
  visits: number;
  /** Cohort P50 in hours. Null = no forecast. */
  p50Hours: number | null;
  confidence: number;
  pattern: DwellPattern;
  patternConfidence: number;
  patternDescription?: string;
}

// 2026-06-10 — Jira-canonical pill colors (DOM-probed 2026-05-16 per
// JiraTable cells.tsx). Same hexes as the matrix cell pills + tints —
// keeps the hover card visually consistent with what triggered it.
const CATEGORY_BG: Record<string, string> = {
  todo: 'var(--ds-border, #DFE1E6)',         // gray
  in_progress: 'var(--ds-background-information, #E9F2FF)',  // cornflower
  done: 'var(--ds-background-success-bold, #6A9A23)',         // lime
};
const CATEGORY_FG: Record<string, string> = {
  todo: 'var(--ds-text, rgb(41, 42, 46))',
  in_progress: 'var(--ds-text, rgb(41, 42, 46))',
  done: 'var(--ds-text, rgb(41, 42, 46))',
};

export function TimeInStatusHoverCard({
  issueKey,
  issueType,
  title,
  assigneeDisplayName,
  assigneeAvatarUrl,
  priority,
  statusName,
  statusCategory,
  currentMs,
  visits,
  p50Hours,
  confidence,
  pattern,
  patternConfidence,
  patternDescription,
}: TimeInStatusHoverCardProps) {
  const cat = statusCategory ?? 'todo';
  const pillBg = CATEGORY_BG[cat] ?? CATEGORY_BG.todo;
  const pillFg = CATEGORY_FG[cat] ?? CATEGORY_FG.todo;

  return (
    <div
      style={{
        width: 340,
        padding: '12px 14px',
        fontFamily: 'Atlassian Sans, -apple-system, system-ui, sans-serif',
        color: token('color.text', 'var(--ds-text, #172B4D)'),
      }}
    >
      {/* Row 0 — ticket header (Jira hover parity) — type icon + key + title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          marginBottom: 8,
          paddingBottom: 8,
          borderBottom: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', paddingTop: 2, flexShrink: 0 }}>
          <JiraIssueTypeIcon type={issueType ?? 'Task'} size={16} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              lineHeight: '20px',
              fontWeight: 653,
              color: token('color.link', 'var(--ds-link, #0C66E4)'),
              wordBreak: 'break-word',
            }}
          >
            <span style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace', marginRight: 6 }}>
              {issueKey}
            </span>
            {title && <span style={{ fontFamily: 'inherit' }}>: {title}</span>}
          </div>
        </div>
      </div>

      {/* Row 0b — meta row: assignee + status pill + priority (mirrors Jira hover) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title={assigneeDisplayName ?? 'Unassigned'}>
          <UserAvatar
            size="small"
            name={assigneeDisplayName ?? undefined}
            src={assigneeAvatarUrl ?? undefined}
          />
        </span>
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            height: 18,
            lineHeight: '14px',
            borderRadius: 3,
            background: pillBg,
            color: pillFg,
            fontSize: 11,
            fontWeight: 653,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {statusName}
        </span>
        {priority && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 500,
              color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'),
            }}
          >
            <PriorityIcon level={priority} size={14} />
            {priority}
          </span>
        )}
      </div>

      {/* Row 1 — duration prominent */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 653,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
          }}
        >
          Time in status
        </span>
        <span
          style={{
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            fontSize: 16,
            fontWeight: 653,
            color: token('color.text', 'var(--ds-text, #172B4D)'),
          }}
        >
          {fmtDuration(currentMs)}
        </span>
      </div>

      {/* Row 2 — meta (visits) */}
      {visits > 1 && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'),
            marginBottom: 8,
          }}
        >
          Re-entered status <b style={{ color: token('color.text', 'var(--ds-text, #172B4D)'), fontWeight: 653 }}>{visits}×</b>
        </div>
      )}

      {/* Row 3 — ETA forecast (outlier #1) */}
      {p50Hours != null && (
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 653,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
              marginBottom: 2,
            }}
          >
            Forecast
          </div>
          <TimeInStatusEtaStrip
            currentMs={currentMs}
            p50Hours={p50Hours}
            confidence={confidence}
          />
          <div
            style={{
              fontSize: 11,
              color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
              marginTop: 2,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            Cohort P50: {(p50Hours / 24).toFixed(1)}d · n=mocked (real cohort post-backfill)
          </div>
        </div>
      )}

      {/* Row 4 — Pattern lozenge full-label (outlier #5) */}
      {pattern !== 'none' && (
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 653,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
              marginBottom: 4,
            }}
          >
            Pattern
          </div>
          <DwellPatternLozenge
            pattern={pattern}
            confidence={patternConfidence}
            description={patternDescription}
          />
          {patternDescription && (
            <div
              style={{
                fontSize: 12,
                lineHeight: '16px',
                color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'),
                marginTop: 4,
              }}
            >
              {patternDescription}
            </div>
          )}
        </div>
      )}

      {/* No-data hint when both forecast + pattern absent */}
      {p50Hours == null && pattern === 'none' && (
        <div
          style={{
            fontSize: 12,
            color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'),
            lineHeight: '16px',
          }}
        >
          No forecast available — cohort data populates after the Jira changelog backfill.
        </div>
      )}
    </div>
  );
}

export default TimeInStatusHoverCard;
