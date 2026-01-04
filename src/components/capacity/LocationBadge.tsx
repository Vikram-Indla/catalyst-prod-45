/**
 * Location Badge Component
 * Displays country flag with location type (Onsite/Off-Shore)
 * Catalyst V5 compliant
 */

import { cn } from '@/lib/utils';

interface LocationBadgeProps {
  flag: string; // Flag URL or emoji
  location?: string | null; // Location type (e.g., "Riyadh", "Remote")
  country?: string | null;
  contractDays?: number | null;
  contractColor?: string;
  compact?: boolean;
  className?: string;
}

export function LocationBadge({
  flag,
  location,
  country,
  contractDays,
  contractColor = 'text-muted-foreground',
  compact = false,
  className
}: LocationBadgeProps) {
  const isUrl = flag?.startsWith('http');
  const isOnsite = location?.toLowerCase().includes('onsite') || location?.toLowerCase().includes('riyadh');

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {isUrl ? (
          <img src={flag} alt={country || ''} className="w-4 h-3 object-cover rounded-sm" />
        ) : (
          <span className="text-sm">{flag}</span>
        )}
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
        {isUrl ? (
          <img src={flag} alt={country || ''} className="w-5 h-4 object-cover rounded-sm" />
        ) : (
          <span className="text-base">{flag}</span>
        )}
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

      {contractDays !== undefined && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Contract</span>
          <span className={cn("text-[10px] font-medium", contractColor)}>
            {contractDays === null ? (
              <span className="flex items-center gap-0.5">
                <span>∞</span> Permanent
              </span>
            ) : (
              `${contractDays} days`
            )}
          </span>
        </div>
      )}
    </div>
  );
}
