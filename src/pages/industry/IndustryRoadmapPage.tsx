// Industry Roadmap Page - Business Request Roadmap
// Route: /industry/roadmaps-v1
// Rebuilt to use RoadmapEngine for full parity with Program Roadmap

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RoadmapEngine } from '@/components/roadmap/RoadmapEngine';
import { businessRequestRoadmapConfig } from '@/config/roadmaps/businessRequestRoadmapConfig';
import { useBusinessRequestRoadmapItems } from '@/modules/product-roadmap/hooks/useBusinessRequestRoadmapItems';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import { FeatureDetailsPanel } from '@/components/items/features/FeatureDetailsPanel';
import { supabase } from '@/integrations/supabase/client';
import GlobalPageHeader from '@/components/layout/GlobalPageHeader';

export default function IndustryRoadmapPage() {
  const queryClient = useQueryClient();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  // Fetch business requests for roadmap
  const { items, isLoading } = useBusinessRequestRoadmapItems();

  // Fetch selected feature data for drawer
  const { data: selectedFeature } = useQuery({
    queryKey: ['feature-detail', selectedFeatureId],
    queryFn: async () => {
      if (!selectedFeatureId) return null;
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('id', selectedFeatureId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFeatureId,
  });

  // Handle business request bar click - open drawer
  const handleRequestClick = (requestId: string) => {
    setSelectedRequestId(requestId);
  };

  // Handle feature marker click - open feature drawer
  const handleFeatureMarkerClick = (milestoneData: { featureId?: string; epicId?: string; index?: number }) => {
    if (milestoneData.featureId) {
      setSelectedFeatureId(milestoneData.featureId);
    }
  };

  // Close business request drawer
  const handleCloseRequestDrawer = () => {
    setSelectedRequestId(null);
    // Invalidate roadmap query to refresh after any changes
    queryClient.invalidateQueries({ queryKey: ['business-request-roadmap-items'] });
  };

  // Close feature drawer
  const handleCloseFeatureDrawer = () => {
    setSelectedFeatureId(null);
  };

  // Create config with openDrawer and onMilestoneClick wired
  const configWithDrawer = {
    ...businessRequestRoadmapConfig,
    openDrawer: handleRequestClick,
    onMilestoneClick: handleFeatureMarkerClick,
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <GlobalPageHeader 
        sectionLabel="INDUSTRY" 
        pageTitle="Business Request Roadmap"
      />
      
      {/* Roadmap Engine */}
      <div className="flex-1 overflow-hidden">
        <RoadmapEngine
          config={configWithDrawer}
          items={items}
          isLoading={isLoading}
          onItemClick={handleRequestClick}
        />
      </div>

      {/* Business Request Drawer */}
      <BusinessRequestDrawer
        requestId={selectedRequestId}
        isOpen={!!selectedRequestId}
        onClose={handleCloseRequestDrawer}
      />

      {/* Feature Details Panel */}
      {selectedFeature && (
        <FeatureDetailsPanel
          feature={selectedFeature}
          open={!!selectedFeatureId}
          onClose={handleCloseFeatureDrawer}
        />
      )}
    </div>
  );
}
