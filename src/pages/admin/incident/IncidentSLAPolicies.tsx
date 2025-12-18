import { useState } from 'react';
import { Pencil, Clock, AlertTriangle, Pause, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SLAConfig {
  id: string;
  severity: string;
  response_minutes: number;
  resolution_minutes: number;
}

interface PauseCondition {
  id: string;
  condition_type: string;
  condition_value: string;
  description: string | null;
  is_active: boolean;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} hrs`;
  return `${Math.round(minutes / 1440)} days`;
}

export default function IncidentSLAPolicies() {
  const queryClient = useQueryClient();
  const [editingSLA, setEditingSLA] = useState<SLAConfig | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    response_minutes: 0,
    resolution_minutes: 0,
  });

  const { data: slaConfigs = [], isLoading: slaLoading } = useQuery({
    queryKey: ['sla-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_configs')
        .select('*')
        .order('severity');

      if (error) throw error;
      return data as SLAConfig[];
    },
  });

  const { data: pauseConditions = [], isLoading: pauseLoading } = useQuery({
    queryKey: ['sla-pause-conditions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_pause_conditions')
        .select('*')
        .order('created_at');

      if (error) throw error;
      return data as PauseCondition[];
    },
  });

  const handleOpenDialog = (sla: SLAConfig) => {
    setEditingSLA(sla);
    setFormData({
      response_minutes: sla.response_minutes,
      resolution_minutes: sla.resolution_minutes,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSLA(null);
    setFormData({ response_minutes: 0, resolution_minutes: 0 });
  };

  const handleSubmit = async () => {
    if (!editingSLA) return;

    try {
      const { error } = await supabase
        .from('sla_configs')
        .update({
          response_minutes: formData.response_minutes,
          resolution_minutes: formData.resolution_minutes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingSLA.id);

      if (error) throw error;
      toast.success('SLA policy updated');
      queryClient.invalidateQueries({ queryKey: ['sla-configs'] });
      handleCloseDialog();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update SLA policy');
    }
  };

  const handleTogglePauseCondition = async (condition: PauseCondition) => {
    try {
      const { error } = await supabase
        .from('sla_pause_conditions')
        .update({ is_active: !condition.is_active })
        .eq('id', condition.id);

      if (error) throw error;
      toast.success(`Pause condition ${!condition.is_active ? 'enabled' : 'disabled'}`);
      queryClient.invalidateQueries({ queryKey: ['sla-pause-conditions'] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update pause condition');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'SEV1': return 'bg-red-500';
      case 'SEV2': return 'bg-orange-500';
      case 'SEV3': return 'bg-yellow-500';
      case 'SEV4': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">SLA Policies</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure response and resolution SLA targets by severity level
          </p>
        </div>

        {/* SLA Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              SLA Targets by Severity
            </CardTitle>
            <CardDescription>
              Define response and resolution time targets for each severity level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Severity</TableHead>
                    <TableHead className="w-[200px]">Response SLA</TableHead>
                    <TableHead className="w-[200px]">Resolution SLA</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slaLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : slaConfigs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No SLA configurations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    slaConfigs.map((sla) => (
                      <TableRow key={sla.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getSeverityColor(sla.severity)}`} />
                            <span className="font-medium">{sla.severity}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {formatMinutes(sla.response_minutes)}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({sla.response_minutes} min)
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {formatMinutes(sla.resolution_minutes)}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({sla.resolution_minutes} min)
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(sla)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pause Conditions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pause className="h-5 w-5" />
              SLA Pause Conditions
            </CardTitle>
            <CardDescription>
              Configure when SLA timers should be paused
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Type</TableHead>
                    <TableHead className="w-[150px]">Condition</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pauseLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : pauseConditions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No pause conditions configured
                      </TableCell>
                    </TableRow>
                  ) : (
                    pauseConditions.map((condition) => (
                      <TableRow key={condition.id}>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {condition.condition_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium capitalize">
                          {condition.condition_value.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {condition.description || '—'}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={condition.is_active}
                            onCheckedChange={() => handleTogglePauseCondition(condition)}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Breach Definitions - Read Only */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Breach Definitions
            </CardTitle>
            <CardDescription>
              System-defined breach thresholds (read-only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Response Breach</p>
                    <p className="text-muted-foreground">Occurs when first response exceeds response SLA target</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Resolution Breach</p>
                    <p className="text-muted-foreground">Occurs when incident resolution exceeds resolution SLA target</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit SLA Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit SLA Policy - {editingSLA?.severity}</DialogTitle>
              <DialogDescription>
                Update the response and resolution SLA targets
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="response_minutes">Response Time (minutes)</Label>
                <Input
                  id="response_minutes"
                  type="number"
                  min="1"
                  value={formData.response_minutes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, response_minutes: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground">
                  ≈ {formatMinutes(formData.response_minutes)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resolution_minutes">Resolution Time (minutes)</Label>
                <Input
                  id="resolution_minutes"
                  type="number"
                  min="1"
                  value={formData.resolution_minutes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, resolution_minutes: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground">
                  ≈ {formatMinutes(formData.resolution_minutes)}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={formData.response_minutes <= 0 || formData.resolution_minutes <= 0}
                className="bg-brand-primary hover:bg-brand-primary-hover text-white"
              >
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminGuard>
  );
}
