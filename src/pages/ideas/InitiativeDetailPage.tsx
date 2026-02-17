// ============================================================
// INITIATIVE DETAIL PAGE
// ============================================================

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Megaphone, 
  ArrowLeft,
  Plus,
  Calendar,
  Users,
  Lightbulb,
  ThumbsUp,
  Settings,
  Edit,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useImprovementInitiative, useImprovementIdeas } from '@/hooks/useImprovementIdeas';
import { IdeaCard } from '@/components/ideas/IdeaCard';
import { SubmitIdeaDialog } from '@/components/ideas/SubmitIdeaDialog';
import { INITIATIVE_STATUS_LABELS, IDEA_STATUS_LABELS, IDEA_CATEGORY_LABELS } from '@/types/improvement-ideas';
import { format, differenceInDays, isPast } from 'date-fns';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-500',
  active: 'bg-green-500',
  collecting: 'bg-blue-500',
  evaluating: 'bg-purple-500',
  completed: 'bg-teal-500',
  cancelled: 'bg-red-500',
};

export default function InitiativeDetailPage() {
  const { initiativeId } = useParams<{ initiativeId: string }>();
  const navigate = useNavigate();
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const { data: initiative, isLoading } = useImprovementInitiative(initiativeId);
  const { data: ideas, isLoading: ideasLoading } = useImprovementIdeas({
    initiativeId,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!initiative) {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Initiative Not Found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            The requested initiative could not be loaded.
          </p>
          <Button onClick={() => navigate('/producthub/ideas/initiatives')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Initiatives
          </Button>
        </Card>
      </div>
    );
  }

  const daysRemaining = initiative.end_date 
    ? differenceInDays(new Date(initiative.end_date), new Date())
    : null;
  const isExpired = initiative.end_date ? isPast(new Date(initiative.end_date)) : false;

  const stats = {
    totalIdeas: ideas?.length || 0,
    totalVotes: ideas?.reduce((a, i) => a + i.for_votes + i.against_votes, 0) || 0,
    approved: ideas?.filter(i => i.status === 'approved').length || 0,
    converted: ideas?.filter(i => i.converted_to_br_id).length || 0,
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/producthub/ideas/initiatives')} className="w-fit gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to Initiatives
      </Button>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">{initiative.code}</Badge>
                <Badge className={statusColors[initiative.status]}>
                  {INITIATIVE_STATUS_LABELS[initiative.status]}
                </Badge>
                {daysRemaining !== null && daysRemaining > 0 && (
                  <Badge variant="secondary">
                    {daysRemaining} days remaining
                  </Badge>
                )}
                {isExpired && (
                  <Badge variant="destructive">Expired</Badge>
                )}
              </div>
              <CardTitle className="text-2xl">{initiative.title}</CardTitle>
              {initiative.title_ar && (
                <p className="text-lg text-muted-foreground" dir="rtl">
                  {initiative.title_ar}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button onClick={() => setShowSubmitDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Submit Idea
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {initiative.description && (
            <p className="text-muted-foreground mb-4">{initiative.description}</p>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {initiative.start_date 
                  ? format(new Date(initiative.start_date), 'MMM dd, yyyy')
                  : 'No start date'}
                {' - '}
                {initiative.end_date 
                  ? format(new Date(initiative.end_date), 'MMM dd, yyyy')
                  : 'Ongoing'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Lightbulb className="h-4 w-4 text-muted-foreground" />
              <span>{stats.totalIdeas} ideas</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ThumbsUp className="h-4 w-4 text-muted-foreground" />
              <span>{stats.totalVotes} votes</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span>{stats.converted} converted</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-primary">{stats.totalIdeas}</div>
            <p className="text-sm text-muted-foreground">Total Ideas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalVotes}</div>
            <p className="text-sm text-muted-foreground">Total Votes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">{stats.converted}</div>
            <p className="text-sm text-muted-foreground">Converted to BR</p>
          </CardContent>
        </Card>
      </div>

      {/* Ideas Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Ideas ({stats.totalIdeas})</TabsTrigger>
          <TabsTrigger value="top">Top Voted</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {ideasLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[180px]" />
              ))}
            </div>
          ) : ideas && ideas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ideas.map(idea => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  onClick={() => navigate(`/producthub/ideas/${idea.id}`)}
                />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Ideas Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Be the first to submit an idea for this initiative!
              </p>
              <Button onClick={() => setShowSubmitDialog(true)}>
                <Plus className="mr-2 h-4 w-4" /> Submit Idea
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="top" className="mt-4">
          {ideas && ideas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...ideas]
                .sort((a, b) => b.for_votes - a.for_votes)
                .slice(0, 9)
                .map(idea => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    onClick={() => navigate(`/producthub/ideas/${idea.id}`)}
                  />
                ))}
            </div>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              No ideas to display
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recent" className="mt-4">
          {ideas && ideas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...ideas]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 9)
                .map(idea => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    onClick={() => navigate(`/producthub/ideas/${idea.id}`)}
                  />
                ))}
            </div>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              No ideas to display
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Submit Dialog */}
      <SubmitIdeaDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        preselectedInitiative={initiativeId}
      />
    </div>
  );
}
