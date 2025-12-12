import { useState, useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BusinessRequest } from '@/types/business-request';
import { Lock, ChevronDown, ChevronUp, Save, Pencil } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BusinessScoreViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  onDirtyChange?: (isDirty: boolean) => void;
  totalDemands?: number;
}

// Helper to check if a demand is "scored"
const isDemandScored = (demand: any): boolean => {
  return (
    demand.executive_urgency != null &&
    demand.business_value != null &&
    demand.complexity_score != null &&
    demand.business_score != null
  );
};

export function BusinessScoreViewTab({ data, onChange, onDirtyChange, totalDemands }: BusinessScoreViewTabProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // State for Override Rank edit mode
  const [isEditingOverride, setIsEditingOverride] = useState(false);
  const [editRank, setEditRank] = useState<number | null>(null);
  const [editJustification, setEditJustification] = useState('');
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  
  // Scoring inputs (0-10 scale as per screenshot)
  const executiveUrgency = data.executive_urgency ?? 0;
  const businessValue = data.business_value ?? 0;
  const complexityScore = data.complexity_score ?? 0;
  
  // Rank-related data
  const currentRank = data.rank;
  const isForceRanked = data.is_force_ranked ?? false;
  const rankJustification = data.rank_override_justification || '';
  
  // Scoring inputs are locked when force-ranked
  const inputsLocked = isForceRanked;

  // Calculate weighted business score (formula from existing code)
  // Using 0-10 scale inputs: (EU * 0.4 + BV * 0.4 + (10 - Complexity) * 0.2) * 10
  const calculatedScore = Math.round(
    (executiveUrgency * 0.4 + businessValue * 0.4 + (10 - complexityScore) * 0.2) * 10
  );

  // Update business_score when component values change
  useEffect(() => {
    if (data.business_score !== calculatedScore && !inputsLocked) {
      onChange('business_score', calculatedScore);
    }
  }, [calculatedScore, data.business_score, onChange, inputsLocked]);

  // Fetch scoring stats for summary widget
  const { data: scoringStats } = useQuery({
    queryKey: ['demand-scoring-stats'],
    queryFn: async () => {
      const { data: demands, error } = await supabase
        .from('business_requests')
        .select('id, executive_urgency, business_value, complexity_score, business_score')
        .is('deleted_at', null);
      
      if (error) throw error;
      
      const total = demands?.length || 0;
      const scored = demands?.filter(isDemandScored).length || 0;
      const notScored = total - scored;
      
      return { total, scored, notScored };
    },
  });

  // Input change handler for scoring fields
  const handleInputChange = (field: string, value: number) => {
    if (inputsLocked) return;
    onChange(field, value);
    onDirtyChange?.(true);
  };

  // Enter edit mode for override rank
  const handleStartEdit = () => {
    setEditRank(currentRank);
    setEditJustification(rankJustification);
    setIsEditingOverride(true);
  };

  // Cancel edit - discard changes
  const handleCancelEdit = () => {
    setEditRank(null);
    setEditJustification('');
    setIsEditingOverride(false);
  };

  // Save rank override
  const handleSaveRank = () => {
    if (editRank !== null) {
      onChange('rank', editRank);
      onChange('is_force_ranked', true);
      onChange('rank_override_justification', editJustification);
      onDirtyChange?.(true);
    }
    setIsEditingOverride(false);
  };

  // Get complexity level label
  const getComplexityLabel = (score: number): string => {
    if (score <= 3) return 'Low';
    if (score <= 6) return 'Medium';
    return 'High';
  };

  // Navigate to filtered demand list
  const handleNavigateToFiltered = (filter: 'scored' | 'notScored') => {
    const programId = searchParams.get('programId');
    const separator = programId ? '&' : '?';
    const baseUrl = programId ? `/industry?programId=${programId}` : '/industry';
    navigate(`${baseUrl}${separator}scoringFilter=${filter}`);
  };

  // Generate rank options (1 to totalDemands or 20 as fallback)
  const maxRank = totalDemands || scoringStats?.total || 20;
  const rankOptions = Array.from({ length: maxRank }, (_, i) => i + 1);

  return (
    <div className="p-4 md:p-5 pb-6 space-y-6">
      {/* Scoring Summary Widget - Top Right */}
      {scoringStats && (
        <div className="flex justify-end mb-2">
          <div className="text-sm text-muted-foreground space-x-4">
            <button
              onClick={() => handleNavigateToFiltered('scored')}
              className="hover:text-brand-gold hover:underline transition-colors"
            >
              <span className="font-semibold text-foreground">{scoringStats.scored}</span> of {scoringStats.total} demands scored
            </button>
            <span>•</span>
            <button
              onClick={() => handleNavigateToFiltered('notScored')}
              className="hover:text-brand-gold hover:underline transition-colors"
            >
              <span className="font-semibold text-foreground">{scoringStats.notScored}</span> demands not scored
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left Column - Inputs */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Inputs (0–10 Scale)
            </h3>
          </div>

          {/* 1. Executive Urgency */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">1. Executive Urgency</Label>
                <p className="text-xs text-muted-foreground">0 = no urgency, 10 = critical</p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-brand-gold flex items-center justify-center">
                <span className="text-sm font-bold text-foreground">{executiveUrgency}</span>
              </div>
            </div>
            <Select
              value={String(executiveUrgency)}
              onValueChange={(v) => handleInputChange('executive_urgency', parseInt(v))}
              disabled={inputsLocked}
            >
              <SelectTrigger className={inputsLocked ? 'opacity-60' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[400]">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Business Value */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">2. Business Value</Label>
                <p className="text-xs text-muted-foreground">0 = minimal, 10 = very high strategic value</p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-brand-gold flex items-center justify-center">
                <span className="text-sm font-bold text-foreground">{businessValue}</span>
              </div>
            </div>
            <Select
              value={String(businessValue)}
              onValueChange={(v) => handleInputChange('business_value', parseInt(v))}
              disabled={inputsLocked}
            >
              <SelectTrigger className={inputsLocked ? 'opacity-60' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[400]">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Complexity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">3. Complexity</Label>
                <p className="text-xs text-muted-foreground">0 = simple, 10 = very complex</p>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-brand-gold flex items-center justify-center">
                <span className="text-sm font-bold text-foreground">{complexityScore}</span>
              </div>
            </div>
            <Select
              value={String(complexityScore)}
              onValueChange={(v) => handleInputChange('complexity_score', parseInt(v))}
              disabled={inputsLocked}
            >
              <SelectTrigger className={inputsLocked ? 'opacity-60' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[400]">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Locked notice when force-ranked */}
          {inputsLocked && (
            <p className="text-xs text-amber-600 italic">
              Scoring inputs locked while manually ranked. You can change the rank below or switch to Auto.
            </p>
          )}
        </div>

        {/* Right Column - Score Display & Override Rank */}
        <div className="space-y-4">
          {/* Business Score Card */}
          <div className="p-6 bg-muted/30 rounded-lg text-center border border-border">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Business Score
            </p>
            <div className="text-5xl font-bold text-brand-gold mb-3">{calculatedScore}</div>
            
            {/* Rank display */}
            <div className="p-3 bg-background rounded border border-border mb-3">
              <p className="text-sm text-foreground">
                Rank <span className="font-bold">#{currentRank || '—'}</span>
                {scoringStats && <span className="text-muted-foreground"> of {scoringStats.total}</span>}
              </p>
              {isForceRanked && (
                <p className="text-xs text-muted-foreground">Changed manually</p>
              )}
            </div>

            {/* Complexity Badge */}
            <div className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {getComplexityLabel(complexityScore)}
            </div>
          </div>

          {/* Override Rank Section */}
          <Collapsible open={isEditingOverride || isForceRanked}>
            <div className="border border-border rounded-lg overflow-hidden">
              <CollapsibleTrigger asChild>
                <button
                  onClick={() => !isEditingOverride && handleStartEdit()}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium uppercase tracking-wide">Override Rank</span>
                    <span className="text-xs text-muted-foreground">(Admin)</span>
                  </div>
                  {isEditingOverride ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-4 border-t border-border">
                  {isEditingOverride ? (
                    <>
                      {/* Edit Mode */}
                      <div className="flex items-center gap-3">
                        <Select
                          value={editRank ? String(editRank) : ''}
                          onValueChange={(v) => setEditRank(parseInt(v))}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select rank" />
                          </SelectTrigger>
                          <SelectContent className="z-[400]">
                            {rankOptions.map((n) => (
                              <SelectItem key={n} value={String(n)}>#{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground">#{editRank || '—'}</span>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">
                          Business Justification <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          value={editJustification}
                          onChange={(e) => setEditJustification(e.target.value)}
                          placeholder="Explain why this rank override is necessary..."
                          className="min-h-[80px] resize-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveRank}
                          disabled={!editRank || !editJustification.trim()}
                          className="bg-brand-gold hover:bg-brand-gold-hover text-white"
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save Rank
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : isForceRanked ? (
                    <>
                      {/* View Mode - Show saved override */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Current Override:</span>
                          <span className="text-sm font-semibold">#{currentRank}</span>
                        </div>
                        {rankJustification && (
                          <div className="p-3 bg-muted/50 rounded text-sm text-foreground">
                            {rankJustification}
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleStartEdit}
                          className="w-full"
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit Override
                        </Button>
                      </div>
                    </>
                  ) : null}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      </div>

      {/* Score Breakdown - Collapsible */}
      <Collapsible open={isBreakdownOpen} onOpenChange={setIsBreakdownOpen}>
        <div className="border border-border rounded-lg">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Score Breakdown
              </span>
              {isBreakdownOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 pt-0 border-t border-border">
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Formula:</strong></p>
                <p className="font-mono text-xs bg-muted p-2 rounded">
                  Score = (Executive Urgency × 40%) + (Business Value × 40%) + ((10 - Complexity) × 20%) × 10
                </p>
                <p className="mt-3">
                  = ({executiveUrgency} × 0.4) + ({businessValue} × 0.4) + ((10 - {complexityScore}) × 0.2) × 10
                </p>
                <p>
                  = {(executiveUrgency * 0.4).toFixed(1)} + {(businessValue * 0.4).toFixed(1)} + {((10 - complexityScore) * 0.2).toFixed(1)} × 10
                </p>
                <p className="font-semibold text-foreground">
                  = {calculatedScore}
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
