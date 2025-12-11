/**
 * Canonical Program-level Epic backlog view for Catalyst Epics vNext.
 * All navigation entry points for "Program → Epic Backlog" must route here.
 * Works across Portfolio, Program, and Team scopes with automatic type detection.
 */
import { useParams, useLocation } from 'react-router-dom';
import { BacklogStateProvider } from '@/modules/backlog/hooks/useBacklogState';
import { BacklogWorkspace } from '@/modules/backlog/components/BacklogWorkspace';
import type { BacklogScope, BacklogType } from '@/modules/backlog/types';

/**
 * Context-aware Backlog page that works across all organizational levels:
 * - Portfolio: themes, epics, objectives
 * - Program: features, objectives  
 * - Team: stories, defects, objectives
 */
export default function EpicBacklogWithSidebar() {
  const params = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  // Determine scope from route
  const scope: BacklogScope = params.portfolioId 
    ? 'portfolio' 
    : params.programId 
    ? 'program' 
    : params.teamId 
    ? 'team'
    : params.id?.startsWith('enterprise')
    ? 'enterprise'
    : 'portfolio';

  // Get type from query params or default based on scope
  const typeParam = searchParams.get('type') as BacklogType | null;
  const defaultType: BacklogType = 
    scope === 'portfolio' ? 'epic' :
    scope === 'program' ? 'feature' :
    scope === 'team' ? 'story' :
    'epic';
  
  const type: BacklogType = typeParam || defaultType;

  // Extract context ID
  const contextId = params.portfolioId || params.programId || params.teamId || params.id;

  return (
    <BacklogStateProvider initialScope={scope} initialType={type} contextId={contextId}>
      <BacklogWorkspace />
    </BacklogStateProvider>
  );
}
