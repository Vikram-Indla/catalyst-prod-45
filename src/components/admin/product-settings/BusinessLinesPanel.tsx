import { useState } from 'react';
import { useBusinessLines, useCreateBusinessLine, useUpdateBusinessLine, useDeleteBusinessLine, BusinessLine } from '@/hooks/useProductSettings';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, GripVertical, Pencil, Trash2, Loader2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface BusinessLinesPanelProps {
  onChanges: () => void;
}

export function BusinessLinesPanel({ onChanges }: BusinessLinesPanelProps) {
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
        <Button onClick={() => handleOpenDialog()} className="bg-brand-gold hover:bg-brand-gold-hover">
          <Plus className="h-4 w-4 mr-2" />
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
                        <GripVertical className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{line.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {line.key}
                          </Badge>
                          {line.is_default && (
                            <Badge className="bg-brand-gold text-white text-xs">
                              Default
                            </Badge>
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
                          <Switch
                            checked={line.is_active}
                            onCheckedChange={() => handleToggleActive(line)}
                            disabled={line.is_default}
                          />
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(line)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDeletingLine(line);
                              setIsDeleteOpen(true);
                            }}
                            disabled={line.is_default}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
      <div className="bg-muted/50 border-l-4 border-brand-gold p-4 rounded-r-lg">
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
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Industry"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
                placeholder="e.g., IND"
                disabled={!!editingLine}
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Short code for the business line. Cannot be changed after creation.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
                <Label htmlFor="is_default">Set as default</Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!formData.name || !formData.key}
              className="bg-brand-gold hover:bg-brand-gold-hover"
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
