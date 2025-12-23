import { GripVertical } from 'lucide-react';

interface RankCellProps {
  displayIndex: number;
}

export function RankCell({ displayIndex }: RankCellProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div 
        className="cursor-grab text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-muted transition-colors"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#c69c6d]/15 text-[#8b7355]">
        #{displayIndex}
      </span>
    </div>
  );
}
