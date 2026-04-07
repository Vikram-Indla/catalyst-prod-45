// ============================================================
// MONTHLY CHRONICLE VIEW - Editorial Strategic Review
// Uses ONLY real data from database - NO MOCK DATA
// ============================================================

import { format } from 'date-fns';
import { 
  FileText, Rocket, AlertTriangle, TestTube, Download, 
  ArrowRight, TrendingDown, Inbox, BarChart3
} from 'lucide-react';
import { useMonthlyInsightsData } from '../../hooks/useInsightsData';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

// Section header component
function SectionHeader({ icon: Icon, title, color }: { icon: any; title: string; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h2 className="text-lg font-bold text-slate-800 dark:text-[#EDEDED]">{title}</h2>
    </div>
  );
}

// Empty state component
function EmptyState({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-[#878787] bg-slate-50 dark:bg-[#111111] rounded-lg">
      <Inbox className="w-8 h-8 mb-2" />
      <p className="text-sm">No {title} this month</p>
    </div>
  );
}

// Item card component
function ItemCard({ 
  id, 
  title, 
  meta, 
  iconBg, 
  icon: Icon,
  status,
}: { 
  id: string; 
  title: string; 
  meta: string; 
  iconBg: string;
  icon: any;
  status?: string;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3.5 p-4 bg-white dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2E2E2E] rounded-lg transition-all hover:translate-x-1 hover:shadow-sm",
      "border-l-4",
      status === 'completed' && "border-l-emerald-500",
      status === 'in_progress' && "border-l-blue-500",
      status === 'planned' && "border-l-amber-500",
      !status && "border-l-slate-300"
    )}>
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <div className="text-[15px] font-semibold text-slate-800 dark:text-[#EDEDED]">
          {id && <span className="text-blue-600 cursor-pointer hover:underline mr-2">{id}</span>}
          {title}
        </div>
        <div className="text-xs text-slate-500 dark:text-[#878787] mt-0.5">{meta}</div>
      </div>
    </div>
  );
}

export function MonthlyChronicleView() {
  const { data, isLoading, error } = useMonthlyInsightsData();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-48 w-full" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-slate-500 dark:text-[#878787]">
        <AlertTriangle className="w-12 h-12 mb-4 text-amber-500" />
        <p>Failed to load monthly insights data</p>
      </div>
    );
  }

  const { period, releases, incidents, businessRequests, testCycles } = data;

  return (
    <ScrollArea className="h-full">
      <div className="min-h-full">
        {/* Main Card */}
        <div className="bg-white dark:bg-[#1A1A1A] rounded-xl shadow-md border border-slate-200 dark:border-[#2E2E2E] overflow-hidden m-6">
          
          {/* Chronicle Hero - Dark Gradient */}
          <div className="relative px-14 py-12 bg-gradient-to-br from-slate-900 to-[#1a2744] text-white overflow-hidden">
            {/* Radial overlays */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(37,99,235,0.15),transparent_50%),radial-gradient(circle_at_80%_50%,rgba(13,148,136,0.1),transparent_50%)]" />
            
            <div className="relative">
              {/* Masthead */}
              <div className="flex items-center justify-between mb-7 pb-4 border-b border-white/10">
                <div className="font-serif text-[26px] font-bold">Monthly Chronicle</div>
                <div className="flex items-center gap-3.5">
                  <span className="text-sm opacity-70">{period.month} {period.year}</span>
                </div>
              </div>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-extrabold">{releases.length}</div>
                  <div className="text-sm opacity-75 mt-1">Releases</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-extrabold">{incidents.length}</div>
                  <div className="text-sm opacity-75 mt-1">Incidents</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-extrabold">{businessRequests.length}</div>
                  <div className="text-sm opacity-75 mt-1">Business Requests</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-extrabold">{testCycles.length}</div>
                  <div className="text-sm opacity-75 mt-1">Test Cycles</div>
                </div>
              </div>
            </div>
          </div>

          {/* Chronicle Body */}
          <div className="p-8 space-y-10">
            
            {/* Business Requests Section */}
            <section>
              <SectionHeader icon={FileText} title="Business Requests" color="bg-blue-600" />
              {businessRequests.length === 0 ? (
                <EmptyState title="business requests" />
              ) : (
                <div className="space-y-3">
                  {businessRequests.slice(0, 5).map((br: any) => (
                    <ItemCard
                      key={br.id}
                      id={br.id?.slice(0, 8)}
                      title={br.title}
                      meta={`Process Step: ${br.process_step || 'Unknown'} • Created ${format(new Date(br.created_at), 'MMM d')}`}
                      iconBg="bg-blue-100 text-blue-600"
                      icon={FileText}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Releases Section */}
            <section>
              <SectionHeader icon={Rocket} title="Releases" color="bg-emerald-600" />
              {releases.length === 0 ? (
                <EmptyState title="releases" />
              ) : (
                <div className="space-y-3">
                  {releases.slice(0, 5).map((release: any) => (
                    <ItemCard
                      key={release.id}
                      id={release.version || release.name}
                      title={release.name || 'Release'}
                      meta={`Status: ${release.status || 'Unknown'} • ${release.release_date ? format(new Date(release.release_date), 'MMM d, yyyy') : 'No date'}`}
                      iconBg="bg-emerald-100 text-emerald-600"
                      icon={Rocket}
                      status={release.status}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Incidents Section */}
            <section>
              <SectionHeader icon={AlertTriangle} title="Incidents" color="bg-amber-500" />
              {incidents.length === 0 ? (
                <EmptyState title="incidents" />
              ) : (
                <div className="space-y-3">
                  {incidents.slice(0, 5).map((incident: any) => (
                    <ItemCard
                      key={incident.id}
                      id={incident.id?.slice(0, 8)}
                      title={incident.title}
                      meta={`Severity: ${incident.severity || 'Unknown'} • Status: ${incident.status || 'Unknown'}`}
                      iconBg="bg-amber-100 text-amber-600"
                      icon={AlertTriangle}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Test Cycles Section */}
            <section>
              <SectionHeader icon={TestTube} title="Test Cycles" color="bg-teal-600" />
              {testCycles.length === 0 ? (
                <EmptyState title="test cycles" />
              ) : (
                <div className="space-y-3">
                  {testCycles.slice(0, 5).map((cycle: any) => (
                    <ItemCard
                      key={cycle.id}
                      id={cycle.id?.slice(0, 8)}
                      title={cycle.name}
                      meta={`Status: ${cycle.status || 'Unknown'} • Created ${format(new Date(cycle.created_at), 'MMM d')}`}
                      iconBg="bg-teal-100 text-teal-600"
                      icon={TestTube}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Chronicle Footer */}
          <div className="flex items-center justify-between px-8 py-5 border-t border-slate-200 dark:border-[#2E2E2E] bg-slate-50 dark:bg-[#111111]">
            <span className="text-xs text-slate-500 dark:text-[#878787]">
              Data as of {format(new Date(), 'MMMM d, yyyy h:mm a')}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
