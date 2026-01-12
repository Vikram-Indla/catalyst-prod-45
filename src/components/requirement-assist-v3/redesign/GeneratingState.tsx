// ============================================================
// GENERATING STATE COMPONENT - COMPLETE REDESIGN
// Full-screen centered with animated progress ring
// ============================================================

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore, type Generation } from '@/stores/requirementAssistStore';
import { Button } from '@/components/ui/button';

interface GeneratingStateProps {
  onCancel: () => void;
  onComplete: (generation: Generation) => void;
}

const GENERATION_STEPS = [
  { key: 1, label: 'Analyzing', text: 'Analyzing requirements...' },
  { key: 2, label: 'Epics', text: 'Generating epics...' },
  { key: 3, label: 'Features', text: 'Decomposing into features...' },
  { key: 4, label: 'Stories', text: 'Creating user stories...' },
];

// ============================================================
// STEP INDICATOR COMPONENT
// ============================================================
function StepIndicator({ 
  step, 
  currentStep, 
  label 
}: { 
  step: number; 
  currentStep: number; 
  label: string;
}) {
  const isComplete = currentStep > step;
  const isCurrent = currentStep === step;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
      isComplete && "bg-emerald-100 text-emerald-700",
      isCurrent && "bg-blue-100 text-blue-700",
      !isComplete && !isCurrent && "bg-slate-100 text-slate-400"
    )}>
      {isComplete && <Check className="w-3 h-3" />}
      {isCurrent && <Loader2 className="w-3 h-3 animate-spin" />}
      {label}
    </div>
  );
}

// ============================================================
// LIVE PREVIEW ITEM COMPONENT
// ============================================================
function LivePreviewItem({ 
  item 
}: { 
  item: { id: string; type: string; title: string; loaded: boolean };
}) {
  const badgeColors: Record<string, string> = {
    epic: 'bg-violet-100 text-violet-700',
    feature: 'bg-teal-100 text-teal-700',
    story: 'bg-emerald-100 text-emerald-700'
  };
  
  const indent = item.type === 'feature' ? 'pl-6' : item.type === 'story' ? 'pl-12' : '';

  return (
    <div className={cn(
      "flex items-center gap-3 transition-opacity duration-300",
      indent,
      !item.loaded && "opacity-30"
    )}>
      <span className={cn("px-2 py-0.5 text-xs font-bold rounded font-mono", badgeColors[item.type])}>
        {item.id}
      </span>
      {item.loaded ? (
        <span className="text-sm text-slate-700">{item.title}</span>
      ) : (
        <div className="flex-1 h-4 bg-slate-100 rounded animate-pulse" />
      )}
    </div>
  );
}

// ============================================================
// MAIN GENERATING STATE COMPONENT
// ============================================================
export function GeneratingState({ onCancel, onComplete }: GeneratingStateProps) {
  const { generation, isGenerating, generationError } = useStore();
  
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [liveItems, setLiveItems] = useState<Array<{ id: string; type: string; title: string; loaded: boolean }>>([]);

  // Simulate progress
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 2;
      });
    }, 150);

    return () => clearInterval(progressInterval);
  }, []);

  // Simulate step progression
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= GENERATION_STEPS.length) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 2500);

    return () => clearInterval(stepInterval);
  }, []);

  // Simulate live preview items
  useEffect(() => {
    const items = [
      { id: 'E-001', type: 'epic', title: 'User Management System', loaded: false },
      { id: 'F-001', type: 'feature', title: 'Authentication & Authorization', loaded: false },
      { id: 'S-001', type: 'story', title: 'User login with email and password', loaded: false },
      { id: 'S-002', type: 'story', title: 'Password reset functionality', loaded: false },
    ];

    setLiveItems(items);

    items.forEach((item, index) => {
      setTimeout(() => {
        setLiveItems(prev => 
          prev.map((i, idx) => idx === index ? { ...i, loaded: true } : i)
        );
      }, 1500 + (index * 800));
    });
  }, []);

  // Handle completion
  useEffect(() => {
    if (generation && generation.status === 'completed') {
      onComplete(generation);
    }
  }, [generation, onComplete]);

  const displayProgress = Math.min(100, Math.round(progress));
  const currentStepData = GENERATION_STEPS[currentStep - 1] || GENERATION_STEPS[0];
  
  // SVG circle calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * displayProgress / 100);

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 animate-pulse">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Generating Work Items</h1>
            <p className="text-xs text-slate-500">Please wait while AI processes your requirements</p>
          </div>
        </div>
        <Button variant="ghost" onClick={onCancel} className="text-slate-500 hover:text-red-600">
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </header>

      {/* Progress Content */}
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-lg">
          
          {/* Progress Ring */}
          <div className="relative w-40 h-40 mx-auto mb-8">
            <svg className="w-40 h-40 -rotate-90" viewBox="0 0 160 160">
              <circle 
                cx="80" 
                cy="80" 
                r={radius} 
                fill="none" 
                stroke="#e2e8f0" 
                strokeWidth="8" 
              />
              <circle 
                cx="80" 
                cy="80" 
                r={radius} 
                fill="none" 
                stroke="url(#progressGradient)" 
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300"
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold text-slate-900">{displayProgress}%</span>
            </div>
          </div>

          {/* Step Text */}
          <p className="text-lg font-medium text-slate-700 mb-8">{currentStepData.text}</p>

          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-3 mb-8">
            {GENERATION_STEPS.map(step => (
              <StepIndicator 
                key={step.key} 
                step={step.key} 
                currentStep={currentStep} 
                label={step.label} 
              />
            ))}
          </div>

          {/* Live Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 text-left">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Generating
            </p>
            <div className="space-y-3">
              {liveItems.map((item, i) => (
                <LivePreviewItem key={i} item={item} />
              ))}
            </div>
          </div>

          {/* Error State */}
          {generationError && (
            <div className="mt-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {generationError}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
