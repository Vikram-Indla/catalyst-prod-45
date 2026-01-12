// ============================================================
// GENERATING STATE COMPONENT
// Full-screen progress with circular indicator
// ============================================================

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useStore, type Generation } from '@/stores/requirementAssistStore';

interface GeneratingStateProps {
  onCancel: () => void;
  onComplete: (generation: Generation) => void;
}

const GENERATION_STEPS = [
  'Analyzing requirements...',
  'Identifying actors and functions...',
  'Generating epics...',
  'Decomposing into features...',
  'Creating user stories...',
  'Validating hierarchy...',
  'Finalizing output...',
];

export function GeneratingState({ onCancel, onComplete }: GeneratingStateProps) {
  const { generation, isGenerating, generationError } = useStore();
  
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  // Simulate progress (in real implementation, this would come from the API)
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 3;
      });
    }, 200);

    const stepInterval = setInterval(() => {
      setStepIndex(prev => {
        if (prev >= GENERATION_STEPS.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, []);

  // Handle completion
  useEffect(() => {
    if (generation && generation.status === 'completed') {
      onComplete(generation);
    }
  }, [generation, onComplete]);

  const currentStep = GENERATION_STEPS[stepIndex];
  const displayProgress = Math.min(100, Math.round(progress));
  
  // SVG circle calculations
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * displayProgress / 100);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-50">
      {/* Cancel Button */}
      <button
        onClick={onCancel}
        className="absolute top-6 right-6 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        Cancel
        <X className="w-4 h-4" />
      </button>

      {/* Main Content */}
      <div className="flex flex-col items-center gap-8">
        {/* Title */}
        <h2 className="text-2xl font-semibold text-slate-900">Generating...</h2>

        {/* Circular Progress */}
        <div className="relative">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
            {/* Background circle */}
            <circle 
              cx="64" 
              cy="64" 
              r={radius} 
              fill="none" 
              stroke="#e2e8f0" 
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle 
              cx="64" 
              cy="64" 
              r={radius} 
              fill="none" 
              stroke="url(#gradient)" 
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-300"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Progress Text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-slate-900">{displayProgress}%</span>
          </div>
        </div>

        {/* Current Step */}
        <p className="text-sm text-slate-500">{currentStep}</p>

        {/* Error State */}
        {generationError && (
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {generationError}
          </div>
        )}
      </div>
    </div>
  );
}
