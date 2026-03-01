/**
 * Knowledge Assist FAB — Floating button that opens KA panel globally
 */

import { useState } from 'react';
import { KnowledgeAssistPanel } from '@/components/knowledge-assist/KnowledgeAssistPanel';
import { HubIcon } from '@/components/caty-ai/constants';
import '@/styles/caty.css';

export function KAFab() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* FAB Button */}
      <button
        className={`caty-fab ${isOpen ? 'caty-fab-hidden' : ''}`}
        aria-label="Open Knowledge Assist"
        onClick={() => setIsOpen(true)}
      >
        <div className="w-10 h-10">
          <HubIcon />
        </div>
      </button>

      {/* KA Panel */}
      <KnowledgeAssistPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
