/**
 * JiraSyncChip — Reusable Jira origin indicator
 * Shows a small chip with Jira icon + key when an item originates from Jira
 */
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface JiraSyncChipProps {
  jiraKey: string;
  baseUrl?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const JIRA_SVG = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.53 2C6.63 2 2.84 5.68 2.84 10.5c0 4.83 3.79 8.5 8.69 8.5h.64l5.82 3V18.5c2.77-1.56 4.17-4.4 4.17-8 0-4.82-3.79-8.5-8.63-8.5z" fill="#2684FF"/>
    <path d="M12.06 7l-4.5 4.5 4.5 4.5 4.5-4.5L12.06 7z" fill="white"/>
  </svg>
);

export function JiraSyncChip({ jiraKey, baseUrl, size = 'sm', className }: JiraSyncChipProps) {
  const jiraUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/browse/${jiraKey}` : null;

  const chip = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded font-mono',
        'bg-[#DEEBFF] text-[#0747A6] dark:bg-[#0747A6]/20 dark:text-[#4C9AFF]',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
        'font-semibold tracking-wide whitespace-nowrap',
        className
      )}
    >
      {JIRA_SVG}
      {jiraKey}
      {jiraUrl && (
        <a
          href={jiraUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-[#0747A6] dark:text-[#4C9AFF] hover:text-[#0052CC]"
        >
          <ExternalLink size={10} />
        </a>
      )}
    </span>
  );

  if (!jiraUrl) return chip;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        Open in Jira: {jiraKey}
      </TooltipContent>
    </Tooltip>
  );
}
