/**
 * Epic Backlog table cells — rendered with @atlaskit/* primitives where
 * Atlassian's DS provides the canonical component (Lozenge, Avatar,
 * Tooltip). Jira "List" view (image-2) parity.
 */
import Lozenge, { type ThemeAppearance } from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import Tooltip from '@atlaskit/tooltip';
import { MessageSquare } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { EPIC_STATUS_LOZENGE, formatDueDate, isDueDateOverdue, getEpicChipColor } from '../../utils/backlog.utils';
import type { BacklogEpic } from '../../types/backlog.types';

// ─── LOZENGE appearance mapping ─────────────────────────────────────────
// §20 / L41 — `EPIC_STATUS_LOZENGE.color` now stores Atlaskit appearance
// tokens directly (no legacy grey/blue/green). This thin adapter just
// guards against unknown values and coerces the string literal to the
// ThemeAppearance type.
function toLozengeAppearance(lozColor: string | undefined): ThemeAppearance {
  const valid: ThemeAppearance[] = ['default', 'inprogress', 'success', 'removed', 'moved', 'new'];
  return (valid.includes(lozColor as ThemeAppearance) ? lozColor : 'default') as ThemeAppearance;
}

// ─── TYPE cell ──────────────────────────────────────────────────────────
export function TypeCell({ issueType }: { issueType: string | null | undefined }) {
  const label = issueType ?? 'Epic';
  return (
    <Tooltip content={label} position="top">
      <span className="inline-flex items-center justify-center">
        <JiraIssueTypeIcon type={label} size={16} />
      </span>
    </Tooltip>
  );
}

// ─── KEY cell ───────────────────────────────────────────────────────────
export function KeyCell({ epic }: { epic: BacklogEpic }) {
  return (
    <span
      className="truncate font-mono text-[13px] font-medium text-[#2563EB] hover:underline dark:text-[#60A5FA]"
      style={{ fontFamily: 'var(--ds-font-family-monospaced)' }}
    >
      {epic.epic_key ?? '—'}
    </span>
  );
}

// ─── SUMMARY cell (truncate + Tooltip on overflow) ──────────────────────
export function SummaryCell({ epic }: { epic: BacklogEpic }) {
  return (
    <Tooltip content={epic.name} position="bottom">
      <span className="block truncate text-[13px] text-foreground">{epic.name}</span>
    </Tooltip>
  );
}

// ─── STATUS lozenge cell (@atlaskit/lozenge) ────────────────────────────
export function StatusLozengeCell({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const cfg = EPIC_STATUS_LOZENGE[status];
  if (!cfg) {
    return <Lozenge>{String(status)}</Lozenge>;
  }
  return (
    <Lozenge appearance={toLozengeAppearance(cfg.color)} isBold>
      {cfg.label}
    </Lozenge>
  );
}

// ─── COMMENTS cell ──────────────────────────────────────────────────────
export function CommentsCell({ count }: { count: number | null | undefined }) {
  const n = typeof count === 'number' ? count : 0;
  if (n === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
        <MessageSquare className="h-3.5 w-3.5" />
        <span>Add comment</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-foreground">
      <MessageSquare className="h-3.5 w-3.5" />
      <span>{n} {n === 1 ? 'comment' : 'comments'}</span>
    </span>
  );
}

// ─── PARENT chip cell ───────────────────────────────────────────────────
export function ParentCell({ parentKey, parentSummary }: { parentKey: string | null | undefined; parentSummary: string | null | undefined }) {
  if (!parentKey) return <span className="text-muted-foreground">—</span>;
  const palette = getEpicChipColor(parentKey);
  const display = parentSummary ? `${parentKey} ${parentSummary}` : parentKey;
  return (
    <Tooltip content={display} position="bottom">
      <span
        className="inline-flex max-w-full items-center gap-1 truncate rounded px-1.5 py-[2px] text-[12px] font-medium"
        style={{ background: palette.bg, color: palette.text }}
      >
        <span className="truncate">{display}</span>
      </span>
    </Tooltip>
  );
}

// ─── ASSIGNEE cell (@atlaskit/avatar) ───────────────────────────────────
export function AssigneeCell({ name, avatarUrl }: { name: string | null | undefined; avatarUrl: string | null | undefined }) {
  if (!name) {
    return <span className="truncate italic text-muted-foreground">Unassigned</span>;
  }
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar
        size="small"
        src={avatarUrl ?? undefined}
        name={name}
        appearance="circle"
        label={name}
      />
      <span className="truncate text-[13px] text-foreground">{name}</span>
    </span>
  );
}

// ─── DATE cell ──────────────────────────────────────────────────────────
export function DateCell({ value }: { value: string | null | undefined }) {
  return (
    <span
      className="truncate text-[12px] text-muted-foreground"
      style={{ fontFamily: 'var(--ds-font-family-monospaced)', fontVariantNumeric: 'tabular-nums' }}
    >
      {formatDueDate(value ?? null)}
    </span>
  );
}

// ─── DUE DATE cell (overdue-aware) ──────────────────────────────────────
export function DueDateCell({ value, status }: { value: string | null | undefined; status: string | null | undefined }) {
  const overdue = isDueDateOverdue(value ?? null, status ?? null);
  return (
    <span
      className="truncate text-[12px]"
      style={{
        color: overdue ? '#DC2626' : undefined,
        fontFamily: 'var(--ds-font-family-monospaced)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {formatDueDate(value ?? null)}
    </span>
  );
}

// ─── PRIORITY cell (Jira glyph set) ─────────────────────────────────────
type PriorityKey = 'highest' | 'high' | 'medium' | 'low' | 'lowest';

const PRIORITY_MAP: Record<PriorityKey, { label: string; color: string; glyph: 'up-up' | 'up' | 'equals' | 'down' | 'down-down' }> = {
  highest: { label: 'Highest', color: '#DC2626', glyph: 'up-up' },
  high:    { label: 'High',    color: '#E97C1B', glyph: 'up' },
  medium:  { label: 'Medium',  color: '#E97C1B', glyph: 'equals' },
  low:     { label: 'Low',     color: '#2E7D32', glyph: 'down' },
  lowest:  { label: 'Lowest',  color: '#2E7D32', glyph: 'down-down' },
};

function PriorityGlyph({ glyph, color }: { glyph: 'up-up' | 'up' | 'equals' | 'down' | 'down-down'; color: string }) {
  const common = { stroke: color, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (glyph === 'up-up') return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <polyline points="3,7 7,3 11,7" {...common} />
      <polyline points="3,11 7,7 11,11" {...common} />
    </svg>
  );
  if (glyph === 'up') return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <polyline points="3,9 7,5 11,9" {...common} />
    </svg>
  );
  if (glyph === 'equals') return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <line x1="3" y1="6" x2="11" y2="6" {...common} />
      <line x1="3" y1="9" x2="11" y2="9" {...common} />
    </svg>
  );
  if (glyph === 'down') return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <polyline points="3,5 7,9 11,5" {...common} />
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <polyline points="3,3 7,7 11,3" {...common} />
      <polyline points="3,7 7,11 11,7" {...common} />
    </svg>
  );
}

export function PriorityCell({ priority }: { priority: string | null | undefined }) {
  const key = (priority ?? 'medium').toLowerCase() as PriorityKey;
  const cfg = PRIORITY_MAP[key] ?? PRIORITY_MAP.medium;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-foreground">
      <span className="shrink-0" aria-hidden><PriorityGlyph glyph={cfg.glyph} color={cfg.color} /></span>
      <span className="truncate">{cfg.label}</span>
    </span>
  );
}
