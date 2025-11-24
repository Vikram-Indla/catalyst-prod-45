import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScopeSelector } from '@/components/shared/ScopeSelector';
import { PISelector } from '@/components/shared/PISelector';
import { KPIWidgetCard } from '@/components/shared/KPIWidgetCard';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, AlertTriangle, CheckCircle2, Layers, Rocket } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function PortfolioRoom() {
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [selectedPIs, setSelectedPIs] = useState<string[]>([]);

  // Fetch themes
  const { data: themes } = useQuery({
    queryKey: ['themes', selectedPIs],
    queryFn: async () => {
      let query = supabase
        .from('strategic_themes')
        .select('*')
        .order('name');
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: selectedPIs.length > 0,
  });

  // Fetch initiatives
  const { data: initiatives } = useQuery({
    queryKey: ['initiatives', selectedPIs],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('initiatives')
        .select('*, strategic_themes(name)')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: selectedPIs.length > 0,
  });

  // Fetch epics for backlog
  const { data: epics } = useQuery({
    queryKey: ['epics', selectedPIs],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select('*, strategic_themes(name)')
        .order('name')
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: selectedPIs.length > 0,
  });

  // Fetch business requests
  const { data: businessRequests } = useQuery({
    queryKey: ['business-requests', selectedPIs],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_requests')
        .select('*, strategic_themes(name)')
        .order('name')
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: selectedPIs.length > 0,
  });

  // Calculate KPIs
  const activeThemes = themes?.filter(t => t.status === 'active').length || 0;
  const totalThemes = themes?.length || 0;
  const healthyInitiatives = initiatives?.filter(i => i.status === 'active').length || 0;
  const totalInitiatives = initiatives?.length || 0;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Portfolio Room</h1>
            <p className="text-sm text-muted-foreground">Strategic decision cockpit</p>
          </div>
          <Button>
            <Target className="h-4 w-4 mr-2" />
            Strategic Snapshot
          </Button>
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

      {/* 3-Panel Layout */}
      <div className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-hidden">
        {/* LEFT PANEL - Strategy */}
        <ScrollArea className="col-span-3 space-y-4">
          <div className="space-y-4 pr-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Theme Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {themes?.slice(0, 5).map(theme => (
                  <div key={theme.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{theme.name}</span>
                      <Badge variant={theme.status === 'active' ? 'default' : 'secondary'}>
                        {theme.status}
                      </Badge>
                    </div>
                    <Progress value={Math.random() * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Initiative Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {initiatives?.slice(0, 6).map(initiative => (
                  <div key={initiative.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{initiative.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {initiative.strategic_themes?.name}
                      </p>
                    </div>
                    <Badge variant={initiative.status === 'active' ? 'default' : 'secondary'}>
                      {initiative.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* CENTER PANEL - Plan */}
        <ScrollArea className="col-span-6">
          <div className="space-y-4 px-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">PI Roadmap Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
                  Timeline visualization placeholder
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Rocket className="h-4 w-4" />
                  Epic Backlog
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {epics?.map(epic => (
                    <div key={epic.id} className="flex items-center gap-3 p-3 rounded border hover:bg-muted/50 cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{epic.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {epic.strategic_themes?.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{epic.status}</Badge>
                        <HealthBadge health={epic.health} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Business Request Backlog</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {businessRequests?.map(br => (
                    <div key={br.id} className="flex items-center gap-3 p-3 rounded border hover:bg-muted/50 cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{br.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {br.strategic_themes?.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">WSJF: {br.wsjf_score || 0}</Badge>
                        <HealthBadge health={br.health} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* RIGHT PANEL - Execution KPIs */}
        <div className="col-span-3 space-y-4">
          <KPIWidgetCard
            title="PI Objectives"
            value={`${activeThemes}/${totalThemes}`}
            subtitle="Active themes"
            icon={CheckCircle2}
            trend="up"
            trendValue="+12% vs last PI"
          />

          <KPIWidgetCard
            title="Dependencies Risk"
            value="8"
            subtitle="High risk dependencies"
            icon={AlertTriangle}
            trend="down"
            trendValue="2 resolved this week"
          />

          <KPIWidgetCard
            title="ROAM Risks"
            value="15"
            subtitle="Active risks"
            icon={Target}
          >
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Resolved</span>
                <span className="font-medium">5</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Owned</span>
                <span className="font-medium">6</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Mitigated</span>
                <span className="font-medium">4</span>
              </div>
            </div>
          </KPIWidgetCard>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Capacity Variance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Planned</span>
                  <span className="font-medium">450 pts</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Forecast</span>
                  <span className="font-medium">420 pts</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Variance</span>
                  <span className="text-destructive font-medium">-30 pts</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Initiative Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-success">● Green</span>
                  <span className="font-medium">{healthyInitiatives}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-warning">● Yellow</span>
                  <span className="font-medium">2</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-destructive">● Red</span>
                  <span className="font-medium">1</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
