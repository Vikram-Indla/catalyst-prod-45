import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * Navigation Context for Catalyst-style persistent scope and time filters
 * Source: https://help.jiraalign.com/hc/en-us/articles/17158556046612-Navigate-Jira-Align
 * 
 * Provides persistent filtering across all rooms and views:
 * - Scope filter: Portfolio/Program/Team selection
 * - Time filter: Program Increment (PI) selection
 * - These persist as users navigate between rooms
 */

export type RoomType = 'strategy' | 'portfolio' | 'program' | 'team';

interface NavigationContextValue {
  // Current room
  currentRoom: RoomType;
  setCurrentRoom: (room: RoomType) => void;
  
  // Scope filters (persist across navigation)
  selectedPortfolioId: string | null;
  setSelectedPortfolioId: (id: string | null) => void;
  
  selectedProgramId: string | null;
  setSelectedProgramId: (id: string | null) => void;
  
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
  const [currentRoom, setCurrentRoom] = useState<RoomType>('portfolio');
  
  // Load persisted filters from localStorage
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(() => {
    return localStorage.getItem('catalyst_portfolio_id') || null;
  });
  
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(() => {
    return localStorage.getItem('catalyst_program_id') || null;
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
    if (selectedPortfolioId) {
      localStorage.setItem('catalyst_portfolio_id', selectedPortfolioId);
    } else {
      localStorage.removeItem('catalyst_portfolio_id');
    }
  }, [selectedPortfolioId]);
  
  useEffect(() => {
    if (selectedProgramId) {
      localStorage.setItem('catalyst_program_id', selectedProgramId);
    } else {
      localStorage.removeItem('catalyst_program_id');
    }
  }, [selectedProgramId]);
  
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
    setSelectedPortfolioId(null);
    setSelectedProgramId(null);
    setSelectedTeamId(null);
    setSelectedPIIds([]);
  };
  
  return (
    <NavigationContext.Provider
      value={{
        currentRoom,
        setCurrentRoom,
        selectedPortfolioId,
        setSelectedPortfolioId,
        selectedProgramId,
        setSelectedProgramId,
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
