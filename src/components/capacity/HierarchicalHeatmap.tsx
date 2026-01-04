/**
 * Prompt 4: Hierarchical Heatmap View
 * Bird's-eye view with drill-down for 200+ resources
 */

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Users, Building2, Briefcase, User } from 'lucide-react';
import { format, startOfWeek, addWeeks, eachWeekOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ResourceMetric {
  id: string;
  name: string;
  role?: string;
  department?: string;
  allocation?: number;
}

interface ResourceAllocation {
  profile_id?: string;
  assignment_name?: string;
  allocation_percent: number;
  start_date: string;
  end_date: string;
}

interface HierarchyNode {
  id: string;
  label: string;
  type: 'organization' | 'department' | 'role' | 'resource';
  resourceCount: number;
  children?: HierarchyNode[];
  monthlyUtilization: number[];
  resource?: ResourceMetric;
}

interface HierarchicalHeatmapProps {
  resources: ResourceMetric[];
  allocations: ResourceAllocation[];
  weeksToShow?: number;
  className?: string;
}

export function HierarchicalHeatmap({
  resources,
  allocations,
  weeksToShow = 12,
  className
}: HierarchicalHeatmapProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['organization']));

  // Generate weeks
  const weeks = useMemo(() => {
    const start = startOfWeek(new Date());
    const end = addWeeks(start, weeksToShow);
    return eachWeekOfInterval({ start, end });
  }, [weeksToShow]);

  // Build hierarchy: Organization > Department > Role > Resource
  const hierarchy = useMemo(() => {
    const deptMap = new Map<string, Map<string, ResourceMetric[]>>();

    resources.forEach(resource => {
      const dept = resource.department || 'Unassigned';
      const role = resource.role || 'Unspecified';

      if (!deptMap.has(dept)) {
        deptMap.set(dept, new Map());
      }
      const roleMap = deptMap.get(dept)!;
      if (!roleMap.has(role)) {
        roleMap.set(role, []);
      }
      roleMap.get(role)!.push(resource);
    });

    // Calculate utilization for a set of resources
    const calculateUtilization = (resourceIds: string[]): number[] => {
      return weeks.map(weekStart => {
        const weekEnd = addWeeks(weekStart, 1);
        let total = 0;
        let count = 0;

        resourceIds.forEach(resourceId => {
          const resourceAllocations = allocations.filter(a => a.profile_id === resourceId);
          let resourceTotal = 0;

          resourceAllocations.forEach(alloc => {
            const allocStart = new Date(alloc.start_date);
            const allocEnd = new Date(alloc.end_date);
            if (allocStart < weekEnd && allocEnd > weekStart) {
              resourceTotal += alloc.allocation_percent;
            }
          });

          total += resourceTotal;
          count++;
        });

        return count > 0 ? Math.round(total / count) : 0;
      });
    };

    // Build department nodes
    const deptNodes: HierarchyNode[] = Array.from(deptMap.entries()).map(([dept, roleMap]) => {
      const roleNodes: HierarchyNode[] = Array.from(roleMap.entries()).map(([role, roleResources]) => {
        const resourceNodes: HierarchyNode[] = roleResources.map(resource => ({
          id: `resource-${resource.id}`,
          label: resource.name,
          type: 'resource' as const,
          resourceCount: 1,
          monthlyUtilization: calculateUtilization([resource.id]),
          resource
        }));

        return {
          id: `role-${dept}-${role}`,
          label: role,
          type: 'role' as const,
          resourceCount: roleResources.length,
          children: resourceNodes,
          monthlyUtilization: calculateUtilization(roleResources.map(r => r.id))
        };
      });

      const deptResourceIds = Array.from(roleMap.values()).flat().map(r => r.id);
      return {
        id: `dept-${dept}`,
        label: dept,
        type: 'department' as const,
        resourceCount: deptResourceIds.length,
        children: roleNodes,
        monthlyUtilization: calculateUtilization(deptResourceIds)
      };
    });

    return {
      id: 'organization',
      label: 'Organization',
      type: 'organization' as const,
      resourceCount: resources.length,
      children: deptNodes,
      monthlyUtilization: calculateUtilization(resources.map(r => r.id))
    } as HierarchyNode;
  }, [resources, allocations, weeks]);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getNodeIcon = (type: HierarchyNode['type']) => {
    switch (type) {
      case 'organization': return <Building2 className="w-4 h-4" />;
      case 'department': return <Users className="w-4 h-4" />;
      case 'role': return <Briefcase className="w-4 h-4" />;
      case 'resource': return <User className="w-4 h-4" />;
    }
  };

  const renderNode = (node: HierarchyNode, depth = 0): JSX.Element => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        <div 
          className={cn(
            "flex items-center hover:bg-muted/50 rounded transition-colors",
            depth === 0 && "bg-muted/30"
          )}
          style={{ paddingLeft: `${depth * 16}px` }}
        >
          {/* Toggle */}
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.id)}
              className="p-1 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* Label */}
          <div className="flex items-center gap-2 w-48 px-2 py-2 flex-shrink-0">
            <span className="text-muted-foreground">{getNodeIcon(node.type)}</span>
            <span className={cn(
              "text-sm truncate",
              depth === 0 && "font-semibold"
            )}>
              {node.label}
            </span>
            <span className="text-xs text-muted-foreground">
              ({node.resourceCount})
            </span>
          </div>

          {/* Heatmap cells */}
          <div className="flex flex-1 gap-0.5">
            {node.monthlyUtilization.map((util, i) => (
              <HeatmapCell key={i} utilization={util} week={weeks[i]} />
            ))}
          </div>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className={cn("overflow-x-auto", className)}>
        <div className="min-w-max">
          {/* Header with week labels */}
          <div className="flex items-center border-b border-border pb-2 mb-2 sticky top-0 bg-background z-10">
            <div className="w-64 flex-shrink-0 text-sm font-medium text-muted-foreground pl-8">
              Organization
            </div>
            {weeks.map((week, i) => (
              <div
                key={i}
                className="w-10 flex-shrink-0 text-center text-xs text-muted-foreground"
              >
                {format(week, 'M/d')}
              </div>
            ))}
          </div>

          {/* Hierarchy */}
          <div className="space-y-0.5">
            {renderNode(hierarchy)}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
            <span className="text-xs text-muted-foreground">Utilization:</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-800" />
              <span className="text-xs text-muted-foreground">0%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-teal-200 dark:bg-teal-900" />
              <span className="text-xs text-muted-foreground">1-50%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-teal-400 dark:bg-teal-700" />
              <span className="text-xs text-muted-foreground">51-80%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-blue-500 dark:bg-blue-600" />
              <span className="text-xs text-muted-foreground">81-100%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-amber-500 dark:bg-amber-600" />
              <span className="text-xs text-muted-foreground">&gt;100%</span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function HeatmapCell({ utilization, week }: { utilization: number; week: Date }) {
  const getBgColor = () => {
    if (utilization === 0) return 'bg-slate-100 dark:bg-slate-800';
    if (utilization <= 50) return 'bg-teal-200 dark:bg-teal-900';
    if (utilization <= 80) return 'bg-teal-400 dark:bg-teal-700';
    if (utilization <= 100) return 'bg-blue-500 dark:bg-blue-600';
    return 'bg-amber-500 dark:bg-amber-600';
  };

  const getTextColor = () => {
    if (utilization === 0) return 'text-muted-foreground';
    return 'text-white';
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "w-10 h-8 flex items-center justify-center rounded-sm cursor-pointer transition-all hover:scale-105 hover:ring-2 hover:ring-primary/50",
            getBgColor()
          )}
        >
          {utilization > 0 && (
            <span className={cn("text-[10px] font-medium", getTextColor())}>
              {utilization > 100 ? '!' : utilization > 0 ? `${utilization}%` : ''}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          Week of {format(week, 'MMM d, yyyy')}: {utilization}% allocated
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
