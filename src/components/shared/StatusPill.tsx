import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';
import { statusBgBold, statusFgBold } from '@/components/catalyst-detail-views/shared/sections/statusPalette';

/**
 * @deprecated Use `CatalystStatusPill` (interactive header pill) or the `StatusPill`
 * from `@/components/shared/JiraTable/cells` (display-only table pill) instead.
 * This component uses hardcoded rgb() colors and uppercase text that violate
 * ADS token requirements. It has no callers outside this barrel export.
 */
interface StatusPillProps {
  value: string | null | undefined;
  label?: string;
  className?: string;
}

export function StatusPill({ value, label }: StatusPillProps) {
  if (!value && !label) {
    return <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>;
  }
  const displayLabel = label || (value || '').replace(/_/g, ' ');
  const appearance = statusToLozenge(value);
  // Jira-parity BOLD tier (statusPalette.ts) — list/table pill.
  const bg = statusBgBold(appearance);
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
        fontSize: 'var(--ds-font-size-100)',
        fontWeight: 653,
        lineHeight: '20px',
        color: statusFgBold(appearance),
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
