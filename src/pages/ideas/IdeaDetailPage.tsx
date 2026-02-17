import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Clock,
  User,
  Target,
  Sparkles,
  FileText,
  Tag,
  Link2,
  AlertTriangle,
} from 'lucide-react';
import { useImprovementIdea, useCastIdeaVote } from '@/hooks/useImprovementIdeas';
import { useIdeaCommentsCount } from '@/hooks/ideas';
import { IDEA_CATEGORY_LABELS, IDEA_STATUS_LABELS } from '@/types/improvement-ideas';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { IdeaCommentsSection } from '@/components/ideas/IdeaCommentsSection';
import { IdeaAttachmentsSection } from '@/components/ideas/IdeaAttachmentsSection';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  submitted: 'bg-blue-500',
  under_review: 'bg-yellow-500',
  scoring: 'bg-purple-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  deferred: 'bg-orange-500',
  converted: 'bg-teal-500',
  archived: 'bg-gray-400',
};

export default function IdeaDetailPage() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();

  const { data: idea, isLoading, error } = useImprovementIdea(ideaId || '');
  const { data: commentsCount = 0 } = useIdeaCommentsCount(ideaId);
  const voteIdea = useCastIdeaVote();

  const handleVote = async (voteType: 'for' | 'against') => {
    if (!idea) return;
    try {
      await voteIdea.mutateAsync({
        ideaId: idea.id,
        voteType: voteType,
      });
      toast.success(`Vote recorded!`);
    } catch (error) {
      toast.error('Failed to record vote');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-lg font-medium">Idea not found</p>
            <p className="text-muted-foreground mb-4">
              The requested idea could not be loaded.
            </p>
            <Button onClick={() => navigate('/producthub/ideas/all')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Ideas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const impactScore = idea.impact_score?.calculated_score || 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {idea.code}
                </Badge>
                <Badge className={statusColors[idea.status]}>
                  {IDEA_STATUS_LABELS[idea.status]}
                </Badge>
                <Badge variant="secondary">
                  {IDEA_CATEGORY_LABELS[idea.category]}
                </Badge>
              </div>
              <CardTitle className="text-2xl">{idea.title}</CardTitle>
              {idea.title_ar && (
                <p className="text-lg text-muted-foreground" dir="rtl">
                  {idea.title_ar}
                </p>
              )}
            </div>

            {/* Vote Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => handleVote('for')}
                disabled={voteIdea.isPending}
              >
                <ThumbsUp className="h-4 w-4" />
                {idea.for_votes}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => handleVote('against')}
                disabled={voteIdea.isPending}
              >
                <ThumbsDown className="h-4 w-4" />
                {idea.against_votes}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>
                {idea.is_anonymous
                  ? 'Anonymous'
                  : idea.submitter?.full_name || idea.submitter_name || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(idea.created_at), 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span>{commentsCount} comment{commentsCount !== 1 ? 's' : ''}</span>
            </div>
            {idea.initiative && (
              <div className="flex items-center gap-2 text-sm">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <span>{idea.initiative.title}</span>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap">{idea.description}</p>
            {idea.description_ar && (
              <p className="whitespace-pre-wrap text-muted-foreground mt-4" dir="rtl">
                {idea.description_ar}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs defaultValue="impact" className="w-full">
        <TabsList>
          <TabsTrigger value="impact" className="gap-2">
            <Target className="h-4 w-4" /> Impact Score
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" /> AI Analysis
          </TabsTrigger>
          <TabsTrigger value="discussion" className="gap-2">
            <MessageSquare className="h-4 w-4" /> Discussion ({commentsCount})
          </TabsTrigger>
          <TabsTrigger value="attachments" className="gap-2">
            <FileText className="h-4 w-4" /> Attachments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="impact" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Impact Assessment</CardTitle>
              <CardDescription>
                Scoring based on strategic alignment, feasibility, and business value.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-primary">
                  {impactScore.toFixed(1)}
                </div>
                <div className="flex-1">
                  <Progress value={impactScore} className="h-3" />
                </div>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>

              {idea.impact_score && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Strategic Imperative', value: idea.impact_score.imperative },
                    { label: 'Ministry Efficiency', value: idea.impact_score.ministry_efficiency },
                    { label: 'Pain Severity', value: idea.impact_score.pain_severity },
                    { label: 'V2030 Alignment', value: idea.impact_score.alignment },
                    { label: 'Complexity', value: idea.impact_score.complexity },
                    { label: 'Time to Value', value: idea.impact_score.timeframe },
                  ].map((metric) => (
                    <div key={metric.label} className="p-3 rounded-lg border">
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <p className="text-xl font-semibold">{metric.value ?? '-'}</p>
                    </div>
                  ))}
                </div>
              )}

              {!idea.impact_score && (
                <p className="text-muted-foreground text-center py-8">
                  Impact scoring not yet completed for this idea.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {idea.ai_summary && (
                <div>
                  <h4 className="font-medium mb-2">AI Summary</h4>
                  <p className="text-sm text-muted-foreground">{idea.ai_summary}</p>
                </div>
              )}

              {idea.ai_category && (
                <div>
                  <h4 className="font-medium mb-2">Suggested Category</h4>
                  <Badge variant="secondary">
                    {IDEA_CATEGORY_LABELS[idea.ai_category]}
                  </Badge>
                </div>
              )}

              {idea.ai_compliance_tags?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Compliance Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {idea.ai_compliance_tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="gap-1">
                        <Tag className="h-3 w-3" /> {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {idea.ai_v2030_mapping?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Vision 2030 Alignment</h4>
                  <div className="flex flex-wrap gap-2">
                    {idea.ai_v2030_mapping.map((mapping, idx) => (
                      <Badge key={idx} variant="secondary">
                        {mapping}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {!idea.ai_summary && !idea.ai_category && (
                <p className="text-muted-foreground text-center py-8">
                  AI analysis pending. Results will appear here once processed.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discussion" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Discussion</CardTitle>
            </CardHeader>
            <CardContent>
              <IdeaCommentsSection ideaId={ideaId || ''} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <IdeaAttachmentsSection ideaId={ideaId || ''} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
