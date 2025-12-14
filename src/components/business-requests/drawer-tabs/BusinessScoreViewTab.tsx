import { useMemo, useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Lock, Save, AlertCircle, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BusinessRequest } from '@/types/business-request';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  usePrioritizationConfig, 
  calculatePriorityScore, 
  getPriorityTier, 
  getTierDisplayInfo,
  getScoreBadgeColor,
  PriorityTier,
  PrioritizationConfig
} from '@/hooks/usePrioritizationConfig';

// Helper function to generate deterministic "Why this priority?" bullets
function generateWhyBullets(
  draftScores: Record<string, number | null>,
  config: PrioritizationConfig,
  tier: PriorityTier
): string[] {
  if (tier === 'unscored') {
    return ['This request is Unscored until all four criteria are saved.'];
  }

  const bullets: string[] = [];
  const criteria = [
    { key: 'score_strategic_alignment', label: 'Strategic Alignment', weight: config.weight_strategic_alignment },
    { key: 'score_business_impact', label: 'Business Impact', weight: config.weight_business_impact },
    { key: 'score_time_urgency', label: 'Time & Urgency', weight: config.weight_time_urgency },
    { key: 'score_resource_feasibility', label: 'Resource & Feasibility', weight: config.weight_resource_feasibility },
  ];

  // Calculate contributions
  const contributions = criteria.map(c => ({
    ...c,
    rating: draftScores[c.key] ?? 0,
    contribution: ((c.weight * (draftScores[c.key] ?? 0)) / 100),
  })).sort((a, b) => b.contribution - a.contribution);

  // Top 2 drivers
  const top2 = contributions.slice(0, 2);
  if (top2.length === 2) {
    bullets.push(`Strongest drivers: ${top2[0].label} and ${top2[1].label} contributed most to the score.`);
  }

  // Blockers (rating <= 2)
  const blockers = contributions
    .filter(c => c.rating !== null && c.rating <= 2)
    .sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
  
  blockers.slice(0, 2).forEach(blocker => {
    bullets.push(`Key blocker: ${blocker.label} rated ${blocker.rating}/5.`);
  });

  // Tier-specific closing
  switch (tier) {
    case 'rejected':
      bullets.push('Total score is below 2.0, so it is classified as Rejected Priority.');
      break;
    case 'high':
      bullets.push('Total score is 4.0 or above, so it is classified as High Priority.');
      break;
    case 'medium':
      bullets.push('Total score is between 3.0 and 4.0, so it is classified as Medium Priority.');
      break;
    case 'low':
      bullets.push('Total score is between 2.0 and 3.0, so it is classified as Low Priority.');
      break;
  }

  return bullets;
}

