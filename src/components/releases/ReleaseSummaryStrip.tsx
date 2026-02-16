import type { ReleaseV2 } from '@/hooks/releases/useReleasesV2';
import styles from '@/styles/release-hub.module.css';

interface Props {
  releases: ReleaseV2[];
}

export function ReleaseSummaryStrip({ releases }: Props) {
  const total = releases.length;
  const critical = releases.filter(r => r.health_level === 'critical').length;
  const atRisk = releases.filter(r => r.health_level === 'at_risk').length;
  const healthy = releases.filter(r => r.health_level === 'healthy').length;
  const overdue = releases.filter(r => r.days_until_target < 0 && r.status !== 'released').length;

  const items = [
    { value: total, label: 'Total', color: undefined },
    { value: critical, label: 'Critical', color: 'var(--rh-danger)' },
    { value: atRisk, label: 'At Risk', color: 'var(--rh-warning)' },
    { value: healthy, label: 'Healthy', color: 'var(--rh-success)' },
    { value: overdue, label: 'Overdue', color: overdue > 0 ? 'var(--rh-danger)' : undefined },
  ];

  return (
    <div className={styles.summaryStrip}>
      {items.map(item => (
        <div key={item.label} className={styles.summaryItem}>
          <span className={styles.summaryCount} style={item.color ? { color: item.color } : undefined}>
            {item.value}
          </span>
          <span className={styles.summaryLabel}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
