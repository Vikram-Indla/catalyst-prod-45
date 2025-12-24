/**
 * FeatureBacklogPage — Program-level Feature Backlog
 * Route: /program/:programId/feature-backlog
 * 
 * CRITICAL: Features are scoped by programId from route - NO cross-program data leakage.
 * Matches EpicBacklogWithSidebar architecture exactly.
 */
import { useParams, Navigate } from 'react-router-dom';
import { FeatureBacklogWorkspace } from '../components/FeatureBacklogWorkspace';

export default function FeatureBacklogPage() {
  const params = useParams<{ programId: string }>();
  const programId = params.programId;

  // HARD GUARD: If no programId in route, redirect to home (no cross-program leakage)
  if (!programId) {
    console.error('[FeatureBacklog] No programId in route - cannot load feature backlog');
    return <Navigate to="/" replace />;
  }

  return (
    <FeatureBacklogWorkspace 
      key={programId} // CRITICAL: Force remount on programId change
      programId={programId} 
    />
  );
}
