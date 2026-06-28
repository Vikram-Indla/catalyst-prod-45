import { useState } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const timeFilters = ['24h', '7D', '30D', '90D'];

const stats = [
  { label: 'Critical Incidents', value: 3, className: 'text-[var(--ds-text-danger)]', trend: '↑ +2 from last week', trendUp: true },
  { label: 'Open Incidents', value: 24, className: 'text-[var(--ds-text-warning)]', trend: '↑ +5 from last week', trendUp: true },
  { label: 'Resolved This Week', value: 18, className: 'text-[var(--ds-text-success)]', trend: '↑ +12 improvement', trendUp: false },
  { label: 'Avg Resolution Time', value: '4.2h', className: 'text-[var(--ds-surface-raised,var(--cp-ink-1))]', trend: '↓ -1.2h improvement', trendUp: false },
  { label: 'SLA Compliance', value: '94%', className: 'text-[var(--ds-text-success)]', trend: '↑ +3% improvement', trendUp: false },
];

const statusData = [
  { label: 'Open', count: 24, color: 'bg-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]' },
  { label: 'In Progress', count: 15, color: 'bg-[var(--ds-text-warning)]' },
  { label: 'Pending', count: 8, color: 'bg-[var(--ds-text-warning)]' },
  { label: 'Resolved', count: 45, color: 'bg-[var(--ds-text-success)]' },
  { label: 'Closed', count: 55, color: 'bg-[var(--ds-text-subtlest)]' },
];

const teamData = [
  { initials: 'FA', name: 'Fahad Al-Rashid', role: 'Senior Engineer', resolved: 24 },
  { initials: 'SA', name: 'Sara Al-Mutairi', role: 'Tech Lead', resolved: 21 },
  { initials: 'AH', name: 'Ahmed Al-Harbi', role: 'DevOps', resolved: 18 },
  { initials: 'NA', name: 'Nadia Al-Salem', role: 'Support Lead', resolved: 15 },
];

const matrixData = [
  [3, 7, 4],
  [5, 12, 8],
  [2, 6, 3],
];

const matrixColors = [
  ['bg-[var(--ds-background-danger, rgba(239,68,68,0.1))] text-[var(--ds-text-danger)]', 'bg-[var(--ds-background-warning-bold, rgba(245,158,11,0.1))] text-[var(--ds-text-warning,var(--ds-background-warning-bold))]', 'bg-[var(--ds-background-warning-bold, rgba(245,158,11,0.1))] text-[var(--ds-text-warning,var(--ds-background-warning-bold))]'],
  ['bg-[var(--ds-background-warning-bold, rgba(245,158,11,0.1))] text-[var(--ds-text-warning,var(--ds-background-warning-bold))]', 'bg-[var(--ds-background-warning-bold, rgba(245,158,11,0.1))] text-[var(--ds-text-warning,var(--ds-background-warning-bold))]', 'bg-[var(--ds-background-success, rgba(13,148,136,0.1))] text-[var(--ds-text-success)]'],
  ['bg-[var(--ds-background-warning-bold, rgba(245,158,11,0.1))] text-[var(--ds-text-warning,var(--ds-background-warning-bold))]', 'bg-[var(--ds-background-success, rgba(13,148,136,0.1))] text-[var(--ds-text-success)]', 'bg-[var(--ds-background-success, rgba(13,148,136,0.1))] text-[var(--ds-text-success)]'],
];

const matrixLabels = [
  ['Critical', 'High', 'Medium'],
  ['High', 'Medium', 'Low'],
  ['Medium', 'Low', 'Low'],
];

