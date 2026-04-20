/**
 * FeatureTable — Slim Framework
 * 
 * Columns (essential only):
 * - ID, Name, Epic, Status, Health, Blocked (icon), Progress (story-driven), Owner
 * 
 * REMOVED: Points, WSJF, PI/Iteration, Budget, Program, Team
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { Progress } from '@/components/ui/progress';
import { ArrowUpDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMultipleFeatureProgress } from '@/hooks/useFeatureProgress';
import type { Feature } from '@/types/feature.types';

interface FeatureTableProps {
  features: Feature[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onRowClick: (featureId: string) => void;
  onSortChange: (column: string, direction: 'asc' | 'desc') => void;
}

export function FeatureTable({
  features,
  selectedIds,
  onSelectionChange,
  onRowClick,
  onSortChange,
}: FeatureTableProps) {
  // Batch fetch progress for all features
  const { data: progressMap } = useMultipleFeatureProgress(features.map(f => f.id));

  const toggleSelectAll = () => {
    if (selectedIds.length === features.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(features.map(f => f.id));
    }
  };

  const toggleRowSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Lozenge appearance="default">New</Lozenge>;
    const appearances: Record<string, LozengeAppearance> = {
      'funnel': 'default',
      'analyzing': 'default',
      'backlog': 'default',
      'implementing': 'inprogress',
      'done': 'success',
    };
    const labels: Record<string, string> = {
      'funnel': 'Funnel',
      'analyzing': 'Analyzing',
      'backlog': 'Backlog',
      'implementing': 'Implementing',
      'done': 'Done',
    };
    return <Lozenge appearance={appearances[status] || 'default'}>{labels[status] || status}</Lozenge>;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={selectedIds.length === features.length && features.length > 0}
              onCheckedChange={toggleSelectAll}
            />
          </TableHead>
          <TableHead className="w-24">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 -ml-2"
              onClick={() => onSortChange('display_id', 'asc')}
            >
              ID
              <ArrowUpDown className="ml-1 h-3 w-3" />
            </Button>
          </TableHead>
          <TableHead className="min-w-[200px]">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 -ml-2"
              onClick={() => onSortChange('name', 'asc')}
            >
              Name
              <ArrowUpDown className="ml-1 h-3 w-3" />
            </Button>
          </TableHead>
          <TableHead>Epic</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Health</TableHead>
          <TableHead className="w-10 text-center">
            <span title="Blocked">🚫</span>
          </TableHead>
          <TableHead className="w-32">Progress</TableHead>
          <TableHead>Owner</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {features.map((feature) => {
          const progress = progressMap?.[feature.id];
          return (
            <TableRow
              key={feature.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick(feature.id)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.includes(feature.id)}
                  onCheckedChange={() => toggleRowSelection(feature.id)}
                />
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {feature.display_id || feature.id.slice(0, 8)}
              </TableCell>
              <TableCell className="font-medium">{feature.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {(feature as any).epics?.name || '-'}
              </TableCell>
              <TableCell>{getStatusBadge(feature.status)}</TableCell>
              <TableCell>
                <HealthBadge health={(feature.health as 'green' | 'yellow' | 'red') || 'green'} />
              </TableCell>
              <TableCell className="text-center">
                {feature.blocked && (
                  <AlertCircle className="h-4 w-4 text-destructive mx-auto" />
                )}
              </TableCell>
              <TableCell>
                {progress ? (
                  <div className="w-full space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{progress.completedStories}/{progress.totalStories}</span>
                      <span>{progress.completionPercent}%</span>
                    </div>
                    <Progress value={progress.completionPercent} className="h-1.5" />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {(feature as any).owner?.full_name || '-'}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
