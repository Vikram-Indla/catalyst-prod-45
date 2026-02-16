import styles from '@/styles/release-hub.module.css';

interface Props {
  score: number;
  level: string;
}

export function ReleaseHealthChip({ score, level }: Props) {
  const cls = level === 'critical' ? styles.healthChipCritical
    : level === 'at_risk' ? styles.healthChipAtRisk
    : styles.healthChipHealthy;
  return (
    <span className={`${styles.healthChip} ${cls}`} role="img" aria-label={`Health score ${score}`}>
      {score}
    </span>
  );
}
