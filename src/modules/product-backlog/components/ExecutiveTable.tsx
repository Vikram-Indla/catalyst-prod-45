/**
 * Executive Table - High-density, enterprise-grade data table for Business Requests
 * Implements the Catalyst Executive Table specification exactly
 * REFACTORED: Single boxed container, no frozen columns by default, pagination footer inside
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { IndustryViewSwitchButton } from '@/components/industry/IndustryViewSwitchButton';
import { useDepartments } from '@/hooks/useDepartmentsAndOwners';

// Row heights for density modes - Enterprise-grade compact
const DENSITY_CONFIG = {
  compact: { rowHeight: 36, fontSize: 12, padding: '6px 10px' },
  regular: { rowHeight: 44, fontSize: 13, padding: '8px 10px' },
  relaxed: { rowHeight: 48, fontSize: 14, padding: '10px 12px' },
};

// Status options - neutral styling with accent indicators
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

// Departments - loaded dynamically from admin-configured data via useDepartments hook
// NO hardcoded department values - see ZERO-SEED policy

// Platforms
const PLATFORMS = [
  { value: 'innovation', label: 'Innovation Platform' },
  { value: 'senaei', label: 'Senaei Platform' },
  { value: 'internal', label: 'Internal System' },
  { value: 'web', label: 'Web Portal' },
  { value: 'mobile', label: 'Mobile App' },
];

// Icons - Enterprise sizing (14-16px for visibility)
const Icons = {
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  ChevronUp: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>,
  ChevronDown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>,
  ChevronLeft: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>,
  ChevronRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>,
  Filter: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/></svg>,
  X: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Download: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Columns: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>,
  Density: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  MoreVertical: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>,
  Eye: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Copy: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Grid: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
};

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

// All columns configuration - NO frozen columns by default
// Note: Department options are loaded dynamically inside the component via useDepartments hook
const ALL_COLUMNS = [
  { id: 'id', header: 'Request ID', accessor: 'id', minWidth: 110, sortable: true },
  { id: 'summary', header: 'Summary', accessor: 'summary', minWidth: 320, sortable: true, editable: true },
  { id: 'processStep', header: 'Status', accessor: 'processStep', minWidth: 160, sortable: true, filterable: true, editable: true, type: 'select', options: STATUS_OPTIONS },
  { id: 'score', header: 'Score', accessor: 'score', minWidth: 120, sortable: true, type: 'number', align: 'right' },
  { id: 'autoPriority', header: 'Auto Priority', accessor: 'autoPriority', minWidth: 120, sortable: true, filterable: true, type: 'select', options: [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'unscored', label: 'Unscored' },
  ] },
  { id: 'rank', header: 'Rank', accessor: 'rank', minWidth: 100, sortable: true, type: 'number', align: 'center' },
  { id: 'reporter', header: 'Reporter', accessor: 'reporter', minWidth: 140, sortable: true },
  { id: 'assignee', header: 'Assignee', accessor: 'assignee', minWidth: 140, sortable: true },
  { id: 'department', header: 'Department', accessor: 'department', minWidth: 180, sortable: true, filterable: true, editable: true, type: 'select', options: [] }, // Populated dynamically
  { id: 'businessOwner', header: 'Business Owner', accessor: 'businessOwner', minWidth: 160, sortable: true },
  { id: 'businessAsk', header: 'Business Ask', accessor: 'businessAsk', minWidth: 120, sortable: true, type: 'date' },
  { id: 'kickoff', header: 'Kickoff', accessor: 'kickoff', minWidth: 120, sortable: true, type: 'date' },
  { id: 'targetComplete', header: 'Target Complete', accessor: 'targetComplete', minWidth: 130, sortable: true, type: 'date' },
  { id: 'deliveryTrack', header: 'Delivery Track', accessor: 'deliveryTrack', minWidth: 140, sortable: true, filterable: true, editable: true, type: 'select', options: DELIVERY_TRACKS },
  { id: 'platform', header: 'Delivery Platform', accessor: 'platform', minWidth: 150, sortable: true, filterable: true, editable: true, type: 'select', options: PLATFORMS },
  { id: 'quarter', header: 'Quarter', accessor: 'quarter', minWidth: 110, sortable: true, filterable: true, editable: true, type: 'select', options: QUARTERS },
  { id: 'createdAt', header: 'Created', accessor: 'createdAt', minWidth: 110, sortable: true },
];

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
  /** If provided, external header is rendered; internal header is hidden */
  externalHeader?: React.ReactNode;
  /** External search value for controlled search */
  searchValue?: string;
  /** Callback when search value changes */
  onSearchChange?: (value: string) => void;
  /** Callback for export action */
  onExport?: () => void;
  /** External control for columns dialog */
  columnsDialogOpen?: boolean;
  onColumnsDialogChange?: (open: boolean) => void;
  /** External control for selected rows */
  selectedRows?: string[];
  onSelectedRowsChange?: (rows: string[]) => void;
}

