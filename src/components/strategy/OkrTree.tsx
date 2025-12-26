/**
 * OkrTree — CIO Cockpit OKR hierarchy
 * Crystal clear hierarchy: Theme > Objective > KR
 * Compact rows, aligned progress bars, subtle hover
 * 
 * TYPOGRAPHY LOCK (CIO COCKPIT UX — NON-NEGOTIABLE):
 * ─────────────────────────────────────────────────
 * - Section title: text-sm font-semibold (14px)
 * - Table headers: text-xs font-semibold uppercase (12px min)
 * - Row text: text-sm (14px) or text-xs (12px) minimum
 * - NO text-[7px], text-[8px], text-[9px], text-[10px] except for owner initials
 * - Use var(--text-secondary) for supporting text, NOT opacity
 * 
 * LOADING BEHAVIOR:
 * - Skeleton allowed ONCE on initial load only
 * - After first success: NEVER show skeleton again
 * - During refresh: show "Refreshing…" in header, keep content visible
 * - NO greying, NO opacity reduction, NO layout shift
 * 
 * LKG CACHING: Uses sessionStorage-backed caching to prevent UI flickering
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Maximize2, ChevronRight, ChevronDown, X, Loader2, Layers, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOKRTreeV2, OKRTreeV2Item } from '@/hooks/useOKRTreeV2';
import { cn } from '@/lib/utils';
import { TYPOGRAPHY } from './strategyRoomTypography';
import { getLKGData, setLKGData, safeNumber, safePercentage } from '@/utils/strategyRoomCache';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface OkrTreeProps {
  selectedSnapshot: string;
  onObjectiveClick: (objective: any) => void;
  onThemeClick?: (theme: any) => void;
}

function getHealthStatus(progress: number, health?: string): { label: string; color: string; bg: string } {
  // Ensure progress is a safe number
  const safeProgress = safePercentage(progress);
  
  if (health === 'at_risk' || health === 'poor') {
    return { label: 'At Risk', color: 'var(--status-danger)', bg: 'var(--status-danger-bg)' };
  }
  if (safeProgress >= 70) {
    return { label: 'On Track', color: 'var(--status-success)', bg: 'var(--status-success-bg)' };
  }
  if (safeProgress >= 40) {
    return { label: 'In Progress', color: 'var(--status-warning)', bg: 'var(--status-warning-bg)' };
  }
  if (safeProgress > 0) {
    return { label: 'Behind', color: 'var(--status-danger)', bg: 'var(--status-danger-bg)' };
  }
  return { label: 'Not Started', color: 'var(--text-secondary)', bg: 'var(--surface-subtle)' };
}

function getProgressBarColor(progress: number): string {
  const safeProgress = safePercentage(progress);
  if (safeProgress < 30) return 'var(--status-danger)';
  if (safeProgress >= 70) return 'var(--status-success)';
  return 'var(--brand-primary)';
}

// Type config with icons
const typeStyles = {
  theme: {
    bg: 'rgb(229, 231, 235)',        // gray-200
    darkBg: 'rgb(55, 65, 81)',       // gray-700
    color: 'rgb(55, 65, 81)',        // gray-700
    darkColor: 'rgb(209, 213, 219)', // gray-300
    label: 'Theme',
    Icon: Layers,
    rowBg: 'var(--surface-subtle)',
  },
  objective: {
    bg: 'rgb(229, 231, 235)',        // gray-200
    darkBg: 'rgb(55, 65, 81)',       // gray-700
    color: 'rgb(55, 65, 81)',        // gray-700
    darkColor: 'rgb(209, 213, 219)', // gray-300
    label: 'Objective',
    Icon: Target,
    rowBg: 'transparent',
  },
  key_result: {
    bg: 'rgb(229, 231, 235)',        // gray-200
    darkBg: 'rgb(55, 65, 81)',       // gray-700
    color: 'rgb(55, 65, 81)',        // gray-700
    darkColor: 'rgb(209, 213, 219)', // gray-300
    label: 'Key Result',
    Icon: TrendingUp,
    rowBg: 'transparent',
  },
};

export function OkrTree({ selectedSnapshot, onObjectiveClick, onThemeClick }: OkrTreeProps) {
  const navigate = useNavigate();
  const { data: treeData = [], isLoading, isFetching, error } = useOKRTreeV2(selectedSnapshot);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showStaleIndicator, setShowStaleIndicator] = useState(false);
  
  // LKG caching for smooth transitions
  const lkgDataRef = useRef<OKRTreeV2Item[]>([]);
  const hasEverLoadedRef = useRef(false);
  
  // On snapshot change, load LKG from cache
  useEffect(() => {
    if (selectedSnapshot) {
      const cached = getLKGData<OKRTreeV2Item[]>(selectedSnapshot, 'okrTree');
      if (cached && cached.length > 0) {
        lkgDataRef.current = cached;
        hasEverLoadedRef.current = true;
      }
    }
  }, [selectedSnapshot]);
  
  // Save successful data to cache
  useEffect(() => {
    if (treeData.length > 0 && selectedSnapshot) {
      lkgDataRef.current = treeData;
      hasEverLoadedRef.current = true;
      setLKGData(selectedSnapshot, 'okrTree', treeData);
      setShowStaleIndicator(false);
    }
  }, [treeData, selectedSnapshot]);
  
  // Determine display data: prefer fresh data, fallback to LKG
  const displayData = treeData.length > 0 ? treeData : lkgDataRef.current;
  
  // Track errors to show stale indicator
  useEffect(() => {
    if (error && displayData.length > 0 && !isFetching) {
      setShowStaleIndicator(true);
    }
  }, [error, displayData.length, isFetching]);
  
  // Loading states
  const isInitialLoading = isLoading && !hasEverLoadedRef.current && displayData.length === 0;
  const isRefreshing = isFetching && displayData.length > 0;

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const renderTreeItem = (item: OKRTreeV2Item, depth: number = 0) => {
    const hasChildren = item.children.length > 0;
    const isExpanded = expandedIds.has(item.id);
    const isSelected = selectedId === item.id;

    if (searchQuery) {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      const childrenMatch = item.children.some(child => 
        child.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        child.children.some(grandChild => grandChild.title.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      if (!matchesSearch && !childrenMatch) return null;
    }

    const isTheme = item.type === 'theme';
    const isObjective = item.type === 'objective';
    const isKeyResult = item.type === 'key_result';

    const typeStyle = typeStyles[item.type as keyof typeof typeStyles] || typeStyles.key_result;
    const status = isObjective ? getHealthStatus(item.progress, (item as any).health) : null;

    const handleActivate = () => {
      setSelectedId(item.id);
      if (isTheme && onThemeClick) {
        onThemeClick({ id: item.id, name: item.title, type: 'theme' });
      } else if (isObjective) {
        onObjectiveClick({ id: item.id, title: item.title, type: 'objective_v2' });
      }
    };

    const isClickable = isObjective || (isTheme && !!onThemeClick);

    // Clear hierarchy indentation: 24px per level
    const indentPx = depth * 24;

    return (
      <div key={item.id}>
        <div
          className={cn(
            "grid items-center",
            "transition-[background-color] duration-75",
            isClickable && "cursor-pointer",
            isSelected && "ring-1 ring-inset"
          )}
          role={isClickable ? 'button' : undefined}
          tabIndex={isClickable ? 0 : -1}
          style={{
            gridTemplateColumns: '1fr 120px 44px 44px 90px',
            minHeight: isTheme ? '34px' : '30px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: isSelected 
              ? 'var(--surface-active)' 
              : isTheme 
                ? typeStyle.rowBg 
                : 'transparent',
            ...(isSelected ? { '--tw-ring-color': 'var(--brand-primary)' } as any : {}),
          }}
          onMouseEnter={(e) => {
            if (!isSelected) e.currentTarget.style.backgroundColor = 'hsl(var(--accent) / 0.35)';
          }}
          onMouseLeave={(e) => {
            if (!isSelected) e.currentTarget.style.backgroundColor = isTheme ? typeStyle.rowBg : 'transparent';
          }}
          onClick={() => {
            if (isClickable) handleActivate();
          }}
          onKeyDown={(e) => {
            if (!isClickable) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleActivate();
            }
          }}
        >
          {/* Item column: indent + expand + chip + name */}
          <div 
            className="flex items-center gap-1.5 min-w-0 pr-2"
            style={{ paddingLeft: `${indentPx + 10}px` }}
          >
            {/* Expand/collapse */}
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(item.id);
                }}
                className="flex items-center justify-center w-4 h-4 flex-shrink-0 rounded transition-colors hover:bg-[var(--surface-hover)] focus-visible:ring-1 focus-visible:ring-ring"
                style={{ color: 'var(--text-secondary)' }}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            ) : (
              <div className="w-4 flex-shrink-0" />
            )}
            
            {/* Type icon with tooltip */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span 
                    className={cn(
                      'p-1 rounded flex-shrink-0 flex items-center justify-center',
                      'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <typeStyle.Icon size={12} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {typeStyle.label}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Name */}
            <span 
              className={cn(
                TYPOGRAPHY.tableCell,
                "truncate",
                (isObjective || isTheme) && "font-medium"
              )}
              style={{ color: 'var(--text-primary)' }}
            >
              {item.title}
            </span>
          </div>

          {/* Progress bar - secondary signal, percentage is primary */}
          <div className="flex items-center gap-1.5 px-2">
            <div 
              className="flex-1 h-[4px] rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--progress-track)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, item.progress)}%`,
                  backgroundColor: getProgressBarColor(item.progress),
                  opacity: 0.85,
                }}
              />
            </div>
          </div>

          {/* Percentage - primary signal, anchors the eye */}
          <div className="text-right pr-2">
            <span 
              className={cn(TYPOGRAPHY.progressPercent, 'font-medium')}
              style={{ color: item.progress > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              {item.progress > 0 ? `${Math.round(item.progress)}%` : '—'}
            </span>
          </div>

          {/* Status indicator - readable but quiet */}
          <div className="flex items-center justify-center px-1">
            {isObjective && status && (
              <span 
                className={cn(TYPOGRAPHY.statusBadge, 'px-1.5 py-0.5 rounded whitespace-nowrap')}
                style={{ backgroundColor: status.bg, color: status.color, opacity: 0.9 }}
              >
                {status.label === 'On Track' ? '✓' : status.label === 'At Risk' ? '!' : status.label === 'Behind' ? '↓' : '○'}
              </span>
            )}
          </div>

          {/* Owner */}
          <div className="flex items-center gap-1 px-2">
            {item.owner ? (
              <>
                <div 
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-semibold flex-shrink-0"
                  style={{ backgroundColor: 'var(--brand-primary)', color: 'white' }}
                >
                  {item.owner.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <span 
                  className="text-[10px] truncate"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {item.owner.name.split(' ')[0]}
                </span>
              </>
            ) : (
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>—</span>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && item.children.map((child) => renderTreeItem(child, depth + 1))}
      </div>
    );
  };

  // Skeleton only on first load when no LKG data exists
  if (isInitialLoading) {
    return (
      <section 
        className="rounded-lg overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-bg)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div 
          className="px-4 py-2"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="h-4 w-20 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
        </div>
        <div className="py-1.5 px-3" style={{ backgroundColor: 'var(--surface-subtle)' }}>
          <div className="grid animate-pulse" style={{ gridTemplateColumns: '1fr 120px 44px 44px 90px' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-2.5 w-10 rounded" style={{ backgroundColor: 'var(--muted)' }} />
            ))}
          </div>
        </div>
        <div className="p-2 space-y-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-7 rounded animate-pulse" style={{ backgroundColor: 'var(--muted)', marginLeft: i % 2 === 0 ? '24px' : '0' }} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section 
      className="rounded-lg overflow-hidden flex flex-col"
      style={{
        backgroundColor: 'var(--surface-bg)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div 
        className="px-4 py-2 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <h2 
            className={cn(TYPOGRAPHY.sectionTitle)}
            style={{ color: 'var(--text-primary)' }}
          >
            OKR Tree
          </h2>
          {/* Stale data indicator - CATALYST STANDARD */}
          {showStaleIndicator && (
            <span className="text-[11px] text-gray-500 dark:text-gray-400 italic">
              Data may be stale
            </span>
          )}
          {/* Refreshing indicator - CATALYST STANDARD */}
          {isRefreshing && (
            <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" />
              <span>Refreshing…</span>
            </div>
          )}
          {/* Type legend - icons with tooltips */}
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-1">
              {Object.entries(typeStyles).map(([key, style]) => (
                <Tooltip key={key}>
                  <TooltipTrigger asChild>
                    <span 
                      className={cn(
                        'p-1 rounded flex items-center justify-center cursor-help',
                        'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      )}
                    >
                      <style.Icon size={12} />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {style.label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </div>
        
        {/* Search + expand */}
        <div className="flex items-center gap-1.5">
          <div className="relative w-40">
            <Search 
              className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" 
              style={{ color: 'var(--text-secondary)' }} 
            />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-6 pl-7 pr-6 text-[11px] rounded-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ 
                backgroundColor: 'var(--surface-subtle)', 
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[var(--surface-hover)] transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                aria-label="Clear search"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 rounded-md focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => navigate('/enterprise/okr-hub')}
            title="Open OKR Hub"
            style={{ 
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Sticky Column Headers */}
      <div
        className="grid items-center py-1.5 sticky top-0 z-10 flex-shrink-0"
        style={{
          gridTemplateColumns: '1fr 120px 44px 44px 90px',
          backgroundColor: 'var(--surface-subtle)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div 
          className="text-[10px] font-semibold uppercase tracking-wider pl-3 text-gray-700 dark:text-gray-300"
        >
          Item
        </div>
        <div 
          className="text-[10px] font-semibold uppercase tracking-wider px-2 text-gray-700 dark:text-gray-300"
        >
          Progress
        </div>
        <div 
          className="text-[10px] font-semibold uppercase tracking-wider text-right pr-2 text-gray-700 dark:text-gray-300"
        >
          %
        </div>
        <div 
          className="text-[10px] font-semibold uppercase tracking-wider text-center text-gray-700 dark:text-gray-300"
        >
          Status
        </div>
        <div 
          className="text-[10px] font-semibold uppercase tracking-wider px-2 text-gray-700 dark:text-gray-300"
        >
          Owner
        </div>
      </div>

      {/* Tree Content - scrollable */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: '320px' }}>
        {treeData.length > 0 ? (
          treeData.map((item) => renderTreeItem(item, 0))
        ) : (
          <div className="py-8 px-4 text-center">
            <div 
              className="w-8 h-8 rounded-lg mx-auto flex items-center justify-center mb-2"
              style={{ backgroundColor: 'var(--surface-subtle)' }}
            >
              <Search size={14} style={{ color: 'var(--text-secondary)' }} />
            </div>
            <p className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              No OKRs found
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              OKRs will appear here once created
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
