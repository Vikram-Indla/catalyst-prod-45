import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function EpicStatusReport() {
  const { epicId } = useParams();
  const navigate = useNavigate();

  const { data: epic } = useQuery({
    queryKey: ['epic', epicId],
    queryFn: async () => {
      const { data } = await supabase
        .from('epics')
        .select('*, strategic_themes(name), programs(name), epic_spend(budget)')
        .eq('id', epicId!)
        .single();
      return data;
    },
    enabled: !!epicId,
  });

  if (!epic) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/items/epics')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Epic Status Report</h1>
              <p className="text-sm text-muted-foreground">{epic.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Theme</div>
                  <div className="font-medium">{epic.strategic_themes?.name || 'None'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Primary Program</div>
                  <div className="font-medium">{epic.programs?.name || 'None'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">State</div>
                  <Badge>{epic.state || 'New'}</Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Health</div>
                  <HealthBadge health={epic.health} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Initiation Date</div>
                  <div className="text-sm">
                    {epic.initiation_date
                      ? new Date(epic.initiation_date).toLocaleDateString()
                      : 'Not set'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Target Completion</div>
                  <div className="text-sm">
                    {epic.target_completion_date
                      ? new Date(epic.target_completion_date).toLocaleDateString()
                      : 'Not set'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge variant={epic.health === 'green' ? 'default' : 'destructive'}>
                    {epic.health === 'green' ? 'On Track' : 'At Risk'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Budget */}
          <Card>
            <CardHeader>
              <CardTitle>Budget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Budget</div>
                  <div className="text-lg font-bold">
                    ${(epic.epic_spend?.budget || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Capitalized</div>
                  <Badge variant={epic.capitalized ? 'default' : 'secondary'}>
                    {epic.capitalized ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Overall Completion</span>
                  <span className="font-medium">0%</span>
                </div>
                <Progress value={0} />
              </div>
              <div className="text-sm text-muted-foreground">
                No child items tracked yet
              </div>
            </CardContent>
          </Card>

          {/* Risks & Dependencies */}
          <Card>
            <CardHeader>
              <CardTitle>Risks & Dependencies</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No risks or dependencies identified
              </p>
            </CardContent>
          </Card>

          {/* Objectives */}
          <Card>
            <CardHeader>
              <CardTitle>Associated Objectives</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No objectives linked
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
