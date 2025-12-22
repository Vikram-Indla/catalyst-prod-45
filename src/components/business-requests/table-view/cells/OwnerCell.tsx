interface OwnerCellProps {
  name: string | null;
}

export function OwnerCell({ name }: OwnerCellProps) {
  if (!name) {
    return <span className="text-muted-foreground">—</span>;
  }

  const displayInitials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full bg-[hsl(var(--secondary-olive))]/12 flex items-center justify-center">
        <span className="text-[10px] font-semibold text-[hsl(var(--secondary-olive))]">
          {displayInitials}
        </span>
      </div>
      <span className="text-[13px] font-medium text-foreground truncate max-w-[100px]">{name}</span>
    </div>
  );
}
