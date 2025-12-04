import { useState } from 'react';
import { ChevronDown, ChevronUp, Zap, Calendar, BarChart3, Tag, Trophy, XCircle, Wrench, Flame, AlertTriangle, CheckCircle, TrendingUp, Sparkles, Globe, Send, X } from 'lucide-react';
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
  { name: 'New Request', count: 11, color: '#4a4a4a' },
  { name: 'Under Analysis', count: 17, color: '#9ca3af' },
  { name: 'In Progress', count: 31, color: '#6b5b95' },
  { name: 'Awaiting Response', count: 10, color: '#6b7280' },
  { name: 'On Hold', count: 7, color: '#d4a5a5' },
  { name: 'Approved', count: 12, color: '#c69c6d' },
  { name: 'Implemented', count: 59, color: '#22c55e' },
  { name: 'Rejected', count: 5, color: '#ef4444' }
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
  if (score >= 80) return { label: 'ON TRACK', color: '#22c55e' };
  if (score >= 60) return { label: 'MONITOR', color: '#f59e0b' };
  return { label: 'ACTION', color: '#ef4444' };
}

function getScoreColor(score: number) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function CollapsibleSection({ title, icon: Icon, badge, defaultOpen = false, children }: { title: string; icon: any; badge?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode; }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-[#e8e4df] overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#f8f6f3] transition-colors">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-[#c69c6d]" />
          <span className="font-semibold text-[15px] text-[#1a1a1a]">{title}</span>
          {badge}
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-[#7a7a7a]" /> : <ChevronDown className="w-5 h-5 text-[#7a7a7a]" />}
      </button>
      {isOpen && <div className="px-5 pb-5 border-t border-[#e8e4df]">{children}</div>}
    </div>
  );
}

export default function DemandSummaryPage() {
  const [activePeriod, setActivePeriod] = useState('Month');
  const [expandedRecovery, setExpandedRecovery] = useState<string | null>(null);
  const [expandedTrending, setExpandedTrending] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  return (
    <div className="min-h-screen bg-[#f8f6f3]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="bg-white border-b border-[#e8e4df] px-6 py-4 sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center flex-wrap gap-4">
          <div>
            <p className="text-xs text-[#c69c6d] font-medium">صباح الخير</p>
            <h1 className="text-[22px] font-bold text-[#1a1a1a]">Good Morning, <span className="text-[#c69c6d]">Khalid</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f8f6f3] border border-[#e8e4df] rounded-lg text-xs font-medium text-[#4a4a4a] hover:bg-[#f0e6d9] hover:border-[#c69c6d] transition-colors">
              <Globe className="w-4 h-4" /> EN | عربي
            </button>
            <div className="flex bg-[#f8f6f3] rounded-lg p-0.5">
              {['Week', 'Month', 'Quarter', 'Year'].map((p) => (
                <button key={p} onClick={() => setActivePeriod(p)} className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all', activePeriod === p ? 'bg-[#1a1a1a] text-white' : 'text-[#4a4a4a] hover:bg-[#e8e4df]')}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-4">
        {/* Performance Pulse */}
        <section className="bg-[#1a1a1a] rounded-2xl p-5">
          <div className="flex justify-between items-center flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-[#c69c6d]" />
              <h3 className="text-[15px] font-semibold text-white">Performance Pulse</h3>
              <span className="text-[11px] text-[#9a9a9a]">8-Week Trend</span>
            </div>
            <div className="flex gap-5 flex-wrap text-[11px] text-[#9a9a9a]">
              <span>Trending: <strong className="text-[#22c55e] ml-1">+1 pts</strong></span>
              <span>Best: <strong className="text-white ml-1">19-OCT (82)</strong></span>
              <span>Lowest: <strong className="text-white ml-1">16-NOV (68)</strong></span>
            </div>
          </div>
          <div className="flex items-end justify-center gap-1 mb-3">
            {weeklyScores.slice(-8).map((score, index) => {
              const totalWeeks = 8; const minSize = 60; const maxSize = 95;
              const size = minSize + ((maxSize - minSize) / (totalWeeks - 1)) * index;
              const isCurrentWeek = index === totalWeeks - 1;
              const opacity = isCurrentWeek ? 1.0 : (0.45 + (0.45 * (index / (totalWeeks - 1))));
              const sentiment = getSentiment(score);
              const dateIndex = weekDates.length - totalWeeks + index;
              return (
                <div key={index} className="flex flex-col items-center cursor-pointer transition-transform hover:scale-105" style={{ width: size, height: size + 20, opacity }}>
                  <span className="text-[8px] font-semibold mb-1" style={{ color: 'rgba(0,0,0,0.7)' }}>{weekDates[dateIndex]}</span>
                  <div className="rounded-lg flex flex-col items-center justify-center" style={{ width: size, height: size, backgroundColor: sentiment.color, border: isCurrentWeek ? '3px solid white' : 'none' }}>
                    <span className="font-mono font-bold text-white" style={{ fontSize: size * 0.28 }}>{score}</span>
                    <span className="text-white font-semibold uppercase" style={{ fontSize: size * 0.11 }}>{sentiment.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-center text-[#9a9a9a] text-[11px] italic">Hover over each week to view CPI score and date details</p>
        </section>

        {/* Business Demand Summary */}
        <section className="bg-[#1a1a1a] rounded-2xl p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <BarChart3 className="w-5 h-5 text-[#c69c6d]" />
            <h3 className="text-[15px] font-semibold text-white">Business Demand Summary</h3>
            <span className="ml-auto px-2.5 py-1 bg-[#f59e0b]/20 text-[#f59e0b] text-[10px] font-semibold rounded">CPI 72 AMBER</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {demandCards.map((card, i) => (
              <div key={i} className="bg-[#2d2d2d] rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-semibold text-[#c69c6d] uppercase tracking-wider">{card.label}</span>
                  <span className="text-[#c69c6d] text-xs cursor-pointer">→</span>
                </div>
                <div className="text-white mb-1">
                  <span className={cn('font-mono text-xl font-bold', card.metricStyle === 'up' && 'text-[#22c55e]', card.metricStyle === 'down' && 'text-[#ef4444]')}>{card.metric}</span>
                  <span className="text-sm ml-1">{card.headline}</span>
                </div>
                <p className="text-[11px] text-[#9a9a9a]">{card.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <CollapsibleSection title="Quarter Delivery Tracking" icon={Calendar} badge={<span className="text-[11px] text-[#7a7a7a] ml-2">69 total</span>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {quarterData.map((q, i) => (
              <div key={i} className="bg-[#f8f6f3] rounded-lg p-4">
                <h4 className="font-semibold text-[14px] text-[#1a1a1a] mb-3">{q.title}</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 bg-white rounded border border-[#e8e4df]"><div className="text-lg font-bold text-[#1a1a1a]">{q.total}</div><div className="text-[10px] text-[#7a7a7a]">Total</div></div>
                  <div className="text-center p-2 bg-[#dcfce7] rounded"><div className="text-lg font-bold text-[#22c55e]">{q.onTrack}</div><div className="text-[10px] text-[#22c55e]">On Track</div></div>
                  <div className="text-center p-2 bg-[#fef3c7] rounded"><div className="text-lg font-bold text-[#f59e0b]">{q.atRisk}</div><div className="text-[10px] text-[#f59e0b]">At Risk</div></div>
                  <div className="text-center p-2 bg-[#fee2e2] rounded"><div className="text-lg font-bold text-[#ef4444]">{q.delayed}</div><div className="text-[10px] text-[#ef4444]">Delayed</div></div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Catalyst Performance Index" icon={BarChart3} badge={<span className="px-2 py-0.5 bg-[#f59e0b]/20 text-[#f59e0b] text-[10px] font-semibold rounded ml-2">72 AMBER</span>}>
          <div className="pt-4">
            <div className="flex items-center gap-4 mb-4"><div className="text-4xl font-bold text-[#1a1a1a]">72</div><div><div className="text-sm font-medium text-[#f59e0b]">AMBER</div><div className="text-xs text-[#7a7a7a]">+5 pts from last week</div></div></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {dimensions.map((d, i) => (<div key={i} className="bg-[#f8f6f3] rounded-lg p-3"><div className="flex justify-between items-center mb-2"><span className="text-xs text-[#4a4a4a]">{d.key}</span><span className="font-mono font-bold" style={{ color: getScoreColor(d.score) }}>{d.score}</span></div><div className="h-2 bg-[#e8e4df] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${d.score}%`, backgroundColor: getScoreColor(d.score) }} /></div></div>))}
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Status Overview" icon={Tag} badge={<span className="text-[11px] text-[#7a7a7a] ml-2">152 tickets</span>}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">{statuses.map((s, i) => (<div key={i} className="bg-[#f8f6f3] rounded-lg p-3 border-l-4" style={{ borderLeftColor: s.color }}><div className="text-2xl font-bold text-[#1a1a1a]">{s.count}</div><div className="text-xs text-[#4a4a4a]">{s.name}</div></div>))}</div>
        </CollapsibleSection>

        <CollapsibleSection title="Delivery Milestones" icon={Trophy} badge={<span className="text-[11px] text-[#7a7a7a] ml-2">5 approved • 3 implemented</span>}>
          <div className="pt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-[#e8e4df]"><th className="text-left py-2 px-2 text-[10px] font-semibold text-[#7a7a7a] uppercase">Status</th><th className="text-left py-2 px-2 text-[10px] font-semibold text-[#7a7a7a] uppercase">ID</th><th className="text-left py-2 px-2 text-[10px] font-semibold text-[#7a7a7a] uppercase">Summary</th><th className="text-left py-2 px-2 text-[10px] font-semibold text-[#7a7a7a] uppercase">Requested By</th><th className="text-left py-2 px-2 text-[10px] font-semibold text-[#7a7a7a] uppercase">Value</th><th className="text-left py-2 px-2 text-[10px] font-semibold text-[#7a7a7a] uppercase">Cycle</th></tr></thead><tbody>{deliveryData.map((d, i) => (<tr key={i} className="border-b border-[#e8e4df] hover:bg-[#f8f6f3]"><td className="py-2 px-2"><span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', d.type === 'implemented' ? 'bg-[#dcfce7] text-[#22c55e]' : 'bg-[#f0e6d9] text-[#c69c6d]')}>{d.type}</span></td><td className="py-2 px-2 font-mono text-xs text-[#c69c6d]">{d.id}</td><td className="py-2 px-2 text-[#1a1a1a]">{d.title}</td><td className="py-2 px-2 text-[#4a4a4a]">{d.requester}</td><td className="py-2 px-2 font-mono text-[#1a1a1a]">{d.value}</td><td className="py-2 px-2 text-[#7a7a7a]">{d.cycle}</td></tr>))}</tbody></table></div>
        </CollapsibleSection>

        <CollapsibleSection title="Rejection Insights" icon={XCircle} badge={<span className="text-[11px] text-[#7a7a7a] ml-2">5 rejected • 8.5% rate</span>}>
          <div className="pt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-[#e8e4df]"><th className="text-left py-2 px-2 text-[10px] font-semibold text-[#7a7a7a] uppercase">ID</th><th className="text-left py-2 px-2 text-[10px] font-semibold text-[#7a7a7a] uppercase">Title</th><th className="text-left py-2 px-2 text-[10px] font-semibold text-[#7a7a7a] uppercase">Requester</th><th className="text-left py-2 px-2 text-[10px] font-semibold text-[#7a7a7a] uppercase">Reason</th><th className="text-left py-2 px-2 text-[10px] font-semibold text-[#7a7a7a] uppercase">Date</th></tr></thead><tbody>{rejectionData.map((r, i) => (<tr key={i} className="border-b border-[#e8e4df] hover:bg-[#f8f6f3]"><td className="py-2 px-2 font-mono text-xs text-[#c69c6d]">{r.id}</td><td className="py-2 px-2 text-[#1a1a1a]">{r.title}</td><td className="py-2 px-2 text-[#4a4a4a]">{r.requester}</td><td className="py-2 px-2"><span className="px-2 py-0.5 bg-[#fee2e2] text-[#ef4444] rounded text-[10px] font-medium">{r.reason}</span></td><td className="py-2 px-2 text-[#7a7a7a]">{r.date}</td></tr>))}</tbody></table></div>
        </CollapsibleSection>

        <CollapsibleSection title="Recovery Plan" icon={Wrench} badge={<span className="text-[11px] text-[#ef4444] ml-2">3 at risk</span>}>
          <div className="pt-4 space-y-2">{recoveryData.map((r) => (<div key={r.id} className="border border-[#e8e4df] rounded-lg overflow-hidden"><button onClick={() => setExpandedRecovery(expandedRecovery === r.id ? null : r.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f8f6f3] text-left"><span className="px-2 py-0.5 bg-[#fee2e2] text-[#ef4444] text-[10px] font-bold rounded">#{r.rank}</span><span className="font-mono text-xs text-[#c69c6d]">{r.id}</span><span className="font-medium text-[#1a1a1a] flex-1">{r.title}</span>{expandedRecovery === r.id ? <ChevronUp className="w-4 h-4 text-[#7a7a7a]" /> : <ChevronDown className="w-4 h-4 text-[#7a7a7a]" />}</button>{expandedRecovery === r.id && (<div className="px-4 pb-4 bg-[#f8f6f3] border-t border-[#e8e4df]"><div className="mb-3"><div className="text-[10px] font-semibold text-[#7a7a7a] uppercase mb-1">Risk Reason</div><p className="text-sm text-[#4a4a4a]">{r.riskReason}</p></div><div className="bg-[#f0e6d9] rounded-lg p-3 border-l-4 border-[#c69c6d]"><div className="text-[10px] font-semibold text-[#c69c6d] uppercase mb-1">Recommended Action</div><p className="text-sm text-[#1a1a1a]">{r.action}</p></div></div>)}</div>))}</div>
        </CollapsibleSection>

        <CollapsibleSection title="Trending Tickets" icon={Flame} badge={<span className="text-[11px] text-[#7a7a7a] ml-2">Top 3</span>}>
          <div className="pt-4 space-y-2">{trendingTickets.map((t) => (<div key={t.id} className="border border-[#e8e4df] rounded-lg overflow-hidden"><button onClick={() => setExpandedTrending(expandedTrending === t.id ? null : t.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f8f6f3] text-left"><span className="px-2 py-0.5 bg-[#f0e6d9] text-[#c69c6d] text-[10px] font-bold rounded">#{t.rank}</span><span className="font-mono text-xs text-[#c69c6d]">{t.id}</span><span className="font-medium text-[#1a1a1a] flex-1">{t.title}</span>{expandedTrending === t.id ? <ChevronUp className="w-4 h-4 text-[#7a7a7a]" /> : <ChevronDown className="w-4 h-4 text-[#7a7a7a]" />}</button>{expandedTrending === t.id && (<div className="px-4 pb-4 bg-[#f8f6f3] border-t border-[#e8e4df] grid grid-cols-2 sm:grid-cols-4 gap-3"><div><div className="text-[10px] text-[#7a7a7a]">Department</div><div className="text-sm font-medium">{t.dept}</div></div><div><div className="text-[10px] text-[#7a7a7a]">Ageing</div><div className="text-sm font-medium">{t.ageing} days</div></div><div><div className="text-[10px] text-[#7a7a7a]">Go-Live</div><div className="text-sm font-medium text-[#ef4444]">{t.goLive} days</div></div><div><div className="text-[10px] text-[#7a7a7a]">Status</div><div className="text-sm font-medium">{t.status}</div></div></div>)}</div>))}</div>
        </CollapsibleSection>

        <CollapsibleSection title="Requires Attention" icon={AlertTriangle} badge={<span className="text-[11px] text-[#ef4444] ml-2">2 critical</span>}>
          <div className="pt-4 space-y-2">{attentionTickets.map((t) => (<div key={t.id} className="flex items-center gap-3 px-4 py-3 bg-[#fee2e2] rounded-lg"><span className="px-2 py-0.5 bg-white text-[#ef4444] text-[10px] font-bold rounded">#{t.rank}</span><span className="font-mono text-xs text-[#c69c6d]">{t.id}</span><span className="font-medium text-[#1a1a1a] flex-1">{t.title}</span><span className="text-xs text-[#7a7a7a]">{t.dept}</span><span className="text-xs font-bold text-[#ef4444]">{t.ageing} days</span></div>))}</div>
        </CollapsibleSection>

        <CollapsibleSection title="Approved Queue" icon={CheckCircle} badge={<span className="text-[11px] text-[#22c55e] ml-2">2 ready</span>}>
          <div className="pt-4 space-y-2">{approvedTickets.map((t) => (<div key={t.id} className="flex items-center gap-3 px-4 py-3 bg-[#dcfce7] rounded-lg"><span className="px-2 py-0.5 bg-white text-[#22c55e] text-[10px] font-bold rounded">#{t.rank}</span><span className="font-mono text-xs text-[#c69c6d]">{t.id}</span><span className="font-medium text-[#1a1a1a] flex-1">{t.title}</span><span className="text-xs text-[#7a7a7a]">{t.dept}</span><span className="text-xs font-bold text-[#22c55e]">{t.ageing} days</span></div>))}</div>
        </CollapsibleSection>

        <CollapsibleSection title="Backlog Trend" icon={TrendingUp} badge={<span className="text-[11px] text-[#ef4444] ml-2">+56%</span>}>
          <div className="pt-4"><div className="flex items-center gap-4 mb-4"><div className="text-4xl font-bold text-[#1a1a1a]">139</div><div><div className="text-sm font-medium text-[#ef4444]">+56% over 6 weeks</div><div className="text-xs text-[#7a7a7a]">From 89 → 139</div></div></div><div className="flex items-end gap-2 h-32">{backlogData.map((b, i) => { const maxVal = Math.max(...backlogData.map(d => d.value)); const height = (b.value / maxVal) * 100; return (<div key={i} className="flex-1 flex flex-col items-center"><div className="w-full bg-[#c69c6d] rounded-t" style={{ height: `${height}%` }} /><div className="text-[10px] text-[#7a7a7a] mt-1">{b.week}</div><div className="text-xs font-medium text-[#1a1a1a]">{b.value}</div></div>); })}</div></div>
        </CollapsibleSection>
      </main>

      <button onClick={() => setChatOpen(true)} className="fixed bottom-6 right-6 bg-[#c69c6d] text-[#1a1a1a] px-5 py-3 rounded-full font-semibold flex items-center gap-2 shadow-lg hover:scale-105 transition-transform z-50"><Sparkles className="w-5 h-5" />Ask AI</button>

      {chatOpen && (
        <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e4df]"><div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#c69c6d]" /><span className="font-semibold text-[#1a1a1a]">AI Analytics Assistant</span></div><button onClick={() => setChatOpen(false)} className="p-1 hover:bg-[#f8f6f3] rounded"><X className="w-5 h-5 text-[#7a7a7a]" /></button></div>
          <div className="flex-1 p-4 overflow-y-auto"><div className="bg-[#2d2d2d] text-white rounded-lg p-3 mb-4 text-sm">Hello! I'm your analytics assistant. I can help you understand your dashboard metrics, identify risks, and suggest actions. What would you like to know?</div><div className="space-y-2 mb-4">{['Why did CPI change this week?', 'Which tickets are most at risk?', 'What should I focus on today?', 'Explain the backlog growth'].map((q, i) => (<button key={i} className="w-full text-left px-3 py-2 bg-[#f8f6f3] rounded-lg text-sm text-[#4a4a4a] hover:bg-[#f0e6d9] hover:text-[#1a1a1a] transition-colors">{q}</button>))}</div></div>
          <div className="p-4 border-t border-[#e8e4df]"><div className="flex gap-2"><input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="Ask a question..." className="flex-1 px-4 py-2 border border-[#e8e4df] rounded-lg text-sm focus:outline-none focus:border-[#c69c6d]" /><button className="px-4 py-2 bg-[#c69c6d] text-white rounded-lg hover:bg-[#a67c4e] transition-colors"><Send className="w-4 h-4" /></button></div></div>
        </div>
      )}
    </div>
  );
}
