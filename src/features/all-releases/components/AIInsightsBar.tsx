/**
 * AI Insights Bar Component — Blue theme (no purple)
 */

import React, { useState } from 'react';
import SparklesIcon from '@atlaskit/icon/core/atlassian-intelligence';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronUpIcon from '@atlaskit/icon/glyph/chevron-up';
import ErrorIcon from '@atlaskit/icon/core/error';
import WarningIcon from '@atlaskit/icon/core/warning';
import CheckCircleIcon from '@atlaskit/icon/core/check-circle';
import ArrowRightIcon from '@atlaskit/icon/core/arrow-right';
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
      case 'critical': return <ErrorIcon label="" size="small" primaryColor="currentColor" />;
      case 'warning': return <WarningIcon label="" size="small" primaryColor="currentColor" />;
      case 'positive': return <CheckCircleIcon label="" size="small" primaryColor="currentColor" />;
    }
  };
  
  const getBgColor = (type: AIReleaseInsight['type']) => {
    switch (type) {
      case 'critical': return 'bg-red-50 border-red-100';
      case 'warning': return 'bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, #F1F5F9))] border-[rgba(15,23,42,0.12)]';
      case 'positive': return 'bg-green-50 border-green-100';
    }
  };

  return (
    <div className="border rounded-xl p-4 mb-6" style={{ background: 'var(--ds-background-selected, #EFF6FF)', borderColor: '#DBEAFE' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ background: '#DBEAFE' }}>
            <SparklesIcon label="" size="small" primaryColor="var(--ds-text-brand, #2563EB)" />
          </div>
          <span className="font-semibold text-slate-800">AI Insights</span>
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: '#DBEAFE', color: 'var(--ds-text-inverse, #FFFFFF)' }}>
              {warningCount} warnings
            </span>
          )}
        </div>
        
        {insights.length > 2 && (
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="text-slate-600 hover:text-slate-900">
            {isExpanded ? (<>Show Less <ChevronUpIcon label="" size="small" primaryColor="currentColor" /></>) : (<>Show All ({insights.length}) <ChevronDownIcon label="" size="small" primaryColor="currentColor" /></>)}
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
            <Button variant="ghost" size="sm" onClick={() => onActionClick?.(insight)} className="text-[var(--ds-text-brand,#2563EB)] hover:text-[var(--ds-background-brand-bold-hovered,#1D4ED8)] text-xs">
              {insight.action}
              <ArrowRightIcon label="" size="small" primaryColor="currentColor" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
