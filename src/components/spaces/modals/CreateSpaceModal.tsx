// ════════════════════════════════════════════════════════════════════════════
// CREATE SPACE MODAL
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useCreateSpace, useSpaceKeyAvailability, useSpaceCategories } from '@/hooks/spaces';
import { useSpaceStore } from '@/stores/spaceStore';
import { SpaceAvatar } from '../shared/SpaceAvatar';
import { SPACE_COLORS, SPACE_TYPE_CONFIG } from '@/lib/space-constants';
import { cn } from '@/lib/utils';
import type { SpaceType } from '@/types/spaces';

export function CreateSpaceModal() {
  const navigate = useNavigate();
  const { isCreateModalOpen, closeCreateModal } = useSpaceStore();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [type, setType] = useState<SpaceType>('kanban');
  const [color, setColor] = useState<string>(SPACE_COLORS[0]);
  const [categoryId, setCategoryId] = useState('');

  const { data: categories = [] } = useSpaceCategories();
  const { data: isKeyAvailable, isLoading: checkingKey } = useSpaceKeyAvailability(key);
  const createSpace = useCreateSpace();

  // Auto-generate key from name
  useEffect(() => {
    if (!keyTouched && name) {
      const generated = name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 10);
      setKey(generated);
    }
  }, [name, keyTouched]);

  // Reset on close
  useEffect(() => {
    if (!isCreateModalOpen) {
      setName('');
      setKey('');
      setKeyTouched(false);
      setDescription('');
      setType('kanban');
      setColor(SPACE_COLORS[0]);
      setCategoryId('');
    }
  }, [isCreateModalOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) return;

    createSpace.mutate(
      {
        name: name.trim(),
        key: key.toUpperCase().trim(),
        description: description.trim() || undefined,
        type,
        color,
        category_id: categoryId || undefined,
      },
      {
        onSuccess: (space) => {
          closeCreateModal();
          navigate(`/spaces/${space.id}`);
        },
      }
    );
  };

  if (!isCreateModalOpen) return null;

  const isValid = name.trim() && key.trim() && key.length >= 2 && isKeyAvailable !== false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={closeCreateModal} />
      
      <div className="relative bg-background border border-border rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Create Space</h2>
          <button
            onClick={closeCreateModal}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <SpaceAvatar name={name || 'New'} spaceKey={key || 'NEW'} color={color} size="lg" />
            <div>
              <div className="font-medium text-foreground">{name || 'Space Name'}</div>
              <div className="text-sm text-muted-foreground">{key || 'KEY'}</div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="My Project"
              autoFocus
            />
          </div>

          {/* Key */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Key <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => {
                setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                setKeyTouched(true);
              }}
              maxLength={10}
              className={cn(
                'w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-1',
                isKeyAvailable === false
                  ? 'border-destructive focus:border-destructive focus:ring-destructive'
                  : 'border-border focus:border-primary focus:ring-primary'
              )}
              placeholder="MYPRJ"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">2-10 uppercase letters/numbers</span>
              {key.length >= 2 && (
                <span
                  className={cn(
                    'text-xs',
                    checkingKey
                      ? 'text-muted-foreground'
                      : isKeyAvailable
                      ? 'text-green-600'
                      : 'text-destructive'
                  )}
                >
                  {checkingKey ? 'Checking...' : isKeyAvailable ? '✓ Available' : '✗ Taken'}
                </span>
              )}
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(SPACE_TYPE_CONFIG) as SpaceType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    'p-3 border rounded-lg text-center transition-colors',
                    type === t
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-muted-foreground'
                  )}
                >
                  <div className="text-sm font-medium text-foreground">
                    {SPACE_TYPE_CONFIG[t].label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Color</label>
            <div className="flex flex-wrap gap-2">
              {SPACE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-md transition-all',
                    color === c && 'ring-2 ring-offset-2 ring-primary'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm cursor-pointer focus:border-primary focus:outline-none"
            >
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Brief description..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeCreateModal}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || createSpace.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createSpace.isPending ? 'Creating...' : 'Create Space'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
