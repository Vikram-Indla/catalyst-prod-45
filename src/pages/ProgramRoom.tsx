import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgramEmptyState } from '@/components/workspace/ProgramEmptyState';
import { ProjectEmptyState } from '@/components/workspace/ProjectEmptyState';

export default function ProgramRoom() {
  const { programId } = useParams<{ programId: string }>();

  const { data: program, isLoading } = useQuery({
    queryKey: ['program', programId],
    queryFn: async () => {
      // First try to find as a project
      const { data: projectData } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          key,
          program_id,
          programs (
            id,
            name,
            key
          )
        `)
        .eq('id', programId)
        .maybeSingle();
      
      if (projectData) {
        return { 
          ...projectData, 
          type: 'project' as const,
          parentProgram: projectData.programs
        };
      }

      // If not found as project, try as a program
      const { data: programData } = await supabase
        .from('programs')
        .select(`
          id,
          name,
          key
        `)
        .eq('id', programId)
        .maybeSingle();
      
      if (programData) {
        return { ...programData, type: 'program' as const };
      }

      return null;
    },
    enabled: !!programId,
  });

  if (!programId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">No program selected</p>
      </div>
    );
  }

  const isProject = program?.type === 'project';
  const displayName = program?.name || '';
  const parentName = isProject ? (program as any)?.parentProgram?.name : undefined;

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* Header - aligned with sidebar header (h-12 = 48px) */}
      <div className="h-12 border-b bg-card px-3 sm:px-6 flex items-center flex-shrink-0">
        <div className="flex items-center justify-between w-full gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold truncate">
              {isProject ? 'Project Room' : 'Program Room'}
            </h1>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 overflow-auto">
          <div className="p-3 sm:p-4 md:p-6 space-y-4">
            <Skeleton className="h-8 w-full max-w-md" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
        </div>
      ) : program ? (
        <div className="flex-1 overflow-auto">
          {isProject ? (
            <ProjectEmptyState 
              projectId={program.id} 
              projectName={displayName} 
            />
          ) : (
            <ProgramEmptyState 
              programId={program.id} 
              programName={displayName} 
            />
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Program not found</p>
        </div>
      )}
    </div>
  );
}