import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BacklogState, BacklogScope, BacklogType, BacklogViewType, TimeboxType } from '../types';

interface BacklogStateContextValue extends BacklogState {
  setScope: (scope: BacklogScope) => void;
  setType: (type: BacklogType) => void;
  setTimebox: (type: TimeboxType, id?: string | null) => void;
  setView: (view: BacklogViewType) => void;
  setFilters: (filters: Record<string, unknown>) => void;
  setSort: (field: string, direction: 'asc' | 'desc') => void;
  setColumnsShown: (columns: string[]) => void;
  setHideAcceptedConfig: (config: Record<string, any>) => void;
  toggleUnassignedOpen: () => void;
  resetState: () => void;
  // Epic Backlog mode - locks type to 'epic' and hides PI/Viewing selectors
  isEpicBacklog: boolean;
}

const BacklogStateContext = createContext<BacklogStateContextValue | null>(null);

interface BacklogStateProviderProps {
  children: ReactNode;
  initialScope?: BacklogScope;
  initialType?: BacklogType;
  contextId?: string;
  /** When true, locks type to 'epic' and hides PI/Viewing selectors */
  isEpicBacklog?: boolean;
}

const DEFAULT_STATE: BacklogState = {
  scope: 'program',
  type: 'epic',
  timeboxType: 'all',  // Default to 'all' instead of 'pi' for Epic Backlog
  timeboxId: null,
  view: 'list',
  filters: {},
  sort: undefined,
  columnsShown: ['id', 'name', 'state', 'owner', 'progress', 'technicalScore', 'businessScore'],
  hideAcceptedConfig: {},
  unassignedOpen: false,
};

// Epic Backlog specific columns matching Jira Align: Epic, Labels, Points, MVP, Process Step, Strategic Value Score
const EPIC_BACKLOG_DEFAULT_COLUMNS = ['epic', 'labels', 'points', 'mvp', 'processStep', 'strategicValueScore'];

export function BacklogStateProvider({ 
  children, 
  initialScope, 
  initialType, 
  contextId,
  isEpicBacklog = false,
}: BacklogStateProviderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Parse URL params to initialize state
  const parseURLParams = (): BacklogState => {
    const params = new URLSearchParams(location.search);
    
    // For Epic Backlog, force type to 'epic' and timeboxType to 'all'
    const effectiveType = isEpicBacklog ? 'epic' : ((params.get('type') as BacklogType) || initialType || DEFAULT_STATE.type);
    const effectiveTimeboxType = isEpicBacklog ? 'all' : ((params.get('timeboxType') as TimeboxType) || DEFAULT_STATE.timeboxType);
    const defaultColumns = isEpicBacklog ? EPIC_BACKLOG_DEFAULT_COLUMNS : DEFAULT_STATE.columnsShown;
    
    return {
      scope: (params.get('scope') as BacklogScope) || initialScope || DEFAULT_STATE.scope,
      type: effectiveType,
      timeboxType: effectiveTimeboxType,
      timeboxId: isEpicBacklog ? null : (params.get('timeboxId') || DEFAULT_STATE.timeboxId),
      view: (params.get('view') as BacklogViewType) || DEFAULT_STATE.view,
      filters: params.get('filters') ? JSON.parse(params.get('filters')!) : DEFAULT_STATE.filters,
      sort: params.get('sort') ? JSON.parse(params.get('sort')!) : DEFAULT_STATE.sort,
      columnsShown: params.get('columns') ? params.get('columns')!.split(',') : defaultColumns,
      hideAcceptedConfig: params.get('hideAccepted') ? JSON.parse(params.get('hideAccepted')!) : DEFAULT_STATE.hideAcceptedConfig,
      unassignedOpen: params.get('unassigned') === 'true',
    };
  };

  const [state, setState] = useState<BacklogState>(parseURLParams);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('scope', state.scope);
    params.set('type', state.type);
    if (!isEpicBacklog) {
      params.set('timeboxType', state.timeboxType);
      if (state.timeboxId) params.set('timeboxId', state.timeboxId);
    }
    params.set('view', state.view);
    if (Object.keys(state.filters).length > 0) {
      params.set('filters', JSON.stringify(state.filters));
    }
    if (state.sort) {
      params.set('sort', JSON.stringify(state.sort));
    }
    if (state.columnsShown.length > 0) {
      params.set('columns', state.columnsShown.join(','));
    }
    if (Object.keys(state.hideAcceptedConfig).length > 0) {
      params.set('hideAccepted', JSON.stringify(state.hideAcceptedConfig));
    }
    if (state.unassignedOpen) {
      params.set('unassigned', 'true');
    }

    const newSearch = params.toString();
    if (newSearch !== location.search.slice(1)) {
      navigate(`${location.pathname}?${newSearch}`, { replace: true });
    }
  }, [state, navigate, location.pathname, isEpicBacklog]);

  const contextValue: BacklogStateContextValue = {
    ...state,
    isEpicBacklog,
    setScope: (scope) => setState((prev) => ({ ...prev, scope })),
    // For Epic Backlog, setType is a no-op (type is locked to 'epic')
    setType: (type) => {
      if (!isEpicBacklog) {
        setState((prev) => ({ ...prev, type }));
      }
    },
    setTimebox: (type, id) => {
      if (!isEpicBacklog) {
        setState((prev) => ({ ...prev, timeboxType: type, timeboxId: id || null }));
      }
    },
    setView: (view) => setState((prev) => ({ ...prev, view })),
    setFilters: (filters) => setState((prev) => ({ ...prev, filters })),
    setSort: (field, direction) => setState((prev) => ({ ...prev, sort: { field, direction } })),
    setColumnsShown: (columns) => setState((prev) => ({ ...prev, columnsShown: columns })),
    setHideAcceptedConfig: (config) => setState((prev) => ({ ...prev, hideAcceptedConfig: config })),
    toggleUnassignedOpen: () => setState((prev) => ({ ...prev, unassignedOpen: !prev.unassignedOpen })),
    resetState: () => setState(isEpicBacklog ? { ...DEFAULT_STATE, type: 'epic', columnsShown: EPIC_BACKLOG_DEFAULT_COLUMNS } : DEFAULT_STATE),
  };

  return (
    <BacklogStateContext.Provider value={contextValue}>
      {children}
    </BacklogStateContext.Provider>
  );
}

export function useBacklogState() {
  const context = useContext(BacklogStateContext);
  if (!context) {
    throw new Error('useBacklogState must be used within BacklogStateProvider');
  }
  return context;
}