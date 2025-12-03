import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calculator, Info, TrendingUp, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WSJFScoringModal } from '@/components/wsjf';
import { Badge } from '@/components/ui/badge';

/**
 * EpicWSJFTab - WSJF scoring tab for Epic details panel
 * Now integrates with canonical WSJFScoringModal matching Jira Align
 */

interface EpicWSJFTabProps {
  epic: any;
}

export function EpicWSJFTab({ epic }: EpicWSJFTabProps) {
  const [selectedPiId, setSelectedPiId] = useState<string>('');
  const [wsjfModalOpen, setWsjfModalOpen] = useState(false);

  // Fetch ALL available PIs (not just assigned ones) so users can score WSJF
  const { data: pis, isLoading: pisLoading } = useQuery({
    queryKey: ['all-program-increments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_increments')
        .select('id, name, code')
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch WSJF scores for all PIs
  const { data: allWsjfScores, isLoading: scoresLoading } = useQuery({
    queryKey: ['epic-wsjf-all', epic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epic_wsjf')
        .select(`
          *,
          program_increments(id, name, code)
        `)
        .eq('epic_id', epic.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!epic?.id,
  });

  // Fetch selected PI's WSJF data
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
      return data;
    },
    enabled: !!epic?.id && !!selectedPiId,
  });

  if (!epic) {
    return <div className="text-center py-8 text-muted-foreground">Epic data not available</div>;
  }

  const openModal = (piId?: string) => {
    if (piId) setSelectedPiId(piId);
    setWsjfModalOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          WSJF (Weighted Shortest Job First) prioritizes work items based on Cost of Delay divided by Job Size.
          Higher scores indicate higher priority.
        </AlertDescription>
      </Alert>

      {/* WSJF Scores Summary - per Jira Align pattern */}
      {allWsjfScores && allWsjfScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-brand-gold" />
              WSJF Prioritization Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allWsjfScores.map((score: any) => {
                const piName = score.program_increments?.code || score.program_increments?.name || 'PI';
                return (
                  <div 
                    key={score.id}
                    className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => openModal(score.pi_id)}
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{piName}</Badge>
                      <span className="text-sm text-muted-foreground">WSJF Prioritization:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-brand-gold">
                        {(score.wsjf_score || 0).toFixed(2)}
                      </span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PI Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configure WSJF by Program Increment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Program Increment</Label>
            <Select value={selectedPiId} onValueChange={setSelectedPiId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a Program Increment" />
              </SelectTrigger>
              <SelectContent>
                {pisLoading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : pis && pis.length > 0 ? (
                  pis.map((pi: any) => (
                    <SelectItem key={pi.id} value={pi.id}>
                      {pi.code || pi.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>No PIs assigned to this epic</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedPiId && (
            <Button 
              onClick={() => openModal(selectedPiId)}
              className="w-full bg-brand-gold text-brand-dark hover:bg-brand-gold-hover"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Score WSJF
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Current Score Display */}
      {selectedPiId && wsjfData && (
        <Card className="border-brand-gold">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-brand-gold" />
              Current WSJF Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-brand-gold mb-4">
              {(wsjfData.wsjf_score || 0).toFixed(2)}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Business Value:</span>
                <span className="font-medium">{wsjfData.business_value || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time Value:</span>
                <span className="font-medium">{wsjfData.time_value || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">RR/OE Value:</span>
                <span className="font-medium">{wsjfData.rroe_value || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Job Size:</span>
                <span className="font-medium">{wsjfData.job_size || 0}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
              Formula: (BV + TV + RR/OE) ÷ Job Size = ({wsjfData.business_value || 0} + {wsjfData.time_value || 0} + {wsjfData.rroe_value || 0}) ÷ {wsjfData.job_size || 1}
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedPiId && (!allWsjfScores || allWsjfScores.length === 0) && (
        <div className="text-center py-12 text-muted-foreground">
          Select a Program Increment to configure WSJF scoring
        </div>
      )}

      {/* WSJF Scoring Modal - Jira Align pattern */}
      <WSJFScoringModal
        open={wsjfModalOpen}
        onOpenChange={setWsjfModalOpen}
        workItemId={epic.id}
        workItemType="epic"
        workItemTitle={epic.name}
        workItemKey={epic.epic_key}
        piId={selectedPiId}
        onSuccess={() => setWsjfModalOpen(false)}
      />
    </div>
  );
}
