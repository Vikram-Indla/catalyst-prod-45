import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Maximize2, ChevronRight, ChevronDown, List, GitBranch, Check, AlertTriangle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOKRTree } from '@/hooks/useOKRTree';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { OKRTreeItem } from '@/hooks/useOKRTree';

// Catalyst Design System Tokens
const catalyst = {
  // Status colors
  success: '#22c55e',
  successBg: 'rgba(34,197,94,0.15)',
  successBorder: 'rgba(34,197,94,0.3)',
  warning: '#f59e0b',
  warningBg: 'rgba(245,158,11,0.15)',
  warningBorder: 'rgba(245,158,11,0.3)',
  danger: '#ef4444',
  dangerBg: 'rgba(239,68,68,0.15)',
  dangerBorder: 'rgba(239,68,68,0.3)',
  // Brand (V5 Teal)
  gold: '#0d9488',
  goldBg: 'rgba(13,148,136,0.15)',
  goldBorder: 'rgba(13,148,136,0.3)',
  // Surfaces (light mode)
  pageBg: '#faf7f2',
  cardBg: '#ffffff',
  rowHover: '#fafafa',
  parentRowBg: '#f5f5f5',
  // Text
  text1: '#171717',
  text2: '#404040',
  text3: '#737373',
  text4: '#8a8a8a',
  // Borders
  border: '#e5e5e5',
  borderStrong: '#d4d4d4',
};

