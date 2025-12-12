/**
 * =====================================================
 * EpicOverviewTab - Consolidated Overview tab for Epic vNext
 * =====================================================
 * 
 * Contains:
 * - Classification (State, Status, Process Step, Health, MVP)
 * - Core identity (Key, Name editable, Owner)
 * - Dates (Initiation Date, Target Completion Date)
 * - Inline summary strip (Progress %, Feature counts, Tech Score, Business Score)
 * - Collapsible Strategy Context section
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { TechnicalScoreBadge } from '@/components/shared/TechnicalScoreBadge';
import { EpicStrategyContext } from '../EpicStrategyContext';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { ChevronDown, ChevronRight, Target, BarChart3, CheckCircle2, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface EpicOverviewTabProps {
  epic: any;
}

export function EpicOverviewTab({ epic }: EpicOverviewTabProps) {
  const [strategyContextOpen, setStrategyContextOpen] = useState(false);
  const queryClient = useQueryClient();

  // Local form state
  const [formData, setFormData] = useState({
    state: epic.state || 'not_started',
    status: epic.status || 'funnel',
    process_step_id: epic.process_step_id || '',
    health: epic.health || 'green',
    mvp: epic.mvp || false,
    epic_type: epic.epic_type || 'business',
    owner_id: epic.owner_id || '',
    description: epic.description || '',
    initiation_date: epic.initiation_date || '',
    target_completion_date: epic.target_completion_date || '',
  });

  // Sync when epic changes
  useEffect(() => {
    setFormData({
      state: epic.state || 'not_started',
      status: epic.status || 'funnel',
      process_step_id: epic.process_step_id || '',
      health: epic.health || 'green',
      mvp: epic.mvp || false,
      epic_type: epic.epic_type || 'business',
      owner_id: epic.owner_id || '',
      description: epic.description || '',
      initiation_date: epic.initiation_date || '',
      target_completion_date: epic.target_completion_date || '',
    });
  }, [epic]);

  // Fetch reference data
  const { data: processSteps } = useQuery({
    queryKey: ['process-steps'],
    queryFn: async () => {
      const { data } = await supabase.from('process_steps').select('id, name, sort_order').order('sort_order');
      return data || [];
    },
  });

  const { data: users } = useQuery({
    queryKey: ['users-for-dropdown'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email').order('full_name');
      return data || [];
    },
  });

  // Fetch Technical Score
  const { data: technicalScore } = useQuery({
    queryKey: ['epic-technical-score', epic.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('epic_wsjf')
        .select('business_value, time_value, rroe_value, job_size')
        .eq('epic_id', epic.id)
        .maybeSingle();
      
      if (!data) return null;
      const { business_value, time_value, rroe_value, job_size } = data;
      if (!job_size) return null;
      return Math.round(((business_value || 0) + (time_value || 0) + (rroe_value || 0)) / job_size * 100) / 100;
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<typeof formData>) => {
      const dbUpdates: any = { ...updates };
      Object.keys(dbUpdates).forEach(key => {
        if (dbUpdates[key] === '') dbUpdates[key] = null;
      });

      const { error } = await supabase
        .from('epics')
        .update(dbUpdates)
        .eq('id', epic.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      queryClient.invalidateQueries({ queryKey: ['epic-detail', epic.id] });
    },
    onError: () => {
      toast.error('Failed to update epic');
    }
  });

  const handleFieldChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    updateMutation.mutate({ [field]: value });
  };

  const handleTextBlur = (field: keyof typeof formData) => {
    updateMutation.mutate({ [field]: formData[field] });
  };

  // Roll-up values
  const progressPct = epic.progress_pct ?? 0;
  const featureTotal = epic.feature_count_total ?? 0;
  const featureCompleted = epic.feature_count_completed ?? 0;
  const businessScore = epic.business_score ?? 0;
  const targetQuarter = epic.target_completion_date
    ? `Q${Math.ceil((new Date(epic.target_completion_date).getMonth() + 1) / 3)} ${new Date(epic.target_completion_date).getFullYear()}`
    : null;

  return (
    <div className="space-y-4 p-4">
      {/* Saving indicator */}
      {updateMutation.isPending && (
        <div className="fixed top-4 right-4 bg-background border rounded-lg px-3 py-2 flex items-center gap-2 shadow-lg z-50">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Saving...</span>
        </div>
      )}

      {/* Compact Summary Strip */}
      <Card className="border border-border/40 bg-muted/20">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-sm">
            <div className="space-y-0.5">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />Progress
              </div>
              <div className="flex items-center gap-1.5">
                <Progress value={progressPct} className="h-1.5 flex-1" />
                <span className="font-medium text-xs">{progressPct}%</span>
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" />Features
              </div>
              <span className="font-medium">{featureCompleted}/{featureTotal}</span>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />Estimate
              </div>
              <span className="font-medium">{epic.points_estimate ?? 0} pts</span>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs text-muted-foreground">Tech Score</div>
              {technicalScore !== null ? (
                <TechnicalScoreBadge score={technicalScore} compact />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
            <div className="space-y-0.5">
              <div className="text-xs text-muted-foreground">Business Score</div>
              <span className="font-medium">{businessScore || '—'}</span>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />Target
              </div>
              <span className="font-medium">{targetQuarter || '—'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collapsible Strategy Context */}
      <Collapsible open={strategyContextOpen} onOpenChange={setStrategyContextOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-muted/30 hover:bg-muted/50 rounded-lg border border-border/40 transition-colors">
          {strategyContextOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Strategy Context</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {strategyContextOpen ? 'Click to collapse' : 'Click to expand'}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <EpicStrategyContext epicId={epic.id} themeId={epic.theme_id} />
        </CollapsibleContent>
      </Collapsible>

      {/* Classification Section */}
      <Card className="border border-border/40">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Classification</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">State</Label>
              <Select value={formData.state} onValueChange={(v) => handleFieldChange('state', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">1 - Not Started</SelectItem>
                  <SelectItem value="in_progress">2 - In Progress</SelectItem>
                  <SelectItem value="accepted">3 - Accepted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Select value={formData.status} onValueChange={(v) => handleFieldChange('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="funnel">Funnel</SelectItem>
                  <SelectItem value="analysis">Analysis</SelectItem>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="implementing">Implementing</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Process Step</Label>
              <Select 
                value={formData.process_step_id || 'none'} 
                onValueChange={(v) => handleFieldChange('process_step_id', v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select process step" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {processSteps?.map((step: any) => (
                    <SelectItem key={step.id} value={step.id}>{step.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Health</Label>
              <Select value={formData.health} onValueChange={(v) => handleFieldChange('health', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="amber">Amber</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Type</Label>
              <Select value={formData.epic_type} onValueChange={(v) => handleFieldChange('epic_type', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="architecture">Architecture</SelectItem>
                  <SelectItem value="enabler">Enabler</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="mvp"
                checked={formData.mvp}
                onCheckedChange={(checked) => handleFieldChange('mvp', !!checked)}
              />
              <Label htmlFor="mvp" className="text-sm font-medium cursor-pointer">MVP</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Identity Section */}
      <Card className="border border-border/40">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Core Identity</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Epic Key</Label>
              <Input value={epic.epic_key || epic.id?.slice(0, 8)} disabled className="bg-muted" />
            </div>

            <div>
              <Label className="text-sm font-medium">Owner</Label>
              <Select 
                value={formData.owner_id || 'none'} 
                onValueChange={(v) => handleFieldChange('owner_id', v === 'none' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users?.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              onBlur={() => handleTextBlur('description')}
              placeholder="Epic description..."
              rows={3}
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Dates Section */}
      <Card className="border border-border/40">
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Dates</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Initiation Date</Label>
              <CatalystDatePicker
                value={formData.initiation_date || null}
                onChange={(date) => handleFieldChange('initiation_date', date ? format(date, 'yyyy-MM-dd') : null)}
                placeholder="Select date"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-1.5 block">Target Completion Date</Label>
              <CatalystDatePicker
                value={formData.target_completion_date || null}
                onChange={(date) => handleFieldChange('target_completion_date', date ? format(date, 'yyyy-MM-dd') : null)}
                placeholder="Select date"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
