import { cn } from '@/lib/utils';

/**
 * Keyboard hints bar with dark mode support (9.5 grade compliance)
 * Uses proper contrast for kbd elements in both modes
 */
export function KeyboardHints() {
  return (
    <div className={cn(
      "flex items-center justify-end gap-4 px-4 py-2 text-xs",
      "border-t bg-gray-50 text-gray-500",
      "border-gray-200 dark:border-[#404040]",
      "dark:bg-[#0f0f0f] dark:text-gray-400"
    )}>
      <span className="flex items-center gap-1">
        <kbd className={cn(
          "px-1.5 py-0.5 rounded font-mono text-[10px]",
          "bg-gray-200 text-gray-600",
          "dark:bg-[#262626] dark:text-gray-300"
        )}>↑↓</kbd>
        Navigate
      </span>
      <span className="flex items-center gap-1">
        <kbd className={cn(
          "px-1.5 py-0.5 rounded font-mono text-[10px]",
          "bg-gray-200 text-gray-600",
          "dark:bg-[#262626] dark:text-gray-300"
        )}>Space</kbd>
        Select
      </span>
      <span className="flex items-center gap-1">
        <kbd className={cn(
          "px-1.5 py-0.5 rounded font-mono text-[10px]",
          "bg-gray-200 text-gray-600",
          "dark:bg-[#262626] dark:text-gray-300"
        )}>Enter</kbd>
        Open
      </span>
    </div>
  );
}
