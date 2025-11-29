import { useState } from 'react';
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

interface DependencyMatrixProps {
  piId?: string;
  onDependencyClick?: (depId: string) => void;
}

export function DependencyMatrix({ piId, onDependencyClick }: DependencyMatrixProps) {
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

  if (!programs || programs.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No programs found. Create programs to view dependency matrix.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-auto bg-background">
        <div className="min-w-max">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background border-b border-r border-border/40 w-32 h-32">
                  {/* Empty corner cell */}
                </th>
                {programs.map((toProg) => (
                  <th
                    key={toProg.id}
                    className="border-b border-r border-border/40 relative bg-background overflow-hidden"
                    style={{ width: '50px', height: '130px', minWidth: '50px' }}
                  >
                    <div 
                      className="absolute top-2 left-1/2 whitespace-nowrap text-xs text-primary hover:text-primary/80 cursor-pointer"
                      style={{ 
                        transform: 'rotate(90deg) translateY(-50%)',
                        transformOrigin: 'left center',
                        maxWidth: '120px'
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
                  <td className="sticky left-0 z-10 bg-background border-r border-b border-border/40 px-3 py-2 w-32 h-12">
                    <div className="text-sm text-primary hover:text-primary/80 cursor-pointer truncate">
                      {fromProg.name}
                    </div>
                  </td>
                  {programs.map((toProg) => {
                    const count = getDependencyCount(fromProg.id, toProg.id);
                    const isSameProgram = fromProg.id === toProg.id;

                    return (
                      <td
                        key={toProg.id}
                        className={`border-r border-b border-border/40 text-center align-middle ${
                          isSameProgram 
                            ? 'bg-muted/30' 
                            : count === 0 
                              ? 'bg-muted/10' 
                              : 'cursor-pointer hover:opacity-80'
                        }`}
                        onClick={() => !isSameProgram && count > 0 && handleCellClick(fromProg, toProg)}
                        style={{ width: '50px', height: '48px', minWidth: '50px' }}
                      >
                        {!isSameProgram && count > 0 && (
                          <div className="inline-flex items-center justify-center bg-[#1e3a5f] text-white font-semibold text-xs rounded px-2 py-1 min-w-[28px]">
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
