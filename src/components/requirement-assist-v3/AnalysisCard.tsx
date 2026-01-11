// ============================================================
// ANALYSIS CARD COMPONENT - ENHANCED
// Shows live AI analysis with colored stat boxes
// ============================================================

import React from 'react';
import { useStore, selectWordCount } from '@/stores/requirementAssistStore';
import { Sparkles, Loader2, TrendingUp, Users, Zap, Shield, Link } from 'lucide-react';

export function AnalysisCard() {
  const { analysis, isAnalyzing } = useStore();
  const wordCount = useStore(selectWordCount);
  
  const hasContent = wordCount >= 10;
  
  // Estimate work items based on analysis
  const estimatedEpics = Math.max(1, Math.ceil(analysis.functions.length / 4));
  const estimatedFeatures = Math.max(1, Math.ceil(analysis.functions.length / 2));
  const estimatedStories = analysis.functions.length + analysis.nfrs.length || 1;

  // Stats configuration with icons
  const stats = [
    { 
      value: analysis.actors.length, 
      label: 'Actors', 
      icon: Users,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
    },
    { 
      value: analysis.functions.length, 
      label: 'Functions', 
      icon: Zap,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    { 
      value: analysis.nfrs.length, 
      label: 'NFRs', 
      icon: Shield,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    { 
      value: analysis.integrations.length, 
      label: 'Integrations', 
      icon: Link,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  // Complexity mapping
  const complexityValue = analysis.complexity === 'low' ? 0.33 : 
                          analysis.complexity === 'medium' ? 0.66 : 1;
  const complexityLabel = analysis.complexity;
  const complexityColor = analysis.complexity === 'low' ? 'from-emerald-400 to-emerald-500' : 
                          analysis.complexity === 'medium' ? 'from-amber-400 to-orange-500' : 
                          'from-orange-500 to-red-500';
  const complexityTextColor = analysis.complexity === 'low' ? 'text-emerald-600' : 
                              analysis.complexity === 'medium' ? 'text-amber-600' : 
                              'text-red-600';

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl shadow-ra-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-slate-900">CATY Analysis</span>
        </div>
        {isAnalyzing && (
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Analyzing...
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3 p-4">
        {stats.map((stat) => (
          <div 
            key={stat.label}
            className={`text-center py-3 px-2 rounded-xl ${stat.bgColor} border border-slate-100 transition-transform hover:scale-105`}
          >
            <stat.icon className={`w-4 h-4 mx-auto mb-1.5 ${stat.color} opacity-60`} />
            <div className={`text-2xl font-bold ${hasContent && stat.value > 0 ? stat.color : 'text-slate-300'}`}>
              {stat.value}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Complexity Bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Complexity
          </span>
          <span className={`font-semibold capitalize ${hasContent ? complexityTextColor : 'text-slate-300'}`}>
            {hasContent ? complexityLabel : '—'}
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${complexityColor} rounded-full transition-all duration-500 ease-out`}
            style={{ width: hasContent ? `${complexityValue * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Estimates */}
      {hasContent && (estimatedEpics > 0 || estimatedFeatures > 0 || estimatedStories > 0) ? (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500">Estimated:</span>
            <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs font-semibold">
              ~{estimatedEpics} Epics
            </span>
            <span className="text-slate-300">•</span>
            <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs font-semibold">
              ~{estimatedFeatures} Features
            </span>
            <span className="text-slate-300">•</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
              ~{estimatedStories} Stories
            </span>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-400 text-center">
            Enter requirements to see analysis
          </p>
        </div>
      )}
    </div>
  );
}
