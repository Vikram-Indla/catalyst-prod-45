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
        "text-[var(--brand-bronze)]",
        "hover:bg-[var(--brand-bronze)]/10",
        "transition-colors cursor-pointer"
      )}
    >
      {requestKey}
    </button>
  );
}
