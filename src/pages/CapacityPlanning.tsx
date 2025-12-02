import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PISelector } from '@/components/shared/PISelector';
import { AlertCircle, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/shared/PermissionGuard';

export default function CapacityPlanning() {
  const [selectedPIId, setSelectedPIId] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{ teamId: string; iterationId: string; field: string } | null>(null);
  const [sharedServiceDialogOpen, setSharedServiceDialogOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
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
      const { data, error } = await supabase
        .from('teams')
        .select('*, programs(portfolio_id)')
        .eq('status', 'active')
        .order('name');
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

  const { data: sharedServices } = useQuery({
    queryKey: ['shared-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_services')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: sharedServiceAllocations } = useQuery({
    queryKey: ['shared-service-allocations', selectedPIId],
    queryFn: async () => {
      if (!selectedPIId.length || !iterations) return [];
      const iterationIds = iterations.map(i => i.id);
      const { data, error } = await supabase
        .from('shared_service_allocations')
        .select('*')
        .in('iteration_id', iterationIds);
      if (error) throw error;
      return data;
    },
    enabled: selectedPIId.length > 0 && !!iterations,
  });

  const updateAllocation = useMutation({
    mutationFn: async ({ teamId, iterationId, field, value }: { 
      teamId: string; 
      iterationId: string; 
      field: string;
      value: number;
    }) => {
      const existing = allocations?.find(a => a.team_id === teamId && a.iteration_id === iterationId);
      
      if (existing) {
        const { error } = await supabase
          .from('capacity_allocations')
          .update({ [field]: value })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('capacity_allocations')
          .insert({ team_id: teamId, iteration_id: iterationId, [field]: value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-allocations'] });
      toast.success('Capacity updated');
    },
  });

  const createSharedService = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('shared_services')
        .insert({ name });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-services'] });
      toast.success('Shared service created');
      setSharedServiceDialogOpen(false);
      setNewServiceName('');
    },
  });

  const getAllocation = (teamId: string, iterationId: string) => {
    return allocations?.find(a => a.team_id === teamId && a.iteration_id === iterationId);
  };

  const getIterationTotal = (iterationId: string, field: 'capacity_points' | 'actual_capacity_points' = 'capacity_points') => {
    return allocations
      ?.filter(a => a.iteration_id === iterationId)
      .reduce((sum, a) => sum + (a[field] || 0), 0) || 0;
  };

  const getTeamTotal = (teamId: string, field: 'capacity_points' | 'actual_capacity_points' = 'capacity_points') => {
    return allocations
      ?.filter(a => a.team_id === teamId)
      .reduce((sum, a) => sum + (a[field] || 0), 0) || 0;
  };

  const handleCellClick = (teamId: string, iterationId: string, field: string) => {
    setEditingCell({ teamId, iterationId, field });
    setTimeout(() => {
      const key = `${teamId}-${iterationId}-${field}`;
      inputRefs.current[key]?.focus();
      inputRefs.current[key]?.select();
    }, 0);
  };

  const handleCellBlur = async (teamId: string, iterationId: string, field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    await updateAllocation.mutateAsync({ teamId, iterationId, field, value: numValue });
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, teamId: string, iterationId: string, field: string) => {
    if (e.key === 'Enter') {
      const input = e.target as HTMLInputElement;
      handleCellBlur(teamId, iterationId, field, input.value);
    }
  };

  const renderCapacityCell = (team: any, iteration: any, field: 'capacity_points' | 'actual_capacity_points' | 'load_factor') => {
    const allocation = getAllocation(team.id, iteration.id);
    const value = allocation?.[field] || 0;
    const isEditing = editingCell?.teamId === team.id && 
                      editingCell?.iterationId === iteration.id && 
                      editingCell?.field === field;
    
    return (
      <td
        key={`${iteration.id}-${field}`}
        className="p-0 text-center cursor-pointer hover:bg-muted"
        onClick={() => !isEditing && handleCellClick(team.id, iteration.id, field)}
      >
        {isEditing ? (
          <Input
            ref={el => inputRefs.current[`${team.id}-${iteration.id}-${field}`] = el}
            type="number"
            step={field === 'load_factor' ? '0.1' : '1'}
            defaultValue={value}
            onBlur={(e) => handleCellBlur(team.id, iteration.id, field, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, team.id, iteration.id, field)}
            className="h-12 text-center border-0 focus-visible:ring-2"
          />
        ) : (
          <div className="h-12 flex items-center justify-center">
            {value > 0 ? (field === 'load_factor' ? value.toFixed(1) : value) : '-'}
          </div>
        )}
      </td>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with responsive padding and design tokens */}
      <div className="border-b bg-card px-[var(--s3)] sm:px-[var(--s6)] py-[var(--s3)] sm:py-[var(--s4)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[var(--s3)]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Capacity Planning</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Plan and track team capacity across iterations
            </p>
          </div>
          <PermissionGuard requiredRole="program_manager" showMessage={false}>
            <Button onClick={() => setSharedServiceDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Shared Service</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Content with responsive padding and design tokens */}
      <div className="flex-1 overflow-auto px-[var(--s3)] sm:px-[var(--s6)] py-[var(--s3)] sm:py-[var(--s6)] space-y-[var(--s4)] sm:space-y-[var(--s6)]">
        <PISelector value={selectedPIId} onChange={setSelectedPIId} />

        {selectedPIId.length > 0 && iterations && teams ? (
          <Tabs defaultValue="planned">
            <TabsList>
              <TabsTrigger value="planned">Planned Capacity</TabsTrigger>
              <TabsTrigger value="actual">Actual vs Planned</TabsTrigger>
              <TabsTrigger value="load">Load Factor</TabsTrigger>
            </TabsList>

            <TabsContent value="planned" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Planned Capacity (Story Points)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-semibold sticky left-0 bg-card z-10">Team</th>
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
                          const teamTotal = getTeamTotal(team.id, 'capacity_points');
                          const teamBaseline = team.velocity_baseline || 0;
                          const variance = teamTotal - teamBaseline;
                          
                          return (
                            <tr key={team.id} className="border-b hover:bg-muted/50">
                              <td className="p-3 font-medium sticky left-0 bg-card z-10">{team.name}</td>
                              {iterations.map(iteration => renderCapacityCell(team, iteration, 'capacity_points'))}
                              <td className="p-3 text-center font-semibold bg-muted/50">
                                <div className="flex items-center justify-center gap-2">
                                  <span>{teamTotal}</span>
                                  {teamBaseline > 0 && variance !== 0 && (
                                    <Badge variant={variance > 0 ? 'default' : 'destructive'} className="text-xs">
                                      {variance > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                      {Math.abs(variance)}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-muted/50 font-semibold">
                          <td className="p-3 sticky left-0 bg-muted/50 z-10">Total</td>
                          {iterations.map(iteration => {
                            const total = getIterationTotal(iteration.id, 'capacity_points');
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
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-1">Capacity Planning Tips:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Click any cell to edit capacity points</li>
                        <li>Press Enter to save changes</li>
                        <li>Variance badges show difference from team velocity baseline</li>
                        <li>Account for holidays, training, and other leave when planning</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="actual" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actual vs Planned Capacity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-semibold sticky left-0 bg-card z-10">Team</th>
                          {iterations.map(iteration => (
                            <th key={iteration.id} className="text-center p-3 font-semibold min-w-[150px]">
                              <div>{iteration.name}</div>
                              <div className="text-xs font-normal text-muted-foreground">Plan / Actual</div>
                            </th>
                          ))}
                          <th className="text-center p-3 font-semibold bg-muted/50">Variance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map(team => {
                          const teamPlanned = getTeamTotal(team.id, 'capacity_points');
                          const teamActual = getTeamTotal(team.id, 'actual_capacity_points');
                          const variance = teamActual - teamPlanned;
                          
                          return (
                            <tr key={team.id} className="border-b hover:bg-muted/50">
                              <td className="p-3 font-medium sticky left-0 bg-card z-10">{team.name}</td>
                              {iterations.map(iteration => {
                                const allocation = getAllocation(team.id, iteration.id);
                                const planned = allocation?.capacity_points || 0;
                                const actual = allocation?.actual_capacity_points || 0;
                                
                                return (
                                  <td key={iteration.id} className="p-3 text-center">
                                    <div className="flex flex-col gap-1">
                                      <div className="text-muted-foreground">{planned || '-'}</div>
                                      <div 
                                        className="font-medium cursor-pointer hover:bg-muted rounded px-1"
                                        onClick={() => handleCellClick(team.id, iteration.id, 'actual_capacity_points')}
                                      >
                                        {editingCell?.teamId === team.id && 
                                         editingCell?.iterationId === iteration.id && 
                                         editingCell?.field === 'actual_capacity_points' ? (
                                          <Input
                                            ref={el => inputRefs.current[`${team.id}-${iteration.id}-actual_capacity_points`] = el}
                                            type="number"
                                            defaultValue={actual}
                                            onBlur={(e) => handleCellBlur(team.id, iteration.id, 'actual_capacity_points', e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, team.id, iteration.id, 'actual_capacity_points')}
                                            className="h-8 text-center border-0 focus-visible:ring-2"
                                          />
                                        ) : (
                                          actual || '-'
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                );
                              })}
                              <td className="p-3 text-center font-semibold bg-muted/50">
                                <Badge variant={variance >= 0 ? 'default' : 'destructive'}>
                                  {variance > 0 ? '+' : ''}{variance}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="load" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Team Load Factor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-semibold sticky left-0 bg-card z-10">Team</th>
                          {iterations.map(iteration => (
                            <th key={iteration.id} className="text-center p-3 font-semibold min-w-[120px]">
                              {iteration.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map(team => (
                          <tr key={team.id} className="border-b hover:bg-muted/50">
                            <td className="p-3 font-medium sticky left-0 bg-card z-10">{team.name}</td>
                            {iterations.map(iteration => renderCapacityCell(team, iteration, 'load_factor'))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <p>
                      Load factor represents team availability (0.0-1.0). Account for holidays, training, meetings, and other commitments.
                      Typical values: 0.8-0.9 for normal sprint, 0.6-0.7 during holiday periods.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Select a Program Increment to view capacity planning</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Shared Service Dialog */}
      <Dialog open={sharedServiceDialogOpen} onOpenChange={setSharedServiceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Shared Service</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Service Name</Label>
            <Input
              value={newServiceName}
              onChange={(e) => setNewServiceName(e.target.value)}
              placeholder="e.g., Platform Team, DevOps"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSharedServiceDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createSharedService.mutate(newServiceName)}
              disabled={!newServiceName || createSharedService.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
