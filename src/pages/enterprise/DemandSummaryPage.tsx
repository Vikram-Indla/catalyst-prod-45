import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, AlertTriangle, Target, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

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

function PerformancePulse() {
  const total = weeklyData.length;
  const best = weeklyData.reduce((a, b) => a.score > b.score ? a : b);
  const lowest = weeklyData.reduce((a, b) => a.score < b.score ? a : b);
  const trend = weeklyData[total - 1].score - weeklyData[total - 2].score;

  return (
    <Card className="p-6 mb-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="text-brand-gold text-2xl">⚡</span>
          <h2 className="text-xl font-semibold text-foreground">Performance Pulse</h2>
          <span className="text-muted-foreground text-sm">8-Week Trend</span>
        </div>
        <div className="flex gap-8 text-sm">
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
    </Card>
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

        {/* Always Visible Sections */}
        <PerformancePulse />
        <BusinessDemandSummary />

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
          title="Backlog Trend" 
          subtitle="8-Week Growth"
          icon={<AlertTriangle className="w-6 h-6" />}
        >
          <BacklogTrend />
        </CollapsibleSection>

        <CollapsibleSection 
          title="Good News" 
          subtitle="Recent Wins"
          icon="🎉"
        >
          <GoodNews />
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
