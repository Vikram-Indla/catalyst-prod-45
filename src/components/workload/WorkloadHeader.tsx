/**
 * Workload Header Component
 * Page header with filters and actions
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lozenge } from '@/components/ads';
import { Scale, Download, X } from 'lucide-react';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import type { WorkloadFilters } from '@/types/workload.types';

interface WorkloadHeaderProps {
  filters: WorkloadFilters;
  onFilterChange: (filters: Partial<WorkloadFilters>) => void;
  onRebalance: () => void;
}

const DATE_RANGES = [
  { value: 'this_week', label: 'This Week' },
  { value: 'next_two_weeks', label: 'Next 2 Weeks' },
  { value: 'this_month', label: 'This Month' },
];

const MOCK_CYCLES = [
  { id: 'all', name: 'All Active Cycles' },
  { id: '1', name: 'Regression R2.1' },
  { id: '2', name: 'Smoke Tests' },
  { id: '3', name: 'UAT Cycle' },
];

const MOCK_MEMBERS = [
  { id: 'all', name: 'All Team Members' },
  { id: '1', name: 'Ahmed Al-Rashid' },
  { id: '2', name: 'Sara Mohammed' },
  { id: '3', name: 'Omar Hassan' },
  { id: '4', name: 'Fatima Ali' },
  { id: '5', name: 'Khalid Ibrahim' },
];

export function WorkloadHeader({ filters, onFilterChange, onRebalance }: WorkloadHeaderProps) {
  const hasActiveFilters = filters.cycleId || filters.memberId || filters.dateRange !== 'this_week';
  
  const clearFilters = () => {
    onFilterChange({ cycleId: undefined, memberId: undefined, dateRange: 'this_week' });
  };

  return (
    <div className="bg-white border-b px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: CATALYST_V5.slate[900] }}>
            Team Workload
          </h1>
          <p className="text-sm mt-1" style={{ color: CATALYST_V5.slate[500] }}>
            Monitoring capacity and distribution across active cycles
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={onRebalance}
            className="gap-2"
            style={{ backgroundColor: CATALYST_V5.primary, color: 'white' }}
          >
            <Scale className="h-4 w-4" />
            Balance Workload
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>
      
      {/* Filters Row */}
      <div className="flex items-center gap-4">
        <Select
          value={filters.cycleId || 'all'}
          onValueChange={(value) => onFilterChange({ cycleId: value === 'all' ? undefined : value })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Cycle" />
          </SelectTrigger>
          <SelectContent>
            {MOCK_CYCLES.map((cycle) => (
              <SelectItem key={cycle.id} value={cycle.id}>
                {cycle.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select
          value={filters.dateRange}
          onValueChange={(value) => onFilterChange({ dateRange: value as WorkloadFilters['dateRange'] })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select
          value={filters.memberId || 'all'}
          onValueChange={(value) => onFilterChange({ memberId: value === 'all' ? undefined : value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Team Member" />
          </SelectTrigger>
          <SelectContent>
            {MOCK_MEMBERS.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1"
            style={{ color: CATALYST_V5.slate[500] }}
          >
            <X className="h-3 w-3" />
            Clear Filters
          </Button>
        )}
      </div>
      
      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mt-3">
          {filters.cycleId && (
            <span
              className="inline-flex items-center gap-1 cursor-pointer"
              onClick={() => onFilterChange({ cycleId: undefined })}
            >
              <Lozenge appearance="inprogress">
                {MOCK_CYCLES.find(c => c.id === filters.cycleId)?.name}
              </Lozenge>
              <X className="h-3 w-3" />
            </span>
          )}
          {filters.dateRange !== 'this_week' && (
            <span
              className="inline-flex items-center gap-1 cursor-pointer"
              onClick={() => onFilterChange({ dateRange: 'this_week' })}
            >
              <Lozenge appearance="inprogress">
                {DATE_RANGES.find(r => r.value === filters.dateRange)?.label}
              </Lozenge>
              <X className="h-3 w-3" />
            </span>
          )}
          {filters.memberId && (
            <span
              className="inline-flex items-center gap-1 cursor-pointer"
              onClick={() => onFilterChange({ memberId: undefined })}
            >
              <Lozenge appearance="inprogress">
                {MOCK_MEMBERS.find(m => m.id === filters.memberId)?.name}
              </Lozenge>
              <X className="h-3 w-3" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
