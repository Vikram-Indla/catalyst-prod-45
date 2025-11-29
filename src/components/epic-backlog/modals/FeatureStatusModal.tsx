import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Story {
  id: string;
  numericId: number;
  title: string;
  state: string;
  points: number;
}

interface Feature {
  id: string;
  numericId: number;
  externalId?: string;
  title: string;
  status: "on_track" | "at_risk" | "off_track";
  processStep: string;
  progressPercent: number;
  storyPointsAccepted: number;
  storyPointsTotal: number;
  storiesAccepted: number;
  storiesTotal: number;
  storiesDelivered: number;
  scopeEstimate: number;
  scopeActual: number;
  stories?: Story[];
}

interface FeatureStatusModalProps {
  open: boolean;
  onClose: () => void;
  epicId: string;
  epicTitle: string;
  features: Feature[];
  onAddFeature?: (title: string) => void;
}

export function FeatureStatusModal({
  open,
  onClose,
  epicId,
  epicTitle,
  features,
  onAddFeature,
}: FeatureStatusModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [newFeatureTitle, setNewFeatureTitle] = useState("");

  const toggleFeature = (featureId: string) => {
    const newExpanded = new Set(expandedFeatures);
    if (newExpanded.has(featureId)) {
      newExpanded.delete(featureId);
    } else {
      newExpanded.add(featureId);
    }
    setExpandedFeatures(newExpanded);
  };

  const handleAddFeature = () => {
    if (newFeatureTitle.trim() && onAddFeature) {
      onAddFeature(newFeatureTitle.trim());
      setNewFeatureTitle("");
    }
  };

  const filteredFeatures = features.filter((f) =>
    f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.numericId.toString().includes(searchQuery) ||
    f.externalId?.includes(searchQuery)
  );

  const getStatusColor = (status: Feature["status"]) => {
    switch (status) {
      case "on_track":
        return "bg-success";
      case "at_risk":
        return "bg-warning";
      case "off_track":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  const getStatusLabel = (status: Feature["status"]) => {
    switch (status) {
      case "on_track":
        return "On Track";
      case "at_risk":
        return "At Risk";
      case "off_track":
        return "Off Track";
      default:
        return "Unknown";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Features - {epicTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, External ID, or Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Input
            placeholder="New feature title..."
            value={newFeatureTitle}
            onChange={(e) => setNewFeatureTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddFeature()}
            className="flex-1"
          />
          <Button onClick={handleAddFeature} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Feature
          </Button>
        </div>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-2">
            {filteredFeatures.map((feature) => {
              const isExpanded = expandedFeatures.has(feature.id);
              const completionPercent = feature.storyPointsTotal > 0
                ? Math.round((feature.storyPointsAccepted / feature.storyPointsTotal) * 100)
                : 0;

              return (
                <div key={feature.id} className="border rounded-lg overflow-hidden">
                  <div
                    className="p-4 hover:bg-accent cursor-pointer"
                    onClick={() => toggleFeature(feature.id)}
                  >
                    <div className="flex items-start gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      )}
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm text-muted-foreground">#{feature.numericId}</span>
                              {feature.externalId && (
                                <span className="text-xs text-muted-foreground">({feature.externalId})</span>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {feature.processStep}
                              </Badge>
                            </div>
                            <h4 className="font-medium">{feature.title}</h4>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${getStatusColor(feature.status)}`} />
                            <span className="text-sm">{getStatusLabel(feature.status)}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground mb-1">Progress</div>
                            <div className="flex items-center gap-2">
                              <Progress value={completionPercent} className="flex-1" />
                              <span className="font-medium">{completionPercent}%</span>
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground mb-1">Story Points</div>
                            <div className="font-medium">
                              {feature.storyPointsAccepted} / {feature.storyPointsTotal}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground mb-1">Stories</div>
                            <div className="font-medium">
                              {feature.storiesAccepted} accepted / {feature.storiesTotal} total
                              {feature.storiesDelivered > 0 && ` (${feature.storiesDelivered} delivered)`}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-muted-foreground mb-1">Scope</div>
                            <div className="font-medium">
                              Estimate: {feature.scopeEstimate} | Actual: {feature.scopeActual}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && feature.stories && feature.stories.length > 0 && (
                    <div className="border-t bg-muted/30">
                      <div className="p-4">
                        <h5 className="font-semibold text-sm mb-3">Stories ({feature.stories.length})</h5>
                        <div className="space-y-2">
                          {feature.stories.map((story) => (
                            <div
                              key={story.id}
                              className="flex items-center justify-between p-3 bg-card border rounded-md"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-muted-foreground">#{story.numericId}</span>
                                <span className="text-sm">{story.title}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-xs">
                                  {story.state}
                                </Badge>
                                <span className="text-sm font-medium">{story.points} pts</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredFeatures.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No features found matching your search.
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
