/**
 * LabelsDropdown - Inline editable labels with multi-select + create
 * Extracted from TaskListRowV3 for modularity
 */

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { Check, Plus, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { TaskListTask } from '../../hooks/useTaskList';
import type { Label } from '@/components/planner/task-modal/types/labels';
import { LabelBadge } from '@/components/planner/task-modal/molecules/LabelBadge';
import { useLabels } from '@/components/planner/task-modal/hooks/useLabels';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export interface LabelsDropdownProps {
  task: TaskListTask;
  taskLabels: Label[];
  width: number | string;
}

// Predefined label colors for color picker
const LABEL_COLORS = [
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Gray', value: '#64748b' },
  { name: 'Lime', value: '#84cc16' }
];

export const LabelsDropdown = memo(function LabelsDropdown({ task, taskLabels, width }: LabelsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [updatingLabels, setUpdatingLabels] = useState<Set<string>>(new Set());
  const [localLabels, setLocalLabels] = useState<Label[]>(taskLabels);
  const [isCreating, setIsCreating] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[6].value); // Default blue
  const [isSavingLabel, setIsSavingLabel] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const createInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const { labels: allLabels, isLoading: labelsLoading, createLabel, refetch: refetchLabels } = useLabels();

  // Sync with props when external data changes (realtime updates)
  useEffect(() => {
    setLocalLabels(taskLabels);
  }, [taskLabels]);

  useEffect(() => {
    if (open && !isCreating) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, isCreating]);

  useEffect(() => {
    if (isCreating) {
      setTimeout(() => createInputRef.current?.focus(), 0);
    }
  }, [isCreating]);

  const filteredLabels = useMemo(() => {
    if (!search.trim()) return allLabels;
    const lower = search.toLowerCase();
    return allLabels.filter(l => l.name?.toLowerCase().includes(lower));
  }, [allLabels, search]);

  const isLabelAssigned = useCallback((labelId: string) => {
    return localLabels.some(l => l.id === labelId);
  }, [localLabels]);

  const toggleLabel = async (label: Label) => {
    const labelId = label.id;

    // Mark this label as updating
    setUpdatingLabels(prev => new Set(prev).add(labelId));

    const isAssigned = isLabelAssigned(labelId);

    try {
      if (isAssigned) {
        // Remove label
        const { error } = await supabase
          .from('planner_task_labels')
          .delete()
          .eq('task_id', task.id)
          .eq('label_id', labelId);

        if (error) throw error;
        setLocalLabels(prev => prev.filter(l => l.id !== labelId));
      } else {
        // Add label
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('planner_task_labels')
          .insert({
            task_id: task.id,
            label_id: labelId,
            assigned_by: user?.id
          });

        if (error && error.code !== '23505') throw error;
        setLocalLabels(prev => [...prev, label]);
      }

      // Invalidate cache so table updates
      queryClient.invalidateQueries({ queryKey: ['task-labels-map'] });
    } catch (error) {
      console.error('Error toggling label:', error);
      toast.error('Failed to update label');
    } finally {
      setUpdatingLabels(prev => {
        const next = new Set(prev);
        next.delete(labelId);
        return next;
      });
    }
  };

  const removeAllLabels = async () => {
    if (localLabels.length === 0) return;

    // Mark all as updating
    const allIds = new Set(localLabels.map(l => l.id));
    setUpdatingLabels(allIds);

    try {
      const { error } = await supabase
        .from('planner_task_labels')
        .delete()
        .eq('task_id', task.id);

      if (error) throw error;
      setLocalLabels([]);
      queryClient.invalidateQueries({ queryKey: ['task-labels-map'] });
      toast.success('All labels removed');
    } catch (error) {
      console.error('Error removing all labels:', error);
      toast.error('Failed to remove labels');
    } finally {
      setUpdatingLabels(new Set());
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) {
      toast.error('Label name is required');
      return;
    }

    setIsSavingLabel(true);
    try {
      const newLabel = await createLabel(newLabelName.trim(), newLabelColor);

      if (newLabel) {
        // Refetch labels to get the updated list
        await refetchLabels();

        // Also assign the new label to this task
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('planner_task_labels')
          .insert({
            task_id: task.id,
            label_id: newLabel.id,
            assigned_by: user?.id
          });

        if (error && error.code !== '23505') throw error;

        // Update local state
        setLocalLabels(prev => [...prev, newLabel]);
        queryClient.invalidateQueries({ queryKey: ['task-labels-map'] });

        // Reset form
        setNewLabelName('');
        setNewLabelColor(LABEL_COLORS[6].value);
        setIsCreating(false);
        toast.success(`Label "${newLabel.name}" created and assigned`);
      }
    } catch (error) {
      console.error('Error creating label:', error);
      toast.error('Failed to create label');
    } finally {
      setIsSavingLabel(false);
    }
  };

  const hasAssignedLabels = localLabels.length > 0;

  // Check if search matches no existing labels (for create suggestion)
  const showCreateFromSearch = search.trim() &&
    !allLabels.some(l => l.name.toLowerCase() === search.toLowerCase().trim());

  return (
    <td style={{ width }} onClick={(e) => e.stopPropagation()}>
      <Popover open={open} onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setSearch('');
          setIsCreating(false);
          setNewLabelName('');
        }
      }}>
        <PopoverTrigger asChild>
          <button className="w-full flex items-center gap-1 min-h-[32px] px-1 py-1 rounded-md cursor-pointer bg-transparent border-0 hover:bg-muted/50 transition-colors text-left">
            {localLabels.length > 0 ? (
              <div className="flex flex-wrap gap-1 items-center">
                {localLabels.slice(0, 2).map(label => (
                  <LabelBadge key={label.id} label={label} size="sm" />
                ))}
                {localLabels.length > 2 && (
                  <span
                    className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                  >
                    +{localLabels.length - 2}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground text-sm flex items-center gap-1">
                <Plus className="w-3 h-3" />
                Add label
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-72 p-0 z-[500] bg-popover border border-border shadow-lg"
          align="start"
        >
          {isCreating ? (
            /* Create New Label Form */
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Create New Label</span>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  Cancel
                </button>
              </div>

              {/* Label name input */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                <input
                  ref={createInputRef}
                  type="text"
                  placeholder="Enter label name..."
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateLabel();
                    if (e.key === 'Escape') setIsCreating(false);
                  }}
                  className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Color picker */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Color</label>
                <div className="flex flex-wrap gap-1.5">
                  {LABEL_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewLabelColor(color.value)}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-all",
                        newLabelColor === color.value
                          ? "border-foreground scale-110"
                          : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Preview:</span>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: newLabelColor }}
                >
                  {newLabelName || 'Label name'}
                </span>
              </div>

              {/* Create button */}
              <button
                onClick={handleCreateLabel}
                disabled={!newLabelName.trim() || isSavingLabel}
                className={cn(
                  "w-full py-2 rounded-md text-sm font-medium transition-colors",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isSavingLabel ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </span>
                ) : (
                  'Create & Assign Label'
                )}
              </button>
            </div>
          ) : (
            /* Default: Search and Select Labels */
            <>
              {/* Header with search and clear all */}
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search labels..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {hasAssignedLabels && (
                  <button
                    onClick={removeAllLabels}
                    disabled={updatingLabels.size > 0}
                    className="w-full mt-2 text-xs text-destructive hover:text-destructive/80 font-medium text-left px-1 disabled:opacity-50"
                  >
                    Remove all labels ({localLabels.length})
                  </button>
                )}
              </div>

              {/* Labels list */}
              <div className="max-h-[240px] overflow-y-auto p-1.5">
                {labelsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredLabels.length === 0 && !showCreateFromSearch ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    {search ? 'No labels found' : 'No labels available'}
                  </div>
                ) : (
                  <>
                    {filteredLabels.map((label) => {
                      const isAssigned = isLabelAssigned(label.id);
                      const isUpdating = updatingLabels.has(label.id);
                      return (
                        <button
                          key={label.id}
                          onClick={() => toggleLabel(label)}
                          disabled={isUpdating}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                            isAssigned ? "bg-muted font-medium" : "hover:bg-muted/50",
                            isUpdating && "opacity-50 cursor-wait"
                          )}
                        >
                          {/* Color dot */}
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: label.color }}
                          />
                          {/* Label name */}
                          <span className="flex-1 text-left truncate">{label.name}</span>
                          {/* Loading or checkmark */}
                          {isUpdating ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
                          ) : isAssigned ? (
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          ) : null}
                        </button>
                      );
                    })}

                    {/* Create from search suggestion */}
                    {showCreateFromSearch && (
                      <button
                        onClick={() => {
                          setNewLabelName(search.trim());
                          setIsCreating(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm hover:bg-muted/50 transition-colors text-primary"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create "{search.trim()}"</span>
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Create new label button */}
              <div className="p-2 border-t border-border">
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create new label
                </button>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
    </td>
  );
});
