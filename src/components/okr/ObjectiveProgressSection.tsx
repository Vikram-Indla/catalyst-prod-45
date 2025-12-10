import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertCircle } from "lucide-react";
import { useState } from "react";
import { ConfidenceScoreModal } from "./ConfidenceScoreModal";

interface ObjectiveProgressSectionProps {
  objective: any;
  onUpdateConfidence: (score: number, note: string) => void;
}

export function ObjectiveProgressSection({ objective, onUpdateConfidence }: ObjectiveProgressSectionProps) {
  const [showConfidenceModal, setShowConfidenceModal] = useState(false);

  // Calculate score color based on value
  const getScoreColor = (score: number | null) => {
    if (score === null) return "gray";
    if (score >= 0.7) return "green";
    if (score >= 0.4) return "yellow";
    return "red";
  };

  const getScoreVariant = (score: number | null) => {
    const color = getScoreColor(score);
    if (color === "green") return "default";
    if (color === "yellow") return "secondary";
    if (color === "red") return "destructive";
    return "outline";
  };

  const score = objective.confidence_score ?? objective.score;
  const krProgress = objective.kr_progress ?? 0;
  const hasWorkProgress = objective.work_progress != null && objective.work_progress > 0;
  const workProgress = hasWorkProgress ? objective.work_progress : null;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Progress & Score</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfidenceModal(true)}
          >
            Update Confidence
          </Button>
        </div>

        <div className="space-y-4">
          {/* Objective Score */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Objective Score</span>
            <Badge variant={getScoreVariant(score)}>
              {score !== null ? (score * 100).toFixed(0) + "%" : "N/A"}
            </Badge>
          </div>

          {objective.confidence_score && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>Manual confidence override active</span>
            </div>
          )}

          {/* Key Results Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Key Results Progress</span>
              <span>{krProgress}%</span>
            </div>
            <Progress value={krProgress} className="h-2" />
          </div>

          {/* Work Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Work Progress</span>
              {workProgress != null ? (
                <span>{Math.round(workProgress * 100)}%</span>
              ) : (
                <span className="text-muted-foreground">N/S</span>
              )}
            </div>
            {workProgress != null ? (
              <Progress value={workProgress * 100} className="h-2" />
            ) : (
              <div className="h-2 bg-muted rounded-full" />
            )}
          </div>
        </div>
      </Card>

      <ConfidenceScoreModal
        open={showConfidenceModal}
        onClose={() => setShowConfidenceModal(false)}
        onSubmit={onUpdateConfidence}
        currentScore={objective.confidence_score}
      />
    </div>
  );
}
