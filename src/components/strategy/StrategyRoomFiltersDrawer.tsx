// Strategy Room Filters Drawer - Pixel-perfect implementation
import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronRight, Search, Users, Calendar, Layers, Activity, Clock, Settings2 } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  useStrategyRoomFiltersStore, 
  HealthStatus, 
  ProgressState, 
  AgeingFilter 
} from '@/stores/strategyRoomFiltersStore';
import { cn } from '@/lib/utils';

// Quick filter chip component
interface QuickFilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const QuickFilterChip: React.FC<QuickFilterChipProps> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-2 text-sm font-medium rounded-xl border transition-all",
      "hover:bg-brand-gold/5",
      active
        ? "border-brand-gold bg-brand-gold/10 text-foreground"
        : "border-border bg-white text-muted-foreground"
    )}
  >
    {label}
  </button>
);

// Multi-select dropdown component
interface MultiSelectDropdownProps {
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  searchable?: boolean;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  placeholder,
  options,
  selected,
  onChange,
  disabled = false,
  searchable = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            "w-full h-11 px-3 rounded-xl border text-left text-sm",
            "flex items-center justify-between gap-2",
            "transition-colors",
            disabled
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-white hover:border-brand-gold/50 focus:outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold"
          )}
        >
          <div className="flex-1 truncate">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : selected.length <= 2 ? (
              <div className="flex flex-wrap gap-1">
                {selected.map((s) => {
                  const opt = options.find((o) => o.value === s);
                  return (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {opt?.label || s}
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <span>{selected.length} selected</span>
            )}
          </div>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-xl shadow-lg overflow-hidden">
            {searchable && (
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
              </div>
            )}
            <div className="max-h-48 overflow-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                  No options found
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleOption(opt.value)}
                    className={cn(
                      "w-full px-3 py-2 text-sm text-left rounded-lg",
                      "flex items-center gap-2 transition-colors",
                      selected.includes(opt.value)
                        ? "bg-brand-gold/10 text-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
                        selected.includes(opt.value)
                          ? "border-brand-gold bg-brand-gold"
                          : "border-border"
                      )}
                    >
                      {selected.includes(opt.value) && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {opt.label}
                  </button>
                ))
              )}
            </div>
            <div className="p-2 border-t bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => setIsOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Section accordion component
interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const FilterSection: React.FC<FilterSectionProps> = ({ title, icon, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between py-3 px-1 hover:bg-muted/30 rounded-lg transition-colors">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 pb-4">
        <div className="grid grid-cols-2 gap-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

interface StrategyRoomFiltersDrawerProps {
  snapshotName?: string;
  // Options for dropdowns - passed from parent
  programOptions?: { value: string; label: string }[];
  quarterOptions?: { value: string; label: string }[];
  themeOptions?: { value: string; label: string }[];
  teamOptions?: { value: string; label: string }[];
  ownerOptions?: { value: string; label: string }[];
  userProgramIds?: string[];
  currentQuarterId?: string;
}

export const StrategyRoomFiltersDrawer: React.FC<StrategyRoomFiltersDrawerProps> = ({
  snapshotName = 'No snapshot selected',
  programOptions = [],
  quarterOptions = [],
  themeOptions = [],
  teamOptions = [],
  ownerOptions = [],
  userProgramIds = [],
  currentQuarterId,
}) => {
  const {
    isDrawerOpen,
    draftFilters,
    appliedFilters,
    closeDrawer,
    updateDraftFilter,
    applyFilters,
    clearAllFilters,
    applyQuickFilter,
    getActiveFilterCount,
    isDirty,
  } = useStrategyRoomFiltersStore();

  const activeCount = getActiveFilterCount();
  const dirty = isDirty();

  // Health status options
  const healthOptions: { value: HealthStatus; label: string }[] = [
    { value: 'Green', label: 'Green' },
    { value: 'Amber', label: 'Amber' },
    { value: 'Red', label: 'Red' },
  ];

  // Progress state options
  const progressOptions: { value: ProgressState; label: string }[] = [
    { value: 'Not Started', label: 'Not Started' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Accepted', label: 'Accepted' },
  ];

  // Ageing options
  const ageingOptions: { value: AgeingFilter; label: string }[] = [
    { value: 'All', label: 'All' },
    { value: '7', label: '7+ days' },
    { value: '14', label: '14+ days' },
    { value: '30', label: '30+ days' },
  ];

  // Quick filter states
  const isMyProgramsActive = draftFilters.programIds.length > 0 && 
    userProgramIds.length > 0 && 
    userProgramIds.every(id => draftFilters.programIds.includes(id));
  const isCurrentQuarterActive = currentQuarterId ? draftFilters.quarterIds.includes(currentQuarterId) : false;
  const isShowArchivedActive = draftFilters.includeArchivedSnapshots;
  const isMisalignedOnlyActive = draftFilters.misalignedOnly;
  const isNeedsAttentionActive = draftFilters.health.includes('Red') && draftFilters.health.includes('Amber');

  return (
    <Sheet open={isDrawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
      <SheetContent 
        side="right" 
        hideClose 
        className="w-full sm:w-[420px] sm:max-w-[460px] p-0 flex flex-col"
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button
            onClick={closeDrawer}
            aria-label="Close filters"
            className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center",
              "border-2 border-brand-gold/30 bg-white",
              "hover:bg-brand-gold/5 hover:border-brand-gold/50",
              "transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-brand-gold/20"
            )}
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {/* Quick Filters */}
          <div className="mb-6">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 block">
              Quick Filters
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <QuickFilterChip
                label="My Programs"
                active={isMyProgramsActive}
                onClick={() => applyQuickFilter('myPrograms', userProgramIds)}
              />
              <QuickFilterChip
                label="Current Quarter"
                active={isCurrentQuarterActive}
                onClick={() => applyQuickFilter('currentQuarter', currentQuarterId ? [currentQuarterId] : [])}
              />
              <QuickFilterChip
                label="Show Archived"
                active={isShowArchivedActive}
                onClick={() => applyQuickFilter('showArchived')}
              />
              <QuickFilterChip
                label="Misaligned Only"
                active={isMisalignedOnlyActive}
                onClick={() => applyQuickFilter('misalignedOnly')}
              />
              <QuickFilterChip
                label="Needs Attention"
                active={isNeedsAttentionActive}
                onClick={() => applyQuickFilter('needsAttention')}
              />
              <QuickFilterChip
                label="Reset to Active"
                active={false}
                onClick={() => applyQuickFilter('resetToActive')}
              />
            </div>
          </div>

          <div className="h-px bg-border mb-4" />

          {/* Filter Sections */}
          <div className="space-y-2">
            {/* Scope Section */}
            <FilterSection title="Scope" icon={<Layers className="w-4 h-4 text-brand-gold" />}>
              <div className="col-span-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Snapshot
                </Label>
                <Input
                  value={snapshotName}
                  disabled
                  className="h-11 rounded-xl bg-muted"
                />
              </div>
              <MultiSelectDropdown
                label="Quarter"
                placeholder="Select quarters..."
                options={quarterOptions}
                selected={draftFilters.quarterIds}
                onChange={(val) => updateDraftFilter('quarterIds', val)}
              />
              <MultiSelectDropdown
                label="Program"
                placeholder="Select programs..."
                options={programOptions}
                selected={draftFilters.programIds}
                onChange={(val) => updateDraftFilter('programIds', val)}
              />
            </FilterSection>

            {/* Strategy Section */}
            <FilterSection title="Strategy" icon={<Users className="w-4 h-4 text-brand-gold" />}>
              <MultiSelectDropdown
                label="Theme"
                placeholder="Select themes..."
                options={themeOptions}
                selected={draftFilters.themeIds}
                onChange={(val) => updateDraftFilter('themeIds', val)}
              />
              <MultiSelectDropdown
                label="Strategic Team"
                placeholder="Select teams..."
                options={teamOptions}
                selected={draftFilters.strategicTeamIds}
                onChange={(val) => updateDraftFilter('strategicTeamIds', val)}
              />
              <div className="col-span-2">
                <MultiSelectDropdown
                  label="Owner"
                  placeholder="Select owners..."
                  options={ownerOptions}
                  selected={draftFilters.ownerIds}
                  onChange={(val) => updateDraftFilter('ownerIds', val)}
                />
              </div>
            </FilterSection>

            {/* Status & Workflow Section */}
            <FilterSection title="Status & Workflow" icon={<Activity className="w-4 h-4 text-brand-gold" />}>
              <MultiSelectDropdown
                label="Health"
                placeholder="Select health..."
                options={healthOptions}
                selected={draftFilters.health}
                onChange={(val) => updateDraftFilter('health', val as HealthStatus[])}
                searchable={false}
              />
              <MultiSelectDropdown
                label="Progress State"
                placeholder="Select states..."
                options={progressOptions}
                selected={draftFilters.progressStates}
                onChange={(val) => updateDraftFilter('progressStates', val as ProgressState[])}
                searchable={false}
              />
              <div className="col-span-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Ageing
                </Label>
                <div className="flex gap-2">
                  {ageingOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateDraftFilter('ageing', opt.value)}
                      className={cn(
                        "flex-1 h-11 rounded-xl border text-sm font-medium transition-colors",
                        draftFilters.ageing === opt.value
                          ? "border-brand-gold bg-brand-gold/10 text-foreground"
                          : "border-border bg-white text-muted-foreground hover:border-brand-gold/30"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </FilterSection>

            {/* Dates Section */}
            <FilterSection title="Dates" icon={<Calendar className="w-4 h-4 text-brand-gold" />}>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Created From
                </Label>
                <Input
                  type="date"
                  value={draftFilters.createdFrom || ''}
                  onChange={(e) => updateDraftFilter('createdFrom', e.target.value || undefined)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Created To
                </Label>
                <Input
                  type="date"
                  value={draftFilters.createdTo || ''}
                  onChange={(e) => updateDraftFilter('createdTo', e.target.value || undefined)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Updated From
                </Label>
                <Input
                  type="date"
                  value={draftFilters.updatedFrom || ''}
                  onChange={(e) => updateDraftFilter('updatedFrom', e.target.value || undefined)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Updated To
                </Label>
                <Input
                  type="date"
                  value={draftFilters.updatedTo || ''}
                  onChange={(e) => updateDraftFilter('updatedTo', e.target.value || undefined)}
                  className="h-11 rounded-xl"
                />
              </div>
            </FilterSection>

            {/* Advanced Section - collapsed by default */}
            <FilterSection title="Advanced" icon={<Settings2 className="w-4 h-4 text-brand-gold" />} defaultOpen={false}>
              <div className="col-span-2 text-sm text-muted-foreground text-center py-4">
                Advanced filters (Product, Release Vehicle, Team) will be available when data is configured.
              </div>
            </FilterSection>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="border-t bg-white px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {activeCount} filter{activeCount !== 1 ? 's' : ''} applied
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={clearAllFilters}
                disabled={activeCount === 0}
              >
                Clear All
              </Button>
              <Button
                onClick={applyFilters}
                disabled={!dirty}
                className="bg-brand-gold hover:bg-brand-gold-hover text-white"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
