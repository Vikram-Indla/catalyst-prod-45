import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface FeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: any;
}

export function FeatureDialog({ open, onOpenChange, feature }: FeatureDialogProps) {
  const [name, setName] = useState(feature?.name || '');
  const [description, setDescription] = useState(feature?.description || '');
  const [status, setStatus] = useState(feature?.status || 'funnel');
  const [health, setHealth] = useState(feature?.health || 'green');
  const [epicId, setEpicId] = useState(feature?.epic_id || '');
  const [programId, setProgramId] = useState(feature?.program_id || '');
  const [piId, setPiId] = useState(feature?.pi_id || '');
  const [estimatePoints, setEstimatePoints] = useState(feature?.estimate_points || 0);
  
  // WSJF component fields (auto-calculate wsjf_score)
  const [businessValue, setBusinessValue] = useState(feature?.business_value || 0);
  const [timeCriticality, setTimeCriticality] = useState(feature?.time_criticality || 0);
  const [riskReduction, setRiskReduction] = useState(feature?.risk_reduction || 0);
  const [jobSize, setJobSize] = useState(feature?.job_size || 0);
  
  // Additional Jira Align fields
  const [blocked, setBlocked] = useState(feature?.blocked || false);
  const [blockedReason, setBlockedReason] = useState(feature?.blocked_reason || '');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(feature?.acceptance_criteria || '');
  const [notes, setNotes] = useState(feature?.notes || '');
  
  // Calculate WSJF score automatically
  const calculatedWSJF = jobSize > 0 
    ? ((businessValue + timeCriticality + riskReduction) / jobSize).toFixed(2)
    : '0.00';

  const queryClient = useQueryClient();

  const { data: epics } = useQuery({
    queryKey: ['epics'],
    queryFn: async () => {
      const { data, error } = await supabase.from('epics').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: pis } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('program_increments').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (open) {
      setName(feature?.name || '');
      setDescription(feature?.description || '');
      setStatus(feature?.status || 'funnel');
      setHealth(feature?.health || 'green');
      setEpicId(feature?.epic_id || '');
      setProgramId(feature?.program_id || '');
      setPiId(feature?.pi_id || '');
      setEstimatePoints(feature?.estimate_points || 0);
      setBusinessValue(feature?.business_value || 0);
      setTimeCriticality(feature?.time_criticality || 0);
      setRiskReduction(feature?.risk_reduction || 0);
      setJobSize(feature?.job_size || 0);
      setBlocked(feature?.blocked || false);
      setBlockedReason(feature?.blocked_reason || '');
      setAcceptanceCriteria(feature?.acceptance_criteria || '');
      setNotes(feature?.notes || '');
    }
  }, [open, feature]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (feature) {
        const { error } = await supabase
          .from('features')
          .update(data)
          .eq('id', feature.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('features')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success(feature ? 'Feature updated' : 'Feature created');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Failed to save feature');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!epicId || !programId) {
      toast.error('Please select an epic and program');
      return;
    }
    mutation.mutate({
      name,
      description,
      status,
      health,
      epic_id: epicId,
      program_id: programId,
      pi_id: piId || null,
      estimate_points: estimatePoints,
      business_value: businessValue,
      time_criticality: timeCriticality,
      risk_reduction: riskReduction,
      job_size: jobSize,
      blocked,
      blocked_reason: blocked ? blockedReason : null,
      acceptance_criteria: acceptanceCriteria || null,
      notes: notes || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{feature ? 'Edit Feature' : 'Create Feature'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="epic">Epic *</Label>
              <Select value={epicId} onValueChange={setEpicId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select epic" />
                </SelectTrigger>
                <SelectContent>
                  {epics?.map((epic) => (
                    <SelectItem key={epic.id} value={epic.id}>
                      {epic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="program">Program *</Label>
              <Select value={programId} onValueChange={setProgramId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs?.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="funnel">Funnel</SelectItem>
                  <SelectItem value="analyzing">Analyzing</SelectItem>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="implementing">Implementing</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="health">Health</Label>
              <Select value={health} onValueChange={setHealth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="yellow">Yellow</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pi">PI</Label>
              <Select value={piId} onValueChange={setPiId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select PI" />
                </SelectTrigger>
                <SelectContent>
                  {pis?.map((pi) => (
                    <SelectItem key={pi.id} value={pi.id}>
                      {pi.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* WSJF Components */}
          <div>
            <Label className="font-semibold">WSJF Components (0-100 each)</Label>
            <p className="text-xs text-muted-foreground mb-3">
              WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size = {calculatedWSJF}
            </p>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label htmlFor="business-value" className="text-xs">Business Value</Label>
                <Input
                  id="business-value"
                  type="number"
                  min="0"
                  max="100"
                  value={businessValue}
                  onChange={(e) => setBusinessValue(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="time-criticality" className="text-xs">Time Criticality</Label>
                <Input
                  id="time-criticality"
                  type="number"
                  min="0"
                  max="100"
                  value={timeCriticality}
                  onChange={(e) => setTimeCriticality(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="risk-reduction" className="text-xs">Risk Reduction</Label>
                <Input
                  id="risk-reduction"
                  type="number"
                  min="0"
                  max="100"
                  value={riskReduction}
                  onChange={(e) => setRiskReduction(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="job-size" className="text-xs">Job Size</Label>
                <Input
                  id="job-size"
                  type="number"
                  min="0"
                  max="100"
                  value={jobSize}
                  onChange={(e) => setJobSize(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
          
          <div>
            <Label htmlFor="points">Estimate Points</Label>
            <Input
              id="points"
              type="number"
              value={estimatePoints}
              onChange={(e) => setEstimatePoints(Number(e.target.value))}
            />
          </div>
          
          <div>
            <Label htmlFor="acceptance">Acceptance Criteria</Label>
            <Textarea
              id="acceptance"
              value={acceptanceCriteria}
              onChange={(e) => setAcceptanceCriteria(e.target.value)}
              rows={2}
              placeholder="Define acceptance criteria..."
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Additional notes..."
            />
          </div>
          
          <div className="flex items-center gap-3">
            <input
              id="blocked"
              type="checkbox"
              checked={blocked}
              onChange={(e) => setBlocked(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="blocked" className="cursor-pointer">Blocked</Label>
          </div>
          
          {blocked && (
            <div>
              <Label htmlFor="blocked-reason">Blocking Reason *</Label>
              <Textarea
                id="blocked-reason"
                value={blockedReason}
                onChange={(e) => setBlockedReason(e.target.value)}
                rows={2}
                placeholder="Why is this feature blocked?"
                required={blocked}
              />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
