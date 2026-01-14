// ============================================================
// MONTHLY CHRONICLE VIEW - Editorial Strategic Review
// Dark hero with masthead, funnels, health grid, strategic items
// ============================================================

import { format } from 'date-fns';
import { 
  Lightbulb, FileText, Layers, Target, Rocket, 
  AlertTriangle, TestTube, Download, ArrowRight, TrendingDown
} from 'lucide-react';
import { sampleMonthlyData } from '../../data/insightsMockData';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

// Funnel component
function Funnel({ stages }: { stages: { label: string; value: number; highlight?: boolean }[] }) {
  return (
    <div className="flex items-center gap-2.5 p-6 bg-slate-50 rounded-lg">
      {stages.map((stage, i) => (
        <div key={stage.label} className="contents">
          <div className={cn(
            "flex-1 text-center py-4 px-3 bg-white border border-slate-200 rounded-lg",
            stage.highlight && "bg-emerald-50 border-emerald-400"
          )}>
            <div className={cn("text-[28px] font-extrabold leading-none", stage.highlight && "text-emerald-600")}>
              {stage.value}
            </div>
            <div className="text-[9px] font-semibold text-slate-500 uppercase mt-1.5">{stage.label}</div>
          </div>
          {i < stages.length - 1 && <ArrowRight className="text-slate-300 w-5 h-5 flex-shrink-0" />}
        </div>
      ))}
    </div>
  );
}

// Section header component
function SectionHeader({ icon: Icon, title, color }: { icon: any; title: string; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
    </div>
  );
}

// Strategic item component
function StrategicItem({ 
  id, 
  title, 
  meta, 
  project, 
  status, 
  progress, 
  iconBg, 
  icon: Icon 
}: { 
  id: string; 
  title: string; 
  meta: string; 
  project?: string; 
  status?: string; 
  progress?: number;
  iconBg: string;
  icon: any;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3.5 p-4 bg-white border border-slate-200 rounded-lg transition-all hover:translate-x-1 hover:shadow-sm",
      "border-l-4",
      status === 'on-track' && "border-l-emerald-500",
      status === 'at-risk' && "border-l-amber-500",
      status === 'converted' && "border-l-blue-500",
      status === 'approved' && "border-l-emerald-500",
      !status && "border-l-slate-300"
    )}>
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <div className="text-[15px] font-semibold text-slate-800">
          <span className="text-blue-600 cursor-pointer hover:underline">{id}</span> {title}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{meta}</div>
        {project && <div className="text-[11px] text-teal-600 font-medium mt-1">{project}</div>}
      </div>
      {progress !== undefined && (
        <div className={cn(
          "text-lg font-extrabold",
          progress >= 70 ? "text-emerald-600" : progress >= 50 ? "text-amber-600" : "text-red-600"
        )}>
          {progress}%
        </div>
      )}
    </div>
  );
}

