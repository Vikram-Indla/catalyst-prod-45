import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

// Atlaskit imports
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button/standard-button';
import Lozenge from '@atlaskit/lozenge';
import { Checkbox } from '@atlaskit/checkbox';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';
import { DynamicTableStateless } from '@atlaskit/dynamic-table';
import type { RowType, HeadType } from '@atlaskit/dynamic-table/types';
import { Content, LeftSidebar, Main, PageLayout } from '@atlaskit/page-layout';
import { SideNavigation, NavigationHeader, Header, NestableNavigationContent, Section, ButtonItem } from '@atlaskit/side-navigation';

// Icons
import { Plus, Search, Download, ChevronLeft, ChevronRight, Filter, Lock } from 'lucide-react';

// Local components
import { FilterDemandsDialog, SmartFilters } from '@/components/business-requests/FilterDemandsDialog';
import { useBusinessRequests } from '@/hooks/useBusinessRequests';
import { CreateBusinessRequestModal } from '@/components/business-requests/CreateBusinessRequestModal';
import { BusinessRequestDrawer } from '@/components/business-requests/BusinessRequestDrawer';
import { ViewToggle, ViewMode } from '@/components/business-requests/ViewToggle';
import { BusinessRequestsKanbanView } from '@/components/business-requests/BusinessRequestsKanbanView';
import { PROCESS_STEPS } from '@/types/business-request';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SavedFiltersDropdown } from '@/components/shared/SavedFiltersDropdown';

// Atlaskit CSS reset and tokens
import '@atlaskit/css-reset';
import { token } from '@atlaskit/tokens';

// Token-based styling helpers
const colors = {
  background: token('elevation.surface', '#F4F5F7'),
  surface: token('elevation.surface.raised', '#FFFFFF'),
  textPrimary: token('color.text', '#172B4D'),
  textSecondary: token('color.text.subtlest', '#6B778C'),
  link: token('color.link', '#0052CC'),
  border: token('color.border', '#DFE1E6'),
  hoverBg: token('color.background.neutral.hovered', '#F4F5F7'),
  selectedBg: token('color.background.selected', '#DEEBFF'),
  focusBorder: token('color.border.focused', '#4C9AFF'),
};

const spacing = {
  s050: token('space.050', '4px'),
  s100: token('space.100', '8px'),
  s150: token('space.150', '12px'),
  s200: token('space.200', '16px'),
  s250: token('space.250', '20px'),
  s300: token('space.300', '24px'),
  s400: token('space.400', '32px'),
  s500: token('space.500', '40px'),
  s600: token('space.600', '48px'),
};

// Status mapping for Atlaskit Lozenge
type LozengeAppearance = 'default' | 'inprogress' | 'moved' | 'new' | 'removed' | 'success';

const getLozengeAppearance = (status: string): LozengeAppearance => {
  switch (status) {
    case 'implemented':
    case 'closed':
      return 'success';
    case 'in_progress':
    case 'active':
      return 'inprogress';
    case 'on_hold':
    case 'paused':
      return 'moved';
    case 'request_received':
    case 'received':
    case 'new_request':
      return 'new';
    case 'rejected':
      return 'removed';
    default:
      return 'default';
  }
};

