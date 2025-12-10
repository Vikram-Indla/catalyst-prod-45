import { useState } from 'react';
import { useObjectiveV2, useDeleteObjectiveV2 } from '@/hooks/useObjectivesV2';
import { useKeyResultsV2 } from '@/hooks/useKeyResultsV2';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreVertical, Trash2, Users, Calendar, Target } from 'lucide-react';
import { ObjectiveOverviewTabV2 } from './ObjectiveOverviewTabV2';
import { KeyResultsTabV2 } from './KeyResultsTabV2';
import { LinkedWorkTabV2 } from './LinkedWorkTabV2';
// Reuse v1 tab components for Links, Details, Discussions, Audit Log
import { LinkedItemsTab } from '@/components/okr/LinkedItemsTab';
import { ObjectiveDetailsTab } from '@/components/okr/ObjectiveDetailsTab';
import { DiscussionsTab } from '@/components/okr/DiscussionsTab';
import { AuditLogTab } from '@/components/okr/AuditLogTab';

interface ObjectiveDrawerV2Props {
  objectiveId: string | null;
  open: boolean;
  onClose: () => void;
}

function getHealthColor(health?: string): string {
  switch (health) {
    case 'good': return 'bg-green-500';
    case 'fair': return 'bg-amber-500';
    case 'poor': return 'bg-red-500';
    case 'at_risk': return 'bg-orange-500';
    default: return 'bg-muted';
  }
}

export function ObjectiveDrawerV2({ objectiveId, open, onClose }: ObjectiveDrawerV2Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: objective, isLoading } = useObjectiveV2(objectiveId || undefined);
  const { data: keyResults } = useKeyResultsV2(objectiveId || undefined);
  const deleteObjective = useDeleteObjectiveV2();

  const handleDelete = async () => {
    if (!objectiveId) return;
    await deleteObjective.mutateAsync(objectiveId);
    setShowDeleteDialog(false);
    onClose();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <SheetContent className="w-full sm:max-w-[600px] p-0 flex flex-col">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : objective ? (
            <>
              {/* Header */}
              <SheetHeader className="px-6 py-5 border-b border-border bg-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {objective.theme_name && (
                        <Badge variant="secondary" className="text-xs">
                          {objective.theme_name}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {objective.status?.replace('_', ' ')}
                      </Badge>
                      <div className={`w-2 h-2 rounded-full ${getHealthColor(objective.health)}`} />
                    </div>
                    <SheetTitle className="text-lg font-semibold">
                      {objective.name}
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                      Objective details and key results
                    </SheetDescription>
                    {objective.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {objective.description}
                      </p>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem>Export</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Progress & Meta */}
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Overall Progress</span>
                      <span className="font-medium">{objective.overall_progress || 0}%</span>
                    </div>
                    <Progress value={objective.overall_progress || 0} className="h-2" />
                  </div>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    {objective.owner_name && (
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span>{objective.owner_name}</span>
                      </div>
                    )}
                    {objective.due_date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(objective.due_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5" />
                      <span>{keyResults?.length || 0} Key Results</span>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              {/* Tabs - v1 style tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="px-4 py-0 h-12 bg-card border-b border-border justify-start rounded-none gap-0 flex-shrink-0">
                  <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-gold rounded-none px-4">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="key-results" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-gold rounded-none px-4">
                    Key Results
                  </TabsTrigger>
                  <TabsTrigger value="work" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-gold rounded-none px-4">
                    Work
                  </TabsTrigger>
                  <TabsTrigger value="links" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-gold rounded-none px-4">
                    Links
                  </TabsTrigger>
                  <TabsTrigger value="details" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-gold rounded-none px-4">
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="discussions" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-gold rounded-none px-4">
                    Discussions
                  </TabsTrigger>
                  <TabsTrigger value="audit" className="data-[state=active]:border-b-2 data-[state=active]:border-brand-gold rounded-none px-4">
                    Audit Log
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-auto">
                  <TabsContent value="overview" className="m-0 h-full">
                    <ObjectiveOverviewTabV2 objective={objective} />
                  </TabsContent>
                  <TabsContent value="key-results" className="m-0 h-full">
                    <KeyResultsTabV2 objectiveId={objective.id} />
                  </TabsContent>
                  <TabsContent value="work" className="m-0 h-full">
                    <LinkedWorkTabV2 objectiveId={objective.id} />
                  </TabsContent>
                  <TabsContent value="links" className="m-0 p-6">
                    <LinkedItemsTab objectiveId={objective.id} />
                  </TabsContent>
                  <TabsContent value="details" className="m-0 p-6">
                    <ObjectiveDetailsTab objective={objective} />
                  </TabsContent>
                  <TabsContent value="discussions" className="m-0 p-6">
                    <DiscussionsTab objectiveId={objective.id} />
                  </TabsContent>
                  <TabsContent value="audit" className="m-0 p-6">
                    <AuditLogTab objectiveId={objective.id} />
                  </TabsContent>
                </div>
              </Tabs>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Objective not found
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Objective</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this objective? This will also remove all associated key results and work alignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
