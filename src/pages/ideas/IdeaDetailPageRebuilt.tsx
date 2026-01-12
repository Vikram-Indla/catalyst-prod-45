// ============================================================
// IDEA DETAIL PAGE - REBUILT (World-Class Standard)
// With Triage Panel, /5 Scoring, Converted Banner
// ============================================================

import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ChevronRight,
  MessageSquare,
  Clock,
  Edit,
  Zap,
  Box,
  Tag,
  Link2,
  ExternalLink,
  Paperclip,
  History,
  Sparkles,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useImprovementIdea, useCastIdeaVote } from '@/hooks/useImprovementIdeas';
import { useConvertIdeaToBR, useTriageIdea } from '@/hooks/ideas';
import { useIdeaCommentsCount } from '@/hooks/ideas';
import { IDEA_CATEGORY_LABELS, IDEA_STATUS_LABELS } from '@/types/improvement-ideas';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { IdeaCommentsSection } from '@/components/ideas/IdeaCommentsSection';
import { IdeaAttachmentsSection } from '@/components/ideas/IdeaAttachmentsSection';
import {
  VoteWidget,
  TriagePanel,
  ConvertedBanner,
  ImpactScoreCard,
} from '@/components/ideas/elevated';

// ============================================================
// BREADCRUMB COMPONENT
// ============================================================
function IdeaBreadcrumb({ ideaCode }: { ideaCode: string }) {
  const navigate = useNavigate();
  
  return (
    <nav className="flex items-center gap-2 text-sm mb-6">
      <button 
        onClick={() => navigate('/industry/ideas')}
        className="text-slate-500 hover:text-blue-600 transition-colors"
      >
        Ideas Hub
      </button>
      <ChevronRight className="w-4 h-4 text-slate-300" />
      <button 
        onClick={() => navigate('/industry/ideas/all')}
        className="text-slate-500 hover:text-blue-600 transition-colors"
      >
        All Ideas
      </button>
      <ChevronRight className="w-4 h-4 text-slate-300" />
      <span className="font-semibold text-slate-900">{ideaCode}</span>
    </nav>
  );
}

