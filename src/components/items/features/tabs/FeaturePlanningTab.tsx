import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { Feature } from '@/types/feature.types';

interface FeaturePlanningTabProps {
  feature?: Feature;
}

export function FeaturePlanningTab({ feature }: FeaturePlanningTabProps) {
  return (
    <div className="space-y-6">
      {/* Program Increment */}
      <div className="space-y-2">
        <Label>Program Increment</Label>
        <Select defaultValue={feature?.pi_id || undefined}>
          <SelectTrigger>
            <SelectValue placeholder="Select PI..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pi-1">PI 2025.1</SelectItem>
            <SelectItem value="pi-2">PI 2025.2</SelectItem>
            <SelectItem value="pi-3">PI 2025.3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Team */}
      <div className="space-y-2">
        <Label>Team</Label>
        <Select defaultValue={feature?.team_id || undefined}>
          <SelectTrigger>
            <SelectValue placeholder="Select team..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="team-a">Team A</SelectItem>
            <SelectItem value="team-b">Team B</SelectItem>
            <SelectItem value="team-c">Team C</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Target Completion Sprint */}
      <div className="space-y-2">
        <Label>Team Target Completion Sprint</Label>
        <Select defaultValue={feature?.team_target_completion_sprint_id || undefined}>
          <SelectTrigger>
            <SelectValue placeholder="Select sprint..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sprint-1">Sprint 1</SelectItem>
            <SelectItem value="sprint-2">Sprint 2</SelectItem>
            <SelectItem value="sprint-3">Sprint 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Planned Start Date */}
      <div className="space-y-2">
        <Label htmlFor="planned-start">Planned Start Date</Label>
        <Input
          id="planned-start"
          type="date"
          defaultValue={feature?.planned_start_date || ''}
        />
      </div>

      {/* Target Completion Date */}
      <div className="space-y-2">
        <Label htmlFor="target-completion">Target Completion Date</Label>
        <Input
          id="target-completion"
          type="date"
          defaultValue={feature?.planned_end_date || ''}
        />
      </div>

      {/* Actual Start Date */}
      <div className="space-y-2">
        <Label htmlFor="actual-start">Actual Start Date</Label>
        <Input
          id="actual-start"
          type="date"
          defaultValue={feature?.actual_start_date || ''}
        />
      </div>

      {/* Actual End Date */}
      <div className="space-y-2">
        <Label htmlFor="actual-end">Actual End Date</Label>
        <Input
          id="actual-end"
          type="date"
          defaultValue={feature?.actual_end_date || ''}
        />
      </div>
    </div>
  );
}
