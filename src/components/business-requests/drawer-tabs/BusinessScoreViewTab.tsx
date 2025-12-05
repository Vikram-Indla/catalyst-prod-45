import { useMemo, useState, useEffect } from 'react';
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

// Rank options 1-20 plus Auto
const RANK_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

// Get rank label based on score
const getRankLabel = (score: number): { label: string; color: string } => {
  if (score >= 90) return { label: 'Must-Do Now', color: 'text-green-600 bg-green-100' };
  if (score >= 75) return { label: 'High', color: 'text-emerald-600 bg-emerald-100' };
  if (score >= 60) return { label: 'Medium', color: 'text-amber-600 bg-amber-100' };
  if (score >= 40) return { label: 'Low', color: 'text-orange-600 bg-orange-100' };
  return { label: 'Backlog / Parked', color: 'text-red-600 bg-red-100' };
};

// Get score circle color
const getScoreColor = (score: number): string => {
  if (score >= 70) return 'border-green-500 text-green-600';
  if (score >= 40) return 'border-amber-500 text-amber-600';
  return 'border-red-500 text-red-600';
};

interface BusinessScoreViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  requestId?: string;
}

export function BusinessScoreViewTab({ data, onChange, requestId }: BusinessScoreViewTabProps) {
  const { toast } = useToast();
  const executiveUrgency = data.executive_urgency ?? 0;
  const businessValue = data.business_value ?? 0;
  const complexity = data.complexity_score ?? 0;

  // Local state
  const [justification, setJustification] = useState(data.rank_override_justification || '');
  const [showJustification, setShowJustification] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [previousRank, setPreviousRank] = useState<number | null>(data.rank);

  // Check user role for forced rank access
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

  // Check if user can access forced rank (Admin or Program Manager)
  const canAccessForcedRank = useMemo(() => {
    if (!userRole) return false;
    return userRole.includes('admin') || userRole.includes('program_manager');
  }, [userRole]);

  // Calculate normalized values
  const normalizedUrgency = executiveUrgency / 10;
  const normalizedBusinessValue = businessValue / 10;
  const normalizedSimplicity = (10 - complexity) / 10;

  // Calculate business score
  const businessScore = useMemo(() => {
    return Math.round(
      (0.45 * normalizedBusinessValue + 0.35 * normalizedUrgency + 0.20 * normalizedSimplicity) * 100
    );
  }, [normalizedBusinessValue, normalizedUrgency, normalizedSimplicity]);

  const rankInfo = getRankLabel(businessScore);

  // Check if forced rank is set (not Auto)
  const isForceRanked = data.is_force_ranked === true && data.rank !== null && data.rank !== undefined;
  const displayRank = isForceRanked ? data.rank : null;

  // Show justification when forced rank is set
  useEffect(() => {
    setShowJustification(isForceRanked);
  }, [isForceRanked]);

  // Update justification from data
  useEffect(() => {
    setJustification(data.rank_override_justification || '');
  }, [data.rank_override_justification]);

  // Calculate and save business score when inputs change
  const handleInputChange = (field: string, value: number) => {
    onChange(field, value);
    
    let newUrgency = executiveUrgency;
    let newBusinessValue = businessValue;
    let newComplexity = complexity;
    
    if (field === 'executive_urgency') newUrgency = value;
    if (field === 'business_value') newBusinessValue = value;
    if (field === 'complexity_score') newComplexity = value;
    
    const normalizedUrg = newUrgency / 10;
    const normalizedBV = newBusinessValue / 10;
    const normalizedSimp = (10 - newComplexity) / 10;
    
    const newScore = Math.round(
      (0.45 * normalizedBV + 0.35 * normalizedUrg + 0.20 * normalizedSimp) * 100
    );
    
    onChange('business_score', newScore);
  };

  // Log rank change to audit history
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
        action: 'UPDATE',
        field_changed: 'Forced Rank',
        old_value: oldValue,
        new_value: newValue,
      });
    } catch (error) {
      console.error('Failed to log rank change:', error);
    }
  };

  const handleRankChange = async (value: string) => {
    const oldRank = data.rank;
    
    if (value === 'auto') {
      // Set to Auto mode
      onChange('rank', null);
      onChange('is_force_ranked', false);
      setShowJustification(false);
      
      await logRankChange(oldRank, null, true);
      
      toast({
        title: 'Rank Reset to Auto',
        description: 'The rank will now be calculated automatically based on business score.',
      });
    } else {
      const newRank = parseInt(value);
      onChange('rank', newRank);
      onChange('is_force_ranked', true);
      setShowJustification(true);
      
      await logRankChange(oldRank, newRank, false);
      
      toast({
        title: 'Forced Rank Applied',
        description: `Rank set to ${newRank}. Please provide business justification.`,
        variant: 'default',
      });
    }
  };

  const handleSaveJustification = async () => {
    onChange('rank_override_justification', justification);
    
    // Log justification to audit
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
          field_changed: 'Rank Override Justification',
          old_value: data.rank_override_justification || 'None',
          new_value: justification,
        });
      } catch (error) {
        console.error('Failed to log justification:', error);
      }
    }
    
    toast({
      title: 'Justification Saved',
      description: 'Your business justification has been saved.',
    });
  };

  return (
    <div className="space-y-6 p-5">
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - Inputs */}
        <Card className="border border-border/60 rounded-lg bg-card h-fit">
          <CardContent className="p-5 space-y-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">
              Inputs (0–10 Scale)
            </h3>

            {/* Executive Urgency */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-sm font-medium">1. Executive Urgency</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  (0 = no urgency, 10 = critical / time-sensitive)
                </p>
                <Select
                  value={String(executiveUrgency)}
                  onValueChange={(value) => handleInputChange('executive_urgency', parseInt(value))}
                >
                  <SelectTrigger className="mt-2 w-full h-9">
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
                "w-12 h-12 rounded-full border-[3px] flex items-center justify-center font-semibold text-base shrink-0",
                getScoreColor(executiveUrgency * 10)
              )}>
                {executiveUrgency}
              </div>
            </div>

            {/* Business Value */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-sm font-medium">2. Business Value</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  (0 = minimal value, 10 = very high strategic/business value)
                </p>
                <Select
                  value={String(businessValue)}
                  onValueChange={(value) => handleInputChange('business_value', parseInt(value))}
                >
                  <SelectTrigger className="mt-2 w-full h-9">
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
                "w-12 h-12 rounded-full border-[3px] flex items-center justify-center font-semibold text-base shrink-0",
                getScoreColor(businessValue * 10)
              )}>
                {businessValue}
              </div>
            </div>

            {/* Complexity */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-sm font-medium">3. Complexity</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  (0 = very simple to implement, 10 = very complex / resource-heavy)
                </p>
                <Select
                  value={String(complexity)}
                  onValueChange={(value) => handleInputChange('complexity_score', parseInt(value))}
                >
                  <SelectTrigger className="mt-2 w-full h-9">
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
                "w-12 h-12 rounded-full border-[3px] flex items-center justify-center font-semibold text-base shrink-0",
                getScoreColor(normalizedSimplicity * 100)
              )}>
                {complexity}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Results */}
        <Card className="border border-border/60 rounded-lg bg-card h-fit">
          <CardContent className="p-5 space-y-4">
            {/* Forced Rank - On Top (Role Protected) */}
            {canAccessForcedRank && (
              <div className="pb-4 border-b border-border/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold">
                      Forced Rank
                    </h3>
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Admin Only</span>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={isForceRanked ? String(data.rank) : 'auto'}
                    onValueChange={handleRankChange}
                  >
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Auto" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-lg z-50">
                      <SelectItem value="auto">
                        <span className="text-muted-foreground">Auto (disabled)</span>
                      </SelectItem>
                      {RANK_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={String(opt)}>
                          Rank {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className={cn(
                    "w-12 h-12 rounded-full border-[3px] flex items-center justify-center font-semibold text-base shrink-0",
                    isForceRanked 
                      ? "border-brand-gold text-brand-gold bg-brand-gold/5" 
                      : "border-muted-foreground/30 text-muted-foreground"
                  )}>
                    {isForceRanked ? displayRank : '—'}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  1 = Highest priority. Default: Auto (uses business score).
                </p>
              </div>
            )}

            {/* Business Score */}
            <div className="text-center pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-gold mb-3">
                Business Score (Auto-Calculated)
              </h3>
              <div className="text-5xl font-bold text-brand-gold leading-none">
                {businessScore}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">(Average: 60)</p>
            </div>

            {/* Rank Badge */}
            <div className="text-center py-2">
              <span className={cn(
                "inline-flex px-3 py-1.5 rounded-full text-xs font-semibold",
                rankInfo.color
              )}>
                Business Rank: {rankInfo.label}
              </span>
            </div>

            {/* Collapsible Thresholds & Info */}
            <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
              <CollapsibleTrigger className="w-full flex items-center justify-between py-2 px-3 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors">
                <span className="text-xs font-medium text-muted-foreground">
                  Score Details & Thresholds
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  isDetailsOpen && "rotate-180"
                )} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                {/* Thresholds */}
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-green-600 font-medium">90–100</span>
                    <span className="text-muted-foreground">→ Must-Do Now</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-600 font-medium">75–89</span>
                    <span className="text-muted-foreground">→ High</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-amber-600 font-medium">60–74</span>
                    <span className="text-muted-foreground">→ Medium</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-orange-600 font-medium">40–59</span>
                    <span className="text-muted-foreground">→ Low</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-600 font-medium">0–39</span>
                    <span className="text-muted-foreground">→ Backlog / Parked</span>
                  </div>
                </div>

                {/* Score Formula */}
                <div className="pt-2 border-t border-border/40">
                  <p className="text-[11px] font-medium text-foreground/80 mb-1.5">
                    This Business Score combines:
                  </p>
                  <div className="space-y-0.5 text-[11px] text-muted-foreground">
                    <p>• Business Value (45% weight)</p>
                    <p>• Executive Urgency (35% weight)</p>
                    <p>• Implementation Simplicity (20% weight)</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic">
                    Use it to compare and rank demands in your backlog.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      </div>

      {/* Justification Section - Full Width Below */}
      {canAccessForcedRank && showJustification && (
        <Card className="border border-amber-200 rounded-lg bg-amber-50/30">
          <CardContent className="p-4 space-y-3">
            <Label className="text-sm font-medium text-amber-800">
              Business Justification for Rank Override
            </Label>
            <p className="text-[11px] text-amber-700/80">
              Please provide a business justification for manually overriding the calculated rank. This will be logged in audit history.
            </p>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Enter your justification for this rank override..."
              className="min-h-[80px] resize-none text-sm bg-white"
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
