/**
 * FeatureLinkedItems — Dependencies and Risks linked to this feature
 * 2-step flow: LinkTypeSelector → CreateDependencyDialog OR RiskLinkDialog
 */

import { useState } from 'react';
import { Plus, ArrowRight, ArrowLeft, AlertTriangle, ExternalLink } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CreateDependencyDialog } from '@/components/dependencies/CreateDependencyDialog';
import { LinkTypeSelectorDialog } from './LinkTypeSelectorDialog';
import { RiskLinkDialog } from './RiskLinkDialog';
import { Tooltip } from '@/components/ads';
import styles from '../FeatureViewPage.module.css';

interface FeatureLinkedItemsProps {
  featureId: string;
  programId?: string | null;
}

interface LinkedDependency {
  id: string;
  type: 'depends' | 'blocks' | 'related';
  linkType: 'dependency';
  linkedFeatureId: string;
  linkedFeatureDisplayId: string;
  linkedFeatureName: string;
}

interface LinkedRisk {
  id: string;
  linkType: 'risk';
  riskId: string;
  riskNumber: number;
  riskTitle: string;
  riskStatus: string | null;
}

type LinkedItem = LinkedDependency | LinkedRisk;

export function FeatureLinkedItems({ featureId, programId }: FeatureLinkedItemsProps) {
  const queryClient = useQueryClient();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [dependencyDialogOpen, setDependencyDialogOpen] = useState(false);
  const [riskDialogOpen, setRiskDialogOpen] = useState(false);

  // Fetch dependencies from dependencies table
  const { data: dependencies = [] } = useQuery({
    queryKey: ['feature-dependencies', featureId],
    queryFn: async (): Promise<LinkedDependency[]> => {
      const items: LinkedDependency[] = [];

      // Fetch dependencies where this feature depends on another
      const { data: dependsOn } = await supabase
        .from('dependencies')
        .select(`
          id,
          to_feature_id,
          to_feature:features!dependencies_to_feature_id_fkey(id, display_id, name)
        `)
        .eq('from_feature_id', featureId);

      if (dependsOn) {
        dependsOn.forEach((dep: any) => {
          if (dep.to_feature) {
            items.push({
              id: dep.id,
              type: 'depends',
              linkType: 'dependency',
              linkedFeatureId: dep.to_feature.id,
              linkedFeatureDisplayId: dep.to_feature.display_id || `FEAT-${dep.to_feature.id.slice(0, 4).toUpperCase()}`,
              linkedFeatureName: dep.to_feature.name,
            });
          }
        });
      }

      // Fetch dependencies where this feature blocks another
      const { data: blocks } = await supabase
        .from('dependencies')
        .select(`
          id,
          from_feature_id,
          from_feature:features!dependencies_from_feature_id_fkey(id, display_id, name)
        `)
        .eq('to_feature_id', featureId);

      if (blocks) {
        blocks.forEach((dep: any) => {
          if (dep.from_feature) {
            items.push({
              id: dep.id,
              type: 'blocks',
              linkType: 'dependency',
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

  // Fetch linked risks from work_item_links table
  const { data: linkedRisks = [] } = useQuery({
    queryKey: ['feature-risk-links', featureId],
    queryFn: async (): Promise<LinkedRisk[]> => {
      const { data: links } = await supabase
        .from('work_item_links')
        .select('id, to_work_item_id')
        .eq('from_work_item_id', featureId)
        .eq('from_work_item_type', 'feature')
        .eq('to_work_item_type', 'risk');

      if (!links || links.length === 0) return [];

      // Fetch risk details
      const riskIds = links.map((l) => l.to_work_item_id);
      const { data: risks } = await supabase
        .from('risks')
        .select('id, title, risk_number, status')
        .in('id', riskIds);

      if (!risks) return [];

      return links.map((link) => {
        const risk = risks.find((r) => r.id === link.to_work_item_id);
        return {
          id: link.id,
          linkType: 'risk' as const,
          riskId: link.to_work_item_id,
          riskNumber: risk?.risk_number || 0,
          riskTitle: risk?.title || 'Unknown Risk',
          riskStatus: risk?.status || null,
        };
      });
    },
    enabled: !!featureId,
  });

  // Combined list
  const linkedItems: LinkedItem[] = [...dependencies, ...linkedRisks];

  const handleDependencyClose = () => {
    setDependencyDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['feature-dependencies', featureId] });
    queryClient.invalidateQueries({ queryKey: ['feature-linked-items', featureId] });
  };

  const handleRiskSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['feature-risk-links', featureId] });
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
            <button className={styles.panelAction} onClick={() => setSelectorOpen(true)}>
              <Plus size={14} />
              Add link
            </button>
          </div>
        </div>
        <div className={styles.linkedItemsBody}>
          {linkedItems.length === 0 ? (
            <span className={styles.noneValue}>No linked items</span>
          ) : (
            linkedItems.map((item) => {
              if (item.linkType === 'dependency') {
                return (
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
                );
              } else {
                // Risk item
                return (
                  <div key={item.id} className={styles.linkedItem}>
                    <span className={styles.linkedType} style={{ color: 'hsl(var(--destructive))' }}>
                      <AlertTriangle size={12} />
                      RISK
                    </span>
                    <span
                      className={styles.linkedItemIcon}
                      style={{ background: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' }}
                    >
                      !
                    </span>
                    <span className={styles.linkedItemId}>RSK-{item.riskNumber}</span>
                    <span className={styles.linkedItemTitle}>{item.riskTitle}</span>
                    <Tooltip content="Coming soon">
                      <button
                        className={styles.linkedItemAction}
                        style={{ marginLeft: 'auto', opacity: 0.5, cursor: 'not-allowed' }}
                        disabled
                      >
                        <ExternalLink size={12} />
                      </button>
                    </Tooltip>
                  </div>
                );
              }
            })
          )}
        </div>
      </div>

      {/* Step 1: Link Type Selector */}
      <LinkTypeSelectorDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSelectDependency={() => setDependencyDialogOpen(true)}
        onSelectRisk={() => setRiskDialogOpen(true)}
        risksAvailable={true}
      />

      {/* Step 2A: Dependency Dialog */}
      <CreateDependencyDialog
        open={dependencyDialogOpen}
        onOpenChange={handleDependencyClose}
        defaultRequestingWorkItemId={featureId}
        defaultRequestingWorkItemType="feature"
      />

      {/* Step 2B: Risk Link Dialog */}
      <RiskLinkDialog
        open={riskDialogOpen}
        onOpenChange={setRiskDialogOpen}
        featureId={featureId}
        programId={programId}
        onSuccess={handleRiskSuccess}
      />
    </>
  );
}
