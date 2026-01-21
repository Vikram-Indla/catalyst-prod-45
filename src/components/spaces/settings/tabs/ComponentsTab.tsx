// ════════════════════════════════════════════════════════════════════════════
// COMPONENTS TAB - Manage space components
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { useSpaceComponents, useCreateComponent, useDeleteComponent } from '@/hooks/spaces';
import { useSpaceStore } from '@/stores/spaceStore';

interface ComponentsTabProps {
  spaceId: string;
}

export function ComponentsTab({ spaceId }: ComponentsTabProps) {
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const { data: components = [], isLoading } = useSpaceComponents(spaceId);
  const createComponent = useCreateComponent();
  const deleteComponent = useDeleteComponent();
  const { openEditComponentModal } = useSpaceStore();

  const handleCreate = () => {
    if (!newName.trim()) return;
    createComponent.mutate(
      { spaceId, input: { name: newName, description: newDescription || undefined } },
      {
        onSuccess: () => {
          setNewName('');
          setNewDescription('');
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this component?')) {
      deleteComponent.mutate({ id, spaceId });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded-md animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <h3 className="font-medium text-foreground">Components</h3>
        <p className="text-sm text-muted-foreground">
          Organize work items by component or subsystem
        </p>
      </div>

      {/* Add New */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Component name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim() || createComponent.isPending}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Components List */}
      <div className="space-y-2">
        {components.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No components yet
          </div>
        ) : (
          components.map((comp) => (
            <div
              key={comp.id}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg group"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-foreground">{comp.name}</div>
                {comp.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {comp.description}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEditComponentModal(comp.id)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(comp.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
