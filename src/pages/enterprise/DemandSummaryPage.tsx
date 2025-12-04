import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, AlertTriangle, Target, Sparkles, Lightbulb, Flame, Trophy, Wrench, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Sample data
const weeklyData = [
  { date: '13-OCT', score: 71 },
  { date: '20-OCT', score: 82 },
  { date: '27-OCT', score: 80 },
  { date: '03-NOV', score: 74 },
  { date: '10-NOV', score: 72 },
  { date: '17-NOV', score: 68 },
  { date: '24-NOV', score: 70 },
  { date: '01-DEC', score: 72 },
];

const cpiDimensions = [
  { name: 'Rank Execution', score: 78 },
  { name: 'Value Realization', score: 62 },
  { name: 'Ageing Health', score: 58 },
  { name: 'On Hold Control', score: 72 },
  { name: 'Approval Efficiency', score: 85 },
  { name: 'Pipeline Balance', score: 76 },
  { name: 'Conversion Rate', score: 68 },
];

const demandCards = [
  { label: 'DEMAND VOLUME', headline: '↑ 12% volume growth', detail: '47 new requests. 18-day avg cycle.' },
  { label: 'BLOCKED ITEMS', headline: '17 tickets need action', detail: '10 awaiting response. 7 on hold.' },
  { label: 'ON-HOLD RISK', headline: '8.9% on-hold rate', detail: 'Above 5% target. Save ~5 days/ticket.' },
  { label: 'MONTH-END TARGETS', headline: '5 due this month', detail: '3 on track. 2 need acceleration.' },
];

const insightPills = [
  { label: 'Avg Cycle Time', value: '18 days', trend: 'down' },
  { label: 'Approval Rate', value: '87%', trend: 'up' },
  { label: 'On-Hold Rate', value: '8.9%', trend: 'up' },
  { label: 'Blocked Items', value: '17', trend: 'down' },
  { label: 'New This Week', value: '12', trend: 'up' },
  { label: 'Closed This Week', value: '8', trend: 'up' },
];

const trendingTickets = [
  { id: 'MIM-042', title: 'Platform Integration Request', priority: 'critical', trend: '+3 days' },
  { id: 'MIM-038', title: 'API Gateway Enhancement', priority: 'high', trend: '+2 days' },
  { id: 'MIM-051', title: 'Dashboard Analytics', priority: 'medium', trend: '+1 day' },
  { id: 'MIM-047', title: 'Security Audit Response', priority: 'critical', trend: '+5 days' },
];

const attentionItems = [
  { id: 'MIM-033', reason: 'Awaiting business response > 7 days', action: 'Follow Up' },
  { id: 'MIM-029', reason: 'On hold without expected resume date', action: 'Update' },
  { id: 'MIM-045', reason: 'Critical priority stalled', action: 'Escalate' },
];

const milestones = {
  approved: [
    { name: 'Q4 Release Package', value: 'Dec 15' },
    { name: 'Security Compliance', value: 'Dec 10' },
    { name: 'Platform Migration', value: 'Dec 20' },
    { name: 'API v2 Launch', value: 'Dec 8' },
    { name: 'Mobile App Update', value: 'Dec 12' },
  ],
  implemented: [
    { name: 'SSO Integration', value: 'Nov 28' },
    { name: 'Dashboard Redesign', value: 'Nov 25' },
    { name: 'Performance Optimization', value: 'Nov 30' },
  ],
};

const rejectedTickets = [
  { id: 'MIM-018', title: 'Legacy System Enhancement', reason: 'Out of scope' },
  { id: 'MIM-022', title: 'Custom Report Builder', reason: 'Duplicate request' },
  { id: 'MIM-025', title: 'Third-party Integration', reason: 'Budget constraints' },
  { id: 'MIM-031', title: 'Manual Process Automation', reason: 'Low priority' },
  { id: 'MIM-035', title: 'Data Export Feature', reason: 'Already exists' },
];

const recoveryItems = [
  { 
    title: 'Platform Integration Delay', 
    severity: 'high',
    actions: ['Assign additional resources', 'Daily sync with vendor', 'Escalate blockers immediately']
  },
  { 
    title: 'Security Audit Backlog', 
    severity: 'medium',
    actions: ['Prioritize critical findings', 'Schedule remediation sessions', 'Update stakeholders weekly']
  },
];

