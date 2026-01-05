/**
 * Case Modal Component
 * Create/Edit test case with step editor
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type {
  TestCase,
  TestStep,
  CreateTestCaseInput,
  CaseStatus,
  Folder,
} from '../../api/types';

interface StepInput {
  id: string;
  step_number: number;
  action: string;
  test_data: string;
  expected_result: string;
}

interface CaseModalProps {
  open: boolean;
  onClose: () => void;
  testCase?: TestCase | null;
  steps?: TestStep[];
  folders: Folder[];
  priorities: { id: string; name: string; color: string }[];
  caseTypes: { id: string; name: string }[];
  labels: { id: string; name: string; color: string }[];
  onSave: (data: CreateTestCaseInput, steps: Omit<TestStep, 'id' | 'case_id' | 'created_at' | 'updated_at'>[]) => void;
  isSubmitting?: boolean;
  projectId: string;
  defaultFolderId?: string | null;
}

const STATUS_OPTIONS: { value: CaseStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready for Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'needs_update', label: 'Needs Update' },
  { value: 'deprecated', label: 'Deprecated' },
];

function generateId() {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function flattenFolders(folders: Folder[], level = 0): { folder: Folder; level: number }[] {
  const result: { folder: Folder; level: number }[] = [];
  for (const folder of folders) {
    result.push({ folder, level });
    if (folder.children && folder.children.length > 0) {
      result.push(...flattenFolders(folder.children, level + 1));
    }
  }
  return result;
}

export function CaseModal({
  open,
  onClose,
  testCase,
  steps: initialSteps = [],
  folders,
  priorities,
  caseTypes,
  labels,
  onSave,
  isSubmitting,
  projectId,
  defaultFolderId,
}: CaseModalProps) {
  const isEditing = !!testCase;

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [preconditions, setPreconditions] = useState('');
  const [status, setStatus] = useState<CaseStatus>('draft');
  const [priorityId, setPriorityId] = useState<string>('');
  const [typeId, setTypeId] = useState<string>('');
  const [folderId, setFolderId] = useState<string>('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const [stepsList, setStepsList] = useState<StepInput[]>([]);
  const [draggedStepIndex, setDraggedStepIndex] = useState<number | null>(null);

  // Initialize form when modal opens or testCase changes
  useEffect(() => {
    if (open) {
      if (testCase) {
        setTitle(testCase.title);
        setDescription(testCase.description || '');
        setPreconditions(testCase.preconditions || '');
        setStatus(testCase.status);
        setPriorityId(testCase.priority_id || '');
        setTypeId(testCase.type_id || '');
        setFolderId(testCase.folder_id || '');
        setSelectedLabels(testCase.labels?.map((l) => l.id) || []);
        setEstimatedTime(testCase.estimated_time_minutes?.toString() || '');
        setStepsList(
          initialSteps.map((s) => ({
            id: s.id,
            step_number: s.step_number,
            action: s.action,
            test_data: s.test_data || '',
            expected_result: s.expected_result,
          }))
        );
      } else {
        // Reset for new case
        setTitle('');
        setDescription('');
        setPreconditions('');
        setStatus('draft');
        setPriorityId('');
        setTypeId('');
        setFolderId(defaultFolderId || '');
        setSelectedLabels([]);
        setEstimatedTime('');
        setStepsList([]);
      }
    }
  }, [open, testCase, initialSteps, defaultFolderId]);

  const handleAddStep = () => {
    const newStep: StepInput = {
      id: generateId(),
      step_number: stepsList.length + 1,
      action: '',
      test_data: '',
      expected_result: '',
    };
    setStepsList([...stepsList, newStep]);
  };

  const handleUpdateStep = (index: number, field: keyof StepInput, value: string) => {
    const updated = [...stepsList];
    updated[index] = { ...updated[index], [field]: value };
    setStepsList(updated);
  };

  const handleDeleteStep = (index: number) => {
    const updated = stepsList.filter((_, i) => i !== index);
    // Renumber steps
    updated.forEach((step, i) => {
      step.step_number = i + 1;
    });
    setStepsList(updated);
  };

  const handleDragStart = (index: number) => {
    setDraggedStepIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedStepIndex === null || draggedStepIndex === index) return;

    const updated = [...stepsList];
    const [removed] = updated.splice(draggedStepIndex, 1);
    updated.splice(index, 0, removed);
    // Renumber steps
    updated.forEach((step, i) => {
      step.step_number = i + 1;
    });
    setStepsList(updated);
    setDraggedStepIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedStepIndex(null);
  };

  const handleSubmit = () => {
    const caseData: CreateTestCaseInput = {
      project_id: projectId,
      title: title.trim(),
      description: description.trim() || undefined,
      preconditions: preconditions.trim() || undefined,
      status,
      priority_id: priorityId || undefined,
      type_id: typeId || undefined,
      folder_id: folderId || undefined,
      estimated_time_minutes: estimatedTime ? parseInt(estimatedTime, 10) : undefined,
      tags: selectedLabels.length > 0 ? selectedLabels : undefined,
    };

    const stepsData = stepsList
      .filter((s) => s.action.trim())
      .map((s) => ({
        step_number: s.step_number,
        action: s.action.trim(),
        test_data: s.test_data.trim() || undefined,
        expected_result: s.expected_result.trim(),
      }));

    onSave(caseData, stepsData);
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabels((prev) =>
      prev.includes(labelId) ? prev.filter((l) => l !== labelId) : [...prev, labelId]
    );
  };

  const flatFolders = flattenFolders(folders);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] h-[90vh] sm:h-auto p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border-subtle flex-shrink-0">
          <DialogTitle>
            {isEditing ? `Edit ${testCase.case_key}` : 'Create Test Case'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 overflow-auto">
          <div className="px-6 py-4">
          <div className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter test case title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            {/* Description & Preconditions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description">Objective / Description</Label>
                <Textarea
                  id="description"
                  placeholder="What is being tested?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preconditions">Preconditions</Label>
                <Textarea
                  id="preconditions"
                  placeholder="Setup required before test"
                  value={preconditions}
                  onChange={(e) => setPreconditions(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {/* Metadata Row */}
            <div className="grid grid-cols-4 gap-4">
              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as CaseStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priorityId} onValueChange={setPriorityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          {p.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={typeId} onValueChange={setTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {caseTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Est. Time */}
              <div className="space-y-2">
                <Label>Est. Time (min)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Minutes"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                />
              </div>
            </div>

            {/* Folder */}
            <div className="space-y-2">
              <Label>Folder</Label>
              <Select 
                value={folderId || '__none__'} 
                onValueChange={(v) => setFolderId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Root (no folder)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Root (no folder)</SelectItem>
                  {flatFolders.map(({ folder, level }) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <span style={{ paddingLeft: `${level * 16}px` }}>{folder.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Labels */}
            <div className="space-y-2">
              <Label>Labels</Label>
              <div className="flex flex-wrap gap-2 p-2 border border-border rounded-md min-h-[42px]">
                {labels.map((label) => (
                  <Badge
                    key={label.id}
                    variant={selectedLabels.includes(label.id) ? 'default' : 'outline'}
                    style={
                      selectedLabels.includes(label.id)
                        ? { backgroundColor: label.color, color: 'white' }
                        : {}
                    }
                    className="cursor-pointer"
                    onClick={() => toggleLabel(label.id)}
                  >
                    {label.name}
                  </Badge>
                ))}
                {labels.length === 0 && (
                  <span className="text-sm text-muted-foreground">No labels available</span>
                )}
              </div>
            </div>

            <Separator />

            {/* Steps Editor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Test Steps</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddStep}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Step
                </Button>
              </div>

              {stepsList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                  <p>No steps defined. Click "Add Step" to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stepsList.map((step, index) => (
                    <div
                      key={step.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'p-3 border border-border rounded-lg bg-surface-2 transition-opacity',
                        draggedStepIndex === index && 'opacity-50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex items-center gap-2 pt-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                          <Badge variant="outline" className="text-xs">
                            {step.step_number}
                          </Badge>
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Action *</Label>
                            <Textarea
                              placeholder="Action to perform"
                              value={step.action}
                              onChange={(e) => handleUpdateStep(index, 'action', e.target.value)}
                              rows={2}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Test Data</Label>
                            <Textarea
                              placeholder="Test data (optional)"
                              value={step.test_data}
                              onChange={(e) => handleUpdateStep(index, 'test_data', e.target.value)}
                              rows={2}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Expected Result *</Label>
                            <Textarea
                              placeholder="Expected outcome"
                              value={step.expected_result}
                              onChange={(e) =>
                                handleUpdateStep(index, 'expected_result', e.target.value)
                              }
                              rows={2}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteStep(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-border-subtle">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isSubmitting}>
            {isSubmitting ? (
              'Saving...'
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                {isEditing ? 'Save Changes' : 'Create Case'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CaseModal;
