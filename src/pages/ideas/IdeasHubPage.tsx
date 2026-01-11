// ============================================================
// IDEAS HUB - DASHBOARD PAGE
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lightbulb, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Plus,
  ArrowRight,
  Sparkles,
  Target,
  Users,
  BarChart3,
  Rocket,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useIdeasHubMetrics, useTopImprovementIdeas, useImprovementInitiatives } from '@/hooks/useImprovementIdeas';
import { IdeasHubMetricCard } from '@/components/ideas/IdeasHubMetricCard';
import { TopIdeasList } from '@/components/ideas/TopIdeasList';
import { ActiveInitiativesList } from '@/components/ideas/ActiveInitiativesList';
import { IDEA_STATUS_LABELS, INITIATIVE_STATUS_LABELS } from '@/types/improvement-ideas';

export default function IdeasHubPage() {
  const navigate = useNavigate();
  const { data: metrics, isLoading: metricsLoading } = useIdeasHubMetrics();
  const { data: topIdeas, isLoading: topIdeasLoading } = useTopImprovementIdeas(5);
  const { data: initiatives, isLoading: initiativesLoading } = useImprovementInitiatives();

  const activeInitiatives = initiatives?.filter(i => 
    ['active', 'collecting', 'evaluating'].includes(i.status)
  ) || [];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Ideas Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Capture, evaluate, and transform improvement ideas into actionable initiatives
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/industry/ideas/all')}
          >
            View All Ideas
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button onClick={() => navigate('/industry/ideas/submit')}>
            <Plus className="mr-2 h-4 w-4" />
            Submit Idea
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <IdeasHubMetricCard
          title="Total Ideas"
          value={metrics?.totalIdeas ?? 0}
          icon={Lightbulb}
          loading={metricsLoading}
          trend="+12% this month"
          trendUp
        />
        <IdeasHubMetricCard
          title="Pending Review"
          value={metrics?.pendingReview ?? 0}
          icon={Clock}
          loading={metricsLoading}
          variant="warning"
        />
        <IdeasHubMetricCard
          title="Quick Wins Pending"
          value={metrics?.quickWinsPending ?? 0}
          icon={Rocket}
          loading={metricsLoading}
          variant="success"
        />
        <IdeasHubMetricCard
          title="Strategic Ideas"
          value={metrics?.strategicIdeas ?? 0}
          icon={Layers}
          loading={metricsLoading}
        />
        <IdeasHubMetricCard
          title="Avg Impact Score"
          value={metrics?.avgImpactScore?.toFixed(1) ?? '0.0'}
          icon={Target}
          loading={metricsLoading}
          suffix="/5"
        />
        <IdeasHubMetricCard
          title="Conversion Rate"
          value={metrics?.conversionRate ?? 0}
          icon={TrendingUp}
          loading={metricsLoading}
          suffix="%"
          variant="success"
        />
        <IdeasHubMetricCard
          title="Active Initiatives"
          value={metrics?.activeInitiatives ?? 0}
          icon={CheckCircle2}
          loading={metricsLoading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Ideas - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Top Voted Ideas
              </CardTitle>
              <CardDescription>
                Ideas with the highest community support
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/industry/ideas/all?sort=votes')}
            >
              See all
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <TopIdeasList 
              ideas={topIdeas || []} 
              loading={topIdeasLoading}
              onIdeaClick={(id) => navigate(`/industry/ideas/${id}`)}
            />
          </CardContent>
        </Card>

        {/* Active Initiatives */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Active Initiatives
              </CardTitle>
              <CardDescription>
                Ongoing idea collection campaigns
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/industry/ideas/initiatives')}
            >
              Manage
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <ActiveInitiativesList 
              initiatives={activeInitiatives}
              loading={initiativesLoading}
              onInitiativeClick={(id) => navigate(`/industry/ideas/initiatives/${id}`)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions / CTA Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate('/industry/ideas/submit')}
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lightbulb className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Submit an Idea</h3>
              <p className="text-sm text-muted-foreground">Share your improvement suggestion</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate('/industry/ideas/scoring')}
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Target className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Score Ideas</h3>
              <p className="text-sm text-muted-foreground">Evaluate pending submissions</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate('/industry/ideas/matrix')}
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Priority Matrix</h3>
              <p className="text-sm text-muted-foreground">View impact vs effort analysis</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
