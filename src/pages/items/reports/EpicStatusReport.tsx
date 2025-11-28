import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { format } from 'date-fns';

export default function EpicStatusReport() {
  const { epicId } = useParams<{ epicId: string }>();

  const { data: epic, isLoading } = useQuery({
    queryKey: ['epic-status-report', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('epics')
        .select(`
          *,
          strategic_themes(name),
          programs(name),
          features(
            id,
            name,
            status,
            estimate_points
          )
        `)
        .eq('id', epicId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: milestones } = useQuery({
    queryKey: ['epic-milestones', epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .eq('epic_id', epicId)
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Create a simple CSV export
    const content = `Epic Status Report
Epic: ${epic?.name}
Key: ${epic?.epic_key}
State: ${epic?.state}
Health: ${epic?.health}
Theme: ${epic?.strategic_themes?.name || 'N/A'}
Program: ${epic?.programs?.name || 'N/A'}
Features: ${epic?.features?.length || 0}
Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `epic-status-${epic?.epic_key}-${format(new Date(), 'yyyyMMdd')}.txt`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading epic status report...</div>
      </div>
    );
  }

  if (!epic) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Epic not found</div>
      </div>
    );
  }

  const totalFeatures = epic.features?.length || 0;
  const completedFeatures = epic.features?.filter((f: any) => f.status === 'done')?.length || 0;
  const completionPercentage = totalFeatures > 0 ? (completedFeatures / totalFeatures) * 100 : 0;

  const totalPoints = epic.features?.reduce((sum: number, f: any) => sum + (f.estimate_points || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header with Actions */}
        <div className="flex items-center justify-between mb-8 print:hidden">
          <h1 className="text-3xl font-bold">Epic Status Report</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Epic Overview */}
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">{epic.name}</h2>
              <div className="flex items-center gap-3">
                <Badge variant="outline">{epic.epic_key}</Badge>
                <Badge>{epic.state?.replace(/_/g, ' ')}</Badge>
                {epic.health && <HealthBadge health={epic.health as any} />}
              </div>
            </div>
          </div>

          {epic.description && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{epic.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Theme</div>
              <div className="font-medium">{epic.strategic_themes?.name || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Program</div>
              <div className="font-medium">{epic.programs?.name || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Start Date</div>
              <div className="font-medium">
                {epic.start_date ? format(new Date(epic.start_date), 'MMM d, yyyy') : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Target Date</div>
              <div className="font-medium">
                {epic.target_completion_date ? format(new Date(epic.target_completion_date), 'MMM d, yyyy') : 'N/A'}
              </div>
            </div>
          </div>
        </Card>

        {/* Progress Metrics */}
        <Card className="p-6 mb-6">
          <h3 className="font-semibold mb-4">Progress Metrics</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Feature Completion</span>
                <span className="text-sm text-muted-foreground">
                  {completedFeatures} / {totalFeatures} features
                </span>
              </div>
              <Progress value={completionPercentage} />
            </div>

            {epic.estimate && (
              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-1">Estimated Effort</div>
                <div className="text-2xl font-bold">{epic.estimate} points</div>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground mb-1">Total Feature Points</div>
              <div className="text-2xl font-bold">{totalPoints} points</div>
            </div>
          </div>
        </Card>

        {/* Features Breakdown */}
        {epic.features && epic.features.length > 0 && (
          <Card className="p-6 mb-6">
            <h3 className="font-semibold mb-4">Features ({epic.features.length})</h3>
            <div className="space-y-2">
              {epic.features.map((feature: any) => (
                <div key={feature.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{feature.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {feature.estimate_points || 0} points
                    </div>
                  </div>
                  <Badge variant={feature.status === 'done' ? 'default' : 'secondary'}>
                    {feature.status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Milestones */}
        {milestones && milestones.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Milestones ({milestones.length})</h3>
            <div className="space-y-3">
              {milestones.map((milestone: any) => (
                <div key={milestone.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{milestone.title}</div>
                    {milestone.description && (
                      <div className="text-xs text-muted-foreground mt-1">{milestone.description}</div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {milestone.due_date ? format(new Date(milestone.due_date), 'MMM d, yyyy') : 'No date'}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Report Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Report generated on {format(new Date(), 'MMMM d, yyyy • h:mm a')}
        </div>
      </div>
    </div>
  );
}
