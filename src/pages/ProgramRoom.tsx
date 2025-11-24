import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScopeSelector } from '@/components/shared/ScopeSelector';
import { PISelector } from '@/components/shared/PISelector';
import { KPIWidgetCard } from '@/components/shared/KPIWidgetCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Target, TrendingUp, Link2, AlertTriangle, BarChart3, Clock } from 'lucide-react';

export default function ProgramRoom() {
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [selectedPIs, setSelectedPIs] = useState<string[]>([]);

  // Fetch programs
  const { data: programs } = useQuery({
    queryKey: ['programs', selectedPortfolio],
    queryFn: async () => {
      let query = supabase
        .from('programs')
        .select('*')
        .order('name');
      
      if (selectedPortfolio) {
        query = query.eq('portfolio_id', selectedPortfolio);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPortfolio,
  });

  // Fetch features for selected PIs
  const { data: features } = useQuery({
    queryKey: ['features-program', selectedPIs],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('*, epics(name)')
        .in('pi_id', selectedPIs)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: selectedPIs.length > 0,
  });

  // Fetch risks
  const { data: risks } = useQuery({
    queryKey: ['risks', selectedPIs],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risks')
        .select('*')
        .in('pi_id', selectedPIs)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: selectedPIs.length > 0,
  });

  // Calculate KPIs
  const totalFeatures = features?.length || 0;
  const doneFeatures = features?.filter(f => f.status === 'done').length || 0;
  const implementingFeatures = features?.filter(f => f.status === 'implementing').length || 0;
  const backlogFeatures = features?.filter(f => f.status === 'backlog').length || 0;

  const roamResolved = risks?.filter(r => r.roam_status === 'resolved').length || 0;
  const roamOwned = risks?.filter(r => r.roam_status === 'owned').length || 0;
  const roamAccepted = risks?.filter(r => r.roam_status === 'accepted').length || 0;
  const roamMitigated = risks?.filter(r => r.roam_status === 'mitigated').length || 0;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Program Room</h1>
            <p className="text-sm text-muted-foreground">ART/Program decision cockpit</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">12 days left in PI</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <ScopeSelector value={selectedPortfolio} onChange={setSelectedPortfolio} />
          <PISelector 
            portfolioId={selectedPortfolio} 
            value={selectedPIs} 
            onChange={setSelectedPIs}
          />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPIWidgetCard
              title="PI Objectives"
              value="85%"
              subtitle="Completion rate"
              icon={Target}
              trend="up"
              trendValue="+5% this week"
            />

            <KPIWidgetCard
              title="Feature Rollup"
              value={`${doneFeatures}/${totalFeatures}`}
              subtitle="Features complete"
              icon={TrendingUp}
            />

            <KPIWidgetCard
              title="Dependencies"
              value="12"
              subtitle="Active dependencies"
              icon={Link2}
              trend="down"
              trendValue="3 resolved"
            />

            <KPIWidgetCard
              title="Capacity"
              value="420/450"
              subtitle="Points planned"
              icon={BarChart3}
            />
          </div>

          {/* Feature Rollup by Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Features by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="font-medium">Done</span>
                  </div>
                  <Badge variant="outline">{doneFeatures}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-medium">Implementing</span>
                  </div>
                  <Badge variant="outline">{implementingFeatures}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-secondary" />
                    <span className="font-medium">Backlog</span>
                  </div>
                  <Badge variant="outline">{backlogFeatures}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ROAM Snapshot */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  ROAM Risk Snapshot
                </CardTitle>
                <Button variant="ghost" size="sm">View Board</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">{roamResolved}</div>
                  <p className="text-xs text-muted-foreground mt-1">Resolved</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{roamOwned}</div>
                  <p className="text-xs text-muted-foreground mt-1">Owned</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-warning">{roamAccepted}</div>
                  <p className="text-xs text-muted-foreground mt-1">Accepted</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary">{roamMitigated}</div>
                  <p className="text-xs text-muted-foreground mt-1">Mitigated</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <TrendingUp className="h-5 w-5" />
              <span>Program Board</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>ROAM Board</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <BarChart3 className="h-5 w-5" />
              <span>Capacity Planning</span>
            </Button>
          </div>

          {/* Recent Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {features?.slice(0, 5).map(feature => (
                  <div key={feature.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{feature.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{feature.epics?.name}</p>
                    </div>
                    <Badge variant={feature.status === 'done' ? 'outline' : 'default'}>
                      {feature.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
