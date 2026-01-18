// ============================================================
// WEEKLY SUMMARY VIEW - Operational Dashboard
// Slate gradient header, KPI strip, 2-column card grid
// ============================================================

import { format } from 'date-fns';
import { 
  FileText, Download, Rocket, AlertTriangle, Bug, 
  GitBranch, FileCheck, Users, BarChart3, TrendingUp, TrendingDown
} from 'lucide-react';
import { sampleWeeklyData } from '../../data/insightsMockData';
import { useWeeklyInsightsData } from '../../hooks/useInsightsData';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'resolved': 'bg-emerald-100 text-emerald-700',
    'fixed': 'bg-emerald-100 text-emerald-700',
    'done': 'bg-emerald-100 text-emerald-700',
    'open': 'bg-slate-100 text-slate-600',
    'investigating': 'bg-amber-100 text-amber-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    'in-dev': 'bg-blue-100 text-blue-700',
    'in-qa': 'bg-purple-100 text-purple-700',
    'blocked': 'bg-red-100 text-red-700',
    'approved': 'bg-emerald-100 text-emerald-700',
    'pending': 'bg-amber-100 text-amber-700',
    'rejected': 'bg-red-100 text-red-700',
    'draft': 'bg-slate-100 text-slate-600',
  };
  
  return (
    <span className={cn(
      'px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase',
      styles[status] || 'bg-slate-100 text-slate-600'
    )}>
      {status.replace('-', ' ')}
    </span>
  );
}

