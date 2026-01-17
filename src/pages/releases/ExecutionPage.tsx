/**
 * Test Execution Page - Redirect to Test Management Module
 * Route: /releases/execution
 * 
 * This page now redirects to the test-management module's cycle execution flow
 * which is fully wired to Supabase.
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useTestCycles } from '@/hooks/test-management';
import { useDefaultProject } from '@/hooks/useProjects';

export default function ExecutionPage() {
  const navigate = useNavigate();
  const { data: defaultProject, isLoading: projectLoading } = useDefaultProject();
  const { data: cycles = [], isLoading: cyclesLoading } = useTestCycles(defaultProject?.id);

  useEffect(() => {
    // Once we have cycles, redirect to the first active or planned cycle
    if (!cyclesLoading && !projectLoading && cycles.length > 0) {
      // Prefer active cycles, then planned, then first available
      const activeCycle = cycles.find(c => c.status === 'IN_PROGRESS');
      const plannedCycle = cycles.find(c => c.status === 'PLANNED');
      const targetCycle = activeCycle || plannedCycle || cycles[0];
      
      if (targetCycle) {
        navigate(`/test-management/cycles/${targetCycle.id}`, { replace: true });
      }
    }
  }, [cycles, cyclesLoading, projectLoading, navigate]);

  // Show loading while determining redirect
  if (projectLoading || cyclesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading test cycles...</p>
        </div>
      </div>
    );
  }

  // If no cycles, show empty state with link
  if (cycles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-medium">No test cycles found</p>
          <p className="text-muted-foreground">Create a test cycle to start executing tests.</p>
          <button
            onClick={() => navigate('/test-management/cycles')}
            className="text-primary hover:underline"
          >
            Go to Test Cycles →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}
