import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';

interface StatusPillProps {
  value: string | null | undefined;
  label?: string;
  className?: string;
}

const PILL_BG: Record<string, string> = {
  success:    'rgb(179, 223, 114)',
  inprogress: 'rgb(143, 184, 246)',
  default:    'rgb(221, 222, 225)',
  moved:      'rgb(243, 214, 100)',
  removed:    'rgb(221, 222, 225)',
  new:        'rgb(184, 172, 246)',
};

export function StatusPill({ value, label }: StatusPillProps) {
  if (!value && !label) {
    return <span style={{ color: 'var(--ds-text-subtlest, #7A869A)' }}>—</span>;
  }
  const displayLabel = label || (value || '').replace(/_/g, ' ');
  const appearance = statusToLozenge(value);
  const bg = PILL_BG[appearance] ?? PILL_BG.default;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: bg,
      borderRadius: '3px',
      padding: '0 7px',
      height: '20px',
    }}>
      <span style={{
        fontSize: '11px',
        fontWeight: 700,
        lineHeight: '20px',
        color: 'rgb(41, 42, 46)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {displayLabel}
      </span>
    </span>
  );
}

export default StatusPill;
