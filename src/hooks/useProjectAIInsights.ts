import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AIInsights {
  completionForecast: {
    projectedDate: string;
    daysFromTarget: number;
    confidence: number;
    reasoning: string;
  };
  riskAlert: {
    summary: string;
    impact: "Low" | "Medium" | "High" | "Critical";
    affectedItems: string[];
    mitigation: string;
  };
  velocity: {
    currentPerWeek: number;
    previousPerWeek: number;
    trendPercent: number;
    weeksToComplete: number | null;
    assessment: string;
  };
  suggestion: {
    action: string;
    priority: "Low" | "Medium" | "High";
    reason: string;
  };
  _meta?: {
    model: string;
    generatedAt: string;
    durationMs: number;
    dataPoints: {
      totalItems: number;
      doneItems: number;
      overdueCount: number;
      blockedCount: number;
    };
  };
}

export function useProjectAIInsights(projectId: string | undefined) {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInsights = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "project-ai-insights",
        { body: { projectId } }
      );

      if (fnError) throw new Error(fnError.message || "Failed to fetch AI insights");
      if (data?.error) throw new Error(data.error);

      setInsights(data as AIInsights);
      setLastGenerated(data?._meta?.generatedAt || new Date().toISOString());
    } catch (err: any) {
      const message = err.message || "AI insights unavailable";
      setError(message);
      console.error("AI Insights error:", err);
      toast({
        title: "AI Insights",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return { insights, loading, error, lastGenerated, refresh: fetchInsights };
}
