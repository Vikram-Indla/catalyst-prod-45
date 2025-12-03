import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Info, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WSJFScoringModal } from '@/components/wsjf';

interface FeatureWSJFTabProps {
  feature: any;
}

const WSJF_VALUES = [0, 1, 2, 3, 5, 8, 13, 20, 40, 100];

export function FeatureWSJFTab({ feature }: FeatureWSJFTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [wsjfModalOpen, setWsjfModalOpen] = useState(false);

  const updateWSJFMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('features')
        .update(updates)
        .eq('id', feature.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast({ title: 'WSJF updated successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating WSJF',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleValueChange = (field: string, value: number) => {
    const updates: any = { [field]: value };
    
    // Calculate WSJF score if all values are present
    const bv = field === 'business_value' ? value : (feature.business_value || 0);
    const tc = field === 'time_criticality' ? value : (feature.time_criticality || 0);
    const rr = field === 'risk_reduction' ? value : (feature.risk_reduction || 0);
    const js = field === 'job_size' ? value : (feature.job_size || 1);
    
    if (bv && tc && rr && js > 0) {
      updates.wsjf_score = ((bv + tc + rr) / js);
    }
    
    updateWSJFMutation.mutate(updates);
  };

  const calculatedWSJF = feature.business_value && feature.time_criticality && feature.risk_reduction && feature.job_size
    ? ((feature.business_value + feature.time_criticality + feature.risk_reduction) / feature.job_size).toFixed(2)
    : null;

  if (!feature) {
    return <div className="text-center py-8 text-muted-foreground">Feature data not available</div>;
  }

  return (
    <div className="space-y-6">
      <Alert className="bg-card">
        <Info className="h-4 w-4" />
        <AlertDescription>
          WSJF (Weighted Shortest Job First) prioritizes features based on Cost of Delay divided by Job Size.
          Higher scores indicate higher priority.
        </AlertDescription>
      </Alert>

      {/* Score WSJF Button - opens canonical modal */}
      <Button 
        onClick={() => setWsjfModalOpen(true)}
        className="w-full bg-brand-gold text-white hover:bg-brand-gold-hover"
      >
        <Calculator className="h-4 w-4 mr-2" />
        Score WSJF
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Business Value</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={feature.business_value !== null && feature.business_value !== undefined ? feature.business_value.toString() : undefined}
              onValueChange={(v) => handleValueChange('business_value', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select value" />
              </SelectTrigger>
              <SelectContent>
                {WSJF_VALUES.map(val => (
                  <SelectItem key={val} value={val.toString()}>{val}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Importance to the customer or business
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Time Criticality</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={feature.time_criticality !== null && feature.time_criticality !== undefined ? feature.time_criticality.toString() : undefined}
              onValueChange={(v) => handleValueChange('time_criticality', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select value" />
              </SelectTrigger>
              <SelectContent>
                {WSJF_VALUES.map(val => (
                  <SelectItem key={val} value={val.toString()}>{val}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              How time-sensitive is this work?
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Risk Reduction / Opportunity Enablement</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={feature.risk_reduction !== null && feature.risk_reduction !== undefined ? feature.risk_reduction.toString() : undefined}
              onValueChange={(v) => handleValueChange('risk_reduction', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select value" />
              </SelectTrigger>
              <SelectContent>
                {WSJF_VALUES.map(val => (
                  <SelectItem key={val} value={val.toString()}>{val}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Does this reduce risk or enable new opportunities?
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Job Size</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={feature.job_size !== null && feature.job_size !== undefined ? feature.job_size.toString() : undefined}
              onValueChange={(v) => handleValueChange('job_size', parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select value" />
              </SelectTrigger>
              <SelectContent>
                {WSJF_VALUES.filter(v => v > 0).map(val => (
                  <SelectItem key={val} value={val.toString()}>{val}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Relative size of the work effort
            </p>
          </CardContent>
        </Card>
      </div>

      {calculatedWSJF && (
        <Card className="border-brand-gold">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-brand-gold" />
              Calculated WSJF Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-brand-gold">{calculatedWSJF}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Formula: (Business Value + Time Criticality + RR/OE) ÷ Job Size = 
              ({feature.business_value} + {feature.time_criticality} + {feature.risk_reduction}) ÷ {feature.job_size}
            </p>
          </CardContent>
        </Card>
      )}

      {!calculatedWSJF && (
        <div className="text-center py-8 text-muted-foreground">
          Set all WSJF values to calculate the score
        </div>
      )}

      {/* WSJF Scoring Modal - Jira Align pattern */}
      <WSJFScoringModal
        open={wsjfModalOpen}
        onOpenChange={setWsjfModalOpen}
        workItemId={feature.id}
        workItemType="feature"
        workItemTitle={feature.name}
        workItemKey={feature.display_id}
        onSuccess={() => setWsjfModalOpen(false)}
      />
    </div>
  );
}
