import styles from '@/styles/release-hub.module.css';

interface Props {
  value: number;
}

export function ReleaseProgressBar({ value }: Props) {
  const fillCls = value >= 80 ? styles.progressGreen
    : value >= 40 ? styles.progressBlue
    : styles.progressRed;
  return (
    <div>
      <div className={styles.progressBar} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        <div className={`${styles.progressFill} ${fillCls}`} style={{ width: `${value}%` }} />
      </div>
      <div className={styles.progressPct}>{value}%</div>
    </div>
  );
}
