import React, { useState, useRef, useEffect } from 'react';
import { token } from '@atlaskit/tokens';
import '@atlaskit/css-reset';
import DynamicTable from '@atlaskit/dynamic-table';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button';
import ButtonGroup from '@atlaskit/button-group';
import Lozenge from '@atlaskit/lozenge';
import Checkbox from '@atlaskit/checkbox';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Drawer from '@atlaskit/drawer';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Tooltip from '@atlaskit/tooltip';
import Select from '@atlaskit/select';
import Spinner from '@atlaskit/spinner';
import EmptyState from '@atlaskit/empty-state';

// Icons
import SearchIcon from '@atlaskit/icon/glyph/search';
import ListIcon from '@atlaskit/icon/glyph/list';
import BoardIcon from '@atlaskit/icon/glyph/board';
import FilterIcon from '@atlaskit/icon/glyph/filter';
import DownloadIcon from '@atlaskit/icon/glyph/download';
import MoreIcon from '@atlaskit/icon/glyph/more';
import ChevronLeftIcon from '@atlaskit/icon/glyph/chevron-left';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import ChevronLeftLargeIcon from '@atlaskit/icon/glyph/chevron-left-large';
import ChevronRightLargeIcon from '@atlaskit/icon/glyph/chevron-right-large';
import CrossIcon from '@atlaskit/icon/glyph/cross';

// ============================================
// JIRA-ACCURATE TABLE STYLES
// ============================================
const tableStyles = `
  /* TABLE CONTAINER */
  [data-testid="dynamic-table"] {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
  }
  
  /* TABLE HEADERS - EXACT JIRA MATCH */
  [data-testid="dynamic-table"] th {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
    font-size: 12px !important;
    font-weight: 500 !important;
    color: #5E6C84 !important;
    text-transform: none !important;
    letter-spacing: normal !important;
    line-height: 20px !important;
    padding: 8px 16px !important;
    background: #FAFBFC !important;
    border-bottom: 2px solid #DFE1E6 !important;
    text-align: left !important;
    white-space: nowrap !important;
    vertical-align: middle !important;
  }
  
  /* TABLE HEADER HOVER */
  [data-testid="dynamic-table"] th:hover {
    background: #F4F5F7 !important;
  }
  
  /* TABLE HEADER SORT BUTTON */
  [data-testid="dynamic-table"] th button {
    font-family: inherit !important;
    font-size: 12px !important;
    font-weight: 500 !important;
    color: #5E6C84 !important;
    text-transform: none !important;
    letter-spacing: normal !important;
    padding: 0 !important;
    background: transparent !important;
    border: none !important;
    cursor: pointer !important;
  }
  
  [data-testid="dynamic-table"] th button:hover {
    color: #172B4D !important;
  }
  
  /* TABLE CELLS - BODY */
  [data-testid="dynamic-table"] td {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
    font-size: 14px !important;
    font-weight: 400 !important;
    color: #172B4D !important;
    line-height: 20px !important;
    padding: 8px 16px !important;
    border-top: 1px solid #DFE1E6 !important;
    vertical-align: middle !important;
  }
  
  /* FIRST ROW NO TOP BORDER */
  [data-testid="dynamic-table"] tbody tr:first-child td {
    border-top: none !important;
  }
  
  /* ROW HOVER STATE */
  [data-testid="dynamic-table"] tbody tr {
    transition: background-color 150ms ease-in-out;
  }
  
  [data-testid="dynamic-table"] tbody tr:hover {
    background-color: #F4F5F7 !important;
    cursor: pointer;
  }
  
  /* CHECKBOX COLUMN */
  [data-testid="dynamic-table"] th:first-child,
  [data-testid="dynamic-table"] td:first-child {
    width: 40px !important;
    padding: 8px 12px !important;
  }
  
  /* SORT INDICATOR ICON */
  [data-testid="dynamic-table"] th svg {
    width: 16px !important;
    height: 16px !important;
    margin-left: 4px !important;
    vertical-align: middle !important;
  }
`;

