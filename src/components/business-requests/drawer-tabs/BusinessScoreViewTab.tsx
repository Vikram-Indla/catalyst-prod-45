import { useMemo, useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Lock, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BusinessRequest } from '@/types/business-request';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  onDirtyChange?: (isDirty: boolean) => void;
}

export function BusinessScoreViewTab({ data, onChange, requestId, onDirtyChange }: BusinessScoreViewTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isForceRanked = data.is_force_ranked === true && data.rank !== null && data.rank !== undefined;
  
  const executiveUrgency = data.executive_urgency ?? 0;
  const businessValue = data.business_value ?? 0;
  const complexity = data.complexity_score ?? 0;

  // Check if scoring is complete (all inputs have values > 0)
  const isScoringComplete = executiveUrgency > 0 && businessValue > 0 && complexity > 0;

  const [justification, setJustification] = useState(data.rank_override_justification || '');
  const [showJustification, setShowJustification] = useState(false);
  const [pendingRank, setPendingRank] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isSavingRank, setIsSavingRank] = useState(false);
  const skipNextResetRef = useRef(false);
  const prevRankRef = useRef<number | null>(data.rank);
  const originalRankRef = useRef<number | null>(data.rank);
  const originalIsForceRankedRef = useRef<boolean>(data.is_force_ranked === true);

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

  // Initialize refs when data changes - but skip if we just saved
  useEffect(() => {
    // Skip reset if we just triggered a save - prevents state from reverting
    if (skipNextResetRef.current) {
      skipNextResetRef.current = false;
      // Still update refs for next comparison, but don't reset UI state
      originalRankRef.current = data.rank;
      originalIsForceRankedRef.current = data.is_force_ranked === true;
      prevRankRef.current = data.rank;
      return;
    }
    originalRankRef.current = data.rank;
    originalIsForceRankedRef.current = data.is_force_ranked === true;
    prevRankRef.current = data.rank;
    setJustification(data.rank_override_justification || '');
    // Only show justification if already force ranked with saved justification
    setShowJustification(data.is_force_ranked === true && !!data.rank_override_justification);
    setPendingRank(null);
  }, [data.rank, data.is_force_ranked, data.rank_override_justification]);

  const handleInputChange = async (field: string, value: number) => {
    if (isForceRanked) return;
    
    // Update local state immediately for responsive UI
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
    let newScore = 0;
    
    if (allInputsProvided) {
      const normalizedUrg = newUrgency / 10;
      const normalizedBV = newBusinessValue / 10;
      const normalizedSimp = (10 - newComplexity) / 10;
      
      newScore = Math.round(
        (0.45 * normalizedBV + 0.35 * normalizedUrg + 0.20 * normalizedSimp) * 100
      );
      
      onChange('business_score', newScore);
    } else {
      onChange('business_score', 0);
    }
    
    // Auto-save to database immediately
    if (requestId) {
      try {
        const updateData: Record<string, any> = { [field]: value };
        
        // Also update business_score if all inputs are complete
        if (allInputsProvided) {
          updateData.business_score = newScore;
        }
        
        await supabase
          .from('business_requests')
          .update(updateData)
          .eq('id', requestId);
        
        // Refresh queries to keep everything in sync
        queryClient.invalidateQueries({ queryKey: ['business-requests'] });
        queryClient.invalidateQueries({ queryKey: ['business-request', requestId] });
      } catch (error) {
        console.error('Failed to auto-save scoring input:', error);
      }
    }
    
    // Notify parent of dirty state
    onDirtyChange?.(true);
  };

  const logRankChange = async (oldRank: number | null, newRank: number | null, isAuto: boolean, justificationText?: string) => {
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
        new_value: newValue + (justificationText ? ` - Justification: ${justificationText}` : ''),
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

  const handleRankChange = (value: string) => {
    // Gate: Don't allow force rank without complete scoring
    if (!isScoringComplete && value !== 'auto') {
      toast({
        title: 'Scoring Required',
        description: 'Complete scoring inputs before applying rank override.',
        variant: 'destructive',
      });
      return;
    }
    
    if (value === 'auto') {
      // Switching to auto - persist immediately
      handleSwitchToAuto();
    } else {
      // User selected a manual rank - show justification panel but don't persist yet
      const newRank = parseInt(value);
      setPendingRank(newRank);
      setShowJustification(true);
      setJustification(''); // Clear for new entry
    }
  };

  const handleSwitchToAuto = async () => {
    const oldRank = prevRankRef.current;
    
    // Persist to database
    if (requestId) {
      setIsSavingRank(true);
      skipNextResetRef.current = true; // Prevent useEffect from resetting state
      try {
        const { error: updateError } = await supabase
          .from('business_requests')
          .update({ 
            rank: null, 
            is_force_ranked: false,
            rank_override_justification: null,
            force_ranked_by: null,
            force_ranked_at: null
          })
          .eq('id', requestId);
        
        if (updateError) {
          console.error('Database update error:', updateError);
          throw updateError;
        }
        
        // Log the change
        await logRankChange(oldRank, null, true);
        
        // Update local state
        onChange('rank', null);
        onChange('is_force_ranked', false);
        onChange('rank_override_justification', null);
        
        setShowJustification(false);
        setPendingRank(null);
        prevRankRef.current = null;
        
        // Force immediate refresh of ALL relevant queries - use resetQueries for guaranteed fresh data
        await queryClient.resetQueries({ queryKey: ['business-request', requestId] });
        await queryClient.resetQueries({ queryKey: ['business-requests'] });
        await queryClient.resetQueries({ queryKey: ['all-business-requests-for-rank'] });
        
        toast({ title: 'Rank updated', description: 'Switched to auto-calculated ranking.' });
      } catch (error) {
        console.error('Failed to switch to auto:', error);
        skipNextResetRef.current = false; // Reset flag on error
        toast({ title: 'Error', description: 'Failed to update rank.', variant: 'destructive' });
      } finally {
        setIsSavingRank(false);
      }
    }
  };

  const handleSaveJustificationAndRank = async () => {
    if (!justification.trim()) {
      toast({ 
        title: 'Justification Required', 
        description: 'Please provide a business justification for the rank override.', 
        variant: 'destructive' 
      });
      return;
    }

    if (pendingRank === null) {
      toast({ title: 'Error', description: 'No rank selected.', variant: 'destructive' });
      return;
    }
    
    const oldRank = prevRankRef.current;
    
    // Persist to database
    if (requestId) {
      setIsSavingRank(true);
      skipNextResetRef.current = true; // Prevent useEffect from resetting state
      try {
        const { error: updateError } = await supabase
          .from('business_requests')
          .update({ 
            rank: pendingRank, 
            is_force_ranked: true,
            rank_override_justification: justification.trim(),
            force_ranked_by: null, // Will be set by context if needed
            force_ranked_at: new Date().toISOString()
          })
          .eq('id', requestId);
        
        if (updateError) {
          console.error('Database update error:', updateError);
          throw updateError;
        }
        
        // Log the change
        await logRankChange(oldRank, pendingRank, false, justification.trim());
        
        // Update local state via parent
        onChange('rank', pendingRank);
        onChange('is_force_ranked', true);
        onChange('rank_override_justification', justification.trim());
        
        prevRankRef.current = pendingRank;
        // DO NOT clear pendingRank here - keep showing the saved value until data confirms
        // The useEffect will handle state once data is confirmed
        
        // Force immediate refresh of ALL relevant queries - use resetQueries for guaranteed fresh data
        await queryClient.resetQueries({ queryKey: ['business-request', requestId] });
        await queryClient.resetQueries({ queryKey: ['business-requests'] });
        await queryClient.resetQueries({ queryKey: ['all-business-requests-for-rank'] });
        
        toast({ 
          title: 'Rank saved', 
          description: `Manual rank #${pendingRank} applied with justification.` 
        });
      } catch (error) {
        console.error('Failed to save rank:', error);
        skipNextResetRef.current = false; // Reset flag on error
        toast({ title: 'Error', description: 'Failed to save rank.', variant: 'destructive' });
      } finally {
        setIsSavingRank(false);
      }
    }
  };

  const handleCancelRankChange = () => {
    // Revert to original state - don't persist anything
    setPendingRank(null);
    setShowJustification(isForceRanked && !!data.rank_override_justification);
    setJustification(data.rank_override_justification || '');
  };

  // Force rank is only enabled if scoring is complete (inputs auto-save, so no need to check unsaved)
  const forceRankEnabled = isScoringComplete || isForceRanked;

  // Determine the display value for the select
  const selectDisplayValue = pendingRank !== null ? String(pendingRank) : (isForceRanked ? String(data.rank) : 'auto');

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
                  disabled={isForceRanked || isSavingRank}
                >
                  <SelectTrigger className={cn("mt-1.5 h-8 text-sm", (isForceRanked || isSavingRank) && "opacity-50 bg-muted")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-[200]">
                    {SCORE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={cn(
                "w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold text-sm shrink-0 bg-transparent",
                (isForceRanked || isSavingRank) ? "border-muted-foreground/30 text-muted-foreground" : getScoreColor(executiveUrgency * 10)
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
                  disabled={isForceRanked || isSavingRank}
                >
                  <SelectTrigger className={cn("mt-1.5 h-8 text-sm", (isForceRanked || isSavingRank) && "opacity-50 bg-muted")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-[200]">
                    {SCORE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={cn(
                "w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold text-sm shrink-0 bg-transparent",
                (isForceRanked || isSavingRank) ? "border-muted-foreground/30 text-muted-foreground" : getScoreColor(businessValue * 10)
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
                  disabled={isForceRanked || isSavingRank}
                >
                  <SelectTrigger className={cn("mt-1.5 h-8 text-sm", (isForceRanked || isSavingRank) && "opacity-50 bg-muted")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-[200]">
                    {SCORE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={cn(
                "w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold text-sm shrink-0 bg-transparent",
                (isForceRanked || isSavingRank) ? "border-muted-foreground/30 text-muted-foreground" : getScoreColor((1 - complexity / 10) * 100)
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
                    {isForceRanked && <Lock className="h-3 w-3 text-muted-foreground" />}
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand-gold">
                      Force Rank
                    </h3>
                  </div>
                  <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Reserved</span>
                </div>
                <div className="flex items-center gap-2" onClick={!forceRankEnabled ? handleForceRankClick : undefined}>
                  <Select
                    value={selectDisplayValue}
                    onValueChange={handleRankChange}
                    disabled={!forceRankEnabled || isSavingRank}
                  >
                    <SelectTrigger className={cn("h-8 text-sm", !forceRankEnabled && "opacity-50 cursor-not-allowed")}>
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-[200]">
                      <SelectItem value="auto">Auto</SelectItem>
                      {RANK_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={String(opt)}>#{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(isForceRanked || pendingRank !== null) && (
                    <span className="text-sm font-semibold text-brand-gold">
                      #{pendingRank ?? data.rank}
                    </span>
                  )}
                </div>
                {!forceRankEnabled && !isForceRanked && (
                  <p className="text-[9px] text-muted-foreground mt-1.5 italic">
                    Complete all inputs to enable
                  </p>
                )}

                {/* Justification Panel - Shows when pending rank or already force ranked */}
                {showJustification && (
                  <div className="mt-3 p-3 bg-amber-50/50 rounded-md border border-amber-200/50 space-y-2">
                    <Label className="text-xs font-medium text-foreground">
                      Business Justification for Rank Override
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Textarea
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      placeholder="Provide business justification for overriding the auto-calculated rank..."
                      className="min-h-[80px] text-sm resize-none"
                      disabled={isSavingRank || (isForceRanked && pendingRank === null)}
                    />
                    {pendingRank !== null && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={handleSaveJustificationAndRank}
                          disabled={isSavingRank}
                          className="h-7 px-3 text-xs bg-brand-gold hover:bg-brand-gold-hover text-white"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          {isSavingRank ? 'Saving...' : 'Save Rank'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelRankChange}
                          disabled={isSavingRank}
                          className="h-7 px-3 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                    {pendingRank === null && isForceRanked && (
                      <p className="text-[10px] text-muted-foreground italic">
                        Current justification saved. Select a new rank to modify.
                      </p>
                    )}
                  </div>
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
            <div className="flex justify-center">
              {isForceRanked ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border border-brand-gold/30 bg-brand-gold/10 text-brand-gold">
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
          </CardContent>
        </Card>
      </div>

      {/* Score Breakdown Details */}
      <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <Card className="border border-border/50 rounded-lg bg-card">
          <CollapsibleTrigger asChild>
            <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand-gold">
                  Score Breakdown
                </h3>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  isDetailsOpen && "rotate-180"
                )} />
              </div>
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 px-4 pb-4 border-t border-border/30">
              <div className="space-y-3 pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Business Value (45%)</span>
                  <span className="font-medium">
                    {isScoringComplete ? `${Math.round((businessValue / 10) * 45)}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Executive Urgency (35%)</span>
                  <span className="font-medium">
                    {isScoringComplete ? `${Math.round((executiveUrgency / 10) * 35)}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Simplicity Factor (20%)</span>
                  <span className="font-medium">
                    {isScoringComplete ? `${Math.round(((10 - complexity) / 10) * 20)}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-border/30">
                  <span className="font-medium text-foreground">Total Score</span>
                  <span className="font-bold text-brand-gold">
                    {isScoringComplete ? businessScore : '—'}
                  </span>
                </div>

                {/* Score Thresholds */}
                <div className="pt-3 mt-3 border-t border-border/30">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Score Thresholds
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">Must-Do Now</span>
                      <span className="text-muted-foreground">90–100</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-700">High</span>
                      <span className="text-muted-foreground">75–89</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-amber-700">Medium</span>
                      <span className="text-muted-foreground">60–74</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-orange-700">Low</span>
                      <span className="text-muted-foreground">40–59</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-700">Backlog / Parked</span>
                      <span className="text-muted-foreground">0–39</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
