import type { ReleaseV2 } from '@/hooks/releases/useReleasesV2';
import { GanttBar } from './GanttBar';
import styles from '@/styles/release-hub.module.css';

interface Props {
  releases: ReleaseV2[];
  onNavigate: (id: string) => void;
}

export function ReleaseTimeline({ releases, onNavigate }: Props) {
  const now = new Date();
  const year = now.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(year, i, 1);
    return { label: d.toLocaleString('en-US', { month: 'short' }), start: d, end: new Date(year, i + 1, 0) };
  });
  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year, 11, 31).getTime();
  const yearSpan = yearEnd - yearStart;
  const todayPct = ((now.getTime() - yearStart) / yearSpan) * 100;

  function getBarPos(r: ReleaseV2) {
    const s = r.start_date ? new Date(r.start_date).getTime() : now.getTime();
    const e = r.target_date ? new Date(r.target_date).getTime() : s + 30 * 86400000;
    const left = Math.max(0, ((s - yearStart) / yearSpan) * 100);
    const width = Math.max(2, ((e - s) / yearSpan) * 100);
    return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` };
  }

  return (
    <div className={styles.timelineContainer}>
      <div className={styles.timelineGrid}>
        <div className={styles.timelineHeaderLabel}>Release</div>
        <div className={styles.timelineMonths}>
          {months.map(m => <div key={m.label} className={styles.timelineMonth}>{m.label}</div>)}
        </div>
        {releases.map(r => {
          const pos = getBarPos(r);
          return (
            <div key={r.id} className={styles.timelineRow}>
              <div className={styles.timelineRowLabel}>
                <span className={styles.versionBadge} style={{ fontSize: 10 }}>{r.version}</span>
                <span className={styles.timelineRowLabelText}>{r.name}</span>
              </div>
              <div className={styles.timelineBarsCell}>
                <div className={styles.todayLine} style={{ left: `${todayPct}%` }}>
                  <span className={styles.todayLabel}>Today</span>
                </div>
                <GanttBar release={r} left={pos.left} width={pos.width} onClick={() => onNavigate(r.id)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
