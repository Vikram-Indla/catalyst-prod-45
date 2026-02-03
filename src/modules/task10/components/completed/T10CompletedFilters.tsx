// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10CompletedFilters
// Purpose: Filter bar for completed view
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Download, Filter } from 'lucide-react';
import { useT10Lists } from '../../hooks';
import { useT10ExportCSV } from '../../hooks/useT10Completed';
import type { T10CompletedFilters as FilterType } from '../../types/completed';
import { useToast } from '@/hooks/use-toast';

interface Props {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
}

export function T10CompletedFilters({ filters, onFiltersChange }: Props) {
  const { data: lists } = useT10Lists();
  const exportCSV = useT10ExportCSV();
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      const csv = await exportCSV.mutateAsync(filters);
      
      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `task10-completed-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Export complete',
        description: 'CSV downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Could not export data',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="t10-filter-row">
      <div className="t10-filter-group">
        <Filter size={16} className="t10-filter-icon" />
        
        {/* Date Range */}
        <select
          className="t10-filter-select"
          value={filters.dateRange}
          onChange={(e) => onFiltersChange({ 
            ...filters, 
            dateRange: e.target.value as FilterType['dateRange']
          })}
        >
          <option value="last7">Last 7 days</option>
          <option value="last30">Last 30 days</option>
          <option value="last90">Last 90 days</option>
          <option value="thisYear">This year</option>
        </select>

        {/* List Filter */}
        <select
          className="t10-filter-select"
          value={filters.listId || ''}
          onChange={(e) => onFiltersChange({ 
            ...filters, 
            listId: e.target.value || undefined 
          })}
        >
          <option value="">All Lists</option>
          {lists?.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>

        {/* Min Rate Filter */}
        <select
          className="t10-filter-select"
          value={filters.minRate ?? ''}
          onChange={(e) => onFiltersChange({ 
            ...filters, 
            minRate: e.target.value ? Number(e.target.value) : undefined 
          })}
        >
          <option value="">Any Rate</option>
          <option value="50">≥ 50%</option>
          <option value="70">≥ 70%</option>
          <option value="90">≥ 90%</option>
          <option value="100">100%</option>
        </select>
      </div>

      <button
        className="t10-export-btn"
        onClick={handleExport}
        disabled={exportCSV.isPending}
      >
        <Download size={16} />
        {exportCSV.isPending ? 'Exporting...' : 'Export CSV'}
      </button>
    </div>
  );
}

export default T10CompletedFilters;
