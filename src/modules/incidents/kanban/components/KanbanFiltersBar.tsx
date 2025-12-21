/**
 * Kanban Filters Bar - Grouped dropdown filters replacing flat chips
 */

import { memo, useMemo } from 'react';
import { ChevronDown, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Incident, SeverityLevel } from '@/types/incident';
import type { GroupByOption, QuickFilterKey } from '../types';
import { GROUP_BY_OPTIONS, getSlaHealth } from '../types';

interface Assignee {
  id: string;
  name: string;
  initials: string;
  count: number;
}

interface KanbanFiltersBarProps {
  incidents: Incident[];
  filteredCount: number;
  showOpenOnly: boolean;
  onShowOpenOnlyChange: (value: boolean) => void;
  groupBy: GroupByOption;
  onGroupByChange: (value: GroupByOption) => void;
  // Filter states
  selectedSeverity: SeverityLevel | null;
  onSeverityChange: (value: SeverityLevel | null) => void;
  selectedStatus: 'breached' | 'at_risk' | null;
  onStatusChange: (value: 'breached' | 'at_risk' | null) => void;
  selectedAssignee: string | null; // 'unassigned' or userId
  onAssigneeChange: (value: string | null) => void;
  onClearFilters: () => void;
}

export const KanbanFiltersBar = memo(function KanbanFiltersBar({
  incidents,
  filteredCount,
  showOpenOnly,
  onShowOpenOnlyChange,
  groupBy,
  onGroupByChange,
  selectedSeverity,
  onSeverityChange,
  selectedStatus,
  onStatusChange,
  selectedAssignee,
  onAssigneeChange,
  onClearFilters,
}: KanbanFiltersBarProps) {
  // Calculate counts
  const stats = useMemo(() => {
    const severityCounts: Record<string, number> = { SEV1: 0, SEV2: 0, SEV3: 0, SEV4: 0 };
    let breachedCount = 0;
    let atRiskCount = 0;
    let unassignedCount = 0;
    const assigneeMap = new Map<string, Assignee>();

    incidents.forEach(inc => {
      // Severity counts
      if (inc.severity && severityCounts[inc.severity] !== undefined) {
        severityCounts[inc.severity]++;
      }
      
      // SLA health
      const health = getSlaHealth(inc);
      if (health === 'breached') breachedCount++;
      if (health === 'at_risk') atRiskCount++;
      
      // Assignee
      if (!inc.assignee_id || !inc.assignee) {
        unassignedCount++;
      } else {
        const existing = assigneeMap.get(inc.assignee_id);
        if (existing) {
          existing.count++;
        } else {
          const name = inc.assignee.full_name;
          assigneeMap.set(inc.assignee_id, {
            id: inc.assignee_id,
            name,
            initials: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
            count: 1,
          });
        }
      }
    });

    return {
      severityCounts,
      breachedCount,
      atRiskCount,
      unassignedCount,
      assignees: Array.from(assigneeMap.values()).sort((a, b) => b.count - a.count).slice(0, 10),
    };
  }, [incidents]);

  const hasActiveFilters = selectedSeverity || selectedStatus || selectedAssignee;

  const getSeverityLabel = (sev: SeverityLevel | null) => {
    if (!sev) return 'All';
    return sev;
  };

  const getStatusLabel = (status: 'breached' | 'at_risk' | null) => {
    if (!status) return 'All';
    return status === 'breached' ? 'Breached' : 'At Risk';
  };

  const getAssigneeLabel = (assigneeId: string | null) => {
    if (!assigneeId) return 'All';
    if (assigneeId === 'unassigned') return 'Unassigned';
    const assignee = stats.assignees.find(a => a.id === assigneeId);
    return assignee?.name || 'Selected';
  };

  return (
    <div className="px-4 sm:px-6 py-3 border-b border-border bg-card">
      <div className="flex flex-wrap items-center gap-3">
        {/* Toggle */}
        <div className="flex items-center gap-2">
          <Switch 
            id="show-open-filter"
            checked={showOpenOnly} 
            onCheckedChange={onShowOpenOnlyChange}
          />
          <Label htmlFor="show-open-filter" className="text-sm text-muted-foreground cursor-pointer">
            Open only
          </Label>
        </div>
        
        <div className="h-6 w-px bg-border" />
        
        {/* Severity Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2">
              <span className="text-muted-foreground">Severity:</span>
              <span className="font-medium">{getSeverityLabel(selectedSeverity)}</span>
              <ChevronDown className="h-3 w-3" />
              {selectedSeverity && stats.severityCounts[selectedSeverity] > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {stats.severityCounts[selectedSeverity]}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-popover">
            <DropdownMenuItem onClick={() => onSeverityChange(null)}>
              All Severities
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {(['SEV1', 'SEV2', 'SEV3', 'SEV4'] as SeverityLevel[]).map(sev => (
              <DropdownMenuItem key={sev} onClick={() => onSeverityChange(sev)}>
                <div className="flex items-center justify-between w-full">
                  <span className={sev === 'SEV1' ? 'text-destructive font-medium' : sev === 'SEV2' ? 'text-amber-600 dark:text-amber-400' : ''}>
                    {sev}
                  </span>
                  <Badge variant="outline" className="ml-2">{stats.severityCounts[sev]}</Badge>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium">{getStatusLabel(selectedStatus)}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-popover">
            <DropdownMenuItem onClick={() => onStatusChange(null)}>
              All Statuses
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onStatusChange('breached')}>
              <div className="flex items-center gap-2 w-full">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span>Breached</span>
                <Badge variant="destructive" className="ml-auto">{stats.breachedCount}</Badge>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange('at_risk')}>
              <div className="flex items-center gap-2 w-full">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span>At Risk</span>
                <Badge variant="outline" className="ml-auto bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">{stats.atRiskCount}</Badge>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Assignee Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2">
              <span className="text-muted-foreground">Assignee:</span>
              <span className="font-medium truncate max-w-[100px]">{getAssigneeLabel(selectedAssignee)}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-popover">
            <DropdownMenuItem onClick={() => onAssigneeChange(null)}>
              All Assignees
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAssigneeChange('unassigned')}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Unassigned</span>
                </div>
                <Badge variant="outline">{stats.unassignedCount}</Badge>
              </div>
            </DropdownMenuItem>
            {stats.assignees.length > 0 && <DropdownMenuSeparator />}
            {stats.assignees.map(assignee => (
              <DropdownMenuItem key={assignee.id} onClick={() => onAssigneeChange(assignee.id)}>
                <div className="flex items-center gap-2 w-full">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">{assignee.initials}</AvatarFallback>
                  </Avatar>
                  <span className="truncate flex-1">{assignee.name}</span>
                  <Badge variant="outline" className="ml-auto">{assignee.count}</Badge>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Group by dropdown */}
        <div className="h-6 w-px bg-border" />
        
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Group:</Label>
          <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupByOption)}>
            <SelectTrigger className="w-[120px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_BY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Clear filters */}
        {hasActiveFilters && (
          <>
            <div className="h-6 w-px bg-border" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearFilters}
              className="h-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </>
        )}
        
        {/* Total count */}
        <div className="ml-auto text-sm text-muted-foreground">
          {filteredCount} incident{filteredCount !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
});

export default KanbanFiltersBar;
