/**
 * TechnicalScoreViewTab - Cloned from BusinessScoreViewTab
 * 
 * Changes:
 * - REMOVED: Executive Urgency
 * - Inputs: Business Alignment, Time Criticality, Investor Enablement, Job Size
 * - Renamed: Business Score → Technical Score
 * - Renamed: Business Justification → Technical Justification
 */

import { useMemo, useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Lock, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Score options 1-20 (for WSJF-style scoring)
const SCORE_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

// Rank options 1-20
const RANK_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

// Get rank label based on score
const getRankLabel = (score: number): { label: string; color: string } => {
  if (score >= 15) return { label: 'Urgent', color: 'text-red-800 bg-red-100 border-red-300' };
  if (score >= 10) return { label: 'High', color: 'text-orange-800 bg-orange-100 border-orange-300' };
  if (score >= 5) return { label: 'Medium', color: 'text-amber-800 bg-amber-100 border-amber-300' };
  return { label: 'Low', color: 'text-green-800 bg-green-100 border-green-300' };
};

interface TechnicalScoreViewTabProps {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
  epicId?: string;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function TechnicalScoreViewTab({ data, onChange, epicId, onDirtyChange }: TechnicalScoreViewTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // WSJF fields (mapped to epic columns)
  const businessAlignment = data.business_value ?? 0;
  const timeCriticality = data.time_value ?? 0;
  const investorEnablement = data.rroe_value ?? 0;
  const jobSize = data.job_size ?? 1;

  // Check if scoring is complete
  const isScoringComplete = businessAlignment > 0 && timeCriticality > 0 && investorEnablement > 0 && jobSize > 0;

  const [justification, setJustification] = useState(data.rank_override_justification || '');
  const [showJustification, setShowJustification] = useState(false);
  const [pendingRank, setPendingRank] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isSavingRank, setIsSavingRank] = useState(false);

  // Calculate Technical Score (Cost of Delay / Job Size)
  const technicalScore = useMemo(() => {
    if (!isScoringComplete) return 0;
    const costOfDelay = businessAlignment + timeCriticality + investorEnablement;
    return Math.round((costOfDelay / jobSize) * 10) / 10;
  }, [isScoringComplete, businessAlignment, timeCriticality, investorEnablement, jobSize]);

  const rankInfo = getRankLabel(technicalScore);

  const handleInputChange = (field: string, value: number) => {
    onChange(field, value);
    onDirtyChange?.(true);
  };

  return (
    <div className="p-4 md:p-5 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Panel - Inputs */}
        <Card className="border border-border">
          <CardContent className="p-5 space-y-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">
              INPUTS (1–20 SCALE)
            </h3>
            
            {/* 1. Business Alignment */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-sm font-medium">1. Business Alignment</Label>
                <p className="text-xs text-muted-foreground">1 = low alignment, 20 = critical alignment</p>
                <Select 
                  value={String(businessAlignment)} 
                  onValueChange={(v) => handleInputChange('business_value', parseInt(v))}
                >
                  <SelectTrigger className="mt-1.5 h-9 w-full max-w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[400]">
                    {SCORE_OPTIONS.map((val) => (
                      <SelectItem key={val} value={String(val)}>{val}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center text-sm font-medium">
                {businessAlignment}
              </div>
            </div>

            {/* 2. Time Criticality */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-sm font-medium">2. Time Criticality</Label>
                <p className="text-xs text-muted-foreground">1 = can wait, 20 = extremely time-sensitive</p>
                <Select 
                  value={String(timeCriticality)} 
                  onValueChange={(v) => handleInputChange('time_value', parseInt(v))}
                >
                  <SelectTrigger className="mt-1.5 h-9 w-full max-w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[400]">
                    {SCORE_OPTIONS.map((val) => (
                      <SelectItem key={val} value={String(val)}>{val}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center text-sm font-medium">
                {timeCriticality}
              </div>
            </div>

            {/* 3. Investor Enablement */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-sm font-medium">3. Investor Enablement</Label>
                <p className="text-xs text-muted-foreground">1 = low enablement, 20 = high enablement</p>
                <Select 
                  value={String(investorEnablement)} 
                  onValueChange={(v) => handleInputChange('rroe_value', parseInt(v))}
                >
                  <SelectTrigger className="mt-1.5 h-9 w-full max-w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[400]">
                    {SCORE_OPTIONS.map((val) => (
                      <SelectItem key={val} value={String(val)}>{val}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center text-sm font-medium">
                {investorEnablement}
              </div>
            </div>

            {/* 4. Job Size */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label className="text-sm font-medium">4. Job Size</Label>
                <p className="text-xs text-muted-foreground">1 = tiny, 20 = huge effort</p>
                <Select 
                  value={String(jobSize)} 
                  onValueChange={(v) => handleInputChange('job_size', parseInt(v))}
                >
                  <SelectTrigger className="mt-1.5 h-9 w-full max-w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[400]">
                    {SCORE_OPTIONS.map((val) => (
                      <SelectItem key={val} value={String(val)}>{val}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-border flex items-center justify-center text-sm font-medium">
                {jobSize}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Technical Score Display */}
        <Card className="border border-border">
          <CardContent className="p-5 space-y-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold text-center">
              TECHNICAL SCORE
            </h3>
            
            {/* Score Display */}
            <div className="text-center">
              <span className="text-5xl font-bold text-brand-gold">
                {technicalScore.toFixed(1)}
              </span>
            </div>

            {/* Rank Display */}
            <div className="border rounded-lg p-4 text-center">
              <p className="text-sm font-medium">Rank #{data.global_rank || '—'} of {data.totalEpics || '—'}</p>
              <p className="text-xs text-muted-foreground">Changed {data.rankChangeCount || 0} times</p>
            </div>

            {/* Priority Badge */}
            <div className="flex justify-center">
              <span className={cn(
                "px-4 py-2 rounded-full text-sm font-medium border",
                rankInfo.color
              )}>
                {rankInfo.label}
              </span>
            </div>

            {/* Override Rank Section */}
            <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-brand-gold" />
                  <span>OVERRIDE RANK</span>
                  <span className="text-xs text-muted-foreground">(ADMIN)</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", isDetailsOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <div className="flex items-center gap-2">
                  <Select 
                    value={pendingRank ? String(pendingRank) : (data.global_rank ? String(data.global_rank) : 'auto')}
                    onValueChange={(v) => {
                      if (v === 'auto') {
                        setPendingRank(null);
                        setShowJustification(false);
                      } else {
                        setPendingRank(parseInt(v));
                        setShowJustification(true);
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent className="z-[400]">
                      <SelectItem value="auto">Auto</SelectItem>
                      {RANK_OPTIONS.map((val) => (
                        <SelectItem key={val} value={String(val)}>#{val}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="w-10 h-10 rounded-full border-2 border-brand-gold text-brand-gold flex items-center justify-center text-sm font-medium">
                    #{pendingRank || data.global_rank || '—'}
                  </div>
                </div>

                {showJustification && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Technical Justification <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      placeholder="Enter justification for rank override..."
                      className="min-h-[80px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      Current justification saved. Select a new rank to modify.
                    </p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      </div>

      {/* Score Breakdown */}
      <Collapsible className="mt-6">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 border rounded-lg hover:bg-muted/50">
          <span className="text-sm font-medium">SCORE BREAKDOWN</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="p-4 border border-t-0 rounded-b-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Cost of Delay:</span>
              <span className="ml-2 font-medium">{businessAlignment + timeCriticality + investorEnablement}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Job Size:</span>
              <span className="ml-2 font-medium">{jobSize}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Formula:</span>
              <span className="ml-2 font-medium">CoD / Job Size</span>
            </div>
            <div>
              <span className="text-muted-foreground">Result:</span>
              <span className="ml-2 font-medium">{technicalScore.toFixed(1)}</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
