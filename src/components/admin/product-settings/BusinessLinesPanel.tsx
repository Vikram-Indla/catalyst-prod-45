import { useState } from 'react';
import { useBusinessLines, useCreateBusinessLine, useUpdateBusinessLine, useDeleteBusinessLine, BusinessLine } from '@/hooks/useProductSettings';
import Button from '@atlaskit/button/new';
import Toggle from '@atlaskit/toggle';
import { Lozenge } from '@/components/ads';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/admin/admin-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/admin/admin-alert-dialog';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import Spinner from '@atlaskit/spinner';
import AddIcon from '@atlaskit/icon/core/add';
import EditIcon from '@atlaskit/icon/core/edit';
import DragHandlerIcon from '@atlaskit/icon/glyph/drag-handler';
import TrashIcon from '@atlaskit/icon/glyph/trash';

interface BusinessLinesPanelProps {
  onChanges?: () => void;
}

export function BusinessLinesPanel({ onChanges }: BusinessLinesPanelProps = {}) {
  const { data: businessLines = [], isLoading } = useBusinessLines();
  const createBusinessLine = useCreateBusinessLine();
  const updateBusinessLine = useUpdateBusinessLine();
  const deleteBusinessLine = useDeleteBusinessLine();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<BusinessLine | null>(null);
  const [deletingLine, setDeletingLine] = useState<BusinessLine | null>(null);
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    is_default: false,
    is_active: true,
  });

  const handleOpenDialog = (line?: BusinessLine) => {
    if (line) {
      setEditingLine(line);
      setFormData({
        key: line.key,
        name: line.name,
        description: line.description || '',
        is_default: line.is_default,
        is_active: line.is_active,
      });
    } else {
      setEditingLine(null);
      setFormData({
        key: '',
        name: '',
        description: '',
        is_default: false,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingLine) {
      await updateBusinessLine.mutateAsync({
        id: editingLine.id,
        ...formData,
      });
    } else {
      const maxOrder = Math.max(...businessLines.map(l => l.sort_order), -1);
      await createBusinessLine.mutateAsync({
        ...formData,
        sort_order: maxOrder + 1,
      });
    }
    setIsDialogOpen(false);
    onChanges();
  };

  const handleToggleActive = async (line: BusinessLine) => {
    if (line.is_default) return; // Cannot deactivate default
    await updateBusinessLine.mutateAsync({
      id: line.id,
      is_active: !line.is_active,
    });
    onChanges();
  };

  const handleDelete = async () => {
    if (!deletingLine) return;
    await deleteBusinessLine.mutateAsync(deletingLine.id);
    setIsDeleteOpen(false);
    setDeletingLine(null);
    onChanges();
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(businessLines);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update sort orders
    for (let i = 0; i < items.length; i++) {
      if (items[i].sort_order !== i) {
        await updateBusinessLine.mutateAsync({
          id: items[i].id,
          sort_order: i,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Business Lines</h2>
          <p className="text-sm text-muted-foreground">
            Manage industry sectors and business categories for Product demands.
          </p>
        </div>
        <Button appearance="primary" onClick={() => handleOpenDialog()} iconBefore={AddIcon}>
          Add Business Line
        </Button>
      </div>

      {/* Business Lines List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="business-lines">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="border rounded-lg overflow-hidden"
            >
              {businessLines.map((line, index) => (
                <Draggable key={line.id} draggableId={line.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex items-center gap-4 p-4 border-b last:border-b-0 bg-card ${
                        snapshot.isDragging ? 'shadow-lg' : ''
                      }`}
                    >
                      <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground">
                        <DragHandlerIcon label="" size="small" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{line.name}</span>
                          <Lozenge appearance="default">
                            {line.key}
                          </Lozenge>
                          {line.is_default && (
                            <Lozenge appearance="inprogress">
                              Default
                            </Lozenge>
                          )}
                        </div>
                        {line.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {line.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {line.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <Toggle
                            isChecked={line.is_active}
                            onChange={() => handleToggleActive(line)}
                            isDisabled={line.is_default}
                          />
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            appearance="subtle"
                            onClick={() => handleOpenDialog(line)}
                            iconBefore={EditIcon}
                          />
                          <Button
                            appearance="subtle"
                            onClick={() => {
                              setDeletingLine(line);
                              setIsDeleteOpen(true);
                            }}
                            isDisabled={line.is_default}
                            iconBefore={TrashIcon}
                          />
                        </div>
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

      {/* Info Note */}
      <div className="bg-muted/50 p-4 rounded-lg" style={{ borderLeft: '3px solid var(--accent-color)' }}>
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Inactive business lines are hidden from the Product dropdown but existing demands remain accessible via direct URL or admin views.
        </p>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLine ? 'Edit Business Line' : 'Add Business Line'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="bl-name" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>Name</label>
              <Textfield
                id="bl-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: (e.target as HTMLInputElement).value })}
                placeholder="e.g., Industry"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="bl-key" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>Key</label>
              <Textfield
                id="bl-key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: (e.target as HTMLInputElement).value.toUpperCase() })}
                placeholder="e.g., IND"
                isDisabled={!!editingLine}
              />
              <p className="text-xs text-muted-foreground">
                Short code for the business line. Cannot be changed after creation.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="bl-description" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>Description</label>
              <TextArea
                id="bl-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: (e.target as HTMLTextAreaElement).value })}
                placeholder="Optional description"
                minimumRows={3}
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Toggle
                  isChecked={formData.is_default}
                  onChange={() => setFormData(prev => ({ ...prev, is_default: !prev.is_default }))}
                />
                <label style={{ fontSize: '14px', color: 'var(--ds-text, #172B4D)' }}>Set as default</label>
              </div>

              <div className="flex items-center gap-2">
                <Toggle
                  isChecked={formData.is_active}
                  onChange={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                />
                <label style={{ fontSize: '14px', color: 'var(--ds-text, #172B4D)' }}>Active</label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button appearance="default" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handleSave}
              isDisabled={!formData.name || !formData.key}
            >
              {editingLine ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Business Line</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingLine?.name}"? This action cannot be undone.
              Existing demands will lose their business line association.
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
