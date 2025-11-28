import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { KeyResultsList } from "./KeyResultsList";
import { ObjectiveProgressSection } from "./ObjectiveProgressSection";
import { AlignedWorkTab } from "./AlignedWorkTab";
import { ChildObjectivesTab } from "./ChildObjectivesTab";
import { LinkedItemsTab } from "./LinkedItemsTab";
import { ObjectiveDetailsTab } from "./ObjectiveDetailsTab";
import { DiscussionsTab } from "./DiscussionsTab";
import { AuditLogTab } from "./AuditLogTab";
import { useObjective, useUpdateObjective, useDeleteObjective } from "@/hooks/useObjectives";
import { Star, Share2, Copy, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ObjectiveDetailsPanelNewProps {
  objectiveId: string;
  open: boolean;
  onClose: () => void;
}

export function ObjectiveDetailsPanelNew({ objectiveId, open, onClose }: ObjectiveDetailsPanelNewProps) {
  const { data: objective, isLoading } = useObjective(objectiveId);
  const updateMutation = useUpdateObjective();
  const deleteMutation = useDeleteObjective();
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleFieldUpdate = (field: string, value: any) => {
    if (objective) {
      updateMutation.mutate({ id: objective.id, [field]: value });
    }
  };

  const handleUpdateConfidence = (score: number, note: string) => {
    if (objective) {
      updateMutation.mutate(
        { id: objective.id, confidence_score: score },
        {
          onSuccess: () => {
            toast.success("Confidence score updated");
          },
        }
      );
    }
  };

  const handleSaveSummary = () => {
    if (summary && objective) {
      updateMutation.mutate({ id: objective.id, summary });
      setSummary("");
    }
  };

  const handleSaveDescription = () => {
    if (description && objective) {
      updateMutation.mutate({ id: objective.id, description });
      setDescription("");
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/enterprise/okr-hub?objectiveId=${objectiveId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const handleDuplicate = () => {
    toast.info("Duplicate feature coming soon");
  };

  const handleDelete = () => {
    deleteMutation.mutate(objectiveId, {
      onSuccess: () => {
        toast.success("Objective deleted");
        onClose();
      },
      onError: () => {
        toast.error("Failed to delete objective");
      },
    });
  };

  if (isLoading || !objective) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <div className="space-y-4">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-24 bg-muted animate-pulse rounded" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "on_track":
        return "default";
      case "at_risk":
        return "secondary";
      case "off_track":
        return "destructive";
      case "completed":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">
              <Badge variant="outline" className="mr-2">
                {objective.id.slice(0, 8)}
              </Badge>
            </SheetTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Copy className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
              </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="space-y-2">
            <Input
              value={summary || objective.summary}
              onChange={(e) => setSummary(e.target.value)}
              onBlur={handleSaveSummary}
              placeholder="Objective summary"
              className="text-lg font-semibold"
            />
            
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(objective.status)}>
                {objective.status?.replace("_", " ").toUpperCase() || "N/A"}
              </Badge>
              <Badge variant="outline">{objective.tier}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Description</h3>
            <Textarea
              value={description || objective.description || ""}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSaveDescription}
              placeholder="Add a description..."
              rows={3}
            />
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <ObjectiveProgressSection
            objective={objective}
            onUpdateConfidence={handleUpdateConfidence}
          />

          <Tabs defaultValue="key-results" className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="key-results">Key Results</TabsTrigger>
              <TabsTrigger value="aligned-work">Work</TabsTrigger>
              <TabsTrigger value="children">Children</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="discussions">Discussions</TabsTrigger>
              <TabsTrigger value="audit">Audit Log</TabsTrigger>
            </TabsList>

            <TabsContent value="key-results" className="space-y-4">
              <KeyResultsList objectiveId={objectiveId} />
            </TabsContent>

            <TabsContent value="aligned-work">
              <AlignedWorkTab objectiveId={objectiveId} />
            </TabsContent>

            <TabsContent value="children">
              <ChildObjectivesTab objectiveId={objectiveId} />
            </TabsContent>

            <TabsContent value="links">
              <LinkedItemsTab objectiveId={objectiveId} />
            </TabsContent>

            <TabsContent value="details">
              <ObjectiveDetailsTab objective={objective} />
            </TabsContent>

            <TabsContent value="discussions">
              <DiscussionsTab objectiveId={objectiveId} />
            </TabsContent>

            <TabsContent value="audit">
              <AuditLogTab objectiveId={objectiveId} />
            </TabsContent>
          </Tabs>
        </div>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Objective</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this objective? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
