// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10FilterBarV3
// Purpose: Horizontal filter bar with dropdown buttons
// Matches reference screenshot: Label, Assigned To, Date Range, Status
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Tag, User, Calendar, Clock, ChevronDown } from 'lucide-react';

interface T10FilterBarV3Props {
  selectedLabels: string[];
  onLabelsChange: (labels: string[]) => void;
  selectedAssignees: string[];
  onAssigneesChange: (assignees: string[]) => void;
  selectedDateRange: string | null;
  onDateRangeChange: (range: string | null) => void;
  selectedStatus: string | null;
  onStatusChange: (status: string | null) => void;
}

interface FilterButtonProps {
  icon: React.ReactNode;
  label: string;
  hasSelection?: boolean;
  onClick?: () => void;
}

function FilterButton({ icon, label, hasSelection, onClick }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        backgroundColor: hasSelection ? 'rgba(59, 130, 246, 0.08)' : '#ffffff',
        color: hasSelection ? '#3b82f6' : '#64748b',
        fontSize: '13px',
        fontWeight: 500,
        border: `1px solid ${hasSelection ? '#3b82f6' : '#e2e8f0'}`,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!hasSelection) {
          e.currentTarget.style.backgroundColor = '#f8fafc';
          e.currentTarget.style.borderColor = '#cbd5e1';
        }
      }}
      onMouseLeave={(e) => {
        if (!hasSelection) {
          e.currentTarget.style.backgroundColor = '#ffffff';
          e.currentTarget.style.borderColor = '#e2e8f0';
        }
      }}
    >
      {icon}
      {label}
      <ChevronDown size={14} style={{ marginLeft: '2px' }} />
    </button>
  );
}

export function T10FilterBarV3({
  selectedLabels,
  onLabelsChange,
  selectedAssignees,
  onAssigneesChange,
  selectedDateRange,
  onDateRangeChange,
  selectedStatus,
  onStatusChange,
}: T10FilterBarV3Props) {
  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}
    >
      <FilterButton
        icon={<Tag size={14} />}
        label="Label"
        hasSelection={selectedLabels.length > 0}
      />
      <FilterButton
        icon={<User size={14} />}
        label="Assigned To"
        hasSelection={selectedAssignees.length > 0}
      />
      <FilterButton
        icon={<Calendar size={14} />}
        label="Date Range"
        hasSelection={!!selectedDateRange}
      />
      <FilterButton
        icon={<Clock size={14} />}
        label="Status"
        hasSelection={!!selectedStatus}
      />
    </div>
  );
}

export default T10FilterBarV3;
