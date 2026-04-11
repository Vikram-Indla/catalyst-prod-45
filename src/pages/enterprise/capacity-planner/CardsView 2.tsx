import { useState } from 'react';
import { Users, ChevronUp, ChevronDown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATALYST, getAssignmentColor } from '@/lib/catalyst-colors';
import { CompactGroupHeader } from '@/components/capacity/CompactGroupHeader';
import { CompactResourceCard } from '@/components/capacity/CompactResourceCard';
import type { ResourceMetric, ResourceAllocation, GroupByType } from './types';
import { departmentColors } from './types';

interface CardsViewProps {
  resources: ResourceMetric[];
  groupedByAssignment: Record<string, ResourceMetric[]>;
  groupedByDepartment: Record<string, ResourceMetric[]>;
  groupBy: GroupByType;
  isCollapsed?: boolean;
  compactMode?: boolean;
  allocations?: ResourceAllocation[];
  onResourceClick: (r: ResourceMetric) => void;
  onEditResource: (id: string) => void;
}

export function CardsView({
  resources,
  groupedByAssignment,
  groupedByDepartment,
  groupBy,
  isCollapsed = false,
  compactMode = false,
  allocations = [],
  onResourceClick,
  onEditResource,
}: CardsViewProps) {
  // Helper to get allocations for a specific resource - CURRENT MONTH ONLY
  // Match by profile_id OR resource_id since some resources don't have linked profiles
  const getResourceAllocations = (resourceId: string, resourceInventoryId?: string) => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return allocations.filter(a => {
      const matchesResource = a.profile_id === resourceId ||
        a.resource_id === resourceId ||
        (resourceInventoryId && a.resource_id === resourceInventoryId);
      if (!matchesResource) return false;

      // Filter to CURRENT MONTH only
      const allocStart = new Date(a.start_date);
      const allocEnd = new Date(a.end_date);
      return allocStart <= currentMonthEnd && allocEnd >= currentMonthStart;
    });
  };

  // Helper to calculate total allocation from actual allocations - only for CURRENT period
  const getTotalAllocationForResource = (resourceId: string, resourceInventoryId?: string): number => {
    const now = new Date();
    const resourceAllocations = allocations.filter(a => {
      const matchesResource = a.profile_id === resourceId ||
        a.resource_id === resourceId ||
        (resourceInventoryId && a.resource_id === resourceInventoryId);
      if (!matchesResource) return false;
      // Only count allocations that are active NOW (overlap with today)
      const allocStart = new Date(a.start_date);
      const allocEnd = new Date(a.end_date);
      return allocStart <= now && allocEnd >= now;
    });
    return resourceAllocations.reduce((sum, a) => sum + (a.allocation_percent || 0), 0);
  };

  // Default to collapsed state - groups start collapsed
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Default collapsed: return false unless explicitly expanded
  const isGroupExpanded = (groupName: string) => {
    if (isCollapsed) return false;
    return expandedGroups[groupName] === true;
  };

  if (groupBy === 'assignment') {
    return (
      // FIX #12: Visual separation between groups with spacing and borders
      <div className="space-y-4">
        {Object.entries(groupedByAssignment).map(([assignmentName, assignmentResources]) => {
          const availableCount = assignmentResources.filter(r => (r.allocation || 0) === 0).length;
          const partialCount = assignmentResources.filter(r => (r.allocation || 0) > 0 && (r.allocation || 0) < 100).length;
          const atCapacityCount = assignmentResources.filter(r => (r.allocation || 0) === 100).length;
          const overCount = assignmentResources.filter(r => (r.allocation || 0) > 100).length;
          const avgUtil = assignmentResources.length > 0
            ? Math.round(assignmentResources.reduce((sum, r) => sum + (r.allocation || 0), 0) / assignmentResources.length)
            : 0;
          const expanded = isGroupExpanded(assignmentName);
          return (
          // FIX #12: Add bottom border for group separation
          <div key={assignmentName} className="space-y-3 pb-4 border-b border-border last:border-b-0">
            {/* Group Header with capacity bar */}
            <CompactGroupHeader
              assignmentName={assignmentName}
              resourceCount={assignmentResources.length}
              availableCount={availableCount + partialCount}
              atCapacityCount={atCapacityCount}
              overCount={overCount}
              averageUtilization={avgUtil}
              isExpanded={expanded}
              onToggle={() => toggleGroup(assignmentName)}
            />

            {/* Cards Grid - 5 columns dense with left indent */}
            {expanded && (
              <div className="grid gap-2 pl-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {assignmentResources.map((resource) => (
                  <CompactResourceCard
                    key={resource.id}
                    id={resource.id}
                    name={resource.name}
                    role={resource.role || 'Team Member'}
                    department={resource.department}
                    assignmentName={assignmentName}
                    totalAllocation={getTotalAllocationForResource(resource.id, (resource as any).resourceInventoryId)}
                    allocations={getResourceAllocations(resource.id, (resource as any).resourceInventoryId)}
                    country_flag_svg={(resource as any).country_flag_svg}
                    avatar_url={resource.avatar_url}
                    onOpen360={() => onResourceClick(resource)}
                    onEdit={() => onEditResource(resource.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )})}
      </div>
    );
  }

  if (groupBy === 'department') {
    return (
      // FIX #12: Visual separation between groups
      <div className="space-y-4">
        {Object.entries(groupedByDepartment).map(([deptName, deptResources]) => {
          const deptColor = departmentColors[deptName] || departmentColors.default;
          const expanded = isGroupExpanded(deptName);
          const availableCount = deptResources.filter(r => (r.allocation || 0) < 100).length;
          const atCapacityCount = deptResources.filter(r => (r.allocation || 0) >= 100).length;
          const avgUtil = deptResources.length > 0
            ? Math.round(deptResources.reduce((sum, r) => sum + (r.allocation || 0), 0) / deptResources.length)
            : 0;
          return (
            // FIX #12: Add bottom border for group separation
            <div key={deptName} className="space-y-3 pb-4 border-b border-border last:border-b-0">
              {/* Group Header - Enterprise Style */}
              <div
                className="flex items-center justify-between px-5 py-4 border border-[#e5e5e5] rounded-xl cursor-pointer hover:shadow-md transition-all"
                style={{
                  backgroundColor: `${CATALYST.blue.primary}08`,
                  borderLeftWidth: '4px',
                  borderLeftColor: CATALYST.blue.primary,
                }}
                onClick={() => toggleGroup(deptName)}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-sm", deptColor.bg)}>
                    <Building2 className={cn("w-6 h-6", deptColor.text)} />
                  </div>
                  <div>
                    <span className="text-lg font-bold text-[#0a0a0a]">{deptName}</span>
                    <div className="flex items-center gap-4 mt-1">
                      {availableCount > 0 && (
                        <span className="text-sm text-[#525252] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATALYST.teal.primary }} />
                          <span className="font-medium">{availableCount}</span> available
                        </span>
                      )}
                      {atCapacityCount > 0 && (
                        <span className="text-sm text-[#525252] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATALYST.blue.primary }} />
                          <span className="font-medium">{atCapacityCount}</span> at capacity
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-medium text-[#737373]">Avg: {avgUtil}%</span>
                    <div className="w-32 h-2 bg-[#e5e5e5] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(avgUtil, 100)}%`,
                          backgroundColor: CATALYST.blue.primary
                        }}
                      />
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: CATALYST.blue.bg }}
                  >
                    <Users className="w-4 h-4" style={{ color: CATALYST.blue.primary }} />
                    <span className="text-sm font-bold" style={{ color: CATALYST.blue.primary }}>
                      {deptResources.length}
                    </span>
                  </div>
                  {expanded
                    ? <ChevronUp className="w-5 h-5 text-[#737373]" />
                    : <ChevronDown className="w-5 h-5 text-[#737373]" />
                  }
                </div>
              </div>

              {/* Cards Grid - Collapsible */}
              {expanded && (
                <div className="grid gap-2 pl-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {deptResources.map((resource) => (
                    <CompactResourceCard
                      key={resource.id}
                      id={resource.id}
                      name={resource.name}
                      role={resource.role || 'Team Member'}
                      department={resource.department}
                      assignmentName={resource.assignmentName}
                      totalAllocation={getTotalAllocationForResource(resource.id, (resource as any).resourceInventoryId)}
                      allocations={getResourceAllocations(resource.id, (resource as any).resourceInventoryId)}
                      country_flag_svg={(resource as any).country_flag_svg}
                      avatar_url={resource.avatar_url}
                      onOpen360={() => onResourceClick(resource)}
                      onEdit={() => onEditResource(resource.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {resources.map((resource) => (
        <CompactResourceCard
          key={resource.id}
          id={resource.id}
          name={resource.name}
          role={resource.role || 'Team Member'}
          department={resource.department}
          assignmentName={resource.assignmentName}
          totalAllocation={getTotalAllocationForResource(resource.id, (resource as any).resourceInventoryId)}
          allocations={getResourceAllocations(resource.id, (resource as any).resourceInventoryId)}
          country_flag_svg={(resource as any).country_flag_svg}
          avatar_url={resource.avatar_url}
          onOpen360={() => onResourceClick(resource)}
          onEdit={() => onEditResource(resource.id)}
        />
      ))}
    </div>
  );
}
