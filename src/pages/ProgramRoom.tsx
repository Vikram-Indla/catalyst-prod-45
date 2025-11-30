import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

export default function ProgramRoom() {
  const { programId } = useParams<{ programId: string }>();

  const { data: program, isLoading } = useQuery({
    queryKey: ['program', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select(`
          id,
          name,
          portfolio_id,
          portfolios (
            name
          )
        `)
        .eq('id', programId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!programId,
  });

  // Fetch recent features for this program
  const { data: features } = useQuery({
    queryKey: ['program-features', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select(`
          id,
          name,
          status,
          health,
          progress_pct,
          estimate_points,
          epics (
            name
          )
        `)
        .eq('program_id', programId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!programId,
  });

  if (!programId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">No program selected</p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-full max-w-md" />
          <Skeleton className="h-4 w-full max-w-lg" />
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-8">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      ) : program ? (
        <>
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Program Room</h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  For {program.name}
                  {program.portfolios && ` · ${program.portfolios.name}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm">Configuration</Button>
                <Button variant="outline" size="sm" className="text-xs sm:text-sm hidden sm:flex">Key Metrics</Button>
                <Button variant="outline" size="sm" className="text-xs sm:text-sm hidden md:flex">Run Meeting</Button>
                <Button variant="outline" size="sm" className="text-xs sm:text-sm hidden lg:flex">Close PI</Button>
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Planning Checklist Card */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="text-3xl font-bold text-primary">40%</div>
                  <div>
                    <CardTitle>Program Increment Planning Checklist</CardTitle>
                    <CardDescription>
                      An optional quick-start guide for Program Increment planning
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                  <div className="p-4 border rounded-lg text-center hover:bg-accent/50 cursor-pointer">
                    <div className="text-sm font-medium mb-1">Plan Feature Backlog</div>
                    <div className="text-xs text-muted-foreground">Manage and Prioritize</div>
                  </div>
                  <div className="p-4 border rounded-lg text-center hover:bg-accent/50 cursor-pointer">
                    <div className="text-sm font-medium mb-1">Plan / Monitor the PI</div>
                    <div className="text-xs text-muted-foreground">Identify Risks</div>
                  </div>
                  <div className="p-4 border rounded-lg text-center hover:bg-accent/50 cursor-pointer">
                    <div className="text-sm font-medium mb-1">Track Progress</div>
                    <div className="text-xs text-muted-foreground">See all Work</div>
                  </div>
                  <div className="p-4 border rounded-lg text-center hover:bg-accent/50 cursor-pointer">
                    <div className="text-sm font-medium mb-1">Optimize - WIP</div>
                    <div className="text-xs text-muted-foreground">Optimize Teams</div>
                  </div>
                  <div className="p-4 border rounded-lg text-center hover:bg-accent/50 cursor-pointer">
                    <div className="text-sm font-medium mb-1">Optimize - Dependencies</div>
                    <div className="text-xs text-muted-foreground">Understand Dependencies</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Iterations Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Iterations
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[23, 24, 25, 26, 27].map((num) => (
                    <div key={num} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50">
                      <div>
                        <div className="font-medium">Sprint {num}</div>
                        <div className="text-sm text-muted-foreground">
                          {Math.floor(Math.random() * 20 + 50)} out of {Math.floor(Math.random() * 20 + 60)} stories accepted
                        </div>
                      </div>
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-success" style={{ width: `${Math.floor(Math.random() * 30 + 60)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="link" className="mt-4">View Program Board</Button>
              </CardContent>
            </Card>

            {/* Runway Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Runway
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Epics</span>
                        <span className="font-medium">Goal: 8M</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Actual: 1.7M</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Capabilities</span>
                        <span className="font-medium">Goal: 6M</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Actual: 0M</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Features</span>
                        <span className="font-medium">Goal: 4M</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Actual: 41.9M</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Stories</span>
                        <span className="font-medium">Goal: 6.5M</span>
                      </div>
                      <div className="text-xs text-muted-foreground">Actual: 29.4S</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Features */}
            {features && features.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {features.map((feature) => (
                      <div
                        key={feature.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{feature.name}</p>
                          {feature.epics && (
                            <p className="text-xs text-muted-foreground truncate">
                              {feature.epics.name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              feature.status === 'done'
                                ? 'default'
                                : feature.status === 'implementing'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {feature.status}
                          </Badge>
                          <div className="w-16 text-right text-sm text-muted-foreground">
                            {feature.progress_pct}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Program not found</p>
        </div>
      )}
    </div>
  );
}
