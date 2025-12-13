/**
 * Executive Table - High-density, enterprise-grade data table for Business Requests
 * Implements the Catalyst Executive Table specification exactly
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// Colors from the Golden Hour Design System
const colors = {
  olive: '#5c7c5c',
  oliveLight: '#6d8d6d',
  bronze: '#8b7355',
  bronzeLight: '#a08868',
  gold: '#c69c6d',
  goldLight: '#d4ae85',
  goldDark: '#b8894f',
  champagne: '#d4b896',
  champagneLight: '#e8dcc8',
  grey: '#c8ccd0',
  greyLight: '#e5e7eb',
  greyDark: '#9ca3af',
  bgPage: '#ffffff',
  bgHeader: '#f8f9fa',
  bgRowHover: '#fafafa',
  bgRowSelected: 'rgba(198, 156, 109, 0.08)',
  bgRowEditing: 'rgba(198, 156, 109, 0.12)',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
  textMuted: '#6b7280',
  textLight: '#9ca3af',
  borderLight: '#f0f0f0',
  borderDefault: '#e5e7eb',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#dc2626',
  info: '#3b82f6',
  purple: '#8b5cf6',
};

// Row heights for density modes
const DENSITY_CONFIG = {
  compact: { rowHeight: 36, fontSize: 12, padding: '6px 12px' },
  regular: { rowHeight: 44, fontSize: 13, padding: '10px 12px' },
  relaxed: { rowHeight: 52, fontSize: 14, padding: '14px 12px' },
};

// Process Steps
const PROCESS_STEPS = [
  { value: 'new_request', label: 'New Request', color: colors.greyDark },
  { value: 'analyse', label: 'Analyse', color: colors.bronze },
  { value: 'in_review', label: 'In Review', color: colors.info },
  { value: 'approved', label: 'Approved', color: colors.purple },
  { value: 'implement', label: 'Implement', color: colors.success },
  { value: 'closed', label: 'Closed', color: colors.olive },
  { value: 'rejected', label: 'Rejected', color: colors.danger },
  { value: 'on_hold', label: 'On-Hold', color: colors.warning },
];

// Priority Options
const PRIORITIES = [
  { value: 'critical', label: 'Critical', color: colors.danger },
  { value: 'high', label: 'High', color: colors.warning },
  { value: 'medium', label: 'Medium', color: colors.info },
  { value: 'low', label: 'Low', color: colors.success },
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
  Undo: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>,
  Grid: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
};

// All columns configuration
const ALL_COLUMNS = [
  { id: 'id', header: 'Request ID', accessor: 'id', width: '100px', frozen: true, sortable: true },
  { id: 'summary', header: 'Summary', accessor: 'summary', width: '280px', frozen: true, sortable: true, editable: true },
  { id: 'processStep', header: 'Process Step', accessor: 'processStep', width: '120px', sortable: true, filterable: true, editable: true, type: 'select', options: PROCESS_STEPS },
  { id: 'priority', header: 'Priority', accessor: 'priority', width: '100px', sortable: true, filterable: true, editable: true, type: 'select', options: PRIORITIES },
  { id: 'score', header: 'Score', accessor: 'score', width: '120px', sortable: true, type: 'number', align: 'right' },
  { id: 'rank', header: 'Rank', accessor: 'rank', width: '70px', sortable: true, type: 'number', align: 'right' },
  { id: 'department', header: 'Department', accessor: 'department', width: '140px', sortable: true, filterable: true, editable: true, type: 'select', options: DEPARTMENTS },
  { id: 'platform', header: 'Delivery Platform', accessor: 'platform', width: '150px', sortable: true, filterable: true, editable: true, type: 'select', options: PLATFORMS },
  { id: 'dueDate', header: 'Due Date', accessor: 'dueDate', width: '100px', sortable: true, editable: true, type: 'date' },
  { id: 'createdAt', header: 'Created', accessor: 'createdAt', width: '100px', sortable: true },
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

// Avatar Component
function Avatar({ member, size = 24 }: { member: { initials: string; color?: string; name?: string } | null; size?: number }) {
  if (!member) return <span style={{ color: colors.textLight }}>—</span>;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: member.color || colors.greyDark,
        color: 'white',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 600,
        flexShrink: 0,
      }}
      title={member.name}
    >
      {member.initials}
    </div>
  );
}

// Status Badge
function StatusBadge({ value, options }: { value: string; options: { value: string; label: string; color: string }[] }) {
  const option = options.find(o => o.value === value);
  if (!option) return <span style={{ color: colors.textLight }}>—</span>;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 600,
      backgroundColor: `${option.color}12`,
      color: option.color,
      whiteSpace: 'nowrap',
    }}>
      {option.label}
    </span>
  );
}

// Priority Badge
function PriorityBadge({ priority }: { priority: string }) {
  const p = PRIORITIES.find(pr => pr.value === priority);
  if (!p) return <span style={{ color: colors.textLight }}>—</span>;
  const icons: Record<string, string> = { critical: '🔴', high: '🟠', medium: '🔵', low: '🟢' };
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
      <span style={{ fontSize: '8px' }}>{icons[priority]}</span>
      <span style={{ color: p.color, fontWeight: 500 }}>{p.label}</span>
    </span>
  );
}

// Score Progress Bar
function ScoreBar({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return <span style={{ color: colors.textLight, fontSize: '11px' }}>—</span>;
  }
  const getColor = (s: number) => {
    if (s >= 75) return colors.success;
    if (s >= 50) return colors.info;
    if (s >= 25) return colors.warning;
    return colors.danger;
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '80px' }}>
      <div style={{
        flex: 1,
        height: '6px',
        backgroundColor: colors.greyLight,
        borderRadius: '3px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${score}%`,
          height: '100%',
          backgroundColor: getColor(score),
          borderRadius: '3px',
          transition: 'width 0.3s ease',
        }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 600, color: getColor(score), minWidth: '24px', fontVariantNumeric: 'tabular-nums' }}>
        {score}
      </span>
    </div>
  );
}

// Date Display
function DateDisplay({ date }: { date: string | null }) {
  if (!date) return <span style={{ color: colors.textLight }}>—</span>;
  const d = new Date(date);
  const today = new Date();
  const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = diffDays < 0;
  const isDueSoon = diffDays >= 0 && diffDays <= 7;
  
  return (
    <span style={{
      fontSize: '12px',
      color: isOverdue ? colors.danger : isDueSoon ? colors.warning : colors.textSecondary,
      fontWeight: isOverdue || isDueSoon ? 600 : 400,
    }}>
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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '4px 8px',
    border: `2px solid ${colors.gold}`,
    borderRadius: '4px',
    fontSize: '12px',
    outline: 'none',
    backgroundColor: 'white',
    boxShadow: '0 2px 8px rgba(198,156,109,0.25)',
  };

  if (type === 'select' && options) {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={localValue}
        onChange={(e) => { setLocalValue(e.target.value); onSave(e.target.value); }}
        onBlur={onCancel}
        onKeyDown={handleKeyDown}
        style={{ ...inputStyle, cursor: 'pointer', minWidth: '120px' }}
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
        style={{ ...inputStyle, cursor: 'pointer', minWidth: '130px' }}
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
      style={inputStyle}
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
      <div style={{ margin: '-4px -8px' }}>
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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 4px',
        margin: '-2px -4px',
        borderRadius: '4px',
        cursor: isQuickEdit ? 'pointer' : 'default',
        transition: 'all 0.15s',
        backgroundColor: isSaving ? `${colors.success}15` : 'transparent',
        border: `1px solid transparent`,
      }}
      onMouseEnter={(e) => {
        if (isQuickEdit) {
          e.currentTarget.style.backgroundColor = `${colors.gold}10`;
          e.currentTarget.style.borderColor = `${colors.gold}40`;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSaving) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.borderColor = 'transparent';
        }
      }}
    >
      {displayValue}
      {isQuickEdit && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" style={{ flexShrink: 0, opacity: 0.5 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      )}
      {isSaving && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="3" style={{ flexShrink: 0 }}>
          <polyline points="20,6 9,17 4,12"/>
        </svg>
      )}
    </div>
  );
}

// Column Filter Dropdown
function ColumnFilterDropdown({ column, options, selected, onApply, onClear }: {
  column: string;
  options: { value: string; label: string; color?: string }[];
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
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '2px',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: selected.length > 0 ? colors.gold : colors.textLight,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Icons.Filter />
        {selected.length > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: colors.gold,
            color: 'white',
            fontSize: '9px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {selected.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '4px',
          minWidth: '180px',
          backgroundColor: 'white',
          border: `1px solid ${colors.borderDefault}`,
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 200,
        }}>
          <div style={{ padding: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {options.map(opt => (
              <label
                key={opt.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.bgRowHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <input
                  type="checkbox"
                  checked={localSelected.includes(opt.value)}
                  onChange={() => handleToggle(opt.value)}
                  style={{ accentColor: colors.gold }}
                />
                {opt.color && (
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: opt.color,
                  }} />
                )}
                {opt.label}
              </label>
            ))}
          </div>
          <div style={{
            padding: '8px',
            borderTop: `1px solid ${colors.borderLight}`,
            display: 'flex',
            gap: '8px',
          }}>
            <button
              onClick={() => { onClear(); setIsOpen(false); }}
              style={{
                flex: 1,
                padding: '6px',
                border: `1px solid ${colors.borderDefault}`,
                borderRadius: '4px',
                backgroundColor: 'white',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
            <button
              onClick={() => { onApply(localSelected); setIsOpen(false); }}
              style={{
                flex: 1,
                padding: '6px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: colors.gold,
                color: 'white',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
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
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          border: `1px solid ${colors.borderDefault}`,
          borderRadius: '6px',
          backgroundColor: 'white',
          color: colors.textSecondary,
          fontSize: '12px',
          cursor: 'pointer',
        }}
        title="Row Density"
      >
        <Icons.Density />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '4px',
          backgroundColor: 'white',
          border: `1px solid ${colors.borderDefault}`,
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 100,
          minWidth: '140px',
        }}>
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '10px 12px',
                border: 'none',
                backgroundColor: value === opt.value ? colors.bgRowSelected : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: value === opt.value ? 600 : 400, color: colors.textPrimary }}>
                {opt.label}
              </span>
              <span style={{ fontSize: '10px', color: colors.textLight }}>{opt.desc}</span>
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
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          border: `1px solid ${colors.borderDefault}`,
          borderRadius: '6px',
          backgroundColor: 'white',
          color: colors.textSecondary,
          fontSize: '12px',
          cursor: 'pointer',
        }}
        title="Columns"
      >
        <Icons.Columns />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '4px',
          backgroundColor: 'white',
          border: `1px solid ${colors.borderDefault}`,
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 100,
          minWidth: '200px',
          maxHeight: '300px',
          overflowY: 'auto',
        }}>
          <div style={{ padding: '8px' }}>
            <div style={{ fontSize: '10px', color: colors.textLight, padding: '4px 8px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Toggle Visibility
            </div>
            {columns.filter(c => !c.frozen).map(col => (
              <label
                key={col.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.bgRowHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <input
                  type="checkbox"
                  checked={visibleColumns.includes(col.id)}
                  onChange={() => toggleColumn(col.id)}
                  style={{ accentColor: colors.gold }}
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
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        style={{
          padding: '4px',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: colors.textMuted,
          borderRadius: '4px',
        }}
      >
        <Icons.MoreVertical />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '4px',
          backgroundColor: 'white',
          border: `1px solid ${colors.borderDefault}`,
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 100,
          minWidth: '140px',
        }}>
          {[
            { icon: Icons.Eye, label: 'View Details', action: onView },
            { icon: Icons.Edit, label: 'Edit', action: onEdit },
            { icon: Icons.Copy, label: 'Duplicate', action: onDuplicate },
            { icon: Icons.Trash, label: 'Delete', action: onDelete, danger: true },
          ].map((item, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); item.action?.(); setIsOpen(false); }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                border: 'none',
                backgroundColor: 'transparent',
                color: item.danger ? colors.danger : colors.textPrimary,
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.bgRowHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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
  const processStep = PROCESS_STEPS.find(p => p.value === row.processStep);
  const department = DEPARTMENTS.find(d => d.value === row.department);
  const platform = PLATFORMS.find(p => p.value === row.platform);

  const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', padding: '12px 0', borderBottom: `1px solid ${colors.borderLight}` }}>
      <span style={{ width: '140px', fontSize: '12px', color: colors.textMuted, fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, fontSize: '13px', color: colors.textPrimary }}>{children}</div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '420px',
      backgroundColor: 'white',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
      zIndex: 300,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideRight 0.2s ease',
    }}>
      <style>{`
        @keyframes slideRight { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
      <div style={{
        padding: '20px 24px',
        borderBottom: `1px solid ${colors.borderLight}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: colors.textMuted, fontFamily: "'SF Mono', monospace" }}>{row.id}</span>
          <StatusBadge value={row.processStep} options={PROCESS_STEPS} />
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '8px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: colors.textMuted,
            borderRadius: '6px',
          }}
        >
          <Icons.X />
        </button>
      </div>

      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: colors.textPrimary, marginBottom: '24px', lineHeight: 1.4 }}>
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
            {row.rank ? <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>#{row.rank}</span> : '—'}
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

      <div style={{
        padding: '16px 24px',
        borderTop: `1px solid ${colors.borderLight}`,
        display: 'flex',
        gap: '12px',
      }}>
        <button 
          onClick={() => {
            onClose();
            onOpenFullView(row.id);
          }}
          style={{
            flex: 1,
            padding: '12px',
            border: `1px solid ${colors.borderDefault}`,
            borderRadius: '8px',
            backgroundColor: 'white',
            color: colors.textPrimary,
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Edit
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

  // Columns
  const columns = useMemo(() => {
    const orderedColumns = columnOrder
      .map(id => ALL_COLUMNS.find(c => c.id === id))
      .filter(c => c && (c.frozen || visibleColumns.includes(c.id)));
    return orderedColumns as typeof ALL_COLUMNS;
  }, [visibleColumns, columnOrder]);

  const frozenColumns = columns.filter(c => c.frozen);
  const scrollableColumns = columns.filter(c => !c.frozen);

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
    if (selectedRows.length === processedData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(processedData.map(r => r.id));
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

  // Cell styles
  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: '11px',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    backgroundColor: colors.bgHeader,
    borderBottom: `2px solid ${colors.borderDefault}`,
    position: 'sticky',
    top: 0,
    zIndex: 10,
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: `1px solid ${colors.borderLight}`,
    fontSize: '13px',
    color: colors.textPrimary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  // Render cell content
  const renderCellContent = (row: BusinessRequest, column: typeof ALL_COLUMNS[0]) => {
    const value = (row as any)[column.accessor];
    
    const handleInlineSave = async (newValue: any) => {
      await handleCellSave(row.id, column.id, newValue);
    };

    if (column.id === 'id') {
      return <span style={{ fontWeight: 600, color: colors.textMuted, fontFamily: "'SF Mono', monospace", fontSize: '12px' }}>{value}</span>;
    }
    
    if (column.id === 'summary') {
      return (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRow(row);
          }}
          style={{
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            color: colors.textPrimary,
            fontWeight: 500,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = colors.gold;
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = colors.textPrimary;
            e.currentTarget.style.textDecoration = 'none';
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
      return value ? <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>#{value}</span> : <span style={{ color: colors.textLight }}>—</span>;
    }
    
    if (column.id === 'department') {
      const dept = DEPARTMENTS.find(d => d.value === value);
      return (
        <EditableCell
          value={value}
          type="select"
          options={DEPARTMENTS}
          displayValue={<span style={{ fontSize: '12px' }}>{dept?.label || <span style={{ color: colors.textLight }}>—</span>}</span>}
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
          displayValue={<span style={{ fontSize: '12px' }}>{plat?.label || <span style={{ color: colors.textLight }}>—</span>}</span>}
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
      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={value}>
        {value ?? '—'}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: colors.textMuted }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: colors.bgPage }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${colors.borderLight}`, backgroundColor: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: colors.olive, margin: 0 }}>Business Requests</h1>
            <p style={{ fontSize: '12px', color: colors.textMuted, marginTop: '4px' }}>
              {processedData.length} of {data.length} requests
              {selectedRows.length > 0 && <span style={{ marginLeft: '12px', color: colors.gold, fontWeight: 600 }}>• {selectedRows.length} selected</span>}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => navigate('/industry/kanban')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                border: `1px solid ${colors.borderDefault}`,
                borderRadius: '6px',
                backgroundColor: 'white',
                color: colors.textSecondary,
                fontSize: '12px',
                cursor: 'pointer',
              }}
              title="Kanban View"
            >
              <Icons.Grid /> Kanban
            </button>
            <DensitySelector value={density} onChange={(v) => setDensity(v as any)} />
            <ColumnManager columns={ALL_COLUMNS} visibleColumns={visibleColumns} onChange={setVisibleColumns} />
            <button
              onClick={handleExport}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                border: `1px solid ${colors.borderDefault}`,
                borderRadius: '6px',
                backgroundColor: 'white',
                color: colors.textSecondary,
                fontSize: '12px',
                cursor: 'pointer',
              }}
              title="Export CSV"
            >
              <Icons.Download />
            </button>
            <button
              onClick={onCreateNew}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: colors.gold,
                color: 'white',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Icons.Plus /> New Request
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          border: `1px solid ${colors.borderDefault}`,
          borderRadius: '6px',
          backgroundColor: 'white',
          maxWidth: '400px',
        }}>
          <Icons.Search />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, summary, or assignee..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '13px',
              backgroundColor: 'transparent',
              color: colors.textPrimary,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: colors.textMuted, padding: '2px' }}
            >
              <Icons.X />
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Frozen Columns */}
        <div style={{
          flexShrink: 0,
          backgroundColor: 'white',
          borderRight: `2px solid ${colors.borderDefault}`,
          zIndex: 20,
          boxShadow: '4px 0 8px rgba(0,0,0,0.04)',
          overflowY: 'auto',
        }}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={processedData.length > 0 && selectedRows.length === processedData.length}
                    onChange={handleSelectAll}
                    style={{ width: '14px', height: '14px', accentColor: colors.gold }}
                  />
                </th>
                {frozenColumns.map(col => (
                  <th key={col.id} style={{ ...thStyle, width: col.width }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{col.header}</span>
                      {col.sortable && (
                        <button
                          onClick={() => handleSort(col.id)}
                          style={{
                            padding: '2px',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            color: sortConfig.column === col.id ? colors.gold : colors.textLight,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {sortConfig.column === col.id && sortConfig.direction === 'desc' 
                            ? <Icons.ChevronDown />
                            : <Icons.ChevronUp />
                          }
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processedData.map((row, index) => (
                <tr
                  key={row.id}
                  style={{
                    height: `${rowHeight}px`,
                    backgroundColor: selectedRows.includes(row.id) 
                      ? colors.bgRowSelected 
                      : index % 2 === 1 ? '#fafafa' : 'white',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (!selectedRows.includes(row.id)) {
                      e.currentTarget.style.backgroundColor = colors.bgRowHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selectedRows.includes(row.id)) {
                      e.currentTarget.style.backgroundColor = index % 2 === 1 ? '#fafafa' : 'white';
                    }
                  }}
                  onClick={() => setSelectedRow(row)}
                >
                  <td style={{ ...tdStyle, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(row.id)}
                      onChange={() => handleSelectRow(row.id)}
                      style={{ width: '14px', height: '14px', accentColor: colors.gold }}
                    />
                  </td>
                  {frozenColumns.map(col => (
                    <td key={col.id} style={{ ...tdStyle, width: col.width }}>
                      {renderCellContent(row, col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Scrollable Columns */}
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: '100%' }}>
            <thead>
              <tr>
                {scrollableColumns.map(col => (
                  <th 
                    key={col.id} 
                    draggable={true}
                    onDragStart={(e) => handleColumnDragStart(e, col.id)}
                    onDragOver={(e) => handleColumnDragOver(e, col.id)}
                    onDragLeave={() => setDragOverColumn(null)}
                    onDrop={(e) => handleColumnDrop(e, col.id)}
                    onDragEnd={() => { setDraggingColumn(null); setDragOverColumn(null); }}
                    style={{ 
                      ...thStyle, 
                      width: col.width,
                      cursor: 'grab',
                      opacity: draggingColumn === col.id ? 0.5 : 1,
                      backgroundColor: dragOverColumn === col.id ? colors.champagneLight : colors.bgHeader,
                      borderLeft: dragOverColumn === col.id ? `3px solid ${colors.gold}` : 'none',
                      transition: 'background-color 0.15s, border-left 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={colors.textLight} strokeWidth="2" style={{ flexShrink: 0, cursor: 'grab' }}>
                        <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
                        <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
                      </svg>
                      <span style={{ userSelect: 'none' }}>{col.header}</span>
                      {col.sortable && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSort(col.id); }}
                          onMouseDown={(e) => e.stopPropagation()}
                          style={{
                            padding: '2px',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            color: sortConfig.column === col.id ? colors.gold : colors.textLight,
                            display: 'flex',
                            alignItems: 'center',
                          }}
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
                <th style={{ ...thStyle, width: '48px' }}></th>
              </tr>
            </thead>
            <tbody>
              {processedData.map((row, index) => (
                <tr
                  key={row.id}
                  style={{
                    height: `${rowHeight}px`,
                    backgroundColor: selectedRows.includes(row.id) 
                      ? colors.bgRowSelected 
                      : index % 2 === 1 ? '#fafafa' : 'white',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (!selectedRows.includes(row.id)) {
                      e.currentTarget.style.backgroundColor = colors.bgRowHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selectedRows.includes(row.id)) {
                      e.currentTarget.style.backgroundColor = index % 2 === 1 ? '#fafafa' : 'white';
                    }
                  }}
                  onClick={() => setSelectedRow(row)}
                >
                  {scrollableColumns.map(col => (
                    <td key={col.id} style={{ ...tdStyle, width: col.width, textAlign: (col.align || 'left') as React.CSSProperties['textAlign'] }}>
                      {renderCellContent(row, col)}
                    </td>
                  ))}
                  <td style={{ ...tdStyle, width: '48px' }} onClick={(e) => e.stopPropagation()}>
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
      </div>

      {/* Row Detail Panel */}
      {selectedRow && (
        <>
          <div
            onClick={() => setSelectedRow(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              zIndex: 250,
            }}
          />
          <RowDetailPanel row={selectedRow} onClose={() => setSelectedRow(null)} onOpenFullView={onOpenFullView} />
        </>
      )}
    </div>
  );
}
