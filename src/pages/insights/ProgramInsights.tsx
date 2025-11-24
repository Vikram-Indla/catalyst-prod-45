import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KPIWidgetCard } from '@/components/shared/KPIWidgetCard';
import { PISelector } from '@/components/shared/PISelector';
import { Target, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function ProgramInsights() {
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
    queryKey: ['program-features', selectedProgramId, selectedPIId],
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

  const { data: teams } = useQuery({
    queryKey: ['program-teams', selectedProgramId],
    queryFn: async () => {
      if (!selectedProgramId) return [];
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('program_id', selectedProgramId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProgramId,
  });

  const getFeatureMetrics = () => {
    const total = features?.length || 0;
    const implementing = features?.filter(f => f.status === 'implementing').length || 0;
    const done = features?.filter(f => f.status === 'done').length || 0;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    
    return { total, implementing, done, completionRate };
  };

  const getHealthMetrics = () => {
    const total = features?.length || 0;
    const green = features?.filter(f => f.health === 'green').length || 0;
    const yellow = features?.filter(f => f.health === 'yellow').length || 0;
    const red = features?.filter(f => f.health === 'red').length || 0;
    
    return { total, green, yellow, red };
  };

  const featureMetrics = getFeatureMetrics();
  const healthMetrics = getHealthMetrics();

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Program Insights</h1>
        <p className="text-muted-foreground">Analytics and metrics at program level</p>
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
              title="Total Features"
              value={featureMetrics.total}
              subtitle={`${featureMetrics.done} completed`}
              icon={Target}
            />
            <KPIWidgetCard
              title="Implementing"
              value={featureMetrics.implementing}
              subtitle="Features in progress"
              icon={TrendingUp}
            />
            <KPIWidgetCard
              title="Completion Rate"
              value={`${featureMetrics.completionRate}%`}
              subtitle="Feature delivery"
              icon={Target}
            />
            <KPIWidgetCard
              title="Teams"
              value={teams?.length || 0}
              subtitle="Active agile teams"
              icon={Users}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Feature Health Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-success"></div>
                      <span className="text-sm">Green</span>
                    </div>
                    <span className="text-sm font-medium">{healthMetrics.green}</span>
                  </div>
                  <Progress 
                    value={healthMetrics.total > 0 ? (healthMetrics.green / healthMetrics.total) * 100 : 0} 
                    className="h-2"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-warning"></div>
                      <span className="text-sm">Yellow</span>
                    </div>
                    <span className="text-sm font-medium">{healthMetrics.yellow}</span>
                  </div>
                  <Progress 
                    value={healthMetrics.total > 0 ? (healthMetrics.yellow / healthMetrics.total) * 100 : 0} 
                    className="h-2"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-destructive"></div>
                      <span className="text-sm">Red</span>
                    </div>
                    <span className="text-sm font-medium">{healthMetrics.red}</span>
                  </div>
                  <Progress 
                    value={healthMetrics.total > 0 ? (healthMetrics.red / healthMetrics.total) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {['funnel', 'analyzing', 'backlog', 'implementing', 'done'].map((status) => {
                    const count = features?.filter(f => f.status === status).length || 0;
                    return (
                      <div key={status} className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {status}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Team Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teams?.map((team) => (
                  <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{team.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Velocity: {team.velocity_baseline || 0} points
                      </div>
                    </div>
                    <div className="text-sm capitalize">{team.status}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
