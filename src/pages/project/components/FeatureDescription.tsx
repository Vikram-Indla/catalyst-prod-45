/**
 * FeatureDescription — Description panel with real edit capability
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Pencil, X, Check, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import styles from '../FeatureViewPage.module.css';

interface FeatureDescriptionProps {
  description: string;
  featureId: string;
  onUpdated?: () => void;
}

export function FeatureDescription({ description, featureId, onUpdated }: FeatureDescriptionProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(description);
  
  // Mutation for updating description
  const updateDescription = useMutation({
    mutationFn: async (newDescription: string) => {
      const { error } = await supabase
        .from('features')
        .update({ description: newDescription, updated_at: new Date().toISOString() })
        .eq('id', featureId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-view', featureId] });
      toast.success('Description updated');
      setIsEditing(false);
      onUpdated?.();
    },
    onError: (error: any) => {
      toast.error('Failed to update description', { description: error.message });
    },
  });

  const handleEdit = () => {
    setEditedDescription(description);
    setIsEditing(true);
  };

  const handleSave = () => {
    updateDescription.mutate(editedDescription.trim());
  };

  const handleCancel = () => {
    setEditedDescription(description);
    setIsEditing(false);
  };
  
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Description</h2>
        {isEditing ? (
          <div className={styles.panelActions}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleCancel}
              disabled={updateDescription.isPending}
            >
              <X size={14} />
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={updateDescription.isPending}
            >
              {updateDescription.isPending ? (
                <Loader2 size={14} className="animate-spin mr-1" />
              ) : (
                <Check size={14} className="mr-1" />
              )}
              Save
            </Button>
          </div>
        ) : (
          <button className={styles.editBtn} onClick={handleEdit}>
            <Pencil size={12} />
            Edit
          </button>
        )}
      </div>
      <div className={`${styles.panelBody} ${styles.panelBodyPadded}`}>
        {isEditing ? (
          <Textarea
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            placeholder="Add a description..."
            rows={6}
            className="resize-none"
            disabled={updateDescription.isPending}
          />
        ) : description ? (
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
