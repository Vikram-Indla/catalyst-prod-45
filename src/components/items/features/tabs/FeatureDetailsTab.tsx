import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { Feature } from '@/types/feature.types';

interface FeatureDetailsTabProps {
  feature?: Feature;
}

export function FeatureDetailsTab({ feature }: FeatureDetailsTabProps) {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          defaultValue={feature?.name || ''}
          placeholder="Enter feature title..."
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          defaultValue={feature?.description || ''}
          placeholder="Enter feature description..."
          rows={4}
        />
      </div>

      {/* State */}
      <div className="space-y-2">
        <Label>State</Label>
        <Select defaultValue={feature?.status || 'funnel'}>
          <SelectTrigger>
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="funnel">Funnel</SelectItem>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="implementing">Implementing</SelectItem>
            <SelectItem value="validating">Validating</SelectItem>
            <SelectItem value="deploying">Deploying</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Blocked */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="blocked"
          defaultChecked={feature?.blocked || false}
        />
        <Label htmlFor="blocked">Feature is blocked</Label>
      </div>

      {feature?.blocked && (
        <div className="space-y-2">
          <Label htmlFor="blocked-reason">Blocked Reason</Label>
          <Textarea
            id="blocked-reason"
            defaultValue={feature?.blocked_reason || ''}
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
          defaultValue={feature?.acceptance_criteria || ''}
          placeholder="Enter acceptance criteria..."
          rows={3}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          defaultValue={feature?.notes || ''}
          placeholder="Additional notes..."
          rows={3}
        />
      </div>
    </div>
  );
}
