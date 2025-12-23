import React, { useState, useRef, useEffect } from 'react';
import { 
  Scale, 
  DemandFilterState, 
  DemandOwner, 
  DemandAssignee,
  DEMAND_STATUS_CONFIG, 
  PRIORITY_TIER_CONFIG,
  HEALTH_CONFIG,
  QUARTER_CONFIG,
  MILESTONE_CONDITION_CONFIG,
} from '@/types/product-roadmap';
import { Search, Filter, Check, X, ChevronDown, Info, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Group By types
export type DemandGroupBy = 'none' | 'platform' | 'owner' | 'quarter';

const GROUP_BY_OPTIONS: { value: DemandGroupBy; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'platform', label: 'Delivery Platform' },
  { value: 'owner', label: 'Business Owner' },
  { value: 'quarter', label: 'Planned Quarter' },
];

const YEAR_OPTIONS = ['2025', '2026', '2027'];

interface ProductRoadmapToolbarProps {
  scale: Scale;
  onScaleChange: (scale: Scale) => void;
  showMilestones: boolean;
  onToggleMilestones: () => void;
  showLegend: boolean;
  onToggleLegend: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  
  // Group By
  groupBy: DemandGroupBy;
  onGroupByChange: (groupBy: DemandGroupBy) => void;
  
  // Year
  selectedYear?: string;
  onYearChange?: (year: string) => void;
  
  // Viewport (staged)
  appliedViewport: { start: Date; end: Date; scale: Scale };
  draftViewport: { start: Date; end: Date; scale: Scale };
  onDraftViewportChange: (viewport: { start: Date; end: Date; scale: Scale }) => void;
  
  // Canonical filter props
  draftFilters: DemandFilterState;
  activeFilterCount: number;
  onToggleStatus: (status: string) => void;
  onToggleOwner: (ownerId: string) => void;
  onTogglePlatform: (platform: string) => void;
  onToggleAssignee: (assigneeId: string) => void;
  onToggleQuarter: (quarter: string) => void;
  onTogglePriorityTier: (tier: string) => void;
  onToggleHealth: (health: string) => void;
  onToggleMilestoneCondition: (condition: string) => void;
  onOpenFilters: () => void;
  onApplyFilters: () => void;
  onCancelFilters: () => void;
  onClearAll: () => void;
  
  owners: DemandOwner[];
  assignees: DemandAssignee[];
  platforms: string[];
  matchingDemands: number;
}

