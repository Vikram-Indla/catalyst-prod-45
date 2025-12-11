import { AlarmClock, X } from 'lucide-react';
import { useEffect } from 'react';

interface RankUpdateNotificationProps {
  show: boolean;
  oldRank: number;
  newRank: number;
  score: number | null | undefined;
  onClose: () => void;
}

export function RankUpdateNotification({ 
  show, 
  oldRank, 
  newRank, 
  score, 
  onClose 
}: RankUpdateNotificationProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50">
      <div 
        className="bg-gradient-to-r from-brand-gold/95 to-brand-gold-hover/95 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg border border-brand-gold-hover/50 animate-in fade-in zoom-in-95 duration-300 whitespace-nowrap"
        style={{
          boxShadow: '0 10px 30px -10px rgba(198, 156, 109, 0.5)'
        }}
      >
        <div className="flex items-center gap-3">
          {/* Alarm Icon */}
          <div className="flex-shrink-0 p-1.5 bg-white/20 rounded-md">
            <AlarmClock className="h-4 w-4 text-white" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white">
              Priority Update
            </h4>
            <p className="text-xs text-white/90">
              Rank updated from <span className="font-bold">{oldRank}</span> to <span className="font-bold">{newRank}</span>, Score <span className="font-bold">{score ?? 'N/A'}</span>, All users notified.
            </p>
          </div>

          {/* Close Button */}
          <button 
            onClick={onClose}
            className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="h-3 w-3 text-white/80" />
          </button>
        </div>
      </div>
    </div>
  );
}
