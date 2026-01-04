/**
 * GroupedTableView - V2.1 Enterprise Scale Implementation
 * Hierarchical grouping with expand/collapse for 100+ resources
 * DARK MODE SUPPORT INCLUDED
 */

import { useState, useMemo, Fragment } from 'react';
import { ChevronDown, ChevronRight, Users, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  getAssignmentTheme, 
  getAllocationTheme,
  CATALYST_V5,
  ALLOCATION_SEGMENT_COLORS
} from '@/lib/catalyst-colors';
import { format, startOfMonth, addMonths, eachMonthOfInterval } from 'date-fns';
import type { ResourceAllocation } from '@/modules/capacity-planner/types';

interface ResourceMetric {
  id: string;
  name: string;
  role?: string;
  department?: string;
  allocation?: number;
  assignmentName?: string | null;
  allocations?: ResourceAllocation[];
}

type GroupByField = 'department' | 'role' | 'assignment' | 'status';

interface GroupedTableViewProps {
  resources: ResourceMetric[];
  allocations?: ResourceAllocation[];
  defaultGroupBy?: GroupByField;
  onEditResource?: (resourceId: string) => void;
  onDeleteResource?: (resource: ResourceMetric) => void;
  className?: string;
}

interface ResourceGroup {
  key: string;
  label: string;
  resources: ResourceMetric[];
  avgUtilization: number;
  count: number;
  color: string;
}

