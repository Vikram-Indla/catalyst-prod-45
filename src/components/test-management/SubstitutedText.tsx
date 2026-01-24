/**
 * SubstitutedText - Renders text with {variable} placeholders substituted
 * Highlights substituted values with tooltips showing original variable name
 */

import { getSubstitutedSegments } from '@/utils/variableSubstitution';
import { cn } from '@/lib/utils';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger,
  TooltipProvider
} from '@/components/ui/tooltip';

interface SubstitutedTextProps {
  template: string;
  data: Record<string, any> | null;
  className?: string;
  highlightSubstitutions?: boolean;
}

export function SubstitutedText({
  template,
  data,
  className,
  highlightSubstitutions = true,
}: SubstitutedTextProps) {
  const segments = getSubstitutedSegments(template, data || {});

  if (!highlightSubstitutions || !data) {
    return <span className={className}>{segments.map(s => s.text).join('')}</span>;
  }

  return (
    <TooltipProvider>
      <span className={className}>
        {segments.map((segment, index) => {
          if (!segment.isSubstituted) {
            return <span key={index}>{segment.text}</span>;
          }

          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'px-1 py-0.5 rounded',
                    'bg-violet-100 dark:bg-violet-900/40',
                    'text-violet-800 dark:text-violet-200',
                    'border-b border-dashed border-violet-400',
                    'cursor-help'
                  )}
                >
                  {segment.text}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  Variable:{' '}
                  <code className="bg-muted px-1 py-0.5 rounded font-mono">
                    {`{${segment.variableName}}`}
                  </code>
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </span>
    </TooltipProvider>
  );
}