// ============================================
// MOCK DATA
// ============================================
const mockData = [
  { id: 'MIM-499', summary: 'تأمل إضافة أيقونة أو خاصية تمكن مالك الخدمة من منح الموافقة تلقائياً لجميع الطلبات القائمة للمصانع المحلية', processStep: 'NEW REQUEST', rank: null, deliveryPlatform: null, businessOwner: null, quarter: null, targetDate: null, department: null },
  { id: 'MIM-500', summary: 'تحسين رحلة الانضمام لبرنامج مصانع المستقبل', processStep: 'NEW REQUEST', rank: null, deliveryPlatform: null, businessOwner: null, quarter: null, targetDate: null, department: null },
  { id: 'MIM-501', summary: 'إضافة التنبيه في نموذج الحوافز العقارية للقطاع الصناعي', processStep: 'CLOSED', rank: null, deliveryPlatform: null, businessOwner: null, quarter: null, targetDate: null, department: null },
  { id: 'MIM-502', summary: 'تهدف هذه المبادرة إلى تحسين كفاءة نظام رفع المعاملات الشركاء من خلال إنشاء منصة رقمية موحدة', processStep: 'NEW REQUEST', rank: null, deliveryPlatform: null, businessOwner: null, quarter: null, targetDate: null, department: null },
  { id: 'MIM-503', summary: 'تحسينات الصفحة التعريفية لبرنامج مصانع المستقبل', processStep: 'NEW REQUEST', rank: null, deliveryPlatform: null, businessOwner: null, quarter: null, targetDate: null, department: null },
  { id: 'MIM-504', summary: 'تحسينات رحلة الانضمام كمقدم خدمات أو تقنيات', processStep: 'NEW REQUEST', rank: null, deliveryPlatform: null, businessOwner: null, quarter: null, targetDate: null, department: null },
  { id: 'MIM-505', summary: 'تحسين رحلة الانضمام لبرنامج مصانع المستقبل', processStep: 'NEW REQUEST', rank: null, deliveryPlatform: null, businessOwner: null, quarter: null, targetDate: null, department: null },
  { id: 'MIM-506', summary: 'قائمة بحقول الترخيص الصناعي', processStep: 'ANALYSE', rank: null, deliveryPlatform: null, businessOwner: null, quarter: null, targetDate: null, department: null },
  { id: 'MIM-507', summary: 'إعادة طلبات المسح الصناعي وتغيير وصف الحقول', processStep: 'CLOSED', rank: null, deliveryPlatform: null, businessOwner: null, quarter: null, targetDate: null, department: null },
  { id: 'MIM-508', summary: 'تحديث تواريخ انتهاء المسودات - الحوافز العقارية', processStep: 'NEW REQUEST', rank: null, deliveryPlatform: null, businessOwner: null, quarter: null, targetDate: null, department: null },
  { id: 'MIM-509', summary: 'تحديث تواريخ انتهاء المسودات -الحوافز العقارية', processStep: 'ANALYSE', rank: null, deliveryPlatform: null, businessOwner: null, quarter: null, targetDate: null, department: null },
];

// ============================================
// HELPER FUNCTIONS
// ============================================
const getStatusAppearance = (status: string): 'default' | 'inprogress' | 'moved' | 'success' | 'removed' => {
  const mapping: Record<string, 'default' | 'inprogress' | 'moved' | 'success' | 'removed'> = {
    'NEW REQUEST': 'inprogress',
    'CLOSED': 'default',
    'ANALYSE': 'moved',
  };
  return mapping[status] || 'default';
};

const getTableHead = (allSelected: boolean, onSelectAll: () => void) => ({
  cells: [
    { key: 'checkbox', content: <Checkbox isChecked={allSelected} onChange={onSelectAll} />, width: 3, isSortable: false },
    { key: 'requestId', content: 'Request ID', isSortable: true, width: 8 },
    { key: 'summary', content: 'Summary', isSortable: true, width: 30 },
    { key: 'processStep', content: 'Process Step', isSortable: true, width: 10 },
    { key: 'rank', content: 'Rank', isSortable: true, width: 5 },
    { key: 'deliveryPlatform', content: 'Delivery Platform', isSortable: true, width: 10 },
    { key: 'businessOwner', content: 'Business Owner', isSortable: true, width: 10 },
    { key: 'quarter', content: 'Quarter', isSortable: true, width: 8 },
    { key: 'targetDate', content: 'Target Date', isSortable: true, width: 8 },
    { key: 'department', content: 'Department', isSortable: true, width: 8 },
    { key: 'actions', content: '', width: 3, isSortable: false },
  ],
});

