import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ObjectiveDialog } from '@/components/forms/ObjectiveDialog';
import { KeyResultDialog } from '@/components/forms/KeyResultDialog';
import { Target, TrendingUp, Plus, ChevronRight } from 'lucide-react';
import { PermissionGuard } from '@/components/shared/PermissionGuard';

export default function StrategyRoom() {
  const [activeTab, setActiveTab] = useState('portfolio');
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null);
  const [objectiveDialogOpen, setObjectiveDialogOpen] = useState(false);
  const [keyResultDialogOpen, setKeyResultDialogOpen] = useState(false);
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | undefined>();
  const [editingKeyResultId, setEditingKeyResultId] = useState<string | undefined>();

  // Fetch objectives with linked work
  const { data: objectives } = useQuery({
    queryKey: ['objectives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('objectives')
        .select(`
          *,
          objective_levels(name, scope_type),
          objective_theme_links(theme_id, strategic_themes(name)),
          objective_initiative_links(initiative_id, initiatives(name))
        `)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch key results for selected objective
  const { data: keyResults } = useQuery({
    queryKey: ['key-results', selectedObjective],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('key_results')
        .select('*')
        .eq('objective_id', selectedObjective!)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedObjective,
  });

  const getConfidenceBadge = (confidence: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      high: 'default',
      med: 'secondary',
      low: 'destructive',
    };
    return (
      <Badge variant={variants[confidence] || 'secondary'}>
        {confidence}
      </Badge>
    );
  };

  const calculateProgress = (current: number, target: number) => {
    if (!target) return 0;
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Strategy Room</h1>
            <p className="text-sm text-muted-foreground">Objectives and Key Results</p>
          </div>
          <PermissionGuard requiredRole="program_manager" showMessage={false}>
            <Button onClick={() => { setEditingObjectiveId(undefined); setObjectiveDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Objective
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Scope Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b px-6">
          <TabsList>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="program">Program</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="flex-1 m-0">
          <div className="grid grid-cols-12 gap-6 p-6 h-full">
            {/* Left: Objective Tree */}
            <ScrollArea className="col-span-4 border-r pr-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Objectives</h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => { setEditingObjectiveId(undefined); setObjectiveDialogOpen(true); }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {objectives?.filter(obj => obj.objective_levels?.scope_type === activeTab).map(objective => (
                  <div
                    key={objective.id}
                    onClick={() => setSelectedObjective(objective.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedObjective === objective.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted border-transparent'
                    } border`}
                  >
                    <div className="flex items-start gap-2">
                      <Target className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{objective.name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Progress value={objective.progress_pct || 0} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground">{objective.progress_pct || 0}%</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Center: Objective Details */}
            <div className="col-span-5 space-y-4">
              {selectedObjective ? (
                <>
                  {objectives?.filter(o => o.id === selectedObjective).map(objective => (
                    <Card key={objective.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{objective.name}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {objective.objective_levels?.name}
                            </p>
                          </div>
                          {getConfidenceBadge(objective.confidence || 'med')}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Progress</span>
                            <span className="text-sm text-muted-foreground">{objective.progress_pct || 0}%</span>
                          </div>
                          <Progress value={objective.progress_pct || 0} className="h-2" />
                        </div>

                        {objective.start_date && objective.end_date && (
                          <div className="flex justify-between text-sm">
                            <div>
                              <span className="text-muted-foreground">Start: </span>
                              <span className="font-medium">{new Date(objective.start_date).toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">End: </span>
                              <span className="font-medium">{new Date(objective.end_date).toLocaleDateString()}</span>
                            </div>
                          </div>
                        )}

                        <div className="pt-4 border-t space-y-3">
                          <div>
                            <h4 className="font-medium text-sm mb-2">Linked Themes</h4>
                            {objective.objective_theme_links?.length > 0 ? (
                              <div className="space-y-1">
                                {objective.objective_theme_links.map((link: any) => (
                                  <Badge key={link.theme_id} variant="outline" className="mr-1">
                                    {link.strategic_themes?.name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No linked themes</p>
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-sm mb-2">Linked Initiatives</h4>
                            {objective.objective_initiative_links?.length > 0 ? (
                              <div className="space-y-1">
                                {objective.objective_initiative_links.map((link: any) => (
                                  <Badge key={link.initiative_id} variant="secondary" className="mr-1">
                                    {link.initiatives?.name}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No linked initiatives</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Key Results Chart Placeholder */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Trend Chart</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48 flex items-center justify-center border-2 border-dashed rounded text-muted-foreground">
                        Progress trend by PI placeholder
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Select an objective to view details</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Key Results */}
            <ScrollArea className="col-span-3 border-l pl-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Key Results</h3>
                  {selectedObjective && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => { setEditingKeyResultId(undefined); setKeyResultDialogOpen(true); }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {selectedObjective ? (
                  keyResults && keyResults.length > 0 ? (
                    <div className="space-y-3">
                      {keyResults.map(kr => (
                        <Card key={kr.id}>
                          <CardContent className="pt-4">
                            <div className="space-y-3">
                              <p className="font-medium text-sm">{kr.name}</p>
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Current</span>
                                  <span className="font-medium">{kr.current_value || 0}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Target</span>
                                  <span className="font-medium">{kr.target_value || 0}</span>
                                </div>
                                <Progress 
                                  value={calculateProgress(kr.current_value || 0, kr.target_value || 0)} 
                                  className="h-1.5"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No key results defined</p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">Select an objective to view key results</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>

      <ObjectiveDialog
        open={objectiveDialogOpen}
        onClose={() => { setObjectiveDialogOpen(false); setEditingObjectiveId(undefined); }}
        objectiveId={editingObjectiveId}
        scopeType={activeTab as 'company' | 'portfolio' | 'program'}
      />

      <KeyResultDialog
        open={keyResultDialogOpen}
        onClose={() => { setKeyResultDialogOpen(false); setEditingKeyResultId(undefined); }}
        keyResultId={editingKeyResultId}
        objectiveId={selectedObjective || undefined}
      />
    </div>
  );
}
