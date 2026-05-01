/**
 * JiraStatusLozenge — Jira-parity status badge
 *
 * jira-compare Patch #1 (2026-04-28):
 *   - Drop `text-transform: uppercase` (Jira renders status name verbatim).
 *   - Drop letter-spacing.
 *   - Change font-weight 700 → 600 to match Atlaskit @atlaskit/lozenge.
 *   - Update STATUS_MAP labels to sentence-case strings exactly as Jira
 *     renders them: "In QA", "Ready for QA", "Done", "In UAT", etc.
 */
import { ChevronDown } from 'lucide-react';

const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  backlog:         { bg: 'var(--ds-border, var(--ds-border, #DFE1E6))', text: 'var(--ds-text, var(--ds-text, #253858))', label: 'Backlog' },
  in_progress:     { bg: '#FFF7D6', text: '#7F5F01', label: 'In Progress' },
  done:            { bg: '#DCFFF1', text: '#216E4E', label: 'Done' },
  in_production:   { bg: '#DCFFF1', text: '#216E4E', label: 'In Production' },
  ready_for_qa:    { bg: '#DCFFF1', text: '#216E4E', label: 'Ready for QA' },
  in_requirements: { bg: 'var(--ds-border, var(--ds-border, #DFE1E6))', text: 'var(--ds-text, var(--ds-text, #253858))', label: 'In Requirements' },
  in_uat:          { bg: '#DCFFF1', text: '#216E4E', label: 'In UAT' },
  in_qa:           { bg: '#DCFFF1', text: '#216E4E', label: 'In QA' },
  in_dev:          { bg: '#FFF7D6', text: '#7F5F01', label: 'In Dev' },
  closed:          { bg: '#DCFFF1', text: '#216E4E', label: 'Closed' },
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
    bg: 'var(--ds-border, var(--ds-border, #DFE1E6))',
    text: 'var(--ds-text, var(--ds-text, #253858))',
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
        fontSize: '11px',
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