const getTableRows = (data: any[], selectedRows: string[], onRowSelect: (id: string) => void) => {
  return data.map((request) => ({
    key: request.id,
    cells: [
      { key: 'checkbox', content: <Checkbox isChecked={selectedRows.includes(request.id)} onChange={() => onRowSelect(request.id)} /> },
      { key: 'requestId', content: (
        <a href={`/request/${request.id}`} style={{ color: token('color.link'), textDecoration: 'none', fontWeight: 500 }}
          onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
          onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}>
          {request.id}
        </a>
      )},
      { key: 'summary', content: (
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '400px' }} title={request.summary}>
          {request.summary}
        </div>
      )},
      { key: 'processStep', content: <Lozenge appearance={getStatusAppearance(request.processStep)}>{request.processStep}</Lozenge> },
      { key: 'rank', content: request.rank || '-' },
      { key: 'deliveryPlatform', content: request.deliveryPlatform || '-' },
      { key: 'businessOwner', content: request.businessOwner || '-' },
      { key: 'quarter', content: request.quarter || '-' },
      { key: 'targetDate', content: request.targetDate || '-' },
      { key: 'department', content: request.department || '-' },
      { key: 'actions', content: (
        <DropdownMenu trigger={({ triggerRef, ...props }) => (
          <Button {...props} ref={triggerRef} iconBefore={<MoreIcon label="More actions" size="small" />} appearance="subtle" />
        )}>
          <DropdownItemGroup>
            <DropdownItem>Edit</DropdownItem>
            <DropdownItem>Clone</DropdownItem>
            <DropdownItem>Delete</DropdownItem>
          </DropdownItemGroup>
        </DropdownMenu>
      )},
    ],
  }));
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function DemandIntakeScreen() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('requestId');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const isInputFocused = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === '[' && !isInputFocused) {
        e.preventDefault();
        setIsSidebarCollapsed(true);
      }
      if (e.key === ']' && !isInputFocused) {
        e.preventDefault();
        setIsSidebarCollapsed(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleRowSelect = (id: string) => {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedRows.length === mockData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(mockData.map(item => item.id));
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* COLLAPSIBLE SIDEBAR */}
      <CollapsibleSidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      
      {/* MAIN CONTENT */}
      <main style={{ flex: 1, overflow: 'auto', background: token('color.background.neutral'), padding: token('space.400') }}>
        {/* Page Header */}
        <div style={{ marginBottom: token('space.300') }}>
          <h1 style={{ fontSize: '24px', lineHeight: '28px', fontWeight: 500, color: token('color.text'), margin: `0 0 ${token('space.050')} 0` }}>
            Demand Intake
          </h1>
          <p style={{ fontSize: '12px', color: token('color.text.subtlest'), margin: 0 }}>
            Industry-specific demand requests
          </p>
        </div>

        {/* Controls Bar */}
        <div style={{
          background: token('elevation.surface'),
          padding: token('space.200'),
          borderRadius: token('border.radius'),
          marginBottom: token('space.300'),
          boxShadow: token('elevation.shadow.raised'),
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: token('space.200'),
          flexWrap: 'wrap',
        }}>
          <Textfield
            ref={searchInputRef}
            placeholder="Search industry..."
            elemBeforeInput={<SearchIcon label="Search" size="small" primaryColor={token('color.icon.subtle')} />}
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            width={400}
          />
          
          <div style={{ display: 'flex', gap: token('space.200'), alignItems: 'center', flexWrap: 'wrap' }}>
            <ButtonGroup>
              <Button isSelected={viewMode === 'list'} onClick={() => setViewMode('list')} iconBefore={<ListIcon label="List" size="small" />}>
                List
              </Button>
              <Button isSelected={viewMode === 'kanban'} onClick={() => setViewMode('kanban')} iconBefore={<BoardIcon label="Kanban" size="small" />}>
                Kanban
              </Button>
            </ButtonGroup>
            
            <Button appearance="default" iconBefore={<FilterIcon label="Filters" size="small" />} onClick={() => setShowFilters(true)}>
              Filters
            </Button>
            <Button appearance="default" iconBefore={<DownloadIcon label="Export" size="small" />} onClick={() => setShowExport(true)}>
              Export
            </Button>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: token('elevation.surface'), borderRadius: token('border.radius'), boxShadow: token('elevation.shadow.raised'), overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: token('space.600') }}>
              <Spinner size="large" />
            </div>
          ) : mockData.length === 0 ? (
            <EmptyState
              header="No demand requests found"
              description="Create your first demand request or adjust your search filters"
              primaryAction={<Button appearance="primary">Create Request</Button>}
              secondaryAction={<Button appearance="subtle" onClick={() => setSearchQuery('')}>Clear search</Button>}
            />
          ) : (
            <>
              <style>{tableStyles}</style>
              <DynamicTable
                head={getTableHead(selectedRows.length === mockData.length, handleSelectAll)}
                rows={getTableRows(mockData, selectedRows, handleRowSelect)}
                rowsPerPage={20}
                page={currentPage}
                sortKey={sortKey}
                sortOrder={sortOrder}
                onSort={({ key, sortOrder }) => { setSortKey(key); setSortOrder(sortOrder); }}
                onSetPage={(page) => setCurrentPage(page)}
              />
              <Pagination currentPage={currentPage} totalPages={Math.ceil(mockData.length / 20)} totalItems={mockData.length} onPageChange={setCurrentPage} />
            </>
          )}
        </div>
      </main>

      {/* BULK ACTIONS BAR */}
      {selectedRows.length > 0 && (
        <BulkActionsBar 
          selectedCount={selectedRows.length}
          onClear={() => setSelectedRows([])}
          onUpdateStatus={() => alert('Update status for selected items')}
          onAssign={() => alert('Assign selected items')}
          onDelete={() => { if (confirm(`Delete ${selectedRows.length} items?`)) setSelectedRows([]); }}
        />
      )}

      {/* MODALS & DRAWERS */}
      <FiltersModal isOpen={showFilters} onClose={() => setShowFilters(false)} />
      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} />
    </div>
  );
}

