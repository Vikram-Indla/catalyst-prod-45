/**
 * Canonical Program-level Epic backlog view for Catalyst Epics vNext.
 * All navigation entry points for "Program → Epic Backlog" must route here.
 * 
 * IMPORTANT: This page ALWAYS shows Epics only - type is locked to 'epic'.
 * No PI/Portfolio selectors are shown. Uses date/quarter-based timeframes.
 */
import { useParams } from 'react-router-dom';
import { BacklogStateProvider } from '@/modules/backlog/hooks/useBacklogState';
import { BacklogWorkspace } from '@/modules/backlog/components/BacklogWorkspace';
import type { BacklogScope } from '@/modules/backlog/types';

/**
 * Epic Backlog page - always shows Epics for the current Program context.
 * Type is locked to 'epic' and cannot be changed.
 * PI terminology is hidden; uses date/quarter-based timeframes.
 */
export default function EpicBacklogWithSidebar() {
  const params = useParams();

  // Determine scope from route (typically 'program' for Epic Backlog)
  const scope: BacklogScope = params.portfolioId 
    ? 'portfolio' 
    : params.programId 
    ? 'program' 
    : params.teamId 
    ? 'team'
    : 'program';

  // Extract context ID (program ID for filtering Epics)
  const contextId = params.portfolioId || params.programId || params.teamId;

  return (
    <BacklogStateProvider 
      initialScope={scope} 
      initialType="epic"  // Always epic - locked for Epic Backlog route
      contextId={contextId}
      isEpicBacklog={true}  // Flag to hide PI/Viewing selectors
    >
      <BacklogWorkspace />
    </BacklogStateProvider>
  );
}
