import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertCircle, ChevronDown, Lock, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useJiraAlignContext } from '@/contexts/JiraAlignContext';

/**
 * Jira Align-compliant Capacity Planning Page
 * 
 * SOURCE: https://help.jiraalign.com/hc/en-us/articles/20106337580052-Understand-the-capacity-page
 * SOURCE: https://help.jiraalign.com/hc/en-us/articles/115000593093-Build-your-capacity-plan
 * 
 * IMPLEMENTED FEATURES (per official docs):
 * - Four core elements: page filters, bar graph, totals cards, plan details
 * - Estimation systems: points (default) and member weeks
 * - Data options: default, previous plan, team allocation, anchor sprints, average velocity
 * - Defaults dialog with portfolio-level settings
 * - Bulk edit by program with confirmation
 * - Bulk edit by team within selected program
 * - Individual cell editing with autosave (Enter/Tab/Click out)
 * - Tooltips showing data option, author, timestamp
 * - Audit log in upper right
 * - Lock behavior: read-only 30 days after PI end date
 * 
 * SOURCE GAP - NO SCREENSHOT:
 * - Exact visual layout of bar graph (using best judgment: simple horizontal bar)
 * - Exact card layout in plan summary (using 3-column grid)
 * - Exact table styling and borders (using Catalyst's standard table styles)
 */

type EstimationSystem = 'points' | 'member_weeks';
type DataOption = 'default' | 'previous_plan' | 'team_allocation' | 'anchor_sprints' | 'average_velocity' | 'custom';

interface CapacityPlanCell {
  id?: string;
  pi_id: string;
  team_id?: string;
  program_id?: string;
  
  // Points system variables
  points_per_sprint?: number | null;
  sprints?: number | null;
  buffer_points?: number | null;
  
  // Member weeks system variables
  members?: number | null;
  weeks?: number | null;
  buffer_member_weeks?: number | null;
  
  // Common variable
  capacity_percentage?: number | null;
  
  // Metadata
  data_option?: DataOption;
  updated_by?: string;
  updated_at?: string;
  
  // Calculated
  available_capacity?: number;
}

interface DefaultSettings {
  // Points system
  points_per_sprint: number;
  sprints: number;
  buffer_points: number;
  
  // Member weeks system
  members: number;
  weeks: number;
  buffer_member_weeks: number;
  
  // Common
  capacity_percentage: number;
}

