import { cn } from '@/lib/utils';

interface IdCellProps {
  requestKey: string;
  onClick: (e: React.MouseEvent) => void;
}

/**
 * ID Cell with dark mode support (9.5 grade compliance)
 * Uses brighter gold (#d4a855) in dark mode for visibility
 * whitespace-nowrap prevents ID from breaking into multiple lines
 */
export function IdCell({ requestKey, onClick }: IdCellProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "font-mono text-sm font-medium px-2 py-1 rounded whitespace-nowrap",
        "text-[#c69c6d] hover:bg-[#c69c6d]/10",
        "dark:text-[#d4a855] dark:hover:bg-[#d4a855]/10",
        "transition-colors cursor-pointer"
      )}
    >
      {requestKey}
    </button>
  );
}
