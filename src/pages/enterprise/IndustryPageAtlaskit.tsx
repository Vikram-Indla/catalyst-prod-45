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
import { Content, LeftSidebar, Main, PageLayout, TopNavigation } from '@atlaskit/page-layout';
import { SideNavigation, NavigationHeader, Header, NestableNavigationContent, Section, ButtonItem, HeadingItem } from '@atlaskit/side-navigation';
import Avatar from '@atlaskit/avatar';

// Icons
import { Plus, Search, Download, ChevronLeft, ChevronRight, Filter, Lock, Bell, Settings, Home, Briefcase, Package, Folder, Layers, Box, MoreHorizontal, AlertTriangle } from 'lucide-react';

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

const getStatusAppearance = (status: string): LozengeAppearance => {
  const statusUpper = status?.toUpperCase() || '';
  const mapping: Record<string, LozengeAppearance> = {
    'IMPLEMENT': 'success',           // Green
    'READY_TO_IMPLEMENT': 'success',  // Green
    'NEW REQUEST': 'inprogress',      // Blue
    'NEW_REQUEST': 'inprogress',      // Blue
    'ANALYSE': 'inprogress',          // Blue
    'APPROVED': 'new',                // Purple
    'CLOSED': 'default',              // Gray
    'ON_HOLD': 'moved',               // Yellow
    'REJECTED': 'removed',            // Red
  };
  return mapping[statusUpper] || 'default';
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

  // Select all checkbox handler
  const handleSelectAll = () => {
    if (selectedRows.length === paginatedRequests.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedRequests.map((r: any) => r.id));
    }
  };

  // Dynamic Table Head
  const head: HeadType = {
    cells: [
      { 
        key: 'checkbox', 
        content: (
          <Checkbox 
            isChecked={selectedRows.length === paginatedRequests.length && paginatedRequests.length > 0}
            isIndeterminate={selectedRows.length > 0 && selectedRows.length < paginatedRequests.length}
            onChange={handleSelectAll}
          />
        ), 
        width: 3,
        isSortable: false,
      },
      { key: 'request_key', content: 'REQUEST ID', isSortable: true, width: 8 },
      { key: 'title', content: 'SUMMARY', isSortable: true, width: 20 },
      { key: 'process_step', content: 'PROCESS STEP', isSortable: true, width: 10 },
      { key: 'rank', content: 'RANK', isSortable: true, width: 5 },
      { key: 'delivery_platform', content: 'DELIVERY PLATFORM', isSortable: true, width: 12 },
      { key: 'business_owner', content: 'BUSINESS OWNER', isSortable: true, width: 10 },
      { key: 'planned_quarter', content: 'QUARTER', isSortable: true, width: 8 },
      { key: 'end_date', content: 'TARGET DATE', isSortable: true, width: 10 },
      { key: 'department', content: 'DEPARTMENT', isSortable: true, width: 10 },
      { key: 'actions', content: '', width: 4, isSortable: false },
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
          <a 
            href={`/request/${request.id}`}
            style={{ 
              color: token('color.link', '#0052CC'), 
              textDecoration: 'none',
              fontWeight: 500 
            }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedRequestId(request.id); }}
          >
            {request.request_key?.startsWith('MIM-') ? request.request_key : `MIM-${String(request.request_key || '').padStart(3, '0')}`}
          </a>
        ),
      },
      { 
        key: 'title', 
        content: request.title || '-' 
      },
      {
        key: 'process_step',
        content: (
          <Lozenge appearance={getStatusAppearance(request.process_step)}>
            {PROCESS_STEPS.find(s => s.value === request.process_step)?.label || request.process_step || '-'}
          </Lozenge>
        ),
      },
      { 
        key: 'rank', 
        content: request.rank || '-' 
      },
      { 
        key: 'delivery_platform', 
        content: request.delivery_platform || '-' 
      },
      { 
        key: 'business_owner', 
        content: request.business_owner || '-' 
      },
      { 
        key: 'planned_quarter', 
        content: request.planned_quarter || '-' 
      },
      {
        key: 'end_date',
        content: request.end_date ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: token('space.050', '4px') }}>
            {formatDate(request.end_date)}
            {new Date(request.end_date) < new Date() && (
              <AlertTriangle size={14} color={token('color.text.warning', '#FF991F')} />
            )}
          </div>
        ) : '-',
      },
      { 
        key: 'department', 
        content: request.department || '-' 
      },
      {
        key: 'actions',
        content: (
          <DropdownMenu trigger={({ triggerRef, ...props }) => (
            <Button 
              {...props} 
              ref={triggerRef} 
              iconBefore={<MoreHorizontal size={16} />} 
              appearance="subtle" 
            />
          )}>
            <DropdownItemGroup>
              <DropdownItem onClick={() => setSelectedRequestId(request.id)}>Edit</DropdownItem>
              <DropdownItem>Clone</DropdownItem>
              <DropdownItem>Delete</DropdownItem>
            </DropdownItemGroup>
          </DropdownMenu>
        ),
      },
    ],
  }));

  return (
    <PageLayout>
      {/* Top Navigation Bar */}
      <TopNavigation isFixed height={56}>
        <div style={{
          height: '56px',
          backgroundColor: token('elevation.surface', '#FFFFFF'),
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}>
          {/* Left: Logo + Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: token('color.background.brand.bold', '#0052CC'),
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Layers size={18} color="#FFFFFF" />
              </div>
              <span style={{ 
                fontSize: '16px', 
                fontWeight: 600, 
                color: token('color.text', '#172B4D'),
              }}>
                Catalyst
              </span>
            </div>
            
            {/* Navigation Items */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {[
                { label: 'Home', isActive: false },
                { label: 'Enterprise', isActive: false },
                { label: 'Product', isActive: true },
                { label: 'Program', isActive: false },
                { label: 'Project', isActive: false },
                { label: 'Release', isActive: false },
                { label: 'Items', isActive: false },
              ].map((item) => (
                <button
                  key={item.label}
                  style={{
                    padding: '8px 12px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: item.isActive ? token('color.text.brand', '#0052CC') : token('color.text', '#172B4D'),
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: item.isActive ? `2px solid ${token('color.border.brand', '#0052CC')}` : '2px solid transparent',
                    cursor: 'pointer',
                    borderRadius: '3px 3px 0 0',
                    marginBottom: '-1px',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button appearance="primary" iconBefore={<Plus size={16} />}>
              Create
            </Button>
            <button style={{ 
              padding: '8px', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              borderRadius: '3px',
              display: 'flex',
            }}>
              <Bell size={20} color={token('color.text.subtle', '#6B778C')} />
            </button>
            <button style={{ 
              padding: '8px', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              borderRadius: '3px',
              display: 'flex',
            }}>
              <Settings size={20} color={token('color.text.subtle', '#6B778C')} />
            </button>
            <button style={{ 
              padding: '8px', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              borderRadius: '3px',
              display: 'flex',
            }}>
              <Search size={20} color={token('color.text.subtle', '#6B778C')} />
            </button>
            <Avatar size="small" />
          </div>
        </div>
      </TopNavigation>

      <Content>
        {/* Left Sidebar */}
        <LeftSidebar isFixed width={240}>
          <div style={{ 
            backgroundColor: token('color.background.neutral.subtle', '#F4F5F7'),
            height: '100%',
          }}>
            <SideNavigation label="Product navigation">
              <NavigationHeader>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '12px 16px',
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    backgroundColor: token('color.background.accent.blue.subtle', '#DEEBFF'),
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: token('color.text.brand', '#0052CC'),
                  }}>
                    PR
                  </div>
                  <div>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: 600, 
                      color: token('color.text', '#172B4D'),
                    }}>
                      Product
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: token('color.text.subtlest', '#6B778C'),
                    }}>
                      Industry
                    </div>
                  </div>
                </div>
              </NavigationHeader>
              <NestableNavigationContent>
                <Section>
                  <ButtonItem iconBefore={<Home size={16} />}>Product Room</ButtonItem>
                  <ButtonItem iconBefore={<Briefcase size={16} />} isSelected>Backlog</ButtonItem>
                  <ButtonItem iconBefore={<Layers size={16} />}>Roadmap</ButtonItem>
                  <ButtonItem iconBefore={<Box size={16} />}>Capacity</ButtonItem>
                  <ButtonItem iconBefore={<Folder size={16} />}>Knowledge Hub</ButtonItem>
                </Section>
                <Section hasSeparator>
                  <ButtonItem iconBefore={<Settings size={16} />}>Product Settings</ButtonItem>
                </Section>
              </NestableNavigationContent>
            </SideNavigation>
          </div>
        </LeftSidebar>
        
        <Main>
          <div style={{ 
            minHeight: 'calc(100vh - 56px)',
            backgroundColor: token('color.background.neutral', '#F4F5F7'),
            padding: token('space.400', '32px'),
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
          }}>
            {/* Page Header */}
            <div style={{ marginBottom: token('space.300', '24px') }}>
              <h1 style={{ 
                fontSize: '24px', 
                fontWeight: 500, 
                color: token('color.text', '#172B4D'),
                margin: 0,
                lineHeight: '28px',
              }}>
                Demand Intake
              </h1>
              <p style={{ 
                fontSize: '12px', 
                color: token('color.text.subtlest', '#6B778C'),
                margin: '4px 0 0 0',
                lineHeight: '16px',
              }}>
                Industry-specific demand requests
              </p>
            </div>

            {/* Search & Controls Bar */}
            <div style={{
              backgroundColor: token('elevation.surface', '#FFFFFF'),
              padding: token('space.200', '16px'),
              borderRadius: '3px',
              boxShadow: '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px 1px rgba(9, 30, 66, 0.13)',
              marginBottom: token('space.300', '24px'),
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: token('space.200', '16px'),
            }}>
              {/* Left side - Search */}
              <div style={{ position: 'relative', width: '400px' }}>
                <Search 
                  size={16} 
                  style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: token('color.text.subtlest', '#6B778C'),
                    pointerEvents: 'none',
                    zIndex: 1,
                  }} 
                />
                <Textfield
                  placeholder="Search industry requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
                />
              </div>

              {/* Right side - Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px') }}>
                {/* View Toggle */}
                <div style={{ 
                  display: 'flex', 
                  border: `1px solid ${token('color.border', '#DFE1E6')}`,
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}>
                  <button
                    onClick={() => setViewMode('list')}
                    style={{
                      padding: '6px 12px',
                      fontSize: '14px',
                      fontWeight: 500,
                      backgroundColor: viewMode === 'list' ? token('color.background.selected', '#DEEBFF') : 'transparent',
                      color: viewMode === 'list' ? token('color.text.selected', '#0052CC') : token('color.text', '#172B4D'),
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Layers size={16} />
                    List
                  </button>
                  <button
                    onClick={() => setViewMode('kanban')}
                    style={{
                      padding: '6px 12px',
                      fontSize: '14px',
                      fontWeight: 500,
                      backgroundColor: viewMode === 'kanban' ? token('color.background.selected', '#DEEBFF') : 'transparent',
                      color: viewMode === 'kanban' ? token('color.text.selected', '#0052CC') : token('color.text', '#172B4D'),
                      border: 'none',
                      borderLeft: `1px solid ${token('color.border', '#DFE1E6')}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Box size={16} />
                    Kanban
                  </button>
                </div>

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
              </div>
            </div>

            {/* Table Content */}
            <div style={{ 
              backgroundColor: token('elevation.surface', '#FFFFFF'),
              borderRadius: '3px',
              boxShadow: '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px 1px rgba(9, 30, 66, 0.13)',
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
                <DynamicTableStateless
                  head={head}
                  rows={rows}
                  sortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={(data) => handleSort(data.key, data.sortOrder)}
                  isFixedSize
                />
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
                backgroundColor: token('elevation.surface', '#FFFFFF'),
                borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
                padding: `${token('space.150', '12px')} ${token('space.400', '32px')}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: token('space.300', '24px'),
                borderRadius: '3px',
                boxShadow: '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px 1px rgba(9, 30, 66, 0.13)',
              }}>
                <span style={{ 
                  fontSize: '14px', 
                  color: token('color.text.subtlest', '#6B778C'),
                }}>
                  Showing {startIndex + 1}-{Math.min(endIndex, sortedRequests.length)} of {sortedRequests.length} requests
                </span>
                
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <button 
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${token('color.border', '#DFE1E6')}`,
                      borderRadius: '3px',
                      backgroundColor: currentPage === 1 ? token('color.background.neutral.hovered', '#F4F5F7') : token('elevation.surface', '#FFFFFF'),
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1,
                    }}
                  >
                    «
                  </button>
                  
                  <button 
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${token('color.border', '#DFE1E6')}`,
                      borderRadius: '3px',
                      backgroundColor: currentPage === 1 ? token('color.background.neutral.hovered', '#F4F5F7') : token('elevation.surface', '#FFFFFF'),
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1,
                    }}
                  >
                    ‹
                  </button>

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
                          border: `1px solid ${currentPage === pageNum ? token('color.border.brand', '#0052CC') : token('color.border', '#DFE1E6')}`,
                          borderRadius: '3px',
                          backgroundColor: currentPage === pageNum ? token('color.background.brand.bold', '#0052CC') : token('elevation.surface', '#FFFFFF'),
                          color: currentPage === pageNum ? '#FFFFFF' : token('color.text', '#172B4D'),
                          cursor: 'pointer',
                          fontWeight: currentPage === pageNum ? 600 : 400,
                          fontSize: '14px',
                        }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button 
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${token('color.border', '#DFE1E6')}`,
                      borderRadius: '3px',
                      backgroundColor: currentPage >= totalPages ? token('color.background.neutral.hovered', '#F4F5F7') : token('elevation.surface', '#FFFFFF'),
                      cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage >= totalPages ? 0.5 : 1,
                    }}
                  >
                    ›
                  </button>

                  <button 
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage >= totalPages}
                    style={{
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${token('color.border', '#DFE1E6')}`,
                      borderRadius: '3px',
                      backgroundColor: currentPage >= totalPages ? token('color.background.neutral.hovered', '#F4F5F7') : token('elevation.surface', '#FFFFFF'),
                      cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage >= totalPages ? 0.5 : 1,
                    }}
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>

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
        </Main>
      </Content>
    </PageLayout>
  );
}
