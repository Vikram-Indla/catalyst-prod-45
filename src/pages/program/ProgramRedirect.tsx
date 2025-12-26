/**
 * ProgramRedirect - Handles /program route without programId
 * Redirects to last selected program or first available program
 */
import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePrograms, getLastProgramId } from '@/hooks/usePrograms';

export function ProgramRedirect() {
  const navigate = useNavigate();
  const { data: programs, isLoading } = usePrograms();

  useEffect(() => {
    if (isLoading) return;

    if (!programs || programs.length === 0) {
      // No programs exist, stay on this page or redirect to home
      return;
    }

    // Try to find last selected program
    const lastId = getLastProgramId();
    const targetProgram = lastId 
      ? programs.find(p => p.id === lastId) || programs[0]
      : programs[0];

    if (targetProgram) {
      navigate(`/program/${targetProgram.id}/epic-backlog`, { replace: true });
    }
  }, [programs, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading programs...</div>
      </div>
    );
  }

  if (!programs || programs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-lg font-medium text-foreground">No Programs Found</div>
        <div className="text-muted-foreground">Create your first program to get started.</div>
      </div>
    );
  }

  // Redirect handled by useEffect
  return null;
}
