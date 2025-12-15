/**
 * DeliveryPlatforms Admin Page
 * 
 * Manage delivery platform lookup values used across:
 * - External Business Request Form
 * - Business Request Drawer
 * - Filters and Lists
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useOptionValues,
  useCreateOptionValue,
  useUpdateOptionValue,
  useDeleteOptionValue,
  useBulkUpdateSortOrder,
  OptionValue,
} from '@/hooks/useOptionSets';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const OPTION_SET_KEY = 'DELIVERY_PLATFORM';

interface FormData {
  valueKey: string;
  label: string;
  labelAr: string;
  isActive: boolean;
}

const DEFAULT_FORM: FormData = {
  valueKey: '',
  label: '',
  labelAr: '',
  isActive: true,
};

export default function DeliveryPlatforms() {
  const { data: options = [], isLoading } = useOptionValues(OPTION_SET_KEY);
  const createMutation = useCreateOptionValue();
  const updateMutation = useUpdateOptionValue();
  const deleteMutation = useDeleteOptionValue();
  const reorderMutation = useBulkUpdateSortOrder();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<OptionValue | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM);

  const handleOpenCreate = () => {
    setEditingOption(null);
    setFormData(DEFAULT_FORM);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (option: OptionValue) => {
    setEditingOption(option);
    setFormData({
      valueKey: option.value_key,
      label: option.label,
      labelAr: option.label_ar || '',
      isActive: option.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.label.trim()) {
      toast.error('Label is required');
      return;
    }

    try {
      if (editingOption) {
        await updateMutation.mutateAsync({
          id: editingOption.id,
          optionSetKey: OPTION_SET_KEY,
          valueKey: formData.valueKey || formData.label,
          label: formData.label,
          labelAr: formData.labelAr || null,
          isActive: formData.isActive,
        });
      } else {
        const maxSortOrder = options.length > 0 ? Math.max(...options.map(o => o.sort_order)) : 0;
        await createMutation.mutateAsync({
          optionSetKey: OPTION_SET_KEY,
          valueKey: formData.valueKey || formData.label,
          label: formData.label,
          labelAr: formData.labelAr || undefined,
          sortOrder: maxSortOrder + 1,
        });
      }
      setIsDialogOpen(false);
      setFormData(DEFAULT_FORM);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    
    try {
      await deleteMutation.mutateAsync({
        id: deleteConfirmId,
        optionSetKey: OPTION_SET_KEY,
        hardDelete: false, // Soft delete
      });
      setDeleteConfirmId(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleToggleActive = async (option: OptionValue) => {
    try {
      await updateMutation.mutateAsync({
        id: option.id,
        optionSetKey: OPTION_SET_KEY,
        isActive: !option.is_active,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(options);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updates = items.map((item, index) => ({
      id: item.id,
      sortOrder: index + 1,
    }));

    try {
      await reorderMutation.mutateAsync({
        optionSetKey: OPTION_SET_KEY,
        updates,
      });
    } catch (error) {
      toast.error('Failed to reorder');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl">Delivery Platforms</CardTitle>
            <CardDescription>
              Manage delivery platform options used in business request forms and filters.
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate} className="bg-brand-gold hover:bg-brand-gold-hover text-white">
            <Plus className="h-4 w-4 mr-1" />
            Add Platform
          </Button>
        </CardHeader>
        <CardContent>
          {options.length === 0 ? (
            <div 
              className="text-center py-12 rounded-lg"
              style={{ 
                backgroundColor: 'var(--surface-2)',
                border: '1px dashed var(--border-color)',
                color: 'var(--text-2)'
              }}
            >
              <p className="text-sm mb-4">No delivery platforms configured yet.</p>
              <Button 
                onClick={handleOpenCreate}
                className="bg-brand-gold hover:bg-brand-gold-hover text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add First Platform
              </Button>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="platforms">
                {(provided) => (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>Label (English)</TableHead>
                        <TableHead>Label (Arabic)</TableHead>
                        <TableHead>Value Key</TableHead>
                        <TableHead className="text-center">Active</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <tbody {...provided.droppableProps} ref={provided.innerRef}>
                      {options.map((option, index) => (
                        <Draggable key={option.id} draggableId={option.id} index={index}>
                          {(provided, snapshot) => (
                            <tr
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`border-b transition-colors hover:bg-muted/50 ${snapshot.isDragging ? 'bg-muted shadow-lg' : ''}`}
                            >
                              <TableCell className="w-[40px]">
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab hover:bg-muted rounded p-1"
                                >
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{option.label}</TableCell>
                              <TableCell className="text-muted-foreground" dir="rtl">
                                {option.label_ar || '—'}
                              </TableCell>
                              <TableCell className="text-muted-foreground font-mono text-xs">
                                {option.value_key}
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={option.is_active}
                                  onCheckedChange={() => handleToggleActive(option)}
                                />
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-popover border shadow-lg z-[400]">
                                    <DropdownMenuItem onClick={() => handleOpenEdit(option)}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setDeleteConfirmId(option.id)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </tr>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </tbody>
                  </Table>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOption ? 'Edit Platform' : 'Add Platform'}</DialogTitle>
            <DialogDescription>
              {editingOption
                ? 'Update the delivery platform details.'
                : 'Add a new delivery platform option.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label (English) *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Senaei Platform"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="labelAr">Label (Arabic)</Label>
              <Input
                id="labelAr"
                value={formData.labelAr}
                onChange={(e) => setFormData({ ...formData, labelAr: e.target.value })}
                placeholder="e.g., منصة صناعي"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valueKey">Value Key</Label>
              <Input
                id="valueKey"
                value={formData.valueKey}
                onChange={(e) => setFormData({ ...formData, valueKey: e.target.value })}
                placeholder="Auto-generated from label if empty"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                The stored value in the database. Defaults to the English label.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingOption ? 'Save Changes' : 'Add Platform'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Platform</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the platform option. Existing records using this value will still display it,
              but it won't appear in dropdowns for new selections.
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
