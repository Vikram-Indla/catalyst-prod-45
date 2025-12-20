/**
 * FeatureStoryProgress — Story-driven progress bar
 */

import type { FeatureProgress } from '@/types/feature.types';
import styles from '../FeatureViewPage.module.css';

interface FeatureStoryProgressProps {
  progress: FeatureProgress;
}

export function FeatureStoryProgress({ progress }: FeatureStoryProgressProps) {
  const donePercent = progress.totalStories > 0 
    ? (progress.completedStories / progress.totalStories) * 100 
    : 0;
  const inProgressPercent = progress.totalStories > 0 
    ? (progress.inProgressStories / progress.totalStories) * 100 
    : 0;
  
  return (
    <div className={styles.storyProgress}>
      <div className={styles.storyProgressHeader}>
        <span className={styles.storyProgressLabel}>STORY PROGRESS</span>
        <span className={styles.storyProgressStats}>
          <span className={styles.storyProgressStatsPercent}>
            {progress.completionPercent}%
          </span>
          {' · '}
          {progress.completedStories}/{progress.totalStories} stories done
        </span>
      </div>
      <div className={styles.progressBar}>
        <div 
          className={styles.progressDone} 
          style={{ width: `${donePercent}%` }} 
        />
        <div 
          className={styles.progressInProgress} 
          style={{ width: `${inProgressPercent}%` }} 
        />
      </div>
    </div>
  );
}
