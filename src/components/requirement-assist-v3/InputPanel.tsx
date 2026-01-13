// ============================================================
// INPUT PANEL COMPONENT
// Left side of the split workspace
// ============================================================

import React from 'react';
import { Editor } from './Editor';
import { AnalysisCard } from './AnalysisCard';
import { ConfigBar } from './ConfigBar';
import { GenerateButton } from './GenerateButton';
import { Check } from 'lucide-react';

export function InputPanel() {
  return (
    <div className="flex flex-col bg-white border-r border-slate-200 overflow-hidden h-full">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Input
        </span>
      </div>
      
      {/* Panel Body - Scrollable with min-h-0 for proper flex scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {/* Editor */}
        <Editor />
        
        {/* Analysis */}
        <AnalysisCard />
        
        {/* Config Bar */}
        <ConfigBar />
        
        {/* Compliance Tags */}
        <ComplianceTags />
      </div>
      
      {/* Generate Button - Fixed at Bottom - MUST ALWAYS BE VISIBLE */}
      <div className="flex-shrink-0 border-t border-slate-100 bg-white">
        <GenerateButton />
      </div>
    </div>
  );
}

function ComplianceTags() {
  return (
    <div className="flex gap-2">
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-100 rounded text-xs font-medium text-green-700">
        <Check className="w-3 h-3" />
        DGA Compliant
      </span>
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-100 rounded text-xs font-medium text-green-700">
        <Check className="w-3 h-3" />
        NCA ECC-2
      </span>
    </div>
  );
}
