/**
 * Compare Insights Bar Component
 * AI-powered insights with purple gradient
 */

import React from 'react';
import WarningIcon from '@atlaskit/icon/core/warning';
import ErrorIcon from '@atlaskit/icon/core/error';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
// No @atlaskit/icon equivalent — inline SVG
const BotIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
  </svg>
);
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
        return <ErrorIcon label="" size="small" primaryColor="#ffffff" />;
      case 'warning':
        return <WarningIcon label="" size="small" primaryColor="#ffffff" />;
      case 'positive':
        return <CheckCircleIcon label="" size="small" primaryColor="#ffffff" />;
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
          <BotIcon size={20} />
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
