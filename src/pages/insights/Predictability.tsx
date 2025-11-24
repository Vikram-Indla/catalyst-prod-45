import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KPIWidgetCard } from '@/components/shared/KPIWidgetCard';
import { PISelector } from '@/components/shared/PISelector';
import { Target, TrendingUp, Activity } from 'lucide-react';

export default function Predictability() {
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedPIId, setSelectedPIId] = useState<string[]>([]);

  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: features } = useQuery({
    queryKey: ['predictability-features', selectedProgramId, selectedPIId],
    queryFn: async () => {
      if (!selectedProgramId || !selectedPIId.length) return [];
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('program_id', selectedProgramId)
        .in('pi_id', selectedPIId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProgramId && selectedPIId.length > 0,
  });

  const getPredictabilityMetrics = () => {
    const planned = features?.length || 0;
    const completed = features?.filter(f => f.status === 'done').length || 0;
    const predictability = planned > 0 ? Math.round((completed / planned) * 100) : 0;
    
    const plannedPoints = features?.reduce((sum, f) => sum + (f.estimate_points || 0), 0) || 0;
    const completedPoints = features
      ?.filter(f => f.status === 'done')
      .reduce((sum, f) => sum + (f.estimate_points || 0), 0) || 0;
    
    return { planned, completed, predictability, plannedPoints, completedPoints };
  };

  const metrics = getPredictabilityMetrics();

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Predictability Insights</h1>
        <p className="text-muted-foreground">Program predictability and delivery metrics</p>
      </div>

      <div className="flex gap-4">
        <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select Program" />
          </SelectTrigger>
          <SelectContent>
            {programs?.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <PISelector value={selectedPIId} onChange={setSelectedPIId} />
      </div>

      {selectedProgramId && selectedPIId.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <KPIWidgetCard
              title="Predictability"
              value={`${metrics.predictability}%`}
              subtitle="Features delivered vs planned"
              icon={Target}
            />
            <KPIWidgetCard
              title="Planned Features"
              value={metrics.planned}
              subtitle={`${metrics.completed} completed`}
              icon={Activity}
            />
            <KPIWidgetCard
              title="Points Completed"
              value={metrics.completedPoints}
              subtitle={`of ${metrics.plannedPoints} planned`}
              icon={TrendingUp}
            />
            <KPIWidgetCard
              title="Delivery Rate"
              value={`${metrics.predictability}%`}
              subtitle="Points predictability"
              icon={Target}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Predictability Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                Chart: Predictability % over last 5 PIs
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Feature Completion by PI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Chart: Planned vs Completed features
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Points Delivery Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Chart: Planned vs Delivered points per PI
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
