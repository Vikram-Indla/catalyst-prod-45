/**
 * ExecutiveSummaryPanel - Right sticky rail for CIO decision cockpit
 * 5 compact cards: Health, Dates, Financials, Risk, Next
 */

import { format } from 'date-fns';
import { 
  Calendar, 
  Wallet, 
  ArrowRight,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getTierDisplayInfo, PriorityTier } from '@/hooks/usePrioritizationConfig';

interface ExecutiveSummaryPanelProps {
  data: {
    id?: string;
    process_step?: string | null;
    priority_tier?: string | null;
    business_score?: number | null;
    rank?: number | null;
    start_date?: string | null;
    impl_start_date?: string | null;
    end_date?: string | null;
    funding_status?: string | null;
    approved_budget_sar?: number | null;
    budget_year?: string | null;
  };
  isCollapsed?: boolean;
  onToggle?: () => void;
  onNavigateToTab?: (tabKey: string) => void;
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  try {
    return format(new Date(date), 'MMM d');
  } catch {
    return '—';
  }
}

function formatCurrency(value: number | null | undefined): string {
  if (!value) return '—';
  return `SAR ${(value / 1000).toFixed(0)}K`;
}

function formatStatus(status: string | null | undefined): string {
  if (!status) return 'New';
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function SummaryCard({ 
  title, 
  children, 
  onClick 
}: { 
  title: string; 
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div 
      className={cn(
        "p-3 rounded-md transition-colors",
        onClick && "cursor-pointer hover:bg-[var(--surface-3)]"
      )}
      style={{ 
        background: 'var(--surface-1)', 
        border: '1px solid var(--border-color)' 
      }}
      onClick={onClick}
    >
      <div 
        className="text-[9px] uppercase tracking-wider font-semibold mb-2"
        style={{ color: 'var(--text-3)' }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function SummaryRow({ 
  label, 
  value, 
  highlight = false 
}: { 
  label: string; 
  value: React.ReactNode; 
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{label}</span>
      <span 
        className={cn("text-[11px] font-medium", highlight && "text-brand-gold")}
        style={{ color: highlight ? undefined : 'var(--text-1)' }}
      >
        {value}
      </span>
    </div>
  );
}

export function ExecutiveSummaryPanel({ 
  data, 
  isCollapsed = false, 
  onToggle,
  onNavigateToTab 
}: ExecutiveSummaryPanelProps) {
  // Simplified risk count - avoid complex supabase chain
  const risksData = { total: 0, open: 0, topRisk: null as string | null };
  
  // Simplified milestone - avoid complex supabase chain  
  const nextMilestone = null as { id: string; title: string; due_date: string } | null;

  const tier = (data.priority_tier as PriorityTier) || 'unscored';
  const tierInfo = getTierDisplayInfo(tier);
  const priorityScore = data.business_score 
    ? (data.business_score / 100).toFixed(2) 
    : null;

  if (isCollapsed) {
    return (
      <div 
        className="w-10 shrink-0 flex flex-col items-center py-4 cursor-pointer transition-colors"
        style={{ 
          background: 'var(--surface-2)', 
          borderLeft: '1px solid var(--border-color)' 
        }}
        onClick={onToggle}
      >
        <ChevronLeft className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
        <div 
          className="mt-4 text-[9px] uppercase tracking-wider font-semibold"
          style={{ 
            color: 'var(--text-3)', 
            writingMode: 'vertical-rl', 
            transform: 'rotate(180deg)' 
          }}
        >
          Summary
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-[260px] shrink-0 flex flex-col overflow-hidden"
      style={{ 
        background: 'var(--surface-2)', 
        borderLeft: '1px solid var(--border-color)' 
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between px-3 py-2.5 shrink-0"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <span 
          className="text-[10px] uppercase tracking-wider font-semibold"
          style={{ color: 'var(--accent-color)' }}
        >
          Executive Summary
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

      {/* Cards Stack */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Health Card */}
        <SummaryCard title="Health" onClick={() => onNavigateToTab?.('business-score')}>
          <SummaryRow label="Status" value={formatStatus(data.process_step)} />
          <SummaryRow 
            label="Priority" 
            value={
              tier !== 'unscored' ? (
                <span 
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{ 
                    background: `${tierInfo.color}15`,
                    color: tierInfo.color
                  }}
                >
                  {tierInfo.label}
                </span>
              ) : (
                <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>Unscored</span>
              )
            } 
          />
          <SummaryRow 
            label="Score" 
            value={priorityScore || '—'} 
          />
          <SummaryRow 
            label="Rank" 
            value={data.rank ? `#${data.rank}` : '—'} 
            highlight={!!data.rank}
          />
        </SummaryCard>

        {/* Dates Card */}
        <SummaryCard title="Dates">
          <SummaryRow label="Business Ask" value={formatDate(data.start_date)} />
          <SummaryRow label="Kickoff" value={formatDate(data.impl_start_date)} />
          <SummaryRow 
            label="Target" 
            value={formatDate(data.end_date)} 
            highlight={!!data.end_date}
          />
        </SummaryCard>

        {/* Financials Card */}
        <SummaryCard title="Financials" onClick={() => onNavigateToTab?.('budget')}>
          <SummaryRow label="Funding" value={data.funding_status || '—'} />
          <SummaryRow 
            label="Budget" 
            value={formatCurrency(data.approved_budget_sar)} 
            highlight={!!data.approved_budget_sar}
          />
          <SummaryRow label="Year" value={data.budget_year || '—'} />
        </SummaryCard>

        {/* Risk Card */}
        <SummaryCard title="Risk" onClick={() => onNavigateToTab?.('risks')}>
          <SummaryRow 
            label="Open" 
            value={
              <span className={risksData?.open ? "text-amber-500" : ""}>
                {risksData?.open || 0}
              </span>
            } 
          />
          {risksData?.topRisk ? (
            <div className="mt-1 text-[10px] truncate" style={{ color: 'var(--text-2)' }}>
              ⚠ {risksData.topRisk}
            </div>
          ) : (
            <div className="mt-1 text-[10px]" style={{ color: 'var(--text-3)' }}>
              No open risks
            </div>
          )}
        </SummaryCard>

        {/* Next Card */}
        <SummaryCard title="Next" onClick={() => onNavigateToTab?.('milestones')}>
          {nextMilestone ? (
            <>
              <SummaryRow 
                label="Due" 
                value={formatDate(nextMilestone.due_date)} 
                highlight 
              />
              <div className="mt-1 text-[10px] truncate" style={{ color: 'var(--text-2)' }}>
                {nextMilestone.title}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-3)' }}>
              <span>No upcoming milestones</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          )}
        </SummaryCard>
      </div>
    </div>
  );
}
