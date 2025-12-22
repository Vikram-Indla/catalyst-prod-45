import { cn } from '@/lib/utils';

interface IdCellProps {
  requestKey: string;
  onClick: (e: React.MouseEvent) => void;
}

export function IdCell({ requestKey, onClick }: IdCellProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "font-mono text-xs font-medium px-2 py-1 rounded",
        "bg-[hsl(var(--brand-primary))]/12 text-[hsl(var(--brand-primary))]",
        "hover:bg-[hsl(var(--brand-primary))] hover:text-white",
        "transition-colors cursor-pointer"
      )}
    >
      {requestKey}
    </button>
  );
}
