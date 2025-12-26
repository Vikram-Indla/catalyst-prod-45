/**
 * ProgramContext - Manages current program state for program-scoped pages
 * Extracts programId from route and provides it to child components
 */
import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useProgram, usePrograms, getLastProgramId, setLastProgramId } from '@/hooks/usePrograms';
import { useCatalystContext } from './CatalystContext';

interface ProgramContextState {
  programId: string | null;
  program: {
    id: string;
    name: string;
    key: string;
    description: string | null;
    status: string;
  } | null;
  isLoading: boolean;
  error: Error | null;
}

const ProgramContext = createContext<ProgramContextState | undefined>(undefined);

export function ProgramContextProvider({ children }: { children: ReactNode }) {
  const { programId: routeProgramId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { setProgramId, setProgramName } = useCatalystContext();

  // Fetch all programs for fallback
  const { data: programs, isLoading: programsLoading } = usePrograms();
  
  // Fetch current program
  const { data: program, isLoading: programLoading, error } = useProgram(routeProgramId || null);

  // Handle program ID resolution and redirection
  useEffect(() => {
    if (programsLoading) return;

    // If we have a valid program from route, save it
    if (routeProgramId && program) {
      setLastProgramId(routeProgramId);
      setProgramId(routeProgramId);
      setProgramName(program.name);
      return;
    }

    // If on /program without ID, redirect to last or first program
    if (location.pathname === '/program' || location.pathname === '/program/') {
      const lastId = getLastProgramId();
      const targetId = (lastId && programs?.find(p => p.id === lastId)) 
        ? lastId 
        : programs?.[0]?.id;

      if (targetId) {
        navigate(`/program/${targetId}/epic-backlog`, { replace: true });
      }
    }
  }, [routeProgramId, program, programs, programsLoading, location.pathname, navigate, setProgramId, setProgramName]);

  // If route is /program/:programId without sub-route, redirect to epic-backlog
  useEffect(() => {
    if (routeProgramId && location.pathname === `/program/${routeProgramId}`) {
      navigate(`/program/${routeProgramId}/epic-backlog`, { replace: true });
    }
  }, [routeProgramId, location.pathname, navigate]);

  const value: ProgramContextState = {
    programId: routeProgramId || null,
    program: program || null,
    isLoading: programsLoading || programLoading,
    error: error as Error | null,
  };

  return (
    <ProgramContext.Provider value={value}>
      {children}
    </ProgramContext.Provider>
  );
}

export function useProgramContext() {
  const context = useContext(ProgramContext);
  if (!context) {
    throw new Error('useProgramContext must be used within ProgramContextProvider');
  }
  return context;
}

/**
 * Hook to get the current program ID from context
 * Returns null if not in a program context
 */
export function useCurrentProgramId(): string | null {
  const context = useContext(ProgramContext);
  return context?.programId || null;
}
