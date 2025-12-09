import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { deriveWorkspaceType, WorkspaceType } from '@/lib/workspaceContext';

export type TierType = 'enterprise' | 'portfolio' | 'program' | 'team';

export interface IndustryFilters {
  processSteps: string[];
  quarters: string[];
  deliveryPlatforms: string[];
}

interface CatalystContextState {
  // Current tier
  tier: TierType;
  setTier: (tier: TierType) => void;
  
  // Workspace context (derived from route + selections)
  workspaceType: WorkspaceType;
  
  // Entity IDs
  portfolioId: string | null;
  setPortfolioId: (id: string | null) => void;
  
  programId: string | null;
  setProgramId: (id: string | null) => void;
  
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  
  productId: string | null;
  setProductId: (id: string | null) => void;
  
  teamIds: string[];
  setTeamIds: (ids: string[]) => void;
  
  // Time frame (Quarters - formerly Program Increments)
  piIds: string[];
  setPiIds: (ids: string[]) => void;
  
  // Selected Quarter
  selectedQuarter: string | null;
  setSelectedQuarter: (quarter: string | null) => void;
  
  // Snapshot (for Strategy/OKR)
  snapshotId: string | null;
  setSnapshotId: (id: string | null) => void;
  
  // Industry Filters
  industryFilters: IndustryFilters;
  setIndustryFilters: (filters: IndustryFilters) => void;
  
  // Entity names for display
  programName: string | null;
  setProgramName: (name: string | null) => void;
  
  projectName: string | null;
  setProjectName: (name: string | null) => void;
}

const CatalystContext = createContext<CatalystContextState | undefined>(undefined);

const STORAGE_KEY = 'catalyst-context';

interface StoredContext {
  tier: TierType;
  portfolioId: string | null;
  programId: string | null;
  projectId: string | null;
  productId: string | null;
  teamIds: string[];
  piIds: string[];
  selectedQuarter: string | null;
  snapshotId: string | null;
  industryFilters?: IndustryFilters;
  programName: string | null;
  projectName: string | null;
}

const DEFAULT_INDUSTRY_FILTERS: IndustryFilters = {
  processSteps: [],
  quarters: [],
  deliveryPlatforms: []
};

export function CatalystContextProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  
  // Load from localStorage or defaults
  const loadInitialState = (): StoredContext => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load context from localStorage:', error);
    }
    
    return {
      tier: 'portfolio',
      portfolioId: null,
      programId: null,
      projectId: null,
      productId: null,
      teamIds: [],
      piIds: [],
      selectedQuarter: null,
      snapshotId: null,
      industryFilters: DEFAULT_INDUSTRY_FILTERS,
      programName: null,
      projectName: null,
    };
  };
  
  const initialState = loadInitialState();
  
  const [tier, setTier] = useState<TierType>(initialState.tier);
  const [portfolioId, setPortfolioId] = useState<string | null>(initialState.portfolioId);
  const [programId, setProgramId] = useState<string | null>(initialState.programId);
  const [projectId, setProjectId] = useState<string | null>(initialState.projectId);
  const [productId, setProductId] = useState<string | null>(initialState.productId);
  const [teamIds, setTeamIds] = useState<string[]>(initialState.teamIds);
  const [piIds, setPiIds] = useState<string[]>(initialState.piIds);
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(initialState.selectedQuarter);
  const [snapshotId, setSnapshotId] = useState<string | null>(initialState.snapshotId);
  const [industryFilters, setIndustryFilters] = useState<IndustryFilters>(initialState.industryFilters || DEFAULT_INDUSTRY_FILTERS);
  const [programName, setProgramName] = useState<string | null>(initialState.programName);
  const [projectName, setProjectName] = useState<string | null>(initialState.projectName);
  
  // Derive workspace type PURELY from route (single source of truth)
  const workspaceType = useMemo(() => 
    deriveWorkspaceType(location.pathname),
    [location.pathname]
  );
  
  // Sync state to localStorage
  useEffect(() => {
    const state: StoredContext = {
      tier,
      portfolioId,
      programId,
      projectId,
      productId,
      teamIds,
      piIds,
      selectedQuarter,
      snapshotId,
      industryFilters,
      programName,
      projectName,
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save context to localStorage:', error);
    }
  }, [tier, portfolioId, programId, projectId, productId, teamIds, piIds, selectedQuarter, snapshotId, industryFilters, programName, projectName]);
  
  // Sync to URL params for shareability
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    
    if (portfolioId) params.set('portfolioId', portfolioId);
    else params.delete('portfolioId');
    
    if (programId) params.set('programId', programId);
    else params.delete('programId');
    
    if (projectId) params.set('projectId', projectId);
    else params.delete('projectId');
    
    if (teamIds.length > 0) params.set('teamIds', teamIds.join(','));
    else params.delete('teamIds');
    
    if (piIds.length > 0) params.set('piIds', piIds.join(','));
    else params.delete('piIds');
    
    if (snapshotId) params.set('snapshotId', snapshotId);
    else params.delete('snapshotId');
    
    setSearchParams(params, { replace: true });
  }, [portfolioId, programId, projectId, teamIds, piIds, snapshotId]);
  
  const value: CatalystContextState = {
    tier,
    setTier,
    workspaceType,
    portfolioId,
    setPortfolioId,
    programId,
    setProgramId,
    projectId,
    setProjectId,
    productId,
    setProductId,
    teamIds,
    setTeamIds,
    piIds,
    setPiIds,
    selectedQuarter,
    setSelectedQuarter,
    snapshotId,
    setSnapshotId,
    industryFilters,
    setIndustryFilters,
    programName,
    setProgramName,
    projectName,
    setProjectName,
  };
  
  return (
    <CatalystContext.Provider value={value}>
      {children}
    </CatalystContext.Provider>
  );
}

export function useCatalystContext() {
  const context = useContext(CatalystContext);
  if (!context) {
    throw new Error('useCatalystContext must be used within CatalystContextProvider');
  }
  return context;
}

// Optional version that returns null when outside provider (useful for shared components)
export function useCatalystContextOptional() {
  return useContext(CatalystContext);
}
