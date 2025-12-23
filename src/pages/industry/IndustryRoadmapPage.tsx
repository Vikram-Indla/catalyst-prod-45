// Industry Roadmap Page - Business Request Roadmap
// Route: /industry/roadmaps-v1
// Cloned from RoadmapsWithSidebar.tsx (Program Epic Roadmap)
// Same UI/UX/Shell, only data source is business_requests instead of epics

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RoadmapEngine } from '@/components/roadmap/RoadmapEngine';
import { businessRequestRoadmapConfig } from '@/config/roadmaps/businessRequestRoadmapConfig';
import { useBusinessRequestRoadmapItems } from '@/hooks/useBusinessRequestRoadmapItems';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import { FeatureDetailsPanel } from '@/components/items/features/FeatureDetailsPanel';
import { supabase } from '@/integrations/supabase/client';

export default function IndustryRoadmapPage() {
  const [selectedBusinessRequestId, setSelectedBusinessRequestId] = useState<string | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  // Fetch business requests for roadmap (global - not scoped to program)
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
  const handleBusinessRequestClick = (requestId: string) => {
    setSelectedBusinessRequestId(requestId);
  };

  // Handle feature marker click - open feature drawer
  const handleFeatureMarkerClick = (milestoneData: { featureId?: string; epicId?: string; index?: number }) => {
    if (milestoneData.featureId) {
      setSelectedFeatureId(milestoneData.featureId);
    }
  };

  // Close business request drawer
  const handleCloseBusinessRequestDrawer = () => {
    setSelectedBusinessRequestId(null);
  };

  // Close feature drawer
  const handleCloseFeatureDrawer = () => {
    setSelectedFeatureId(null);
  };

  // Create config with openDrawer and onMilestoneClick wired
  const configWithDrawer = {
    ...businessRequestRoadmapConfig,
    openDrawer: handleBusinessRequestClick,
    onMilestoneClick: handleFeatureMarkerClick,
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <RoadmapEngine
        config={configWithDrawer}
        items={items}
        isLoading={isLoading}
        onItemClick={handleBusinessRequestClick}
      />

      {/* Business Request Drawer */}
      <BusinessRequestDrawer
        requestId={selectedBusinessRequestId}
        isOpen={!!selectedBusinessRequestId}
        onClose={handleCloseBusinessRequestDrawer}
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
