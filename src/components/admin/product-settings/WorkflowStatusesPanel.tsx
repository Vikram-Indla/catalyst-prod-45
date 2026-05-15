import { useState } from 'react';
import { useProductStatusConfigs, useUpdateProductStatusConfig, useCreateProductStatusConfig, useDeleteProductStatusConfig, ProductStatusConfig } from '@/hooks/useProductSettings';
import Button, { IconButton } from '@atlaskit/button/new';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import Textfield from '@atlaskit/textfield';
import AdsSelect from '@atlaskit/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/admin/admin-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/admin/admin-alert-dialog';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import Spinner from '@atlaskit/spinner';
import AddIcon from '@atlaskit/icon/core/add';
import EditIcon from '@atlaskit/icon/core/edit';
import DragHandlerIcon from '@atlaskit/icon/glyph/drag-handler';
import TrashIcon from '@atlaskit/icon/glyph/trash';

interface WorkflowStatusesPanelProps {
  onChanges?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  todo: 'bg-[var(--sem-info-bg)] text-[var(--sem-info)] border-[var(--sem-info-border)]',
  inprogress: 'bg-[var(--sem-warning-bg)] text-[var(--sem-warning)] border-[var(--sem-warning-border)]',
  done: 'bg-[var(--sem-success-bg)] text-[var(--sem-success)] border-[var(--sem-success-border)]',
  other: 'bg-muted text-muted-foreground border-border',
};

const CATEGORY_LABELS: Record<string, string> = {
  todo: 'To Do',
  inprogress: 'In Progress',
  done: 'Done',
  other: 'Other',
};

// §5 StatusLozenge — map category to canonical 3-colour guardrail.
const CATEGORY_APPEARANCE: Record<string, LozengeAppearance> = {
  todo: 'default',        // grey
  inprogress: 'inprogress',// blue
  done: 'success',        // green
  other: 'default',       // grey
};

export function WorkflowStatusesPanel({ onChanges }: WorkflowStatusesPanelProps) {
  const { data: statuses = [], isLoading } = useProductStatusConfigs();
  const updateStatus = useUpdateProductStatusConfig();
  const createStatus = useCreateProductStatusConfig();
  const deleteStatus = useDeleteProductStatusConfig();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ProductStatusConfig | null>(null);
  const [deletingStatus, setDeletingStatus] = useState<ProductStatusConfig | null>(null);
  const [formData, setFormData] = useState({
    status_key: '',
    name: '',
    category: 'todo' as 'todo' | 'inprogress' | 'done' | 'other',
    is_default: false,
  });

  const handleOpenDialog = (status?: ProductStatusConfig) => {
    if (status) {
      setEditingStatus(status);
      setFormData({
        status_key: status.status_key,
        name: status.name,
        category: status.category,
        is_default: status.is_default,
      });
    } else {
      setEditingStatus(null);
      setFormData({
        status_key: '',
        name: '',
        category: 'todo',
        is_default: false,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingStatus) {
      await updateStatus.mutateAsync({
        id: editingStatus.id,
        name: formData.name,
        category: formData.category,
        is_default: formData.is_default,
      });
    } else {
      const maxPosition = Math.max(...statuses.map(s => s.position), -1);
      await createStatus.mutateAsync({
        ...formData,
        position: maxPosition + 1,
        color: null,
      });
    }
    setIsDialogOpen(false);
    onChanges();
  };

  const handleDelete = async () => {
    if (!deletingStatus) return;
    await deleteStatus.mutateAsync(deletingStatus.id);
    setIsDeleteOpen(false);
    setDeletingStatus(null);
    onChanges();
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(statuses);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].position !== i) {
        await updateStatus.mutateAsync({
          id: items[i].id,
          position: i,
        });
      }
    }
    onChanges();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="small" />
      </div>
    );
  }

  // Group statuses by category for legend
  const categoryGroups = {
    todo: statuses.filter(s => s.category === 'todo'),
    inprogress: statuses.filter(s => s.category === 'inprogress'),
    done: statuses.filter(s => s.category === 'done'),
    other: statuses.filter(s => s.category === 'other'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Workflow & Statuses</h2>
          <p className="text-sm text-muted-foreground">
            Configure process step statuses and workflow categories.
          </p>
        </div>
        <Button appearance="primary" onClick={() => handleOpenDialog()} iconBefore={AddIcon}>
          Add Status
        </Button>
      </div>

      {/* Category Legend */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-muted/30 border rounded-lg">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <div key={key} className="text-center">
            <div className={cn("inline-block px-3 py-1 rounded-full text-xs font-medium mb-1", CATEGORY_COLORS[key])}>
              {label}
            </div>
            <p className="text-xs text-muted-foreground">
              {key === 'todo' && 'New/Pending work'}
              {key === 'inprogress' && 'Active work'}
              {key === 'done' && 'Completed work'}
              {key === 'other' && 'Rejected/On-hold'}
            </p>
          </div>
        ))}
      </div>

      {/* Statuses List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="statuses">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="border rounded-lg overflow-hidden"
            >
              {statuses.map((status, index) => (
                <Draggable key={status.id} draggableId={status.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={cn(
                        "flex items-center gap-4 p-4 border-b last:border-b-0 bg-card",
                        snapshot.isDragging && "shadow-lg"
                      )}
                    >
                      <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground">
                        <DragHandlerIcon label="" size="small" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{status.name}</span>
                          <Lozenge appearance="default">
                            {status.status_key}
                          </Lozenge>
                          {status.is_default && (
                            <Lozenge appearance="inprogress">
                              Default
                            </Lozenge>
                          )}
                        </div>
                      </div>

                      <Lozenge appearance={CATEGORY_APPEARANCE[status.category] ?? 'default'}>
                        {CATEGORY_LABELS[status.category]}
                      </Lozenge>

                      <div className="flex items-center gap-1">
                        <IconButton
                          appearance="subtle"
                          onClick={() => handleOpenDialog(status)}
                          icon={EditIcon}
                        label="" />
                        <IconButton
                          appearance="subtle"
                          onClick={() => {
                            setDeletingStatus(status);
                            setIsDeleteOpen(true);
                          }}
                          isDisabled={status.is_default}
                          icon={TrashIcon}
                        label="" />
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStatus ? 'Edit Status' : 'Add Status'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="ws-name" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>Name</label>
              <Textfield
                id="ws-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: (e.target as HTMLInputElement).value })}
                placeholder="e.g., Under Review"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="ws-key" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>Key</label>
              <Textfield
                id="ws-key"
                value={formData.status_key}
                onChange={(e) => setFormData({ ...formData, status_key: (e.target as HTMLInputElement).value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g., under_review"
                isDisabled={!!editingStatus}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="ws-category-select" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>Category</label>
              <AdsSelect
                inputId="ws-category-select"
                value={{ label: CATEGORY_LABELS[formData.category], value: formData.category }}
                options={[
                  { label: 'To Do', value: 'todo' },
                  { label: 'In Progress', value: 'inprogress' },
                  { label: 'Done', value: 'done' },
                  { label: 'Other', value: 'other' },
                ]}
                onChange={(opt) => setFormData({ ...formData, category: (opt?.value ?? 'todo') as typeof formData.category })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button appearance="default" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handleSave}
              isDisabled={!formData.name || !formData.status_key}
            >
              {editingStatus ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingStatus?.name}"? 
              Demands with this status will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
