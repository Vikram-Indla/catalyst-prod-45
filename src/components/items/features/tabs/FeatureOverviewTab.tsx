/**
 * FeatureOverviewTab — Slim Framework
 * 
 * Active fields only:
 * - name, description
 * - status, owner, health
 * - blocked + reason
 * - planned dates
 * - Story-driven progress (read-only)
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, AlertCircle, CheckCircle2, Clock, CircleDashed } from 'lucide-react';
import type { Feature, FeatureProgress, FeatureStatus } from '@/types/feature.types';
import { suggestFeatureStatus } from '@/hooks/useFeatureProgress';

interface FeatureFormData {
  name: string;
  description: string;
  status: FeatureStatus;
  health: 'green' | 'yellow' | 'red';
  blocked: boolean;
  blocked_reason: string;
  planned_start_date: string;
  planned_end_date: string;
}

interface FeatureOverviewTabProps {
  feature?: Feature;
  formData: FeatureFormData;
  updateField: <K extends keyof FeatureFormData>(field: K, value: FeatureFormData[K]) => void;
  progress?: FeatureProgress;
}

const STATUS_OPTIONS: { value: FeatureStatus; label: string; description: string }[] = [
  { value: 'funnel', label: 'Funnel', description: 'Draft / not ready' },
  { value: 'analyzing', label: 'Analyzing', description: 'Being shaped, stories being defined' },
  { value: 'backlog', label: 'Backlog', description: 'Approved, ready for implementation' },
  { value: 'implementing', label: 'Implementing', description: 'At least one story in progress' },
  { value: 'done', label: 'Done', description: 'All stories completed' },
];

const HEALTH_OPTIONS = [
  { value: 'green', label: 'Green', description: 'On Track' },
  { value: 'yellow', label: 'Yellow', description: 'At Risk' },
  { value: 'red', label: 'Red', description: 'Off Track' },
];

export function FeatureOverviewTab({ feature, formData, updateField, progress }: FeatureOverviewTabProps) {
  // Get suggested status based on story progress
  const suggestedStatus = progress ? suggestFeatureStatus(progress, formData.status) : null;
  const showStatusSuggestion = suggestedStatus && suggestedStatus !== formData.status;

  return (
    <div className="space-y-6">
      {/* Story-Driven Progress (Read-Only) */}
      {progress && progress.totalStories > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Progress (Story-Driven)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Progress value={progress.completionPercent} className="flex-1 h-2" />
              <span className="text-sm font-medium tabular-nums w-12 text-right">
                {progress.completionPercent}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-lg font-semibold">{progress.completedStories}</span>
                </div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-sky-600">
                  <Clock className="h-4 w-4" />
                  <span className="text-lg font-semibold">{progress.inProgressStories}</span>
                </div>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                  <CircleDashed className="h-4 w-4" />
                  <span className="text-lg font-semibold">{progress.notStartedStories}</span>
                </div>
                <p className="text-xs text-muted-foreground">Not Started</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Enter feature title..."
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Enter feature description..."
          rows={4}
        />
      </div>

      {/* Status with Suggestion */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Status</Label>
          {showStatusSuggestion && (
            <button
              type="button"
              onClick={() => updateField('status', suggestedStatus!)}
              className="text-xs text-primary hover:underline"
            >
              Suggest: {STATUS_OPTIONS.find(s => s.value === suggestedStatus)?.label}
            </button>
          )}
        </div>
        <Select 
          value={formData.status} 
          onValueChange={(value) => updateField('status', value as FeatureStatus)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex flex-col">
                  <span>{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Health */}
      <div className="space-y-2">
        <Label>Health</Label>
        <Select 
          value={formData.health} 
          onValueChange={(value) => updateField('health', value as 'green' | 'yellow' | 'red')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select health" />
          </SelectTrigger>
          <SelectContent>
            {HEALTH_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    opt.value === 'green' ? 'bg-emerald-500' :
                    opt.value === 'yellow' ? 'bg-amber-500' : 'bg-rose-500'
                  }`} />
                  <span>{opt.label} - {opt.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Blocked */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="blocked"
            checked={formData.blocked}
            onCheckedChange={(checked) => updateField('blocked', !!checked)}
          />
          <Label htmlFor="blocked" className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-destructive" />
            Feature is blocked
          </Label>
        </div>

        {formData.blocked && (
          <div className="space-y-2 pl-6">
            <Label htmlFor="blocked-reason">Blocked Reason</Label>
            <Textarea
              id="blocked-reason"
              value={formData.blocked_reason}
              onChange={(e) => updateField('blocked_reason', e.target.value)}
              placeholder="Describe why this feature is blocked..."
              rows={2}
            />
          </div>
        )}
      </div>

      {/* Dates (Optional, Lightweight) */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Planned Dates (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={formData.planned_start_date}
                onChange={(e) => updateField('planned_start_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={formData.planned_end_date}
                onChange={(e) => updateField('planned_end_date', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
