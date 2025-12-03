import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

  // Fetch epic_value_metrics for benefits-specific data
  const { data: valueMetrics } = useQuery({
    queryKey: ['epic-value-metrics', epic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_value_metrics')
        .select('*')
        .eq('epic_id', epic.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
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
      funding_stage: epicSpend?.funding_stage || epic.funding_stage || 'Not Defined',
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
      toast.success('Benefits updated');
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
    <div className="space-y-6">
      {/* Lean Business Case Header */}
      <div className="border-b pb-3">
        <h3 className="text-base font-semibold text-foreground">Lean Business Case</h3>
      </div>

      {/* Read-only Epic Info */}
      <div className="grid grid-cols-[160px_1fr] gap-y-4 text-sm">
        <Label className="text-muted-foreground">Epic Name:</Label>
        <div className="text-foreground">{epic.name}</div>

        <Label className="text-muted-foreground">Epic Owner:</Label>
        <div className="text-foreground">{ownerName}</div>

        <Label className="text-muted-foreground">Entered Funnel:</Label>
        <div className="flex gap-8">
          <span className="text-foreground">{formatDate(epic.created_at)}</span>
          <div className="flex gap-2">
            <span className="text-muted-foreground">Start / Initiation:</span>
            <span className="text-foreground">{formatDate(epic.initiation_date)}</span>
          </div>
        </div>

        <Label className="text-muted-foreground">Portfolio Ask:</Label>
        <div className="flex gap-8">
          <span className="text-foreground">{formatDate(epic.portfolio_ask_date)}</span>
          <div className="flex gap-2">
            <span className="text-muted-foreground">Target Completion:</span>
            <span className="text-foreground">{formatDate(epic.target_completion_date)}</span>
          </div>
        </div>

        <Label className="text-muted-foreground">Description:</Label>
        <div className="text-foreground line-clamp-2">{epic.description || '—'}</div>
      </div>

      {/* Editable Fields */}
      <div className="space-y-4 pt-4 border-t">
        <div>
          <Label className="text-muted-foreground">Success Criteria:</Label>
          <div className="mt-1.5">
            <Textarea
              value={formData.success_criteria}
              onChange={(e) => setFormData(prev => ({ ...prev, success_criteria: e.target.value }))}
              onBlur={() => {
                if (formData.success_criteria !== (epic.success_criteria || '')) {
                  updateEpicMutation.mutate({ success_criteria: formData.success_criteria });
                }
              }}
              placeholder="e.g., An increase of Net Promoter Score (NPS) from +60 to +75."
              rows={2}
              className="text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label className="text-muted-foreground">Funding Stage:</Label>
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
            <Label className="text-muted-foreground">Approvers:</Label>
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

        <div>
          <Label className="text-muted-foreground">Future State & Desired Outcome:</Label>
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
            className="mt-1.5 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
