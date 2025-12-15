/**
 * SummaryStrip - Compact KPI cards strip for drawer tab headers
 * Shows relevant metrics for the current tab context
 */

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface SummaryMetric {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  highlight?: boolean;
}

interface SummaryStripProps {
  metrics: SummaryMetric[];
  className?: string;
}

export function SummaryStrip({ metrics, className }: SummaryStripProps) {
  if (metrics.length === 0) return null;

  return (
    <div 
      className={cn(
        "grid gap-3 mb-4",
        metrics.length === 2 && "grid-cols-2",
        metrics.length === 3 && "grid-cols-3",
        metrics.length >= 4 && "grid-cols-2 md:grid-cols-4",
        className
      )}
    >
      {metrics.map((metric, index) => (
        <div
          key={index}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
            metric.highlight && "ring-1 ring-brand-gold/30"
          )}
          style={{ 
            background: 'var(--surface-2)', 
            border: '1px solid var(--border-color)' 
          }}
        >
          <div 
            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
            style={{ background: 'var(--surface-3)' }}
          >
            <metric.icon 
              className="h-4 w-4" 
              style={{ color: metric.highlight ? 'var(--accent-color)' : 'var(--text-3)' }} 
            />
          </div>
          <div className="flex-1 min-w-0">
            <div 
              className="text-[10px] uppercase tracking-wider font-medium truncate"
              style={{ color: 'var(--text-3)' }}
            >
              {metric.label}
            </div>
            <div className="flex items-baseline gap-1">
              <span 
                className={cn(
                  "text-sm font-semibold",
                  metric.highlight && "text-brand-gold"
                )}
                style={{ color: metric.highlight ? undefined : 'var(--text-1)' }}
              >
                {metric.value}
              </span>
              {metric.subValue && (
                <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                  {metric.subValue}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Pre-built summary strips for each tab type
export function DemandSummaryStrip({ 
  processStep, 
  daysOpen, 
  daysToTarget 
}: { 
  processStep?: string | null;
  daysOpen?: number;
  daysToTarget?: number | null;
}) {
  const { FileText, Clock, Calendar } = require('lucide-react');
  
  const metrics: SummaryMetric[] = [
    {
      icon: FileText,
      label: 'Status',
      value: processStep?.replace(/_/g, ' ') || 'New',
    },
    {
      icon: Clock,
      label: 'Days Open',
      value: daysOpen ?? 0,
    },
  ];

  if (daysToTarget !== null && daysToTarget !== undefined) {
    metrics.push({
      icon: Calendar,
      label: daysToTarget >= 0 ? 'Days to Target' : 'Days Overdue',
      value: Math.abs(daysToTarget),
      highlight: daysToTarget < 0,
    });
  }

  return <SummaryStrip metrics={metrics} />;
}

export function RisksSummaryStrip({ 
  totalRisks, 
  openRisks, 
  criticalRisks 
}: { 
  totalRisks: number;
  openRisks: number;
  criticalRisks: number;
}) {
  const { AlertTriangle, AlertCircle, Shield } = require('lucide-react');

  const metrics: SummaryMetric[] = [
    {
      icon: Shield,
      label: 'Total Risks',
      value: totalRisks,
    },
    {
      icon: AlertTriangle,
      label: 'Open',
      value: openRisks,
      highlight: openRisks > 0,
    },
    {
      icon: AlertCircle,
      label: 'Critical',
      value: criticalRisks,
      highlight: criticalRisks > 0,
    },
  ];

  return <SummaryStrip metrics={metrics} />;
}

export function MilestonesSummaryStrip({ 
  total, 
  completed, 
  atRisk 
}: { 
  total: number;
  completed: number;
  atRisk: number;
}) {
  const { Flag, CheckCircle, AlertTriangle } = require('lucide-react');

  const metrics: SummaryMetric[] = [
    {
      icon: Flag,
      label: 'Total',
      value: total,
    },
    {
      icon: CheckCircle,
      label: 'Completed',
      value: completed,
    },
    {
      icon: AlertTriangle,
      label: 'At Risk',
      value: atRisk,
      highlight: atRisk > 0,
    },
  ];

  return <SummaryStrip metrics={metrics} />;
}

export function LinksSummaryStrip({ 
  total, 
  documents, 
  implementations 
}: { 
  total: number;
  documents: number;
  implementations: number;
}) {
  const { Link, FileText, Layers } = require('lucide-react');

  const metrics: SummaryMetric[] = [
    {
      icon: Link,
      label: 'Total Links',
      value: total,
    },
    {
      icon: FileText,
      label: 'Documents',
      value: documents,
    },
    {
      icon: Layers,
      label: 'Work Items',
      value: implementations,
    },
  ];

  return <SummaryStrip metrics={metrics} />;
}

export function BudgetSummaryStrip({ 
  approvedBudget, 
  fundingStatus, 
  capacityStatus 
}: { 
  approvedBudget: number;
  fundingStatus?: string | null;
  capacityStatus?: string | null;
}) {
  const { Wallet, TrendingUp, Users } = require('lucide-react');

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const metrics: SummaryMetric[] = [
    {
      icon: Wallet,
      label: 'Approved Budget',
      value: `SAR ${formatCurrency(approvedBudget)}`,
    },
    {
      icon: TrendingUp,
      label: 'Funding',
      value: fundingStatus || 'Not Set',
      highlight: fundingStatus === 'Budget Approved',
    },
    {
      icon: Users,
      label: 'Capacity',
      value: capacityStatus || 'Not Assessed',
    },
  ];

  return <SummaryStrip metrics={metrics} />;
}
