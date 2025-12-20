/**
 * FeatureLinkedItems — Dependencies and related items
 */

import { Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import styles from '../FeatureViewPage.module.css';

interface FeatureLinkedItemsProps {
  featureId: string;
}

interface LinkedItem {
  id: string;
  type: 'depends' | 'blocks' | 'related';
  linkedFeatureId: string;
  linkedFeatureDisplayId: string;
  linkedFeatureName: string;
}

export function FeatureLinkedItems({ featureId }: FeatureLinkedItemsProps) {
  // Fetch dependencies from DB (mock for now since schema may vary)
  const { data: linkedItems = [] } = useQuery({
    queryKey: ['feature-linked-items', featureId],
    queryFn: async (): Promise<LinkedItem[]> => {
      // In a real app, fetch from dependencies table
      // For now, return mock data matching the screenshot
      return [
        {
          id: '1',
          type: 'depends',
          linkedFeatureId: 'feat-52910',
          linkedFeatureDisplayId: 'FEAT-52910',
          linkedFeatureName: 'API Gateway Infrastructure Setup',
        },
        {
          id: '2',
          type: 'blocks',
          linkedFeatureId: 'feat-54320',
          linkedFeatureDisplayId: 'FEAT-54320',
          linkedFeatureName: 'User Portal Frontend Authentication',
        },
      ];
    },
    enabled: !!featureId,
  });
  
  const handleAddLink = () => {
    toast.info('Add link');
  };
  
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>
          Linked Items
          <span className={styles.panelCount}>{linkedItems.length}</span>
        </h2>
        <div className={styles.panelActions}>
          <button className={styles.panelAction} onClick={handleAddLink}>
            <Plus size={14} />
            Add link
          </button>
        </div>
      </div>
      <div className={styles.linkedItemsBody}>
        {linkedItems.length === 0 ? (
          <span className={styles.noneValue}>No linked items.</span>
        ) : (
          linkedItems.map(item => (
            <div key={item.id} className={styles.linkedItem}>
              <span className={styles.linkedType}>
                {item.type === 'depends' ? 'DEPENDS ON' : item.type === 'blocks' ? 'BLOCKS' : 'RELATED'}
              </span>
              <span className={styles.linkedItemIcon}>F</span>
              <span className={styles.linkedItemId}>{item.linkedFeatureDisplayId}</span>
              <span className={styles.linkedItemTitle}>{item.linkedFeatureName}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
