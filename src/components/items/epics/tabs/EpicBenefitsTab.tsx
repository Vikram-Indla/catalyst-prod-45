import { useState, useEffect } from 'react';
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
  
  // Local state for editable fields
  const [formData, setFormData] = useState({
    success_criteria: '',
    funding_stage: 'Not Defined',
    approvers: '',
    future_state: ''
  });

  // Fetch epic_spend for funding info
  const { data: epicSpend } = useQuery({
    queryKey: ['epic-spend-benefits', epic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_spend')
        .select('*')
        .eq('epic_id', epic.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as any;
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
        .single();
      
      if (error && error.code !== 'PGRST116') return null;
      return data;
    },
    enabled: !!epic.owner_id
  });

  // Initialize form data from epic
  useEffect(() => {
    setFormData({
      success_criteria: epic.success_criteria || '',
      funding_stage: epicSpend?.funding_stage || 'Not Defined',
      approvers: epic.approvers || '',
      future_state: epic.future_state || ''
    });
  }, [epic, epicSpend]);

  // Update mutation for epic fields
  const updateEpicMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('epics')
        .update(updates)
        .eq('id', epic.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic', epic.id] });
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('Updated');
    },
    onError: () => toast.error('Failed to update')
  });

  // Update mutation for epic_spend
  const updateSpendMutation = useMutation({
    mutationFn: async (funding_stage: string) => {
      const { data: existing } = await supabase
        .from('epic_spend')
        .select('id')
        .eq('epic_id', epic.id)
        .single();
      
      if (existing) {
        const { error } = await supabase
          .from('epic_spend')
          .update({ funding_stage } as any)
          .eq('epic_id', epic.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('epic_spend')
          .insert({ epic_id: epic.id, funding_stage } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-spend-benefits', epic.id] });
      toast.success('Funding stage updated');
    },
    onError: () => toast.error('Failed to update funding stage')
  });

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
            value={formData.success_criteria}
            onChange={(e) => setFormData(prev => ({ ...prev, success_criteria: e.target.value }))}
            onBlur={() => {
              if (formData.success_criteria !== (epic.success_criteria || '')) {
                updateEpicMutation.mutate({ success_criteria: formData.success_criteria });
              }
            }}
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
                value={formData.funding_stage}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, funding_stage: value }));
                  updateSpendMutation.mutate(value);
                }}
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
                value={formData.approvers}
                onChange={(e) => setFormData(prev => ({ ...prev, approvers: e.target.value }))}
                onBlur={() => {
                  if (formData.approvers !== (epic.approvers || '')) {
                    updateEpicMutation.mutate({ approvers: formData.approvers });
                  }
                }}
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
            value={formData.future_state}
            onChange={(e) => setFormData(prev => ({ ...prev, future_state: e.target.value }))}
            onBlur={() => {
              if (formData.future_state !== (epic.future_state || '')) {
                updateEpicMutation.mutate({ future_state: formData.future_state });
              }
            }}
            placeholder="Describe the desired future state and expected outcomes..."
            rows={4}
            className="text-sm"
          />
        </CardContent>
      </Card>
    </div>
  );
}
