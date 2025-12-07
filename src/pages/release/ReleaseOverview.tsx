import { Link } from 'react-router-dom';
import { AlertCircle, Tag, BarChart3, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import incidentsData from '@/data/incidents.json';
import releasesData from '@/data/releases.json';
import type { Incident, Release } from '@/types/release';

const incidents = (incidentsData as { incidents: Incident[] }).incidents;
const releases = (releasesData as { versions: Release[] }).versions;

const quickActions = [
  {
    icon: AlertCircle,
    title: 'Incidents',
    meta: `${incidents.filter((i) => i.priority === 'critical' && i.status === 'open').length} open critical`,
    href: '/release/incidents',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
  },
  {
    icon: Tag,
    title: 'Releases',
    meta: `${releases.filter((r) => r.status === 'overdue').length} overdue`,
    href: '/release/versions',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    icon: BarChart3,
    title: 'Dashboard',
    meta: 'View metrics',
    href: '/release/incidents/dashboard',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: BookOpen,
    title: 'Knowledge Hub',
    meta: 'Documentation',
    href: '#',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
  },
];

export default function ReleaseOverview() {
  const userName = 'Vikram';

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Page Header - 72px height to align with sidebar */}
      <div className="h-[72px] px-6 md:px-8 border-b border-border flex items-center shrink-0 bg-card">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Welcome back, {userName}</h1>
          <p className="text-sm text-muted-foreground">Here's what's happening across your products</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 md:p-8">
        {/* Quick Actions */}
        <section>
          <h2 className="text-base font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                to={action.href}
                className="flex items-center gap-3.5 p-[18px] bg-card border border-border rounded-lg hover:border-brand-gold hover:shadow-sm transition-all"
              >
                <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center", action.iconBg)}>
                  <action.icon className={cn("w-5 h-5", action.iconColor)} />
                </div>
                <div>
                  <div className="font-semibold text-sm">{action.title}</div>
                  <div className="text-[13px] text-muted-foreground">{action.meta}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
