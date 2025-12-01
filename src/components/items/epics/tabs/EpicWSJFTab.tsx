import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Calculator, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EpicWSJFTabProps {
  epic: any;
}

const WSJF_VALUES = [0, 1, 2, 3, 5, 8, 13, 20, 40, 100];

export function EpicWSJFTab({ epic }: EpicWSJFTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPiId, setSelectedPiId] = useState<string>('');

  const { data: pis, isLoading: pisLoading } = useQuery({
    queryKey: ['epic-wsjf-pis', epic.id],
    queryFn: async () => {
      const { data: epicPIs } = await supabase
        .from('epic_program_increments')
        .select('pi_id, program_increments(id, name)')
        .eq('epic_id', epic.id);

      return epicPIs?.map(ep => (ep.program_increments as any)) || [];
    },
    enabled: !!epic?.id,
  });

  const { data: wsjfData, isLoading: wsjfLoading } = useQuery({
    queryKey: ['epic-wsjf', epic.id, selectedPiId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_wsjf')
        .select('*')
        .eq('epic_id', epic.id)
        .eq('pi_id', selectedPiId)
        .maybeSingle();

      if (error) throw error;
      return data || {
        business_value: null,
        time_value: null,
        rroe_value: null,
        job_size: null,
        wsjf_score: null,
      };
    },
    enabled: !!epic?.id && !!selectedPiId,
  });

  const updateWSJFMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('epic_wsjf')
        .upsert({
          epic_id: epic.id,
          pi_id: selectedPiId,
          ...updates,
        }, {
          onConflict: 'epic_id,pi_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-wsjf', epic.id] });
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
    updateWSJFMutation.mutate({ [field]: value });
  };

  const calculatedWSJF = wsjfData && wsjfData.business_value && wsjfData.time_value && wsjfData.rroe_value && wsjfData.job_size
    ? ((wsjfData.business_value + wsjfData.time_value + wsjfData.rroe_value) / wsjfData.job_size).toFixed(2)
    : null;

  if (!epic) {
    return <div className="text-center py-8 text-muted-foreground">Epic data not available</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          WSJF (Weighted Shortest Job First) prioritizes work items based on Cost of Delay divided by Job Size.
          Higher scores indicate higher priority.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Program Increment</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedPiId} onValueChange={setSelectedPiId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a Program Increment" />
            </SelectTrigger>
            <SelectContent>
              {pisLoading ? (
                <SelectItem value="loading" disabled>Loading...</SelectItem>
              ) : pis && pis.length > 0 ? (
                pis.map((pi: any) => (
                  <SelectItem key={pi.id} value={pi.id}>
                    {pi.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>No PIs assigned</SelectItem>
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedPiId && (
        <>
          {wsjfLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Business Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={wsjfData?.business_value?.toString() || ''}
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
                      value={wsjfData?.time_value?.toString() || ''}
                      onValueChange={(v) => handleValueChange('time_value', parseInt(v))}
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
                      value={wsjfData?.rroe_value?.toString() || ''}
                      onValueChange={(v) => handleValueChange('rroe_value', parseInt(v))}
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
                      value={wsjfData?.job_size?.toString() || ''}
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
                      ({wsjfData.business_value} + {wsjfData.time_value} + {wsjfData.rroe_value}) ÷ {wsjfData.job_size}
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {!selectedPiId && (
        <div className="text-center py-12 text-muted-foreground">
          Select a Program Increment to configure WSJF scoring
        </div>
      )}
    </div>
  );
}
