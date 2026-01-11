// ============================================================
// EMPTY STATE COMPONENT - ENHANCED
// Animated icon with floating particles
// ============================================================

import React from 'react';
import { Sparkles, FileText } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        {/* Animated icon with floating particles */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          {/* Pulsing background */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 animate-pulse" />
          
          {/* Main icon container */}
          <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          
          {/* Floating particles */}
          <div 
            className="absolute -top-2 -right-2 w-4 h-4 bg-amber-400 rounded-full animate-bounce shadow-lg shadow-amber-400/50" 
            style={{ animationDelay: '0.1s', animationDuration: '2s' }} 
          />
          <div 
            className="absolute -bottom-1 -left-1 w-3 h-3 bg-emerald-400 rounded-full animate-bounce shadow-lg shadow-emerald-400/50" 
            style={{ animationDelay: '0.3s', animationDuration: '2.2s' }} 
          />
          <div 
            className="absolute top-1/2 -right-3 w-2 h-2 bg-violet-400 rounded-full animate-bounce shadow-lg shadow-violet-400/50" 
            style={{ animationDelay: '0.5s', animationDuration: '1.8s' }} 
          />
        </div>
        
        {/* Title */}
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          Ready to Generate
        </h3>
        
        {/* Description */}
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          Enter your requirements in the input panel and click "Generate with CATY" 
          to create SAFe-compliant work items automatically.
        </p>
        
        {/* Steps */}
        <div className="text-left space-y-4 bg-slate-50 rounded-xl p-5 border border-slate-100">
          <Step number={1} text="Describe your requirements" hint="minimum 10 words" />
          <Step number={2} text="Select a program and project" hint="optional" />
          <Step number={3} text="Click Generate or press" kbd="⌘G" />
        </div>
        
        {/* Template link */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
          <FileText className="w-4 h-4" />
          <span>Need inspiration?</span>
          <button className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors">
            Try a template →
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ 
  number, 
  text, 
  hint, 
  kbd 
}: { 
  number: number; 
  text: string; 
  hint?: string; 
  kbd?: string 
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">
        <span className="text-xs font-bold text-white">{number}</span>
      </div>
      <div className="pt-0.5">
        <span className="text-sm font-medium text-slate-700">{text}</span>
        {hint && <span className="text-xs text-slate-400 ml-1">({hint})</span>}
        {kbd && <kbd className="ml-1 px-1.5 py-0.5 bg-slate-200 rounded text-xs font-mono text-slate-600">{kbd}</kbd>}
      </div>
    </div>
  );
}