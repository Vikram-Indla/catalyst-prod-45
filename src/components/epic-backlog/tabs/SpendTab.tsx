import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react";

interface SpendTabProps {
  epicId: string;
}

export function SpendTab({ epicId }: SpendTabProps) {
  const { data: spendData, isLoading } = useQuery({
    queryKey: ["epic-spend", epicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("epic_spend")
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
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const spend = spendData || {
    budget: 0,
    forecasted_spend: 0,
    estimated_spend: 0,
    accepted_spend: 0,
    initial_investment: 0,
    return_on_investment: 0,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const budgetUtilization = spend.budget > 0 
    ? ((spend.forecasted_spend || 0) / spend.budget) * 100 
    : 0;

  const isOverBudget = budgetUtilization > 100;

  return (
    <div className="space-y-6 p-4">
      {/* Budget Overview */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Budget Overview</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 border rounded-md bg-card">
            <div className="text-xs text-muted-foreground mb-1">Total Budget</div>
            <div className="text-lg font-semibold">{formatCurrency(spend.budget || 0)}</div>
          </div>
          <div className={`p-3 border rounded-md ${isOverBudget ? "bg-red-50 border-red-200" : "bg-card"}`}>
            <div className="text-xs text-muted-foreground mb-1">Budget Utilization</div>
            <div className={`text-lg font-semibold ${isOverBudget ? "text-red-600" : ""}`}>
              {budgetUtilization.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Spend Breakdown */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Spend Breakdown</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-md bg-card hover:bg-accent/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Accepted Spend</span>
            </div>
            <span className="font-semibold">{formatCurrency(spend.accepted_spend || 0)}</span>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-md bg-card hover:bg-accent/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Forecasted Spend</span>
            </div>
            <span className="font-semibold">{formatCurrency(spend.forecasted_spend || 0)}</span>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-md bg-card hover:bg-accent/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Estimated Spend</span>
            </div>
            <span className="font-semibold">{formatCurrency(spend.estimated_spend || 0)}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Click on a spend category to view detailed story-level breakdown
        </p>
      </div>

      {/* ROI Metrics */}
      {spend.return_on_investment && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3">ROI Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border rounded-md bg-card">
              <div className="text-xs text-muted-foreground mb-1">Initial Investment</div>
              <div className="text-lg font-semibold">{formatCurrency(spend.initial_investment || 0)}</div>
            </div>
            <div className="p-3 border rounded-md bg-card">
              <div className="text-xs text-muted-foreground mb-1">ROI</div>
              <div className="text-lg font-semibold text-green-600">
                {spend.return_on_investment}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
