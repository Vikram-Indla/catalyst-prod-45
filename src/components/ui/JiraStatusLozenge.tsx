/**
 * JiraStatusLozenge — 3-colour guardrail status badge for Jira-parity views
 * Stage C: Grey/Blue/Green pastel backgrounds — no exceptions
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
}

export function JiraStatusLozenge({ status, interactive = false }: Props) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.backlog;
  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        height: '20px',
        padding: '0 6px',
        borderRadius: '3px',
        border: 'none',
        background: config.bg,
        color: config.text,
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: 'Inter, sans-serif',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
        cursor: interactive ? 'pointer' : 'default',
        lineHeight: 1,
      }}
      aria-label={`Status: ${config.label}`}
    >
      {config.label}
      {interactive && <ChevronDown size={10} />}
    </button>
  );
}
