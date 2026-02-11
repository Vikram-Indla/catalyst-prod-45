import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TestPlan } from '@/types/testPlans';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Props { plan: TestPlan; onUpdate: (updates: Partial<TestPlan>) => void; }

export function ScheduleTab({ plan, onUpdate }: Props) {
  const { data: releases } = useQuery({
    queryKey: ['releases-for-plans'],
    queryFn: async () => {
      const { data } = await supabase.from('releases').select('id, name').order('name');
      return data || [];
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader><CardTitle className="text-base">Release</CardTitle></CardHeader>
        <CardContent>
          <Select value={plan.release_id || 'none'} onValueChange={v => onUpdate({ release_id: v === 'none' ? null : v } as any)}>
            <SelectTrigger><SelectValue placeholder="Select release..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Release</SelectItem>
              {releases?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Schedule</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Planned Start Date</Label>
              <Input type="date" value={plan.planned_start_date || ''} onChange={e => onUpdate({ planned_start_date: e.target.value || null } as any)} />
            </div>
            <div className="space-y-2">
              <Label>Planned End Date</Label>
              <Input type="date" value={plan.planned_end_date || ''} onChange={e => onUpdate({ planned_end_date: e.target.value || null } as any)} />
            </div>
          </div>
          {(plan.status === 'in_progress' || plan.status === 'completed') && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Actual Start Date</Label>
                <Input type="date" value={plan.actual_start_date || ''} onChange={e => onUpdate({ actual_start_date: e.target.value || null } as any)} />
              </div>
              <div className="space-y-2">
                <Label>Actual End Date</Label>
                <Input type="date" value={plan.actual_end_date || ''} onChange={e => onUpdate({ actual_end_date: e.target.value || null } as any)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
