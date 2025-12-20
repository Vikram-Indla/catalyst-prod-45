/**
 * FeatureDetailsSidebar — Right sidebar with details
 * Shows real data only, displays "—" or "None" for missing fields.
 */

import { Pencil, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
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
  return (
    <aside className={styles.detailsSidebar}>
      <div className={styles.sidebarHeader}>
        <h3 className={styles.sidebarTitle}>DETAILS</h3>
      </div>
      
      <div className={styles.fieldList}>
        {/* Priority */}
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Priority</span>
          <span className={styles.fieldValue}>
            {feature.priority?.toLowerCase() === 'high' ? (
              <span className={styles.priorityHigh}>
                <AlertTriangle size={12} />
                High
              </span>
            ) : feature.priority ? (
              feature.priority
            ) : (
              <span className={styles.fieldValueEmpty}>—</span>
            )}
          </span>
        </div>
        
        {/* Assignee / Owner */}
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Assignee</span>
          <span className={styles.fieldValue}>
            {feature.owner ? (
              <div className={styles.ownerField}>
                <div className={styles.avatar} style={{ width: 20, height: 20, fontSize: 9 }}>
                  {getInitials(feature.owner.name)}
                </div>
                <span className={styles.ownerName}>{feature.owner.name}</span>
              </div>
            ) : (
              <span className={styles.fieldValueEmpty}>Unassigned</span>
            )}
          </span>
        </div>
        
        {/* Reporter */}
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Reporter</span>
          <span className={styles.fieldValue}>
            {feature.reporter ? (
              <div className={styles.ownerField}>
                <div className={styles.avatar} style={{ width: 20, height: 20, fontSize: 9 }}>
                  {getInitials(feature.reporter.name)}
                </div>
                <span>{feature.reporter.name}</span>
              </div>
            ) : (
              <span className={styles.fieldValueEmpty}>—</span>
            )}
          </span>
        </div>
        
        {/* Start Date */}
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Start Date</span>
          <span className={styles.fieldValue}>
            {formatDate(feature.planned_start_date)}
          </span>
        </div>
        
        {/* Due Date */}
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Due Date</span>
          <span className={styles.fieldValue}>
            {formatDate(feature.planned_end_date)}
          </span>
        </div>
        
        {/* Labels */}
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Labels</span>
          <span className={styles.fieldValue}>
            {feature.labels && feature.labels.length > 0 ? (
              <div className={styles.labelsList}>
                {feature.labels.map((label, i) => (
                  <span key={i} className={styles.labelTag}>{label}</span>
                ))}
              </div>
            ) : (
              <span className={styles.fieldValueEmpty}>None</span>
            )}
          </span>
        </div>
      </div>
      
      <div className={styles.sidebarDivider} />
      
      {/* Additional Fields Section */}
      <div className={styles.futureFieldsHeader}>ADDITIONAL FIELDS</div>
      
      <div className={`${styles.fieldList} ${styles.futureFields}`}>
        {/* Component */}
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Component</span>
          <span className={styles.fieldValue}>
            {feature.component || <span className={styles.fieldValueDeemphasized}>Not configured</span>}
          </span>
        </div>
        
        {/* Theme */}
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Theme</span>
          <span className={styles.fieldValue}>
            <span className={styles.fieldValueDeemphasized}>Not configured</span>
          </span>
        </div>
        
        {/* Release */}
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Release</span>
          <span className={styles.fieldValue}>
            {feature.release || <span className={styles.fieldValueDeemphasized}>Not configured</span>}
          </span>
        </div>
        
        {/* Req. Status */}
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Req. Status</span>
          <span className={styles.fieldValue}>
            <span className={styles.fieldValueDeemphasized}>—</span>
          </span>
        </div>
        
        {/* Complexity */}
        <div className={styles.fieldRow}>
          <span className={styles.fieldLabel}>Complexity</span>
          <span className={styles.fieldValue}>
            <span className={styles.fieldValueDeemphasized}>—</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
