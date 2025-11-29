import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DependencyMatrixProps {
  piId?: string;
  onDependencyClick?: (depId: string) => void;
}

export function DependencyMatrix({ piId, onDependencyClick }: DependencyMatrixProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ fromId: string; toId: string; fromName: string; toName: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const getCellDependencies = (fromProgramId: string, toProgramId: string) => {
    if (!dependencies) return [];
    return dependencies.filter(
      (dep: any) =>
        dep.from_feature?.program_id === fromProgramId &&
        dep.to_feature?.program_id === toProgramId
    );
  };

  const handleCellClick = (fromProg: any, toProg: any) => {
    const count = getDependencyCount(fromProg.id, toProg.id);
    if (count > 0) {
      setSelectedCell({
        fromId: fromProg.id,
        toId: toProg.id,
        fromName: fromProg.name,
        toName: toProg.name,
      });
      setDialogOpen(true);
    }
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
                <th className="sticky left-0 z-10 bg-background border-b border-r border-border p-2 text-left font-medium w-32">
                  {/* Empty corner cell */}
                </th>
                {programs.map((toProg) => (
                  <th
                    key={toProg.id}
                    className="border-b border-border p-2 text-center font-medium"
                    style={{ minWidth: '80px' }}
                  >
                    <div className="text-sm font-medium text-foreground whitespace-nowrap">
                      {toProg.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {programs.map((fromProg) => (
                <tr key={fromProg.id}>
                  <td className="sticky left-0 z-10 bg-background border-r border-b border-border p-2 font-medium text-sm w-32">
                    <div className="truncate text-primary hover:text-primary/80 cursor-pointer">
                      {fromProg.name}
                    </div>
                  </td>
                  {programs.map((toProg) => {
                    const count = getDependencyCount(fromProg.id, toProg.id);
                    const cellKey = `${fromProg.id}-${toProg.id}`;
                    const isHovered = hoveredCell === cellKey;
                    const isSameProgram = fromProg.id === toProg.id;

                    return (
                      <TooltipProvider key={toProg.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <td
                              className={`border-b border-border p-1 text-center transition-all ${
                                isSameProgram 
                                  ? 'bg-muted/50 cursor-not-allowed' 
                                  : count === 0 
                                    ? 'bg-background hover:bg-muted/30 cursor-default' 
                                    : 'cursor-pointer hover:scale-105'
                              } ${isHovered && count > 0 ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                              onMouseEnter={() => !isSameProgram && setHoveredCell(cellKey)}
                              onMouseLeave={() => setHoveredCell(null)}
                              onClick={() => !isSameProgram && handleCellClick(fromProg, toProg)}
                              style={{ minWidth: '80px', height: '48px' }}
                            >
                              {!isSameProgram && count > 0 && (
                                <div className="inline-flex items-center justify-center bg-[#1e3a5f] text-white font-semibold text-sm rounded px-3 py-1.5 min-w-[32px] hover:bg-[#2a4a7f] transition-colors">
                                  {count}
                                </div>
                              )}
                            </td>
                          </TooltipTrigger>
                          {count > 0 && !isSameProgram && (
                            <TooltipContent>
                              <p className="font-semibold">{count} dependencies</p>
                              <p className="text-xs text-muted-foreground">
                                From {fromProg.name} to {toProg.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">Click to view details</p>
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

      {/* Dependency Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Dependencies: {selectedCell?.fromName} → {selectedCell?.toName}
            </DialogTitle>
          </DialogHeader>
          {selectedCell && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action Required</TableHead>
                    <TableHead>Requested For</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Need By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk</TableHead>
                  </TableRow>
                </TableHeader>
                                 <TableBody>
                  {getCellDependencies(selectedCell.fromId, selectedCell.toId).map((dep: any) => (
                    <TableRow 
                      key={dep.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        if (onDependencyClick) {
                          onDependencyClick(dep.id);
                          setDialogOpen(false);
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        {dep.from_feature?.name || '-'}
                      </TableCell>
                      <TableCell>{dep.to_feature?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {dep.dependency_level || dep.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {dep.needed_by_date || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={dep.status === 'committed' ? 'default' : 'outline'} className="text-xs">
                          {dep.status?.replace('_', ' ').toUpperCase() || 'OPEN'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            dep.risk_level === 'high' ? 'destructive' :
                            dep.risk_level === 'med' ? 'secondary' :
                            'outline'
                          }
                          className="text-xs"
                        >
                          {dep.risk_level?.toUpperCase() || 'LOW'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
