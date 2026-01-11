// ============================================================
// GENERATE BUTTON COMPONENT
// Primary CTA for generation
// ============================================================

import React from 'react';
import { useStore, selectCanGenerate, selectWordCount } from '@/stores/requirementAssistStore';
import { useGeneration } from '@/hooks/requirement-assist';
import { Sparkles, Loader2 } from 'lucide-react';

export function GenerateButton() {
  const { isGenerating } = useStore();
  const canGenerate = useStore(selectCanGenerate);
  const wordCount = useStore(selectWordCount);
  const { startGeneration } = useGeneration();

  const getButtonText = () => {
    if (isGenerating) return 'Generating...';
    if (wordCount < 10) return 'Enter at least 10 words';
    return 'Generate with CATY';
  };

  return (
    <button
      onClick={startGeneration}
      disabled={!canGenerate}
      className={`
        w-full h-11 flex items-center justify-center gap-2
        rounded-lg text-sm font-semibold
        transition-all duration-150
        ${canGenerate 
          ? 'bg-primary text-white hover:bg-primary/90 active:bg-primary/80 shadow-sm hover:shadow' 
          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        }
      `}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {getButtonText()}
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          {getButtonText()}
          {canGenerate && (
            <kbd className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono">
              ⌘G
            </kbd>
          )}
        </>
      )}
    </button>
  );
}
