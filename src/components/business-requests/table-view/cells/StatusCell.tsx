/* V12 — StatusCell: StatusLozenge guardrail (3-color) */

type LozengeVariant = 'grey' | 'blue' | 'green';

const LOZENGE_STYLES: Record<LozengeVariant, { bg: string; color: string }> = {
  grey:  { bg: '#DFE1E6', color: '#42526E' },
  blue:  { bg: '#0C66E4', color: '#FFFFFF' },
  green: { bg: '#1B7F37', color: '#FFFFFF' },
};

const STATUS_VARIANT_MAP: Record<string, LozengeVariant> = {
  new: 'grey', new_request: 'grey', new_demand: 'grey', backlog: 'grey',
  draft: 'grey', on_hold: 'grey', blocked: 'grey', waiting: 'grey',
  ready: 'grey', ready_to_implement: 'grey', funnel: 'grey', scored: 'grey',
  in_progress: 'blue', in_review: 'blue', active: 'blue', testing: 'blue',
  implement: 'blue', implementing: 'blue', analyse: 'blue', analysis: 'blue',
  ea_review: 'blue', budget_review: 'blue',
  done: 'green', completed: 'green', approved: 'green', resolved: 'green',
  closed: 'green', cancelled: 'green', rejected: 'green',
};

function getVariant(status: string): LozengeVariant {
  const n = status?.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_') || 'new';
  return STATUS_VARIANT_MAP[n] || 'grey';
}

interface StatusCellProps {
  status: string;
}

export function StatusCell({ status }: StatusCellProps) {
  const variant = getVariant(status);
  const s = LOZENGE_STYLES[variant];
  const label = status?.replace(/_/g, ' ').replace(/-/g, ' ').toUpperCase() || 'NEW';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 20,
        padding: '0 6px',
        borderRadius: 4,
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        maxWidth: 150,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        background: s.bg,
        color: s.color,
      }}
    >
      {label}
    </span>
  );
}

// Legacy exports for backward compat
export { getVariant as getStatusConfig };