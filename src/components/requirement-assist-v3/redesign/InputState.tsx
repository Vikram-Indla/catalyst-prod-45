// ============================================================
// INPUT STATE COMPONENT
// Centered single-focus input card with visual polish
// ============================================================

import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Sparkles, AlertTriangle, Clock } from 'lucide-react';
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
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header with branding */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Gradient icon */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-base font-semibold text-slate-900">Requirement Assist</span>
        </div>
        <button 
          onClick={onShowHistory}
          className="h-9 px-4 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
        >
          <Clock className="w-4 h-4" />
          History
        </button>
      </header>

      {/* Centered Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          {/* Destination Row - Better styling */}
          <div className="flex items-center gap-3 mb-5">
            <div className="relative">
              <select
                value={programId || ''}
                onChange={(e) => setProgramId(e.target.value || null)}
                className="h-11 pl-4 pr-10 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 appearance-none cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              >
                <option value="">Select Program</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <ChevronRight className="w-4 h-4 text-slate-300" />

            <div className="relative">
              <select
                value={projectId || ''}
                onChange={(e) => setProjectId(e.target.value || null)}
                disabled={!programId}
                className="h-11 pl-4 pr-10 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 appearance-none cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select Project</option>
                {filteredProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* ID Preview - Styled properly */}
            {programId && projectId && (
              <div className="ml-auto flex items-center gap-2">
                <span className="px-2.5 py-1 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-mono font-semibold rounded-lg">
                  {selectedProgram?.code || 'PRG'}-XXX
                </span>
                <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono font-semibold rounded-lg">
                  {selectedProject?.code || 'PRJ'}-XXX
                </span>
              </div>
            )}
          </div>

          {/* Main Card - Add shadow and better borders */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60 overflow-hidden">
            {/* Text Area */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe your requirements..."
              maxLength={3000}
              className="w-full h-64 p-6 text-base text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none leading-relaxed"
            />

            {/* Footer Bar - Proper styling */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-50 via-slate-50 to-blue-50/50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-500">{wordCount} words</span>
                <span className="text-xs text-slate-400">{inputText.length} / 3,000</span>
              </div>

              {/* Button - Proper disabled/enabled states */}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={cn(
                  "h-11 px-6 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all duration-200",
                  canGenerate 
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:-translate-y-0.5" 
                    : "bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed"
                )}
              >
                <Sparkles className="w-4 h-4" />
                {canGenerate ? 'Generate' : wordCount < 10 ? `${10 - wordCount} more words` : 'Generate'}
              </button>
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

          {/* Estimate - When visible, styled properly */}
          {wordCount >= 10 && (
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
              <div className="flex items-center justify-center gap-10">
                <div className="text-center">
                  <p className="text-4xl font-bold text-violet-600">{estimatedEpics}</p>
                  <p className="text-sm text-slate-600 mt-1 font-medium">Epics</p>
                </div>
                <div className="w-px h-14 bg-blue-200" />
                <div className="text-center">
                  <p className="text-4xl font-bold text-teal-600">{estimatedFeatures}</p>
                  <p className="text-sm text-slate-600 mt-1 font-medium">Features</p>
                </div>
                <div className="w-px h-14 bg-blue-200" />
                <div className="text-center">
                  <p className="text-4xl font-bold text-emerald-600">{estimatedStories}</p>
                  <p className="text-sm text-slate-600 mt-1 font-medium">Stories</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
