import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    if (!status) return <Badge variant="secondary">New</Badge>;
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      'funnel': 'secondary',
      'backlog': 'outline',
      'implementing': 'default',
      'validating': 'default',
      'deploying': 'default',
      'done': 'outline',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status.replace(/_/g, ' ')}</Badge>;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={selectedIds.length === features.length && features.length > 0}
              onCheckedChange={toggleSelectAll}
            />
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => onSortChange('display_id', 'asc')}
            >
              ID
              <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          </TableHead>
          <TableHead>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => onSortChange('name', 'asc')}
            >
              Name
              <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          </TableHead>
          <TableHead>Epic</TableHead>
          <TableHead>Program</TableHead>
          <TableHead>Team</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Health</TableHead>
          <TableHead>Points</TableHead>
          <TableHead>Progress</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {features.map((feature) => (
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
            <TableCell className="font-mono text-sm">
              {feature.display_id || feature.id.slice(0, 8)}
            </TableCell>
            <TableCell className="font-medium">{feature.name}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {(feature as any).epics?.name || '-'}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {(feature as any).programs?.name || '-'}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {(feature as any).teams?.name || '-'}
            </TableCell>
            <TableCell>{getStatusBadge(feature.status)}</TableCell>
            <TableCell>
              <HealthBadge health={(feature.health as 'green' | 'yellow' | 'red') || 'green'} />
            </TableCell>
            <TableCell>{feature.estimate_points || 0}</TableCell>
            <TableCell>
              <div className="w-24">
                <div className="text-xs text-muted-foreground mb-1">
                  {feature.progress_pct || 0}%
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${feature.progress_pct || 0}%` }}
                  />
                </div>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
