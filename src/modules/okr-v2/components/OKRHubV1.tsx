// ═══════════════════════════════════════════════════════════════════════════════
// OKR Hub V1 — Simple Objectives List View
// A flat list/table of Objectives for Strategic Backlog → Objectives tab
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, User, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useOKRStrategicData } from '../hooks/useOKRStrategicData';
import { getStatusLabel, getStatusColor } from '../lib/okrMetrics';
import type { Objective, KeyResult, Theme, StatusCode } from '../lib/okrTypes';
import { AnalyticsDrawerContent } from './StrategyCockpit/AnalyticsDrawerContent';

interface OKRHubV1Props {
  snapshotId?: string;
}

const GRID_COLUMNS = "1fr 140px 100px 100px 80px 80px";

// ─────────────────────────────────────────────────────────────────────────────────
// STATUS BADGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusCode }) {
  const color = getStatusColor(status);
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
      style={{
        backgroundColor: `${color}10`,
        borderColor: `${color}40`,
        color: color,
      }}
    >
      {getStatusLabel(status)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// KEY RESULT ROW
// ─────────────────────────────────────────────────────────────────────────────────

function KeyResultRow({ kr }: { kr: KeyResult }) {
  return (
    <div
      className="grid items-center bg-muted/30 border-b border-border/50 hover:bg-muted/50 transition-colors"
      style={{ gridTemplateColumns: GRID_COLUMNS, padding: '8px 12px' }}
    >
      {/* KR Name with indent */}
      <div className="flex items-center gap-2 min-w-0 overflow-hidden" style={{ paddingLeft: '32px' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-brand-gold flex-shrink-0" />
        <span className="truncate text-sm text-muted-foreground">{kr.name}</span>
      </div>

      {/* Owner */}
      <div className="flex items-center gap-1.5 overflow-hidden">
        {kr.ownerName ? (
          <>
            <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="truncate text-xs text-muted-foreground">{kr.ownerName}</span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* Status */}
      <div className="overflow-hidden whitespace-nowrap">
        <StatusBadge status={kr.status} />
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 overflow-hidden">
        <Progress value={Math.min(kr.progress, 100)} className="h-1.5 flex-1 max-w-16" />
        <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(kr.progress)}%</span>
      </div>

      {/* Empty cells for KRs / Work Items columns */}
      <div className="text-center text-xs text-muted-foreground">—</div>
      <div className="text-center text-xs text-muted-foreground">
        {kr.workItems?.length || 0}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// OBJECTIVE ROW
// ─────────────────────────────────────────────────────────────────────────────────

interface ObjectiveRowProps {
  objective: Objective;
  theme?: Theme;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}

function ObjectiveRow({ objective, theme, isExpanded, onToggle, onSelect }: ObjectiveRowProps) {
  const themeColor = theme?.color || 'hsl(var(--brand-gold))';
  const krCount = objective.keyResults?.length || 0;
  const workItemCount = objective.keyResults?.reduce((sum, kr) => sum + (kr.workItems?.length || 0), 0) || 0;

  return (
    <>
      <div
        className="grid items-center bg-card border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
        style={{ gridTemplateColumns: GRID_COLUMNS, padding: '8px 12px' }}
        onClick={onSelect}
      >
        {/* Objective Name with theme tag */}
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="p-0.5 hover:bg-muted rounded flex-shrink-0"
          >
            {krCount > 0 ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <div className="h-4 w-4" />
            )}
          </button>
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: themeColor }}
          />
          <span className="truncate text-sm font-medium text-foreground">{objective.name}</span>
          {theme && (
            <span
              className="text-xs px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0"
              style={{
                backgroundColor: `${themeColor}15`,
                color: themeColor,
              }}
            >
              {theme.name}
            </span>
          )}
        </div>

        {/* Owner */}
        <div className="flex items-center gap-1.5 overflow-hidden">
          {objective.ownerName ? (
            <>
              <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate text-xs text-foreground">{objective.ownerName}</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        {/* Status */}
        <div className="overflow-hidden whitespace-nowrap">
          <StatusBadge status={objective.status} />
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 overflow-hidden">
          <Progress value={Math.min(objective.progress, 100)} className="h-1.5 flex-1 max-w-16" />
          <span className="text-xs text-foreground w-8 text-right">{Math.round(objective.progress)}%</span>
        </div>

        {/* KRs count */}
        <div className="text-center">
          <Badge variant="outline" className="text-xs">
            {krCount} KRs
          </Badge>
        </div>

        {/* Work Items count */}
        <div className="text-center">
          <Badge variant="outline" className="text-xs">
            {workItemCount}
          </Badge>
        </div>
      </div>

      {/* Expanded Key Results */}
      {isExpanded && objective.keyResults?.map((kr) => (
        <KeyResultRow key={kr.id} kr={kr} />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

export function OKRHubV1({ snapshotId }: OKRHubV1Props) {
  const { data, isLoading, error } = useOKRStrategicData(snapshotId);
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());
  const [selectedObjective, setSelectedObjective] = useState<Objective | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Flatten objectives from all themes
  const objectivesWithThemes = useMemo(() => {
    if (!data?.themes) return [];
    const result: { objective: Objective; theme: Theme }[] = [];
    data.themes.forEach((theme) => {
      theme.objectives?.forEach((obj) => {
        result.push({ objective: obj, theme });
      });
    });
    return result;
  }, [data?.themes]);

  const toggleExpanded = (objectiveId: string) => {
    setExpandedObjectives((prev) => {
      const next = new Set(prev);
      if (next.has(objectiveId)) {
        next.delete(objectiveId);
      } else {
        next.add(objectiveId);
      }
      return next;
    });
  };

  const handleSelectObjective = (objective: Objective) => {
    setSelectedObjective(objective);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedObjective(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading objectives...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-destructive">
        Failed to load objectives
      </div>
    );
  }

  if (objectivesWithThemes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-lg font-medium mb-2">No objectives found</p>
        <p className="text-sm">Create objectives to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {/* Header */}
        <div
          className="grid items-center bg-muted/50 border-b border-border font-semibold text-muted-foreground text-xs uppercase tracking-wider"
          style={{ gridTemplateColumns: GRID_COLUMNS, padding: '12px' }}
        >
          <div>Objective</div>
          <div>Owner</div>
          <div>Status</div>
          <div>Progress</div>
          <div className="text-center">KRs</div>
          <div className="text-center">Work</div>
        </div>

        {/* Rows */}
        <div>
          {objectivesWithThemes.map(({ objective, theme }) => (
            <ObjectiveRow
              key={objective.id}
              objective={objective}
              theme={theme}
              isExpanded={expandedObjectives.has(objective.id)}
              onToggle={() => toggleExpanded(objective.id)}
              onSelect={() => handleSelectObjective(objective)}
            />
          ))}
        </div>
      </div>

      {/* Objective Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={(open) => !open && handleCloseDrawer()}>
        <SheetContent side="right" className="w-screen sm:w-[540px] sm:max-w-[540px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Objective Details</SheetTitle>
          </SheetHeader>
          {selectedObjective && data?.themes && (
            <AnalyticsDrawerContent
              selectedItem={selectedObjective}
              themes={data.themes}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
