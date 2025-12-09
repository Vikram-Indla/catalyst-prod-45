// ==============================================
// MANAGE IDEATION FORMS DIALOG
// Configure intake fields for idea submission
// ==============================================

import { useState } from 'react';
import { Plus, Trash2, GripVertical, Edit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  useIdeationForms,
  useIdeationForm,
  useCreateIdeationForm,
  useUpdateIdeationForm,
  useDeleteIdeationForm,
  useCreateFormField,
  useUpdateFormField,
  useDeleteFormField,
} from '@/hooks/useIdeationForms';
import type { IdeationForm, IdeationFormField, FormFieldType } from '@/types/ideation';

interface ManageFormsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectForm?: (formId: string | null) => void;
}

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  textbox: 'Text Box',
  opentext: 'Open Text',
  dropdown: 'Dropdown',
};

export function ManageFormsDialog({ open, onOpenChange, onSelectForm }: ManageFormsDialogProps) {
  const { data: forms, isLoading } = useIdeationForms();
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState<string | null>(null);
  const [newFormName, setNewFormName] = useState('');

  const { data: selectedForm } = useIdeationForm(selectedFormId);
  const createForm = useCreateIdeationForm();
  const deleteForm = useDeleteIdeationForm();

  const handleCreateForm = () => {
    if (!newFormName.trim()) return;
    createForm.mutate(
      { name: newFormName.trim() },
      {
        onSuccess: (form) => {
          setSelectedFormId(form.id);
          setShowCreateForm(false);
          setNewFormName('');
        },
      }
    );
  };

  const handleDeleteForm = () => {
    if (!showDeleteForm) return;
    deleteForm.mutate(showDeleteForm, {
      onSuccess: () => {
        if (selectedFormId === showDeleteForm) {
          setSelectedFormId(null);
        }
        setShowDeleteForm(null);
      },
    });
  };

  const handleSelectAndClose = () => {
    if (onSelectForm) {
      onSelectForm(selectedFormId);
    }
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Ideation Forms</DialogTitle>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden gap-4 min-h-[400px]">
            {/* Forms List */}
            <div className="w-64 border-r border-border pr-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Forms</span>
                <Button size="sm" variant="outline" onClick={() => setShowCreateForm(true)} className="px-2">
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              {showCreateForm && (
                <div className="mb-3 p-2 border border-border rounded-md space-y-2">
                  <Input
                    placeholder="Form name"
                    value={newFormName}
                    onChange={(e) => setNewFormName(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreateForm} disabled={!newFormName.trim()}>
                      Create
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowCreateForm(false); setNewFormName(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <ScrollArea className="h-[300px]">
                {isLoading ? (
                  <div className="text-sm text-muted-foreground p-2">Loading...</div>
                ) : forms?.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-2">No forms created</div>
                ) : (
                  <div className="space-y-1">
                    {forms?.map((form) => (
                      <div
                        key={form.id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer text-sm ${
                          selectedFormId === form.id
                            ? 'bg-brand-gold/10 text-foreground'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedFormId(form.id)}
                      >
                        <span className="truncate flex-1">{form.name}</span>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {form.fields?.length || 0}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); setShowDeleteForm(form.id); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Form Fields Editor */}
            <div className="flex-1 overflow-hidden">
              {!selectedFormId ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Select a form to configure fields
                </div>
              ) : selectedForm ? (
                <FormFieldsEditor form={selectedForm} />
              ) : null}
            </div>
          </div>

          <Separator className="my-4" />
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSelectAndClose}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!showDeleteForm} onOpenChange={() => setShowDeleteForm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this form and all its fields.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteForm} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Form Fields Editor Component
function FormFieldsEditor({ form }: { form: IdeationForm }) {
  const createField = useCreateFormField();
  const updateField = useUpdateFormField();
  const deleteField = useDeleteFormField();

  const [showAddField, setShowAddField] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null);

  // Field form state
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<FormFieldType>('textbox');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldExternal, setFieldExternal] = useState(true);
  const [fieldHelpText, setFieldHelpText] = useState('');
  const [fieldOptions, setFieldOptions] = useState('');

  const resetFieldForm = () => {
    setFieldLabel('');
    setFieldType('textbox');
    setFieldRequired(false);
    setFieldExternal(true);
    setFieldHelpText('');
    setFieldOptions('');
  };

  const handleAddField = () => {
    if (!fieldLabel.trim()) return;
    const options = fieldType === 'dropdown' ? fieldOptions.split('\n').filter((o) => o.trim()) : [];
    createField.mutate(
      {
        form_id: form.id,
        label: fieldLabel.trim(),
        field_type: fieldType,
        options,
        is_required: fieldRequired,
        is_external: fieldExternal,
        help_text: fieldHelpText.trim() || undefined,
        sort_order: (form.fields?.length || 0) + 1,
      },
      {
        onSuccess: () => {
          setShowAddField(false);
          resetFieldForm();
        },
      }
    );
  };

  const handleEditField = (field: IdeationFormField) => {
    setEditingFieldId(field.id);
    setFieldLabel(field.label);
    setFieldType(field.field_type);
    setFieldRequired(field.is_required);
    setFieldExternal(field.is_external);
    setFieldHelpText(field.help_text || '');
    setFieldOptions(field.options?.join('\n') || '');
  };

  const handleUpdateField = () => {
    if (!editingFieldId || !fieldLabel.trim()) return;
    const options = fieldType === 'dropdown' ? fieldOptions.split('\n').filter((o) => o.trim()) : [];
    updateField.mutate(
      {
        id: editingFieldId,
        form_id: form.id,
        label: fieldLabel.trim(),
        field_type: fieldType,
        options,
        is_required: fieldRequired,
        is_external: fieldExternal,
        help_text: fieldHelpText.trim() || undefined,
      },
      {
        onSuccess: () => {
          setEditingFieldId(null);
          resetFieldForm();
        },
      }
    );
  };

  const handleDeleteField = () => {
    if (!deleteFieldId) return;
    deleteField.mutate(
      { id: deleteFieldId, form_id: form.id },
      { onSuccess: () => setDeleteFieldId(null) }
    );
  };

  const handleToggleActive = (field: IdeationFormField) => {
    updateField.mutate({
      id: field.id,
      form_id: form.id,
      is_active: !field.is_active,
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">{form.name} - Fields</span>
        <Button size="sm" variant="outline" onClick={() => setShowAddField(true)}>
          <Plus className="h-3 w-3 mr-1" /> Add Field
        </Button>
      </div>

      {/* Add/Edit Field Form */}
      {(showAddField || editingFieldId) && (
        <div className="mb-3 p-3 border border-border rounded-md space-y-3 bg-muted/30">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Field Label</Label>
              <Input
                value={fieldLabel}
                onChange={(e) => setFieldLabel(e.target.value)}
                placeholder="e.g., Priority Level"
              />
            </div>
            <div>
              <Label className="text-xs">Field Type</Label>
              <Select value={fieldType} onValueChange={(v) => setFieldType(v as FormFieldType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="textbox">Text Box</SelectItem>
                  <SelectItem value="opentext">Open Text (Multi-line)</SelectItem>
                  <SelectItem value="dropdown">Dropdown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {fieldType === 'dropdown' && (
            <div>
              <Label className="text-xs">Options (one per line)</Label>
              <Textarea
                value={fieldOptions}
                onChange={(e) => setFieldOptions(e.target.value)}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                rows={3}
              />
            </div>
          )}

          <div>
            <Label className="text-xs">Help Text (optional)</Label>
            <Input
              value={fieldHelpText}
              onChange={(e) => setFieldHelpText(e.target.value)}
              placeholder="Instructions for users"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={fieldRequired} onCheckedChange={setFieldRequired} />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={fieldExternal} onCheckedChange={setFieldExternal} />
              Show to External Users
            </label>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={editingFieldId ? handleUpdateField : handleAddField}>
              {editingFieldId ? 'Update' : 'Add'} Field
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setShowAddField(false); setEditingFieldId(null); resetFieldForm(); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Fields List */}
      <ScrollArea className="flex-1">
        {form.fields?.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 text-center">
            No fields added. Add fields to customize idea submission.
          </div>
        ) : (
          <div className="space-y-2">
            {form.fields?.map((field) => (
              <div
                key={field.id}
                className={`flex items-center gap-2 p-2 border border-border rounded ${
                  !field.is_active ? 'opacity-50' : ''
                }`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{field.label}</span>
                    {field.is_required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                    {field.is_external && <Badge variant="secondary" className="text-xs">External</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">{FIELD_TYPE_LABELS[field.field_type]}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={field.is_active} onCheckedChange={() => handleToggleActive(field)} />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditField(field)}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteFieldId(field.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <AlertDialog open={!!deleteFieldId} onOpenChange={() => setDeleteFieldId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Field?</AlertDialogTitle>
            <AlertDialogDescription>This field will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteField} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
