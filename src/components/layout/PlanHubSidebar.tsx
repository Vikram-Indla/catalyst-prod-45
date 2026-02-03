/**
 * PlanHubSidebar — PlanHub module sidebar using SidebarBase
 * 
 * Uses the shared SidebarBase component for consistent styling across all non-admin sidebars.
 * Navigation items are conditionally rendered based on planhub_settings and planhub_ai_config.
 */

import { useEffect, useState } from 'react';
import { 
  LayoutGrid,
  FolderOpen, 
  GitCompare, 
  Layers, 
  Users, 
  Bot, 
  FileBarChart,
  Settings,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SidebarBase, SidebarConfig, SidebarMenuItem } from './SidebarBase';
import type { FeatureSettings, AIFeatures } from '@/types/planhub.types';

interface PlanHubSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function PlanHubSidebar({ expanded, onToggle, className }: PlanHubSidebarProps) {
  const [features, setFeatures] = useState<FeatureSettings | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);

  useEffect(() => {
    loadSettings();
    
    // Real-time subscription for settings changes
    const channel = supabase
      .channel('planhub-sidebar-settings')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'planhub_settings' },
        () => loadSettings()
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'planhub_ai_config' },
        () => loadSettings()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadSettings = async () => {
    try {
      // Load feature settings
      const { data: settingsData } = await supabase
        .from('planhub_settings')
        .select('*')
        .eq('key', 'features')
        .single();
      
      if (settingsData) {
        setFeatures(settingsData.value as unknown as FeatureSettings);
      }

      // Load AI config
      const { data: aiData } = await supabase
        .from('planhub_ai_config')
        .select('features_enabled')
        .single();
      
      if (aiData) {
        const aiFeatures = aiData.features_enabled as unknown as AIFeatures;
        setAiEnabled(aiFeatures?.assistant_enabled || false);
      }
    } catch (err) {
      console.error('Failed to load PlanHub settings:', err);
    }
  };

  // Build navigation items based on settings
  const buildNavItems = (): SidebarMenuItem[] => {
    const items: SidebarMenuItem[] = [
      { id: 'library', title: 'Plan Library', path: '/planhub', icon: FolderOpen, exact: true },
    ];

    if (features?.scenario_compare) {
      items.push({ id: 'compare', title: 'Scenario Compare', path: '/planhub/compare', icon: GitCompare });
    }

    if (features?.master_plan_view) {
      items.push({ id: 'master', title: 'Master Plan', path: '/planhub/master', icon: Layers });
    }

    if (features?.resource_management) {
      items.push({ id: 'resources', title: 'Resources', path: '/planhub/resources', icon: Users });
    }

    if (aiEnabled) {
      items.push({ id: 'ai', title: 'AI Assistant', path: '/planhub/ai', icon: Bot });
    }

    if (features?.report_center) {
      items.push({ id: 'reports', title: 'Report Center', path: '/planhub/reports', icon: FileBarChart });
    }

    return items;
  };

  const config: SidebarConfig = {
    badge: 'PH',
    label: 'PlanHub™',
    items: buildNavItems(),
    footerItem: {
      id: 'settings',
      title: 'PlanHub Settings',
      path: '/admin/planhub/general',
      icon: Settings,
      exact: true,
    },
  };

  return (
    <SidebarBase
      config={config}
      expanded={expanded}
      onToggle={onToggle}
      className={className}
    />
  );
}