export function WeeklySummaryView() {
  // Fetch real data from Supabase
  const { data: liveData, isLoading } = useWeeklyInsightsData();
  
  // Use mock data structure for display, overlay live counts
  const data = sampleWeeklyData;
  
  // Use live period or fallback
  const dateRange = liveData 
    ? `${format(liveData.period.start, 'MMM d')} - ${format(liveData.period.end, 'MMM d, yyyy')}`
    : `${format(data.period.start, 'MMM d')} - ${format(data.period.end, 'MMM d, yyyy')}`;
  
  // Merge live counts into display
  const storiesDelivered = liveData?.storiesCount ?? data.storiesDelivered;
  const releasesCount = liveData?.releasesCount ?? data.releases.length;
  const incidentsTotal = liveData?.incidentsCount ?? data.incidents.total;
  const defectsTotal = liveData?.defectsCount ?? data.defects.total;
  
  // Header KPIs
  const headerKPIs = [
    { label: 'Stories Delivered', value: data.storiesDelivered },
    { label: 'Test Pass Rate', value: '94%' },
    { label: 'Releases', value: data.releases.length },
  ];
  
  // KPI Strip data
  const kpiStrip = [
    { label: 'Stories Added', value: data.storiesAdded, trend: '+8%', trendUp: true, colorClass: 'text-slate-800' },
    { label: 'Stories Delivered', value: data.storiesDelivered, trend: '+12%', trendUp: true, colorClass: 'text-emerald-600', highlight: true },
    { label: 'Features Delivered', value: data.featuresDelivered, trend: '+5%', trendUp: true, colorClass: 'text-slate-800' },
    { label: 'Change Requests', value: data.changeRequests.total, trend: '-2', trendUp: false, colorClass: 'text-slate-800' },
    { label: 'Incidents', value: data.incidents.total, trend: '-25%', trendUp: true, colorClass: 'text-amber-600' },
    { label: 'QA Defects', value: data.defects.total, trend: '+3', trendUp: false, colorClass: 'text-red-600' },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-6 bg-slate-100 min-h-full">
        {/* Dashboard Header - Slate Gradient */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl px-8 py-6 text-white mb-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold mb-1">Weekly Summary</h1>
              <p className="text-sm opacity-90">{dateRange}</p>
            </div>
            <div className="flex gap-8">
              {headerKPIs.map(kpi => (
                <div key={kpi.label} className="text-center">
                  <div className="text-3xl font-extrabold">{kpi.value}</div>
                  <div className="text-[10px] uppercase tracking-wide opacity-85 mt-1">{kpi.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-6 gap-3 mb-5">
          {kpiStrip.map(kpi => (
            <div 
              key={kpi.label}
              className={cn(
                "bg-white rounded-lg p-4 border border-slate-200 text-center transition-all hover:-translate-y-0.5 hover:shadow-md",
                kpi.highlight && "border-emerald-400 bg-emerald-50"
              )}
            >
              <div className={cn("text-3xl font-extrabold", kpi.colorClass)}>{kpi.value}</div>
              <div className="text-[10px] font-semibold text-slate-500 uppercase mt-1.5">{kpi.label}</div>
              <div className={cn("text-[10px] font-semibold mt-1 flex items-center justify-center gap-1", kpi.trendUp ? "text-emerald-600" : "text-red-500")}>
                {kpi.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {kpi.trend}
              </div>
            </div>
          ))}
        </div>

        {/* Dashboard Grid - 2 columns */}
        <div className="grid grid-cols-2 gap-4">
          {/* Releases Card */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800">Releases</h3>
              </div>
              <span className="text-xs text-slate-500">{data.releases.length} this week</span>
            </div>
            <div className="p-4 space-y-3">
              {data.releases.map(release => (
                <div key={release.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs",
                    release.type === 'hotfix' ? 'bg-amber-500' : 'bg-blue-600'
                  )}>
                    {release.type === 'hotfix' ? 'HF' : 'PRD'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-800">
                      <span className="text-blue-600 cursor-pointer hover:underline">{release.id}</span>
                      {' '}{release.version}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {release.project} • {format(release.deployedAt, 'MMM d, h:mm a')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">{release.features} features, {release.stories} stories</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Incidents Card */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-800">Incidents</h3>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-red-600 font-semibold">SEV1: {data.incidents.sev1}</span>
                <span className="text-amber-600 font-semibold">SEV2: {data.incidents.sev2}</span>
                <span className="text-blue-600 font-semibold">SEV3: {data.incidents.sev3}</span>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {data.incidentItems.map(incident => (
                <div key={incident.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full flex-shrink-0",
                    incident.severity === 'sev1' && "bg-red-500 animate-pulse",
                    incident.severity === 'sev2' && "bg-amber-500",
                    incident.severity === 'sev3' && "bg-blue-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">
                      <span className="text-blue-600 cursor-pointer hover:underline">{incident.id}</span>
                      {' '}{incident.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{incident.project} • {incident.assignee}</div>
                  </div>
                  <StatusBadge status={incident.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Defects Card */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-slate-800">QA Defects</h3>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-red-600 font-semibold">Critical: {data.defects.critical}</span>
                <span className="text-amber-600 font-semibold">Major: {data.defects.major}</span>
                <span className="text-teal-600 font-semibold">Minor: {data.defects.minor}</span>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {data.defectItems.map(defect => (
                <div key={defect.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full flex-shrink-0",
                    defect.severity === 'critical' && "bg-red-500",
                    defect.severity === 'major' && "bg-amber-500",
                    defect.severity === 'minor' && "bg-teal-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">
                      <span className="text-blue-600 cursor-pointer hover:underline">{defect.id}</span>
                      {' '}{defect.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{defect.project} • {defect.assignee}</div>
                  </div>
                  <StatusBadge status={defect.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Features Card */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-800">Feature Status</h3>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-emerald-600 font-semibold">Done: {data.features.filter(f => f.status === 'done').length}</span>
                <span className="text-blue-600 font-semibold">In Dev: {data.features.filter(f => f.status === 'in-dev').length}</span>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {data.features.map(feature => (
                <div key={feature.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800">
                      <span className="text-blue-600 cursor-pointer hover:underline">{feature.id}</span>
                      {' '}{feature.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {feature.storiesCompleted}/{feature.storiesTotal} stories
                    </div>
                  </div>
                  <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full" 
                      style={{ width: `${(feature.storiesCompleted / feature.storiesTotal) * 100}%` }} 
                    />
                  </div>
                  <StatusBadge status={feature.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Team Subtasks - Full Width */}
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800">Team Subtasks</h3>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {data.teamMembers.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
                  <div 
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ background: member.color }}
                  >
                    {member.initials}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-800 hover:text-blue-600 cursor-pointer">{member.name}</div>
                    <div className="text-xs text-slate-500">{member.storiesAssigned.length} stories • {member.storiesAssigned.slice(0, 3).join(', ')}...</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-base font-bold text-emerald-600">{member.subtasksDone}</div>
                      <div className="text-[9px] text-slate-500 uppercase">Done</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base font-bold text-slate-800">{member.subtasksActive}</div>
                      <div className="text-[9px] text-slate-500 uppercase">Active</div>
                    </div>
                    <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", member.completionPercent >= 70 ? "bg-emerald-500" : "bg-amber-500")}
                        style={{ width: `${member.completionPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Project Performance - Full Width */}
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-800">Project Performance</h3>
              </div>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200">
                  <th className="text-left p-3 text-[10px] font-bold uppercase text-slate-500">Project</th>
                  <th className="text-center p-3 text-[10px] font-bold uppercase text-slate-500">Features</th>
                  <th className="text-center p-3 text-[10px] font-bold uppercase text-slate-500">Stories</th>
                  <th className="text-center p-3 text-[10px] font-bold uppercase text-slate-500">Defects</th>
                  <th className="text-center p-3 text-[10px] font-bold uppercase text-slate-500">Tests</th>
                  <th className="text-center p-3 text-[10px] font-bold uppercase text-slate-500">Incidents</th>
                </tr>
              </thead>
              <tbody>
                {data.projectPerformance.map(project => (
                  <tr key={project.id} className="hover:bg-slate-50 border-b border-slate-100">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: project.color }} />
                        <span className="font-semibold text-slate-800 hover:text-blue-600 cursor-pointer">{project.name}</span>
                      </div>
                    </td>
                    <td className="text-center font-bold text-slate-700">{project.features}</td>
                    <td className="text-center font-bold text-emerald-600">{project.storiesDelivered}</td>
                    <td className={cn("text-center font-bold", project.defectsTracked > 2 ? "text-amber-600" : "text-slate-700")}>
                      {project.defectsTracked}
                    </td>
                    <td className="text-center font-bold text-slate-700">{project.testsExecuted}</td>
                    <td className={cn("text-center font-bold", project.incidentsResolved === 0 ? "text-emerald-600" : "text-slate-700")}>
                      {project.incidentsResolved}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="p-3.5 font-extrabold text-slate-800">TOTAL</td>
                  <td className="text-center font-extrabold text-lg">{data.projectPerformance.reduce((a, p) => a + p.features, 0)}</td>
                  <td className="text-center font-extrabold text-lg text-emerald-600">{data.projectPerformance.reduce((a, p) => a + p.storiesDelivered, 0)}</td>
                  <td className="text-center font-extrabold text-lg text-amber-600">{data.projectPerformance.reduce((a, p) => a + p.defectsTracked, 0)}</td>
                  <td className="text-center font-extrabold text-lg">{data.projectPerformance.reduce((a, p) => a + p.testsExecuted, 0)}</td>
                  <td className="text-center font-extrabold text-lg text-emerald-600">{data.projectPerformance.reduce((a, p) => a + p.incidentsResolved, 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
          <span className="text-xs text-slate-500">
            Generated {format(new Date(), 'MMM d, yyyy')} at {format(new Date(), 'h:mm a')}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <FileText className="w-4 h-4" />
              Excel
            </Button>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
