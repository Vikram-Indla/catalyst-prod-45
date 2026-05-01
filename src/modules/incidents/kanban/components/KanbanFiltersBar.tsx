/**
 * Kanban Filters Bar - Grouped dropdown filters replacing flat chips
 * DARK MODE COMPLIANT per Design System V2
 */

import { memo, useMemo } from 'react';
import { ChevronDown, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, Lozenge } from '@/components/ads';
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
import { cn } from '@/lib/utils';
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
    <div 
      className={cn(
        "px-4 sm:px-6 py-3",
        "border-b border-[#e8e8e8] dark:border-[#333]",
        "bg-white dark:bg-[var(--ds-surface-raised,#1a1a1a)]"
      )}
    >
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
              <span className="text-[#737373] dark:text-[#a3a3a3]">Severity:</span>
              <span className="font-medium text-[#171717] dark:text-[#fafafa]">{getSeverityLabel(selectedSeverity)}</span>
              <ChevronDown className="h-3 w-3" />
              {selectedSeverity && stats.severityCounts[selectedSeverity] > 0 && (
                <span className="ml-1">
                  <Lozenge appearance="inprogress">
                    {stats.severityCounts[selectedSeverity]}
                  </Lozenge>
                </span>
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
                  <span className={cn(
                    (sev === 'SEV1' || sev === 'SEV2') && 'font-medium',
                    sev === 'SEV1' && 'text-[var(--ds-text-danger,#ef4444)] dark:text-[#f87171]',
                    sev === 'SEV2' && 'text-[var(--ds-text-warning,#f59e0b)] dark:text-[#fbbf24]'
                  )}>
                    {sev}
                  </span>
                  <span className="ml-2">
                    <Lozenge appearance="default">{stats.severityCounts[sev]}</Lozenge>
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2">
              <span className="text-[#737373] dark:text-[#a3a3a3]">Status:</span>
              <span className="font-medium text-[#171717] dark:text-[#fafafa]">{getStatusLabel(selectedStatus)}</span>
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
                <div className="h-2 w-2 rounded-full bg-[var(--ds-text-danger,#ef4444)]" />
                <span>Breached</span>
                <span className="ml-auto">
                  <Lozenge appearance="removed">
                    {stats.breachedCount}
                  </Lozenge>
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange('at_risk')}>
              <div className="flex items-center gap-2 w-full">
                <div className="h-2 w-2 rounded-full bg-[var(--ds-text-warning,#f59e0b)]" />
                <span>At Risk</span>
                <span className="ml-auto">
                  <Lozenge appearance="moved">
                    {stats.atRiskCount}
                  </Lozenge>
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Assignee Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2">
              <span className="text-[#737373] dark:text-[#a3a3a3]">Assignee:</span>
              <span className="font-medium truncate max-w-[100px] text-[#171717] dark:text-[#fafafa]">
                {getAssigneeLabel(selectedAssignee)}
              </span>
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
                <Lozenge appearance="default">{stats.unassignedCount}</Lozenge>
              </div>
            </DropdownMenuItem>
            {stats.assignees.length > 0 && <DropdownMenuSeparator />}
            {stats.assignees.map(assignee => (
              <DropdownMenuItem key={assignee.id} onClick={() => onAssigneeChange(assignee.id)}>
                <div className="flex items-center gap-2 w-full">
                  <Avatar name={assignee.name} size="xxsmall" />
                  <span className="truncate flex-1">{assignee.name}</span>
                  <span className="ml-auto">
                    <Lozenge appearance="default">{assignee.count}</Lozenge>
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Group by dropdown */}
        <div className="h-6 w-px bg-border" />
        
        <div className="flex items-center gap-2">
          <Label className="text-sm text-[#737373] dark:text-[#a3a3a3]">Group:</Label>
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
        <div className="ml-auto text-sm text-[#737373] dark:text-[#a3a3a3]">
          {filteredCount} incident{filteredCount !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
});

export default KanbanFiltersBar;
