/**
 * FeatureDescription — Description panel with edit capability
 */

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import styles from '../FeatureViewPage.module.css';

interface FeatureDescriptionProps {
  description: string;
  featureId: string;
}

export function FeatureDescription({ description, featureId }: FeatureDescriptionProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  const handleEdit = () => {
    toast.info('Edit description');
    // Could open inline editor or modal
  };
  
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Description</h2>
        <button className={styles.editBtn} onClick={handleEdit}>
          <Pencil size={12} />
          Edit
        </button>
      </div>
      <div className={`${styles.panelBody} ${styles.panelBodyPadded}`}>
        {description ? (
          <div className={styles.descriptionText}>
            {description}
          </div>
        ) : (
          <div className={styles.noneValue}>
            No description provided.
          </div>
        )}
      </div>
    </div>
  );
}
