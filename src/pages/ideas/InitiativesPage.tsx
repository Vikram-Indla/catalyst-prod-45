import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Plus,
  Search,
  Calendar,
  Users,
  Lightbulb,
  Vote,
  Settings2,
  ArrowRight,
} from 'lucide-react';
import { useImprovementInitiatives } from '@/hooks/useImprovementIdeas';
import { INITIATIVE_STATUS_LABELS, ImprovementInitiativeStatus } from '@/types/improvement-ideas';
import { format, differenceInDays, isPast } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { CreateInitiativeDialog } from '@/components/ideas/CreateInitiativeDialog';

const statusColors: Record<ImprovementInitiativeStatus, string> = {
  draft: 'bg-gray-500',
  active: 'bg-green-500',
  collecting: 'bg-blue-500',
  evaluating: 'bg-purple-500',
  validated: 'bg-teal-500',
  converted: 'bg-emerald-600',
  closed: 'bg-gray-400',
  archived: 'bg-gray-300',
};

export default function InitiativesPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: initiatives = [], isLoading } = useImprovementInitiatives();

  const filteredInitiatives = initiatives.filter(
    (init) =>
      init.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      init.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTimeRemaining = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    if (isPast(end)) return { label: 'Ended', color: 'text-destructive' };
    const days = differenceInDays(end, new Date());
    if (days <= 7) return { label: `${days} days left`, color: 'text-orange-500' };
    return { label: `${days} days left`, color: 'text-muted-foreground' };
  };

  return (
    <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Improvement Initiatives</h1>
            <p className="text-muted-foreground">
              Manage idea collection campaigns and track submissions
            </p>
          </div>
          <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4" />
            New Initiative
          </Button>
        </div>

        {/* Create Initiative Dialog */}
        <CreateInitiativeDialog 
          open={showCreateDialog} 
          onOpenChange={setShowCreateDialog} 
        />

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search initiatives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(INITIATIVE_STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Initiatives Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : filteredInitiatives.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-12 pb-12 text-center">
              <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No initiatives found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first initiative to start collecting ideas.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create Initiative
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInitiatives.map((initiative) => {
              const timeRemaining = getTimeRemaining(initiative.end_date);
              const progress = initiative.end_date && initiative.start_date
                ? Math.min(
                    100,
                    Math.max(
                      0,
                      (differenceInDays(new Date(), new Date(initiative.start_date)) /
                        differenceInDays(new Date(initiative.end_date), new Date(initiative.start_date))) *
                        100
                    )
                  )
                : 0;

              return (
                <Card
                  key={initiative.id}
                  className="hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => navigate(`/industry/ideas/initiatives/${initiative.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className="font-mono text-xs">
                        {initiative.code}
                      </Badge>
                      <Badge className={statusColors[initiative.status]}>
                        {INITIATIVE_STATUS_LABELS[initiative.status]}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg line-clamp-2 mt-2">
                      {initiative.title}
                    </CardTitle>
                    {initiative.description && (
                      <CardDescription className="line-clamp-2">
                        {initiative.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        <span>{initiative.ideas_count || 0} ideas</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Vote className="h-4 w-4 text-blue-500" />
                        <span>{initiative.total_votes || 0} votes</span>
                      </div>
                    </div>

                    {/* Timeline */}
                    {initiative.start_date && initiative.end_date && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(initiative.start_date), 'MMM dd')} -{' '}
                            {format(new Date(initiative.end_date), 'MMM dd, yyyy')}
                          </span>
                          {timeRemaining && (
                            <span className={timeRemaining.color}>
                              {timeRemaining.label}
                            </span>
                          )}
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    )}

                    {/* Settings badges */}
                    <div className="flex flex-wrap gap-1">
                      {initiative.settings?.voting_enabled && (
                        <Badge variant="secondary" className="text-xs">
                          <Vote className="h-3 w-3 mr-1" /> Voting
                        </Badge>
                      )}
                      {initiative.settings?.allow_anonymous && (
                        <Badge variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" /> Anonymous
                        </Badge>
                      )}
                      {initiative.settings?.moderation_required && (
                        <Badge variant="secondary" className="text-xs">
                          <Settings2 className="h-3 w-3 mr-1" /> Moderated
                        </Badge>
                      )}
                    </div>

                    {/* View link */}
                    <div className="flex justify-end pt-2">
                      <span className="text-sm text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        View details <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
  );
}
