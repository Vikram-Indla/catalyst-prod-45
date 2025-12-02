import { useState, useEffect, useCallback } from 'react';
import { JiraPanelState, PANEL_WIDTH_PRESETS, AUTO_REFRESH_INTERVALS } from '@/types/jira-panel';

const STORAGE_KEY = 'catalyst_jira_panel_state';

const DEFAULT_STATE: JiraPanelState = {
  isOpen: false,
  activeTab: 'cases',
  width: PANEL_WIDTH_PRESETS.medium,
  defaultProgramId: null,
  showArchived: false,
  autoRefresh: true,
};

export function useJiraPanelState() {
  const [state, setState] = useState<JiraPanelState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULT_STATE, ...JSON.parse(stored) } : DEFAULT_STATE;
  });

  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (state.autoRefresh && state.isOpen) {
      const interval = setInterval(() => {
        window.dispatchEvent(new CustomEvent('jira-panel-refresh'));
      }, AUTO_REFRESH_INTERVALS.short);
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [state.autoRefresh, state.isOpen]);

  const togglePanel = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  const setActiveTab = useCallback((tab: JiraPanelState['activeTab']) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const updateSettings = useCallback((updates: Partial<JiraPanelState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const collapsePanel = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    state,
    togglePanel,
    setActiveTab,
    updateSettings,
    collapsePanel,
  };
}
