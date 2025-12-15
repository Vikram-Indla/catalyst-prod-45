/**
 * CIOPanel - Right sidebar panel for Business Request drawer
 * Shows key executive information: Owner, Department, Reporter, Assignee, Key dates, Score, Budget summary
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { 
  ChevronRight, 
  ChevronLeft, 
  User, 
  Building2, 
  Calendar, 
  TrendingUp, 
  Wallet,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getTierDisplayInfo, PriorityTier } from '@/hooks/usePrioritizationConfig';

interface CIOPanelProps {
  data: {
    business_owner?: string | null;
    department?: string | null;
    requestor?: string | null;
    assignee?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    impl_start_date?: string | null;
    business_score?: number | null;
    priority_tier?: string | null;
    rank?: number | null;
    approved_budget_sar?: number | null;
    funding_status?: string | null;
  };
  isCollapsed?: boolean;
  onToggle?: () => void;
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  try {
    return format(new Date(date), 'MMM d, yyyy');
  } catch {
    return '—';
  }
}

function formatCurrency(value: number | null | undefined): string {
  if (!value) return 'SAR 0';
  return `SAR ${value.toLocaleString()}`;
}

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value: string | React.ReactNode;
  valueClassName?: string;
}

function InfoRow({ icon: Icon, label, value, valueClassName }: InfoRowProps) {
  return (
    <div className="flex items-start gap-2 py-2">
      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: 'var(--text-3)' }} />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-3)' }}>
          {label}
        </div>
        <div className={cn("text-xs font-medium mt-0.5 truncate", valueClassName)} style={{ color: 'var(--text-1)' }}>
          {value || '—'}
        </div>
      </div>
    </div>
  );
}

export function CIOPanel({ data, isCollapsed = false, onToggle }: CIOPanelProps) {
  const tier = (data.priority_tier as PriorityTier) || 'unscored';
  const tierInfo = getTierDisplayInfo(tier);
  
  const priorityScore = data.business_score 
    ? (data.business_score / 100).toFixed(2) 
    : null;

  if (isCollapsed) {
    return (
      <div 
        className="w-8 shrink-0 flex flex-col items-center py-4 cursor-pointer transition-colors"
        style={{ 
          background: 'var(--surface-2)', 
          borderLeft: '1px solid var(--border-color)' 
        }}
        onClick={onToggle}
      >
        <ChevronLeft className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
        <div 
          className="mt-4 writing-mode-vertical text-[10px] uppercase tracking-wider font-medium"
          style={{ color: 'var(--text-3)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          CIO Panel
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-[220px] shrink-0 flex flex-col overflow-hidden"
      style={{ 
        background: 'var(--surface-2)', 
        borderLeft: '1px solid var(--border-color)' 
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <span 
          className="text-[10px] uppercase tracking-wider font-semibold"
          style={{ color: 'var(--accent-color)' }}
        >
          CIO Panel
        </span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6" 
          onClick={onToggle}
        >
          <ChevronRight className="h-3.5 w-3.5" style={{ color: 'var(--text-3)' }} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {/* People Section */}
        <div className="pb-2" style={{ borderBottom: '1px solid var(--divider)' }}>
          <InfoRow icon={User} label="Business Owner" value={data.business_owner} />
          <InfoRow icon={Building2} label="Department" value={data.department} />
          <InfoRow icon={Users} label="Reporter" value={data.requestor} />
          <InfoRow icon={User} label="Assignee" value={data.assignee} />
        </div>

        {/* Dates Section */}
        <div className="py-2" style={{ borderBottom: '1px solid var(--divider)' }}>
          <InfoRow icon={Calendar} label="Business Ask" value={formatDate(data.start_date)} />
          <InfoRow icon={Calendar} label="Kickoff" value={formatDate(data.impl_start_date)} />
          <InfoRow 
            icon={Calendar} 
            label="Target Complete" 
            value={formatDate(data.end_date)}
            valueClassName={data.end_date ? 'text-brand-gold font-semibold' : undefined}
          />
        </div>

        {/* Score Section */}
        <div className="py-2" style={{ borderBottom: '1px solid var(--divider)' }}>
          <InfoRow 
            icon={TrendingUp} 
            label="Priority Score" 
            value={
              <span className="flex items-center gap-1.5">
                <span>{priorityScore || '—'}</span>
                {tier !== 'unscored' && (
                  <span 
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{ 
                      background: `${tierInfo.color}20`,
                      color: tierInfo.color
                    }}
                  >
                    {tierInfo.label}
                  </span>
                )}
              </span>
            }
          />
          <InfoRow 
            icon={TrendingUp} 
            label="Rank" 
            value={data.rank ? `#${data.rank}` : '—'}
            valueClassName="text-brand-gold font-semibold"
          />
        </div>

        {/* Budget Section */}
        <div className="py-2">
          <InfoRow 
            icon={Wallet} 
            label="Approved Budget" 
            value={formatCurrency(data.approved_budget_sar)}
          />
          <InfoRow 
            icon={Wallet} 
            label="Funding Status" 
            value={data.funding_status || '—'}
          />
        </div>
      </div>
    </div>
  );
}