// Score options 1-5 (new model)
const SCORE_OPTIONS = [
  { value: 'unset', label: '—' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
];

// Rank options 1-12
const RANK_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

// Scoring criteria definition
const SCORING_CRITERIA = [
  { 
    key: 'score_strategic_alignment', 
    label: 'Strategic Alignment',
    helper: 'How well does this align with organizational strategy?'
  },
  { 
    key: 'score_business_impact', 
    label: 'Business Impact',
    helper: 'Expected impact on business outcomes'
  },
  { 
    key: 'score_time_urgency', 
    label: 'Time & Urgency',
    helper: 'Time sensitivity and deadline requirements'
  },
  { 
    key: 'score_resource_feasibility', 
    label: 'Resource & Feasibility',
    helper: 'Resource availability and technical feasibility'
  },
];

interface BusinessScoreViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  requestId?: string;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function BusinessScoreViewTab({ data, onChange, requestId, onDirtyChange }: BusinessScoreViewTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: config, isLoading: configLoading } = usePrioritizationConfig();
  
  const isForceRanked = data.is_force_ranked === true && data.rank !== null && data.rank !== undefined;
  
  // Draft scores (local state before saving)
  const [draftScores, setDraftScores] = useState({
    score_strategic_alignment: data.score_strategic_alignment ?? null,
    score_business_impact: data.business_value ?? null, // Repurposed field
    score_time_urgency: data.score_time_urgency ?? null,
    score_resource_feasibility: data.score_resource_feasibility ?? null,
  });
  
  // Store original saved scores for rescoring cancel
  const [savedScoresSnapshot, setSavedScoresSnapshot] = useState({
    score_strategic_alignment: data.score_strategic_alignment ?? null,
    score_business_impact: data.business_value ?? null,
    score_time_urgency: data.score_time_urgency ?? null,
    score_resource_feasibility: data.score_resource_feasibility ?? null,
  });
  
  const [justification, setJustification] = useState(data.rank_override_justification || '');
  const [showJustification, setShowJustification] = useState(false);
  const [pendingRank, setPendingRank] = useState<number | null>(null);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [isOverrideOpen, setIsOverrideOpen] = useState(isForceRanked);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingRank, setIsSavingRank] = useState(false);
  const [isRescoringMode, setIsRescoringMode] = useState(false);
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

  // Fetch all scored requests for rank position
  const { data: allRequests } = useQuery({
    queryKey: ['all-business-requests-for-rank'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('id, business_score, is_force_ranked, rank, priority_tier')
        .is('deleted_at', null)
        .not('priority_tier', 'is', null)
        .neq('priority_tier', 'unscored')
        .order('business_score', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const canAccessForcedRank = useMemo(() => {
    if (!userRole) return false;
    return userRole.includes('admin') || userRole.includes('program_manager');
  }, [userRole]);

  // Check if all draft scores are filled
  const isScoringComplete = useMemo(() => {
    return (
      draftScores.score_strategic_alignment !== null &&
      draftScores.score_business_impact !== null &&
      draftScores.score_time_urgency !== null &&
      draftScores.score_resource_feasibility !== null
    );
  }, [draftScores]);

  // Calculate draft score (preview only, not saved yet)
  const draftPriorityScore = useMemo(() => {
    if (!config || !isScoringComplete) return null;
    return calculatePriorityScore({
      strategic_alignment: draftScores.score_strategic_alignment,
      business_impact: draftScores.score_business_impact,
      time_urgency: draftScores.score_time_urgency,
      resource_feasibility: draftScores.score_resource_feasibility,
    }, config);
  }, [draftScores, config, isScoringComplete]);

  // Saved score from data
  const savedPriorityScore = useMemo(() => {
    return data.business_score ? data.business_score / 100 * 5 : null; // Convert from 0-100 to 1-5 scale if needed
  }, [data.business_score]);

  // Get tier based on SAVED score only
  const savedTier = useMemo<PriorityTier>(() => {
    if (!config || !data.priority_tier) return 'unscored';
    return data.priority_tier as PriorityTier;
  }, [config, data.priority_tier]);

  // Calculate rank position among scored items
  const rankPosition = useMemo(() => {
    if (!allRequests || allRequests.length === 0 || !requestId) return null;
    if (savedTier === 'unscored') return null;
    
    const position = allRequests.findIndex(r => r.id === requestId);
    return position >= 0 ? position + 1 : null;
  }, [allRequests, requestId, savedTier]);

  const totalScoredItems = allRequests?.length || 0;

  // Rescoring mode state
  const hasSavedScore = savedTier !== 'unscored';
  const isOnHold = data.process_step === 'on_hold';
  const showRescoringBanner = (hasSavedScore || isOnHold) && !isRescoringMode;
  
  // Get tier info for display
  const tierInfo = getTierDisplayInfo(savedTier);
  
  // Generate "Why this priority?" bullets based on SAVED scores
  const whyBullets = useMemo(() => {
    if (!config) return [];
    // Use SAVED scores (from data), not draft scores
    const savedScoresForBullets = {
      score_strategic_alignment: data.score_strategic_alignment ?? null,
      score_business_impact: data.business_value ?? null,
      score_time_urgency: data.score_time_urgency ?? null,
      score_resource_feasibility: data.score_resource_feasibility ?? null,
    };
    return generateWhyBullets(savedScoresForBullets, config, savedTier);
  }, [config, data.score_strategic_alignment, data.business_value, data.score_time_urgency, data.score_resource_feasibility, savedTier]);

  // Sync draft scores when data changes
  useEffect(() => {
    if (!skipNextResetRef.current) {
      setDraftScores({
        score_strategic_alignment: data.score_strategic_alignment ?? null,
        score_business_impact: data.business_value ?? null,
        score_time_urgency: data.score_time_urgency ?? null,
        score_resource_feasibility: data.score_resource_feasibility ?? null,
      });
      setJustification(data.rank_override_justification || '');
      setShowJustification(data.is_force_ranked === true && !!data.rank_override_justification);
      setPendingRank(null);
      originalRankRef.current = data.rank;
      originalIsForceRankedRef.current = data.is_force_ranked === true;
      prevRankRef.current = data.rank;
    }
    skipNextResetRef.current = false;
  }, [data.score_strategic_alignment, data.business_value, data.score_time_urgency, data.score_resource_feasibility, data.rank, data.is_force_ranked, data.rank_override_justification]);

  const handleDraftScoreChange = (key: string, value: string) => {
    const numValue = value === 'unset' ? null : parseInt(value);
    setDraftScores(prev => ({ ...prev, [key]: numValue }));
    onDirtyChange?.(true);
  };

  const handleSaveScore = async () => {
    if (!requestId || !config) return;
    if (!isScoringComplete) {
      toast({
        title: 'Incomplete Scores',
        description: 'Please provide ratings for all four criteria before saving.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const priorityScore = calculatePriorityScore({
        strategic_alignment: draftScores.score_strategic_alignment,
        business_impact: draftScores.score_business_impact,
        time_urgency: draftScores.score_time_urgency,
        resource_feasibility: draftScores.score_resource_feasibility,
      }, config);

      const tier = getPriorityTier(priorityScore, config);

      // Prepare update data
      const updateData: Record<string, any> = {
        score_strategic_alignment: draftScores.score_strategic_alignment,
        business_value: draftScores.score_business_impact, // Repurposed field
        score_time_urgency: draftScores.score_time_urgency,
        score_resource_feasibility: draftScores.score_resource_feasibility,
        business_score: priorityScore ? Math.round(priorityScore * 100) : null, // Store as 0-500 for compatibility
        priority_tier: tier,
      };

      // If tier is 'rejected', auto-set status to Hold
      if (tier === 'rejected') {
        updateData.process_step = 'on_hold';
      }

      const { error } = await supabase
        .from('business_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // Update local state
      onChange('score_strategic_alignment', draftScores.score_strategic_alignment);
      onChange('business_value', draftScores.score_business_impact);
      onChange('score_time_urgency', draftScores.score_time_urgency);
      onChange('score_resource_feasibility', draftScores.score_resource_feasibility);
      onChange('business_score', priorityScore ? Math.round(priorityScore * 100) : null);
      onChange('priority_tier', tier);

      if (tier === 'rejected') {
        onChange('process_step', 'on_hold');
      }

      // Log audit entry
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      await supabase.from('business_request_audit_logs').insert({
        business_request_id: requestId,
        actor_id: user?.id,
        actor_name: profile?.full_name || user?.email || 'Unknown User',
        action: 'SCORE_SAVED',
        field_changed: 'Business Score',
        old_value: data.business_score ? String(data.business_score / 100) : 'None',
        new_value: `${priorityScore?.toFixed(2)} (Tier: ${tier.charAt(0).toUpperCase() + tier.slice(1)})`,
      });

      if (tier === 'rejected') {
        await supabase.from('business_request_audit_logs').insert({
          business_request_id: requestId,
          actor_id: user?.id,
          actor_name: profile?.full_name || user?.email || 'Unknown User',
          action: 'STATUS_AUTO_CHANGED',
          field_changed: 'Process Step',
          old_value: data.process_step || 'Unknown',
          new_value: 'Status automatically set to Hold (Rejected tier)',
        });
      }

      skipNextResetRef.current = true;
      await queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['all-business-requests-for-rank'] });
      await queryClient.invalidateQueries({ queryKey: ['business-request', requestId] });

      // If we were in rescoring mode and tier improved from rejected, show hint
      const previousTier = data.priority_tier as PriorityTier;
      const tierImproved = previousTier === 'rejected' && tier !== 'rejected';
      
      toast({
        title: 'Score Saved',
        description: tierImproved 
          ? `Priority Score: ${priorityScore?.toFixed(2)} (${tier.charAt(0).toUpperCase() + tier.slice(1)}). Priority updated. Status remains On Hold—update status if needed.`
          : `Priority Score: ${priorityScore?.toFixed(2)} (${tier.charAt(0).toUpperCase() + tier.slice(1)})`,
      });
      
      // Exit rescoring mode
      setIsRescoringMode(false);
      // Update saved scores snapshot
      setSavedScoresSnapshot({
        score_strategic_alignment: draftScores.score_strategic_alignment,
        score_business_impact: draftScores.score_business_impact,
        score_time_urgency: draftScores.score_time_urgency,
        score_resource_feasibility: draftScores.score_resource_feasibility,
      });
    } catch (error) {
      console.error('Failed to save score:', error);
      toast({
        title: 'Error',
        description: 'Failed to save score.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRankChange = (value: string) => {
    if (!isScoringComplete && value !== 'auto') {
      toast({
        title: 'Scoring Required',
        description: 'Complete scoring inputs before applying rank override.',
        variant: 'destructive',
      });
      return;
    }
    
    if (value === 'auto') {
      handleSwitchToAuto();
    } else {
      const newRank = parseInt(value);
      setPendingRank(newRank);
      setShowJustification(true);
      setJustification('');
    }
  };

  const handleSwitchToAuto = async () => {
    const oldRank = prevRankRef.current;
    
    if (requestId) {
      setIsSavingRank(true);
      skipNextResetRef.current = true;
      try {
        await supabase
          .from('business_requests')
          .update({ 
            rank: null, 
            is_force_ranked: false,
            rank_override_justification: null,
            force_ranked_by: null,
            force_ranked_at: null
          })
          .eq('id', requestId);
        
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user?.id)
          .single();

        await supabase.from('business_request_audit_logs').insert({
          business_request_id: requestId,
          actor_id: user?.id,
          actor_name: profile?.full_name || user?.email || 'Unknown User',
          action: 'RANK_OVERRIDE',
          field_changed: 'Forced Rank',
          old_value: oldRank ? `Rank ${oldRank}` : 'Auto',
          new_value: 'Rank override removed, set to Auto',
        });
        
        onChange('rank', null);
        onChange('is_force_ranked', false);
        onChange('rank_override_justification', null);
        
        setShowJustification(false);
        setPendingRank(null);
        prevRankRef.current = null;
        
        await queryClient.invalidateQueries({ queryKey: ['business-requests'] });
        await queryClient.invalidateQueries({ queryKey: ['all-business-requests-for-rank'] });
        
        toast({ title: 'Rank updated', description: 'Switched to auto-calculated ranking.' });
      } catch (error) {
        console.error('Failed to switch to auto:', error);
        skipNextResetRef.current = false;
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
    
    if (requestId) {
      setIsSavingRank(true);
      skipNextResetRef.current = true;
      try {
        await supabase
          .from('business_requests')
          .update({ 
            rank: pendingRank, 
            is_force_ranked: true,
            rank_override_justification: justification.trim(),
            force_ranked_at: new Date().toISOString()
          })
          .eq('id', requestId);
        
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user?.id)
          .single();

        await supabase.from('business_request_audit_logs').insert({
          business_request_id: requestId,
          actor_id: user?.id,
          actor_name: profile?.full_name || user?.email || 'Unknown User',
          action: 'RANK_OVERRIDE',
          field_changed: 'Forced Rank',
          old_value: oldRank ? `Rank ${oldRank}` : 'Auto',
          new_value: `Rank overridden to #${pendingRank} (justification saved)`,
        });
        
        onChange('rank', pendingRank);
        onChange('is_force_ranked', true);
        onChange('rank_override_justification', justification.trim());
        
        prevRankRef.current = pendingRank;
        
        await queryClient.invalidateQueries({ queryKey: ['business-requests'] });
        await queryClient.invalidateQueries({ queryKey: ['all-business-requests-for-rank'] });
        
        toast({ 
          title: 'Rank saved', 
          description: `Manual rank #${pendingRank} applied with justification.` 
        });
      } catch (error) {
        console.error('Failed to save rank:', error);
        skipNextResetRef.current = false;
        toast({ title: 'Error', description: 'Failed to save rank.', variant: 'destructive' });
      } finally {
        setIsSavingRank(false);
      }
    }
  };

  const handleCancelRankChange = () => {
    setPendingRank(null);
    setShowJustification(isForceRanked && !!data.rank_override_justification);
    setJustification(data.rank_override_justification || '');
  };

  const forceRankEnabled = savedTier !== 'unscored' || isForceRanked;
  const selectDisplayValue = pendingRank !== null ? String(pendingRank) : (isForceRanked ? String(data.rank) : 'auto');

  if (configLoading) {
    return <div className="p-5 text-center text-muted-foreground">Loading configuration...</div>;
  }

  // Rescoring handlers
  const handleEnterRescoringMode = () => {
    // Snapshot current saved scores before entering rescoring mode
    setSavedScoresSnapshot({
      score_strategic_alignment: data.score_strategic_alignment ?? null,
      score_business_impact: data.business_value ?? null,
      score_time_urgency: data.score_time_urgency ?? null,
      score_resource_feasibility: data.score_resource_feasibility ?? null,
    });
    setIsRescoringMode(true);
  };

  const handleCancelRescoring = () => {
    // Revert draft scores to last saved
    setDraftScores(savedScoresSnapshot);
    setIsRescoringMode(false);
  };

  return (
    <div className="space-y-5 p-5">
      {/* Rescoring Banner */}
      {showRescoringBanner && (
        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              {isOnHold 
                ? "This request is currently On Hold. If circumstances changed, you can rescore it."
                : "This request has been previously scored. If circumstances changed, you can rescore it."}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnterRescoringMode}
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Rescore
          </Button>
        </div>
      )}
      
      {/* Rescoring Mode Active Banner */}
      {isRescoringMode && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Rescoring mode active. Modify scores and click Save Score, or cancel to revert.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancelRescoring}
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Cancel
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5">
        {/* Left Card - Scoring Criteria */}
        <Card className="border border-border/50 rounded-lg bg-card">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-secondary-bronze">
              Scoring Criteria (1–5 Scale)
            </h3>
          </div>
          <CardContent className="p-5 space-y-4">
            {SCORING_CRITERIA.map((criterion) => {
              const fieldKey = criterion.key === 'score_business_impact' ? 'score_business_impact' : criterion.key;
              const value = draftScores[fieldKey as keyof typeof draftScores];
              
              return (
                <div key={criterion.key} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                  <div className="flex-1">
                    <Label className="text-sm font-medium text-foreground">{criterion.label}</Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{criterion.helper}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select
                      value={value !== null ? String(value) : 'unset'}
                      onValueChange={(v) => handleDraftScoreChange(fieldKey, v)}
                      disabled={isForceRanked || isSaving}
                    >
                      <SelectTrigger className={cn("w-20 h-8 text-sm", (isForceRanked || isSaving) && "opacity-50 bg-muted")}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-[400]">
                        {SCORE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm",
                      getScoreBadgeColor(value)
                    )}>
                      {value ?? '—'}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Save Score Button */}
            <div className="pt-4 border-t border-border">
              <Button
                onClick={handleSaveScore}
                disabled={!isScoringComplete || isSaving || isForceRanked}
                className="w-full bg-brand-gold hover:bg-brand-gold-hover text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Score'}
              </Button>
              {isForceRanked && (
                <p className="text-[10px] text-amber-600 italic mt-2 text-center">
                  Scoring locked while manually ranked.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Card - Score Results */}
        <Card className="border border-border/50 rounded-lg bg-card">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-secondary-bronze">
              Business Score
            </h3>
          </div>
          <CardContent className="p-5 space-y-4">
            {/* Big Score Display */}
            <div className="text-center py-4">
              {savedTier !== 'unscored' ? (
                <>
                  <div className="text-5xl font-bold text-foreground leading-none">
                    {data.business_score ? (data.business_score / 100).toFixed(2) : '—'}
                  </div>
                  <div className={cn(
                    "inline-flex px-4 py-1.5 rounded-full text-xs font-semibold uppercase mt-3 border",
                    tierInfo.bgColor,
                    tierInfo.color
                  )}>
                    {tierInfo.label} Priority
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    Rank <span className="font-semibold text-brand-gold">#{rankPosition || '—'}</span> of {totalScoredItems}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl font-bold text-muted-foreground/40 leading-none">—</div>
                  <div className="inline-flex px-4 py-1.5 rounded-full text-xs font-semibold uppercase mt-3 border bg-muted text-muted-foreground border-border">
                    Unscored
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-3 italic">
                    Complete all criteria and save to calculate score
                  </p>
                </>
              )}
            </div>

            {/* Score Summary */}
            <div className="pt-3 border-t border-border/40">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary-bronze mb-2">
                Score Summary
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
                {savedTier !== 'unscored' ? (
                  <>
                    <li>Score: {data.business_score ? (data.business_score / 100).toFixed(2) : '—'} out of 5.00</li>
                    <li>Priority Tier: {tierInfo.label}</li>
                    <li>Calculated from 4 weighted criteria</li>
                  </>
                ) : (
                  <li className="italic">Complete all criteria and save to see summary</li>
                )}
              </ul>
            </div>

            {/* Why this priority? */}
            <div className="pt-3 border-t border-border/40">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary-bronze mb-2">
                Why this priority?
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
                {whyBullets.map((bullet, idx) => (
                  <li key={idx}>{bullet}</li>
                ))}
              </ul>
            </div>

            {/* Override Rank Section */}
            {canAccessForcedRank && (
              <Collapsible open={isOverrideOpen} onOpenChange={setIsOverrideOpen}>
                <div className="pt-3 border-t border-border/40">
                  <CollapsibleTrigger className="flex items-center justify-between w-full group">
                    <div className="flex items-center gap-1.5">
                      {isForceRanked && <Lock className="h-3 w-3 text-brand-gold" />}
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary-bronze">
                        Override Rank
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3 space-y-3">
                    <Select
                      value={selectDisplayValue}
                      onValueChange={handleRankChange}
                      disabled={!forceRankEnabled || isSavingRank}
                    >
                      <SelectTrigger className={cn("h-8 text-sm", !forceRankEnabled && "opacity-50 cursor-not-allowed")}>
                        <SelectValue placeholder="Auto" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg z-[400]">
                        <SelectItem value="auto">Auto</SelectItem>
                        {RANK_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={String(opt)}>#{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {showJustification && (
                      <div className="p-3 bg-amber-50/50 rounded-md border border-amber-200/50 space-y-2">
                        <Label className="text-xs font-medium text-foreground">
                          Business Justification
                          <span className="text-destructive ml-1">*</span>
                        </Label>
                        <Textarea
                          value={justification}
                          onChange={(e) => setJustification(e.target.value)}
                          placeholder="Provide business justification for overriding the auto-calculated rank..."
                          className="min-h-[70px] text-sm resize-none"
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
                        {!justification.trim() && pendingRank !== null && (
                          <div className="p-2 rounded-md bg-red-50 border border-red-200">
                            <p className="text-[11px] font-medium text-red-700">Justification Required</p>
                            <p className="text-[10px] text-red-600 mt-0.5">Please provide a business justification for the rank override.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}

            {/* Score Breakdown Collapsible */}
            <Collapsible open={isBreakdownOpen} onOpenChange={setIsBreakdownOpen}>
              <div className="pt-3 border-t border-border/40">
                <CollapsibleTrigger className="flex items-center justify-between w-full group">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary-bronze">
                    Score Breakdown
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-semibold text-secondary-bronze uppercase">Criterion</th>
                        <th className="text-center py-2 font-semibold text-secondary-bronze uppercase">Weight</th>
                        <th className="text-center py-2 font-semibold text-secondary-bronze uppercase">Rating</th>
                        <th className="text-right py-2 font-semibold text-secondary-bronze uppercase">Contrib</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SCORING_CRITERIA.map((criterion) => {
                        const fieldKey = criterion.key === 'score_business_impact' ? 'score_business_impact' : criterion.key;
                        const rating = draftScores[fieldKey as keyof typeof draftScores];
                        const weight = config ? {
                          'score_strategic_alignment': config.weight_strategic_alignment,
                          'score_business_impact': config.weight_business_impact,
                          'score_time_urgency': config.weight_time_urgency,
                          'score_resource_feasibility': config.weight_resource_feasibility,
                        }[fieldKey] || 0 : 0;
                        const contrib = rating !== null ? ((weight * rating) / 100).toFixed(2) : '—';
                        
                        return (
                          <tr key={criterion.key} className="border-b border-border last:border-b-0">
                            <td className="py-2 text-foreground">{criterion.label}</td>
                            <td className="py-2 text-center text-muted-foreground">{weight}%</td>
                            <td className="py-2 text-center">{rating ?? '—'}</td>
                            <td className="py-2 text-right font-medium">{contrib}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-muted/30">
                        <td className="py-2 font-semibold text-foreground">Total</td>
                        <td className="py-2 text-center text-muted-foreground">100%</td>
                        <td className="py-2 text-center">—</td>
                        <td className="py-2 text-right font-bold text-brand-gold">
                          {draftPriorityScore?.toFixed(2) ?? '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Threshold Legend */}
            <div className="pt-3 border-t border-border/40">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-secondary-bronze mb-2">
                Threshold Legend
              </p>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span>Rejected: 1.0 – &lt;2.0</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>Medium: 3.0 – &lt;4.0</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span>Low: 2.0 – &lt;3.0</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span>High: 4.0 – 5.0</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
