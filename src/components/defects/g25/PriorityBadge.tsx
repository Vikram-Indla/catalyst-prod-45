import { cn } from '@/lib/utils';

export function PriorityBadge({ priority }: { priority: string }) {
  const label = priority?.charAt(0).toUpperCase() + priority?.slice(1).toLowerCase() || 'Medium';
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center uppercase font-semibold'
      )}
      style={{
        height: 20,
        padding: '0 6px',
        backgroundColor: '#1A1A1A',
        color: '#475569',
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 4,
        letterSpacing: '0.03em',
        lineHeight: '20px',
      }}
    >
      {label}
    </span>
  );
}
