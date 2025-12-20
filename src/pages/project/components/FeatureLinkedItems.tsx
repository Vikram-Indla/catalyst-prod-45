/**
 * FeatureLinkedItems — Dependencies and related items
 * Fetches real data from dependencies table, shows "None" if empty.
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
  // Fetch real dependencies from database
  const { data: linkedItems = [] } = useQuery({
    queryKey: ['feature-linked-items', featureId],
    queryFn: async (): Promise<LinkedItem[]> => {
      // Fetch dependencies where this feature is the requestor (depends on)
      const { data: dependsOn, error: dependsError } = await supabase
        .from('dependencies')
        .select(`
          id,
          to_feature_id,
          to_feature:features!dependencies_to_feature_id_fkey(id, display_id, name)
        `)
        .eq('from_feature_id', featureId);
      
      // Fetch dependencies where this feature is the target (blocks)
      const { data: blocks, error: blocksError } = await supabase
        .from('dependencies')
        .select(`
          id,
          from_feature_id,
          from_feature:features!dependencies_from_feature_id_fkey(id, display_id, name)
        `)
        .eq('to_feature_id', featureId);
      
      const items: LinkedItem[] = [];
      
      if (!dependsError && dependsOn) {
        dependsOn.forEach((dep: any) => {
          if (dep.to_feature) {
            items.push({
              id: dep.id,
              type: 'depends',
              linkedFeatureId: dep.to_feature.id,
              linkedFeatureDisplayId: dep.to_feature.display_id || `FEAT-${dep.to_feature.id.slice(0, 4).toUpperCase()}`,
              linkedFeatureName: dep.to_feature.name,
            });
          }
        });
      }
      
      if (!blocksError && blocks) {
        blocks.forEach((dep: any) => {
          if (dep.from_feature) {
            items.push({
              id: dep.id,
              type: 'blocks',
              linkedFeatureId: dep.from_feature.id,
              linkedFeatureDisplayId: dep.from_feature.display_id || `FEAT-${dep.from_feature.id.slice(0, 4).toUpperCase()}`,
              linkedFeatureName: dep.from_feature.name,
            });
          }
        });
      }
      
      return items;
    },
    enabled: !!featureId,
  });
  
  const handleAddLink = () => {
    toast.info('Add link functionality coming soon');
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
          <span className={styles.noneValue}>No linked items</span>
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
