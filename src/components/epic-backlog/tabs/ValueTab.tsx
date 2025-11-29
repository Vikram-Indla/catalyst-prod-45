import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface ValueTabProps {
  epicId: string;
}

export function ValueTab({ epicId }: ValueTabProps) {
  const { data: roiScores, isLoading } = useQuery({
    queryKey: ["epic-roi-scores", epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("epic_roi_scores")
        .select("*")
        .eq("epic_id", epicId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const scores = roiScores || {
    value_score: 0,
    cost_score: 0,
    time_to_market_score: 0,
    profit_potential_score: 0,
    development_risks_score: 0,
  };

  const calculateColor = (score: number) => {
    if (score >= 70) return "text-success";
    if (score >= 40) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-sm font-semibold mb-4">ROI Scores</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Value Score</span>
              <span className={`text-sm font-semibold ${calculateColor(scores.value_score || 0)}`}>
                {scores.value_score || 0}%
              </span>
            </div>
            <Progress value={scores.value_score || 0} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Cost Score</span>
              <span className={`text-sm font-semibold ${calculateColor(scores.cost_score || 0)}`}>
                {scores.cost_score || 0}%
              </span>
            </div>
            <Progress value={scores.cost_score || 0} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Time to Market Score</span>
              <span className={`text-sm font-semibold ${calculateColor(scores.time_to_market_score || 0)}`}>
                {scores.time_to_market_score || 0}%
              </span>
            </div>
            <Progress value={scores.time_to_market_score || 0} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Profit Potential Score</span>
              <span className={`text-sm font-semibold ${calculateColor(scores.profit_potential_score || 0)}`}>
                {scores.profit_potential_score || 0}%
              </span>
            </div>
            <Progress value={scores.profit_potential_score || 0} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Development Risk Score</span>
              <span className={`text-sm font-semibold ${calculateColor(100 - (scores.development_risks_score || 0))}`}>
                {100 - (scores.development_risks_score || 0)}%
              </span>
            </div>
            <Progress value={100 - (scores.development_risks_score || 0)} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">Lower risk = higher score</p>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-2">Overall ROI Assessment</h3>
        <p className="text-sm text-muted-foreground">
          {scores.value_score && scores.value_score >= 70
            ? "This epic shows strong value potential with favorable ROI metrics."
            : scores.value_score && scores.value_score >= 40
            ? "This epic shows moderate value potential. Consider optimization opportunities."
            : "This epic may need additional value assessment and risk mitigation."}
        </p>
      </div>
    </div>
  );
}
