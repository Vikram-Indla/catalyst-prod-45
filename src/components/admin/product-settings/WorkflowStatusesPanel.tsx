import { useState } from 'react';
import { useProductStatusConfigs, useUpdateProductStatusConfig, useCreateProductStatusConfig, useDeleteProductStatusConfig, ProductStatusConfig } from '@/hooks/useProductSettings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, GripVertical, Pencil, Trash2, Loader2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';

interface WorkflowStatusesPanelProps {
  onChanges?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  todo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  inprogress: 'bg-amber-100 text-amber-700 border-amber-200',
  done: 'bg-green-100 text-green-700 border-green-200',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
};

const CATEGORY_LABELS: Record<string, string> = {
  todo: 'To Do',
  inprogress: 'In Progress',
  done: 'Done',
  other: 'Other',
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
        <Button onClick={() => handleOpenDialog()} className="bg-brand-gold hover:bg-brand-gold-hover">
          <Plus className="h-4 w-4 mr-2" />
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
                        <GripVertical className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{status.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {status.status_key}
                          </Badge>
                          {status.is_default && (
                            <Badge className="bg-brand-gold text-white text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Badge className={cn("text-xs border", CATEGORY_COLORS[status.category])}>
                        {CATEGORY_LABELS[status.category]}
                      </Badge>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(status)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeletingStatus(status);
                            setIsDeleteOpen(true);
                          }}
                          disabled={status.is_default}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Under Review"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status_key">Key</Label>
              <Input
                id="status_key"
                value={formData.status_key}
                onChange={(e) => setFormData({ ...formData, status_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g., under_review"
                disabled={!!editingStatus}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="inprogress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.name || !formData.status_key}
              className="bg-brand-gold hover:bg-brand-gold-hover"
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
