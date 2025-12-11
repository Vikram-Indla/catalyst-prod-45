import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calculator, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TechnicalScoringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  epicIds: string[];
  onSuccess: () => void;
}

// Technical scoring values (Fibonacci-like scale)
const SCORING_VALUES = [1, 2, 3, 5, 8, 13, 20];

interface EpicScore {
  id: string;
  name: string;
  epic_key?: string;
  technical_value: number;
  time_criticality: number;
  risk_reduction: number;
  job_size: number;
  calculated_score: number | null;
}

export function TechnicalScoringDialog({
  open,
  onOpenChange,
  epicIds,
  onSuccess,
}: TechnicalScoringDialogProps) {
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<Map<string, EpicScore>>(new Map());

  // Fetch epics with their current scores
  const { data: epics, isLoading } = useQuery({
    queryKey: ['epic-tech-scores', epicIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('id, name, epic_key')
        .in('id', epicIds);
      
      if (error) throw error;
      
      // Fetch existing technical scores from epic_wsjf table
      // NOTE: Table named epic_wsjf for legacy reasons; UI shows "Technical Scoring"
      const { data: techScoreData } = await supabase
        .from('epic_wsjf')
        .select('*')
        .in('epic_id', epicIds);
      
      const techScoreMap = new Map(techScoreData?.map(w => [w.epic_id, w]) || []);
      
      return data?.map(epic => {
        const existing = techScoreMap.get(epic.id);
        return {
          id: epic.id,
          name: epic.name,
          epic_key: epic.epic_key,
          technical_value: existing?.business_value || 0,
          time_criticality: existing?.time_value || 0,
          risk_reduction: existing?.rroe_value || 0,
          job_size: existing?.job_size || 1,
          calculated_score: existing?.wsjf_score || null,
        };
      }) || [];
    },
    enabled: open && epicIds.length > 0,
  });

  // Initialize scores when epics load
  useState(() => {
    if (epics) {
      const newScores = new Map<string, EpicScore>();
      epics.forEach(epic => {
        newScores.set(epic.id, epic);
      });
      setScores(newScores);
    }
  });

  const updateScore = (epicId: string, field: keyof EpicScore, value: number) => {
    setScores(prev => {
      const newScores = new Map(prev);
      const epic = newScores.get(epicId) || epics?.find(e => e.id === epicId);
      if (epic) {
        const updated = { ...epic, [field]: value };
        // Recalculate score
        if (updated.job_size > 0) {
          const cod = updated.technical_value + updated.time_criticality + updated.risk_reduction;
          updated.calculated_score = Math.round((cod / updated.job_size) * 100) / 100;
        } else {
          updated.calculated_score = null;
        }
        newScores.set(epicId, updated);
      }
      return newScores;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // NOTE: Using epic_wsjf table for persistence (legacy naming)
      // UI shows "Technical Scoring" - no PI dependency in Catalyst vNext
      const updates = Array.from(scores.values()).map(score => ({
        epic_id: score.id,
        pi_id: 'default', // Required by schema constraint, not used in UI
        business_value: score.technical_value,
        time_value: score.time_criticality,
        rroe_value: score.risk_reduction,
        job_size: score.job_size,
        wsjf_score: score.calculated_score,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('epic_wsjf')
          .upsert(update, { onConflict: 'epic_id,pi_id' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-backlog'] });
      queryClient.invalidateQueries({ queryKey: ['epic-tech-scores'] });
      toast.success('Technical scores saved');
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to save scores: ${error.message}`);
    },
  });

  const getScoreValue = (epicId: string, field: keyof EpicScore): number => {
    return scores.get(epicId)?.[field] as number || epics?.find(e => e.id === epicId)?.[field] as number || 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calculator className="h-5 w-5 text-brand-gold" />
            Technical Scoring
          </DialogTitle>
        </DialogHeader>

        <Alert className="bg-info/10 border-info/30">
          <Info className="h-4 w-4 text-info" />
          <AlertDescription className="text-sm">
            Score each dimension on a scale of 1-20. Higher scores indicate greater value/urgency.
            <br />
            <strong>Score = (Technical Value + Time Criticality + Risk Reduction) ÷ Job Size</strong>
          </AlertDescription>
        </Alert>

        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Epic</TableHead>
                <TableHead className="w-32 text-center">Technical Value</TableHead>
                <TableHead className="w-32 text-center">Time Criticality</TableHead>
                <TableHead className="w-32 text-center">Risk Reduction</TableHead>
                <TableHead className="w-28 text-center">Job Size</TableHead>
                <TableHead className="w-24 text-center">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading epics...
                  </TableCell>
                </TableRow>
              ) : (
                epics?.map(epic => (
                  <TableRow key={epic.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{epic.name}</p>
                        {epic.epic_key && (
                          <p className="text-xs text-muted-foreground font-mono">{epic.epic_key}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={String(getScoreValue(epic.id, 'technical_value'))}
                        onValueChange={(v) => updateScore(epic.id, 'technical_value', Number(v))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCORING_VALUES.map(v => (
                            <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={String(getScoreValue(epic.id, 'time_criticality'))}
                        onValueChange={(v) => updateScore(epic.id, 'time_criticality', Number(v))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCORING_VALUES.map(v => (
                            <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={String(getScoreValue(epic.id, 'risk_reduction'))}
                        onValueChange={(v) => updateScore(epic.id, 'risk_reduction', Number(v))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCORING_VALUES.map(v => (
                            <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={String(getScoreValue(epic.id, 'job_size') || 1)}
                        onValueChange={(v) => updateScore(epic.id, 'job_size', Number(v))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCORING_VALUES.filter(v => v > 0).map(v => (
                            <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-brand-gold text-lg">
                        {scores.get(epic.id)?.calculated_score?.toFixed(2) || epic.calculated_score?.toFixed(2) || '–'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Scores'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
