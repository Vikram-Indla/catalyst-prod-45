import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { X, ExternalLink, Grid3X3 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * WSJFScoringModal - Canonical WSJF Modal matching Jira Align exactly
 * Reference: WSJFWindow-2.png, CATALYST-WSJF-Lovable-Prompt.md
 * 
 * Structure:
 * - 5 tabs: Set Business Value | Set Time Value | Set RR/OE Value | Set Job Size | View Calculations
 * - Epic row with ID, title, external link, Fibonacci dropdown on right
 * - Component descriptions table below
 * - Dynamic title changes per tab
 */

interface WSJFScoringModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workItemId: string;
  workItemType: 'epic' | 'feature';
  workItemTitle: string;
  workItemKey?: string;
  piId?: string;
  onSuccess?: () => void;
}

// Fibonacci scale per Jira Align spec
const FIBONACCI_VALUES = [0, 1, 2, 3, 5, 8, 13, 20, 40, 100];

// Tab definitions per Jira Align
const WSJF_TABS = [
  { id: 'business', label: 'Set Business Value', field: 'business_value' },
  { id: 'time', label: 'Set Time Value', field: 'time_value' },
  { id: 'rroe', label: 'Set RR/OE Value', field: 'rroe_value' },
  { id: 'jobsize', label: 'Set Job Size', field: 'job_size' },
  { id: 'calculations', label: 'View Calculations', field: null },
] as const;

// Component descriptions per Jira Align Help Center (exact text)
const WSJF_DESCRIPTIONS = {
  business_value: "Relative value in the eyes of the customer/business, including such considerations as they prefer this over that, revenue impact on the business, and any penalty (cost, market share) for slow or late delivery.",
  time_value: "This parameter reflects how the user value may decay (or CoD will increase) over time. Considerations include deadlines; customers willingness to wait, and the effect on customer satisfaction while the feature is not available.",
  rroe_value: "This last element is an aggregation of three things: 1) the need to eliminate risks early, 2) giving credit to the value of the information received, and 3) the potential for new business opportunities that might be unlocked.",
  job_size: "If availability of resources means that a larger job may be delivered more quickly than some other job, then the job size estimate must be converted to job length to have a more accurate result. But rarely is that the case.",
};

