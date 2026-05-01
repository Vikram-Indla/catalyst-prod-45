import { cn } from '@/lib/utils';
import catalystLogo from '@/assets/catalyst-ai-logo.svg';

interface CatyOrbProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showParticles?: boolean;
  showStatusDot?: boolean;
}

export function CatyOrb({ 
  size = 'md', 
  className,
  showParticles = true,
  showStatusDot = true
}: CatyOrbProps) {
  const sizes = {
    sm: 'w-9 h-9',
    md: 'w-[52px] h-[52px]',
    lg: 'w-16 h-16'
  };

  const logoSizes = {
    sm: 28,
    md: 40,
    lg: 52
  };

  return (
    <div className={cn("relative", sizes[size], className)}>
      {/* Main orb container */}
      <div 
        className="w-full h-full rounded-full relative flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, var(--ds-surface-sunken, #f8fafc) 0%, var(--ds-border, #e2e8f0) 100%)',
          boxShadow: `
            0 4px 20px rgba(37, 99, 235, 0.25),
            inset 0 -4px 12px rgba(0,0,0,0.08),
            inset 0 4px 12px rgba(255,255,255,0.9),
            0 0 0 2px rgba(37, 99, 235, 0.15)
          `
        }}
      >
        {/* Subtle glow ring */}
        <div 
          className="absolute inset-0 rounded-full animate-[pulse_3s_ease-in-out_infinite]"
          style={{
            background: 'transparent',
            boxShadow: '0 0 20px rgba(37, 99, 235, 0.2)'
          }}
        />

        {/* Catalyst Logo */}
        <img 
          src={catalystLogo} 
          alt="Catalyst AI" 
          className="relative z-10"
          style={{ 
            width: logoSizes[size], 
            height: logoSizes[size],
            filter: 'drop-shadow(0 2px 4px rgba(37, 99, 235, 0.2))'
          }}
        />
      </div>

      {/* Orbiting particles - more subtle, professional */}
      {showParticles && size !== 'sm' && (
        <>
          <div 
            className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full animate-[orbit_6s_linear_infinite]"
            style={{ 
              background: 'linear-gradient(135deg, var(--ds-text-brand, #3b82f6), var(--ds-text-brand, #60a5fa))',
              boxShadow: '0 0 6px rgba(59, 130, 246, 0.6)' 
            }}
          />
          <div 
            className="absolute top-1/2 left-1/2 w-[3px] h-[3px] rounded-full animate-[orbit_6s_linear_infinite]"
            style={{ 
              background: 'linear-gradient(135deg, var(--ds-text-brand, #3b82f6), var(--ds-text-brand, #60a5fa))',
              boxShadow: '0 0 6px rgba(59, 130, 246, 0.6)', 
              animationDelay: '-2s' 
            }}
          />
          <div 
            className="absolute top-1/2 left-1/2 w-0.5 h-0.5 rounded-full animate-[orbit_6s_linear_infinite]"
            style={{ 
              background: 'linear-gradient(135deg, var(--ds-text-brand, #3b82f6), var(--ds-text-brand, #60a5fa))',
              boxShadow: '0 0 6px rgba(59, 130, 246, 0.6)', 
              animationDelay: '-4s' 
            }}
          />
        </>
      )}

      {/* Status dot - enterprise blue */}
      {showStatusDot && (
        <div 
          className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full animate-[status-pulse_2s_ease-in-out_infinite]"
          style={{
            background: 'linear-gradient(135deg, var(--ds-text-success, #22c55e), var(--ds-text-success, #16a34a))',
            border: '2px solid white',
            boxShadow: '0 0 8px rgba(34, 197, 94, 0.5), 0 1px 3px rgba(0,0,0,0.2)'
          }}
        />
      )}
    </div>
  );
}