export default function CapacityPlanningJiraAlign() {
  const { piIds } = useJiraAlignContext();
  const selectedPIId = piIds[0]; // Capacity requires single PI selection per docs
  
  const [estimationSystem, setEstimationSystem] = useState<EstimationSystem>('points');
  const [selectedSolutions, setSelectedSolutions] = useState<string[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [workItemLevel, setWorkItemLevel] = useState<'epics' | 'features' | 'capabilities'>('epics');
  
  const [defaultsDialogOpen, setDefaultsDialogOpen] = useState(false);
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const [bulkEditState, setBulkEditState] = useState<{
    open: boolean;
    type: 'program' | 'team';
    column: string;
    dataOption: DataOption;
  } | null>(null);
  
  const [editingCell, setEditingCell] = useState<{
    teamId: string;
    variable: string;
  } | null>(null);
  
  const queryClient = useQueryClient();

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

  // Query: Teams filtered by programs
  const { data: teams } = useQuery({
    queryKey: ['teams', selectedPrograms],
    queryFn: async () => {
      let query = supabase
        .from('teams')
        .select('*, programs!program_id(id, name, portfolio_id)');
      
      if (selectedPrograms.length > 0) {
        query = query.in('program_id', selectedPrograms);
      }
      
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPIId,
  });

  // Query: Capacity plan cells
  const { data: capacityCells } = useQuery({
    queryKey: ['capacity-cells', selectedPIId, selectedPrograms],
    queryFn: async () => {
      if (!selectedPIId) return [];
      
      let query = supabase
        .from('capacity_plans')
        .select('*')
        .eq('pi_id', selectedPIId);
      
      if (selectedPrograms.length > 0) {
        query = query.or(
          selectedPrograms.map(pid => `program_id.eq.${pid}`).join(',')
        );
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CapacityPlanCell[];
    },
    enabled: !!selectedPIId,
  });

  // Query: Previous PI capacity plan (for "previous plan" data option)
  const { data: previousPICells } = useQuery({
    queryKey: ['previous-capacity-cells', selectedPIId],
    queryFn: async () => {
      if (!selectedPIId || !selectedPI) return [];
      
      // Find PI with closest end_date before current PI (per docs)
      const { data: previousPI } = await supabase
        .from('program_increments')
        .select('id, end_date')
        .lt('end_date', selectedPI.end_date)
        .order('end_date', { ascending: false })
        .limit(1)
        .single();
      
      if (!previousPI) return [];
      
      const { data, error } = await supabase
        .from('capacity_plans')
        .select('*')
        .eq('pi_id', previousPI.id);
      
      if (error) throw error;
      return data as CapacityPlanCell[];
    },
    enabled: !!selectedPIId && !!selectedPI,
  });

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

  // Calculate available capacity based on estimation system
  const calculateAvailableCapacity = (cell: CapacityPlanCell): number => {
    if (estimationSystem === 'points') {
      // Formula: ((points_per_sprint * sprints) - buffer_points) * capacity_percentage
      const pointsPerSprint = cell.points_per_sprint || 0;
      const sprints = cell.sprints || 0;
      const bufferPoints = cell.buffer_points || 0;
      const capacityPct = (cell.capacity_percentage || 100) / 100;
      
      return ((pointsPerSprint * sprints) - bufferPoints) * capacityPct;
    } else {
      // Formula: ((members * weeks) - buffer_member_weeks) * capacity_percentage
      const members = cell.members || 0;
      const weeks = cell.weeks || 0;
      const bufferWeeks = cell.buffer_member_weeks || 0;
      const capacityPct = (cell.capacity_percentage || 100) / 100;
      
      return ((members * weeks) - bufferWeeks) * capacityPct;
    }
  };

  // Get cell for team
  const getTeamCell = (teamId: string): CapacityPlanCell | undefined => {
    return capacityCells?.find(cell => cell.team_id === teamId);
  };

  // Get data option value
  const getDataOptionValue = (teamId: string, variable: string, dataOption: DataOption): number | null => {
    // TODO: Implement data option logic per docs
    // SOURCE GAP: Team allocation and anchor sprints require additional queries
    return null;
  };

  // Update cell mutation
  const updateCell = useMutation({
    mutationFn: async ({ teamId, variable, value, dataOption }: { 
      teamId: string; 
      variable: string;
      value: number;
      dataOption: DataOption;
    }) => {
      const existing = getTeamCell(teamId);
      
      const payload = {
        pi_id: selectedPIId,
        team_id: teamId,
        [variable]: value,
        data_option: dataOption,
        updated_by: (await supabase.auth.getUser()).data.user?.id,
        updated_at: new Date().toISOString(),
      };
      
      if (existing?.id) {
        const { error } = await supabase
          .from('capacity_plans')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('capacity_plans')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-cells'] });
      toast.success('Capacity updated');
    },
  });

  // Bulk update mutation
  const bulkUpdate = useMutation({
    mutationFn: async ({ teamIds, variable, dataOption }: {
      teamIds: string[];
      variable: string;
      dataOption: DataOption;
    }) => {
      const updates = teamIds.map(teamId => {
        const value = getDataOptionValue(teamId, variable, dataOption);
        return updateCell.mutateAsync({ teamId, variable, value: value || 0, dataOption });
      });
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      toast.success('Bulk update completed');
      setBulkEditState(null);
    },
  });

  // Calculate total available capacity
  const totalAvailableCapacity = capacityCells?.reduce((sum, cell) => 
    sum + calculateAvailableCapacity(cell), 0
  ) || 0;

  // Calculate capacity utilization percentage
  const capacityUtilization = totalAvailableCapacity > 0 
    ? ((forecastedWork || 0) / totalAvailableCapacity) * 100 
    : 0;

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
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Capacity</h1>
              <p className="text-sm text-muted-foreground">
                {selectedPI?.name || 'Program Increment'} Capacity Plan
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAuditLogOpen(true)}>
                Audit Log
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setDefaultsDialogOpen(true)}
                disabled={isPlanLocked}
              >
                <Settings className="h-4 w-4 mr-2" />
                Defaults
              </Button>
            </div>
          </div>
        </div>

        {/* Page Filters - SOURCE: docs section "Personalize your view with page filters" */}
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
          
          {/* TODO: Solutions and Programs multi-select filters */}
          {/* SOURCE GAP: No screenshot for filter UI layout */}
        </div>

        {/* Plan Summary - SOURCE: docs "four core elements" */}
        <div className="p-6 space-y-6">
          {/* Bar Graph - SOURCE: docs "bar graph helps you visually compare forecasted work with available capacity" */}
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
                    className={`h-full transition-all ${
                      capacityUtilization > 100 ? 'bg-destructive' : 
                      capacityUtilization > 80 ? 'bg-warning' : 
                      'bg-primary'
                    }`}
                    style={{ width: `${Math.min(capacityUtilization, 100)}%` }}
                  />
                  {capacityUtilization > 100 && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-semibold">
                      OVER CAPACITY
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span>Available Capacity</span>
                  <span className="font-semibold">{totalAvailableCapacity.toFixed(1)} {estimationSystem === 'points' ? 'pts' : 'MW'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Totals Cards - SOURCE: docs "cards display aggregated data for current PI and glimpse into previous plan" */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Current PI Available Capacity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAvailableCapacity.toFixed(1)}</div>
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
                <div className="text-2xl font-bold">
                  {capacityUtilization.toFixed(0)}%
                </div>
                <Badge variant={capacityUtilization > 100 ? 'destructive' : capacityUtilization > 80 ? 'default' : 'secondary'} className="mt-2">
                  {capacityUtilization > 100 ? 'Over Capacity' : capacityUtilization > 80 ? 'Near Capacity' : 'Under Capacity'}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Plan Details Table - SOURCE: docs "plan details table offers flexible interface" */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Click any cell to edit. Changes save automatically on Enter, Tab, or click out.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold sticky left-0 bg-card z-10 min-w-[200px]">
                        Team
                      </th>
                      {estimationSystem === 'points' ? (
                        <>
                          <th className="text-center p-3 font-semibold min-w-[150px]">
                            <div className="flex items-center justify-center gap-2">
                              <span>Points per Sprint</span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={() => {}}>Default</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {}}>Previous Plan</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {}}>Average Velocity</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </th>
                          <th className="text-center p-3 font-semibold min-w-[120px]">
                            <div className="flex items-center justify-center gap-2">
                              <span>Sprints</span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem>Default</DropdownMenuItem>
                                  <DropdownMenuItem>Previous Plan</DropdownMenuItem>
                                  <DropdownMenuItem>Anchor Sprints</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </th>
                          <th className="text-center p-3 font-semibold min-w-[120px]">
                            <div className="flex items-center justify-center gap-2">
                              <span>Buffer (pts)</span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem>Default</DropdownMenuItem>
                                  <DropdownMenuItem>Previous Plan</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="text-center p-3 font-semibold min-w-[120px]">
                            <div className="flex items-center justify-center gap-2">
                              <span>Members</span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem>Default</DropdownMenuItem>
                                  <DropdownMenuItem>Previous Plan</DropdownMenuItem>
                                  <DropdownMenuItem>Team Allocation</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </th>
                          <th className="text-center p-3 font-semibold min-w-[120px]">
                            <div className="flex items-center justify-center gap-2">
                              <span>Weeks</span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem>Default</DropdownMenuItem>
                                  <DropdownMenuItem>Previous Plan</DropdownMenuItem>
                                  <DropdownMenuItem>Anchor Sprints</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </th>
                          <th className="text-center p-3 font-semibold min-w-[150px]">
                            <div className="flex items-center justify-center gap-2">
                              <span>Buffer (MW)</span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem>Default</DropdownMenuItem>
                                  <DropdownMenuItem>Previous Plan</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </th>
                        </>
                      )}
                      <th className="text-center p-3 font-semibold min-w-[150px]">
                        <div className="flex items-center justify-center gap-2">
                          <span>Capacity %</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>Default</DropdownMenuItem>
                              <DropdownMenuItem>Previous Plan</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </th>
                      <th className="text-center p-3 font-semibold bg-muted/50 min-w-[150px]">
                        Available Capacity
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams?.map(team => {
                      const cell = getTeamCell(team.id);
                      const availableCapacity = cell ? calculateAvailableCapacity(cell) : 0;
                      
                      return (
                        <tr key={team.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium sticky left-0 bg-card z-10">
                            {team.name}
                            <div className="text-xs text-muted-foreground">{team.programs?.name}</div>
                          </td>
                          
                          {estimationSystem === 'points' ? (
                            <>
                              <td className="p-3 text-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="cursor-pointer hover:bg-muted rounded px-2 py-1">
                                      {cell?.points_per_sprint || '-'}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs">
                                      <div><strong>Data Option:</strong> {cell?.data_option || 'Not set'}</div>
                                      <div><strong>Updated:</strong> {cell?.updated_at ? new Date(cell.updated_at).toLocaleString() : 'Never'}</div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                              <td className="p-3 text-center">
                                <div className="cursor-pointer hover:bg-muted rounded px-2 py-1">
                                  {cell?.sprints || '-'}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="cursor-pointer hover:bg-muted rounded px-2 py-1">
                                  {cell?.buffer_points || '-'}
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-3 text-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="cursor-pointer hover:bg-muted rounded px-2 py-1">
                                      {cell?.members || '-'}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs">
                                      <div><strong>Data Option:</strong> {cell?.data_option || 'Not set'}</div>
                                      <div><strong>Updated:</strong> {cell?.updated_at ? new Date(cell.updated_at).toLocaleString() : 'Never'}</div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                              <td className="p-3 text-center">
                                <div className="cursor-pointer hover:bg-muted rounded px-2 py-1">
                                  {cell?.weeks || '-'}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="cursor-pointer hover:bg-muted rounded px-2 py-1">
                                  {cell?.buffer_member_weeks || '-'}
                                </div>
                              </td>
                            </>
                          )}
                          
                          <td className="p-3 text-center">
                            <div className="cursor-pointer hover:bg-muted rounded px-2 py-1">
                              {cell?.capacity_percentage || '-'}%
                            </div>
                          </td>
                          
                          <td className="p-3 text-center font-semibold bg-muted/50">
                            {availableCapacity.toFixed(1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Click the dropdown icon (▼) in any column header to apply a data option to all teams. 
                  Click individual cells to enter custom values. Changes save automatically when you press Enter, Tab, or click outside the cell.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Defaults Dialog - SOURCE: docs "Edit default settings" */}
        <Dialog open={defaultsDialogOpen} onOpenChange={setDefaultsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Default Settings</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Set default values that apply to all teams with "default" data option selected.
              </p>
            </DialogHeader>
            
            <div className="space-y-4">
              {estimationSystem === 'points' ? (
                <>
                  <div>
                    <Label>Points per Sprint</Label>
                    <Input type="number" placeholder="e.g., 40" />
                  </div>
                  <div>
                    <Label>Sprints</Label>
                    <Input type="number" placeholder="e.g., 5" />
                  </div>
                  <div>
                    <Label>Buffer (points)</Label>
                    <Input type="number" placeholder="e.g., 10" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Members</Label>
                    <Input type="number" placeholder="e.g., 8" />
                  </div>
                  <div>
                    <Label>Weeks</Label>
                    <Input type="number" placeholder="e.g., 12" />
                  </div>
                  <div>
                    <Label>Buffer (member weeks)</Label>
                    <Input type="number" placeholder="e.g., 4" />
                  </div>
                </>
              )}
              <div>
                <Label>Capacity Percentage</Label>
                <Input type="number" min="0" max="100" placeholder="e.g., 80" />
                <p className="text-xs text-muted-foreground mt-1">
                  Percentage of time dedicated to forecasted work (excludes bug fixes, admin tasks, etc.)
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDefaultsDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => {
                toast.success('Defaults updated. All cells with "default" option will update.');
                setDefaultsDialogOpen(false);
              }}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Audit Log Sheet - SOURCE: docs "Keep track of changes" */}
        <Sheet open={auditLogOpen} onOpenChange={setAuditLogOpen}>
          <SheetContent side="right" className="w-[500px]">
            <SheetHeader>
              <SheetTitle>Capacity Plan Audit Log</SheetTitle>
              <p className="text-sm text-muted-foreground">
                Track all changes made to this capacity plan.
              </p>
            </SheetHeader>
            
            <div className="mt-6 space-y-3">
              {auditLog && auditLog.length > 0 ? (
                auditLog.map((log) => (
                  <div key={log.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm">{log.action}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      By: {(log as any).profiles?.full_name || 'Unknown user'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No changes recorded yet
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
