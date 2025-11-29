import { useState } from 'react';
import { Search, Settings, Maximize2, ChevronRight, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useOKRTree } from '@/hooks/useOKRTree';

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
    'strategic_goal': 'Strategic Goals',
    'portfolio': 'Portfolio Objectives',
    'program': 'Program Objectives',
    'team': 'Team Objectives'
  };
  return labels[tier as keyof typeof labels] || tier;
}

export function OkrTree({ selectedSnapshot, onObjectiveClick }: OkrTreeProps) {
  const { data: treeData = [], isLoading } = useOKRTree(selectedSnapshot);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const renderObjective = (item: any, depth: number = 0, parentTier?: string) => {
    const hasChildren = item.children.length > 0;
    const isExpanded = expandedIds.has(item.id);
    const showLevelHeader = !parentTier || parentTier !== item.tier;
    const indentPx = depth * 24;

    return (
      <div key={item.id}>
        {showLevelHeader && (
          <div
            className="grid items-center py-3 px-4 bg-muted/50 border-b font-semibold text-sm"
            style={{
              gridTemplateColumns: '1fr 140px 80px 80px',
              paddingLeft: `${indentPx + 16}px`
            }}
          >
            <div>{getLevelLabel(item.tier)}</div>
            <div className="text-center">Key Results<br />Progress</div>
            <div className="text-center">Score</div>
            <div className="text-center">Owner</div>
          </div>
        )}

        <div
          className="grid items-center py-3 px-4 border-b hover:bg-muted/30 cursor-pointer transition-colors"
          style={{
            gridTemplateColumns: '1fr 140px 80px 80px',
            paddingLeft: `${indentPx + 16}px`
          }}
          onClick={() => onObjectiveClick(item)}
        >
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(item.id);
                }}
                className="flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-foreground transition-transform"
                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              >
                <ChevronRight className="w-4 w-4" />
              </button>
            ) : (
              <div className="w-5" />
            )}
            <span className="text-sm text-muted-foreground min-w-[48px]">{item.numericId}</span>
            <span className="text-sm text-primary hover:underline">{item.title}</span>
          </div>

          <div className="flex justify-center px-2">
            <div className="w-full max-w-[120px] h-2 bg-border rounded-full overflow-hidden">
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
            <Avatar className="h-8 w-8" style={{ backgroundColor: item.owner.avatarColor || '#6554C0' }}>
              <AvatarFallback className="text-white text-xs font-semibold">
                {item.owner.initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {isExpanded && item.children.map((child: any) => renderObjective(child, depth + 1, item.tier))}
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
      <CardHeader className="pb-4">
        <div className="space-y-2">
          <CardTitle className="text-xl font-semibold">OKR Tree</CardTitle>
          <div className="flex items-start gap-2 bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-md p-3">
            <Info className="h-4 w-4 text-primary dark:text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-foreground dark:text-foreground">
              Only work items tied to this Snapshot or its Program Increments are shown here
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="relative flex-1 max-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md overflow-hidden">
          {treeData.length > 0 ? (
            treeData.map((item) => renderObjective(item, 0))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No objectives found for this snapshot
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
