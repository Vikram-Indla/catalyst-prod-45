// ============================================================
// INPUT STATE COMPONENT - COMPLETE REDESIGN
// Three-column layout: History | Editor | AI Insights
// ============================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Sparkles, Clock, ChevronRight, ChevronDown, Upload, FileText, 
  Check, AlertTriangle, Lightbulb, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/stores/requirementAssistStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface InputStateProps {
  onStart: (requirements: string, programId: string, projectId: string) => void;
  onShowHistory: () => void;
}

// ============================================================
// ANIMATED NUMBER COMPONENT
// ============================================================
function AnimatedNumber({ 
  value, 
  isActive 
}: { 
  value: number; 
  isActive: boolean;
}) {
  const [animate, setAnimate] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 300);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <p className={cn(
      "text-2xl font-bold transition-all duration-300",
      isActive ? "text-white" : "text-slate-300",
      animate && "scale-110"
    )}>
      {isActive ? value : '-'}
    </p>
  );
}

// ============================================================
// ESTIMATE CARD COMPONENT
// ============================================================
function EstimateCard({ 
  estimates, 
  isActive 
}: { 
  estimates: { epics: number; features: number; stories: number }; 
  isActive: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl p-4 transition-all duration-500",
      isActive 
        ? "bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-500/20"
        : "bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200"
    )}>
      <p className={cn(
        "text-xs font-semibold uppercase tracking-wider mb-4",
        isActive ? "text-blue-200" : "text-slate-400"
      )}>
        Estimated Output
      </p>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <AnimatedNumber value={estimates.epics} isActive={isActive} />
          <p className={cn(
            "text-xs mt-1",
            isActive ? "text-blue-200" : "text-slate-400"
          )}>Epics</p>
        </div>
        <div className="text-center">
          <AnimatedNumber value={estimates.features} isActive={isActive} />
          <p className={cn(
            "text-xs mt-1",
            isActive ? "text-blue-200" : "text-slate-400"
          )}>Features</p>
        </div>
        <div className="text-center">
          <AnimatedNumber value={estimates.stories} isActive={isActive} />
          <p className={cn(
            "text-xs mt-1",
            isActive ? "text-blue-200" : "text-slate-400"
          )}>Stories</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// QUALITY CHECK ITEM COMPONENT
// ============================================================
function QualityCheckItem({ 
  check, 
  number 
}: { 
  check: { pass: boolean | 'partial' | null; text: string }; 
  number: number;
}) {
  if (check.pass === true) {
    return (
      <div className="flex items-center gap-2.5 text-xs text-slate-700">
        <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
        <span>{check.text}</span>
      </div>
    );
  }
  
  if (check.pass === 'partial') {
    return (
      <div className="flex items-center gap-2.5 text-xs text-amber-600">
        <div className="w-4 h-4 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center">
          <span className="text-[10px] font-bold">{number}</span>
        </div>
        <span>{check.text}</span>
      </div>
    );
  }
  
  if (check.pass === false) {
    return (
      <div className="flex items-center gap-2.5 text-xs text-slate-500">
        <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex items-center justify-center">
          <span className="text-[10px]">{number}</span>
        </div>
        <span>{check.text}</span>
      </div>
    );
  }
  
  // Not yet applicable
  return (
    <div className="flex items-center gap-2.5 text-xs text-slate-300">
      <div className="w-4 h-4 rounded-full border-2 border-slate-200 flex items-center justify-center">
        <span className="text-[10px]">{number}</span>
      </div>
      <span>{check.text}</span>
    </div>
  );
}