// ============================================
// COLLAPSIBLE SIDEBAR
// ============================================
function CollapsibleSidebar({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
  return (
    <aside style={{
      width: isCollapsed ? '48px' : '240px',
      background: token('color.background.neutral.subtle'),
      borderRight: `1px solid ${token('color.border')}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
      transition: 'width 200ms ease-in-out',
    }}>
      <div style={{ padding: token('space.200'), borderBottom: `1px solid ${token('color.border')}`, display: 'flex', alignItems: 'center', gap: token('space.150'), minHeight: '64px' }}>
        {!isCollapsed && (
          <>
            <div style={{ width: '32px', height: '32px', background: '#FFF4E6', color: '#D4A574', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '14px', flexShrink: 0 }}>
              PR
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: token('color.text') }}>Product</div>
              <div style={{ fontSize: '12px', color: token('color.text.subtlest') }}>Industry</div>
            </div>
          </>
        )}
        
        <Tooltip content={isCollapsed ? 'Expand sidebar (])' : 'Collapse sidebar ([)'}>
          <Button
            appearance="subtle"
            iconBefore={isCollapsed ? <ChevronRightIcon label="Expand" size="small" /> : <ChevronLeftIcon label="Collapse" size="small" />}
            onClick={onToggle}
            style={{ marginLeft: isCollapsed ? '0' : 'auto' }}
          />
        </Tooltip>
      </div>
      
      <nav style={{ padding: token('space.200'), flex: 1 }}>
        <NavItem icon="🏠" label="Product Room" isCollapsed={isCollapsed} href="/product/room" />
        <NavItem icon="📋" label="Backlog" isCollapsed={isCollapsed} isSelected href="/product/backlog" />
        <NavItem icon="🗺️" label="Roadmap" isCollapsed={isCollapsed} href="/product/roadmap" />
        <NavItem icon="📊" label="Capacity" isCollapsed={isCollapsed} href="/product/capacity" />
        <NavItem icon="📚" label="Knowledge Hub" isCollapsed={isCollapsed} href="/product/knowledge" />
        <div style={{ height: '1px', background: token('color.border'), margin: `${token('space.300')} 0` }} />
        <NavItem icon="⚙️" label="Product Settings" isCollapsed={isCollapsed} href="/product/settings" />
      </nav>
    </aside>
  );
}

// ============================================
// NAV ITEM
// ============================================
function NavItem({ icon, label, isCollapsed, isSelected = false, href }: { icon: string; label: string; isCollapsed: boolean; isSelected?: boolean; href: string }) {
  const content = (
    <a href={href} style={{
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: token('space.150'),
      padding: `${token('space.100')} ${token('space.150')}`,
      background: isSelected ? token('color.background.selected') : 'transparent',
      border: 'none',
      borderRadius: '3px',
      color: isSelected ? token('color.text.selected') : token('color.text'),
      fontSize: '14px',
      fontWeight: isSelected ? 600 : 400,
      cursor: 'pointer',
      textAlign: 'left',
      marginBottom: token('space.050'),
      transition: 'background 150ms',
      textDecoration: 'none',
      justifyContent: isCollapsed ? 'center' : 'flex-start',
    }}>
      <span style={{ fontSize: '16px', flexShrink: 0 }}>{icon}</span>
      {!isCollapsed && <span>{label}</span>}
    </a>
  );

  if (isCollapsed) return <Tooltip content={label}>{content}</Tooltip>;
  return content;
}

// ============================================
// BULK ACTIONS BAR
// ============================================
function BulkActionsBar({ selectedCount, onClear, onUpdateStatus, onAssign, onDelete }: any) {
  return (
    <div style={{
      position: 'fixed',
      bottom: token('space.300'),
      left: '50%',
      transform: 'translateX(-50%)',
      background: token('color.background.brand.bold'),
      color: '#fff',
      padding: token('space.200'),
      borderRadius: token('border.radius'),
      boxShadow: token('elevation.shadow.overlay'),
      display: 'flex',
      alignItems: 'center',
      gap: token('space.200'),
      zIndex: 500,
    }}>
      <span style={{ fontWeight: 600 }}>{selectedCount} selected</span>
      <Button appearance="subtle" onClick={onClear}>Clear</Button>
      <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.3)' }} />
      <Button appearance="subtle" onClick={onUpdateStatus}>Update Status</Button>
      <Button appearance="subtle" onClick={onAssign}>Assign</Button>
      <Button appearance="warning" onClick={onDelete}>Delete</Button>
    </div>
  );
}

// ============================================
// PAGINATION
// ============================================
function Pagination({ currentPage, totalPages, totalItems, onPageChange }: any) {
  const startItem = (currentPage - 1) * 20 + 1;
  const endItem = Math.min(currentPage * 20, totalItems);
  
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: token('space.300'), borderTop: `1px solid ${token('color.border')}` }}>
      <div style={{ fontSize: '12px', color: token('color.text.subtlest') }}>
        Showing {startItem}-{endItem} of {totalItems}
      </div>
      <div style={{ display: 'flex', gap: token('space.100') }}>
        <Button appearance="subtle" iconBefore={<ChevronLeftLargeIcon label="Previous" size="small" />} isDisabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
          Previous
        </Button>
        {[...Array(Math.min(totalPages, 5))].map((_, i) => (
          <Button key={i + 1} appearance="subtle" isSelected={currentPage === i + 1} onClick={() => onPageChange(i + 1)}>
            {i + 1}
          </Button>
        ))}
        <Button appearance="subtle" iconAfter={<ChevronRightLargeIcon label="Next" size="small" />} isDisabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

// ============================================
// FILTERS MODAL
// ============================================
function FiltersModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="large">
          <ModalHeader>
            <ModalTitle>Filters</ModalTitle>
            <Button appearance="subtle" iconBefore={<CrossIcon label="Close" size="small" />} onClick={onClose} />
          </ModalHeader>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.300') }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: token('space.100'), color: token('color.text') }}>
                  Process Step
                </label>
                <Select isMulti placeholder="Select process steps..." options={[
                  { label: 'NEW REQUEST', value: 'new' },
                  { label: 'ANALYSE', value: 'analyse' },
                  { label: 'CLOSED', value: 'closed' },
                ]} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: token('space.100'), color: token('color.text') }}>
                  Business Owner
                </label>
                <Select isMulti placeholder="Select owners..." options={[
                  { label: 'John Doe', value: 'john' },
                  { label: 'Jane Smith', value: 'jane' },
                ]} />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>Cancel</Button>
            <Button appearance="primary" onClick={onClose}>Apply</Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}

// ============================================
// EXPORT MODAL
// ============================================
function ExportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose}>
          <ModalHeader>
            <ModalTitle>Export Requests</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <p>Export functionality will be implemented here.</p>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" onClick={onClose}>Cancel</Button>
            <Button appearance="primary" onClick={onClose}>Export</Button>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
