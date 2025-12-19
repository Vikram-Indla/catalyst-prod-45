/**
 * DependencyMatrix - Program x Program dependency matrix
 * 
 * Uses Epic container logic to build the matrix:
 * - Only Epic↔Epic dependencies show in Program matrix
 * - Derives program IDs from Epic's program_id
 * - Uses resolveWorkItem helpers for consistency
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WorkItemIcon } from './WorkItemIcon';
import { DEPENDENCY_TYPE_LABELS, DEPENDENCY_LEVEL_LABELS } from '@/lib/dependencies/types';
import { buildWorkItemMaps, resolveDependencyWorkItems, extractProgramIdsFromDep } from '@/lib/dependencies/resolveWorkItem';

interface DependencyMatrixProps {
  quarter?: string;
  onDependencyClick?: (depId: string) => void;
}

export function DependencyMatrix({ quarter, onDependencyClick }: DependencyMatrixProps) {
  const [selectedCell, setSelectedCell] = useState<{ fromId: string; toId: string; fromName: string; toName: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch programs
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

  // Fetch epics with program_id for container resolution
  const { data: epics } = useQuery({
    queryKey: ['epics-for-matrix'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('id, name, epic_key, program_id')
        .is('deleted_at', null);
      if (error) throw error;
      return data;
    },
  });

  // Fetch features for legacy resolution
  const { data: features } = useQuery({
    queryKey: ['features-for-matrix'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('id, name, display_id, project_id');
      if (error) throw error;
      return data;
    },
  });

  // Fetch dependencies - only get Epic↔Epic dependencies for program matrix
  const { data: dependencies } = useQuery({
    queryKey: ['dependencies-matrix', quarter],
    queryFn: async () => {
      let query = supabase
        .from('dependencies')
        .select(`
          *,
          from_feature:features!dependencies_from_feature_id_fkey(id, name, display_id, epic_id),
          to_feature:features!dependencies_to_feature_id_fkey(id, name, display_id, epic_id)
        `);
      
      if (quarter && quarter !== 'all') {
        query = query.eq('quarter', quarter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Build work item maps for resolution
  const workItemMaps = useMemo(() => {
    return buildWorkItemMaps(epics, features);
  }, [epics, features]);

  // Process dependencies to extract program-to-program relationships
  const programDependencies = useMemo(() => {
    if (!dependencies || !workItemMaps.epics.size) return [];

    return dependencies.map(dep => {
      const { sourceProgramId, targetProgramId } = extractProgramIdsFromDep(dep, workItemMaps);
      const { source, target } = resolveDependencyWorkItems(dep, workItemMaps);
      
      return {
        ...dep,
        sourceProgramId,
        targetProgramId,
        resolvedSource: source,
        resolvedTarget: target,
      };
    }).filter(dep => dep.sourceProgramId && dep.targetProgramId);
  }, [dependencies, workItemMaps]);

  const getDependencyCount = (fromProgramId: string, toProgramId: string) => {
    return programDependencies.filter(
      dep => dep.sourceProgramId === fromProgramId && dep.targetProgramId === toProgramId
    ).length;
  };

  const getCellDependencies = (fromProgramId: string, toProgramId: string) => {
    return programDependencies.filter(
      dep => dep.sourceProgramId === fromProgramId && dep.targetProgramId === toProgramId
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

  if (!programs || programs.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No programs found. Create programs to view dependency matrix.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-x-auto bg-card">
        <div className="min-w-min">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background border-b border-r border-border h-32 sm:h-36 md:h-44" style={{ width: 'fit-content', minWidth: '120px' }}>
                  {/* Empty corner cell */}
                </th>
                {programs.map((toProg) => (
                  <th
                    key={toProg.id}
                    className="border-b border-r border-border relative bg-background p-0 overflow-visible"
                    style={{ height: '140px', width: 'fit-content', minWidth: '48px' }}
                  >
                    <div 
                      className="absolute top-1/2 left-1/2 whitespace-nowrap text-[10px] sm:text-xs text-foreground font-semibold cursor-pointer px-2"
                      style={{ 
                        transform: 'translate(-50%, -50%) rotate(-90deg)',
                        transformOrigin: 'center center'
                      }}
                    >
                      {toProg.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {programs.map((fromProg) => (
                <tr key={fromProg.id}>
                  <td className="sticky left-0 z-10 bg-background border-r border-b border-border px-2 sm:px-3 md:px-4 py-2 sm:py-3" style={{ width: 'fit-content', minWidth: '120px' }}>
                    <div className="text-xs sm:text-sm text-foreground font-semibold whitespace-nowrap">
                      {fromProg.name}
                    </div>
                  </td>
                  {programs.map((toProg) => {
                    const count = getDependencyCount(fromProg.id, toProg.id);
                    const isSameProgram = fromProg.id === toProg.id;

                    return (
                      <td
                        key={toProg.id}
                        className={`border-r border-b border-border text-center align-middle p-0 h-12 sm:h-14 md:h-14 ${
                          isSameProgram && count === 0
                            ? 'bg-muted' 
                            : count === 0 
                              ? 'bg-background' 
                              : isSameProgram
                                ? 'bg-amber-500 cursor-pointer hover:bg-amber-500/90 transition-colors'
                                : 'bg-primary cursor-pointer hover:bg-primary/90 transition-colors'
                        }`}
                        style={{ width: 'fit-content', minWidth: '48px' }}
                        onClick={() => count > 0 && handleCellClick(fromProg, toProg)}
                      >
                        {count > 0 && (
                          <div className={`w-full h-full flex items-center justify-center font-medium text-xs sm:text-sm ${
                            isSameProgram ? 'text-amber-950' : 'text-primary-foreground'
                          }`}>
                            {count}
                          </div>
                        )}
                      </td>
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
                    <TableHead>Source</TableHead>
                    <TableHead>Target</TableHead>
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
                        <div className="flex items-center gap-2">
                          <WorkItemIcon type={dep.resolvedSource?.type || 'epic'} className="h-4 w-4" />
                          <span className="text-xs font-mono text-muted-foreground">
                            {dep.resolvedSource?.displayId || '-'}
                          </span>
                          <span className="truncate max-w-[150px]">
                            {dep.resolvedSource?.name || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <WorkItemIcon type={dep.resolvedTarget?.type || 'epic'} className="h-4 w-4" />
                          <span className="text-xs font-mono text-muted-foreground">
                            {dep.resolvedTarget?.displayId || '-'}
                          </span>
                          <span className="truncate max-w-[150px]">
                            {dep.resolvedTarget?.name || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {dep.dependency_level_v2 
                            ? DEPENDENCY_LEVEL_LABELS[dep.dependency_level_v2 as keyof typeof DEPENDENCY_LEVEL_LABELS]?.split(' ')[0] 
                            : dep.type || 'Epic'}
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
