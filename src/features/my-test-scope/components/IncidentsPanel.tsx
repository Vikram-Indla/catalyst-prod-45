/**
 * Incidents Panel
 * Shows production incidents affecting user's test scope
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Zap, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react';
import type { RelatedIncident } from '../types';

interface IncidentsPanelProps {
  incidents: RelatedIncident[];
}

const SEVERITY_CONFIG = {
  P1: { label: 'P1 - Critical', className: 'bg-danger/20 text-danger-foreground', icon: AlertTriangle },
  P2: { label: 'P2 - High', className: 'bg-warning/20 text-warning-foreground', icon: AlertTriangle },
  P3: { label: 'P3 - Medium', className: 'bg-muted text-muted-foreground', icon: AlertTriangle },
  P4: { label: 'P4 - Low', className: 'bg-muted text-muted-foreground', icon: AlertTriangle },
};

const STATUS_ICONS = {
  Investigating: AlertTriangle,
  Mitigated: CheckCircle,
  Resolved: CheckCircle,
};

export function IncidentsPanel({ incidents }: IncidentsPanelProps) {
  if (incidents.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <p className="text-lg font-medium text-foreground mb-1">No Active Incidents</p>
        <p className="text-sm text-muted-foreground">
          There are no production incidents affecting your test scope
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Incidents Summary */}
      <div className="flex items-center gap-4 p-4 bg-danger/5 rounded-lg border border-danger/20">
        <Zap className="h-6 w-6 text-danger" />
        <div>
          <p className="font-medium text-foreground">
            {incidents.length} Active Incident{incidents.length !== 1 ? 's' : ''} in Your Scope
          </p>
          <p className="text-sm text-muted-foreground">
            These production issues may require test re-execution after resolution
          </p>
        </div>
      </div>

      {/* Incident Cards */}
      <div className="space-y-3">
        {incidents.map((incident) => {
          const severityConfig = SEVERITY_CONFIG[incident.severity];
          const StatusIcon = STATUS_ICONS[incident.status as keyof typeof STATUS_ICONS] || AlertTriangle;
          
          return (
            <div
              key={incident.id}
              className="p-4 bg-muted/30 rounded-lg border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    incident.severity === 'P1' ? 'bg-danger/10' : 'bg-warning/10'
                  )}>
                    <Zap className={cn(
                      'h-5 w-5',
                      incident.severity === 'P1' ? 'text-danger' : 'text-warning'
                    )} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">{incident.key}</span>
                      <Badge variant="secondary" className={cn('text-xs', severityConfig.className)}>
                        {severityConfig.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground font-medium">{incident.title}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <StatusIcon className={cn(
                      'h-4 w-4',
                      incident.status === 'Resolved' || incident.status === 'Mitigated' 
                        ? 'text-success' 
                        : 'text-warning'
                    )} />
                    <span className="text-sm text-muted-foreground">{incident.status}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Module: <span className="text-foreground">{incident.module}</span>
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {incident.affectedTestCount} affected test{incident.affectedTestCount !== 1 ? 's' : ''}
                </span>
              </div>

              {incident.status === 'Investigating' && (
                <div className="mt-3 p-2 bg-warning/10 rounded border border-warning/20">
                  <p className="text-xs text-warning-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Active investigation — re-run affected tests after resolution
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
