import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PISelector } from '@/components/shared/PISelector';
import { AlertCircle } from 'lucide-react';

export default function CapacityPlanning() {
  const [selectedPIId, setSelectedPIId] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{ teamId: string; iterationId: string } | null>(null);
  const queryClient = useQueryClient();
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const { data: iterations } = useQuery({
    queryKey: ['iterations', selectedPIId],
    queryFn: async () => {
      if (!selectedPIId.length) return [];
      const { data, error } = await supabase
        .from('iterations')
        .select('*')
        .in('pi_id', selectedPIId)
        .order('start_date');
      if (error) throw error;
      return data;
    },
    enabled: selectedPIId.length > 0,
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data, error } = await supabase.from('teams').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: allocations } = useQuery({
    queryKey: ['capacity-allocations', selectedPIId],
    queryFn: async () => {
      if (!selectedPIId.length || !iterations) return [];
      const iterationIds = iterations.map(i => i.id);
      const { data, error } = await supabase
        .from('capacity_allocations')
        .select('*')
        .in('iteration_id', iterationIds);
      if (error) throw error;
      return data;
    },
    enabled: selectedPIId.length > 0 && !!iterations,
  });

  const updateAllocation = useMutation({
    mutationFn: async ({ teamId, iterationId, points }: { teamId: string; iterationId: string; points: number }) => {
      const existing = allocations?.find(a => a.team_id === teamId && a.iteration_id === iterationId);
      
      if (existing) {
        const { error } = await supabase
          .from('capacity_allocations')
          .update({ capacity_points: points })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('capacity_allocations')
          .insert({ team_id: teamId, iteration_id: iterationId, capacity_points: points });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-allocations'] });
    },
  });

  const getAllocation = (teamId: string, iterationId: string) => {
    return allocations?.find(a => a.team_id === teamId && a.iteration_id === iterationId);
  };

  const getIterationTotal = (iterationId: string) => {
    return allocations
      ?.filter(a => a.iteration_id === iterationId)
      .reduce((sum, a) => sum + (a.capacity_points || 0), 0) || 0;
  };

  const getTeamTotal = (teamId: string) => {
    return allocations
      ?.filter(a => a.team_id === teamId)
      .reduce((sum, a) => sum + (a.capacity_points || 0), 0) || 0;
  };

  const handleCellClick = (teamId: string, iterationId: string) => {
    setEditingCell({ teamId, iterationId });
    setTimeout(() => {
      const key = `${teamId}-${iterationId}`;
      inputRefs.current[key]?.focus();
      inputRefs.current[key]?.select();
    }, 0);
  };

  const handleCellBlur = async (teamId: string, iterationId: string, value: string) => {
    const points = parseFloat(value) || 0;
    await updateAllocation.mutateAsync({ teamId, iterationId, points });
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, teamId: string, iterationId: string) => {
    if (e.key === 'Enter') {
      const input = e.target as HTMLInputElement;
      handleCellBlur(teamId, iterationId, input.value);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Capacity Planning</h1>
          <p className="text-muted-foreground">Plan team capacity across iterations</p>
        </div>
      </div>

      <PISelector value={selectedPIId} onChange={setSelectedPIId} />

      {selectedPIId.length > 0 && iterations && teams && (
        <Card className="p-6">
          <div className="overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold sticky left-0 bg-card">Team</th>
                  {iterations.map(iteration => (
                    <th key={iteration.id} className="text-center p-3 font-semibold min-w-[120px]">
                      {iteration.name}
                    </th>
                  ))}
                  <th className="text-center p-3 font-semibold bg-muted/50">Total</th>
                </tr>
              </thead>
              <tbody>
                {teams.map(team => {
                  const teamTotal = getTeamTotal(team.id);
                  const teamBaseline = team.velocity_baseline || 0;
                  const variance = teamTotal - teamBaseline;
                  
                  return (
                    <tr key={team.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium sticky left-0 bg-card">{team.name}</td>
                      {iterations.map(iteration => {
                        const allocation = getAllocation(team.id, iteration.id);
                        const points = allocation?.capacity_points || 0;
                        const isEditing = editingCell?.teamId === team.id && editingCell?.iterationId === iteration.id;
                        
                        return (
                          <td
                            key={iteration.id}
                            className="p-0 text-center cursor-pointer hover:bg-muted"
                            onClick={() => !isEditing && handleCellClick(team.id, iteration.id)}
                          >
                            {isEditing ? (
                              <Input
                                ref={el => inputRefs.current[`${team.id}-${iteration.id}`] = el}
                                type="number"
                                defaultValue={points}
                                onBlur={(e) => handleCellBlur(team.id, iteration.id, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, team.id, iteration.id)}
                                className="h-12 text-center border-0 focus-visible:ring-2"
                              />
                            ) : (
                              <div className="h-12 flex items-center justify-center">
                                {points > 0 ? points : '-'}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3 text-center font-semibold bg-muted/50">
                        <div className="flex items-center justify-center gap-2">
                          <span>{teamTotal}</span>
                          {variance !== 0 && (
                            <Badge variant={variance > 0 ? 'default' : 'destructive'} className="text-xs">
                              {variance > 0 ? '+' : ''}{variance}
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-muted/50 font-semibold">
                  <td className="p-3">Total</td>
                  {iterations.map(iteration => {
                    const total = getIterationTotal(iteration.id);
                    return (
                      <td key={iteration.id} className="p-3 text-center">
                        {total}
                      </td>
                    );
                  })}
                  <td className="p-3 text-center">
                    {allocations?.reduce((sum, a) => sum + (a.capacity_points || 0), 0) || 0}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Tips:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Click any cell to edit capacity points</li>
                  <li>Press Enter to save changes</li>
                  <li>Variance shows difference from team baseline</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
