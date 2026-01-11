// ============================================================
// EDITOR COMPONENT
// Rich text input for requirements
// ============================================================

import React, { useCallback } from 'react';
import { useStore, selectWordCount } from '@/stores/requirementAssistStore';
import { useAnalysis } from '@/hooks/requirement-assist';

const MAX_WORDS = 3000;

const PLACEHOLDER = `Describe your requirements here...

Example:
The Gold License Management System shall allow applicants to submit new license applications online. The system must validate applicant information against Ministry databases, process document uploads in PDF and image formats, and generate unique application reference numbers.

Applicants should be able to track their application status in real-time, receive notifications on status changes, and communicate with administrators through a secure messaging system.`;

export function Editor() {
  const { inputText, setInputText, isGenerating } = useStore();
  const wordCount = useStore(selectWordCount);
  
  // Trigger analysis as user types
  useAnalysis(inputText);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const words = text.trim().split(/\s+/).length;
    
    // Enforce word limit
    if (words > MAX_WORDS) {
      return;
    }
    
    setInputText(text);
  }, [setInputText]);

  const wordCountColor = wordCount < 10 
    ? 'text-amber-600' 
    : wordCount > 2500 
      ? 'text-red-600' 
      : 'text-slate-500';

  return (
    <div className={`
      border rounded-lg overflow-hidden transition-all duration-150
      ${isGenerating 
        ? 'border-slate-200 bg-slate-50 opacity-70' 
        : 'border-slate-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10'
      }
    `}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
        <span className="text-xs font-medium text-slate-500">
          Requirements
        </span>
        <span className={`text-xs ${wordCountColor}`}>
          <strong className="font-semibold">{wordCount.toLocaleString()}</strong>
          <span className="text-slate-400"> / {MAX_WORDS.toLocaleString()}</span>
        </span>
      </div>
      
      {/* Textarea */}
      <textarea
        value={inputText}
        onChange={handleChange}
        disabled={isGenerating}
        placeholder={PLACEHOLDER}
        className="
          w-full min-h-[160px] max-h-[240px] p-3 
          text-sm text-slate-700 leading-relaxed
          placeholder:text-slate-400 
          resize-none focus:outline-none 
          disabled:cursor-not-allowed disabled:bg-slate-50
        "
      />
      
      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Press</span>
          <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-sm">
            ⌘
          </kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-sm">
            G
          </kbd>
          <span>to generate</span>
        </div>
        
        {wordCount < 10 && wordCount > 0 && (
          <span className="text-xs text-amber-600">
            Minimum 10 words required
          </span>
        )}
      </div>
    </div>
  );
}
