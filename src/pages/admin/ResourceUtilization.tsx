import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  useResourceUtilization, 
  useBulkSaveAllocations, 
  MONTHS,
  ResourceUtilizationItem,
  SaveAllocationInput 
} from '@/hooks/useResourceUtilization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Search, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Save,
  Calendar,
  Lock,
  Plus,
  X,
  Download
} from 'lucide-react';
import { exportUtilizationToExcel } from '@/components/admin/utilization/exportUtilizationToExcel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface NewAssignmentRow {
  tempId: string;
  resourceId: string;
  resourceRid: string | null;
  resourceName: string;
  contractEndDate: string | null;
  defaultCapacityPercent: number;
  assignmentId: string | null;
  monthlyValues: { [month: number]: number };
}

function getUtilizationColor(percent: number): string {
  if (percent === 0) return 'bg-muted';
  if (percent <= 80) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
  if (percent <= 100) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
  return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400';
}

function getInputBorderColor(percent: number): string {
  if (percent === 0) return 'border-muted';
  if (percent <= 80) return 'border-green-300 dark:border-green-700';
  if (percent <= 100) return 'border-yellow-300 dark:border-yellow-700';
  return 'border-red-300 dark:border-red-700';
}

export default function ResourceUtilization() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const { data: resources = [], isLoading, isError, refetch } = useResourceUtilization(selectedYear);
  const bulkSave = useBulkSaveAllocations();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
  
  // Track pending changes: { `${resourceId}:${assignmentId}:${month}`: newValue }
  const [pendingChanges, setPendingChanges] = useState<Map<string, number>>(new Map());
  
  // Track new assignment rows added via plus button
  const [newRows, setNewRows] = useState<NewAssignmentRow[]>([]);
  
  // Fetch all available assignments for dropdown
  const { data: availableAssignments = [] } = useQuery({
    queryKey: ['resource-assignments-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_assignments')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  // Get unique assignments for filter
  const uniqueAssignments = useMemo(() => {
    const assignments = new Set<string>();
    resources.forEach(r => {
      if (r.assignment_name) assignments.add(r.assignment_name);
    });
    return Array.from(assignments).sort();
  }, [resources]);

  // Filter resources
  const filteredResources = useMemo(() => {
    return resources.filter(resource => {
      const matchesSearch = !searchQuery || 
        resource.resource_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.assignment_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.role_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAssignment = assignmentFilter === 'all' || 
        resource.assignment_name === assignmentFilter;

      return matchesSearch && matchesAssignment && resource.is_active;
    });
  }, [resources, searchQuery, assignmentFilter]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const activeResources = resources.filter(r => r.is_active);
    const currentMonth = new Date().getMonth() + 1;
    
    let available = 0, healthy = 0, atCapacity = 0, overAllocated = 0, totalUtilization = 0;
    
    activeResources.forEach(r => {
      const currentAlloc = r.monthly_allocations.find(m => m.month === currentMonth);
      const percent = currentAlloc?.allocation_percent ?? r.default_capacity_percent;
      
      if (percent === 0) available++;
      else if (percent <= 80) healthy++;
      else if (percent <= 100) atCapacity++;
      else overAllocated++;
      
      totalUtilization += percent;
    });

    const avgUtilization = activeResources.length > 0 
      ? Math.round(totalUtilization / activeResources.length)
      : 0;

    return { total: activeResources.length, available, healthy, atCapacity, overAllocated, avgUtilization };
  }, [resources]);

  // Handle allocation change for existing rows
  const handleAllocationChange = useCallback((resourceId: string, assignmentId: string | null, month: number, value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0 || numValue > 200) return;
    
    const key = `${resourceId}:${assignmentId || 'null'}:${month}`;
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.set(key, numValue);
      return next;
    });
  }, []);
  
  // Handle allocation change for new rows
  const handleNewRowAllocationChange = useCallback((tempId: string, month: number, value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0 || numValue > 200) return;
    
    setNewRows(prev => prev.map(row => 
      row.tempId === tempId 
        ? { ...row, monthlyValues: { ...row.monthlyValues, [month]: numValue } }
        : row
    ));
  }, []);
  
  // Add new assignment row for a resource
  const handleAddRow = useCallback((resource: ResourceUtilizationItem) => {
    const tempId = `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const initialMonthlyValues: { [month: number]: number } = {};
    MONTHS.forEach(m => {
      initialMonthlyValues[m.num] = resource.default_capacity_percent;
    });
    
    setNewRows(prev => [...prev, {
      tempId,
      resourceId: resource.id,
      resourceRid: resource.rid,
      resourceName: resource.resource_name,
      contractEndDate: resource.contract_end_date,
      defaultCapacityPercent: resource.default_capacity_percent,
      assignmentId: null,
      monthlyValues: initialMonthlyValues,
    }]);
  }, []);
  
  // Remove new row
  const handleRemoveNewRow = useCallback((tempId: string) => {
    setNewRows(prev => prev.filter(row => row.tempId !== tempId));
  }, []);
  
  // Update assignment selection for new row
  const handleNewRowAssignmentChange = useCallback((tempId: string, assignmentId: string) => {
    setNewRows(prev => prev.map(row => 
      row.tempId === tempId 
        ? { ...row, assignmentId }
        : row
    ));
  }, []);
  
  // Check if month is editable for new rows
  const isMonthEditableForNewRow = useCallback((contractEndDate: string | null, month: number): boolean => {
    if (!contractEndDate) return true;
    const contractEnd = new Date(contractEndDate);
    const monthStart = new Date(selectedYear, month - 1, 1);
    return contractEnd >= monthStart;
  }, [selectedYear]);

  // Get display value for a cell
  const getDisplayValue = useCallback((resource: ResourceUtilizationItem, month: number): number => {
    const key = `${resource.id}:${resource.assignment_id || 'null'}:${month}`;
    if (pendingChanges.has(key)) {
      return pendingChanges.get(key)!;
    }
    const monthData = resource.monthly_allocations.find(m => m.month === month);
    return monthData?.allocation_percent ?? resource.default_capacity_percent;
  }, [pendingChanges]);

  // Save all pending changes including new rows
  const handleSaveAll = useCallback(async () => {
    const inputs: SaveAllocationInput[] = [];
    
    // Process pending changes for existing rows
    pendingChanges.forEach((newPercent, key) => {
      const parts = key.split(':');
      const resourceId = parts[0];
      const assignmentIdStr = parts[1];
      const month = parseInt(parts[2], 10);
      
      const assignmentId = assignmentIdStr === 'null' ? null : assignmentIdStr;
      
      const resource = resources.find(r => r.id === resourceId && r.assignment_id === assignmentId);
      if (!resource || !resource.assignment_id) return;
      
      const monthData = resource.monthly_allocations.find(m => m.month === month);
      
      inputs.push({
        resource_id: resourceId,
        assignment_id: resource.assignment_id,
        month,
        year: selectedYear,
        allocation_percent: newPercent,
        existing_allocation_id: monthData?.allocation_id ?? null,
      });
    });
    
    // Process new rows
    newRows.forEach(row => {
      if (!row.assignmentId) return; // Skip rows without assignment selected
      
      MONTHS.forEach(m => {
        const isEditable = isMonthEditableForNewRow(row.contractEndDate, m.num);
        if (!isEditable) return;
        
        inputs.push({
          resource_id: row.resourceId,
          assignment_id: row.assignmentId!,
          month: m.num,
          year: selectedYear,
          allocation_percent: row.monthlyValues[m.num] ?? row.defaultCapacityPercent,
          existing_allocation_id: null,
        });
      });
    });

    if (inputs.length > 0) {
      await bulkSave.mutateAsync(inputs);
      setPendingChanges(new Map());
      setNewRows([]);
    }
  }, [pendingChanges, resources, selectedYear, bulkSave, newRows, isMonthEditableForNewRow]);

  // Check if there are pending changes (including new rows with assignments)
  const hasPendingChanges = pendingChanges.size > 0 || newRows.some(r => r.assignmentId !== null);

  // Format contract end date
  const formatContractEnd = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded" />)}
          </div>
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="text-destructive">Failed to load resource utilization data</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Resource Utilization</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage monthly resource allocation across assignments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[120px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline"
            className="gap-2"
            onClick={() => {
              try {
                exportUtilizationToExcel(resources, selectedYear);
                toast.success('Excel file downloaded');
              } catch (error) {
                toast.error('No data to export');
              }
            }}
          >
            <Download className="h-4 w-4" />
            Download Excel
          </Button>
          <Button 
            onClick={handleSaveAll} 
            disabled={!hasPendingChanges || bulkSave.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {bulkSave.isPending ? 'Saving...' : `Save Changes${hasPendingChanges ? ` (${pendingChanges.size})` : ''}`}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Resources</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.healthy}</p>
                <p className="text-xs text-muted-foreground">Healthy (1-80%)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.atCapacity}</p>
                <p className="text-xs text-muted-foreground">At Capacity (81-100%)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overAllocated}</p>
                <p className="text-xs text-muted-foreground">Over Allocated (&gt;100%)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgUtilization}%</p>
                <p className="text-xs text-muted-foreground">Avg Utilization</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, assignment, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignments</SelectItem>
                {uniqueAssignments.map(assignment => (
                  <SelectItem key={assignment} value={assignment}>{assignment}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table with Monthly Columns */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              Resources ({filteredResources.length})
            </CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900" /> 1-80%
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-900" /> 81-100%
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-200 dark:bg-red-900" /> &gt;100%
              </span>
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" /> Contract Ended
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[70px]">RID</TableHead>
                  <TableHead className="sticky left-[70px] bg-background z-10 min-w-[200px]">Resource</TableHead>
                  <TableHead className="min-w-[50px]">DID</TableHead>
                  <TableHead className="min-w-[50px]">AID</TableHead>
                  <TableHead className="sticky left-[270px] bg-background z-10 min-w-[150px]">Assignment</TableHead>
                  <TableHead className="min-w-[50px]">VID</TableHead>
                  <TableHead className="min-w-[100px]">Contract End</TableHead>
                  <TableHead className="min-w-[50px] text-center">Add</TableHead>
                  {MONTHS.map(m => (
                    <TableHead key={m.num} className="text-center min-w-[70px]">{m.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResources.length === 0 && newRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={20} className="text-center py-8 text-muted-foreground">
                      No resources found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {filteredResources.map((resource) => {
                      // Get new rows for this resource
                      const resourceNewRows = newRows.filter(r => r.resourceId === resource.id);
                      
                      return (
                        <React.Fragment key={resource.id}>
                        <TableRow>
                            <TableCell className="sticky left-0 bg-background font-mono text-sm text-muted-foreground">
                              {resource.rid || '—'}
                            </TableCell>
                            <TableCell className="sticky left-[70px] bg-background font-medium">
                              {resource.resource_name}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-mono text-primary">{resource.did || '—'}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-mono text-primary">{resource.aid || '—'}</span>
                            </TableCell>
                            <TableCell className="sticky left-[270px] bg-background">
                              {resource.assignment_name ? (
                                <Badge variant="outline" className="font-normal">
                                  {resource.assignment_name}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground italic text-sm">Unassigned</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-mono text-primary">{resource.vid || '—'}</span>
                            </TableCell>
                            <TableCell>
                              {resource.contract_end_date ? (
                                <span className="text-sm text-muted-foreground">
                                  {formatContractEnd(resource.contract_end_date)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleAddRow(resource)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Add another assignment for {resource.resource_name}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            {resource.monthly_allocations.map((monthData) => {
                              const displayValue = getDisplayValue(resource, monthData.month);
                              const isEditable = monthData.is_editable;
                              const key = `${resource.id}:${resource.assignment_id || 'null'}:${monthData.month}`;
                              const hasChange = pendingChanges.has(key);
                              
                              return (
                                <TableCell key={monthData.month} className="p-1">
                                  {isEditable ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Input
                                          type="number"
                                          min={0}
                                          max={200}
                                          value={displayValue}
                                          onChange={(e) => handleAllocationChange(resource.id, resource.assignment_id, monthData.month, e.target.value)}
                                          className={cn(
                                            "w-16 h-8 text-center text-sm p-1",
                                            getInputBorderColor(displayValue),
                                            hasChange && "ring-2 ring-primary ring-offset-1"
                                          )}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Utilization % for {MONTHS[monthData.month - 1].name} {selectedYear}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className={cn(
                                          "w-16 h-8 flex items-center justify-center text-sm rounded border bg-muted/50 cursor-not-allowed",
                                          "text-muted-foreground"
                                        )}>
                                          <Lock className="h-4 w-4" />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>
                                          {!resource.assignment_id 
                                            ? 'No assignment - cannot set allocation'
                                            : `Contract ends ${formatContractEnd(resource.contract_end_date)}`
                                          }
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                          
                          {/* Render new assignment rows for this resource */}
                          {resourceNewRows.map((newRow) => {
                            // Get assignments already used by this resource
                            const usedAssignmentIds = new Set<string>();
                            if (resource.assignment_id) usedAssignmentIds.add(resource.assignment_id);
                            resourceNewRows.forEach(r => {
                              if (r.assignmentId && r.tempId !== newRow.tempId) {
                                usedAssignmentIds.add(r.assignmentId);
                              }
                            });
                            
                            // Filter available assignments
                            const selectableAssignments = availableAssignments.filter(
                              a => !usedAssignmentIds.has(a.id) || a.id === newRow.assignmentId
                            );
                            
                            return (
                              <TableRow key={newRow.tempId} className="bg-accent/30">
                                <TableCell className="sticky left-0 bg-accent/30 font-mono text-sm text-muted-foreground">
                                  {newRow.resourceRid || '—'}
                                </TableCell>
                                <TableCell className="sticky left-[70px] bg-accent/30 font-medium text-muted-foreground">
                                  {newRow.resourceName}
                                </TableCell>
                                <TableCell className="sticky left-[270px] bg-accent/30">
                                  <Select
                                    value={newRow.assignmentId || ''}
                                    onValueChange={(value) => handleNewRowAssignmentChange(newRow.tempId, value)}
                                  >
                                    <SelectTrigger className="w-[160px] h-8">
                                      <SelectValue placeholder="Select assignment..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {selectableAssignments.map(assignment => (
                                        <SelectItem key={assignment.id} value={assignment.id}>
                                          {assignment.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  {newRow.contractEndDate ? (
                                    <span className="text-sm text-muted-foreground">
                                      {formatContractEnd(newRow.contractEndDate)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={() => handleRemoveNewRow(newRow.tempId)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Remove this row</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TableCell>
                                {MONTHS.map((m) => {
                                  const isEditable = isMonthEditableForNewRow(newRow.contractEndDate, m.num) && newRow.assignmentId !== null;
                                  const displayValue = newRow.monthlyValues[m.num] ?? newRow.defaultCapacityPercent;
                                  
                                  return (
                                    <TableCell key={m.num} className="p-1">
                                      {isEditable ? (
                                        <Input
                                          type="number"
                                          min={0}
                                          max={200}
                                          value={displayValue}
                                          onChange={(e) => handleNewRowAllocationChange(newRow.tempId, m.num, e.target.value)}
                                          className={cn(
                                            "w-16 h-8 text-center text-sm p-1",
                                            getInputBorderColor(displayValue),
                                            "ring-2 ring-accent ring-offset-1"
                                          )}
                                        />
                                      ) : (
                                        <div className={cn(
                                          "w-16 h-8 flex items-center justify-center text-sm rounded border bg-muted/50 cursor-not-allowed",
                                          "text-muted-foreground"
                                        )}>
                                          <Lock className="h-4 w-4" />
                                        </div>
                                      )}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </>
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
