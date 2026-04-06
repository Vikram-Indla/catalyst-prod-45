/**
 * AI Insights Bar Component — Blue theme (no purple)
 */

import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, AlertCircle, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AIReleaseInsight } from '../types';

interface AIInsightsBarProps {
  insights: AIReleaseInsight[];
  onActionClick?: (insight: AIReleaseInsight) => void;
}

export function AIInsightsBar({ insights, onActionClick }: AIInsightsBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (insights.length === 0) return null;
  
  const criticalCount = insights.filter(i => i.type === 'critical').length;
  const warningCount = insights.filter(i => i.type === 'warning').length;
  
  const displayedInsights = isExpanded ? insights : insights.slice(0, 2);
  
  const getIcon = (type: AIReleaseInsight['type']) => {
    switch (type) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-[rgba(237,237,237,0.40)]" />;
      case 'positive': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
  };
  
  const getBgColor = (type: AIReleaseInsight['type']) => {
    switch (type) {
      case 'critical': return 'bg-red-50 border-red-100';
      case 'warning': return 'bg-[#1A1A1A] border-[rgba(15,23,42,0.12)]';
      case 'positive': return 'bg-green-50 border-green-100';
    }
  };

  return (
    <div className="border rounded-xl p-4 mb-6" style={{ background: 'rgba(59,130,246,0.06)', borderColor: '#DBEAFE' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ background: '#DBEAFE' }}>
            <Sparkles className="w-4 h-4" style={{ color: '#2563EB' }} />
          </div>
          <span className="font-semibold text-slate-800">AI Insights</span>
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: '#DBEAFE', color: '#FFFFFF' }}>
              {warningCount} warnings
            </span>
          )}
        </div>
        
        {insights.length > 2 && (
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="text-slate-600 hover:text-slate-900">
            {isExpanded ? (<>Show Less <ChevronUp className="w-4 h-4 ml-1" /></>) : (<>Show All ({insights.length}) <ChevronDown className="w-4 h-4 ml-1" /></>)}
          </Button>
        )}
      </div>
      
      <div className="space-y-2">
        {displayedInsights.map((insight, index) => (
          <div key={`${insight.releaseId}-${index}`} className={cn("flex items-center justify-between p-3 rounded-lg border", getBgColor(insight.type))}>
            <div className="flex items-center gap-3">
              {getIcon(insight.type)}
              <span className="text-sm text-slate-700">{insight.message}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onActionClick?.(insight)} className="text-[#2563EB] hover:text-[#1D4ED8] text-xs">
              {insight.action}
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
