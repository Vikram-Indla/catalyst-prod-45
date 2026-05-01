// ============================================================
// MY TASKS HEADER - Enterprise Linear-Aligned V2
// Ring-fenced CSS: mytasks-header, mytasks-summary-card, etc.
// With KPI pulse animation on completion
// Dropdown styling matches TaskDetailDrawer/StatusDropdown
// ============================================================

import { useRef, useEffect, useState } from 'react';
import { Plus, Search, X, ChevronDown, Layers, Check } from 'lucide-react';
import { useMyTasksSummary, useMyWorkstreams } from '../../hooks/useMyTasks';
import { COLORS } from '@/components/planner/task-modal/colors';
import type { FilterConfig } from '../../types/my-tasks';

interface MyTasksHeaderProps {
  filters: FilterConfig;
  onFilterChange: (filters: Partial<FilterConfig>) => void;
  onOpenCreateModal: () => void;
  completedTodayCount?: number;
}

const STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94a3b8))' },
  { value: 'planned', label: 'Planned', color: 'var(--ds-text-brand, var(--ds-text-brand, #3b82f6))' },
  { value: 'progress', label: 'In Progress', color: 'var(--ds-text-warning, var(--ds-text-warning, #f59e0b))' },
  { value: 'review', label: 'Review', color: '#8b5cf6' },
  { value: 'done', label: 'Done', color: 'var(--ds-text-success, var(--ds-text-success, #16a34a))' },
];

export function MyTasksHeader({
  filters,
  onFilterChange,
  onOpenCreateModal,
  completedTodayCount = 0,
}: MyTasksHeaderProps) {
  const { data: summary, isLoading } = useMyTasksSummary();
  const { data: workstreams = [] } = useMyWorkstreams();
  
  // Ref for pulse animation
  const doneCountRef = useRef<HTMLDivElement>(null);
  const prevCompletedRef = useRef(completedTodayCount);

  // Pulse animation when completed count increases
  useEffect(() => {
    if (completedTodayCount > prevCompletedRef.current) {
      doneCountRef.current?.classList.add('mytasks-kpi-pulse');
      setTimeout(() => {
        doneCountRef.current?.classList.remove('mytasks-kpi-pulse');
      }, 300);
    }
    prevCompletedRef.current = completedTodayCount;
  }, [completedTodayCount]);

  // Active filter count
  const activeFilterCount = [
    filters.workstreams?.length,
    filters.statuses?.length,
    filters.searchQuery,
  ].filter(Boolean).length;

  // Dynamic subtitle
  const totalTasks = summary?.total_tasks || 0;
  const overdueCount = summary?.overdue_count || 0;
  const subtitleText = isLoading 
    ? 'Loading...' 
    : `${totalTasks} task${totalTasks !== 1 ? 's' : ''} · ${overdueCount > 0 ? `${overdueCount} overdue` : 'All on track'}`;

  return (
    <div className="flex-shrink-0">
      {/* Header - Dashboard style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 gap-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            My Tasks
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {subtitleText}
          </p>
        </div>

        {/* Summary Cards - Inline with header */}
        <div className="flex items-center gap-3">
          <div className="mytasks-summary-card mytasks-summary-card--overdue">
            <div className="mytasks-summary-card__value">
              {isLoading ? '—' : summary?.overdue_count || 0}
            </div>
            <div className="mytasks-summary-card__label">Overdue</div>
          </div>
          <div className="mytasks-summary-card mytasks-summary-card--today">
            <div className="mytasks-summary-card__value">
              {isLoading ? '—' : summary?.today_count || 0}
            </div>
            <div className="mytasks-summary-card__label">Today</div>
          </div>
          <div 
            ref={doneCountRef}
            className="mytasks-summary-card mytasks-summary-card--done"
          >
            <div className="mytasks-summary-card__value">
              {isLoading ? '—' : completedTodayCount}
            </div>
            <div className="mytasks-summary-card__label">Done</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mytasks-toolbar">
        <div className="mytasks-toolbar__left">
          {/* Search */}
          <div className="mytasks-search">
            <Search className="mytasks-search__icon" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={filters.searchQuery || ''}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value || undefined })}
              className="mytasks-search__input"
            />
            <span className="mytasks-search__shortcut">⌘K</span>
          </div>

          {/* Workstream Filter - Enterprise Dropdown Style */}
          <WorkstreamDropdown
            workstreams={workstreams}
            selectedId={filters.workstreams?.[0]}
            onSelect={(id) => onFilterChange({ workstreams: id ? [id] : undefined })}
          />

          {/* Status Filter - Enterprise Dropdown Style */}
          <StatusDropdown
            selectedStatus={filters.statuses?.[0]}
            onSelect={(status) => onFilterChange({ statuses: status ? [status] : undefined })}
          />

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button 
              onClick={() => onFilterChange({ 
                statuses: undefined, 
                workstreams: undefined,
                searchQuery: undefined,
              })} 
              className="mytasks-filter-btn"
            >
              <X className="w-4 h-4" />
              Clear ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Add Task Button */}
        <button 
          className="mytasks-add-btn"
          onClick={onOpenCreateModal}
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>
    </div>
  );
}

