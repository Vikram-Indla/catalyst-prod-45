import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button';
import { X, User, Calendar, Activity } from 'lucide-react';
import { WorkHubFilters, QuickFilter } from '../types';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: WorkHubFilters;
  onApply: (filters: WorkHubFilters) => void;
}

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: 'MY_OPEN_ITEMS', label: 'My Open Requests' },
  { id: 'HIGH_PRIORITY', label: 'High Priority' },
  { id: 'NEW_THIS_WEEK', label: 'New This Week' },
  { id: 'OVERDUE', label: 'Overdue Items' },
  { id: 'CURRENT_QUARTER', label: 'Current Quarter' },
  { id: 'UNASSIGNED', label: 'Unassigned' },
];

export const FilterDrawer: React.FC<FilterDrawerProps> = ({ isOpen, onClose, filters, onApply }) => {
  const [localFilters, setLocalFilters] = useState<WorkHubFilters>(filters);
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilter | null>(null);
  const [appliedCount, setAppliedCount] = useState(0);

  if (!isOpen) return null;

  const handleQuickFilterClick = (qf: QuickFilter) => {
    if (activeQuickFilter === qf) {
      setActiveQuickFilter(null);
    } else {
      setActiveQuickFilter(qf);
      // Quick filters clear advanced filters
      setLocalFilters({
        search: '',
        types: [],
        statuses: [],
        priorities: [],
        assignees: [],
        reporters: [],
        quarters: [],
        releaseVersions: [],
      });
    }
  };

  const handleClearAll = () => {
    setActiveQuickFilter(null);
    setLocalFilters({
      search: '',
      types: [],
      statuses: [],
      priorities: [],
      assignees: [],
      reporters: [],
      quarters: [],
      releaseVersions: [],
    });
    setAppliedCount(0);
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 400,
          backgroundColor: token('elevation.surface', '#FFFFFF'),
          boxShadow: token('elevation.shadow.overlay', '0 4px 8px rgba(0,0,0,0.2)'),
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: token('space.200', '16px'),
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: 500, 
            color: token('color.text', '#172B4D'),
            margin: 0,
          }}>
            Filters
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: token('space.050', '4px'),
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: token('color.icon', '#5E6C84'),
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: token('space.200', '16px') }}>
          {/* Quick Filters */}
          <div style={{ marginBottom: token('space.300', '24px') }}>
            <h3 style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: token('color.text.subtlest', '#5E6C84'),
              marginBottom: token('space.150', '12px'),
            }}>
              Quick Filter
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: token('space.100', '8px') }}>
              {QUICK_FILTERS.map((qf) => (
                <button
                  key={qf.id}
                  onClick={() => handleQuickFilterClick(qf.id)}
                  style={{
                    padding: `${token('space.050', '4px')} ${token('space.150', '12px')}`,
                    backgroundColor: activeQuickFilter === qf.id 
                      ? token('color.background.brand.bold', '#0052CC')
                      : token('color.background.neutral', '#F4F5F7'),
                    color: activeQuickFilter === qf.id 
                      ? token('color.text.inverse', '#FFFFFF')
                      : token('color.text', '#172B4D'),
                    border: 'none',
                    borderRadius: '16px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {qf.label}
                </button>
              ))}
            </div>
          </div>

          {/* People Section */}
          <FilterSection
            title="People"
            icon={<User size={16} />}
          >
            <FilterField label="Reporter" />
            <FilterField label="Assignee" />
            <FilterField label="Department" />
          </FilterSection>

          {/* Status & Workflow Section */}
          <FilterSection
            title="Status & Workflow"
            icon={<Activity size={16} />}
          >
            <FilterField label="Process Step" />
            <FilterField label="Ageing" />
          </FilterSection>

          {/* Dates Section */}
          <FilterSection
            title="Dates"
            icon={<Calendar size={16} />}
          >
            <FilterField label="Created" />
            <FilterField label="Updated" />
            <FilterField label="Due date" />
          </FilterSection>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: token('space.200', '16px'),
          borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
        }}>
          <span style={{ 
            fontSize: '14px', 
            color: token('color.text.subtlest', '#5E6C84'),
          }}>
            {appliedCount} filters applied
          </span>
          <div style={{ display: 'flex', gap: token('space.100', '8px') }}>
            <Button appearance="subtle" onClick={handleClearAll}>
              Clear All
            </Button>
            <Button appearance="primary" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

// Filter Section Component
const FilterSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{ marginBottom: token('space.200', '16px') }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: token('space.100', '8px'),
          width: '100%',
          padding: `${token('space.100', '8px')} 0`,
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ color: token('color.icon', '#5E6C84') }}>{icon}</span>
        <span style={{ 
          fontSize: '14px', 
          fontWeight: 600, 
          color: token('color.text', '#172B4D'),
        }}>
          {title}
        </span>
      </button>
      {expanded && (
        <div style={{ paddingLeft: token('space.300', '24px') }}>
          {children}
        </div>
      )}
    </div>
  );
};

// Filter Field Component
const FilterField: React.FC<{ label: string }> = ({ label }) => {
  return (
    <div style={{ marginBottom: token('space.150', '12px') }}>
      <label style={{ 
        display: 'block',
        fontSize: '12px', 
        fontWeight: 500, 
        color: token('color.text.subtlest', '#5E6C84'),
        marginBottom: token('space.050', '4px'),
      }}>
        {label}
      </label>
      <select
        style={{
          width: '100%',
          padding: `${token('space.075', '6px')} ${token('space.100', '8px')}`,
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderRadius: '3px',
          fontSize: '14px',
          backgroundColor: token('elevation.surface', '#FFFFFF'),
        }}
      >
        <option value="">Any</option>
      </select>
    </div>
  );
};
