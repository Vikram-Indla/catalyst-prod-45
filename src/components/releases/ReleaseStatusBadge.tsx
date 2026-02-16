import styles from '@/styles/release-hub.module.css';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  planned: { label: 'Planned', cls: 'statusPlanned' },
  planning: { label: 'Planning', cls: 'statusPlanned' },
  development: { label: 'Dev', cls: 'statusDevelopment' },
  staging: { label: 'Staging', cls: 'statusStaging' },
  testing: { label: 'Testing', cls: 'statusTesting' },
  uat: { label: 'UAT', cls: 'statusUat' },
  released: { label: 'Released', cls: 'statusReleased' },
  archived: { label: 'Archived', cls: 'statusPlanned' },
};

interface Props {
  status: string;
}

export function ReleaseStatusBadge({ status }: Props) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.planned;
  return (
    <span className={`${styles.statusBadge} ${styles[cfg.cls]}`}>
      <span className={styles.statusDot} />
      {cfg.label}
    </span>
  );
}
