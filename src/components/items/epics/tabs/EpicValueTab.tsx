import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

interface EpicValueTabProps {
  epic: any;
}

export function EpicValueTab({ epic }: EpicValueTabProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    business_value: 0,
    time_criticality: 0,
    risk_reduction: 0,
    estimated_revenue: 0,
    cost_savings: 0,
    customer_satisfaction_impact: 0,
    market_share_impact: 0
  });

  const { data: valueMetrics } = useQuery({
    queryKey: ['epic-value-metrics', epic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_value_metrics')
        .select('*')
        .eq('epic_id', epic.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setFormData({
          business_value: data.business_value || 0,
          time_criticality: data.time_criticality || 0,
          risk_reduction: data.risk_reduction || 0,
          estimated_revenue: data.estimated_revenue || 0,
          cost_savings: data.cost_savings || 0,
          customer_satisfaction_impact: data.customer_satisfaction_impact || 0,
          market_share_impact: data.market_share_impact || 0
        });
      }
      
      return data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('epic_value_metrics')
        .upsert({
          epic_id: epic.id,
          ...formData
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-value-metrics'] });
      toast.success('Value metrics saved');
    }
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const wsjfScore = formData.business_value + formData.time_criticality + formData.risk_reduction;

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground mb-4">
        Track value metrics for WSJF prioritization and business impact
      </div>

      <Card className="p-4 bg-primary/5">
        <div className="text-center">
          <div className="text-sm text-muted-foreground">WSJF Value Score</div>
          <div className="text-3xl font-bold text-primary">{wsjfScore}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Business Value + Time Criticality + Risk Reduction
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Business Value (0-100)</Label>
            <span className="text-sm font-medium">{formData.business_value}</span>
          </div>
          <Slider
            value={[formData.business_value]}
            onValueChange={([v]) => setFormData({ ...formData, business_value: v })}
            max={100}
            step={1}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Time Criticality (0-100)</Label>
            <span className="text-sm font-medium">{formData.time_criticality}</span>
          </div>
          <Slider
            value={[formData.time_criticality]}
            onValueChange={([v]) => setFormData({ ...formData, time_criticality: v })}
            max={100}
            step={1}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Risk Reduction (0-100)</Label>
            <span className="text-sm font-medium">{formData.risk_reduction}</span>
          </div>
          <Slider
            value={[formData.risk_reduction]}
            onValueChange={([v]) => setFormData({ ...formData, risk_reduction: v })}
            max={100}
            step={1}
          />
        </div>
      </div>

      <div className="border-t pt-6 space-y-4">
        <h4 className="font-medium">Financial Impact</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Estimated Revenue ($)</Label>
            <Input
              type="number"
              value={formData.estimated_revenue}
              onChange={(e) => setFormData({ ...formData, estimated_revenue: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Cost Savings ($)</Label>
            <Input
              type="number"
              value={formData.cost_savings}
              onChange={(e) => setFormData({ ...formData, cost_savings: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Customer Satisfaction Impact (0-100)</Label>
            <span className="text-sm font-medium">{formData.customer_satisfaction_impact}</span>
          </div>
          <Slider
            value={[formData.customer_satisfaction_impact]}
            onValueChange={([v]) => setFormData({ ...formData, customer_satisfaction_impact: v })}
            max={100}
            step={1}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Market Share Impact (0-100)</Label>
            <span className="text-sm font-medium">{formData.market_share_impact}</span>
          </div>
          <Slider
            value={[formData.market_share_impact]}
            onValueChange={([v]) => setFormData({ ...formData, market_share_impact: v })}
            max={100}
            step={1}
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saveMutation.isPending}>
        Save Value Metrics
      </Button>
    </div>
  );
}
