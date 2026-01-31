/**
 * Caty FAB Placeholder - Icon only, functionality unhooked
 * Ready for new AI implementation
 */

import { cn } from '@/lib/utils';
import catalystLogoWhite from '@/assets/catalyst-ai-logo-white.svg';
import '@/styles/caty.css';

export function CatyFabPlaceholder() {
  return (
    <button
      className={cn("caty-fab")}
      aria-label="Caty AI Assistant (Coming Soon)"
      onClick={() => {
        // Functionality unhooked - ready for replacement
      }}
    >
      <img 
        src={catalystLogoWhite} 
        alt="Catalyst AI" 
        className="w-10 h-10"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
      />
    </button>
  );
}
