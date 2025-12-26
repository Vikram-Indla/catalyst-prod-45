/**
 * Product Backlog Table Page
 * Full-width data table view with sorting, selection, and inline editing
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useBusinessRequests } from '@/hooks/useBusinessRequests';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import { CreateBusinessRequestModal } from '@/components/business-requests/CreateBusinessRequestModal';
import { ProductBacklogFiltersDialog, ProductBacklogFilters } from '../components/ProductBacklogFiltersDialog';
import { BacklogTableView } from '@/components/business-requests/table-view';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { PageChrome } from '@/components/layout/PageChrome';
import { useIndustryViewStore } from '@/stores/useIndustryViewStore';
import { IndustryHeaderToolbarV2 } from '@/shared/components/IndustryHeaderToolbarV2';
import { format } from 'date-fns';

interface BusinessRequestRow {
  id: string;
  request_key: string;
  title: string;
  process_step: string;
  priority_tier: string;
  business_score: number | null;
  rank: number | null;
  requestor: string | null;
  requestor_name: string | null;
  assignee: string | null;
  business_owner: string | null;
  department: string | null;
  planned_quarter: string[] | null;
  created_at: string;
  updated_at: string;
  start_date: string | null;
  impl_start_date: string | null;
  impl_target_end_date: string | null;
  ea_review_required: boolean | null;
}

export default function CatalystDemandTable() {
  const queryClient = useQueryClient();
  
  // Shared state from store
  const { 
    searchQuery, 
    setSearchQuery, 
    scoringFilter, 
    setScoringFilter
  } = useIndustryViewStore();
  
  // Use the shared query with search
  const { data: businessRequests = [], isLoading } = useBusinessRequests(searchQuery);
  const [drawerRequestId, setDrawerRequestId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [filters, setFilters] = useState<ProductBacklogFilters>({});

  // Transform business requests to match table format
  const tableData: BusinessRequestRow[] = useMemo(() => {
    let data = businessRequests.map((br: any) => ({
      id: br.id,
      request_key: br.request_key || br.id?.slice(0, 8) || '—',
      title: br.title || '—',
      process_step: br.process_step?.toLowerCase().replace(/ /g, '_') || 'new_request',
      priority_tier: br.priority_tier || 'unscored',
      business_score: br.business_score ?? null,
      rank: br.rank ?? null,
      requestor: br.requestor || null,
      requestor_name: br.requestor_name || br.requestor || null,
      assignee: br.assignee || null,
      business_owner: br.business_owner || null,
      department: br.department || null,
      planned_quarter: br.planned_quarter || null,
      created_at: br.created_at || '',
      updated_at: br.updated_at || '',
      start_date: br.start_date || null,
      impl_start_date: br.impl_start_date || null,
      impl_target_end_date: br.impl_target_end_date || null,
      ea_review_required: br.ea_review_required ?? null,
    }));
    
    // Apply scoring filter from store
    if (scoringFilter === 'scored') {
      data = data.filter(row => row.business_score !== null && row.business_score > 0);
    } else if (scoringFilter === 'unscored') {
      // Treat 0 as unscored (newly created requests default to 0)
      data = data.filter(row => row.business_score === null || row.business_score === 0);
    }
    
    // Apply dialog filters
    if (filters.status) {
      data = data.filter(row => row.process_step === filters.status);
    }
    if (filters.priority) {
      data = data.filter(row => row.priority_tier?.toLowerCase() === filters.priority);
    }
    if (filters.quarter) {
      data = data.filter(row => row.planned_quarter?.[0]?.toLowerCase().replace(' ', '_') === filters.quarter);
    }
    if (filters.scored && filters.scored !== 'all') {
      if (filters.scored === 'scored') {
        data = data.filter(row => row.business_score !== null);
      } else if (filters.scored === 'unscored') {
        data = data.filter(row => row.business_score === null);
      }
    }
    
    return data;
  }, [businessRequests, scoringFilter, filters]);

  // Handle row click
  const handleRowClick = (requestId: string) => {
    setDrawerRequestId(requestId);
  };

  // Export to CSV
  const handleExport = useCallback(() => {
    if (tableData.length === 0) {
      toast.error('No items to export');
      return;
    }

    try {
      const headers = ['Request ID', 'Title', 'Status', 'Score', 'Priority', 'Rank', 'Department', 'Quarter', 'Created'];
      
      const rows = tableData.map((item) => [
        item.request_key || '',
        (item.title || '').replace(/,/g, ';').replace(/\n/g, ' '),
        item.process_step?.replace(/_/g, ' ') || '',
        item.business_score ?? '',
        item.priority_tier || '',
        item.rank ?? '',
        item.department || '',
        item.planned_quarter?.[0] || '',
        item.created_at?.split('T')[0] || '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map((cell: any) => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `product-backlog-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${tableData.length} requests to CSV`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data');
    }
  }, [tableData]);

  // Calculate active filter count
  const activeFiltersCount = Object.values(filters).filter(v => v !== undefined && v !== 'all').length;

  // Toolbar element
  const toolbarElement = (
    <IndustryHeaderToolbarV2
      title="Product Backlog"
      countText={`${tableData.length}`}
      activeView="table"
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      scoringFilter={scoringFilter}
      onScoringFilterChange={setScoringFilter}
      onExport={handleExport}
      onOpenFilters={() => setFiltersDialogOpen(true)}
      activeFiltersCount={activeFiltersCount}
      onCreateRequest={() => setCreateModalOpen(true)}
    />
  );

  return (
    <PageChrome toolbar={toolbarElement}>
      <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <BacklogTableView
            data={tableData}
            onRowClick={handleRowClick}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Filters Dialog */}
      <ProductBacklogFiltersDialog
        open={filtersDialogOpen}
        onOpenChange={setFiltersDialogOpen}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Business Request Drawer */}
      <BusinessRequestDrawer
        isOpen={!!drawerRequestId}
        onClose={() => setDrawerRequestId(null)}
        requestId={drawerRequestId}
        onRequestChange={() => queryClient.invalidateQueries({ queryKey: ['business-requests'] })}
      />

      {/* Create Modal */}
      <CreateBusinessRequestModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
      />
    </PageChrome>
  );
}
