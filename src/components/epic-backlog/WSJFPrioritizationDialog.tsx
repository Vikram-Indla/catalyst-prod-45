import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/usePermission';
import { WSJFBadge } from '@/components/shared/WSJFBadge';
import { TrendingUp, Save } from 'lucide-react';

interface WSJFPrioritizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epicIds: string[];
  onSuccess: () => void;
}

interface EpicWSJF {
  id: string;
  name: string;
  epic_key?: string;
  business_value: number;
  time_criticality: number;
  risk_reduction: number;
  job_size: number;
  wsjf_score: number;
}

export function WSJFPrioritizationDialog({ open, onOpenChange, epicIds, onSuccess }: WSJFPrioritizationDialogProps) {
  const [epics, setEpics] = useState<EpicWSJF[]>([]);
  const { toast } = useToast();
  const canManageEstimation = usePermission('epics', 'edit');

  const { data: fetchedEpics } = useQuery({
    queryKey: ['epics-wsjf', epicIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('id, name, epic_key')
        .in('id', epicIds);
      if (error) throw error;
      return data.map(e => ({
        ...e,
        business_value: 5,
        time_criticality: 5,
        risk_reduction: 5,
        job_size: 5,
        wsjf_score: 3,
      }));
    },
    enabled: open && epicIds.length > 0,
  });

  useEffect(() => {
    if (fetchedEpics) {
      setEpics(fetchedEpics);
    }
  }, [fetchedEpics]);

  const updateEpicWSJF = (epicId: string, field: keyof EpicWSJF, value: number) => {
    setEpics(prev => prev.map(epic => {
      if (epic.id !== epicId) return epic;
      
      const updated = { ...epic, [field]: value };
      // Calculate WSJF: (BV + TC + RR) / JS
      if (updated.job_size > 0) {
        updated.wsjf_score = Number(
          ((updated.business_value + updated.time_criticality + updated.risk_reduction) / updated.job_size).toFixed(2)
        );
      }
      return updated;
    }));
  };

  const saveWSJFMutation = useMutation({
    mutationFn: async () => {
      // Save WSJF scores
      for (const epic of epics) {
        await supabase
          .from('epics')
          .update({
            // Store WSJF components in description for now (would need schema update for proper fields)
            description: `WSJF: BV=${epic.business_value}, TC=${epic.time_criticality}, RR=${epic.risk_reduction}, JS=${epic.job_size}, Score=${epic.wsjf_score}\n\n${epic.name}`,
          })
          .eq('id', epic.id);
      }
    },
    onSuccess: () => {
      toast({ title: 'WSJF scores saved' });
      onSuccess();
      onOpenChange(false);
    },
  });

  const applyRankingMutation = useMutation({
    mutationFn: async () => {
      // Sort by WSJF score (descending) and apply to global ranking
      const sorted = [...epics].sort((a, b) => b.wsjf_score - a.wsjf_score);
      
      // Apply ranks: higher WSJF = lower rank number (higher priority)
      for (let i = 0; i < sorted.length; i++) {
        await supabase
          .from('epics')
          .update({ 
            global_rank: i,
            points_estimate: sorted[i].wsjf_score,
          })
          .eq('id', sorted[i].id);
      }
    },
    onSuccess: () => {
      toast({ title: 'WSJF ranking applied to global ranking' });
      onSuccess();
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Failed to apply WSJF ranking', variant: 'destructive' });
    },
  });

  if (!canManageEstimation) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permission Denied</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-muted-foreground">
            You do not have permission to manage epic estimation and prioritization.
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            WSJF Prioritization ({epics.length} epics)
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-sm text-muted-foreground mb-4">
          Weighted Shortest Job First (WSJF) = (Business Value + Time Criticality + Risk Reduction) / Job Size
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">ID</TableHead>
              <TableHead>Epic</TableHead>
              <TableHead className="w-24">BV</TableHead>
              <TableHead className="w-24">TC</TableHead>
              <TableHead className="w-24">RR</TableHead>
              <TableHead className="w-24">JS</TableHead>
              <TableHead className="w-24">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {epics.map((epic) => (
              <TableRow key={epic.id}>
                <TableCell className="text-sm font-mono">{epic.epic_key || epic.id.slice(0, 8)}</TableCell>
                <TableCell className="font-medium">{epic.name}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={epic.business_value}
                    onChange={(e) => updateEpicWSJF(epic.id, 'business_value', Number(e.target.value))}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={epic.time_criticality}
                    onChange={(e) => updateEpicWSJF(epic.id, 'time_criticality', Number(e.target.value))}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={epic.risk_reduction}
                    onChange={(e) => updateEpicWSJF(epic.id, 'risk_reduction', Number(e.target.value))}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={epic.job_size}
                    onChange={(e) => updateEpicWSJF(epic.id, 'job_size', Number(e.target.value))}
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <WSJFBadge
                    score={epic.wsjf_score}
                    businessValue={epic.business_value}
                    timeCriticality={epic.time_criticality}
                    riskReduction={epic.risk_reduction}
                    jobSize={epic.job_size}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="outline" onClick={() => saveWSJFMutation.mutate()} disabled={saveWSJFMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save Scores
          </Button>
          <Button onClick={() => applyRankingMutation.mutate()} disabled={applyRankingMutation.isPending}>
            Apply Rank to Global Ranking
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
