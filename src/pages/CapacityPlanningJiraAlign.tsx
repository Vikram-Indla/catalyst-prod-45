import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Lock, Settings } from 'lucide-react';
import { useJiraAlignContext } from '@/contexts/JiraAlignContext';

/**
 * Catalyst-compliant Capacity Planning Page
 * 
 * NOTE: The capacity_plans table has been removed as unused.
 * This page now provides a simplified view pointing users to the main Capacity Planner.
 */

type EstimationSystem = 'points' | 'member_weeks';

export default function CapacityPlanningJiraAlign() {
  const { piIds } = useJiraAlignContext();
  const selectedPIId = piIds[0]; // Capacity requires single PI selection per docs
  
  const [estimationSystem, setEstimationSystem] = useState<EstimationSystem>('points');
  const [workItemLevel, setWorkItemLevel] = useState<'epics' | 'features' | 'capabilities'>('epics');
  const [auditLogOpen, setAuditLogOpen] = useState(false);

  // Query: Selected PI details
  const { data: selectedPI } = useQuery({
    queryKey: ['program-increment', selectedPIId],
    queryFn: async () => {
      if (!selectedPIId) return null;
      const { data, error } = await supabase
        .from('program_increments')
        .select('*')
        .eq('id', selectedPIId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPIId,
  });

  // Check if plan is locked (30 days after PI end date)
  const isPlanLocked = selectedPI ? 
    new Date() > new Date(new Date(selectedPI.end_date).getTime() + 30 * 24 * 60 * 60 * 1000) : 
    false;

  // Query: Audit log
  const { data: auditLog } = useQuery({
    queryKey: ['capacity-audit-log', selectedPIId],
    queryFn: async () => {
      if (!selectedPIId) return [];
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, profiles(full_name)')
        .eq('entity_type', 'capacity_plans')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPIId,
  });

  // Query: Forecasted work (to compare against capacity)
  const { data: forecastedWork } = useQuery({
    queryKey: ['forecasted-work', selectedPIId, workItemLevel],
    queryFn: async () => {
      if (!selectedPIId) return 0;
      
      const { data, error } = await supabase
        .from('forecast_entries')
        .select('estimate')
        .eq('pi_id', selectedPIId)
        .eq('work_item_type', workItemLevel === 'epics' ? 'epic' : workItemLevel === 'features' ? 'feature' : 'capability')
        .eq('in_scope', true);
      
      if (error) throw error;
      return data.reduce((sum, entry) => sum + (entry.estimate || 0), 0);
    },
    enabled: !!selectedPIId,
  });

  if (!selectedPIId) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a single Program Increment from the sidebar to view the capacity plan.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-background">
        {/* Lock Warning */}
        {isPlanLocked && (
          <Alert className="border-destructive bg-destructive/10 rounded-none">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              This capacity plan is locked (read-only) because it is more than 30 days past the PI end date.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="h-[72px] border-b bg-card px-6 flex items-center">
          <div className="flex items-center justify-between w-full">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate">Capacity</h1>
              <p className="text-sm text-muted-foreground truncate">
                {selectedPI?.name || 'Program Increment'} Capacity Plan
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" onClick={() => setAuditLogOpen(true)}>
                Audit Log
              </Button>
              <Button 
                variant="outline" 
                disabled={isPlanLocked}
              >
                <Settings className="h-4 w-4 mr-2" />
                Defaults
              </Button>
            </div>
          </div>
        </div>

        {/* Page Filters */}
        <div className="border-b bg-card px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label>Estimation:</Label>
            <Select value={estimationSystem} onValueChange={(v) => setEstimationSystem(v as EstimationSystem)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="points">Points</SelectItem>
                <SelectItem value="member_weeks">Member Weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Label>Work Item Level:</Label>
            <Select value={workItemLevel} onValueChange={(v) => setWorkItemLevel(v as any)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="epics">Epics</SelectItem>
                <SelectItem value="features">Features</SelectItem>
                <SelectItem value="capabilities">Capabilities</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Plan Summary */}
        <div className="p-6 space-y-6">
          {/* Bar Graph */}
          <Card>
            <CardHeader>
              <CardTitle>Capacity Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Forecasted Work</span>
                  <span className="font-semibold">{forecastedWork || 0} {estimationSystem === 'points' ? 'pts' : 'MW'}</span>
                </div>
                <div className="h-8 bg-muted rounded-full overflow-hidden relative">
                  <div 
                    className="h-full transition-all bg-primary"
                    style={{ width: '0%' }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span>Available Capacity</span>
                  <span className="font-semibold">- {estimationSystem === 'points' ? 'pts' : 'MW'}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Note: Capacity planning has been consolidated into the main Capacity Planner module. 
                Use the resource allocation features there for detailed capacity management.
              </p>
            </CardContent>
          </Card>

          {/* Totals Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Current PI Available Capacity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {estimationSystem === 'points' ? 'Story Points' : 'Member Weeks'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Forecasted Work</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{forecastedWork || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {estimationSystem === 'points' ? 'Story Points' : 'Member Weeks'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Capacity Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Percentage of capacity used
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Info Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Capacity Planning Note:</p>
                  <p>
                    The detailed capacity planning features have been consolidated into the main Capacity Planner module
                    located at Enterprise → Strategy Room → Capacity. Use that module for:
                  </p>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Resource inventory management</li>
                    <li>Allocation booking and tracking</li>
                    <li>Department-based capacity views</li>
                    <li>AI-powered recommendations</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Log Sheet */}
        <Sheet open={auditLogOpen} onOpenChange={setAuditLogOpen}>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Capacity Plan Audit Log</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {auditLog?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audit log entries found.</p>
              ) : (
                auditLog?.map((entry) => (
                  <div key={entry.id} className="border-b pb-3">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium">{entry.action}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      by {(entry.profiles as any)?.full_name || 'Unknown'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
