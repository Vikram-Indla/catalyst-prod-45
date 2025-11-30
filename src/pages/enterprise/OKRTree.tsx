import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Settings, Maximize2, ChevronRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useOKRTree } from '@/hooks/useOKRTree';
import { Skeleton } from '@/components/ui/skeleton';
import type { OKRTreeItem } from '@/hooks/useOKRTree';

export default function OKRTree() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
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

  const getProgressBarColor = (score: number) => {
    if (score >= 0.7) return 'bg-success';
    if (score >= 0.4) return 'bg-warning';
    return 'bg-destructive';
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return 'text-success';
    if (score >= 0.4) return 'text-warning';
    return 'text-destructive';
  };

  const getLevelLabel = (tier: string) => {
    switch (tier) {
      case 'strategic_goal': return 'Strategic Goals';
      case 'portfolio': return 'Portfolio Objectives';
      case 'program': return 'Program Objectives';
      case 'team': return 'Team Objectives';
      default: return tier;
    }
  };

  const renderObjective = (item: OKRTreeItem, indentLevel: number) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const paddingLeft = 16 + (indentLevel * 32);

    return (
      <div key={item.id}>
        <div 
          className="flex items-center gap-3 py-2 px-4 hover:bg-muted/30 cursor-pointer border-b border-border/40"
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => hasChildren && toggleExpand(item.id)}
        >
          {/* Expand/Collapse Icon */}
          <div className="w-5 flex items-center justify-center flex-shrink-0">
            {hasChildren && (
              isExpanded ? 
                <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* ID + Title */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="text-sm text-muted-foreground font-normal">{item.numericId}</span>
            <span className="text-sm text-primary font-normal truncate">{item.title}</span>
          </div>

          {/* Key Results Progress */}
          <div className="w-48 flex-shrink-0">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${getProgressBarColor(item.score || 0)}`}
                style={{ width: `${item.keyResultsProgress}%` }}
              />
            </div>
          </div>

          {/* Score */}
          <div className="w-20 text-right flex-shrink-0">
            <span className={`text-sm font-medium ${getScoreColor(item.score || 0)}`}>
              {item.score?.toFixed(1) || '0.0'}
            </span>
          </div>

          {/* Owner Avatar */}
          <div className="w-16 flex justify-center flex-shrink-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={item.owner.avatar} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {item.owner.initials}
              </AvatarFallback>
            </Avatar>
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

  const renderLevel = (items: OKRTreeItem[], tier: string, indentLevel: number) => {
    const levelItems = items.filter(item => item.tier === tier);
    if (levelItems.length === 0) return null;

    const paddingLeft = 16 + (indentLevel * 32);
    const bgColor = indentLevel % 2 === 0 ? 'bg-muted/20' : 'bg-background';

    return (
      <div key={tier} className={bgColor}>
        {/* Level Header Row */}
        <div 
          className="flex items-center gap-3 py-3 px-4 border-b border-border font-semibold"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          <div className="w-5 flex-shrink-0" />
          <div className="flex-1 text-sm">{getLevelLabel(tier)}</div>
          <div className="w-48 text-xs text-muted-foreground text-center flex-shrink-0">
            Key Results<br/>Progress
          </div>
          <div className="w-20 text-xs text-muted-foreground text-right flex-shrink-0">Score</div>
          <div className="w-16 text-xs text-muted-foreground text-center flex-shrink-0">Owner</div>
        </div>

        {/* Level Items */}
        {levelItems.map((item) => (
          <div key={item.id}>
            {renderObjective(item, indentLevel)}
            {/* Render child levels recursively if item is expanded */}
            {expandedItems.has(item.id) && item.children.length > 0 && (
              <>
                {['portfolio', 'program', 'team'].map((childTier) => 
                  renderLevel(item.children, childTier, indentLevel + 1)
                )}
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold mb-1">OKR Tree</h1>
        <p className="text-xs sm:text-sm text-muted-foreground italic">
          Only work items tied to this Snapshot or its Program Increments are shown here
        </p>
      </div>

      {/* Toolbar */}
      <Card className="mb-3 sm:mb-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Tree Content */}
      <Card className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : okrTree && okrTree.length > 0 ? (
          <div className="border-b border-border">
            {renderLevel(okrTree, 'strategic_goal', 0)}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">No OKR data available</p>
              <p className="text-sm text-muted-foreground">Please select a snapshot to view objectives</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
