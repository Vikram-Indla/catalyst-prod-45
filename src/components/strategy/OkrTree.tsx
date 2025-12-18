/**
 * OkrTree — Enterprise-grade OKR hierarchy view
 * Jira Align-inspired: dense, crisp, scannable
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Maximize2, ChevronRight, ChevronDown, Target, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOKRTreeV2, OKRTreeV2Item } from '@/hooks/useOKRTreeV2';
import { cn } from '@/lib/utils';

interface OkrTreeProps {
  selectedSnapshot: string;
  onObjectiveClick: (objective: any) => void;
  onThemeClick?: (theme: any) => void;
}

// Status determination for objectives
function getHealthStatus(progress: number, health?: string): { label: string; color: string; bg: string } {
  if (health === 'at_risk' || health === 'poor') {
    return { label: 'At Risk', color: 'var(--status-danger)', bg: 'var(--status-danger-bg)' };
  }
  if (progress >= 70) {
    return { label: 'On Track', color: 'var(--status-success)', bg: 'var(--status-success-bg)' };
  }
  if (progress >= 40) {
    return { label: 'In Progress', color: 'var(--status-warning)', bg: 'var(--status-warning-bg)' };
  }
  if (progress > 0) {
    return { label: 'Behind', color: 'var(--status-danger)', bg: 'var(--status-danger-bg)' };
  }
  return { label: 'Not Started', color: 'var(--text-muted)', bg: 'var(--surface-subtle)' };
}

function getProgressBarColor(progress: number): string {
  if (progress < 30) return 'var(--status-danger)';
  if (progress >= 70) return 'var(--status-success)';
  return 'var(--brand-primary)';
}

// Type chip colors using tokens
const typeStyles = {
  theme: {
    bg: 'var(--secondary-green-bg)',
    color: 'var(--secondary-green)',
    label: 'THM',
    rowBg: 'var(--surface-subtle)',
  },
  objective: {
    bg: 'var(--brand-gold-bg)',
    color: 'var(--brand-gold)',
    label: 'OBJ',
    rowBg: 'transparent',
  },
  key_result: {
    bg: 'var(--secondary-bronze-bg)',
    color: 'var(--secondary-bronze)',
    label: 'KR',
    rowBg: 'transparent',
  },
};

export function OkrTree({ selectedSnapshot, onObjectiveClick, onThemeClick }: OkrTreeProps) {
  const navigate = useNavigate();
  const { data: treeData = [], isLoading } = useOKRTreeV2(selectedSnapshot);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

    // Indentation calculation
    const indentPx = depth * 20;

    return (
      <div key={item.id}>
        <div
          className={cn(
            "grid items-center transition-all duration-100",
            isClickable && "cursor-pointer",
            isSelected && "ring-1 ring-inset"
          )}
          role={isClickable ? 'button' : undefined}
          tabIndex={isClickable ? 0 : -1}
          style={{
            gridTemplateColumns: '1fr 140px 52px 52px 100px',
            minHeight: isTheme ? '40px' : '36px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: isSelected 
              ? 'var(--surface-active)' 
              : isTheme 
                ? typeStyle.rowBg 
                : 'transparent',
            // Ring color for selected state
            ...(isSelected ? { '--tw-ring-color': 'var(--brand-primary)' } as any : {}),
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = isTheme ? typeStyle.rowBg : 'transparent';
            }
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
          {/* Item column: expand + type chip + name */}
          <div 
            className="flex items-center gap-2 min-w-0 pr-2"
            style={{ paddingLeft: `${indentPx + 12}px` }}
          >
            {/* Expand/collapse button with better click target */}
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(item.id);
                }}
                className="flex items-center justify-center w-5 h-5 flex-shrink-0 rounded transition-colors hover:bg-[var(--surface-hover)]"
                style={{ color: 'var(--text-muted)' }}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <div className="w-5 flex-shrink-0" />
            )}
            
            {/* Type chip - compact */}
            <span 
              className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide flex-shrink-0"
              style={{ 
                backgroundColor: typeStyle.bg, 
                color: typeStyle.color,
              }}
            >
              {typeStyle.label}
            </span>
            
            {/* Name */}
            <span 
              className={cn(
                "text-[13px] truncate",
                (isObjective || isTheme) && "font-medium"
              )}
              style={{ color: 'var(--text-primary)' }}
            >
              {item.title}
            </span>
          </div>

          {/* Progress bar column */}
          <div className="flex items-center gap-2 px-2">
            <div 
              className="flex-1 h-[5px] rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--progress-track)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, item.progress)}%`,
                  backgroundColor: getProgressBarColor(item.progress),
                }}
              />
            </div>
          </div>

          {/* Percentage column - mono-style aligned */}
          <div className="text-right pr-2">
            <span 
              className="text-[11px] font-mono tabular-nums"
              style={{ 
                color: item.progress > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
              }}
            >
              {item.progress > 0 ? `${Math.round(item.progress)}%` : '—'}
            </span>
          </div>

          {/* Status chip column - only for objectives */}
          <div className="flex items-center justify-center px-1">
            {isObjective && status && (
              <span 
                className="px-1.5 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap"
                style={{ 
                  backgroundColor: status.bg, 
                  color: status.color,
                }}
              >
                {status.label === 'On Track' ? '✓' : status.label === 'At Risk' ? '!' : status.label === 'Behind' ? '↓' : '○'}
              </span>
            )}
          </div>

          {/* Owner column */}
          <div className="flex items-center gap-1.5 px-2">
            {item.owner ? (
              <>
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold flex-shrink-0"
                  style={{ 
                    backgroundColor: 'var(--brand-primary)',
                    color: 'white',
                  }}
                >
                  {item.owner.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <span 
                  className="text-[11px] truncate"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {item.owner.name.split(' ')[0]}
                </span>
              </>
            ) : (
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>—</span>
            )}
          </div>
        </div>

        {isExpanded && hasChildren && item.children.map((child) => renderTreeItem(child, depth + 1))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <section 
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-bg)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div 
          className="px-5 py-3"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <h2 
            className="text-[15px] font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            OKR Tree
          </h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div 
            className="animate-spin rounded-full h-5 w-5 border-2 border-t-transparent" 
            style={{ borderColor: 'var(--brand-primary)', borderTopColor: 'transparent' }}
          />
        </div>
      </section>
    );
  }

  return (
    <section 
      className="rounded-xl overflow-hidden flex flex-col"
      style={{
        backgroundColor: 'var(--surface-bg)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <h2 
            className="text-[15px] font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            OKR Tree
          </h2>
          {/* Type legend - compact pills */}
          <div className="flex items-center gap-1">
            {Object.entries(typeStyles).map(([key, style]) => (
              <span 
                key={key}
                className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase"
                style={{ backgroundColor: style.bg, color: style.color }}
              >
                {style.label}
              </span>
            ))}
          </div>
        </div>
        
        {/* Search + expand */}
        <div className="flex items-center gap-2">
          {/* Premium search input */}
          <div className="relative w-48">
            <Search 
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" 
              style={{ color: 'var(--text-muted)' }} 
            />
            <input
              type="text"
              placeholder="Search OKRs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-7 pl-8 pr-7 text-[12px] rounded-md transition-all outline-none"
              style={{ 
                backgroundColor: 'var(--surface-subtle)', 
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--brand-primary)';
                e.currentTarget.style.boxShadow = '0 0 0 2px var(--ring-primary)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[var(--surface-hover)] transition-colors"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-md"
            onClick={() => navigate('/enterprise/okr-hub')}
            title="Open OKR Hub"
            style={{ 
              color: 'var(--text-muted)',
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Sticky Column Headers */}
      <div
        className="grid items-center py-2 sticky top-0 z-10 flex-shrink-0"
        style={{
          gridTemplateColumns: '1fr 140px 52px 52px 100px',
          backgroundColor: 'var(--surface-subtle)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div 
          className="text-[10px] font-semibold uppercase tracking-wider pl-4"
          style={{ color: 'var(--text-muted)' }}
        >
          Item
        </div>
        <div 
          className="text-[10px] font-semibold uppercase tracking-wider px-2"
          style={{ color: 'var(--text-muted)' }}
        >
          Progress
        </div>
        <div 
          className="text-[10px] font-semibold uppercase tracking-wider text-right pr-2"
          style={{ color: 'var(--text-muted)' }}
        >
          %
        </div>
        <div 
          className="text-[10px] font-semibold uppercase tracking-wider text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          Status
        </div>
        <div 
          className="text-[10px] font-semibold uppercase tracking-wider px-2"
          style={{ color: 'var(--text-muted)' }}
        >
          Owner
        </div>
      </div>

      {/* Tree Content - scrollable */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: '380px' }}>
        {treeData.length > 0 ? (
          treeData.map((item) => renderTreeItem(item, 0))
        ) : (
          <div className="py-10 px-5 text-center">
            <div 
              className="w-10 h-10 rounded-lg mx-auto flex items-center justify-center mb-3"
              style={{ backgroundColor: 'var(--surface-subtle)' }}
            >
              <Target className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p 
              className="text-[13px] font-medium mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              No OKRs linked
            </p>
            <p 
              className="text-[11px] max-w-[240px] mx-auto"
              style={{ color: 'var(--text-muted)' }}
            >
              Create objectives to track progress and alignment.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
