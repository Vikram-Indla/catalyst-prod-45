/**
 * TestExecutionPage — Redirect to Test Management Module's Execution Runner
 * Route: /releases/execution/:cycleId/:testCaseId
 * 
 * This page now redirects to the test-management module's execution flow
 * which is fully wired to Supabase.
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function TestExecutionPage() {
  const { cycleId, testCaseId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the test-management module's cycle detail page
    // The cycle detail page has full execution capabilities
    if (cycleId) {
      navigate(`/test-management/cycles/${cycleId}`, { replace: true });
    } else {
      navigate('/test-management/cycles', { replace: true });
    }
  }, [cycleId, testCaseId, navigate]);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-muted-foreground">Redirecting to test execution...</p>
      </div>
    </div>
  );
}
