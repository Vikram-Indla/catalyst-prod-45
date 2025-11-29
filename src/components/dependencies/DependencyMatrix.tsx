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
      <Card className="overflow-auto bg-white">
        <div className="min-w-max">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 w-48 h-44">
                  {/* Empty corner cell */}
                </th>
                {programs.map((toProg) => (
                  <th
                    key={toProg.id}
                    className="border-b border-r border-gray-200 relative bg-white p-0 overflow-hidden"
                    style={{ width: '64px', height: '160px', minWidth: '64px' }}
                  >
                    <div 
                      className="absolute top-1/2 left-1/2 whitespace-nowrap text-xs text-gray-700 font-semibold cursor-pointer"
                      style={{ 
                        transform: 'translate(-50%, -50%) rotate(-90deg)',
                        transformOrigin: 'center center',
                        maxWidth: '150px'
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
                  <td className="sticky left-0 z-10 bg-white border-r border-b border-gray-200 px-4 py-3 w-48">
                    <div className="text-sm text-gray-700 font-semibold truncate">
                      {fromProg.name}
                    </div>
                  </td>
                  {programs.map((toProg) => {
                    const count = getDependencyCount(fromProg.id, toProg.id);
                    const isSameProgram = fromProg.id === toProg.id;

                    return (
                      <td
                        key={toProg.id}
                        className={`border-r border-b border-gray-200 text-center align-middle p-0 ${
                          isSameProgram 
                            ? 'bg-gray-200' 
                            : count === 0 
                              ? 'bg-white' 
                              : 'bg-[#2c3e50] cursor-pointer hover:bg-[#34495e] transition-colors'
                        }`}
                        onClick={() => !isSameProgram && count > 0 && handleCellClick(fromProg, toProg)}
                        style={{ width: '64px', height: '56px', minWidth: '64px' }}
                      >
                        {!isSameProgram && count > 0 && (
                          <div className="w-full h-full flex items-center justify-center text-white font-medium text-sm">
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
