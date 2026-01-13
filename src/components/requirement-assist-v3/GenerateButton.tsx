// ============================================================
// GENERATE BUTTON COMPONENT - ENHANCED
// Gradient styling, shimmer effect, cancel button during generation
// ============================================================

import React from 'react';
import { useStore, selectCanGenerate, selectWordCount } from '@/stores/requirementAssistStore';
import { useGeneration } from '@/hooks/requirement-assist';
import { Sparkles, Loader2, AlertCircle, X } from 'lucide-react';

export function GenerateButton() {
  const { isGenerating } = useStore();
  const canGenerate = useStore(selectCanGenerate);
  const wordCount = useStore(selectWordCount);
  const { startGeneration, cancelGeneration } = useGeneration();

  const needsMoreWords = wordCount > 0 && wordCount < 10;

  return (
    <div className="h-16 px-4 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
      {/* Left: Keyboard hint when can generate */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        {canGenerate && !isGenerating && (
          <>
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-sm">⌘</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-sm">G</kbd>
          </>
        )}
      </div>

      {/* Right: Generate Button - ALWAYS VISIBLE */}
      {isGenerating ? (
        <div className="flex gap-2">
          <button
            disabled
            className="h-10 px-5 flex items-center justify-center gap-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Generating...</span>
          </button>
          <button
            onClick={cancelGeneration}
            className="h-10 px-3 flex items-center justify-center gap-2 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={startGeneration}
          disabled={!canGenerate}
          className={`
            group relative h-10 px-6 flex items-center justify-center gap-2
            rounded-lg text-sm font-semibold
            transition-all duration-200 ease-out
            overflow-hidden
            ${canGenerate 
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          {/* Animated shimmer on hover */}
          {canGenerate && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
          )}

          <span className="relative flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {canGenerate ? (
              <>
                <span>Generate</span>
                <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-mono">⌘G</kbd>
              </>
            ) : needsMoreWords ? (
              <span>{10 - wordCount} more words</span>
            ) : (
              <span>Enter requirements</span>
            )}
          </span>
        </button>
      )}
    </div>
  );
}