const calculateAgeing = (createdAt: string | null): number => {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const ITEMS_PER_PAGE = 20;

export default function IndustryPageAtlaskit() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [filters, setFilters] = useState<SmartFilters>({});
  const [sortKey, setSortKey] = useState<string>('rank');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle create=true from URL
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setCreateModalOpen(true);
      searchParams.delete('create');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: requests, isLoading } = useBusinessRequests(searchQuery);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('business-requests-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'business_requests' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['business-requests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Calculate active filter count
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'activeSmartFilter' || key === 'requestIdMode') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (value instanceof Date) return true;
    return value !== undefined && value !== '' && value !== null;
  }).length;

  // Process and sort data
  const sortedRequests = useMemo(() => {
    if (!requests || requests.length === 0) return [];
    
    let filtered = [...requests];

    // Apply filters (simplified for brevity - actual implementation would include all filters)
    if (filters.processStep && filters.processStep.length > 0) {
      filtered = filtered.filter((r: any) => {
        const dbValue = r.process_step;
        if (filters.processStep!.includes(dbValue)) return true;
        const matchingStep = PROCESS_STEPS.find(s => s.label === dbValue);
        if (matchingStep && filters.processStep!.includes(matchingStep.value)) return true;
        return false;
      });
    }

    // Sort
    return filtered.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      
      if (sortKey === 'business_score') {
        aVal = a.business_score ?? 0;
        bVal = b.business_score ?? 0;
      }
      
      if (sortOrder === 'ASC') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    }).map((req, idx) => ({
      ...req,
      displayRank: idx + 1
    }));
  }, [requests, filters, sortKey, sortOrder]);

  const totalPages = Math.ceil(sortedRequests.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRequests = sortedRequests.slice(startIndex, endIndex);

  const handleSort = (key: string, order: 'ASC' | 'DESC') => {
    setSortKey(key);
    setSortOrder(order);
  };

  const handleExport = () => {
    if (requests && requests.length > 0) {
      const exportData = requests.map(req => ({
        'Request ID': req.request_key || '',
        'Summary': req.title || '',
        'Score': req.business_score ?? '',
        'Rank': req.rank ?? '',
        'Delivery Platform': req.delivery_platform || '',
        'Process Step': req.process_step || '',
        'Business Owner': req.business_owner || '',
        'Submitted Date': req.created_at ? formatDate(req.created_at) : '',
        'Ageing': req.created_at ? calculateAgeing(req.created_at) : '',
        'Quarter': req.planned_quarter || '',
        'Target Date': req.end_date ? formatDate(req.end_date) : '',
      }));
      
      const headers = Object.keys(exportData[0]);
      const csvRows = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(h => {
            const val = String(row[h as keyof typeof row] ?? '');
            return val.includes(',') || val.includes('"') || val.includes('\n') 
              ? `"${val.replace(/"/g, '""')}"` 
              : val;
          }).join(',')
        )
      ];
      
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `industry-requests-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      
      toast({ title: 'Requests exported successfully' });
    }
  };

  // Dynamic Table Head
  const head: HeadType = {
    cells: [
      { key: 'checkbox', content: '', width: 3 },
      { key: 'request_key', content: 'Request ID', isSortable: true, width: 10 },
      { key: 'title', content: 'Summary', isSortable: true, width: 25 },
      { key: 'process_step', content: 'Status', isSortable: true, width: 12 },
      { key: 'rank', content: 'Rank', isSortable: true, width: 6 },
      { key: 'delivery_platform', content: 'Platform', isSortable: true, width: 12 },
      { key: 'business_owner', content: 'Business Owner', isSortable: true, width: 12 },
      { key: 'planned_quarter', content: 'Quarter', isSortable: true, width: 8 },
      { key: 'end_date', content: 'Target Date', isSortable: true, width: 10 },
      { key: 'department', content: 'Department', isSortable: true, width: 10 },
    ],
  };

  // Dynamic Table Rows
  const rows: RowType[] = paginatedRequests.map((request: any) => ({
    key: request.id,
    onClick: () => setSelectedRequestId(request.id),
    cells: [
      {
        key: 'checkbox',
        content: (
          <Checkbox
            isChecked={selectedRows.includes(request.id)}
            onChange={() => {
              setSelectedRows(prev => 
                prev.includes(request.id) 
                  ? prev.filter(id => id !== request.id)
                  : [...prev, request.id]
              );
            }}
          />
        ),
      },
      {
        key: 'request_key',
        content: (
          <span 
            style={{ color: colors.link, cursor: 'pointer', fontWeight: 500 }}
            onClick={(e) => { e.stopPropagation(); setSelectedRequestId(request.id); }}
          >
            {request.request_key?.startsWith('MIM-') ? request.request_key : `MIM-${String(request.request_key || '').padStart(3, '0')}`}
          </span>
        ),
      },
      {
        key: 'title',
        content: (
          <span style={{ color: colors.textPrimary }}>
            {request.title || '-'}
          </span>
        ),
      },
      {
        key: 'process_step',
        content: (
          <Lozenge appearance={getLozengeAppearance(request.process_step)}>
            {PROCESS_STEPS.find(s => s.value === request.process_step)?.label || request.process_step || '-'}
          </Lozenge>
        ),
      },
      {
        key: 'rank',
        content: (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.textPrimary }}>
            {request.is_force_ranked && <Lock size={12} style={{ color: colors.textSecondary }} />}
            {request.rank ?? '-'}
          </span>
        ),
      },
      {
        key: 'delivery_platform',
        content: <span style={{ color: colors.textSecondary }}>{request.delivery_platform || '-'}</span>,
      },
      {
        key: 'business_owner',
        content: <span style={{ color: colors.textSecondary }}>{request.business_owner || '-'}</span>,
      },
      {
        key: 'planned_quarter',
        content: <span style={{ color: colors.textSecondary }}>{request.planned_quarter || '-'}</span>,
      },
      {
        key: 'end_date',
        content: <span style={{ color: colors.textSecondary }}>{formatDate(request.end_date)}</span>,
      },
      {
        key: 'department',
        content: <span style={{ color: colors.textSecondary }}>{request.department || '-'}</span>,
      },
    ],
  }));

  return (
    <PageLayout>
      <Content>
        <LeftSidebar isFixed width={240}>
          <SideNavigation label="Product navigation">
            <NavigationHeader>
              <Header>Product</Header>
            </NavigationHeader>
            <NestableNavigationContent>
              <Section>
                <ButtonItem isSelected>Demand Intake</ButtonItem>
                <ButtonItem>Roadmaps</ButtonItem>
                <ButtonItem>Backlog</ButtonItem>
                <ButtonItem>Reports</ButtonItem>
              </Section>
            </NestableNavigationContent>
          </SideNavigation>
        </LeftSidebar>
        
        <Main>
          <div style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: colors.background,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
          }}>
      {/* Page Header */}
      <div style={{
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        padding: `${spacing.s300} ${spacing.s400}`,
      }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: 500, 
          color: colors.textPrimary,
          margin: 0,
          lineHeight: '28px',
        }}>
          Demand Intake
        </h1>
        <p style={{ 
          fontSize: '14px', 
          color: colors.textSecondary,
          margin: '4px 0 0 0',
          lineHeight: '20px',
        }}>
          Industry-specific demand requests
        </p>
      </div>

      {/* Toolbar */}
      <div style={{
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        padding: `${spacing.s150} ${spacing.s400}`,
        display: 'flex',
        alignItems: 'center',
        gap: spacing.s200,
        flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', width: '320px' }}>
          <Search 
            size={16} 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: colors.textSecondary,
              pointerEvents: 'none',
              zIndex: 1,
            }} 
          />
          <Textfield
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
          />
        </div>

        {/* View Toggle */}
        <ViewToggle currentView={viewMode} onViewChange={setViewMode} />

        {/* Pagination Info */}
        {viewMode === 'list' && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            border: `1px solid ${colors.border}`,
            borderRadius: '3px',
            padding: '0 8px',
            height: '32px',
            backgroundColor: colors.surface,
          }}>
            <button 
              onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                padding: '4px',
                display: 'flex',
                opacity: currentPage === 1 ? 0.5 : 1,
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ 
              fontSize: '14px', 
              color: colors.textPrimary,
              whiteSpace: 'nowrap',
            }}>
              {sortedRequests.length > 0 ? `${startIndex + 1}-${Math.min(endIndex, sortedRequests.length)} of ${sortedRequests.length}` : '0 items'}
            </span>
            <button 
              onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                padding: '4px',
                display: 'flex',
                opacity: currentPage >= totalPages ? 0.5 : 1,
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Action Buttons */}
        <SavedFiltersDropdown
          entityType="demand"
          currentFilters={filters}
          onApplyFilter={(savedFilters) => setFilters(savedFilters as SmartFilters)}
          hasActiveFilters={activeFilterCount > 0}
        />

        <Button
          onClick={() => setFiltersDialogOpen(true)}
          iconBefore={<Filter size={16} />}
          appearance={activeFilterCount > 0 ? 'primary' : 'default'}
        >
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </Button>

        <Button
          onClick={handleExport}
          iconBefore={<Download size={16} />}
        >
          Export
        </Button>

        <Button
          appearance="primary"
          onClick={() => setCreateModalOpen(true)}
          iconBefore={<Plus size={16} />}
        >
          Create
        </Button>
      </div>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        padding: spacing.s400,
      }}>
        {isLoading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '200px',
          }}>
            <Spinner size="large" />
          </div>
        ) : viewMode === 'kanban' ? (
          <BusinessRequestsKanbanView 
            requests={sortedRequests} 
            onRequestSelect={setSelectedRequestId}
          />
        ) : sortedRequests.length > 0 ? (
          <div style={{
            backgroundColor: colors.surface,
            borderRadius: '3px',
            boxShadow: '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px 1px rgba(9, 30, 66, 0.13)',
          }}>
            <DynamicTableStateless
              head={head}
              rows={rows}
              sortKey={sortKey}
              sortOrder={sortOrder}
              onSort={(data) => handleSort(data.key, data.sortOrder)}
              isFixedSize
            />
          </div>
        ) : (
          <EmptyState
            header="No requests found"
            description="There are no demand requests matching your criteria."
            primaryAction={
              <Button appearance="primary" onClick={() => setCreateModalOpen(true)}>
                Create Request
              </Button>
            }
          />
        )}
      </div>

      {/* Bottom Pagination */}
      {viewMode === 'list' && sortedRequests.length > ITEMS_PER_PAGE && (
        <div style={{
          backgroundColor: colors.surface,
          borderTop: `1px solid ${colors.border}`,
          padding: `${spacing.s150} ${spacing.s400}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ 
            fontSize: '14px', 
            color: colors.textSecondary,
          }}>
            Showing {startIndex + 1}-{Math.min(endIndex, sortedRequests.length)} of {sortedRequests.length} requests
          </span>
          
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {/* First page */}
            <button 
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${colors.border}`,
                borderRadius: '3px',
                backgroundColor: currentPage === 1 ? colors.hoverBg : colors.surface,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1,
              }}
            >
              «
            </button>
            
            {/* Previous */}
            <button 
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${colors.border}`,
                borderRadius: '3px',
                backgroundColor: currentPage === 1 ? colors.hoverBg : colors.surface,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1,
              }}
            >
              ‹
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${currentPage === pageNum ? colors.link : colors.border}`,
                    borderRadius: '3px',
                    backgroundColor: currentPage === pageNum ? colors.link : colors.surface,
                    color: currentPage === pageNum ? '#FFFFFF' : colors.textPrimary,
                    cursor: 'pointer',
                    fontWeight: currentPage === pageNum ? 600 : 400,
                    fontSize: '14px',
                  }}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Next */}
            <button 
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${colors.border}`,
                borderRadius: '3px',
                backgroundColor: currentPage >= totalPages ? colors.hoverBg : colors.surface,
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage >= totalPages ? 0.5 : 1,
              }}
            >
              ›
            </button>

            {/* Last page */}
            <button 
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${colors.border}`,
                borderRadius: '3px',
                backgroundColor: currentPage >= totalPages ? colors.hoverBg : colors.surface,
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage >= totalPages ? 0.5 : 1,
              }}
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* Dialogs and Modals */}
      <FilterDemandsDialog 
        open={filtersDialogOpen} 
        onOpenChange={setFiltersDialogOpen}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <CreateBusinessRequestModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
      />

      <BusinessRequestDrawer 
        isOpen={!!selectedRequestId}
        requestId={selectedRequestId} 
        onClose={() => setSelectedRequestId(null)} 
      />
          </div>
        </Main>
      </Content>
    </PageLayout>
  );
}
