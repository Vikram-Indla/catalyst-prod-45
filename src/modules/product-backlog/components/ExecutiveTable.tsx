/**
 * Executive Table - High-density, enterprise-grade data table for Business Requests
 * Implements the Catalyst Executive Table specification exactly
 * REFACTORED: Single boxed container, no frozen columns by default, pagination footer inside
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Row heights for density modes
const DENSITY_CONFIG = {
  compact: { rowHeight: 36, fontSize: 12, padding: '6px 12px' },
  regular: { rowHeight: 44, fontSize: 13, padding: '10px 12px' },
  relaxed: { rowHeight: 52, fontSize: 14, padding: '14px 12px' },
};

// Process Steps - using semantic tokens for status colors
const PROCESS_STEPS = [
  { value: 'new_request', label: 'New Request', semantic: 'muted' },
  { value: 'analyse', label: 'Analyse', semantic: 'warning' },
  { value: 'in_review', label: 'In Review', semantic: 'info' },
  { value: 'approved', label: 'Approved', semantic: 'info' },
  { value: 'implement', label: 'Implement', semantic: 'success' },
  { value: 'closed', label: 'Closed', semantic: 'success' },
  { value: 'rejected', label: 'Rejected', semantic: 'danger' },
  { value: 'on_hold', label: 'On-Hold', semantic: 'warning' },
];

// Priority Options
const PRIORITIES = [
  { value: 'critical', label: 'Critical', semantic: 'danger' },
  { value: 'high', label: 'High', semantic: 'warning' },
  { value: 'medium', label: 'Medium', semantic: 'info' },
  { value: 'low', label: 'Low', semantic: 'success' },
];

// Departments
const DEPARTMENTS = [
  { value: 'investment_ops', label: 'Investment Ops' },
  { value: 'investor_relations', label: 'Investor Relations' },
  { value: 'legal', label: 'Legal & Compliance' },
  { value: 'finance', label: 'Finance' },
  { value: 'it', label: 'IT & Systems' },
  { value: 'strategy', label: 'Strategy' },
];

// Platforms
const PLATFORMS = [
  { value: 'innovation', label: 'Innovation Platform' },
  { value: 'senaei', label: 'Senaei Platform' },
  { value: 'internal', label: 'Internal System' },
  { value: 'web', label: 'Web Portal' },
  { value: 'mobile', label: 'Mobile App' },
];

// Icons
const Icons = {
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  ChevronUp: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>,
  ChevronDown: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>,
  ChevronLeft: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>,
  ChevronRight: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>,
  Filter: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/></svg>,
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

// All columns configuration - NO frozen columns by default
const ALL_COLUMNS = [
  { id: 'id', header: 'Request ID', accessor: 'id', minWidth: 110, sortable: true },
  { id: 'summary', header: 'Summary', accessor: 'summary', minWidth: 320, sortable: true, editable: true },
  { id: 'processStep', header: 'Process Step', accessor: 'processStep', minWidth: 160, sortable: true, filterable: true, editable: true, type: 'select', options: PROCESS_STEPS },
  { id: 'priority', header: 'Priority', accessor: 'priority', minWidth: 140, sortable: true, filterable: true, editable: true, type: 'select', options: PRIORITIES },
  { id: 'score', header: 'Score', accessor: 'score', minWidth: 120, sortable: true, type: 'number', align: 'right' },
  { id: 'rank', header: 'Rank', accessor: 'rank', minWidth: 100, sortable: true, type: 'number', align: 'right' },
  { id: 'department', header: 'Department', accessor: 'department', minWidth: 180, sortable: true, filterable: true, editable: true, type: 'select', options: DEPARTMENTS },
  { id: 'platform', header: 'Delivery Platform', accessor: 'platform', minWidth: 150, sortable: true, filterable: true, editable: true, type: 'select', options: PLATFORMS },
  { id: 'dueDate', header: 'Due Date', accessor: 'dueDate', minWidth: 110, sortable: true, editable: true, type: 'date' },
  { id: 'createdAt', header: 'Created', accessor: 'createdAt', minWidth: 110, sortable: true },
];

interface BusinessRequest {
  id: string;
  summary: string;
  processStep: string;
  priority: string;
  score: number | null;
  rank: number | null;
  department: string;
  platform: string | null;
  dueDate: string | null;
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
}

// Status Badge - uses semantic CSS classes
function StatusBadge({ value, options }: { value: string; options: { value: string; label: string; semantic?: string }[] }) {
  const option = options.find(o => o.value === value);
  if (!option) return <span className="text-muted-foreground">—</span>;
  
  const semanticClasses: Record<string, string> = {
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
    info: 'bg-info/10 text-info',
    muted: 'bg-muted text-muted-foreground',
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap ${semanticClasses[option.semantic || 'muted'] || semanticClasses.muted}`}>
      {option.label}
    </span>
  );
}

// Priority Badge
function PriorityBadge({ priority }: { priority: string }) {
  const p = PRIORITIES.find(pr => pr.value === priority);
  if (!p) return <span className="text-muted-foreground">—</span>;
  
  const semanticClasses: Record<string, string> = {
    danger: 'text-destructive',
    warning: 'text-warning',
    info: 'text-info',
    success: 'text-success',
  };
  
  const icons: Record<string, string> = { critical: '🔴', high: '🟠', medium: '🔵', low: '🟢' };
  return (
    <span className="flex items-center gap-1 text-[11px]">
      <span className="text-[8px]">{icons[priority]}</span>
      <span className={`font-medium ${semanticClasses[p.semantic || 'muted']}`}>{p.label}</span>
    </span>
  );
}

// Score Progress Bar
function ScoreBar({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return <span className="text-muted-foreground text-[11px]">—</span>;
  }
  
  const getColorClass = (s: number) => {
    if (s >= 75) return 'bg-success';
    if (s >= 50) return 'bg-info';
    if (s >= 25) return 'bg-warning';
    return 'bg-destructive';
  };
  
  const getTextClass = (s: number) => {
    if (s >= 75) return 'text-success';
    if (s >= 50) return 'text-info';
    if (s >= 25) return 'text-warning';
    return 'text-destructive';
  };
  
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-300 ${getColorClass(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-semibold min-w-[24px] tabular-nums ${getTextClass(score)}`}>
        {score}
      </span>
    </div>
  );
}

// Date Display
function DateDisplay({ date }: { date: string | null }) {
  if (!date) return <span className="text-muted-foreground">—</span>;
  const d = new Date(date);
  const today = new Date();
  const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = diffDays < 0;
  const isDueSoon = diffDays >= 0 && diffDays <= 7;
  
  return (
    <span className={`text-xs ${isOverdue ? 'text-destructive font-semibold' : isDueSoon ? 'text-warning font-semibold' : 'text-muted-foreground'}`}>
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
        className={`p-0.5 border-none bg-transparent cursor-pointer flex items-center ${selected.length > 0 ? 'text-brand-gold' : 'text-muted-foreground'}`}
      >
        <Icons.Filter />
        {selected.length > 0 && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-brand-gold text-white text-[9px] font-bold flex items-center justify-center">
            {selected.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[180px] bg-background border border-border rounded-lg shadow-lg z-[200]">
          <div className="p-2 max-h-[200px] overflow-y-auto">
            {options.map(opt => (
              <label
                key={opt.value}
                className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs hover:bg-muted"
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
          <div className="p-2 border-t border-border flex gap-2">
            <button
              onClick={() => { onClear(); setIsOpen(false); }}
              className="flex-1 py-1.5 border border-border rounded bg-background text-[11px] cursor-pointer hover:bg-muted"
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
        className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-md bg-background text-muted-foreground text-xs cursor-pointer hover:bg-muted"
        title="Row Density"
      >
        <Icons.Density />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-[100] min-w-[140px]">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full flex flex-col items-start px-3 py-2.5 border-none text-left cursor-pointer hover:bg-muted ${value === opt.value ? 'bg-brand-gold/10' : 'bg-transparent'}`}
            >
              <span className={`text-xs ${value === opt.value ? 'font-semibold' : ''} text-foreground`}>
                {opt.label}
              </span>
              <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Column Manager
function ColumnManager({ columns, visibleColumns, onChange }: { 
  columns: typeof ALL_COLUMNS; 
  visibleColumns: string[]; 
  onChange: (visible: string[]) => void;
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

  const toggleColumn = (colId: string) => {
    const newVisible = visibleColumns.includes(colId)
      ? visibleColumns.filter(id => id !== colId)
      : [...visibleColumns, colId];
    onChange(newVisible);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-md bg-background text-muted-foreground text-xs cursor-pointer hover:bg-muted"
        title="Columns"
      >
        <Icons.Columns />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-[100] min-w-[200px] max-h-[300px] overflow-y-auto">
          <div className="p-2">
            <div className="text-[10px] text-muted-foreground px-2 py-1 mb-1 uppercase tracking-wider">
              Toggle Visibility
            </div>
            {columns.map(col => (
              <label
                key={col.id}
                className="flex items-center gap-2 px-2 py-2 rounded cursor-pointer text-xs hover:bg-muted"
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

// Row Actions Menu
function RowActionsMenu({ onView, onEdit, onDuplicate, onDelete }: {
  onView: () => void;
  onEdit: () => void;
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
        className="p-1 border-none bg-transparent cursor-pointer text-muted-foreground rounded hover:bg-muted"
      >
        <Icons.MoreVertical />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-[100] min-w-[140px]">
          {[
            { icon: Icons.Eye, label: 'View Details', action: onView },
            { icon: Icons.Edit, label: 'Edit', action: onEdit },
            { icon: Icons.Copy, label: 'Duplicate', action: onDuplicate },
            { icon: Icons.Trash, label: 'Delete', action: onDelete, danger: true },
          ].map((item, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); item.action?.(); setIsOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 border-none bg-transparent text-xs cursor-pointer text-left hover:bg-muted ${item.danger ? 'text-destructive' : 'text-foreground'}`}
            >
              <item.icon />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Row Detail Panel
function RowDetailPanel({ row, onClose, onOpenFullView }: { 
  row: BusinessRequest; 
  onClose: () => void;
  onOpenFullView: (id: string) => void;
}) {
  const department = DEPARTMENTS.find(d => d.value === row.department);
  const platform = PLATFORMS.find(p => p.value === row.platform);

  const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex py-3 border-b border-border">
      <span className="w-[140px] text-xs text-muted-foreground font-medium">{label}</span>
      <div className="flex-1 text-sm text-foreground">{children}</div>
    </div>
  );

  return (
    <div className="fixed top-0 right-0 bottom-0 w-[420px] bg-background shadow-2xl z-[300] flex flex-col animate-in slide-in-from-right duration-200">
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-muted-foreground font-mono">{row.id}</span>
          <StatusBadge value={row.processStep} options={PROCESS_STEPS} />
        </div>
        <button
          onClick={onClose}
          className="p-2 border-none bg-transparent cursor-pointer text-muted-foreground rounded-md hover:bg-muted"
        >
          <Icons.X />
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <h2 className="text-lg font-bold text-foreground mb-6 leading-relaxed">
          {row.summary}
        </h2>

        <div>
          <DetailRow label="Priority">
            <PriorityBadge priority={row.priority} />
          </DetailRow>
          <DetailRow label="Score">
            <ScoreBar score={row.score} />
          </DetailRow>
          <DetailRow label="Rank">
            {row.rank ? <span className="font-semibold tabular-nums">#{row.rank}</span> : '—'}
          </DetailRow>
          <DetailRow label="Department">
            {department?.label || '—'}
          </DetailRow>
          <DetailRow label="Platform">
            {platform?.label || '—'}
          </DetailRow>
          <DetailRow label="Due Date">
            <DateDisplay date={row.dueDate} />
          </DetailRow>
          <DetailRow label="Created">
            <DateDisplay date={row.createdAt} />
          </DetailRow>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-border flex gap-3">
        <button 
          onClick={() => {
            onClose();
            onOpenFullView(row.id);
          }}
          className="flex-1 py-3 border border-border rounded-lg bg-background text-foreground text-sm font-semibold cursor-pointer hover:bg-muted"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

// Pagination Footer
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
    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background">
      {/* Left: Rows per page */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-2 py-1 border border-border rounded bg-background text-xs cursor-pointer"
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
          className="p-1.5 border border-border rounded bg-background disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-muted"
        >
          <Icons.ChevronLeft />
        </button>
        <span className="text-xs text-muted-foreground px-2">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 border border-border rounded bg-background disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-muted"
        >
          <Icons.ChevronRight />
        </button>
      </div>

      {/* Right: Showing X-Y of Z */}
      <div className="text-xs text-muted-foreground">
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
  onCreateNew 
}: ExecutiveTableProps) {
  const navigate = useNavigate();
  const [density, setDensity] = useState<'compact' | 'regular' | 'relaxed'>('regular');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [sortConfig, setSortConfig] = useState<{ column: string | null; direction: 'asc' | 'desc' | null }>({ column: null, direction: null });
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedRow, setSelectedRow] = useState<BusinessRequest | null>(null);
  const [visibleColumns, setVisibleColumns] = useState(ALL_COLUMNS.map(c => c.id));
  const [columnOrder, setColumnOrder] = useState(ALL_COLUMNS.map(c => c.id));
  const [draggingColumn, setDraggingColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
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
      return <span className="font-semibold text-muted-foreground font-mono text-xs">{value}</span>;
    }
    
    if (column.id === 'summary') {
      return (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRow(row);
          }}
          className="block overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer text-foreground font-medium hover:text-brand-gold hover:underline transition-colors"
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
          options={PROCESS_STEPS}
          displayValue={<StatusBadge value={value} options={PROCESS_STEPS} />}
          onSave={handleInlineSave}
          columnId={column.id}
        />
      );
    }
    
    if (column.id === 'priority') {
      return (
        <EditableCell
          value={value}
          type="select"
          options={PRIORITIES}
          displayValue={<PriorityBadge priority={value} />}
          onSave={handleInlineSave}
          columnId={column.id}
        />
      );
    }
    
    if (column.id === 'score') {
      return <ScoreBar score={value} />;
    }
    
    if (column.id === 'rank') {
      return value ? <span className="font-semibold tabular-nums">#{value}</span> : <span className="text-muted-foreground">—</span>;
    }
    
    if (column.id === 'department') {
      const dept = DEPARTMENTS.find(d => d.value === value);
      return (
        <EditableCell
          value={value}
          type="select"
          options={DEPARTMENTS}
          displayValue={<span className="text-xs">{dept?.label || <span className="text-muted-foreground">—</span>}</span>}
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
          displayValue={<span className="text-xs">{plat?.label || <span className="text-muted-foreground">—</span>}</span>}
          onSave={handleInlineSave}
          columnId={column.id}
        />
      );
    }
    
    if (column.id === 'dueDate') {
      return (
        <EditableCell
          value={value}
          type="date"
          displayValue={<DateDisplay date={value} />}
          onSave={handleInlineSave}
          columnId={column.id}
        />
      );
    }
    
    if (column.id === 'createdAt') {
      return <DateDisplay date={value} />;
    }

    return (
      <span className="block overflow-hidden text-ellipsis whitespace-nowrap" title={value}>
        {value ?? '—'}
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
    <div className="flex flex-col h-full bg-background">
      {/* MASTER PAGE HEADER - 2-Row Pattern */}
      <div className="bg-background flex-shrink-0">
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
        <div className="h-13 flex items-center px-6 border-b border-border">
          <div className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-4">
            {/* Left Zone: View Toggles */}
            <div className="flex items-center gap-2">
              <button className="h-9 px-3 border border-brand-gold rounded-md bg-brand-gold/10 text-brand-gold text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                <Icons.Grid /> Board
              </button>
              <button
                onClick={() => navigate('/industry/kanban')}
                className="h-9 px-3 border border-border rounded-md bg-background text-muted-foreground text-sm font-medium flex items-center gap-1.5 cursor-pointer hover:bg-muted"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
                List
              </button>
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
              <ColumnManager columns={ALL_COLUMNS} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
              <button
                onClick={handleExport}
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

      {/* TABLE CONTAINER - Single boxed card with border, border-radius, horizontal scroll */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full flex flex-col border border-border rounded-xl bg-background overflow-hidden">
          {/* Scrollable Table Area */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse" style={{ minWidth: columns.reduce((acc, col) => acc + (col.minWidth || 100), 48 + 40) }}>
              <thead className="sticky top-0 z-10">
                <tr>
                  {/* Checkbox column */}
                  <th className="w-10 px-3 py-2.5 text-center font-semibold text-[11px] text-muted-foreground uppercase tracking-wider bg-muted border-b-2 border-border whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={paginatedData.length > 0 && selectedRows.length === paginatedData.length}
                      onChange={handleSelectAll}
                      className="w-3.5 h-3.5 accent-brand-gold"
                    />
                  </th>
                  {columns.map(col => (
                    <th 
                      key={col.id}
                      draggable={true}
                      onDragStart={(e) => handleColumnDragStart(e, col.id)}
                      onDragOver={(e) => handleColumnDragOver(e, col.id)}
                      onDragLeave={() => setDragOverColumn(null)}
                      onDrop={(e) => handleColumnDrop(e, col.id)}
                      onDragEnd={() => { setDraggingColumn(null); setDragOverColumn(null); }}
                      className={`px-3 py-2.5 text-left font-semibold text-[11px] text-muted-foreground uppercase tracking-wider bg-muted border-b-2 border-border whitespace-nowrap cursor-grab transition-colors ${
                        draggingColumn === col.id ? 'opacity-50' : ''
                      } ${dragOverColumn === col.id ? 'bg-brand-gold/20 border-l-2 border-l-brand-gold' : ''}`}
                      style={{ minWidth: col.minWidth }}
                    >
                      <div className="flex items-center gap-1.5">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 cursor-grab text-muted-foreground/50">
                          <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
                          <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
                        </svg>
                        <span className="select-none">{col.header}</span>
                        {col.sortable && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSort(col.id); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={`p-0.5 border-none bg-transparent cursor-pointer flex items-center ${sortConfig.column === col.id ? 'text-brand-gold' : 'text-muted-foreground/50'}`}
                          >
                            {sortConfig.column === col.id && sortConfig.direction === 'desc' 
                              ? <Icons.ChevronDown />
                              : <Icons.ChevronUp />
                            }
                          </button>
                        )}
                        {col.filterable && col.options && (
                          <div onMouseDown={(e) => e.stopPropagation()}>
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
                  ))}
                  {/* Actions column */}
                  <th className="w-12 px-3 py-2.5 bg-muted border-b-2 border-border"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, index) => (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      selectedRows.includes(row.id) 
                        ? 'bg-brand-gold/10' 
                        : index % 2 === 1 ? 'bg-muted/30' : 'bg-background'
                    } hover:bg-muted/60`}
                    style={{ height: `${rowHeight}px` }}
                  >
                    <td className="px-3 py-2 text-center border-b border-border/50">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(row.id)}
                        onChange={() => handleSelectRow(row.id)}
                        className="w-3.5 h-3.5 accent-brand-gold"
                      />
                    </td>
                    {columns.map(col => (
                      <td 
                        key={col.id} 
                        className="px-3 py-2 border-b border-border/50 text-sm text-foreground whitespace-nowrap overflow-hidden text-ellipsis"
                        style={{ 
                          minWidth: col.minWidth,
                          textAlign: (col.align || 'left') as React.CSSProperties['textAlign'] 
                        }}
                      >
                        {renderCellContent(row, col)}
                      </td>
                    ))}
                    <td className="px-3 py-2 border-b border-border/50">
                      <RowActionsMenu
                        onView={() => setSelectedRow(row)}
                        onEdit={() => onOpenFullView(row.id)}
                        onDuplicate={() => toast.success('Duplicated')}
                        onDelete={() => toast.success('Deleted')}
                      />
                    </td>
                  </tr>
                ))}
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

      {/* Row Detail Panel */}
      {selectedRow && (
        <>
          <div
            onClick={() => setSelectedRow(null)}
            className="fixed inset-0 bg-black/30 z-[250]"
          />
          <RowDetailPanel row={selectedRow} onClose={() => setSelectedRow(null)} onOpenFullView={onOpenFullView} />
        </>
      )}
    </div>
  );
}
