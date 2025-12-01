import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface SpendDrilldownModalProps {
  epicId: string;
  spendType: 'accepted' | 'forecasted' | 'estimated';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpendDrilldownModal({ epicId, spendType, open, onOpenChange }: SpendDrilldownModalProps) {
  const [selectedPIId, setSelectedPIId] = useState<string>('all');

  // Fetch child features for this epic
  const { data: features = [] } = useQuery({
    queryKey: ['epic-features', epicId, selectedPIId],
    queryFn: async () => {
      let query = supabase
        .from('features')
        .select('*, programs(name), teams(name)')
        .eq('epic_id', epicId);
      
      if (selectedPIId && selectedPIId !== 'all') {
        query = query.eq('pi_id', selectedPIId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open && spendType === 'estimated',
  });

  // Fetch program increments for filter
  const { data: pis = [] } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Calculate spend per feature (placeholder - needs real program spend per point data)
  const calculateFeatureSpend = (feature: any) => {
    const estimatePoints = feature.estimate_points || 0;
    const spendPerPoint = 1000; // TODO: Fetch from program_spend_per_point calculation
    return estimatePoints * spendPerPoint;
  };

  const totalEstimatedSpend = features.reduce((sum, f) => sum + calculateFeatureSpend(f), 0);
  const estimatedFeatures = features.filter(f => f.estimate_points > 0);
  const unestimatedFeatures = features.filter(f => !f.estimate_points || f.estimate_points === 0);

  const getSpendTypeLabel = () => {
    switch (spendType) {
      case 'accepted': return 'Accepted Spend';
      case 'forecasted': return 'Forecasted Spend';
      case 'estimated': return 'Estimated Spend';
      default: return 'Spend';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{getSpendTypeLabel()} Breakdown</DialogTitle>
          <DialogDescription>
            {spendType === 'estimated' && 'Feature-level spend details for this epic'}
            {spendType === 'accepted' && 'Story-level accepted spend for this epic'}
            {spendType === 'forecasted' && 'Forecasted spend across program increments'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Cards - for Estimated Spend */}
          {spendType === 'estimated' && (
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">Total Features</div>
                <div className="text-2xl font-bold">{features.length}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">Estimated Features</div>
                <div className="text-2xl font-bold text-success">{estimatedFeatures.length}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">Unestimated Features</div>
                <div className="text-2xl font-bold text-warning">{unestimatedFeatures.length}</div>
              </Card>
              <Card className="p-4">
                <div className="text-xs text-muted-foreground">Total Estimated Spend</div>
                <div className="text-2xl font-bold text-brand-gold">${totalEstimatedSpend.toLocaleString()}</div>
              </Card>
            </div>
          )}

          {/* Unestimated Features Warning */}
          {spendType === 'estimated' && unestimatedFeatures.length > 0 && (
            <Card className="p-4 bg-warning/10 border-warning">
              <div className="flex items-start gap-3">
                <ExternalLink className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-sm">Unestimated Features</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {unestimatedFeatures.length} feature{unestimatedFeatures.length > 1 ? 's' : ''} without estimates. 
                    Add estimates to improve spend accuracy.
                  </div>
                  <Button variant="link" size="sm" className="mt-2 p-0 h-auto text-xs">
                    View unestimated features →
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* PI Filter */}
          <div>
            <Label htmlFor="pi-filter">Filter by Program Increment</Label>
            <Select value={selectedPIId} onValueChange={setSelectedPIId}>
              <SelectTrigger id="pi-filter" className="mt-2">
                <SelectValue placeholder="All PIs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All PIs</SelectItem>
                {pis.map(pi => (
                  <SelectItem key={pi.id} value={pi.id}>
                    {pi.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Feature Table for Estimated Spend */}
          {spendType === 'estimated' && (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PI</TableHead>
                    <TableHead>Feature ID</TableHead>
                    <TableHead>Feature Name</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Estimate (PTS)</TableHead>
                    <TableHead className="text-right">Estimated Spend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {features.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No features found
                      </TableCell>
                    </TableRow>
                  ) : (
                    features.map((feature) => (
                      <TableRow key={feature.id} className="hover:bg-muted/50 cursor-pointer">
                        <TableCell className="text-sm">
                          {feature.pi_id ? pis.find(p => p.id === feature.pi_id)?.name || '-' : '-'}
                        </TableCell>
                        <TableCell className="text-sm font-mono">{feature.display_id || '-'}</TableCell>
                        <TableCell className="text-sm font-medium">{feature.name}</TableCell>
                        <TableCell className="text-sm">{feature.status || '-'}</TableCell>
                        <TableCell className="text-sm">{feature.programs?.name || '-'}</TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          {feature.estimate_points || 0}
                        </TableCell>
                        <TableCell className="text-right text-sm font-bold text-brand-gold">
                          ${calculateFeatureSpend(feature).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {/* Story Table for Accepted/Forecasted Spend */}
          {(spendType === 'accepted' || spendType === 'forecasted') && (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Story ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Sprint</TableHead>
                    <TableHead className="text-right">Spend/Point</TableHead>
                    <TableHead className="text-right">Estimate</TableHead>
                    <TableHead className="text-right">Total Spend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {spendType === 'accepted' && 'No accepted stories found'}
                      {spendType === 'forecasted' && 'No forecasted stories found'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
