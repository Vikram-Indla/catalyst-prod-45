/**
 * FeatureLinkedItems — Dependencies and related items
 * Uses real CreateDependencyDialog for adding new links.
 */

import { useState } from 'react';
import { Plus, ArrowRight, ArrowLeft } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CreateDependencyDialog } from '@/components/dependencies/CreateDependencyDialog';
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
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Fetch real dependencies from database
  const { data: linkedItems = [], refetch } = useQuery({
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

  const handleDialogClose = () => {
    setCreateDialogOpen(false);
    refetch();
    queryClient.invalidateQueries({ queryKey: ['feature-linked-items', featureId] });
  };
  
  return (
    <>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>
            Linked Items
            <span className={styles.panelCount}>{linkedItems.length}</span>
          </h2>
          <div className={styles.panelActions}>
            <button className={styles.panelAction} onClick={() => setCreateDialogOpen(true)}>
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
                  {item.type === 'depends' ? (
                    <>
                      <ArrowRight size={12} />
                      DEPENDS ON
                    </>
                  ) : item.type === 'blocks' ? (
                    <>
                      <ArrowLeft size={12} />
                      BLOCKS
                    </>
                  ) : (
                    'RELATED'
                  )}
                </span>
                <span className={styles.linkedItemIcon}>F</span>
                <span className={styles.linkedItemId}>{item.linkedFeatureDisplayId}</span>
                <span className={styles.linkedItemTitle}>{item.linkedFeatureName}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Dependency Dialog - uses existing component */}
      <CreateDependencyDialog
        open={createDialogOpen}
        onOpenChange={handleDialogClose}
        defaultRequestingWorkItemId={featureId}
        defaultRequestingWorkItemType="feature"
      />
    </>
  );
}