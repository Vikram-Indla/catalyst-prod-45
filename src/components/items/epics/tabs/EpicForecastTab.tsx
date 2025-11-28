import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface EpicForecastTabProps {
  epic: any;
}

export function EpicForecastTab({ epic }: EpicForecastTabProps) {
  const queryClient = useQueryClient();

  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: forecasts } = useQuery({
    queryKey: ['epic-forecasts', epic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_pi_forecasts')
        .select('*, program_increments(code, name)')
        .eq('epic_id', epic.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const saveForecastMutation = useMutation({
    mutationFn: async ({ piId, estimate }: { piId: string; estimate: number }) => {
      const existing = forecasts?.find(f => f.pi_id === piId);
      
      if (existing) {
        const { error } = await supabase
          .from('epic_pi_forecasts')
          .update({ estimate })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('epic_pi_forecasts')
          .insert({
            epic_id: epic.id,
            pi_id: piId,
            estimate
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-forecasts'] });
      toast.success('Forecast saved');
    }
  });

  const deleteForecastMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('epic_pi_forecasts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-forecasts'] });
      toast.success('Forecast deleted');
    }
  });

  const handleSaveForecast = (piId: string, estimate: string) => {
    const estimateNum = parseFloat(estimate);
    if (isNaN(estimateNum)) {
      toast.error('Please enter a valid number');
      return;
    }
    saveForecastMutation.mutate({ piId, estimate: estimateNum });
  };

  const totalForecast = forecasts?.reduce((sum, f) => sum + (f.estimate || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground mb-4">
        Forecast epic effort across Program Increments
      </div>

      <Card className="p-4 bg-primary/5">
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Total Forecasted Points</div>
          <div className="text-3xl font-bold text-primary">{totalForecast}</div>
        </div>
      </Card>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Program Increment</TableHead>
              <TableHead>Estimate (Points)</TableHead>
              <TableHead className="w-24">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programIncrements && programIncrements.length > 0 ? (
              programIncrements.map((pi: any) => {
                const forecast = forecasts?.find(f => f.pi_id === pi.id);
                return (
                  <TableRow key={pi.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{pi.code}</div>
                        <div className="text-sm text-muted-foreground">{pi.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        defaultValue={forecast?.estimate || 0}
                        onBlur={(e) => handleSaveForecast(pi.id, e.target.value)}
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      {forecast && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Delete this forecast?')) {
                              deleteForecastMutation.mutate(forecast.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  No Program Increments found. Create PIs first.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
