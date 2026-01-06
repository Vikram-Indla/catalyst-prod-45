/**
 * DefectFiltersPanel - Advanced filtering for defects
 * Collapsible panel with quick filters and advanced options
 */

import React, { useState } from 'react';
import {
  Filter,
  X,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  Tag,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { DefectSeverity, DefectPriority, DefectWorkflowStatus } from '../../types/defects';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DefectFilters {
  statuses: DefectWorkflowStatus[];
  severities: DefectSeverity[];
  priorities: DefectPriority[];
  assigneeId: string | null;
  reporterId: string | null;
  dateRange: 'all' | '7' | '30' | '90';
  environment: string | null;
  component: string | null;
  hasExternalLink: boolean | null;
  showMineOnly: boolean;
}

export interface DefectFiltersPanelProps {
  filters: DefectFilters;
  onFiltersChange: (filters: DefectFilters) => void;
  users?: Array<{ id: string; full_name: string; avatar_url?: string }>;
  environments?: string[];
  components?: string[];
  onClearAll: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_OPTIONS: { value: DefectSeverity; label: string; color: string }[] = [
  { value: 'blocker', label: 'Blocker', color: 'bg-destructive' },
  { value: 'critical', label: 'Critical', color: 'bg-orange-500' },
  { value: 'major', label: 'Major', color: 'bg-amber-500' },
  { value: 'minor', label: 'Minor', color: 'bg-blue-500' },
  { value: 'trivial', label: 'Trivial', color: 'bg-muted-foreground' },
];

const PRIORITY_OPTIONS: { value: DefectPriority; label: string }[] = [
  { value: 'P1', label: 'P1 - Critical' },
  { value: 'P2', label: 'P2 - High' },
  { value: 'P3', label: 'P3 - Medium' },
  { value: 'P4', label: 'P4 - Low' },
  { value: 'P5', label: 'P5 - Trivial' },
];

const STATUS_OPTIONS: { value: DefectWorkflowStatus; label: string; group: string }[] = [
  { value: 'new', label: 'New', group: 'Open' },
  { value: 'open', label: 'Open', group: 'Open' },
  { value: 'in_progress', label: 'In Progress', group: 'Active' },
  { value: 'in_review', label: 'In Review', group: 'Active' },
  { value: 'resolved', label: 'Resolved', group: 'Resolved' },
  { value: 'closed', label: 'Closed', group: 'Closed' },
  { value: 'wont_fix', label: "Won't Fix", group: 'Closed' },
  { value: 'deferred', label: 'Deferred', group: 'Closed' },
  { value: 'reopened', label: 'Reopened', group: 'Open' },
];

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DefectFiltersPanel({
  filters,
  onFiltersChange,
  users = [],
  environments = [],
  components = [],
  onClearAll,
}: DefectFiltersPanelProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['status', 'severity', 'priority'])
  );

  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const toggleArrayFilter = <T extends string>(
    key: 'statuses' | 'severities' | 'priorities',
    value: T
  ) => {
    const current = filters[key] as T[];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [key]: updated });
  };

  const activeFilterCount = 
    filters.statuses.length +
    filters.severities.length +
    filters.priorities.length +
    (filters.assigneeId ? 1 : 0) +
    (filters.reporterId ? 1 : 0) +
    (filters.dateRange !== 'all' ? 1 : 0) +
    (filters.environment ? 1 : 0) +
    (filters.component ? 1 : 0) +
    (filters.hasExternalLink !== null ? 1 : 0) +
    (filters.showMineOnly ? 1 : 0);

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="font-medium text-sm">Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClearAll}>
            Clear
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {/* Quick Filters */}
          <div className="space-y-2 pb-3 border-b">
            <div className="flex items-center gap-2">
              <Checkbox
                id="mine-only"
                checked={filters.showMineOnly}
                onCheckedChange={(checked) =>
                  onFiltersChange({ ...filters, showMineOnly: !!checked })
                }
              />
              <Label htmlFor="mine-only" className="text-sm cursor-pointer">
                Assigned to me
              </Label>
            </div>
          </div>

          {/* Status Section */}
          <Collapsible open={openSections.has('status')} onOpenChange={() => toggleSection('status')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-md">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Status</span>
                {filters.statuses.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    {filters.statuses.length}
                  </Badge>
                )}
              </div>
              {openSections.has('status') ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 pl-6 space-y-1.5">
              {STATUS_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${option.value}`}
                    checked={filters.statuses.includes(option.value)}
                    onCheckedChange={() => toggleArrayFilter('statuses', option.value)}
                  />
                  <Label
                    htmlFor={`status-${option.value}`}
                    className="text-xs cursor-pointer flex-1"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Severity Section */}
          <Collapsible open={openSections.has('severity')} onOpenChange={() => toggleSection('severity')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-md">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Severity</span>
                {filters.severities.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    {filters.severities.length}
                  </Badge>
                )}
              </div>
              {openSections.has('severity') ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 pl-6 space-y-1.5">
              {SEVERITY_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`severity-${option.value}`}
                    checked={filters.severities.includes(option.value)}
                    onCheckedChange={() => toggleArrayFilter('severities', option.value)}
                  />
                  <div className={cn("w-2 h-2 rounded-full", option.color)} />
                  <Label
                    htmlFor={`severity-${option.value}`}
                    className="text-xs cursor-pointer flex-1"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Priority Section */}
          <Collapsible open={openSections.has('priority')} onOpenChange={() => toggleSection('priority')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-md">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Priority</span>
                {filters.priorities.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    {filters.priorities.length}
                  </Badge>
                )}
              </div>
              {openSections.has('priority') ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 pl-6 space-y-1.5">
              {PRIORITY_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`priority-${option.value}`}
                    checked={filters.priorities.includes(option.value)}
                    onCheckedChange={() => toggleArrayFilter('priorities', option.value)}
                  />
                  <Label
                    htmlFor={`priority-${option.value}`}
                    className="text-xs cursor-pointer flex-1"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Assignee Section */}
          <Collapsible open={openSections.has('assignee')} onOpenChange={() => toggleSection('assignee')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-md">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Assignee</span>
                {filters.assigneeId && (
                  <Badge variant="secondary" className="text-[10px] px-1.5">1</Badge>
                )}
              </div>
              {openSections.has('assignee') ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 pl-6">
              <Select
                value={filters.assigneeId || 'all'}
                onValueChange={(v) =>
                  onFiltersChange({ ...filters, assigneeId: v === 'all' ? null : v })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignees</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CollapsibleContent>
          </Collapsible>

          {/* Date Range Section */}
          <Collapsible open={openSections.has('date')} onOpenChange={() => toggleSection('date')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-md">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Date Range</span>
                {filters.dateRange !== 'all' && (
                  <Badge variant="secondary" className="text-[10px] px-1.5">1</Badge>
                )}
              </div>
              {openSections.has('date') ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 pl-6">
              <Select
                value={filters.dateRange}
                onValueChange={(v) =>
                  onFiltersChange({ ...filters, dateRange: v as DefectFilters['dateRange'] })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CollapsibleContent>
          </Collapsible>

          {/* Environment Section - only if environments exist */}
          {environments.length > 0 && (
            <Collapsible open={openSections.has('environment')} onOpenChange={() => toggleSection('environment')}>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-md">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Environment</span>
                  {filters.environment && (
                    <Badge variant="secondary" className="text-[10px] px-1.5">1</Badge>
                  )}
                </div>
                {openSections.has('environment') ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 pl-6">
                <Select
                  value={filters.environment || 'all'}
                  onValueChange={(v) =>
                    onFiltersChange({ ...filters, environment: v === 'all' ? null : v })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All environments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All environments</SelectItem>
                    {environments.map((env) => (
                      <SelectItem key={env} value={env}>
                        {env}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Default filters
export const DEFAULT_DEFECT_FILTERS: DefectFilters = {
  statuses: [],
  severities: [],
  priorities: [],
  assigneeId: null,
  reporterId: null,
  dateRange: 'all',
  environment: null,
  component: null,
  hasExternalLink: null,
  showMineOnly: false,
};
