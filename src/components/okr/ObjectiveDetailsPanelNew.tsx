import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { KeyResultsList } from "./KeyResultsList";
import { ObjectiveProgressSection } from "./ObjectiveProgressSection";
import { AlignedWorkTab } from "./AlignedWorkTab";
import { useObjective, useUpdateObjective } from "@/hooks/useObjectives";
import { Star, Share2, MoreVertical, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ObjectiveDetailsPanelNewProps {
  objectiveId: string;
  open: boolean;
  onClose: () => void;
}

export function ObjectiveDetailsPanelNew({ objectiveId, open, onClose }: ObjectiveDetailsPanelNewProps) {
  const { data: objective, isLoading } = useObjective(objectiveId);
  const updateMutation = useUpdateObjective();
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");

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
              <Button variant="ghost" size="icon">
                <Star className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="key-results">Key Results</TabsTrigger>
              <TabsTrigger value="aligned-work">Aligned Work</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="discussions">Discussions</TabsTrigger>
            </TabsList>

            <TabsContent value="key-results" className="space-y-4">
              <KeyResultsList objectiveId={objectiveId} />
            </TabsContent>

            <TabsContent value="aligned-work">
              <AlignedWorkTab objectiveId={objectiveId} />
            </TabsContent>

            <TabsContent value="details">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Tier</div>
                    <div className="font-medium">{objective.tier}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Health</div>
                    <Badge variant="outline">{objective.health || "N/A"}</Badge>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Start Date</div>
                    <div className="font-medium">{objective.start_date || "—"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Due Date</div>
                    <div className="font-medium">{objective.due_date || "—"}</div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="discussions">
              <p className="text-sm text-muted-foreground">Discussion threads</p>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