// ============================================================
// QUALITY CARD COMPONENT
// ============================================================
function QualityCard({ 
  quality, 
  checks 
}: { 
  quality: number; 
  checks: Array<{ pass: boolean | 'partial' | null; text: string }>;
}) {
  const label = quality >= 75 ? 'Excellent' : quality >= 50 ? 'Good' : quality > 0 ? 'Basic' : '-';
  const labelColor = quality >= 75 ? 'text-emerald-600' : quality >= 50 ? 'text-blue-600' : quality > 0 ? 'text-amber-600' : 'text-slate-300';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Input Quality
        </p>
        <span className={cn("text-xs font-bold", labelColor)}>{label}</span>
      </div>
      
      {/* Progress Bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${quality}%`,
            background: 'linear-gradient(90deg, #3b82f6, #6366f1)'
          }}
        />
      </div>
      
      {/* Checks */}
      <div className="mt-4 space-y-2.5">
        {checks.map((check, i) => (
          <QualityCheckItem key={i} check={check} number={i + 1} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// DUPLICATE WARNING COMPONENT
// ============================================================
function DuplicateWarning({ 
  matchId, 
  similarity 
}: { 
  matchId: string; 
  similarity: number;
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <span className="text-sm font-bold text-red-900">Similar Content Found</span>
      </div>
      <p className="text-sm text-red-700 mb-3">
        {similarity}% match with <span className="font-mono font-semibold">{matchId}</span>
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs text-red-700 border-red-200">
          View Existing
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs text-red-600">
          Generate Anyway
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// SUGGESTIONS PANEL COMPONENT
// ============================================================
function SuggestionsPanel({ suggestions }: { suggestions: string[] }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
          Suggestions
        </span>
      </div>
      <ul className="space-y-2">
        {suggestions.map((suggestion, i) => (
          <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">•</span>
            {suggestion}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// CALCULATE QUALITY
// ============================================================
function calculateQuality(text: string, wordCount: number) {
  let quality = 0;
  const checks: Array<{ pass: boolean | 'partial' | null; text: string }> = [];

  // Check 1: Minimum words
  if (wordCount >= 10) {
    quality += 25;
    checks.push({ pass: true, text: 'Minimum words met' });
  } else {
    checks.push({ pass: false, text: `${10 - wordCount} more words needed` });
  }

  // Check 2: System description
  if (text.toLowerCase().match(/system|shall|must|should/)) {
    quality += 25;
    checks.push({ pass: true, text: 'System description' });
  } else {
    checks.push({ pass: wordCount < 5 ? null : false, text: 'System description' });
  }

  // Check 3: User roles
  if (text.toLowerCase().match(/user|admin|applicant|investor|operator|customer|manager/)) {
    quality += 25;
    checks.push({ pass: true, text: 'User roles defined' });
  } else {
    checks.push({ pass: wordCount < 10 ? null : false, text: 'User roles defined' });
  }

  // Check 4: Technical details
  if (text.toLowerCase().match(/integrat|api|database|upload|download|validate|gateway|service/)) {
    quality += 25;
    checks.push({ pass: true, text: 'Technical details' });
  } else {
    checks.push({ pass: wordCount < 15 ? null : 'partial', text: 'Technical details' });
  }

  return { quality, checks };
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
  
  const [duplicateWarning] = useState<{ matchId: string; similarity: number } | null>(null);

  const wordCount = useMemo(() => 
    inputText.trim().split(/\s+/).filter(Boolean).length, 
    [inputText]
  );
  
  const charCount = inputText.length;
  const canGenerate = wordCount >= 10 && programId && projectId;
  const isActive = wordCount >= 10;

  // Estimates
  const estimates = useMemo(() => {
    if (wordCount < 10) return { epics: 0, features: 0, stories: 0 };
    const complexity = wordCount / 30;
    return {
      epics: Math.max(1, Math.floor(complexity)) + 1,
      features: Math.max(2, Math.floor(complexity * 2)) + 2,
      stories: Math.max(4, Math.floor(complexity * 4)) + 4
    };
  }, [wordCount]);

  // Quality
  const { quality, checks } = useMemo(() => {
    return calculateQuality(inputText, wordCount);
  }, [inputText, wordCount]);

  // Suggestions
  const suggestions = useMemo(() => {
    const sug: string[] = [];
    if (wordCount >= 10 && wordCount < 50) {
      sug.push('Add more detail about user workflows');
    }
    if (!inputText.toLowerCase().includes('integration')) {
      sug.push('Consider mentioning integration requirements');
    }
    return sug;
  }, [inputText, wordCount]);

  const selectedProgram = programs.find(p => p.id === programId);
  const selectedProject = projects.find(p => p.id === projectId);
  const filteredProjects = projects.filter(p => p.programId === programId);

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
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Gradient icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Requirement Assist</h1>
            <p className="text-xs text-slate-500">Transform requirements into SAFe work items</p>
          </div>
        </div>
        
        {/* Program/Project Selectors + ID Badges */}
        <div className="flex items-center gap-4">
          {/* Selectors Container */}
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Program:</span>
              <Select value={programId || ''} onValueChange={(v) => setProgramId(v || null)}>
                <SelectTrigger className="border-0 bg-transparent font-semibold h-auto p-0 w-auto min-w-[120px]">
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-300" />

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Project:</span>
              <Select 
                value={projectId || ''} 
                onValueChange={(v) => setProjectId(v || null)}
                disabled={!programId}
              >
                <SelectTrigger className="border-0 bg-transparent font-semibold h-auto p-0 w-auto min-w-[140px]">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ID Preview Badges - Always visible with fallback defaults */}
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-violet-100 border border-violet-200 rounded-lg flex items-center gap-1.5">
              <span className="w-2 h-2 bg-violet-500 rounded-full" />
              <span className="text-xs font-bold text-violet-700 font-mono">
                {selectedProgram?.code || 'CAT'}-XXX
              </span>
            </div>
            <div className="px-3 py-1.5 bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-xs font-bold text-emerald-700 font-mono">
                {selectedProject?.code || 'DIP'}-XXX
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Three Column Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left: History Sidebar */}
        <div className="w-72 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
          <div className="h-12 px-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">History</span>
            </div>
            <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-medium text-slate-500">0</span>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Input 
                placeholder="Search history..." 
                className="h-9 pl-9 text-sm bg-slate-50 border-slate-200"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Empty State */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
              <Clock className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">No history yet</p>
            <p className="text-xs text-slate-400">Your generations will appear here</p>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-100">
            <button 
              onClick={onShowHistory}
              className="w-full text-center text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              View All History →
            </button>
          </div>
        </div>

        {/* Center: Editor */}
        <div className="flex-1 flex flex-col min-w-0 p-6">
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col overflow-hidden">
            {/* Editor Header */}
            <div className="h-12 px-5 flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-700">Requirements Input</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  Draft
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  Import
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Template
                </Button>
              </div>
            </div>

            {/* Textarea */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe your system requirements in detail. Include actors, functionalities, integrations, and non-functional requirements..."
              maxLength={3000}
              className="flex-1 p-6 text-base text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none leading-relaxed min-h-[300px]"
            />

            {/* Footer */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-50 via-slate-50 to-blue-50/30 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">{wordCount}</span>
                  <span className="text-sm text-slate-400">words</span>
                </div>
                <div className="w-px h-5 bg-slate-200" />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">{charCount.toLocaleString()}</span>
                  <span className="text-sm text-slate-400">/ 3,000</span>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={cn(
                  "h-11 px-6 rounded-xl font-semibold transition-all duration-200",
                  canGenerate
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:-translate-y-0.5"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                )}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {canGenerate ? 'Generate' : wordCount < 10 ? `${10 - wordCount} more words` : 'Generate'}
                {canGenerate && (
                  <kbd className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono">⌘G</kbd>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right: AI Insights Panel */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col flex-shrink-0">
          {/* Header */}
          <div className="h-12 px-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full transition-colors",
                isActive ? "bg-emerald-500 animate-pulse" : 
                wordCount > 0 ? "bg-amber-500" : "bg-slate-300"
              )} />
              <span className="text-sm font-semibold text-slate-700">AI Insights</span>
            </div>
            <span className="text-xs text-slate-400">
              {isActive ? 'Ready' : wordCount > 0 ? 'Need more input' : 'Waiting for input'}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Estimated Output Card */}
            <EstimateCard estimates={estimates} isActive={isActive} />

            {/* Input Quality */}
            <QualityCard quality={quality} checks={checks} />

            {/* Suggestions */}
            {suggestions.length > 0 && isActive && (
              <SuggestionsPanel suggestions={suggestions} />
            )}

            {/* Duplicate Warning */}
            {duplicateWarning && (
              <DuplicateWarning 
                matchId={duplicateWarning.matchId}
                similarity={duplicateWarning.similarity}
              />
            )}
          </div>

          {/* Compliance Footer */}
          <div className="p-4 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium text-slate-600">DGA Compliant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium text-slate-600">NCA ECC-2</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
