import { X, Plus } from 'lucide-react';
import { Program } from '@/types/backlog.types';

interface TagsInputProps {
  tags: Program[];
  onRemove: (tagId: string) => void;
  onAdd: () => void;
}

export function TagsInput({ tags, onRemove, onAdd }: TagsInputProps) {
  return (
    <div className="flex flex-wrap gap-1.5 p-1.5 border border-border rounded min-h-[36px]">
      {tags.map((tag) => (
        <div
          key={tag.id}
          className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-sm text-xs text-primary"
        >
          <span>{tag.name}</span>
          <button
            onClick={() => onRemove(tag.id)}
            className="hover:text-destructive transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        onClick={onAdd}
        className="flex items-center justify-center w-6 h-6 border border-dashed border-border rounded-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}