export function MonthlyChronicleView() {
  const data = sampleMonthlyData;

  return (
    <ScrollArea className="h-full">
      <div className="min-h-full">
        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden m-6">
          
          {/* Chronicle Hero - Dark Gradient */}
          <div className="relative px-14 py-12 bg-gradient-to-br from-slate-900 to-[#1a2744] text-white overflow-hidden">
            {/* Radial overlays */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(37,99,235,0.15),transparent_50%),radial-gradient(circle_at_80%_50%,rgba(13,148,136,0.1),transparent_50%)]" />
            
            <div className="relative">
              {/* Masthead */}
              <div className="flex items-center justify-between mb-7 pb-4 border-b border-white/10">
                <div className="font-serif text-[26px] font-bold">Monthly Chronicle</div>
                <div className="flex items-center gap-3.5">
                  <span className="text-sm opacity-70">{data.period.month} {data.period.year} • Edition {data.period.edition}</span>
                  <span className="text-[9px] font-bold px-3 py-1.5 bg-emerald-500 rounded uppercase">Published</span>
                </div>
              </div>
              
              {/* Headline */}
              <h1 className="font-serif text-[32px] font-bold leading-tight mb-4">{data.headline}</h1>
              <p className="text-base opacity-85 leading-relaxed max-w-[720px]">{data.subhead}</p>
            </div>
          </div>

          {/* Chronicle Body */}
          <div className="p-8 space-y-10">
            
            {/* Ideas Hub Section */}
            <section>
              <SectionHeader icon={Lightbulb} title="Ideas Hub Activity" color="bg-amber-500" />
              <Funnel stages={[
                { label: 'Submitted', value: data.ideas.funnel.submitted },
                { label: 'Under Review', value: data.ideas.funnel.underReview },
                { label: 'Approved', value: data.ideas.funnel.approved },
                { label: 'Converted', value: data.ideas.funnel.converted, highlight: true },
              ]} />
              <div className="mt-4 space-y-3">
                {data.ideas.items.map(idea => (
                  <StrategicItem
                    key={idea.id}
                    id={idea.id}
                    title={idea.title}
                    meta={`Submitted by ${idea.submittedBy} • ${idea.votes} votes${idea.convertedTo ? ` → ${idea.convertedTo}` : ''}`}
                    project={idea.project}
                    status={idea.status}
                    iconBg="bg-amber-100 text-amber-600"
                    icon={Lightbulb}
                  />
                ))}
              </div>
            </section>

            {/* Business Requests Section */}
            <section>
              <SectionHeader icon={FileText} title="Business Requests Pipeline" color="bg-blue-600" />
              <Funnel stages={[
                { label: 'Submitted', value: data.businessRequests.funnel.submitted },
                { label: 'In Review', value: data.businessRequests.funnel.inReview },
                { label: 'Approved', value: data.businessRequests.funnel.approved },
                { label: 'Epics Created', value: data.businessRequests.funnel.epics, highlight: true },
              ]} />
              <div className="mt-4 space-y-3">
                {data.businessRequests.items.map(br => (
                  <StrategicItem
                    key={br.id}
                    id={br.id}
                    title={br.title}
                    meta={`Source: ${br.source} • Priority: ${br.priority}${br.epicId ? ` → Epic ${br.epicId}` : ''}`}
                    project={br.project}
                    iconBg="bg-blue-100 text-blue-600"
                    icon={FileText}
                  />
                ))}
              </div>
            </section>

            {/* Strategic Themes Section */}
            <section>
              <SectionHeader icon={Layers} title="Strategic Themes" color="bg-purple-600" />
              
              {/* Health Grid */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{data.themes.health.onTrack}/{data.themes.health.total}</div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase mt-1">Themes On Track</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{data.themes.objectives.onTrack}/{data.themes.objectives.total}</div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase mt-1">Objectives</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{data.themes.keyResults.onTrack}/{data.themes.keyResults.total}</div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase mt-1">Key Results</div>
                  <div className="text-[9px] text-red-600 font-medium mt-1">{data.themes.keyResults.atRisk} at risk</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-slate-700">{data.themes.risks.active}</div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase mt-1">Active Risks</div>
                  <div className="text-[9px] text-emerald-600 font-medium mt-1">{data.themes.risks.mitigated} mitigated</div>
                </div>
              </div>
              
              <div className="space-y-3">
                {data.themes.items.map(theme => (
                  <StrategicItem
                    key={theme.id}
                    id={theme.id}
                    title={theme.name}
                    meta={`${theme.objectives} objectives • ${theme.epics} epics`}
                    project={theme.projects.join(', ')}
                    status={theme.status}
                    progress={theme.progress}
                    iconBg="bg-purple-100 text-purple-600"
                    icon={Layers}
                  />
                ))}
              </div>
            </section>

            {/* OKR Progress Section */}
            <section>
              <SectionHeader icon={Target} title="OKR Progress" color="bg-teal-600" />
              <div className="space-y-3">
                {data.okrs.map(okr => (
                  <StrategicItem
                    key={okr.id}
                    id={okr.id}
                    title={okr.title}
                    meta={`${okr.keyResults} key results • Due ${format(okr.dueDate, 'MMM d')} • Owner: ${okr.owner}`}
                    project={okr.project}
                    status={okr.status}
                    progress={okr.progress}
                    iconBg="bg-teal-100 text-teal-600"
                    icon={Target}
                  />
                ))}
              </div>
            </section>

            {/* Releases Section */}
            <section>
              <SectionHeader icon={Rocket} title="Releases" color="bg-blue-600" />
              <div className="space-y-3">
                {data.releases.items.map(release => (
                  <StrategicItem
                    key={release.id}
                    id={release.id}
                    title={`${release.version} (${release.type})`}
                    meta={`${release.features} features • ${release.stories} stories • ${format(release.date, 'MMM d')}`}
                    project={release.projects.join(', ')}
                    iconBg="bg-blue-100 text-blue-600"
                    icon={Rocket}
                  />
                ))}
              </div>
            </section>

            {/* Incidents Section */}
            <section>
              <SectionHeader icon={AlertTriangle} title="Incident Summary" color="bg-amber-500" />
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg mb-4">
                <TrendingDown className="w-6 h-6 text-emerald-600" />
                <div>
                  <span className="text-lg font-bold text-emerald-600">{data.incidents.reductionPercent}%</span>
                  <span className="text-sm text-slate-600 ml-2">reduction in incidents this month</span>
                </div>
              </div>
              <div className="space-y-3">
                {data.incidents.items.map(incident => (
                  <StrategicItem
                    key={incident.id}
                    id={incident.id}
                    title={incident.title}
                    meta={`Severity: ${incident.severity} • Status: ${incident.status}${incident.mttr ? ` • MTTR: ${incident.mttr}` : ''}`}
                    project={incident.project}
                    iconBg="bg-amber-100 text-amber-600"
                    icon={AlertTriangle}
                  />
                ))}
              </div>
            </section>

            {/* Test Cycles Section */}
            <section>
              <SectionHeader icon={TestTube} title="Test Cycles" color="bg-teal-600" />
              
              {/* Test Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{data.testCycles.passRate}%</div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase mt-1">Pass Rate</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{data.testCycles.testsRun.toLocaleString()}</div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase mt-1">Tests Run</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{data.testCycles.defectsFound}</div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase mt-1">Defects Found</div>
                  <div className="text-[9px] text-emerald-600 font-medium mt-1">{data.testCycles.defectsFixed} fixed</div>
                </div>
              </div>
              
              <div className="space-y-3">
                {data.testCycles.items.map(cycle => (
                  <StrategicItem
                    key={cycle.id}
                    id={cycle.id}
                    title={cycle.name}
                    meta={`${cycle.testCases} test cases • Pass rate: ${cycle.passRate}% • QA Lead: ${cycle.qaLead}`}
                    project={cycle.project}
                    iconBg="bg-teal-100 text-teal-600"
                    icon={TestTube}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Chronicle Footer */}
          <div className="flex items-center justify-between px-8 py-5 border-t border-slate-200 bg-slate-50">
            <span className="text-xs text-slate-500">
              Published {format(new Date(), 'MMMM d, yyyy')} • Edition locked
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
      </div>
    </ScrollArea>
  );
}
