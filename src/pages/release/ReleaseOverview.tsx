import { Link } from 'react-router-dom';
import { AlertCircle, Tag, BarChart3, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function ReleaseOverview() {
  const userName = 'User';

  // Fetch incident counts
  const { data: incidentStats } = useQuery({
    queryKey: ['release-overview-incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('id, priority, status')
        .is('deleted_at', null);
      
      if (error) throw error;
      
      const critical = (data || []).filter(i => i.priority === 'P1' && !['resolved', 'closed'].includes(i.status));
      return { criticalCount: critical.length };
    },
  });

  // Fetch release counts
  const { data: releaseStats } = useQuery({
    queryKey: ['release-overview-releases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('release_versions')
        .select('id, status');
      
      if (error) throw error;
      
      const overdue = (data || []).filter(r => r.status === 'overdue');
      return { overdueCount: overdue.length };
    },
  });

  const quickActions = [
    {
      icon: AlertCircle,
      title: 'Incidents',
      meta: `${incidentStats?.criticalCount ?? 0} open critical`,
      href: '/release/incidents',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
    },
    {
      icon: Tag,
      title: 'Releases',
      meta: `${releaseStats?.overdueCount ?? 0} overdue`,
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

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Page Header */}
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
                className="flex items-center gap-3.5 p-[18px] bg-card border border-border rounded-lg hover:border-brand-primary hover:shadow-sm transition-all"
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
