import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DependencyMatrixProps {
  piId?: string;
}

export function DependencyMatrix({ piId }: DependencyMatrixProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: dependencies } = useQuery({
    queryKey: ['dependencies-matrix', piId],
    queryFn: async () => {
      let query = supabase
        .from('dependencies')
        .select(`
          *,
          from_feature:features!dependencies_from_feature_id_fkey(id, name, program_id),
          to_feature:features!dependencies_to_feature_id_fkey(id, name, program_id)
        `);
      
      if (piId) {
        query = query.eq('pi_id', piId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getDependencyCount = (fromProgramId: string, toProgramId: string) => {
    if (!dependencies) return 0;
    return dependencies.filter(
      (dep: any) =>
        dep.from_feature?.program_id === fromProgramId &&
        dep.to_feature?.program_id === toProgramId
    ).length;
  };

  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-muted/30';
    if (count <= 2) return 'bg-green-500/20 hover:bg-green-500/30';
    if (count <= 5) return 'bg-yellow-500/20 hover:bg-yellow-500/30';
    return 'bg-red-500/20 hover:bg-red-500/30';
  };

  if (!programs || programs.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No programs found. Create programs to view dependency matrix.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Dependency Matrix</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500/20 border border-border" />
            <span className="text-muted-foreground">Low (1-2)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500/20 border border-border" />
            <span className="text-muted-foreground">Medium (3-5)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500/20 border border-border" />
            <span className="text-muted-foreground">High (6+)</span>
          </div>
        </div>
      </div>

      <Card className="overflow-auto">
        <div className="min-w-max">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background border-b border-r border-border p-3 text-left font-medium">
                  From / To
                </th>
                {programs.map((toProg) => (
                  <th
                    key={toProg.id}
                    className="border-b border-border p-3 text-left font-medium min-w-[120px]"
                  >
                    <div className="truncate">{toProg.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {programs.map((fromProg) => (
                <tr key={fromProg.id}>
                  <td className="sticky left-0 z-10 bg-background border-r border-b border-border p-3 font-medium">
                    <div className="truncate">{fromProg.name}</div>
                  </td>
                  {programs.map((toProg) => {
                    const count = getDependencyCount(fromProg.id, toProg.id);
                    const cellKey = `${fromProg.id}-${toProg.id}`;
                    const isHovered = hoveredCell === cellKey;

                    return (
                      <TooltipProvider key={toProg.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <td
                              className={`border-b border-border p-3 text-center cursor-pointer transition-colors ${getCellColor(count)} ${isHovered ? 'ring-2 ring-primary' : ''}`}
                              onMouseEnter={() => setHoveredCell(cellKey)}
                              onMouseLeave={() => setHoveredCell(null)}
                            >
                              {count > 0 && (
                                <Badge variant="secondary" className="font-mono">
                                  {count}
                                </Badge>
                              )}
                            </td>
                          </TooltipTrigger>
                          {count > 0 && (
                            <TooltipContent>
                              <p className="font-semibold">{count} dependencies</p>
                              <p className="text-xs text-muted-foreground">
                                From {fromProg.name} to {toProg.name}
                              </p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
