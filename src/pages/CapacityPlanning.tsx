import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PISelector } from '@/components/shared/PISelector';
import { AlertCircle, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/shared/PermissionGuard';

export default function CapacityPlanning() {
  const [selectedPIId, setSelectedPIId] = useState<string[]>([]);
  const [sharedServiceDialogOpen, setSharedServiceDialogOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');

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

  const handleCreateSharedService = async () => {
    if (!newServiceName.trim()) return;
    
    const { error } = await supabase
      .from('shared_services')
      .insert({ name: newServiceName.trim() });
    
    if (error) {
      toast.error('Failed to create shared service');
      return;
    }
    
    toast.success('Shared service created');
    setSharedServiceDialogOpen(false);
    setNewServiceName('');
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
                        {teams.map(team => (
                          <tr key={team.id} className="border-b hover:bg-muted/50">
                            <td className="p-3 font-medium sticky left-0 bg-card z-10">{team.name}</td>
                            {iterations.map(iteration => (
                              <td key={iteration.id} className="p-3 text-center">
                                -
                              </td>
                            ))}
                            <td className="p-3 text-center font-semibold bg-muted/50">0</td>
                          </tr>
                        ))}
                        <tr className="bg-muted/50 font-semibold">
                          <td className="p-3 sticky left-0 bg-muted/50 z-10">Total</td>
                          {iterations.map(iteration => (
                            <td key={iteration.id} className="p-3 text-center">0</td>
                          ))}
                          <td className="p-3 text-center">0</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Note: Capacity data tables have been consolidated. Use the Resource Allocations view in the Capacity Planner for detailed allocation management.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-1">Capacity Planning Tips:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Use the main Capacity Planner for resource allocation management</li>
                        <li>This page shows a read-only view of team capacity</li>
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
                  <p className="text-muted-foreground">
                    Capacity tracking has been consolidated into the main Capacity Planner module.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="load" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Load Factor</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Load factor visualization has been moved to the Capacity Planner module.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Select a Program Increment to view capacity planning</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Shared Service Dialog */}
      <Dialog open={sharedServiceDialogOpen} onOpenChange={setSharedServiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Shared Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="service-name">Service Name</Label>
              <Input
                id="service-name"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="Enter shared service name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSharedServiceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSharedService}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
