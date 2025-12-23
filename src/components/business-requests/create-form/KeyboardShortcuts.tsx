import { cn } from '@/lib/utils';

interface KeyboardShortcutsProps {
  className?: string;
}

export function KeyboardShortcuts({ className }: KeyboardShortcutsProps) {
  return (
    <div className={cn(
      "flex items-center gap-4 text-[10px]",
      "text-gray-500 dark:text-gray-400",
      className
    )}>
      <span className="flex items-center gap-1">
        <kbd className={cn(
          "px-1.5 py-0.5 rounded text-[9px] font-medium",
          "bg-gray-100 dark:bg-gray-700",
          "text-gray-600 dark:text-gray-300",
          "border border-gray-200 dark:border-gray-600"
        )}>
          Tab
        </kbd>
        <span>Navigate</span>
      </span>
      <span className="flex items-center gap-1">
        <kbd className={cn(
          "px-1.5 py-0.5 rounded text-[9px] font-medium",
          "bg-gray-100 dark:bg-gray-700",
          "text-gray-600 dark:text-gray-300",
          "border border-gray-200 dark:border-gray-600"
        )}>
          ⌘S
        </kbd>
        <span>Save</span>
      </span>
      <span className="flex items-center gap-1">
        <kbd className={cn(
          "px-1.5 py-0.5 rounded text-[9px] font-medium",
          "bg-gray-100 dark:bg-gray-700",
          "text-gray-600 dark:text-gray-300",
          "border border-gray-200 dark:border-gray-600"
        )}>
          Esc
        </kbd>
        <span>Cancel</span>
      </span>
    </div>
  );
}
