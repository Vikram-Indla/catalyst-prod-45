import type { ReleaseV2 } from '@/hooks/releases/useReleasesV2';
import { ReleaseHealthChip } from './ReleaseHealthChip';
import { ReleaseStatusBadge } from './ReleaseStatusBadge';
import { ReleaseProgressBar } from './ReleaseProgressBar';
import { formatShortDate } from './release-utils';
import styles from '@/styles/release-hub.module.css';

interface Props {
  release: ReleaseV2;
  onClick: () => void;
}

export function ReleaseCard({ release: r, onClick }: Props) {
  const cardCls = r.health_level === 'critical' ? styles.cardCritical
    : r.health_level === 'at_risk' ? styles.cardAtRisk
    : styles.cardHealthy;

  return (
    <div className={`${styles.card} ${cardCls}`} onClick={onClick}>
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.versionBadge}>{r.version}</span>
          <div className={styles.cardTitle} style={{ marginTop: 6 }}>{r.name}</div>
        </div>
        <ReleaseHealthChip score={r.health_score} level={r.health_level} />
      </div>
      <ReleaseProgressBar value={r.progress} />
      <div className={styles.cardMeta}>
        <ReleaseStatusBadge status={r.status} />
        <span className={styles.cardDateRange}>
          {formatShortDate(r.start_date)} — {formatShortDate(r.target_date)}
        </span>
        {r.days_until_target < 0 && r.status !== 'released' && (
          <span className={styles.overdueBadge}>{Math.abs(r.days_until_target)}d overdue</span>
        )}
      </div>
      <div className={styles.cardSeparator} />
      <div className={styles.cardStats}>
        <span className={styles.cardStat}>
          <span className={styles.cardStatValue}>{r.test_cases_passed}/{r.test_cases_total}</span> Tests
        </span>
        <span className={styles.cardStat}>
          <span className={styles.cardStatValue} style={r.defects_open > 0 ? { color: 'var(--rh-danger)' } : undefined}>
            {r.defects_open}
          </span> Defects
        </span>
        <span className={styles.cardStat}>
          <span className={styles.cardStatValue}>{r.coverage_percent}%</span> Cov
        </span>
      </div>
    </div>
  );
}
