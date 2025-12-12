// Enterprise Roadmaps Page - Strategic Themes Roadmap
// Route: /enterprise/roadmaps
// THEME-ONLY: Supports Child Epic markers (circles on Theme bars)

import { useState, useCallback } from 'react';
import { RoadmapEngine } from '@/components/roadmap/RoadmapEngine';
import { themeRoadmapConfig } from '@/config/roadmaps/themeRoadmapConfig';
import { useThemeRoadmapItems } from '@/hooks/useThemeRoadmapItems';
import { ThemeDetailsDrawer } from '@/components/backlog/ThemeDetailsDrawer';
import { EpicDetailsPanel } from '@/components/items/epics/EpicDetailsPanel';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function EnterpriseRoadmapsPage() {
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  
  // Fetch themes for roadmap (includes child epics as markers)
  const { items, isLoading, childEpicsMap } = useThemeRoadmapItems();

  // Fetch selected theme data for drawer
  const { data: selectedTheme } = useQuery({
    queryKey: ['theme-detail', selectedThemeId],
    queryFn: async () => {
      if (!selectedThemeId) return null;
      const { data, error } = await supabase
        .from('strategic_themes')
        .select('*')
        .eq('id', selectedThemeId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedThemeId,
  });

  // Fetch selected epic data for drawer
  const { data: selectedEpic } = useQuery({
    queryKey: ['epic-detail-for-theme-roadmap', selectedEpicId],
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

  // Handle theme bar click - open theme drawer
  const handleThemeClick = useCallback((themeId: string) => {
    setSelectedThemeId(themeId);
  }, []);

  // Handle epic marker click - open epic drawer
  // This is called from RoadmapEngine when a milestone (epic marker) is clicked
  const handleEpicMarkerClick = useCallback((epicId: string) => {
    setSelectedEpicId(epicId);
  }, []);

  // Close theme drawer
  const handleCloseThemeDrawer = useCallback(() => {
    setSelectedThemeId(null);
  }, []);

  // Close epic drawer
  const handleCloseEpicDrawer = useCallback(() => {
    setSelectedEpicId(null);
  }, []);

  // Create config with openDrawer wired
  const configWithDrawer = {
    ...themeRoadmapConfig,
    openDrawer: handleThemeClick,
    // Theme-specific: handler for epic marker clicks
    onMilestoneClick: (data: { epicId?: string; index?: number }) => {
      if (data.epicId) {
        handleEpicMarkerClick(data.epicId);
      }
    },
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <RoadmapEngine 
        config={configWithDrawer}
        items={items}
        isLoading={isLoading}
        onItemClick={handleThemeClick}
      />

      {/* Theme Details Drawer */}
      {selectedTheme && (
        <ThemeDetailsDrawer
          theme={selectedTheme}
          isOpen={!!selectedThemeId}
          onClose={handleCloseThemeDrawer}
        />
      )}

      {/* Epic Details Drawer - Opens when clicking an Epic marker on Theme bar */}
      {selectedEpic && (
        <EpicDetailsPanel
          epic={selectedEpic}
          open={!!selectedEpicId}
          onClose={handleCloseEpicDrawer}
        />
      )}
    </div>
  );
}
