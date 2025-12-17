/**
 * Executive Table - High-density, enterprise-grade data table for Business Requests
 * Implements the Catalyst Executive Table specification
 * REFACTORED: Single boxed container, sticky header, pinned columns, pagination footer inside
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useDepartments } from '@/hooks/useDepartmentsAndOwners';
import { EnterpriseToolbar } from './EnterpriseToolbar';
import { FilterDrawer } from './FilterDrawer';
import { ColumnsPanel, useColumnPreference } from './ColumnsPanel';
import { cn } from '@/lib/utils';

// Row heights for density modes
const DENSITY_CONFIG = {
  compact: { rowHeight: 40, fontSize: 13, padding: '8px 12px' },
  regular: { rowHeight: 44, fontSize: 13, padding: '8px 12px' },
  relaxed: { rowHeight: 52, fontSize: 14, padding: '10px 14px' },
};

// Status options
const STATUS_OPTIONS = [
  { value: 'new_request', label: 'New Request', accent: 'gold' },
  { value: 'analyse', label: 'Analyse', accent: 'green' },
  { value: 'in_review', label: 'In Review', accent: 'gold' },
  { value: 'approved', label: 'Approved', accent: 'neutral' },
  { value: 'implement', label: 'Implement', accent: 'green' },
  { value: 'closed', label: 'Closed', accent: 'neutral' },
  { value: 'rejected', label: 'Rejected', accent: 'neutral' },
  { value: 'on_hold', label: 'On-Hold', accent: 'neutral' },
];

// Priority options
const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'unscored', label: 'Unscored' },
];

// Platforms
const PLATFORMS = [
  { value: 'innovation', label: 'Innovation Platform' },
  { value: 'senaei', label: 'Senaei Platform' },
  { value: 'internal', label: 'Internal System' },
  { value: 'web', label: 'Web Portal' },
  { value: 'mobile', label: 'Mobile App' },
];

// Delivery Track options
const DELIVERY_TRACKS = [
  { value: 'bau_fast_track', label: 'BAU Fast Track' },
  { value: 'standard', label: 'Standard' },
  { value: 'strategic', label: 'Strategic' },
  { value: 'innovation', label: 'Innovation' },
];

// Quarter options
const QUARTERS = [
  { value: 'q1_2025', label: 'Q1 2025' },
  { value: 'q2_2025', label: 'Q2 2025' },
  { value: 'q3_2025', label: 'Q3 2025' },
  { value: 'q4_2025', label: 'Q4 2025' },
  { value: 'q1_2026', label: 'Q1 2026' },
  { value: 'q2_2026', label: 'Q2 2026' },
  { value: 'q3_2026', label: 'Q3 2026' },
  { value: 'q4_2026', label: 'Q4 2026' },
];

// All columns configuration
const ALL_COLUMNS = [
  { id: 'id', header: 'Request ID', accessor: 'id', minWidth: 110, sortable: true },
  { id: 'summary', header: 'Summary', accessor: 'summary', minWidth: 200, sortable: true, editable: true },
  { id: 'processStep', header: 'Status', accessor: 'processStep', minWidth: 140, sortable: true, filterable: true, editable: true, type: 'select', options: STATUS_OPTIONS },
  { id: 'score', header: 'Score', accessor: 'score', minWidth: 80, sortable: true, type: 'number', align: 'right' },
  { id: 'autoPriority', header: 'Priority', accessor: 'autoPriority', minWidth: 100, sortable: true, filterable: true, type: 'select', options: PRIORITY_OPTIONS },
  { id: 'rank', header: 'Rank', accessor: 'rank', minWidth: 70, sortable: true, type: 'number', align: 'center' },
  { id: 'reporter', header: 'Reporter', accessor: 'reporter', minWidth: 120, sortable: true },
  { id: 'assignee', header: 'Signee', accessor: 'assignee', minWidth: 110, sortable: true },
  { id: 'department', header: 'Department', accessor: 'department', minWidth: 140, sortable: true, filterable: true, editable: true, type: 'select', options: [] },
  { id: 'businessOwner', header: 'Business Owner', accessor: 'businessOwner', minWidth: 150, sortable: true },
  { id: 'businessAsk', header: 'Business Ask', accessor: 'businessAsk', minWidth: 120, sortable: true, type: 'date' },
  { id: 'kickoff', header: 'Kickoff', accessor: 'kickoff', minWidth: 100, sortable: true, type: 'date' },
  { id: 'targetComplete', header: 'Target Complete', accessor: 'targetComplete', minWidth: 140, sortable: true, type: 'date' },
  { id: 'deliveryTrack', header: 'Delivery Track', accessor: 'deliveryTrack', minWidth: 130, sortable: true, filterable: true, editable: true, type: 'select', options: DELIVERY_TRACKS },
  { id: 'platform', header: 'Platform', accessor: 'platform', minWidth: 120, sortable: true, filterable: true, editable: true, type: 'select', options: PLATFORMS },
  { id: 'quarter', header: 'Quarter', accessor: 'quarter', minWidth: 100, sortable: true, filterable: true, editable: true, type: 'select', options: QUARTERS },
  { id: 'createdAt', header: 'Created', accessor: 'createdAt', minWidth: 100, sortable: true },
];

const DEFAULT_VISIBLE_COLUMNS = ['id', 'summary', 'processStep', 'score', 'autoPriority', 'rank', 'department', 'businessOwner', 'quarter'];

// Filter groups for drawer
const FILTER_GROUPS = [
  { id: 'processStep', label: 'Status', options: STATUS_OPTIONS },
  { id: 'autoPriority', label: 'Priority', options: PRIORITY_OPTIONS },
  { id: 'platform', label: 'Platform', options: PLATFORMS },
  { id: 'quarter', label: 'Quarter', options: QUARTERS },
  { id: 'deliveryTrack', label: 'Delivery Track', options: DELIVERY_TRACKS },
];

// Icons
const Icons = {
  ChevronUp: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>,
  ChevronDown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>,
  ChevronLeft: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>,
  ChevronRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>,
  MoreVertical: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>,
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  FileX: () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9.5" y1="12.5" x2="14.5" y2="17.5"/><line x1="14.5" y1="12.5" x2="9.5" y2="17.5"/></svg>,
};

interface BusinessRequest {
  id: string;
  summary: string;
  processStep: string;
  score: number | null;
  autoPriority: string;
  rank: number | null;
  reporter: string | null;
  assignee: string | null;
  department: string;
  businessOwner: string | null;
  businessAsk: string | null;
  kickoff: string | null;
  targetComplete: string | null;
  deliveryTrack: string | null;
  platform: string | null;
  quarter: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ExecutiveTableProps {
  data: BusinessRequest[];
  isLoading?: boolean;
  onRowClick: (row: BusinessRequest) => void;
  onOpenFullView: (requestId: string) => void;
  onFieldUpdate: (requestId: string, field: string, value: any) => Promise<void>;
  onCreateNew: () => void;
  onDuplicate?: (requestId: string) => Promise<void>;
  onDelete?: (requestId: string) => Promise<void>;
  externalHeader?: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onExport?: () => void;
  columnsDialogOpen?: boolean;
  onColumnsDialogChange?: (open: boolean) => void;
  selectedRows?: string[];
  onSelectedRowsChange?: (rows: string[]) => void;
}

// Status Badge Component
function StatusBadge({ value, options }: { value: string; options: { value: string; label: string; accent?: string }[] }) {
  const option = options.find(o => o.value === value);
  if (!option) return <span className="text-muted-foreground text-sm">—</span>;
  
  const accentClasses: Record<string, string> = {
    gold: 'bg-brand-primary',
    green: 'bg-secondary-green',
    neutral: 'bg-muted-foreground/50',
  };
  
  const accentClass = accentClasses[option.accent || 'neutral'] || accentClasses.neutral;
  
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md whitespace-nowrap text-xs font-medium"
      style={{ 
        backgroundColor: 'var(--surface-3)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-1)',
      }}
    >
      <span className={`w-2 h-2 rounded-full ${accentClass} flex-shrink-0`} />
      {option.label}
    </span>
  );
}

// Score Bar Component
function ScoreBar({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return <span className="text-muted-foreground/60 text-sm font-medium">—</span>;
  }
  
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div 
        className="flex-1 h-2 rounded-sm overflow-hidden"
        style={{ 
          backgroundColor: 'var(--progress-track)',
          border: '1px solid var(--border-visible)',
        }}
      >
        <div 
          className="h-full transition-all duration-300 bg-secondary-green"
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className="min-w-[24px] tabular-nums font-semibold text-right text-sm" style={{ color: 'var(--text-1)' }}>
        {score}
      </span>
    </div>
  );
}

// Date Display Component
function DateDisplay({ date }: { date: string | null }) {
  if (!date) return <span className="text-muted-foreground/60 text-sm font-medium">—</span>;
  const d = new Date(date);
  return (
    <span className="text-sm tabular-nums" style={{ color: 'var(--text-1)' }}>
      {d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
    </span>
  );
}

// Inline Cell Editor
function InlineCellEditor({ value, type, options, onSave, onCancel }: { 
  value: any; 
  type: string; 
  options?: { value: string; label: string }[]; 
  onSave: (value: any) => void; 
  onCancel: () => void; 
}) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (type !== 'select' && type !== 'date' && 'select' in inputRef.current) {
        (inputRef.current as HTMLInputElement).select?.();
      }
    }
  }, [type]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      onSave(localValue === '' ? null : (type === 'number' ? Number(localValue) : localValue));
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (type === 'select' && options) {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={localValue}
        onChange={(e) => { setLocalValue(e.target.value); onSave(e.target.value); }}
        onBlur={onCancel}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 border-2 border-brand-primary rounded text-xs outline-none bg-background shadow-md min-w-[120px] cursor-pointer"
      >
        <option value="">Select...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  if (type === 'date') {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="date"
        value={localValue || ''}
        onChange={(e) => { setLocalValue(e.target.value); onSave(e.target.value || null); }}
        onBlur={onCancel}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 border-2 border-brand-primary rounded text-xs outline-none bg-background shadow-md min-w-[130px] cursor-pointer"
      />
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={type === 'number' ? 'number' : 'text'}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => onSave(localValue === '' ? null : (type === 'number' ? Number(localValue) : localValue))}
      onKeyDown={handleKeyDown}
      className="w-full px-2 py-1 border-2 border-brand-primary rounded text-xs outline-none bg-background shadow-md"
    />
  );
}

// Editable Cell Component
function EditableCell({ value, type, options, displayValue, onSave, columnId }: {
  value: any;
  type?: string;
  options?: { value: string; label: string }[];
  displayValue: React.ReactNode;
  onSave: (value: any) => void;
  columnId: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (newValue: any) => {
    if (newValue !== value) {
      setIsSaving(true);
      await onSave(newValue);
      setTimeout(() => setIsSaving(false), 300);
    }
    setIsEditing(false);
  };

  const isQuickEdit = type === 'select' || type === 'date';

  if (isEditing) {
    return (
      <div className="-m-1">
        <InlineCellEditor
          value={value}
          type={type || 'text'}
          options={options}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        if (isQuickEdit) {
          e.stopPropagation();
          setIsEditing(true);
        }
      }}
      onDoubleClick={(e) => {
        if (!isQuickEdit) {
          e.stopPropagation();
          setIsEditing(true);
        }
      }}
      className={cn(
        "flex items-center gap-1 px-1 py-0.5 -mx-1 rounded transition-all",
        isQuickEdit && "cursor-pointer hover:bg-brand-primary/10",
        isSaving && "bg-success/15"
      )}
      style={{ border: '1px solid transparent' }}
    >
      {displayValue}
      {isQuickEdit && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 opacity-50 text-muted-foreground">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      )}
    </div>
  );
}

// Row Actions Menu
function RowActionsMenu({ onDuplicate, onDelete }: { onDuplicate: () => void; onDelete: () => void; }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="p-1.5 border-none bg-transparent cursor-pointer rounded transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        style={{ color: 'var(--text-2)' }}
        aria-label="Row actions"
      >
        <Icons.MoreVertical />
      </button>

      {isOpen && (
        <div 
          className="absolute top-full right-0 mt-1 rounded-lg shadow-lg z-[400] min-w-[120px] py-1"
          style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--border-color)' }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); setIsOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 border-none bg-transparent text-xs cursor-pointer text-left transition-colors hover:bg-muted/50"
            style={{ color: 'var(--text-1)' }}
          >
            <Icons.Copy />
            Duplicate
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); setIsOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 border-none bg-transparent text-xs cursor-pointer text-left text-destructive transition-colors hover:bg-muted/50"
          >
            <Icons.Trash />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// Pagination Footer
function PaginationFooter({ currentPage, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange }: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div 
      className="flex items-center justify-between px-4 py-3 flex-shrink-0"
      style={{ borderTop: '1px solid var(--divider)', backgroundColor: 'var(--surface-2)' }}
    >
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-2)' }}>
        <span className="font-medium">Rows:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-2 py-1 rounded text-xs cursor-pointer font-medium border focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-visible)', color: 'var(--text-1)' }}
          aria-label="Rows per page"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--border-visible)', color: 'var(--text-1)' }}
          aria-label="Previous page"
        >
          <Icons.ChevronLeft />
        </button>
        <span className="text-xs px-2 font-medium" style={{ color: 'var(--text-2)' }}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          style={{ backgroundColor: 'var(--surface-1)', borderColor: 'var(--border-visible)', color: 'var(--text-1)' }}
          aria-label="Next page"
        >
          <Icons.ChevronRight />
        </button>
      </div>

      <div className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>
        {totalItems > 0 ? `${startItem}–${endItem} of ${totalItems}` : 'No items'}
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ hasFilters, onClearFilters, onCreateNew }: { 
  hasFilters: boolean; 
  onClearFilters: () => void; 
  onCreateNew: () => void; 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="mb-4 opacity-40" style={{ color: 'var(--text-2)' }}>
        <Icons.FileX />
      </div>
      <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-1)' }}>
        No requests found
      </h3>
      <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
        {hasFilters ? 'Try adjusting your filters or search terms' : 'Get started by creating your first request'}
      </p>
      <div className="flex gap-3">
        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-1)' }}
          >
            Clear filters
          </button>
        )}
        <button
          onClick={onCreateNew}
          className="px-4 py-2 text-sm font-semibold rounded-lg border-none transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          style={{ backgroundColor: 'hsl(var(--brand-primary))', color: 'var(--text-inverse)' }}
        >
          Create request
        </button>
      </div>
    </div>
  );
}

// Main Executive Table Component
export function ExecutiveTable({ 
  data, 
  isLoading, 
  onRowClick, 
  onOpenFullView, 
  onFieldUpdate,
  onCreateNew,
  onDuplicate,
  onDelete,
  externalHeader,
  searchValue: externalSearchValue,
  onSearchChange: externalOnSearchChange,
  onExport: externalOnExport,
  columnsDialogOpen: externalColumnsOpen,
  onColumnsDialogChange: externalOnColumnsChange,
  selectedRows: externalSelectedRows,
  onSelectedRowsChange,
}: ExecutiveTableProps) {
  // Fetch departments from admin-configured data
  const { data: adminDepartments = [] } = useDepartments();
  const departmentOptions = adminDepartments.map(d => ({ value: d.id, label: d.name }));
  
  const [density, setDensity] = useState<'compact' | 'regular' | 'relaxed'>('regular');
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery = externalSearchValue !== undefined ? externalSearchValue : internalSearchQuery;
  const setSearchQuery = externalOnSearchChange || setInternalSearchQuery;
  
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  
  const [sortConfig, setSortConfig] = useState<{ column: string | null; direction: 'asc' | 'desc' | null }>({ column: null, direction: null });
  const [internalSelectedRows, setInternalSelectedRows] = useState<string[]>([]);
  
  const selectedRows = externalSelectedRows !== undefined ? externalSelectedRows : internalSelectedRows;
  const setSelectedRows = onSelectedRowsChange || setInternalSelectedRows;
  
  const [visibleColumns, setVisibleColumns] = useColumnPreference(DEFAULT_VISIBLE_COLUMNS);
  const [columnOrder, setColumnOrder] = useState(ALL_COLUMNS.map(c => c.id));
  const [draggingColumn, setDraggingColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Columns with order and visibility
  const columns = useMemo(() => {
    return columnOrder
      .map(id => ALL_COLUMNS.find(c => c.id === id))
      .filter(c => c && visibleColumns.includes(c.id)) as typeof ALL_COLUMNS;
  }, [visibleColumns, columnOrder]);

  const { rowHeight } = DENSITY_CONFIG[density];

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(row =>
        row.id.toLowerCase().includes(query) ||
        row.summary.toLowerCase().includes(query)
      );
    }

    Object.entries(filters).forEach(([columnId, values]) => {
      if (values && values.length > 0) {
        result = result.filter(row => values.includes((row as any)[columnId]));
      }
    });

    if (sortConfig.column && sortConfig.direction) {
      result.sort((a, b) => {
        let aVal = (a as any)[sortConfig.column!];
        let bVal = (b as any)[sortConfig.column!];
        
        if (aVal === null || aVal === undefined) aVal = '';
        if (bVal === null || bVal === undefined) bVal = '';
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchQuery, filters, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, sortConfig]);

  const handleSort = (columnId: string) => {
    setSortConfig(prev => {
      if (prev.column !== columnId) return { column: columnId, direction: 'asc' };
      if (prev.direction === 'asc') return { column: columnId, direction: 'desc' };
      if (prev.direction === 'desc') return { column: null, direction: null };
      return { column: columnId, direction: 'asc' };
    });
  };

  const handleCellSave = async (rowId: string, columnId: string, newValue: any) => {
    const oldRow = data.find(r => r.id === rowId);
    const oldValue = oldRow ? (oldRow as any)[columnId] : null;
    
    if (oldValue === newValue) return;

    try {
      await onFieldUpdate(rowId, columnId, newValue);
      toast.success('Updated successfully');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.length === paginatedData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(paginatedData.map(r => r.id));
    }
  };

  const handleSelectRow = (rowId: string) => {
    setSelectedRows(prev => 
      prev.includes(rowId) ? prev.filter(id => id !== rowId) : [...prev, rowId]
    );
  };

  const handleExport = () => {
    const exportData = selectedRows.length > 0 
      ? processedData.filter(r => selectedRows.includes(r.id))
      : processedData;
    
    const csv = [
      columns.map(c => c.header).join(','),
      ...exportData.map(row => 
        columns.map(c => {
          const val = (row as any)[c.accessor];
          return val === null || val === undefined ? '' : `"${val}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'business-requests.csv';
    a.click();
    toast.success(`Exported ${exportData.length} rows`);
  };

  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggingColumn(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggingColumn && draggingColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleColumnDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const sourceColumnId = draggingColumn;
    
    if (sourceColumnId && sourceColumnId !== targetColumnId) {
      setColumnOrder(prev => {
        const newOrder = [...prev];
        const sourceIndex = newOrder.indexOf(sourceColumnId);
        const targetIndex = newOrder.indexOf(targetColumnId);
        newOrder.splice(sourceIndex, 1);
        newOrder.splice(targetIndex, 0, sourceColumnId);
        return newOrder;
      });
    }
    
    setDraggingColumn(null);
    setDragOverColumn(null);
  };

  const clearAllFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const activeFilterCount = Object.values(filters).reduce((acc, arr) => acc + arr.length, 0);
  const hasFilters = activeFilterCount > 0 || searchQuery.length > 0;

  // Render cell content
  const renderCellContent = (row: BusinessRequest, column: typeof ALL_COLUMNS[0]) => {
    const value = (row as any)[column.accessor];
    
    const handleInlineSave = async (newValue: any) => {
      await handleCellSave(row.id, column.id, newValue);
    };

    if (column.id === 'id') {
      return (
        <span 
          onClick={(e) => { e.stopPropagation(); onOpenFullView(row.id); }}
          className="font-semibold font-mono text-sm cursor-pointer hover:underline transition-colors focus:outline-none"
          style={{ color: 'var(--accent-color)' }}
          tabIndex={0}
          role="button"
          aria-label={`View request ${value}`}
        >
          {value}
        </span>
      );
    }
    
    if (column.id === 'summary') {
      return (
        <span 
          onClick={(e) => { e.stopPropagation(); onOpenFullView(row.id); }}
          className="block overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer font-medium hover:underline transition-colors text-sm"
          style={{ color: 'var(--text-1)' }}
          title={value}
        >
          {value}
        </span>
      );
    }
    
    if (column.id === 'processStep') {
      return (
        <EditableCell
          value={value}
          type="select"
          options={STATUS_OPTIONS}
          displayValue={<StatusBadge value={value} options={STATUS_OPTIONS} />}
          onSave={handleInlineSave}
          columnId={column.id}
        />
      );
    }
    
    if (column.id === 'score') {
      return <ScoreBar score={value} />;
    }
    
    if (column.id === 'rank') {
      return value ? (
        <span className="font-semibold tabular-nums text-sm" style={{ color: 'var(--text-1)' }}>#{value}</span>
      ) : (
        <span className="text-muted-foreground/60 text-sm font-medium">—</span>
      );
    }
    
    if (column.id === 'department') {
      const dept = departmentOptions.find(d => d.value === value || d.label === value);
      return (
        <EditableCell
          value={value}
          type="select"
          options={departmentOptions}
          displayValue={<span className="text-sm" style={{ color: 'var(--text-1)' }}>{dept?.label || <span className="text-muted-foreground/60">—</span>}</span>}
          onSave={handleInlineSave}
          columnId={column.id}
        />
      );
    }
    
    if (column.id === 'platform') {
      const plat = PLATFORMS.find(p => p.value === value);
      return (
        <EditableCell
          value={value}
          type="select"
          options={PLATFORMS}
          displayValue={<span className="text-sm" style={{ color: 'var(--text-1)' }}>{plat?.label || <span className="text-muted-foreground/60">—</span>}</span>}
          onSave={handleInlineSave}
          columnId={column.id}
        />
      );
    }
    
    if (column.id === 'reporter' || column.id === 'assignee' || column.id === 'businessOwner') {
      return (
        <span className="truncate text-sm" style={{ color: 'var(--text-1)' }}>
          {value || <span className="text-muted-foreground/60">—</span>}
        </span>
      );
    }
    
    if (column.id === 'businessAsk' || column.id === 'kickoff' || column.id === 'targetComplete' || column.id === 'createdAt') {
      return <DateDisplay date={value} />;
    }
    
    if (column.id === 'deliveryTrack') {
      const track = DELIVERY_TRACKS.find(t => t.value === value);
      return (
        <EditableCell
          value={value}
          type="select"
          options={DELIVERY_TRACKS}
          displayValue={<span className="text-sm" style={{ color: 'var(--text-1)' }}>{track?.label || <span className="text-muted-foreground/60">—</span>}</span>}
          onSave={handleInlineSave}
          columnId={column.id}
        />
      );
    }
    
    if (column.id === 'quarter') {
      const q = QUARTERS.find(q => q.value === value);
      return (
        <EditableCell
          value={value}
          type="select"
          options={QUARTERS}
          displayValue={<span className="text-sm" style={{ color: 'var(--text-1)' }}>{q?.label || <span className="text-muted-foreground/60">—</span>}</span>}
          onSave={handleInlineSave}
          columnId={column.id}
        />
      );
    }

    if (column.id === 'autoPriority') {
      if (value === 'unscored') {
        return <span className="text-sm italic" style={{ color: 'var(--text-3)' }}>Unscored</span>;
      }
      const opt = PRIORITY_OPTIONS.find(p => p.value === value);
      return <span className="text-sm" style={{ color: 'var(--text-1)' }}>{opt?.label || <span className="text-muted-foreground/60">—</span>}</span>;
    }

    return (
      <span className="block overflow-hidden text-ellipsis whitespace-nowrap text-sm" title={value} style={{ color: 'var(--text-1)' }}>
        {value ?? <span className="text-muted-foreground/60">—</span>}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-2)' }}>
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Toolbar */}
      {!externalHeader && (
        <EnterpriseToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          onFilterClick={() => setFilterDrawerOpen(true)}
          onColumnsClick={() => setColumnsOpen(!columnsOpen)}
          onExportClick={externalOnExport || handleExport}
          onCreateClick={onCreateNew}
          activeFilterCount={activeFilterCount}
          densityMode={density}
          onDensityChange={setDensity}
        />
      )}

      {/* Table Container */}
      <div className="flex-1 px-5 pb-4 pt-3 min-h-0 overflow-hidden relative">
        {/* Columns Panel (positioned relative to container) */}
        <div className="absolute top-3 right-5 z-50">
          <ColumnsPanel
            isOpen={columnsOpen}
            onClose={() => setColumnsOpen(false)}
            columns={ALL_COLUMNS}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={setVisibleColumns}
            defaultColumns={DEFAULT_VISIBLE_COLUMNS}
          />
        </div>

        <div 
          className="flex flex-col rounded-lg overflow-hidden h-full shadow-sm"
          style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--divider)' }}
        >
          {/* Table Scrollable Area */}
          <div className="flex-1 overflow-auto min-h-0">
            {processedData.length === 0 ? (
              <EmptyState 
                hasFilters={hasFilters} 
                onClearFilters={clearAllFilters} 
                onCreateNew={onCreateNew} 
              />
            ) : (
              <table 
                className="w-full border-collapse"
                style={{ minWidth: columns.reduce((acc, col) => acc + (col.minWidth || 100), 100), tableLayout: 'auto' }}
              >
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th 
                      className="w-12 px-3 text-center whitespace-nowrap sticky left-0 z-30"
                      style={{ height: '44px', backgroundColor: 'var(--surface-1)', borderBottom: '2px solid var(--divider)' }}
                    >
                      <input
                        type="checkbox"
                        checked={paginatedData.length > 0 && selectedRows.length === paginatedData.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 accent-brand-primary cursor-pointer rounded focus:ring-2 focus:ring-brand-primary/30"
                        aria-label="Select all rows"
                      />
                    </th>
                    {columns.map((col, colIndex) => {
                      const isSorted = sortConfig.column === col.id;
                      const isPinned = colIndex === 0 || colIndex === 1;
                      const leftOffset = colIndex === 0 ? '48px' : colIndex === 1 ? `${48 + (columns[0]?.minWidth || 110)}px` : undefined;
                      
                      return (
                        <th 
                          key={col.id}
                          draggable={!isPinned}
                          onDragStart={(e) => !isPinned && handleColumnDragStart(e, col.id)}
                          onDragOver={(e) => handleColumnDragOver(e, col.id)}
                          onDragLeave={() => setDragOverColumn(null)}
                          onDrop={(e) => handleColumnDrop(e, col.id)}
                          onDragEnd={() => { setDraggingColumn(null); setDragOverColumn(null); }}
                          className={cn(
                            "group px-3 text-left whitespace-nowrap transition-colors",
                            draggingColumn === col.id && "opacity-50",
                            isPinned && "sticky z-30"
                          )}
                          style={{ 
                            height: '44px',
                            minWidth: col.minWidth,
                            backgroundColor: dragOverColumn === col.id ? 'var(--accent-muted)' : 'var(--surface-1)',
                            borderBottom: isSorted ? '2px solid var(--accent-color)' : '2px solid var(--divider)',
                            borderLeft: dragOverColumn === col.id ? '2px solid var(--accent-color)' : 'none',
                            cursor: isPinned ? 'default' : 'grab',
                            ...(isPinned && leftOffset ? { left: leftOffset } : {}),
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="select-none font-semibold uppercase tracking-wider text-[11px]"
                              style={{ color: 'var(--text-2)', letterSpacing: '0.04em' }}
                            >
                              {col.header}
                            </span>
                            {col.sortable && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSort(col.id); }}
                                className={cn(
                                  "p-1 border-none bg-transparent cursor-pointer flex items-center rounded transition-all focus:outline-none focus:ring-1 focus:ring-brand-primary/30",
                                  isSorted ? "opacity-100" : "opacity-0 group-hover:opacity-70"
                                )}
                                style={{ color: isSorted ? 'var(--accent-color)' : 'var(--text-2)' }}
                                aria-label={`Sort by ${col.header}`}
                              >
                                {isSorted && sortConfig.direction === 'desc' ? <Icons.ChevronDown /> : <Icons.ChevronUp />}
                              </button>
                            )}
                          </div>
                        </th>
                      );
                    })}
                    <th 
                      className="w-14 px-3"
                      style={{ height: '44px', backgroundColor: 'var(--surface-1)', borderBottom: '2px solid var(--divider)' }}
                    />
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors cursor-pointer group/row"
                      style={{ 
                        height: `${rowHeight}px`,
                        backgroundColor: selectedRows.includes(row.id) ? 'var(--accent-muted)' : 'var(--surface-1)',
                      }}
                      onClick={() => onRowClick(row)}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface-2)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selectedRows.includes(row.id) ? 'var(--accent-muted)' : 'var(--surface-1)'; }}
                    >
                      <td 
                        className="px-3 text-center sticky left-0 z-10"
                        style={{ borderBottom: '1px solid var(--divider)', backgroundColor: selectedRows.includes(row.id) ? 'var(--accent-muted)' : 'var(--surface-1)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(row.id)}
                          onChange={() => handleSelectRow(row.id)}
                          className="w-4 h-4 accent-brand-primary cursor-pointer rounded focus:ring-2 focus:ring-brand-primary/30"
                          aria-label={`Select row ${row.id}`}
                        />
                      </td>
                      {columns.map((col, colIndex) => {
                        const isPinned = colIndex === 0 || colIndex === 1;
                        const leftOffset = colIndex === 0 ? '48px' : colIndex === 1 ? `${48 + (columns[0]?.minWidth || 110)}px` : undefined;
                        
                        return (
                          <td 
                            key={col.id} 
                            className={cn("px-3 whitespace-nowrap overflow-hidden text-ellipsis", isPinned && "sticky z-10")}
                            style={{ 
                              minWidth: col.minWidth,
                              textAlign: (col.align || 'left') as React.CSSProperties['textAlign'],
                              borderBottom: '1px solid var(--divider)',
                              backgroundColor: selectedRows.includes(row.id) ? 'var(--accent-muted)' : 'var(--surface-1)',
                              ...(isPinned && leftOffset ? { left: leftOffset } : {}),
                            }}
                          >
                            {renderCellContent(row, col)}
                          </td>
                        );
                      })}
                      <td 
                        className="px-3"
                        style={{ borderBottom: '1px solid var(--divider)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <RowActionsMenu
                          onDuplicate={async () => {
                            if (onDuplicate) await onDuplicate(row.id);
                            else toast.success('Duplicated');
                          }}
                          onDelete={() => setDeleteConfirmId(row.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {processedData.length > 0 && (
            <PaginationFooter
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={processedData.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            />
          )}
        </div>
      </div>

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        filterGroups={FILTER_GROUPS}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <>
          <div
            onClick={() => setDeleteConfirmId(null)}
            className="fixed inset-0 z-[250]"
            style={{ backgroundColor: 'var(--overlay-bg)' }}
          />
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl shadow-2xl z-[300] p-6 w-[400px]"
            style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--border-color)' }}
            role="alertdialog"
            aria-labelledby="delete-title"
            aria-describedby="delete-desc"
          >
            <h3 id="delete-title" className="text-lg font-bold mb-2" style={{ color: 'var(--text-1)' }}>Delete Business Request?</h3>
            <p id="delete-desc" className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
              Are you sure you want to delete this business request? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-2)', color: 'var(--text-1)' }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (onDelete) await onDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                  toast.success('Deleted successfully');
                }}
                className="flex-1 py-2.5 border-none rounded-lg bg-destructive text-white text-sm font-medium cursor-pointer hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive/30"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
