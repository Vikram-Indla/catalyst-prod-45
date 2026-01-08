import { cn } from '@/lib/utils';

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

  const eyeSizes = {
    sm: { width: 4, height: 6, gap: 8 },
    md: { width: 6, height: 10, gap: 12 },
    lg: { width: 8, height: 12, gap: 14 }
  };

  const e = eyeSizes[size];

  return (
    <div className={cn("relative", sizes[size], className)}>
      {/* Main orb */}
      <div 
        className="w-full h-full rounded-full relative animate-[orb-breathe_4s_ease-in-out_infinite]"
        style={{
          background: 'linear-gradient(135deg, #5eaaa8 0%, #3d9a98 50%, #2d8a88 100%)',
          boxShadow: `
            0 4px 20px rgba(20, 184, 166, 0.4),
            inset 0 -8px 20px rgba(0,0,0,0.2),
            inset 0 8px 20px rgba(255,255,255,0.3),
            0 0 0 2px rgba(255,255,255,0.3)
          `
        }}
      >
        {/* Shine highlight */}
        <div 
          className="absolute rounded-full"
          style={{
            top: '12%',
            left: '18%',
            width: '35%',
            height: '25%',
            background: 'rgba(255,255,255,0.4)',
            filter: 'blur(4px)'
          }}
        />

        {/* Face container */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center" style={{ gap: size === 'sm' ? 3 : 4 }}>
            {/* Eyes */}
            <div className="flex" style={{ gap: e.gap }}>
              <div 
                className="bg-white rounded-[3px] relative"
                style={{ 
                  width: e.width, 
                  height: e.height,
                  boxShadow: '0 0 10px rgba(255,255,255,0.8)'
                }}
              >
                <div 
                  className="absolute bg-[#2d8a88] rounded-full animate-[look-around_6s_ease-in-out_infinite]"
                  style={{
                    bottom: 2,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: Math.max(3, e.width - 2),
                    height: Math.max(3, e.width - 2)
                  }}
                />
              </div>
              <div 
                className="bg-white rounded-[3px] relative"
                style={{ 
                  width: e.width, 
                  height: e.height,
                  boxShadow: '0 0 10px rgba(255,255,255,0.8)'
                }}
              >
                <div 
                  className="absolute bg-[#2d8a88] rounded-full animate-[look-around_6s_ease-in-out_infinite]"
                  style={{
                    bottom: 2,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: Math.max(3, e.width - 2),
                    height: Math.max(3, e.width - 2)
                  }}
                />
              </div>
            </div>

            {/* Smile */}
            <div 
              className="border-b-2 border-white rounded-b-full"
              style={{ 
                width: size === 'sm' ? 10 : size === 'md' ? 14 : 18,
                height: size === 'sm' ? 5 : size === 'md' ? 7 : 9,
                boxShadow: '0 2px 6px rgba(255,255,255,0.4)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Orbiting particles */}
      {showParticles && size !== 'sm' && (
        <>
          <div 
            className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full animate-[orbit_5s_linear_infinite]"
            style={{ boxShadow: '0 0 6px white' }}
          />
          <div 
            className="absolute top-1/2 left-1/2 w-[3px] h-[3px] bg-white rounded-full animate-[orbit_5s_linear_infinite]"
            style={{ boxShadow: '0 0 6px white', animationDelay: '-1.7s' }}
          />
          <div 
            className="absolute top-1/2 left-1/2 w-0.5 h-0.5 bg-white rounded-full animate-[orbit_5s_linear_infinite]"
            style={{ boxShadow: '0 0 6px white', animationDelay: '-3.3s' }}
          />
        </>
      )}

      {/* Status dot */}
      {showStatusDot && (
        <div 
          className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full animate-[status-pulse_2s_ease-in-out_infinite]"
          style={{
            border: '3px solid #3d9a98',
            boxShadow: '0 0 8px #22c55e'
          }}
        />
      )}
    </div>
  );
}
