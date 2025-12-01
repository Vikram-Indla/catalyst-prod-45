import { useState } from 'react';
import { Search, Settings, Maximize2, ChevronRight, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOKRTree } from '@/hooks/useOKRTree';
import { OKRTreeColumnsDialog, ColumnConfig } from './OKRTreeColumnsDialog';

interface OkrTreeProps {
  selectedSnapshot: string;
  onObjectiveClick: (objective: any) => void;
}

function getScoreColor(score: number | null): string {
  if (score === null) return 'hsl(var(--okr-score-none))';
  if (score >= 0.7) return 'hsl(var(--okr-score-high))';
  if (score >= 0.4) return 'hsl(var(--okr-score-medium))';
  return 'hsl(var(--okr-score-low))';
}

function formatScore(score: number | null): string {
  if (score === null) return 'N/S';
  return score.toFixed(1);
}

function getLevelLabel(tier: string): string {
  const labels = {
    // Strategic Goals Hierarchy
    'north_star': 'North Star',
    'long_term_goal': 'Long Term Goal',
    'long_term_strategy': 'Long Term Strategy',
    'yearly_goal': 'Yearly Goal',
    // Objectives Hierarchy
    'portfolio': 'Portfolio Objective',
    'program': 'Program Objective',
    'team': 'Team Objective'
  };
  return labels[tier as keyof typeof labels] || tier;
}

function getTierColor(tier: string): string {
  // Strategic Goals - Purple shades
  if (tier === 'north_star') return 'bg-purple-600 text-white';
  if (tier === 'long_term_goal') return 'bg-purple-500 text-white';
  if (tier === 'long_term_strategy') return 'bg-purple-400 text-white';
  if (tier === 'yearly_goal') return 'bg-purple-300 text-gray-900';
  // Objectives - Blue shades
  if (tier === 'portfolio') return 'bg-blue-600 text-white';
  if (tier === 'program') return 'bg-blue-400 text-gray-900';
  if (tier === 'team') return 'bg-blue-300 text-gray-900';
  return 'bg-gray-500 text-white';
}

export function OkrTree({ selectedSnapshot, onObjectiveClick }: OkrTreeProps) {
  const { data: treeData = [], isLoading } = useOKRTree(selectedSnapshot);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ColumnConfig>({
    objective: true,
    keyResultsProgress: true,
    score: true,
    owner: true,
  });

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const renderObjective = (item: any, depth: number = 0) => {
    const hasChildren = item.children.length > 0;
    const isExpanded = expandedIds.has(item.id);
    const indentPx = depth * 32;

    return (
      <div key={item.id}>
        <div
          className="grid items-center py-2.5 px-4 border-b hover:bg-muted/20 cursor-pointer transition-colors"
          style={{
            gridTemplateColumns: '1fr 180px 100px 100px',
            paddingLeft: `${indentPx + 16}px`
          }}
          onClick={() => {
            console.log('🎯 OkrTree: Objective clicked:', { id: item.id, title: item.title, item });
            onObjectiveClick(item);
          }}
        >
          <div className="flex items-center gap-3">
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(item.id);
                }}
                className="flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground transition-transform flex-shrink-0"
                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-4 flex-shrink-0" />
            )}
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getTierColor(item.tier)}`}>
              {getLevelLabel(item.tier)}
            </span>
            <span className="text-sm text-muted-foreground font-medium min-w-[32px] flex-shrink-0">#{item.numericId}</span>
            <span className="text-sm text-blue-600 hover:underline font-normal">{item.title}</span>
          </div>

          <div className="flex justify-center px-3">
            <div className="w-full max-w-[140px] h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${item.keyResultsProgress}%`,
                  backgroundColor: getScoreColor(item.score)
                }}
              />
            </div>
          </div>

          <div className="text-center">
            <span className="text-sm font-semibold" style={{ color: getScoreColor(item.score) }}>
              {formatScore(item.score)}
            </span>
          </div>

          <div className="flex justify-center">
            <Avatar className="h-8 w-8 border border-border">
              <AvatarImage src={item.owner.avatar} alt={item.owner.name} />
              <AvatarFallback className="text-xs bg-blue-900 text-white font-bold">
                {item.owner.initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {isExpanded && hasChildren && item.children.map((child: any) => renderObjective(child, depth + 1))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="border rounded-lg">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border rounded-lg">
      <CardHeader className="pb-3 space-y-3">
        <CardTitle className="text-xl font-semibold text-foreground">OKR Tree</CardTitle>
        <p className="text-sm text-muted-foreground italic">
          Only work items tied to this Snapshot or its Program Increments are shown here
        </p>
        <div className="flex items-center justify-between pt-1">
          <div className="relative flex-1 max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => setColumnsDialogOpen(true)}
              title="Configure columns"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="border rounded-md overflow-hidden bg-card">
          {/* Column Headers */}
          <div
            className="grid items-center py-2.5 px-4 bg-muted/30 border-b font-semibold text-sm sticky top-0 z-10"
            style={{
              gridTemplateColumns: '1fr 180px 100px 100px',
              paddingLeft: '16px'
            }}
          >
            <div className="text-foreground/90">Objective</div>
            <div className="text-center text-foreground/80">Key Results<br />Progress</div>
            <div className="text-center text-foreground/80">Score</div>
            <div className="text-center text-foreground/80">Owner</div>
          </div>

          {/* Tree Content */}
          {treeData.length > 0 ? (
            treeData.map((item) => renderObjective(item, 0))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No objectives found for this snapshot
            </div>
          )}
        </div>
      </CardContent>

      <OKRTreeColumnsDialog
        open={columnsDialogOpen}
        onOpenChange={setColumnsDialogOpen}
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
      />
    </Card>
  );
}
