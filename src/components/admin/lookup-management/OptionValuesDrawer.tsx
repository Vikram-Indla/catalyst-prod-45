import { useState, useEffect } from 'react';
import Spinner from '@atlaskit/spinner';
import AddIcon from '@atlaskit/icon/core/add';
import AlertIcon from '@atlaskit/icon/core/alert';
import CheckMarkIcon from '@atlaskit/icon/core/check-mark';
import EditIcon from '@atlaskit/icon/core/edit';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import DragHandlerIcon from '@atlaskit/icon/glyph/drag-handler';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from '@/components/ui/sheet';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Toggle from '@atlaskit/toggle';
import { Lozenge } from '@/components/ads';
import {
  OptionSet,
  OptionValue,
  useOptionValues,
  useCreateOptionValue,
  useUpdateOptionValue,
  useDeleteOptionValue,
  useBulkUpdateSortOrder,
} from '@/hooks/useOptionSets';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OptionValuesDrawerProps {
  optionSet: OptionSet;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EditingValue {
  id: string;
  valueKey: string;
  label: string;
  labelAr: string;
  color: string;
  isActive: boolean;
  isDefault: boolean;
}

export function OptionValuesDrawer({ optionSet, open, onOpenChange }: OptionValuesDrawerProps) {
  const { data: values = [], isLoading, refetch } = useOptionValues(optionSet.key);
  const createMutation = useCreateOptionValue();
  const updateMutation = useUpdateOptionValue();
  const deleteMutation = useDeleteOptionValue();
  const bulkSortMutation = useBulkUpdateSortOrder();

  const [localValues, setLocalValues] = useState<OptionValue[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<EditingValue | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newValue, setNewValue] = useState<Partial<EditingValue>>({
    valueKey: '',
    label: '',
    labelAr: '',
    color: '',
    isActive: true,
    isDefault: false,
  });

  // Sync local values with fetched data
  useEffect(() => {
    if (values.length) {
      setLocalValues(values);
    }
  }, [values]);

  // Handle drag and drop reordering
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(localValues);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update local state immediately
    const updatedItems = items.map((item, index) => ({
      ...item,
      sort_order: index,
    }));
    setLocalValues(updatedItems);

    // Persist to database
    await bulkSortMutation.mutateAsync({
      optionSetKey: optionSet.key,
      updates: updatedItems.map(item => ({
        id: item.id,
        sortOrder: item.sort_order,
      })),
    });
  };

  // Start editing a value
  const handleStartEdit = (value: OptionValue) => {
    setEditingId(value.id);
    setEditingValue({
      id: value.id,
      valueKey: value.value_key,
      label: value.label,
      labelAr: value.label_ar || '',
      color: value.color || '',
      isActive: value.is_active,
      isDefault: value.is_default,
    });
  };

  // Save edited value
  const handleSaveEdit = async () => {
    if (!editingValue) return;

    await updateMutation.mutateAsync({
      id: editingValue.id,
      optionSetKey: optionSet.key,
      valueKey: editingValue.valueKey,
      label: editingValue.label,
      labelAr: editingValue.labelAr || null,
      color: editingValue.color || null,
      isActive: editingValue.isActive,
      isDefault: editingValue.isDefault,
    });

    setEditingId(null);
    setEditingValue(null);
    refetch();
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingValue(null);
  };

  // Add new value
  const handleAddNew = async () => {
    if (!newValue.valueKey || !newValue.label) {
      toast.error('Value key and label are required');
      return;
    }

    // Check for duplicate value_key
    if (localValues.some(v => v.value_key === newValue.valueKey)) {
      toast.error('Value key must be unique');
      return;
    }

    await createMutation.mutateAsync({
      optionSetKey: optionSet.key,
      valueKey: newValue.valueKey!,
      label: newValue.label!,
      labelAr: newValue.labelAr || undefined,
      color: newValue.color || undefined,
      isDefault: newValue.isDefault || false,
      sortOrder: localValues.length,
    });

    setIsAddingNew(false);
    setNewValue({
      valueKey: '',
      label: '',
      labelAr: '',
      color: '',
      isActive: true,
      isDefault: false,
    });
    refetch();
  };

  // Toggle active status
  const handleToggleActive = async (value: OptionValue) => {
    await updateMutation.mutateAsync({
      id: value.id,
      optionSetKey: optionSet.key,
      isActive: !value.is_active,
    });
    refetch();
  };

  // Delete value
  const handleDelete = async (value: OptionValue) => {
    // For now, just soft delete (deactivate)
    await deleteMutation.mutateAsync({
      id: value.id,
      optionSetKey: optionSet.key,
      hardDelete: false,
    });
    refetch();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="wide" className="flex flex-col">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle className="text-brand-primary">{optionSet.name}</SheetTitle>
            {optionSet.is_system && (
              <Lozenge appearance="default">System</Lozenge>
            )}
          </div>
          <SheetDescription>
            Manage options for {optionSet.key}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="small" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Options Table */}
              <div className="border rounded-lg overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[40px_1fr_1fr_80px_80px_80px_80px] gap-2 px-3 py-2 bg-muted/30 text-xs font-medium text-muted-foreground">
                  <div></div>
                  <div>Label</div>
                  <div>Value Key</div>
                  <div className="text-center">Active</div>
                  <div className="text-center">Default</div>
                  <div className="text-center">Color</div>
                  <div className="text-center">Actions</div>
                </div>

                {/* Draggable List */}
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="options">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef}>
                        {localValues.map((value, index) => (
                          <Draggable key={value.id} draggableId={value.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={cn(
                                  'grid grid-cols-[40px_1fr_1fr_80px_80px_80px_80px] gap-2 px-3 py-2 items-center border-t',
                                  snapshot.isDragging && 'bg-muted shadow-lg',
                                  !value.is_active && 'opacity-50'
                                )}
                              >
                                {/* Drag Handle */}
                                <div {...provided.dragHandleProps}>
                                  <DragHandlerIcon label="" size="small" />
                                </div>

                                {/* Label */}
                                <div>
                                  {editingId === value.id ? (
                                    <Textfield
                                      value={editingValue?.label || ''}
                                      onChange={(e) => setEditingValue(prev => prev ? { ...prev, label: (e.target as HTMLInputElement).value } : null)}
                                    />
                                  ) : (
                                    <span className="text-sm">{value.label}</span>
                                  )}
                                </div>

                                {/* Value Key */}
                                <div>
                                  {editingId === value.id ? (
                                    <Textfield
                                      value={editingValue?.valueKey || ''}
                                      onChange={(e) => setEditingValue(prev => prev ? { ...prev, valueKey: (e.target as HTMLInputElement).value } : null)}
                                    />
                                  ) : (
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{value.value_key}</code>
                                  )}
                                </div>

                                {/* Active Toggle */}
                                <div className="flex justify-center">
                                  <Toggle
                                    isChecked={editingId === value.id ? (editingValue?.isActive ?? false) : value.is_active}
                                    onChange={() => {
                                      if (editingId === value.id) {
                                        setEditingValue(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
                                      } else {
                                        handleToggleActive(value);
                                      }
                                    }}
                                    isDisabled={updateMutation.isPending}
                                  />
                                </div>

                                {/* Default Toggle */}
                                <div className="flex justify-center">
                                  <Toggle
                                    isChecked={editingId === value.id ? (editingValue?.isDefault ?? false) : value.is_default}
                                    onChange={() => {
                                      if (editingId === value.id) {
                                        setEditingValue(prev => prev ? { ...prev, isDefault: !prev.isDefault } : null);
                                      }
                                    }}
                                    isDisabled={editingId !== value.id}
                                  />
                                </div>

                                {/* Color */}
                                <div className="flex justify-center">
                                  {value.color ? (
                                    <Lozenge appearance="default">
                                      Color
                                    </Lozenge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex justify-center gap-1">
                                  {editingId === value.id ? (
                                    <>
                                      <Button
                                        appearance="subtle"
                                        iconBefore={CheckMarkIcon}
                                        onClick={handleSaveEdit}
                                        isDisabled={updateMutation.isPending}
                                      />
                                      <Button
                                        appearance="subtle"
                                        iconBefore={CrossIcon}
                                        onClick={handleCancelEdit}
                                      />
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        appearance="subtle"
                                        iconBefore={EditIcon}
                                        onClick={() => handleStartEdit(value)}
                                      />
                                      <Button
                                        appearance="subtle"
                                        iconBefore={TrashIcon}
                                        onClick={() => handleDelete(value)}
                                        isDisabled={deleteMutation.isPending}
                                      />
                                    </>
                                  )}
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

                {/* Add New Row */}
                {isAddingNew && (
                  <div className="grid grid-cols-[40px_1fr_1fr_80px_80px_80px_80px] gap-2 px-3 py-2 items-center border-t bg-brand-primary/5">
                    <div></div>
                    <Textfield
                      placeholder="Label"
                      value={newValue.label || ''}
                      onChange={(e) => setNewValue(prev => ({ ...prev, label: (e.target as HTMLInputElement).value }))}
                    />
                    <Textfield
                      placeholder="value_key"
                      value={newValue.valueKey || ''}
                      onChange={(e) => setNewValue(prev => ({ ...prev, valueKey: (e.target as HTMLInputElement).value }))}
                    />
                    <div className="flex justify-center">
                      <Toggle
                        isChecked={newValue.isActive ?? true}
                        onChange={() => setNewValue(prev => ({ ...prev, isActive: !prev.isActive }))}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Toggle
                        isChecked={newValue.isDefault ?? false}
                        onChange={() => setNewValue(prev => ({ ...prev, isDefault: !prev.isDefault }))}
                      />
                    </div>
                    <div></div>
                    <div className="flex justify-center gap-1">
                      <Button
                        appearance="subtle"
                        iconBefore={createMutation.isPending ? undefined : CheckMarkIcon}
                        onClick={handleAddNew}
                        isDisabled={createMutation.isPending}
                      >
                        {createMutation.isPending ? <Spinner size="small" /> : undefined}
                      </Button>
                      <Button
                        appearance="subtle"
                        iconBefore={CrossIcon}
                        onClick={() => setIsAddingNew(false)}
                      />
                    </div>
                  </div>
                )}

                {localValues.length === 0 && !isAddingNew && (
                  <div className="px-4 py-8 text-center text-muted-foreground">
                    No options configured yet
                  </div>
                )}
              </div>

              {/* Add Button */}
              {!isAddingNew && (
                <Button
                  appearance="default"
                  iconBefore={AddIcon}
                  onClick={() => setIsAddingNew(true)}
                >
                  Add Option
                </Button>
              )}

              {/* Info Box */}
              {optionSet.is_system && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <AlertIcon label="" size="small" />
                  <div className="text-amber-800">
                    <strong>System Option Set</strong>
                    <p className="text-xs mt-0.5 text-amber-700">
                      This is a system-managed option set. Changes may affect core functionality.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          <Button appearance="default" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
