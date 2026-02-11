/**
 * Context Panel Hook
 * Manages AI context selection for releases, cycles, and folders
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ContextPanelData, ConversationContext } from '../types';

interface UseContextPanelReturn {
  contextData: ContextPanelData;
  context: ConversationContext;
  toggleRelease: () => void;
  toggleCycle: (id: string) => void;
  toggleFolder: (id: string) => void;
  isContextPanelOpen: boolean;
  setContextPanelOpen: (open: boolean) => void;
}

export function useContextPanel(projectId: string | null): UseContextPanelReturn {
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);
  const [selectedCycleIds, setSelectedCycleIds] = useState<string[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [isContextPanelOpen, setContextPanelOpen] = useState(true);

  // Fetch real data from database
  const { data: releases = [] } = useQuery({
    queryKey: ['releases', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await (supabase as any)
        .from('releases')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: testCycles = [] } = useQuery({
    queryKey: ['test-cycles', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await (supabase as any)
        .from('tm_test_cycles')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: testFolders = [] } = useQuery({
    queryKey: ['test-folders', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await (supabase as any)
        .from('th_test_folders')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!projectId,
  });

  // Transform to UI format
  const contextData: ContextPanelData = {
    activeRelease: releases.length > 0 ? {
      id: releases[0].id,
      name: releases[0].name || 'Unknown Release',
      version: releases[0].version || '',
      status: releases[0].status || 'Draft',
      isSelected: selectedReleaseId === releases[0].id,
    } : null,
    testCycles: testCycles.map(cycle => ({
      id: cycle.id,
      name: cycle.name || 'Unnamed Cycle',
      progress: 0,
      testCount: 0,
      isSelected: selectedCycleIds.includes(cycle.id),
    })),
    testFolders: testFolders.map(folder => ({
      id: folder.id,
      name: folder.name || 'Unnamed Folder',
      testCount: 0,
      isSelected: selectedFolderIds.includes(folder.id),
    })),
  };

  const context: ConversationContext = {
    releaseId: selectedReleaseId,
    cycleIds: selectedCycleIds,
    folderIds: selectedFolderIds,
    releaseName: contextData.activeRelease?.name || null,
    cycleNames: contextData.testCycles.filter(c => c.isSelected).map(c => c.name),
    folderNames: contextData.testFolders.filter(f => f.isSelected).map(f => f.name),
  };

  const toggleRelease = useCallback(() => {
    if (contextData.activeRelease) {
      setSelectedReleaseId(selectedReleaseId === contextData.activeRelease.id ? null : contextData.activeRelease.id);
    }
  }, [contextData.activeRelease, selectedReleaseId]);

  const toggleCycle = useCallback((id: string) => {
    setSelectedCycleIds(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }, []);

  const toggleFolder = useCallback((id: string) => {
    setSelectedFolderIds(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  }, []);

  return {
    contextData,
    context,
    toggleRelease,
    toggleCycle,
    toggleFolder,
    isContextPanelOpen,
    setContextPanelOpen,
  };
}
