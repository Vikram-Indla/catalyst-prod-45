// Program Roadmaps Page - Epic Roadmap
// Route: /program/:programId/roadmaps

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ProgramPageLayout } from '@/components/program/ProgramPageLayout';
import { RoadmapEngine } from '@/components/roadmap/RoadmapEngine';
import { epicRoadmapConfig } from '@/config/roadmaps/epicRoadmapConfig';
import { useEpicRoadmapItems } from '@/hooks/useEpicRoadmapItems';
import { EpicDetailsPanel } from '@/components/items/epics/EpicDetailsPanel';
import { FeatureDetailsPanel } from '@/components/items/features/FeatureDetailsPanel';
import { supabase } from '@/integrations/supabase/client';

export default function RoadmapsWithSidebar() {
  const { programId } = useParams<{ programId: string }>();
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  // Fetch epics for roadmap, scoped to program
  const { items, isLoading } = useEpicRoadmapItems(programId);

  // Fetch selected epic data for drawer
  const { data: selectedEpic } = useQuery({
    queryKey: ['epic-detail', selectedEpicId],
    queryFn: async () => {
      if (!selectedEpicId) return null;
      const { data, error } = await supabase
        .from('epics')
        .select('*')
        .eq('id', selectedEpicId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEpicId,
  });

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

  // Handle epic bar click - open drawer
  const handleEpicClick = (epicId: string) => {
    setSelectedEpicId(epicId);
  };

  // Handle feature marker click - open feature drawer
  const handleFeatureMarkerClick = (milestoneData: { featureId?: string; epicId?: string; index?: number }) => {
    if (milestoneData.featureId) {
      setSelectedFeatureId(milestoneData.featureId);
    }
  };

  // Close epic drawer
  const handleCloseEpicDrawer = () => {
    setSelectedEpicId(null);
  };

  // Close feature drawer
  const handleCloseFeatureDrawer = () => {
    setSelectedFeatureId(null);
  };

  // Create config with openDrawer and onMilestoneClick wired
  const configWithDrawer = {
    ...epicRoadmapConfig,
    openDrawer: handleEpicClick,
    onMilestoneClick: handleFeatureMarkerClick,
  };

  return (
    <ProgramPageLayout>
      <div className="h-full flex flex-col bg-background">
        <RoadmapEngine
          config={configWithDrawer}
          items={items}
          isLoading={isLoading}
          onItemClick={handleEpicClick}
        />

        {/* Epic Details Panel */}
        {selectedEpic && (
          <EpicDetailsPanel
            epic={selectedEpic}
            open={!!selectedEpicId}
            onClose={handleCloseEpicDrawer}
          />
        )}

        {/* Feature Details Panel */}
        {selectedFeature && (
          <FeatureDetailsPanel
            feature={selectedFeature}
            open={!!selectedFeatureId}
            onClose={handleCloseFeatureDrawer}
          />
        )}
      </div>
    </ProgramPageLayout>
  );
}