export function GroupedTableView({
  resources,
  allocations = [],
  defaultGroupBy = 'department',
  onEditResource,
  onDeleteResource,
  className
}: GroupedTableViewProps) {
  const [groupBy, setGroupBy] = useState<GroupByField>(defaultGroupBy);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Get resource allocations
  const getResourceAllocations = (resourceId: string): ResourceAllocation[] => {
    return allocations.filter(a => a.profile_id === resourceId);
  };

  // Build groups
  const groups = useMemo((): ResourceGroup[] => {
    const groupMap = new Map<string, ResourceMetric[]>();
    
    resources.forEach(resource => {
      let key: string;
      switch (groupBy) {
        case 'department':
          key = resource.department || 'Unassigned';
          break;
        case 'role':
          key = resource.role || 'Unassigned';
          break;
        case 'assignment':
          key = resource.assignmentName || 'Unassigned';
          break;
        case 'status':
          const alloc = resource.allocation || 0;
          key = alloc === 0 ? 'Available' : alloc < 100 ? 'Partial' : alloc === 100 ? 'At Capacity' : 'Over-Allocated';
          break;
        default:
          key = 'Unassigned';
      }
      
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(resource);
    });
    
    return Array.from(groupMap.entries())
      .map(([key, groupResources]) => {
        const theme = getAssignmentTheme(key);
        return {
          key,
          label: key,
          resources: groupResources,
          avgUtilization: Math.round(
            groupResources.reduce((sum, r) => sum + (r.allocation || 0), 0) / groupResources.length
          ),
          count: groupResources.length,
          color: theme.accent,
        };
      })
      .sort((a, b) => {
        // Put 'Unassigned' at the end
        if (a.key === 'Unassigned') return 1;
        if (b.key === 'Unassigned') return -1;
        return a.key.localeCompare(b.key);
      });
  }, [resources, groupBy]);

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };

  const expandAll = () => {
    setExpandedGroups(new Set(groups.map(g => g.key)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  // Initialize all groups expanded on first render
  useMemo(() => {
    if (expandedGroups.size === 0 && groups.length > 0) {
      setExpandedGroups(new Set(groups.map(g => g.key)));
    }
  }, [groups]);

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden", className)}>
      {/* Controls */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">{resources.length} resources</span>
          <select 
            value={groupBy} 
            onChange={(e) => setGroupBy(e.target.value as GroupByField)}
            className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="department">Group by Department</option>
            <option value="role">Group by Role</option>
            <option value="assignment">Group by Assignment</option>
            <option value="status">Group by Status</option>
          </select>
          <button 
            onClick={expandAll} 
            className="text-xs text-primary hover:underline"
          >
            Expand All
          </button>
          <button 
            onClick={collapseAll} 
            className="text-xs text-primary hover:underline"
          >
            Collapse All
          </button>
        </div>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
            <tr>
              <th className="w-10"></th>
              <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide px-4 py-3">Name</th>
              <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide px-4 py-3">Role</th>
              <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide px-4 py-3">Allocation</th>
              <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide px-4 py-3 w-56">Timeline</th>
              <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide px-4 py-3">Status</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={`group-${group.key}`}>
                {/* Group Header */}
                <tr
                  className="bg-slate-100 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => toggleGroup(group.key)}
                >
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    {expandedGroups.has(group.key) 
                      ? <ChevronDown className="h-4 w-4" /> 
                      : <ChevronRight className="h-4 w-4" />
                    }
                  </td>
                  <td colSpan={2} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${group.color}20` }}
                      >
                        <Users className="h-4 w-4" style={{ color: group.color }} />
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">{group.label}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">({group.count})</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Avg: {group.avgUtilization}%
                    </span>
                  </td>
                  <td colSpan={3}></td>
                </tr>
                
                {/* Resources */}
                {expandedGroups.has(group.key) && group.resources.map((resource) => {
                  const resourceAllocations = getResourceAllocations(resource.id);
                  const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
                  const theme = getAssignmentTheme(resource.assignmentName);
                  const allocTheme = getAllocationTheme(resource.allocation || 0);
                  const isOverAllocated = (resource.allocation || 0) > 100;
                  
                  return (
                    <tr 
                      key={resource.id} 
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ backgroundColor: theme.accent }}
                          >
                            {initials}
                          </div>
                          <span className="font-medium text-slate-900 dark:text-white">{resource.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {resource.role || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span 
                            className={cn(
                              "text-sm font-semibold",
                              isOverAllocated ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"
                            )}
                          >
                            {resource.allocation || 0}%
                          </span>
                          <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all"
                              style={{ 
                                width: `${Math.min(resource.allocation || 0, 100)}%`,
                                backgroundColor: allocTheme.bar 
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <InlineTimeline allocations={resourceAllocations} />
                      </td>
                      <td className="px-4 py-3">
                        <span 
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
                          style={{ 
                            backgroundColor: allocTheme.labelBg,
                            color: allocTheme.labelColor
                          }}
                        >
                          {allocTheme.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); onEditResource?.(resource.id); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteResource?.(resource); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Inline Timeline Component
function InlineTimeline({ allocations }: { allocations: ResourceAllocation[] }) {
  const months = useMemo(() => {
    const start = startOfMonth(new Date());
    return eachMonthOfInterval({ 
      start, 
      end: addMonths(start, 3) 
    });
  }, []);

  // Calculate total allocation per month
  const monthlyTotals = months.map(month => {
    const monthEnd = addMonths(month, 1);
    return allocations.reduce((sum, alloc) => {
      const allocStart = new Date(alloc.start_date);
      const allocEnd = alloc.end_date ? new Date(alloc.end_date) : addMonths(new Date(), 12);
      if (allocStart < monthEnd && allocEnd > month) {
        return sum + alloc.allocation_percent;
      }
      return sum;
    }, 0);
  });

  if (allocations.length === 0) {
    return (
      <div className="flex gap-0.5">
        {months.map((_, i) => (
          <div 
            key={i} 
            className="w-10 h-5 rounded-sm bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
          >
            <span className="text-[8px] text-slate-400 dark:text-slate-500">0%</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-0.5">
      {monthlyTotals.map((total, i) => {
        const color = total === 0 ? 'bg-slate-100 dark:bg-slate-800' :
                      total <= 50 ? 'bg-teal-400' :
                      total <= 80 ? 'bg-teal-600' :
                      total <= 100 ? 'bg-blue-600' : 'bg-red-500';
        const textColor = total === 0 ? 'text-slate-400 dark:text-slate-500' : 'text-white';
        
        return (
          <div 
            key={i} 
            className={cn("w-10 h-5 rounded-sm flex items-center justify-center", color)}
            title={`${format(months[i], 'MMM yyyy')}: ${total}%`}
          >
            <span className={cn("text-[8px] font-medium", textColor)}>{total}%</span>
          </div>
        );
      })}
    </div>
  );
}