export function WSJFScoringModal({
  open,
  onOpenChange,
  workItemId,
  workItemType,
  workItemTitle,
  workItemKey,
  piId,
  onSuccess,
}: WSJFScoringModalProps) {
  const [activeTab, setActiveTab] = useState<string>('business');
  const [localValues, setLocalValues] = useState({
    business_value: 0,
    time_value: 0,
    rroe_value: 0,
    job_size: 0,
  });
  
  const queryClient = useQueryClient();

  // Fetch existing WSJF data
  const { data: wsjfData, isLoading } = useQuery({
    queryKey: ['wsjf-scoring', workItemType, workItemId, piId],
    queryFn: async () => {
      if (workItemType === 'epic' && piId) {
        const { data, error } = await supabase
          .from('epic_wsjf')
          .select('*')
          .eq('epic_id', workItemId)
          .eq('pi_id', piId)
          .maybeSingle();
        
        if (error) throw error;
        return data;
      } else if (workItemType === 'feature') {
        const { data, error } = await supabase
          .from('features')
          .select('business_value, time_criticality, risk_reduction, job_size, wsjf_score')
          .eq('id', workItemId)
          .single();
        
        if (error) throw error;
        return {
          business_value: data.business_value,
          time_value: data.time_criticality,
          rroe_value: data.risk_reduction,
          job_size: data.job_size,
          wsjf_score: data.wsjf_score,
        };
      }
      return null;
    },
    enabled: open && !!workItemId,
  });

  // Initialize local values when data loads
  useEffect(() => {
    if (wsjfData) {
      setLocalValues({
        business_value: wsjfData.business_value || 0,
        time_value: wsjfData.time_value || 0,
        rroe_value: wsjfData.rroe_value || 0,
        job_size: wsjfData.job_size || 0,
      });
    }
  }, [wsjfData]);

  // Calculate WSJF score
  const calculateWSJF = () => {
    const { business_value, time_value, rroe_value, job_size } = localValues;
    if (job_size === 0) return 0;
    const cod = business_value + time_value + rroe_value;
    return Math.round((cod / job_size) * 100) / 100;
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const wsjfScore = calculateWSJF();
      
      if (workItemType === 'epic' && piId) {
        // First try to update existing record
        const { data: existing } = await supabase
          .from('epic_wsjf')
          .select('id')
          .eq('epic_id', workItemId)
          .eq('pi_id', piId)
          .maybeSingle();
        
        if (existing) {
          // Update existing record (don't include wsjf_score - it's computed)
          const { error } = await supabase
            .from('epic_wsjf')
            .update({
              business_value: localValues.business_value,
              time_value: localValues.time_value,
              rroe_value: localValues.rroe_value,
              job_size: localValues.job_size,
            })
            .eq('epic_id', workItemId)
            .eq('pi_id', piId);
          
          if (error) throw error;
        } else {
          // Insert new record (don't include wsjf_score - it's computed)
          const { error } = await supabase
            .from('epic_wsjf')
            .insert({
              epic_id: workItemId,
              pi_id: piId,
              business_value: localValues.business_value,
              time_value: localValues.time_value,
              rroe_value: localValues.rroe_value,
              job_size: localValues.job_size,
            });
          
          if (error) throw error;
        }
      } else if (workItemType === 'feature') {
        // Features table has wsjf_score as a regular column (not generated)
        const { error } = await supabase
          .from('features')
          .update({
            business_value: localValues.business_value,
            time_criticality: localValues.time_value,
            risk_reduction: localValues.rroe_value,
            job_size: localValues.job_size,
            wsjf_score: wsjfScore,
          })
          .eq('id', workItemId);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wsjf-scoring'] });
      queryClient.invalidateQueries({ queryKey: ['epic-wsjf'] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('WSJF scores saved successfully');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Failed to save WSJF: ${error.message}`);
    },
  });

  // Apply to global ranking mutation
  const applyRankingMutation = useMutation({
    mutationFn: async () => {
      if (workItemType === 'epic') {
        // First save current values
        await saveMutation.mutateAsync();
        
        // Then update global rank
        const { error } = await supabase
          .from('epics')
          .update({ global_rank: calculateWSJF() * 100 })
          .eq('id', workItemId);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast.success('WSJF applied to global ranking');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to apply ranking: ${error.message}`);
    },
  });

  const handleValueChange = (field: string, value: number) => {
    setLocalValues(prev => ({ ...prev, [field]: value }));
  };

  if (!open) return null;

  const activeTabInfo = WSJF_TABS.find(t => t.id === activeTab);
  const currentField = activeTabInfo?.field;
  const calculatedScore = calculateWSJF();
  const costOfDelay = localValues.business_value + localValues.time_value + localValues.rroe_value;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
      <div className="w-[900px] max-w-[95vw] max-h-[90vh] bg-background rounded-lg shadow-2xl flex flex-col overflow-hidden border border-border">
        {/* Header - Dynamic title per tab */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            Weighted Shortest Job First - {activeTabInfo?.label.replace('Set ', '').replace('View ', '')}
          </h2>
          <button 
            onClick={() => onOpenChange(false)} 
            className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs - 5 tabs per Jira Align */}
        <div className="flex border-b border-border bg-muted/30">
          {WSJF_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium transition-all relative whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-foreground bg-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-brand-gold border-t-transparent rounded-full" />
            </div>
          ) : activeTab !== 'calculations' ? (
            <>
              {/* Epic/Feature Row with Dropdown - matches screenshot exactly */}
              <div className="flex items-center justify-between py-4 border-b border-border mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
                    <Grid3X3 className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{workItemKey || workItemId.slice(0, 8)}</span>
                  <span className="text-sm text-foreground">{workItemTitle}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground cursor-pointer hover:text-brand-gold" />
                </div>
                <select
                  value={currentField ? localValues[currentField as keyof typeof localValues] : ''}
                  onChange={(e) => currentField && handleValueChange(currentField, parseInt(e.target.value) || 0)}
                  className="px-4 py-2 text-sm bg-background border-2 border-border rounded-md focus:outline-none focus:border-brand-gold min-w-[100px] font-medium"
                >
                  {FIBONACCI_VALUES.map((val) => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>

              {/* Component Descriptions Table - matches Jira Align layout */}
              <div className="space-y-1">
                <div className="grid grid-cols-[140px_1fr] gap-4 py-3">
                  <h4 className="text-sm font-bold text-foreground">Business Value</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{WSJF_DESCRIPTIONS.business_value}</p>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-4 py-3">
                  <h4 className="text-sm font-bold text-foreground">Time Value</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{WSJF_DESCRIPTIONS.time_value}</p>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-4 py-3">
                  <h4 className="text-sm font-bold text-foreground">RR/OE Value</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{WSJF_DESCRIPTIONS.rroe_value}</p>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-4 py-3">
                  <h4 className="text-sm font-bold text-foreground">Job Size</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{WSJF_DESCRIPTIONS.job_size}</p>
                </div>
              </div>
            </>
          ) : (
            /* View Calculations Tab */
            <>
              {/* Epic Row with Calculation Summary */}
              <div className="flex items-center justify-between py-4 border-b border-border mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
                    <Grid3X3 className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{workItemKey || workItemId.slice(0, 8)}</span>
                  <span className="text-sm text-foreground">{workItemTitle}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground cursor-pointer hover:text-brand-gold" />
                </div>
                <div className="text-sm text-muted-foreground">
                  (BV is {localValues.business_value} + TV is {localValues.time_value} + RR/OE is {localValues.rroe_value}) / Job Size is {localValues.job_size}) = <span className="font-bold text-foreground">{calculatedScore.toFixed(2)} WSJF</span>
                </div>
              </div>

              {/* Calculation Breakdown */}
              <div className="bg-muted/30 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">WSJF Calculation</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm">Business Value</span>
                    <span className="font-medium">{localValues.business_value}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm">Time Value (Criticality)</span>
                    <span className="font-medium">{localValues.time_value}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm">Risk Reduction / Opportunity Enablement</span>
                    <span className="font-medium">{localValues.rroe_value}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border bg-muted/50 px-2 -mx-2 rounded">
                    <span className="text-sm font-semibold">Cost of Delay (CoD)</span>
                    <span className="font-bold">{costOfDelay}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm">Job Size</span>
                    <span className="font-medium">{localValues.job_size}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-brand-gold/10 px-3 -mx-3 rounded-lg mt-4">
                    <span className="text-base font-bold">WSJF Score</span>
                    <span className="text-2xl font-bold text-brand-gold">{calculatedScore.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Component Descriptions */}
              <div className="space-y-1">
                <div className="grid grid-cols-[140px_1fr] gap-4 py-3">
                  <h4 className="text-sm font-bold text-foreground">Business Value</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{WSJF_DESCRIPTIONS.business_value}</p>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-4 py-3">
                  <h4 className="text-sm font-bold text-foreground">Time Value</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{WSJF_DESCRIPTIONS.time_value}</p>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-4 py-3">
                  <h4 className="text-sm font-bold text-foreground">RR/OE Value</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{WSJF_DESCRIPTIONS.rroe_value}</p>
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-4 py-3">
                  <h4 className="text-sm font-bold text-foreground">Job Size</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{WSJF_DESCRIPTIONS.job_size}</p>
                </div>
              </div>

              {/* Apply to Global Ranking Button - per Jira Align spec */}
              {workItemType === 'epic' && (
                <div className="mt-6 pt-6 border-t border-border">
                  <button
                    onClick={() => applyRankingMutation.mutate()}
                    disabled={applyRankingMutation.isPending}
                    className="px-4 py-2 bg-brand-gold text-brand-dark font-medium rounded-md hover:bg-brand-gold-hover disabled:opacity-50 transition-colors"
                  >
                    {applyRankingMutation.isPending ? 'Applying...' : 'Apply rank to Global Ranking'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - only show on input tabs */}
        {activeTab !== 'calculations' && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-brand-gold text-brand-dark text-sm font-medium rounded-md hover:bg-brand-gold-hover disabled:opacity-50 transition-colors"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
