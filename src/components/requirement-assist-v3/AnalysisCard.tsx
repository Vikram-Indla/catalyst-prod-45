// ============================================================
// ANALYSIS CARD COMPONENT
// Shows live AI analysis of requirements
// ============================================================

import React from 'react';
import { useStore, selectWordCount } from '@/stores/requirementAssistStore';
import { Sparkles, Loader2 } from 'lucide-react';

export function AnalysisCard() {
  const { analysis, isAnalyzing } = useStore();
  const wordCount = useStore(selectWordCount);
  
  const hasContent = wordCount > 0;
  
  // Estimate work items based on analysis
  const estimatedEpics = Math.max(1, Math.ceil(analysis.functions.length / 4));
  const estimatedFeatures = Math.max(1, Math.ceil(analysis.functions.length / 2));
  const estimatedStories = analysis.functions.length + analysis.nfrs.length || 1;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            {isAnalyzing ? (
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            )}
          </div>
          <span className="text-sm font-semibold text-slate-900">
            CATY Analysis
          </span>
        </div>
        
        {isAnalyzing && (
          <span className="text-xs text-primary">Analyzing...</span>
        )}
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 p-3">
        <StatBox 
          value={hasContent ? analysis.actors.length : 0} 
          label="Actors" 
          color="text-violet-600"
        />
        <StatBox 
          value={hasContent ? analysis.functions.length : 0} 
          label="Functions" 
          color="text-primary"
        />
        <StatBox 
          value={hasContent ? analysis.nfrs.length : 0} 
          label="NFRs" 
          color="text-teal-600"
        />
        <StatBox 
          value={hasContent ? analysis.integrations.length : 0} 
          label="Integrations" 
          color="text-amber-600"
        />
      </div>
      
      {/* Complexity Bar */}
      {hasContent && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Complexity:</span>
            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  analysis.complexity === 'low' 
                    ? 'w-1/3 bg-green-500' 
                    : analysis.complexity === 'medium' 
                      ? 'w-2/3 bg-amber-500' 
                      : 'w-full bg-red-500'
                }`}
              />
            </div>
            <span className={`text-xs font-medium capitalize ${
              analysis.complexity === 'low' 
                ? 'text-green-600' 
                : analysis.complexity === 'medium' 
                  ? 'text-amber-600' 
                  : 'text-red-600'
            }`}>
              {analysis.complexity}
            </span>
          </div>
        </div>
      )}
      
      {/* Estimate */}
      <div className="px-3 py-2 border-t border-slate-100 text-xs text-center text-slate-500">
        {hasContent ? (
          <>
            Estimated: 
            <strong className="text-slate-700 ml-1">~{estimatedEpics} Epics</strong>
            <span className="mx-1">•</span>
            <strong className="text-slate-700">~{estimatedFeatures} Features</strong>
            <span className="mx-1">•</span>
            <strong className="text-slate-700">~{estimatedStories} Stories</strong>
          </>
        ) : (
          <span className="text-slate-400">Enter requirements to see analysis</span>
        )}
      </div>
    </div>
  );
}

function StatBox({ 
  value, 
  label, 
  color 
}: { 
  value: number; 
  label: string; 
  color: string;
}) {
  return (
    <div className="text-center py-2 bg-white rounded-md border border-slate-100">
      <div className={`text-xl font-bold ${value > 0 ? color : 'text-slate-300'}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">
        {label}
      </div>
    </div>
  );
}
