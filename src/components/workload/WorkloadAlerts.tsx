/**
 * Workload Alerts Component
 * Displays capacity warnings and action items
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  UserMinus, 
  Clock, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  X
} from 'lucide-react';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import type { WorkloadAlert } from '@/types/workload.types';

interface WorkloadAlertsProps {
  alerts: WorkloadAlert[];
  onAction: (alert: WorkloadAlert) => void;
  onDismiss?: (alertId: string) => void;
}

const alertConfig = {
  overloaded: {
    icon: AlertTriangle,
    bg: CATALYST_V5.dangerLight,
    iconColor: CATALYST_V5.danger,
  },
  underutilized: {
    icon: UserMinus,
    bg: CATALYST_V5.primaryLight,
    iconColor: CATALYST_V5.primary,
  },
  deadline_risk: {
    icon: Clock,
    bg: CATALYST_V5.warningLight,
    iconColor: CATALYST_V5.warning,
  },
  availability_gap: {
    icon: Calendar,
    bg: CATALYST_V5.warningLight,
    iconColor: CATALYST_V5.warning,
  },
};

export function WorkloadAlerts({ alerts, onAction, onDismiss }: WorkloadAlertsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  
  const visibleAlerts = alerts.filter(a => !dismissedIds.has(a.id));
  const displayedAlerts = visibleAlerts.slice(0, 5);
  const remainingCount = visibleAlerts.length - displayedAlerts.length;
  
  const handleDismiss = (alertId: string) => {
    setDismissedIds(prev => new Set([...prev, alertId]));
    onDismiss?.(alertId);
  };
  
  if (visibleAlerts.length === 0) return null;

  return (
    <Card className="border-l-4" style={{ borderLeftColor: CATALYST_V5.warning }}>
      <CardContent className="p-4">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" style={{ color: CATALYST_V5.warning }} />
            <span className="font-medium" style={{ color: CATALYST_V5.slate[900] }}>
              Workload Alerts
            </span>
            <Badge 
              style={{ 
                backgroundColor: CATALYST_V5.warningLight, 
                color: CATALYST_V5.warning 
              }}
            >
              {visibleAlerts.length}
            </Badge>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" style={{ color: CATALYST_V5.slate[400] }} />
          ) : (
            <ChevronDown className="h-5 w-5" style={{ color: CATALYST_V5.slate[400] }} />
          )}
        </button>
        
        {/* Alert List */}
        {isExpanded && (
          <div className="mt-4 space-y-3">
            {displayedAlerts.map((alert) => {
              const config = alertConfig[alert.type];
              const Icon = config.icon;
              
              return (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: config.bg }}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 flex-shrink-0" style={{ color: config.iconColor }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: CATALYST_V5.slate[900] }}>
                        {alert.message}
                      </p>
                      {alert.memberName && (
                        <p className="text-xs" style={{ color: CATALYST_V5.slate[500] }}>
                          {alert.memberName}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => onAction(alert)}
                      style={{ color: config.iconColor }}
                    >
                      {alert.actionLabel}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handleDismiss(alert.id)}
                    >
                      <X className="h-4 w-4" style={{ color: CATALYST_V5.slate[400] }} />
                    </Button>
                  </div>
                </div>
              );
            })}
            
            {remainingCount > 0 && (
              <button
                className="text-sm w-full text-center py-2"
                style={{ color: CATALYST_V5.primary }}
              >
                View all {visibleAlerts.length} alerts
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
