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
      <div className="border-b bg-card px-[var(--s4)] sm:px-[var(--s6)] py-[var(--s4)] space-y-[var(--s3)] sm:space-y-[var(--s4)] flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[var(--s3)]">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Portfolio Room</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Strategic decision cockpit</p>
          </div>
          <PermissionGuard requiredRole="program_manager" showMessage={false}>
            <Button onClick={() => setShowSnapshot(true)} size="sm" className="w-full sm:w-auto">
              <Target className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Strategic Snapshot</span>
              <span className="sm:hidden">Snapshot</span>
            </Button>
          </PermissionGuard>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[var(--s3)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-[var(--s2)] sm:gap-[var(--s4)] w-full sm:w-auto">
            <ScopeSelector value={selectedPortfolio} onChange={setSelectedPortfolio} />
            <PISelector 
              portfolioId={selectedPortfolio} 
              value={selectedPIs} 
              onChange={setSelectedPIs}
            />
          </div>
          
          {/* View Tabs */}
          <Tabs defaultValue="execution" className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-3 sm:flex">
              <TabsTrigger value="financials" className="text-xs sm:text-sm">Financials</TabsTrigger>
              <TabsTrigger value="resources" className="text-xs sm:text-sm">Resources</TabsTrigger>
              <TabsTrigger value="execution" className="text-xs sm:text-sm">Execution</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* 3-Panel Layout - Per Catalyst spec: Left (Theme), Center (Epic/Timeline), Right (PI/Program) */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-[var(--s3)] sm:gap-[var(--s4)] p-[var(--s4)] sm:p-[var(--s6)]">
          {/* LEFT PANEL - Theme Program Increment Progress */}
          <div className="lg:col-span-4">
            <Card>
              <CardHeader className="pb-[var(--s3)]">
                <CardTitle className="text-sm font-semibold">Theme Program Increment Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-[var(--s3)] pt-0">
                {themes?.slice(0, 5).map((theme, index) => {
                  const progress = ((index + 1) * 15) % 100; // Deterministic progress
                  return (
                    <div key={theme.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{theme.name}</span>
                        <Badge 
                          variant={theme.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {theme.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground min-w-[3ch]">
                          {progress}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* CENTER PANEL - Program Increment Roadmap */}
          <div className="lg:col-span-5">
            <Card>
              <CardHeader className="pb-[var(--s3)]">
                <CardTitle className="text-sm font-semibold">Program Increment Roadmap</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <PIRoadmapTimeline 
                  portfolioId={selectedPortfolio} 
                  selectedPIs={selectedPIs}
                />
              </CardContent>
            </Card>
          </div>

          {/* RIGHT PANEL - PI Program Increment Progress */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-[var(--s3)]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">PI-5</span>
                  <Badge className="bg-info text-info-foreground text-xs">In Progress</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">83% Complete</div>
              </CardHeader>
              <CardContent className="space-y-[var(--s3)] pt-0">
                <div>
                  <div className="text-xs font-medium mb-2">Program Increment Progress</div>
                  <Progress value={83} className="h-2 mb-1" />
                </div>
                
                {/* Theme percentages - Citation: screenshot image-210.png */}
                <div className="space-y-2 pt-2">
                  {[
                    { name: 'Web', progress: 77 },
                    { name: 'Blockchain', progress: 68 },
                    { name: 'AI', progress: 87 },
                    { name: 'Mobile', progress: 87 },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium">{item.progress}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* BOTTOM - Epic Grid */}
          <div className="lg:col-span-12 mt-0 lg:mt-[var(--s2)]">
            <Card>
              <CardHeader className="pb-[var(--s3)]">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[var(--s3)]">
                  <CardTitle className="text-sm font-semibold">Epic Backlog</CardTitle>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-[var(--s2)] w-full sm:w-auto">
                    <input
                      type="search"
                      placeholder="Search by ID"
                      className="px-3 py-1 text-xs border rounded-md w-full sm:w-40"
                    />
                    <select className="px-2 py-1 text-xs border rounded-md w-full sm:w-auto">
                      <option>All work items</option>
                    </select>
                    <Button variant="link" size="sm" className="text-xs text-primary hidden lg:flex">
                      Don't see the epic you are looking for?
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="border rounded-md overflow-x-auto">
                  <table className="w-full text-xs min-w-[800px]">
                    <thead className="bg-muted/30 border-b">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium">Id</th>
                        <th className="text-left py-2 px-3 font-medium">Ext Id</th>
                        <th className="text-left py-2 px-3 font-medium">Title</th>
                        <th className="text-left py-2 px-3 font-medium">Progress</th>
                        <th className="text-left py-2 px-3 font-medium">Story Points</th>
                        <th className="text-left py-2 px-3 font-medium">Estimated Program Increment Effort</th>
                        <th className="text-left py-2 px-3 font-medium">Capitalized</th>
                      </tr>
                    </thead>
                    <tbody>
                      {epics?.map((epic, index) => {
                        const progress = (index * 7) % 100; // Deterministic progress
                        const storyPoints = epic.estimate ?? (5 + (index * 3) % 15);
                        const piEffort = (100 + (index * 50) % 900);
                        return (
                          <tr key={epic.id} className="border-b hover:bg-muted/30">
                            <td className="py-2 px-3">{4356 - index * 10}</td>
                            <td className="py-2 px-3">-</td>
                            <td className="py-2 px-3">{epic.name}</td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <Progress value={progress} className="h-1.5 w-24" />
                                <span className="text-muted-foreground">{Math.floor(progress)}%</span>
                              </div>
                            </td>
                            <td className="py-2 px-3">{Math.floor(storyPoints)}</td>
                            <td className="py-2 px-3">{piEffort} Pts</td>
                            <td className="py-2 px-3">-</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
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
            <div className="space-y-[var(--s6)]">
              {/* Themes Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-[var(--s2)]">
                    <Layers className="h-4 w-4" />
                    Strategic Themes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-[var(--s4)] mb-[var(--s4)]">
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
