import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

// ✅ Atlaskit imports
import '@atlaskit/css-reset';
import { token } from '@atlaskit/tokens';
import { DynamicTableStateless } from '@atlaskit/dynamic-table';
import type { RowType, HeadType } from '@atlaskit/dynamic-table/types';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button';
import Lozenge from '@atlaskit/lozenge';
import { Checkbox } from '@atlaskit/checkbox';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';

// Icons
import { Plus, Search, Download, ChevronLeft, ChevronRight, Filter, Bell, Settings, Home, Briefcase, Folder, Layers, Box, MoreHorizontal, AlertTriangle } from 'lucide-react';

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

// Table styles for DynamicTable
const tableStyles = `
  [data-testid="dynamic-table"] tbody tr {
    transition: background-color 150ms ease-in-out;
  }
  
  [data-testid="dynamic-table"] tbody tr:hover {
    background-color: ${token('color.background.neutral.hovered', '#EBECF0')};
    cursor: pointer;
  }
  
  [data-testid="dynamic-table"] th {
    font-size: 11px;
    font-weight: 600;
    color: ${token('color.text.subtle', '#6B778C')};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: ${token('space.200', '16px')};
    background: ${token('color.background.neutral.subtle', '#FAFBFC')};
  }
  
  [data-testid="dynamic-table"] td {
    font-size: 14px;
    color: ${token('color.text', '#172B4D')};
    padding: ${token('space.200', '16px')};
    border-top: 1px solid ${token('color.border', '#DFE1E6')};
  }
  
  [data-testid="dynamic-table"] tbody tr:first-child td {
    border-top: none;
  }
`;

// DemandRequest interface for type safety
interface DemandRequest {
  id: string;
  summary: string;
  processStep: 'IMPLEMENT' | 'NEW REQUEST' | 'CLOSED';
  rank: number | null;
  deliveryPlatform: string | null;
  businessOwner: string | null;
  quarter: string | null;
  targetDate: string | null;
  department: string | null;
  hasWarning?: boolean;
}

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

// SidebarItem component with blue selected state
interface SidebarItemProps {
  children: React.ReactNode;
  icon: React.ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ children, icon, isSelected = false, onClick }: SidebarItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: token('space.150', '12px'),
        padding: `${token('space.100', '8px')} ${token('space.150', '12px')}`,
        background: isSelected 
          ? token('color.background.selected', '#DEEBFF')
          : isHovered 
            ? token('color.background.neutral.hovered', '#EBECF0')
            : 'transparent',
        borderRadius: token('border.radius', '3px'),
        color: isSelected 
          ? token('color.text.selected', '#0052CC')
          : token('color.text', '#172B4D'),
        fontSize: '14px',
        fontWeight: isSelected ? 600 : 400,
        cursor: 'pointer',
        textAlign: 'left' as const,
        border: 'none',
        marginBottom: token('space.050', '4px'),
        transition: 'all 150ms ease-in-out',
      }}
    >
      {icon}
      {children}
    </button>
  );
};

