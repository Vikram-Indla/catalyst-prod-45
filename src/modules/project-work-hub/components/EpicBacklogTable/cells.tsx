/**
 * Epic Backlog table cells — Jira "List" view (image-2) parity.
 * Visual semantics mirror Atlaskit Lozenge / Avatar / Link / Tooltip / Button-subtle.
 */
import { MessageSquare } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { EPIC_STATUS_LOZENGE, formatDueDate, getInitials, getLozengeStyle, isDueDateOverdue, getEpicChipColor } from '../../utils/backlog.utils';
import type { BacklogEpic } from '../../types/backlog.types';

// ─── TYPE cell ──────────────────────────────────────────────────────────
export function TypeCell({ issueType }: { issueType: string | null | undefined }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-center">
            <JiraIssueTypeIcon type={issueType ?? 'Epic'} size={16} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{issueType ?? 'Epic'}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── KEY cell (link-styled; Type icon shown as its own column now) ──────
export function KeyCell({ epic }: { epic: BacklogEpic }) {
  return (
    <span
      className="truncate font-mono text-[13px] font-medium text-[#2563EB] hover:underline dark:text-[#60A5FA]"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {epic.epic_key ?? '—'}
    </span>
  );
}

// ─── SUMMARY cell (truncate + Tooltip on overflow) ──────────────────────
export function SummaryCell({ epic }: { epic: BacklogEpic }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="truncate text-[13px] text-foreground">{epic.name}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-[420px]">
          {epic.name}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── STATUS lozenge cell ────────────────────────────────────────────────
export function StatusLozengeCell({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const cfg = EPIC_STATUS_LOZENGE[status];
  if (!cfg) {
    return (
      <span className="inline-flex h-5 items-center rounded bg-muted px-1.5 text-[11px] font-bold uppercase tracking-[0.03em] text-foreground/80">
        {String(status).toUpperCase()}
      </span>
    );
  }
  const style = getLozengeStyle(cfg.color);
  return (
    <span
      className="inline-flex h-5 items-center rounded px-1.5 text-[11px] font-bold uppercase tracking-[0.03em]"
      style={{ background: style.bg, color: style.text }}
    >
      {cfg.label}
    </span>
  );
}

// ─── COMMENTS cell (count + icon, or "Add comment" subtle) ──────────────
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

// ─── PARENT chip cell (colored link-chip, hover tooltip) ────────────────
export function ParentCell({ parentKey, parentSummary }: { parentKey: string | null | undefined; parentSummary: string | null | undefined }) {
  if (!parentKey) return <span className="text-muted-foreground">—</span>;
  const palette = getEpicChipColor(parentKey);
  const display = parentSummary ? `${parentKey} ${parentSummary}` : parentKey;
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex max-w-full items-center gap-1 truncate rounded px-1.5 py-[2px] text-[12px] font-medium"
            style={{ background: palette.bg, color: palette.text }}
          >
            <span className="truncate">{display}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-[420px]">
          {display}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── ASSIGNEE cell ──────────────────────────────────────────────────────
export function AssigneeCell({ name, avatarUrl }: { name: string | null | undefined; avatarUrl: string | null | undefined }) {
  if (!name) {
    return <span className="truncate italic text-muted-foreground">Unassigned</span>;
  }
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" loading="lazy" />
      ) : (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-foreground/75">
          {getInitials(name)}
        </span>
      )}
      <span className="truncate text-[13px] text-foreground">{name}</span>
    </span>
  );
}

// ─── DATE cell (mono, tabular-nums) ─────────────────────────────────────
export function DateCell({ value }: { value: string | null | undefined }) {
  return (
    <span
      className="truncate text-[12px] text-muted-foreground"
      style={{ fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}
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
        fontFamily: "'JetBrains Mono', monospace",
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {formatDueDate(value ?? null)}
    </span>
  );
}

// ─── PRIORITY cell (colored icon + label) ───────────────────────────────
type PriorityKey = 'highest' | 'high' | 'medium' | 'low' | 'lowest';

const PRIORITY_MAP: Record<PriorityKey, { label: string; color: string; glyph: 'up-up' | 'up' | 'equals' | 'down' | 'down-down' }> = {
  highest: { label: 'Highest', color: '#DC2626', glyph: 'up-up' },
  high:    { label: 'High',    color: '#E97C1B', glyph: 'up' },
  medium:  { label: 'Medium',  color: '#E97C1B', glyph: 'equals' },
  low:     { label: 'Low',     color: '#2E7D32', glyph: 'down' },
  lowest:  { label: 'Lowest',  color: '#2E7D32', glyph: 'down-down' },
};

function PriorityGlyph({ glyph, color }: { glyph: PriorityKey extends never ? never : 'up-up' | 'up' | 'equals' | 'down' | 'down-down'; color: string }) {
  // Two stacked chevrons / equals marks / two stacked down chevrons — matches Jira glyph set.
  const common = { stroke: color, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (glyph === 'up-up') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        <polyline points="3,7 7,3 11,7" {...common} />
        <polyline points="3,11 7,7 11,11" {...common} />
      </svg>
    );
  }
  if (glyph === 'up') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        <polyline points="3,9 7,5 11,9" {...common} />
      </svg>
    );
  }
  if (glyph === 'equals') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        <line x1="3" y1="6" x2="11" y2="6" {...common} />
        <line x1="3" y1="9" x2="11" y2="9" {...common} />
      </svg>
    );
  }
  if (glyph === 'down') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
        <polyline points="3,5 7,9 11,5" {...common} />
      </svg>
    );
  }
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
