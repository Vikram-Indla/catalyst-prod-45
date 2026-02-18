import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { CapabilityConfig } from '@/types/requirement-assist';

interface CapabilityCardProps {
  config: CapabilityConfig;
}

export function CapabilityCard({ config }: CapabilityCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/producthub/requirement-assist/compose?capability=${config.key}`)}
      className={cn(
        'relative text-left w-full bg-white border rounded-xl p-5 transition-all duration-150',
        'hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-px',
        'border-[hsl(var(--border))] hover:border-zinc-300'
      )}
      style={{ borderRadius: 'var(--radius-lg, 12px)' }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-5 right-5 h-[3px] rounded-b-sm"
        style={{ backgroundColor: config.accentColor }}
      />

      {/* Icon circle */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-lg mb-3"
        style={{ backgroundColor: config.bgColor }}
      >
        {config.icon}
      </div>

      {/* Title */}
      <div className="text-sm font-bold text-foreground mb-1">
        {config.title}
      </div>

      {/* Description */}
      <div className="text-xs text-muted-foreground leading-relaxed">
        {config.description}
      </div>
    </button>
  );
}
