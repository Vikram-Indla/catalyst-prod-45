import { cn } from '@/lib/utils';

export interface BrdSection {
  number: string;
  title: string;
  qualityGood: boolean;
}

interface BrdOutlineProps {
  sections: BrdSection[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function BrdOutline({ sections, activeIndex, onSelect }: BrdOutlineProps) {
  return (
    <div className="h-full bg-white border-r border-[hsl(var(--border))] overflow-y-auto">
      <div className="px-4 py-3.5 border-b border-[hsl(var(--border))]">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">BRD Outline</h3>
      </div>
      <div className="py-1">
        {sections.map((section, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={cn(
              'w-full flex items-center gap-2 px-3 h-9 text-left transition-colors',
              activeIndex === i
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'hover:bg-zinc-50 text-zinc-700'
            )}
          >
            <span
              className={cn(
                'w-[7px] h-[7px] rounded-full shrink-0',
                section.qualityGood ? 'bg-emerald-500' : 'bg-amber-500'
              )}
            />
            <span className="text-[11px] font-mono text-zinc-400 shrink-0 w-5">{section.number}</span>
            <span className="text-xs truncate">{section.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
