import { cn } from '@/lib/utils';

interface IdCellProps {
  requestKey: string;
  onClick: (e: React.MouseEvent) => void;
}

/**
 * ID Cell with dark mode support (9.5 grade compliance)
 * Uses brighter blue (#60a5fa) in dark mode for visibility
 * whitespace-nowrap prevents ID from breaking into multiple lines
 */
export function IdCell({ requestKey, onClick }: IdCellProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "font-mono text-sm font-medium px-2 py-1 rounded whitespace-nowrap",
        "text-[#2563eb] hover:bg-[rgba(37,99,235,0.1)]",
        "dark:text-[#60a5fa] dark:hover:bg-[rgba(96,165,250,0.1)]",
        "transition-colors cursor-pointer"
      )}
    >
      {requestKey}
    </button>
  );
}
