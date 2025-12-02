// ==============================================
// IDEATION FORM BUILDER PAGE
// Manage custom forms for idea submission
// ==============================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, GripVertical, Edit2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
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

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  textbox: 'Text Box',
  opentext: 'Open Text (Multi-line)',
  dropdown: 'Dropdown',
};

export default function FormBuilderPage() {
  const navigate = useNavigate();
  const { data: forms, isLoading } = useIdeationForms();
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState<string | null>(null);

  const { data: selectedForm, isLoading: isLoadingForm } = useIdeationForm(selectedFormId);
  const createForm = useCreateIdeationForm();
  const deleteForm = useDeleteIdeationForm();

  const [newFormName, setNewFormName] = useState('');
  const [newFormDescription, setNewFormDescription] = useState('');

  const handleCreateForm = () => {
    if (!newFormName.trim()) return;
    createForm.mutate(
      { name: newFormName.trim(), description: newFormDescription.trim() || undefined },
      {
        onSuccess: (form) => {
          setSelectedFormId(form.id);
          setShowCreateForm(false);
          setNewFormName('');
          setNewFormDescription('');
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

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate('/items/ideation')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Form Builder</h1>
          <p className="text-sm text-muted-foreground">Create and manage custom forms for idea submission</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Forms List */}
        <div className="w-80 border-r border-border p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-foreground">Forms</h2>
            <Button size="sm" onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Form
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : forms?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No forms created yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {forms?.map((form) => (
                <Card
                  key={form.id}
                  className={`cursor-pointer transition-colors ${
                    selectedFormId === form.id
                      ? 'border-brand-gold bg-brand-gold/5'
                      : 'hover:border-brand-gold/50'
                  }`}
                  onClick={() => setSelectedFormId(form.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{form.name}</p>
                        {form.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {form.description}
                          </p>
                        )}
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {form.fields?.length || 0} fields
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteForm(form.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Form Editor */}
        <div className="flex-1 p-6 overflow-y-auto">
          {!selectedFormId ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Select a form to edit or create a new one</p>
              </div>
            </div>
          ) : isLoadingForm ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : selectedForm ? (
            <FormEditor form={selectedForm} />
          ) : null}
        </div>
      </div>

      {/* Create Form Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Form</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="form-name">Form Name</Label>
              <Input
                id="form-name"
                value={newFormName}
                onChange={(e) => setNewFormName(e.target.value)}
                placeholder="e.g., Customer Feedback Form"
              />
            </div>
            <div>
              <Label htmlFor="form-description">Description (optional)</Label>
              <Textarea
                id="form-description"
                value={newFormDescription}
                onChange={(e) => setNewFormDescription(e.target.value)}
                placeholder="Describe the purpose of this form"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateForm} disabled={!newFormName.trim() || createForm.isPending}>
              Create Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Form Confirmation */}
      <AlertDialog open={!!showDeleteForm} onOpenChange={() => setShowDeleteForm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this form and all its fields. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteForm}
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

// Form Editor Component
function FormEditor({ form }: { form: IdeationForm }) {
  const updateForm = useUpdateIdeationForm();
  const createField = useCreateFormField();
  const updateField = useUpdateFormField();
  const deleteField = useDeleteFormField();

  const [editingName, setEditingName] = useState(false);
  const [formName, setFormName] = useState(form.name);
  const [formDescription, setFormDescription] = useState(form.description || '');

  const [showAddField, setShowAddField] = useState(false);
  const [editingField, setEditingField] = useState<IdeationFormField | null>(null);
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

  const handleSaveFormName = () => {
    if (!formName.trim()) return;
    updateForm.mutate({ id: form.id, name: formName.trim(), description: formDescription.trim() || undefined });
    setEditingName(false);
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
    setEditingField(field);
    setFieldLabel(field.label);
    setFieldType(field.field_type);
    setFieldRequired(field.is_required);
    setFieldExternal(field.is_external);
    setFieldHelpText(field.help_text || '');
    setFieldOptions(field.options?.join('\n') || '');
  };

  const handleUpdateField = () => {
    if (!editingField || !fieldLabel.trim()) return;
    const options = fieldType === 'dropdown' ? fieldOptions.split('\n').filter((o) => o.trim()) : [];
    updateField.mutate(
      {
        id: editingField.id,
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
          setEditingField(null);
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
    <div className="space-y-6">
      {/* Form Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            {editingName ? (
              <div className="flex-1 space-y-3">
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Form name"
                  className="text-lg font-semibold"
                />
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveFormName} disabled={updateForm.isPending}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFormName(form.name);
                      setFormDescription(form.description || '');
                      setEditingName(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <CardTitle className="text-xl">{form.name}</CardTitle>
                  {form.description && (
                    <p className="text-sm text-muted-foreground mt-1">{form.description}</p>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => setEditingName(true)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Fields Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-foreground">Form Fields</h3>
          <Button size="sm" onClick={() => setShowAddField(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Field
          </Button>
        </div>

        {form.fields?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>No fields added yet. Add fields to customize this form.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {form.fields?.map((field, index) => (
              <Card
                key={field.id}
                className={`${!field.is_active ? 'opacity-50' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{field.label}</span>
                        {field.is_required && (
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        )}
                        {field.is_external && (
                          <Badge variant="secondary" className="text-xs">External</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {FIELD_TYPE_LABELS[field.field_type]}
                        </Badge>
                        {field.help_text && (
                          <span className="text-xs text-muted-foreground truncate">
                            {field.help_text}
                          </span>
                        )}
                      </div>
                      {field.field_type === 'dropdown' && field.options?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Options: {field.options.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.is_active}
                        onCheckedChange={() => handleToggleActive(field)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditField(field)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteFieldId(field.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Field Dialog */}
      <Dialog
        open={showAddField || !!editingField}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddField(false);
            setEditingField(null);
            resetFieldForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingField ? 'Edit Field' : 'Add Field'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="field-label">Label</Label>
              <Input
                id="field-label"
                value={fieldLabel}
                onChange={(e) => setFieldLabel(e.target.value)}
                placeholder="e.g., Business Justification"
              />
            </div>
            <div>
              <Label htmlFor="field-type">Field Type</Label>
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
            {fieldType === 'dropdown' && (
              <div>
                <Label htmlFor="field-options">Options (one per line)</Label>
                <Textarea
                  id="field-options"
                  value={fieldOptions}
                  onChange={(e) => setFieldOptions(e.target.value)}
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  rows={4}
                />
              </div>
            )}
            <div>
              <Label htmlFor="field-help">Help Text (optional)</Label>
              <Input
                id="field-help"
                value={fieldHelpText}
                onChange={(e) => setFieldHelpText(e.target.value)}
                placeholder="Instructions for filling this field"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="field-required">Required</Label>
              <Switch
                id="field-required"
                checked={fieldRequired}
                onCheckedChange={setFieldRequired}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="field-external">Visible to External Users</Label>
              <Switch
                id="field-external"
                checked={fieldExternal}
                onCheckedChange={setFieldExternal}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddField(false);
                setEditingField(null);
                resetFieldForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingField ? handleUpdateField : handleAddField}
              disabled={!fieldLabel.trim() || createField.isPending || updateField.isPending}
            >
              {editingField ? 'Update' : 'Add'} Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Field Confirmation */}
      <AlertDialog open={!!deleteFieldId} onOpenChange={() => setDeleteFieldId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Field?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this field. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteField}
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
