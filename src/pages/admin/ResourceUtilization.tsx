import React, { useState, useMemo, useCallback } from 'react';
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
  Lock
} from 'lucide-react';
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
  
  // Track pending changes: { `${resourceId}:${month}`: newValue }
  const [pendingChanges, setPendingChanges] = useState<Map<string, number>>(new Map());

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

  // Handle allocation change
  const handleAllocationChange = useCallback((resourceId: string, month: number, value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0 || numValue > 200) return;
    
    const key = `${resourceId}:${month}`;
    setPendingChanges(prev => {
      const next = new Map(prev);
      next.set(key, numValue);
      return next;
    });
  }, []);

  // Get display value for a cell
  const getDisplayValue = useCallback((resource: ResourceUtilizationItem, month: number): number => {
    const key = `${resource.id}:${month}`;
    if (pendingChanges.has(key)) {
      return pendingChanges.get(key)!;
    }
    const monthData = resource.monthly_allocations.find(m => m.month === month);
    return monthData?.allocation_percent ?? resource.default_capacity_percent;
  }, [pendingChanges]);

  // Save all pending changes
  const handleSaveAll = useCallback(async () => {
    if (pendingChanges.size === 0) return;

    const inputs: SaveAllocationInput[] = [];
    
    pendingChanges.forEach((newPercent, key) => {
      const [resourceId, monthStr] = key.split(':');
      const month = parseInt(monthStr, 10);
      
      const resource = resources.find(r => r.id === resourceId);
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

    if (inputs.length > 0) {
      await bulkSave.mutateAsync(inputs);
      setPendingChanges(new Map());
    }
  }, [pendingChanges, resources, selectedYear, bulkSave]);

  // Check if there are pending changes
  const hasPendingChanges = pendingChanges.size > 0;

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
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Resource</TableHead>
                  <TableHead className="sticky left-[200px] bg-background z-10 min-w-[180px]">Assignment</TableHead>
                  <TableHead className="min-w-[100px]">Contract End</TableHead>
                  {MONTHS.map(m => (
                    <TableHead key={m.num} className="text-center min-w-[70px]">{m.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                      No resources found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResources.map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell className="sticky left-0 bg-background font-medium">
                        {resource.resource_name}
                      </TableCell>
                      <TableCell className="sticky left-[200px] bg-background">
                        {resource.assignment_name ? (
                          <Badge variant="outline" className="font-normal">
                            {resource.assignment_name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">Unassigned</span>
                        )}
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
                      {resource.monthly_allocations.map((monthData) => {
                        const displayValue = getDisplayValue(resource, monthData.month);
                        const isEditable = monthData.is_editable;
                        const key = `${resource.id}:${monthData.month}`;
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
                                    onChange={(e) => handleAllocationChange(resource.id, monthData.month, e.target.value)}
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
                                    <Lock className="h-3 w-3 mr-1" />
                                    {displayValue}
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
                  ))
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
