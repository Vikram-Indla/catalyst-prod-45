import { cn } from '@/lib/utils';

interface RankCellProps {
  displayIndex: number;
}

export function RankCell({ displayIndex }: RankCellProps) {
  const isTopThree = displayIndex <= 3;
  
  return (
    <span className={cn(
      "inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded font-mono text-xs font-semibold",
      isTopThree 
        ? "bg-gradient-to-r from-[var(--brand-gold)]/20 to-[var(--brand-champagne)]/20 text-[var(--brand-gold)] border border-[var(--brand-gold)]/30" 
        : "bg-muted text-muted-foreground"
    )}>
      #{displayIndex}
    </span>
  );
}
