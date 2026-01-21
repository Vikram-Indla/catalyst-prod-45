// ════════════════════════════════════════════════════════════════════════════
// CREATE WORK ITEM MODAL - Epics, Features, Stories, Tasks, Bugs
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { X, Target, Package, BookOpen, CheckSquare, Bug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpaceStore } from '@/stores/spaceStore';
import { useCreateSpaceWorkItem, type SpaceWorkItemType, type SpaceWorkItemPriority } from '@/hooks/spaces/useSpaceWorkItems';
import { toast } from 'sonner';

const typeOptions: { value: SpaceWorkItemType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'epic', label: 'Epic', icon: Target, color: 'text-purple-600' },
  { value: 'feature', label: 'Feature', icon: Package, color: 'text-blue-600' },
  { value: 'story', label: 'Story', icon: BookOpen, color: 'text-green-600' },
  { value: 'task', label: 'Task', icon: CheckSquare, color: 'text-primary' },
  { value: 'bug', label: 'Bug', icon: Bug, color: 'text-red-600' },
];

const priorityOptions: { value: SpaceWorkItemPriority; label: string }[] = [
  { value: 'highest', label: 'Highest' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'lowest', label: 'Lowest' },
];

export function CreateWorkItemModal() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { isCreateWorkItemModalOpen, createWorkItemType, closeCreateWorkItemModal } = useSpaceStore();
  const createWorkItem = useCreateSpaceWorkItem();

  const [type, setType] = useState<SpaceWorkItemType>(createWorkItemType || 'story');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<SpaceWorkItemPriority>('medium');
  const [storyPoints, setStoryPoints] = useState<number | ''>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceId || !summary.trim()) return;

    try {
      await createWorkItem.mutateAsync({
        space_id: spaceId,
        type,
        summary: summary.trim(),
        description: description.trim() || undefined,
        priority,
        story_points: storyPoints ? Number(storyPoints) : undefined,
      });
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} created`);
      handleClose();
    } catch (error) {
      toast.error('Failed to create work item');
    }
  };

  const handleClose = () => {
    setSummary('');
    setDescription('');
    setPriority('medium');
    setStoryPoints('');
    closeCreateWorkItemModal();
  };

  if (!isCreateWorkItemModalOpen) return null;

  const selectedType = typeOptions.find((t) => t.value === type);
  const TypeIcon = selectedType?.icon || BookOpen;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative w-full max-w-lg bg-background rounded-lg shadow-xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <TypeIcon className={cn('w-5 h-5', selectedType?.color)} />
            <h2 className="text-lg font-semibold text-foreground">Create {selectedType?.label}</h2>
          </div>
          <button onClick={handleClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Type</label>
            <div className="flex gap-2">
              {typeOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
                      type === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', opt.color)} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Summary <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={`What needs to be done?`}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:border-primary focus:outline-none"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Priority & Points */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as SpaceWorkItemPriority)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:border-primary focus:outline-none"
              >
                {priorityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {['story', 'feature', 'epic'].includes(type) && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Story Points</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={storyPoints}
                  onChange={(e) => setStoryPoints(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:border-primary focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!summary.trim() || createWorkItem.isPending}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {createWorkItem.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
