// ============================================================
// EMPTY STATE COMPONENT
// Shown when no work items are generated
// ============================================================

import React from 'react';
import { Sparkles, FileText, ArrowRight } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Ready to Generate
        </h3>
        
        {/* Description */}
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Enter your requirements in the input panel and click "Generate with CATY" to create 
          SAFe-compliant work items automatically.
        </p>
        
        {/* Steps */}
        <div className="text-left space-y-3">
          <Step number={1} text="Describe your requirements (minimum 10 words)" />
          <Step number={2} text="Select a program and project (optional)" />
          <Step number={3} text="Click Generate or press ⌘G" />
        </div>
        
        {/* Template Hint */}
        <div className="mt-6 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>Need inspiration?</span>
            <button className="text-primary hover:text-primary/80 font-medium flex items-center gap-1">
              Try a template
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-primary">{number}</span>
      </div>
      <span className="text-sm text-slate-600">{text}</span>
    </div>
  );
}
