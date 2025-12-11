/**
 * =====================================================
 * EpicFinancialsTab - Budget & Spend for Epic vNext
 * =====================================================
 * 
 * Consolidates financial/budget content from legacy Spend tab.
 * Benefits, Forecast, and PI-based financials are retired from Epic drawer.
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Wallet, TrendingUp, AlertCircle, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EpicFinancialsTabProps {
  epic: any;
}

export function EpicFinancialsTab({ epic }: EpicFinancialsTabProps) {
  const queryClient = useQueryClient();

  // Local state for spend data
  const [formData, setFormData] = useState({
    budget: '',
    estimated_spend: '',
    accepted_spend: '',
    forecasted_spend: '',
    work_code: '',
    funding_stage: 'not_funded',
    return_on_investment: '',
    initial_investment: '',
  });

  // Fetch existing epic spend data
  const { data: spendData, isLoading } = useQuery({
    queryKey: ['epic-spend', epic?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_spend')
        .select('*')
        .eq('epic_id', epic.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setFormData({
          budget: data.budget?.toString() || '',
          estimated_spend: data.estimated_spend?.toString() || '',
          accepted_spend: data.accepted_spend?.toString() || '',
          forecasted_spend: data.forecasted_spend?.toString() || '',
          work_code: data.work_code || '',
          funding_stage: data.funding_stage || 'not_funded',
          return_on_investment: data.return_on_investment?.toString() || '',
          initial_investment: data.initial_investment?.toString() || '',
        });
      }

      return data;
    },
    enabled: !!epic?.id,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        epic_id: epic.id,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        estimated_spend: formData.estimated_spend ? parseFloat(formData.estimated_spend) : null,
        accepted_spend: formData.accepted_spend ? parseFloat(formData.accepted_spend) : null,
        forecasted_spend: formData.forecasted_spend ? parseFloat(formData.forecasted_spend) : null,
        work_code: formData.work_code || null,
        funding_stage: formData.funding_stage || null,
        return_on_investment: formData.return_on_investment ? parseFloat(formData.return_on_investment) : null,
        initial_investment: formData.initial_investment ? parseFloat(formData.initial_investment) : null,
      };

      if (spendData?.id) {
        const { error } = await supabase
          .from('epic_spend')
          .update(payload)
          .eq('id', spendData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('epic_spend')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-spend', epic.id] });
      toast.success('Financials saved');
    },
    onError: () => {
      toast.error('Failed to save financials');
    }
  });

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Calculate variance
  const budget = parseFloat(formData.budget) || 0;
  const forecasted = parseFloat(formData.forecasted_spend) || 0;
  const variance = budget - forecasted;
  const variancePercent = budget > 0 ? ((variance / budget) * 100).toFixed(1) : 0;

  if (!epic) {
    return <div className="text-center py-8 text-muted-foreground">Epic data not available</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Budget Summary Card */}
      <Card className="border-primary/40">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Budget</div>
              <div className="text-lg font-bold text-primary">
                ${budget.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Forecasted</div>
              <div className="text-lg font-bold">
                ${forecasted.toLocaleString()}
              </div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Accepted</div>
              <div className="text-lg font-bold">
                ${(parseFloat(formData.accepted_spend) || 0).toLocaleString()}
              </div>
            </div>
            <div className={`text-center p-3 rounded-lg ${variance >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
              <div className="text-xs text-muted-foreground mb-1">Variance</div>
              <div className={`text-lg font-bold ${variance >= 0 ? 'text-success' : 'text-destructive'}`}>
                {variance >= 0 ? '+' : ''}{variancePercent}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Details */}
      <Card className="border border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-5 w-5 text-primary" />
            Budget & Spend
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Budget</Label>
              <Input
                type="number"
                value={formData.budget}
                onChange={(e) => handleFieldChange('budget', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Estimated Spend</Label>
              <Input
                type="number"
                value={formData.estimated_spend}
                onChange={(e) => handleFieldChange('estimated_spend', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Accepted Spend</Label>
              <Input
                type="number"
                value={formData.accepted_spend}
                onChange={(e) => handleFieldChange('accepted_spend', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Forecasted Spend</Label>
              <Input
                type="number"
                value={formData.forecasted_spend}
                onChange={(e) => handleFieldChange('forecasted_spend', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Funding & ROI */}
      <Card className="border border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-5 w-5 text-primary" />
            Funding & Investment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Work Code</Label>
              <Input
                value={formData.work_code}
                onChange={(e) => handleFieldChange('work_code', e.target.value)}
                placeholder="e.g., WBS-12345"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Funding Stage</Label>
              <Select 
                value={formData.funding_stage} 
                onValueChange={(v) => handleFieldChange('funding_stage', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_funded">Not Funded</SelectItem>
                  <SelectItem value="pending">Pending Approval</SelectItem>
                  <SelectItem value="partially_funded">Partially Funded</SelectItem>
                  <SelectItem value="fully_funded">Fully Funded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Initial Investment</Label>
              <Input
                type="number"
                value={formData.initial_investment}
                onChange={(e) => handleFieldChange('initial_investment', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Expected ROI (%)</Label>
              <Input
                type="number"
                value={formData.return_on_investment}
                onChange={(e) => handleFieldChange('return_on_investment', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button 
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full"
      >
        <Save className="h-4 w-4 mr-2" />
        {saveMutation.isPending ? 'Saving...' : 'Save Financials'}
      </Button>
    </div>
  );
}
