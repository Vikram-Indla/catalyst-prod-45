/**
 * FeatureBlockedBanner — Red blocked status banner
 */

import { Ban } from 'lucide-react';
import styles from '../FeatureViewPage.module.css';

interface FeatureBlockedBannerProps {
  reason: string;
}

export function FeatureBlockedBanner({ reason }: FeatureBlockedBannerProps) {
  return (
    <div className={styles.blockedBanner}>
      <div className={styles.blockedIcon}>
        <Ban size={14} />
      </div>
      <span className={styles.blockedLabel}>Blocked:</span>
      <span className={styles.blockedReason}>{reason}</span>
    </div>
  );
}
