import { useState } from 'react';
import { useCreateColumn, useDeleteColumn } from '@/hooks/useKanbanBoards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, GripVertical, Settings as SettingsIcon, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { KanbanColumn, ColumnType } from '@/types/kanban.types';

interface ColumnsSetupTabProps {
  boardId: string;
  columns: KanbanColumn[];
}

export function ColumnsSetupTab({ boardId, columns }: ColumnsSetupTabProps) {
  const [settingsColumnId, setSettingsColumnId] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState<ColumnType>('Not Started');
  const [wipLimit, setWipLimit] = useState<string>('');
  
  const createColumn = useCreateColumn();
  const deleteColumn = useDeleteColumn();

  const settingsColumn = columns.find(c => c.id === settingsColumnId);

  const handleAddColumn = async () => {
    if (!newColumnName) return;

    await createColumn.mutateAsync({
      board_id: boardId,
      name: newColumnName,
      column_type: newColumnType,
      wip_limit: wipLimit ? parseInt(wipLimit) : undefined,
      sort_order: columns.length,
      state_mappings: [],
    });

    setNewColumnName('');
    setWipLimit('');
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (confirm('Are you sure you want to delete this column?')) {
      await deleteColumn.mutateAsync({ id: columnId, boardId });
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Column Form */}
      <Card className="p-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Label htmlFor="column-name">Column Name</Label>
            <Input
              id="column-name"
              placeholder="e.g., Dev Complete"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Label htmlFor="column-type">Type</Label>
            <Select value={newColumnType} onValueChange={(v) => setNewColumnType(v as ColumnType)}>
              <SelectTrigger id="column-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Not Started">Not Started</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Accepted">Accepted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <Label htmlFor="wip-limit">WIP Limit</Label>
            <Input
              id="wip-limit"
              type="number"
              placeholder="—"
              value={wipLimit}
              onChange={(e) => setWipLimit(e.target.value)}
            />
          </div>
          <Button
            onClick={handleAddColumn}
            disabled={!newColumnName || createColumn.isPending}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Column
          </Button>
        </div>
      </Card>

      {/* Columns List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">Columns</h3>
          <Badge variant="secondary">{columns.length} columns</Badge>
        </div>

        {columns.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No columns configured yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {columns.map((column) => (
              <Card key={column.id} className="p-4">
                <div className="flex items-center gap-4">
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />
                  <div className="flex-1 flex items-center gap-4">
                    <span className="font-medium text-foreground min-w-[160px]">
                      {column.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {column.column_type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      WIP: {column.wip_limit || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSettingsColumnId(column.id)}
                    >
                      <SettingsIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteColumn(column.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Column Settings Dialog */}
      <Dialog open={!!settingsColumnId} onOpenChange={() => setSettingsColumnId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Column Settings</DialogTitle>
          </DialogHeader>
          {settingsColumn && (
            <div className="space-y-4">
              <div>
                <Label>Column Name</Label>
                <Input value={settingsColumn.name} disabled />
              </div>
              <div>
                <Label>Column Type</Label>
                <Input value={settingsColumn.column_type} disabled />
              </div>
              <div>
                <Label>WIP Limit</Label>
                <Input
                  type="number"
                  placeholder="No limit"
                  defaultValue={settingsColumn.wip_limit || ''}
                />
              </div>
              <div>
                <Label>Exit Criteria</Label>
                <Input
                  placeholder="Define exit criteria..."
                  defaultValue={settingsColumn.exit_criteria || ''}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsColumnId(null)}>
              Cancel
            </Button>
            <Button className="bg-brand-gold hover:bg-brand-gold-hover text-white">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
