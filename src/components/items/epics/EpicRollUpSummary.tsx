/**
 * =====================================================
 * EpicRollUpSummary - Roll-up metrics display component
 * =====================================================
 * Catalyst Epics vNext Phase II
 * 
 * Displays roll-up data (total estimate, progress, feature counts)
 * in the Epic details panel header section.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TechnicalScoreBadge } from '@/components/shared/TechnicalScoreBadge';
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Target,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

interface EpicRollUpSummaryProps {
  epic: {
    id: string;
    points_estimate?: number;
    progress_pct?: number;
    feature_count_total?: number;
    feature_count_completed?: number;
    feature_count_in_progress?: number;
    feature_count_blocked?: number;
    business_score?: number;
    target_completion_date?: string;
  };
  compact?: boolean;
}

export function EpicRollUpSummary({ epic, compact = false }: EpicRollUpSummaryProps) {
  // Fetch Technical Score from epic_wsjf
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
      if (!business_value || !time_value || !rroe_value || !job_size) return null;
      
      return Math.round(((business_value + time_value + rroe_value) / job_size) * 100) / 100;
    },
  });

  // Get values from epic or default to 0
  const totalEstimate = epic.points_estimate ?? 0;
  const progressPct = epic.progress_pct ?? 0;
  const featureTotal = epic.feature_count_total ?? 0;
  const featureCompleted = epic.feature_count_completed ?? 0;
  const featureInProgress = epic.feature_count_in_progress ?? 0;
  const featureBlocked = epic.feature_count_blocked ?? 0;
  const businessScore = epic.business_score ?? 0;

  // Format target date
  const targetDate = epic.target_completion_date 
    ? format(new Date(epic.target_completion_date), 'MMM d, yyyy')
    : null;

  // Derive quarter from target date
  const targetQuarter = epic.target_completion_date
    ? `Q${Math.ceil((new Date(epic.target_completion_date).getMonth() + 1) / 3)} ${new Date(epic.target_completion_date).getFullYear()}`
    : null;

  if (compact) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        {/* Progress */}
        <div className="flex items-center gap-1.5">
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{progressPct}%</span>
        </div>

        {/* Feature counts */}
        <span className="text-xs text-muted-foreground">
          {featureCompleted}/{featureTotal} features
        </span>

        {/* Technical Score */}
        {technicalScore !== null && (
          <TechnicalScoreBadge score={technicalScore} compact />
        )}

        {/* Total Estimate */}
        {totalEstimate > 0 && (
          <Badge variant="secondary" className="text-xs">
            {totalEstimate} pts
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-muted/30 rounded-lg border border-border/40">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" />
          <span>Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={progressPct} className="h-2 flex-1" />
          <span className="text-sm font-medium">{progressPct}%</span>
        </div>
      </div>

      {/* Feature Counts */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Target className="h-3.5 w-3.5" />
          <span>Features</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{featureCompleted}/{featureTotal}</span>
          {featureInProgress > 0 && (
            <Badge variant="secondary" className="text-xs h-5">
              <Clock className="h-3 w-3 mr-1" />
              {featureInProgress}
            </Badge>
          )}
          {featureBlocked > 0 && (
            <Badge variant="destructive" className="text-xs h-5">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {featureBlocked}
            </Badge>
          )}
        </div>
      </div>

      {/* Total Estimate */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Estimate</span>
        </div>
        <span className="text-sm font-medium">{totalEstimate} pts</span>
      </div>

      {/* Business Score */}
      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground">Business Score</div>
        <span className="text-sm font-medium">{businessScore || '—'}</span>
      </div>

      {/* Technical Score */}
      <div className="space-y-1.5">
        <div className="text-xs text-muted-foreground">Tech Score</div>
        {technicalScore !== null ? (
          <TechnicalScoreBadge score={technicalScore} compact />
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>

      {/* Target Timeframe */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>Target</span>
        </div>
        <span className="text-sm font-medium">
          {targetQuarter || targetDate || '—'}
        </span>
      </div>
    </div>
  );
}
