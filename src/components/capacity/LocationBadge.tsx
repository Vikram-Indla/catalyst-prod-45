/**
 * Location Badge Component
 * Displays country flag with location type (Onsite/Off-Shore)
 * Catalyst V5 compliant
 */

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface LocationBadgeProps {
  flag: string; // Flag URL or emoji
  location?: string | null; // Location type (e.g., "Riyadh", "Remote")
  country?: string | null;
  contractEndDate?: string | null;
  contractColor?: string;
  compact?: boolean;
  className?: string;
}

export function LocationBadge({
  flag,
  location,
  country,
  contractEndDate,
  contractColor = 'text-muted-foreground',
  compact = false,
  className
}: LocationBadgeProps) {
  const isUrl = flag?.startsWith('http');
  const isOnsite = location?.toLowerCase().includes('onsite') || location?.toLowerCase().includes('riyadh');

  const formatContractDate = (date: string | null | undefined) => {
    if (!date) return 'Permanent';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const FlagElement = (
    <>
      {isUrl ? (
        <img src={flag} alt={country || ''} className={compact ? "w-4 h-3 object-cover rounded-sm" : "w-5 h-4 object-cover rounded-sm"} />
      ) : (
        <span className={compact ? "text-sm" : "text-base"}>{flag}</span>
      )}
    </>
  );

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">{FlagElement}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{country || 'Unknown'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {location && (
          <span 
            className={cn(
              "text-[10px] font-medium px-1 py-0.5 rounded",
              isOnsite 
                ? "bg-[#0d9488]/10 text-[#0d9488]" 
                : "bg-[#2563eb]/10 text-[#2563eb]"
            )}
          >
            {isOnsite ? 'ON' : 'OFF'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">{FlagElement}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{country || 'Unknown'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {location && (
          <span 
            className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded",
              isOnsite 
                ? "bg-[#0d9488]/10 text-[#0d9488]" 
                : "bg-[#2563eb]/10 text-[#2563eb]"
            )}
          >
            {location}
          </span>
        )}
      </div>

      {contractEndDate !== undefined && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Contract</span>
          <span className={cn("text-[10px] font-medium", contractColor)}>
            {formatContractDate(contractEndDate)}
          </span>
        </div>
      )}
    </div>
  );
}
