import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RankCellProps {
  rank: number | null;
}

export function RankCell({ rank }: RankCellProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div 
        className="cursor-grab text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-muted transition-colors"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <span 
        className={cn(
          "font-mono text-xs font-semibold px-2 py-0.5 rounded",
          rank 
            ? "bg-[hsl(var(--palette-champagne))]/20 text-[hsl(var(--secondary-bronze))]" 
            : "bg-muted text-muted-foreground"
        )}
      >
        {rank ? `#${rank}` : '—'}
      </span>
    </div>
  );
}
