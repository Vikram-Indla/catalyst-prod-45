import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigation } from '@/contexts/NavigationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Target, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/shared/PermissionGuard';

interface PIObjective {
  id: string;
  pi_id: string;
  name: string;
  description: string;
  committed: boolean;
  actual_bv: number;
  planned_bv: number;
  stretch: boolean;
}

export default function PIObjectives() {
  const { selectedProgramId, selectedPIIds } = useNavigation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<PIObjective | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    committed: true,
    planned_bv: 0,
    actual_bv: 0,
    stretch: false,
  });
  const queryClient = useQueryClient();

  const selectedPIId = selectedPIIds?.[0];

  // Fetch PI details
  const { data: pi } = useQuery({
    queryKey: ['program-increment', selectedPIId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('*, portfolios(name)')
        .eq('id', selectedPIId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPIId,
  });

  // Fetch PI Objectives
  const { data: objectives } = useQuery({
    queryKey: ['pi-objectives', selectedProgramId, selectedPIId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pi_objectives')
        .select('*')
        .eq('program_id', selectedProgramId!)
        .eq('pi_id', selectedPIId!)
        .order('committed', { ascending: false })
        .order('stretch', { ascending: true })
        .order('name');
      if (error) throw error;
      return data as PIObjective[];
    },
    enabled: !!selectedProgramId && !!selectedPIId,
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...payload } = data;
      if (id) {
        const { error } = await supabase
          .from('pi_objectives')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pi_objectives')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pi-objectives'] });
      setDialogOpen(false);
      resetForm();
      toast.success(editingObjective ? 'Objective updated' : 'Objective created');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      committed: true,
      planned_bv: 0,
      actual_bv: 0,
      stretch: false,
    });
    setEditingObjective(null);
  };

  const handleSubmit = () => {
    if (!selectedPIId || !selectedProgramId) {
      toast.error('Please select a Program and PI');
      return;
    }
    mutation.mutate({
      ...formData,
      pi_id: selectedPIId,
      program_id: selectedProgramId,
      id: editingObjective?.id,
    });
  };

  const calculateProgress = (actual: number, planned: number) => {
    if (!planned) return 0;
    return Math.min((actual / planned) * 100, 100);
  };

  if (!selectedProgramId || !selectedPIId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Please select a Program and PI to view objectives</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-[72px] border-b bg-card px-6 flex items-center">
        <div className="flex items-center justify-between w-full">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">PI Objectives</h1>
            <p className="text-sm text-muted-foreground truncate">
              {pi?.name} • {pi?.portfolios?.name}
            </p>
          </div>
          <PermissionGuard requiredRole="program_manager" showMessage={false}>
            <Button
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
              className="flex-shrink-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              New PI Objective
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Committed Objectives */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Committed Objectives
            </h3>
            {objectives?.filter(obj => obj.committed && !obj.stretch).length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground text-center">No committed objectives yet</p>
                </CardContent>
              </Card>
            ) : (
              objectives
                ?.filter(obj => obj.committed && !obj.stretch)
                .map(objective => (
                  <Card key={objective.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base">{objective.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{objective.description}</p>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Business Value</span>
                          <span className="font-medium">
                            {objective.actual_bv} / {objective.planned_bv}
                          </span>
                        </div>
                        <Progress
                          value={calculateProgress(objective.actual_bv, objective.planned_bv)}
                          className="h-2"
                        />
                      </div>
                      <Badge variant="default">Committed</Badge>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>

          {/* Uncommitted Objectives */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Uncommitted Objectives
            </h3>
            {objectives?.filter(obj => !obj.committed && !obj.stretch).length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground text-center">No uncommitted objectives</p>
                </CardContent>
              </Card>
            ) : (
              objectives
                ?.filter(obj => !obj.committed && !obj.stretch)
                .map(objective => (
                  <Card key={objective.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base">{objective.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{objective.description}</p>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Business Value</span>
                          <span className="font-medium">
                            {objective.actual_bv} / {objective.planned_bv}
                          </span>
                        </div>
                        <Progress
                          value={calculateProgress(objective.actual_bv, objective.planned_bv)}
                          className="h-2"
                        />
                      </div>
                      <Badge variant="outline">Uncommitted</Badge>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>

          {/* Stretch Objectives */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-secondary" />
              Stretch Objectives
            </h3>
            {objectives?.filter(obj => obj.stretch).length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground text-center">No stretch objectives</p>
                </CardContent>
              </Card>
            ) : (
              objectives
                ?.filter(obj => obj.stretch)
                .map(objective => (
                  <Card key={objective.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base">{objective.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">{objective.description}</p>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Business Value</span>
                          <span className="font-medium">
                            {objective.actual_bv} / {objective.planned_bv}
                          </span>
                        </div>
                        <Progress
                          value={calculateProgress(objective.actual_bv, objective.planned_bv)}
                          className="h-2"
                        />
                      </div>
                      <Badge variant="secondary">Stretch</Badge>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingObjective ? 'Edit' : 'Create'} PI Objective</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Deliver MVP features"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the objective..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Planned BV</Label>
                <Input
                  type="number"
                  value={formData.planned_bv}
                  onChange={(e) => setFormData({ ...formData, planned_bv: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Actual BV</Label>
                <Input
                  type="number"
                  value={formData.actual_bv}
                  onChange={(e) => setFormData({ ...formData, actual_bv: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={
                  formData.stretch ? 'stretch' : formData.committed ? 'committed' : 'uncommitted'
                }
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    stretch: value === 'stretch',
                    committed: value === 'committed',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="committed">Committed</SelectItem>
                  <SelectItem value="uncommitted">Uncommitted</SelectItem>
                  <SelectItem value="stretch">Stretch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
