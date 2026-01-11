// ============================================================
// IDEAS HUB - ELEVATED DASHBOARD PAGE (9.8/10 Target)
// Competitive with Linear, Notion, Asana
// ============================================================

import { useNavigate } from 'react-router-dom';
import { 
  Lightbulb, 
  TrendingUp, 
  Zap, 
  Target,
  BarChart3,
  Layers,
  Plus,
  ArrowRight,
  Users,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useIdeasHubMetrics, useTopImprovementIdeas, useImprovementInitiatives, useImprovementIdeas } from '@/hooks/useImprovementIdeas';
import { 
  PageHeader, 
  Kbd,
  StatCard, 
  QuickWinQueue,
  TypeBadge,
  ConversionFunnel,
  ActivityFeed
} from '@/components/ideas/elevated';
import { IDEA_CATEGORY_LABELS, INITIATIVE_STATUS_LABELS } from '@/types/improvement-ideas';

export default function IdeasHubPageElevated() {
  const navigate = useNavigate();
  const { data: metrics, isLoading: metricsLoading } = useIdeasHubMetrics();
  const { data: topIdeas, isLoading: topIdeasLoading } = useTopImprovementIdeas(5);
  const { data: initiatives, isLoading: initiativesLoading } = useImprovementInitiatives();
  const { data: allIdeas } = useImprovementIdeas();

  const activeInitiatives = initiatives?.filter(i => 
    ['active', 'collecting', 'evaluating'].includes(i.status)
  ) || [];

  // Get quick wins pending approval
  const quickWinsPending = allIdeas?.filter(
    idea => idea.idea_type === 'quick_win' && idea.status === 'quick_win_approved'
  ) || [];

  const quickWinItems = quickWinsPending.map(idea => ({
    id: idea.id,
    title: idea.title,
    category: IDEA_CATEGORY_LABELS[idea.category],
    votes: idea.for_votes,
    impactScore: idea.impact_score?.calculated_score 
      ? (idea.impact_score.calculated_score > 5 ? idea.impact_score.calculated_score / 20 : idea.impact_score.calculated_score)
      : 0,
  }));

  // Calculate funnel data
  const totalSubmitted = allIdeas?.length || 0;
  const totalTriaged = allIdeas?.filter(i => i.triaged_at).length || 0;
  const quickWinsCount = allIdeas?.filter(i => i.idea_type === 'quick_win').length || 0;
  const strategicCount = allIdeas?.filter(i => i.idea_type === 'strategic').length || 0;
  const convertedCount = allIdeas?.filter(i => i.status === 'converted').length || 0;

  const funnelData = {
    submitted: totalSubmitted,
    triaged: totalTriaged,
    quickWins: quickWinsCount,
    strategic: strategicCount,
    converted: convertedCount,
    conversionRate: totalSubmitted > 0 ? Math.round((convertedCount / totalSubmitted) * 100) : 0,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 lg:p-10 max-w-[1600px] mx-auto">
        {/* Header */}
        <PageHeader
          icon={Lightbulb}
          title="Ideas Hub"
          subtitle="Capture, evaluate, and transform improvement ideas into initiatives"
          className="mb-8"
          actions={
            <>
              <Button 
                variant="outline" 
                onClick={() => navigate('/industry/ideas/all')}
                className="gap-2 border-slate-200 bg-white hover:bg-slate-50"
              >
                View All <Kbd>G</Kbd>
              </Button>
              <Button 
                onClick={() => navigate('/industry/ideas/submit')}
                className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/25"
              >
                <Plus className="w-4 h-4" />
                Submit Idea <Kbd>N</Kbd>
              </Button>
            </>
          }
        />

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Ideas"
            value={metrics?.totalIdeas ?? 0}
            icon={Lightbulb}
            loading={metricsLoading}
            trend="+12% this month"
            trendUp
            variant="blue"
          />
          <StatCard
            label="Quick Wins Ready"
            value={metrics?.quickWinsPending ?? 0}
            icon={Zap}
            loading={metricsLoading}
            subtext="Awaiting approval"
            variant="green"
          />
          <StatCard
            label="Avg IMPACT Score"
            value={metrics?.avgImpactScore?.toFixed(1) ?? '0.0'}
            icon={Target}
            loading={metricsLoading}
            suffix="/5"
            variant="teal"
          />
          <StatCard
            label="Conversion Rate"
            value={metrics?.conversionRate ?? 0}
            icon={TrendingUp}
            loading={metricsLoading}
            suffix="%"
            variant="orange"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Win Queue - Hero Section */}
            <QuickWinQueue
              items={quickWinItems}
              loading={metricsLoading}
              onApprove={(id) => navigate(`/industry/ideas/${id}`)}
              onViewAll={() => navigate('/industry/ideas/all?type=quick_win')}
              onItemClick={(id) => navigate(`/industry/ideas/${id}`)}
            />

            {/* Top Priority Ideas */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Top Priority Ideas
                  </CardTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-slate-500 hover:text-blue-600"
                  onClick={() => navigate('/industry/ideas/all?sort=votes')}
                >
                  See all
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </CardHeader>
              <CardContent className="pt-2">
                {topIdeasLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : topIdeas?.length === 0 ? (
                  <div className="py-12 text-center">
                    <Lightbulb className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No ideas yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topIdeas?.map(idea => {
                      const ideaType = idea.idea_type || 'standard';
                      return (
                        <div
                          key={idea.id}
                          onClick={() => navigate(`/industry/ideas/${idea.id}`)}
                          className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
                        >
                          {ideaType !== 'standard' && (
                            <TypeBadge type={ideaType as any} size="sm" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                              {idea.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-400">
                                {IDEA_CATEGORY_LABELS[idea.category]}
                              </span>
                              {idea.initiative && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-xs text-purple-600">{idea.initiative.title}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-emerald-600">
                            <span className="text-sm font-semibold">{idea.for_votes}</span>
                            <span className="text-xs text-slate-400">votes</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickActionCard
                icon={Lightbulb}
                title="Submit an Idea"
                description="Share your improvement suggestion"
                color="yellow"
                onClick={() => navigate('/industry/ideas/submit')}
              />
              <QuickActionCard
                icon={Target}
                title="Score Ideas"
                description={`${metrics?.pendingReview || 0} ideas pending`}
                color="orange"
                onClick={() => navigate('/industry/ideas/scoring')}
              />
              <QuickActionCard
                icon={BarChart3}
                title="Priority Matrix"
                description="View impact vs effort"
                color="blue"
                onClick={() => navigate('/industry/ideas/matrix')}
              />
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Conversion Funnel Mini */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <ConversionFunnel 
                  steps={[
                    { label: 'Submitted', value: funnelData.submitted, percentage: 100, color: 'gray' as const },
                    { label: 'Triaged', value: funnelData.triaged, percentage: funnelData.submitted > 0 ? Math.round((funnelData.triaged / funnelData.submitted) * 100) : 0, color: 'warning' as const },
                    { label: 'Approved', value: funnelData.quickWins + funnelData.strategic, percentage: funnelData.submitted > 0 ? Math.round(((funnelData.quickWins + funnelData.strategic) / funnelData.submitted) * 100) : 0, color: 'primary' as const },
                    { label: 'Converted', value: funnelData.converted, percentage: funnelData.conversionRate, color: 'success' as const },
                  ]}
                />
              </CardContent>
            </Card>

            {/* Active Initiatives */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-500" />
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Active Initiatives
                  </CardTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-xs"
                  onClick={() => navigate('/industry/ideas/initiatives')}
                >
                  Manage
                </Button>
              </CardHeader>
              <CardContent>
                {initiativesLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                  </div>
                ) : activeInitiatives.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">No active initiatives</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeInitiatives.slice(0, 3).map(initiative => (
                      <div
                        key={initiative.id}
                        onClick={() => navigate(`/industry/ideas/initiatives/${initiative.id}`)}
                        className="p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-slate-900 truncate">
                            {initiative.title}
                          </h4>
                          <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-100">
                            {INITIATIVE_STATUS_LABELS[initiative.status]}
                          </Badge>
                        </div>
                        <Progress value={65} className="h-1.5 mb-2" />
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>{initiative.ideas_count || 0} ideas</span>
                          <span>{initiative.total_votes || 0} votes</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Feed */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-xs"
                  onClick={() => navigate('/industry/ideas/all')}
                >
                  View all
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <ActivityFeed
                  items={[
                    { id: '1', user: { name: 'Ahmed M.', initials: 'AM' }, action: 'submitted', target: 'Automate compliance checks', badge: { label: 'New', variant: 'created' }, timestamp: new Date(Date.now() - 3600000) },
                    { id: '2', user: { name: 'Sarah K.', initials: 'SK' }, action: 'voted on', target: 'Mobile app for approvals', badge: { label: 'Voted', variant: 'voted' }, timestamp: new Date(Date.now() - 7200000) },
                    { id: '3', user: { name: 'System', initials: 'SY' }, action: 'converted', target: 'Export report enhancement', badge: { label: 'Converted', variant: 'converted' }, timestamp: new Date(Date.now() - 10800000) },
                  ]}
                  loading={false}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick Action Card Component
function QuickActionCard({
  icon: Icon,
  title,
  description,
  color,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: 'yellow' | 'orange' | 'blue';
  onClick: () => void;
}) {
  const colorStyles = {
    yellow: 'from-amber-400/10 to-amber-500/5 border-amber-200/50 hover:border-amber-300 group-hover:from-amber-400/20',
    orange: 'from-orange-400/10 to-orange-500/5 border-orange-200/50 hover:border-orange-300 group-hover:from-orange-400/20',
    blue: 'from-blue-400/10 to-blue-500/5 border-blue-200/50 hover:border-blue-300 group-hover:from-blue-400/20',
  };

  const iconColors = {
    yellow: 'bg-amber-100 text-amber-600',
    orange: 'bg-orange-100 text-orange-600',
    blue: 'bg-blue-100 text-blue-600',
  };

  return (
    <Card 
      onClick={onClick}
      className={`bg-gradient-to-br ${colorStyles[color]} cursor-pointer group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
    >
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`w-12 h-12 rounded-xl ${iconColors[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
