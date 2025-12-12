import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProgramRoom() {
  const { programId } = useParams<{ programId: string }>();

  const { data: program, isLoading } = useQuery({
    queryKey: ['program', programId],
    queryFn: async () => {
      // First try to find as a program
      const { data: programData } = await supabase
        .from('programs')
        .select(`
          id,
          name,
          portfolio_id,
          portfolios (
            name
          )
        `)
        .eq('id', programId)
        .maybeSingle();
      
      if (programData) return programData;

      // If not found, check if it's a portfolio ID and get first program under it
      const { data: programUnderPortfolio } = await supabase
        .from('programs')
        .select(`
          id,
          name,
          portfolio_id,
          portfolios (
            name
          )
        `)
        .eq('portfolio_id', programId)
        .limit(1)
        .maybeSingle();
      
      return programUnderPortfolio;
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

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="h-[72px] border-b bg-card px-3 sm:px-6 flex items-center flex-shrink-0">
        <div className="flex items-center justify-between w-full gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold truncate">Program Room</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              For {program?.name}
              {program?.portfolios && ` · ${program.portfolios.name}`}
            </p>
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
        <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
          {/* Empty content - placeholder for future implementation */}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Program not found</p>
        </div>
      )}
    </div>
  );
}
