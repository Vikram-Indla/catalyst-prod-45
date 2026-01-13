// ============================================================
// INPUT STATE COMPONENT - HONEST IMPLEMENTATION
// No fake AI analysis - only readiness checks before generation
// ============================================================

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, ChevronRight, Check, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/stores/requirementAssistStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from './RichTextEditor';

interface InputStateProps {
  onStart: (requirements: string, programId: string, projectId: string) => void;
  onShowHistory: () => void;
}

// ============================================================
// READINESS CHECK ITEM - Simple boolean checks (not fake AI)
// ============================================================
function ReadinessCheckItem({ 
  checked, 
  label 
}: { 
  checked: boolean; 
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn(
        "w-4 h-4 rounded-full flex items-center justify-center",
        checked ? "bg-emerald-500 text-white" : "bg-slate-100"
      )}>
        {checked && <Check className="w-2.5 h-2.5" />}
      </div>
      <span className={cn(
        "text-xs",
        checked ? "text-slate-700" : "text-slate-400"
      )}>
        {label}
      </span>
    </div>
  );
}

// ============================================================
// MAIN INPUT STATE COMPONENT
// ============================================================
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
  
  const [htmlContent, setHtmlContent] = useState('');

  const wordCount = useMemo(() => 
    inputText.trim().split(/\s+/).filter(Boolean).length, 
    [inputText]
  );
  
  const canGenerate = wordCount >= 10 && programId && projectId;
  
  // Simple readiness checks - NOT fake AI analysis
  const hasMinimumWords = wordCount >= 10;
  const hasSufficientDetail = wordCount >= 50;
  const hasProgramSelected = !!programId;
  const hasProjectSelected = !!projectId;

  const selectedProgram = programs.find(p => p.id === programId);
  const selectedProject = projects.find(p => p.id === projectId);
  const filteredProjects = projects.filter(p => p.programId === programId);

  const handleEditorChange = (html: string, text: string) => {
    setHtmlContent(html);
    setInputText(text);
  };

  const handleGenerate = () => {
    if (canGenerate && programId && projectId) {
      onStart(inputText, programId, projectId);
    }
  };

  // Keyboard shortcut ⌘G
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault();
        if (canGenerate) {
          handleGenerate();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canGenerate, inputText, programId, projectId]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header - Enterprise Breadcrumb Style */}
      <header className="h-12 px-6 flex items-center justify-between border-b border-slate-200 flex-shrink-0" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Product
          </span>
          <span className="text-sm text-slate-300">/</span>
          <span className="text-base font-semibold text-slate-800">Requirement Assist</span>
        </div>
        
        {/* Program/Project Selectors + ID Badges + Clear Button */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Program:</span>
            <Select value={programId || ''} onValueChange={(v) => setProgramId(v || null)}>
              <SelectTrigger className="border-0 bg-transparent font-semibold h-auto p-0 w-auto min-w-[100px] text-xs">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {programs.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ChevronRight className="w-3 h-3 text-slate-300" />

          <div className="flex items-center gap-2 text-xs">
            <Select 
              value={projectId || ''} 
              onValueChange={(v) => setProjectId(v || null)}
              disabled={!programId}
            >
              <SelectTrigger className="border-0 bg-transparent font-semibold h-auto p-0 w-auto min-w-[120px] text-xs">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {filteredProjects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Button - Only show if there's content */}
          {inputText.length > 0 && (
            <button 
              onClick={() => setInputText('')}
              className="h-8 px-3 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}

          {/* ID Preview Badges - Only show when program/project selected */}
          {(selectedProgram || selectedProject) && (
            <div className="flex items-center gap-2">
              {selectedProgram && (
                <div className="px-2 py-1 bg-violet-100 border border-violet-200 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
                  <span className="text-[10px] font-bold text-violet-700 font-mono">
                    {selectedProgram.code}-001
                  </span>
                </div>
              )}
              {selectedProject && (
                <div className="px-2 py-1 bg-emerald-100 border border-emerald-200 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span className="text-[10px] font-bold text-emerald-700 font-mono">
                    {selectedProject.code}-001
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* Center: Main Editor */}
        <div className="flex-1 p-5 bg-slate-50 overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-200/50 flex flex-col overflow-hidden min-h-0">
            {/* Card Header */}
            <div className="h-11 px-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-700">Requirements</span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                  Draft
                </span>
              </div>
            </div>

            {/* Rich Text Editor - scrollable content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <RichTextEditor
                value={htmlContent}
                onChange={handleEditorChange}
                placeholder="Describe your system requirements in detail. You can paste images directly..."
              />
            </div>

            {/* Editor Footer with Word Count + Generate Button */}
            <div className="h-16 px-4 flex items-center justify-between border-t border-slate-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
              {/* Left: Word count */}
              <div className="flex items-center gap-3 text-sm">
                <span className="font-bold text-slate-700">{wordCount}</span>
                <span className="text-slate-400">words</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">{inputText.length.toLocaleString()} / 3,000</span>
              </div>

              {/* Right: Generate Button */}
              <button
                disabled={!canGenerate}
                onClick={handleGenerate}
                className={cn(
                  "h-10 px-6 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all",
                  canGenerate
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                )}
              >
                <Sparkles className="w-4 h-4" />
                {canGenerate ? 'Generate' : wordCount > 0 ? `${10 - wordCount} more words` : 'Enter requirements'}
                {canGenerate && <kbd className="ml-1 text-[10px] opacity-60">⌘G</kbd>}
              </button>
            </div>
          </div>
        </div>

        {/* Right: AI Assist Panel - HONEST: Only readiness checks, no fake estimates */}
        <div className="w-72 bg-white border-l border-slate-200 flex flex-col flex-shrink-0">
          {/* Header - No fake "Live" indicator */}
          <div className="h-11 px-4 flex items-center border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">AI Assist</span>
          </div>

          {/* Content - Only readiness checks */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Input Readiness - Simple checks, NOT fake AI */}
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Input Readiness
              </p>
              
              <div className="space-y-2.5">
                <ReadinessCheckItem 
                  checked={hasProgramSelected} 
                  label={hasProgramSelected ? 'Program selected' : 'Select a program'} 
                />
                <ReadinessCheckItem 
                  checked={hasProjectSelected} 
                  label={hasProjectSelected ? 'Project selected' : 'Select a project'} 
                />
                <ReadinessCheckItem 
                  checked={hasMinimumWords} 
                  label={hasMinimumWords ? 'Minimum words met' : `${10 - wordCount} more words needed`} 
                />
                <ReadinessCheckItem 
                  checked={hasSufficientDetail} 
                  label="Sufficient detail for analysis" 
                />
              </div>
              
              {/* Ready message */}
              {canGenerate && (
                <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-xs text-emerald-700 font-medium">
                    ✓ Ready for AI analysis
                  </p>
                  <p className="text-[10px] text-emerald-600 mt-1">
                    Click Generate to proceed.
                  </p>
                </div>
              )}
              
              {/* Not ready message */}
              {!canGenerate && wordCount > 0 && (
                <p className="mt-4 text-xs text-slate-500">
                  Complete the checks above to enable generation.
                </p>
              )}
            </div>

            {/* Info box - What happens when you generate */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                What happens next
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">1.</span>
                  <span>AI analyzes your requirements</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">2.</span>
                  <span>Creates a structured PRD</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">3.</span>
                  <span>Generates Epics, Features & Stories</span>
                </li>
              </ul>
              <p className="text-[10px] text-slate-400 mt-3">
                Generation typically takes 10-30 seconds
              </p>
            </div>

            {/* NO fake "Estimated Output" panel */}
            {/* NO fake "Detected Patterns" panel */}
            {/* NO fake "Live" analysis */}
          </div>

          {/* Keyboard Shortcuts Footer */}
          <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
            <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400">
              <span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-mono">⌘G</kbd>
                <span className="ml-1">Generate</span>
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-mono">⌘V</kbd>
                <span className="ml-1">Paste image</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InputState;
