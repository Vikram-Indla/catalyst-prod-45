import React, { useState, useMemo } from 'react';
import { useResourceUtilization, ResourceUtilizationItem } from '@/hooks/useResourceUtilization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, Users, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
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

function getUtilizationStatus(percent: number) {
  if (percent === 0) return { label: 'Available', color: 'bg-muted text-muted-foreground', variant: 'secondary' as const };
  if (percent <= 80) return { label: 'Healthy', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', variant: 'default' as const };
  if (percent <= 100) return { label: 'At Capacity', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', variant: 'default' as const };
  return { label: 'Over Allocated', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', variant: 'destructive' as const };
}

function getProgressVariant(percent: number): "primary" | "success" | "warning" | "danger" {
  if (percent === 0) return 'primary';
  if (percent <= 80) return 'success';
  if (percent <= 100) return 'warning';
  return 'danger';
}

export default function ResourceUtilization() {
  const { data: resources = [], isLoading, isError } = useResourceUtilization();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
      // Search filter
      const matchesSearch = !searchQuery || 
        resource.resource_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.assignment_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.role_name?.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        const status = getUtilizationStatus(resource.utilization_percent);
        matchesStatus = status.label.toLowerCase().replace(' ', '-') === statusFilter;
      }

      return matchesSearch && matchesStatus && resource.is_active;
    });
  }, [resources, searchQuery, statusFilter]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const activeResources = resources.filter(r => r.is_active);
    const available = activeResources.filter(r => r.utilization_percent === 0).length;
    const healthy = activeResources.filter(r => r.utilization_percent > 0 && r.utilization_percent <= 80).length;
    const atCapacity = activeResources.filter(r => r.utilization_percent > 80 && r.utilization_percent <= 100).length;
    const overAllocated = activeResources.filter(r => r.utilization_percent > 100).length;
    const avgUtilization = activeResources.length > 0 
      ? Math.round(activeResources.reduce((sum, r) => sum + r.utilization_percent, 0) / activeResources.length)
      : 0;

    return { total: activeResources.length, available, healthy, atCapacity, overAllocated, avgUtilization };
  }, [resources]);

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
            View resource allocation across assignments
          </p>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="healthy">Healthy</SelectItem>
                <SelectItem value="at-capacity">At Capacity</SelectItem>
                <SelectItem value="over-allocated">Over Allocated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            Resources ({filteredResources.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Resource Name</TableHead>
                <TableHead className="w-[200px]">Assignment</TableHead>
                <TableHead className="w-[150px]">Role</TableHead>
                <TableHead className="w-[200px]">Utilization</TableHead>
                <TableHead className="w-[120px] text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No resources found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredResources.map((resource) => {
                  const status = getUtilizationStatus(resource.utilization_percent);
                  const progressVariant = getProgressVariant(resource.utilization_percent);
                  
                  return (
                    <TableRow key={resource.id}>
                      <TableCell className="font-medium">{resource.resource_name}</TableCell>
                      <TableCell>
                        {resource.assignment_name ? (
                          <span className="text-foreground">{resource.assignment_name}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {resource.role_name ? (
                          <span className="text-sm">{resource.role_name}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <Progress 
                              value={Math.min(resource.utilization_percent, 100)} 
                              size="lg"
                              variant={progressVariant}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {resource.utilization_percent}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={status.color} variant={status.variant}>
                          {status.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
