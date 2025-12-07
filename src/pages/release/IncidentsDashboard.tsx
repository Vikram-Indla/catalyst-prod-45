import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/release/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const timeFilters = ['24h', '7D', '30D', '90D'];

const stats = [
  { label: 'Critical Incidents', value: 3, className: 'text-red-700', trend: '↑ +2 from last week', trendUp: true },
  { label: 'Open Incidents', value: 24, className: 'text-orange-700', trend: '↑ +5 from last week', trendUp: true },
  { label: 'Resolved This Week', value: 18, className: 'text-green-700', trend: '↑ +12 improvement', trendUp: false },
  { label: 'Avg Resolution Time', value: '4.2h', className: 'text-[#1A1A1A]', trend: '↓ -1.2h improvement', trendUp: false },
  { label: 'SLA Compliance', value: '94%', className: 'text-green-700', trend: '↑ +3% improvement', trendUp: false },
];

const statusData = [
  { label: 'Open', count: 24, color: 'bg-blue-600' },
  { label: 'In Progress', count: 15, color: 'bg-purple-700' },
  { label: 'Pending', count: 8, color: 'bg-orange-600' },
  { label: 'Resolved', count: 45, color: 'bg-green-600' },
  { label: 'Closed', count: 55, color: 'bg-gray-500' },
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
  ['bg-red-50 text-red-700', 'bg-orange-50 text-orange-700', 'bg-yellow-50 text-yellow-600'],
  ['bg-orange-50 text-orange-700', 'bg-yellow-50 text-yellow-600', 'bg-green-50 text-green-700'],
  ['bg-yellow-50 text-yellow-600', 'bg-green-50 text-green-700', 'bg-green-50 text-green-700'],
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
    <div className="p-6 md:p-8">
      <PageHeader
        title="Incidents Dashboard"
        actions={
          <Link to="/release/incidents">
            <Button variant="outline" className="border-[#E8E8E8] text-[#5C5C5C]">
              View List
            </Button>
          </Link>
        }
      />

      {/* Time Filter */}
      <div className="flex gap-1 mb-6">
        {timeFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={cn(
              "px-4 py-2 text-sm rounded-md border transition-colors",
              activeFilter === filter
                ? "bg-[#C69C6D] border-[#C69C6D] text-white font-semibold"
                : "bg-white border-[#E8E8E8] text-[#5C5C5C] hover:bg-[#FAFAFA]"
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-7">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-[#E8E8E8]">
            <CardContent className="p-5">
              <p className="text-[11px] uppercase text-[#8C8C8C] font-semibold mb-2">
                {stat.label}
              </p>
              <p className={cn("text-[28px] font-bold mb-1", stat.className)}>
                {stat.value}
              </p>
              <p className={cn("text-[13px]", stat.trendUp ? "text-red-700" : "text-green-700")}>
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
          <Card className="border-[#E8E8E8]">
            <CardHeader className="border-b border-[#E8E8E8] py-4 px-5">
              <CardTitle className="text-[15px] font-semibold">Incident Trend (7 Days)</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="h-[180px]">
                <svg viewBox="0 0 600 180" className="w-full h-full">
                  <defs>
                    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#C69C6D', stopOpacity: 0.4 }} />
                      <stop offset="100%" style={{ stopColor: '#C69C6D', stopOpacity: 0 }} />
                    </linearGradient>
                  </defs>
                  {[30, 60, 90, 120].map((y) => (
                    <line key={y} x1="50" y1={y} x2="570" y2={y} stroke="#E8E8E8" />
                  ))}
                  <path
                    d="M80,80 L155,60 L230,100 L305,70 L380,90 L455,50 L530,40 L530,150 L80,150 Z"
                    fill="url(#goldGradient)"
                    opacity="0.3"
                  />
                  <path
                    d="M80,80 L155,60 L230,100 L305,70 L380,90 L455,50 L530,40"
                    fill="none"
                    stroke="#C69C6D"
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
                    <circle key={i} cx={point.cx} cy={point.cy} r="4" fill="#C69C6D" />
                  ))}
                  {['Nov 30', 'Dec 1', 'Dec 2', 'Dec 3', 'Dec 4', 'Dec 5', 'Today'].map((label, i) => (
                    <text key={label} x={80 + i * 75} y="170" fontSize="11" fill="#8C8C8C">
                      {label}
                    </text>
                  ))}
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* Priority Matrix */}
          <Card className="border-[#E8E8E8]">
            <CardHeader className="border-b border-[#E8E8E8] py-4 px-5">
              <CardTitle className="text-[15px] font-semibold">Priority Matrix (Impact × Urgency)</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-4 gap-0.5">
                <div />
                <div className="p-2 text-center text-[10px] font-semibold uppercase text-[#8C8C8C]">High Urgency</div>
                <div className="p-2 text-center text-[10px] font-semibold uppercase text-[#8C8C8C]">Medium</div>
                <div className="p-2 text-center text-[10px] font-semibold uppercase text-[#8C8C8C]">Low Urgency</div>
                
                {['High Impact', 'Medium', 'Low Impact'].map((rowLabel, rowIdx) => (
                  <>
                    <div key={`label-${rowIdx}`} className="p-3 text-[10px] font-semibold uppercase text-[#8C8C8C] flex items-center justify-center">
                      <span className="[writing-mode:vertical-rl] rotate-180">{rowLabel}</span>
                    </div>
                    {matrixData[rowIdx].map((count, colIdx) => (
                      <div
                        key={`cell-${rowIdx}-${colIdx}`}
                        className={cn("p-3.5 text-center rounded", matrixColors[rowIdx][colIdx])}
                      >
                        <div className="text-xl font-bold">{count}</div>
                        <div className="text-[9px] text-[#8C8C8C] mt-0.5">{matrixLabels[rowIdx][colIdx]}</div>
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
          <Card className="border-[#E8E8E8]">
            <CardHeader className="border-b border-[#E8E8E8] py-4 px-5">
              <CardTitle className="text-[15px] font-semibold">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex items-center gap-6">
                {/* Donut Chart */}
                <div className="relative w-[120px] h-[120px]">
                  <svg viewBox="0 0 120 120" className="w-full h-full">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#E8E8E8" strokeWidth="16" />
                    <circle
                      cx="60" cy="60" r="50" fill="none" stroke="#1565C0" strokeWidth="16"
                      strokeDasharray="51 263" strokeDashoffset="0"
                      transform="rotate(-90 60 60)"
                    />
                    <circle
                      cx="60" cy="60" r="50" fill="none" stroke="#7B1FA2" strokeWidth="16"
                      strokeDasharray="32 282" strokeDashoffset="-51"
                      transform="rotate(-90 60 60)"
                    />
                    <circle
                      cx="60" cy="60" r="50" fill="none" stroke="#E65100" strokeWidth="16"
                      strokeDasharray="17 297" strokeDashoffset="-83"
                      transform="rotate(-90 60 60)"
                    />
                    <circle
                      cx="60" cy="60" r="50" fill="none" stroke="#2E7D32" strokeWidth="16"
                      strokeDasharray="96 218" strokeDashoffset="-100"
                      transform="rotate(-90 60 60)"
                    />
                    <circle
                      cx="60" cy="60" r="50" fill="none" stroke="#616161" strokeWidth="16"
                      strokeDasharray="118 196" strokeDashoffset="-196"
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{total}</span>
                    <span className="text-[10px] text-[#8C8C8C]">Total</span>
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
          <Card className="border-[#E8E8E8]">
            <CardHeader className="border-b border-[#E8E8E8] py-4 px-5">
              <CardTitle className="text-[15px] font-semibold">Team Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 gap-3">
                {teamData.map((member) => (
                  <div
                    key={member.initials}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ backgroundColor: 'rgba(198, 156, 109, 0.1)' }}
                  >
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-semibold text-[#C69C6D]">
                      {member.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[13px] truncate">{member.name}</div>
                      <div className="text-[11px] text-[#8C8C8C]">{member.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-700">{member.resolved}</div>
                      <div className="text-[10px] text-[#8C8C8C]">Resolved</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
