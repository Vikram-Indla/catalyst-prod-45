/**
 * Caty FAB — Opens Caty AI V7 Widget
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CatyWidget } from '@/components/caty-ai';
import { HubIcon } from '@/components/caty-ai/constants';
import '@/styles/caty-fab.css';

export function CatyFabPlaceholder() {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: string) => {
    console.log('Caty action:', action);
    // Handle capacity planning actions here
    switch (action) {
      case 'extend-all':
        console.log('Extending all contracts...');
        break;
      case 'review':
        console.log('Opening individual review...');
        break;
      case 'assign':
        console.log('Assigning to project...');
        break;
      case 'compare':
        console.log('Comparing skills...');
        break;
      case 'live-chat':
        console.log('Starting live chat...');
        break;
      case 'schedule':
        console.log('Opening scheduler...');
        break;
    }
  };

  return (
    <>
      {/* FAB Button */}
      <button
        className={cn("caty-fab", isOpen && "hidden")}
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
