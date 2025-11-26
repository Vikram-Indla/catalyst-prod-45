import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChevronDown, ChevronRight, Search, Settings, Maximize2 } from 'lucide-react';
import { Objective, ObjectiveLevel, mockObjectives } from '@/data/strategyMockData';

interface OkrTreeProps {
  selectedSnapshot: string;
  filterLevel?: ObjectiveLevel;
  filterPI?: string;
  onObjectiveClick: (objective: Objective) => void;
}

export function OkrTree({ selectedSnapshot, filterLevel, filterPI, onObjectiveClick }: OkrTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set([139, 3593, 3595]));
  const [searchQuery, setSearchQuery] = useState('');

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  // Filter objectives
  const filteredObjectives = mockObjectives.filter((obj) => {
    if (obj.snapshotId !== selectedSnapshot) return false;
    if (filterLevel && obj.level !== filterLevel) return false;
    if (filterPI && !obj.programIncrementIds.includes(filterPI)) return false;
    if (searchQuery && !obj.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Build hierarchy
  const rootObjectives = filteredObjectives.filter((obj) => !obj.parentId);

  const getChildren = (parentId: number) => {
    return filteredObjectives.filter((obj) => obj.parentId === parentId);
  };

  const getLevelLabel = (level: ObjectiveLevel) => {
    const labels = {
      STRATEGIC: "Strategic Goals",
      PORTFOLIO: "Portfolio Objectives",
      PROGRAM: "Program Objectives",
      TEAM: "Team Objectives",
    };
    return labels[level];
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 0.7) return 'bg-green-500';
    if (progress >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const renderObjective = (objective: Objective, depth: number = 0) => {
    const hasChildren = getChildren(objective.id).length > 0;
    const isExpanded = expandedIds.has(objective.id);
    const children = hasChildren ? getChildren(objective.id) : [];

    return (
      <div key={objective.id}>
        {/* Objective Row */}
        <div
          className={`flex items-center py-3 px-2 border-b hover:bg-accent cursor-pointer ${
            depth > 0 ? `ml-${depth * 8}` : ''
          }`}
          style={{ paddingLeft: `${depth * 32 + 8}px` }}
          onClick={() => onObjectiveClick(objective)}
        >
          {/* Expander & Level */}
          <div className="flex items-center gap-2 min-w-[400px]">
            {hasChildren && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(objective.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            {!hasChildren && <div className="w-6" />}

            <div className="flex items-center gap-2">
              {depth === 0 && (
                <span className="text-xs font-semibold px-2 py-1 rounded bg-muted">
                  {getLevelLabel(objective.level)}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{objective.id}</span>
              <span className="text-sm font-medium text-primary hover:underline">
                {objective.title}
              </span>
            </div>
          </div>

          {/* Key Results Progress */}
          <div className="flex-1 px-4">
            <Progress
              value={objective.keyResultsProgress * 100}
              className="h-2"
            />
          </div>

          {/* Score */}
          <div className="w-20 text-center">
            <span className="text-lg font-semibold">{objective.score.toFixed(1)}</span>
          </div>

          {/* Owner */}
          <div className="w-24 flex justify-center">
            <Avatar className="h-8 w-8" style={{ backgroundColor: objective.owner.avatarColor }}>
              <AvatarFallback className="text-white text-xs">
                {objective.owner.initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Children */}
        {isExpanded && children.map((child) => renderObjective(child, depth + 1))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <CardTitle>OKR Tree</CardTitle>
          <p className="text-xs text-muted-foreground">
            Only work items tied to this Snapshot or its Program Increments are shown here
          </p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Header Row */}
        <div className="flex items-center py-2 px-2 bg-muted border-b font-semibold text-sm">
          <div className="min-w-[400px]">Objective</div>
          <div className="flex-1 px-4">Key Results Progress</div>
          <div className="w-20 text-center">Score</div>
          <div className="w-24 text-center">Owner</div>
        </div>

        {/* Tree Content */}
        <div className="max-h-[600px] overflow-y-auto">
          {rootObjectives.map((objective) => renderObjective(objective))}
        </div>
      </CardContent>
    </Card>
  );
}
