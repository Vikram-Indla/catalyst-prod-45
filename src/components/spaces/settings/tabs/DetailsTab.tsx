// ════════════════════════════════════════════════════════════════════════════
// DETAILS TAB - Edit space name, key, description, category, lead
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useUpdateSpace, useSpaceCategories } from '@/hooks/spaces';
import { SpaceAvatar } from '../../shared/SpaceAvatar';
import { SPACE_COLORS } from '@/lib/space-constants';
import { cn } from '@/lib/utils';
import type { Space } from '@/types/spaces';

interface DetailsTabProps {
  space: Space;
}

export function DetailsTab({ space }: DetailsTabProps) {
  const [name, setName] = useState(space.name);
  const [description, setDescription] = useState(space.description || '');
  const [color, setColor] = useState(space.color);
  const [categoryId, setCategoryId] = useState(space.category_id || '');

  const { data: categories = [] } = useSpaceCategories();
  const updateSpace = useUpdateSpace();

  const hasChanges =
    name !== space.name ||
    description !== (space.description || '') ||
    color !== space.color ||
    categoryId !== (space.category_id || '');

  const handleSave = () => {
    updateSpace.mutate({
      id: space.id,
      input: {
        name,
        description: description || undefined,
        color,
        category_id: categoryId || undefined,
      },
    });
  };

  const handleReset = () => {
    setName(space.name);
    setDescription(space.description || '');
    setColor(space.color);
    setCategoryId(space.category_id || '');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Avatar Preview */}
      <div className="flex items-center gap-4">
        <SpaceAvatar name={name} spaceKey={space.key} color={color} size="xl" />
        <div>
          <h3 className="font-medium text-foreground">{name || 'Space Name'}</h3>
          <p className="text-sm text-muted-foreground">{space.key}</p>
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
          placeholder="Space name"
        />
      </div>

      {/* Key (read-only) */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Key
        </label>
        <input
          type="text"
          value={space.key}
          disabled
          className="w-full px-3 py-2 bg-muted border border-border rounded-md text-sm text-muted-foreground cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground mt-1">
          The space key cannot be changed after creation.
        </p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          placeholder="Describe this space..."
        />
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {SPACE_COLORS.map((c) => (
            <button
              key={c}
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
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Category
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm cursor-pointer focus:border-primary focus:outline-none"
        >
          <option value="">No category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <button
          onClick={handleReset}
          disabled={!hasChanges}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges || !name.trim() || updateSpace.isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {updateSpace.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
