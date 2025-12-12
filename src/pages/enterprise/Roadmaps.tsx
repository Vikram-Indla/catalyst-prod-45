// Enterprise Roadmaps Page - Strategic Themes Roadmap
// Route: /enterprise/roadmaps

import { useState } from 'react';
import { RoadmapEngine } from '@/components/roadmap/RoadmapEngine';
import { themeRoadmapConfig } from '@/config/roadmaps/themeRoadmapConfig';
import { useThemeRoadmapItems } from '@/hooks/useThemeRoadmapItems';
import { ThemeDetailsDrawer } from '@/components/backlog/ThemeDetailsDrawer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function EnterpriseRoadmapsPage() {
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  
  // Fetch themes for roadmap
  const { items, isLoading } = useThemeRoadmapItems();

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

  // Handle theme bar click - open drawer
  const handleThemeClick = (themeId: string) => {
    setSelectedThemeId(themeId);
  };

  // Close drawer
  const handleCloseDrawer = () => {
    setSelectedThemeId(null);
  };

  // Create config with openDrawer wired
  const configWithDrawer = {
    ...themeRoadmapConfig,
    openDrawer: handleThemeClick,
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
          onClose={handleCloseDrawer}
        />
      )}
    </div>
  );
}
