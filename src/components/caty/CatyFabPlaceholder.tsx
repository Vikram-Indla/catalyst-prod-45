/**
 * Caty FAB — Opens Caty AI V7 Widget
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CatyWidget } from '@/components/caty-ai';
import { HubIcon } from '@/components/caty-ai/constants';
import '@/styles/caty.css';

export function CatyFabPlaceholder() {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (_action: string) => {
    // TODO: wire capacity planning actions
  };

  return (
    <>
      {/* FAB Button */}
      <button
        className={cn("caty-fab", isOpen && "caty-fab-hidden")}
        aria-label="Open Caty AI Assistant"
        onClick={() => setIsOpen(true)}
      >
        <div className="w-10 h-10">
          <HubIcon />
        </div>
      </button>

      {/* Widget Panel - CatyWidget handles its own positioning and backdrop */}
      {isOpen && (
        <CatyWidget 
          onAction={handleAction}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
