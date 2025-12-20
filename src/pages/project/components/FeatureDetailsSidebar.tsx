/**
 * FeatureDetailsSidebar — Right sidebar with details
 * Shows real data only, displays "—" or "None" for missing fields.
 */

import { Pencil, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import styles from '../FeatureViewPage.module.css';

interface Feature {
  id: string;
  owner?: { id: string; name: string } | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  priority?: string | null;
  labels?: string[];
  component?: string | null;
  theme?: string | null;
  release?: string | null;
  reporter?: { id: string; name: string } | null;
}

interface FeatureDetailsSidebarProps {
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
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function FeatureDetailsSidebar({ feature }: FeatureDetailsSidebarProps) {
  const handleEdit = () => {
    toast.info('Edit details');
  };
  
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h3 className={styles.sidebarTitle}>DETAILS</h3>
        <button className={styles.editBtn} onClick={handleEdit} aria-label="Edit details">
          <Pencil size={12} />
        </button>
      </div>
      
      {/* Priority */}
      <div className={styles.sidebarField}>
        <span className={styles.sidebarFieldLabel}>Priority</span>
        <span className={styles.sidebarFieldValue}>
          {feature.priority?.toLowerCase() === 'high' ? (
            <span className={styles.priorityValue}>
              <AlertTriangle size={12} />
              High
            </span>
          ) : feature.priority ? (
            feature.priority
          ) : (
            <span className={styles.noneValue}>—</span>
          )}
        </span>
      </div>
      
      {/* Assignee */}
      <div className={styles.sidebarField}>
        <span className={styles.sidebarFieldLabel}>Assignee</span>
        <span className={styles.sidebarFieldValue}>
          {feature.owner ? (
            <>
              <div className={styles.avatar} style={{ width: 20, height: 20, fontSize: 9 }}>
                {getInitials(feature.owner.name)}
              </div>
              {feature.owner.name}
            </>
          ) : (
            <span className={styles.noneValue}>Unassigned</span>
          )}
        </span>
      </div>
      
      {/* Reporter */}
      <div className={styles.sidebarField}>
        <span className={styles.sidebarFieldLabel}>Reporter</span>
        <span className={styles.sidebarFieldValue}>
          {feature.reporter ? (
            <>
              <div className={styles.avatar} style={{ width: 20, height: 20, fontSize: 9 }}>
                {getInitials(feature.reporter.name)}
              </div>
              {feature.reporter.name}
            </>
          ) : (
            <span className={styles.noneValue}>—</span>
          )}
        </span>
      </div>
      
      {/* Start Date */}
      <div className={styles.sidebarField}>
        <span className={styles.sidebarFieldLabel}>Start Date</span>
        <span className={styles.sidebarFieldValue}>
          {formatDate(feature.planned_start_date)}
        </span>
      </div>
      
      {/* Due Date */}
      <div className={styles.sidebarField}>
        <span className={styles.sidebarFieldLabel}>Due Date</span>
        <span className={styles.sidebarFieldValue}>
          {formatDate(feature.planned_end_date)}
        </span>
      </div>
      
      {/* Labels */}
      <div className={styles.sidebarField}>
        <span className={styles.sidebarFieldLabel}>Labels</span>
        <span className={styles.sidebarFieldValue}>
          {feature.labels && feature.labels.length > 0 ? (
            feature.labels.map((label, i) => (
              <span key={i} className={styles.labelTag}>{label}</span>
            ))
          ) : (
            <span className={styles.noneValue}>None</span>
          )}
        </span>
      </div>
      
      {/* Additional Fields Section */}
      <div className={styles.sidebarSectionTitle}>ADDITIONAL FIELDS</div>
      
      {/* Component */}
      <div className={styles.sidebarField}>
        <span className={styles.sidebarFieldLabel}>Component</span>
        <span className={styles.sidebarFieldValue}>
          {feature.component || <span className={styles.noneValue}>Not configured</span>}
        </span>
      </div>
      
      {/* Theme */}
      <div className={styles.sidebarField}>
        <span className={styles.sidebarFieldLabel}>Theme</span>
        <span className={styles.sidebarFieldValue}>
          <span className={styles.noneValue}>Not configured</span>
        </span>
      </div>
      
      {/* Release */}
      <div className={styles.sidebarField}>
        <span className={styles.sidebarFieldLabel}>Release</span>
        <span className={styles.sidebarFieldValue}>
          {feature.release || <span className={styles.noneValue}>Not configured</span>}
        </span>
      </div>
      
      {/* Req. Status */}
      <div className={styles.sidebarField}>
        <span className={styles.sidebarFieldLabel}>Req. Status</span>
        <span className={styles.sidebarFieldValue}>—</span>
      </div>
      
      {/* Complexity */}
      <div className={styles.sidebarField}>
        <span className={styles.sidebarFieldLabel}>Complexity</span>
        <span className={styles.sidebarFieldValue}>—</span>
      </div>
    </aside>
  );
}
