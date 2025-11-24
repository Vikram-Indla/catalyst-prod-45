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
              <CardTitle>Delivery Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Feature Delivery</h3>
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block text-primary">
                          Completion Rate
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-primary">
                          {metrics.predictability}%
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-muted">
                      <div
                        style={{ width: `${metrics.predictability}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{metrics.planned}</div>
                      <div className="text-sm text-muted-foreground">Planned</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg bg-success/10">
                      <div className="text-2xl font-bold text-success">{metrics.completed}</div>
                      <div className="text-sm text-muted-foreground">Completed</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Points Delivery</h3>
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block text-primary">
                          Points Completion
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-primary">
                          {metrics.plannedPoints > 0 
                            ? Math.round((metrics.completedPoints / metrics.plannedPoints) * 100)
                            : 0}%
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-muted">
                      <div
                        style={{ 
                          width: `${metrics.plannedPoints > 0 
                            ? (metrics.completedPoints / metrics.plannedPoints) * 100 
                            : 0}%` 
                        }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-accent transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{metrics.plannedPoints}</div>
                      <div className="text-sm text-muted-foreground">Planned</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg bg-accent/10">
                      <div className="text-2xl font-bold text-accent">{metrics.completedPoints}</div>
                      <div className="text-sm text-muted-foreground">Delivered</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
