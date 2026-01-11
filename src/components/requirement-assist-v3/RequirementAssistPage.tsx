// ============================================================
// REQUIREMENT ASSIST PAGE
// Main container component
// ============================================================

import React from 'react';
import { Header } from './Header';
import { InputPanel } from './InputPanel';
import { OutputPanel } from './OutputPanel';
import { Footer } from './Footer';
import { useKeyboardShortcuts, usePrograms } from '@/hooks/requirement-assist';

export function RequirementAssistPage() {
  // Initialize hooks
  useKeyboardShortcuts();
  usePrograms();

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <Header />
      
      {/* Main Content - 2 Column Split */}
      <main className="flex-1 min-h-0 grid grid-cols-2 overflow-hidden">
        {/* Input Panel (Left) */}
        <InputPanel />
        
        {/* Output Panel (Right) */}
        <OutputPanel />
      </main>
      
      {/* Footer - Fixed at bottom */}
      <Footer />
    </div>
  );
}