export default function OKRTree() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    onTrack: true,
    atRisk: true,
    offTrack: true,
  });
  const { data: okrTree, isLoading } = useOKRTree();

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Progress-based color (semantic)
  const getProgressBarColor = (score: number) => {
    const percent = score * 100;
    if (percent >= 80) return `bg-[${catalyst.success}]`;
    if (percent >= 50) return `bg-[${catalyst.warning}]`;
    return `bg-[${catalyst.danger}]`;
  };

  const getProgressBarColorStyle = (score: number) => {
    const percent = score * 100;
    if (percent >= 80) return catalyst.success;
    if (percent >= 50) return catalyst.warning;
    return catalyst.danger;
  };

  const getScoreColor = (score: number) => {
    const percent = score * 100;
    if (percent >= 80) return catalyst.success;
    if (percent >= 50) return catalyst.warning;
    return catalyst.danger;
  };

  // Status indicator based on progress
  const getStatusIndicator = (score: number) => {
    const percent = score * 100;
    if (percent >= 80) {
      return (
        <div 
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: catalyst.successBg }}
        >
          <Check className="h-3.5 w-3.5" style={{ color: catalyst.success }} />
        </div>
      );
    }
    if (percent >= 50) {
      return (
        <div 
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: catalyst.warningBg }}
        >
          <AlertTriangle className="h-3.5 w-3.5" style={{ color: catalyst.warning }} />
        </div>
      );
    }
    return (
      <div 
        className="w-6 h-6 rounded-full flex items-center justify-center"
        style={{ backgroundColor: catalyst.dangerBg }}
      >
        <XCircle className="h-3.5 w-3.5" style={{ color: catalyst.danger }} />
      </div>
    );
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'yearly_goal': return 'Yearly Goal';
      case 'portfolio': return 'Portfolio';
      case 'program': return 'Program';
      case 'team': return 'Team';
      default: return tier;
    }
  };

  // Catalyst-compliant tier colors using gold brand color
  const getTierStyles = (tier: string, indentLevel: number) => {
    // Use gold for all tiers, with opacity variation for visual hierarchy
    const opacity = Math.max(0.6, 1 - (indentLevel * 0.15));
    return {
      backgroundColor: catalyst.goldBg,
      borderColor: catalyst.goldBorder,
      color: catalyst.gold,
      opacity,
    };
  };

  // Filter items based on progress status
  const filterItem = (item: OKRTreeItem): boolean => {
    const percent = (item.score || 0) * 100;
    if (percent >= 80 && !filters.onTrack) return false;
    if (percent >= 50 && percent < 80 && !filters.atRisk) return false;
    if (percent < 50 && !filters.offTrack) return false;
    return true;
  };

  const renderObjective = (item: OKRTreeItem, indentLevel: number) => {
    if (!filterItem(item)) return null;
    
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isSelected = selectedId === item.id;
    const paddingLeft = 16 + (indentLevel * 32);
    const tierStyles = getTierStyles(item.tier, indentLevel);

    return (
      <div key={item.id}>
        <div 
          className={cn(
            "flex items-center gap-3 py-3 px-4 cursor-pointer transition-colors",
            "border-b",
            isSelected && "ring-2 ring-inset ring-[#0d9488]",
            indentLevel === 0 ? "font-medium" : ""
          )}
          style={{ 
            paddingLeft: `${paddingLeft}px`,
            backgroundColor: isSelected 
              ? catalyst.goldBg 
              : indentLevel === 0 
                ? catalyst.parentRowBg 
                : catalyst.cardBg,
            borderColor: catalyst.border,
          }}
          onClick={() => {
            setSelectedId(item.id);
            if (hasChildren) toggleExpand(item.id);
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = catalyst.rowHover;
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = indentLevel === 0 
                ? catalyst.parentRowBg 
                : catalyst.cardBg;
            }
          }}
        >
          {/* Expand/Collapse Icon */}
          <div className="w-5 flex items-center justify-center flex-shrink-0">
            {hasChildren && (
              isExpanded ? 
                <ChevronDown className="h-4 w-4" style={{ color: catalyst.text4 }} /> : 
                <ChevronRight className="h-4 w-4" style={{ color: catalyst.text4 }} />
            )}
          </div>

          {/* Objective Icon - Gold filled square for parents, gold outlined circle for children */}
          {indentLevel === 0 ? (
            <div 
              className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: catalyst.gold }}
            >
              <GitBranch className="h-3.5 w-3.5 text-white" />
            </div>
          ) : (
            <span 
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              style={{ borderColor: catalyst.gold }}
            >
              <span 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: catalyst.gold }}
              />
            </span>
          )}

          {/* Tier Badge + ID + Title */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span 
              className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap border"
              style={{
                backgroundColor: tierStyles.backgroundColor,
                borderColor: tierStyles.borderColor,
                color: tierStyles.color,
                opacity: tierStyles.opacity,
              }}
            >
              {getTierLabel(item.tier)}
            </span>
            <span className="text-sm font-normal" style={{ color: catalyst.text4 }}>
              #{item.numericId}
            </span>
            <span 
              className={cn(
                "text-[14px] truncate",
                indentLevel === 0 ? "font-semibold" : "font-normal"
              )}
              style={{ color: indentLevel === 0 ? catalyst.text1 : catalyst.text2 }}
            >
              {item.title}
            </span>
          </div>

          {/* Key Results Progress */}
          <div className="w-48 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div 
                className="flex-1 h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: catalyst.border }}
              >
                <div 
                  className="h-full transition-all rounded-full"
                  style={{ 
                    width: `${item.keyResultsProgress}%`,
                    backgroundColor: getProgressBarColorStyle(item.score || 0),
                  }}
                />
              </div>
              <span 
                className={cn(
                  "text-[14px] w-10 text-right tabular-nums",
                  indentLevel === 0 ? "font-semibold" : "font-medium"
                )}
                style={{ color: indentLevel === 0 ? catalyst.text1 : catalyst.text2 }}
              >
                {Math.round(item.keyResultsProgress)}%
              </span>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="w-12 flex justify-center flex-shrink-0">
            {getStatusIndicator(item.score || 0)}
          </div>

          {/* Score */}
          <div className="w-16 text-right flex-shrink-0">
            <span 
              className="text-sm font-semibold"
              style={{ color: getScoreColor(item.score || 0) }}
            >
              {item.score?.toFixed(1) || '0.0'}
            </span>
          </div>

          {/* Owner Avatar */}
          <div className="w-24 flex items-center gap-2 flex-shrink-0">
            {item.owner?.name ? (
              <>
                <Avatar className="h-7 w-7">
                  <AvatarImage src={item.owner.avatar} />
                  <AvatarFallback 
                    className="text-[10px] font-semibold"
                    style={{ 
                      backgroundColor: catalyst.border, 
                      color: catalyst.text2 
                    }}
                  >
                    {item.owner.initials}
                  </AvatarFallback>
                </Avatar>
                <span 
                  className="text-xs truncate"
                  style={{ color: catalyst.text2 }}
                >
                  {item.owner.name.split(' ')[0]}
                </span>
              </>
            ) : (
              <span 
                className="text-xs italic"
                style={{ color: catalyst.text4 }}
              >
                Unassigned
              </span>
            )}
          </div>
        </div>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <>
            {item.children.map((child) => renderObjective(child, indentLevel + 1))}
          </>
        )}
      </div>
    );
  };

  const renderAllObjectives = (items: OKRTreeItem[], indentLevel: number = 0): (JSX.Element | null)[] => {
    return items.map((item) => {
      const rendered = renderObjective(item, indentLevel);
      if (!rendered) return null;
      return rendered;
    });
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: catalyst.pageBg }}>
      {/* Header */}
      <div 
        className="h-[72px] border-b flex items-center justify-between px-6 flex-shrink-0"
        style={{ backgroundColor: catalyst.cardBg, borderColor: catalyst.border }}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <GitBranch className="h-5 w-5" style={{ color: catalyst.gold }} />
            <h1 className="text-lg font-semibold" style={{ color: catalyst.text1 }}>
              OKR Tree
            </h1>
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-2 ml-6">
            <span className="text-xs font-medium" style={{ color: catalyst.text4 }}>
              Filter:
            </span>
            <button
              onClick={() => setFilters(f => ({ ...f, onTrack: !f.onTrack }))}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border"
              )}
              style={{
                backgroundColor: filters.onTrack ? catalyst.successBg : catalyst.parentRowBg,
                color: filters.onTrack ? catalyst.success : catalyst.text4,
                borderColor: filters.onTrack ? catalyst.successBorder : catalyst.border,
              }}
            >
              <span 
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: catalyst.success }}
              />
              On Track
            </button>
            <button
              onClick={() => setFilters(f => ({ ...f, atRisk: !f.atRisk }))}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border"
              )}
              style={{
                backgroundColor: filters.atRisk ? catalyst.warningBg : catalyst.parentRowBg,
                color: filters.atRisk ? catalyst.warning : catalyst.text4,
                borderColor: filters.atRisk ? catalyst.warningBorder : catalyst.border,
              }}
            >
              <span 
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: catalyst.warning }}
              />
              At Risk
            </button>
            <button
              onClick={() => setFilters(f => ({ ...f, offTrack: !f.offTrack }))}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border"
              )}
              style={{
                backgroundColor: filters.offTrack ? catalyst.dangerBg : catalyst.parentRowBg,
                color: filters.offTrack ? catalyst.danger : catalyst.text4,
                borderColor: filters.offTrack ? catalyst.dangerBorder : catalyst.border,
              }}
            >
              <span 
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: catalyst.danger }}
              />
              Off Track
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-64">
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
              style={{ color: catalyst.text4 }}
            />
            <Input
              placeholder="Search objectives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
              style={{ 
                backgroundColor: catalyst.cardBg,
                borderColor: catalyst.border,
                color: catalyst.text1,
              }}
            />
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/enterprise/okr-hub')}
            style={{ borderColor: catalyst.border, color: catalyst.text2 }}
          >
            <List className="h-4 w-4 mr-2" />
            List View
          </Button>

          <Button 
            variant="ghost" 
            size="icon"
            style={{ color: catalyst.text4 }}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <p 
          className="text-xs italic mb-4"
          style={{ color: catalyst.text4 }}
        >
          Only work items tied to this Snapshot or its Quarters are shown here
        </p>

        {/* Tree Content */}
        <Card 
          className="overflow-hidden shadow-sm"
          style={{ 
            backgroundColor: catalyst.cardBg, 
            borderColor: catalyst.border 
          }}
        >
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : okrTree && okrTree.length > 0 ? (
            <div>
              {/* Header Row */}
              <div 
                className="flex items-center gap-3 py-3 px-4 border-b font-medium sticky top-0 z-10"
                style={{ 
                  backgroundColor: catalyst.parentRowBg, 
                  borderColor: catalyst.border 
                }}
              >
                <div className="w-5 flex-shrink-0" />
                <div className="w-6 flex-shrink-0" />
                <div 
                  className="flex-1 text-[11px] font-semibold uppercase tracking-[0.05em]"
                  style={{ color: catalyst.text3 }}
                >
                  Item
                </div>
                <div 
                  className="w-48 text-[11px] font-semibold uppercase tracking-[0.05em] flex-shrink-0"
                  style={{ color: catalyst.text3 }}
                >
                  Progress
                </div>
                <div 
                  className="w-12 text-[11px] font-semibold uppercase tracking-[0.05em] text-center flex-shrink-0"
                  style={{ color: catalyst.text3 }}
                >
                  Status
                </div>
                <div 
                  className="w-16 text-[11px] font-semibold uppercase tracking-[0.05em] text-right flex-shrink-0"
                  style={{ color: catalyst.text3 }}
                >
                  Score
                </div>
                <div 
                  className="w-24 text-[11px] font-semibold uppercase tracking-[0.05em] text-right flex-shrink-0"
                  style={{ color: catalyst.text3 }}
                >
                  Owner
                </div>
              </div>
              {/* Tree Items */}
              {renderAllObjectives(okrTree, 0)}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p style={{ color: catalyst.text3 }} className="mb-2">
                  No OKR data available
                </p>
                <p className="text-sm" style={{ color: catalyst.text4 }}>
                  Please select a snapshot to view objectives
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