// ============================================================
// WORKSTREAM DROPDOWN - Enterprise Clean (matches StatusDropdown)
// ============================================================
function WorkstreamDropdown({ 
  workstreams, 
  selectedId, 
  onSelect 
}: { 
  workstreams: { id: string; name: string; color?: string }[];
  selectedId?: string;
  onSelect: (id: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedWorkstream = workstreams.find(w => w.id === selectedId);
  const displayName = selectedWorkstream?.name || 'Workstream';
  const displayColor = selectedWorkstream?.color || 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))';

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: COLORS.surfaceCard,
          border: `1px solid ${isOpen ? COLORS.borderFocus : (isHovered ? COLORS.borderDefault : COLORS.borderLight)}`,
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
          minWidth: '140px',
        }}
      >
        <Layers size={14} style={{ color: selectedId ? displayColor : 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))' }} />
        <span style={{ 
          flex: 1, 
          fontSize: '13px', 
          fontWeight: 500, 
          color: selectedId ? COLORS.textPrimary : 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))',
        }}>
          {displayName}
        </span>
        <ChevronDown 
          size={14} 
          style={{ 
            color: COLORS.textLight, 
            transition: 'transform 0.2s ease', 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' 
          }} 
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: COLORS.surfaceCard,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            zIndex: 100001,
            padding: '6px',
            minWidth: '180px',
          }}
        >
          {/* All Workstreams option */}
          <DropdownItem
            value="All Workstreams"
            color="var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))"
            isSelected={!selectedId}
            onClick={() => { onSelect(null); setIsOpen(false); }}
          />
          
          {workstreams.map((ws) => (
            <DropdownItem
              key={ws.id}
              value={ws.name}
              color={ws.color || 'var(--ds-text-brand, var(--ds-text-brand, #3b82f6))'}
              isSelected={ws.id === selectedId}
              onClick={() => { onSelect(ws.id); setIsOpen(false); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// STATUS DROPDOWN - Enterprise Clean (matches TaskDetailDrawer)
// ============================================================
function StatusDropdown({ 
  selectedStatus, 
  onSelect 
}: { 
  selectedStatus?: string;
  onSelect: (status: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = STATUS_OPTIONS.find(s => s.value === selectedStatus);
  const displayName = selected?.label || 'Status';
  const displayColor = selected?.color || 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))';

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: COLORS.surfaceCard,
          border: `1px solid ${isOpen ? COLORS.borderFocus : (isHovered ? COLORS.borderDefault : COLORS.borderLight)}`,
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
          minWidth: '120px',
        }}
      >
        {selectedStatus && (
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: displayColor,
              flexShrink: 0,
            }}
          />
        )}
        <span style={{ 
          flex: 1, 
          fontSize: '13px', 
          fontWeight: 500, 
          color: selectedStatus ? COLORS.textPrimary : 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))',
        }}>
          {displayName}
        </span>
        <ChevronDown 
          size={14} 
          style={{ 
            color: COLORS.textLight, 
            transition: 'transform 0.2s ease', 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' 
          }} 
        />
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: COLORS.surfaceCard,
            border: `1px solid ${COLORS.borderDefault}`,
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            zIndex: 100001,
            padding: '6px',
            minWidth: '160px',
          }}
        >
          {/* All Statuses option */}
          <DropdownItem
            value="All Statuses"
            color="var(--ds-text-subtlest, var(--ds-text-subtlest, #64748b))"
            isSelected={!selectedStatus}
            onClick={() => { onSelect(null); setIsOpen(false); }}
          />
          
          {STATUS_OPTIONS.map((status) => (
            <DropdownItem
              key={status.value}
              value={status.label}
              color={status.color}
              isSelected={status.value === selectedStatus}
              onClick={() => { onSelect(status.value); setIsOpen(false); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SHARED DROPDOWN ITEM - Enterprise Clean styling
// ============================================================
function DropdownItem({ 
  value, 
  color, 
  isSelected, 
  onClick 
}: { 
  value: string; 
  color: string; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        backgroundColor: isSelected ? COLORS.accentLight : (isHovered ? COLORS.surfaceHover : 'transparent'),
        transition: 'background-color 0.1s ease'
      }}
    >
      <span
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: '14px', color: COLORS.textPrimary }}>{value}</span>
      {isSelected && <Check size={16} style={{ color: COLORS.accent, marginLeft: 'auto' }} />}
    </div>
  );
}
