/**
 * JiraStatusLozenge — Jira-parity status badge
 *
 * jira-compare Patch #1 (2026-04-28):
 *   - Removed uppercase transform (Jira renders status name verbatim).
 *   - Drop letter-spacing.
 *   - Change font-weight 700 → 600 to match Atlaskit @atlaskit/lozenge.
 *   - Update STATUS_MAP labels to sentence-case strings exactly as Jira
 *     renders them: "In QA", "Ready for QA", "Done", "In UAT", etc.
 */
import { ChevronDown } from '@/lib/atlaskit-icons';

const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  backlog:         { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', text: 'var(--ds-text)', label: 'Backlog' },
  in_progress:     { bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)', label: 'In Progress' },
  done:            { bg: 'var(--ds-background-success)', text: 'var(--ds-background-success-bold)', label: 'Done' },
  in_production:   { bg: 'var(--ds-background-success)', text: 'var(--ds-background-success-bold)', label: 'In Production' },
  ready_for_qa:    { bg: 'var(--ds-background-success)', text: 'var(--ds-background-success-bold)', label: 'Ready for QA' },
  in_requirements: { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', text: 'var(--ds-text)', label: 'In Requirements' },
  in_uat:          { bg: 'var(--ds-background-success)', text: 'var(--ds-background-success-bold)', label: 'In UAT' },
  in_qa:           { bg: 'var(--ds-background-success)', text: 'var(--ds-background-success-bold)', label: 'In QA' },
  in_dev:          { bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)', label: 'In Dev' },
  closed:          { bg: 'var(--ds-background-success)', text: 'var(--ds-background-success-bold)', label: 'Closed' },
};

interface Props {
  status: string;
  interactive?: boolean;
  onStatusChange?: (newStatus: string) => void;
}

export function JiraStatusLozenge({ status, interactive = false, onStatusChange }: Props) {
  // Cycle 1 §1.4: guard unknown status — never crash. For unknown values,
  // pass the string through unchanged (Jira does the same).
  const config = STATUS_MAP[status] ?? {
    bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))',
    text: 'var(--ds-text)',
    label: status ?? 'Unknown',
  };

  return (
    <button
      onClick={interactive && onStatusChange ? () => {
        // Simple cycle: backlog → in_progress → done → backlog
        const cycle: Record<string, string> = {
          backlog: 'in_progress',
          in_progress: 'done',
          done: 'backlog',
          in_requirements: 'in_progress',
          in_dev: 'in_progress',
          in_qa: 'done',
          in_uat: 'done',
          ready_for_qa: 'in_qa',
          in_production: 'done',
          closed: 'backlog',
        };
        onStatusChange(cycle[status] ?? 'in_progress');
      } : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        height: '20px',
        lineHeight: '20px',
        padding: '0 6px',
        borderRadius: '3px',
        border: 'none',
        background: config.bg,
        color: config.text,
        fontSize: 'var(--cp-font-size-status, 11px)',
        fontWeight: 600,
        fontFamily: 'var(--cp-font-body)',
        whiteSpace: 'nowrap',
        cursor: interactive ? 'pointer' : 'default',
      }}
      aria-label={`Status: ${config.label}`}
    >
      {config.label}
      {interactive && <ChevronDown size={10} />}
    </button>
  );
}
