/**
 * Template Editor Dialog
 * Create/Edit templates with full step configuration
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, GripVertical } from 'lucide-react';
import {
  useTemplateCategories,
  useCreateTemplate,
  useUpdateTemplate,
} from '../../hooks/useTemplates';
import type { TestCaseTemplate, TemplateData, TemplateStep } from '../../types/template';

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: TestCaseTemplate | null;
  projectId?: string | null;
}

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const TEST_TYPES = [
  'functional',
  'regression',
  'smoke',
  'integration',
  'e2e',
  'performance',
  'security',
  'usability',
  'exploratory',
] as const;

export function TemplateEditorDialog({
  open,
  onOpenChange,
  template,
  projectId,
}: TemplateEditorDialogProps) {
  const isEditing = !!template;
  const { data: categories = [] } = useTemplateCategories();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [objective, setObjective] = useState('');
  const [preconditions, setPreconditions] = useState('');
  const [priority, setPriority] = useState<string>('');
  const [testType, setTestType] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [steps, setSteps] = useState<TemplateStep[]>([]);

  // Reset form when dialog opens/template changes
  useEffect(() => {
    if (open) {
      if (template) {
        setName(template.name);
        setDescription(template.description || '');
        setCategoryId(template.category_id || '');
        setIsGlobal(template.is_global);
        setObjective(template.template_data.objective || '');
        setPreconditions(template.template_data.preconditions || '');
        setPriority(template.template_data.priority || '');
        setTestType(template.template_data.test_type || '');
        setTags(template.template_data.tags || []);
        setSteps(template.template_data.steps || []);
      } else {
        setName('');
        setDescription('');
        setCategoryId('');
        setIsGlobal(false);
        setObjective('');
        setPreconditions('');
        setPriority('');
        setTestType('');
        setTags([]);
        setSteps([]);
      }
      setTagInput('');
    }
  }, [open, template]);

  const addStep = () => {
    setSteps([
      ...steps,
      {
        order_index: steps.length + 1,
        action: '',
        expected_result: '',
      },
    ]);
  };

  const updateStep = (index: number, field: keyof TemplateStep, value: string) => {
    const updated = [...steps];
    (updated[index] as any)[field] = value;
    setSteps(updated);
  };

  const removeStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index);
    // Reindex
    updated.forEach((s, i) => (s.order_index = i + 1));
    setSteps(updated);
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    const templateData: TemplateData = {};
    if (objective) templateData.objective = objective;
    if (preconditions) templateData.preconditions = preconditions;
    if (priority) templateData.priority = priority as any;
    if (testType) templateData.test_type = testType as any;
    if (tags.length > 0) templateData.tags = tags;
    if (steps.length > 0) templateData.steps = steps.filter((s) => s.action);

    if (isEditing && template) {
      await updateTemplate.mutateAsync({
        id: template.id,
        name,
        description: description || undefined,
        category_id: categoryId || null,
        is_global: isGlobal,
        template_data: templateData,
      });
    } else {
      await createTemplate.mutateAsync({
        name,
        description: description || undefined,
        category_id: categoryId || undefined,
        is_global: isGlobal,
        project_id: projectId || undefined,
        template_data: templateData,
      });
    }

    onOpenChange(false);
  };

  const isSubmitting = createTemplate.isPending || updateTemplate.isPending;
  const canSubmit = name.trim().length > 0 && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Template' : 'Create Template'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="steps">Steps ({steps.length})</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Login Test Template"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this template is for..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Uncategorized</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label htmlFor="global">Global Template</Label>
                  <p className="text-xs text-muted-foreground">
                    Available across all projects
                  </p>
                </div>
                <Switch
                  id="global"
                  checked={isGlobal}
                  onCheckedChange={setIsGlobal}
                />
              </div>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Test Type</Label>
                  <Select value={testType} onValueChange={setTestType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {TEST_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">Objective</Label>
                <Textarea
                  id="objective"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="What is being tested..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preconditions">Preconditions</Label>
                <Textarea
                  id="preconditions"
                  value={preconditions}
                  onChange={(e) => setPreconditions(e.target.value)}
                  placeholder="Setup steps required before testing..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag..."
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Steps Tab */}
            <TabsContent value="steps" className="space-y-4 mt-0">
              {steps.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/30">
                  <p className="text-muted-foreground mb-4">No steps defined yet</p>
                  <Button variant="outline" onClick={addStep}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Step
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg bg-card space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          Step {step.order_index}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-auto text-destructive"
                          onClick={() => removeStep(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Action / Step description"
                        value={step.action}
                        onChange={(e) => updateStep(index, 'action', e.target.value)}
                      />
                      <Input
                        placeholder="Expected result"
                        value={step.expected_result}
                        onChange={(e) =>
                          updateStep(index, 'expected_result', e.target.value)
                        }
                      />
                    </div>
                  ))}
                  <Button variant="outline" onClick={addStep} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
