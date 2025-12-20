/**
 * FeatureKeyDetails — Epic, Owner, Health, Planned Dates grid
 */

import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import styles from '../FeatureViewPage.module.css';

interface Feature {
  epic_id: string | null;
  epic?: { id: string; display_id: string; name: string } | null;
  owner_id: string | null;
  owner?: { id: string; name: string } | null;
  health: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
}

interface FeatureKeyDetailsProps {
  feature: Feature;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

function getHealthClass(health: string | null): string {
  switch (health?.toLowerCase()) {
    case 'green':
      return styles.healthOnTrack;
    case 'red':
    case 'yellow':
    case 'amber':
      return styles.healthAtRisk;
    default:
      return styles.healthOnTrack;
  }
}

function getHealthLabel(health: string | null): string {
  switch (health?.toLowerCase()) {
    case 'green':
      return 'ON TRACK';
    case 'red':
      return 'AT RISK';
    case 'yellow':
    case 'amber':
      return 'AT RISK';
    default:
      return 'ON TRACK';
  }
}

export function FeatureKeyDetails({ feature }: FeatureKeyDetailsProps) {
  const startDate = formatDate(feature.planned_start_date);
  const endDate = formatDate(feature.planned_end_date);
  const dateRange = startDate && endDate 
    ? `${startDate} – ${endDate}` 
    : startDate || endDate || '—';
  
  return (
    <div className={styles.keyDetailsGrid}>
      {/* Epic */}
      <div className={styles.keyDetailItem}>
        <div className={styles.keyDetailLabel}>EPIC</div>
        <div className={styles.keyDetailValue}>
          {feature.epic ? (
            <Link 
              to={`/epics/${feature.epic.id}`} 
              className={styles.epicLink}
            >
              <span className={styles.epicLinkIcon}>E</span>
              {feature.epic.display_id} · {feature.epic.name}
            </Link>
          ) : (
            <span className={styles.noneValue}>None</span>
          )}
        </div>
      </div>
      
      {/* Owner */}
      <div className={styles.keyDetailItem}>
        <div className={styles.keyDetailLabel}>OWNER</div>
        <div className={styles.keyDetailValue}>
          {feature.owner ? (
            <div className={styles.ownerValue}>
              <div className={styles.avatar}>
                {getInitials(feature.owner.name)}
              </div>
              <span>{feature.owner.name}</span>
            </div>
          ) : (
            <span className={styles.noneValue}>Unassigned</span>
          )}
        </div>
      </div>
      
      {/* Health */}
      <div className={styles.keyDetailItem}>
        <div className={styles.keyDetailLabel}>HEALTH</div>
        <div className={styles.keyDetailValue}>
          <span className={`${styles.healthBadge} ${getHealthClass(feature.health)}`}>
            <span className={styles.healthBadgeDot} />
            {getHealthLabel(feature.health)}
          </span>
        </div>
      </div>
      
      {/* Planned Dates */}
      <div className={styles.keyDetailItem}>
        <div className={styles.keyDetailLabel}>PLANNED DATES</div>
        <div className={styles.keyDetailValue}>
          <div className={styles.datesValue}>
            <Calendar size={14} />
            <span>{dateRange}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
