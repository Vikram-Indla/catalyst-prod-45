import { useState, ReactNode } from 'react';
import { ChevronDown, Zap, Calendar, BarChart3, Tag, Trophy, XCircle, Wrench, Flame, AlertTriangle, CheckCircle, TrendingUp, Sparkles, Globe, Send, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ===== SEEDED DATA (from specification) =====
const weeklyScores = [58, 61, 64, 67, 69, 82, 80, 74, 70, 68, 71, 72];
const weekDates = ['07-SEP', '14-SEP', '21-SEP', '28-SEP', '05-OCT', '12-OCT', '19-OCT', '26-OCT', '02-NOV', '09-NOV', '16-NOV', '23-NOV'];

const demandCards = [
  { label: 'Demand Volume', metric: '47', metricStyle: 'up', headline: 'new requests this month', detail: 'Throughput healthy at 18-day average cycle. Volume up 12% from last month.' },
  { label: 'Blocked Items', metric: '17', metricStyle: 'neutral', headline: 'tickets need action', detail: '10 awaiting business response. 7 on hold with blockers.' },
  { label: 'On-Hold Risk', metric: '8.9%', metricStyle: 'down', headline: 'on-hold rate', detail: 'Above 5% target. Clearing blockers could save ~5 days per ticket.' },
  { label: 'Month-End Targets', metric: '5', metricStyle: 'neutral', headline: 'due this month', detail: '3 on track. 2 need acceleration to meet committed dates.' }
];

const quarterData = [
  { quarter: 'Q4 2024', title: 'Q4 2024 Delivery', total: 24, onTrack: 18, atRisk: 4, delayed: 2 },
  { quarter: 'Q1 2025', title: 'Q1 2025 Pipeline', total: 45, onTrack: 32, atRisk: 8, delayed: 5 }
];

const dimensions = [
  { key: 'Rank Execution', score: 78 },
  { key: 'Value Realization', score: 62 },
  { key: 'Ageing Health', score: 58 },
  { key: 'On Hold Control', score: 72 },
  { key: 'Approval Efficiency', score: 85 },
  { key: 'Pipeline Balance', score: 76 },
  { key: 'Conversion Rate', score: 68 }
];

const statuses = [
  { name: 'New Request', count: 11, color: 'bg-gray-500' },
  { name: 'Under Analysis', count: 17, color: 'bg-gray-400' },
  { name: 'In Progress', count: 31, color: 'bg-violet-500' },
  { name: 'Awaiting Response', count: 10, color: 'bg-gray-500' },
  { name: 'On Hold', count: 7, color: 'bg-rose-400' },
  { name: 'Approved', count: 12, color: 'bg-brand-gold' },
  { name: 'Implemented', count: 59, color: 'bg-success' },
  { name: 'Rejected', count: 5, color: 'bg-destructive' }
];

const deliveryData = [
  { id: 'REQ-4401', title: 'Email Notification System', requester: 'Khalid Mansour', cycle: '21 days', value: 120, type: 'implemented' },
  { id: 'REQ-4389', title: 'Report Scheduler', requester: 'Maria Santos', cycle: '18 days', value: 95, type: 'implemented' },
  { id: 'REQ-4356', title: 'SSO for Partner Portal', requester: 'Ali Mahmoud', cycle: '25 days', value: 150, type: 'implemented' },
  { id: 'REQ-4478', title: 'Salesforce Integration', requester: 'Omar Farouk', cycle: '14 days', value: 110, type: 'approved' },
  { id: 'REQ-4456', title: 'Security Monitoring Dashboard', requester: 'Nadia Rashid', cycle: '8 days', value: 85, type: 'approved' }
];

const rejectionData = [
  { id: 'REQ-4312', title: 'Custom Report Builder', requester: 'Ahmed Hassan', reason: 'Duplicate', date: 'Nov 28' },
  { id: 'REQ-4298', title: 'Legacy CRM Export', requester: 'Fatima Al-Rashid', reason: 'Duplicate', date: 'Nov 25' },
  { id: 'REQ-4287', title: 'Manual Inventory Sync', requester: 'Hassan Ibrahim', reason: 'Out of scope', date: 'Nov 22' },
  { id: 'REQ-4265', title: 'Custom Theme Builder', requester: 'Layla Mohammed', reason: 'Out of scope', date: 'Nov 18' },
  { id: 'REQ-4251', title: 'Ad-hoc Notifications', requester: 'Yusuf Ahmed', reason: 'No justification', date: 'Nov 15' }
];

const recoveryData = [
  { id: 'REQ-4521', rank: 1, title: 'Payment Gateway Integration', riskReason: 'This ticket has only 6 days until go-live and is still in progress. Critical delivery risk.', action: 'Start daily standups with the team. Pre-book UAT slots and ensure all dependencies are cleared immediately.' },
  { id: 'REQ-4489', rank: 2, title: 'Dashboard Performance', riskReason: 'This ticket is blocked waiting for business response for 5 days. Stakeholder delay.', action: 'Send a final reminder today. If no response by end of day, escalate directly to the project sponsor.' },
  { id: 'REQ-3421', rank: 12, title: 'Legacy System Integration', riskReason: 'This ticket has been aging for 67 days and is blocked on vendor API availability.', action: 'Get management involved to unblock the vendor dependency. Schedule a call with the vendor within 48 hours.' }
];

const trendingTickets = [
  { id: 'REQ-4521', rank: 1, title: 'Payment Gateway Integration', dept: 'Operations', ageing: 14, status: 'In Progress', goLive: 6 },
  { id: 'REQ-4489', rank: 2, title: 'Dashboard Performance', dept: 'IT', ageing: 18, status: 'Awaiting Response', goLive: 11 },
  { id: 'REQ-4534', rank: 3, title: 'Mobile SSO Implementation', dept: 'Security', ageing: 8, status: 'Under Analysis', goLive: 16 }
];

const attentionTickets = [
  { id: 'REQ-3421', rank: 12, title: 'Legacy System Integration', dept: 'Infrastructure', ageing: 67, status: 'On Hold' },
  { id: 'REQ-3512', rank: 18, title: 'Vendor Portal Access', dept: 'Procurement', ageing: 52, status: 'Awaiting Response' }
];

const approvedTickets = [
  { id: 'REQ-4478', rank: 4, title: 'Salesforce Integration', dept: 'Sales', ageing: 14, status: 'Approved' },
  { id: 'REQ-4456', rank: 6, title: 'Security Monitoring Dashboard', dept: 'Security', ageing: 8, status: 'Approved' }
];

const backlogData = [
  { week: 'W1', value: 89 },
  { week: 'W2', value: 93 },
  { week: 'W3', value: 102 },
  { week: 'W4', value: 115 },
  { week: 'W5', value: 128 },
  { week: 'W6', value: 139 }
];

function getSentiment(score: number) {
  if (score >= 80) return { label: 'ON TRACK', className: 'bg-success' };
  if (score >= 60) return { label: 'MONITOR', className: 'bg-amber-500' };
  return { label: 'ACTION', className: 'bg-destructive' };
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-amber-500';
  return 'text-destructive';
}

function getScoreBg(score: number) {
  if (score >= 80) return 'bg-success';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-destructive';
}

// Unified Sleek Gadget Component - Matches Performance Pulse Style
interface SleekGadgetProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  collapsedContent: ReactNode;
  expandedContent: ReactNode;
  defaultOpen?: boolean;
}

