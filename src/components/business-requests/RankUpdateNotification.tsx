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
    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div 
        className="pointer-events-auto bg-gradient-to-r from-brand-gold/95 to-brand-gold-hover/95 backdrop-blur-sm text-white px-6 py-4 rounded-xl shadow-2xl border border-brand-gold-hover/50 max-w-md animate-in fade-in zoom-in-95 duration-300"
        style={{
          boxShadow: '0 20px 60px -15px rgba(198, 156, 109, 0.5), 0 10px 30px -10px rgba(26, 26, 26, 0.3)'
        }}
      >
        <div className="flex items-start gap-4">
          {/* Alarm Icon */}
          <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
            <AlarmClock className="h-6 w-6 text-white" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-white mb-1">
              Priority Update
            </h4>
            <p className="text-sm text-white/90 leading-relaxed">
              Rank updated from <span className="font-bold">{oldRank}</span> to <span className="font-bold">{newRank}</span>, Score <span className="font-bold">{score ?? 'N/A'}</span>, All users notified.
            </p>
          </div>

          {/* Close Button */}
          <button 
            onClick={onClose}
            className="flex-shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="h-4 w-4 text-white/80" />
          </button>
        </div>
      </div>
    </div>
  );
}
