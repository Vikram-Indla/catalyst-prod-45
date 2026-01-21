// =====================================================
// DRAGGABLE STEP ROW
// Individual step row with drag handle and inline editing
// =====================================================

import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  GripVertical, 
  MoreVertical, 
  Copy, 
  Trash2, 
  Plus,
  Play,
  CheckCircle,
  Settings,
  XCircle,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react';
import { EditorStep, STEP_TYPES, validateStep } from '../types/step-editor';
import { cn } from '@/lib/utils';

interface DraggableStepRowProps {
  step: EditorStep;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<EditorStep>) => void;
  onDelete: () => void;
  onClone: () => void;
  onInsertAfter: () => void;
  disabled?: boolean;
}

const STEP_TYPE_ICONS = {
  action: Play,
  verification: CheckCircle,
  setup: Settings,
  teardown: XCircle,
};

const STEP_TYPE_COLORS = {
  action: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
  verification: 'text-green-600 bg-green-50 dark:bg-green-950/30',
  setup: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30',
  teardown: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
};

export function DraggableStepRow({
  step,
  index,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onClone,
  onInsertAfter,
  disabled,
}: DraggableStepRowProps) {
  const [localAction, setLocalAction] = useState(step.action);
  const [localExpected, setLocalExpected] = useState(step.expected_result);
  const actionRef = useRef<HTMLTextAreaElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const validation = validateStep(step);
  const Icon = STEP_TYPE_ICONS[step.step_type] || Play;
  const colorClass = STEP_TYPE_COLORS[step.step_type] || STEP_TYPE_COLORS.action;

  useEffect(() => {
    if (step.isNew && actionRef.current) {
      actionRef.current.focus();
    }
  }, [step.isNew]);

  const handleActionBlur = () => {
    if (localAction !== step.action) {
      onUpdate({ action: localAction });
    }
  };

  const handleExpectedBlur = () => {
    if (localExpected !== step.expected_result) {
      onUpdate({ expected_result: localExpected });
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group border rounded-lg bg-card transition-all',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary',
        !validation.isValid && 'border-destructive/50',
        step.is_optional && 'border-dashed'
      )}
    >
      {/* Compact Row */}
      <div className="flex items-center gap-2 p-3">
        {/* Drag Handle */}
        <button
          className="cursor-grab hover:bg-muted p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Step Number */}
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
          {step.step_number}
        </div>

        {/* Step Type Badge */}
        <Badge variant="outline" className={cn('gap-1', colorClass)}>
          <Icon className="h-3 w-3" />
          {step.step_type}
        </Badge>

        {/* Action Preview/Edit */}
        <div className="flex-1 min-w-0">
          <Textarea
            ref={actionRef}
            value={localAction}
            onChange={(e) => setLocalAction(e.target.value)}
            onBlur={handleActionBlur}
            placeholder="Enter step action..."
            className={cn(
              'min-h-[36px] h-auto resize-none border-0 shadow-none p-0 focus-visible:ring-0',
              validation.errors.action && 'text-destructive'
            )}
            rows={1}
          />
        </div>

        {/* Optional Badge */}
        {step.is_optional && (
          <Badge variant="secondary" className="text-xs">Optional</Badge>
        )}

        {/* Expand Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleExpand}
          className="h-8 w-8"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onClone}>
              <Copy className="h-4 w-4 mr-2" />
              Clone Step
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onInsertAfter}>
              <Plus className="h-4 w-4 mr-2" />
              Insert Below
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Step
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 space-y-3 border-t bg-muted/30">
          <div className="grid grid-cols-2 gap-4 pt-3">
            {/* Step Type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Step Type
              </label>
              <Select
                value={step.step_type}
                onValueChange={(v) => onUpdate({ step_type: v as EditorStep['step_type'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STEP_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estimated Time */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Est. Time (seconds)
              </label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={step.estimated_time_seconds || ''}
                  onChange={(e) => onUpdate({ estimated_time_seconds: e.target.value ? Number(e.target.value) : null })}
                  placeholder="30"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Expected Result */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Expected Result
            </label>
            <Textarea
              value={localExpected}
              onChange={(e) => setLocalExpected(e.target.value)}
              onBlur={handleExpectedBlur}
              placeholder="What should happen after this step..."
              className={cn(
                'resize-none',
                validation.errors.expected_result && 'border-destructive'
              )}
              rows={2}
            />
          </div>

          {/* Test Data */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Test Data
            </label>
            <Textarea
              value={step.test_data}
              onChange={(e) => onUpdate({ test_data: e.target.value })}
              placeholder="Input data for this step..."
              className="resize-none font-mono text-sm"
              rows={2}
            />
          </div>

          {/* Notes & Optional Toggle */}
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Notes
              </label>
              <Input
                value={step.notes}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Switch
                checked={step.is_optional}
                onCheckedChange={(checked) => onUpdate({ is_optional: checked })}
                id={`optional-${step.id}`}
              />
              <label htmlFor={`optional-${step.id}`} className="text-sm">
                Optional
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
