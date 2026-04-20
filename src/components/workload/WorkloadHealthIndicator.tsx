/**
 * Workload Health Indicator Component
 * Shows overall workload health status with expandable details
 */

import React, { useState } from 'react';
import { Lozenge } from '@/components/ads';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, CheckCircle, AlertCircle, AlertTriangle, XCircle } from 'lucide-react';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import type { WorkloadHealth } from '@/types/workload.types';

interface WorkloadHealthIndicatorProps {
  health: WorkloadHealth;
}

const healthConfig = {
  excellent: {
    icon: CheckCircle,
    label: 'Excellent',
    color: CATALYST_V5.teal,
    bgColor: CATALYST_V5.tealLight,
  },
  good: {
    icon: CheckCircle,
    label: 'Good',
    color: CATALYST_V5.primary,
    bgColor: CATALYST_V5.primaryLight,
  },
  warning: {
    icon: AlertTriangle,
    label: 'Warning',
    color: CATALYST_V5.warning,
    bgColor: CATALYST_V5.warningLight,
  },
  critical: {
    icon: XCircle,
    label: 'Critical',
    color: CATALYST_V5.danger,
    bgColor: CATALYST_V5.dangerLight,
  },
};

export function WorkloadHealthIndicator({ health }: WorkloadHealthIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const config = healthConfig[health.status];
  const Icon = config.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2 px-3 py-1.5 h-auto"
          style={{ backgroundColor: config.bgColor }}
        >
          <Icon className="h-4 w-4" style={{ color: config.color }} />
          <span className="font-medium" style={{ color: config.color }}>
            {config.label}
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" style={{ color: config.color }} />
          ) : (
            <ChevronDown className="h-4 w-4" style={{ color: config.color }} />
          )}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div 
          className="absolute right-0 mt-2 w-72 p-4 rounded-lg shadow-lg border z-50"
          style={{ backgroundColor: 'white' }}
        >
          <h4 className="font-medium mb-3" style={{ color: CATALYST_V5.slate[900] }}>
            Workload Health Details
          </h4>
          
          <div className="space-y-3">
            {/* Overloaded count */}
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: CATALYST_V5.slate[600] }}>
                Overloaded Members
              </span>
              <Lozenge appearance={health.overloadedCount > 0 ? 'removed' : 'default'}>
                {String(health.overloadedCount)}
              </Lozenge>
            </div>
            
            {/* Underutilized count */}
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: CATALYST_V5.slate[600] }}>
                Underutilized Members
              </span>
              <Lozenge appearance={health.underutilizedCount > 0 ? 'inprogress' : 'default'}>
                {String(health.underutilizedCount)}
              </Lozenge>
            </div>
            
            {/* Imbalance score */}
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: CATALYST_V5.slate[600] }}>
                Imbalance Score
              </span>
              <span className="text-sm font-medium" style={{ color: CATALYST_V5.slate[700] }}>
                {Math.round(health.imbalanceScore)}%
              </span>
            </div>
            
            {/* Suggestions */}
            {health.suggestions.length > 0 && (
              <div className="pt-2 border-t" style={{ borderColor: CATALYST_V5.slate[200] }}>
                <p className="text-xs font-medium mb-2" style={{ color: CATALYST_V5.slate[500] }}>
                  SUGGESTIONS
                </p>
                <ul className="space-y-1">
                  {health.suggestions.map((suggestion, i) => (
                    <li key={i} className="text-sm" style={{ color: CATALYST_V5.slate[600] }}>
                      • {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
