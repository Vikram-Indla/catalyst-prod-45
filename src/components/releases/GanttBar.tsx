import type { ReleaseV2 } from '@/hooks/releases/useReleasesV2';
import { formatShortDate } from './release-utils';
import styles from '@/styles/release-hub.module.css';

interface Props {
  release: ReleaseV2;
  left: string;
  width: string;
  onClick: () => void;
}

export function GanttBar({ release: r, left, width, onClick }: Props) {
  const cls = r.status === 'released' ? styles.ganttBarDone
    : r.health_level === 'critical' ? styles.ganttBarCrit
    : r.health_level === 'at_risk' ? styles.ganttBarRisk
    : r.progress === 0 ? styles.ganttBarPlan
    : styles.ganttBarOk;

  return (
    <div
      className={`${styles.ganttBar} ${cls}`}
      style={{ left, width }}
      onClick={onClick}
    >
      {r.progress > 0 && (
        <div className={styles.ganttBarFill} style={{ width: `${r.progress}%` }} />
      )}
      <span style={{ position: 'relative', zIndex: 1 }}>{r.progress}%</span>
      <div className={styles.ganttTooltip}>
        <span style={{ fontWeight: 600 }}>{r.name}</span>
        <span>|</span>
        <span>{formatShortDate(r.start_date)} → {formatShortDate(r.target_date)}</span>
        <span>|</span>
        <span>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span>
        <span>|</span>
        <span>Health: {r.health_score}</span>
        {r.days_until_target < 0 && r.status !== 'released' && (
          <span style={{ color: '#FCA5A5' }}> · {Math.abs(r.days_until_target)}d overdue</span>
        )}
      </div>
    </div>
  );
}