export default function IncidentsDashboard() {
  const [activeFilter, setActiveFilter] = useState('7D');
  const total = statusData.reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - fixed height 72px to align with sidebar */}
      <div className="border-b border-border bg-card flex-shrink-0">
        <div className="px-4 sm:px-6 flex items-center justify-between">
          <CatalystPageHeader title="Incidents Dashboard" />
          <Link to="/release/incidents">
            <Button variant="outline" className="border-border text-muted-foreground">
              View List
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Time Filter */}
        <div className="flex gap-1 mb-6">
          {timeFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "px-4 py-2 text-sm rounded-md border transition-colors",
                activeFilter === filter
                  ? "bg-brand-primary border-brand-primary text-white font-semibold"
                  : "bg-white border-border text-muted-foreground hover:bg-muted/50"
              )}
            >
              {filter}
            </button>
          ))}
        </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-7">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-[var(--ds-border)]">
            <CardContent className="p-5">
              <p className="text-[11px] uppercase text-[var(--ds-text-subtlest)] font-semibold mb-2">
                {stat.label}
              </p>
              <p className={cn("text-[28px] font-bold mb-1", stat.className)}>
                {stat.value}
              </p>
              <p className={cn("text-[13px]", stat.trendUp ? "text-[var(--ds-text-danger)]" : "text-[var(--ds-text-success)]")}>
                {stat.trend}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incident Trend Chart */}
          <Card className="border-[var(--ds-border)]">
            <CardHeader className="border-b border-[var(--ds-border)] py-4 px-5">
              <CardTitle className="text-[15px] font-semibold">Incident Trend (7 Days)</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="h-[180px]">
                <svg viewBox="0 0 600 180" className="w-full h-full">
                  <defs>
                    <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  {[30, 60, 90, 120].map((y) => (
                    <line key={y} x1="50" y1={y} x2="570" y2={y} stroke="var(--ds-border)" />
                  ))}
                  <path
                    d="M80,80 L155,60 L230,100 L305,70 L380,90 L455,50 L530,40 L530,150 L80,150 Z"
                    fill="url(#blueGradient)"
                    opacity="0.3"
                  />
                  <path
                    d="M80,80 L155,60 L230,100 L305,70 L380,90 L455,50 L530,40"
                    fill="none"
                    stroke="var(--ds-text-brand, var(--cp-workstream-catalyst-primary))"
                    strokeWidth="2.5"
                  />
                  {[
                    { cx: 80, cy: 80 },
                    { cx: 155, cy: 60 },
                    { cx: 230, cy: 100 },
                    { cx: 305, cy: 70 },
                    { cx: 380, cy: 90 },
                    { cx: 455, cy: 50 },
                    { cx: 530, cy: 40 },
                  ].map((point, i) => (
                    <circle key={i} cx={point.cx} cy={point.cy} r="4" fill="var(--ds-text-brand, var(--cp-workstream-catalyst-primary))" />
                  ))}
                  {['Nov 30', 'Dec 1', 'Dec 2', 'Dec 3', 'Dec 4', 'Dec 5', 'Today'].map((label, i) => (
                    <text key={label} x={80 + i * 75} y="170" fontSize="11" fill="var(--ds-text-subtlest)">
                      {label}
                    </text>
                  ))}
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* Priority Matrix */}
          <Card className="border-[var(--ds-border)]">
            <CardHeader className="border-b border-[var(--ds-border)] py-4 px-5">
              <CardTitle className="text-[15px] font-semibold">Priority Matrix (Impact × Urgency)</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-4 gap-0.5">
                <div />
                <div className="p-2 text-center text-[10px] font-semibold uppercase text-[var(--ds-text-subtlest)]">High Urgency</div>
                <div className="p-2 text-center text-[10px] font-semibold uppercase text-[var(--ds-text-subtlest)]">Medium</div>
                <div className="p-2 text-center text-[10px] font-semibold uppercase text-[var(--ds-text-subtlest)]">Low Urgency</div>
                
                {['High Impact', 'Medium', 'Low Impact'].map((rowLabel, rowIdx) => (
                  <>
                    <div key={`label-${rowIdx}`} className="p-3 text-[10px] font-semibold uppercase text-[var(--ds-text-subtlest)] flex items-center justify-center">
                      <span className="[writing-mode:vertical-rl] rotate-180">{rowLabel}</span>
                    </div>
                    {matrixData[rowIdx].map((count, colIdx) => (
                      <div
                        key={`cell-${rowIdx}-${colIdx}`}
                        className={cn("p-3.5 text-center rounded", matrixColors[rowIdx][colIdx])}
                      >
                        <div className="text-xl font-bold">{count}</div>
                        <div className="text-[9px] text-[var(--ds-text-subtlest)] mt-0.5">{matrixLabels[rowIdx][colIdx]}</div>
                      </div>
                    ))}
                  </>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Status Distribution */}
          <Card className="border-[var(--ds-border)]">
            <CardHeader className="border-b border-[var(--ds-border)] py-4 px-5">
              <CardTitle className="text-[15px] font-semibold">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex items-center gap-6">
                {/* Donut Chart */}
                <div className="relative w-[120px] h-[120px]">
                  <svg viewBox="0 0 120 120" className="w-full h-full">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="var(--ds-border)" strokeWidth="16" />
                    <circle
                      cx="60" cy="60" r="50" fill="none" stroke="var(--ds-background-information-bold)" strokeWidth="16"
                      strokeDasharray="51 263" strokeDashoffset="0"
                      transform="rotate(-90 60 60)"
                    />
                    <circle
                      cx="60" cy="60" r="50" fill="none" stroke="var(--ds-text-discovery)" strokeWidth="16"
                      strokeDasharray="32 282" strokeDashoffset="-51"
                      transform="rotate(-90 60 60)"
                    />
                    <circle
                      cx="60" cy="60" r="50" fill="none" stroke="var(--ds-text-warning)" strokeWidth="16"
                      strokeDasharray="17 297" strokeDashoffset="-83"
                      transform="rotate(-90 60 60)"
                    />
                    <circle
                      cx="60" cy="60" r="50" fill="none" stroke="var(--ds-text-success)" strokeWidth="16"
                      strokeDasharray="96 218" strokeDashoffset="-100"
                      transform="rotate(-90 60 60)"
                    />
                    <circle
                      cx="60" cy="60" r="50" fill="none" stroke="var(--ds-text-subtlest)" strokeWidth="16"
                      strokeDasharray="118 196" strokeDashoffset="-196"
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{total}</span>
                    <span className="text-[10px] text-[var(--ds-text-subtlest)]">Total</span>
                  </div>
                </div>
                
                {/* Legend */}
                <div className="flex-1">
                  {statusData.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 py-1.5 text-[13px]">
                      <span className={cn("w-3 h-3 rounded-sm", item.color)} />
                      <span>{item.label}</span>
                      <span className="ml-auto font-semibold">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Performance */}
          <Card className="border-[var(--ds-border)]">
            <CardHeader className="border-b border-[var(--ds-border)] py-4 px-5">
              <CardTitle className="text-[15px] font-semibold">Team Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 gap-3">
                {teamData.map((member) => (
                  <div
                    key={member.initials}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: 'var(--ds-background-information, rgba(37, 99, 235, 0.1))' }}
                  >
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-semibold text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]">
                      {member.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[13px] truncate">{member.name}</div>
                      <div className="text-[11px] text-[var(--ds-text-subtlest)]">{member.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-[var(--ds-text-success)]">{member.resolved}</div>
                      <div className="text-[10px] text-[var(--ds-text-subtlest)]">Resolved</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}