// ============================================================
// DETAILS CARD COMPONENT
// ============================================================
function DetailsCard({ idea }: { idea: any }) {
  const navigate = useNavigate();
  const submitterName = idea.is_anonymous 
    ? 'Anonymous' 
    : idea.submitter?.full_name || idea.submitter_name || 'Unknown';
  
  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-900">Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category */}
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Category
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <Tag className="w-4 h-4 text-slate-400" />
            <Badge variant="secondary" className="bg-slate-100 text-slate-700">
              {IDEA_CATEGORY_LABELS[idea.category] || idea.category}
            </Badge>
          </div>
        </div>

        {/* Tags */}
        {idea.tags && idea.tags.length > 0 && (
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Tags
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {idea.tags.map((tag: string, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs bg-white">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Initiative Link */}
        {idea.initiative && (
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Linked Initiative
            </label>
            <button 
              onClick={() => navigate(`/industry/ideas/initiatives/${idea.initiative?.id}`)}
              className="mt-1.5 w-full p-3 rounded-lg bg-violet-50 border border-violet-100 text-left hover:bg-violet-100 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-medium text-violet-700 flex-1">
                  {idea.initiative.title}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          </div>
        )}

        {/* Submitter */}
        <div>
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Submitter
          </label>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white text-xs font-semibold">
              {submitterName.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-slate-700">{submitterName}</span>
            {idea.submitter_type && (
              <Badge variant="outline" className="text-[10px] ml-auto">
                {idea.submitter_type}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function IdeaDetailPageRebuilt() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();

  const { data: idea, isLoading, error, refetch } = useImprovementIdea(ideaId || '');
  const { data: commentsCount = 0 } = useIdeaCommentsCount(ideaId);
  const voteIdea = useCastIdeaVote();
  const convertToBR = useConvertIdeaToBR();
  const triageIdea = useTriageIdea();

  const handleVote = async (voteType: 'for' | 'against') => {
    if (!idea) return;
    try {
      await voteIdea.mutateAsync({ ideaId: idea.id, voteType });
      toast.success('Vote recorded!');
    } catch (error) {
      toast.error('Failed to record vote');
    }
  };

  const handleTriage = async (type: 'quick_win' | 'strategic', notes?: string) => {
    if (!idea) return;
    try {
      await triageIdea.mutateAsync({ 
        ideaId: idea.id, 
        ideaType: type, 
        notes 
      });
      refetch();
    } catch (error) {
      // Toast is already handled by the hook
    }
  };

  const handleApproveAndConvert = async () => {
    if (!idea) return;
    try {
      await convertToBR.mutateAsync({
        ideaId: idea.id,
        brTitle: idea.title,
        brDescription: idea.description || '',
        brJustification: `Converted from Quick Win idea ${idea.code}`,
      });
      refetch();
    } catch (error) {
      // Toast is already handled by the hook
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !idea) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-red-800">Idea not found</p>
              <p className="text-red-600 mb-4">
                The requested idea could not be loaded.
              </p>
              <Button onClick={() => navigate('/industry/ideas/all')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Ideas
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const ideaType = idea.idea_type || 'standard';
  const showTriagePanel = ['submitted', 'under_review'].includes(idea.status) && ideaType === 'standard';
  const showQuickWinActions = ideaType === 'quick_win' && ['triaged', 'quick_win_approved', 'approved'].includes(idea.status);
  const showConvertedBanner = idea.status === 'converted' && idea.business_request;
  
  // Normalize score to /5
  const rawScore = idea.impact_score?.calculated_score ?? 0;
  const normalizedScore = rawScore > 5 ? rawScore / 20 : rawScore;

  const submitterName = idea.is_anonymous 
    ? 'Anonymous' 
    : idea.submitter?.full_name || idea.submitter_name || 'Unknown';
  const submitterInitials = submitterName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  // Header background based on type
  const headerBg = ideaType === 'quick_win' 
    ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200'
    : ideaType === 'strategic'
    ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
    : 'bg-white border-slate-200';

  const statusColors: Record<string, string> = {
    submitted: 'bg-blue-100 text-blue-700',
    under_review: 'bg-slate-100 text-slate-700',
    triaged: 'bg-amber-100 text-amber-700',
    quick_win_approved: 'bg-green-100 text-green-700',
    approved: 'bg-green-100 text-green-700',
    converted: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-700',
    scoring: 'bg-violet-100 text-violet-700',
  };

  const typeConfig = {
    quick_win: { icon: Zap, label: 'Quick Win', colors: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    strategic: { icon: Box, label: 'Strategic', colors: 'bg-blue-100 text-blue-600 border-blue-200' },
    standard: { icon: null, label: 'Standard', colors: 'bg-slate-100 text-slate-600 border-slate-200' },
  };
  const TypeIcon = typeConfig[ideaType as keyof typeof typeConfig]?.icon;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-6 lg:p-10 max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <IdeaBreadcrumb ideaCode={idea.code} />

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Converted Banner */}
            {showConvertedBanner && idea.business_request && (
              <ConvertedBanner
                businessRequestCode={idea.business_request.request_key || 'BR-XXX'}
                businessRequestTitle={idea.business_request.title || 'Business Request'}
                convertedAt={idea.converted_at ? new Date(idea.converted_at) : new Date()}
                convertedBy={undefined}
                onViewBR={() => navigate(`/intake/business-requests/${idea.business_request?.id}`)}
              />
            )}

            {/* Triage Panel */}
            {showTriagePanel && (
              <TriagePanel
                ideaId={idea.id}
                aiRecommendation={idea.ai_suggested_type ? {
                  type: idea.ai_suggested_type as 'quick_win' | 'strategic',
                  confidence: 86,
                  reason: idea.ai_suggested_type === 'quick_win' 
                    ? 'Low complexity, single team scope, estimated under 2 sprints'
                    : 'Cross-team coordination required, multiple dependencies'
                } : undefined}
                onClassify={handleTriage}
              />
            )}

            {/* Header Card */}
            <Card className={`overflow-hidden border ${headerBg}`}>
              <CardContent className="p-6">
                {/* Top Row - Badges */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 bg-white/80 backdrop-blur border border-slate-200 rounded-md text-xs font-mono font-semibold text-slate-700">
                      {idea.code}
                    </span>
                    <Badge className={statusColors[idea.status] || statusColors.submitted}>
                      {IDEA_STATUS_LABELS[idea.status] || idea.status.replace('_', ' ')}
                    </Badge>
                    {ideaType !== 'standard' && (
                      <Badge variant="outline" className={typeConfig[ideaType as keyof typeof typeConfig]?.colors}>
                        {TypeIcon && <TypeIcon className="w-3.5 h-3.5 mr-1" />}
                        {typeConfig[ideaType as keyof typeof typeConfig]?.label}
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600 hover:text-slate-900">
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-slate-900 mb-4 leading-tight">
                  {idea.title}
                </h1>

                {/* Meta Row */}
                <div className="flex items-center gap-6 text-sm text-slate-600 mb-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white text-xs font-semibold">
                      {submitterInitials}
                    </div>
                    <span>{submitterName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {format(new Date(idea.submitted_at || idea.created_at), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    {commentsCount} comments
                  </div>
                </div>

                {/* Separator */}
                <div className="border-t border-slate-200/60 my-4" />

                {/* Vote Widget & Actions */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <VoteWidget
                    forVotes={idea.for_votes || 0}
                    againstVotes={idea.against_votes || 0}
                    onVote={handleVote}
                    disabled={voteIdea.isPending}
                  />

                  {showQuickWinActions && (
                    <Button
                      onClick={handleApproveAndConvert}
                      disabled={convertToBR.isPending}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {convertToBR.isPending ? 'Converting...' : 'Approve & Create BR'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Content Tabs */}
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="bg-white border border-slate-200 p-1 h-auto flex-wrap">
                <TabsTrigger value="description" className="data-[state=active]:bg-slate-100">
                  Description
                </TabsTrigger>
                <TabsTrigger value="discussion" className="data-[state=active]:bg-slate-100 gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Discussion
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {commentsCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-slate-100 gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  History
                </TabsTrigger>
                <TabsTrigger value="ai" className="data-[state=active]:bg-slate-100 gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Analysis
                </TabsTrigger>
                <TabsTrigger value="attachments" className="data-[state=active]:bg-slate-100 gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" />
                  Attachments
                </TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="mt-4">
                <Card className="bg-white border-slate-200">
                  <CardContent className="p-6">
                    <div className="prose prose-slate max-w-none">
                      {idea.description?.split('\n').map((paragraph: string, i: number) => (
                        <p key={i} className="text-slate-700 leading-relaxed mb-4 last:mb-0">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="discussion" className="mt-4">
                <Card className="bg-white border-slate-200">
                  <CardContent className="p-6">
                    <IdeaCommentsSection ideaId={ideaId || ''} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <Card className="bg-white border-slate-200">
                  <CardContent className="p-6">
                    <div className="text-center py-8 text-slate-500">
                      <History className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                      <p className="font-medium">Status History</p>
                      <p className="text-sm">Timeline coming soon...</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ai" className="mt-4">
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-violet-500" />
                      AI Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {idea.ai_summary ? (
                      <>
                        <div>
                          <h4 className="font-medium text-sm text-slate-700 mb-2">Summary</h4>
                          <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4">
                            {idea.ai_summary}
                          </p>
                        </div>
                        {idea.ai_category && (
                          <div>
                            <h4 className="font-medium text-sm text-slate-700 mb-2">Suggested Category</h4>
                            <Badge variant="secondary">
                              {IDEA_CATEGORY_LABELS[idea.ai_category] || idea.ai_category}
                            </Badge>
                          </div>
                        )}
                        {idea.ai_compliance_tags?.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm text-slate-700 mb-2">Compliance Tags</h4>
                            <div className="flex flex-wrap gap-2">
                              {idea.ai_compliance_tags.map((tag: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="gap-1">
                                  <Tag className="h-3 w-3" /> {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <Sparkles className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                        <p className="font-medium">AI Analysis</p>
                        <p className="text-sm">Analysis pending...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attachments" className="mt-4">
                <Card className="bg-white border-slate-200">
                  <CardContent className="p-6">
                    <IdeaAttachmentsSection ideaId={ideaId || ''} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* IMPACT Score Card */}
            <ImpactScoreCard
              score={normalizedScore}
              factors={[
                { key: 'I', label: 'Imperative', value: idea.impact_score?.imperative ?? 0, weight: 25 },
                { key: 'M', label: 'Ministry Efficiency', value: idea.impact_score?.ministry_efficiency ?? 0, weight: 15 },
                { key: 'P', label: 'Pain Severity', value: idea.impact_score?.pain_severity ?? 0, weight: 20 },
                { key: 'A', label: 'Alignment', value: idea.impact_score?.alignment ?? 0, weight: 20 },
                { key: 'C', label: 'Complexity', value: idea.impact_score?.complexity ?? 0, weight: 10 },
                { key: 'T', label: 'Timeframe', value: idea.impact_score?.timeframe ?? 0, weight: 10 },
              ]}
            />

            {/* Details Card */}
            <DetailsCard idea={idea} />
          </div>
        </div>
      </div>
    </div>
  );
}
