import { useMemo, useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BusinessRequest } from '@/types/business-request';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Score options 0-10
const SCORE_OPTIONS = Array.from({ length: 11 }, (_, i) => i);

// Rank options 1-20
const RANK_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

// Get rank label based on score
const getRankLabel = (score: number): { label: string; color: string } => {
  if (score >= 90) return { label: 'Must-Do Now', color: 'text-green-700 bg-green-50 border-green-200' };
  if (score >= 75) return { label: 'High', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  if (score >= 60) return { label: 'Medium', color: 'text-amber-700 bg-amber-50 border-amber-200' };
  if (score >= 40) return { label: 'Low', color: 'text-orange-700 bg-orange-50 border-orange-200' };
  return { label: 'Backlog / Parked', color: 'text-red-700 bg-red-50 border-red-200' };
};

// Get score circle color - simplified
const getScoreColor = (score: number): string => {
  if (score >= 70) return 'text-green-600 border-green-400';
  if (score >= 40) return 'text-amber-600 border-amber-400';
  return 'text-red-600 border-red-400';
};

interface BusinessScoreViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  requestId?: string;
}

export function BusinessScoreViewTab({ data, onChange, requestId }: BusinessScoreViewTabProps) {
  const { toast } = useToast();
  
  const isForceRanked = data.is_force_ranked === true && data.rank !== null && data.rank !== undefined;
  
  const executiveUrgency = data.executive_urgency ?? 0;
  const businessValue = data.business_value ?? 0;
  const complexity = data.complexity_score ?? 0;

  // Check if scoring is complete (all inputs have values > 0)
  const isScoringComplete = executiveUrgency > 0 && businessValue > 0 && complexity > 0;

  const [justification, setJustification] = useState(data.rank_override_justification || '');
  const [showJustification, setShowJustification] = useState(isForceRanked);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const prevRankRef = useRef<number | null>(data.rank);

  // Check user role
  const { data: userRole } = useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      return roles?.map(r => r.role) || [];
    },
  });

  // Fetch all requests for rank position
  const { data: allRequests } = useQuery({
    queryKey: ['all-business-requests-for-rank'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('id, business_score, is_force_ranked, rank')
        .is('deleted_at', null)
        .order('business_score', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const canAccessForcedRank = useMemo(() => {
    if (!userRole) return false;
    return userRole.includes('admin') || userRole.includes('program_manager');
  }, [userRole]);

  // Calculate business score - ONLY when all 3 inputs are > 0
  const businessScore = useMemo(() => {
    // Guard: All inputs must be > 0 for a valid score
    if (!isScoringComplete) return 0;
    
    const normalizedUrgency = executiveUrgency / 10;
    const normalizedBusinessValue = businessValue / 10;
    const normalizedSimplicity = (10 - complexity) / 10;
    
    return Math.round(
      (0.45 * normalizedBusinessValue + 0.35 * normalizedUrgency + 0.20 * normalizedSimplicity) * 100
    );
  }, [isScoringComplete, executiveUrgency, businessValue, complexity]);

  // Calculate rank position
  const autoRankPosition = useMemo(() => {
    if (!allRequests || allRequests.length === 0 || !requestId) return null;
    const sortedByScore = [...allRequests].sort((a, b) => (b.business_score ?? 0) - (a.business_score ?? 0));
    const position = sortedByScore.findIndex(r => r.id === requestId);
    return position >= 0 ? position + 1 : null;
  }, [allRequests, requestId]);

  const rankInfo = getRankLabel(businessScore);

  useEffect(() => {
    setShowJustification(isForceRanked);
  }, [isForceRanked]);

  useEffect(() => {
    setJustification(data.rank_override_justification || '');
  }, [data.rank_override_justification]);

  const handleInputChange = (field: string, value: number) => {
    if (isForceRanked) return;
    
    // Persist the individual input
    onChange(field, value);
    
    // Calculate what the new values would be
    let newUrgency = executiveUrgency;
    let newBusinessValue = businessValue;
    let newComplexity = complexity;
    
    if (field === 'executive_urgency') newUrgency = value;
    if (field === 'business_value') newBusinessValue = value;
    if (field === 'complexity_score') newComplexity = value;
    
    // GATED SCORING: Only calculate and persist business_score when ALL 3 inputs > 0
    const allInputsProvided = newUrgency > 0 && newBusinessValue > 0 && newComplexity > 0;
    
    if (allInputsProvided) {
      const normalizedUrg = newUrgency / 10;
      const normalizedBV = newBusinessValue / 10;
      const normalizedSimp = (10 - newComplexity) / 10;
      
      const newScore = Math.round(
        (0.45 * normalizedBV + 0.35 * normalizedUrg + 0.20 * normalizedSimp) * 100
      );
      
      onChange('business_score', newScore);
    } else {
      // Reset score to 0 if inputs incomplete
      onChange('business_score', 0);
    }
  };

  const logRankChange = async (oldRank: number | null, newRank: number | null, isAuto: boolean) => {
    if (!requestId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      const actorName = profile?.full_name || user?.email || 'Unknown User';
      const oldValue = oldRank !== null ? `Rank ${oldRank}` : 'Auto';
      const newValue = isAuto ? 'Auto' : `Rank ${newRank}`;

      await supabase.from('business_request_audit_logs').insert({
        business_request_id: requestId,
        actor_id: user?.id,
        actor_name: actorName,
        action: 'RANK_OVERRIDE',
        field_changed: 'Forced Rank',
        old_value: oldValue,
        new_value: newValue,
      });
    } catch (error) {
      console.error('Failed to log rank change:', error);
    }
  };

  // Handle click on disabled force rank
  const handleForceRankClick = () => {
    if (!isScoringComplete && !isForceRanked) {
      toast({
        title: 'Scoring Required',
        description: 'Complete scoring inputs before applying rank override.',
        variant: 'destructive',
      });
    }
  };

  const handleRankChange = async (value: string) => {
    // Gate: Don't allow force rank without complete scoring
    if (!isScoringComplete && value !== 'auto') {
      toast({
        title: 'Scoring Required',
        description: 'Complete scoring inputs before applying rank override.',
        variant: 'destructive',
      });
      return;
    }

    const oldRank = prevRankRef.current;
    
    if (value === 'auto') {
      onChange('rank', null);
      onChange('is_force_ranked', false);
      setShowJustification(false);
      logRankChange(oldRank, null, true);
      toast({ title: 'Rank updated', description: 'Switched to auto-calculated ranking.' });
    } else {
      const newRank = parseInt(value);
      onChange('rank', newRank);
      onChange('is_force_ranked', true);
      setShowJustification(true);
      logRankChange(oldRank, newRank, false);
      toast({ title: 'Rank updated', description: `Manual rank #${newRank} applied.` });
    }
    
    prevRankRef.current = value === 'auto' ? null : parseInt(value);
  };

  const handleSaveJustification = async () => {
    if (!justification.trim()) {
      toast({ title: 'Justification Required', description: 'Please provide a business justification.', variant: 'destructive' });
      return;
    }
    
    onChange('rank_override_justification', justification);
    
    if (requestId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user?.id)
          .single();

        const actorName = profile?.full_name || user?.email || 'Unknown User';

        await supabase.from('business_request_audit_logs').insert({
          business_request_id: requestId,
          actor_id: user?.id,
          actor_name: actorName,
          action: 'UPDATE',
          field_changed: 'Rank Justification',
          old_value: data.rank_override_justification || null,
          new_value: justification,
        });
      } catch (error) {
        console.error('Failed to log justification:', error);
      }
    }
    
    toast({ title: 'Justification saved' });
  };

  // Force rank is only enabled if scoring is complete OR already force ranked
  const forceRankEnabled = isScoringComplete || isForceRanked;

  return (
    <div className="space-y-5 p-5">
      <div className="grid grid-cols-2 gap-5">
        {/* Left Column - Inputs */}
        <Card className="border border-border/50 rounded-lg bg-card">
          <CardContent className="p-5 space-y-5">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand-gold">
              Inputs (0–10 Scale)
            </h3>

            {/* Executive Urgency */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-sm font-medium text-foreground">1. Executive Urgency</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  0 = no urgency, 10 = critical
                </p>
                <Select
                  value={String(executiveUrgency)}
                  onValueChange={(value) => handleInputChange('executive_urgency', parseInt(value))}
                  disabled={isForceRanked}
                >
                  <SelectTrigger className={cn("mt-1.5 h-8 text-sm", isForceRanked && "opacity-50 bg-muted")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-50">
                    {SCORE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={cn(
                "w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold text-sm shrink-0 bg-transparent",
                isForceRanked ? "border-muted-foreground/30 text-muted-foreground" : getScoreColor(executiveUrgency * 10)
              )}>
                {executiveUrgency}
              </div>
            </div>

            {/* Business Value */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-sm font-medium text-foreground">2. Business Value</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  0 = minimal, 10 = very high strategic value
                </p>
                <Select
                  value={String(businessValue)}
                  onValueChange={(value) => handleInputChange('business_value', parseInt(value))}
                  disabled={isForceRanked}
                >
                  <SelectTrigger className={cn("mt-1.5 h-8 text-sm", isForceRanked && "opacity-50 bg-muted")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-50">
                    {SCORE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={cn(
                "w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold text-sm shrink-0 bg-transparent",
                isForceRanked ? "border-muted-foreground/30 text-muted-foreground" : getScoreColor(businessValue * 10)
              )}>
                {businessValue}
              </div>
            </div>

            {/* Complexity */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-sm font-medium text-foreground">3. Complexity</Label>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  0 = simple, 10 = very complex
                </p>
                <Select
                  value={String(complexity)}
                  onValueChange={(value) => handleInputChange('complexity_score', parseInt(value))}
                  disabled={isForceRanked}
                >
                  <SelectTrigger className={cn("mt-1.5 h-8 text-sm", isForceRanked && "opacity-50 bg-muted")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-50">
                    {SCORE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={cn(
                "w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold text-sm shrink-0 bg-transparent",
                isForceRanked ? "border-muted-foreground/30 text-muted-foreground" : getScoreColor((1 - complexity / 10) * 100)
              )}>
                {complexity}
              </div>
            </div>

            {isForceRanked && (
              <p className="text-[10px] text-amber-600 italic pt-2 border-t border-border/40">
                Inputs locked. Switch to Auto to edit.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Results */}
        <Card className="border border-border/50 rounded-lg bg-card">
          <CardContent className="p-5 space-y-4">
            {/* Forced Rank Section */}
            {canAccessForcedRank && (
              <div className="pb-4 border-b border-border/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand-gold">
                      Force Rank
                    </h3>
                  </div>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Reserved</span>
                </div>
                <div className="flex items-center gap-2" onClick={!forceRankEnabled ? handleForceRankClick : undefined}>
                  <Select
                    value={isForceRanked ? String(data.rank) : 'auto'}
                    onValueChange={handleRankChange}
                    disabled={!forceRankEnabled}
                  >
                    <SelectTrigger className={cn("h-8 text-sm", !forceRankEnabled && "opacity-50 cursor-not-allowed")}>
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-50">
                      <SelectItem value="auto">Auto</SelectItem>
                      {RANK_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={String(opt)}>#{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isForceRanked && (
                    <span className="text-sm font-semibold text-brand-gold">#{data.rank}</span>
                  )}
                </div>
                {!isScoringComplete && !isForceRanked && (
                  <p className="text-[9px] text-muted-foreground mt-1.5 italic">
                    Complete all inputs to enable
                  </p>
                )}
              </div>
            )}

            {/* Business Score - Always visible */}
            <div className="text-center py-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand-gold mb-2">
                Business Score
              </h3>
              {isScoringComplete ? (
                <>
                  <div className="text-4xl font-bold text-brand-gold leading-none">
                    {businessScore}
                  </div>
                  {autoRankPosition && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Position #{autoRankPosition} of {allRequests?.length || 0}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-muted-foreground/50 leading-none">
                    —
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 italic">
                    Complete all inputs to generate score
                  </p>
                </>
              )}
            </div>

            {/* Rank Badge */}
            <div className="text-center">
              {isForceRanked ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium text-brand-gold bg-brand-gold/10 border border-brand-gold/20">
                  <Lock className="h-3 w-3" />
                  Manual #{data.rank}
                </span>
              ) : isScoringComplete ? (
                <span className={cn(
                  "inline-flex px-2.5 py-1 rounded text-[11px] font-medium border",
                  rankInfo.color
                )}>
                  {rankInfo.label}
                </span>
              ) : (
                <span className="inline-flex px-2.5 py-1 rounded text-[11px] font-medium border border-muted-foreground/20 text-muted-foreground/60 bg-muted/30">
                  Not Scored
                </span>
              )}
            </div>

            {/* Collapsible Details */}
            <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
              <CollapsibleTrigger className="w-full flex items-center justify-between py-1.5 px-2 bg-muted/30 rounded hover:bg-muted/50 transition-colors">
                <span className="text-[10px] font-medium text-muted-foreground">
                  Score Details & Thresholds
                </span>
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition-transform",
                  isDetailsOpen && "rotate-180"
                )} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-2">
                <div className="space-y-1 text-[10px]">
                  <div className="flex justify-between"><span className="text-green-600">90–100</span><span className="text-muted-foreground">Must-Do Now</span></div>
                  <div className="flex justify-between"><span className="text-emerald-600">75–89</span><span className="text-muted-foreground">High</span></div>
                  <div className="flex justify-between"><span className="text-amber-600">60–74</span><span className="text-muted-foreground">Medium</span></div>
                  <div className="flex justify-between"><span className="text-orange-600">40–59</span><span className="text-muted-foreground">Low</span></div>
                  <div className="flex justify-between"><span className="text-red-600">0–39</span><span className="text-muted-foreground">Backlog</span></div>
                </div>
                <div className="pt-2 border-t border-border/40 text-[10px] text-muted-foreground space-y-0.5">
                  <p>• Business Value: 45%</p>
                  <p>• Executive Urgency: 35%</p>
                  <p>• Simplicity: 20%</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      </div>

      {/* Justification Section */}
      {canAccessForcedRank && showJustification && (
        <Card className="border border-amber-200 rounded-lg bg-amber-50/30">
          <CardContent className="p-4 space-y-2">
            <Label className="text-sm font-medium text-amber-800">
              Business Justification
            </Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Enter justification for rank override..."
              className="min-h-[70px] resize-none text-sm bg-white"
            />
            <Button 
              onClick={handleSaveJustification}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
              size="sm"
              disabled={!justification.trim()}
            >
              Save Justification
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
