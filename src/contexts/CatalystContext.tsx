import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

export type TierType = 'enterprise' | 'portfolio' | 'program' | 'team';

export interface IndustryFilters {
  processSteps: string[];
  quarters: string[];
  dateFrom: string;
  dateTo: string;
}

interface CatalystContextState {
  // Current tier
  tier: TierType;
  setTier: (tier: TierType) => void;
  
  // Entity IDs
  portfolioId: string | null;
  setPortfolioId: (id: string | null) => void;
  
  programId: string | null;
  setProgramId: (id: string | null) => void;
  
  teamIds: string[];
  setTeamIds: (ids: string[]) => void;
  
  // Time frame (Program Increments)
  piIds: string[];
  setPiIds: (ids: string[]) => void;
  
  // Snapshot (for Strategy/OKR)
  snapshotId: string | null;
  setSnapshotId: (id: string | null) => void;
  
  // Delivery Platform (for Industry/Product context)
  deliveryPlatform: string;
  setDeliveryPlatform: (platform: string) => void;
  
  // Industry Filters
  industryFilters: IndustryFilters;
  setIndustryFilters: (filters: IndustryFilters) => void;
}

const CatalystContext = createContext<CatalystContextState | undefined>(undefined);

const STORAGE_KEY = 'catalyst-context';

interface StoredContext {
  tier: TierType;
  portfolioId: string | null;
  programId: string | null;
  teamIds: string[];
  piIds: string[];
  snapshotId: string | null;
  deliveryPlatform: string;
  industryFilters?: IndustryFilters;
}

const DEFAULT_INDUSTRY_FILTERS: IndustryFilters = {
  processSteps: [],
  quarters: [],
  dateFrom: '',
  dateTo: ''
};

export function CatalystContextProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  
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
      teamIds: [],
      piIds: [],
      snapshotId: null,
      deliveryPlatform: 'all',
      industryFilters: DEFAULT_INDUSTRY_FILTERS,
    };
  };
  
  const initialState = loadInitialState();
  
  const [tier, setTier] = useState<TierType>(initialState.tier);
  const [portfolioId, setPortfolioId] = useState<string | null>(initialState.portfolioId);
  const [programId, setProgramId] = useState<string | null>(initialState.programId);
  const [teamIds, setTeamIds] = useState<string[]>(initialState.teamIds);
  const [piIds, setPiIds] = useState<string[]>(initialState.piIds);
  const [snapshotId, setSnapshotId] = useState<string | null>(initialState.snapshotId);
  const [deliveryPlatform, setDeliveryPlatform] = useState<string>(initialState.deliveryPlatform || 'all');
  const [industryFilters, setIndustryFilters] = useState<IndustryFilters>(initialState.industryFilters || DEFAULT_INDUSTRY_FILTERS);
  
  // Sync state to localStorage
  useEffect(() => {
    const state: StoredContext = {
      tier,
      portfolioId,
      programId,
      teamIds,
      piIds,
      snapshotId,
      deliveryPlatform,
      industryFilters,
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save context to localStorage:', error);
    }
  }, [tier, portfolioId, programId, teamIds, piIds, snapshotId, deliveryPlatform, industryFilters]);
  
  // Sync to URL params for shareability
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    
    if (portfolioId) params.set('portfolioId', portfolioId);
    else params.delete('portfolioId');
    
    if (programId) params.set('programId', programId);
    else params.delete('programId');
    
    if (teamIds.length > 0) params.set('teamIds', teamIds.join(','));
    else params.delete('teamIds');
    
    if (piIds.length > 0) params.set('piIds', piIds.join(','));
    else params.delete('piIds');
    
    if (snapshotId) params.set('snapshotId', snapshotId);
    else params.delete('snapshotId');
    
    setSearchParams(params, { replace: true });
  }, [portfolioId, programId, teamIds, piIds, snapshotId]);
  
  const value: CatalystContextState = {
    tier,
    setTier,
    portfolioId,
    setPortfolioId,
    programId,
    setProgramId,
    teamIds,
    setTeamIds,
    piIds,
    setPiIds,
    snapshotId,
    setSnapshotId,
    deliveryPlatform,
    setDeliveryPlatform,
    industryFilters,
    setIndustryFilters,
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
