// ============================================================
// GENERATE BUTTON COMPONENT - ENHANCED
// Gradient styling, shimmer effect, word count progress
// ============================================================

import React from 'react';
import { useStore, selectCanGenerate, selectWordCount } from '@/stores/requirementAssistStore';
import { useGeneration } from '@/hooks/requirement-assist';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';

export function GenerateButton() {
  const { isGenerating, inputText } = useStore();
  const canGenerate = useStore(selectCanGenerate);
  const wordCount = useStore(selectWordCount);
  const { startGeneration } = useGeneration();

  const needsMoreWords = wordCount > 0 && wordCount < 10;

  return (
    <div className="p-4 border-t border-slate-100 flex-shrink-0 bg-gradient-to-r from-slate-50 to-white">
      <button
        onClick={startGeneration}
        disabled={!canGenerate}
        className={`
          group relative w-full h-12 flex items-center justify-center gap-2.5
          rounded-xl text-sm font-semibold
          transition-all duration-200 ease-out
          overflow-hidden
          ${canGenerate 
            ? `
              bg-gradient-to-r from-blue-600 to-blue-700 text-white
              hover:from-blue-500 hover:to-blue-600
              hover:shadow-xl hover:shadow-blue-500/30
              hover:-translate-y-0.5
              active:translate-y-0 active:shadow-lg
            ` 
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }
        `}
      >
        {/* Shimmer effect on hover */}
        {canGenerate && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        )}

        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating...</span>
          </>
        ) : canGenerate ? (
          <>
            <Sparkles className="w-5 h-5" />
            <span>Generate with CATY</span>
            <kbd className="ml-2 px-2 py-0.5 bg-white/20 rounded-md text-xs font-mono">
              ⌘G
            </kbd>
          </>
        ) : needsMoreWords ? (
          <>
            <AlertCircle className="w-4 h-4" />
            <span>Enter at least 10 words</span>
            <span className="ml-2 text-xs opacity-75">({wordCount}/10)</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 opacity-50" />
            <span>Enter requirements to generate</span>
          </>
        )}
      </button>
      
      {/* Keyboard hint */}
      {canGenerate && (
        <p className="mt-2 text-center text-xs text-slate-400">
          Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">G</kbd> to generate instantly
        </p>
      )}
    </div>
  );
}
