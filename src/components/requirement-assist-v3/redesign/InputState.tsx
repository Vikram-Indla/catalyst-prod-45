// ============================================================
// INPUT STATE COMPONENT
// Centered single-focus input card (no split view)
// ============================================================

import React, { useState, useMemo } from 'react';
import { ChevronRight, Sparkles, AlertTriangle, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/stores/requirementAssistStore';

interface InputStateProps {
  onStart: (requirements: string, programId: string, projectId: string) => void;
  onShowHistory: () => void;
}

export function InputState({ onStart, onShowHistory }: InputStateProps) {
  const { 
    inputText, 
    setInputText, 
    programs, 
    projects, 
    programId, 
    projectId, 
    setProgramId, 
    setProjectId 
  } = useStore();
  
  const [duplicateDetected] = useState<{ id: string; similarity: number } | null>(null);

  const wordCount = useMemo(() => 
    inputText.trim().split(/\s+/).filter(Boolean).length, 
    [inputText]
  );

  const canGenerate = wordCount >= 10 && programId && projectId;
  
  // Estimate work items based on word count
  const estimatedEpics = Math.max(1, Math.floor(wordCount / 100));
  const estimatedFeatures = Math.max(1, Math.floor(wordCount / 40));
  const estimatedStories = Math.max(1, Math.floor(wordCount / 15));

  const selectedProgram = programs.find(p => p.id === programId);
  const selectedProject = projects.find(p => p.id === projectId);
  const filteredProjects = projects.filter(p => p.programId === programId);

  const handleGenerate = () => {
    if (canGenerate && programId && projectId) {
      onStart(inputText, programId, projectId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-slate-200 bg-white flex-shrink-0">
        <h1 className="text-lg font-semibold text-slate-900">Requirement Assist</h1>
        <button 
          onClick={onShowHistory}
          className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors"
        >
          <History className="w-4 h-4" />
          History
        </button>
      </header>

      {/* Centered Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* Main Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Destination Row */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <select
                value={programId || ''}
                onChange={(e) => setProgramId(e.target.value || null)}
                className="h-10 px-4 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">Select Program</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <ChevronRight className="w-4 h-4 text-slate-300" />

              <select
                value={projectId || ''}
                onChange={(e) => setProjectId(e.target.value || null)}
                disabled={!programId}
                className="h-10 px-4 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select Project</option>
                {filteredProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {programId && projectId && (
                <div className="ml-auto flex items-center gap-2 text-xs font-medium text-slate-400">
                  <span className="px-2 py-1 bg-slate-50 rounded">
                    {selectedProgram?.code || 'PRG'}-XXX
                  </span>
                  <span className="px-2 py-1 bg-slate-50 rounded">
                    {selectedProject?.code || 'PRJ'}-XXX
                  </span>
                </div>
              )}
            </div>

            {/* Text Area */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe your requirements..."
              maxLength={3000}
              className="w-full h-64 p-6 text-base text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none leading-relaxed"
            />

            {/* Footer Bar */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-400">{wordCount} words</span>
                <span className="text-xs text-slate-300">{inputText.length} / 3,000</span>
              </div>

              <div className="flex items-center gap-4">
                {/* Estimates - Only show when ready */}
                {wordCount >= 10 && (
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-violet-500" />
                      <span className="text-slate-500">{estimatedEpics}</span>
                      <span className="text-slate-400">Epics</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-teal-500" />
                      <span className="text-slate-500">{estimatedFeatures}</span>
                      <span className="text-slate-400">Features</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-slate-500">{estimatedStories}</span>
                      <span className="text-slate-400">Stories</span>
                    </span>
                  </div>
                )}

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className={cn(
                    "h-11 px-6 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all",
                    canGenerate 
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  )}
                >
                  <Sparkles className="w-4 h-4" />
                  {canGenerate ? 'Generate' : wordCount < 10 ? `${10 - wordCount} more` : 'Generate'}
                </button>
              </div>
            </div>

            {/* Duplicate Warning */}
            {duplicateDetected && (
              <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <div className="text-sm">
                  <span className="text-amber-700">Similar to </span>
                  <span className="font-medium text-amber-900">{duplicateDetected.id}</span>
                  <span className="text-amber-500 ml-2">{duplicateDetected.similarity}% match</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
