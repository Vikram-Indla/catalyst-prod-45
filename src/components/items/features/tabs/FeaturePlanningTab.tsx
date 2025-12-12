import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link2 } from 'lucide-react';
import type { Feature } from '@/types/feature.types';

interface FeaturePlanningTabProps {
  feature?: Feature;
}

export function FeaturePlanningTab({ feature }: FeaturePlanningTabProps) {
  const queryClient = useQueryClient();
  const [programEpicInherited, setProgramEpicInherited] = useState(feature?.program_epic_inherited ?? true);

  useEffect(() => {
    setProgramEpicInherited(feature?.program_epic_inherited ?? true);
  }, [feature?.program_epic_inherited]);

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

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('programs')
        .select('id, name')
        .order('name');
      return data || [];
    },
  });

  const { data: parentEpic } = useQuery({
    queryKey: ['parent-epic', feature?.epic_id],
    queryFn: async () => {
      if (!feature?.epic_id) return null;
      const { data } = await supabase
        .from('epics')
        .select('id, name, primary_program_id, programs:primary_program_id(id, name)')
        .eq('id', feature.epic_id)
        .single();
      return data;
    },
    enabled: !!feature?.epic_id,
  });

  const updateInheritanceMutation = useMutation({
    mutationFn: async (inherited: boolean) => {
      if (!feature?.id) throw new Error('No feature ID');
      const { error } = await supabase
        .from('features')
        .update({ program_epic_inherited: inherited })
        .eq('id', feature.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast.success('Program inheritance updated');
    },
    onError: () => {
      toast.error('Failed to update inheritance');
    },
  });

  const handleInheritanceToggle = (checked: boolean) => {
    setProgramEpicInherited(checked);
    updateInheritanceMutation.mutate(checked);
  };

  const epicProgramName = (parentEpic as any)?.programs?.name;

  return (
    <div className="space-y-6">
      {/* Program Inheritance Section */}
      <Card className="bg-white border border-neutral-200 rounded-xl shadow-none">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-brand-gold" />
              <Label className="text-sm font-semibold">Program Inheritance</Label>
            </div>
            <Switch
              checked={programEpicInherited}
              onCheckedChange={handleInheritanceToggle}
              disabled={updateInheritanceMutation.isPending}
            />
          </div>
          
          <p className="text-xs text-muted-foreground">
            {programEpicInherited 
              ? "Program is inherited from the parent Epic. Changes to the Epic's program will automatically update this Feature."
              : "Program is set manually for this Feature and won't change when the Epic's program changes."
            }
          </p>

          {programEpicInherited && epicProgramName && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Inherited from Epic:</span>
              <Badge variant="outline" className="text-xs">{epicProgramName}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Program (only editable if not inherited) */}
      {!programEpicInherited && (
        <div className="space-y-2">
          <Label>Program (Manual Override)</Label>
          <Select defaultValue={feature?.project_id || undefined}>
            <SelectTrigger>
              <SelectValue placeholder="Select program..." />
            </SelectTrigger>
            <SelectContent>
              {programs?.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
