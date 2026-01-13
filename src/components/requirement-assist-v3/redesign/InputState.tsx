// ============================================================
// INPUT STATE COMPONENT - ENTERPRISE REDESIGN
// Three-column layout: History | Editor | AI Insights
// ============================================================

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Sparkles, Clock, ChevronRight, Check, AlertTriangle, 
  Lightbulb, Search, Layers, X
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
import { RichTextEditor } from './RichTextEditor';

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
      {isActive ? value : '—'}
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
        ? "bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg"
        : "bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200"
    )}>
      <p className={cn(
        "text-[10px] font-semibold uppercase tracking-wider mb-3",
        isActive ? "text-blue-200" : "text-slate-400"
      )}>
        Estimated Output
      </p>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <AnimatedNumber value={estimates.epics} isActive={isActive} />
          <p className={cn(
            "text-[10px] mt-0.5",
            isActive ? "text-blue-200" : "text-slate-400"
          )}>Epics</p>
        </div>
        <div>
          <AnimatedNumber value={estimates.features} isActive={isActive} />
          <p className={cn(
            "text-[10px] mt-0.5",
            isActive ? "text-blue-200" : "text-slate-400"
          )}>Features</p>
        </div>
        <div>
          <AnimatedNumber value={estimates.stories} isActive={isActive} />
          <p className={cn(
            "text-[10px] mt-0.5",
            isActive ? "text-blue-200" : "text-slate-400"
          )}>Stories</p>
        </div>
      </div>
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
  const label = quality >= 75 ? 'Excellent' : quality >= 50 ? 'Good' : quality > 0 ? 'Basic' : '—';
  const labelColor = quality >= 75 ? 'text-emerald-600' : quality >= 50 ? 'text-blue-600' : quality > 0 ? 'text-amber-600' : 'text-slate-300';

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Input Quality
        </p>
        <span className={cn("text-xs font-semibold", labelColor)}>{label}</span>
      </div>
      
      {/* Progress Bar */}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div 
          className="h-full rounded-full transition-all duration-300"
          style={{ 
            width: `${quality}%`,
            backgroundColor: quality >= 75 ? '#10b981' : quality >= 50 ? '#3b82f6' : '#f59e0b'
          }}
        />
      </div>
      
      {/* Checks */}
      <div className="space-y-2">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className={cn(
              "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold",
              check.pass === true ? "bg-emerald-500 text-white" : 
              check.pass === 'partial' ? "bg-amber-100 border-2 border-amber-400 text-amber-600" :
              "bg-slate-100 text-slate-400"
            )}>
              {check.pass === true ? <Check className="w-2.5 h-2.5" /> : i + 1}
            </div>
            <span className={cn(
              "text-xs",
              check.pass === true ? "text-slate-700" : 
              check.pass === 'partial' ? "text-amber-600" :
              "text-slate-400"
            )}>
              {check.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// DETECTED PATTERNS COMPONENT
// ============================================================
function DetectedPatterns({ patterns }: { patterns: string[] }) {
  if (patterns.length === 0) return null;
  
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Detected Patterns
      </p>
      <div className="space-y-2">
        {patterns.map((pattern, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            <span className="text-slate-600">{pattern}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// SIMILAR FOUND WARNING
// ============================================================
function SimilarFoundWarning({ matchId, similarity }: { matchId: string; similarity: number }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-2">
        Similar Found
      </p>
      <p className="text-xs text-amber-700 mb-2">
        {similarity}% match with {matchId}
      </p>
      <button className="text-xs font-medium text-amber-700 hover:underline">
        View existing →
      </button>
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
// DETECT PATTERNS
// ============================================================
function detectPatterns(text: string): string[] {
  const patterns: string[] = [];
  const lower = text.toLowerCase();
  
  if (lower.match(/api|integration|endpoint/)) patterns.push('API Integration');
  if (lower.match(/upload|download|file|document/)) patterns.push('File Management');
  if (lower.match(/user|admin|role|permission/)) patterns.push('User Management');
  if (lower.match(/report|dashboard|analytics/)) patterns.push('Reporting');
  if (lower.match(/workflow|approval|status/)) patterns.push('Workflow Automation');
  if (lower.match(/notification|alert|email/)) patterns.push('Notifications');
  
  return patterns;
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
  const [duplicateWarning] = useState<{ matchId: string; similarity: number } | null>(null);

  const wordCount = useMemo(() => 
    inputText.trim().split(/\s+/).filter(Boolean).length, 
    [inputText]
  );
  
  const canGenerate = wordCount >= 10 && programId && projectId;
  const isActive = wordCount >= 10;

  // Estimates - with HARD MAXIMUM LIMITS to prevent absurd numbers
  const estimates = useMemo(() => {
    if (wordCount < 10) return { epics: 0, features: 0, stories: 0 };
    
    // HARD MAXIMUM LIMITS
    const MAX_EPICS = 5;
    const MAX_FEATURES = 15;
    const MAX_STORIES = 50;
    
    // Simple, reasonable estimation based on content size
    let epics: number;
    if (wordCount < 100) epics = 1;
    else if (wordCount < 300) epics = 2;
    else if (wordCount < 600) epics = 3;
    else if (wordCount < 1000) epics = 4;
    else epics = 5; // CAP AT 5, no matter how long!
    
    const features = epics * 3; // ~3 features per epic
    const stories = features * 3; // ~3 stories per feature
    
    return {
      epics: Math.min(epics, MAX_EPICS),
      features: Math.min(features, MAX_FEATURES),
      stories: Math.min(stories, MAX_STORIES)
    };
  }, [wordCount]);

  // Quality
  const { quality, checks } = useMemo(() => {
    return calculateQuality(inputText, wordCount);
  }, [inputText, wordCount]);

  // Detected patterns
  const detectedPatterns = useMemo(() => {
    return isActive ? detectPatterns(inputText) : [];
  }, [inputText, isActive]);

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

          {/* ID Preview Badges */}
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-violet-100 border border-violet-200 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
              <span className="text-[10px] font-bold text-violet-700 font-mono">
                {selectedProgram?.code || 'CAT'}-XXX
              </span>
            </div>
            <div className="px-2 py-1 bg-emerald-100 border border-emerald-200 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-[10px] font-bold text-emerald-700 font-mono">
                {selectedProject?.code || 'DIP'}-XXX
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Three Column Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* Left: History Sidebar - Denser */}
        <div className="w-56 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
          <div className="h-11 px-3 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">History</span>
              <span className="text-[10px] text-slate-400">0</span>
            </div>
            {/* Only show when count > 0 */}
            {false && (
              <button 
                onClick={onShowHistory}
                className="text-[10px] font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                View All →
              </button>
            )}
          </div>

          {/* Search */}
          <div className="p-2 border-b border-slate-50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                placeholder="Search..."
                className="w-full h-8 pl-8 pr-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Empty State - Polished */}
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs font-medium text-slate-500">No history yet</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Generations appear here</p>
          </div>
        </div>

        {/* Center: Main Editor */}
        <div className="flex-1 p-5 bg-slate-50 overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-200/50 flex flex-col overflow-hidden min-h-0">
            {/* Card Header - Minimal */}
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

            {/* Editor Footer with Word Count + Generate Button - MUST ALWAYS BE VISIBLE */}
            <div className="h-16 px-4 flex items-center justify-between border-t border-slate-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
              {/* Left: Word count */}
              <div className="flex items-center gap-3 text-sm">
                <span className="font-bold text-slate-700">{wordCount}</span>
                <span className="text-slate-400">words</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500">{inputText.length.toLocaleString()} / 3,000</span>
              </div>

              {/* Right: Generate Button - ALWAYS VISIBLE */}
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

        {/* Right: AI Insights Panel */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col flex-shrink-0">
          {/* Header */}
          <div className="h-11 px-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
              )} />
              <span className="text-sm font-semibold text-slate-700">AI Analysis</span>
            </div>
            {isActive && (
              <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Live
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Estimated Output */}
            <EstimateCard estimates={estimates} isActive={isActive} />

            {/* Input Quality */}
            <QualityCard quality={quality} checks={checks} />

            {/* Detected Patterns */}
            <DetectedPatterns patterns={detectedPatterns} />

            {/* Similar Found Warning */}
            {duplicateWarning && (
              <SimilarFoundWarning 
                matchId={duplicateWarning.matchId}
                similarity={duplicateWarning.similarity}
              />
            )}
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
