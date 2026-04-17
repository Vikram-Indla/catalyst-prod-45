/**
 * Epic Backlog table cells — composed from shadcn/Radix primitives.
 * Visual semantics mirror Atlaskit Lozenge / Avatar / Link / Tooltip.
 */
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { EPIC_STATUS_LOZENGE, formatDueDate, getInitials, getLozengeStyle, isDueDateOverdue } from '../../utils/backlog.utils';
import type { BacklogEpic } from '../../types/backlog.types';

// ─── KEY cell ───────────────────────────────────────────────────────────
export function KeyCell({ epic }: { epic: BacklogEpic }) {
  return (
    <span className="inline-flex items-center gap-1.5 truncate">
      <JiraIssueTypeIcon type="epic" size={14} />
      <span
        className="truncate font-mono text-[13px] font-medium text-[#2563EB] dark:text-[#60A5FA]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {epic.epic_key ?? '—'}
      </span>
    </span>
  );
}

// ─── SUMMARY cell (with truncation + Radix Tooltip on overflow) ─────────
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
      <span className="inline-flex items-center rounded bg-muted px-1.5 text-[11px] font-bold uppercase tracking-[0.03em] text-foreground/80 h-5">
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

// ─── ASSIGNEE cell ──────────────────────────────────────────────────────
export function AssigneeCell({ name, avatarUrl }: { name: string | null | undefined; avatarUrl: string | null | undefined }) {
  if (!name) {
    return <span className="truncate italic text-muted-foreground">Unassigned</span>;
  }
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-5 w-5 shrink-0 rounded-full object-cover"
          loading="lazy"
        />
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
