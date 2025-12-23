import { Plus } from 'lucide-react';

interface OwnerCellProps {
  name: string | null;
}

export function OwnerCell({ name }: OwnerCellProps) {
  if (!name) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-[30px] h-[30px] rounded-full border-2 border-dashed border-[var(--industry-border-default)] flex items-center justify-center">
          <Plus className="h-3 w-3 text-[var(--industry-text-disabled)]" />
        </div>
        <span className="text-[13px] text-[var(--industry-text-disabled)]">Assign</span>
      </div>
    );
  }

  const displayInitials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-[30px] h-[30px] rounded-full bg-[hsl(var(--secondary-olive))]/12 flex items-center justify-center">
        <span className="text-[10px] font-semibold text-[hsl(var(--secondary-olive))]">
          {displayInitials}
        </span>
      </div>
      <span className="text-[13px] font-medium text-foreground truncate max-w-[100px]">{name}</span>
    </div>
  );
}