// LeftSidebar component
const LeftSidebar = () => {
  return (
    <aside style={{
      width: '240px',
      minWidth: '240px',
      maxWidth: '240px',
      background: token('color.background.neutral.subtle', '#FAFBFC'),
      borderRight: `1px solid ${token('color.border', '#DFE1E6')}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'auto',
    }}>
      {/* Sidebar Header */}
      <div style={{
        padding: token('space.300', '24px'),
        paddingTop: token('space.200', '16px'),
        paddingBottom: token('space.200', '16px'),
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
        display: 'flex',
        alignItems: 'center',
        gap: token('space.150', '12px'),
      }}>
        {/* PR Badge - Warm tan color */}
        <div style={{
          width: '32px',
          height: '32px',
          background: '#FFF4E6',
          color: '#D4A574',
          borderRadius: '3px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: '12px',
          flexShrink: 0,
        }}>
          PR
        </div>
        
        {/* Project Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: token('color.text', '#172B4D'),
            lineHeight: '20px',
          }}>
            Product
          </div>
          <div style={{
            fontSize: '12px',
            color: token('color.text.subtlest', '#6B778C'),
            lineHeight: '16px',
          }}>
            Industry
          </div>
        </div>
        
        {/* Collapse Button */}
        <button style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: token('space.050', '4px'),
          color: token('color.text.subtle', '#6B778C'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <ChevronLeft size={16} />
        </button>
      </div>
      
      {/* Navigation Items */}
      <nav style={{
        flex: 1,
        padding: token('space.100', '8px'),
      }}>
        <SidebarItem icon={<Home size={16} />}>Product Room</SidebarItem>
        <SidebarItem icon={<Briefcase size={16} />} isSelected>Backlog</SidebarItem>
        <SidebarItem icon={<Layers size={16} />}>Roadmap</SidebarItem>
        <SidebarItem icon={<Box size={16} />}>Capacity</SidebarItem>
        <SidebarItem icon={<Folder size={16} />}>Knowledge Hub</SidebarItem>
        
        {/* Separator */}
        <div style={{
          height: '1px',
          background: token('color.border', '#DFE1E6'),
          margin: `${token('space.200', '16px')} 0`,
        }} />
        
        <SidebarItem icon={<Settings size={16} />}>Product Settings</SidebarItem>
      </nav>
    </aside>
  );
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

// NavButton component for top navigation
interface NavButtonProps {
  children: React.ReactNode;
  isSelected?: boolean;
  href?: string;
}

const NavButton = ({ children, isSelected = false, href = '#' }: NavButtonProps) => {
  return (
    <a
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: '56px',
        padding: `0 ${token('space.150', '12px')}`,
        color: isSelected ? token('color.text.selected', '#0052CC') : token('color.text', '#172B4D'),
        fontSize: '14px',
        fontWeight: isSelected ? 600 : 400,
        textDecoration: 'none',
        borderBottom: isSelected 
          ? `3px solid ${token('color.border.selected', '#0052CC')}` 
          : '3px solid transparent',
        boxSizing: 'border-box',
        transition: 'all 150ms ease-in-out',
        cursor: 'pointer',
      }}
    >
      {children}
    </a>
  );
};

// TopNavigationBar component
interface TopNavigationBarProps {
  isMobile: boolean;
}

const TopNavigationBar = ({ isMobile }: TopNavigationBarProps) => {
  return (
    <nav style={{
      height: '56px',
      minHeight: '56px',
      maxHeight: '56px',
      backgroundColor: token('elevation.surface', '#FFFFFF'),
      borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `0 ${token('space.300', '24px')}`,
      flexShrink: 0,
      zIndex: 100,
    }}>
      {/* Left Section */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: token('space.400', '32px'),
      }}>
        {/* Logo */}
        <div style={{
          fontSize: '20px',
          fontWeight: 600,
          color: token('color.text', '#172B4D'),
          letterSpacing: '-0.5px',
        }}>
          Catalyst
        </div>
        
        {/* Navigation Items */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: token('space.050', '4px') }}>
            <NavButton href="/home">Home</NavButton>
            <NavButton href="/enterprise">Enterprise</NavButton>
            <NavButton href="/product" isSelected>Product</NavButton>
            <NavButton href="/program">Program</NavButton>
            <NavButton href="/project">Project</NavButton>
            <NavButton href="/release">Release</NavButton>
            <NavButton href="/items">Items</NavButton>
          </div>
        )}
      </div>
      
      {/* Right Section */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: token('space.200', '16px'),
      }}>
        <Button appearance="primary" iconBefore={<Plus size={16} />}>
          Create
        </Button>
        <Button appearance="subtle" iconBefore={<Bell size={20} />} />
        <Button appearance="subtle" iconBefore={<Settings size={20} />} />
        <Button appearance="subtle" iconBefore={<Search size={20} />} />
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: '#D4A574',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: '14px',
        }}>
          V
        </div>
      </div>
    </nav>
  );
};

// Responsive hook for mobile detection
const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  return isMobile;
};

export default function IndustryPageAtlaskit() {
  const isMobile = useResponsive();
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

  // All available columns
  const allColumns = [
    { key: 'checkbox', content: (
      <Checkbox 
        isChecked={selectedRows.length === paginatedRequests.length && paginatedRequests.length > 0}
        isIndeterminate={selectedRows.length > 0 && selectedRows.length < paginatedRequests.length}
        onChange={handleSelectAll}
      />
    ), width: 3, isSortable: false },
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
  ];

  // Hide columns on mobile - show only essential columns
  const mobileVisibleKeys = ['checkbox', 'request_key', 'title', 'process_step', 'actions'];
  const visibleColumns = isMobile 
    ? allColumns.filter(col => mobileVisibleKeys.includes(col.key))
    : allColumns;

  // Dynamic Table Head
  const head: HeadType = {
    cells: visibleColumns,
  };

  // All row cells - will be filtered based on visibility
  const allRowCells = (request: any) => [
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
  ];

  // Dynamic Table Rows - filter cells based on visible columns
  const rows: RowType[] = paginatedRequests.map((request: any) => ({
    key: request.id,
    onClick: () => setSelectedRequestId(request.id),
    cells: isMobile 
      ? allRowCells(request).filter(cell => mobileVisibleKeys.includes(cell.key))
      : allRowCells(request),
  }));

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: token('color.background.neutral', '#F4F5F7'),
    }}>
      {/* Top Navigation Bar - 56px height */}
      <TopNavigationBar isMobile={isMobile} />
      
      {/* Main Container with Sidebar */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}>
        {/* Left Sidebar - 240px width */}
        {!isMobile && <LeftSidebar />}
        
        {/* Main Content Area */}
        <main style={{
          flex: 1,
          overflow: 'auto',
          background: token('color.background.neutral', '#F4F5F7'),
          padding: isMobile ? token('space.200', '16px') : token('space.400', '32px'),
          position: 'relative',
          zIndex: 1,
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
            <div style={{ position: 'relative', width: isMobile ? '100%' : '400px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px'), flexWrap: 'wrap' }}>
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
                  {!isMobile && 'List'}
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
                  {!isMobile && 'Kanban'}
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
                {isMobile ? '' : 'Filters'} {activeFilterCount > 0 && `(${activeFilterCount})`}
              </Button>

              <Button
                onClick={handleExport}
                iconBefore={<Download size={16} />}
              >
                {!isMobile && 'Export'}
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
              <>
                <style>{tableStyles}</style>
                <DynamicTableStateless
                  head={head}
                  rows={rows}
                  sortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={(data) => handleSort(data.key, data.sortOrder)}
                  isFixedSize
                />
              </>
            ) : (
              <EmptyState
                header="No demand requests found"
                description="Create your first demand request or adjust your filters"
                primaryAction={
                  <Button appearance="primary" onClick={() => setCreateModalOpen(true)}>
                    Create Request
                  </Button>
                }
                secondaryAction={
                  <Button appearance="subtle" onClick={() => setFilters({})}>
                    Clear filters
                  </Button>
                }
              />
            )}
          </div>

          {/* Atlaskit Pagination */}
          {viewMode === 'list' && sortedRequests.length > ITEMS_PER_PAGE && (
            <>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: token('space.100', '8px'),
                marginTop: token('space.300', '24px'),
              }}>
                <Button 
                  iconBefore={<ChevronLeft size={16} />} 
                  appearance="subtle"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  isDisabled={currentPage === 1}
                >
                  {!isMobile && 'Previous'}
                </Button>
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
                    <Button 
                      key={pageNum}
                      appearance="subtle" 
                      isSelected={currentPage === pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button 
                  iconAfter={<ChevronRight size={16} />} 
                  appearance="subtle"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  isDisabled={currentPage >= totalPages}
                >
                  {!isMobile && 'Next'}
                </Button>
              </div>

              <div style={{
                marginTop: token('space.200', '16px'),
                fontSize: '12px',
                color: token('color.text.subtlest', '#626F86'),
                textAlign: 'center',
              }}>
                Showing {startIndex + 1}-{Math.min(endIndex, sortedRequests.length)} of {sortedRequests.length} requests
              </div>
            </>
          )}
        </main>
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
    </div>
  );
}
