/**
 * JiraStatusLozenge — 3-colour guardrail status badge
 * Stage E: Unknown status guard + onStatusChange wiring
 */
import { ChevronDown } from 'lucide-react';

const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  backlog:         { bg: '#DFE1E6', text: '#253858', label: 'BACKLOG' },
  in_progress:     { bg: '#DEEBFF', text: '#0747A6', label: 'IN PROGRESS' },
  done:            { bg: '#E3FCEF', text: '#006644', label: 'DONE' },
  in_production:   { bg: '#E3FCEF', text: '#006644', label: 'IN PRODUCTION' },
  ready_for_qa:    { bg: '#E3FCEF', text: '#006644', label: 'READY FOR QA' },
  in_requirements: { bg: '#DFE1E6', text: '#253858', label: 'IN REQUIREMENTS' },
  in_uat:          { bg: '#E3FCEF', text: '#006644', label: 'IN UAT' },
  in_qa:           { bg: '#DEEBFF', text: '#0747A6', label: 'IN QA' },
  in_dev:          { bg: '#DEEBFF', text: '#0747A6', label: 'IN DEV' },
  closed:          { bg: '#E3FCEF', text: '#006644', label: 'CLOSED' },
};

interface Props {
  status: string;
  interactive?: boolean;
  onStatusChange?: (newStatus: string) => void;
}

export function JiraStatusLozenge({ status, interactive = false, onStatusChange }: Props) {
  // Cycle 1 §1.4: guard unknown status — never crash
  const config = STATUS_MAP[status] ?? {
    bg: '#DFE1E6',
    text: '#253858',
    label: status?.toUpperCase?.() ?? 'UNKNOWN',
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
        fontWeight: 700,
        fontFamily: 'var(--cp-font-body)',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
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
