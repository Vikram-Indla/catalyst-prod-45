/**
 * Context Panel Hook
 * Manages AI context selection for releases, cycles, and folders
 */

import { useState, useCallback } from 'react';
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

// Mock context data
const MOCK_CONTEXT_DATA: ContextPanelData = {
  activeRelease: {
    id: 'rel-1',
    name: 'Release 2.4.0',
    version: '2.4.0',
    status: 'In Progress',
    isSelected: true,
  },
  testCycles: [
    { id: 'cyc-1', name: 'Sprint 24.1 Regression', progress: 68, testCount: 245, isSelected: true },
    { id: 'cyc-2', name: 'Sprint 24.1 Smoke', progress: 100, testCount: 45, isSelected: false },
    { id: 'cyc-3', name: 'Integration Tests', progress: 42, testCount: 128, isSelected: false },
  ],
  testFolders: [
    { id: 'fld-1', name: 'Authentication', testCount: 67, isSelected: false },
    { id: 'fld-2', name: 'User Management', testCount: 45, isSelected: false },
    { id: 'fld-3', name: 'API Endpoints', testCount: 89, isSelected: false },
    { id: 'fld-4', name: 'Performance', testCount: 23, isSelected: false },
  ],
};

export function useContextPanel(): UseContextPanelReturn {
  const [contextData, setContextData] = useState<ContextPanelData>(MOCK_CONTEXT_DATA);
  const [isContextPanelOpen, setContextPanelOpen] = useState(true);

  const context: ConversationContext = {
    releaseId: contextData.activeRelease?.isSelected ? contextData.activeRelease.id : null,
    cycleIds: contextData.testCycles.filter(c => c.isSelected).map(c => c.id),
    folderIds: contextData.testFolders.filter(f => f.isSelected).map(f => f.id),
    releaseName: contextData.activeRelease?.isSelected ? contextData.activeRelease.name : null,
    cycleNames: contextData.testCycles.filter(c => c.isSelected).map(c => c.name),
    folderNames: contextData.testFolders.filter(f => f.isSelected).map(f => f.name),
  };

  const toggleRelease = useCallback(() => {
    setContextData(prev => ({
      ...prev,
      activeRelease: prev.activeRelease 
        ? { ...prev.activeRelease, isSelected: !prev.activeRelease.isSelected }
        : null,
    }));
  }, []);

  const toggleCycle = useCallback((id: string) => {
    setContextData(prev => ({
      ...prev,
      testCycles: prev.testCycles.map(c => 
        c.id === id ? { ...c, isSelected: !c.isSelected } : c
      ),
    }));
  }, []);

  const toggleFolder = useCallback((id: string) => {
    setContextData(prev => ({
      ...prev,
      testFolders: prev.testFolders.map(f => 
        f.id === id ? { ...f, isSelected: !f.isSelected } : f
      ),
    }));
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
