import type { ReleaseV2 } from '@/hooks/releases/useReleasesV2';
import { ReleaseHealthChip } from './ReleaseHealthChip';
import { ReleaseStatusBadge } from './ReleaseStatusBadge';
import { ReleaseProgressBar } from './ReleaseProgressBar';
import { formatShortDate } from './release-utils';
import styles from '@/styles/release-hub.module.css';

interface Props {
  releases: ReleaseV2[];
  onNavigate: (id: string) => void;
}

export function ReleaseTable({ releases, onNavigate }: Props) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.tableHead}>
          <tr>
            <th className={styles.th} style={{ width: 240 }}>Release</th>
            <th className={styles.th} style={{ width: 110 }}>Status</th>
            <th className={styles.th} style={{ width: 160 }}>Dates</th>
            <th className={styles.th} style={{ width: 130 }}>Progress</th>
            <th className={styles.th} style={{ width: 110 }}>Tests</th>
            <th className={styles.th} style={{ width: 72 }}>Defects</th>
            <th className={styles.th} style={{ width: 110 }}>Coverage</th>
            <th className={styles.th} style={{ width: 72 }} aria-sort="none">Health</th>
            <th className={styles.th} style={{ width: 72 }}>Days</th>
            <th className={styles.th} style={{ width: 110 }}>Owner</th>
          </tr>
        </thead>
        <tbody>
          {releases.map(r => (
            <tr key={r.id} className={styles.tr} onClick={() => onNavigate(r.id)}>
              <td className={styles.td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={styles.versionBadge}>{r.version}</span>
                  <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                    {r.name}
                  </span>
                </div>
              </td>
              <td className={styles.td}><ReleaseStatusBadge status={r.status} /></td>
              <td className={styles.td}>
                <span className={styles.dateRange}>
                  {formatShortDate(r.start_date)} → {formatShortDate(r.target_date)}
                </span>
              </td>
              <td className={styles.td}><ReleaseProgressBar value={r.progress} /></td>
              <td className={styles.td}>
                <span className={styles.mono} style={{ fontSize: 12 }}>
                  {r.test_cases_passed}/{r.test_cases_total}
                </span>
              </td>
              <td className={styles.td}>
                <span className={styles.mono} style={{ fontSize: 12, fontWeight: 600, color: r.defects_open > 0 ? 'var(--rh-danger)' : undefined }}>
                  {r.defects_open}
                </span>
              </td>
              <td className={styles.td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 48, height: 4, background: 'var(--rh-bg-muted)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      width: `${r.coverage_percent}%`, height: '100%', borderRadius: 2,
                      background: r.coverage_percent >= 61 ? 'var(--rh-teal)' : r.coverage_percent >= 31 ? 'var(--rh-warning)' : 'var(--rh-danger)',
                    }} />
                  </div>
                  <span className={styles.mono} style={{ fontSize: 12 }}>{r.coverage_percent}%</span>
                </div>
              </td>
              <td className={styles.td}>
                <ReleaseHealthChip score={r.health_score} level={r.health_level} />
              </td>
              <td className={styles.td}>
                {r.status === 'released' ? (
                  <span style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600, color: 'var(--rh-teal)' }}>Released</span>
                ) : (
                  <span className={styles.mono} style={{
                    fontSize: 12, fontWeight: 600,
                    color: r.days_until_target < 0 ? 'var(--rh-danger)' : r.days_until_target <= 7 ? 'var(--rh-warning)' : 'var(--rh-text-secondary)',
                  }}>
                    {r.days_until_target < 0 ? `${r.days_until_target}d` : `${r.days_until_target}d`}
                  </span>
                )}
              </td>
              <td className={styles.td}>
                <span style={{ fontSize: 13, color: 'var(--rh-text-secondary)' }}>
                  {r.owner_name || '—'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
