// ============================================================
// GENERATING OVERLAY COMPONENT
// Full-panel overlay during generation with streaming preview
// ============================================================

import React from 'react';
import { useStore } from '@/stores/requirementAssistStore';
import { useGeneration } from '@/hooks/requirement-assist';
import { Check, Loader2, Clock, X } from 'lucide-react';

const GENERATION_STEPS = [
  { 
    id: 'init', 
    title: 'Loading templates', 
    description: 'Ministry PRD, SAFe Epic, Gherkin formats',
    progressStart: 0,
    progressEnd: 10,
  },
  { 
    id: 'analyze', 
    title: 'Analyzing requirements', 
    description: 'Extracting actors, functions, NFRs, integrations',
    progressStart: 10,
    progressEnd: 25,
  },
  { 
    id: 'generate', 
    title: 'Generating work items', 
    description: 'Creating SAFe-compliant epics, features, stories',
    progressStart: 25,
    progressEnd: 88,
  },
  { 
    id: 'validate', 
    title: 'Validating compliance', 
    description: 'Checking DGA and NCA ECC-2 standards',
    progressStart: 88,
    progressEnd: 100,
  },
];

export function GeneratingOverlay() {
  const { generation, workItems } = useStore();
  const { cancelGeneration } = useGeneration();
  
  const progress = generation?.progress || 0;
  const currentStep = generation?.currentStep || 'Initializing...';

  const getStepStatus = (step: typeof GENERATION_STEPS[0]) => {
    if (progress >= step.progressEnd) return 'complete';
    if (progress >= step.progressStart) return 'active';
    return 'pending';
  };

  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-900">
              Generating with CATY...
            </span>
            <p className="text-xs text-slate-500">{currentStep}</p>
          </div>
        </div>
        <button
          onClick={cancelGeneration}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>
      
      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Progress Bar */}
        <div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-300 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-slate-500">{currentStep}</span>
            <span className="font-semibold text-primary">{progress}%</span>
          </div>
        </div>
        
        {/* Steps */}
        <div className="space-y-1">
          {GENERATION_STEPS.map((step) => {
            const status = getStepStatus(step);
            return (
              <StepRow 
                key={step.id}
                title={step.title}
                description={step.description}
                status={status}
              />
            );
          })}
        </div>
        
        {/* Streaming Preview */}
        <StreamingPreview items={workItems} />
      </div>
    </div>
  );
}

// ============================================================
// STEP ROW SUB-COMPONENT
// ============================================================

interface StepRowProps {
  title: string;
  description: string;
  status: 'pending' | 'active' | 'complete';
}

function StepRow({ title, description, status }: StepRowProps) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
      {/* Icon */}
      <div className={`
        w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
        ${status === 'complete' ? 'bg-green-100' :
          status === 'active' ? 'bg-primary/10' :
          'bg-slate-100'}
      `}>
        {status === 'complete' ? (
          <Check className="w-3.5 h-3.5 text-green-600" />
        ) : status === 'active' ? (
          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
        ) : (
          <Clock className="w-3.5 h-3.5 text-slate-400" />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${
          status === 'complete' ? 'text-slate-900' :
          status === 'active' ? 'text-slate-900' :
          'text-slate-400'
        }`}>
          {title}
        </div>
        <div className={`text-xs ${
          status === 'complete' ? 'text-slate-500' :
          status === 'active' ? 'text-slate-500' :
          'text-slate-400'
        }`}>
          {description}
        </div>
      </div>
      
      {/* Status Badge */}
      <span className={`text-xs font-medium ${
        status === 'complete' ? 'text-green-600' :
        status === 'active' ? 'text-primary' :
        'text-slate-400'
      }`}>
        {status === 'complete' ? 'Done' :
         status === 'active' ? 'Processing' :
         'Pending'}
      </span>
    </div>
  );
}

// ============================================================
// STREAMING PREVIEW SUB-COMPONENT
// ============================================================

interface StreamingPreviewProps {
  items: any[];
}

function StreamingPreview({ items }: StreamingPreviewProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-100 bg-white">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Live Preview
        </span>
        <span className="text-xs text-slate-400 ml-2">
          {items.length} items
        </span>
      </div>
      
      {/* Items */}
      <div className="p-3 max-h-[300px] overflow-y-auto space-y-1">
        {items.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-6">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-300" />
            Waiting for items...
          </div>
        ) : (
          items.map((item, index) => (
            <StreamingItem 
              key={item.id} 
              item={item} 
              isLast={index === items.length - 1}
              delay={index * 80}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// STREAMING ITEM SUB-COMPONENT
// ============================================================

interface StreamingItemProps {
  item: any;
  isLast: boolean;
  delay: number;
}

function StreamingItem({ item, isLast }: StreamingItemProps) {
  // Indentation based on type
  const indent = 
    item.itemType === 'feature' ? 'ml-5' : 
    item.itemType === 'story' ? 'ml-10' : 
    '';
  
  // Badge colors
  const badgeColors: Record<string, string> = {
    epic: 'bg-purple-100 text-purple-700',
    feature: 'bg-blue-100 text-blue-700',
    story: 'bg-green-100 text-green-700',
  };

  return (
    <div 
      className={`flex items-center gap-2 py-2 animate-fade-in ${indent}`}
    >
      {/* Status Icon */}
      {isLast ? (
        <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
          <div className="w-2 h-2 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-green-600" />
        </div>
      )}
      
      {/* Type Badge */}
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${badgeColors[item.itemType] || 'bg-slate-100 text-slate-600'}`}>
        {item.itemType.slice(0, 4)}
      </span>
      
      {/* Title */}
      <span className={`text-sm truncate ${isLast ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
        {item.title}
        {isLast && (
          <span className="inline-block w-0.5 h-3.5 bg-primary ml-1 animate-pulse" />
        )}
      </span>
    </div>
  );
}
