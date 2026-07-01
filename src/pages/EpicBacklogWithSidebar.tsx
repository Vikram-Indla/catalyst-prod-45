/**
 * Canonical Program-level Epic backlog view for Catalyst Epics vNext.
 * All navigation entry points for "Program → Epic Backlog" must route here.
 * 
 * IMPORTANT: This page ALWAYS shows Epics only - type is locked to 'epic'.
 * No PI/Portfolio selectors are shown. Uses date/quarter-based timeframes.
 * 
 * CRITICAL: Epics are scoped by programId from route - NO cross-program data leakage.
 */
import { useParams, Navigate } from 'react-router-dom';
import { usePortfolioByKey } from '@/hooks/usePortfolioByKey';
import { BacklogStateProvider } from '@/modules/backlog/hooks/useBacklogState';
import { BacklogWorkspace } from '@/modules/backlog/components/BacklogWorkspace';
import type { BacklogScope } from '@/modules/backlog/types';

/**
 * Epic Backlog page - always shows Epics for the current Program context.
 * Type is locked to 'epic' and cannot be changed.
 * PI terminology is hidden; uses date/quarter-based timeframes.
 */
export default function EpicBacklogWithSidebar() {
  const params = useParams<{ programId?: string; portfolioKey?: string; portfolioId?: string; teamSlug?: string; teamId?: string }>();

  // CRITICAL: programId from route is the single source of truth
  const programId = params.programId;

  // Portfolio key resolution (new slug-based route uses portfolioKey)
  const portfolioParam = params.portfolioKey ?? params.portfolioId;
  const { data: portfolio } = usePortfolioByKey(portfolioParam);
  const resolvedPortfolioId = portfolio?.id ?? (portfolioParam && /^[0-9a-f-]{36}$/.test(portfolioParam) ? portfolioParam : undefined);

  // HARD GUARD: If no programId in route, redirect to home (no cross-program leakage)
  if (!programId) {
    console.error('[EpicBacklog] No programId in route - cannot load epic backlog');
    return <Navigate to="/" replace />;
  }

  // Determine scope from route (typically 'program' for Epic Backlog)
  const scope: BacklogScope = resolvedPortfolioId
    ? 'portfolio'
    : params.programId
    ? 'program'
    : (params.teamSlug ?? params.teamId)
    ? 'team'
    : 'program';

  // Extract context ID (program ID for filtering Epics)
  const contextId = resolvedPortfolioId || params.programId || params.teamSlug || params.teamId;

  return (
    <BacklogStateProvider 
      key={programId} // CRITICAL: Force remount on programId change to clear stale state
      initialScope={scope} 
      initialType="epic"  // Always epic - locked for Epic Backlog route
      contextId={contextId}
      isEpicBacklog={true}  // Flag to hide PI/Viewing selectors
      programId={programId} // CRITICAL: Pass programId for data scoping
    >
      <BacklogWorkspace />
    </BacklogStateProvider>
  );
}