const getSentiment = (score: number) => {
  if (score >= 80) return { label: 'ON TRACK', color: 'bg-emerald-500' };
  if (score >= 60) return { label: 'MONITOR', color: 'bg-brand-gold' };
  return { label: 'ACTION', color: 'bg-red-500' };
};

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, subtitle, icon, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="p-6 mb-4">
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <span className="text-brand-gold text-2xl">{icon}</span>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          {subtitle && <span className="text-muted-foreground text-sm">{subtitle}</span>}
        </div>
        <div className="flex items-center gap-4">
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>
      {isOpen && <div className="mt-5">{children}</div>}
    </Card>
  );
}

function PerformancePulseContent() {
  const total = weeklyData.length;
  const best = weeklyData.reduce((a, b) => a.score > b.score ? a : b);
  const lowest = weeklyData.reduce((a, b) => a.score < b.score ? a : b);
  const trend = weeklyData[total - 1].score - weeklyData[total - 2].score;

  return (
    <>
      <div className="flex justify-end gap-8 text-sm mb-4">
        <div className="text-center">
          <span className="text-muted-foreground block text-xs">Trending:</span>
          <span className={cn("font-semibold", trend >= 0 ? "text-emerald-600" : "text-red-600")}>
            {trend >= 0 ? '+' : ''}{trend} pts
          </span>
        </div>
        <div className="text-center">
          <span className="text-muted-foreground block text-xs">Best:</span>
          <span className="font-semibold text-foreground">{best.date} ({best.score})</span>
        </div>
        <div className="text-center">
          <span className="text-muted-foreground block text-xs">Lowest:</span>
          <span className="font-semibold text-foreground">{lowest.date} ({lowest.score})</span>
        </div>
      </div>

      {/* Squares Row */}
      <div className="flex items-end justify-center gap-1 my-6">
        {weeklyData.map((week, index) => {
          const size = 60 + ((95 - 60) / (total - 1)) * index;
          const opacity = index === total - 1 ? 1 : 0.5 + (0.5 * (index / (total - 1)));
          const sentiment = getSentiment(week.score);
          const isLast = index === total - 1;

          return (
            <div key={week.date} className="flex flex-col items-center group relative">
              <div
                className={cn(
                  "rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200",
                  sentiment.color,
                  isLast && "ring-[3px] ring-brand-dark shadow-lg",
                  "hover:scale-[1.08] hover:ring-2 hover:ring-brand-dark hover:z-10"
                )}
                style={{ 
                  width: `${size}px`, 
                  height: `${size}px`,
                  opacity: opacity
                }}
              >
                <span className="text-[9px] text-white/90 uppercase font-medium">{week.date}</span>
                <span className="text-[10px] font-bold text-white uppercase">{sentiment.label}</span>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-card border border-border rounded-lg px-4 py-3 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">CPI Score</div>
                  <div className="text-3xl font-bold text-foreground">{week.score}</div>
                  <div className="text-xs text-muted-foreground mt-1">{week.date}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-muted-foreground text-sm italic">
        Click any week to drill into detailed metrics
      </p>
    </>
  );
}

function BusinessDemandSummary() {
  return (
    <Card className="p-6 mb-4">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-brand-gold text-2xl">📊</span>
        <h2 className="text-xl font-semibold text-foreground">Business Demand Summary</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {demandCards.map((card, index) => (
          <div key={index} className="bg-muted/30 border border-border rounded-lg p-5">
            <div className="text-brand-gold text-xs font-semibold uppercase tracking-wider mb-2">
              {card.label}
            </div>
            <div className="text-lg font-bold text-foreground mb-2">{card.headline}</div>
            <div className="text-muted-foreground text-sm">{card.detail}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CPIBreakdown() {
  return (
    <div>
      {cpiDimensions.map((dim, index) => {
        const sentiment = getSentiment(dim.score);
        return (
          <div key={index} className="mb-3">
            <div className="flex justify-between mb-1 text-sm">
              <span className="text-foreground">{dim.name}</span>
              <span className="font-semibold text-foreground">{dim.score}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all", sentiment.color)}
                style={{ width: `${dim.score}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InsightPills() {
  return (
    <div className="flex flex-wrap gap-3">
      {insightPills.map((pill, index) => (
        <div key={index} className="bg-muted/30 border border-border rounded-full px-4 py-2 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{pill.label}:</span>
          <span className="font-semibold text-foreground">{pill.value}</span>
          <span className={cn("text-sm", pill.trend === 'up' ? 'text-emerald-600' : 'text-red-600')}>
            {pill.trend === 'up' ? '↑' : '↓'}
          </span>
        </div>
      ))}
    </div>
  );
}

function TrendingTickets() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {trendingTickets.map((ticket, index) => (
        <div key={index} className="bg-muted/30 border border-border rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-brand-gold text-xs font-semibold">{ticket.id}</span>
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded",
              ticket.priority === 'critical' && 'bg-red-500 text-white',
              ticket.priority === 'high' && 'bg-amber-500 text-white',
              ticket.priority === 'medium' && 'bg-blue-500 text-white'
            )}>{ticket.priority.toUpperCase()}</span>
          </div>
          <div className="text-sm font-medium text-foreground mb-1">{ticket.title}</div>
          <div className="text-xs text-red-600">{ticket.trend} overdue</div>
        </div>
      ))}
    </div>
  );
}

function RequiresAttention() {
  return (
    <div className="space-y-3">
      {attentionItems.map((item, index) => (
        <div key={index} className="flex justify-between items-center p-4 bg-muted/30 border border-border rounded-lg">
          <div>
            <span className="text-brand-gold text-xs font-semibold">{item.id}</span>
            <div className="text-sm text-foreground mt-1">{item.reason}</div>
          </div>
          <Button size="sm" className="bg-brand-gold text-brand-dark hover:bg-brand-gold-hover">
            {item.action}
          </Button>
        </div>
      ))}
    </div>
  );
}

function QuarterDelivery() {
  const quarters = [
    { name: 'Q4 2024', total: 28, onTrack: 18, atRisk: 6, delayed: 4 },
    { name: 'Q1 2025', total: 35, onTrack: 22, atRisk: 8, delayed: 5 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {quarters.map((q, index) => (
        <div key={index} className="bg-muted/30 border border-border rounded-lg p-5">
          <h3 className="text-base font-semibold text-foreground mb-2">{q.name}</h3>
          <div className="text-muted-foreground text-sm mb-3">{q.total} items total</div>
          <div className="h-2 rounded-full flex overflow-hidden mb-2">
            <div className="bg-emerald-500" style={{ width: `${(q.onTrack / q.total) * 100}%` }} />
            <div className="bg-amber-500" style={{ width: `${(q.atRisk / q.total) * 100}%` }} />
            <div className="bg-red-500" style={{ width: `${(q.delayed / q.total) * 100}%` }} />
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> On Track ({q.onTrack})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> At Risk ({q.atRisk})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Delayed ({q.delayed})
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function BacklogTrend() {
  const bars = [89, 95, 102, 110, 118, 125, 132, 139];
  const maxBar = Math.max(...bars);

  return (
    <div className="flex items-center gap-6">
      <div>
        <div className="text-5xl font-bold text-foreground">139</div>
        <div className="text-red-600 text-lg font-semibold">+56% from 89</div>
      </div>
      <div className="flex-1 h-16 flex items-end gap-2">
        {bars.map((value, index) => (
          <div
            key={index}
            className="flex-1 bg-brand-gold rounded-t"
            style={{ height: `${(value / maxBar) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function DeliveryMilestones() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Approved ({milestones.approved.length})</h4>
        <div className="space-y-2">
          {milestones.approved.map((item, index) => (
            <div key={index} className="bg-muted/30 border border-border rounded-lg p-3 flex justify-between">
              <span className="text-sm text-foreground">{item.name}</span>
              <span className="text-sm font-semibold text-emerald-600">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Implemented ({milestones.implemented.length})</h4>
        <div className="space-y-2">
          {milestones.implemented.map((item, index) => (
            <div key={index} className="bg-muted/30 border border-border rounded-lg p-3 flex justify-between">
              <span className="text-sm text-foreground">{item.name}</span>
              <span className="text-sm font-semibold text-emerald-600">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GoodNews() {
  const items = [
    { icon: '🎉', headline: '3 epics delivered', desc: 'Ahead of schedule' },
    { icon: '⚡', headline: 'Cycle time -2 days', desc: 'Best in 3 months' },
    { icon: '✅', headline: '12 approvals cleared', desc: 'Zero pending > 5 days' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {items.map((item, index) => (
        <div 
          key={index} 
          className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4"
        >
          <div className="text-2xl mb-2">{item.icon}</div>
          <div className="text-sm font-semibold text-foreground mb-1">{item.headline}</div>
          <div className="text-xs text-muted-foreground">{item.desc}</div>
        </div>
      ))}
    </div>
  );
}

function RejectionInsights() {
  return (
    <div className="space-y-3">
      {rejectedTickets.map((ticket, index) => (
        <div key={index} className="flex justify-between items-center p-3 border-b border-border last:border-0">
          <div>
            <span className="text-brand-gold text-xs font-semibold">{ticket.id}</span>
            <div className="text-sm text-foreground">{ticket.title}</div>
          </div>
          <span className="text-xs text-muted-foreground">{ticket.reason}</span>
        </div>
      ))}
    </div>
  );
}

function RecoveryPlan() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="space-y-3">
      {recoveryItems.map((item, index) => (
        <div key={index} className="bg-muted/30 border border-border rounded-lg overflow-hidden">
          <div 
            className="flex justify-between items-center p-4 cursor-pointer hover:bg-muted/50"
            onClick={() => toggleItem(index)}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">{item.title}</span>
              <span className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded",
                item.severity === 'high' && 'bg-red-500 text-white',
                item.severity === 'medium' && 'bg-amber-500 text-white'
              )}>{item.severity.toUpperCase()}</span>
            </div>
            {openItems.includes(index) ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          {openItems.includes(index) && (
            <div className="px-4 pb-4 space-y-2">
              {item.actions.map((action, actionIndex) => (
                <div key={actionIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-brand-gold">→</span>
                  {action}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function DemandSummaryPage() {
  return (
    <div className="min-h-full bg-background">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <header className="flex justify-between items-center py-5 border-b border-border mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-wider text-foreground">
              <span className="text-brand-gold">C</span>ATALYST
            </h1>
            <p className="text-muted-foreground text-xs tracking-widest uppercase">Analytics Dashboard</p>
          </div>
          <div className="flex items-center gap-5">
            <button className="bg-muted text-foreground px-4 py-2 rounded-md text-sm border border-border hover:bg-muted/80 transition-colors">
              EN | عربي
            </button>
            <span className="text-brand-gold text-sm font-medium">Updated: Just now</span>
          </div>
        </header>

        {/* Always Visible: Business Demand Summary */}
        <BusinessDemandSummary />

        {/* Collapsible: Performance Pulse */}
        <CollapsibleSection 
          title="Performance Pulse" 
          subtitle="8-Week Trend"
          icon="⚡"
        >
          <PerformancePulseContent />
        </CollapsibleSection>

        {/* Collapsible Sections */}
        <CollapsibleSection 
          title="Quarter Delivery" 
          subtitle="Q4 2024 & Q1 2025"
          icon={<Target className="w-6 h-6" />}
        >
          <QuarterDelivery />
        </CollapsibleSection>

        <CollapsibleSection 
          title="CPI Breakdown" 
          subtitle="7 Dimensions"
          icon={<TrendingUp className="w-6 h-6" />}
        >
          <CPIBreakdown />
        </CollapsibleSection>

        <CollapsibleSection 
          title="Insight Pills" 
          icon={<Lightbulb className="w-6 h-6" />}
        >
          <InsightPills />
        </CollapsibleSection>

        <CollapsibleSection 
          title="Trending Tickets" 
          icon={<Flame className="w-6 h-6" />}
        >
          <TrendingTickets />
        </CollapsibleSection>

        <CollapsibleSection 
          title="Requires Attention" 
          icon={<AlertTriangle className="w-6 h-6" />}
        >
          <RequiresAttention />
        </CollapsibleSection>

        <CollapsibleSection 
          title="Backlog Trend" 
          subtitle="8-Week Growth"
          icon="📈"
        >
          <BacklogTrend />
        </CollapsibleSection>

        <CollapsibleSection 
          title="Delivery Milestones" 
          icon={<Trophy className="w-6 h-6" />}
        >
          <DeliveryMilestones />
        </CollapsibleSection>

        <CollapsibleSection 
          title="Good News" 
          subtitle="Recent Wins"
          icon="🎉"
        >
          <GoodNews />
        </CollapsibleSection>

        <CollapsibleSection 
          title="Rejection Insights" 
          icon={<X className="w-6 h-6" />}
        >
          <RejectionInsights />
        </CollapsibleSection>

        <CollapsibleSection 
          title="Recovery Plan" 
          icon={<Wrench className="w-6 h-6" />}
        >
          <RecoveryPlan />
        </CollapsibleSection>

        {/* AI Chat Button */}
        <button className="fixed bottom-6 right-6 bg-brand-gold text-brand-dark px-6 py-3 rounded-full font-semibold flex items-center gap-2 shadow-lg hover:bg-brand-gold-hover transition-all hover:scale-105">
          <Sparkles className="w-5 h-5" />
          Ask AI
        </button>
      </div>
    </div>
  );
}