function SleekGadget({ title, subtitle, icon: Icon, collapsedContent, expandedContent, defaultOpen = false }: SleekGadgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-brand-dark rounded-2xl overflow-hidden shadow-lg border border-brand-gold/20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-lg bg-brand-gold/20">
            <Icon className="w-5 h-5 text-brand-gold" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {collapsedContent}
          <ChevronDown className={cn('w-5 h-5 text-white/50 transition-transform', isOpen && 'rotate-180')} />
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-white/10">
          {expandedContent}
        </div>
      )}
    </div>
  );
}

export default function DemandSummaryPage() {
  const [activePeriod, setActivePeriod] = useState('Month');
  const [expandedRecovery, setExpandedRecovery] = useState<string | null>(null);
  const [expandedTrending, setExpandedTrending] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  const currentScore = weeklyScores[weeklyScores.length - 1];
  const prevScore = weeklyScores[weeklyScores.length - 2];
  const trend = currentScore - prevScore;
  const sentiment = getSentiment(currentScore);

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-xs text-brand-gold font-medium">صباح الخير</p>
            <h1 className="text-[22px] font-bold text-foreground">Good Morning, <span className="text-brand-gold">Khalid</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 px-3.5 py-2 bg-muted border border-border rounded-lg text-xs font-medium text-muted-foreground hover:bg-brand-gold/10 hover:border-brand-gold/30 transition-colors">
              <Globe className="w-4 h-4" /> EN | عربي
            </button>
            <div className="flex bg-muted rounded-lg p-0.5">
              {['Week', 'Month', 'Quarter', 'Year'].map((p) => (
                <button key={p} onClick={() => setActivePeriod(p)} className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all', activePeriod === p ? 'bg-brand-dark text-white' : 'text-muted-foreground hover:bg-border')}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-4">
        {/* Business Demand Summary - TOP (includes Status Overview) */}
        <SleekGadget
          title="Business Demand Summary"
          subtitle="Monthly Overview"
          icon={BarChart3}
          defaultOpen={true}
          collapsedContent={
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-semibold rounded">CPI 72</span>
              <span className="text-white/60 text-xs">47 requests • 152 tickets</span>
            </div>
          }
          expandedContent={
            <>
              {/* Demand Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
                {demandCards.map((card, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-semibold text-brand-gold uppercase tracking-wider">{card.label}</span>
                      <span className="text-brand-gold text-xs cursor-pointer hover:text-brand-gold-hover">→</span>
                    </div>
                    <div className="text-white mb-1">
                      <span className={cn('font-mono text-xl font-bold', card.metricStyle === 'up' && 'text-success', card.metricStyle === 'down' && 'text-destructive')}>{card.metric}</span>
                      <span className="text-sm ml-1">{card.headline}</span>
                    </div>
                    <p className="text-[11px] text-white/50">{card.detail}</p>
                  </div>
                ))}
              </div>
              
              {/* Status Overview */}
              <div className="border-t border-white/10 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Status Overview</span>
                  <span className="text-white/50 text-xs">152 tickets</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {statuses.map((s, i) => (
                    <div key={i} className={cn('bg-white/5 rounded-lg p-2.5 border-l-4 border border-white/10', 
                      s.color === 'bg-gray-500' ? 'border-l-gray-500' : 
                      s.color === 'bg-gray-400' ? 'border-l-gray-400' : 
                      s.color === 'bg-violet-500' ? 'border-l-violet-500' : 
                      s.color === 'bg-rose-400' ? 'border-l-rose-400' : 
                      s.color === 'bg-brand-gold' ? 'border-l-brand-gold' : 
                      s.color === 'bg-success' ? 'border-l-success' : 'border-l-destructive'
                    )}>
                      <div className="text-lg font-bold text-white">{s.count}</div>
                      <div className="text-[10px] text-white/50">{s.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          }
        />

        {/* Performance Pulse + CPI Combined */}
        <SleekGadget
          title="Performance Pulse"
          subtitle="8-Week CPI Trend & Dimensions"
          icon={Zap}
          collapsedContent={
            <div className="flex items-center gap-3">
              <div className={cn('px-3 py-1.5 rounded-lg flex items-center gap-2', sentiment.className)}>
                <span className="font-mono font-bold text-white text-lg">{currentScore}</span>
                <span className="text-white/80 text-[10px] font-medium uppercase">{sentiment.label}</span>
              </div>
              <div className={cn('text-xs font-medium', trend >= 0 ? 'text-success' : 'text-destructive')}>
                {trend >= 0 ? '+' : ''}{trend} pts
              </div>
              <div className="hidden sm:flex items-end gap-0.5 h-6">
                {weeklyScores.slice(-8).map((score, i) => {
                  const height = (score / 100) * 24;
                  const s = getSentiment(score);
                  return <div key={i} className={cn('w-1.5 rounded-sm', s.className)} style={{ height, opacity: 0.4 + (i * 0.08) }} />;
                })}
              </div>
            </div>
          }
          expandedContent={
            <>
              {/* Weekly Trend */}
              <div className="flex justify-between items-center flex-wrap gap-3 py-4">
                <div className="flex gap-5 flex-wrap text-[11px] text-white/50">
                  <span>Trending: <strong className="text-success ml-1">+1 pts</strong></span>
                  <span>Best: <strong className="text-white ml-1">19-OCT (82)</strong></span>
                  <span>Lowest: <strong className="text-white ml-1">16-NOV (68)</strong></span>
                </div>
              </div>
              <div className="flex items-end justify-center gap-1 mb-4">
                {weeklyScores.slice(-8).map((score, index) => {
                  const totalWeeks = 8; const minSize = 60; const maxSize = 95;
                  const size = minSize + ((maxSize - minSize) / (totalWeeks - 1)) * index;
                  const isCurrentWeek = index === totalWeeks - 1;
                  const opacity = isCurrentWeek ? 1.0 : (0.45 + (0.45 * (index / (totalWeeks - 1))));
                  const s = getSentiment(score);
                  const dateIndex = weekDates.length - totalWeeks + index;
                  return (
                    <div key={index} className="flex flex-col items-center cursor-pointer transition-transform hover:scale-105" style={{ width: size, height: size + 20, opacity }}>
                      <span className="text-[8px] font-semibold mb-1 text-white/40">{weekDates[dateIndex]}</span>
                      <div className={cn('rounded-lg flex flex-col items-center justify-center', s.className)} style={{ width: size, height: size, border: isCurrentWeek ? '3px solid white' : 'none' }}>
                        <span className="font-mono font-bold text-white" style={{ fontSize: size * 0.28 }}>{score}</span>
                        <span className="text-white font-semibold uppercase" style={{ fontSize: size * 0.11 }}>{s.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* CPI Dimensions */}
              <div className="border-t border-white/10 pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Performance Dimensions</span>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold text-white">72</div>
                    <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-medium rounded">AMBER</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {dimensions.map((d, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] text-white/50 truncate">{d.key}</span>
                        <span className={cn('font-mono text-xs font-bold', getScoreColor(d.score))}>{d.score}</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', getScoreBg(d.score))} style={{ width: `${d.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          }
        />

        {/* Quarter Delivery Tracking */}
        <SleekGadget
          title="Quarter Delivery Tracking"
          subtitle="Q4 2024 & Q1 2025"
          icon={Calendar}
          collapsedContent={
            <div className="flex items-center gap-3">
              <span className="text-white/60 text-xs">69 total</span>
              <div className="flex items-center gap-1">
                <span className="px-2 py-0.5 bg-success/20 text-success text-[10px] font-medium rounded">50 on track</span>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-medium rounded">12 at risk</span>
              </div>
            </div>
          }
          expandedContent={
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {quarterData.map((q, i) => (
                <div key={i} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h4 className="font-semibold text-[14px] text-white mb-3">{q.title}</h4>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-2 bg-white/5 rounded"><div className="text-lg font-bold text-white">{q.total}</div><div className="text-[10px] text-white/50">Total</div></div>
                    <div className="text-center p-2 bg-success/20 rounded"><div className="text-lg font-bold text-success">{q.onTrack}</div><div className="text-[10px] text-success">On Track</div></div>
                    <div className="text-center p-2 bg-amber-500/20 rounded"><div className="text-lg font-bold text-amber-400">{q.atRisk}</div><div className="text-[10px] text-amber-400">At Risk</div></div>
                    <div className="text-center p-2 bg-destructive/20 rounded"><div className="text-lg font-bold text-destructive">{q.delayed}</div><div className="text-[10px] text-destructive">Delayed</div></div>
                  </div>
                </div>
              ))}
            </div>
          }
        />


        {/* Delivery Milestones */}
        <SleekGadget
          title="Delivery Milestones"
          subtitle="Recent Completions"
          icon={Trophy}
          collapsedContent={
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-success/20 text-success text-[10px] font-medium rounded">3 implemented</span>
              <span className="px-2 py-0.5 bg-brand-gold/20 text-brand-gold text-[10px] font-medium rounded">2 approved</span>
            </div>
          }
          expandedContent={
            <div className="pt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-white/50 uppercase">Status</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-white/50 uppercase">ID</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-white/50 uppercase">Summary</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-white/50 uppercase">Requested By</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-white/50 uppercase">Value</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-white/50 uppercase">Cycle</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryData.map((d, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-2">
                        <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', d.type === 'implemented' ? 'bg-success/20 text-success' : 'bg-brand-gold/20 text-brand-gold')}>{d.type}</span>
                      </td>
                      <td className="py-2 px-2 font-mono text-xs text-brand-gold">{d.id}</td>
                      <td className="py-2 px-2 text-white">{d.title}</td>
                      <td className="py-2 px-2 text-white/60">{d.requester}</td>
                      <td className="py-2 px-2 font-mono text-white">{d.value}</td>
                      <td className="py-2 px-2 text-white/60">{d.cycle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        />

        {/* Rejection Insights */}
        <SleekGadget
          title="Rejection Insights"
          subtitle="Analysis"
          icon={XCircle}
          collapsedContent={
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-destructive/20 text-destructive text-[10px] font-medium rounded">5 rejected</span>
              <span className="text-white/60 text-xs">8.5% rate</span>
            </div>
          }
          expandedContent={
            <div className="pt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-white/50 uppercase">ID</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-white/50 uppercase">Title</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-white/50 uppercase">Requester</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-white/50 uppercase">Reason</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-white/50 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rejectionData.map((r, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-2 font-mono text-xs text-brand-gold">{r.id}</td>
                      <td className="py-2 px-2 text-white">{r.title}</td>
                      <td className="py-2 px-2 text-white/60">{r.requester}</td>
                      <td className="py-2 px-2"><span className="px-2 py-0.5 bg-destructive/20 text-destructive rounded text-[10px] font-medium">{r.reason}</span></td>
                      <td className="py-2 px-2 text-white/60">{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        />

        {/* Recovery Plan */}
        <SleekGadget
          title="Recovery Plan"
          subtitle="Action Required"
          icon={Wrench}
          collapsedContent={
            <span className="px-2 py-0.5 bg-destructive/20 text-destructive text-[10px] font-medium rounded">3 at risk</span>
          }
          expandedContent={
            <div className="pt-4 space-y-2">
              {recoveryData.map((r) => (
                <div key={r.id} className="border border-white/10 rounded-lg overflow-hidden">
                  <button onClick={() => setExpandedRecovery(expandedRecovery === r.id ? null : r.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left">
                    <span className="px-2 py-0.5 bg-destructive/20 text-destructive text-[10px] font-bold rounded">#{r.rank}</span>
                    <span className="font-mono text-xs text-brand-gold">{r.id}</span>
                    <span className="font-medium text-white flex-1">{r.title}</span>
                    <ChevronDown className={cn('w-4 h-4 text-white/50 transition-transform', expandedRecovery === r.id && 'rotate-180')} />
                  </button>
                  {expandedRecovery === r.id && (
                    <div className="px-4 pb-4 bg-white/5 border-t border-white/10">
                      <div className="mb-3 pt-3">
                        <div className="text-[10px] font-semibold text-white/50 uppercase mb-1">Risk Reason</div>
                        <p className="text-sm text-white/70">{r.riskReason}</p>
                      </div>
                      <div className="bg-brand-gold/10 rounded-lg p-3 border-l-4 border-brand-gold">
                        <div className="text-[10px] font-semibold text-brand-gold uppercase mb-1">Recommended Action</div>
                        <p className="text-sm text-white">{r.action}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          }
        />

        {/* Trending Tickets */}
        <SleekGadget
          title="Trending Tickets"
          subtitle="High Priority"
          icon={Flame}
          collapsedContent={
            <span className="text-white/60 text-xs">Top 3</span>
          }
          expandedContent={
            <div className="pt-4 space-y-2">
              {trendingTickets.map((t) => (
                <div key={t.id} className="border border-white/10 rounded-lg overflow-hidden">
                  <button onClick={() => setExpandedTrending(expandedTrending === t.id ? null : t.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left">
                    <span className="px-2 py-0.5 bg-brand-gold/20 text-brand-gold text-[10px] font-bold rounded">#{t.rank}</span>
                    <span className="font-mono text-xs text-brand-gold">{t.id}</span>
                    <span className="font-medium text-white flex-1">{t.title}</span>
                    <ChevronDown className={cn('w-4 h-4 text-white/50 transition-transform', expandedTrending === t.id && 'rotate-180')} />
                  </button>
                  {expandedTrending === t.id && (
                    <div className="px-4 pb-4 bg-white/5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                      <div><div className="text-[10px] text-white/50">Department</div><div className="text-sm font-medium text-white">{t.dept}</div></div>
                      <div><div className="text-[10px] text-white/50">Ageing</div><div className="text-sm font-medium text-white">{t.ageing} days</div></div>
                      <div><div className="text-[10px] text-white/50">Go-Live</div><div className="text-sm font-medium text-destructive">{t.goLive} days</div></div>
                      <div><div className="text-[10px] text-white/50">Status</div><div className="text-sm font-medium text-white">{t.status}</div></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          }
        />

        {/* Requires Attention */}
        <SleekGadget
          title="Requires Attention"
          subtitle="Critical Items"
          icon={AlertTriangle}
          collapsedContent={
            <span className="px-2 py-0.5 bg-destructive/20 text-destructive text-[10px] font-medium rounded">2 critical</span>
          }
          expandedContent={
            <div className="pt-4 space-y-2">
              {attentionTickets.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <span className="px-2 py-0.5 bg-white/10 text-destructive text-[10px] font-bold rounded">#{t.rank}</span>
                  <span className="font-mono text-xs text-brand-gold">{t.id}</span>
                  <span className="font-medium text-white flex-1">{t.title}</span>
                  <span className="text-xs text-white/60">{t.dept}</span>
                  <span className="text-xs font-bold text-destructive">{t.ageing} days</span>
                </div>
              ))}
            </div>
          }
        />

        {/* Approved Queue */}
        <SleekGadget
          title="Approved Queue"
          subtitle="Ready for Implementation"
          icon={CheckCircle}
          collapsedContent={
            <span className="px-2 py-0.5 bg-success/20 text-success text-[10px] font-medium rounded">2 ready</span>
          }
          expandedContent={
            <div className="pt-4 space-y-2">
              {approvedTickets.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 bg-success/10 rounded-lg border border-success/20">
                  <span className="px-2 py-0.5 bg-white/10 text-success text-[10px] font-bold rounded">#{t.rank}</span>
                  <span className="font-mono text-xs text-brand-gold">{t.id}</span>
                  <span className="font-medium text-white flex-1">{t.title}</span>
                  <span className="text-xs text-white/60">{t.dept}</span>
                  <span className="text-xs font-bold text-success">{t.ageing} days</span>
                </div>
              ))}
            </div>
          }
        />

        {/* Backlog Trend */}
        <SleekGadget
          title="Backlog Trend"
          subtitle="6-Week Growth"
          icon={TrendingUp}
          collapsedContent={
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white">139</span>
              <span className="px-2 py-0.5 bg-destructive/20 text-destructive text-[10px] font-medium rounded">+56%</span>
            </div>
          }
          expandedContent={
            <div className="pt-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl font-bold text-white">139</div>
                <div>
                  <div className="text-sm font-medium text-destructive">+56% over 6 weeks</div>
                  <div className="text-xs text-white/50">From 89 → 139</div>
                </div>
              </div>
              <div className="flex items-end gap-2 h-32">
                {backlogData.map((b, i) => {
                  const maxVal = Math.max(...backlogData.map(d => d.value));
                  const height = (b.value / maxVal) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-brand-gold rounded-t" style={{ height: `${height}%` }} />
                      <div className="text-[10px] text-white/50 mt-1">{b.week}</div>
                      <div className="text-xs font-medium text-white">{b.value}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          }
        />
      </main>

      {/* AI Chat Button */}
      <button onClick={() => setChatOpen(true)} className="fixed bottom-6 right-6 bg-brand-gold text-brand-dark px-5 py-3 rounded-full font-semibold flex items-center gap-2 shadow-lg hover:bg-brand-gold-hover hover:scale-105 transition-all z-50">
        <Sparkles className="w-5 h-5" />Ask AI
      </button>

      {/* AI Chat Panel */}
      {chatOpen && (
        <div className="fixed inset-y-0 right-0 w-[400px] bg-brand-dark shadow-2xl z-50 flex flex-col border-l border-brand-gold/20">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-gold" />
              <span className="font-semibold text-white">AI Analytics Assistant</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="p-1 hover:bg-white/10 rounded">
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="bg-white/5 text-white rounded-lg p-3 mb-4 text-sm border border-white/10">
              Hello! I'm your analytics assistant. I can help you understand your dashboard metrics, identify risks, and suggest actions. What would you like to know?
            </div>
            <div className="space-y-2 mb-4">
              {['Why did CPI change this week?', 'Which tickets are most at risk?', 'What should I focus on today?', 'Explain the backlog growth'].map((q, i) => (
                <button key={i} className="w-full text-left px-3 py-2 bg-white/5 rounded-lg text-sm text-white/70 hover:bg-brand-gold/10 hover:text-white transition-colors border border-white/10">
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold"
              />
              <button className="px-4 py-2 bg-brand-gold text-brand-dark rounded-lg hover:bg-brand-gold-hover transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
