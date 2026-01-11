// ============================================================
// GENERATION SUMMARY HEADER
// Shows after generation completes with item counts
// ============================================================

import React from 'react';
import { Sparkles } from 'lucide-react';

interface GenerationSummaryProps {
  generationId: string;
  projectName: string;
  counts: {
    epics: number;
    features: number;
    stories: number;
  };
}

export function GenerationSummary({ generationId, projectName, counts }: GenerationSummaryProps) {
  return (
    <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Generation Complete</h3>
            <p className="text-xs text-slate-500">
              Session {generationId} • {projectName || 'No project selected'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {counts.epics > 0 && (
            <span className="px-2.5 py-1 bg-violet-100 text-violet-700 rounded-lg text-xs font-semibold shadow-sm">
              {counts.epics} Epic{counts.epics > 1 ? 's' : ''}
            </span>
          )}
          {counts.features > 0 && (
            <span className="px-2.5 py-1 bg-teal-100 text-teal-700 rounded-lg text-xs font-semibold shadow-sm">
              {counts.features} Feature{counts.features > 1 ? 's' : ''}
            </span>
          )}
          {counts.stories > 0 && (
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold shadow-sm">
              {counts.stories} Stor{counts.stories > 1 ? 'ies' : 'y'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
