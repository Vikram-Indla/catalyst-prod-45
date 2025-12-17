import React, { useState, useMemo } from 'react';
import { Theme, Owner } from '@/types/objective-roadmap';
import { 
  FilterState, 
  ProgressRange, 
  KRCondition,
  PROGRESS_RANGE_CONFIG,
  KR_CONDITION_CONFIG,
  countFilterSelections,
} from '@/types/canonical-roadmap-filters';
import { ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartFiltersPanelProps {
  draftFilters: FilterState;
  onToggleStatus: (status: string) => void;
  onToggleTheme: (themeId: string) => void;
  onToggleOwner: (ownerId: string) => void;
  onToggleProgressRange: (range: ProgressRange) => void;
  onToggleKRCondition: (condition: KRCondition) => void;
  onApply: () => void;
  onCancel: () => void;
  onClearAll: () => void;
  themes: Theme[];
  owners: Owner[];
  matchingCount: number;
}

export const SmartFiltersPanel: React.FC<SmartFiltersPanelProps> = ({
  draftFilters,
  onToggleStatus,
  onToggleTheme,
  onToggleOwner,
  onToggleProgressRange,
  onToggleKRCondition,
  onApply,
  onCancel,
  onClearAll,
  themes,
  owners,
  matchingCount,
}) => {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [ownerSearchQuery, setOwnerSearchQuery] = useState('');
  
  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };
  
  const filteredOwners = useMemo(() => {
    if (!ownerSearchQuery) return owners;
    return owners.filter(o => 
      o.name.toLowerCase().includes(ownerSearchQuery.toLowerCase())
    );
  }, [owners, ownerSearchQuery]);
  
  const statusOptions = [
    { value: 'on-track', label: 'On Track', color: 'hsl(var(--secondary-green))' },
    { value: 'at-risk', label: 'At Risk', color: 'hsl(var(--secondary-bronze))' },
    { value: 'off-track', label: 'Off Track', color: 'hsl(var(--destructive))' },
    { value: 'in-progress', label: 'In Progress', color: 'hsl(var(--brand-primary))' },
    { value: 'pending', label: 'Pending', color: 'hsl(var(--muted-foreground))' },
  ];
  
  const renderSection = (
    id: string,
    title: string,
    count: number,
    children: React.ReactNode
  ) => {
    const isCollapsed = collapsedSections.has(id);
    return (
      <div className="border-b border-border last:border-b-0">
        <div 
          className="flex items-center gap-2.5 px-4 py-3 cursor-pointer hover:bg-muted/50"
          onClick={() => toggleSection(id)}
        >
          <ChevronDown 
            size={16} 
            className={cn(
              "text-muted-foreground transition-transform",
              isCollapsed && "-rotate-90"
            )} 
          />
          <span className="flex-1 text-sm font-semibold">{title}</span>
          {count > 0 && (
            <span className="px-2 py-0.5 text-xs font-semibold text-brand-primary bg-brand-primary/15 rounded-full">
              {count}
            </span>
          )}
        </div>
        {!isCollapsed && (
          <div className="px-4 pb-3">
            {children}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="absolute top-full mt-1 left-0 w-[360px] bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden">
      {/* Header with Clear all */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold">Smart Filters</span>
        <button 
          className="text-xs font-medium text-brand-primary hover:underline"
          onClick={onClearAll}
        >
          Clear all
        </button>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto">
        {/* Status Filter */}
        {renderSection('status', 'Status', draftFilters.status.length, (
          <div className="flex flex-wrap gap-2">
            {statusOptions.map(opt => (
              <div
                key={opt.value}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-full cursor-pointer transition-colors",
                  draftFilters.status.includes(opt.value)
                    ? "bg-brand-primary/15 border-brand-primary text-brand-primary"
                    : "border-border text-muted-foreground hover:border-brand-primary"
                )}
                onClick={() => onToggleStatus(opt.value)}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: opt.color }} />
                {opt.label}
              </div>
            ))}
          </div>
        ))}
        
        {/* Theme Filter */}
        {renderSection('theme', 'Theme', draftFilters.themeIds.length, (
          <div className="space-y-1">
            {themes.map(theme => (
              <label 
                key={theme.id} 
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={draftFilters.themeIds.includes(theme.id)}
                  onChange={() => onToggleTheme(theme.id)}
                />
                <span className={cn(
                  "w-4 h-4 flex items-center justify-center border-2 rounded transition-colors",
                  draftFilters.themeIds.includes(theme.id)
                    ? "bg-brand-primary border-brand-primary"
                    : "border-border"
                )}>
                  {draftFilters.themeIds.includes(theme.id) && (
                    <Check size={10} className="text-white" />
                  )}
                </span>
                <span 
                  className="w-3.5 h-3.5 rounded" 
                  style={{ background: theme.color }} 
                />
                <span className="text-sm text-secondary-foreground">{theme.name}</span>
              </label>
            ))}
          </div>
        ))}
        
        {/* Progress Filter (Multi-select buckets) */}
        {renderSection('progress', 'Progress', draftFilters.progressRanges.length, (
          <div className="flex flex-wrap gap-1.5">
            {PROGRESS_RANGE_CONFIG.map(preset => (
              <button
                key={preset.key}
                className={cn(
                  "px-3 py-1.5 text-xs border rounded-md text-center transition-colors",
                  draftFilters.progressRanges.includes(preset.key)
                    ? "bg-brand-primary/15 border-brand-primary text-brand-primary"
                    : "border-border text-muted-foreground hover:border-brand-primary"
                )}
                onClick={() => onToggleProgressRange(preset.key)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        ))}
        
        {/* Owner Filter */}
        {renderSection('owner', 'Owner', draftFilters.ownerIds.length, (
          <>
            <div className="relative mb-2.5">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                className="w-full h-8 pl-8 pr-2 text-xs border border-border rounded-md bg-muted/50 focus:outline-none focus:border-brand-primary"
                placeholder="Search owners..."
                value={ownerSearchQuery}
                onChange={(e) => setOwnerSearchQuery(e.target.value)}
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filteredOwners.map(owner => (
                <label 
                  key={owner.id} 
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={draftFilters.ownerIds.includes(owner.id)}
                    onChange={() => onToggleOwner(owner.id)}
                  />
                  <span className={cn(
                    "w-4 h-4 flex items-center justify-center border-2 rounded transition-colors",
                    draftFilters.ownerIds.includes(owner.id)
                      ? "bg-brand-primary border-brand-primary"
                      : "border-border"
                  )}>
                    {draftFilters.ownerIds.includes(owner.id) && (
                      <Check size={10} className="text-white" />
                    )}
                  </span>
                  <span className="w-6 h-6 flex items-center justify-center text-[9px] font-semibold bg-muted rounded-full">
                    {owner.initials}
                  </span>
                  <span className="text-sm text-secondary-foreground">{owner.name}</span>
                </label>
              ))}
            </div>
          </>
        ))}
        
        {/* Key Results Filter */}
        {renderSection('kr', 'Key Results', draftFilters.krConditions.length, (
          <div className="space-y-1">
            {KR_CONDITION_CONFIG.map(opt => (
              <label 
                key={opt.key} 
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={draftFilters.krConditions.includes(opt.key)}
                  onChange={() => onToggleKRCondition(opt.key)}
                />
                <span className={cn(
                  "w-4 h-4 flex items-center justify-center border-2 rounded transition-colors",
                  draftFilters.krConditions.includes(opt.key)
                    ? "bg-brand-primary border-brand-primary"
                    : "border-border"
                )}>
                  {draftFilters.krConditions.includes(opt.key) && (
                    <Check size={10} className="text-white" />
                  )}
                </span>
                <span className="w-2 h-2 rounded-full" style={{ background: opt.color }} />
                <span className="text-sm text-secondary-foreground">{opt.label}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
      
      {/* Footer with Apply/Cancel */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/50">
        <span className="text-xs text-muted-foreground">
          <strong className="text-foreground">{matchingCount}</strong> objectives match
        </span>
        <div className="flex gap-2">
          <button 
            className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-background"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-1.5 text-sm font-medium bg-brand-primary text-white rounded-md hover:bg-brand-primary-hover"
            onClick={onApply}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};
