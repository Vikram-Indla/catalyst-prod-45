import { cn } from '@/lib/utils';
import { getStatusConfig, getStatusClasses, getStatusDotClass } from '@/lib/catalyst-tokens';

interface StatusCellProps {
  status: string;
}

/**
 * StatusCell - Token-compliant status badge component
 * Uses Catalyst V5 semantic tokens for guaranteed dark/light mode compliance
 */
export function StatusCell({ status }: StatusCellProps) {
  const config = getStatusConfig(status);
  const statusClasses = getStatusClasses(config.type);
  const dotClass = getStatusDotClass(config.type);
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
      "text-xs font-medium border",
      statusClasses
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dotClass)} />
      {config.label}
    </span>
  );
}

// Export for reuse across the application
export { getStatusConfig, getStatusClasses, getStatusDotClass };
