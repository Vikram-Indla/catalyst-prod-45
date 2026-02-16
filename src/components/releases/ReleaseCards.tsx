import type { ReleaseV2 } from '@/hooks/releases/useReleasesV2';
import { ReleaseCard } from './ReleaseCard';
import styles from '@/styles/release-hub.module.css';

interface Props {
  releases: ReleaseV2[];
  onNavigate: (id: string) => void;
}

export function ReleaseCards({ releases, onNavigate }: Props) {
  return (
    <div className={styles.cardsGrid}>
      {releases.map(r => (
        <ReleaseCard key={r.id} release={r} onClick={() => onNavigate(r.id)} />
      ))}
    </div>
  );
}
