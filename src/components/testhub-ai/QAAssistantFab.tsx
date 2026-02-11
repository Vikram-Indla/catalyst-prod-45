/**
 * QA Assistant FAB — Opens QA Assistant Widget on TestHub routes
 */

import { useState } from 'react';
import { HubIcon } from '@/components/caty-ai/constants';
import { QAAssistantWidget } from './QAAssistantWidget';
import '@/styles/caty.css';

export function QAAssistantFab() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* FAB Button */}
      <button
        className={`caty-fab ${isOpen ? 'caty-fab-hidden' : ''}`}
        aria-label="Open QA Assistant"
        onClick={() => setIsOpen(true)}
      >
        <div className="w-10 h-10">
          <HubIcon />
        </div>
      </button>

      {/* Widget Panel */}
      {isOpen && (
        <QAAssistantWidget onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}