// Status Badge - neutral pill with small left accent dot, enterprise compact
function StatusBadge({ value, options }: { value: string; options: { value: string; label: string; accent?: string }[] }) {
  const option = options.find(o => o.value === value);
  if (!option) return <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>—</span>;
  
  // Accent dot color based on status category
  const accentClasses: Record<string, string> = {
    gold: 'bg-brand-gold',
    green: 'bg-secondary-green',
    neutral: 'bg-muted-foreground/40',
  };
  
  const accentClass = accentClasses[option.accent || 'neutral'] || accentClasses.neutral;
  
  return (
    <span 
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded whitespace-nowrap"
      style={{ 
        backgroundColor: 'var(--surface-3)',
        border: '1px solid var(--border-color)',
        fontSize: '11px',
        fontWeight: 500,
        color: 'var(--text-1)',
      }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${accentClass}`} />
      {option.label}
    </span>
  );
}

// Score Progress Bar - with proper track border, enterprise compact
function ScoreBar({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>—</span>;
  }
  
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div 
        className="flex-1 h-1.5 rounded overflow-hidden"
        style={{ 
          backgroundColor: 'var(--surface-3)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div 
          className="h-full rounded-sm transition-all duration-300 bg-secondary-green"
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span 
        className="min-w-[24px] tabular-nums font-medium"
        style={{ fontSize: '12px', color: 'var(--text-1)' }}
      >
        {score}
      </span>
    </div>
  );
}

// Date Display - neutral text only, enterprise compact
function DateDisplay({ date }: { date: string | null }) {
  if (!date) return <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>—</span>;
  const d = new Date(date);
  
  return (
    <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>
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
        className="w-full px-2 py-1 border-2 border-brand-gold rounded text-xs outline-none bg-background shadow-md min-w-[120px] cursor-pointer"
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
        className="w-full px-2 py-1 border-2 border-brand-gold rounded text-xs outline-none bg-background shadow-md min-w-[130px] cursor-pointer"
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
      className="w-full px-2 py-1 border-2 border-brand-gold rounded text-xs outline-none bg-background shadow-md"
    />
  );
}

// Editable Cell
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
      className={`flex items-center gap-1 px-1 py-0.5 -mx-1 rounded transition-all ${isQuickEdit ? 'cursor-pointer hover:bg-brand-gold/10 hover:border-brand-gold/40' : ''} ${isSaving ? 'bg-success/15' : ''}`}
      style={{ border: '1px solid transparent' }}
    >
      {displayValue}
      {isQuickEdit && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 opacity-50 text-muted-foreground">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      )}
      {isSaving && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="flex-shrink-0 text-success">
          <polyline points="20,6 9,17 4,12"/>
        </svg>
      )}
    </div>
  );
}

// Column Filter Dropdown
function ColumnFilterDropdown({ column, options, selected, onApply, onClear }: {
  column: string;
  options: { value: string; label: string }[];
  selected: string[];
  onApply: (values: string[]) => void;
  onClear: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [localSelected, setLocalSelected] = useState(selected);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setLocalSelected(selected);
  }, [selected]);

  const handleToggle = (value: string) => {
    setLocalSelected(prev => 
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-0.5 border-none bg-transparent cursor-pointer flex items-center"
        style={{ color: selected.length > 0 ? 'var(--accent-color)' : 'var(--text-3)' }}
      >
        <Icons.Filter />
        {selected.length > 0 && (
          <span 
            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            {selected.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-1 min-w-[180px] rounded-lg shadow-lg z-[400]"
          style={{ 
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div className="p-2 max-h-[200px] overflow-y-auto">
            {options.map(opt => (
              <label
                key={opt.value}
                className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs"
                style={{ color: 'var(--text-1)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <input
                  type="checkbox"
                  checked={localSelected.includes(opt.value)}
                  onChange={() => handleToggle(opt.value)}
                  className="accent-brand-gold"
                />
                {opt.label}
              </label>
            ))}
          </div>
          <div className="p-2 flex gap-2" style={{ borderTop: '1px solid var(--divider)' }}>
            <button
              onClick={() => { onClear(); setIsOpen(false); }}
              className="flex-1 py-1.5 rounded text-[11px] cursor-pointer"
              style={{ 
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--surface-2)',
                color: 'var(--text-1)',
              }}
            >
              Clear
            </button>
            <button
              onClick={() => { onApply(localSelected); setIsOpen(false); }}
              className="flex-1 py-1.5 border-none rounded bg-brand-gold text-white text-[11px] font-semibold cursor-pointer hover:bg-brand-gold-hover"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Density Selector
function DensitySelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { value: 'compact', label: 'Compact', desc: '36px rows, max density' },
    { value: 'regular', label: 'Regular', desc: '44px rows, balanced' },
    { value: 'relaxed', label: 'Relaxed', desc: '52px rows, spacious' },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs cursor-pointer"
        title="Row Density"
        style={{ 
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--surface-1)',
          color: 'var(--text-2)',
        }}
      >
        <Icons.Density />
      </button>

      {isOpen && (
        <div 
          className="absolute top-full right-0 mt-1 rounded-lg shadow-lg z-[400] min-w-[140px]"
          style={{ 
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-color)',
          }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className="w-full flex flex-col items-start px-3 py-2.5 border-none text-left cursor-pointer"
              style={{ 
                backgroundColor: value === opt.value ? 'var(--accent-muted)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (value !== opt.value) e.currentTarget.style.backgroundColor = 'var(--surface-3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = value === opt.value ? 'var(--accent-muted)' : 'transparent';
              }}
            >
              <span 
                className={`text-xs ${value === opt.value ? 'font-semibold' : ''}`}
                style={{ color: 'var(--text-1)' }}
              >
                {opt.label}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{opt.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Column Manager
function ColumnManager({ columns, visibleColumns, onChange, externalOpen, onExternalOpenChange, hideButton = false }: { 
  columns: typeof ALL_COLUMNS; 
  visibleColumns: string[]; 
  onChange: (visible: string[]) => void;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  hideButton?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = onExternalOpenChange || setInternalOpen;
  
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  const toggleColumn = (colId: string) => {
    const newVisible = visibleColumns.includes(colId)
      ? visibleColumns.filter(id => id !== colId)
      : [...visibleColumns, colId];
    onChange(newVisible);
  };

  // When hideButton is true, render only the dropdown (for external header case)
  if (hideButton) {
    if (!isOpen) return null;
    return (
      <div 
        ref={ref} 
        className="fixed top-24 right-6 rounded-lg shadow-lg z-[500] min-w-[200px] max-h-[300px] overflow-y-auto"
        style={{ 
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div className="p-2">
          <div 
            className="text-[10px] px-2 py-1 mb-1 uppercase tracking-wider"
            style={{ color: 'var(--text-3)' }}
          >
            Toggle Visibility
          </div>
          {columns.map(col => (
            <label
              key={col.id}
              className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer text-xs"
              style={{ color: 'var(--text-1)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <input
                type="checkbox"
                checked={visibleColumns.includes(col.id)}
                onChange={() => toggleColumn(col.id)}
                className="accent-brand-gold"
              />
              {col.header}
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs cursor-pointer"
        title="Columns"
        style={{ 
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--surface-1)',
          color: 'var(--text-2)',
        }}
      >
        <Icons.Columns />
      </button>

      {isOpen && (
        <div 
          className="absolute top-full right-0 mt-1 rounded-lg shadow-lg z-[500] min-w-[200px] max-h-[300px] overflow-y-auto"
          style={{ 
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div className="p-2">
            <div 
              className="text-[10px] px-2 py-1 mb-1 uppercase tracking-wider"
              style={{ color: 'var(--text-3)' }}
            >
              Toggle Visibility
            </div>
            {columns.map(col => (
              <label
                key={col.id}
                className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer text-xs"
                style={{ color: 'var(--text-1)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(col.id)}
                  onChange={() => toggleColumn(col.id)}
                  className="accent-brand-gold"
                />
                {col.header}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Row Actions Menu - Only Duplicate + Delete
function RowActionsMenu({ onDuplicate, onDelete }: {
  onDuplicate: () => void;
  onDelete: () => void;
}) {
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
        className="p-1 border-none bg-transparent cursor-pointer rounded"
        style={{ color: 'var(--icon-default)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--surface-3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <Icons.MoreVertical />
      </button>

      {isOpen && (
        <div 
          className="absolute top-full right-0 mt-1 rounded-lg shadow-lg z-[400] min-w-[120px]"
          style={{ 
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-color)',
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onDuplicate(); setIsOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 border-none bg-transparent text-xs cursor-pointer text-left"
            style={{ color: 'var(--text-1)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Icons.Copy />
            Duplicate
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); setIsOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 border-none bg-transparent text-xs cursor-pointer text-left text-destructive"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Icons.Trash />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// RowDetailPanel removed - clicks go directly to canonical drawer

// Pagination Footer - Themed with semantic tokens
function PaginationFooter({ 
  currentPage, 
  totalPages, 
  totalItems, 
  pageSize, 
  onPageChange, 
  onPageSizeChange 
}: {
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
      className="flex items-center justify-between px-4 py-3"
      style={{ 
        borderTop: '1px solid var(--divider)',
        backgroundColor: 'var(--surface-2)',
      }}
    >
      {/* Left: Rows per page */}
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-2)' }}>
        <span>Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-2 py-1 rounded text-xs cursor-pointer"
          style={{ 
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--input-bg)',
            color: 'var(--text-1)',
          }}
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Center: Prev/Next + Page indicator */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{ 
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--surface-1)',
            color: 'var(--text-1)',
          }}
        >
          <Icons.ChevronLeft />
        </button>
        <span className="text-xs px-2" style={{ color: 'var(--text-2)' }}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{ 
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--surface-1)',
            color: 'var(--text-1)',
          }}
        >
          <Icons.ChevronRight />
        </button>
      </div>

      {/* Right: Showing X-Y of Z */}
      <div className="text-xs" style={{ color: 'var(--text-2)' }}>
        Showing {startItem}–{endItem} of {totalItems}
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
  const navigate = useNavigate();
  
  // Fetch departments from admin-configured data (ZERO-SEED policy)
  const { data: adminDepartments = [] } = useDepartments();
  const departmentOptions = adminDepartments.map(d => ({ value: d.id, label: d.name }));
  
  const [density, setDensity] = useState<'compact' | 'regular' | 'relaxed'>('regular');
  // Use external search if provided, otherwise internal
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery = externalSearchValue !== undefined ? externalSearchValue : internalSearchQuery;
  const setSearchQuery = externalOnSearchChange || setInternalSearchQuery;
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [sortConfig, setSortConfig] = useState<{ column: string | null; direction: 'asc' | 'desc' | null }>({ column: null, direction: null });
  const [internalSelectedRows, setInternalSelectedRows] = useState<string[]>([]);
  
  // Use external selected rows if provided, otherwise internal
  const selectedRows = externalSelectedRows !== undefined ? externalSelectedRows : internalSelectedRows;
  const setSelectedRows = onSelectedRowsChange || setInternalSelectedRows;
  
  const [visibleColumns, setVisibleColumns] = useState(ALL_COLUMNS.map(c => c.id));
  const [columnOrder, setColumnOrder] = useState(ALL_COLUMNS.map(c => c.id));
  const [draggingColumn, setDraggingColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Columns - NO frozen columns by default, all scroll together
  const columns = useMemo(() => {
    return columnOrder
      .map(id => ALL_COLUMNS.find(c => c.id === id))
      .filter(c => c && visibleColumns.includes(c.id)) as typeof ALL_COLUMNS;
  }, [visibleColumns, columnOrder]);

  // Density config
  const { rowHeight } = DENSITY_CONFIG[density];

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    // Global search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(row =>
        row.id.toLowerCase().includes(query) ||
        row.summary.toLowerCase().includes(query)
      );
    }

    // Column filters
    Object.entries(filters).forEach(([columnId, values]) => {
      if (values && values.length > 0) {
        result = result.filter(row => values.includes((row as any)[columnId]));
      }
    });

    // Sorting
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

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize));

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, sortConfig]);

  // Handlers
  const handleSort = (columnId: string) => {
    setSortConfig(prev => {
      if (prev.column !== columnId) return { column: columnId, direction: 'asc' };
      if (prev.direction === 'asc') return { column: columnId, direction: 'desc' };
      if (prev.direction === 'desc') return { column: null, direction: null };
      return { column: columnId, direction: 'asc' };
    });
  };

  const handleFilter = (columnId: string, values: string[]) => {
    setFilters(prev => ({ ...prev, [columnId]: values }));
  };

  const handleCellSave = async (rowId: string, columnId: string, newValue: any) => {
    const oldRow = data.find(r => r.id === rowId);
    const oldValue = oldRow ? (oldRow as any)[columnId] : null;
    
    if (oldValue === newValue) return;

    try {
      await onFieldUpdate(rowId, columnId, newValue);
      toast.success(`Updated successfully`);
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

  // Column drag handlers
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

  // Render cell content
  const renderCellContent = (row: BusinessRequest, column: typeof ALL_COLUMNS[0]) => {
    const value = (row as any)[column.accessor];
    
    const handleInlineSave = async (newValue: any) => {
      await handleCellSave(row.id, column.id, newValue);
    };

    if (column.id === 'id') {
      return (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            onOpenFullView(row.id);
          }}
          className="font-semibold font-mono text-[13px] cursor-pointer hover:underline transition-colors"
          style={{ color: 'var(--accent-color)' }}
        >
          {value}
        </span>
      );
    }
    
    if (column.id === 'summary') {
      return (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            onOpenFullView(row.id);
          }}
          className="block overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer font-medium hover:underline transition-colors"
          style={{ 
            color: 'var(--text-1)',
            fontSize: '13px',
          }}
          title={`Click to view details: ${value}`}
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
      // Empty state = dash, ranked = bold number
      return value ? (
        <span className="font-semibold tabular-nums" style={{ color: 'var(--text-1)', fontSize: '13px' }}>#{value}</span>
      ) : (
        <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>—</span>
      );
    }
    
    if (column.id === 'department') {
      // Find department by ID or name (handles both FK and legacy string data)
      const dept = departmentOptions.find(d => d.value === value || d.label === value);
      return (
        <EditableCell
          value={value}
          type="select"
          options={departmentOptions}
          displayValue={<span style={{ fontSize: '13px', color: 'var(--text-1)' }}>{dept?.label || '—'}</span>}
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
          displayValue={<span style={{ fontSize: '13px', color: 'var(--text-1)' }}>{plat?.label || '—'}</span>}
          onSave={handleInlineSave}
          columnId={column.id}
        />
      );
    }
    
    if (column.id === 'reporter' || column.id === 'assignee' || column.id === 'businessOwner') {
      return (
        <span className="truncate" style={{ fontSize: '13px', color: 'var(--text-1)' }}>
          {value || <span style={{ color: 'var(--text-3)' }}>—</span>}
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
          displayValue={<span style={{ fontSize: '13px', color: 'var(--text-1)' }}>{track?.label || '—'}</span>}
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
          displayValue={<span style={{ fontSize: '13px', color: 'var(--text-1)' }}>{q?.label || '—'}</span>}
          onSave={handleInlineSave}
          columnId={column.id}
        />
      );
    }

    return (
      <span 
        className="block overflow-hidden text-ellipsis whitespace-nowrap" 
        title={value}
        style={{ fontSize: '13px', color: 'var(--text-1)' }}
      >
        {value ?? <span style={{ color: 'var(--text-3)' }}>—</span>}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="p-10 text-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg)' }}>
      {/* EXTERNAL HEADER or INTERNAL HEADER */}
      {externalHeader ? (
        <>
          {externalHeader}
          {/* Render ColumnManager when external header is used so columns dropdown works */}
          <ColumnManager 
            columns={ALL_COLUMNS} 
            visibleColumns={visibleColumns} 
            onChange={setVisibleColumns} 
            externalOpen={externalColumnsOpen} 
            onExternalOpenChange={externalOnColumnsChange}
            hideButton={true}
          />
        </>
      ) : (
        <div style={{ backgroundColor: 'var(--bg)' }} className="flex-shrink-0">
          {/* Row 1: Title Row - 44px, no border */}
          <div className="h-11 flex items-center px-6">
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-xl font-bold text-secondary-green m-0 leading-tight">
                Business Requests
              </h1>
              <span className="text-sm font-medium text-muted-foreground">
                {processedData.length}/{data.length}
                {selectedRows.length > 0 && (
                  <span className="ml-2 text-brand-gold font-semibold">
                    • {selectedRows.length} selected
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Row 2: Toolbar Row - 52px, with border-bottom */}
          <div className="h-13 flex items-center px-6">
            <div className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-4">
              {/* Left Zone: View Toggle - Show only switch-to-other-view button */}
              <div className="flex items-center">
                <IndustryViewSwitchButton currentView="list" />
              </div>

              {/* Center Zone: Search */}
              <div className="flex justify-center">
                <div className="w-full max-w-[480px] h-10 flex items-center gap-2 px-3 border border-border rounded-lg bg-muted/50">
                  <Icons.Search />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="flex-1 border-none outline-none text-sm bg-transparent text-foreground"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="border-none bg-transparent cursor-pointer text-muted-foreground p-0.5"
                    >
                      <Icons.X />
                    </button>
                  )}
                </div>
              </div>

              {/* Right Zone: Actions */}
              <div className="flex items-center gap-3">
                {/* Avatar Group Placeholder */}
                <div className="flex items-center gap-1">
                  <div className="w-7 h-7 rounded-full bg-info border-2 border-background flex items-center justify-center text-white text-[11px] font-semibold">J</div>
                  <div className="w-7 h-7 rounded-full bg-info border-2 border-background -ml-1.5 flex items-center justify-center text-white text-[11px] font-semibold">VI</div>
                  <div className="w-7 h-7 rounded-full bg-brand-gold border-2 border-background -ml-1.5 flex items-center justify-center text-white text-[11px] font-semibold">VI</div>
                </div>

                {/* Vertical Separator */}
                <div className="w-px h-6 bg-border" />

                {/* Icon Buttons - 32x32 */}
                <button className="w-8 h-8 border border-border rounded-md bg-background text-muted-foreground flex items-center justify-center cursor-pointer hover:bg-muted" title="Quick Actions">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/>
                  </svg>
                </button>
                <button className="w-8 h-8 border border-border rounded-md bg-background text-muted-foreground flex items-center justify-center cursor-pointer hover:bg-muted" title="Analytics">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </button>
                <DensitySelector value={density} onChange={(v) => setDensity(v as any)} />
                <ColumnManager columns={ALL_COLUMNS} visibleColumns={visibleColumns} onChange={setVisibleColumns} externalOpen={externalColumnsOpen} onExternalOpenChange={externalOnColumnsChange} />
                <button
                  onClick={externalOnExport || handleExport}
                  className="w-8 h-8 border border-border rounded-md bg-background text-muted-foreground flex items-center justify-center cursor-pointer hover:bg-muted"
                  title="Export CSV"
                >
                  <Icons.Download />
                </button>

                {/* Primary Add Button - 32x32 */}
                <button
                  onClick={onCreateNew}
                  className="w-8 h-8 border-none rounded-md bg-brand-gold text-white flex items-center justify-center cursor-pointer hover:bg-brand-gold-hover"
                  title="New Request"
                >
                  <Icons.Plus />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABLE CONTAINER - Single boxed card with border, border-radius, horizontal scroll */}
      {/* Proper spacing and full-width content with semantic tokens for dark mode */}
      <div className="px-4 pb-4 pt-3 flex-1 min-h-0 overflow-hidden">
        <div 
          className="flex flex-col rounded-xl overflow-hidden h-full"
          style={{ 
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-color)',
          }}
        >
          {/* Scrollable Table Area - owns horizontal + vertical scroll */}
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full border-collapse" style={{ minWidth: columns.reduce((acc, col) => acc + (col.minWidth || 100), 48 + 40) }}>
              <thead className="sticky top-0 z-10">
                <tr>
                  {/* Checkbox column - 40px header height */}
                  <th 
                    className="w-10 px-2.5 text-center whitespace-nowrap"
                    style={{ 
                      height: '40px',
                      backgroundColor: 'var(--surface-2)',
                      borderBottom: '2px solid var(--border-color)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={paginatedData.length > 0 && selectedRows.length === paginatedData.length}
                      onChange={handleSelectAll}
                      className="w-3.5 h-3.5 accent-brand-gold cursor-pointer"
                    />
                  </th>
                  {columns.map(col => {
                    const isSorted = sortConfig.column === col.id;
                    const hasActiveFilter = filters[col.id] && filters[col.id].length > 0;
                    return (
                      <th 
                        key={col.id}
                        draggable={true}
                        onDragStart={(e) => handleColumnDragStart(e, col.id)}
                        onDragOver={(e) => handleColumnDragOver(e, col.id)}
                        onDragLeave={() => setDragOverColumn(null)}
                        onDrop={(e) => handleColumnDrop(e, col.id)}
                        onDragEnd={() => { setDraggingColumn(null); setDragOverColumn(null); }}
                        className={`group px-2.5 text-left whitespace-nowrap cursor-grab transition-colors ${
                          draggingColumn === col.id ? 'opacity-50' : ''
                        }`}
                        style={{ 
                          height: '40px',
                          minWidth: col.minWidth,
                          backgroundColor: dragOverColumn === col.id ? 'var(--accent-muted)' : 'var(--surface-2)',
                          borderBottom: isSorted ? '2px solid var(--accent-color)' : '2px solid var(--border-color)',
                          borderLeft: dragOverColumn === col.id ? '2px solid var(--accent-color)' : 'none',
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          {/* Drag handle - subtle, visible on hover */}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 cursor-grab opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: 'var(--text-3)' }}>
                            <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
                            <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
                          </svg>
                          {/* Header label - 12px semibold, high contrast */}
                          <span 
                            className="select-none text-xs font-semibold tracking-wide"
                            style={{ color: 'var(--text-1)' }}
                          >
                            {col.header}
                          </span>
                          {/* Sort icon - visible on hover OR when active */}
                          {col.sortable && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSort(col.id); }}
                              onMouseDown={(e) => e.stopPropagation()}
                              className={`p-0.5 border-none bg-transparent cursor-pointer flex items-center transition-opacity ${
                                isSorted ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                              }`}
                              style={{ color: isSorted ? 'var(--accent-color)' : 'var(--text-3)' }}
                            >
                              {isSorted && sortConfig.direction === 'desc' 
                                ? <Icons.ChevronDown />
                                : <Icons.ChevronUp />
                              }
                            </button>
                          )}
                          {/* Filter icon - visible on hover OR when active */}
                          {col.filterable && col.options && (
                            <div 
                              onMouseDown={(e) => e.stopPropagation()}
                              className={`transition-opacity ${hasActiveFilter ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}
                            >
                              <ColumnFilterDropdown
                                column={col.id}
                                options={col.options}
                                selected={filters[col.id] || []}
                                onApply={(values) => handleFilter(col.id, values)}
                                onClear={() => handleFilter(col.id, [])}
                              />
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  {/* Actions column header */}
                  <th 
                    className="w-12 px-2.5"
                    style={{ 
                      height: '40px',
                      backgroundColor: 'var(--surface-2)',
                      borderBottom: '2px solid var(--border-color)',
                    }}
                  ></th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td 
                      colSpan={columns.length + 2} 
                      className="text-center py-8"
                      style={{ color: 'var(--text-3)' }}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                        <span className="text-sm font-medium">No items to display</span>
                        <span className="text-xs opacity-70">Create a new request or adjust your filters</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, index) => (
                    <tr
                      key={row.id}
                      className="transition-colors cursor-pointer"
                      style={{ 
                        height: `${rowHeight}px`,
                        backgroundColor: selectedRows.includes(row.id) 
                          ? 'var(--accent-muted)' 
                          : index % 2 === 1 ? 'var(--surface-2)' : 'var(--surface-1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--surface-3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = selectedRows.includes(row.id) 
                          ? 'var(--accent-muted)' 
                          : index % 2 === 1 ? 'var(--surface-2)' : 'var(--surface-1)';
                      }}
                    >
                      <td 
                        className="px-2.5 text-center"
                        style={{ borderBottom: '1px solid var(--divider)' }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(row.id)}
                          onChange={() => handleSelectRow(row.id)}
                          className="w-3.5 h-3.5 accent-brand-gold cursor-pointer"
                        />
                      </td>
                      {columns.map(col => (
                        <td 
                          key={col.id} 
                          className="px-2.5 whitespace-nowrap overflow-hidden text-ellipsis"
                          style={{ 
                            minWidth: col.minWidth,
                            textAlign: (col.align || 'left') as React.CSSProperties['textAlign'],
                            borderBottom: '1px solid var(--divider)',
                            color: 'var(--text-1)',
                            fontSize: '13px',
                          }}
                        >
                          {renderCellContent(row, col)}
                        </td>
                      ))}
                      <td 
                        className="px-2.5"
                        style={{ borderBottom: '1px solid var(--divider)' }}
                      >
                        <RowActionsMenu
                          onDuplicate={async () => {
                            if (onDuplicate) {
                              await onDuplicate(row.id);
                            } else {
                              toast.success('Duplicated');
                            }
                          }}
                          onDelete={() => setDeleteConfirmId(row.id)}
                        />
                      </td>
                    </tr>
                  ))
                )}
                {/* Empty space filler - intentional when few rows */}
                {paginatedData.length > 0 && paginatedData.length < 5 && (
                  <tr>
                    <td 
                      colSpan={columns.length + 2} 
                      className="text-center py-10"
                      style={{ 
                        color: 'var(--text-3)',
                        borderBottom: 'none',
                      }}
                    >
                      <span className="text-xs opacity-50">End of list</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer - INSIDE the boxed container */}
          <PaginationFooter
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={processedData.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Delete Confirmation Modal - themed */}
      {deleteConfirmId && (
        <>
          <div
            onClick={() => setDeleteConfirmId(null)}
            style={{ backgroundColor: 'var(--overlay-bg)' }}
            className="fixed inset-0 z-[250]"
          />
          <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl shadow-2xl z-[300] p-6 w-[400px]"
            style={{ 
              backgroundColor: 'var(--surface-1)',
              border: '1px solid var(--border-color)',
            }}
          >
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-1)' }}>Delete Business Request?</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
              Are you sure you want to delete this business request? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium cursor-pointer"
                style={{ 
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--text-1)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (onDelete) {
                    await onDelete(deleteConfirmId);
                  }
                  setDeleteConfirmId(null);
                  toast.success('Deleted successfully');
                }}
                className="flex-1 py-2.5 border-none rounded-lg bg-destructive text-white text-sm font-medium cursor-pointer hover:bg-destructive/90"
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
