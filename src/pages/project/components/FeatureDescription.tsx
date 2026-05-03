/**
 * FeatureDescription — Description panel with real edit capability (ADS-compliant)
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CanonicalDescriptionField } from '@/components/shared/CanonicalDescriptionField';
import { useCanonicalDescription } from '@/hooks/useCanonicalDescription';
import { toast } from 'sonner';
import styles from '../FeatureViewPage.module.css';

interface FeatureDescriptionProps {
  description: string;
  featureId: string;
  onUpdated?: () => void;
}

export function FeatureDescription({ description, featureId, onUpdated }: FeatureDescriptionProps) {
  const queryClient = useQueryClient();
  const { description: fetchedDescription, save, isSaving, error } = useCanonicalDescription(
    featureId,
    'feature'
  );
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(description || fetchedDescription);

  const handleSave = async () => {
    try {
      await save(value);
      queryClient.invalidateQueries({ queryKey: ['feature-view', featureId] });
      toast.success('Description updated');
      setIsEditing(false);
      onUpdated?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update description';
      toast.error('Failed to update description', { description: message });
    }
  };

  const handleCancel = () => {
    setValue(description || fetchedDescription);
    setIsEditing(false);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Description</h2>
      </div>
      <div className={`${styles.panelBody} ${styles.panelBodyPadded}`}>
        <CanonicalDescriptionField
          workItemId={featureId}
          workItemType="feature"
          value={value}
          onChange={setValue}
          onSave={handleSave}
          onCancel={handleCancel}
          isEditing={isEditing}
          onEditToggle={setIsEditing}
          isLoading={isSaving}
          error={error?.message}
          maxLength={10000}
          placeholder="Add a description..."
          isRequired={false}
        />
      </div>
    </div>
  );
}
