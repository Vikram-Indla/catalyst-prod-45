import React, { useState, useMemo } from 'react';
import { ActiveFilters, Theme, Owner } from '@/types/objective-roadmap';
import { ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartFiltersPanelProps {
  activeFilters: ActiveFilters;
  onApplyFilters: (filters: ActiveFilters) => void;
  onClearFilters: () => void;
  onClose: () => void;
  themes: Theme[];
  owners: Owner[];
  matchingCount: number;
}

export const SmartFiltersPanel: React.FC<SmartFiltersPanelProps> = ({
  activeFilters,
  onApplyFilters,
  onClearFilters,
  onClose,
  themes,
  owners,
  matchingCount,
}) => {
  const [pendingFilters, setPendingFilters] = useState<ActiveFilters>({ ...activeFilters });
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
  
  const toggleStatus = (status: string) => {
    setPendingFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }));
  };
  
  const toggleTheme = (themeId: string) => {
    setPendingFilters(prev => ({
      ...prev,
      theme: prev.theme.includes(themeId)
        ? prev.theme.filter(t => t !== themeId)
        : [...prev.theme, themeId]
    }));
  };
  
  const toggleOwner = (ownerId: string) => {
    setPendingFilters(prev => ({
      ...prev,
      owner: prev.owner.includes(ownerId)
        ? prev.owner.filter(o => o !== ownerId)
        : [...prev.owner, ownerId]
    }));
  };
  
  const toggleKR = (krFilter: string) => {
    setPendingFilters(prev => ({
      ...prev,
      kr: prev.kr.includes(krFilter)
        ? prev.kr.filter(k => k !== krFilter)
        : [...prev.kr, krFilter]
    }));
  };
  
  const setProgressRange = (min: number, max: number) => {
    setPendingFilters(prev => ({
      ...prev,
      progressMin: min,
      progressMax: max
    }));
  };
  
  const handleClear = () => {
    setPendingFilters({
      status: [],
      theme: [],
      progressMin: 0,
      progressMax: 100,
      owner: [],
      kr: []
    });
    onClearFilters();
  };
  
  const handleApply = () => {
    onApplyFilters(pendingFilters);
  };
  
  const filteredOwners = useMemo(() => {
    if (!ownerSearchQuery) return owners;
    return owners.filter(o => 
      o.name.toLowerCase().includes(ownerSearchQuery.toLowerCase())
    );
  }, [owners, ownerSearchQuery]);
  
  const statusOptions = [
    { value: 'on-track', label: 'On Track', color: '#059669' },
    { value: 'at-risk', label: 'At Risk', color: '#D97706' },
    { value: 'delayed', label: 'Delayed', color: '#DC2626' },
  ];
  
  const progressPresets = [
    { min: 0, max: 25, label: '0-25%' },
    { min: 25, max: 50, label: '25-50%' },
    { min: 50, max: 75, label: '50-75%' },
    { min: 75, max: 100, label: '75-100%' },
  ];
  
  const krOptions = [
    { value: 'has-overdue', label: 'Has Overdue KRs', color: '#DC2626' },
    { value: 'all-complete', label: 'All KRs Complete', color: '#059669' },
    { value: 'no-kr', label: 'No Key Results', color: '#6B7280' },
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
            <span className="px-2 py-0.5 text-xs font-semibold text-brand-gold bg-brand-gold/15 rounded-full">
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold">Smart Filters</span>
        <button 
          className="text-xs font-medium text-brand-gold hover:underline"
          onClick={handleClear}
        >
          Clear all
        </button>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto">
        {/* Status Filter */}
        {renderSection('status', 'Status', pendingFilters.status.length, (
          <div className="flex flex-wrap gap-2">
            {statusOptions.map(opt => (
              <div
                key={opt.value}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-full cursor-pointer transition-colors",
                  pendingFilters.status.includes(opt.value)
                    ? "bg-brand-gold/15 border-brand-gold text-brand-gold"
                    : "border-border text-muted-foreground hover:border-brand-gold"
                )}
                onClick={() => toggleStatus(opt.value)}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: opt.color }} />
                {opt.label}
              </div>
            ))}
          </div>
        ))}
        
        {/* Theme Filter */}
        {renderSection('theme', 'Theme', pendingFilters.theme.length, (
          <div className="space-y-1">
            {themes.map(theme => (
              <label 
                key={theme.id} 
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={pendingFilters.theme.includes(theme.id)}
                  onChange={() => toggleTheme(theme.id)}
                />
                <span className={cn(
                  "w-4 h-4 flex items-center justify-center border-2 rounded transition-colors",
                  pendingFilters.theme.includes(theme.id)
                    ? "bg-brand-gold border-brand-gold"
                    : "border-border"
                )}>
                  {pendingFilters.theme.includes(theme.id) && (
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
        
        {/* Progress Filter */}
        {renderSection('progress', 'Progress', (pendingFilters.progressMin > 0 || pendingFilters.progressMax < 100) ? 1 : 0, (
          <>
            <div className="flex gap-1.5 mb-3">
              {progressPresets.map(preset => (
                <button
                  key={preset.label}
                  className={cn(
                    "flex-1 px-2 py-1.5 text-xs border rounded-md text-center transition-colors",
                    pendingFilters.progressMin === preset.min && pendingFilters.progressMax === preset.max
                      ? "bg-brand-gold/15 border-brand-gold text-brand-gold"
                      : "border-border text-muted-foreground hover:border-brand-gold"
                  )}
                  onClick={() => setProgressRange(preset.min, preset.max)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2.5">
              <input
                type="number"
                className="w-16 h-8 px-2 text-xs text-center border border-border rounded-md bg-background focus:outline-none focus:border-brand-gold"
                min={0}
                max={100}
                value={pendingFilters.progressMin}
                onChange={(e) => setProgressRange(Number(e.target.value), pendingFilters.progressMax)}
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="number"
                className="w-16 h-8 px-2 text-xs text-center border border-border rounded-md bg-background focus:outline-none focus:border-brand-gold"
                min={0}
                max={100}
                value={pendingFilters.progressMax}
                onChange={(e) => setProgressRange(pendingFilters.progressMin, Number(e.target.value))}
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </>
        ))}
        
        {/* Owner Filter */}
        {renderSection('owner', 'Owner', pendingFilters.owner.length, (
          <>
            <div className="relative mb-2.5">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                className="w-full h-8 pl-8 pr-2 text-xs border border-border rounded-md bg-muted/50 focus:outline-none focus:border-brand-gold"
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
                    checked={pendingFilters.owner.includes(owner.id)}
                    onChange={() => toggleOwner(owner.id)}
                  />
                  <span className={cn(
                    "w-4 h-4 flex items-center justify-center border-2 rounded transition-colors",
                    pendingFilters.owner.includes(owner.id)
                      ? "bg-brand-gold border-brand-gold"
                      : "border-border"
                  )}>
                    {pendingFilters.owner.includes(owner.id) && (
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
        {renderSection('kr', 'Key Results', pendingFilters.kr.length, (
          <div className="space-y-1">
            {krOptions.map(opt => (
              <label 
                key={opt.value} 
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={pendingFilters.kr.includes(opt.value)}
                  onChange={() => toggleKR(opt.value)}
                />
                <span className={cn(
                  "w-4 h-4 flex items-center justify-center border-2 rounded transition-colors",
                  pendingFilters.kr.includes(opt.value)
                    ? "bg-brand-gold border-brand-gold"
                    : "border-border"
                )}>
                  {pendingFilters.kr.includes(opt.value) && (
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
      
      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/50">
        <span className="text-xs text-muted-foreground">
          <strong className="text-foreground">{matchingCount}</strong> objectives match
        </span>
        <div className="flex gap-2">
          <button 
            className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-background"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-1.5 text-sm font-medium bg-brand-gold text-white rounded-md hover:bg-brand-gold-hover"
            onClick={handleApply}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};
