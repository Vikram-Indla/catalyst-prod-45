/**
 * Contract Horizon View
 * Main container for the contract timeline visualization
 */

import { useContractHorizon } from '@/hooks/useContractHorizon';
import { CriticalAlert } from './CriticalAlert';
import { FilterBar } from './FilterBar';
import { TimelineHeader } from './TimelineHeader';
import { DepartmentRow } from './DepartmentRow';
import { ResourceDrawer } from './ResourceDrawer';
import { Loader2 } from 'lucide-react';

export function ContractHorizonView() {
  const {
    resources,
    departmentStats,
    monthlyTotals,
    summary,
    filter,
    setFilter,
    expandedDepartments,
    toggleDepartment,
    selectedResource,
    setSelectedResource,
    isLoading,
    currentMonth
  } = useContractHorizon();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Sort departments for consistent order
  const sortedDepartments = Object.values(departmentStats).sort((a, b) => {
    const order = ['Delivery', 'Product', 'Operations', 'Technical Support', 'Support'];
    return order.indexOf(a.department) - order.indexOf(b.department);
  });

  return (
    <div className="px-6 pb-6">
      {/* Critical Alert */}
      <CriticalAlert 
        criticalCount={summary.critical}
        criticalResources={summary.criticalResources}
        onViewAll={() => setFilter('critical')}
      />
      
      {/* Filter Bar */}
      <FilterBar 
        filter={filter}
        onFilterChange={setFilter}
        counts={{
          total: summary.total,
          critical: summary.critical,
          delivery: summary.byDepartment.delivery,
          product: summary.byDepartment.product,
          operations: summary.byDepartment.operations,
          support: summary.byDepartment.support
        }}
      />
      
      {/* Main Timeline Container */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* Timeline Header */}
        <TimelineHeader 
          monthlyTotals={monthlyTotals}
          currentMonth={currentMonth}
        />
        
        {/* Department Rows */}
        {sortedDepartments.map(stats => (
          <DepartmentRow
            key={stats.department}
            stats={stats}
            isExpanded={expandedDepartments.has(stats.department)}
            onToggle={() => toggleDepartment(stats.department)}
            onResourceClick={setSelectedResource}
          />
        ))}
        
        {/* Empty State */}
        {sortedDepartments.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <p className="text-lg font-medium">No contracts found</p>
            <p className="text-sm mt-1">No resources with upcoming contract end dates.</p>
          </div>
        )}
      </div>
      
      {/* Resource Detail Drawer */}
      {selectedResource && (
        <ResourceDrawer 
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
        />
      )}
    </div>
  );
}
