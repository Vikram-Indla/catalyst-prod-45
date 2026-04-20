import { useState, useMemo, useCallback, useEffect } from 'react';
import { Users, Pencil, Trash2, Settings2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ads';
import { cn } from '@/lib/utils';
import {
  CATALYST,
  getAssignmentColor,
  getAssignmentTheme,
  getAllocationBarColor,
} from '@/lib/catalyst-colors';
import { CatalystEnterpriseTable, CatalystColumn } from '@/components/industry/CatalystEnterpriseTable';
import { useResourceProfiles } from '@/hooks/useResourceProfiles';
import type { ResourceMetric, CapacityProject, ResourceAllocation, GroupByType } from './types';
import { departmentColors } from './types';

export interface TableViewProps {
  resources: ResourceMetric[];
  projects: CapacityProject[];
  groupBy: GroupByType;
  groupedByAssignment: Record<string, ResourceMetric[]>;
  groupedByDepartment: Record<string, ResourceMetric[]>;
  allocations?: ResourceAllocation[];
  onResourceClick: (r: ResourceMetric) => void;
  onEditResource: (id: string) => void;
  onDeleteResource: (r: ResourceMetric) => void;
  onBulkDelete?: (resources: ResourceMetric[]) => void;
  onBulkEdit?: (resources: ResourceMetric[]) => void;
}

export function TableView({ resources, projects, groupBy, groupedByAssignment, groupedByDepartment, allocations = [], onResourceClick, onEditResource, onDeleteResource, onBulkDelete, onBulkEdit }: TableViewProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { getProfile } = useResourceProfiles();
  const getProjectName = (projectId: string) => projects.find(p => p.id === projectId)?.name || 'Unknown';

  // Helper to get assignment names from allocations for a resource
  const getAssignmentNamesForResource = useCallback((resourceId: string): string[] => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const resourceAllocations = allocations.filter((a) => {
      const matchesResource = a.profile_id === resourceId || a.resource_id === resourceId;
      if (!matchesResource) return false;

      const allocStart = new Date(a.start_date);
      const allocEnd = new Date(a.end_date);
      return allocStart <= currentMonthEnd && allocEnd >= currentMonthStart;
    });
    const names = resourceAllocations
      .map(a => a.assignment_name)
      .filter((name): name is string => !!name);
    return [...new Set(names)]; // Unique names
  }, [allocations]);

  // Contract ring styles helper
  const getRingStyle = (status: string) => {
    const ringStyles: Record<string, string> = {
      healthy: 'ring-[#0d9488]',
      warning: 'ring-[#ca8a04]',
      critical: 'ring-[#be123c]',
      expired: 'ring-muted-foreground/40',
      permanent: 'ring-muted-foreground/30'
    };
    return ringStyles[status] || 'ring-muted-foreground/30';
  };

  // Sort resources by vendor first, then assignment name from allocations
  const sortedResources = useMemo(() => {
    return [...resources].sort((a, b) => {
      const aVendor = a.vendor_name || '';
      const bVendor = b.vendor_name || '';

      // First sort by vendor (empty vendors at the end)
      if (!aVendor && bVendor) return 1;
      if (aVendor && !bVendor) return -1;
      if (aVendor !== bVendor) return aVendor.localeCompare(bVendor);

      // Then sort by assignment name from allocations
      const aNames = getAssignmentNamesForResource(a.id);
      const bNames = getAssignmentNamesForResource(b.id);
      const aName = aNames[0] || a.assignmentName || 'Unassigned';
      const bName = bNames[0] || b.assignmentName || 'Unassigned';
      if (aName === 'Unassigned' && bName !== 'Unassigned') return 1;
      if (bName === 'Unassigned' && aName !== 'Unassigned') return -1;
      return aName.localeCompare(bName);
    });
  }, [resources, getAssignmentNamesForResource]);

  // If the table data changes (e.g., after edits, filtering, or refetch),
  // drop any selections that no longer exist in the current dataset.
  useEffect(() => {
    const validIds = new Set(resources.map((r) => r.id));
    setSelectedIds((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [resources]);

  const columns: CatalystColumn<ResourceMetric>[] = useMemo(() => [
    {
      id: 'name',
      header: 'Name',
      accessor: 'name',
      width: '240px',
      sortable: true,
      render: (value: string, row: ResourceMetric) => {
        const initials = row.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
        const profile = getProfile(row.id);

        // Location detection - check for onsite/offshore
        const locationName = row.location || profile?.location || '';
        const locationLower = locationName.toLowerCase();
        const isOnsite = locationLower.includes('onsite') || locationLower.includes('riyadh');
        const isOffshore = locationLower.includes('offshore');

        // Use design tokens (no hardcoded colors)
        const avatarBgClass = isOnsite ? 'bg-brand-teal' : 'bg-brand-primary';
        const locLabel = isOnsite ? 'Onsite' : isOffshore ? 'Off-Shore' : locationName;
        const locLabelClass = isOnsite ? 'text-brand-teal' : 'text-brand-primary';

        // Country flag
        const countryCode = row.country_code || profile?.country_code;
        const countryName = row.country || profile?.country;
        const flagUrl = countryCode
          ? `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`
          : null;

        // Online status indicator
        const isOnline = true; // Assume online for demo

        return (
          <div className="flex items-center gap-3">
            {/* Avatar with flag overlay and country tooltip */}
            <Tooltip position="top" content={countryName || 'Unknown Country'}>
              <div className="relative flex-shrink-0 cursor-pointer">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white ${avatarBgClass}`}
                >
                  {initials}
                </div>
                {/* Flag overlay */}
                {flagUrl && (
                  <span
                    className="absolute -bottom-0.5 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm"
                    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}
                  >
                    <img
                      src={flagUrl}
                      alt={countryName || ''}
                      className="w-3.5 h-3.5 object-cover rounded-sm"
                    />
                  </span>
                )}
              </div>
            </Tooltip>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[14px] text-[#0f172a] dark:text-foreground truncate">{value}</span>
                {/* Online indicator */}
                {isOnline && (
                  <span className="w-2 h-2 rounded-full bg-[#059669] flex-shrink-0" />
                )}
              </div>
              {/* Location label */}
              {locLabel && (
                <span className={`text-[11px] font-bold tracking-wide ${locLabelClass}`}>
                  {locLabel}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: 'vendor',
      header: 'Vendor',
      accessor: (row: ResourceMetric) => row.vendor_name || '',
      width: '80px',
      sortable: true,
      filterable: true,
      filterOptions: (() => {
        const uniqueVendors = new Set<string>();
        resources.forEach(r => {
          if (r.vendor_name) uniqueVendors.add(r.vendor_name);
        });
        return Array.from(uniqueVendors).sort().map(v => ({ value: v, label: v }));
      })(),
      render: (_: any, row: ResourceMetric) => {
        const vendor = row.vendor_name;
        if (!vendor) {
          return <span className="text-[13px] text-[#475569]">-</span>;
        }
        return (
          <span className="text-[13px] font-medium text-[#334155]">{vendor}</span>
        );
      },
    },
    {
      id: 'assignments',
      header: 'Assignment (Monthly)',
      accessor: (row: ResourceMetric) => {
        const names = getAssignmentNamesForResource(row.id);
        return names.length > 0 ? names.join(', ') : (row.assignmentName || 'Unassigned');
      },
      width: '300px',
      sortable: true,
      render: (_: any, row: ResourceMetric) => {
        // Get allocations with percentages (CURRENT MONTH ONLY)
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const resourceAllocations = allocations.filter((a) => {
          const matchesResource = a.profile_id === row.id || a.resource_id === row.id;
          if (!matchesResource) return false;

          const allocStart = new Date(a.start_date);
          const allocEnd = new Date(a.end_date);
          return allocStart <= currentMonthEnd && allocEnd >= currentMonthStart;
        });

        if (resourceAllocations.length === 0) {
          return (
            <span className="text-[13px] font-medium text-[#475569]">No assignments this month</span>
          );
        }

        // Show assignment tags with left accent bar
        return (
          <div className="flex flex-col gap-1.5">
            {resourceAllocations.slice(0, 3).map((alloc, idx) => {
              // Determine if committed or forecast based on dates (forecast if start_date is in the future)
              const now = new Date();
              const startDate = new Date(alloc.start_date);
              const isCommitted = startDate <= now;
              const accentColor = isCommitted ? '#2563eb' : '#f59e0b'; // Blue for committed, Amber for forecast
              const pctColor = isCommitted ? '#2563eb' : '#92400e';

              return (
                <span
                  key={idx}
                  className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded bg-white text-[13px] font-medium text-[#334155]"
                  style={{
                    border: '1px solid #e2e8f0',
                    borderLeftWidth: '3px',
                    borderLeftColor: accentColor,
                  }}
                >
                  <span className="truncate max-w-[160px]">{alloc.assignment_name}</span>
                  <span className="font-bold text-[12px]" style={{ color: pctColor }}>
                    {alloc.allocation_percent}%
                  </span>
                </span>
              );
            })}
            {resourceAllocations.length > 3 && (
              <span className="text-[11px] text-[#64748b]">+{resourceAllocations.length - 3} more</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'role',
      header: 'Role',
      accessor: 'role',
      width: '130px',
      sortable: true,
      render: (value: string) => (
        <span className="text-[13px] font-medium text-[#334155] dark:text-slate-300">{value || '-'}</span>
      ),
    },
    {
      id: 'department',
      header: 'Department',
      accessor: 'department',
      width: '110px',
      sortable: true,
      filterable: true,
      filterOptions: [
        { value: 'Product', label: 'Product' },
        { value: 'Delivery', label: 'Delivery' },
        { value: 'Operations', label: 'Operations' },
        { value: 'Support', label: 'Support' },
        { value: 'Unassigned', label: 'Unassigned' },
      ],
      render: (value: string) => {
        const dept = value || 'Unassigned';
        const deptUpper = dept.toUpperCase();

        // Department-specific colors from style guide
        const deptStyles: Record<string, { bg: string; text: string }> = {
          'OPERATIONS': { bg: 'rgba(13,148,136,0.15)', text: '#115e59' },
          'PRODUCT': { bg: 'rgba(109,40,217,0.12)', text: '#6d28d9' },
          'DELIVERY': { bg: 'rgba(14,116,144,0.12)', text: '#0e7490' },
          'SUPPORT': { bg: 'rgba(16,185,129,0.12)', text: '#059669' },
        };

        const style = deptStyles[deptUpper] || { bg: 'rgba(100,116,139,0.12)', text: '#475569' };

        return (
          <span
            className="inline-block px-2.5 py-1.5 rounded text-[11px] font-bold uppercase tracking-wide"
            style={{ backgroundColor: style.bg, color: style.text }}
          >
            {dept}
          </span>
        );
      },
    },
    {
      id: 'contractEndDate',
      header: 'Contract End',
      accessor: (row: ResourceMetric) => row.contract_end_date || null,
      width: '110px',
      sortable: true,
      render: (_: any, row: ResourceMetric) => {
        const endDate = row.contract_end_date;

        if (!endDate) {
          return <span className="text-[13px] text-[#334155]">Permanent</span>;
        }

        const endDateObj = new Date(endDate);
        const now = new Date();
        const diffTime = endDateObj.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const formatted = endDateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });

        const tooltipText = daysRemaining > 0
          ? `${daysRemaining} days remaining`
          : daysRemaining === 0
            ? 'Expires today'
            : `Expired ${Math.abs(daysRemaining)} days ago`;

        // Calculate status based on days remaining - Catalyst V1 style guide
        // Critical: < 30 days (#b91c1c), Warning: 30-90 days (#92400e), Safe: > 90 days (#334155)
        const status = daysRemaining <= 0 ? 'expired' : daysRemaining < 30 ? 'critical' : daysRemaining < 90 ? 'warning' : 'safe';
        const textColors: Record<string, string> = {
          critical: '#b91c1c',
          warning: '#92400e',
          safe: '#334155',
          expired: '#64748b',
        };

        return (
          <Tooltip position="top" content={tooltipText}>
            <span
              className="text-[13px] font-semibold cursor-help"
              style={{ color: textColors[status] }}
            >
              {formatted}
            </span>
          </Tooltip>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: 'id',
      width: '80px',
      sortable: false,
      render: (_: any, row: ResourceMetric) => {
        return (
        <div className="flex items-center gap-0.5">
          {/* Edit */}
          <button
            onClick={(e) => { e.stopPropagation(); onEditResource(row.id); }}
            className="w-[30px] h-[30px] rounded-md flex items-center justify-center text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-colors"
            title="Edit resource"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {/* Delete */}
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteResource(row); }}
            className="w-[30px] h-[30px] rounded-md flex items-center justify-center text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-colors"
            title="Remove from Capacity Planner"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        );
      },
    },
  ], [projects, onResourceClick, onEditResource, onDeleteResource, getProfile, getAssignmentNamesForResource, resources, allocations]);

  const handleSelectionChange = (ids: string[]) => {
    setSelectedIds(ids);
  };

  const handleBulkDelete = () => {
    const selected = resources.filter(r => selectedIds.includes(r.id));
    if (onBulkDelete && selected.length > 0) {
      onBulkDelete(selected);
      setSelectedIds([]);
    }
  };

  const handleBulkEdit = () => {
    const selected = resources.filter(r => selectedIds.includes(r.id));
    if (onBulkEdit && selected.length > 0) {
      onBulkEdit(selected);
    }
  };

  // Render grouped tables for assignment - REDESIGNED with assignment colors
  const renderGroupedTable = (groupResources: ResourceMetric[], groupName: string) => {
    const theme = getAssignmentTheme(groupName);
    return (
      <div key={groupName} className="space-y-2">
        <div
          className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg"
          style={{ borderLeftWidth: '4px', borderLeftColor: theme.accent }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: theme.accent }}
          >
            <Users className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold" style={{ color: theme.accent }}>{groupName}</span>
          <span className="text-xs text-muted-foreground ml-auto bg-muted px-2.5 py-1 rounded-full">
            {groupResources.length} resources
          </span>
        </div>
        <CatalystEnterpriseTable
          data={groupResources}
          columns={columns}
          showCheckboxes={true}
          showActionsColumn={false}
          selectedRows={selectedIds}
          onSelectionChange={handleSelectionChange}
          onRowClick={(row) => onResourceClick(row)}
        />
      </div>
    );
  };

  // Render grouped tables for department - REDESIGNED with assignment colors
  const renderDepartmentGroupedTable = (groupResources: ResourceMetric[], deptName: string) => {
    const deptColor = departmentColors[deptName] || departmentColors.default;
    return (
      <div key={deptName} className="space-y-2">
        <div
          className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg"
          style={{ borderLeftWidth: '4px', borderLeftColor: CATALYST.blue.primary }}
        >
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", deptColor.bg)}>
            <Building2 className={cn("h-4 w-4", deptColor.text)} />
          </div>
          <span className="text-sm font-semibold text-foreground">{deptName}</span>
          <span className="text-xs text-muted-foreground ml-auto bg-muted px-2.5 py-1 rounded-full">
            {groupResources.length} resources
          </span>
        </div>
        <CatalystEnterpriseTable
          data={groupResources}
          columns={columns}
          showCheckboxes={true}
          showActionsColumn={false}
          selectedRows={selectedIds}
          onSelectionChange={handleSelectionChange}
          onRowClick={(row) => onResourceClick(row)}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border border-border rounded-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm" style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}>
          <span className="text-sm font-medium text-foreground">
            {selectedIds.length} resource{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              Clear Selection
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkEdit}
              className="gap-1.5"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Bulk Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove Selected
            </Button>
          </div>
        </div>
      )}

      {groupBy === 'assignment' ? (
        <div className="flex-1 overflow-auto space-y-6">
          {Object.entries(groupedByAssignment).map(([assignmentName, assignmentResources]) =>
            renderGroupedTable(assignmentResources, assignmentName)
          )}
        </div>
      ) : groupBy === 'department' ? (
        <div className="flex-1 overflow-auto space-y-6">
          {Object.entries(groupedByDepartment).map(([deptName, deptResources]) =>
            renderDepartmentGroupedTable(deptResources, deptName)
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <CatalystEnterpriseTable
            data={sortedResources}
            columns={columns}
            showCheckboxes={true}
            showActionsColumn={false}
            selectedRows={selectedIds}
            onSelectionChange={handleSelectionChange}
            onRowClick={(row) => onResourceClick(row)}
          />
        </div>
      )}
    </div>
  );
}
