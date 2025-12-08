import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { FeatureProgressVisualization, type FeatureProgress } from '../FeatureProgressVisualization';
import { WorkItemVersionsSection } from '@/components/work-items/WorkItemVersionsSection';
import { KeyHistorySection } from '@/components/work-items/KeyHistorySection';
import { TimeTrackingSection } from '@/components/work-items/TimeTrackingSection';
import type { Feature } from '@/types/feature.types';

interface FeatureFormData {
  name: string;
  description: string;
  status: string;
  health: string;
  blocked: boolean;
  blocked_reason: string;
  mmf: boolean;
  acceptance_criteria: string;
  notes: string;
}

interface FeatureDetailsTabProps {
  feature?: Feature;
  formData: FeatureFormData;
  updateField: (field: keyof FeatureFormData, value: any) => void;
}

export function FeatureDetailsTab({ feature, formData, updateField }: FeatureDetailsTabProps) {
  // Empty progress - populated from child stories
  const mockProgress: FeatureProgress = {
    totalStories: 0,
    accepted: 0,
    inProgress: 0,
    notStarted: 0,
  };

  return (
    <div className="space-y-6">
      {/* Progress Visualization */}
      {feature && (
        <FeatureProgressVisualization 
          progress={mockProgress} 
          featureState={feature.status}
        />
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

      {/* State */}
      <div className="space-y-2">
        <Label>State</Label>
        <Select 
          value={formData.status} 
          onValueChange={(value) => updateField('status', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="funnel">Funnel</SelectItem>
            <SelectItem value="analyzing">Analyzing</SelectItem>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="implementing">Implementing</SelectItem>
            <SelectItem value="validating">Validating</SelectItem>
            <SelectItem value="deploying">Deploying</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Health */}
      <div className="space-y-2">
        <Label>Health</Label>
        <Select 
          value={formData.health} 
          onValueChange={(value) => updateField('health', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select health" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="green">Green - On Track</SelectItem>
            <SelectItem value="yellow">Yellow - At Risk</SelectItem>
            <SelectItem value="red">Red - Off Track</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Blocked */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="blocked"
          checked={formData.blocked}
          onCheckedChange={(checked) => updateField('blocked', checked)}
        />
        <Label htmlFor="blocked">Feature is blocked</Label>
      </div>

      {/* MMF (Minimum Marketable Feature) */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="mmf"
          checked={formData.mmf}
          onCheckedChange={(checked) => updateField('mmf', checked)}
        />
        <Label htmlFor="mmf">MMF (Minimum Marketable Feature)</Label>
      </div>

      {formData.blocked && (
        <div className="space-y-2">
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

      {/* Acceptance Criteria */}
      <div className="space-y-2">
        <Label htmlFor="acceptance">Acceptance Criteria</Label>
        <Textarea
          id="acceptance"
          value={formData.acceptance_criteria}
          onChange={(e) => updateField('acceptance_criteria', e.target.value)}
          placeholder="Enter acceptance criteria..."
          rows={3}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Additional notes..."
          rows={3}
        />
      </div>

      {/* Fix/Affects Versions Section */}
      {feature?.id && (
        <Card className="border border-border/60 rounded-lg">
          <CardContent className="p-5">
            <WorkItemVersionsSection 
              workItemId={feature.id} 
              workItemType="feature" 
            />
          </CardContent>
        </Card>
      )}

      {/* Key History Section */}
      {feature?.id && feature?.display_id && (
        <KeyHistorySection 
          workItemId={feature.id} 
          workItemType="feature" 
          currentKey={feature.display_id}
        />
      )}

      {/* Time Tracking Section */}
      {feature?.id && (
        <TimeTrackingSection 
          workItemId={feature.id} 
          workItemType="feature" 
        />
      )}
    </div>
  );
}