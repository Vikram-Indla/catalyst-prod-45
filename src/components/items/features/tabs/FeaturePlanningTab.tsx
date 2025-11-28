import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Feature } from '@/types/feature.types';

interface FeaturePlanningTabProps {
  feature?: Feature;
}

export function FeaturePlanningTab({ feature }: FeaturePlanningTabProps) {
  const { data: programIncrements } = useQuery({
    queryKey: ['program-increments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('program_increments')
        .select('id, name')
        .order('start_date', { ascending: false });
      return data || [];
    },
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      return data || [];
    },
  });

  const { data: iterations } = useQuery({
    queryKey: ['iterations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('iterations')
        .select('id, name')
        .order('start_date', { ascending: false });
      return data || [];
    },
  });

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
            {programIncrements?.map((pi) => (
              <SelectItem key={pi.id} value={pi.id}>
                {pi.name}
              </SelectItem>
            ))}
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
            {teams?.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
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
            {iterations?.map((iteration) => (
              <SelectItem key={iteration.id} value={iteration.id}>
                {iteration.name}
              </SelectItem>
            ))}
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
