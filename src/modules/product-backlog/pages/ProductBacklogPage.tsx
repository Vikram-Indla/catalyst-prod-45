/**
 * Product Backlog Page - Split Panel Layout
 * Left panel: Compact list of requests
 * Right panel: Full detail view of selected request
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useBusinessRequests } from '@/hooks/useBusinessRequests';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import { CreateBusinessRequestModal } from '@/components/business-requests/CreateBusinessRequestModal';
import { ProductBacklogFiltersDialog, ProductBacklogFilters } from '../components/ProductBacklogFiltersDialog';
import { RequestListPanel, RequestDetailPanel, AttachmentUploadModal } from '../components/split-panel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { PageChrome } from '@/components/layout/PageChrome';
import { useIndustryViewStore } from '@/stores/useIndustryViewStore';
import { IndustryHeaderToolbarV2 } from '@/shared/components/IndustryHeaderToolbarV2';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RequestItem {
  id: string;
  _dbId: string;
  summary: string;
  processStep: string;
  score: number | null;
  autoPriority: string;
  rank: number | null;
  reporter?: string | null;
  assignee?: string | null;
  assigneeId?: string | null;
  department: string | null;
  departmentId?: string | null;
  businessOwner?: string | null;
  businessOwnerId?: string | null;
  businessAsk?: string | null;
  kickoff?: string | null;
  targetComplete?: string | null;
  deliveryTrack?: string | null;
  platform?: string | null;
  quarter: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  ea_review_required?: boolean;
}

export default function ProductBacklogPage() {
  const queryClient = useQueryClient();
  
  // Shared state from store
  const { 
    searchQuery, 
    setSearchQuery, 
    scoringFilter, 
    setScoringFilter
  } = useIndustryViewStore();
  
  // Local search for list panel (separate from toolbar search)
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'unscored' | 'my'>('all');
  
  // Use the shared query with search
  const { data: businessRequests = [], isLoading } = useBusinessRequests(searchQuery);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [drawerRequestId, setDrawerRequestId] = useState<string | null>(null);
  const [drawerInitialTab, setDrawerInitialTab] = useState<string | undefined>(undefined);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [filters, setFilters] = useState<ProductBacklogFilters>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);

  // Helper to open drawer with specific tab
  const openDrawerWithTab = (requestId: string, tab?: string) => {
    setDrawerRequestId(requestId);
    setDrawerInitialTab(tab);
  };

  // Transform business requests to match table format
  const tableData: RequestItem[] = useMemo(() => {
    let data = businessRequests.map((br: any) => ({
      id: br.request_key || br.id?.slice(0, 8) || '—',
      _dbId: br.id,
      summary: br.title || '—',
      processStep: br.process_step?.toLowerCase().replace(/ /g, '_') || 'new_request',
      score: br.business_score ?? null,
      autoPriority: br.priority_tier || 'unscored',
      rank: br.rank ?? null,
      reporter: br.requestor_name || null,
      assignee: br.assignee_name || br.assignee || null,
      assigneeId: br.assignee || null,
      department: br.department || null,
      departmentId: br.department_id || null,
      businessOwner: br.business_owner || null,
      businessOwnerId: br.business_owner_id || null,
      businessAsk: br.start_date?.split('T')[0] || null,
      kickoff: br.impl_start_date?.split('T')[0] || null,
      targetComplete: br.impl_target_end_date?.split('T')[0] || null,
      deliveryTrack: br.delivery_track || null,
      platform: br.delivery_platform || null,
      quarter: br.planned_quarter?.[0] || null,
      createdAt: br.created_at?.split('T')[0] || null,
      updatedAt: br.updated_at?.split('T')[0] || null,
      ea_review_required: br.ea_review_required ?? true,
    }));
    
    // Apply scoring filter from store
    if (scoringFilter === 'scored') {
      data = data.filter(row => row.score !== null);
    } else if (scoringFilter === 'unscored') {
      data = data.filter(row => row.score === null);
    }
    
    // Apply dialog filters
    if (filters.status) {
      data = data.filter(row => row.processStep === filters.status);
    }
    if (filters.priority) {
      data = data.filter(row => row.autoPriority?.toLowerCase() === filters.priority);
    }
    if (filters.department) {
      data = data.filter(row => row.departmentId === filters.department || row.department === filters.department);
    }
    if (filters.businessOwner) {
      data = data.filter(row => row.businessOwnerId === filters.businessOwner);
    }
    if (filters.quarter) {
      data = data.filter(row => row.quarter?.toLowerCase().replace(' ', '_') === filters.quarter);
    }
    if (filters.scored && filters.scored !== 'all') {
      if (filters.scored === 'scored') {
        data = data.filter(row => row.score !== null);
      } else if (filters.scored === 'unscored') {
        data = data.filter(row => row.score === null);
      }
    }
    if (filters.scoreMin !== undefined) {
      data = data.filter(row => row.score !== null && row.score >= filters.scoreMin!);
    }
    if (filters.scoreMax !== undefined) {
      data = data.filter(row => row.score !== null && row.score <= filters.scoreMax!);
    }
    
    return data;
  }, [businessRequests, scoringFilter, filters]);

  // Filter and sort for list panel
  const sortedRequests = useMemo(() => {
    let filtered = [...tableData];
    
    // Apply list search
    if (listSearchQuery) {
      const query = listSearchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.summary.toLowerCase().includes(query) ||
        r.id.toLowerCase().includes(query)
      );
    }
    
    // Apply quick filter
    if (activeFilter === 'high') {
      filtered = filtered.filter(r => 
        r.autoPriority?.toLowerCase() === 'high' || 
        r.autoPriority?.toLowerCase() === 'critical'
      );
    } else if (activeFilter === 'unscored') {
      filtered = filtered.filter(r => 
        r.autoPriority?.toLowerCase() === 'unscored' || r.score === null
      );
    }
    // 'my' filter would need user context - skip for now
    
    // Sort: ranked first, then by score
    return filtered.sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank;
      if (a.rank && !b.rank) return -1;
      if (!a.rank && b.rank) return 1;
      return (b.score || 0) - (a.score || 0);
    });
  }, [tableData, listSearchQuery, activeFilter]);

  // Handle field update
  const handleFieldUpdate = async (field: string, value: any) => {
    if (!selectedRequest) return;

    const fieldMap: Record<string, string> = {
      processStep: 'process_step',
      department: 'department',
      departmentId: 'department_id',
      department_id: 'department_id',
      businessOwner: 'business_owner',
      business_owner: 'business_owner',
      businessOwnerId: 'business_owner_id',
      business_owner_id: 'business_owner_id',
      platform: 'delivery_platform',
      delivery_platform: 'delivery_platform',
      summary: 'title',
      autoPriority: 'priority_tier',
      quarter: 'planned_quarter',
      planned_quarter: 'planned_quarter',
      assignee: 'assignee',
      assigneeId: 'assignee_id',
      kickoff: 'impl_start_date',
      targetComplete: 'end_date',
    };

    // Handle batch updates (multiple fields at once)
    if (field === '_batch' && typeof value === 'object') {
      const updatePayload: Record<string, any> = {};
      const localUpdates: Record<string, any> = {};
      
      for (const [key, val] of Object.entries(value)) {
        const dbField = fieldMap[key] || key;
        updatePayload[dbField] = val;
        localUpdates[key] = val;
      }

      const { error } = await supabase
        .from('business_requests')
        .update(updatePayload)
        .eq('id', selectedRequest._dbId);

      if (error) {
        toast.error(`Failed to update: ${error.message}`);
        return;
      }

      // Update local state with all fields
      setSelectedRequest(prev => prev ? { ...prev, ...localUpdates } : null);
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      toast.success('Updated successfully');
      return;
    }

    const dbField = fieldMap[field] || field;
    const dbValue = field === 'quarter' || field === 'planned_quarter' ? (Array.isArray(value) ? value : [value]) : value;
    
    const { error } = await supabase
      .from('business_requests')
      .update({ [dbField]: dbValue })
      .eq('id', selectedRequest._dbId);

    if (error) {
      toast.error(`Failed to update: ${error.message}`);
      return;
    }

    // Update local state
    setSelectedRequest(prev => prev ? { ...prev, [field]: value } : null);
    queryClient.invalidateQueries({ queryKey: ['business-requests'] });
    toast.success('Updated successfully');
  };

  // Handle clone
  const handleClone = async () => {
    if (!selectedRequest) return;
    
    // Fetch original and clone
    const { data: original, error: fetchError } = await supabase
      .from('business_requests')
      .select('*')
      .eq('id', selectedRequest._dbId)
      .single();

    if (fetchError || !original) {
      toast.error('Failed to clone request');
      return;
    }

    const { id, request_key, created_at, updated_at, ...cloneData } = original;
    const { data: newRequest, error: insertError } = await supabase
      .from('business_requests')
      .insert({ ...cloneData, title: `${original.title} (Copy)` })
      .select('request_key, id')
      .single();

    if (insertError || !newRequest) {
      toast.error('Failed to clone request');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['business-requests'] });
    
    // Show the new cloned request key
    const newKey = newRequest.request_key || newRequest.id?.slice(0, 8);
    toast.success(`Request cloned successfully as ${newKey}`, {
      description: 'The new request has been added to the backlog.',
      duration: 5000,
    });
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedRequest) return;

    const { error } = await supabase
      .from('business_requests')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', selectedRequest._dbId);

    if (error) {
      toast.error('Failed to delete request');
      return;
    }

    setSelectedRequest(null);
    setDeleteDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['business-requests'] });
    toast.success('Request deleted');
  };

  // Export to CSV
  const handleExport = useCallback(() => {
    if (tableData.length === 0) {
      toast.error('No items to export');
      return;
    }

    try {
      const headers = ['Request ID', 'Summary', 'Status', 'Score', 'Priority', 'Rank', 'Department', 'Business Owner', 'Quarter', 'Created'];
      
      const rows = tableData.map((item) => [
        item.id || '',
        (item.summary || '').replace(/,/g, ';').replace(/\n/g, ' '),
        item.processStep?.replace(/_/g, ' ') || '',
        item.score ?? '',
        item.autoPriority || '',
        item.rank ?? '',
        item.department || '',
        item.businessOwner || '',
        item.quarter || '',
        item.createdAt || '',
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
      activeView="list"
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
      <div className="h-full flex" style={{ backgroundColor: 'var(--bg)' }}>
        {/* Left Panel - List (380px) */}
        <div className="w-[380px] shrink-0">
          <RequestListPanel
            requests={sortedRequests}
            selectedRequestId={selectedRequest?._dbId || null}
            onSelectRequest={(req) => {
              setSelectedRequest(req);
              // Don't open drawer on ticket click - only select it for detail panel
            }}
            searchQuery={listSearchQuery}
            onSearchChange={setListSearchQuery}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onCreateRequest={() => setCreateModalOpen(true)}
            isLoading={isLoading}
          />
        </div>

        {/* Right Panel - Detail (flex-1) */}
        <div className="flex-1 min-w-0">
          <RequestDetailPanel
            request={selectedRequest}
            onUpdateField={handleFieldUpdate}
            onEdit={() => selectedRequest && openDrawerWithTab(selectedRequest._dbId)}
            onClone={handleClone}
            onDelete={() => setDeleteDialogOpen(true)}
            onOpenDrawer={() => selectedRequest && openDrawerWithTab(selectedRequest._dbId)}
            onAttachment={() => {
              if (selectedRequest) {
                setAttachmentModalOpen(true);
              }
            }}
            onLink={() => {
              if (selectedRequest) {
                openDrawerWithTab(selectedRequest._dbId, 'links');
              }
            }}
            onScore={() => {
              if (selectedRequest) {
                openDrawerWithTab(selectedRequest._dbId, 'business-score');
              }
            }}
          />
        </div>
      </div>

      {/* Attachment Upload Modal */}
      {selectedRequest && (
        <AttachmentUploadModal
          open={attachmentModalOpen}
          onOpenChange={setAttachmentModalOpen}
          requestId={selectedRequest._dbId}
          requestKey={selectedRequest.id}
        />
      )}

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
        onClose={() => {
          setDrawerRequestId(null);
          setDrawerInitialTab(undefined);
        }}
        requestId={drawerRequestId}
        initialTab={drawerInitialTab}
        onRequestChange={() => queryClient.invalidateQueries({ queryKey: ['business-requests'] })}
      />

      {/* Create Modal */}
      <CreateBusinessRequestModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedRequest?.summary}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageChrome>
  );
}
