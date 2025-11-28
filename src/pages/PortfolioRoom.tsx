import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScopeSelector } from '@/components/shared/ScopeSelector';
import { PISelector } from '@/components/shared/PISelector';
import { KPIWidgetCard } from '@/components/shared/KPIWidgetCard';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { PIRoadmapTimeline } from '@/components/shared/PIRoadmapTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, TrendingUp, AlertTriangle, CheckCircle2, Layers, Rocket } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PermissionGuard } from '@/components/shared/PermissionGuard';

export default function PortfolioRoom() {
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [selectedPIs, setSelectedPIs] = useState<string[]>([]);
  const [showSnapshot, setShowSnapshot] = useState(false);

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

  // Calculate KPIs
  const activeThemes = themes?.filter(t => t.status === 'active').length || 0;
  const totalThemes = themes?.length || 0;
  const healthyInitiatives = initiatives?.filter(i => i.status === 'active').length || 0;
  const totalInitiatives = initiatives?.length || 0;

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4 space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Portfolio Room</h1>
            <p className="text-sm text-muted-foreground">Strategic decision cockpit</p>
          </div>
          <PermissionGuard requiredRole="program_manager" showMessage={false}>
            <Button onClick={() => setShowSnapshot(true)}>
              <Target className="h-4 w-4 mr-2" />
              Strategic Snapshot
            </Button>
          </PermissionGuard>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ScopeSelector value={selectedPortfolio} onChange={setSelectedPortfolio} />
            <PISelector 
              portfolioId={selectedPortfolio} 
              value={selectedPIs} 
              onChange={setSelectedPIs}
            />
          </div>
          
          {/* View Tabs */}
          <Tabs defaultValue="execution" className="w-auto">
            <TabsList>
              <TabsTrigger value="financials">Financials</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="execution">Execution</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* 3-Panel Layout */}
      <div className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-hidden min-h-0">
        {/* LEFT PANEL - Strategy */}
        <div className="col-span-3 h-full overflow-hidden">
          <ScrollArea className="h-full">
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
        </div>

        {/* CENTER PANEL - Plan */}
        <div className="col-span-6 h-full overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4 px-2">
              <PIRoadmapTimeline 
                portfolioId={selectedPortfolio} 
                selectedPIs={selectedPIs}
              />

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
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT PANEL - Execution KPIs */}
        <div className="col-span-3 h-full overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4 pr-4">
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
          </ScrollArea>
        </div>
      </div>

      {/* Strategic Snapshot Dialog */}
      <Dialog open={showSnapshot} onOpenChange={setShowSnapshot}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Strategic Snapshot</DialogTitle>
            <DialogDescription>
              Portfolio health and strategic alignment overview
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Themes Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Strategic Themes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{totalThemes}</div>
                      <div className="text-xs text-muted-foreground">Total Themes</div>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{activeThemes}</div>
                      <div className="text-xs text-muted-foreground">Active</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{totalThemes - activeThemes}</div>
                      <div className="text-xs text-muted-foreground">Other</div>
                    </div>
                  </div>
                  <Progress value={(activeThemes / totalThemes) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {Math.round((activeThemes / totalThemes) * 100)}% themes are active
                  </p>
                </CardContent>
              </Card>

              {/* Initiatives Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Initiatives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{totalInitiatives}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center p-3 bg-success/10 rounded-lg">
                      <div className="text-2xl font-bold text-success">{healthyInitiatives}</div>
                      <div className="text-xs text-muted-foreground">Active</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{totalInitiatives - healthyInitiatives}</div>
                      <div className="text-xs text-muted-foreground">At Risk</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Epic Backlog Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Rocket className="h-4 w-4" />
                    Epic Backlog
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {epics?.slice(0, 5).map(epic => (
                      <div key={epic.id} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{epic.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {epic.strategic_themes?.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{epic.status}</Badge>
                          <HealthBadge health={epic.health} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Key Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Theme Progress</span>
                      <span className="text-sm font-medium">{Math.round((activeThemes / totalThemes) * 100)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Initiative Success Rate</span>
                      <span className="text-sm font-medium">{Math.round((healthyInitiatives / totalInitiatives) * 100)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Epics in Backlog</span>
                      <span className="text-sm font-medium">{epics?.length || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
