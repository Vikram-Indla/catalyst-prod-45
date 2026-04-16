/**
 * Product Backlog Page - Split Panel Layout
 * Left panel: Compact list of requests
 * Right panel: Full detail view of selected request
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useBusinessRequests } from '@/hooks/useBusinessRequests';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import { CreateBusinessRequestModal } from '@/components/business-requests/CreateBusinessRequestModal';
import { ProductBacklogFiltersDialog, ProductBacklogFilters } from '../components/ProductBacklogFiltersDialog';
import { RequestListPanel, RequestDetailPanel, AttachmentUploadModal } from '../components/split-panel';
import { supabase, typedQuery } from '@/integrations/supabase/client';
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
  reporterId?: string | null;
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
  hasAttachments?: boolean;
}

export default function CatalystDemandList() {
  const queryClient = useQueryClient();
  
  // Get current user for "My Items" filter
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, []);
  
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
  
  // Fetch attachment info as a separate non-blocking query
  const requestIds = useMemo(() => businessRequests.map((br: any) => br.id), [businessRequests]);
  const { data: attachmentMap = {} } = useQuery({
    queryKey: ['business-request-attachments', requestIds],
    queryFn: async () => {
      if (requestIds.length === 0) return {};
      const { data: links } = await typedQuery('business_request_links')
        .select('business_request_id')
        .in('business_request_id', requestIds);
      const map: Record<string, boolean> = {};
      ((links || []) as any[]).forEach((link: any) => {
        map[link.business_request_id] = true;
      });
      return map;
    },
    enabled: requestIds.length > 0,
    staleTime: 60_000,
  });
  
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [drawerRequestId, setDrawerRequestId] = useState<string | null>(null);
  const [drawerInitialTab, setDrawerInitialTab] = useState<string | undefined>(undefined);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [filters, setFilters] = useState<ProductBacklogFilters>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);

  // Sync selectedRequest with latest data from businessRequests when it updates via realtime
  useEffect(() => {
    if (!selectedRequest || businessRequests.length === 0) return;
    
    // Find the updated version of the currently selected request
    const updatedRequest = businessRequests.find((br: any) => br.id === selectedRequest._dbId) as any;
    if (updatedRequest) {
      // Transform to RequestItem format and update local state
      const transformed: RequestItem = {
        id: updatedRequest.request_key || updatedRequest.id?.slice(0, 8) || '—',
        _dbId: updatedRequest.id,
        summary: updatedRequest.title || '—',
        processStep: updatedRequest.process_step?.toLowerCase().replace(/ /g, '_') || 'new_request',
        score: updatedRequest.business_score ?? null,
        autoPriority: updatedRequest.priority_tier || 'unscored',
        rank: updatedRequest.rank ?? null,
        reporter: updatedRequest.requestor_name || null,
        reporterId: updatedRequest.requestor || null,
        assignee: updatedRequest.assignee_name || updatedRequest.assignee || null,
        assigneeId: updatedRequest.assignee || null,
        department: updatedRequest.department || null,
        departmentId: updatedRequest.department_id || null,
        businessOwner: updatedRequest.business_owner || null,
        businessOwnerId: updatedRequest.business_owner_id || null,
        businessAsk: updatedRequest.start_date?.split('T')[0] || null,
        kickoff: updatedRequest.impl_start_date?.split('T')[0] || null,
        targetComplete: updatedRequest.end_date?.split('T')[0] || updatedRequest.impl_target_end_date?.split('T')[0] || null,
        deliveryTrack: updatedRequest.delivery_track || null,
        platform: updatedRequest.delivery_platform || null,
        quarter: updatedRequest.planned_quarter?.[0] || null,
        createdAt: updatedRequest.created_at || null,
        updatedAt: updatedRequest.updated_at || null,
        ea_review_required: updatedRequest.ea_review_required ?? true,
        hasAttachments: !!attachmentMap[updatedRequest.id],
      };
      
      // Only update if data has changed to avoid infinite loops
      if (JSON.stringify(transformed) !== JSON.stringify(selectedRequest)) {
        setSelectedRequest(transformed);
      }
    }
  }, [businessRequests, selectedRequest?._dbId, attachmentMap]);

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
      reporterId: br.requestor || null,
      assignee: br.assignee_name || br.assignee || null,
      assigneeId: br.assignee || null,
      department: br.department || null,
      departmentId: br.department_id || null,
      businessOwner: br.business_owner || null,
      businessOwnerId: br.business_owner_id || null,
      businessAsk: br.start_date?.split('T')[0] || null,
      kickoff: br.impl_start_date?.split('T')[0] || null,
      // Use end_date as canonical Target Complete (create modal writes to end_date)
      targetComplete: br.end_date?.split('T')[0] || br.impl_target_end_date?.split('T')[0] || null,
      deliveryTrack: br.delivery_track || null,
      platform: br.delivery_platform || null,
      quarter: br.planned_quarter?.[0] || null,
      createdAt: br.created_at || null,
      updatedAt: br.updated_at || null,
      ea_review_required: br.ea_review_required ?? true,
      hasAttachments: !!attachmentMap[br.id],
    }));
    
    // Apply scoring filter from store
    if (scoringFilter === 'scored') {
      data = data.filter(row => row.score !== null && row.score > 0);
    } else if (scoringFilter === 'unscored') {
      // Treat 0 as unscored (newly created requests default to 0)
      data = data.filter(row => row.score === null || row.score === 0);
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
  }, [businessRequests, scoringFilter, filters, attachmentMap]);

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
    } else if (activeFilter === 'my' && currentUserId) {
      // Filter items where current user is assignee OR reporter
      filtered = filtered.filter(r => 
        r.assigneeId === currentUserId || r.reporterId === currentUserId
      );
    }
    
    // Default sort: latest created first
    return filtered.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [tableData, listSearchQuery, activeFilter, currentUserId]);

  // Auto-select first item when page loads and no item is selected
  useEffect(() => {
    if (!selectedRequest && sortedRequests.length > 0 && !isLoading) {
      setSelectedRequest(sortedRequests[0]);
    }
  }, [sortedRequests, selectedRequest, isLoading]);

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
      businessAsk: 'start_date',
      kickoff: 'impl_start_date',
      targetComplete: 'impl_target_end_date',
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

      const { error } = await typedQuery('business_requests')
        .update(updatePayload)
        .eq('id', selectedRequest._dbId);

      if (error) {
        toast.error(`Failed to update: ${error.message}`);
        return;
      }

      // Update local state with all fields
      setSelectedRequest(prev => prev ? { ...prev, ...localUpdates } : null);

      // Ensure both list + drawer detail queries refresh
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['business-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['business-request', selectedRequest._dbId] }),
      ]);
      return;
    }

    const dbField = fieldMap[field] || field;
    // When updating targetComplete, also sync end_date for consistency
    let dbValue = field === 'quarter' || field === 'planned_quarter' ? (Array.isArray(value) ? value : [value]) : value;
    
    let updatePayload: Record<string, any> = { [dbField]: dbValue };
    if (field === 'targetComplete') {
      // Keep end_date and impl_target_end_date in sync
      updatePayload = { end_date: dbValue, impl_target_end_date: dbValue };
    }
    
    const { error } = await typedQuery('business_requests')
      .update(updatePayload)
      .eq('id', selectedRequest._dbId);

    if (error) {
      toast.error(`Failed to update: ${error.message}`);
      return;
    }

    // Update local state
    setSelectedRequest(prev => prev ? { ...prev, [field]: value } : null);
    
    // Invalidate and wait for refetch to ensure UI is in sync (list + drawer)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['business-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['business-request', selectedRequest._dbId] }),
    ]);
    
    // Show success toast for status changes
    if (field === 'processStep') {
      toast.success('Status updated');
    }
  };

  // Handle clone
  const handleClone = async () => {
    if (!selectedRequest) return;

    // Get current user for reporter field
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch original (only need title)
    const { data: original, error: fetchError } = await typedQuery('business_requests')
      .select('title, id')
      .eq('id', selectedRequest._dbId)
      .maybeSingle();

    const originalTyped = original as { title: string; id: string } | null;
    if (fetchError || !originalTyped) {
      toast.error('Failed to clone request');
      return;
    }

    // Create a fresh demand: only copy the summary/title, reset status + scoring
    const { data: newRequest, error: insertError } = await typedQuery('business_requests')
      .insert({
        title: `${originalTyped.title} (Copy)`,
        process_step: 'new_request',
        requestor: user?.id || null, // Set reporter to current user

        // Ensure cloned demand starts unscored
        business_score: null,
        business_value: null,
        score_strategic_alignment: null,
        score_time_urgency: null,
        score_resource_feasibility: null,
        rank: null,
        priority_tier: null,
        is_force_ranked: false,
        rank_override_justification: null,
      })
      .select('request_key, id')
      .single();

    const newRequestTyped = newRequest as { request_key: string; id: string } | null;
    if (insertError || !newRequestTyped) {
      toast.error('Failed to clone request');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['business-requests'] });

    // Show the new cloned request key
    const newKey = newRequestTyped.request_key || newRequestTyped.id?.slice(0, 8);
    toast.success(`Request cloned successfully as ${newKey}`, {
      description: 'The new request has been added to the backlog.',
      duration: 5000,
    });
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedRequest) return;

    const { error } = await typedQuery('business_requests')
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
        item.createdAt ? item.createdAt.split('T')[0] : '',
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

  // Mobile: show detail panel when a request is selected
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  
  // Handle request selection - on mobile, show detail panel
  const handleSelectRequest = (req: RequestItem) => {
    setSelectedRequest(req);
    setMobileShowDetail(true);
  };
  
  // Handle back on mobile
  const handleMobileBack = () => {
    setMobileShowDetail(false);
  };

  return (
    <PageChrome toolbar={toolbarElement}>
      <div className="h-full flex flex-col md:flex-row" style={{ backgroundColor: 'var(--bg)' }}>
        {/* Left Panel - List */}
        <div className={cn(
          "w-full md:w-[380px] shrink-0 h-full",
          mobileShowDetail ? "hidden md:block" : "block"
        )}>
          <RequestListPanel
            requests={sortedRequests}
            selectedRequestId={selectedRequest?._dbId || null}
            onSelectRequest={handleSelectRequest}
            searchQuery={listSearchQuery}
            onSearchChange={setListSearchQuery}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onCreateRequest={() => setCreateModalOpen(true)}
            isLoading={isLoading}
          />
        </div>

        {/* Right Panel - Detail */}
        <div className={cn(
          "flex-1 min-w-0 h-full",
          mobileShowDetail ? "block" : "hidden md:block"
        )}>
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
            onMobileBack={handleMobileBack}
            showMobileBack={mobileShowDetail}
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
