import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EpicBenefitsTabProps {
  epic: any;
}

const FUNDING_STAGES = [
  'Not Defined',
  'Defined',
  'In Review',
  'Approved',
  'Funded',
  'Closed'
];

export function EpicBenefitsTab({ epic }: EpicBenefitsTabProps) {
  const queryClient = useQueryClient();
  const initializedRef = useRef(false);
  const epicIdRef = useRef(epic.id);
  
  // Local state for editable fields
  const [successCriteria, setSuccessCriteria] = useState('');
  const [fundingStage, setFundingStage] = useState('Not Defined');
  const [approvers, setApprovers] = useState('');
  const [futureState, setFutureState] = useState('');

  // Fetch epic_spend for funding info
  const { data: epicSpend } = useQuery({
    queryKey: ['epic-spend-benefits', epic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_spend')
        .select('*')
        .eq('epic_id', epic.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch owner details
  const { data: owner } = useQuery({
    queryKey: ['epic-owner', epic.owner_id],
    queryFn: async () => {
      if (!epic.owner_id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', epic.owner_id)
        .maybeSingle();
      
      if (error) return null;
      return data;
    },
    enabled: !!epic.owner_id
  });

  // Initialize form data from epic only once per epic or when epic changes
  useEffect(() => {
    if (epicIdRef.current !== epic.id) {
      // Epic changed - reset everything
      epicIdRef.current = epic.id;
      initializedRef.current = false;
    }
    
    if (!initializedRef.current) {
      setSuccessCriteria(epic.success_criteria || '');
      setApprovers(epic.approvers || '');
      setFutureState(epic.future_state || '');
      initializedRef.current = true;
    }
  }, [epic.id, epic.success_criteria, epic.approvers, epic.future_state]);

  // Sync funding stage when epicSpend loads
  useEffect(() => {
    if (epicSpend?.funding_stage) {
      setFundingStage(epicSpend.funding_stage);
    }
  }, [epicSpend?.funding_stage]);

  // Update mutation for epic fields
  const updateEpicMutation = useMutation({
    mutationFn: async (updates: Record<string, string>) => {
      const { error } = await supabase
        .from('epics')
        .update(updates)
        .eq('id', epic.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic', epic.id] });
      queryClient.invalidateQueries({ queryKey: ['epics'] });
    },
    onError: (error) => {
      console.error('Failed to update epic:', error);
      toast.error('Failed to save');
    }
  });

  // Update mutation for epic_spend using upsert
  const updateSpendMutation = useMutation({
    mutationFn: async (newFundingStage: string) => {
      const { error } = await supabase
        .from('epic_spend')
        .upsert(
          { 
            epic_id: epic.id, 
            funding_stage: newFundingStage,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'epic_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-spend-benefits', epic.id] });
    },
    onError: (error) => {
      console.error('Failed to update funding stage:', error);
      toast.error('Failed to save funding stage');
    }
  });

  const handleSuccessCriteriaBlur = () => {
    if (successCriteria !== (epic.success_criteria || '')) {
      updateEpicMutation.mutate({ success_criteria: successCriteria });
    }
  };

  const handleApproversBlur = () => {
    if (approvers !== (epic.approvers || '')) {
      updateEpicMutation.mutate({ approvers });
    }
  };

  const handleFutureStateBlur = () => {
    if (futureState !== (epic.future_state || '')) {
      updateEpicMutation.mutate({ future_state: futureState });
    }
  };

  const handleFundingStageChange = (value: string) => {
    setFundingStage(value);
    updateSpendMutation.mutate(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'EEEE, MMMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const ownerName = owner?.full_name || epic.owner_name || '—';

  return (
    <div className="space-y-5">
      {/* Lean Business Case Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Lean Business Case</h3>

          {/* Read-only Epic Info */}
          <div className="space-y-3">
            <div className="grid grid-cols-[140px_1fr] items-center">
              <Label className="text-muted-foreground text-sm">Epic Name:</Label>
              <span className="text-sm text-foreground">{epic.name}</span>
            </div>

            <div className="grid grid-cols-[140px_1fr] items-center">
              <Label className="text-muted-foreground text-sm">Epic Owner:</Label>
              <span className="text-sm text-foreground">{ownerName}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dates Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Dates</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-sm">Entered Funnel:</Label>
              <div className="text-sm text-foreground mt-1">{formatDate(epic.created_at)}</div>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Start / Initiation:</Label>
              <div className="text-sm text-foreground mt-1">{formatDate(epic.initiation_date)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-sm">Portfolio Ask:</Label>
              <div className="text-sm text-foreground mt-1">{formatDate(epic.portfolio_ask_date)}</div>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Target Completion:</Label>
              <div className="text-sm text-foreground mt-1">{formatDate(epic.target_completion_date)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Description</h3>
          <div className="text-sm text-foreground">{epic.description || '—'}</div>
        </CardContent>
      </Card>

      {/* Success Criteria Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Success Criteria</h3>
          <Textarea
            value={successCriteria}
            onChange={(e) => setSuccessCriteria(e.target.value)}
            onBlur={handleSuccessCriteriaBlur}
            placeholder="e.g., An increase of Net Promoter Score (NPS) from +60 to +75."
            rows={3}
            className="text-sm"
          />
        </CardContent>
      </Card>

      {/* Funding & Approvals Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Funding & Approvals</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-sm">Funding Stage:</Label>
              <Select
                value={fundingStage}
                onValueChange={handleFundingStageChange}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUNDING_STAGES.map(stage => (
                    <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-muted-foreground text-sm">Approvers:</Label>
              <Input
                value={approvers}
                onChange={(e) => setApprovers(e.target.value)}
                onBlur={handleApproversBlur}
                placeholder="e.g., Susan Miller, Vicky Murphy"
                className="mt-1.5"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Future State Section */}
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Future State & Desired Outcome</h3>
          <Textarea
            value={futureState}
            onChange={(e) => setFutureState(e.target.value)}
            onBlur={handleFutureStateBlur}
            placeholder="Describe the desired future state and expected outcomes..."
            rows={4}
            className="text-sm"
          />
        </CardContent>
      </Card>
    </div>
  );
}
