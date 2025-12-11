import React, { useState } from 'react';
import { X, User, Calendar, Activity } from 'lucide-react';
import { WorkHubFilters, QuickFilter } from '../types';
import { Button } from '@/components/ui/button';

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
        className="fixed inset-0 bg-black/50 z-[999]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-[400px] bg-card shadow-xl z-[1000] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-medium text-foreground m-0">
            Filters
          </h2>
          <button
            onClick={onClose}
            className="p-1 bg-transparent border-none cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Quick Filters */}
          <div className="mb-6">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Quick Filter
            </h3>
            <div className="flex flex-wrap gap-2">
              {QUICK_FILTERS.map((qf) => (
                <button
                  key={qf.id}
                  onClick={() => handleQuickFilterClick(qf.id)}
                  className={`px-3 py-1 border-none rounded-full text-sm cursor-pointer transition-all ${
                    activeQuickFilter === qf.id 
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
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
        <div className="flex items-center justify-between p-4 border-t border-border">
          <span className="text-sm text-muted-foreground">
            {appliedCount} filters applied
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClearAll}>
              Clear All
            </Button>
            <Button onClick={handleApply}>
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
    <div className="mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full py-2 bg-transparent border-none cursor-pointer text-left"
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm font-semibold text-foreground">
          {title}
        </span>
      </button>
      {expanded && (
        <div className="pl-6">
          {children}
        </div>
      )}
    </div>
  );
};

// Filter Field Component
const FilterField: React.FC<{ label: string }> = ({ label }) => {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
      </label>
      <select className="w-full px-2 py-1.5 border border-border rounded text-sm bg-card">
        <option value="">Any</option>
      </select>
    </div>
  );
};