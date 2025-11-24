import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScopeSelector } from '@/components/shared/ScopeSelector';
import { KPIWidgetCard } from '@/components/shared/KPIWidgetCard';
import { Target, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function PortfolioInsights() {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');

  const { data: initiatives } = useQuery({
    queryKey: ['insights-initiatives', selectedPortfolioId],
    queryFn: async () => {
      if (!selectedPortfolioId) return [];
      const { data, error } = await supabase.from('initiatives').select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPortfolioId,
  });

  const { data: epics } = useQuery({
    queryKey: ['insights-epics', selectedPortfolioId],
    queryFn: async () => {
      if (!selectedPortfolioId) return [];
      const { data, error } = await supabase.from('epics').select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPortfolioId,
  });

  const { data: features } = useQuery({
    queryKey: ['insights-features', selectedPortfolioId],
    queryFn: async () => {
      if (!selectedPortfolioId) return [];
      const { data, error } = await supabase.from('features').select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPortfolioId,
  });

  const { data: themes } = useQuery({
    queryKey: ['insights-themes', selectedPortfolioId],
    queryFn: async () => {
      if (!selectedPortfolioId) return [];
      const { data, error } = await supabase.from('strategic_themes').select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPortfolioId,
  });

  const getInitiativeMetrics = () => {
    const total = initiatives?.length || 0;
    const active = initiatives?.filter(i => i.status === 'active').length || 0;
    const done = initiatives?.filter(i => i.status === 'done').length || 0;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    
    return { total, active, done, completionRate };
  };

  const getHealthMetrics = () => {
    const allItems = [...(epics || []), ...(features || [])];
    const total = allItems.length;
    const green = allItems.filter(i => i.health === 'green').length;
    const yellow = allItems.filter(i => i.health === 'yellow').length;
    const red = allItems.filter(i => i.health === 'red').length;
    
    return { total, green, yellow, red };
  };

  const getEpicMetrics = () => {
    const total = epics?.length || 0;
    const inProgress = epics?.filter(e => e.status === 'in_progress').length || 0;
    const done = epics?.filter(e => e.status === 'done').length || 0;
    
    return { total, inProgress, done };
  };

  const getFeatureMetrics = () => {
    const total = features?.length || 0;
    const implementing = features?.filter(f => f.status === 'implementing').length || 0;
    const done = features?.filter(f => f.status === 'done').length || 0;
    
    return { total, implementing, done };
  };

  const initiativeMetrics = getInitiativeMetrics();
  const healthMetrics = getHealthMetrics();
  const epicMetrics = getEpicMetrics();
  const featureMetrics = getFeatureMetrics();

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Insights</h1>
          <p className="text-muted-foreground">Analytics and metrics across the portfolio</p>
        </div>
      </div>

      <ScopeSelector value={selectedPortfolioId} onChange={setSelectedPortfolioId} />

      {selectedPortfolioId && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <KPIWidgetCard
              title="Active Initiatives"
              value={initiativeMetrics.active}
              subtitle={`${initiativeMetrics.done} completed of ${initiativeMetrics.total}`}
              icon={Target}
            />
            <KPIWidgetCard
              title="Completion Rate"
              value={`${initiativeMetrics.completionRate}%`}
              subtitle="Initiative completion"
              icon={TrendingUp}
            />
            <KPIWidgetCard
              title="Epics In Progress"
              value={epicMetrics.inProgress}
              subtitle={`${epicMetrics.done} done of ${epicMetrics.total}`}
              icon={CheckCircle}
            />
            <KPIWidgetCard
              title="Features Implementing"
              value={featureMetrics.implementing}
              subtitle={`${featureMetrics.done} done of ${featureMetrics.total}`}
              icon={TrendingUp}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Health Distribution</CardTitle>
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
                <CardTitle>Strategic Themes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {themes?.slice(0, 5).map((theme) => (
                    <div key={theme.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{theme.name}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {theme.status}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        style={theme.color_tag ? { borderColor: theme.color_tag } : {}}
                      >
                        {initiatives?.filter(i => i.theme_id === theme.id).length || 0} initiatives
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Initiative Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {['proposed', 'active', 'done', 'cancelled'].map((status) => {
                  const count = initiatives?.filter(i => i.status === status).length || 0;
                  return (
                    <div key={status} className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-sm text-muted-foreground capitalize">{status}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
