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

      {/* Widget Panel */}
      {isOpen && (
        <div 
          className="fixed bottom-6 right-6 z-[1000]"
          style={{ 
            animation: 'fadeInUp 0.25s ease-out'
          }}
        >
          <CatyWidget 
            onAction={handleAction}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
