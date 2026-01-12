// ============================================================
// IDEAS HUB - COMPLETE REBUILD (9.8/10 Target)
// World-class command center for Improvement Ideas
// Benchmarked against: Linear, Notion, Asana
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, List } from 'lucide-react';
import { SubmitIdeaModalRebuilt } from '@/components/ideas/elevated';
import { Button } from '@/components/ui/button';
import { 
  useIdeasHubMetrics, 
  useTopImprovementIdeas, 
  useImprovementInitiatives, 
  useImprovementIdeas 
} from '@/hooks/useImprovementIdeas';
import { useConvertIdeaToBR } from '@/hooks/ideas/useConvertToBR';
import { useToast } from '@/hooks/use-toast';
import { 
  Kbd,
  IdeasStatsGrid,
  QuickWinQueue,
  TopPriorityIdeas,
  QuickActionsGrid,
  ActiveInitiativesList,
  RecentActivityFeed,
  ConversionFunnel,
} from '@/components/ideas/elevated';
import { IDEA_CATEGORY_LABELS } from '@/types/improvement-ideas';
import { PageChrome } from '@/components/layout/PageChrome';

export default function IdeasHubPageRebuilt() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  
  const { data: metrics, isLoading: metricsLoading } = useIdeasHubMetrics();
  const { data: topIdeas, isLoading: topIdeasLoading } = useTopImprovementIdeas(5);
  const { data: initiatives, isLoading: initiativesLoading } = useImprovementInitiatives();
  const { data: allIdeas, isLoading: ideasLoading } = useImprovementIdeas();
  const convertToBR = useConvertIdeaToBR();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as Element)?.tagName);
      if (isInput) return;

      if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowSubmitModal(true);
      }
      if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        navigate('/industry/ideas/all');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Active initiatives
  const activeInitiatives = useMemo(() => 
    initiatives?.filter(i => ['active', 'collecting', 'evaluating'].includes(i.status)) || [],
    [initiatives]
  );

  // Quick wins pending approval
  const quickWinItems = useMemo(() => {
    const quickWins = allIdeas?.filter(
      idea => idea.idea_type === 'quick_win' && ['triaged', 'quick_win_approved'].includes(idea.status)
    ) || [];
    
    return quickWins
      .sort((a, b) => (b.impact_score?.calculated_score || 0) - (a.impact_score?.calculated_score || 0))
      .slice(0, 5)
      .map(idea => ({
        id: idea.id,
        title: idea.title,
        category: IDEA_CATEGORY_LABELS[idea.category] || idea.category,
        votes: idea.for_votes,
        impactScore: idea.impact_score?.calculated_score 
          ? (idea.impact_score.calculated_score > 5 ? idea.impact_score.calculated_score / 20 : idea.impact_score.calculated_score)
          : 0,
      }));
  }, [allIdeas]);

  // Top priority ideas for display
  const topPriorityIdeas = useMemo(() => 
    (topIdeas || []).map(idea => ({
      id: idea.id,
      title: idea.title,
      category: IDEA_CATEGORY_LABELS[idea.category] || idea.category,
      idea_type: idea.idea_type || 'standard',
      for_votes: idea.for_votes,
      impactScore: idea.impact_score?.calculated_score,
    })),
    [topIdeas]
  );

  // Funnel stats
  const funnelStats = useMemo(() => {
    const ideas = allIdeas || [];
    const total = ideas.length;
    const triaged = ideas.filter(i => i.triaged_at).length;
    const approved = ideas.filter(i => ['approved', 'quick_win_approved', 'converted'].includes(i.status)).length;
    const converted = ideas.filter(i => i.status === 'converted').length;
    
    return {
      submitted: total,
      triaged,
      approved,
      converted,
    };
  }, [allIdeas]);

  // Pending scoring count
  const pendingScoring = useMemo(() => 
    allIdeas?.filter(i => i.status === 'submitted' && !i.impact_score).length || 0,
    [allIdeas]
  );

  // Mock recent activities (replace with real data hook)
  const recentActivities = [
    { 
      id: '1', 
      user_name: 'Ahmed M.', 
      action_type: 'submitted' as const, 
      details: { title: 'Automate compliance checks' }, 
      created_at: new Date(Date.now() - 3600000).toISOString() 
    },
    { 
      id: '2', 
      user_name: 'Sarah K.', 
      action_type: 'voted' as const, 
      details: { count: 3 }, 
      created_at: new Date(Date.now() - 7200000).toISOString() 
    },
    { 
      id: '3', 
      user_name: 'System', 
      action_type: 'converted' as const, 
      details: { title: 'Export report enhancement' }, 
      created_at: new Date(Date.now() - 10800000).toISOString() 
    },
    { 
      id: '4', 
      user_name: 'Mohammed R.', 
      action_type: 'triaged' as const, 
      details: { type: 'Quick Win' }, 
      created_at: new Date(Date.now() - 14400000).toISOString() 
    },
  ];

  // Handle quick win approval
  const handleApprove = async (ideaId: string) => {
    // Find the idea to get title/description
    const idea = allIdeas?.find(i => i.id === ideaId);
    if (!idea) {
      toast({
        title: "Error",
        description: "Idea not found",
        variant: "destructive"
      });
      return;
    }

    try {
      await convertToBR.mutateAsync({ 
        ideaId,
        brTitle: idea.title,
        brDescription: idea.description,
        brJustification: `Quick Win converted from Ideas Hub (${idea.code || ideaId})`,
        brPriority: 'medium',
        conversionNotes: 'Auto-approved as Quick Win from Ideas Hub',
      });
      toast({
        title: "Success!",
        description: "Quick Win approved and Business Request created.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve idea. Please try again.",
        variant: "destructive"
      });
    }
  };

  const isLoading = metricsLoading || ideasLoading;

  const headerActions = (
    <>
      <Button 
        variant="outline" 
        onClick={() => navigate('/industry/ideas/all')}
        className="gap-2 border-slate-200 bg-white hover:bg-slate-50 group h-8 text-sm"
      >
        <List className="w-4 h-4" />
        View All 
        <Kbd>G</Kbd>
      </Button>
      <Button 
        onClick={() => setShowSubmitModal(true)}
        className="gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] h-8 text-sm"
      >
        <Plus className="w-4 h-4" />
        Submit Idea 
        <Kbd className="bg-white/20 border-white/10">N</Kbd>
      </Button>
    </>
  );

  return (
    <PageChrome rightActions={headerActions}>
      <div className="p-6 lg:p-10 max-w-[1600px] mx-auto">

        {/* Stats Grid */}
        <div className="mb-8">
          <IdeasStatsGrid
            totalIdeas={metrics?.totalIdeas ?? 0}
            quickWinsReady={metrics?.quickWinsPending ?? 0}
            avgImpact={metrics?.avgImpactScore ?? 0}
            conversionRate={metrics?.conversionRate ?? 0}
            loading={metricsLoading}
          />
        </div>

        {/* Main Content - 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Win Queue - Hero Section */}
            <QuickWinQueue
              items={quickWinItems}
              loading={isLoading}
              onApprove={handleApprove}
              onViewAll={() => navigate('/industry/ideas/all?type=quick_win')}
              onItemClick={(id) => navigate(`/industry/ideas/${id}`)}
            />

            {/* Top Priority Ideas */}
            <TopPriorityIdeas
              ideas={topPriorityIdeas as any}
              loading={topIdeasLoading}
              onIdeaClick={(id) => navigate(`/industry/ideas/${id}`)}
              onViewAll={() => navigate('/industry/ideas/all?sort=votes')}
            />

            {/* Quick Actions Grid */}
            <QuickActionsGrid
              onSubmitClick={() => setShowSubmitModal(true)}
              onScoreClick={() => navigate('/industry/ideas/all?status=submitted')}
              onMatrixClick={() => navigate('/industry/ideas/matrix')}
              pendingScoring={pendingScoring}
            />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Conversion Funnel */}
            <ConversionFunnel
              steps={[
                { 
                  label: 'Submitted', 
                  value: funnelStats.submitted, 
                  percentage: 100, 
                  color: 'gray' as const 
                },
                { 
                  label: 'Triaged', 
                  value: funnelStats.triaged, 
                  percentage: funnelStats.submitted > 0 ? Math.round((funnelStats.triaged / funnelStats.submitted) * 100) : 0, 
                  color: 'warning' as const 
                },
                { 
                  label: 'Approved', 
                  value: funnelStats.approved, 
                  percentage: funnelStats.submitted > 0 ? Math.round((funnelStats.approved / funnelStats.submitted) * 100) : 0, 
                  color: 'primary' as const 
                },
                { 
                  label: 'Converted', 
                  value: funnelStats.converted, 
                  percentage: funnelStats.submitted > 0 ? Math.round((funnelStats.converted / funnelStats.submitted) * 100) : 0, 
                  color: 'success' as const 
                },
              ]}
            />

            {/* Active Initiatives */}
            <ActiveInitiativesList
              initiatives={activeInitiatives.map(i => ({
                id: i.id,
                title: i.title,
                status: i.status,
                ideas_count: i.ideas_count || 0,
                total_votes: i.total_votes || 0,
              }))}
              loading={initiativesLoading}
              onInitiativeClick={(id) => navigate(`/industry/ideas/initiatives/${id}`)}
              onManageClick={() => navigate('/industry/ideas/initiatives')}
              onCreateClick={() => navigate('/industry/ideas/initiatives/new')}
            />

            {/* Recent Activity */}
            <RecentActivityFeed
              activities={recentActivities}
              loading={false}
              onViewAll={() => navigate('/industry/ideas/all')}
            />
          </div>
        </div>
      </div>
      
      {/* Submit Idea Modal */}
      <SubmitIdeaModalRebuilt 
        open={showSubmitModal} 
        onOpenChange={setShowSubmitModal} 
      />
    </PageChrome>
  );
}
