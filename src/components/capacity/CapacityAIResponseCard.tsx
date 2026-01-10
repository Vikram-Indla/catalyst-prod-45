/**
 * CapacityAIResponseCard - Enterprise Executive Response Card
 * 
 * Strict answer hierarchy for CIOs, PMOs, auditors, and ministers.
 * No chatty responses - structured data only.
 */

import React from 'react';
import { Check, X, AlertTriangle, ExternalLink, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface AIResponseData {
  directAnswer: {
    value: string;
    status: 'success' | 'error' | 'warning';
  };
  context?: Array<{
    label: string;
    value: string;
  }>;
  systemNote?: string;
  actions?: Array<{
    label: string;
    type: 'primary' | 'secondary';
    action: string;
  }>;
}

interface CapacityAIResponseCardProps {
  data: AIResponseData;
  onAction?: (action: string) => void;
}

export function CapacityAIResponseCard({ data, onAction }: CapacityAIResponseCardProps) {
  const getStatusIcon = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return <Check className="w-5 h-5" />;
      case 'error':
        return <X className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getStatusStyles = (status: 'success' | 'error' | 'warning') => {
    switch (status) {
      case 'success':
        return {
          bg: 'bg-[#0d9488]/10',
          border: 'border-[#0d9488]',
          text: 'text-[#0d9488]',
          icon: 'text-[#0d9488]'
        };
      case 'error':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500',
          text: 'text-red-600 dark:text-red-400',
          icon: 'text-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-[#d97706]/10',
          border: 'border-[#d97706]',
          text: 'text-[#d97706]',
          icon: 'text-[#d97706]'
        };
    }
  };

  const statusStyles = getStatusStyles(data.directAnswer.status);

  return (
    <div className="w-full rounded-lg overflow-hidden border border-[#C8CCD0] dark:border-[#1A1A1A]/50 bg-white dark:bg-[#1A1A1A]">
      {/* Direct Answer Section */}
      <div className={`px-4 py-4 ${statusStyles.bg} border-l-4 ${statusStyles.border}`}>
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 mt-0.5 ${statusStyles.icon}`}>
            {getStatusIcon(data.directAnswer.status)}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#0d9488] dark:text-[#0d9488] mb-1">
              DIRECT ANSWER
            </p>
            <p className={`text-xl font-bold ${statusStyles.text} dark:text-white`}>
              {data.directAnswer.value}
            </p>
          </div>
        </div>
      </div>

      {/* Context Section */}
      {data.context && data.context.length > 0 && (
        <div className="px-4 py-3 border-t border-[#C8CCD0]/30 dark:border-[#C8CCD0]/10">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#0d9488] dark:text-[#0d9488] mb-2">
            CONTEXT
          </p>
          <div className="space-y-1.5">
            {data.context.slice(0, 6).map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-[#1A1A1A]/60 dark:text-[#C8CCD0]/60 font-medium">
                  {item.label}
                </span>
                <span className="text-[#1A1A1A] dark:text-white font-semibold">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Note Section */}
      {data.systemNote && (
        <div className="px-4 py-3 border-t border-[#C8CCD0]/30 dark:border-[#C8CCD0]/10 bg-[#0d9488]/5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#0d9488] dark:text-[#0d9488] mb-1">
            SYSTEM NOTE
          </p>
          <p className="text-sm text-[#1A1A1A]/70 dark:text-[#C8CCD0]/70">
            {data.systemNote}
          </p>
        </div>
      )}

      {/* Actions Section */}
      {data.actions && data.actions.length > 0 && (
        <div className="px-4 py-3 border-t border-[#C8CCD0]/30 dark:border-[#C8CCD0]/10 bg-[#C8CCD0]/10 dark:bg-[#1A1A1A]/50">
          <div className="flex items-center gap-2">
            {data.actions.map((action, index) => (
              <Button
                key={index}
                variant={action.type === 'primary' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onAction?.(action.action)}
                className={
                  action.type === 'primary'
                    ? 'bg-[#1A1A1A] hover:bg-[#1A1A1A]/80 text-white dark:bg-[#0d9488] dark:hover:bg-[#0d9488]/80 dark:text-white'
                    : 'border-[#C8CCD0] text-[#1A1A1A] dark:border-[#C8CCD0]/30 dark:text-[#C8CCD0]'
                }
              >
                {action.label === 'Open User' && <ExternalLink className="w-3.5 h-3.5 mr-1.5" />}
                {action.label === 'Fix Missing Data' && <Wrench className="w-3.5 h-3.5 mr-1.5" />}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to parse AI response into structured format
export function parseAIResponse(text: string, query: string): AIResponseData | null {
  // Try to extract structured data from AI response
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();
  
  // Contract end date queries
  if (lowerQuery.includes('contract') && (lowerQuery.includes('end') || lowerQuery.includes('expir'))) {
    // Look for date patterns in the response
    const dateMatch = text.match(/(\d{1,2}[\s/-]\w+[\s/-]\d{4}|\w+\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})/i);
    const nameMatch = query.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
    
    if (dateMatch) {
      return {
        directAnswer: {
          value: dateMatch[0],
          status: 'success'
        },
        context: [
          { label: 'Resource', value: nameMatch?.[0] || 'Unknown' },
          { label: 'Data Source', value: 'resource_inventory' },
          { label: 'Field', value: 'contract_end_date' },
          { label: 'Query Time', value: new Date().toLocaleTimeString() }
        ],
        actions: [
          { label: 'Open User', type: 'primary', action: 'open-user' }
        ]
      };
    }
  }
  
  // Availability queries
  if (lowerQuery.includes('available') || lowerQuery.includes('availability')) {
    const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch) {
      const percent = parseFloat(percentMatch[1]);
      return {
        directAnswer: {
          value: `${percent}% Available`,
          status: percent > 50 ? 'success' : percent > 20 ? 'warning' : 'error'
        },
        context: [
          { label: 'Status', value: percent > 50 ? 'Under-allocated' : 'Fully utilized' }
        ]
      };
    }
  }

  // If data not found in response
  if (lowerText.includes('not available') || lowerText.includes('no data') || lowerText.includes('not found')) {
    return {
      directAnswer: {
        value: 'Data Not Found',
        status: 'warning'
      },
      systemNote: text,
      actions: [
        { label: 'Fix Missing Data', type: 'secondary', action: 'fix-data' }
      ]
    };
  }

  return null;
}

export default CapacityAIResponseCard;
