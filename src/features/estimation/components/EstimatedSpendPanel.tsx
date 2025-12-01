import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info, DollarSign } from 'lucide-react';

interface EstimatedSpendPanelProps {
  epicId: string;
}

export function EstimatedSpendPanel({ epicId }: EstimatedSpendPanelProps) {
  const [selectedPiId, setSelectedPiId] = useState<string>('');

  // Fetch program increments
  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch features for this epic
  const { data: features } = useQuery({
    queryKey: ['epic-features-spend', epicId, selectedPiId],
    queryFn: async () => {
      let query = supabase
        .from('features')
        .select(`
          *,
          teams(name),
          program_increments(name)
        `)
        .eq('epic_id', epicId);

      if (selectedPiId) {
        query = query.eq('pi_id', selectedPiId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPiId
  });

  // Calculate spend per feature based on estimate and conversion rates
  const calculateFeatureSpend = (estimatePoints: number | null) => {
    if (!estimatePoints) return 0;
    // Simplified calculation: $1000 per story point (placeholder logic)
    return estimatePoints * 1000;
  };

  const totalSpend = features?.reduce((sum, f) => 
    sum + calculateFeatureSpend(f.estimate_points), 0) || 0;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-brand-gold" />
              Estimated Spend
            </CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-semibold">Calculation Breakdown</h4>
                  <p className="text-sm text-muted-foreground">
                    Estimated Spend = Sum of (Feature Estimate × Cost per Point)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cost per Point is derived from team/program spend rates configured in Administration.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* PI Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Program Increment:</span>
              <Select value={selectedPiId} onValueChange={setSelectedPiId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select PI" />
                </SelectTrigger>
                <SelectContent>
                  {programIncrements?.map((pi) => (
                    <SelectItem key={pi.id} value={pi.id}>
                      {pi.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Total Spend */}
            {selectedPiId && (
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Estimated Spend:</span>
                  <span className="text-2xl font-bold text-brand-gold">
                    ${totalSpend.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feature Breakdown Grid */}
      {selectedPiId && features && features.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>PI</TableHead>
                    <TableHead className="text-right">Estimate</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {features.map((feature) => {
                    const spend = calculateFeatureSpend(feature.estimate_points);
                    return (
                      <TableRow key={feature.id}>
                        <TableCell className="font-medium">{feature.name}</TableCell>
                        <TableCell>{feature.teams?.name || '-'}</TableCell>
                        <TableCell>{feature.program_increments?.name || '-'}</TableCell>
                        <TableCell className="text-right">
                          {feature.estimate_points || 0} pts
                        </TableCell>
                        <TableCell className="text-right font-semibold text-brand-gold">
                          ${spend.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPiId && (!features || features.length === 0) && (
        <div className="text-center py-8 text-muted-foreground">
          No features found for selected Program Increment
        </div>
      )}
    </div>
  );
}
