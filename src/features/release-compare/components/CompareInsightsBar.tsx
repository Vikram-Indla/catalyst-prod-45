/**
 * Compare Insights Bar Component
 * AI-powered insights with purple gradient
 */

import React from 'react';
import { Bot, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ComparisonInsight } from '../types';

interface CompareInsightsBarProps {
  insights: ComparisonInsight[];
}

export function CompareInsightsBar({ insights }: CompareInsightsBarProps) {
  if (insights.length === 0) return null;
  
  // Show top 3 insights
  const displayInsights = insights.slice(0, 3);
  
  const getIcon = (type: ComparisonInsight['type']) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-white" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-white" />;
      case 'positive':
        return <CheckCircle2 className="w-4 h-4 text-white" />;
      default:
        return null;
    }
  };
  
  return (
    <div 
      className="rounded-lg p-4 mb-6"
      style={{
        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-lg">
          <Bot className="w-5 h-5 text-white" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-4 flex-wrap">
            {displayInsights.map((insight, index) => (
              <div key={index} className="flex items-center gap-2">
                {getIcon(insight.type)}
                <span className="text-sm text-white">
                  {insight.message}
                </span>
                {index < displayInsights.length - 1 && (
                  <span className="text-white/40 mx-2">•</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
