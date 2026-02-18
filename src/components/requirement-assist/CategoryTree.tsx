import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useRaCategories, useCreateRaCategory } from '@/hooks/useRaCategories';
import type { RaCategory } from '@/types/requirement-assist';
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';

interface CategoryTreeProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

function TreeItem({
  category,
  depth,
  selectedId,
  onSelect,
}: {
  category: RaCategory & { children?: RaCategory[] };
  depth: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;
  const isActive = selectedId === category.id;

  return (
    <div>
      <button
        onClick={() => onSelect(isActive ? null : category.id)}
        className={cn(
          'w-full h-9 flex items-center gap-1.5 text-left transition-colors',
          isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-zinc-50 text-zinc-700'
        )}
        style={{ paddingLeft: `${12 + depth * 20}px`, paddingRight: 12 }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="shrink-0 w-4 h-4 flex items-center justify-center text-zinc-400 hover:text-zinc-600"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="text-[13px] truncate flex-1">{category.name}</span>
      </button>

      {hasChildren && expanded && (
        <div>
          {category.children!.map(child => (
            <TreeItem
              key={child.id}
              category={child as RaCategory & { children?: RaCategory[] }}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryTree({ selectedId, onSelect }: CategoryTreeProps) {
  const { data: categories, isLoading } = useRaCategories();
  const createCategory = useCreateRaCategory();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await createCategory.mutateAsync({ name: newName.trim() });
      setNewName('');
      setAdding(false);
    } catch { /* handled by mutation */ }
  };

  return (
    <div className="h-full bg-white border-r border-[hsl(var(--border))] overflow-y-auto">
      <div className="px-4 py-3.5 border-b border-[hsl(var(--border))] flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Categories</h3>
        <button
          onClick={() => setAdding(!adding)}
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-zinc-100 text-muted-foreground transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {adding && (
        <div className="px-3 py-2 border-b border-[hsl(var(--border))]">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
            placeholder="Category name…"
            className="w-full h-7 px-2 text-xs rounded border border-[hsl(var(--border))] focus:outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/10"
          />
        </div>
      )}

      {/* All documents item */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'w-full h-9 flex items-center gap-1.5 px-3 text-left transition-colors',
          selectedId === null ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-zinc-50 text-zinc-700'
        )}
      >
        <span className="w-4 shrink-0" />
        <span className="text-[13px]">All Documents</span>
      </button>

      {isLoading ? (
        <div className="px-4 py-3 text-xs text-muted-foreground">Loading…</div>
      ) : !categories?.length ? (
        <div className="px-4 py-3 text-xs text-muted-foreground">No categories yet</div>
      ) : (
        categories.map(cat => (
          <TreeItem
            key={cat.id}
            category={cat as RaCategory & { children?: RaCategory[] }}
            depth={0}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))
      )}
    </div>
  );
}
