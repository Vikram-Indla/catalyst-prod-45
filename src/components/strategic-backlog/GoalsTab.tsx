import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Link2, Unlink, ChevronRight, Flag } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { StrategicGoal, SnapshotStrategyLinks } from '@/types/strategicBacklog';
import { GoalDrawer } from './GoalDrawer';
import { CreateGoalDialog } from './CreateGoalDialog';
import { useUpsertSnapshotLinks } from '@/hooks/useStrategicBacklog';
import { format } from 'date-fns';

interface GoalsTabProps {
  goals: StrategicGoal[];
  links: SnapshotStrategyLinks | null;
  snapshotId: string;
  isArchived: boolean;
}

export function GoalsTab({ goals, links, snapshotId, isArchived }: GoalsTabProps) {
  const [selectedGoal, setSelectedGoal] = useState<StrategicGoal | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const upsertLinks = useUpsertSnapshotLinks();

  const linkedGoalIds = links?.goal_ids || [];

  const handleLink = async (id: string) => {
    if (isArchived) return;
    const newIds = [...linkedGoalIds, id];
    await upsertLinks.mutateAsync({
      snapshot_id: snapshotId,
      goal_ids: newIds,
      mission_ids: links?.mission_ids || [],
      vision_ids: links?.vision_ids || [],
      value_ids: links?.value_ids || [],
      theme_ids: links?.theme_ids || [],
    });
  };

  const handleUnlink = async (id: string) => {
    if (isArchived) return;
    await upsertLinks.mutateAsync({
      snapshot_id: snapshotId,
      goal_ids: linkedGoalIds.filter(i => i !== id),
      mission_ids: links?.mission_ids || [],
      vision_ids: links?.vision_ids || [],
      value_ids: links?.value_ids || [],
      theme_ids: links?.theme_ids || [],
    });
  };

  const handleBulkLink = async () => {
    if (isArchived || selectedIds.length === 0) return;
    const newIds = [...new Set([...linkedGoalIds, ...selectedIds])];
    await upsertLinks.mutateAsync({
      snapshot_id: snapshotId,
      goal_ids: newIds,
      mission_ids: links?.mission_ids || [],
      vision_ids: links?.vision_ids || [],
      value_ids: links?.value_ids || [],
      theme_ids: links?.theme_ids || [],
    });
    setSelectedIds([]);
  };

  const handleBulkUnlink = async () => {
    if (isArchived || selectedIds.length === 0) return;
    await upsertLinks.mutateAsync({
      snapshot_id: snapshotId,
      goal_ids: linkedGoalIds.filter(id => !selectedIds.includes(id)),
      mission_ids: links?.mission_ids || [],
      vision_ids: links?.vision_ids || [],
      value_ids: links?.value_ids || [],
      theme_ids: links?.theme_ids || [],
    });
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === goals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(goals.map(g => g.id));
    }
  };

  const getHealthBadge = (health?: string) => {
    switch (health) {
      case 'GREEN':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">On Track</Badge>;
      case 'AMBER':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">At Risk</Badge>;
      case 'RED':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Off Track</Badge>;
      default:
        return <Badge variant="secondary">—</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && !isArchived && (
            <>
              <Button variant="outline" size="sm" onClick={handleBulkLink}>
                <Link2 className="h-3.5 w-3.5 mr-1" />
                Link Selected ({selectedIds.length})
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkUnlink}>
                <Unlink className="h-3.5 w-3.5 mr-1" />
                Unlink Selected
              </Button>
            </>
          )}
        </div>
        {!isArchived && (
          <Button onClick={() => setCreateOpen(true)} className="bg-brand-gold hover:bg-brand-gold/90">
            <Plus className="h-4 w-4 mr-1" />
            Create Goal
          </Button>
        )}
      </div>

      {/* Table */}
      {goals.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <Flag className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            No strategic goals created yet.
          </p>
          {!isArchived && (
            <Button onClick={() => setCreateOpen(true)} variant="outline" size="sm">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create your first goal
            </Button>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedIds.length === goals.length && goals.length > 0}
                    onCheckedChange={toggleSelectAll}
                    disabled={isArchived}
                  />
                </TableHead>
                <TableHead>Goal</TableHead>
                <TableHead className="w-28">Health</TableHead>
                <TableHead className="w-24">Progress</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-28">Updated</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals.map((goal) => {
                const isLinked = linkedGoalIds.includes(goal.id);
                return (
                  <TableRow
                    key={goal.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setSelectedGoal(goal)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(goal.id)}
                        onCheckedChange={() => toggleSelect(goal.id)}
                        disabled={isArchived}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isLinked && (
                          <Badge variant="outline" className="bg-brand-gold/10 text-brand-gold border-brand-gold/30 text-[10px]">
                            Linked
                          </Badge>
                        )}
                        <span className="font-medium text-foreground">{goal.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getHealthBadge(goal.health_status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-gold transition-all"
                            style={{ width: `${goal.complete_percent || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8">
                          {Math.round(goal.complete_percent || 0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {goal.status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {goal.updated_at ? format(new Date(goal.updated_at), 'MMM d, yyyy') : '—'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {!isArchived && (
                          isLinked ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => handleUnlink(goal.id)}
                            >
                              <Unlink className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => handleLink(goal.id)}
                            >
                              <Link2 className="h-3.5 w-3.5" />
                            </Button>
                          )
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Goal Drawer */}
      <GoalDrawer
        open={!!selectedGoal}
        onOpenChange={(open) => !open && setSelectedGoal(null)}
        goal={selectedGoal}
        isArchived={isArchived}
        snapshotId={snapshotId}
      />

      {/* Create Dialog */}
      <CreateGoalDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        snapshotId={snapshotId}
      />
    </div>
  );
}
