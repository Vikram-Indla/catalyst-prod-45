import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * Navigation Context for Catalyst-style persistent scope and time filters
 * Source: https://help.jiraalign.com/hc/en-us/articles/17158556046612-Navigate-Jira-Align
 * 
 * Provides persistent filtering across all rooms and views:
 * - Scope filter: Program/Project/Team selection
 * - Time filter: Program Increment (PI) selection
 * - These persist as users navigate between rooms
 */

export type RoomType = 'strategy' | 'program' | 'project' | 'team';

interface NavigationContextValue {
  // Current room
  currentRoom: RoomType;
  setCurrentRoom: (room: RoomType) => void;
  
  // Scope filters (persist across navigation)
  selectedProgramId: string | null;
  setSelectedProgramId: (id: string | null) => void;
  
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  
  selectedTeamId: string | null;
  setSelectedTeamId: (id: string | null) => void;
  
  // Time filter (persist across navigation)
  selectedPIIds: string[];
  setSelectedPIIds: (ids: string[]) => void;
  
  // Reset filters
  resetFilters: () => void;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentRoom, setCurrentRoom] = useState<RoomType>('program');
  
  // Load persisted filters from localStorage
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(() => {
    return localStorage.getItem('catalyst_program_id') || null;
  });
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    return localStorage.getItem('catalyst_project_id') || null;
  });
  
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(() => {
    return localStorage.getItem('catalyst_team_id') || null;
  });
  
  const [selectedPIIds, setSelectedPIIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('catalyst_pi_ids');
    return stored ? JSON.parse(stored) : [];
  });
  
  // Persist filters to localStorage
  useEffect(() => {
    if (selectedProgramId) {
      localStorage.setItem('catalyst_program_id', selectedProgramId);
    } else {
      localStorage.removeItem('catalyst_program_id');
    }
  }, [selectedProgramId]);
  
  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('catalyst_project_id', selectedProjectId);
    } else {
      localStorage.removeItem('catalyst_project_id');
    }
  }, [selectedProjectId]);
  
  useEffect(() => {
    if (selectedTeamId) {
      localStorage.setItem('catalyst_team_id', selectedTeamId);
    } else {
      localStorage.removeItem('catalyst_team_id');
    }
  }, [selectedTeamId]);
  
  useEffect(() => {
    if (selectedPIIds.length > 0) {
      localStorage.setItem('catalyst_pi_ids', JSON.stringify(selectedPIIds));
    } else {
      localStorage.removeItem('catalyst_pi_ids');
    }
  }, [selectedPIIds]);
  
  const resetFilters = () => {
    setSelectedProgramId(null);
    setSelectedProjectId(null);
    setSelectedTeamId(null);
    setSelectedPIIds([]);
  };
  
  return (
    <NavigationContext.Provider
      value={{
        currentRoom,
        setCurrentRoom,
        selectedProgramId,
        setSelectedProgramId,
        selectedProjectId,
        setSelectedProjectId,
        selectedTeamId,
        setSelectedTeamId,
        selectedPIIds,
        setSelectedPIIds,
        resetFilters,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}
