import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PrioritizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: string[];
  itemType: string;
}

export function PrioritizationDialog({
  open,
  onOpenChange,
  selectedItems,
  itemType,
}: PrioritizationDialogProps) {
  const [businessValue, setBusinessValue] = useState<number>(5);
  const [timeCriticality, setTimeCriticality] = useState<number>(5);
  const [riskReduction, setRiskReduction] = useState<number>(5);
  const [jobSize, setJobSize] = useState<number>(5);
  const queryClient = useQueryClient();

  const wsjfScore = jobSize > 0 
    ? ((businessValue + timeCriticality + riskReduction) / jobSize).toFixed(2)
    : '0.00';

  const updateWsjfMutation = useMutation({
    mutationFn: async () => {
      const score = parseFloat(wsjfScore);
      const updates = selectedItems.map(id =>
        supabase
          .from('epic_wsjf')
          .upsert({
            epic_id: id,
            business_value: businessValue,
            time_value: timeCriticality,
            rroe_value: riskReduction,
            job_size: jobSize,
            wsjf_score: score,
          }, {
            onConflict: 'epic_id',
          })
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-items'] });
      toast.success(`WSJF scores updated for ${selectedItems.length} item(s)`);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to update WSJF: ${error.message}`);
    },
  });

  useEffect(() => {
    if (open) {
      setBusinessValue(5);
      setTimeCriticality(5);
      setRiskReduction(5);
      setJobSize(5);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>WSJF Prioritization</DialogTitle>
          <DialogDescription>
            Calculate Weighted Shortest Job First scores for {selectedItems.length} item(s)
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="businessValue">Business Value (1-10)</Label>
            <Input
              id="businessValue"
              type="number"
              min="1"
              max="10"
              value={businessValue}
              onChange={(e) => setBusinessValue(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              How much business value will this deliver?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeCriticality">Time Criticality (1-10)</Label>
            <Input
              id="timeCriticality"
              type="number"
              min="1"
              max="10"
              value={timeCriticality}
              onChange={(e) => setTimeCriticality(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              How time-sensitive is this work?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="riskReduction">Risk Reduction / Opportunity (1-10)</Label>
            <Input
              id="riskReduction"
              type="number"
              min="1"
              max="10"
              value={riskReduction}
              onChange={(e) => setRiskReduction(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Does this reduce risk or enable new opportunities?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobSize">Job Size (1-10)</Label>
            <Input
              id="jobSize"
              type="number"
              min="1"
              max="10"
              value={jobSize}
              onChange={(e) => setJobSize(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              How much effort is required? (higher = more effort)
            </p>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">WSJF Score:</span>
              <span className="text-3xl font-bold text-primary">{wsjfScore}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Formula: (Business Value + Time Criticality + Risk/Opportunity) ÷ Job Size
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => updateWsjfMutation.mutate()}
            disabled={updateWsjfMutation.isPending}
          >
            {updateWsjfMutation.isPending ? 'Calculating...' : 'Calculate & Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