// Multi-select dropdown component
const MultiSelectDropdown: React.FC<{
  label: string;
  options: { key: string; label: string }[];
  selectedKeys: string[];
  onToggle: (key: string) => void;
  placeholder?: string;
}> = ({ label, options, selectedKeys, onToggle, placeholder = "Select..." }) => {
  const selectedCount = selectedKeys.length;
  const displayText = selectedCount === 0 
    ? placeholder 
    : selectedCount === 1 
      ? options.find(o => o.key === selectedKeys[0])?.label || placeholder
      : `${selectedCount} selected`;
  
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full h-9 px-3 flex items-center justify-between text-sm border border-border rounded-lg bg-background hover:bg-muted/50 focus:outline-none focus:border-brand-primary">
            <span className={cn(
              "truncate",
              selectedCount === 0 && "text-muted-foreground"
            )}>
              {displayText}
            </span>
            <ChevronDown size={14} className="text-muted-foreground flex-shrink-0 ml-2" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-64 max-h-60 overflow-y-auto z-[400]" 
          align="start"
        >
          {options.map(option => (
            <DropdownMenuCheckboxItem
              key={option.key}
              checked={selectedKeys.includes(option.key)}
              onCheckedChange={() => onToggle(option.key)}
              onSelect={(e) => e.preventDefault()}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// Searchable user dropdown
const UserSearchDropdown: React.FC<{
  label: string;
  items: { id: string; name: string; initials: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  placeholder?: string;
}> = ({ label, items, selectedIds, onToggle, placeholder = "Type to search..." }) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const filtered = search.trim().length > 0 
    ? items.filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
    : [];
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const selectedCount = selectedIds.length;
  
  return (
    <div className="space-y-1.5" ref={containerRef}>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
        {selectedCount > 0 && (
          <span className="ml-2 text-brand-primary">({selectedCount})</span>
        )}
      </label>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          className="w-full h-9 pl-9 pr-3 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-brand-primary"
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        
        {isOpen && search.trim().length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-background border border-border rounded-lg shadow-lg z-[400] max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                No matches found
              </div>
            ) : (
              filtered.slice(0, 10).map(item => (
                <button
                  key={item.id}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 text-left",
                    selectedIds.includes(item.id) && "bg-brand-primary/10"
                  )}
                  onClick={() => onToggle(item.id)}
                >
                  <span className="w-6 h-6 flex items-center justify-center text-[10px] font-semibold bg-muted rounded-full flex-shrink-0">
                    {item.initials}
                  </span>
                  <span className="flex-1 truncate">{item.name}</span>
                  {selectedIds.includes(item.id) && (
                    <Check size={14} className="text-brand-primary flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
      
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selectedIds.slice(0, 3).map(id => {
            const item = items.find(i => i.id === id);
            return item ? (
              <span 
                key={id}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-brand-primary/10 text-brand-primary rounded-full"
              >
                {item.name.split(' ')[0]}
                <button 
                  className="hover:text-brand-primary-hover"
                  onClick={() => onToggle(id)}
                >
                  <X size={10} />
                </button>
              </span>
            ) : null;
          })}
          {selectedIds.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{selectedIds.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export const ProductRoadmapToolbar: React.FC<ProductRoadmapToolbarProps> = ({
  scale,
  onScaleChange,
  showMilestones,
  onToggleMilestones,
  showLegend,
  onToggleLegend,
  searchQuery,
  onSearchChange,
  groupBy,
  onGroupByChange,
  selectedYear = '2025',
  onYearChange,
  appliedViewport,
  draftViewport,
  onDraftViewportChange,
  draftFilters,
  activeFilterCount,
  onToggleStatus,
  onToggleOwner,
  onTogglePlatform,
  onToggleAssignee,
  onToggleQuarter,
  onTogglePriorityTier,
  onToggleHealth,
  onToggleMilestoneCondition,
  onOpenFilters,
  onApplyFilters,
  onCancelFilters,
  onClearAll,
  owners,
  assignees,
  platforms,
  matchingDemands,
}) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [groupByMenuOpen, setGroupByMenuOpen] = useState(false);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  
  const [internalYear, setInternalYear] = useState(selectedYear);
  const currentYear = onYearChange ? selectedYear : internalYear;
  const handleYearChange = onYearChange || setInternalYear;
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        if (filtersOpen) {
          onCancelFilters();
          setFiltersOpen(false);
        }
      }
      // Close other menus
      setGroupByMenuOpen(false);
      setYearMenuOpen(false);
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filtersOpen, onCancelFilters]);
  
  const handleOpenFilters = () => {
    onOpenFilters();
    setFiltersOpen(true);
  };
  
  const handleApplyFilters = () => {
    onApplyFilters();
    setFiltersOpen(false);
    if (draftViewport.scale !== scale) {
      onScaleChange(draftViewport.scale);
    }
  };
  
  const handleCancelFilters = () => {
    onCancelFilters();
    setFiltersOpen(false);
  };
  
  const handleClearAll = () => {
    onClearAll();
    setFiltersOpen(false);
  };

  const platformOptions = platforms.map(p => ({ key: p, label: p }));
  
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background">
      {/* LEFT: Search → Group by → Filters */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            className="h-9 w-52 pl-9 pr-8 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-brand-primary"
            placeholder="Search demands..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              onClick={() => onSearchChange('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
        
        {/* Group By Dropdown - matches Program */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button 
            className={cn(
              "h-9 px-3 flex items-center gap-2 text-sm border border-border rounded-lg bg-background hover:bg-muted",
              groupBy !== 'none' && "border-brand-primary text-brand-primary"
            )}
            onClick={() => {
              setGroupByMenuOpen(!groupByMenuOpen);
              setYearMenuOpen(false);
            }}
          >
            <Layers size={16} />
            Group by
            <ChevronDown size={12} />
          </button>
          {groupByMenuOpen && (
            <div className="absolute top-full mt-1 left-0 w-44 py-1 bg-background border border-border rounded-lg shadow-lg z-50">
              {GROUP_BY_OPTIONS.map(option => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-muted",
                    groupBy === option.value && "text-brand-primary"
                  )}
                  onClick={() => {
                    onGroupByChange(option.value);
                    setGroupByMenuOpen(false);
                  }}
                >
                  {option.label}
                  {groupBy === option.value && <Check size={16} className="text-brand-primary" />}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Filters Button */}
        <div className="relative" ref={filtersRef}>
          <button 
            className={cn(
              "h-9 px-3 flex items-center gap-2 text-sm border border-border rounded-lg bg-background hover:bg-muted",
              activeFilterCount > 0 && "border-brand-primary text-brand-primary"
            )}
            onClick={handleOpenFilters}
          >
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-semibold bg-brand-primary text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
          
          {filtersOpen && (
            <div className="absolute top-full mt-2 left-0 w-80 bg-background border border-border rounded-lg shadow-xl z-50 flex flex-col max-h-[520px]">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <MultiSelectDropdown
                  label="Status / Workflow"
                  options={DEMAND_STATUS_CONFIG}
                  selectedKeys={draftFilters.status}
                  onToggle={onToggleStatus}
                  placeholder="All statuses"
                />
                
                <MultiSelectDropdown
                  label="Planned Quarter"
                  options={QUARTER_CONFIG}
                  selectedKeys={draftFilters.quarters}
                  onToggle={onToggleQuarter}
                  placeholder="All quarters"
                />
                
                {platforms.length > 0 && (
                  <MultiSelectDropdown
                    label="Delivery Platform"
                    options={platformOptions}
                    selectedKeys={draftFilters.platforms}
                    onToggle={onTogglePlatform}
                    placeholder="All platforms"
                  />
                )}
                
                <UserSearchDropdown
                  label="Business Owner"
                  items={owners}
                  selectedIds={draftFilters.ownerIds}
                  onToggle={onToggleOwner}
                  placeholder="Type to search owners..."
                />
                
                <UserSearchDropdown
                  label="Assignee"
                  items={assignees}
                  selectedIds={draftFilters.assigneeIds}
                  onToggle={onToggleAssignee}
                  placeholder="Type to search assignees..."
                />
                
                <MultiSelectDropdown
                  label="Priority Tier"
                  options={PRIORITY_TIER_CONFIG.filter(t => t.key !== 'unscored')}
                  selectedKeys={draftFilters.priorityTiers}
                  onToggle={onTogglePriorityTier}
                  placeholder="All priorities"
                />
                
                <MultiSelectDropdown
                  label="Health"
                  options={HEALTH_CONFIG.filter(h => h.key !== 'unknown')}
                  selectedKeys={draftFilters.health}
                  onToggle={onToggleHealth}
                  placeholder="All health statuses"
                />
                
                <MultiSelectDropdown
                  label="Milestone Condition"
                  options={MILESTONE_CONDITION_CONFIG}
                  selectedKeys={draftFilters.milestoneConditions}
                  onToggle={onToggleMilestoneCondition}
                  placeholder="All conditions"
                />
              </div>
              
              <div className="border-t border-border p-3 space-y-2 bg-muted/30 flex-shrink-0">
                <div className="text-xs text-muted-foreground text-center">
                  {matchingDemands} demand{matchingDemands !== 1 ? 's' : ''} match
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    className="flex-1 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={handleClearAll}
                  >
                    Clear All
                  </button>
                  <button
                    className="flex-1 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={handleCancelFilters}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 px-3 py-2 text-xs font-medium bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover"
                    onClick={handleApplyFilters}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* RIGHT: Milestones toggle + Year selector + Info */}
      <div className="flex items-center gap-3">
        {/* Milestones Toggle - matches Program */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Milestones</span>
          <div 
            className={cn(
              "w-10 h-5 rounded-full cursor-pointer transition-colors relative",
              showMilestones ? "bg-brand-primary" : "bg-muted"
            )}
            onClick={onToggleMilestones}
          >
            <div className={cn(
              "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
              showMilestones ? "translate-x-5" : "translate-x-0.5"
            )} />
          </div>
        </div>
        
        <div className="w-px h-6 bg-border" />
        
        {/* Year Selector - matches Program */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setYearMenuOpen(!yearMenuOpen);
              setGroupByMenuOpen(false);
            }}
            className="h-9 px-3 flex items-center gap-2 text-sm border border-border rounded-lg bg-background hover:bg-muted"
          >
            <span>{currentYear}</span>
            <ChevronDown size={12} />
          </button>
          {yearMenuOpen && (
            <div className="absolute top-full right-0 mt-1 min-w-[100px] bg-background border border-border rounded-lg shadow-lg z-50">
              {YEAR_OPTIONS.map(y => (
                <div
                  key={y}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-muted first:rounded-t-lg last:rounded-b-lg",
                    currentYear === y && "text-brand-primary"
                  )}
                  onClick={() => {
                    handleYearChange(y);
                    setYearMenuOpen(false);
                  }}
                >
                  {y}
                  {currentYear === y && <Check size={16} className="text-brand-primary" />}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Info/Legend Button - matches Program */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "h-9 w-9 flex items-center justify-center border border-border rounded-lg transition-colors",
                  showLegend 
                    ? "bg-brand-primary text-white border-brand-primary" 
                    : "bg-background text-muted-foreground hover:bg-muted"
                )}
                onClick={onToggleLegend}
              >
                <Info size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{showLegend ? 'Hide legend' : 'Show legend'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};